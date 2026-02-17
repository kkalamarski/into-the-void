import { pgTable, uuid, jsonb, integer, timestamp } from 'drizzle-orm/pg-core';
import { characters } from './characters';
import type { InventoryItemJson } from './inventories';

/**
 * Personal storage - separate from inventory, persists across sessions.
 * Used for extended item storage beyond the 20-slot inventory limit.
 */
export const playerStorage = pgTable('player_storage', {
  characterId: uuid('character_id')
    .primaryKey()
    .references(() => characters.id, { onDelete: 'cascade' }),
  items: jsonb('items').$type<InventoryItemJson[]>().notNull().default([]),
  maxSlots: integer('max_slots').notNull().default(50),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type PlayerStorage = typeof playerStorage.$inferSelect;
export type NewPlayerStorage = typeof playerStorage.$inferInsert;
