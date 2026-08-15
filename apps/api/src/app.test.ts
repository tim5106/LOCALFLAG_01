import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from './app.js';

const app = createApp();

describe('Local Flag API', () => {
  it('reports its health', async () => {
    const response = await request(app).get('/api/v1/health').expect(200);
    expect(response.body.data.status).toBe('ok');
    expect(response.headers['x-request-id']).toBeTruthy();
  });

  it('returns prototype spots', async () => {
    const response = await request(app).get('/api/v1/spots?limit=2').expect(200);
    expect(response.body.data).toHaveLength(2);
    expect(response.body.meta.source).toBe('prototype');
  });

  it('uses the common error envelope', async () => {
    const response = await request(app).get('/api/v1/not-found').expect(404);
    expect(response.body.error.code).toBe('ROUTE_NOT_FOUND');
    expect(response.body.error.traceId).toBeTruthy();
  });
});

