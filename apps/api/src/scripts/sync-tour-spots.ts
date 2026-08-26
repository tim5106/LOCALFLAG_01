import { requireTourismSyncEnv } from '../config/env.js';
import { closeDatabasePool, getDatabasePool } from '../infrastructure/database.js';
import { TourApiClient } from '../integrations/tour-api/client.js';
import { PostgresTourismRepository } from '../repositories/tourism-repository.js';
import { TourismSyncService } from '../services/tourism-sync.js';

async function main(): Promise<void> {
  const config = requireTourismSyncEnv();
  const pool = getDatabasePool(config.SUPABASE_DB_URL);
  const repository = new PostgresTourismRepository(pool);
  const client = new TourApiClient({
    baseUrl: config.TOUR_API_BASE_URL,
    serviceKey: config.TOUR_API_SERVICE_KEY,
  });
  const result = await new TourismSyncService(client, repository).run(100, config.TOUR_SYNC_LIMIT);
  console.info(`Synced ${result.successCount} spots; ${result.failureCount} skipped/failed. Batch ${result.batchRunId}.`);
}

try {
  await main();
} catch (error) {
  console.error('Tourism sync failed.', error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  await closeDatabasePool();
}
