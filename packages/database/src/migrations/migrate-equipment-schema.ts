/**
 * One-time migration: Transform equipment JSONB from old shape to new shape
 *
 * Old shape: { head?, chest?, legs?, feet?, hands?, mainHand?, offHand?, accessory1?, accessory2? }
 * New shape: { exosuit?, modules: [], tool?, accessory1?, accessory2? }
 *
 * Run this script ONCE before deploying code that uses the new EquipmentJson interface.
 * Safe to run multiple times (idempotent).
 *
 * Usage: npx ts-node packages/database/src/migrations/migrate-equipment-schema.ts
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { eq } from 'drizzle-orm';
import { inventories } from '../schema/inventories';

interface OldEquipmentJson {
  head?: unknown;
  chest?: unknown;
  legs?: unknown;
  feet?: unknown;
  hands?: unknown;
  mainHand?: unknown;
  offHand?: unknown;
  accessory1?: unknown;
  accessory2?: unknown;
}

interface NewEquipmentJson {
  exosuit?: unknown;
  modules: unknown[];
  tool?: unknown;
  accessory1?: unknown;
  accessory2?: unknown;
}

function hasOldShape(equipment: unknown): equipment is OldEquipmentJson {
  if (!equipment || typeof equipment !== 'object') return false;
  const obj = equipment as Record<string, unknown>;
  return 'head' in obj || 'chest' in obj || 'legs' in obj || 'feet' in obj;
}

async function migrateEquipmentSchema(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL environment variable not set');
    process.exit(1);
  }

  const pool = new Pool({ connectionString });
  const db = drizzle(pool);

  console.log('Starting equipment schema migration...');

  const rows = await db.select().from(inventories);
  let migrated = 0;
  let skipped = 0;

  for (const row of rows) {
    if (hasOldShape(row.equipment)) {
      const oldEquipment = row.equipment as OldEquipmentJson;

      // Transform to new shape
      const newEquipment: NewEquipmentJson = {
        modules: [],
        accessory1: oldEquipment.accessory1,
        accessory2: oldEquipment.accessory2,
        // Old mainHand becomes tool
        tool: oldEquipment.mainHand,
        // Old armor slots don't map to exosuit - start fresh
        exosuit: undefined,
      };

      await db
        .update(inventories)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .set({ equipment: newEquipment as any })
        .where(eq(inventories.characterId, row.characterId));

      migrated++;
      console.log(`Migrated equipment for character: ${row.characterId}`);
    } else {
      skipped++;
    }
  }

  console.log(`Migration complete. Migrated: ${migrated}, Skipped: ${skipped}`);
  await pool.end();
}

migrateEquipmentSchema().catch(console.error);
