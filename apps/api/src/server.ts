import { createApp } from './app.js';
import { SupabaseTokenVerifier } from './auth/token-verifier.js';
import { env, requireApiEnv } from './config/env.js';
import { getDatabasePool } from './infrastructure/database.js';
import { getSupabaseAuthClient } from './lib/supabase.js';
import { createRequireAuth } from './middleware/require-auth.js';
import { PostgresCheckInRepository } from './repositories/check-in-repository.js';
import { PostgresSpotReadRepository } from './repositories/spot-read-repository.js';
import { PostgresUserReadRepository } from './repositories/user-read-repository.js';
import { PostgresFlagRepository } from './repositories/flag-repository.js';
import { PostgresReviewRepository } from './repositories/review-repository.js';
import { PostgresTourismRepository } from './repositories/tourism-repository.js';
import { TourApiClient } from './integrations/tour-api/client.js';
import { TourismSyncService } from './services/tourism-sync.js';
import { FestivalSyncService, recalculateSpotScores } from './services/festival-sync.js';
import { createRequireInternal } from './middleware/require-internal.js';

const config = requireApiEnv();
const pool = getDatabasePool(config.SUPABASE_DB_URL);
const spots = new PostgresSpotReadRepository(pool);
const users = new PostgresUserReadRepository(pool);
const checkIns = new PostgresCheckInRepository(pool);
const flags = new PostgresFlagRepository(pool);
const reviews = new PostgresReviewRepository(pool);
const tourism = new PostgresTourismRepository(pool);
const tourApi = new TourApiClient({ baseUrl: config.TOUR_API_BASE_URL, serviceKey: config.TOUR_API_SERVICE_KEY });
const authClient = getSupabaseAuthClient();
if (!authClient) throw new Error('Supabase Auth client configuration failed.');
const requireAuth = createRequireAuth(new SupabaseTokenVerifier(authClient), users);
const requireInternal = createRequireInternal(config.INTERNAL_CRON_SECRET);
const operations = {
  tourismSync: () => new TourismSyncService(tourApi, tourism).run(100, config.TOUR_SYNC_LIMIT),
  festivalSync: () => new FestivalSyncService(tourApi, tourism).run(100, config.TOUR_SYNC_LIMIT),
  recalculateScores: () => recalculateSpotScores(tourism),
};
const app = createApp({ spots, users, checkIns, flags, reviews, requireAuth, requireInternal, operations });

app.listen(env.PORT, () => {
  console.info(`Local Flag API listening on http://localhost:${env.PORT}/api/v1`);
});

