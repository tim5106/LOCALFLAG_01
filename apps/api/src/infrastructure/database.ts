import { Pool, type PoolConfig } from 'pg';

let pool: Pool | undefined;

export function createDatabasePool(connectionString: string): Pool {
  const config: PoolConfig = {
    connectionString,
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    ssl: connectionString.includes('localhost') || connectionString.includes('127.0.0.1')
      ? false
      : { rejectUnauthorized: false },
  };
  return new Pool(config);
}

export function getDatabasePool(connectionString: string): Pool {
  pool ??= createDatabasePool(connectionString);
  return pool;
}

export async function closeDatabasePool(): Promise<void> {
  if (pool) await pool.end();
  pool = undefined;
}
