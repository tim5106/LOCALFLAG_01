import type { Pool, PoolClient } from 'pg';
import { describe, expect, it, vi } from 'vitest';
import { PostgresPointReversalRepository } from './point-reversal-repository.js';

describe('append-only reversal foundation', () => {
  it('appends the inverse transaction and atomically updates balance', async () => {
    const query = vi.fn(async (sql: string) => {
      if (sql.includes("type <> 'REVERSAL'")) return { rows: [{ id: 'ledger-1', user_id: 'user', amount: 100 }] };
      if (sql.includes('select point_balance')) return { rows: [{ point_balance: 500 }] };
      if (sql.includes("type = 'REVERSAL'")) return { rows: [] };
      if (sql.includes('update public.profiles')) return { rows: [{ point_balance: 400 }] };
      return { rows: [] };
    });
    const client = { query, release: vi.fn() } as unknown as PoolClient;
    const subject = new PostgresPointReversalRepository({ connect: vi.fn().mockResolvedValue(client) } as unknown as Pool);
    await expect(subject.reverse({ originalLedgerId: 'ledger-1', idempotencyKey: 'reverse-key', reason: 'audit', now: new Date() }))
      .resolves.toEqual({ amount: -100, balance: 400, repeated: false });
    expect(query.mock.calls.some((call) => String(call[0]).includes('insert into public.point_ledger'))).toBe(true);
    expect(query.mock.calls.some((call) => String(call[0]).startsWith('update public.point_ledger'))).toBe(false);
  });

  it('prevents double reversal by replaying the existing reversal', async () => {
    const query = vi.fn(async (sql: string) => {
      if (sql.includes("type <> 'REVERSAL'")) return { rows: [{ id: 'ledger-1', user_id: 'user', amount: 100 }] };
      if (sql.includes('select point_balance')) return { rows: [{ point_balance: 400 }] };
      if (sql.includes("type = 'REVERSAL'")) return { rows: [{ amount: -100, balance_after: 400 }] };
      return { rows: [] };
    });
    const client = { query, release: vi.fn() } as unknown as PoolClient;
    const subject = new PostgresPointReversalRepository({ connect: vi.fn().mockResolvedValue(client) } as unknown as Pool);
    await expect(subject.reverse({ originalLedgerId: 'ledger-1', idempotencyKey: 'reverse-key', reason: 'audit', now: new Date() }))
      .resolves.toEqual({ amount: -100, balance: 400, repeated: true });
    expect(query.mock.calls.some((call) => String(call[0]).includes('insert into public.point_ledger'))).toBe(false);
  });
});
