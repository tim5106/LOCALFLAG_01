import { describe, expect, it } from 'vitest';
import { formatPoints } from './format';

describe('formatPoints', () => {
  it('formats point values for Korean users', () => {
    expect(formatPoints(1250)).toBe('1,250P');
  });
});

