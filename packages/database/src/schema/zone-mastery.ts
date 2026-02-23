import { pgTable, uuid, varchar, timestamp, jsonb, unique } from 'drizzle-orm/pg-core';
import { characters } from './characters';

/**
 * JSONB structure for zone mastery objectives
 */
export interface MasteryObjectiveJson {
  objectiveType: 'discover_pois' | 'gather_resources' | 'kill_creatures';
  description: string;
  current: number;
  required: number;
  complete: boolean;
}

/**
 * Tracks zone mastery progress per character per biome per tier.
 */
export const zoneMastery = pgTable('zone_mastery', {
  id: uuid('id').primaryKey().defaultRandom(),
  characterId: uuid('character_id')
    .notNull()
    .references(() => characters.id, { onDelete: 'cascade' }),
  biome: varchar('biome', { length: 50 }).notNull(),
  tier: varchar('tier', { length: 10 }).notNull(), // 'bronze' | 'silver' | 'gold'
  objectives: jsonb('objectives').$type<MasteryObjectiveJson[]>().notNull(),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
}, (table) => ({
  // Unique constraint prevents duplicate mastery tracking per character/biome/tier
  uniqueCharacterBiomeTier: unique('unique_character_biome_tier').on(
    table.characterId,
    table.biome,
    table.tier
  ),
}));

export type ZoneMastery = typeof zoneMastery.$inferSelect;
export type NewZoneMastery = typeof zoneMastery.$inferInsert;
