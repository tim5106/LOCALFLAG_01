import { createApp } from './app.js';
import { SupabaseTokenVerifier } from './auth/token-verifier.js';
import { env, requireApiEnv } from './config/env.js';
import { getDatabasePool } from './infrastructure/database.js';
import { getSupabaseAuthClient } from './lib/supabase.js';
import { createRequireAuth } from './middleware/require-auth.js';
import { PostgresSpotReadRepository } from './repositories/spot-read-repository.js';
import { PostgresUserReadRepository } from './repositories/user-read-repository.js';

const config = requireApiEnv();
const pool = getDatabasePool(config.SUPABASE_DB_URL);
const spots = new PostgresSpotReadRepository(pool);
const users = new PostgresUserReadRepository(pool);
const authClient = getSupabaseAuthClient();
if (!authClient) throw new Error('Supabase Auth client configuration failed.');
const requireAuth = createRequireAuth(new SupabaseTokenVerifier(authClient), users);
const app = createApp({ spots, users, requireAuth });

app.listen(env.PORT, () => {
  console.info(`Local Flag API listening on http://localhost:${env.PORT}/api/v1`);
});

