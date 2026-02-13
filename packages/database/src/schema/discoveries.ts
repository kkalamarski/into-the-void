import { pgTable, uuid, varchar, timestamp, integer, primaryKey } from 'drizzle-orm/pg-core';
import { characters } from './characters';
import { species } from './species';

/**
 * Species discovered by characters (codex entries)
 */
export const discoveredSpecies = pgTable(
  'discovered_species',
  {
    characterId: uuid('character_id')
      .notNull()
      .references(() => characters.id, { onDelete: 'cascade' }),
    speciesId: varchar('species_id', { length: 50 })
      .notNull()
      .references(() => species.id),
    discoveredAt: timestamp('discovered_at', { withTimezone: true }).notNull().defaultNow(),
    killCount: integer('kill_count').notNull().default(0),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.characterId, table.speciesId] }),
  })
);

export type DiscoveredSpecies = typeof discoveredSpecies.$inferSelect;
export type NewDiscoveredSpecies = typeof discoveredSpecies.$inferInsert;
