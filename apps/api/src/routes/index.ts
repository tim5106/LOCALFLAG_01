import { Router } from 'express';
import { checkInsRouter } from './check-ins.js';
import { healthRouter } from './health.js';
import { spotsRouter } from './spots.js';

export const apiRouter = Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/spots', spotsRouter);
apiRouter.use('/check-ins', checkInsRouter);

