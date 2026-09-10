import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SpotReadModel } from '../domain/public-spot.js';
import type { CheckInRepository } from '../repositories/check-in-repository.js';
import type { SpotReadRepository } from '../repositories/spot-read-repository.js';
import { CheckInService } from './check-in-service.js';

const now = new Date('2026-08-25T12:00:00.000Z');
const checkIns: CheckInRepository = { create: vi.fn(), findOwned: vi.fn() };
const nationalMeteorologicalMuseum: SpotReadModel = {
  id: 3038260, title: '국립기상박물관', address: '', contentTypeId: 14,
  lat: 37.571416, lng: 126.966261, grade: 'A', isDecliningArea: false,
  imageUrl: null, status: 'ACTIVE', areaCode: 1, quietWeight: 1,
  geometryType: 'POINT', checkInEnabled: true, checkInRadiusM: 100,
};
const spots: SpotReadRepository = {
  list: vi.fn(), recommendations: vi.fn(), nearby: vi.fn(),
  findVisibleById: vi.fn(),
};

describe('CheckInService', () => {
  beforeEach(() => {
    vi.mocked(checkIns.create).mockReset();
    vi.mocked(spots.findVisibleById).mockReset().mockResolvedValue(nationalMeteorologicalMuseum);
  });

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
    const result = await service.precheck('verified-user', 3038260,
      { lat: 37.571416, lng: 126.966261, accuracyM: 51, capturedAt: now });
    expect(result).toMatchObject({ eligible: false, reasons: ['GPS_INACCURATE'], estimatedReward: 0 });
  });

  it('uses the reviewed coordinate and 100m radius for a normal POINT spot', async () => {
    const service = new CheckInService(checkIns, spots, () => now);
    const exact = await service.precheck('user', 3038260,
      { lat: 37.571416, lng: 126.966261, accuracyM: 20, capturedAt: now });
    const inside = await service.precheck('user', 3038260,
      { lat: 37.572266, lng: 126.966261, accuracyM: 20, capturedAt: now });
    const outside = await service.precheck('user', 3038260,
      { lat: 37.572326, lng: 126.966261, accuracyM: 20, capturedAt: now });

    expect(exact).toMatchObject({ eligible: true, distanceM: 0, allowedRadiusM: 100 });
    expect(inside.eligible).toBe(true);
    expect(inside.distanceM).toBeLessThan(100);
    expect(outside).toMatchObject({ eligible: false, allowedRadiusM: 100, reasons: ['OUT_OF_RANGE'] });
    expect(outside.distanceM).toBeGreaterThan(100);
  });

  it('enforces 윤동주 하숙집 터의 reviewed 60m radius', async () => {
    vi.mocked(spots.findVisibleById).mockResolvedValue({
      ...nationalMeteorologicalMuseum,
      id: 2993372,
      title: '윤동주 하숙집 터',
      lat: 37.58148,
      lng: 126.965722,
      checkInRadiusM: 60,
    });
    const service = new CheckInService(checkIns, spots, () => now);
    const inside = await service.precheck('user', 2993372,
      { lat: 37.58198, lng: 126.965722, accuracyM: 20, capturedAt: now });
    const outside = await service.precheck('user', 2993372,
      { lat: 37.58208, lng: 126.965722, accuracyM: 20, capturedAt: now });

    expect(inside).toMatchObject({ eligible: true, allowedRadiusM: 60 });
    expect(inside.distanceM).toBeLessThan(60);
    expect(outside).toMatchObject({ eligible: false, allowedRadiusM: 60, reasons: ['OUT_OF_RANGE'] });
    expect(outside.distanceM).toBeGreaterThan(60);
    expect(outside.distanceM).toBeLessThan(100);
  });

  it('rejects an AREA spot using checkInEnabled rather than geometry inference', async () => {
    vi.mocked(spots.findVisibleById).mockResolvedValue({
      ...nationalMeteorologicalMuseum,
      id: 2774283,
      title: '선바위(선암)',
      geometryType: 'AREA',
      checkInEnabled: false,
    });
    const service = new CheckInService(checkIns, spots, () => now);

    await expect(service.precheck('user', 2774283,
      { lat: 37.578997, lng: 126.958970, accuracyM: 20, capturedAt: now }))
      .rejects.toMatchObject({ code: 'SPOT_NOT_ELIGIBLE' });
  });
});
