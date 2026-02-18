/**
 * One-time migration: Transform characters.stats JSONB from old 5-stat shape to new 8-stat shape
 *
 * Old shape: { strength, agility, endurance, intelligence, perception }
 * New shape: { durability, toughness, power, haste, vigor, recovery, perception, resilience }
 *
 * Run this script ONCE after deploying Phase 31 code.
 * Safe to run multiple times (idempotent) - skips rows already in new shape.
 *
 * Usage: npx ts-node packages/database/src/migrations/migrate-stats-schema.ts
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { eq } from 'drizzle-orm';
import { characters } from '../schema/characters';

// 8-stat level-1 defaults from SCALE_CONSTANTS.player.base in game-logic
const NEW_STATS_DEFAULT = {
  durability: 100,
  toughness: 50,
  power: 50,
  haste: 50,
  vigor: 80,
  recovery: 30,
  perception: 40,
  resilience: 30,
};

/**
 * Detect old 5-stat shape by presence of legacy stat names.
 * Returns true if row needs migration.
 */
function hasOldShape(stats: unknown): boolean {
  if (!stats || typeof stats !== 'object') return false;
  const obj = stats as Record<string, unknown>;
  // Old shape had 'strength', 'agility', 'endurance', 'intelligence'
  // New shape has 'durability', 'toughness', 'power', etc.
  return 'strength' in obj || 'agility' in obj || 'endurance' in obj || 'intelligence' in obj;
}

async function migrateStatsSchema(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL environment variable not set');
    process.exit(1);
  }

  const pool = new Pool({ connectionString });
  const db = drizzle(pool);

  console.log('Starting character stats schema migration...');

  const rows = await db.select().from(characters);
  let migrated = 0;
  let skipped = 0;

  for (const row of rows) {
    if (hasOldShape(row.stats)) {
      await db
        .update(characters)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .set({ stats: NEW_STATS_DEFAULT as any })
        .where(eq(characters.id, row.id));

      migrated++;
      console.log(`Migrated stats for character: ${row.name} (${row.id})`);
    } else {
      skipped++;
    }
  }

  console.log(`Migration complete. Migrated: ${migrated}, Skipped: ${skipped}`);
  await pool.end();
}

migrateStatsSchema().catch(console.error);
