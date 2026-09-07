const METROPOLITAN_AREA_CODES = new Set([1, 2, 31]);

export interface RewardFactors {
  base: 100;
  areaWeight: number;
  quietWeight: number;
}

export interface RewardEstimate {
  points: number;
  factors: RewardFactors;
  policyVersion: 'reward-v1';
}

export function estimateReward(input: {
  areaCode: number | null;
  isDecliningArea: boolean;
  quietWeight: number;
}): RewardEstimate {
  const areaWeight = input.isDecliningArea
    ? 2.5
    : input.areaCode !== null && METROPOLITAN_AREA_CODES.has(input.areaCode) ? 1 : 1.5;
  const quietWeight = Number.isFinite(input.quietWeight) && input.quietWeight > 0
    ? input.quietWeight
    : 1;
  const points = Math.min(500, Math.max(10, Math.round(100 * areaWeight * quietWeight)));
  return { points, factors: { base: 100, areaWeight, quietWeight }, policyVersion: 'reward-v1' };
}
