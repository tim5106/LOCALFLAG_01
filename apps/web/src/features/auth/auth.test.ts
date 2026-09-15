// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { getAccessToken, signIn } from './auth';

describe('development sign in', () => {
  beforeEach(() => localStorage.clear());

  it('stores the API development token when Supabase Auth is not configured', async () => {
    const user = await signIn('traveler@example.com', 'localflag');
    expect(user.accessToken).toBe('dev-test-token');
    expect(getAccessToken()).toBe('dev-test-token');
  });
});