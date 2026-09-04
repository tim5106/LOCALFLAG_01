export interface CheckInPosition {
  lat: number;
  lng: number;
  accuracyM: number;
  capturedAt: string;
}

export interface CheckInRequest {
  spotId: number | string;
  position: CheckInPosition;
}

export type PrecheckReason = 'GPS_INACCURATE' | 'POSITION_STALE' | 'OUT_OF_RANGE' | 'COOLDOWN' | 'DAILY_CAP' | 'ALREADY_REWARDED' | string;

export interface PrecheckResult {
  eligible: boolean;
  spotId: number;
  distanceM: number;
  allowedRadiusM: number;
  accuracyM: number;
  reasons: PrecheckReason[];
  estimatedReward: number;
}

export type CheckInStatus = 'SUCCESS' | 'REVIEW';

export interface CheckInReward {
  points: number;
  balance: number;
  policyVersion: string;
  factors?: Record<string, unknown>;
}

export interface CheckInResult {
  checkInId: string;
  status: CheckInStatus;
  distanceM: number;
  reward: CheckInReward;
}

export interface CheckInResponse<T> { data: T; }

export function buildCheckInPayload(spotId: number | string, position: CheckInPosition): CheckInRequest {
  return { spotId, position };
}

export function buildPrecheckPayload(spotId: number | string, position: CheckInPosition): CheckInRequest {
  return buildCheckInPayload(spotId, position);
}
