import type { RequestHandler } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../app.js';
import type { SpotReadRepository } from '../repositories/spot-read-repository.js';
import type { CheckInRepository } from '../repositories/check-in-repository.js';
import type { FlagRepository } from '../repositories/flag-repository.js';
import type { ReviewRepository } from '../repositories/review-repository.js';
import type { UserReadRepository } from '../repositories/user-read-repository.js';

const userId = '00000000-0000-0000-0000-000000000001';
const auth: RequestHandler = (req, _res, next) => { req.userId = userId; next(); };
const spots: SpotReadRepository = {
  list: vi.fn(), findVisibleById: vi.fn(), recommendations: vi.fn(), nearby: vi.fn(),
};
const users: UserReadRepository = {
  findProfile: vi.fn(), updateNickname: vi.fn(), listCheckIns: vi.fn(), listPointLedger: vi.fn(),
};
const checkIns: CheckInRepository = { create: vi.fn(), findOwned: vi.fn() };
const flags = { equip: vi.fn(), getMap: vi.fn() } as unknown as FlagRepository;
const reviews = {} as ReviewRepository;
const operations = { tourismSync: vi.fn(), festivalSync: vi.fn(), recalculateScores: vi.fn() };
const profile = { id: userId, nickname: 'Local', pointBalance: 500, status: 'ACTIVE' as const, equippedFlagSkinId: null };
const app = () => createApp({ spots, users, checkIns, flags, reviews, requireAuth: auth, requireInternal: auth, operations });

describe('user read routes', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(users.findProfile).mockResolvedValue(profile);
    vi.mocked(users.updateNickname).mockResolvedValue({ ...profile, nickname: 'Updated' });
    vi.mocked(users.listCheckIns).mockResolvedValue([]);
    vi.mocked(users.listPointLedger).mockResolvedValue([]);
    vi.mocked(flags.equip).mockResolvedValue('red');
    vi.mocked(flags.getMap).mockResolvedValue({ equippedFlagSkinId: 'red', visits: [] });
  });

  it('returns only the authenticated profile public fields', async () => {
    const response = await request(app()).get('/api/v1/me').expect(200);
    expect(users.findProfile).toHaveBeenCalledWith(userId);
    expect(response.body.data).toEqual({ id: userId, nickname: 'Local', pointBalance: 500, equippedFlagSkinId: null });
    expect(response.body.data.status).toBeUndefined();
  });

  it('trims and updates only nickname', async () => {
    const response = await request(app()).patch('/api/v1/me').send({ nickname: '  Updated  ' }).expect(200);
    expect(users.updateNickname).toHaveBeenCalledWith(userId, 'Updated');
    expect(response.body.data.nickname).toBe('Updated');
  });

  it.each([
    [{ nickname: '' }], [{ nickname: 'x'.repeat(31) }], [{ nickname: 'ok', pointBalance: 999 }], [{}],
  ])('rejects invalid nickname updates', async (body) => {
    await request(app()).patch('/api/v1/me').send(body).expect(400);
    expect(users.updateNickname).not.toHaveBeenCalled();
  });

  it('paginates check-ins for only the authenticated user without coordinates', async () => {
    vi.mocked(users.listCheckIns).mockResolvedValue([
      { checkInId: '10000000-0000-4000-8000-000000000001', spotId: 7, spotTitle: 'Forest', status: 'SUCCESS',
        distanceM: 20, rewardPoints: 100, riskCode: null, createdAt: '2026-08-25T00:00:00.000Z' },
      { checkInId: '10000000-0000-4000-8000-000000000002', spotId: 8, spotTitle: 'Sea', status: 'SUCCESS',
        distanceM: 30, rewardPoints: 150, riskCode: null, createdAt: '2026-08-24T00:00:00.000Z' },
    ]);
    const response = await request(app()).get('/api/v1/me/check-ins?limit=1').expect(200);
    expect(users.listCheckIns).toHaveBeenCalledWith(userId, undefined, 2);
    expect(response.body.meta.hasNext).toBe(true);
    expect(response.body.data[0].location).toBeUndefined();
    await request(app()).get(`/api/v1/me/check-ins?cursor=${response.body.meta.nextCursor}`).expect(200);
    expect(users.listCheckIns).toHaveBeenLastCalledWith(userId, expect.objectContaining({
      id: '10000000-0000-4000-8000-000000000001',
    }), 21);
  });

  it('returns only the authenticated ledger and rejects malformed cursors', async () => {
    vi.mocked(users.listPointLedger).mockResolvedValue([{ transactionId: '20000000-0000-4000-8000-000000000001',
      type: 'CHECK_IN', amount: 100, balanceAfter: 500, policyVersion: 'reward-v1',
      createdAt: '2026-08-25T00:00:00.000Z', checkInId: null }]);
    const response = await request(app()).get('/api/v1/me/point-ledger').expect(200);
    expect(users.listPointLedger).toHaveBeenCalledWith(userId, undefined, 21);
    expect(response.body.data[0].metadata).toBeUndefined();
    const invalid = await request(app()).get('/api/v1/me/point-ledger?cursor=bad').expect(400);
    expect(invalid.body.error.code).toBe('INVALID_CURSOR');
  });

  it('equips owned skins through the authenticated repository boundary and returns My Flag map', async () => {
    await request(app()).put('/api/v1/me/equipped-flag-skin').send({ skinId: 'red' }).expect(200);
    expect(flags.equip).toHaveBeenCalledWith(userId, 'red');
    const map = await request(app()).get('/api/v1/me/map').expect(200);
    expect(flags.getMap).toHaveBeenCalledWith(userId);
    expect(map.body.data).toEqual({ equippedFlagSkinId: 'red', visits: [] });
  });
});
