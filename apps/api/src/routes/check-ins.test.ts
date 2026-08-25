import type { RequestHandler } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../app.js';
import { CheckInRuleError } from '../domain/check-in.js';
import type { CheckInRepository } from '../repositories/check-in-repository.js';
import type { FlagRepository } from '../repositories/flag-repository.js';
import type { ReviewRepository } from '../repositories/review-repository.js';
import type { SpotReadRepository } from '../repositories/spot-read-repository.js';
import type { UserReadRepository } from '../repositories/user-read-repository.js';

const userId = '00000000-0000-0000-0000-000000000001';
const auth: RequestHandler = (req, _res, next) => { req.userId = userId; next(); };
const spots: SpotReadRepository = {
  list: vi.fn(), recommendations: vi.fn(), nearby: vi.fn(), findVisibleById: vi.fn(),
};
const users: UserReadRepository = {
  findProfile: vi.fn(), updateNickname: vi.fn(), listCheckIns: vi.fn(), listPointLedger: vi.fn(),
};
const checkIns: CheckInRepository = { create: vi.fn(), findOwned: vi.fn() };
const flags = {} as FlagRepository; const reviews = {} as ReviewRepository;
const operations = { tourismSync: vi.fn(), festivalSync: vi.fn(), recalculateScores: vi.fn() };
const app = () => createApp({ spots, users, checkIns, flags, reviews, requireAuth: auth, requireInternal: auth, operations });
const result = { checkInId: '10000000-0000-4000-8000-000000000001', status: 'SUCCESS' as const,
  distanceM: 42.8, riskCode: null, reward: { points: 150, balance: 650, policyVersion: 'reward-v1',
    factors: { base: 100 as const, areaWeight: 1.5, quietWeight: 1 } } };
const body = () => ({ spotId: 7, position: { lat: 37, lng: 127, accuracyM: 20, capturedAt: new Date().toISOString() } });

describe('check-in routes', () => {
  beforeEach(() => { vi.resetAllMocks(); });

  it('creates a check-in from verified identity and returns 201', async () => {
    vi.mocked(checkIns.create).mockResolvedValue({ result, replayed: false });
    const response = await request(app()).post('/api/v1/check-ins').set('Idempotency-Key', 'idem-key-1').send(body()).expect(201);
    expect(response.body.data).toEqual(result);
    expect(checkIns.create).toHaveBeenCalledWith(expect.objectContaining({ userId, spotId: 7, idempotencyKey: 'idem-key-1' }));
  });

  it('returns 200 and the persisted result for an idempotent replay', async () => {
    vi.mocked(checkIns.create).mockResolvedValue({ result, replayed: true });
    await request(app()).post('/api/v1/check-ins').set('Idempotency-Key', 'idem-key-1').send(body()).expect(200);
  });

  it('validates idempotency key and position without invoking persistence', async () => {
    await request(app()).post('/api/v1/check-ins').send(body()).expect(400)
      .expect(({ body: response }) => expect(response.error.code).toBe('IDEMPOTENCY_KEY_REQUIRED'));
    await request(app()).post('/api/v1/check-ins').set('Idempotency-Key', 'short').send(body()).expect(400);
    await request(app()).post('/api/v1/check-ins').set('Idempotency-Key', 'idem-key-1')
      .send({ ...body(), position: { ...body().position, accuracyM: 0 } }).expect(400);
    expect(checkIns.create).not.toHaveBeenCalled();
  });

  it('maps transaction policy errors to stable API errors', async () => {
    vi.mocked(checkIns.create).mockRejectedValue(new CheckInRuleError(422, 'OUT_OF_RANGE', 'far', { distanceM: 101 }));
    const response = await request(app()).post('/api/v1/check-ins').set('Idempotency-Key', 'idem-key-1').send(body()).expect(422);
    expect(response.body.error).toMatchObject({ code: 'OUT_OF_RANGE', details: { distanceM: 101 } });
  });

  it('returns only an owner-scoped check-in result', async () => {
    vi.mocked(checkIns.findOwned).mockResolvedValueOnce(result).mockResolvedValueOnce(null);
    await request(app()).get(`/api/v1/check-ins/${result.checkInId}`).expect(200);
    expect(checkIns.findOwned).toHaveBeenCalledWith(userId, result.checkInId);
    await request(app()).get(`/api/v1/check-ins/${result.checkInId}`).expect(404);
  });
});
