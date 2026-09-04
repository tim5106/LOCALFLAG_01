import type { Pool, PoolClient } from 'pg';
import { describe, expect, it, vi } from 'vitest';
import { PostgresReviewRepository } from './review-repository.js';

function repository(status: 'REVIEW' | 'SUCCESS' | 'REJECTED' = 'REVIEW') {
  const query = vi.fn(async (sql: string) => {
    if (sql.includes('from public.check_ins where id')) return { rows: [{ user_id: 'user', content_id: 7,
      status, reward_points: status === 'SUCCESS' ? 150 : 0, balance_after: status === 'SUCCESS' ? 650 : 500,
      reward_factors: { base: 100, areaWeight: 1.5, quietWeight: 1 } }] };
    if (sql.includes('select point_balance')) return { rows: [{ point_balance: 500 }] };
    if (sql.includes('as rewarded')) return { rows: [{ rewarded: false }] };
    if (sql.includes('rewarded_count')) return { rows: [{ rewarded_count: 0, rewarded_points: 0 }] };
    if (sql.includes('update public.profiles')) return { rows: [{ point_balance: 650 }] };
    return { rows: [] };
  });
  const client = { query, release: vi.fn() } as unknown as PoolClient;
  return { query, subject: new PostgresReviewRepository({ connect: vi.fn().mockResolvedValue(client) } as unknown as Pool) };
}

describe('review resolution', () => {
  it('approves REVIEW atomically and grants eligible reward', async () => {
    const { query, subject } = repository();
    await expect(subject.resolve('id', 'APPROVE', new Date('2026-08-25T00:00:00Z')))
      .resolves.toMatchObject({ status: 'SUCCESS', rewardPoints: 150, balance: 650, repeated: false });
    expect(query.mock.calls.some((call) => String(call[0]).includes('insert into public.point_ledger'))).toBe(true);
    expect(query.mock.calls.at(-1)?.[0]).toBe('commit');
  });

  it('rejects REVIEW without granting points or deleting audit history', async () => {
    const { query, subject } = repository();
    await expect(subject.resolve('id', 'REJECT', new Date())).resolves.toMatchObject({ status: 'REJECTED', rewardPoints: 0 });
    expect(query.mock.calls.some((call) => String(call[0]).includes('point_ledger'))).toBe(false);
    expect(query.mock.calls.some((call) => String(call[0]).startsWith('delete'))).toBe(false);
  });

  it('repeats the same resolution safely and rejects conflicting resolution', async () => {
    await expect(repository('SUCCESS').subject.resolve('id', 'APPROVE', new Date())).resolves.toMatchObject({ repeated: true });
    await expect(repository('SUCCESS').subject.resolve('id', 'REJECT', new Date())).rejects.toMatchObject({ code: 'REVIEW_CONFLICT' });
  });
});
