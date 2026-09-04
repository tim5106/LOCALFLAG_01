import { describe, expect, it } from 'vitest';
import { calculateRecommendationRank } from './recommendation.js';

describe('Recommendation V1', () => {
  it('keeps score dominant while applying explicit declining and image signals', () => {
    const base = calculateRecommendationRank({ spotScore: 150, isDecliningArea: false, quietWeight: 1, hasImage: false });
    const declining = calculateRecommendationRank({ spotScore: 150, isDecliningArea: true, quietWeight: 1, hasImage: false });
    const imaged = calculateRecommendationRank({ spotScore: 150, isDecliningArea: false, quietWeight: 1, hasImage: true });
    expect(base).toBe(160);
    expect(declining).toBe(185);
    expect(imaged).toBe(165);
  });
});
