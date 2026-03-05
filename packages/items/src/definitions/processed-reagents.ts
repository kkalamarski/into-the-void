import type { ItemDefinition } from '../types';
import { computeIlvl } from '../utils';

// ============================================================
// PROCESSED REAGENTS — Crafting chain intermediates (Phase 123)
// Created by Reagents discipline, consumed by Equipment/Consumables
// ============================================================

export const PROCESSED_BIOWEAVE_FIBER: ItemDefinition = {
  id: 'processed_bioweave_fiber',
  displayName: 'Bioweave Fiber',
  description:
    'Fungal spore clusters processed into reinforced biological fibers. Used in suit manufacturing and bio-tech applications. Verdant Dynamics standardized the processing technique.',
  category: 'reagent',
  rarity: 'common',
  maxStack: 999,
  weight: 0.15,
  baseValue: 120,
  requiredLevel: 3,
  ilvl: computeIlvl(1, 'common'),
  textureKey: 'item_processed_bioweave',
  color: 0x88aa66,
};

export const PROCESSED_THERMAL_ALLOY: ItemDefinition = {
  id: 'processed_thermal_alloy',
  displayName: 'Thermal Alloy',
  description:
    'Volcanic glass fused with thermal compound under extreme pressure. The resulting alloy has exceptional heat resistance and structural integrity. Standard material for industrial equipment.',
  category: 'reagent',
  rarity: 'rare',
  maxStack: 999,
  weight: 0.3,
  baseValue: 400,
  requiredLevel: 8,
  ilvl: computeIlvl(2, 'rare'),
  textureKey: 'item_processed_thermal_alloy',
  color: 0xcc6622,
};

export const PROCESSED_CRYSTAL_LENS: ItemDefinition = {
  id: 'processed_crystal_lens',
  displayName: 'Crystal Lens',
  description:
    'Crystalline dust refined into precision optical components. Essential for sensor modules and detection equipment. Nexus Frontiers controls most production through their Shallows facilities.',
  category: 'reagent',
  rarity: 'common',
  maxStack: 999,
  weight: 0.1,
  baseValue: 90,
  requiredLevel: 3,
  ilvl: computeIlvl(1, 'common'),
  textureKey: 'item_processed_crystal_lens',
  color: 0xaaccff,
};

export const PROCESSED_SYNTH_COMPOUND: ItemDefinition = {
  id: 'processed_synth_compound',
  displayName: 'Synth Compound',
  description:
    'A pharmaceutical-grade compound synthesized from fungal extract and bioluminescent materials. Base ingredient for most advanced medical consumables. Highly regulated by ICC health standards.',
  category: 'reagent',
  rarity: 'rare',
  maxStack: 999,
  weight: 0.1,
  baseValue: 250,
  requiredLevel: 6,
  ilvl: computeIlvl(1, 'rare'),
  textureKey: 'item_processed_synth_compound',
  color: 0x66cc88,
};

export const PROCESSED_CIRCUIT_MATRIX: ItemDefinition = {
  id: 'processed_circuit_matrix',
  displayName: 'Circuit Matrix',
  description:
    'Ancient circuitry integrated with crystalline dust into a programmable component framework. Used in advanced module manufacturing. The integration process was reverse-engineered from Prior Inhabitant ruins.',
  category: 'reagent',
  rarity: 'epic',
  maxStack: 999,
  weight: 0.2,
  baseValue: 800,
  requiredLevel: 12,
  ilvl: computeIlvl(2, 'epic'),
  textureKey: 'item_processed_circuit_matrix',
  color: 0x44ddaa,
};

export const ALL_PROCESSED_REAGENTS: readonly ItemDefinition[] = [
  PROCESSED_BIOWEAVE_FIBER,
  PROCESSED_THERMAL_ALLOY,
  PROCESSED_CRYSTAL_LENS,
  PROCESSED_SYNTH_COMPOUND,
  PROCESSED_CIRCUIT_MATRIX,
];
