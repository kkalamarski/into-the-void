import type { ItemDefinition } from '../types';
import { computeIlvl } from '../utils';

// ============================================================
// HAZARD PROTECTION CONSUMABLES (5) — on_use stat_buff for hazardProtection
// One per hazard type, each providing 30% protection for 5 minutes (300s)
//
// Phase 120: Biome Hazard System
// HAZD-07: Consumable duration is 5-minute baseline
// Uses stat_buff with hazardProtection_{type} key for buff system compatibility
// ============================================================

export const CONSUMABLE_CHEM_NEUTRALIZER: ItemDefinition = {
  id: 'consumable_chem_neutralizer',
  displayName: 'Chemical Neutralizer',
  description:
    'An injectable compound that temporarily enhances the body\'s resistance to chemical toxins. Provides 30% protection against Chemical hazards for 5 minutes. Standard issue for operatives entering Toxic Wastes.',
  category: 'consumable',
  rarity: 'rare',
  maxStack: 10,
  weight: 0.3,
  baseValue: 500,
  requiredLevel: 5,
  ilvl: computeIlvl(1, 'rare'),
  textureKey: 'item_hazard_consumable',
  color: 0x88cc44,
  effects: [
    { trigger: 'on_use', effect: { type: 'stat_buff', stat: 'hazardProtection_chemical', amount: 30, duration: 300 } },
  ],
};

export const CONSUMABLE_THERMAL_COOLANT: ItemDefinition = {
  id: 'consumable_thermal_coolant',
  displayName: 'Thermal Stabilizer',
  description:
    'A subdermal thermal regulation compound that maintains core body temperature in extreme environments. Provides 30% protection against Thermal hazards for 5 minutes. Helix deep-site teams use these in volcanic zones.',
  category: 'consumable',
  rarity: 'rare',
  maxStack: 10,
  weight: 0.3,
  baseValue: 500,
  requiredLevel: 5,
  ilvl: computeIlvl(1, 'rare'),
  textureKey: 'item_hazard_consumable',
  color: 0xff4500,
  effects: [
    { trigger: 'on_use', effect: { type: 'stat_buff', stat: 'hazardProtection_thermal', amount: 30, duration: 300 } },
  ],
};

export const CONSUMABLE_IMPACT_GEL: ItemDefinition = {
  id: 'consumable_impact_gel',
  displayName: 'Impact Absorption Gel',
  description:
    'A kinetic-dampening compound applied to suit joints and vulnerable areas. Hardens on impact, then returns to flexible state. Provides 30% protection against Physical hazards for 5 minutes.',
  category: 'consumable',
  rarity: 'rare',
  maxStack: 10,
  weight: 0.3,
  baseValue: 500,
  requiredLevel: 5,
  ilvl: computeIlvl(1, 'rare'),
  textureKey: 'item_hazard_consumable',
  color: 0x4488ff,
  effects: [
    { trigger: 'on_use', effect: { type: 'stat_buff', stat: 'hazardProtection_physical', amount: 30, duration: 300 } },
  ],
};

export const CONSUMABLE_BIO_INOCULANT: ItemDefinition = {
  id: 'consumable_bio_inoculant',
  displayName: 'Bio-Inoculant',
  description:
    'A broad-spectrum biological defense compound that temporarily boosts immune response against Terminus organisms. Provides 30% protection against Biological hazards for 5 minutes. Recommended before entering spore-heavy zones.',
  category: 'consumable',
  rarity: 'rare',
  maxStack: 10,
  weight: 0.3,
  baseValue: 500,
  requiredLevel: 5,
  ilvl: computeIlvl(1, 'rare'),
  textureKey: 'item_hazard_consumable',
  color: 0x9370db,
  effects: [
    { trigger: 'on_use', effect: { type: 'stat_buff', stat: 'hazardProtection_biological', amount: 30, duration: 300 } },
  ],
};

export const CONSUMABLE_ANOMALY_ANCHOR: ItemDefinition = {
  id: 'consumable_anomaly_anchor',
  displayName: 'Reality Anchor',
  description:
    'A Nexus-developed compound that temporarily stabilizes the operator\'s quantum signature. Reduces the disorienting effects of spacetime distortion in anomalous zones. Provides 30% protection against Anomalous hazards for 5 minutes.',
  category: 'consumable',
  rarity: 'rare',
  maxStack: 10,
  weight: 0.3,
  baseValue: 500,
  requiredLevel: 5,
  ilvl: computeIlvl(1, 'rare'),
  textureKey: 'item_hazard_consumable',
  color: 0x4a0080,
  effects: [
    { trigger: 'on_use', effect: { type: 'stat_buff', stat: 'hazardProtection_anomalous', amount: 30, duration: 300 } },
  ],
};

// ============================================================
// ALL HAZARD CONSUMABLES
// ============================================================

export const ALL_HAZARD_CONSUMABLES: readonly ItemDefinition[] = [
  CONSUMABLE_CHEM_NEUTRALIZER,
  CONSUMABLE_THERMAL_COOLANT,
  CONSUMABLE_IMPACT_GEL,
  CONSUMABLE_BIO_INOCULANT,
  CONSUMABLE_ANOMALY_ANCHOR,
];
