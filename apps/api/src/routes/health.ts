import { Router } from 'express';

const startedAt = new Date().toISOString();
export const healthRouter = Router();

healthRouter.get('/', (_request, response) => {
  response.json({
    data: {
      status: 'ok',
      service: 'local-flag-api',
      version: '0.1.0',
      startedAt,
    },
  });
});

