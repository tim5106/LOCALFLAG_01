import 'dotenv/config';
import { z } from 'zod';

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
  });
  const syncEnv = syncSchema.safeParse(env);
  if (!syncEnv.success) {
    console.error('Missing or invalid backend sync environment variables.', z.treeifyError(syncEnv.error));
    throw new Error('Tourism sync environment validation failed.');
  }
  return syncEnv.data;
}

