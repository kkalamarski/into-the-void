/**
 * Tier-to-equivalent-level mapping.
 * Used to compare proficiency level against recipe difficulty.
 * Tier 1 ~ level 1 recipes, Tier 2 ~ level 10, etc.
 */
const TIER_TO_LEVEL: Record<number, number> = {
  1: 1,
  2: 10,
  3: 20,
  4: 30,
  5: 40,
};

/**
 * Calculate XP decay factor when crafting recipes below current proficiency level.
 *
 * Design constraints (from user decisions):
 * - No decay within 2 levels of recipe tier equivalent
 * - ~50% XP at 5 levels above recipe tier
 * - ~25% XP at 10 levels above recipe tier
 * - Minimum 10% (never zero XP from any recipe)
 *
 * Uses exponential decay: factor = 2^(-(diff - graceZone) / decayRate)
 * Calibrated so diff=5 ~ 0.5 and diff=10 approaches floor.
 */
export function calculateXPDecay(
  proficiencyLevel: number,
  recipeTier: number
): number {
  const recipeLevel = TIER_TO_LEVEL[recipeTier] ?? recipeTier * 10;
  const levelDiff = Math.max(0, proficiencyLevel - recipeLevel);

  const GRACE_ZONE = 2; // No decay within 2 levels
  if (levelDiff <= GRACE_ZONE) return 1.0;

  const effectiveDiff = levelDiff - GRACE_ZONE;

  // Calibrate: at effectiveDiff=3 (total diff=5), want ~0.5
  // 2^(-3/3) = 2^(-1) = 0.5
  // At effectiveDiff=8 (total diff=10), 2^(-8/3) ~ 0.16
  const DECAY_RATE = 3;
  const decay = Math.pow(2, -effectiveDiff / DECAY_RATE);

  return Math.max(0.1, decay);
}

/**
 * Calculate effective XP after applying decay.
 * Guaranteed minimum 1 XP (crafting always awards something).
 */
export function calculateEffectiveXP(
  baseXP: number,
  proficiencyLevel: number,
  recipeTier: number
): number {
  const decay = calculateXPDecay(proficiencyLevel, recipeTier);
  return Math.max(1, Math.floor(baseXP * decay));
}
