import type { ItemDefinition } from '../types';
import { computeIlvl, generateSuitStats } from '../utils';

/**
 * Aquatic Suit Definitions (Phase 87)
 *
 * Specialized suits for underwater operations in aquatic biomes:
 * - Tidal Pools (shallow water, entry-level)
 * - Kelp Forests (deep water, contested territory)
 * - Deep Trenches (extreme pressure, endgame)
 *
 * Follows archetype system from suits.ts with water-themed abilities.
 */

// ============================================================
// AQUATIC SUITS (3)
// ============================================================

export const SUIT_DIVING_RARE: ItemDefinition = {
  id: 'suit_diving_rare',
  displayName: 'Diving Suit',
  description:
    'A Helix Extraction suit designed for shallow water operations in Tidal Pools. Sealed pressure hull with basic environmental adaptation for underwater exploration.',
  category: 'suit',
  rarity: 'rare',
  maxStack: 1,
  weight: 9.5,
  baseValue: 2200,
  requiredLevel: 5,
  ilvl: computeIlvl(1, 'rare'),
  textureKey: 'item_suit_diving',
  color: 0x2266aa,
  equipSlot: 'exosuit',
  moduleSlots: 4,
  effects: [
    { trigger: 'on_equip', effect: { type: 'stats', ...generateSuitStats('balanced', 'rare', 1) } },
  ],
  grantedAbilities: ['nano_repair', 'energy_barrier'],
};

export const SUIT_PRESSURE_EPIC: ItemDefinition = {
  id: 'suit_pressure_epic',
  displayName: 'Pressure Suit',
  description:
    'Military-grade deep-water exo-suit rated for Kelp Forest operations. Reinforced hull plating and enhanced shielding for contested underwater territory.',
  category: 'suit',
  rarity: 'epic',
  maxStack: 1,
  weight: 11.5,
  baseValue: 8500,
  requiredLevel: 15,
  ilvl: computeIlvl(2, 'epic'),
  textureKey: 'item_suit_pressure',
  color: 0x1144aa,
  equipSlot: 'exosuit',
  moduleSlots: 4,
  effects: [
    { trigger: 'on_equip', effect: { type: 'stats', ...generateSuitStats('tank', 'epic', 2) } },
  ],
  grantedAbilities: ['nano_repair', 'magnetic_field', 'fortify_systems'],
};

export const SUIT_ABYSSAL_EXOTIC: ItemDefinition = {
  id: 'suit_abyssal_exotic',
  displayName: 'Abyssal Suit',
  description:
    'An experimental Helix prototype suit incorporating PI (Prior Inhabitant) material shielding. Designed for extreme pressure environments in Deep Trenches where conventional suits fail.',
  category: 'suit',
  rarity: 'exotic',
  maxStack: 1,
  weight: 10.0,
  baseValue: 32000,
  requiredLevel: 25,
  ilvl: computeIlvl(3, 'exotic'),
  textureKey: 'item_suit_abyssal',
  color: 0x003366,
  equipSlot: 'exosuit',
  moduleSlots: 5,
  effects: [
    { trigger: 'on_equip', effect: { type: 'stats', ...generateSuitStats('hazmat', 'exotic', 3) } },
  ],
  grantedAbilities: ['nano_repair', 'energy_barrier', 'regeneration_protocol', 'resource_scan'],
};

// ============================================================
// ALL AQUATIC SUITS
// ============================================================

export const ALL_AQUATIC_SUITS: readonly ItemDefinition[] = [
  SUIT_DIVING_RARE,
  SUIT_PRESSURE_EPIC,
  SUIT_ABYSSAL_EXOTIC,
];
