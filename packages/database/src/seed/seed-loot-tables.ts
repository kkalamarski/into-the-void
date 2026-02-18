import { createDbClient } from '../client';
import { lootTables, lootTableEntries } from '../schema';

/**
 * Loot entry shape for seeding (mirrors HarvestYield from @into-the-void/entities).
 * Defined inline to avoid circular dependency: database -> game-logic -> database.
 */
export interface SeedLootEntry {
  itemId: string;
  minAmount: number;
  maxAmount: number;
  chance: number;
}

/**
 * Seed loot_tables and loot_table_entries from a caller-provided map.
 *
 * Accepts data from the caller (e.g., game-server seeding from CREATURE_LOOT_TABLES)
 * to avoid circular dependency between database and game-logic packages.
 *
 * The code-only CREATURE_LOOT_TABLES serves as the runtime source of truth for performance
 * (avoiding DB queries per loot roll). These DB tables exist for data management,
 * admin tooling, and future dynamic loot configuration.
 *
 * Safe to run multiple times — uses onConflictDoNothing() for idempotency.
 *
 * @param lootData Map of lootTableId -> array of loot entries
 */
export async function seedLootTables(
  lootData: Map<string, readonly SeedLootEntry[]>,
): Promise<void> {
  const db = createDbClient();

  for (const [lootTableId, entries] of lootData) {
    const entityId = lootTableId.replace('loot_', '');

    await db
      .insert(lootTables)
      .values({
        id: lootTableId,
        entityId,
        description: `Loot table for ${entityId}`,
      })
      .onConflictDoNothing();

    for (const entry of entries) {
      await db
        .insert(lootTableEntries)
        .values({
          tableId: lootTableId,
          itemId: entry.itemId,
          minAmount: entry.minAmount,
          maxAmount: entry.maxAmount,
          chance: entry.chance,
        })
        .onConflictDoNothing();
    }
  }

  console.log('Seeded creature loot tables');
}
