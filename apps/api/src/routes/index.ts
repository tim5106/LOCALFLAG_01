import { Router, type RequestHandler } from 'express';
import type { SpotReadRepository } from '../repositories/spot-read-repository.js';
import type { UserReadRepository } from '../repositories/user-read-repository.js';
import { createCheckInsRouter } from './check-ins.js';
import { healthRouter } from './health.js';
import { createMeRouter } from './me.js';
import { createSpotsRouter } from './spots.js';

export interface ApiRouterDependencies {
  spots: SpotReadRepository;
  users: UserReadRepository;
  requireAuth: RequestHandler;
}

export function createApiRouter(dependencies: ApiRouterDependencies): Router {
  const router = Router();
  router.use('/health', healthRouter);
  router.use('/spots', createSpotsRouter(dependencies.spots, dependencies.requireAuth));
  router.use('/check-ins', createCheckInsRouter(dependencies.requireAuth, dependencies.spots));
  router.use('/me', createMeRouter(dependencies.users, dependencies.requireAuth));
  return router;
}
