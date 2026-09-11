import { Router, type RequestHandler } from 'express';
import { randomUUID } from 'node:crypto';
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

function isDevTestUser(request: Express.Request) { return request.user?.isDevTestUser === true; }

function mockCheckIn(spotId: number, position: z.infer<typeof positionSchema>) {
  const checkInId = randomUUID();
  return { checkInId, status: 'SUCCESS' as const, distanceM: 0, riskCode: null,
    reward: { points: 100, balance: 100, policyVersion: 'dev-test-v1', factors: { base: 100, areaWeight: 1, quietWeight: 1 } },
    checkIn: { id: checkInId, spotId, status: 'SUCCESS' as const, reward: { points: 100 } }, position };
}

export function createCheckInsRouter(requireAuth: RequestHandler, service: CheckInService): Router {
  const router = Router();
  router.use(requireAuth);

  const limiter = createRateLimiter({ limit: 20, windowMs: 60_000 });
  router.use((request, response, next) => {
    if (!isDevTestUser(request) || request.method !== 'POST') return next();
    const body = checkInSchema.safeParse(request.body);
    if (!body.success) return next();
    if (request.path === '/precheck') {
      response.json({ data: { eligible: true, spotId: body.data.spotId, distanceM: 0, allowedRadiusM: 30, accuracyM: body.data.position.accuracyM, reasons: [], estimatedReward: 100 } });
      return;
    }
    if (request.path === '/') {
      const idempotencyKey = request.header('idempotency-key');
      if (!idempotencyKey || idempotencyKey.length < 8 || idempotencyKey.length > 100) return next();
      response.status(201).json({ data: mockCheckIn(body.data.spotId, body.data.position) });
      return;
    }
    next();
  });
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
