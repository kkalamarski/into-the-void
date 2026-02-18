import { pgTable, varchar, integer, real, primaryKey } from 'drizzle-orm/pg-core';

/**
 * Loot table definitions.
 * Each entity with drops has a corresponding loot_table row.
 * LOOT-01: Loot tables stored in DB for admin tooling and future dynamic configuration.
 */
export const lootTables = pgTable('loot_tables', {
  id: varchar('id', { length: 100 }).primaryKey(), // e.g., 'loot_creature_void_crawler'
  entityId: varchar('entity_id', { length: 100 }).notNull(), // e.g., 'creature_void_crawler'
  description: varchar('description', { length: 255 }),
});

/**
 * Loot table entries (items that can drop from an entity).
 * Composite PK on tableId + itemId ensures one entry per item per table.
 */
export const lootTableEntries = pgTable(
  'loot_table_entries',
  {
    tableId: varchar('table_id', { length: 100 })
      .notNull()
      .references(() => lootTables.id),
    itemId: varchar('item_id', { length: 100 }).notNull(),
    minAmount: integer('min_amount').notNull().default(1),
    maxAmount: integer('max_amount').notNull().default(1),
    chance: real('chance').notNull().default(1.0), // 0.0 to 1.0
  },
  (table) => ({
    pk: primaryKey({ columns: [table.tableId, table.itemId] }),
  }),
);

export type LootTable = typeof lootTables.$inferSelect;
export type NewLootTable = typeof lootTables.$inferInsert;
export type LootTableEntry = typeof lootTableEntries.$inferSelect;
export type NewLootTableEntry = typeof lootTableEntries.$inferInsert;
