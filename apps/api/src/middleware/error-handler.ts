import type { ErrorRequestHandler, RequestHandler } from 'express';
import { HttpError } from '../lib/http-error.js';

export const notFoundHandler: RequestHandler = (request, _response, next) => {
  next(new HttpError(404, 'ROUTE_NOT_FOUND', `${request.method} ${request.path} 경로가 없습니다.`));
};

export const errorHandler: ErrorRequestHandler = (error, request, response, _next) => {
  const knownError = error instanceof HttpError;
  const status = knownError ? error.status : 500;

  if (!knownError) {
    console.error(`[${request.traceId}]`, error);
  }

  response.status(status).json({
    error: {
      code: knownError ? error.code : 'INTERNAL_SERVER_ERROR',
      message: knownError ? error.message : '서버에서 요청을 처리하지 못했습니다.',
      ...(knownError && error.details ? { details: error.details } : {}),
      traceId: request.traceId,
    },
  });
};

