import { pgTable, uuid, varchar, timestamp, unique } from 'drizzle-orm/pg-core';
import { characters } from './characters';

/**
 * Tracks unlocked rewards (titles, cosmetics, bonuses) per character.
 */
export const characterRewards = pgTable('character_rewards', {
  id: uuid('id').primaryKey().defaultRandom(),
  characterId: uuid('character_id')
    .notNull()
    .references(() => characters.id, { onDelete: 'cascade' }),
  rewardType: varchar('reward_type', { length: 20 }).notNull(), // 'title' | 'cosmetic' | 'bonus'
  rewardId: varchar('reward_id', { length: 100 }).notNull(),
  source: varchar('source', { length: 100 }).notNull(), // e.g., 'zone_mastery_void_plains_gold'
  unlockedAt: timestamp('unlocked_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // Prevent duplicate reward unlocks
  uniqueCharacterReward: unique('unique_character_reward').on(
    table.characterId,
    table.rewardId
  ),
}));

export type CharacterReward = typeof characterRewards.$inferSelect;
export type NewCharacterReward = typeof characterRewards.$inferInsert;
