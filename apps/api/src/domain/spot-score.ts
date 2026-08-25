import type { NormalizedTourSpot, SpotGrade, SpotScore, SupportedContentTypeId } from './tourism.js';

const CATEGORY_WEIGHTS: Record<SupportedContentTypeId, number> = {
  12: 1.5,
  14: 1.3,
  15: 2,
  28: 1.2,
  32: 0.8,
  38: 0.6,
  39: 0.5,
};

export function gradeForScore(score: number): SpotGrade {
  if (score >= 200) return 'S';
  if (score >= 130) return 'A';
  if (score >= 80) return 'B';
  return 'C';
}

export function calculateSpotScore(spot: NormalizedTourSpot): SpotScore {
  const categoryWeight = CATEGORY_WEIGHTS[spot.contentTypeId];
  const mediaWeight = (spot.imageUrl ? 0.15 : 0) + (spot.additionalImageCount > 0 ? 0.05 : 0);
  const detailWeight = spot.detailFieldCount >= 5 ? 0.2 : spot.detailFieldCount >= 3 ? 0.1 : 0;
  const classWeight = spot.classificationWeight;
  const spotScore = Math.round(
    (100 * categoryWeight) * (1 + mediaWeight + detailWeight + classWeight) * 100,
  ) / 100;

  return {
    categoryWeight,
    mediaWeight,
    detailWeight,
    classWeight,
    quietWeight: 1,
    spotScore,
    grade: gradeForScore(spotScore),
    scoreVersion: 'spot-score-v1',
  };
}
