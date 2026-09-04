import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { requestContext } from './middleware/request-context.js';
import { requestLogger } from './middleware/request-logger.js';
import { createApiRouter, type ApiRouterDependencies } from './routes/index.js';

export function createApp(dependencies: ApiRouterDependencies) {
  const app = express();

  app.disable('x-powered-by');
  if (env.NODE_ENV === 'production') app.set('trust proxy', 1);
  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
  app.use(requestContext);
  app.use(requestLogger);
  app.use(express.json({ limit: '64kb', strict: true }));

  app.use('/api/v1', createApiRouter(dependencies));
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

