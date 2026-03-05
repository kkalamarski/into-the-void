import { pgTable, uuid, timestamp, varchar, unique } from 'drizzle-orm/pg-core';
import { characters } from './characters';

/**
 * Recipe unlocks join table (RCPE-07).
 * Append-only — one row per (character, recipe) pair.
 * Persists across server restarts (not in-memory only).
 * Per STATE.md decision: "Use recipe_unlocks join table (not JSONB) for unlock persistence"
 */
export const recipeUnlocks = pgTable('recipe_unlocks', {
  id: uuid('id').primaryKey().defaultRandom(),
  characterId: uuid('character_id')
    .notNull()
    .references(() => characters.id, { onDelete: 'cascade' }),
  recipeId: varchar('recipe_id', { length: 100 }).notNull(),
  unlockedAt: timestamp('unlocked_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // Prevent duplicate unlock entries
  uniqueCharacterRecipe: unique('unique_character_recipe').on(
    table.characterId,
    table.recipeId
  ),
}));

export type RecipeUnlock = typeof recipeUnlocks.$inferSelect;
export type NewRecipeUnlock = typeof recipeUnlocks.$inferInsert;
