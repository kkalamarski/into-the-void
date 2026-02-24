import type { ItemDefinition } from '../types';
import { computeIlvl, generateSuitStats } from '../utils';

/**
 * Exotic Suit Definitions (Phase 87)
 *
 * Purpose: Anomaly-resistant equipment for exotic biomes (Phases 84-86).
 * - Void-Touched: Scout archetype for mobility in Void Rift zones
 * - Anomaly: Recon archetype for perception in Crystalline Wastes
 * - Null: Balanced archetype for ultimate survivability in Null Pockets
 *
 * Horizontal progression: Different archetypes create sidegrades, not upgrades.
 */

// ============================================================
// EXOTIC SUITS (3) — anomaly zone specialization
// ============================================================

export const SUIT_VOID_TOUCHED_EXOTIC: ItemDefinition = {
  id: 'suit_void_touched_exotic',
  displayName: 'Void-Touched Exo-Suit',
  description:
    'Suit incorporating Anomaly Zone materials. Partial reality distortion resistance. "The suit sometimes moves before the wearer commands it. This is considered \'normal\'."',
  category: 'suit',
  rarity: 'exotic',
  maxStack: 1,
  weight: 7.5,
  baseValue: 35000,
  requiredLevel: 25,
  ilvl: computeIlvl(3, 'exotic'),
  textureKey: 'item_suit_void_touched',
  color: 0x5500aa,
  equipSlot: 'exosuit',
  moduleSlots: 5,
  effects: [
    { trigger: 'on_equip', effect: { type: 'stats', ...generateSuitStats('scout', 'exotic', 3) } },
  ],
  grantedAbilities: ['nano_repair', 'magnetic_field', 'fortify_systems', 'overclock'],
};

export const SUIT_ANOMALY_EXOTIC: ItemDefinition = {
  id: 'suit_anomaly_exotic',
  displayName: 'Anomaly Resistance Suit',
  description:
    'Nexus Frontiers prototype with Ancient stabilization technology. "The research team cannot explain how it works. They stopped asking after the third incident."',
  category: 'suit',
  rarity: 'exotic',
  maxStack: 1,
  weight: 8.0,
  baseValue: 38000,
  requiredLevel: 30,
  ilvl: computeIlvl(4, 'exotic'),
  textureKey: 'item_suit_anomaly',
  color: 0x6600cc,
  equipSlot: 'exosuit',
  moduleSlots: 5,
  effects: [
    { trigger: 'on_equip', effect: { type: 'stats', ...generateSuitStats('recon', 'exotic', 4) } },
  ],
  grantedAbilities: ['nano_repair', 'energy_barrier', 'regeneration_protocol', 'power_surge'],
};

export const SUIT_NULL_LEGENDARY: ItemDefinition = {
  id: 'suit_null_legendary',
  displayName: 'Null Pocket Suit',
  description:
    'Impossibly advanced suit from a Null Pocket. "Analysis shows it is not powered by any detectable source. It simply... works."',
  category: 'suit',
  rarity: 'legendary',
  maxStack: 1,
  weight: 6.5,
  baseValue: 120000,
  requiredLevel: 40,
  ilvl: computeIlvl(4, 'legendary'),
  textureKey: 'item_suit_null',
  color: 0x220044,
  equipSlot: 'exosuit',
  moduleSlots: 6,
  effects: [
    { trigger: 'on_equip', effect: { type: 'stats', ...generateSuitStats('balanced', 'legendary', 4) } },
  ],
  grantedAbilities: ['nano_repair', 'regeneration_protocol', 'energy_barrier', 'overclock', 'void_drain'],
};

// ============================================================
// ALL EXOTIC SUITS
// ============================================================

export const ALL_EXOTIC_SUITS: readonly ItemDefinition[] = [
  SUIT_VOID_TOUCHED_EXOTIC,
  SUIT_ANOMALY_EXOTIC,
  SUIT_NULL_LEGENDARY,
];
