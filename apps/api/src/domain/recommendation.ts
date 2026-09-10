export interface RecommendationPolicy {
  decliningAreaBonus: number;
  quietWeightMultiplier: number;
  imageBonus: number;
  version: 'recommendation-v1';
}

// Conservative V1: preserve the persisted score as the dominant signal and add small discovery bonuses.
export const RECOMMENDATION_V1: RecommendationPolicy = {
  decliningAreaBonus: 25,
  quietWeightMultiplier: 10,
  imageBonus: 5,
  version: 'recommendation-v1',
};

export function calculateRecommendationRank(input: {
  spotScore: number;
  isDecliningArea: boolean;
  quietWeight: number;
  hasImage: boolean;
}, policy: RecommendationPolicy = RECOMMENDATION_V1): number {
  return input.spotScore
    + (input.isDecliningArea ? policy.decliningAreaBonus : 0)
    + input.quietWeight * policy.quietWeightMultiplier
    + (input.hasImage ? policy.imageBonus : 0);
}
