import { describe, expect, it, vi } from 'vitest';
import type { CheckInRepository } from '../repositories/check-in-repository.js';
import type { SpotReadRepository } from '../repositories/spot-read-repository.js';
import { CheckInService } from './check-in-service.js';

const now = new Date('2026-08-25T12:00:00.000Z');
const checkIns: CheckInRepository = { create: vi.fn(), findOwned: vi.fn() };
const spots: SpotReadRepository = {
  list: vi.fn(), recommendations: vi.fn(), nearby: vi.fn(),
  findVisibleById: vi.fn().mockResolvedValue({
    id: 7, title: 'Spot', address: '', contentTypeId: 12, lat: 37, lng: 127,
    grade: 'A', isDecliningArea: false, imageUrl: null, status: 'ACTIVE', areaCode: 32, quietWeight: 1,
  }),
};

describe('CheckInService', () => {
  it('uses shared position policy before invoking the transaction repository', async () => {
    const service = new CheckInService(checkIns, spots, () => now);
    await expect(service.create({ userId: 'user', spotId: 7, idempotencyKey: 'abcdefgh',
      position: { lat: 37, lng: 127, accuracyM: 51, capturedAt: now } }))
      .rejects.toMatchObject({ code: 'GPS_INACCURATE' });
    expect(checkIns.create).not.toHaveBeenCalled();
  });

  it('passes only server-derived time and authenticated identity to the repository', async () => {
    const result = { checkInId: 'id', status: 'SUCCESS' as const, distanceM: 10, riskCode: null,
      reward: { points: 150, balance: 150, policyVersion: 'reward-v1',
        factors: { base: 100 as const, areaWeight: 1.5, quietWeight: 1 } } };
    vi.mocked(checkIns.create).mockResolvedValue({ result, replayed: false });
    const service = new CheckInService(checkIns, spots, () => now);
    await service.create({ userId: 'verified-user', spotId: 7, idempotencyKey: 'abcdefgh',
      position: { lat: 37, lng: 127, accuracyM: 50, capturedAt: now } });
    expect(checkIns.create).toHaveBeenCalledWith(expect.objectContaining({ userId: 'verified-user', now }));
  });

  it('keeps precheck advisory and aligned with accuracy and spot eligibility policy', async () => {
    const service = new CheckInService(checkIns, spots, () => now);
    const result = await service.precheck('verified-user', 7, { lat: 37, lng: 127, accuracyM: 51, capturedAt: now });
    expect(result).toMatchObject({ eligible: false, reasons: ['GPS_INACCURATE'], estimatedReward: 0 });
  });
});
