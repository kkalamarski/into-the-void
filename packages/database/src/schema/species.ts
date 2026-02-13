import { pgTable, varchar, text, integer, jsonb } from 'drizzle-orm/pg-core';

/**
 * Species stats stored as JSON
 */
interface SpeciesStatsJson {
  baseHealth: number;
  baseDamage: number;
  armor: number;
  speed: number;
}

/**
 * Creature species definitions
 */
export const species = pgTable('species', {
  id: varchar('id', { length: 50 }).primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description').notNull(),
  biome: varchar('biome', { length: 50 }).notNull(), // void_plains, crystal_caves, etc.
  behaviorType: varchar('behavior_type', { length: 50 }).notNull(), // passive, neutral, aggressive, defensive
  minLevel: integer('min_level').notNull().default(1),
  maxLevel: integer('max_level').notNull().default(10),
  stats: jsonb('stats').$type<SpeciesStatsJson>().notNull(),
  baseXp: integer('base_xp').notNull().default(10),
  lootTableId: varchar('loot_table_id', { length: 50 }),
});

export type Species = typeof species.$inferSelect;
export type NewSpecies = typeof species.$inferInsert;

/**
 * Default species to seed
 */
export const defaultSpecies: NewSpecies[] = [
  {
    id: 'void_crawler',
    name: 'Void Crawler',
    description: 'Small, skittering creatures that inhabit the void plains. Generally harmless unless provoked.',
    biome: 'void_plains',
    behaviorType: 'neutral',
    minLevel: 1,
    maxLevel: 5,
    stats: { baseHealth: 30, baseDamage: 5, armor: 0, speed: 2 },
    baseXp: 15,
  },
  {
    id: 'crystal_sentinel',
    name: 'Crystal Sentinel',
    description: 'Ancient constructs that guard crystal formations. Highly aggressive to intruders.',
    biome: 'crystal_caves',
    behaviorType: 'aggressive',
    minLevel: 5,
    maxLevel: 15,
    stats: { baseHealth: 100, baseDamage: 20, armor: 10, speed: 1 },
    baseXp: 50,
  },
  {
    id: 'toxic_lurker',
    name: 'Toxic Lurker',
    description: 'Creatures that have adapted to toxic environments. Their attacks inflict poison.',
    biome: 'toxic_wastes',
    behaviorType: 'aggressive',
    minLevel: 8,
    maxLevel: 20,
    stats: { baseHealth: 80, baseDamage: 15, armor: 5, speed: 2 },
    baseXp: 40,
  },
  {
    id: 'frost_elemental',
    name: 'Frost Elemental',
    description: 'Beings of pure ice that roam the frozen expanse. Their touch brings frostbite.',
    biome: 'frozen_expanse',
    behaviorType: 'defensive',
    minLevel: 10,
    maxLevel: 25,
    stats: { baseHealth: 120, baseDamage: 25, armor: 15, speed: 1 },
    baseXp: 60,
  },
];
