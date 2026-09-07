import type { Pool } from 'pg';

export interface FlagSkinCatalogItem {
  id: string; name: string; description: string; price: number; assetUrl: string;
  owned: boolean; equipped: boolean;
}

export interface PurchaseResult { skinId: string; balance: number; acquiredAt: string }

export interface MapVisit {
  spotId: number; spotTitle: string; location: { lat: number; lng: number };
  visitedAt: string; rewardPoints: number; status: 'SUCCESS';
}

export interface MyFlagMap { equippedFlagSkinId: string | null; visits: MapVisit[] }

export interface FlagRepository {
  listCatalog(userId: string): Promise<FlagSkinCatalogItem[]>;
  purchase(userId: string, skinId: string, idempotencyKey: string, now: Date): Promise<{ result: PurchaseResult; replayed: boolean }>;
  equip(userId: string, skinId: string | null): Promise<string | null>;
  getMap(userId: string): Promise<MyFlagMap>;
}

export class FlagRuleError extends Error {
  constructor(public readonly status: number, public readonly code: string, message: string) {
    super(message); this.name = 'FlagRuleError';
  }
}

export class PostgresFlagRepository implements FlagRepository {
  constructor(private readonly pool: Pool) {}

  async listCatalog(userId: string): Promise<FlagSkinCatalogItem[]> {
    const result = await this.pool.query<{
      id: string; name: string; description: string; price: number; asset_url: string;
      owned: boolean; equipped: boolean;
    }>(`select fs.id, fs.name, fs.description, fs.price, fs.asset_url,
        (us.user_id is not null) as owned, (ums.equipped_skin_id = fs.id) as equipped
      from public.flag_skins fs
      left join public.user_skins us on us.skin_id = fs.id and us.user_id = $1
      left join public.user_map_settings ums on ums.user_id = $1
      where fs.is_active
      order by fs.price asc, fs.id asc`, [userId]);
    return result.rows.map((row) => ({ id: row.id, name: row.name, description: row.description,
      price: Number(row.price), assetUrl: row.asset_url, owned: row.owned, equipped: row.equipped }));
  }

  async purchase(userId: string, skinId: string, idempotencyKey: string, now: Date) {
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const profile = await client.query<{ point_balance: number }>(
        `select point_balance from public.profiles where id = $1 and status = 'ACTIVE' for update`, [userId],
      );
      const balance = profile.rows[0]?.point_balance;
      if (balance === undefined) throw new FlagRuleError(403, 'PROFILE_NOT_ELIGIBLE', '구매할 수 없는 사용자입니다.');
      const replay = await client.query<{ skin_id: string; balance_after: number; acquired_at: Date }>(
        `select skin_id, balance_after, acquired_at from public.skin_purchase_receipts
         where user_id = $1 and idempotency_key = $2`, [userId, idempotencyKey],
      );
      const replayRow = replay.rows[0];
      if (replayRow) {
        if (replayRow.skin_id !== skinId) throw new FlagRuleError(409, 'PURCHASE_CONFLICT', 'Idempotency-Key가 다른 구매에 사용되었습니다.');
        await client.query('commit');
        return { result: { skinId, balance: Number(replayRow.balance_after), acquiredAt: new Date(replayRow.acquired_at).toISOString() }, replayed: true };
      }
      const keyConflict = await client.query<{ used: boolean }>(
        `select exists (select 1 from public.point_ledger where user_id = $1 and idempotency_key = $2) as used`,
        [userId, idempotencyKey],
      );
      if (keyConflict.rows[0]?.used) throw new FlagRuleError(409, 'PURCHASE_CONFLICT', 'Idempotency-Key가 다른 거래에 사용되었습니다.');
      const skin = await client.query<{ price: number; is_active: boolean }>(
        `select price, is_active from public.flag_skins where id = $1`, [skinId],
      );
      const skinRow = skin.rows[0];
      if (!skinRow) throw new FlagRuleError(404, 'SKIN_NOT_FOUND', '깃발 스킨을 찾을 수 없습니다.');
      if (!skinRow.is_active) throw new FlagRuleError(409, 'SKIN_INACTIVE', '현재 구매할 수 없는 스킨입니다.');
      const owned = await client.query<{ owned: boolean }>(
        `select exists (select 1 from public.user_skins where user_id = $1 and skin_id = $2) as owned`, [userId, skinId],
      );
      if (owned.rows[0]?.owned) throw new FlagRuleError(409, 'SKIN_ALREADY_OWNED', '이미 보유한 스킨입니다.');
      const price = Number(skinRow.price);
      if (Number(balance) < price) throw new FlagRuleError(409, 'INSUFFICIENT_POINTS', '포인트가 부족합니다.');
      await client.query(`insert into public.user_skins (user_id, skin_id, acquired_at) values ($1, $2, $3)`, [userId, skinId, now]);
      let balanceAfter = Number(balance);
      if (price > 0) {
        const updated = await client.query<{ point_balance: number }>(
          `update public.profiles set point_balance = point_balance - $2
           where id = $1 and point_balance >= $2 returning point_balance`, [userId, price],
        );
        if (updated.rows[0]?.point_balance === undefined) throw new FlagRuleError(409, 'INSUFFICIENT_POINTS', '포인트가 부족합니다.');
        balanceAfter = Number(updated.rows[0].point_balance);
      }
      const acquiredAt = now.toISOString();
      if (price > 0) await client.query(`insert into public.point_ledger (
          user_id, type, amount, balance_after, policy_version, idempotency_key, metadata, created_at
        ) values ($1, 'PURCHASE', $2, $3, 'skin-purchase-v1', $4, $5::jsonb, $6)`,
      [userId, -price, balanceAfter, idempotencyKey, JSON.stringify({ skinId, acquiredAt }), now]);
      await client.query(`insert into public.skin_purchase_receipts
        (user_id, idempotency_key, skin_id, balance_after, acquired_at) values ($1, $2, $3, $4, $5)`,
      [userId, idempotencyKey, skinId, balanceAfter, now]);
      await client.query('commit');
      return { result: { skinId, balance: Number(balanceAfter), acquiredAt }, replayed: false };
    } catch (error) {
      await client.query('rollback'); throw error;
    } finally { client.release(); }
  }

  async equip(userId: string, skinId: string | null): Promise<string | null> {
    if (skinId !== null) {
      const owned = await this.pool.query<{ owned: boolean }>(
        `select exists (select 1 from public.user_skins where user_id = $1 and skin_id = $2) as owned`, [userId, skinId],
      );
      if (!owned.rows[0]?.owned) throw new FlagRuleError(409, 'SKIN_NOT_OWNED', '보유하지 않은 스킨입니다.');
    }
    const updated = await this.pool.query<{ equipped_skin_id: string | null }>(
      `update public.user_map_settings set equipped_skin_id = $2 where user_id = $1 returning equipped_skin_id`,
      [userId, skinId],
    );
    if (!updated.rows[0]) throw new FlagRuleError(404, 'PROFILE_NOT_FOUND', '지도 설정을 찾을 수 없습니다.');
    return updated.rows[0].equipped_skin_id;
  }

  async getMap(userId: string): Promise<MyFlagMap> {
    const [settings, visits] = await Promise.all([
      this.pool.query<{ equipped_skin_id: string | null }>(
        `select equipped_skin_id from public.user_map_settings where user_id = $1`, [userId],
      ),
      this.pool.query<{
        spot_id: number; spot_title: string; lat: number; lng: number;
        visited_at: Date; reward_points: number; status: 'SUCCESS';
      }>(`select distinct on (ci.content_id) ci.content_id::float8 as spot_id, s.title as spot_title,
          extensions.st_y(s.location::extensions.geometry)::float8 as lat,
          extensions.st_x(s.location::extensions.geometry)::float8 as lng,
          ci.created_at as visited_at, ci.reward_points, ci.status
        from public.check_ins ci join public.tour_spots s on s.content_id = ci.content_id
        where ci.user_id = $1 and ci.status = 'SUCCESS'
        order by ci.content_id, ci.created_at asc, ci.id asc`, [userId]),
    ]);
    return {
      equippedFlagSkinId: settings.rows[0]?.equipped_skin_id ?? null,
      visits: visits.rows.map((row) => ({
        spotId: Number(row.spot_id), spotTitle: row.spot_title,
        location: { lat: Number(row.lat), lng: Number(row.lng) },
        visitedAt: new Date(row.visited_at).toISOString(), rewardPoints: Number(row.reward_points), status: row.status,
      })),
    };
  }
}
