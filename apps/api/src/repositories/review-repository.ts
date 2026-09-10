import type { Pool } from 'pg';
import { applyDailyRewardLimits, kstDayStartUtc } from '../domain/check-in-policy.js';
import type { RewardFactors } from '../domain/reward.js';

export type ReviewDecision = 'APPROVE' | 'REJECT';
export interface ReviewResult { checkInId: string; status: 'SUCCESS' | 'REJECTED'; rewardPoints: number; balance: number; repeated: boolean }
export interface ReviewRepository { resolve(checkInId: string, decision: ReviewDecision, now: Date): Promise<ReviewResult> }

export class ReviewRuleError extends Error {
  constructor(public readonly status: number, public readonly code: string, message: string) {
    super(message); this.name = 'ReviewRuleError';
  }
}

function rewardFromFactors(value: unknown): number {
  const factors = value as Partial<RewardFactors> | null;
  if (!factors || factors.base !== 100 || typeof factors.areaWeight !== 'number' || typeof factors.quietWeight !== 'number') return 0;
  return Math.min(500, Math.max(10, Math.round(100 * factors.areaWeight * factors.quietWeight)));
}

export class PostgresReviewRepository implements ReviewRepository {
  constructor(private readonly pool: Pool) {}
  async resolve(checkInId: string, decision: ReviewDecision, now: Date): Promise<ReviewResult> {
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const found = await client.query<{
        user_id: string; content_id: number; status: 'SUCCESS' | 'REVIEW' | 'REJECTED';
        reward_points: number; balance_after: number; reward_factors: unknown; risk_code: string | null;
      }>(`select user_id, content_id::float8 as content_id, status, reward_points, balance_after, reward_factors, risk_code
          from public.check_ins where id = $1 for update`, [checkInId]);
      const checkIn = found.rows[0];
      if (!checkIn) throw new ReviewRuleError(404, 'CHECK_IN_NOT_FOUND', '검토할 체크인을 찾을 수 없습니다.');
      const target = decision === 'APPROVE' ? 'SUCCESS' : 'REJECTED';
      if (checkIn.status !== 'REVIEW') {
        if (checkIn.status !== target) throw new ReviewRuleError(409, 'REVIEW_CONFLICT', '이미 다른 결정으로 처리된 체크인입니다.');
        await client.query('commit');
        return { checkInId, status: target, rewardPoints: Number(checkIn.reward_points), balance: Number(checkIn.balance_after), repeated: true };
      }
      const profile = await client.query<{ point_balance: number }>(
        `select point_balance from public.profiles where id = $1 for update`, [checkIn.user_id],
      );
      let balance = Number(profile.rows[0]?.point_balance);
      let rewardPoints = 0;
      let riskCode: string | null = decision === 'REJECT' ? 'REVIEW_REJECTED' : null;
      if (decision === 'APPROVE') {
        const prior = await client.query<{ rewarded: boolean }>(
          `select exists (select 1 from public.check_ins where user_id = $1 and content_id = $2
            and id <> $3 and status = 'SUCCESS' and reward_points > 0) as rewarded`,
          [checkIn.user_id, checkIn.content_id, checkInId],
        );
        if (prior.rows[0]?.rewarded) riskCode = 'ALREADY_REWARDED';
        else {
          const daily = await client.query<{ rewarded_count: number; rewarded_points: number }>(
            `select count(*)::integer as rewarded_count, coalesce(sum(amount), 0)::integer as rewarded_points
             from public.point_ledger where user_id = $1 and type = 'CHECK_IN' and amount > 0 and created_at >= $2`,
            [checkIn.user_id, kstDayStartUtc(now)],
          );
          const limited = applyDailyRewardLimits({ candidatePoints: rewardFromFactors(checkIn.reward_factors),
            rewardedCheckInCount: Number(daily.rows[0]?.rewarded_count ?? 0),
            rewardedPointTotal: Number(daily.rows[0]?.rewarded_points ?? 0) });
          rewardPoints = limited.points; riskCode = limited.reason;
        }
        if (rewardPoints > 0) {
          const updated = await client.query<{ point_balance: number }>(
            `update public.profiles set point_balance = point_balance + $2 where id = $1 returning point_balance`,
            [checkIn.user_id, rewardPoints],
          );
          balance = Number(updated.rows[0]?.point_balance);
          await client.query(`insert into public.point_ledger (
              user_id, check_in_id, type, amount, balance_after, policy_version, idempotency_key, metadata, created_at
            ) values ($1, $2, 'CHECK_IN', $3, $4, 'reward-v1', $5, $6::jsonb, $7)`,
          [checkIn.user_id, checkInId, rewardPoints, balance, `review:${checkInId}:approve`,
            JSON.stringify({ reviewApproved: true }), now]);
        }
      }
      await client.query(`update public.check_ins set status = $2, risk_code = $3,
          reward_points = $4, balance_after = $5, review_decision = $6,
          reviewed_at = $7, review_original_risk_code = $8 where id = $1`,
      [checkInId, target, riskCode, rewardPoints, balance, decision, now, checkIn.risk_code]);
      await client.query('commit');
      return { checkInId, status: target, rewardPoints, balance, repeated: false };
    } catch (error) { await client.query('rollback'); throw error; }
    finally { client.release(); }
  }
}
