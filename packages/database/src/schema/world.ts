import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';

/**
 * World seeds (one active world at a time)
 */
export const worldSeeds = pgTable('world_seeds', {
  id: uuid('id').primaryKey().defaultRandom(),
  seed: varchar('seed', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 100 }).notNull(),
  active: varchar('active', { length: 10 }).notNull().default('true'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type WorldSeed = typeof worldSeeds.$inferSelect;
export type NewWorldSeed = typeof worldSeeds.$inferInsert;
