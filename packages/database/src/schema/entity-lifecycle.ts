import { pgTable, varchar, timestamp } from 'drizzle-orm/pg-core';

/**
 * Tracks entity kill/respawn lifecycle state.
 *
 * entityId is globally unique (format: zoneId_spawnId_x_y), so it serves as the PK.
 * zoneId is stored separately for efficient zone-scoped queries.
 */
export const entityLifecycle = pgTable('entity_lifecycle', {
  entityId: varchar('entity_id', { length: 200 }).primaryKey(),
  zoneId: varchar('zone_id', { length: 50 }).notNull(),
  killedAt: timestamp('killed_at', { withTimezone: true }).notNull(),
  respawnAt: timestamp('respawn_at', { withTimezone: true }).notNull(),
});

export type EntityLifecycle = typeof entityLifecycle.$inferSelect;
export type NewEntityLifecycle = typeof entityLifecycle.$inferInsert;
