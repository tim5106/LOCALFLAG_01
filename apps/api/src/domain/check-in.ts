import type { RewardFactors } from './reward.js';

export interface CheckInPosition {
  lat: number;
  lng: number;
  accuracyM: number;
  capturedAt: Date;
}

export interface CreateCheckInCommand {
  userId: string;
  spotId: number;
  position: CheckInPosition;
  idempotencyKey: string;
  now: Date;
}

export interface CheckInResult {
  checkInId: string;
  status: 'SUCCESS' | 'REVIEW';
  distanceM: number;
  riskCode: string | null;
  reward: {
    points: number;
    balance: number;
    policyVersion: string;
    factors: RewardFactors;
  };
}

export class CheckInRuleError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'CheckInRuleError';
  }
}
