import { describe, expect, it } from 'vitest';
import { calculateDistanceMeters, formatDistance } from './distance';

describe('check-in distance', () => {
  it('returns about zero for identical coordinates', () => expect(calculateDistanceMeters(37.58, 126.98, 37.58, 126.98)).toBeCloseTo(0, 4));
  it('calculates a nearby distance in meters', () => expect(calculateDistanceMeters(37.58, 126.98, 37.5807, 126.98)).toBeGreaterThan(70));
  it('formats long distances in kilometers', () => expect(formatDistance(1234)).toBe('1.2km'));
  it('rejects invalid coordinates', () => expect(calculateDistanceMeters(Number.NaN, 126.98, 37.58, 126.98)).toBe(Infinity));
});
