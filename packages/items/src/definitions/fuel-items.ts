import type { ItemDefinition } from '../types';
import { computeIlvl } from '../utils';

// ============================================================
// FUEL ITEMS (4) — reagent category, deposited into automation structures
// NOTE: category is 'reagent' (NOT 'consumable') to prevent direct use via inventory:use
// ============================================================

export const FUEL_CELL_BASIC: ItemDefinition = {
  id: 'fuel_cell_basic',
  displayName: 'Basic Fuel Cell',
  description:
    'A compact energy cartridge assembled from common reagents. Powers T2 Extractors for 5 minutes per cell. Standard automation fuel used across all factions.',
  category: 'reagent',
  rarity: 'common',
  maxStack: 50,
  weight: 0.5,
  baseValue: 120,
  requiredLevel: 10,
  ilvl: computeIlvl(2, 'common'),
  textureKey: 'item_fuel_cell',
  color: 0x44aacc,
};

export const FUEL_CELL_ADVANCED: ItemDefinition = {
  id: 'fuel_cell_advanced',
  displayName: 'Advanced Fuel Cell',
  description:
    'A high-capacity energy cartridge incorporating thermal compounds for sustained output. Powers T3 Survey Beacons for 4 hours per cell. Preferred by Nexus long-range scouts.',
  category: 'reagent',
  rarity: 'rare',
  maxStack: 30,
  weight: 0.5,
  baseValue: 400,
  requiredLevel: 20,
  ilvl: computeIlvl(3, 'rare'),
  textureKey: 'item_fuel_cell',
  color: 0x44ccaa,
};

export const POWER_CORE: ItemDefinition = {
  id: 'power_core',
  displayName: 'Power Core',
  description:
    'A dense energy module forged from rare and epic reagents. Powers T4 Planetary Extractors for 2 hours per core. Helix Extraction pioneered the manufacturing process.',
  category: 'reagent',
  rarity: 'epic',
  maxStack: 20,
  weight: 0.5,
  baseValue: 500,
  requiredLevel: 30,
  ilvl: computeIlvl(4, 'epic'),
  textureKey: 'item_fuel_cell',
  color: 0xffaa22,
};

export const REFINERY_CORE: ItemDefinition = {
  id: 'refinery_core',
  displayName: 'Refinery Core',
  description:
    'An exotic-grade transmutation catalyst required to operate T5 Refineries. Powers refinery operations for 2 hours per core. The manufacturing process remains a closely guarded Nexus trade secret.',
  category: 'reagent',
  rarity: 'exotic',
  maxStack: 10,
  weight: 0.5,
  baseValue: 600,
  requiredLevel: 40,
  ilvl: computeIlvl(5, 'exotic'),
  textureKey: 'item_fuel_cell',
  color: 0xff4488,
};

export const ALL_FUEL_ITEMS: readonly ItemDefinition[] = [
  FUEL_CELL_BASIC,
  FUEL_CELL_ADVANCED,
  POWER_CORE,
  REFINERY_CORE,
];
