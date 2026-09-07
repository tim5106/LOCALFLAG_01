import { describe, expect, it } from 'vitest';
import { calculateSpotScore, gradeForScore } from './spot-score.js';
import type { NormalizedTourSpot } from './tourism.js';

const spot: NormalizedTourSpot = {
  contentId: 1,
  contentTypeId: 12,
  title: 'Spot',
  address: '',
  latitude: 37,
  longitude: 127,
  areaCode: null,
  sigunguCode: null,
  imageUrl: null,
  thumbnailUrl: null,
  eventStartDate: null,
  eventEndDate: null,
  additionalImageCount: 0,
  detailFieldCount: 0,
  classificationWeight: 0,
  rawJson: {},
};

describe('spot scoring', () => {
  it.each([
    [79.9, 'C'], [80, 'B'], [129.9, 'B'], [130, 'A'], [199.9, 'A'], [200, 'S'],
  ] as const)('grades %s as %s', (score, grade) => {
    expect(gradeForScore(score)).toBe(grade);
  });

  it.each([
    [15, 200], [12, 150], [14, 130], [28, 120], [32, 80], [38, 60], [39, 50],
  ] as const)('uses the category weight for content type %s', (contentTypeId, expected) => {
    expect(calculateSpotScore({ ...spot, contentTypeId }).spotScore).toBe(expected);
  });

  it('applies media and detail bonuses but keeps classification neutral', () => {
    const score = calculateSpotScore({
      ...spot,
      imageUrl: 'https://example.com/main.jpg',
      additionalImageCount: 2,
      detailFieldCount: 5,
    });
    expect(score).toMatchObject({
      mediaWeight: 0.2,
      detailWeight: 0.2,
      classWeight: 0,
      quietWeight: 1,
      spotScore: 210,
      grade: 'S',
      scoreVersion: 'spot-score-v1',
    });
  });
});
