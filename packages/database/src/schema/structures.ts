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
 * Player-built or world structures
 */
export const structures = pgTable('structures', {
  id: uuid('id').primaryKey().defaultRandom(),
  structureType: varchar('structure_type', { length: 50 }).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  position: jsonb('position').$type<PositionJson>().notNull(),
  ownerId: uuid('owner_id').references(() => characters.id, { onDelete: 'set null' }),
  durability: integer('durability').notNull().default(100),
  maxDurability: integer('max_durability').notNull().default(100),
  properties: jsonb('properties').$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type Structure = typeof structures.$inferSelect;
export type NewStructure = typeof structures.$inferInsert;
