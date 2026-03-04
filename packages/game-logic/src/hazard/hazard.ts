import type { BiomeType } from '@into-the-void/shared-types';
import {
  BIOME_HAZARD_MAP,
  HAZARD_GROUPS,
  type HazardConfig,
  type HazardState,
} from '@into-the-void/shared-types';

/**
 * Get the hazard configuration for a biome.
 * Returns null for Tier I biomes (no hazard effects).
 */
export function getHazardForBiome(biomeType: BiomeType): HazardConfig | null {
  return BIOME_HAZARD_MAP[biomeType] ?? null;
}

/**
 * Check if a biome has hazard effects (Tier II+).
 */
export function isHazardousBiome(biomeType: BiomeType): boolean {
  return getHazardForBiome(biomeType) !== null;
}

/**
 * Determine whether a hazard damage tick should be applied.
 * Returns false during grace period and between tick intervals.
 *
 * HAZD-10: 3-second grace period on first hazard tick after biome entry.
 */
export function shouldApplyHazardTick(state: HazardState, now: number): boolean {
  // Grace period check
  if (now - state.enteredAt < state.config.gracePeriodMs) {
    return false;
  }

  // Tick interval check
  if (state.lastTickAt > 0 && now - state.lastTickAt < state.config.tickIntervalMs) {
    return false;
  }

  return true;
}

/**
 * Calculate HP damage from a hazard tick.
 *
 * HAZD-02: 8% base HP per tick for Tier III.
 * HAZD-05: Protection gear reduces damage proportionally.
 * Returns 0 for Tier II (debuff-only) or 100% protection (full immunity).
 */
export function calculateHazardDamage(
  config: HazardConfig,
  maxHealth: number,
  protectionPercent: number,
): number {
  // Tier II: stat debuff only, no HP drain
  if (config.hpDrainPercent === 0) {
    return 0;
  }

  // Full immunity at 100%+ protection
  if (protectionPercent >= 100) {
    return 0;
  }

  const rawDamage = Math.ceil(maxHealth * config.hpDrainPercent);
  const effectiveDamage = Math.ceil(rawDamage * (1 - protectionPercent / 100));

  return Math.max(0, effectiveDamage);
}

/**
 * Calculate the stat debuff from a hazard.
 *
 * HAZD-03: Stat debuffs in extreme biomes without protection gear.
 * For anomalous (Tier IV): debuff escalates with stack count.
 * Protection reduces debuff intensity proportionally.
 *
 * @returns Debuff descriptor: { stat, percent } where stat is 'none' if fully protected
 */
export function calculateHazardDebuff(
  config: HazardConfig,
  protectionPercent: number,
  stackCount: number,
): { stat: string; percent: number } {
  // Full immunity at 100%+ protection
  if (protectionPercent >= 100) {
    return { stat: 'none', percent: 0 };
  }

  const group = HAZARD_GROUPS[config.hazardType];
  let basePercent = group.debuffPercent;

  // Tier IV stacking: increase debuff with each stack
  if (config.stacksOverTime && config.stackDebuffIncrease) {
    basePercent += stackCount * config.stackDebuffIncrease;
  }

  // Apply protection reduction
  const finalPercent = basePercent * (1 - protectionPercent / 100);

  return {
    stat: group.debuffStat,
    percent: finalPercent,
  };
}

/**
 * Combined hazard calculation — returns both damage and debuff in one call.
 */
export function calculateEffectiveHazard(
  config: HazardConfig,
  maxHealth: number,
  protectionPercent: number,
  stackCount: number,
): { damage: number; debuff: { stat: string; percent: number } } {
  return {
    damage: calculateHazardDamage(config, maxHealth, protectionPercent),
    debuff: calculateHazardDebuff(config, protectionPercent, stackCount),
  };
}

/**
 * Determine whether the Tier IV stack count should increase.
 * Only applies to hazards with stacksOverTime = true (Tier IV Anomaly Zones).
 */
export function shouldIncreaseStack(state: HazardState, now: number): boolean {
  if (!state.config.stacksOverTime || !state.config.stackIntervalMs) {
    return false;
  }

  return now - state.lastStackAt >= state.config.stackIntervalMs;
}
