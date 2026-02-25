import { createDbClient } from '../client';
import { factions, defaultFactions } from '../schema';

/**
 * Seed factions table with default factions from lore.
 * Safe to run multiple times — uses onConflictDoNothing() for idempotency.
 */
export async function seedFactions(): Promise<void> {
  const db = createDbClient();

  for (const faction of defaultFactions) {
    await db.insert(factions).values(faction).onConflictDoNothing();
  }

  console.log(`Seeded ${defaultFactions.length} factions`);
}
