import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Pool, PoolClient } from 'pg';
import { describe, expect, it, vi } from 'vitest';
import type { CreateCheckInCommand } from '../domain/check-in.js';
import { PostgresCheckInRepository } from './check-in-repository.js';

const now = new Date('2026-08-25T12:00:00.000Z');
const command: CreateCheckInCommand = {
  userId: '00000000-0000-0000-0000-000000000001', spotId: 7,
  idempotencyKey: 'idem-key-1', now,
  position: { lat: 37, lng: 127, accuracyM: 20, capturedAt: now },
};

function resultRow() {
  return { check_in_id: '10000000-0000-4000-8000-000000000001', status: 'SUCCESS',
    distance_m: 42.7, risk_code: null, reward_points: 150, balance_after: 650,
    reward_policy_version: 'reward-v1', reward_factors: { base: 100, areaWeight: 1.5, quietWeight: 1 } };
}

function fakePool(handler: (sql: string, values?: unknown[]) => { rows: unknown[] } | Promise<{ rows: unknown[] }>) {
  const query = vi.fn(async (sql: string, values?: unknown[]) => handler(sql, values));
  const client = { query, release: vi.fn() } as unknown as PoolClient;
  const pool = { connect: vi.fn().mockResolvedValue(client), query } as unknown as Pool;
  return { pool, query };
}

describe('PostgresCheckInRepository transaction engine', () => {
  it('atomically inserts check-in, increments balance, and appends ledger for a first reward', async () => {
    const { pool, query } = fakePool((sql) => {
      if (sql.includes('select point_balance')) return { rows: [{ point_balance: 500, status: 'ACTIVE' }] };
      if (sql.includes('idempotency_key = $2')) return { rows: [] };
      if (sql.includes('from public.tour_spots')) return { rows: [{ content_type_id: 12, status: 'ACTIVE',
        is_declining_area: false, area_code: 32, quiet_weight: 1, distance_m: 100 }] };
      if (sql.includes('movement_distance_m')) return { rows: [] };
      if (sql.includes(') as rewarded')) return { rows: [{ rewarded: false }] };
      if (sql.includes('rewarded_count')) return { rows: [{ rewarded_count: 9, rewarded_points: 4_800 }] };
      if (sql.includes('insert into public.check_ins')) return { rows: [{ id: 'check-in-1' }] };
      if (sql.includes('update public.profiles')) return { rows: [{ point_balance: 650 }] };
      return { rows: [] };
    });
    const created = await new PostgresCheckInRepository(pool).create(command);
    expect(created).toMatchObject({ replayed: false, result: {
      checkInId: 'check-in-1', status: 'SUCCESS', distanceM: 100,
      reward: { points: 150, balance: 650, policyVersion: 'reward-v1' },
    } });
    const sql = query.mock.calls.map((call) => String(call[0]));
    expect(sql[0]).toBe('begin');
    expect(sql.some((item) => item.includes('for update'))).toBe(true);
    expect(sql.some((item) => item.includes('extensions.st_distance'))).toBe(true);
    expect(sql.some((item) => item.includes('insert into public.point_ledger'))).toBe(true);
    expect(sql.at(-1)).toBe('commit');
  });

  it('returns the exact persisted result for an idempotent replay without another write', async () => {
    const { pool, query } = fakePool((sql) => {
      if (sql.includes('select point_balance')) return { rows: [{ point_balance: 650, status: 'ACTIVE' }] };
      if (sql.includes('idempotency_key = $2')) return { rows: [resultRow()] };
      return { rows: [] };
    });
    const replay = await new PostgresCheckInRepository(pool).create(command);
    expect(replay).toEqual({ replayed: true, result: {
      checkInId: '10000000-0000-4000-8000-000000000001', status: 'SUCCESS', distanceM: 42.7, riskCode: null,
      reward: { points: 150, balance: 650, policyVersion: 'reward-v1',
        factors: { base: 100, areaWeight: 1.5, quietWeight: 1 } },
    } });
    expect(query.mock.calls.some((call) => String(call[0]).includes('insert into public.check_ins'))).toBe(false);
    expect(query.mock.calls.some((call) => String(call[0]).includes('point_ledger'))).toBe(false);
  });

  it('persists impossible movement as REVIEW and withholds ledger points', async () => {
    const { pool, query } = fakePool((sql) => {
      if (sql.includes('select point_balance')) return { rows: [{ point_balance: 500, status: 'ACTIVE' }] };
      if (sql.includes('idempotency_key = $2')) return { rows: [] };
      if (sql.includes('from public.tour_spots')) return { rows: [{ content_type_id: 12, status: 'ACTIVE',
        is_declining_area: true, area_code: 32, quiet_weight: 1, distance_m: 20 }] };
      if (sql.includes('movement_distance_m')) return { rows: [{ created_at: new Date(now.valueOf() - 600_000), movement_distance_m: 30_000 }] };
      if (sql.includes('insert into public.check_ins')) return { rows: [{ id: 'review-1' }] };
      return { rows: [] };
    });
    const created = await new PostgresCheckInRepository(pool).create(command);
    expect(created.result).toMatchObject({ status: 'REVIEW', riskCode: 'IMPOSSIBLE_SPEED', reward: { points: 0, balance: 500 } });
    expect(query.mock.calls.some((call) => String(call[0]).includes('insert into public.point_ledger'))).toBe(false);
  });

  it('accepts a revisit without a duplicate reward or ledger transaction', async () => {
    const { pool, query } = fakePool((sql) => {
      if (sql.includes('select point_balance')) return { rows: [{ point_balance: 500, status: 'ACTIVE' }] };
      if (sql.includes('idempotency_key = $2')) return { rows: [] };
      if (sql.includes('from public.tour_spots')) return { rows: [{ content_type_id: 12, status: 'ACTIVE',
        is_declining_area: false, area_code: 1, quiet_weight: 1, distance_m: 20 }] };
      if (sql.includes('movement_distance_m')) return { rows: [] };
      if (sql.includes(') as rewarded')) return { rows: [{ rewarded: true }] };
      if (sql.includes('insert into public.check_ins')) return { rows: [{ id: 'revisit-1' }] };
      return { rows: [] };
    });
    const created = await new PostgresCheckInRepository(pool).create(command);
    expect(created.result).toMatchObject({ status: 'SUCCESS', riskCode: 'ALREADY_REWARDED', reward: { points: 0, balance: 500 } });
    expect(query.mock.calls.some((call) => String(call[0]).includes('insert into public.point_ledger'))).toBe(false);
  });

  it('persists an accepted visit with zero points when the KST daily count cap is reached', async () => {
    const { pool, query } = fakePool((sql, values) => {
      if (sql.includes('select point_balance')) return { rows: [{ point_balance: 4_900, status: 'ACTIVE' }] };
      if (sql.includes('idempotency_key = $2')) return { rows: [] };
      if (sql.includes('from public.tour_spots')) return { rows: [{ content_type_id: 12, status: 'ACTIVE',
        is_declining_area: false, area_code: 1, quiet_weight: 1, distance_m: 20 }] };
      if (sql.includes('movement_distance_m')) return { rows: [] };
      if (sql.includes(') as rewarded')) return { rows: [{ rewarded: false }] };
      if (sql.includes('rewarded_count')) {
        expect((values?.[1] as Date).toISOString()).toBe('2026-08-24T15:00:00.000Z');
        return { rows: [{ rewarded_count: 10, rewarded_points: 4_900 }] };
      }
      if (sql.includes('insert into public.check_ins')) return { rows: [{ id: 'capped-1' }] };
      return { rows: [] };
    });
    const created = await new PostgresCheckInRepository(pool).create(command);
    expect(created.result).toMatchObject({ status: 'SUCCESS', riskCode: 'DAILY_CHECK_IN_CAP', reward: { points: 0, balance: 4_900 } });
    expect(query.mock.calls.some((call) => String(call[0]).includes('insert into public.point_ledger'))).toBe(false);
  });

  it('rolls back every write when ledger persistence fails', async () => {
    const { pool, query } = fakePool((sql) => {
      if (sql.includes('select point_balance')) return { rows: [{ point_balance: 0, status: 'ACTIVE' }] };
      if (sql.includes('idempotency_key = $2')) return { rows: [] };
      if (sql.includes('from public.tour_spots')) return { rows: [{ content_type_id: 12, status: 'ACTIVE',
        is_declining_area: false, area_code: 1, quiet_weight: 1, distance_m: 20 }] };
      if (sql.includes('movement_distance_m')) return { rows: [] };
      if (sql.includes(') as rewarded')) return { rows: [{ rewarded: false }] };
      if (sql.includes('rewarded_count')) return { rows: [{ rewarded_count: 0, rewarded_points: 0 }] };
      if (sql.includes('insert into public.check_ins')) return { rows: [{ id: 'check-in-1' }] };
      if (sql.includes('update public.profiles')) return { rows: [{ point_balance: 100 }] };
      if (sql.includes('insert into public.point_ledger')) throw new Error('ledger unavailable');
      return { rows: [] };
    });
    await expect(new PostgresCheckInRepository(pool).create(command)).rejects.toThrow('ledger unavailable');
    expect(query.mock.calls.at(-1)?.[0]).toBe('rollback');
  });

  it('keeps database-level race protections and row locking in the schema/transaction', () => {
    const migration = readFileSync(resolve(process.cwd(), '../../supabase/migrations/202608160001_initial_schema.sql'), 'utf8');
    expect(migration).toContain('unique (user_id, idempotency_key)');
    expect(migration).toContain('check_ins_first_reward_unique');
  });
});
