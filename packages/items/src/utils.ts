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
 * Compute item level from tier (1-4) and rarity.
 * Tier 1 Common = 10, Tier 1 Legendary = 22, Tier 4 Legendary = 88.
 */
export function computeIlvl(tier: 1 | 2 | 3 | 4, rarity: ItemRarity): number {
  const base = tier * BASE_ILVL_PER_TIER;
  const multiplier = RARITY_MULTIPLIERS[rarity];
  return Math.round(base * multiplier);
}
