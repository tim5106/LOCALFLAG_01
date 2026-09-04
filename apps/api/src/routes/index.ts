import { Router, type RequestHandler } from 'express';
import type { SpotReadRepository } from '../repositories/spot-read-repository.js';
import type { CheckInRepository } from '../repositories/check-in-repository.js';
import type { UserReadRepository } from '../repositories/user-read-repository.js';
import type { FlagRepository } from '../repositories/flag-repository.js';
import type { ReviewRepository } from '../repositories/review-repository.js';
import { CheckInService } from '../services/check-in-service.js';
import type { InternalOperations } from './internal.js';
import { createCheckInsRouter } from './check-ins.js';
import { healthRouter } from './health.js';
import { createMeRouter } from './me.js';
import { createSpotsRouter } from './spots.js';
import { createFlagSkinsRouter } from './flag-skins.js';
import { createInternalRouter } from './internal.js';

export interface ApiRouterDependencies {
  spots: SpotReadRepository;
  checkIns: CheckInRepository;
  users: UserReadRepository;
  flags: FlagRepository;
  reviews: ReviewRepository;
  requireAuth: RequestHandler;
  requireInternal: RequestHandler;
  operations: InternalOperations;
}

export function createApiRouter(dependencies: ApiRouterDependencies): Router {
  const router = Router();
  router.use('/health', healthRouter);
  router.use('/spots', createSpotsRouter(dependencies.spots, dependencies.requireAuth));
  router.use('/check-ins', createCheckInsRouter(
    dependencies.requireAuth,
    new CheckInService(dependencies.checkIns, dependencies.spots),
  ));
  router.use('/me', createMeRouter(dependencies.users, dependencies.flags, dependencies.requireAuth));
  router.use('/flag-skins', createFlagSkinsRouter(dependencies.requireAuth, dependencies.flags));
  router.use('/internal', createInternalRouter(dependencies.requireInternal, dependencies.reviews, dependencies.operations));
  return router;
}
