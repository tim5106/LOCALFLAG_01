import { Router, type RequestHandler } from 'express';
import { z } from 'zod';
import { CheckInRuleError } from '../domain/check-in.js';
import { HttpError } from '../lib/http-error.js';
import { createRateLimiter } from '../middleware/rate-limit.js';
import { CheckInService } from '../services/check-in-service.js';

const positionSchema = z.object({
  lat: z.number().min(33).max(39),
  lng: z.number().min(124).max(132),
  accuracyM: z.number().positive().max(5_000),
  capturedAt: z.iso.datetime(),
}).strict();

const checkInSchema = z.object({
  spotId: z.number().int().positive(),
  position: positionSchema,
}).strict();

function userId(request: Express.Request): string {
  if (!request.userId) throw new HttpError(401, 'UNAUTHORIZED', '로그인이 필요합니다.');
  return request.userId;
}

function parsedPosition(position: z.infer<typeof positionSchema>) {
  return { ...position, capturedAt: new Date(position.capturedAt) };
}

function mapError(error: unknown): unknown {
  return error instanceof CheckInRuleError
    ? new HttpError(error.status, error.code, error.message, error.details)
    : error;
}

export function createCheckInsRouter(requireAuth: RequestHandler, service: CheckInService): Router {
  const router = Router();
  router.use(requireAuth);

  const limiter = createRateLimiter({ limit: 20, windowMs: 60_000 });
  router.post('/precheck', limiter, async (request, response, next) => {
    try {
      const body = checkInSchema.safeParse(request.body);
      if (!body.success) throw new HttpError(400, 'INVALID_POSITION', '인증 위치 정보 형식을 확인해 주세요.', { issues: body.error.issues });
      response.json({ data: await service.precheck(userId(request), body.data.spotId, parsedPosition(body.data.position)) });
    } catch (error) { next(mapError(error)); }
  });

  router.post('/', limiter, async (request, response, next) => {
    try {
      const idempotencyKey = request.header('idempotency-key');
      if (!idempotencyKey) throw new HttpError(400, 'IDEMPOTENCY_KEY_REQUIRED', 'Idempotency-Key 헤더가 필요합니다.');
      if (idempotencyKey.length < 8 || idempotencyKey.length > 100) {
        throw new HttpError(400, 'INVALID_IDEMPOTENCY_KEY', 'Idempotency-Key 길이를 확인해 주세요.');
      }
      const body = checkInSchema.safeParse(request.body);
      if (!body.success) throw new HttpError(400, 'INVALID_POSITION', '인증 위치 정보 형식을 확인해 주세요.', { issues: body.error.issues });
      const created = await service.create({
        userId: userId(request), spotId: body.data.spotId,
        position: parsedPosition(body.data.position), idempotencyKey,
      });
      response.status(created.replayed ? 200 : 201).json({ data: created.result });
    } catch (error) { next(mapError(error)); }
  });

  router.get('/:checkInId', async (request, response, next) => {
    try {
      const id = z.uuid().safeParse(request.params.checkInId);
      if (!id.success) throw new HttpError(400, 'INVALID_CHECK_IN_ID', '체크인 ID 형식이 올바르지 않습니다.');
      const result = await service.findOwned(userId(request), id.data);
      if (!result) throw new HttpError(404, 'CHECK_IN_NOT_FOUND', '체크인 결과를 찾을 수 없습니다.');
      response.json({ data: result });
    } catch (error) { next(mapError(error)); }
  });
  return router;
}
