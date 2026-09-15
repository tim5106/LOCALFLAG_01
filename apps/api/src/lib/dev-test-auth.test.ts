import { describe, expect, it } from 'vitest';
import { isDevTestTokenForEnvironment } from './dev-test-auth.js';

describe('development test authentication', () => {
  it('accepts the test token only outside production', () => {
    expect(isDevTestTokenForEnvironment('dev-test-token', 'development')).toBe(true);
    expect(isDevTestTokenForEnvironment('dev-test-token', 'test')).toBe(true);
    expect(isDevTestTokenForEnvironment('dev-test-token', 'production')).toBe(false);
  });
});
