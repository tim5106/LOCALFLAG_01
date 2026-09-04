import type { RequestHandler } from 'express';
import { env } from '../config/env.js';

export const requestLogger: RequestHandler = (request, response, next) => {
  if (env.NODE_ENV === 'test') { next(); return; }
  const started = performance.now();
  response.on('finish', () => {
    console.info('http_request', {
      traceId: request.traceId,
      method: request.method,
      route: request.path,
      status: response.statusCode,
      durationMs: Math.round((performance.now() - started) * 10) / 10,
    });
  });
  next();
};
