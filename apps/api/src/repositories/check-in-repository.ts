import type { Pool, PoolClient } from 'pg';
import {
  CHECK_IN_POLICY,
  applyDailyRewardLimits,
  isCooldownComplete,
  isWithinCheckInRadius,
  kstDayStartUtc,
  movementSpeedKmh,
  requiresMovementReview,
  retryAt,
} from '../domain/check-in-policy.js';
import { CheckInRuleError, type CheckInResult, type CreateCheckInCommand } from '../domain/check-in.js';
import { estimateReward, type RewardFactors } from '../domain/reward.js';

export interface CheckInRepository {
  create(command: CreateCheckInCommand): Promise<{ result: CheckInResult; replayed: boolean }>;
  findOwned(userId: string, checkInId: string): Promise<CheckInResult | null>;
}

interface ResultRow {
  check_in_id: string;
  status: 'SUCCESS' | 'REVIEW';
  distance_m: number;
  risk_code: string | null;
  reward_points: number;
  balance_after: number;
  reward_policy_version: string;
  reward_factors: unknown;
}

function factors(value: unknown): RewardFactors {
  if (typeof value === 'object' && value !== null) {
    const item = value as Partial<RewardFactors>;
    if (item.base === 100 && typeof item.areaWeight === 'number' && typeof item.quietWeight === 'number') {
      return { base: 100, areaWeight: item.areaWeight, quietWeight: item.quietWeight };
    }
  }
  return { base: 100, areaWeight: 1, quietWeight: 1 };
}

function mapResult(row: ResultRow): CheckInResult {
  return {
    checkInId: row.check_in_id,
    status: row.status,
    distanceM: Math.round(Number(row.distance_m) * 10) / 10,
    riskCode: row.risk_code,
    reward: {
      points: Number(row.reward_points),
      balance: Number(row.balance_after),
      policyVersion: row.reward_policy_version,
      factors: factors(row.reward_factors),
    },
  };
}

const RESULT_COLUMNS = `ci.id as check_in_id, ci.status, ci.distance_m::float8 as distance_m,
  ci.risk_code, ci.reward_points, ci.balance_after, ci.reward_policy_version, ci.reward_factors`;

export class PostgresCheckInRepository implements CheckInRepository {
  constructor(private readonly pool: Pool) {}

  async create(command: CreateCheckInCommand): Promise<{ result: CheckInResult; replayed: boolean }> {
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const profile = await client.query<{ point_balance: number; status: string }>(
        `select point_balance, status from public.profiles where id = $1 for update`,
        [command.userId],
      );
      const profileRow = profile.rows[0];
      if (!profileRow || profileRow.status !== 'ACTIVE') {
        throw new CheckInRuleError(403, 'PROFILE_NOT_ELIGIBLE', '체크인할 수 없는 사용자입니다.');
      }

      const replay = await this.findByIdempotencyKey(client, command.userId, command.idempotencyKey);
      if (replay) {
        await client.query('commit');
        return { result: replay, replayed: true };
      }

      const spotResult = await client.query<{
        content_type_id: number; status: string; is_declining_area: boolean;
        area_code: number | null; quiet_weight: number; distance_m: number;
      }>(
        `select s.content_type_id, s.status, s.is_declining_area, s.area_code,
           sc.quiet_weight::float8 as quiet_weight,
           extensions.st_distance(
             s.location,
             extensions.st_setsrid(extensions.st_makepoint($3, $2), 4326)::extensions.geography
           )::float8 as distance_m
         from public.tour_spots s
         join public.spot_scores sc on sc.content_id = s.content_id
         where s.content_id = $1`,
        [command.spotId, command.position.lat, command.position.lng],
      );
      const spot = spotResult.rows[0];
      if (!spot) throw new CheckInRuleError(404, 'SPOT_NOT_FOUND', '인증 가능한 장소를 찾을 수 없습니다.');
      if (spot.status !== 'ACTIVE') throw new CheckInRuleError(422, 'SPOT_NOT_ELIGIBLE', '현재 체크인할 수 없는 장소입니다.');
      if (!CHECK_IN_POLICY.eligibleContentTypeIds.includes(Number(spot.content_type_id))) {
        throw new CheckInRuleError(422, 'SPOT_NOT_ELIGIBLE', '현재 체크인 대상이 아닌 장소 유형입니다.');
      }
      const distanceM = Number(spot.distance_m);
      if (!isWithinCheckInRadius(distanceM)) {
        throw new CheckInRuleError(422, 'OUT_OF_RANGE', '체크인 가능 거리 밖에 있습니다.', {
          distanceM: Math.round(distanceM * 10) / 10,
          allowedRadiusM: CHECK_IN_POLICY.allowedRadiusM,
        });
      }

      const previousResult = await client.query<{
        created_at: Date; movement_distance_m: number;
      }>(
        `select ci.created_at,
           extensions.st_distance(
             ci.location,
             extensions.st_setsrid(extensions.st_makepoint($2, $1), 4326)::extensions.geography
           )::float8 as movement_distance_m
         from public.check_ins ci
         where ci.user_id = $3 and ci.status in ('SUCCESS', 'REVIEW')
         order by ci.created_at desc limit 1`,
        [command.position.lat, command.position.lng, command.userId],
      );
      const previous = previousResult.rows[0];
      if (previous && !isCooldownComplete(new Date(previous.created_at), command.now)) {
        throw new CheckInRuleError(409, 'COOLDOWN', '체크인 대기 시간이 남아 있습니다.', {
          retryAt: retryAt(new Date(previous.created_at)).toISOString(),
        });
      }

      const reward = estimateReward({
        areaCode: spot.area_code === null ? null : Number(spot.area_code),
        isDecliningArea: spot.is_declining_area,
        quietWeight: Number(spot.quiet_weight),
      });
      let status: 'SUCCESS' | 'REVIEW' = 'SUCCESS';
      let riskCode: string | null = null;
      let riskScore = 0;
      let rewardPoints = reward.points;

      if (previous) {
        const elapsedSeconds = (command.now.valueOf() - new Date(previous.created_at).valueOf()) / 1_000;
        const speedKmh = movementSpeedKmh(Number(previous.movement_distance_m), elapsedSeconds);
        if (requiresMovementReview(speedKmh)) {
          status = 'REVIEW';
          riskCode = 'IMPOSSIBLE_SPEED';
          riskScore = 100;
          rewardPoints = 0;
        }
      }

      if (status === 'SUCCESS') {
        const priorReward = await client.query<{ rewarded: boolean }>(
          `select exists (
             select 1 from public.check_ins
             where user_id = $1 and content_id = $2 and status = 'SUCCESS' and reward_points > 0
           ) as rewarded`,
          [command.userId, command.spotId],
        );
        if (priorReward.rows[0]?.rewarded) {
          rewardPoints = 0;
          riskCode = 'ALREADY_REWARDED';
        } else {
          const daily = await client.query<{ rewarded_count: number; rewarded_points: number }>(
            `select count(*)::integer as rewarded_count, coalesce(sum(amount), 0)::integer as rewarded_points
             from public.point_ledger
             where user_id = $1 and type = 'CHECK_IN' and amount > 0 and created_at >= $2`,
            [command.userId, kstDayStartUtc(command.now)],
          );
          const limited = applyDailyRewardLimits({
            candidatePoints: rewardPoints,
            rewardedCheckInCount: Number(daily.rows[0]?.rewarded_count ?? 0),
            rewardedPointTotal: Number(daily.rows[0]?.rewarded_points ?? 0),
          });
          rewardPoints = limited.points;
          riskCode = limited.reason;
        }
      }

      let balanceAfter = Number(profileRow.point_balance);
      const inserted = await client.query<{ id: string }>(
        `insert into public.check_ins (
           user_id, content_id, location, accuracy_m, distance_m, client_captured_at,
           status, risk_code, risk_score, reward_points, idempotency_key,
           reward_policy_version, reward_factors, balance_after, created_at
         ) values (
           $1, $2,
           extensions.st_setsrid(extensions.st_makepoint($4, $3), 4326)::extensions.geography,
           $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::jsonb, $15, $16
         ) returning id`,
        [
          command.userId, command.spotId, command.position.lat, command.position.lng,
          command.position.accuracyM, distanceM, command.position.capturedAt,
          status, riskCode, riskScore, rewardPoints, command.idempotencyKey,
          reward.policyVersion, JSON.stringify(reward.factors), balanceAfter, command.now,
        ],
      );
      const checkInId = inserted.rows[0]?.id;
      if (!checkInId) throw new Error('Database did not return a check-in ID.');

      if (rewardPoints > 0) {
        const balance = await client.query<{ point_balance: number }>(
          `update public.profiles set point_balance = point_balance + $2 where id = $1 returning point_balance`,
          [command.userId, rewardPoints],
        );
        balanceAfter = Number(balance.rows[0]?.point_balance);
        await client.query(
          `insert into public.point_ledger (
             user_id, check_in_id, type, amount, balance_after, policy_version,
             idempotency_key, metadata, created_at
           ) values ($1, $2, 'CHECK_IN', $3, $4, $5, $6, $7::jsonb, $8)`,
          [command.userId, checkInId, rewardPoints, balanceAfter, reward.policyVersion,
            command.idempotencyKey, JSON.stringify({ spotId: command.spotId, factors: reward.factors }), command.now],
        );
        await client.query(`update public.check_ins set balance_after = $2 where id = $1`, [checkInId, balanceAfter]);
      }

      await client.query('commit');
      return {
        result: {
          checkInId, status, distanceM: Math.round(distanceM * 10) / 10, riskCode,
          reward: { points: rewardPoints, balance: balanceAfter, policyVersion: reward.policyVersion, factors: reward.factors },
        },
        replayed: false,
      };
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }

  async findOwned(userId: string, checkInId: string): Promise<CheckInResult | null> {
    const result = await this.pool.query<ResultRow>(
      `select ${RESULT_COLUMNS} from public.check_ins ci where ci.user_id = $1 and ci.id = $2`,
      [userId, checkInId],
    );
    return result.rows[0] ? mapResult(result.rows[0]) : null;
  }

  private async findByIdempotencyKey(
    client: PoolClient,
    userId: string,
    idempotencyKey: string,
  ): Promise<CheckInResult | null> {
    const result = await client.query<ResultRow>(
      `select ${RESULT_COLUMNS} from public.check_ins ci
       where ci.user_id = $1 and ci.idempotency_key = $2`,
      [userId, idempotencyKey],
    );
    return result.rows[0] ? mapResult(result.rows[0]) : null;
  }
}
