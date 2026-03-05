import type { QualityTier } from '@into-the-void/shared-types';

export interface QualityRollResult {
  tier: QualityTier;
  roll: number;
}

const MAX_LEVEL = 50;

/**
 * Calculate quality tier probabilities based on proficiency level and recipe tier.
 *
 * Design constraints (from user decisions):
 * - At max proficiency (level 50), Tier 1: ~35% Standard / ~50% Refined / ~15% Masterwork
 * - Higher-tier recipes have tighter quality odds (harder to roll Masterwork)
 * - Level 1 crafters always produce Standard
 *
 * The probability curve uses a power function for level scaling (starts slow, accelerates)
 * and an exponential decay for recipe tier penalty.
 */
export function getQualityThresholds(
  proficiencyLevel: number,
  recipeTier: number
): { masterworkChance: number; refinedChance: number; standardChance: number } {
  const clampedLevel = Math.min(Math.max(proficiencyLevel, 1), MAX_LEVEL);

  // Tier penalty: each tier above 1 reduces quality chances
  // Tier 1 = 1.0, Tier 2 = 0.7, Tier 3 = 0.49, Tier 4 = 0.343, Tier 5 = 0.24
  const tierPenalty = Math.pow(0.7, recipeTier - 1);

  // Level scaling: 0 at level 1, 1.0 at level 50
  // Power curve (exponent 1.3) means slow start, accelerating gains
  const levelFactor = Math.pow((clampedLevel - 1) / (MAX_LEVEL - 1), 1.3);

  // Base Tier 1 max-level chances (from user constraint)
  const baseMasterwork = 0.15;
  const baseRefined = 0.50;

  const masterworkChance = baseMasterwork * levelFactor * tierPenalty;
  const refinedChance = baseRefined * levelFactor * tierPenalty;
  const standardChance = 1 - masterworkChance - refinedChance;

  return { masterworkChance, refinedChance, standardChance };
}

/**
 * Roll quality tier based on proficiency level and recipe tier.
 * Injectable RNG for deterministic testing.
 */
export function rollQualityTier(
  proficiencyLevel: number,
  recipeTier: number,
  rng?: () => number
): QualityRollResult {
  const random = (rng ?? Math.random)();
  const { masterworkChance, refinedChance } = getQualityThresholds(proficiencyLevel, recipeTier);

  if (random < masterworkChance) return { tier: 'masterwork', roll: random };
  if (random < masterworkChance + refinedChance) return { tier: 'refined', roll: random };
  return { tier: 'standard', roll: random };
}

/**
 * Get stat multiplier for a quality tier.
 * Standard = base stats (1.0x), Refined = +15% (1.15x), Masterwork = +30% (1.30x).
 * Per user decision: percentage-based quality stat bonuses.
 */
export function getQualityStatMultiplier(tier: QualityTier): number {
  switch (tier) {
    case 'masterwork': return 1.30;
    case 'refined': return 1.15;
    case 'standard': return 1.0;
  }
}
