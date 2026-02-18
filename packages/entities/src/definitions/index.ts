import type { EntityDefinition } from '../types';

import { ALL_CREATURES } from './creatures';
import { ALL_PLANTS } from './plants';
import { ALL_MINERALS } from './minerals';
import { ALL_ARTIFACTS } from './artifacts';

/**
 * All entity definitions - register these with EntityRegistry.
 * Total: ~35 entities (10 creatures + 10 plants + 10 minerals + 5 artifacts)
 */
export const ALL_ENTITIES: readonly EntityDefinition[] = [
  ...ALL_CREATURES,
  ...ALL_PLANTS,
  ...ALL_MINERALS,
  ...ALL_ARTIFACTS,
];

/**
 * String constants for entity IDs - use these instead of hardcoded strings.
 * Provides type-safe access and prevents typo bugs.
 *
 * Loot table convention: lootTableId = 'loot_' + entity id
 */
export const ENTITY_IDS = {
  // ---- CREATURES ----
  CREATURE_VOID_CRAWLER: 'creature_void_crawler',
  CREATURE_CANOPY_GRAZER: 'creature_canopy_grazer',
  CREATURE_SPORE_CARRIER: 'creature_spore_carrier',
  CREATURE_CRYSTAL_HUNTER: 'creature_crystal_hunter',
  CREATURE_MARSH_LURKER: 'creature_marsh_lurker',
  CREATURE_DART_RUNNER: 'creature_dart_runner',
  CREATURE_FROST_STALKER: 'creature_frost_stalker',
  CREATURE_MAGMA_BEAST: 'creature_magma_beast',
  CREATURE_TOXIC_LURKER: 'creature_toxic_lurker',
  CREATURE_VOID_HORROR: 'creature_void_horror',

  // ---- PLANTS ----
  PLANT_LUMINOUS_VINE: 'plant_luminous_vine',
  PLANT_DROUGHT_CACTUS: 'plant_drought_cactus',
  PLANT_GAS_POD: 'plant_gas_pod',
  PLANT_MOBILE_VINE: 'plant_mobile_vine',
  PLANT_THERMAL_VENT_MOSS: 'plant_thermal_vent_moss',
  PLANT_LATTICE_MOSS: 'plant_lattice_moss',
  PLANT_ICE_ALGAE: 'plant_ice_algae',
  PLANT_ACID_FERN: 'plant_acid_fern',
  PLANT_PHASE_BLOOM: 'plant_phase_bloom',
  PLANT_STAR_LICHEN: 'plant_star_lichen',

  // ---- MINERALS ----
  MINERAL_VOID_CRYSTAL: 'mineral_void_crystal',
  MINERAL_PRISMATIC_CRYSTAL: 'mineral_prismatic_crystal',
  MINERAL_CHEMICAL_SUMP: 'mineral_chemical_sump',
  MINERAL_MINERALIZED_LOG: 'mineral_mineralized_log',
  MINERAL_VOLCANIC_ORE: 'mineral_volcanic_ore',
  MINERAL_PERMAFROST_SHARD: 'mineral_permafrost_shard',
  MINERAL_CORROSIVE_DEPOSIT: 'mineral_corrosive_deposit',
  MINERAL_MYCELIAL_CLUSTER: 'mineral_mycelial_cluster',
  MINERAL_ANOMALY_CRYSTAL: 'mineral_anomaly_crystal',
  MINERAL_COSMIC_FRAGMENT: 'mineral_cosmic_fragment',

  // ---- ARTIFACTS ----
  ARTIFACT_ANCIENT_DATA_CORE: 'artifact_ancient_data_core',
  ARTIFACT_VOID_TOUCHED_RELIC: 'artifact_void_touched_relic',
  ARTIFACT_CRYSTALLINE_RESONATOR: 'artifact_crystalline_resonator',
  ARTIFACT_PRESERVED_SPECIMEN: 'artifact_preserved_specimen',
  ARTIFACT_THERMAL_CORE: 'artifact_thermal_core',
} as const;

// Re-export individual entity arrays for direct imports
export * from './creatures';
export * from './plants';
export * from './minerals';
export * from './artifacts';
