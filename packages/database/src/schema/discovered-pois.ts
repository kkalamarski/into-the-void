import { pgTable, uuid, varchar, timestamp, primaryKey } from 'drizzle-orm/pg-core';
import { characters } from './characters';

/**
 * Points of interest discovered by characters
 * Composite primary key prevents duplicate discoveries per character
 */
export const discoveredPois = pgTable(
  'discovered_pois',
  {
    characterId: uuid('character_id')
      .notNull()
      .references(() => characters.id, { onDelete: 'cascade' }),
    poiId: varchar('poi_id', { length: 100 }).notNull(), // Format: poi_${chunkX}_${chunkY}_${index}
    poiType: varchar('poi_type', { length: 20 }).notNull(), // 'anomaly' | 'cache' | 'landmark'
    discoveredAt: timestamp('discovered_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    // Composite primary key prevents re-discovery exploits
    pk: primaryKey({ columns: [table.characterId, table.poiId] }),
  })
);

export type DiscoveredPoi = typeof discoveredPois.$inferSelect;
export type NewDiscoveredPoi = typeof discoveredPois.$inferInsert;
