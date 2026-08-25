import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { errorHandler } from './error-handler.js';
import { createRateLimiter } from './rate-limit.js';
import { createRequireInternal } from './require-internal.js';

describe('operations security', () => {
  it('requires the exact internal secret', async () => {
    const app = express();
    app.use((req, _res, next) => { req.traceId = 'test'; next(); });
    app.get('/internal', createRequireInternal('1234567890123456'), (_req, res) => res.json({ ok: true }));
    app.use(errorHandler);
    await request(app).get('/internal').expect(401);
    await request(app).get('/internal').set('x-internal-secret', 'wrong-secret-123').expect(401);
    await request(app).get('/internal').set('x-internal-secret', '1234567890123456').expect(200);
  });

  it('returns the common 429 envelope without limiting unrelated routes', async () => {
    const now = vi.fn().mockReturnValue(1_000);
    const limiter = createRateLimiter({ limit: 1, windowMs: 60_000, now });
    const app = express();
    app.use((req, _res, next) => { req.traceId = 'test'; next(); });
    app.get('/write', limiter, (_req, res) => res.json({ ok: true }));
    app.get('/read', (_req, res) => res.json({ ok: true }));
    app.use(errorHandler);
    await request(app).get('/write').expect(200);
    const limited = await request(app).get('/write').expect(429);
    expect(limited.body.error).toMatchObject({ code: 'RATE_LIMITED', traceId: 'test' });
    await request(app).get('/read').expect(200);
  });
});
