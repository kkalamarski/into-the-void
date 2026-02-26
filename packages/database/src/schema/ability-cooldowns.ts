import { pgTable, uuid, varchar, timestamp, primaryKey, index } from 'drizzle-orm/pg-core';
import { characters } from './characters';

/**
 * Ability cooldowns - persists long cooldowns across sessions.
 * Only cooldowns >= 1 minute are persisted (e.g., home_recall).
 */
export const abilityCooldowns = pgTable(
  'ability_cooldowns',
  {
    characterId: uuid('character_id')
      .notNull()
      .references(() => characters.id, { onDelete: 'cascade' }),
    abilityId: varchar('ability_id', { length: 50 }).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.characterId, table.abilityId] }),
    expiresAtIdx: index('ability_cooldowns_expires_at_idx').on(table.expiresAt),
  })
);

export type AbilityCooldown = typeof abilityCooldowns.$inferSelect;
export type NewAbilityCooldown = typeof abilityCooldowns.$inferInsert;
