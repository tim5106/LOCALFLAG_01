import type { Pool } from 'pg';
import { describe, expect, it, vi } from 'vitest';
import { PostgresUserReadRepository } from './user-read-repository.js';
import { env } from '../config/env.js';

function repository() {
  const query = vi.fn().mockResolvedValue({ rows: [] });
  return { query, subject: new PostgresUserReadRepository({ query } as unknown as Pool) };
}

describe('PostgresUserReadRepository', () => {
  it.each(['development', 'test'] as const)('bootstraps the dev-test profile in %s', async (nodeEnv) => {
    const previous = env.NODE_ENV;
    env.NODE_ENV = nodeEnv;
    try {
      const { query, subject } = repository();
      const profile = { id: 'user-1', nickname: 'Test', pointBalance: 0, status: 'ACTIVE' as const, equippedFlagSkinId: null };
      vi.spyOn(subject, 'findProfile').mockResolvedValue(profile);
      await expect(subject.ensureActiveProfile('user-1', 'Test')).resolves.toEqual(profile);
      expect(query).toHaveBeenCalledTimes(3);
      expect(String(query.mock.calls[0]?.[0])).toContain('insert into auth.users');
      expect(String(query.mock.calls[1]?.[0])).toContain('insert into public.profiles');
      expect(String(query.mock.calls[2]?.[0])).toContain('insert into public.user_map_settings');
    } finally {
      env.NODE_ENV = previous;
    }
  });

  it('blocks dev-test profile bootstrap in production before any database call', async () => {
    const previous = env.NODE_ENV;
    env.NODE_ENV = 'production';
    try {
      const { query, subject } = repository();
      await expect(subject.ensureActiveProfile('user-1', 'Test')).rejects.toThrow('disabled in production');
      expect(query).not.toHaveBeenCalled();
    } finally {
      env.NODE_ENV = previous;
    }
  });

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
