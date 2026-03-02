import type { EntityDefinition } from '../types';

import { ALL_CREATURES } from './creatures';
import { ALL_PLANTS } from './plants';
import { ALL_MINERALS } from './minerals';
import { ALL_ARTIFACTS } from './artifacts';
import { ALL_AQUATIC_CREATURES } from './aquatic-creatures';
import { ALL_AQUATIC_PLANTS } from './aquatic-plants';
import { ALL_AQUATIC_MINERALS } from './aquatic-minerals';
import { ALL_AQUATIC_ARTIFACTS } from './aquatic-artifacts';
import { ALL_EXOTIC_CREATURES } from './exotic-creatures';
import { ALL_EXOTIC_PLANTS } from './exotic-plants';
import { ALL_EXOTIC_MINERALS } from './exotic-minerals';
import { ALL_EXOTIC_ARTIFACTS } from './exotic-artifacts';

/**
 * All entity definitions - register these with EntityRegistry.
 * Total: ~92 entities (41 creatures + 26 plants + 22 minerals + 13 artifacts)
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
  ...ALL_EXOTIC_CREATURES,
  ...ALL_EXOTIC_PLANTS,
  ...ALL_EXOTIC_MINERALS,
  ...ALL_EXOTIC_ARTIFACTS,
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
  // Phase 88 starfall_crater and ancient_ruins creatures
  CREATURE_STARFALL_GRAZER: 'creature_starfall_grazer',
  CREATURE_CRATER_STALKER: 'creature_crater_stalker',
  CREATURE_GUARDIAN_CONSTRUCT: 'creature_guardian_construct',
  CREATURE_RELIC_BEAST: 'creature_relic_beast',
  // Phase 110 Tier I creatures
  CREATURE_PLAINS_GRAZER: 'creature_plains_grazer',
  CREATURE_VOID_PROWLER: 'creature_void_prowler',
  CREATURE_MYCELIAL_STALKER: 'creature_mycelial_stalker',
  CREATURE_SPORE_BEETLE: 'creature_spore_beetle',
  CREATURE_RUIN_SCAVENGER: 'creature_ruin_scavenger',
  CREATURE_RUIN_WARDEN: 'creature_ruin_warden',
  // Phase 110 Tier II land creatures
  CREATURE_SLUDGE_GRAZER: 'creature_sludge_grazer',
  CREATURE_CORROSION_MAW: 'creature_corrosion_maw',
  CREATURE_FUME_DRIFTER: 'creature_fume_drifter',
  CREATURE_ACID_MANIAC: 'creature_acid_maniac',
  CREATURE_BOG_CRAWLER: 'creature_bog_crawler',
  CREATURE_MARSH_SNAPPER: 'creature_marsh_snapper',
  CREATURE_STONE_GRAZER: 'creature_stone_grazer',
  CREATURE_FOSSIL_SCAVENGER: 'creature_fossil_scavenger',

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
  // Phase 110 Tier I aquatic addition
  CREATURE_TIDAL_SNAPPER: 'creature_tidal_snapper',
  // Phase 110 Tier II aquatic addition
  CREATURE_KELP_AMBUSHER: 'creature_kelp_ambusher',

  // ---- PLANTS ----
  PLANT_LUMINOUS_VINE: 'plant_luminous_vine',
  PLANT_VOID_FERN: 'plant_void_fern',
  PLANT_DROUGHT_CACTUS: 'plant_drought_cactus',
  PLANT_VOID_TREE: 'plant_void_tree',
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
  PLANT_TENDRIL_TREE: 'plant_tendril_tree',
  // Phase 88 fungal_forest rare/epic
  PLANT_RARE_FUNGI: 'plant_rare_fungi',
  PLANT_EPIC_SPORES: 'plant_epic_spores',

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
  // Phase 88 miasma_marshes rare/epic
  MINERAL_TOXIC_CRYSTAL: 'mineral_toxic_crystal',
  MINERAL_MARSH_GAS_NODE: 'mineral_marsh_gas_node',

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
  // Phase 88 biome gap artifacts
  ARTIFACT_CONTAMINATED_RELIC: 'artifact_contaminated_relic',
  ARTIFACT_FROZEN_ARCHIVE: 'artifact_frozen_archive',

  // ---- AQUATIC ARTIFACTS ----
  ARTIFACT_SUNKEN_TECH: 'artifact_sunken_tech',
  ARTIFACT_ANCIENT_SHELL: 'artifact_ancient_shell',
  ARTIFACT_DROWNED_RELIC: 'artifact_drowned_relic',

  // ---- EXOTIC CREATURES ----
  CREATURE_ECHO_DRIFTER: 'creature_echo_drifter',
  CREATURE_PHASE_GRAZER: 'creature_phase_grazer',
  CREATURE_REALITY_SCAVENGER: 'creature_reality_scavenger',
  CREATURE_NULL_FEEDER: 'creature_null_feeder',
  CREATURE_DIMENSIONAL_HUNTER: 'creature_dimensional_hunter',
  CREATURE_RIFT_HUNTER: 'creature_rift_hunter',
  CREATURE_VOID_GRAZER: 'creature_void_grazer',
  CREATURE_ANOMALY_SCAVENGER: 'creature_anomaly_scavenger',
  CREATURE_VOID_STALKER: 'creature_void_stalker',
  CREATURE_DIMENSIONAL_ABERRATION: 'creature_dimensional_aberration',
  // Phase 110 Tier II exotic addition
  CREATURE_ABYSSAL_ANGLER: 'creature_abyssal_angler',

  // ---- EXOTIC PLANTS ----
  PLANT_REALITY_MOSS: 'plant_reality_moss',
  PLANT_ECHO_BLOOM: 'plant_echo_bloom',
  PLANT_TEMPORAL_FUNGUS: 'plant_temporal_fungus',
  PLANT_VOID_VINE: 'plant_void_vine',
  PLANT_NULL_GRASS: 'plant_null_grass',

  // ---- EXOTIC MINERALS ----
  MINERAL_VOID_CRYSTAL_NODE: 'mineral_void_crystal_node',
  MINERAL_ANOMALY_SHARD: 'mineral_anomaly_shard',
  MINERAL_DIMENSIONAL_ORE: 'mineral_dimensional_ore',
  MINERAL_NULL_STONE: 'mineral_null_stone',
  MINERAL_PHASE_MINERAL: 'mineral_phase_mineral',

  // ---- EXOTIC ARTIFACTS ----
  ARTIFACT_ANOMALY_CORE: 'artifact_anomaly_core',
  ARTIFACT_DIMENSIONAL_FRAGMENT: 'artifact_dimensional_fragment',
  ARTIFACT_ECHO_RECORD: 'artifact_echo_record',
  ARTIFACT_VOID_RELIC: 'artifact_void_relic',
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
export * from './exotic-creatures';
export * from './exotic-plants';
export * from './exotic-minerals';
export * from './exotic-artifacts';
