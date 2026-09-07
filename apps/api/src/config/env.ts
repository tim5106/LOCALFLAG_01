import { config } from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

export function parseTourSyncLimit(value: string | undefined): number | undefined {
  if (value === undefined || value.trim() === '') return undefined;
  if (!/^[1-9]\d*$/.test(value)) {
    throw new Error('TOUR_SYNC_LIMIT must be a positive integer when provided.');
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) {
    throw new Error('TOUR_SYNC_LIMIT must be a safe positive integer.');
  }
  return parsed;
}

const apiDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
config({ path: resolve(apiDirectory, '.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  SUPABASE_URL: z.url().optional(),
  SUPABASE_ANON_KEY: z.string().min(1).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  SUPABASE_DB_URL: z.url().optional(),
  TOUR_API_BASE_URL: z.url().default('https://apis.data.go.kr/B551011/KorService2'),
  TOUR_API_SERVICE_KEY: z.string().min(1).optional(),
  TOUR_SYNC_LIMIT: z.string().optional().transform((value, context) => {
    try { return parseTourSyncLimit(value); }
    catch (error) {
      context.addIssue({ code: 'custom', message: error instanceof Error ? error.message : 'Invalid TOUR_SYNC_LIMIT.' });
      return z.NEVER;
    }
  }),
  KAKAO_REST_API_KEY: z.string().min(1).optional(),
  INTERNAL_CRON_SECRET: z.string().min(16).optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables', z.treeifyError(parsed.error));
  throw new Error('Environment validation failed.');
}

export const env = parsed.data;

export function requireApiEnv() {
  const apiSchema = z.object({
    SUPABASE_URL: z.url(),
    SUPABASE_ANON_KEY: z.string().min(1),
    SUPABASE_DB_URL: z.url(),
    TOUR_API_BASE_URL: z.url(),
    TOUR_API_SERVICE_KEY: z.string().min(1),
    INTERNAL_CRON_SECRET: z.string().min(16),
    TOUR_SYNC_LIMIT: z.number().int().positive().optional(),
  });
  const apiEnv = apiSchema.safeParse(env);
  if (!apiEnv.success) {
    console.error('Missing or invalid API environment variables.', z.treeifyError(apiEnv.error));
    throw new Error('API environment validation failed.');
  }
  return apiEnv.data;
}

export function requireTourismSyncEnv() {
  const syncSchema = z.object({
    SUPABASE_DB_URL: z.url(),
    TOUR_API_BASE_URL: z.url(),
    TOUR_API_SERVICE_KEY: z.string().min(1),
    TOUR_SYNC_LIMIT: z.number().int().positive().optional(),
  });
  const syncEnv = syncSchema.safeParse(env);
  if (!syncEnv.success) {
    console.error('Missing or invalid backend sync environment variables.', z.treeifyError(syncEnv.error));
    throw new Error('Tourism sync environment validation failed.');
  }
  return syncEnv.data;
}

console.info(`[api-config] TOUR_API_SERVICE_KEY configured: ${Boolean(env.TOUR_API_SERVICE_KEY)}`);

