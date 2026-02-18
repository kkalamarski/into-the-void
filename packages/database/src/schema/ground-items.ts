import { pgTable, varchar, integer, timestamp } from 'drizzle-orm/pg-core';

/**
 * Persisted ground items dropped in zones.
 *
 * Items must survive zone eviction and server restarts.
 * id format: 'item_<uuid>' for easy identification.
 * zoneId stored separately for efficient zone-scoped queries.
 */
export const groundItems = pgTable('ground_items', {
  id: varchar('id', { length: 200 }).primaryKey(),
  zoneId: varchar('zone_id', { length: 50 }).notNull(),
  itemId: varchar('item_id', { length: 100 }).notNull(),
  quantity: integer('quantity').notNull(),
  x: integer('x').notNull(),
  y: integer('y').notNull(),
  despawnAt: timestamp('despawn_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type GroundItem = typeof groundItems.$inferSelect;
export type NewGroundItem = typeof groundItems.$inferInsert;
