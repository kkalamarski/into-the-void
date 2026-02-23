import type { GatheringAccuracy, ResourceCategory } from '@into-the-void/shared-types';

/**
 * Calculate success zone width based on proficiency level.
 * Level 1: 20% of bar duration
 * Each level adds 2%, capped at 50% at level 16+
 *
 * @param level - Proficiency level (1-based)
 * @param duration - Total bar duration in ms
 * @returns Width of success zone in ms
 */
export function calculateSuccessZoneWidth(level: number, duration: number): number {
  const baseWidth = 0.2; // 20%
  const widthPerLevel = 0.02; // +2% per level
  const maxWidth = 0.5; // Cap at 50%

  const width = Math.min(baseWidth + (level - 1) * widthPerLevel, maxWidth);
  return Math.round(width * duration);
}

/**
 * Calculate XP reward for a gathering action.
 * Base XP scales with resource tier, accuracy multiplies.
 *
 * @param accuracy - Timing accuracy result
 * @param resourceTier - Entity tier (1-4)
 * @returns XP to award
 */
export function calculateXPReward(
  accuracy: GatheringAccuracy,
  resourceTier: number
): number {
  const baseXP = 10 * resourceTier; // Tier 1 = 10 XP, Tier 4 = 40 XP
  const multiplier = accuracy === 'perfect' ? 1.5 : accuracy === 'good' ? 1.0 : 0.5;
  return Math.floor(baseXP * multiplier);
}

/**
 * Calculate proficiency level from total XP.
 * XP curve: level 1->2 = 100 XP, each subsequent level +50 more.
 * Level 2->3 = 150 XP, Level 3->4 = 200 XP, etc.
 *
 * @param xp - Total XP accumulated
 * @returns Current proficiency level (1-based)
 */
export function calculateLevelFromXP(xp: number): number {
  let level = 1;
  let xpRequired = 100;
  let totalXP = 0;

  while (totalXP + xpRequired <= xp) {
    totalXP += xpRequired;
    level++;
    xpRequired += 50;
  }

  return level;
}

/**
 * Calculate base yield bonus from proficiency level.
 * 2% per level, capped at 50%.
 *
 * @param level - Proficiency level
 * @returns Yield multiplier (1.0 = no bonus, 1.2 = 20% bonus)
 */
export function calculateBaseYieldBonus(level: number): number {
  const bonusPerLevel = 0.02; // 2% per level
  const maxBonus = 0.5; // Cap at 50%
  const bonus = Math.min((level - 1) * bonusPerLevel, maxBonus);
  return 1.0 + bonus;
}

/**
 * Map entity type to resource category.
 */
export function getResourceCategory(entityType: string): ResourceCategory | null {
  switch (entityType) {
    case 'mineral':
      return 'mining';
    case 'plant':
      return 'herbalism';
    case 'artifact':
      return 'archaeology';
    default:
      return null;
  }
}
