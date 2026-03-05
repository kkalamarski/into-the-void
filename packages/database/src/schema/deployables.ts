import { pgTable, uuid, varchar, integer, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { characters } from './characters';

/**
 * Position stored as JSON
 */
interface PositionJson {
  x: number;
  y: number;
  zoneId: string;
}

/**
 * Accumulated resource entry
 */
interface AccumulatedResource {
  itemId: string;
  quantity: number;
}

/**
 * Deployable automation structures (extractors, beacons, planetary extractors, refineries)
 * Persisted between server restarts. AutomationService loads these into memory on startup.
 */
export const deployables = pgTable('deployables', {
  id: uuid('id').primaryKey().defaultRandom(),
  deployableType: varchar('deployable_type', { length: 50 }).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  position: jsonb('position').$type<PositionJson>().notNull(),
  ownerId: uuid('owner_id').references(() => characters.id, { onDelete: 'cascade' }).notNull(),
  durability: integer('durability').notNull().default(100),
  maxDurability: integer('max_durability').notNull().default(100),
  fuelRemaining: integer('fuel_remaining').notNull().default(0),
  maxFuel: integer('max_fuel').notNull().default(100),
  accumulatedResources: jsonb('accumulated_resources').$type<AccumulatedResource[]>().notNull().default([]),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  deployedAt: timestamp('deployed_at', { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  lastTickAt: timestamp('last_tick_at', { withTimezone: true }).notNull().defaultNow(),
  properties: jsonb('properties').$type<Record<string, unknown>>().notNull().default({}),
});

export type Deployable = typeof deployables.$inferSelect;
export type NewDeployable = typeof deployables.$inferInsert;
