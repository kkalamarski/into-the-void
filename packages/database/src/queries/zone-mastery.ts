import { eq, and, isNull } from 'drizzle-orm';
import type { DbClient } from '../client';
import { zoneMastery, type NewZoneMastery, type ZoneMastery, type MasteryObjectiveJson } from '../schema/zone-mastery';
import { characterRewards, type NewCharacterReward, type CharacterReward } from '../schema/character-rewards';

/**
 * Get active (incomplete) zone mastery for a character in a specific biome
 */
export async function getActiveZoneMastery(
  db: DbClient,
  characterId: string,
  biome: string
): Promise<ZoneMastery | undefined> {
  const [row] = await db
    .select()
    .from(zoneMastery)
    .where(
      and(
        eq(zoneMastery.characterId, characterId),
        eq(zoneMastery.biome, biome),
        isNull(zoneMastery.completedAt)
      )
    )
    .limit(1);
  return row;
}

/**
 * Get all zone mastery progress for a character
 */
export async function getAllZoneMastery(
  db: DbClient,
  characterId: string
): Promise<ZoneMastery[]> {
  return db
    .select()
    .from(zoneMastery)
    .where(eq(zoneMastery.characterId, characterId));
}

/**
 * Create new zone mastery entry
 */
export async function createZoneMastery(
  db: DbClient,
  data: NewZoneMastery
): Promise<ZoneMastery> {
  const [row] = await db
    .insert(zoneMastery)
    .values(data)
    .returning();
  return row;
}

/**
 * Update zone mastery objectives
 */
export async function updateMasteryObjectives(
  db: DbClient,
  masteryId: string,
  objectives: MasteryObjectiveJson[]
): Promise<void> {
  await db
    .update(zoneMastery)
    .set({ objectives })
    .where(eq(zoneMastery.id, masteryId));
}

/**
 * Mark zone mastery as completed
 */
export async function completeMastery(
  db: DbClient,
  masteryId: string
): Promise<void> {
  await db
    .update(zoneMastery)
    .set({ completedAt: new Date() })
    .where(eq(zoneMastery.id, masteryId));
}

/**
 * Get character rewards
 */
export async function getCharacterRewards(
  db: DbClient,
  characterId: string
): Promise<CharacterReward[]> {
  return db
    .select()
    .from(characterRewards)
    .where(eq(characterRewards.characterId, characterId));
}

/**
 * Grant character reward (uses unique constraint to prevent duplicates)
 */
export async function grantCharacterReward(
  db: DbClient,
  data: NewCharacterReward
): Promise<CharacterReward | null> {
  try {
    const [row] = await db
      .insert(characterRewards)
      .values(data)
      .returning();
    return row;
  } catch (error: any) {
    // Duplicate key error - reward already granted
    if (error.code === '23505') {
      return null;
    }
    throw error;
  }
}

/**
 * Check if character has specific reward
 */
export async function hasCharacterReward(
  db: DbClient,
  characterId: string,
  rewardId: string
): Promise<boolean> {
  const [row] = await db
    .select()
    .from(characterRewards)
    .where(
      and(
        eq(characterRewards.characterId, characterId),
        eq(characterRewards.rewardId, rewardId)
      )
    )
    .limit(1);
  return !!row;
}
