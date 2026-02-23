import { eq, and } from 'drizzle-orm';
import type { DbClient } from '../client';
import { collectedLore, type NewCollectedLore, type CollectedLore } from '../schema/collected-lore';

/**
 * Get all collected lore for a character
 */
export async function getCollectedLore(
  db: DbClient,
  characterId: string
): Promise<CollectedLore[]> {
  return db
    .select()
    .from(collectedLore)
    .where(eq(collectedLore.characterId, characterId));
}

/**
 * Check if character has collected a specific lore fragment
 */
export async function hasCollectedLore(
  db: DbClient,
  characterId: string,
  loreId: string
): Promise<boolean> {
  const [row] = await db
    .select()
    .from(collectedLore)
    .where(
      and(
        eq(collectedLore.characterId, characterId),
        eq(collectedLore.loreId, loreId)
      )
    )
    .limit(1);
  return !!row;
}

/**
 * Record lore fragment collection
 */
export async function collectLore(
  db: DbClient,
  data: NewCollectedLore
): Promise<CollectedLore> {
  const [row] = await db
    .insert(collectedLore)
    .values(data)
    .returning();
  return row;
}

/**
 * Mark lore fragment as read
 */
export async function markLoreRead(
  db: DbClient,
  characterId: string,
  loreId: string
): Promise<void> {
  await db
    .update(collectedLore)
    .set({ isRead: true })
    .where(
      and(
        eq(collectedLore.characterId, characterId),
        eq(collectedLore.loreId, loreId)
      )
    );
}

/**
 * Get collected lore IDs for a character (lightweight query)
 */
export async function getCollectedLoreIds(
  db: DbClient,
  characterId: string
): Promise<string[]> {
  const rows = await db
    .select({ loreId: collectedLore.loreId })
    .from(collectedLore)
    .where(eq(collectedLore.characterId, characterId));
  return rows.map(r => r.loreId);
}
