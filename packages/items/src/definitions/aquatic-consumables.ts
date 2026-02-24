import type { ItemDefinition } from '../types';
import { computeIlvl } from '../utils';

// ============================================================
// AQUATIC CONSUMABLES (5) — Phase 87 underwater operations
// ============================================================

export const PRESSURE_PILL_COMMON: ItemDefinition = {
  id: 'pressure_pill_common',
  displayName: 'Pressure Stabilization Pill',
  description:
    'Pressure stabilization pharmaceutical for Tidal Pool operations. Temporarily reinforces cellular structures against water pressure for 60 seconds.',
  category: 'consumable',
  rarity: 'common',
  maxStack: 20,
  weight: 0.1,
  baseValue: 80,
  requiredLevel: 1,
  ilvl: computeIlvl(1, 'common'),
  textureKey: 'item_pressure_pill',
  color: 0x4488cc,
  effects: [{ trigger: 'on_use', effect: { type: 'stat_buff', stat: 'resilience', amount: 20, duration: 60 } }],
};

export const GILL_EXTRACT_RARE: ItemDefinition = {
  id: 'gill_extract_rare',
  displayName: 'Gill Extract Compound',
  description:
    'Verdant Dynamics biotech compound for oxygen extraction efficiency. Improves respiratory system performance in underwater environments for 90 seconds.',
  category: 'consumable',
  rarity: 'rare',
  maxStack: 20,
  weight: 0.15,
  baseValue: 300,
  requiredLevel: 10,
  ilvl: computeIlvl(2, 'rare'),
  textureKey: 'item_gill_extract',
  color: 0x3388aa,
  effects: [{ trigger: 'on_use', effect: { type: 'stat_buff', stat: 'recovery', amount: 35, duration: 90 } }],
};

export const DEPTH_CHARGE_EPIC: ItemDefinition = {
  id: 'depth_charge_epic',
  displayName: 'Deep Trench Repair Charge',
  description:
    'Emergency repair compound for Deep Trench pressure breaches. Rapidly seals suit damage caused by extreme underwater pressures. Rated for abyssal operations.',
  category: 'consumable',
  rarity: 'epic',
  maxStack: 10,
  weight: 0.5,
  baseValue: 1200,
  requiredLevel: 20,
  ilvl: computeIlvl(3, 'epic'),
  textureKey: 'item_depth_charge',
  color: 0x2266aa,
  effects: [{ trigger: 'on_use', effect: { type: 'suit_repair', amount: 200 } }],
};

export const KELP_SALVE_COMMON: ItemDefinition = {
  id: 'kelp_salve_common',
  displayName: 'Kelp Forest Salve',
  description:
    'Topical biomedical compound from Kelp Forest organisms. Promotes rapid cellular regeneration. The organisms continue working after application.',
  category: 'consumable',
  rarity: 'common',
  maxStack: 20,
  weight: 0.2,
  baseValue: 60,
  requiredLevel: 1,
  ilvl: computeIlvl(1, 'common'),
  textureKey: 'item_kelp_salve',
  color: 0x44aa66,
  effects: [{ trigger: 'on_use', effect: { type: 'heal', amount: 50 } }],
};

export const BRINE_CAPACITOR_RARE: ItemDefinition = {
  id: 'brine_capacitor_rare',
  displayName: 'Brine Capacitor Cell',
  description:
    'Energy cell with Tidal Pool electrolytes. The naturally conductive brine provides efficient energy transfer. Helix denies harvesting from living organisms.',
  category: 'consumable',
  rarity: 'rare',
  maxStack: 20,
  weight: 0.3,
  baseValue: 250,
  requiredLevel: 5,
  ilvl: computeIlvl(1, 'rare'),
  textureKey: 'item_brine_capacitor',
  color: 0x5599cc,
  effects: [{ trigger: 'on_use', effect: { type: 'energy_restore', amount: 100 } }],
};

// ============================================================
// ALL AQUATIC CONSUMABLES
// ============================================================

export const ALL_AQUATIC_CONSUMABLES: readonly ItemDefinition[] = [
  PRESSURE_PILL_COMMON,
  GILL_EXTRACT_RARE,
  DEPTH_CHARGE_EPIC,
  KELP_SALVE_COMMON,
  BRINE_CAPACITOR_RARE,
];
