import { randomUUID } from 'node:crypto';
import type { RequestHandler } from 'express';

export const requestContext: RequestHandler = (request, response, next) => {
  request.traceId = request.header('x-request-id')?.slice(0, 100) || `req_${randomUUID()}`;
  response.setHeader('x-request-id', request.traceId);
  next();
};

