import {
  CombatResult,
  CombatEffect,
  CharacterStats,
} from '@into-the-void/shared-types';

/**
 * Base attack interval in milliseconds.
 * With base Haste (50), attacks happen every 1000ms.
 */
const BASE_ATTACK_INTERVAL_MS = 1000;

/**
 * Reference Haste value for base interval.
 * Haste above this = faster, below = slower.
 */
const BASE_HASTE = 50;

/**
 * Level gap threshold for damage multiplier.
 * Gaps within this range apply no additional scaling.
 */
export const LEVEL_GAP_THRESHOLD = 5;

/**
 * Damage multiplier per level beyond the threshold.
 * 0.15 = 15% increase per level.
 */
export const LEVEL_GAP_MULTIPLIER_PER_LEVEL = 0.15;

/**
 * Calculate attack interval based on Haste stat.
 * Higher Haste = lower interval = faster attacks.
 *
 * Formula: interval = baseInterval * (baseHaste / currentHaste)
 * - At Haste 50: 1000ms (1 attack/second)
 * - At Haste 100: 500ms (2 attacks/second)
 * - At Haste 25: 2000ms (0.5 attacks/second)
 *
 * Clamped to minimum 200ms (5 attacks/second max) and maximum 3000ms.
 *
 * @param haste - Current Haste stat value
 * @returns Attack interval in milliseconds
 */
export function calculateAttackInterval(haste: number): number {
  // Prevent division by zero
  const effectiveHaste = Math.max(1, haste);

  // Linear scaling: double haste = half interval
  const interval = BASE_ATTACK_INTERVAL_MS * (BASE_HASTE / effectiveHaste);

  // Clamp between 200ms (very fast) and 3000ms (very slow)
  return Math.round(Math.max(200, Math.min(3000, interval)));
}

/**
 * Apply level gap multiplier to damage.
 *
 * For level gaps beyond LEVEL_GAP_THRESHOLD (5 levels), applies an additional
 * 15% multiplier per excess level to amplify level advantage/disadvantage.
 *
 * @param baseDamage - Damage value before level gap multiplier
 * @param levelDiff - Attacker level minus defender level
 * @returns Modified damage with level gap multiplier applied
 *
 * @example
 * // Same level: no multiplier
 * applyLevelGapMultiplier(100, 0) // 100
 *
 * // 6 level gap (1 excess): 15% bonus
 * applyLevelGapMultiplier(100, 6) // 115
 *
 * // 10 level gap (5 excess): 75% bonus
 * applyLevelGapMultiplier(100, 10) // 175
 *
 * // 6 level gap negative (attacker lower): 15% penalty
 * applyLevelGapMultiplier(100, -6) // ~87
 */
export function applyLevelGapMultiplier(baseDamage: number, levelDiff: number): number {
  const absLevelDiff = Math.abs(levelDiff);

  // No multiplier if within threshold
  if (absLevelDiff <= LEVEL_GAP_THRESHOLD) {
    return baseDamage;
  }

  // Calculate excess levels beyond threshold
  const excessLevels = absLevelDiff - LEVEL_GAP_THRESHOLD;
  const multiplier = 1 + (excessLevels * LEVEL_GAP_MULTIPLIER_PER_LEVEL);

  // Apply or divide based on direction
  if (levelDiff > 0) {
    // Attacker is higher level: bonus damage
    return baseDamage * multiplier;
  } else {
    // Attacker is lower level: penalty damage
    return baseDamage / multiplier;
  }
}

/**
 * Base damage calculation parameters
 */
export interface DamageParams {
  baseDamage: number;
  attackerLevel: number;
  defenderLevel: number;
  attackerStats?: Partial<CharacterStats>;
  defenderStats?: Partial<CharacterStats>;
  weaponDamage?: number;
  armorReduction?: number;
  critChance?: number;
  critMultiplier?: number;
}

/**
 * Calculate base damage with modifiers
 */
export function calculateDamage(params: DamageParams): {
  damage: number;
  critical: boolean;
} {
  const {
    baseDamage,
    attackerLevel,
    defenderLevel,
    attackerStats = {},
    defenderStats = {},
    weaponDamage = 0,
    armorReduction = 0,
    critChance = 0.05,
    critMultiplier = 2.0,
  } = params;

  // Base damage from weapon + power
  let damage = baseDamage + weaponDamage;
  damage += (attackerStats.power ?? 10) * 0.5;

  // Level difference modifier: +-5% per level, capped at +-50%
  const levelDiff = attackerLevel - defenderLevel;
  const levelMod = 1 + Math.max(-0.5, Math.min(0.5, levelDiff * 0.05));
  damage *= levelMod;

  // Apply additional multiplier for extreme level gaps (beyond 5 levels)
  damage = applyLevelGapMultiplier(damage, levelDiff);

  // Critical hit check
  const critRoll = Math.random();
  const actualCritChance = critChance + (attackerStats.haste ?? 10) * 0.005;
  const critical = critRoll < actualCritChance;

  if (critical) {
    damage *= critMultiplier;
  }

  // Apply armor reduction
  const effectiveArmor = armorReduction * (1 + (defenderStats.toughness ?? 10) * 0.02);
  damage = Math.max(1, damage - effectiveArmor);

  // Add some randomness (±10%)
  damage *= 0.9 + Math.random() * 0.2;

  return {
    damage: Math.round(damage),
    critical,
  };
}

/**
 * Calculate hit chance
 */
export function calculateHitChance(
  attackerLevel: number,
  defenderLevel: number,
  attackerStats?: Partial<CharacterStats>,
  defenderStats?: Partial<CharacterStats>
): number {
  const baseHitChance = 0.85;

  // Haste affects dodge
  const attackerHaste = attackerStats?.haste ?? 10;
  const defenderHaste = defenderStats?.haste ?? 10;

  const hasteMod = (attackerHaste - defenderHaste) * 0.01;

  // Level difference affects hit chance
  const levelDiff = attackerLevel - defenderLevel;
  const levelMod = levelDiff * 0.02;

  return Math.max(0.1, Math.min(0.99, baseHitChance + hasteMod + levelMod));
}

/**
 * Calculate combat result
 */
export function calculateCombat(
  attackerId: string,
  defenderId: string,
  attackerLevel: number,
  defenderLevel: number,
  defenderHealth: number,
  params: DamageParams
): CombatResult {
  const hitChance = calculateHitChance(
    attackerLevel,
    defenderLevel,
    params.attackerStats,
    params.defenderStats
  );

  const hit = Math.random() < hitChance;

  if (!hit) {
    return {
      hit: false,
      damage: 0,
      killed: false,
      critical: false,
      effects: [],
      attackerId,
      defenderId,
      timestamp: Date.now(),
    };
  }

  const { damage, critical } = calculateDamage(params);
  const killed = damage >= defenderHealth;

  return {
    hit: true,
    damage,
    killed,
    critical,
    effects: [],
    attackerId,
    defenderId,
    timestamp: Date.now(),
  };
}

/**
 * Apply damage over time effect
 */
export function applyDotDamage(
  effect: CombatEffect,
  currentHealth: number
): { newHealth: number; damage: number } {
  const damage = effect.value;
  const newHealth = Math.max(0, currentHealth - damage);
  return { newHealth, damage };
}

/**
 * Apply heal over time effect
 */
export function applyHotHeal(
  effect: CombatEffect,
  currentHealth: number,
  maxHealth: number
): { newHealth: number; healed: number } {
  const heal = effect.value;
  const newHealth = Math.min(maxHealth, currentHealth + heal);
  const healed = newHealth - currentHealth;
  return { newHealth, healed };
}

/**
 * Calculate XP reward for defeating an enemy
 */
export function calculateXpReward(
  playerLevel: number,
  enemyLevel: number,
  baseXp: number
): number {
  const levelDiff = enemyLevel - playerLevel;

  // Scale XP based on level difference
  let multiplier = 1.0;
  if (levelDiff > 0) {
    // Higher level enemy = more XP (up to 2x)
    multiplier = 1 + Math.min(1, levelDiff * 0.1);
  } else if (levelDiff < 0) {
    // Lower level enemy = less XP (minimum 10%)
    multiplier = Math.max(0.1, 1 + levelDiff * 0.1);
  }

  return Math.round(baseXp * multiplier);
}
