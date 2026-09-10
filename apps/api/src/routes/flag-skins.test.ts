import express, { type RequestHandler } from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import type { FlagRepository } from '../repositories/flag-repository.js';
import { errorHandler } from '../middleware/error-handler.js';
import { createFlagSkinsRouter } from './flag-skins.js';

const auth: RequestHandler = (req, _res, next) => { req.userId = 'user'; req.traceId = 'test'; next(); };
const flags: FlagRepository = { listCatalog: vi.fn().mockResolvedValue([]), purchase: vi.fn(), equip: vi.fn(), getMap: vi.fn() };
function app() { const a = express(); a.use(express.json()); a.use('/flag-skins', createFlagSkinsRouter(auth, flags)); a.use(errorHandler); return a; }

describe('flag skin routes', () => {
  it('returns the authenticated catalog', async () => {
    await request(app()).get('/flag-skins').expect(200);
    expect(flags.listCatalog).toHaveBeenCalledWith('user');
  });
  it('requires idempotency for purchase', async () => {
    const response = await request(app()).post('/flag-skins/red/purchase').expect(400);
    expect(response.body.error.code).toBe('IDEMPOTENCY_KEY_REQUIRED');
  });
});
