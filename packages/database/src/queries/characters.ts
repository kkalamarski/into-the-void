import { eq, and, sql } from 'drizzle-orm';
import { DbClient } from '../client';
import { characters, Character, NewCharacter } from '../schema/characters';

interface CreditOperationResult {
  success: boolean;
  newBalance?: number;
  error?: string;
}

/**
 * Create a new character
 */
export async function createCharacter(db: DbClient, data: NewCharacter): Promise<Character> {
  const [character] = await db.insert(characters).values(data).returning();
  return character;
}

/**
 * Find character by ID
 */
export async function findCharacterById(db: DbClient, id: string): Promise<Character | null> {
  const [character] = await db.select().from(characters).where(eq(characters.id, id)).limit(1);
  return character || null;
}

/**
 * Find character by name
 */
export async function findCharacterByName(db: DbClient, name: string): Promise<Character | null> {
  const [character] = await db.select().from(characters).where(eq(characters.name, name)).limit(1);
  return character || null;
}

/**
 * Get all characters for an account
 */
export async function getAccountCharacters(db: DbClient, accountId: string): Promise<Character[]> {
  return db.select().from(characters).where(eq(characters.accountId, accountId));
}

/**
 * Update character position
 */
export async function updateCharacterPosition(
  db: DbClient,
  characterId: string,
  position: { x: number; y: number; zoneId: string }
): Promise<void> {
  await db
    .update(characters)
    .set({ position })
    .where(eq(characters.id, characterId));
}

/**
 * Update character health
 */
export async function updateCharacterHealth(
  db: DbClient,
  characterId: string,
  health: number
): Promise<void> {
  await db.update(characters).set({ health }).where(eq(characters.id, characterId));
}

/**
 * Update character XP and level
 */
export async function updateCharacterProgression(
  db: DbClient,
  characterId: string,
  xp: number,
  level: number
): Promise<void> {
  await db
    .update(characters)
    .set({ xp, level })
    .where(eq(characters.id, characterId));
}

/**
 * Update last played time
 */
export async function updateLastPlayed(db: DbClient, characterId: string): Promise<void> {
  await db
    .update(characters)
    .set({ lastPlayedAt: new Date() })
    .where(eq(characters.id, characterId));
}

/**
 * Delete a character
 */
export async function deleteCharacter(db: DbClient, characterId: string): Promise<void> {
  await db.delete(characters).where(eq(characters.id, characterId));
}

/**
 * Save last open-world position (called when player enters a hub)
 */
export async function saveLastWorldPosition(
  db: DbClient,
  characterId: string,
  position: import('../schema/characters').PositionJson | null
): Promise<void> {
  await db
    .update(characters)
    .set({ lastWorldPosition: position })
    .where(eq(characters.id, characterId));
}

/**
 * Get last open-world position (for returning from hub)
 */
export async function getLastWorldPosition(
  db: DbClient,
  characterId: string
): Promise<import('../schema/characters').PositionJson | null> {
  const result = await db
    .select({ lastWorldPosition: characters.lastWorldPosition })
    .from(characters)
    .where(eq(characters.id, characterId))
    .limit(1);
  return result[0]?.lastWorldPosition ?? null;
}

/**
 * Check if character belongs to account
 */
export async function isCharacterOwnedByAccount(
  db: DbClient,
  characterId: string,
  accountId: string
): Promise<boolean> {
  const [character] = await db
    .select()
    .from(characters)
    .where(and(eq(characters.id, characterId), eq(characters.accountId, accountId)))
    .limit(1);
  return !!character;
}

/**
 * Deduct credits from a character's balance atomically.
 * Uses WHERE clause to ensure sufficient balance before deduction.
 */
export async function deductCredits(
  db: DbClient,
  characterId: string,
  amount: number
): Promise<CreditOperationResult> {
  if (amount <= 0) {
    return { success: false, error: 'Amount must be positive' };
  }

  const result = await db
    .update(characters)
    .set({ credits: sql`${characters.credits} - ${amount}` })
    .where(and(eq(characters.id, characterId), sql`${characters.credits} >= ${amount}`))
    .returning({ credits: characters.credits });

  if (result.length === 0) {
    return { success: false, error: 'Insufficient credits' };
  }

  return { success: true, newBalance: result[0].credits };
}

/**
 * Add credits to a character's balance atomically.
 */
export async function addCredits(
  db: DbClient,
  characterId: string,
  amount: number
): Promise<CreditOperationResult> {
  if (amount <= 0) {
    return { success: false, error: 'Amount must be positive' };
  }

  const result = await db
    .update(characters)
    .set({ credits: sql`${characters.credits} + ${amount}` })
    .where(eq(characters.id, characterId))
    .returning({ credits: characters.credits });

  if (result.length === 0) {
    return { success: false, error: 'Character not found' };
  }

  return { success: true, newBalance: result[0].credits };
}
