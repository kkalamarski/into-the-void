import type { ItemDefinition } from '../types';
import { computeIlvl } from '../utils';

// ============================================================
// HAZARD PROTECTION MODULES (10) — on_equip hazard_protection effect
// 5 hazard types x 2 tiers (rare @ 40%, epic @ 70%)
//
// Phase 120: Biome Hazard System
// HAZD-05: Protection gear reduces hazard damage proportionally
// HAZD-06: Available in traders before hazard ticks are enabled
// ============================================================

// ── Chemical Protection ─────────────────────────────────────────

export const MODULE_CHEM_FILTER_RARE: ItemDefinition = {
  id: 'module_chem_filter_rare',
  displayName: 'Chemical Filter Module',
  description:
    'A bio-organic air filtration unit that neutralizes airborne toxins and corrosive particulates. Provides 40% protection against Chemical hazards in Toxic Wastes and Miasma Marshes. Verdant Dynamics pioneered the living-membrane design.',
  category: 'module',
  rarity: 'rare',
  maxStack: 1,
  weight: 1.5,
  baseValue: 3000,
  requiredLevel: 10,
  ilvl: computeIlvl(2, 'rare'),
  textureKey: 'item_module_hazard',
  color: 0x88cc44,
  equipSlot: 'module',
  effects: [
    { trigger: 'on_equip', effect: { type: 'hazard_protection', hazardType: 'chemical', protectionPercent: 40 } },
  ],
};

export const MODULE_CHEM_FILTER_EPIC: ItemDefinition = {
  id: 'module_chem_filter_epic',
  displayName: 'Advanced Chemical Filter',
  description:
    'A Verdant-engineered multi-stage filtration system using cultivated Terminus organisms. The living filter adapts to new toxin compounds in real-time. Provides 70% protection against Chemical hazards.',
  category: 'module',
  rarity: 'epic',
  maxStack: 1,
  weight: 1.5,
  baseValue: 12000,
  requiredLevel: 20,
  ilvl: computeIlvl(3, 'epic'),
  textureKey: 'item_module_hazard',
  color: 0x88cc44,
  equipSlot: 'module',
  effects: [
    { trigger: 'on_equip', effect: { type: 'hazard_protection', hazardType: 'chemical', protectionPercent: 70 } },
  ],
};

// ── Thermal Protection ──────────────────────────────────────────

export const MODULE_THERMAL_REG_RARE: ItemDefinition = {
  id: 'module_thermal_reg_rare',
  displayName: 'Thermal Regulator Module',
  description:
    'An industrial-grade heat management system designed for Helix deep-site operations. Maintains suit core temperature within operational limits. Provides 40% protection against Thermal hazards in Volcanic Ridge and Frozen Expanse.',
  category: 'module',
  rarity: 'rare',
  maxStack: 1,
  weight: 1.5,
  baseValue: 3000,
  requiredLevel: 10,
  ilvl: computeIlvl(2, 'rare'),
  textureKey: 'item_module_hazard',
  color: 0xff4500,
  equipSlot: 'module',
  effects: [
    { trigger: 'on_equip', effect: { type: 'hazard_protection', hazardType: 'thermal', protectionPercent: 40 } },
  ],
};

export const MODULE_THERMAL_REG_EPIC: ItemDefinition = {
  id: 'module_thermal_reg_epic',
  displayName: 'Advanced Thermal Regulator',
  description:
    'A Helix-engineered phase-change heat sink with active cooling loops. Rated for sustained exposure to volcanic vents and sub-zero environments. Provides 70% protection against Thermal hazards.',
  category: 'module',
  rarity: 'epic',
  maxStack: 1,
  weight: 1.5,
  baseValue: 12000,
  requiredLevel: 20,
  ilvl: computeIlvl(3, 'epic'),
  textureKey: 'item_module_hazard',
  color: 0xff4500,
  equipSlot: 'module',
  effects: [
    { trigger: 'on_equip', effect: { type: 'hazard_protection', hazardType: 'thermal', protectionPercent: 70 } },
  ],
};

// ── Physical Protection ─────────────────────────────────────────

export const MODULE_IMPACT_SHIELD_RARE: ItemDefinition = {
  id: 'module_impact_shield_rare',
  displayName: 'Impact Shield Module',
  description:
    'A kinetic dampening system that absorbs and disperses impact energy from crystal shards and high-pressure environments. Provides 40% protection against Physical hazards in Crystal Caves and Deep Trenches.',
  category: 'module',
  rarity: 'rare',
  maxStack: 1,
  weight: 1.5,
  baseValue: 3000,
  requiredLevel: 10,
  ilvl: computeIlvl(2, 'rare'),
  textureKey: 'item_module_hazard',
  color: 0x4488ff,
  equipSlot: 'module',
  effects: [
    { trigger: 'on_equip', effect: { type: 'hazard_protection', hazardType: 'physical', protectionPercent: 40 } },
  ],
};

export const MODULE_IMPACT_SHIELD_EPIC: ItemDefinition = {
  id: 'module_impact_shield_epic',
  displayName: 'Advanced Impact Shield',
  description:
    'A multi-layered reactive shield system that generates localized force fields on impact detection. Rated for crystalline and abyssal pressure environments. Provides 70% protection against Physical hazards.',
  category: 'module',
  rarity: 'epic',
  maxStack: 1,
  weight: 1.5,
  baseValue: 12000,
  requiredLevel: 20,
  ilvl: computeIlvl(3, 'epic'),
  textureKey: 'item_module_hazard',
  color: 0x4488ff,
  equipSlot: 'module',
  effects: [
    { trigger: 'on_equip', effect: { type: 'hazard_protection', hazardType: 'physical', protectionPercent: 70 } },
  ],
};

// ── Biological Protection ───────────────────────────────────────

export const MODULE_BIO_SEAL_RARE: ItemDefinition = {
  id: 'module_bio_seal_rare',
  displayName: 'Bio-Seal Module',
  description:
    'A hermetic containment system that prevents biological contaminants from infiltrating the suit. Filters spores, parasitic organisms, and mutagenic compounds. Provides 40% protection against Biological hazards.',
  category: 'module',
  rarity: 'rare',
  maxStack: 1,
  weight: 1.5,
  baseValue: 3000,
  requiredLevel: 10,
  ilvl: computeIlvl(2, 'rare'),
  textureKey: 'item_module_hazard',
  color: 0x9370db,
  equipSlot: 'module',
  effects: [
    { trigger: 'on_equip', effect: { type: 'hazard_protection', hazardType: 'biological', protectionPercent: 40 } },
  ],
};

export const MODULE_BIO_SEAL_EPIC: ItemDefinition = {
  id: 'module_bio_seal_epic',
  displayName: 'Advanced Bio-Seal',
  description:
    'A Verdant-designed active decontamination system that identifies and neutralizes biological threats before they reach the operator. Uses cultivated counter-organisms for real-time defense. Provides 70% protection against Biological hazards.',
  category: 'module',
  rarity: 'epic',
  maxStack: 1,
  weight: 1.5,
  baseValue: 12000,
  requiredLevel: 20,
  ilvl: computeIlvl(3, 'epic'),
  textureKey: 'item_module_hazard',
  color: 0x9370db,
  equipSlot: 'module',
  effects: [
    { trigger: 'on_equip', effect: { type: 'hazard_protection', hazardType: 'biological', protectionPercent: 70 } },
  ],
};

// ── Anomalous Protection ────────────────────────────────────────

export const MODULE_ANOMALY_WARD_RARE: ItemDefinition = {
  id: 'module_anomaly_ward_rare',
  displayName: 'Anomaly Ward Module',
  description:
    'A Nexus-developed quantum stabilization field that partially anchors local spacetime. Reduces the effects of reality distortion in anomalous zones. Provides 40% protection against Anomalous hazards in Void Rifts.',
  category: 'module',
  rarity: 'rare',
  maxStack: 1,
  weight: 1.5,
  baseValue: 3000,
  requiredLevel: 10,
  ilvl: computeIlvl(2, 'rare'),
  textureKey: 'item_module_hazard',
  color: 0x4a0080,
  equipSlot: 'module',
  effects: [
    { trigger: 'on_equip', effect: { type: 'hazard_protection', hazardType: 'anomalous', protectionPercent: 40 } },
  ],
};

export const MODULE_ANOMALY_WARD_EPIC: ItemDefinition = {
  id: 'module_anomaly_ward_epic',
  displayName: 'Advanced Anomaly Ward',
  description:
    'A Nexus quantum resonance shield that creates a persistent reality-anchoring field around the operator. Based on reverse-engineered Prior Inhabitant stabilization technology. Provides 70% protection against Anomalous hazards.',
  category: 'module',
  rarity: 'epic',
  maxStack: 1,
  weight: 1.5,
  baseValue: 12000,
  requiredLevel: 20,
  ilvl: computeIlvl(3, 'epic'),
  textureKey: 'item_module_hazard',
  color: 0x4a0080,
  equipSlot: 'module',
  effects: [
    { trigger: 'on_equip', effect: { type: 'hazard_protection', hazardType: 'anomalous', protectionPercent: 70 } },
  ],
};

// ============================================================
// ALL HAZARD MODULES
// ============================================================

export const ALL_HAZARD_MODULES: readonly ItemDefinition[] = [
  MODULE_CHEM_FILTER_RARE,
  MODULE_CHEM_FILTER_EPIC,
  MODULE_THERMAL_REG_RARE,
  MODULE_THERMAL_REG_EPIC,
  MODULE_IMPACT_SHIELD_RARE,
  MODULE_IMPACT_SHIELD_EPIC,
  MODULE_BIO_SEAL_RARE,
  MODULE_BIO_SEAL_EPIC,
  MODULE_ANOMALY_WARD_RARE,
  MODULE_ANOMALY_WARD_EPIC,
];
