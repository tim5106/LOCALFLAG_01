import { describe, expect, it } from 'vitest';
import { distanceInMeters } from './geo.js';

describe('distanceInMeters', () => {
  it('returns zero for the same point', () => {
    expect(distanceInMeters({ lat: 37.5665, lng: 126.978 }, { lat: 37.5665, lng: 126.978 })).toBe(0);
  });

  it('calculates a plausible distance between nearby points', () => {
    const distance = distanceInMeters(
      { lat: 37.5665, lng: 126.978 },
      { lat: 37.5674, lng: 126.978 },
    );
    expect(distance).toBeGreaterThan(95);
    expect(distance).toBeLessThan(105);
  });
});

