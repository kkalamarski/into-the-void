import { pgTable, uuid, varchar, timestamp, boolean, primaryKey } from 'drizzle-orm/pg-core';
import { characters } from './characters';

/**
 * Tracks collected lore fragments per character.
 * Composite primary key prevents duplicate collection.
 */
export const collectedLore = pgTable(
  'collected_lore',
  {
    characterId: uuid('character_id')
      .notNull()
      .references(() => characters.id, { onDelete: 'cascade' }),
    loreId: varchar('lore_id', { length: 100 }).notNull(),
    category: varchar('category', { length: 50 }).notNull(),
    collectedAt: timestamp('collected_at', { withTimezone: true }).notNull().defaultNow(),
    isRead: boolean('is_read').notNull().default(false),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.characterId, table.loreId] }),
  })
);

export type CollectedLore = typeof collectedLore.$inferSelect;
export type NewCollectedLore = typeof collectedLore.$inferInsert;
