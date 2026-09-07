import type { Pool } from 'pg';
import { describe, expect, it, vi } from 'vitest';
import { RECOMMENDATION_V1 } from '../domain/recommendation.js';
import { PostgresSpotReadRepository } from './spot-read-repository.js';

function repository() {
  const query = vi.fn().mockResolvedValue({ rows: [] });
  return { query, subject: new PostgresSpotReadRepository({ query } as unknown as Pool) };
}

describe('PostgresSpotReadRepository', () => {
  it('executes bbox, visibility, filter, and search conditions in PostgreSQL', async () => {
    const { query, subject } = repository();
    await subject.list({ minLat: 37, minLng: 126, maxLat: 38, maxLng: 128,
      contentTypeIds: [12], grades: ['A'], decliningArea: true, q: 'forest',
      areaCode: 1, sigunguCode: 2, afterId: 10, limit: 21 });
    const sql = String(query.mock.calls[0]?.[0]);
    expect(sql).toContain("s.status in ('ACTIVE', 'SCHEDULED')");
    expect(sql).toContain('extensions.st_intersects');
    expect(sql).toContain('s.content_type_id = any');
    expect(sql).toContain('sc.grade = any');
    expect(sql).toContain('s.title ilike');
    expect(sql).toContain('s.address ilike');
    expect(sql).toContain('s.content_id >');
    expect(sql).toContain('order by s.content_id asc');
  });

  it('limits details to publicly visible states', async () => {
    const { query, subject } = repository();
    await expect(subject.findVisibleById(7)).resolves.toBeNull();
    expect(String(query.mock.calls[0]?.[0])).toContain("s.status in ('ACTIVE', 'SCHEDULED')");
  });

  it('uses isolated V1 recommendation weights and deterministic ordering', async () => {
    const { query, subject } = repository();
    await subject.recommendations({ after: { rank: 180, id: 7 }, limit: 21, policy: RECOMMENDATION_V1 });
    const sql = String(query.mock.calls[0]?.[0]);
    expect(sql).toContain("s.status in ('ACTIVE', 'SCHEDULED')");
    expect(sql).toContain('recommendation_rank desc, s.content_id asc');
    expect(query.mock.calls[0]?.[1]).toEqual([180, 7, 25, 10, 5, 21]);
  });

  it('performs bounded nearby filtering and distance ordering in PostGIS', async () => {
    const { query, subject } = repository();
    await subject.nearby({ lat: 37.5, lng: 127, radiusM: 2_000, limit: 20 });
    const sql = String(query.mock.calls[0]?.[0]);
    expect(sql).toContain('extensions.st_dwithin');
    expect(sql).toContain("s.status = 'ACTIVE'");
    expect(sql).toContain('order by distance_m asc, s.content_id asc limit $4');
    expect(query.mock.calls[0]?.[1]).toEqual([37.5, 127, 2_000, 20]);
  });
});
