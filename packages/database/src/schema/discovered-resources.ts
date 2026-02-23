import { pgTable, uuid, varchar, integer, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { characters } from './characters';

/**
 * Tracks rare/epic resource node discoveries per character.
 * Used to display map markers for previously discovered valuable nodes.
 *
 * Note: Only rare+ nodes are tracked to prevent database bloat.
 * Common nodes are not recorded.
 */
export const discoveredResources = pgTable('discovered_resources', {
  id: uuid('id').primaryKey().defaultRandom(),
  characterId: uuid('character_id')
    .notNull()
    .references(() => characters.id, { onDelete: 'cascade' }),
  /** Entity ID of the resource node (e.g., "mineral_12345") */
  entityId: varchar('entity_id', { length: 255 }).notNull(),
  /** Rarity tier: 'rare' | 'epic' */
  rarity: varchar('rarity', { length: 20 }).notNull(),
  /** Resource type: 'mineral' | 'plant' */
  resourceType: varchar('resource_type', { length: 50 }).notNull(),
  /** Zone ID where node is located */
  zoneId: varchar('zone_id', { length: 100 }).notNull(),
  /** World X coordinate for map marker */
  worldX: integer('world_x').notNull(),
  /** World Y coordinate for map marker */
  worldY: integer('world_y').notNull(),
  /** Resource definition ID (e.g., "mineral_void_crystal_rare") */
  resourceId: varchar('resource_id', { length: 100 }).notNull(),
  /** When the node was discovered */
  discoveredAt: timestamp('discovered_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Unique constraint: one discovery record per character per resource node.
 * Prevents duplicate discoveries and handles race conditions at DB level.
 */
export const discoveredResourcesCharEntityIdx = uniqueIndex('discovered_resources_char_entity_idx')
  .on(discoveredResources.characterId, discoveredResources.entityId);
