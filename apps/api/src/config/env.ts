import { config } from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

const apiDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
config({ path: resolve(apiDirectory, '.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  DEV_AUTH_BYPASS: z.stringbool().default(false),
  SUPABASE_URL: z.url().optional(),
  SUPABASE_ANON_KEY: z.string().min(1).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
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

console.info(`[api-config] TOUR_API_SERVICE_KEY configured: ${Boolean(env.TOUR_API_SERVICE_KEY)}`);

