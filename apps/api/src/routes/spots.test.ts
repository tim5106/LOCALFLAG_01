import type { RequestHandler } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../app.js';
import type { SpotReadModel } from '../domain/public-spot.js';
import { HttpError } from '../lib/http-error.js';
import type { SpotReadRepository } from '../repositories/spot-read-repository.js';
import type { UserReadRepository } from '../repositories/user-read-repository.js';

const fixture: SpotReadModel = {
  id: 10, title: '숨은 숲', address: '강원도 고성군', contentTypeId: 12,
  lat: 38.1, lng: 128.2, grade: 'A', isDecliningArea: true,
  imageUrl: null, status: 'ACTIVE', areaCode: 32, quietWeight: 1,
};
const spots: SpotReadRepository = {
  list: vi.fn(), findVisibleById: vi.fn(), recommendations: vi.fn(), nearby: vi.fn(),
};
const users: UserReadRepository = {
  findProfile: vi.fn(), updateNickname: vi.fn(), listCheckIns: vi.fn(), listPointLedger: vi.fn(),
};
const authenticated: RequestHandler = (req, _res, next) => { req.userId = '00000000-0000-0000-0000-000000000001'; next(); };

function app(auth: RequestHandler = authenticated) { return createApp({ spots, users, requireAuth: auth }); }

describe('spot routes', () => {
  beforeEach(() => {
    vi.mocked(spots.list).mockReset().mockResolvedValue([]);
    vi.mocked(spots.findVisibleById).mockReset().mockResolvedValue(null);
    vi.mocked(spots.recommendations).mockReset().mockResolvedValue([]);
    vi.mocked(spots.nearby).mockReset().mockResolvedValue([]);
  });

  it('passes bbox, content, grade, region, declining, and search filters to the repository', async () => {
    vi.mocked(spots.list).mockResolvedValue([fixture]);
    const response = await request(app()).get('/api/v1/spots')
      .query({ minLat: 37, minLng: 127, maxLat: 39, maxLng: 129, contentTypeIds: '12,14',
        grades: 'S,A', decliningArea: 'true', q: '숲', areaCode: 32, sigunguCode: 1, limit: 10 })
      .expect(200);
    expect(spots.list).toHaveBeenCalledWith(expect.objectContaining({
      minLat: 37, minLng: 127, maxLat: 39, maxLng: 129, contentTypeIds: [12, 14],
      grades: ['S', 'A'], decliningArea: true, q: '숲', areaCode: 32, sigunguCode: 1, limit: 11,
    }));
    expect(response.body.data[0]).toMatchObject({ id: 10, estimatedReward: 250 });
  });

  it.each([
    [{ minLat: 37 }, 'INVALID_BBOX'],
    [{ minLat: 38, minLng: 127, maxLat: 37, maxLng: 128 }, 'INVALID_BBOX'],
    [{ contentTypeIds: '12,bad' }, 'INVALID_QUERY'],
    [{ grades: 'Z' }, 'INVALID_QUERY'],
    [{ limit: 101 }, 'INVALID_QUERY'],
  ])('rejects invalid list input', async (query, code) => {
    const response = await request(app()).get('/api/v1/spots').query(query).expect(400);
    expect(response.body.error.code).toBe(code);
    expect(spots.list).not.toHaveBeenCalled();
  });

  it('uses opaque stable cursors and rejects malformed cursors', async () => {
    vi.mocked(spots.list).mockResolvedValue([fixture, { ...fixture, id: 11 }]);
    const first = await request(app()).get('/api/v1/spots?limit=1').expect(200);
    expect(first.body.meta.hasNext).toBe(true);
    expect(first.body.meta.nextCursor).toEqual(expect.any(String));
    vi.mocked(spots.list).mockResolvedValue([]);
    await request(app()).get(`/api/v1/spots?cursor=${first.body.meta.nextCursor}`).expect(200);
    expect(spots.list).toHaveBeenLastCalledWith(expect.objectContaining({ afterId: 10 }));
    const malformed = await request(app()).get('/api/v1/spots?cursor=%%%').expect(400);
    expect(malformed.body.error.code).toBe('INVALID_CURSOR');
  });

  it('returns visible repository detail and hides missing/invisible records as 404', async () => {
    vi.mocked(spots.findVisibleById).mockResolvedValueOnce(fixture).mockResolvedValueOnce(null);
    await request(app()).get('/api/v1/spots/10').expect(200).expect(({ body }) => expect(body.data.id).toBe(10));
    await request(app()).get('/api/v1/spots/10').expect(404).expect(({ body }) => expect(body.error.code).toBe('SPOT_NOT_FOUND'));
  });

  it('returns deterministic recommendation pagination metadata', async () => {
    vi.mocked(spots.recommendations).mockResolvedValue([
      { ...fixture, recommendationRank: 185 }, { ...fixture, id: 11, recommendationRank: 180 },
    ]);
    const response = await request(app()).get('/api/v1/spots/recommendations?limit=1').expect(200);
    expect(response.body.meta).toMatchObject({ hasNext: true, policyVersion: 'recommendation-v1' });
    expect(spots.recommendations).toHaveBeenCalledWith(expect.objectContaining({ limit: 2 }));
  });

  it('bounds nearby queries and requires authentication', async () => {
    vi.mocked(spots.nearby).mockResolvedValue([{ ...fixture, distanceM: 42.74 }]);
    const response = await request(app()).get('/api/v1/spots/nearby?lat=38.1&lng=128.2&radiusM=500&limit=5').expect(200);
    expect(spots.nearby).toHaveBeenCalledWith({ lat: 38.1, lng: 128.2, radiusM: 500, limit: 5 });
    expect(response.body.data[0].distanceM).toBe(42.7);
    await request(app()).get('/api/v1/spots/nearby?lat=38.1&lng=128.2&radiusM=10001').expect(400);

    const reject: RequestHandler = (_req, _res, next) => next(new HttpError(401, 'UNAUTHORIZED', 'login'));
    await request(app(reject)).get('/api/v1/spots/nearby?lat=38.1&lng=128.2').expect(401);
  });
});
