import type { ItemDefinition } from '../types';
import { computeIlvl } from '../utils';

// ============================================================
// EXOTIC CONSUMABLES (5) — Phase 87 anomaly zone operations
// ============================================================

export const STABILITY_TONIC_EPIC: ItemDefinition = {
  id: 'stability_tonic_epic',
  displayName: 'Reality Stabilization Tonic',
  description:
    'Reality stabilization compound with Anomaly Catalyst reagents. Essential for Void Rift operations. Reinforces biological structures against dimensional distortion for 120 seconds.',
  category: 'consumable',
  rarity: 'epic',
  maxStack: 10,
  weight: 0.2,
  baseValue: 1500,
  requiredLevel: 25,
  ilvl: computeIlvl(3, 'epic'),
  textureKey: 'item_stability_tonic',
  color: 0x7700ff,
  effects: [{ trigger: 'on_use', effect: { type: 'stat_buff', stat: 'resilience', amount: 50, duration: 120 } }],
};

export const VOID_ESSENCE_VIAL_EXOTIC: ItemDefinition = {
  id: 'void_essence_vial_exotic',
  displayName: 'Void Essence Vial',
  description:
    'Concentrated Void Essence for anomalous energy restoration. "Using it feels wrong. It works anyway." Provides 400 energy with unusual efficiency.',
  category: 'consumable',
  rarity: 'exotic',
  maxStack: 10,
  weight: 0.2,
  baseValue: 3000,
  requiredLevel: 30,
  ilvl: computeIlvl(4, 'exotic'),
  textureKey: 'item_void_essence_vial',
  color: 0x5500ff,
  effects: [{ trigger: 'on_use', effect: { type: 'energy_restore', amount: 400 } }],
};

export const PHASE_CAPSULE_EPIC: ItemDefinition = {
  id: 'phase_capsule_epic',
  displayName: 'Phase Shift Capsule',
  description:
    'Dimensional material compound for enhanced movement speed. "The side effects are... being studied." Temporarily alters personal space-time relationship for 90 seconds.',
  category: 'consumable',
  rarity: 'epic',
  maxStack: 10,
  weight: 0.15,
  baseValue: 1800,
  requiredLevel: 25,
  ilvl: computeIlvl(3, 'epic'),
  textureKey: 'item_phase_capsule',
  color: 0x6600cc,
  effects: [{ trigger: 'on_use', effect: { type: 'stat_buff', stat: 'haste', amount: 45, duration: 90 } }],
};

export const DIMENSIONAL_MEND_EXOTIC: ItemDefinition = {
  id: 'dimensional_mend_exotic',
  displayName: 'Dimensional Mend Compound',
  description:
    'Medical compound with Ancient stabilizer fragments. "Extremely effective. Disturbingly so." Restores 400 health by reorganizing damaged tissue at a molecular level.',
  category: 'consumable',
  rarity: 'exotic',
  maxStack: 10,
  weight: 0.2,
  baseValue: 3500,
  requiredLevel: 30,
  ilvl: computeIlvl(4, 'exotic'),
  textureKey: 'item_dimensional_mend',
  color: 0x8800ff,
  effects: [{ trigger: 'on_use', effect: { type: 'heal', amount: 400 } }],
};

export const NULL_PATCH_KIT_EPIC: ItemDefinition = {
  id: 'null_patch_kit_epic',
  displayName: 'Null-Forged Patch Kit',
  description:
    'Void-forged suit repair system. "How it functions without power is unknown." Repairs 200 suit integrity using anomalous bonding principles.',
  category: 'consumable',
  rarity: 'epic',
  maxStack: 10,
  weight: 0.4,
  baseValue: 1400,
  requiredLevel: 25,
  ilvl: computeIlvl(3, 'epic'),
  textureKey: 'item_null_patch_kit',
  color: 0x4400aa,
  effects: [{ trigger: 'on_use', effect: { type: 'suit_repair', amount: 200 } }],
};

// ============================================================
// ALL EXOTIC CONSUMABLES
// ============================================================

export const ALL_EXOTIC_CONSUMABLES: readonly ItemDefinition[] = [
  STABILITY_TONIC_EPIC,
  VOID_ESSENCE_VIAL_EXOTIC,
  PHASE_CAPSULE_EPIC,
  DIMENSIONAL_MEND_EXOTIC,
  NULL_PATCH_KIT_EPIC,
];
