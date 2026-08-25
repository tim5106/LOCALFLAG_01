import type { RequestHandler } from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from './app.js';
import type { SpotReadRepository } from './repositories/spot-read-repository.js';
import type { CheckInRepository } from './repositories/check-in-repository.js';
import type { UserReadRepository } from './repositories/user-read-repository.js';

const spots: SpotReadRepository = {
  list: vi.fn().mockResolvedValue([]), findVisibleById: vi.fn().mockResolvedValue(null),
  recommendations: vi.fn().mockResolvedValue([]), nearby: vi.fn().mockResolvedValue([]),
};
const users: UserReadRepository = {
  findProfile: vi.fn().mockResolvedValue(null), updateNickname: vi.fn().mockResolvedValue(null),
  listCheckIns: vi.fn().mockResolvedValue([]), listPointLedger: vi.fn().mockResolvedValue([]),
};
const checkIns: CheckInRepository = { create: vi.fn(), findOwned: vi.fn() };
const unauthorized: RequestHandler = (_request, _response, next) => next(new Error('not used'));
const app = createApp({ spots, users, checkIns, requireAuth: unauthorized });

describe('Local Flag API', () => {
  it('reports its health', async () => {
    const response = await request(app).get('/api/v1/health').expect(200);
    expect(response.body.data.status).toBe('ok');
    expect(response.headers['x-request-id']).toBeTruthy();
  });

  it('uses the common error envelope', async () => {
    const response = await request(app).get('/api/v1/not-found').expect(404);
    expect(response.body.error.code).toBe('ROUTE_NOT_FOUND');
    expect(response.body.error.traceId).toBeTruthy();
  });
});
