import { Router, type RequestHandler } from 'express';
import { z } from 'zod';
import { HttpError } from '../lib/http-error.js';
import { createRateLimiter } from '../middleware/rate-limit.js';
import { FlagRuleError, type FlagRepository } from '../repositories/flag-repository.js';

function userId(request: Express.Request): string {
  if (!request.userId) throw new HttpError(401, 'UNAUTHORIZED', '로그인이 필요합니다.');
  return request.userId;
}
function mapError(error: unknown) {
  return error instanceof FlagRuleError ? new HttpError(error.status, error.code, error.message) : error;
}

export function createFlagSkinsRouter(requireAuth: RequestHandler, flags: FlagRepository): Router {
  const router = Router();
  router.use(requireAuth);
  router.get('/', async (request, response, next) => {
    try { response.json({ data: await flags.listCatalog(userId(request)) }); } catch (error) { next(mapError(error)); }
  });
  router.post('/:skinId/purchase', createRateLimiter({ limit: 10, windowMs: 60_000 }), async (request, response, next) => {
    try {
      const skinId = z.string().trim().min(1).max(100).safeParse(request.params.skinId);
      if (!skinId.success) throw new HttpError(400, 'INVALID_SKIN_ID', '스킨 ID를 확인해 주세요.');
      const key = request.header('idempotency-key');
      if (!key) throw new HttpError(400, 'IDEMPOTENCY_KEY_REQUIRED', 'Idempotency-Key 헤더가 필요합니다.');
      if (key.length < 8 || key.length > 100) throw new HttpError(400, 'INVALID_IDEMPOTENCY_KEY', 'Idempotency-Key 길이를 확인해 주세요.');
      const purchased = await flags.purchase(userId(request), skinId.data, key, new Date());
      response.status(purchased.replayed ? 200 : 201).json({ data: purchased.result });
    } catch (error) { next(mapError(error)); }
  });
  return router;
}
