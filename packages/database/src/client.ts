import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

/**
 * Create a database client
 */
export function createDbClient(connectionString?: string) {
  const pool = new Pool({
    connectionString: connectionString || process.env.DATABASE_URL,
  });

  return drizzle(pool, { schema });
}

/**
 * Database client type
 */
export type DbClient = ReturnType<typeof createDbClient>;

/**
 * Create a connection pool
 */
export function createPool(connectionString?: string) {
  return new Pool({
    connectionString: connectionString || process.env.DATABASE_URL,
  });
}
