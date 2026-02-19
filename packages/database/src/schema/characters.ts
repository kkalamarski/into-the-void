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
 * Player stats stored as JSON — matches CharacterStats 8-stat shape.
 * NOTE: Existing DB rows still have the old 5-stat shape; Phase 31 handles the migration script.
 */
export interface StatsJson {
  durability: number;
  toughness: number;
  power: number;
  haste: number;
  vigor: number;
  recovery: number;
  perception: number;
  resilience: number;
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
  credits: integer('credits').notNull().default(1000),
  position: jsonb('position').$type<PositionJson>().notNull().default({
    x: 32,
    y: 32,
    zoneId: 'z_0_0',
  }),
  lastWorldPosition: jsonb('last_world_position').$type<PositionJson | null>(),
  stats: jsonb('stats').$type<StatsJson>().notNull().default({
    durability: 100,
    toughness: 50,
    power: 50,
    haste: 50,
    vigor: 80,
    recovery: 30,
    perception: 40,
    resilience: 30,
  }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  lastPlayedAt: timestamp('last_played_at', { withTimezone: true }),
});

export type Character = typeof characters.$inferSelect;
export type NewCharacter = typeof characters.$inferInsert;
