export const CHECK_IN_POLICY = {
  version: 'check-in-v1',
  allowedRadiusM: 100,
  maximumAccuracyM: 50,
  maximumPositionAgeSeconds: 120,
  maximumFutureSkewSeconds: 30,
  cooldownSeconds: 5 * 60,
  dailyRewardedCheckInLimit: 10,
  dailyRewardPointLimit: 5_000,
  impossibleSpeedKmh: 120,
  // Accommodation, shopping, and restaurant eligibility remains a product decision.
  // Phase 3 conservatively authorizes only the four approved core categories.
  eligibleContentTypeIds: [12, 14, 15, 28] as readonly number[],
} as const;

export type PositionReason = 'GPS_INACCURATE' | 'POSITION_STALE' | 'POSITION_FUTURE';

export function positionReasons(input: {
  accuracyM: number;
  capturedAt: Date;
  now: Date;
}): PositionReason[] {
  const reasons: PositionReason[] = [];
  const ageSeconds = (input.now.valueOf() - input.capturedAt.valueOf()) / 1_000;
  if (input.accuracyM > CHECK_IN_POLICY.maximumAccuracyM) reasons.push('GPS_INACCURATE');
  if (ageSeconds > CHECK_IN_POLICY.maximumPositionAgeSeconds) reasons.push('POSITION_STALE');
  if (ageSeconds < -CHECK_IN_POLICY.maximumFutureSkewSeconds) reasons.push('POSITION_FUTURE');
  return reasons;
}

export function isWithinCheckInRadius(distanceM: number): boolean {
  return distanceM <= CHECK_IN_POLICY.allowedRadiusM;
}

export function isCooldownComplete(previousCreatedAt: Date | null, now: Date): boolean {
  if (!previousCreatedAt) return true;
  return now.valueOf() - previousCreatedAt.valueOf() >= CHECK_IN_POLICY.cooldownSeconds * 1_000;
}

export function retryAt(previousCreatedAt: Date): Date {
  return new Date(previousCreatedAt.valueOf() + CHECK_IN_POLICY.cooldownSeconds * 1_000);
}

export function movementSpeedKmh(distanceM: number, elapsedSeconds: number): number {
  if (elapsedSeconds <= 0) return distanceM > 0 ? Number.POSITIVE_INFINITY : 0;
  return (distanceM / 1_000) / (elapsedSeconds / 3_600);
}

export function requiresMovementReview(speedKmh: number): boolean {
  return speedKmh > CHECK_IN_POLICY.impossibleSpeedKmh;
}

export function applyDailyRewardLimits(input: {
  candidatePoints: number;
  rewardedCheckInCount: number;
  rewardedPointTotal: number;
}): { points: number; reason: 'DAILY_CHECK_IN_CAP' | 'DAILY_POINT_CAP' | null } {
  if (input.rewardedCheckInCount >= CHECK_IN_POLICY.dailyRewardedCheckInLimit) {
    return { points: 0, reason: 'DAILY_CHECK_IN_CAP' };
  }
  // Phase 3 conservatively withholds the entire reward rather than granting a partial award.
  if (input.rewardedPointTotal + input.candidatePoints > CHECK_IN_POLICY.dailyRewardPointLimit) {
    return { points: 0, reason: 'DAILY_POINT_CAP' };
  }
  return { points: input.candidatePoints, reason: null };
}

export function kstDayStartUtc(now: Date): Date {
  const kstOffsetMs = 9 * 60 * 60 * 1_000;
  const shifted = new Date(now.valueOf() + kstOffsetMs);
  const utcMidnight = Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate());
  return new Date(utcMidnight - kstOffsetMs);
}
