import { eq, and, gt, sql } from 'drizzle-orm';
import { DbClient } from '../client';
import { abilityCooldowns, AbilityCooldown, NewAbilityCooldown } from '../schema/ability-cooldowns';

/**
 * Save or update a cooldown for a character.
 * Uses upsert pattern - ON CONFLICT DO UPDATE.
 */
export async function saveCooldown(
  db: DbClient,
  characterId: string,
  abilityId: string,
  expiresAt: Date
): Promise<void> {
  await db
    .insert(abilityCooldowns)
    .values({ characterId, abilityId, expiresAt })
    .onConflictDoUpdate({
      target: [abilityCooldowns.characterId, abilityCooldowns.abilityId],
      set: { expiresAt },
    });
}

/**
 * Load all active cooldowns for a character (where expiresAt > now).
 */
export async function loadCooldowns(
  db: DbClient,
  characterId: string
): Promise<AbilityCooldown[]> {
  return db
    .select()
    .from(abilityCooldowns)
    .where(
      and(
        eq(abilityCooldowns.characterId, characterId),
        gt(abilityCooldowns.expiresAt, sql`NOW()`)
      )
    );
}

/**
 * Delete a specific cooldown for a character.
 */
export async function deleteCooldown(
  db: DbClient,
  characterId: string,
  abilityId: string
): Promise<void> {
  await db
    .delete(abilityCooldowns)
    .where(
      and(
        eq(abilityCooldowns.characterId, characterId),
        eq(abilityCooldowns.abilityId, abilityId)
      )
    );
}

/**
 * Cleanup expired cooldowns (maintenance function).
 * Can be called periodically to keep table clean.
 */
export async function cleanupExpiredCooldowns(db: DbClient): Promise<number> {
  const result = await db
    .delete(abilityCooldowns)
    .where(sql`${abilityCooldowns.expiresAt} <= NOW()`)
    .returning({ id: abilityCooldowns.characterId });
  return result.length;
}
