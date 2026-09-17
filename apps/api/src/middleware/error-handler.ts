import type { ErrorRequestHandler, RequestHandler } from 'express';
import { HttpError } from '../lib/http-error.js';

export const notFoundHandler: RequestHandler = (request, _response, next) => {
  next(new HttpError(404, 'ROUTE_NOT_FOUND', `${request.method} ${request.path} 경로가 없습니다.`));
};

export const errorHandler: ErrorRequestHandler = (error, request, response, _next) => {
  const parserError = error && typeof error === 'object' ? error as { type?: string; status?: number } : null;
  const handledError = error instanceof HttpError ? error
    : parserError?.type === 'entity.parse.failed' && parserError.status === 400
      ? new HttpError(400, 'INVALID_JSON', 'JSON 요청 본문을 확인해 주세요.')
      : parserError?.type === 'entity.too.large' && parserError.status === 413
        ? new HttpError(413, 'PAYLOAD_TOO_LARGE', '요청 본문이 너무 큽니다.')
        : null;
  const status = handledError?.status ?? 500;

  if (!handledError) {
    console.error('[api-error]', {
      traceId: request.traceId,
      method: request.method,
      path: request.originalUrl,
      error,
    });
    if (error instanceof Error && error.stack) console.error(error.stack);
  }

  response.status(status).json({
    error: {
      code: handledError?.code ?? 'INTERNAL_SERVER_ERROR',
      message: handledError?.message ?? '서버에서 요청을 처리하지 못했습니다.',
      ...(handledError?.details ? { details: handledError.details } : {}),
      traceId: request.traceId,
    },
  });
};

