import { pgTable, uuid, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { characters } from './characters';

/**
 * Proficiency data stored as JSONB.
 * Matches ProficiencyData from shared-types.
 */
export interface ProficiencyJson {
  mining: { xp: number; level: number };
  herbalism: { xp: number; level: number };
  archaeology: { xp: number; level: number };
}

/**
 * Default proficiency for new characters.
 * All categories start at level 1 with 0 XP.
 */
export const DEFAULT_PROFICIENCY: ProficiencyJson = {
  mining: { xp: 0, level: 1 },
  herbalism: { xp: 0, level: 1 },
  archaeology: { xp: 0, level: 1 },
};

/**
 * Gathering proficiency table.
 * One row per character, stores proficiency for all categories in JSONB.
 */
export const gatheringProficiency = pgTable('gathering_proficiency', {
  id: uuid('id').primaryKey().defaultRandom(),
  characterId: uuid('character_id')
    .notNull()
    .references(() => characters.id, { onDelete: 'cascade' })
    .unique(),
  proficiency: jsonb('proficiency').$type<ProficiencyJson>().notNull().default(DEFAULT_PROFICIENCY),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type GatheringProficiency = typeof gatheringProficiency.$inferSelect;
export type NewGatheringProficiency = typeof gatheringProficiency.$inferInsert;
