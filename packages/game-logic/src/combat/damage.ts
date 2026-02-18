import {
  CombatResult,
  CombatEffect,
  CharacterStats,
} from '@into-the-void/shared-types';

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

  // Level difference modifier (-10% to +10% per level)
  const levelDiff = attackerLevel - defenderLevel;
  const levelMod = 1 + Math.max(-0.5, Math.min(0.5, levelDiff * 0.05));
  damage *= levelMod;

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
