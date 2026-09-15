import type { Request } from 'express';
import { env } from '../config/env.js';

export const DEV_TEST_TOKEN = 'dev-test-token';

export function isDevTestTokenForEnvironment(token: string | undefined, nodeEnv: string): boolean {
  return nodeEnv !== 'production' && token === DEV_TEST_TOKEN;
}

export function isDevTestRequest(request: Request): boolean {
  const token = request.header('authorization')?.match(/^Bearer ([^\s,]+)$/i)?.[1];
  return isDevTestTokenForEnvironment(token, env.NODE_ENV);
}
