import { describe, expect, it } from 'vitest';
import { festivalStatus } from './festival.js';

describe('festival lifecycle', () => {
  it.each([
    ['2026-08-21', 'SCHEDULED'], ['2026-08-22', 'SCHEDULED'], ['2026-08-24', 'SCHEDULED'],
    ['2026-08-25', 'ACTIVE'], ['2026-08-26', 'ACTIVE'], ['2026-08-27', 'ACTIVE'], ['2026-08-28', 'EXPIRED'],
  ] as const)('maps %s deterministically', (today, status) => {
    expect(festivalStatus('2026-08-25', '2026-08-27', today)).toBe(status);
  });
  it.each([['bad', '2026-08-27'], ['2026-08-28', '2026-08-27']])('rejects malformed ranges', (start, end) => {
    expect(() => festivalStatus(start, end, '2026-08-25')).toThrow('INVALID_FESTIVAL_DATES');
  });
});
