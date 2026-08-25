import type { Pool } from 'pg';
import { describe, expect, it, vi } from 'vitest';
import { PostgresUserReadRepository } from './user-read-repository.js';

function repository() {
  const query = vi.fn().mockResolvedValue({ rows: [] });
  return { query, subject: new PostgresUserReadRepository({ query } as unknown as Pool) };
}

describe('PostgresUserReadRepository', () => {
  it('scopes check-in history by authenticated user and never selects location', async () => {
    const { query, subject } = repository();
    await subject.listCheckIns('user-1', undefined, 21);
    const sql = String(query.mock.calls[0]?.[0]);
    expect(sql).toContain('where ci.user_id = $1');
    expect(sql).toContain('join public.tour_spots');
    expect(sql).not.toMatch(/ci\.location/);
    expect(query.mock.calls[0]?.[1]).toEqual(['user-1', 21]);
  });

  it('scopes ledger history and does not select metadata', async () => {
    const { query, subject } = repository();
    await subject.listPointLedger('user-1', { createdAt: '2026-08-25T00:00:00Z', id: 'id' }, 21);
    const sql = String(query.mock.calls[0]?.[0]);
    expect(sql).toContain('where pl.user_id = $1');
    expect(sql).not.toMatch(/pl\.metadata/);
    expect(sql).toContain('(pl.created_at, pl.id) <');
  });
});
