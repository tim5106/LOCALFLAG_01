import { CHECK_IN_POLICY, isWithinCheckInRadius, positionReasons } from '../domain/check-in-policy.js';
import { CheckInRuleError, type CheckInPosition, type CheckInResult } from '../domain/check-in.js';
import { distanceInMeters } from '../domain/geo.js';
import { estimateReward } from '../domain/reward.js';
import type { CheckInRepository } from '../repositories/check-in-repository.js';
import type { SpotReadRepository } from '../repositories/spot-read-repository.js';

export class CheckInService {
  constructor(
    private readonly checkIns: CheckInRepository,
    private readonly spots: SpotReadRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async precheck(userId: string, spotId: number, position: CheckInPosition) {
    void userId;
    const spot = await this.spots.findVisibleById(spotId);
    if (!spot) throw new CheckInRuleError(404, 'SPOT_NOT_FOUND', '인증 가능한 장소를 찾을 수 없습니다.');
    if (spot.status !== 'ACTIVE' || !CHECK_IN_POLICY.eligibleContentTypeIds.includes(spot.contentTypeId)) {
      throw new CheckInRuleError(422, 'SPOT_NOT_ELIGIBLE', '현재 체크인할 수 없는 장소입니다.');
    }
    const distanceM = distanceInMeters(position, { lat: spot.lat, lng: spot.lng });
    const reasons: string[] = [...positionReasons({ ...position, now: this.now() })];
    if (!isWithinCheckInRadius(distanceM)) reasons.push('OUT_OF_RANGE');
    return {
      eligible: reasons.length === 0,
      spotId,
      distanceM: Math.round(distanceM * 10) / 10,
      allowedRadiusM: CHECK_IN_POLICY.allowedRadiusM,
      accuracyM: position.accuracyM,
      reasons,
      estimatedReward: reasons.length === 0 ? estimateReward(spot).points : 0,
    };
  }

  async create(input: {
    userId: string;
    spotId: number;
    position: CheckInPosition;
    idempotencyKey: string;
  }): Promise<{ result: CheckInResult; replayed: boolean }> {
    const now = this.now();
    const reasons = positionReasons({ ...input.position, now });
    const reason = reasons[0];
    if (reason) {
      const code = reason === 'POSITION_FUTURE' ? 'INVALID_POSITION' : reason;
      throw new CheckInRuleError(422, code, '제출한 위치의 정확도 또는 측정 시간을 확인해 주세요.');
    }
    return this.checkIns.create({ ...input, now });
  }

  findOwned(userId: string, checkInId: string): Promise<CheckInResult | null> {
    return this.checkIns.findOwned(userId, checkInId);
  }
}
