import type { RequestHandler } from 'express';
import { HttpError } from '../lib/http-error.js';

export function createRateLimiter(options: { limit: number; windowMs: number; now?: () => number }): RequestHandler {
  const buckets = new Map<string, { count: number; resetsAt: number }>();
  const now = options.now ?? Date.now;
  return (request, _response, next) => {
    const key = request.userId ?? request.ip ?? 'unknown';
    const time = now();
    const current = buckets.get(key);
    if (!current || current.resetsAt <= time) {
      buckets.set(key, { count: 1, resetsAt: time + options.windowMs });
      next(); return;
    }
    if (current.count >= options.limit) {
      next(new HttpError(429, 'RATE_LIMITED', '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.', {
        retryAfterSeconds: Math.ceil((current.resetsAt - time) / 1_000),
      }));
      return;
    }
    current.count += 1;
    next();
  };
}
