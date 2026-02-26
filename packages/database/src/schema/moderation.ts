import { pgTable, uuid, timestamp, unique } from 'drizzle-orm/pg-core';
import { characters } from './characters';

/**
 * Player mutes — tracks which characters a player has muted.
 * Muted players' messages are hidden client-side.
 */
export const playerMutes = pgTable('player_mutes', {
  id: uuid('id').primaryKey().defaultRandom(),
  characterId: uuid('character_id')
    .notNull()
    .references(() => characters.id, { onDelete: 'cascade' }),
  mutedCharacterId: uuid('muted_character_id')
    .notNull()
    .references(() => characters.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  uniqueMute: unique('player_mutes_unique').on(table.characterId, table.mutedCharacterId),
}));

export type PlayerMute = typeof playerMutes.$inferSelect;
export type NewPlayerMute = typeof playerMutes.$inferInsert;

/**
 * Player blocks — tracks which characters a player has blocked.
 * Blocked players cannot send whispers to the blocker; enforced server-side.
 */
export const playerBlocks = pgTable('player_blocks', {
  id: uuid('id').primaryKey().defaultRandom(),
  characterId: uuid('character_id')
    .notNull()
    .references(() => characters.id, { onDelete: 'cascade' }),
  blockedCharacterId: uuid('blocked_character_id')
    .notNull()
    .references(() => characters.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  uniqueBlock: unique('player_blocks_unique').on(table.characterId, table.blockedCharacterId),
}));

export type PlayerBlock = typeof playerBlocks.$inferSelect;
export type NewPlayerBlock = typeof playerBlocks.$inferInsert;
