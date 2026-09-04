import { describe, expect, it } from 'vitest';
import {
  CHECK_IN_POLICY,
  applyDailyRewardLimits,
  isCooldownComplete,
  isWithinCheckInRadius,
  kstDayStartUtc,
  movementSpeedKmh,
  positionReasons,
  requiresMovementReview,
} from './check-in-policy.js';

const now = new Date('2026-08-25T12:00:00.000Z');

describe('check-in policy boundaries', () => {
  it.each([[99, true], [100, true], [101, false]] as const)('evaluates %sm radius', (distance, accepted) => {
    expect(isWithinCheckInRadius(distance)).toBe(accepted);
  });

  it.each([[49, false], [50, false], [51, true]] as const)('evaluates %sm GPS accuracy', (accuracyM, rejected) => {
    expect(positionReasons({ accuracyM, capturedAt: now, now }).includes('GPS_INACCURATE')).toBe(rejected);
  });

  it.each([
    [119_999, false], [120_000, false], [120_001, true],
  ] as const)('evaluates position age %sms', (ageMs, stale) => {
    const capturedAt = new Date(now.valueOf() - ageMs);
    expect(positionReasons({ accuracyM: 10, capturedAt, now }).includes('POSITION_STALE')).toBe(stale);
  });

  it('rejects unreasonable future timestamps but permits bounded clock skew', () => {
    expect(positionReasons({ accuracyM: 10, capturedAt: new Date(now.valueOf() + 30_000), now })).toEqual([]);
    expect(positionReasons({ accuracyM: 10, capturedAt: new Date(now.valueOf() + 30_001), now })).toContain('POSITION_FUTURE');
  });

  it.each([
    [299_999, false], [300_000, true], [300_001, true],
  ] as const)('evaluates cooldown elapsed %sms', (elapsedMs, complete) => {
    expect(isCooldownComplete(new Date(now.valueOf() - elapsedMs), now)).toBe(complete);
  });

  it('reviews movement only above 120 km/h', () => {
    expect(movementSpeedKmh(120_000, 3_600)).toBe(120);
    expect(requiresMovementReview(120)).toBe(false);
    expect(requiresMovementReview(120.001)).toBe(true);
    expect(requiresMovementReview(movementSpeedKmh(1, 0))).toBe(true);
    expect(requiresMovementReview(movementSpeedKmh(0, 0))).toBe(false);
  });

  it('enforces both daily caps without partial point grants', () => {
    expect(applyDailyRewardLimits({ candidatePoints: 100, rewardedCheckInCount: 9, rewardedPointTotal: 4_900 }))
      .toEqual({ points: 100, reason: null });
    expect(applyDailyRewardLimits({ candidatePoints: 100, rewardedCheckInCount: 10, rewardedPointTotal: 4_900 }))
      .toEqual({ points: 0, reason: 'DAILY_CHECK_IN_CAP' });
    expect(applyDailyRewardLimits({ candidatePoints: 100, rewardedCheckInCount: 9, rewardedPointTotal: 5_000 }))
      .toEqual({ points: 0, reason: 'DAILY_POINT_CAP' });
    expect(applyDailyRewardLimits({ candidatePoints: 101, rewardedCheckInCount: 9, rewardedPointTotal: 4_900 }))
      .toEqual({ points: 0, reason: 'DAILY_POINT_CAP' });
    expect(CHECK_IN_POLICY.dailyRewardPointLimit).toBe(5_000);
  });

  it('calculates KST midnight independently of server timezone', () => {
    expect(kstDayStartUtc(new Date('2026-08-24T14:59:59.999Z')).toISOString()).toBe('2026-08-23T15:00:00.000Z');
    expect(kstDayStartUtc(new Date('2026-08-24T15:00:00.000Z')).toISOString()).toBe('2026-08-24T15:00:00.000Z');
    expect(kstDayStartUtc(new Date('2026-08-25T14:59:59.999Z')).toISOString()).toBe('2026-08-24T15:00:00.000Z');
  });
});
