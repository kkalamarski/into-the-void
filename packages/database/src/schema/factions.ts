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
 * Default factions to seed
 */
export const defaultFactions: NewFaction[] = [
  {
    id: 'dominion',
    name: 'The Dominion',
    type: 'corporate',
    description: 'A powerful corporate faction focused on resource extraction and technological superiority.',
    bonuses: {
      combatModifier: 1.1,
      gatheringModifier: 1.0,
      craftingModifier: 1.2,
      specialAbility: 'Advanced Shields',
    },
  },
  {
    id: 'frontier',
    name: 'Frontier Coalition',
    type: 'rebel',
    description: 'A loose alliance of settlers and explorers who value freedom and self-reliance.',
    bonuses: {
      combatModifier: 1.0,
      gatheringModifier: 1.2,
      craftingModifier: 1.0,
      specialAbility: 'Survival Instinct',
    },
  },
  {
    id: 'collective',
    name: 'The Collective',
    type: 'ai',
    description: 'A network of AI-human hybrids seeking to merge consciousness with technology.',
    bonuses: {
      combatModifier: 1.0,
      gatheringModifier: 1.0,
      craftingModifier: 1.0,
      specialAbility: 'Neural Link',
    },
  },
  {
    id: 'neutral',
    name: 'Unaffiliated',
    type: 'independent',
    description: 'Those who choose to remain neutral in the factional conflicts.',
    bonuses: {
      combatModifier: 1.0,
      gatheringModifier: 1.1,
      craftingModifier: 1.1,
      specialAbility: 'Diplomatic Immunity',
    },
  },
];
