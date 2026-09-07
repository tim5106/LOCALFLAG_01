import type { RequestHandler } from 'express';
import { TokenVerificationError, type TokenVerifier } from '../auth/token-verifier.js';
import { HttpError } from '../lib/http-error.js';
import type { UserReadRepository } from '../repositories/user-read-repository.js';

export function createRequireAuth(
  verifier: TokenVerifier,
  users: Pick<UserReadRepository, 'findProfile'>,
): RequestHandler {
  return async (request, _response, next) => {
  try {
    const authorization = request.header('authorization');
    const match = authorization?.match(/^Bearer ([^\s,]+)$/i);
    if (!match?.[1]) {
      throw new HttpError(401, 'UNAUTHORIZED', '로그인이 필요합니다.');
    }
    const identity = await verifier.verify(match[1]);
    const profile = await users.findProfile(identity.userId);
    if (!profile || profile.status === 'DELETED') {
      throw new HttpError(401, 'PROFILE_NOT_FOUND', '사용자 프로필을 찾을 수 없습니다.');
    }
    if (profile.status === 'SUSPENDED') {
      throw new HttpError(403, 'PROFILE_SUSPENDED', '정지된 사용자입니다.');
    }
    request.userId = identity.userId;
    next();
  } catch (error) {
    if (error instanceof TokenVerificationError) {
      next(new HttpError(401, error.code, error.message));
      return;
    }
    next(error);
  }
  };
}

