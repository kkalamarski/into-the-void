import { eq } from 'drizzle-orm';
import type { DbClient } from '../client';
import { playerStorage, type PlayerStorage, type NewPlayerStorage } from '../schema/storage';
import type { InventoryItemJson } from '../schema/inventories';

/**
 * Get personal storage for a character
 */
export async function getPlayerStorage(
  db: DbClient,
  characterId: string
): Promise<PlayerStorage | undefined> {
  const result = await db
    .select()
    .from(playerStorage)
    .where(eq(playerStorage.characterId, characterId))
    .limit(1);
  return result[0];
}

/**
 * Create personal storage for a character (called on first access)
 */
export async function createPlayerStorage(
  db: DbClient,
  data: NewPlayerStorage
): Promise<PlayerStorage> {
  const result = await db
    .insert(playerStorage)
    .values(data)
    .returning();
  return result[0];
}

/**
 * Update personal storage items
 */
export async function updatePlayerStorage(
  db: DbClient,
  characterId: string,
  items: InventoryItemJson[]
): Promise<void> {
  await db
    .update(playerStorage)
    .set({ items, updatedAt: new Date() })
    .where(eq(playerStorage.characterId, characterId));
}

/**
 * Get or create personal storage (convenience function)
 */
export async function getOrCreatePlayerStorage(
  db: DbClient,
  characterId: string
): Promise<PlayerStorage> {
  const existing = await getPlayerStorage(db, characterId);
  if (existing) return existing;

  return createPlayerStorage(db, { characterId });
}
