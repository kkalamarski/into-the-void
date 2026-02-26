import { eq, and } from 'drizzle-orm';
import { DbClient } from '../client';
import { playerMutes, PlayerMute, playerBlocks, PlayerBlock } from '../schema/moderation';

/**
 * Add a mute entry. Idempotent — duplicate inserts are ignored.
 */
export async function addMute(
  db: DbClient,
  characterId: string,
  mutedCharacterId: string
): Promise<PlayerMute> {
  const [inserted] = await db
    .insert(playerMutes)
    .values({ characterId, mutedCharacterId })
    .onConflictDoNothing()
    .returning();

  if (inserted) {
    return inserted;
  }

  // Conflict — row already exists, fetch and return it
  const [existing] = await db
    .select()
    .from(playerMutes)
    .where(
      and(
        eq(playerMutes.characterId, characterId),
        eq(playerMutes.mutedCharacterId, mutedCharacterId)
      )
    )
    .limit(1);

  return existing;
}

/**
 * Remove a mute entry by the composite key (characterId, mutedCharacterId).
 */
export async function removeMute(
  db: DbClient,
  characterId: string,
  mutedCharacterId: string
): Promise<void> {
  await db
    .delete(playerMutes)
    .where(
      and(
        eq(playerMutes.characterId, characterId),
        eq(playerMutes.mutedCharacterId, mutedCharacterId)
      )
    );
}

/**
 * Get all mute entries for a character (players this character has muted).
 */
export async function getMutes(
  db: DbClient,
  characterId: string
): Promise<PlayerMute[]> {
  return db
    .select()
    .from(playerMutes)
    .where(eq(playerMutes.characterId, characterId));
}

/**
 * Add a block entry. Idempotent — duplicate inserts are ignored.
 */
export async function addBlock(
  db: DbClient,
  characterId: string,
  blockedCharacterId: string
): Promise<PlayerBlock> {
  const [inserted] = await db
    .insert(playerBlocks)
    .values({ characterId, blockedCharacterId })
    .onConflictDoNothing()
    .returning();

  if (inserted) {
    return inserted;
  }

  // Conflict — row already exists, fetch and return it
  const [existing] = await db
    .select()
    .from(playerBlocks)
    .where(
      and(
        eq(playerBlocks.characterId, characterId),
        eq(playerBlocks.blockedCharacterId, blockedCharacterId)
      )
    )
    .limit(1);

  return existing;
}

/**
 * Remove a block entry by the composite key (characterId, blockedCharacterId).
 */
export async function removeBlock(
  db: DbClient,
  characterId: string,
  blockedCharacterId: string
): Promise<void> {
  await db
    .delete(playerBlocks)
    .where(
      and(
        eq(playerBlocks.characterId, characterId),
        eq(playerBlocks.blockedCharacterId, blockedCharacterId)
      )
    );
}

/**
 * Get all block entries for a character (players this character has blocked).
 */
export async function getBlocks(
  db: DbClient,
  characterId: string
): Promise<PlayerBlock[]> {
  return db
    .select()
    .from(playerBlocks)
    .where(eq(playerBlocks.characterId, characterId));
}

/**
 * Check if characterId is blocked by blockedByCharacterId.
 * Reverse lookup: "has player B blocked player A?"
 */
export async function isBlocked(
  db: DbClient,
  characterId: string,
  blockedByCharacterId: string
): Promise<boolean> {
  const [row] = await db
    .select()
    .from(playerBlocks)
    .where(
      and(
        eq(playerBlocks.characterId, blockedByCharacterId),
        eq(playerBlocks.blockedCharacterId, characterId)
      )
    )
    .limit(1);

  return !!row;
}
