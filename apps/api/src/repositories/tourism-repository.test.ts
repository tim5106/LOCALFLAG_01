import type { Pool, PoolClient } from 'pg';
import { describe, expect, it, vi } from 'vitest';
import type { NormalizedTourSpot, SpotScore } from '../domain/tourism.js';
import { PostgresTourismRepository } from './tourism-repository.js';

const spot: NormalizedTourSpot = {
  contentId: 3038260,
  contentTypeId: 14,
  title: '국립기상박물관',
  address: '서울특별시 종로구',
  latitude: 37.57,
  longitude: 126.96,
  areaCode: 1,
  sigunguCode: 23,
  imageUrl: null,
  thumbnailUrl: null,
  eventStartDate: null,
  eventEndDate: null,
  additionalImageCount: 0,
  detailFieldCount: 0,
  classificationWeight: 0,
  rawJson: {},
};
const score: SpotScore = {
  categoryWeight: 1.3,
  mediaWeight: 0,
  detailWeight: 0,
  classWeight: 0,
  quietWeight: 1,
  spotScore: 130,
  grade: 'A',
  scoreVersion: 'spot-score-v1',
};

describe('PostgresTourismRepository reviewed overrides', () => {
  it('does not overwrite a manually reviewed location during TourAPI re-upsert', async () => {
    const query = vi.fn(async (sql: string) => (
      sql.includes('from public.declining_areas') ? { rows: [{ matches: false }] } : { rows: [] }
    ));
    const client = { query, release: vi.fn() } as unknown as PoolClient;
    const pool = { connect: vi.fn().mockResolvedValue(client) } as unknown as Pool;

    await new PostgresTourismRepository(pool).upsertSpotAndScore('batch-id', spot, score);

    const upsertSql = String(query.mock.calls.find((call) => String(call[0]).includes('insert into public.tour_spots'))?.[0]);
    expect(upsertSql).toContain('when tour_spots.reviewed_override then tour_spots.location');
    expect(upsertSql).toContain('else excluded.location');
    expect(upsertSql).not.toContain('check_in_enabled = excluded.check_in_enabled');
  });
});
