import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from '../config/env.js';
import { closeDatabasePool, getDatabasePool } from '../infrastructure/database.js';
import { applyJongnoMvpSeed } from '../services/jongno-mvp-seed.js';

async function main(): Promise<void> {
  if (!env.SUPABASE_DB_URL) throw new Error('SUPABASE_DB_URL is required to apply the Jongno MVP seed.');
  const sourcePath = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../data/jongno_mvp_shortlist.json');
  const source = JSON.parse(await readFile(sourcePath, 'utf8')) as unknown;
  const appliedCount = await applyJongnoMvpSeed(getDatabasePool(env.SUPABASE_DB_URL), source);
  console.info(`Applied reviewed check-in policy to ${appliedCount} Jongno MVP spots.`);
}

try {
  await main();
} catch (error) {
  console.error('Jongno MVP seed failed.', error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  await closeDatabasePool();
}
