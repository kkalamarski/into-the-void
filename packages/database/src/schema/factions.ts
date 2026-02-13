import { pgTable, varchar, text, jsonb } from 'drizzle-orm/pg-core';

/**
 * Faction bonuses stored as JSON
 */
interface FactionBonusesJson {
  combatModifier: number;
  gatheringModifier: number;
  craftingModifier: number;
  specialAbility: string;
}

/**
 * Game factions
 */
export const factions = pgTable('factions', {
  id: varchar('id', { length: 50 }).primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  type: varchar('type', { length: 50 }).notNull(), // corporate, rebel, ai, independent
  description: text('description').notNull(),
  bonuses: jsonb('bonuses').$type<FactionBonusesJson>().notNull(),
});

export type Faction = typeof factions.$inferSelect;
export type NewFaction = typeof factions.$inferInsert;

/**
 * Default factions to seed (from world-bible.md lore)
 */
export const defaultFactions: NewFaction[] = [
  {
    id: 'verdant',
    name: 'Verdant Dynamics',
    type: 'corporate',
    description: 'The green corporation. Bioengineering native species, sustainable harvesting, and environmental PR — hiding aggressive extraction behind eco-friendly branding.',
    bonuses: {
      combatModifier: 1.0,
      gatheringModifier: 1.2,
      craftingModifier: 1.1,
      specialAbility: 'Bioengineering',
    },
  },
  {
    id: 'helix',
    name: 'Helix Extraction',
    type: 'corporate',
    description: 'The pragmatists. Strip-mining, chemical processing, and industrial brutalism — they believe maximum extraction is humanity\'s sacred duty for survival.',
    bonuses: {
      combatModifier: 1.2,
      gatheringModifier: 1.1,
      craftingModifier: 1.0,
      specialAbility: 'Heavy Machinery',
    },
  },
  {
    id: 'nexus',
    name: 'Nexus Frontiers',
    type: 'corporate',
    description: 'The moderates. Trade networks, intelligence gathering, and strategic flexibility — they profit regardless of which faction comes out ahead.',
    bonuses: {
      combatModifier: 1.0,
      gatheringModifier: 1.0,
      craftingModifier: 1.2,
      specialAbility: 'Trade Networks',
    },
  },
  {
    id: 'neutral',
    name: 'Unaffiliated',
    type: 'independent',
    description: 'Independents operating in the margins — freelance explorers, traders, settlers, and outlaws who\'ve broken their contracts.',
    bonuses: {
      combatModifier: 1.1,
      gatheringModifier: 1.1,
      craftingModifier: 1.0,
      specialAbility: 'Self-Reliance',
    },
  },
];
