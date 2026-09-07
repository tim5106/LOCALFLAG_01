import type { Pool, PoolClient } from 'pg';
import { describe, expect, it, vi } from 'vitest';
import { PostgresFlagRepository } from './flag-repository.js';

function transactional(handler: (sql: string) => { rows: unknown[] }) {
  const query = vi.fn(async (sql: string) => handler(sql));
  const client = { query, release: vi.fn() } as unknown as PoolClient;
  return { query, repository: new PostgresFlagRepository({ connect: vi.fn().mockResolvedValue(client) } as unknown as Pool) };
}

describe('PostgresFlagRepository', () => {
  it('lists only active skins with ownership and equipped state in one query', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [{ id: 'red', name: 'Red', description: '', price: 100,
      asset_url: '/red.svg', owned: true, equipped: true }] });
    const result = await new PostgresFlagRepository({ query } as unknown as Pool).listCatalog('user');
    expect(String(query.mock.calls[0]?.[0])).toContain('where fs.is_active');
    expect(result).toEqual([{ id: 'red', name: 'Red', description: '', price: 100,
      assetUrl: '/red.svg', owned: true, equipped: true }]);
  });

  it('atomically purchases with authoritative price and negative ledger amount', async () => {
    const { query, repository } = transactional((sql) => {
      if (sql.includes('select point_balance')) return { rows: [{ point_balance: 500 }] };
      if (sql.includes('from public.skin_purchase_receipts')) return { rows: [] };
      if (sql.includes('from public.point_ledger')) return { rows: [{ used: false }] };
      if (sql.includes('from public.flag_skins')) return { rows: [{ price: 200, is_active: true }] };
      if (sql.includes('as owned')) return { rows: [{ owned: false }] };
      if (sql.includes('update public.profiles')) return { rows: [{ point_balance: 300 }] };
      return { rows: [] };
    });
    const result = await repository.purchase('user', 'red', 'purchase-key', new Date('2026-08-25T00:00:00Z'));
    expect(result).toMatchObject({ replayed: false, result: { skinId: 'red', balance: 300 } });
    const ledgerCall = query.mock.calls.find((call) => String(call[0]).includes('insert into public.point_ledger'));
    expect(ledgerCall?.[1]).toEqual(expect.arrayContaining([-200, 300, 'purchase-key']));
    expect(query.mock.calls.at(-1)?.[0]).toBe('commit');
  });

  it('replays a purchase without duplicate ownership or payment', async () => {
    const { query, repository } = transactional((sql) => {
      if (sql.includes('select point_balance')) return { rows: [{ point_balance: 300 }] };
      if (sql.includes('from public.skin_purchase_receipts')) return { rows: [{ skin_id: 'red', balance_after: 300,
        acquired_at: new Date('2026-08-25T00:00:00.000Z') }] };
      return { rows: [] };
    });
    const result = await repository.purchase('user', 'red', 'purchase-key', new Date());
    expect(result.replayed).toBe(true);
    expect(query.mock.calls.some((call) => String(call[0]).includes('insert into public.user_skins'))).toBe(false);
  });

  it('acquires a free skin with an idempotent receipt and no invalid zero ledger row', async () => {
    const { query, repository } = transactional((sql) => {
      if (sql.includes('select point_balance')) return { rows: [{ point_balance: 300 }] };
      if (sql.includes('skin_purchase_receipts')) return { rows: [] };
      if (sql.includes('from public.point_ledger')) return { rows: [{ used: false }] };
      if (sql.includes('from public.flag_skins')) return { rows: [{ price: 0, is_active: true }] };
      if (sql.includes('as owned')) return { rows: [{ owned: false }] };
      return { rows: [] };
    });
    await expect(repository.purchase('user', 'free', 'purchase-key', new Date()))
      .resolves.toMatchObject({ result: { balance: 300 } });
    expect(query.mock.calls.some((call) => String(call[0]).includes('insert into public.point_ledger'))).toBe(false);
    expect(query.mock.calls.some((call) => String(call[0]).includes('insert into public.skin_purchase_receipts'))).toBe(true);
  });

  it.each([
    ['missing', 'SKIN_NOT_FOUND', 500, undefined, false],
    ['inactive', 'SKIN_INACTIVE', 500, { price: 100, is_active: false }, false],
    ['owned', 'SKIN_ALREADY_OWNED', 500, { price: 100, is_active: true }, true],
    ['expensive', 'INSUFFICIENT_POINTS', 50, { price: 100, is_active: true }, false],
  ])('rolls back invalid purchase %s', async (_name, code, balance, skin, owned) => {
    const { query, repository } = transactional((sql) => {
      if (sql.includes('select point_balance')) return { rows: [{ point_balance: balance }] };
      if (sql.includes('from public.skin_purchase_receipts')) return { rows: [] };
      if (sql.includes('from public.point_ledger')) return { rows: [{ used: false }] };
      if (sql.includes('from public.flag_skins')) return { rows: skin ? [skin] : [] };
      if (sql.includes('as owned')) return { rows: [{ owned }] };
      return { rows: [] };
    });
    await expect(repository.purchase('user', 'red', 'purchase-key', new Date())).rejects.toMatchObject({ code });
    expect(query.mock.calls.at(-1)?.[0]).toBe('rollback');
  });

  it('equips only owned skins and permits returning to default', async () => {
    const query = vi.fn(async (sql: string) => sql.includes('select exists')
      ? { rows: [{ owned: true }] } : { rows: [{ equipped_skin_id: 'red' }] });
    const repository = new PostgresFlagRepository({ query } as unknown as Pool);
    await expect(repository.equip('user', 'red')).resolves.toBe('red');
    expect(String(query.mock.calls.at(-1)?.[0])).toContain('where user_id = $1');
  });

  it('returns deduplicated public spot coordinates and never user GPS', async () => {
    const query = vi.fn(async (sql: string) => sql.includes('user_map_settings')
      ? { rows: [{ equipped_skin_id: 'red' }] }
      : { rows: [{ spot_id: 7, spot_title: 'Spot', lat: 37, lng: 127,
          visited_at: new Date('2026-08-25T00:00:00Z'), reward_points: 100, status: 'SUCCESS' }] });
    const map = await new PostgresFlagRepository({ query } as unknown as Pool).getMap('user');
    expect(map.visits).toHaveLength(1);
    expect(map.visits[0]?.location).toEqual({ lat: 37, lng: 127 });
    const visitSql = String(query.mock.calls.find((call) => String(call[0]).includes('distinct on'))?.[0]);
    expect(visitSql).not.toContain('ci.location');
    expect(visitSql).toContain('ci.user_id = $1');
  });
});
