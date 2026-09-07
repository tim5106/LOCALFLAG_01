import { timingSafeEqual } from 'node:crypto';
import type { RequestHandler } from 'express';
import { HttpError } from '../lib/http-error.js';

export function createRequireInternal(expectedSecret: string): RequestHandler {
  return (request, _response, next) => {
    const supplied = request.header('x-internal-secret') ?? '';
    const expectedBuffer = Buffer.from(expectedSecret);
    const suppliedBuffer = Buffer.from(supplied);
    const valid = expectedBuffer.length === suppliedBuffer.length && timingSafeEqual(expectedBuffer, suppliedBuffer);
    if (!valid) { next(new HttpError(401, 'INTERNAL_UNAUTHORIZED', '내부 작업 인증에 실패했습니다.')); return; }
    next();
  };
}
