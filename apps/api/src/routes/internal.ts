import { Router, type RequestHandler } from 'express';
import { z } from 'zod';
import { HttpError } from '../lib/http-error.js';
import { createRateLimiter } from '../middleware/rate-limit.js';
import { ReviewRuleError, type ReviewRepository } from '../repositories/review-repository.js';

export interface InternalOperations {
  tourismSync(): Promise<unknown>;
  festivalSync(): Promise<unknown>;
  recalculateScores(): Promise<unknown>;
}

export function createInternalRouter(auth: RequestHandler, reviews: ReviewRepository, operations: InternalOperations): Router {
  const router = Router();
  router.use(auth, createRateLimiter({ limit: 10, windowMs: 60_000 }));
  router.post('/check-ins/:checkInId/review', async (request, response, next) => {
    try {
      const id = z.uuid().safeParse(request.params.checkInId);
      const body = z.object({ decision: z.enum(['APPROVE', 'REJECT']) }).strict().safeParse(request.body);
      if (!id.success || !body.success) throw new HttpError(400, 'INVALID_REVIEW', '검토 요청을 확인해 주세요.');
      response.json({ data: await reviews.resolve(id.data, body.data.decision, new Date()) });
    } catch (error) { next(error instanceof ReviewRuleError ? new HttpError(error.status, error.code, error.message) : error); }
  });
  router.post('/jobs/tour-spots/sync', async (_req, res, next) => { try { res.json({ data: await operations.tourismSync() }); } catch (e) { next(e); } });
  router.post('/jobs/festivals/sync', async (_req, res, next) => { try { res.json({ data: await operations.festivalSync() }); } catch (e) { next(e); } });
  router.post('/jobs/spot-scores/recalculate', async (_req, res, next) => { try { res.json({ data: await operations.recalculateScores() }); } catch (e) { next(e); } });
  return router;
}
