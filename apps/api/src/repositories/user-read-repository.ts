import type { Pool } from 'pg';

export type ProfileStatus = 'ACTIVE' | 'SUSPENDED' | 'DELETED';

export interface UserProfile {
  id: string;
  nickname: string | null;
  pointBalance: number;
  status: ProfileStatus;
  equippedFlagSkinId: string | null;
}

export interface HistoryCursor { createdAt: string; id: string }

export interface CheckInHistoryItem {
  checkInId: string;
  spotId: number;
  spotTitle: string;
  status: 'SUCCESS' | 'REVIEW' | 'REJECTED';
  distanceM: number;
  rewardPoints: number;
  riskCode: string | null;
  createdAt: string;
}

export interface LedgerHistoryItem {
  transactionId: string;
  type: 'CHECK_IN' | 'PURCHASE' | 'REVERSAL' | 'ADMIN_ADJUSTMENT';
  amount: number;
  balanceAfter: number;
  policyVersion: string;
  createdAt: string;
  checkInId: string | null;
}

export interface UserReadRepository {
  findProfile(userId: string): Promise<UserProfile | null>;
  updateNickname(userId: string, nickname: string): Promise<UserProfile | null>;
  listCheckIns(userId: string, after: HistoryCursor | undefined, limit: number): Promise<CheckInHistoryItem[]>;
  listPointLedger(userId: string, after: HistoryCursor | undefined, limit: number): Promise<LedgerHistoryItem[]>;
}

interface ProfileRow {
  id: string;
  nickname: string | null;
  point_balance: number;
  status: ProfileStatus;
  equipped_skin_id: string | null;
}

function mapProfile(row: ProfileRow): UserProfile {
  return {
    id: row.id,
    nickname: row.nickname,
    pointBalance: Number(row.point_balance),
    status: row.status,
    equippedFlagSkinId: row.equipped_skin_id,
  };
}

const PROFILE_SQL = `select p.id, p.nickname, p.point_balance, p.status,
  ums.equipped_skin_id
  from public.profiles p
  left join public.user_map_settings ums on ums.user_id = p.id`;

export class PostgresUserReadRepository implements UserReadRepository {
  constructor(private readonly pool: Pool) {}

  async findProfile(userId: string): Promise<UserProfile | null> {
    const result = await this.pool.query<ProfileRow>(`${PROFILE_SQL} where p.id = $1`, [userId]);
    return result.rows[0] ? mapProfile(result.rows[0]) : null;
  }

  async updateNickname(userId: string, nickname: string): Promise<UserProfile | null> {
    const result = await this.pool.query<ProfileRow>(
      `with updated as (
         update public.profiles set nickname = $2 where id = $1 returning id
       ) ${PROFILE_SQL} join updated u on u.id = p.id`,
      [userId, nickname],
    );
    return result.rows[0] ? mapProfile(result.rows[0]) : null;
  }

  async listCheckIns(userId: string, after: HistoryCursor | undefined, limit: number): Promise<CheckInHistoryItem[]> {
    const values: unknown[] = [userId];
    const cursorSql = after
      ? (values.push(after.createdAt, after.id), `and (ci.created_at, ci.id) < ($2::timestamptz, $3::uuid)`)
      : '';
    values.push(limit);
    const result = await this.pool.query<{
      check_in_id: string; spot_id: number; spot_title: string;
      status: CheckInHistoryItem['status']; distance_m: number; reward_points: number;
      risk_code: string | null; created_at: Date;
    }>(
      `select ci.id as check_in_id, ci.content_id::float8 as spot_id, s.title as spot_title,
         ci.status, ci.distance_m::float8 as distance_m, ci.reward_points, ci.risk_code, ci.created_at
       from public.check_ins ci
       join public.tour_spots s on s.content_id = ci.content_id
       where ci.user_id = $1 ${cursorSql}
       order by ci.created_at desc, ci.id desc limit $${values.length}`,
      values,
    );
    return result.rows.map((row) => ({
      checkInId: row.check_in_id,
      spotId: Number(row.spot_id),
      spotTitle: row.spot_title,
      status: row.status,
      distanceM: Number(row.distance_m),
      rewardPoints: Number(row.reward_points),
      riskCode: row.risk_code,
      createdAt: new Date(row.created_at).toISOString(),
    }));
  }

  async listPointLedger(userId: string, after: HistoryCursor | undefined, limit: number): Promise<LedgerHistoryItem[]> {
    const values: unknown[] = [userId];
    const cursorSql = after
      ? (values.push(after.createdAt, after.id), `and (pl.created_at, pl.id) < ($2::timestamptz, $3::uuid)`)
      : '';
    values.push(limit);
    const result = await this.pool.query<{
      transaction_id: string; type: LedgerHistoryItem['type']; amount: number;
      balance_after: number; policy_version: string; created_at: Date; check_in_id: string | null;
    }>(
      `select pl.id as transaction_id, pl.type, pl.amount, pl.balance_after,
         pl.policy_version, pl.created_at, pl.check_in_id
       from public.point_ledger pl
       where pl.user_id = $1 ${cursorSql}
       order by pl.created_at desc, pl.id desc limit $${values.length}`,
      values,
    );
    return result.rows.map((row) => ({
      transactionId: row.transaction_id,
      type: row.type,
      amount: Number(row.amount),
      balanceAfter: Number(row.balance_after),
      policyVersion: row.policy_version,
      createdAt: new Date(row.created_at).toISOString(),
      checkInId: row.check_in_id,
    }));
  }
}
