import { pgTable, uuid, varchar, jsonb, timestamp, unique, integer } from 'drizzle-orm/pg-core';
import { characters } from './characters';

/**
 * Quest state values
 */
export type QuestState = 'available' | 'active' | 'completed' | 'failed';

/**
 * JSONB structure for objective progress - mirrors shared-types ObjectiveProgress
 */
export interface ObjectiveProgressJson {
  objectiveType: 'kill' | 'gather' | 'explore';
  description: string;
  current: number;
  required: number;
  targetId?: string; // entityId for kill, itemId for gather, biome for explore
  complete: boolean;
}

/**
 * Quest progress table
 *
 * Stores player quest state with JSONB for flexible objective storage.
 * UNIQUE constraint on (characterId, questId) prevents duplicate completions
 * and reward farming.
 */
export const questProgress = pgTable('quest_progress', {
  id: uuid('id').primaryKey().defaultRandom(),
  characterId: uuid('character_id')
    .notNull()
    .references(() => characters.id, { onDelete: 'cascade' }),
  questId: varchar('quest_id', { length: 100 }).notNull(),
  state: varchar('state', { length: 20 }).$type<QuestState>().notNull().default('active'),
  objectives: jsonb('objectives').$type<ObjectiveProgressJson[]>().notNull(),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  lastCompletedAt: timestamp('last_completed_at', { withTimezone: true }),
  completedCount: integer('completed_count').notNull().default(0),
}, (table) => ({
  // CRITICAL: Prevents duplicate quest entries per character
  // This ensures a player cannot have two rows for the same quest
  // preventing reward farming via duplicate completions
  uniqueCharacterQuest: unique('unique_character_quest').on(
    table.characterId,
    table.questId
  ),
}));

export type QuestProgress = typeof questProgress.$inferSelect;
export type NewQuestProgress = typeof questProgress.$inferInsert;
