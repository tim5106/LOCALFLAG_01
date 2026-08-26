import { describe, expect, it } from 'vitest';
import { parseTourSyncLimit } from './env.js';

describe('parseTourSyncLimit', () => {
  it.each([undefined, '', '   '])('leaves an absent or empty limit unlimited', (value) => {
    expect(parseTourSyncLimit(value)).toBeUndefined();
  });

  it('accepts positive integers', () => {
    expect(parseTourSyncLimit('5')).toBe(5);
  });

  it.each(['0', '-1', '1.5', 'five', '01'])('rejects invalid value %s clearly', (value) => {
    expect(() => parseTourSyncLimit(value)).toThrow('TOUR_SYNC_LIMIT must be');
  });
});
