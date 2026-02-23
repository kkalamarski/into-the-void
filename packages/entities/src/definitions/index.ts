import type { EntityDefinition } from '../types';

import { ALL_CREATURES } from './creatures';
import { ALL_PLANTS } from './plants';
import { ALL_MINERALS } from './minerals';
import { ALL_ARTIFACTS } from './artifacts';
import { ALL_AQUATIC_CREATURES } from './aquatic-creatures';
import { ALL_AQUATIC_PLANTS } from './aquatic-plants';
import { ALL_AQUATIC_MINERALS } from './aquatic-minerals';
import { ALL_AQUATIC_ARTIFACTS } from './aquatic-artifacts';

/**
 * All entity definitions - register these with EntityRegistry.
 * Total: ~58 entities (27 creatures + 19 plants + 15 minerals + 8 artifacts)
 */
export const ALL_ENTITIES: readonly EntityDefinition[] = [
  ...ALL_CREATURES,
  ...ALL_PLANTS,
  ...ALL_MINERALS,
  ...ALL_ARTIFACTS,
  ...ALL_AQUATIC_CREATURES,
  ...ALL_AQUATIC_PLANTS,
  ...ALL_AQUATIC_MINERALS,
  ...ALL_AQUATIC_ARTIFACTS,
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
  CREATURE_COASTAL_SCUTTLER: 'creature_coastal_scuttler',
  CREATURE_ASH_SKIMMER: 'creature_ash_skimmer',
  CREATURE_MIASMA_DRIFTER: 'creature_miasma_drifter',
  CREATURE_ICE_BURROWER: 'creature_ice_burrower',
  CREATURE_CRYSTAL_CRAWLER: 'creature_crystal_crawler',
  CREATURE_RUIN_SEEKER: 'creature_ruin_seeker',
  CREATURE_PETRIFIED_LURKER: 'creature_petrified_lurker',

  // ---- AQUATIC CREATURES ----
  CREATURE_TIDE_CRAB: 'creature_tide_crab',
  CREATURE_COASTAL_URCHIN: 'creature_coastal_urchin',
  CREATURE_REEF_SCAVENGER: 'creature_reef_scavenger',
  CREATURE_KELP_GRAZER: 'creature_kelp_grazer',
  CREATURE_TANGLE_STALKER: 'creature_tangle_stalker',
  CREATURE_CURRENT_RIDER: 'creature_current_rider',
  CREATURE_PRESSURE_FEEDER: 'creature_pressure_feeder',
  CREATURE_TRENCH_HUNTER: 'creature_trench_hunter',
  CREATURE_ABYSSAL_SCAVENGER: 'creature_abyssal_scavenger',
  CREATURE_ABYSSAL_LEVIATHAN: 'creature_abyssal_leviathan',

  // ---- PLANTS ----
  PLANT_LUMINOUS_VINE: 'plant_luminous_vine',
  PLANT_VOID_FERN: 'plant_void_fern',
  PLANT_DROUGHT_CACTUS: 'plant_drought_cactus',
  PLANT_GAS_POD: 'plant_gas_pod',
  PLANT_MOBILE_VINE: 'plant_mobile_vine',
  PLANT_THERMAL_VENT_MOSS: 'plant_thermal_vent_moss',
  PLANT_LATTICE_MOSS: 'plant_lattice_moss',
  PLANT_ICE_ALGAE: 'plant_ice_algae',
  PLANT_ACID_FERN: 'plant_acid_fern',
  PLANT_PHASE_BLOOM: 'plant_phase_bloom',
  PLANT_STAR_LICHEN: 'plant_star_lichen',
  // Rare plant variants
  PLANT_LUMINOUS_VINE_RARE: 'plant_luminous_vine_rare',
  PLANT_LATTICE_MOSS_RARE: 'plant_lattice_moss_rare',
  PLANT_PHASE_BLOOM_RARE: 'plant_phase_bloom_rare',

  // ---- AQUATIC PLANTS ----
  PLANT_TIDAL_KELP: 'plant_tidal_kelp',
  PLANT_BIOLUMINESCENT_ALGAE: 'plant_bioluminescent_algae',
  PLANT_PRESSURE_FERN: 'plant_pressure_fern',
  PLANT_VOID_KELP: 'plant_void_kelp',
  PLANT_THERMAL_VENT_COLONY: 'plant_thermal_vent_colony',

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
  // Rare mineral variants
  MINERAL_VOID_CRYSTAL_RARE: 'mineral_void_crystal_rare',
  MINERAL_PRISMATIC_CRYSTAL_RARE: 'mineral_prismatic_crystal_rare',
  MINERAL_VOLCANIC_ORE_RARE: 'mineral_volcanic_ore_rare',
  MINERAL_COSMIC_FRAGMENT_RARE: 'mineral_cosmic_fragment_rare',
  // Epic mineral variants
  MINERAL_ANOMALY_CRYSTAL_EPIC: 'mineral_anomaly_crystal_epic',

  // ---- AQUATIC MINERALS ----
  MINERAL_CORAL_DEPOSIT: 'mineral_coral_deposit',
  MINERAL_SEA_CRYSTAL: 'mineral_sea_crystal',
  MINERAL_ABYSSAL_ORE: 'mineral_abyssal_ore',
  MINERAL_TIDAL_STONE: 'mineral_tidal_stone',
  MINERAL_PEARL_NODE: 'mineral_pearl_node',

  // ---- ARTIFACTS ----
  ARTIFACT_ANCIENT_DATA_CORE: 'artifact_ancient_data_core',
  ARTIFACT_VOID_TOUCHED_RELIC: 'artifact_void_touched_relic',
  ARTIFACT_CRYSTALLINE_RESONATOR: 'artifact_crystalline_resonator',
  ARTIFACT_PRESERVED_SPECIMEN: 'artifact_preserved_specimen',
  ARTIFACT_THERMAL_CORE: 'artifact_thermal_core',

  // ---- AQUATIC ARTIFACTS ----
  ARTIFACT_SUNKEN_TECH: 'artifact_sunken_tech',
  ARTIFACT_ANCIENT_SHELL: 'artifact_ancient_shell',
  ARTIFACT_DROWNED_RELIC: 'artifact_drowned_relic',
} as const;

// Re-export individual entity arrays for direct imports
export * from './creatures';
export * from './plants';
export * from './minerals';
export * from './artifacts';
export * from './aquatic-creatures';
export * from './aquatic-plants';
export * from './aquatic-minerals';
export * from './aquatic-artifacts';
