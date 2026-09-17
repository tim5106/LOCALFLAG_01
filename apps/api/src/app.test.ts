import type { RequestHandler } from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from './app.js';
import { env } from './config/env.js';
import type { SpotReadRepository } from './repositories/spot-read-repository.js';
import type { CheckInRepository } from './repositories/check-in-repository.js';
import type { FlagRepository } from './repositories/flag-repository.js';
import type { ReviewRepository } from './repositories/review-repository.js';
import type { UserReadRepository } from './repositories/user-read-repository.js';

const spots: SpotReadRepository = {
  count: vi.fn(),
  list: vi.fn().mockResolvedValue([]), findVisibleById: vi.fn().mockResolvedValue(null),
  recommendations: vi.fn().mockResolvedValue([]), nearby: vi.fn().mockResolvedValue([]),
};
const users: UserReadRepository = {
  findProfile: vi.fn().mockResolvedValue(null), updateNickname: vi.fn().mockResolvedValue(null),
  listCheckIns: vi.fn().mockResolvedValue([]), listPointLedger: vi.fn().mockResolvedValue([]),
};
const checkIns: CheckInRepository = { create: vi.fn(), findOwned: vi.fn() };
const flags = {} as FlagRepository; const reviews = {} as ReviewRepository;
const internal: RequestHandler = (_req, _res, next) => next();
const operations = { tourismSync: vi.fn(), festivalSync: vi.fn(), recalculateScores: vi.fn() };
const unauthorized: RequestHandler = (_request, _response, next) => next(new Error('not used'));
const app = createApp({ spots, users, checkIns, flags, reviews, requireAuth: unauthorized, requireInternal: internal, operations });

describe('Local Flag API', () => {
  it('reports its health', async () => {
    const response = await request(app).get('/api/v1/health').expect(200);
    expect(response.body.data.status).toBe('ok');
    expect(response.headers['x-request-id']).toBeTruthy();
    expect(response.headers['x-content-type-options']).toBe('nosniff');
  });

  it('allows only explicitly configured browser origins, including comma-separated entries', async () => {
    const previous = env.CORS_ORIGIN;
    env.CORS_ORIGIN = ' , https://first.example, , https://second.example , ';
    try {
      const configuredApp = createApp({ spots, users, checkIns, flags, reviews, requireAuth: unauthorized, requireInternal: internal, operations });
      for (const origin of ['https://first.example', 'https://second.example']) {
        const response = await request(configuredApp).get('/api/v1/health').set('Origin', origin).expect(200);
        expect(response.headers['access-control-allow-origin']).toBe(origin);
        expect(response.headers['access-control-allow-credentials']).toBe('true');
      }
      const rejected = await request(configuredApp).get('/api/v1/health')
        .set('Origin', 'https://arbitrary.vercel.app').expect(200);
      expect(rejected.headers['access-control-allow-origin']).toBeUndefined();
      const withoutOrigin = await request(configuredApp).get('/api/v1/health').expect(200);
      expect(withoutOrigin.body.data.status).toBe('ok');
      expect(withoutOrigin.headers['access-control-allow-origin']).toBeUndefined();
    } finally {
      env.CORS_ORIGIN = previous;
    }
  });

  it('uses the common error envelope', async () => {
    const response = await request(app).get('/api/v1/not-found').expect(404);
    expect(response.body.error.code).toBe('ROUTE_NOT_FOUND');
    expect(response.body.error.traceId).toBeTruthy();
  });

  it('returns a safe 400 envelope for malformed JSON', async () => {
    const response = await request(app).post('/api/v1/health')
      .set('Content-Type', 'application/json').send('{"broken":').expect(400);
    expect(response.body.error).toMatchObject({ code: 'INVALID_JSON', traceId: response.headers['x-request-id'] });
    expect(response.body.error.message).toBeTruthy();
    expect(JSON.stringify(response.body)).not.toContain('{"broken":');
  });

  it('returns a safe 413 envelope when JSON exceeds 64kb', async () => {
    const response = await request(app).post('/api/v1/health')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ data: 'x'.repeat(65 * 1024) })).expect(413);
    expect(response.body.error).toMatchObject({ code: 'PAYLOAD_TOO_LARGE', traceId: response.headers['x-request-id'] });
    expect(response.body.error.message).toBeTruthy();
    expect(JSON.stringify(response.body)).not.toContain('x'.repeat(100));
  });

  it('keeps unexpected errors as sanitized 500 responses', async () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const response = await request(app).get('/api/v1/me').expect(500);
      expect(response.body.error).toMatchObject({
        code: 'INTERNAL_SERVER_ERROR', traceId: response.headers['x-request-id'],
      });
      expect(JSON.stringify(response.body)).not.toContain('not used');
    } finally {
      logged.mockRestore();
    }
  });
});
