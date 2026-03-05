import { pgTable, uuid, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { characters } from './characters';

/**
 * Crafting proficiency data stored as JSONB.
 * Matches CraftingProficiencyData from shared-types.
 * Three independent discipline tracks: equipment, consumables, reagents.
 */
export interface CraftingProficiencyJson {
  equipment: { xp: number; level: number };
  consumables: { xp: number; level: number };
  reagents: { xp: number; level: number };
}

/**
 * Default crafting proficiency for new characters.
 * All disciplines start at level 1 with 0 XP.
 */
export const DEFAULT_CRAFTING_PROFICIENCY: CraftingProficiencyJson = {
  equipment: { xp: 0, level: 1 },
  consumables: { xp: 0, level: 1 },
  reagents: { xp: 0, level: 1 },
};

/**
 * Crafting proficiency table (PROF-05).
 * One row per character, stores proficiency for all crafting disciplines in JSONB.
 * Mirrors the gathering_proficiency pattern.
 */
export const craftingProficiency = pgTable('crafting_proficiency', {
  id: uuid('id').primaryKey().defaultRandom(),
  characterId: uuid('character_id')
    .notNull()
    .references(() => characters.id, { onDelete: 'cascade' })
    .unique(),
  proficiency: jsonb('proficiency').$type<CraftingProficiencyJson>().notNull().default(DEFAULT_CRAFTING_PROFICIENCY),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type CraftingProficiency = typeof craftingProficiency.$inferSelect;
export type NewCraftingProficiency = typeof craftingProficiency.$inferInsert;
