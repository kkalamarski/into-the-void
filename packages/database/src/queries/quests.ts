import { eq, and, sql } from 'drizzle-orm';
import type { DbClient } from '../client';
import {
  questProgress,
  type QuestProgress,
  type NewQuestProgress,
  type ObjectiveProgressJson,
  type QuestState,
} from '../schema/quest-progress';

/**
 * Get all quest progress for a character
 */
export async function getQuestProgressForCharacter(
  db: DbClient,
  characterId: string
): Promise<QuestProgress[]> {
  return db
    .select()
    .from(questProgress)
    .where(eq(questProgress.characterId, characterId));
}

/**
 * Get active quests for a character
 */
export async function getActiveQuests(
  db: DbClient,
  characterId: string
): Promise<QuestProgress[]> {
  return db
    .select()
    .from(questProgress)
    .where(
      and(
        eq(questProgress.characterId, characterId),
        eq(questProgress.state, 'active')
      )
    );
}

/**
 * Get specific quest progress
 */
export async function getQuestProgress(
  db: DbClient,
  characterId: string,
  questId: string
): Promise<QuestProgress | undefined> {
  const results = await db
    .select()
    .from(questProgress)
    .where(
      and(
        eq(questProgress.characterId, characterId),
        eq(questProgress.questId, questId)
      )
    );
  return results[0];
}

/**
 * Create new quest progress (start a quest)
 *
 * Will throw on duplicate (characterId, questId) due to UNIQUE constraint.
 */
export async function createQuestProgress(
  db: DbClient,
  data: NewQuestProgress
): Promise<QuestProgress> {
  const results = await db
    .insert(questProgress)
    .values(data)
    .returning();
  return results[0];
}

/**
 * Update quest objectives (progress tracking)
 */
export async function updateQuestObjectives(
  db: DbClient,
  id: string,
  objectives: ObjectiveProgressJson[]
): Promise<void> {
  await db
    .update(questProgress)
    .set({ objectives })
    .where(eq(questProgress.id, id));
}

/**
 * Update quest state (active -> completed/failed)
 */
export async function updateQuestState(
  db: DbClient,
  id: string,
  state: QuestState,
  completedAt?: Date
): Promise<void> {
  await db
    .update(questProgress)
    .set({
      state,
      completedAt: completedAt ?? (state === 'completed' || state === 'failed' ? new Date() : null),
    })
    .where(eq(questProgress.id, id));
}

/**
 * Atomically mark quest as completed.
 * Uses WHERE state = 'active' to prevent double completion race conditions.
 * Returns the updated row if successful, undefined if quest was already completed.
 */
export async function completeQuestAtomic(
  db: DbClient,
  questProgressId: string
): Promise<QuestProgress | undefined> {
  const results = await db
    .update(questProgress)
    .set({
      state: 'completed',
      completedAt: new Date(),
    })
    .where(
      and(
        eq(questProgress.id, questProgressId),
        eq(questProgress.state, 'active')
      )
    )
    .returning();
  return results[0];
}

/**
 * Check if character has completed a quest
 */
export async function hasCompletedQuest(
  db: DbClient,
  characterId: string,
  questId: string
): Promise<boolean> {
  const results = await db
    .select()
    .from(questProgress)
    .where(
      and(
        eq(questProgress.characterId, characterId),
        eq(questProgress.questId, questId),
        eq(questProgress.state, 'completed')
      )
    );
  return results.length > 0;
}

/**
 * Check if a bounty quest can be repeated based on daily UTC reset.
 * Returns true if:
 * - Quest has never been completed, OR
 * - Last completion was on a different UTC day than current day
 *
 * Uses PostgreSQL date_trunc to compare UTC days, not 24-hour cooldown.
 */
export async function canRepeatBountyQuest(
  db: DbClient,
  characterId: string,
  questId: string
): Promise<boolean> {
  const result = await db
    .select({ lastCompletedAt: questProgress.lastCompletedAt })
    .from(questProgress)
    .where(
      and(
        eq(questProgress.characterId, characterId),
        eq(questProgress.questId, questId),
        eq(questProgress.state, 'completed')
      )
    )
    .limit(1);

  if (result.length === 0 || !result[0].lastCompletedAt) {
    return true;  // Never completed or no timestamp - can accept
  }

  // Check if current UTC day is after completion UTC day using date_trunc
  const resetCheck = await db.execute(sql`
    SELECT
      date_trunc('day', now() AT TIME ZONE 'UTC') >
      date_trunc('day', ${result[0].lastCompletedAt} AT TIME ZONE 'UTC')
      AS can_reset
  `);

  return resetCheck.rows[0]?.can_reset === true;
}
