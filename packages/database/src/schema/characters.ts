import { pgTable, uuid, varchar, integer, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { accounts } from './accounts';
import { factions } from './factions';

/**
 * Position stored as JSON
 */
export interface PositionJson {
  x: number;
  y: number;
  zoneId: string;
}

/**
 * Player stats stored as JSON
 */
export interface StatsJson {
  strength: number;
  agility: number;
  endurance: number;
  intelligence: number;
  perception: number;
}

/**
 * Player characters (multiple per account)
 */
export const characters = pgTable('characters', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountId: uuid('account_id')
    .notNull()
    .references(() => accounts.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 50 }).notNull().unique(),
  factionId: varchar('faction_id', { length: 50 })
    .notNull()
    .references(() => factions.id),
  level: integer('level').notNull().default(1),
  xp: integer('xp').notNull().default(0),
  health: integer('health').notNull().default(100),
  maxHealth: integer('max_health').notNull().default(100),
  position: jsonb('position').$type<PositionJson>().notNull().default({
    x: 32,
    y: 32,
    zoneId: 'z_0_0',
  }),
  stats: jsonb('stats').$type<StatsJson>().notNull().default({
    strength: 10,
    agility: 10,
    endurance: 10,
    intelligence: 10,
    perception: 10,
  }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  lastPlayedAt: timestamp('last_played_at', { withTimezone: true }),
});

export type Character = typeof characters.$inferSelect;
export type NewCharacter = typeof characters.$inferInsert;
