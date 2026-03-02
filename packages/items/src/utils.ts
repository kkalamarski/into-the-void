import type { ItemRarity } from './types';

/**
 * Rarity multipliers for ilvl calculation
 * Common=1.0, Rare=1.2, Epic=1.5, Exotic=1.8, Legendary=2.2
 */
const RARITY_MULTIPLIERS: Record<ItemRarity, number> = {
  common: 1.0,
  rare: 1.2,
  epic: 1.5,
  exotic: 1.8,
  legendary: 2.2,
};

const BASE_ILVL_PER_TIER = 10;

/**
 * Compute item level from tier (1-5) and rarity.
 * Tier 1 Common = 10, Tier 1 Legendary = 22, Tier 5 Legendary = 110.
 */
export function computeIlvl(tier: 1 | 2 | 3 | 4 | 5, rarity: ItemRarity): number {
  const base = tier * BASE_ILVL_PER_TIER;
  const multiplier = RARITY_MULTIPLIERS[rarity];
  return Math.round(base * multiplier);
}

/**
 * Archetype stat distribution profiles (Phase 63)
 * Each archetype defines stat percentages that sum to 100
 */
export const ARCHETYPE_PROFILES = {
  tank: { durability: 35, toughness: 30, resilience: 15, recovery: 10, vigor: 10 },
  scout: { haste: 30, perception: 25, vigor: 25, recovery: 10, durability: 10 },
  combat: { power: 30, haste: 20, toughness: 20, durability: 15, vigor: 15 },
  balanced: { durability: 15, toughness: 12, power: 10, haste: 10, vigor: 15, recovery: 8, perception: 15, resilience: 15 },
  hazmat: { resilience: 30, recovery: 25, durability: 25, vigor: 20 },
  assault: { power: 35, durability: 25, haste: 25, toughness: 15 },
  recon: { perception: 35, haste: 30, vigor: 25, recovery: 10 },
  scavenger: { vigor: 30, recovery: 25, perception: 25, durability: 12, resilience: 8 },
} as const;

/**
 * Stat rarity multipliers (Phase 63)
 * Separate from ilvl multipliers - controls stat budget scaling
 */
export const STAT_RARITY_MULTIPLIERS: Record<ItemRarity, number> = {
  common: 1.0,
  rare: 1.4,
  epic: 2.0,
  exotic: 2.8,
  legendary: 4.0,
};

/**
 * Tier multipliers (Phase 63)
 * Controls stat budget scaling across level ranges
 */
export const TIER_MULTIPLIERS: Record<1 | 2 | 3 | 4 | 5, number> = {
  1: 1.0,   // L1-10
  2: 2.0,   // L11-20
  3: 3.5,   // L21-30
  4: 5.5,   // L31-40
  5: 8.0,   // L41-50
};

/**
 * Generate suit stats based on archetype, rarity, and tier (Phase 63)
 *
 * @param archetype - Build identity (tank/scout/combat/balanced/hazmat/assault/recon/scavenger)
 * @param rarity - Item rarity affecting total stat budget
 * @param tier - Level tier (1-5) affecting total stat budget
 * @param baseBudget - Base stat budget for tier 1 common (default: 77)
 * @returns Stat distribution object with only non-zero stats
 *
 * @example
 * generateSuitStats('tank', 'legendary', 4)
 * // Returns ~1694 total stats (77 * 4.0 * 5.5) distributed as tank profile
 */
export function generateSuitStats(
  archetype: keyof typeof ARCHETYPE_PROFILES,
  rarity: ItemRarity,
  tier: 1 | 2 | 3 | 4 | 5,
  baseBudget: number = 77
): Partial<Record<'durability' | 'toughness' | 'power' | 'haste' | 'vigor' | 'recovery' | 'perception' | 'resilience', number>> {
  const rarityMult = STAT_RARITY_MULTIPLIERS[rarity];
  const tierMult = TIER_MULTIPLIERS[tier];
  const totalBudget = baseBudget * rarityMult * tierMult;

  const profile = ARCHETYPE_PROFILES[archetype];
  const stats: Partial<Record<'durability' | 'toughness' | 'power' | 'haste' | 'vigor' | 'recovery' | 'perception' | 'resilience', number>> = {};

  // Distribute budget according to archetype percentages
  for (const [stat, percentage] of Object.entries(profile)) {
    const value = Math.round((totalBudget * percentage) / 100);
    if (value > 0) {
      stats[stat as keyof typeof stats] = value;
    }
  }

  return stats;
}
