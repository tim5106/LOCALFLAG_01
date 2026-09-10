import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TokenVerificationError, type TokenVerifier } from '../auth/token-verifier.js';
import { errorHandler } from './error-handler.js';
import { createRequireAuth } from './require-auth.js';

const verifier: TokenVerifier = { verify: vi.fn() };
const users = { findProfile: vi.fn() };

function app() {
  const instance = express();
  instance.use((req, _res, next) => { req.traceId = 'test'; next(); });
  instance.get('/protected', createRequireAuth(verifier, users), (req, res) => res.json({ userId: req.userId }));
  instance.use(errorHandler);
  return instance;
}

describe('createRequireAuth', () => {
  beforeEach(() => { vi.resetAllMocks(); });

  it.each([undefined, 'Basic abc', 'Bearer', 'Bearer a b'])('rejects missing or malformed authorization: %s', async (header) => {
    const call = request(app()).get('/protected');
    if (header) call.set('authorization', header);
    const response = await call.expect(401);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
    expect(verifier.verify).not.toHaveBeenCalled();
  });

  it.each([
    ['TOKEN_INVALID', 'TOKEN_INVALID'], ['TOKEN_EXPIRED', 'TOKEN_EXPIRED'],
  ] as const)('maps %s verification failures', async (tokenCode, expected) => {
    vi.mocked(verifier.verify).mockRejectedValue(new TokenVerificationError(tokenCode));
    const response = await request(app()).get('/protected').set('authorization', 'Bearer token').expect(401);
    expect(response.body.error.code).toBe(expected);
  });

  it('accepts a verified active profile and derives its user ID from the token', async () => {
    vi.mocked(verifier.verify).mockResolvedValue({ userId: 'user-1' });
    users.findProfile.mockResolvedValue({ id: 'user-1', status: 'ACTIVE' });
    const response = await request(app()).get('/protected').set('authorization', 'Bearer token').expect(200);
    expect(response.body.userId).toBe('user-1');
    expect(users.findProfile).toHaveBeenCalledWith('user-1');
  });

  it.each([
    [null, 401, 'PROFILE_NOT_FOUND'],
    [{ id: 'user-1', status: 'DELETED' }, 401, 'PROFILE_NOT_FOUND'],
    [{ id: 'user-1', status: 'SUSPENDED' }, 403, 'PROFILE_SUSPENDED'],
  ])('rejects unavailable profiles', async (profile, status, code) => {
    vi.mocked(verifier.verify).mockResolvedValue({ userId: 'user-1' });
    users.findProfile.mockResolvedValue(profile);
    const response = await request(app()).get('/protected').set('authorization', 'Bearer token').expect(status);
    expect(response.body.error.code).toBe(code);
  });
});
