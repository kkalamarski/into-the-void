/**
 * Entity render data tables extracted from EntityRenderer.ts.
 * Consumed by strategy classes for per-type rendering configuration.
 */

// Entity size scales by type - base scale multiplier for 256x256 sprites
export const ENTITY_SCALE: Record<string, number> = {
  creature: 2.5,   // Large - creatures should be prominent
  mineral: 2.0,    // Medium-large - resource nodes
  plant: 1.8,      // Medium - harvestable plants
  artifact: 1.5,   // Medium-small - collectible items
  item: 1.0,       // Small - dropped items on ground
  npc: 2.2,        // NPCs slightly smaller than creatures
};

// Scale overrides for animated creatures with smaller sprite sheets (~48-120px)
export const ANIMATED_CREATURE_SCALE: Record<string, number> = {
  creature_void_crawler: 1.5,      // 128px sprite - insectoid crawler
  creature_coastal_scuttler: 1.5,  // 128px sprite - crustacean
  creature_crystal_hunter: 4.0,    // Larger predator (96px sprite)
  creature_frost_stalker: 3.5,     // Fast predator (56px sprite)
  creature_canopy_grazer: 4.0,     // Large herbivore (48px sprite)
  creature_tide_crab: 3.5,         // Medium crustacean (48px sprite)
  creature_coastal_urchin: 3.0,    // Smaller spiny creature (64px sprite)
  creature_reef_scavenger: 3.5,    // Medium aquatic scavenger (64px sprite)
  creature_crystal_crawler: 2.5,   // Crystal bear (96px sprite)
  creature_void_horror: 2.5,       // Creepy predator maniac (96px sprite)
  creature_toxic_lurker: 2.0,      // Fern creature predator (120px sprite)
  creature_spore_carrier: 1.5,     // 128px sprite - fungal creature
  creature_miasma_drifter: 1.5,    // 128px sprite - toxic drifter
  creature_marsh_lurker: 1.5,      // 128px sprite - marsh predator
  // Reused sprites inherit scale from their source
  creature_dart_runner: 3.5,       // reuses frost-stalker
  creature_petrified_lurker: 2.5,  // reuses void-horror
  creature_kelp_grazer: 3.0,       // reuses neon-creature
  creature_tangle_stalker: 1.5,    // reuses marsh-lurker
  creature_current_rider: 3.5,     // reuses frost-stalker
  creature_echo_drifter: 1.5,      // reuses spore-carrier
  creature_phase_grazer: 3.0,      // reuses neon-creature
  creature_reality_scavenger: 1.5, // reuses void-crawler
  creature_magma_beast: 4.0,       // reuses crystal-hunter
  creature_ash_skimmer: 1.5,       // reuses coastal-scuttler
  creature_ice_burrower: 2.5,      // reuses crystal-crawler
  creature_null_feeder: 3.0,       // reuses neon-creature
  creature_dimensional_hunter: 2.5,// reuses void-horror
  creature_rift_hunter: 1.5,       // reuses marsh-lurker
  creature_pressure_feeder: 2.0,   // reuses toxic-lurker
  creature_trench_hunter: 2.5,     // reuses void-horror
  creature_abyssal_scavenger: 1.5, // reuses void-crawler
  creature_starfall_grazer: 3.0,   // reuses neon-creature
  creature_crater_stalker: 1.5,    // reuses marsh-lurker
  creature_guardian_construct: 2.5, // reuses crystal-crawler
  creature_ruin_seeker: 3.5,       // reuses frost-stalker
  creature_relic_beast: 4.0,       // reuses crystal-hunter
  creature_void_grazer: 1.5,       // reuses marsh-lurker
  creature_anomaly_scavenger: 1.5, // reuses void-crawler
  creature_void_stalker: 2.5,      // reuses void-horror
  creature_dimensional_aberration: 2.0, // reuses toxic-lurker
  creature_abyssal_leviathan: 2.0, // reuses toxic-lurker
};

// Shadow size overrides for animated creatures { width, height }
export const ANIMATED_CREATURE_SHADOW: Record<string, { width: number; height: number }> = {
  creature_void_crawler: { width: 80, height: 40 },
  creature_coastal_scuttler: { width: 70, height: 35 },
  creature_crystal_hunter: { width: 90, height: 45 },
  creature_frost_stalker: { width: 80, height: 40 },
  creature_canopy_grazer: { width: 90, height: 45 },
  creature_tide_crab: { width: 80, height: 40 },
  creature_coastal_urchin: { width: 70, height: 35 },
  creature_reef_scavenger: { width: 80, height: 40 },
  creature_crystal_crawler: { width: 100, height: 50 },
  creature_void_horror: { width: 100, height: 50 },
  creature_toxic_lurker: { width: 110, height: 55 },
  creature_spore_carrier: { width: 80, height: 40 },
  creature_miasma_drifter: { width: 80, height: 40 },
  creature_marsh_lurker: { width: 90, height: 45 },
  creature_dart_runner: { width: 80, height: 40 },
  creature_petrified_lurker: { width: 100, height: 50 },
  creature_kelp_grazer: { width: 90, height: 45 },
  creature_tangle_stalker: { width: 90, height: 45 },
  creature_current_rider: { width: 80, height: 40 },
  creature_echo_drifter: { width: 80, height: 40 },
  creature_phase_grazer: { width: 90, height: 45 },
  creature_reality_scavenger: { width: 80, height: 40 },
  creature_magma_beast: { width: 100, height: 50 },
  creature_ash_skimmer: { width: 70, height: 35 },
  creature_ice_burrower: { width: 100, height: 50 },
  creature_null_feeder: { width: 90, height: 45 },
  creature_dimensional_hunter: { width: 100, height: 50 },
  creature_rift_hunter: { width: 90, height: 45 },
  creature_pressure_feeder: { width: 110, height: 55 },
  creature_trench_hunter: { width: 100, height: 50 },
  creature_abyssal_scavenger: { width: 80, height: 40 },
  creature_starfall_grazer: { width: 90, height: 45 },
  creature_crater_stalker: { width: 90, height: 45 },
  creature_guardian_construct: { width: 100, height: 50 },
  creature_ruin_seeker: { width: 80, height: 40 },
  creature_relic_beast: { width: 100, height: 50 },
  creature_void_grazer: { width: 90, height: 45 },
  creature_anomaly_scavenger: { width: 80, height: 40 },
  creature_void_stalker: { width: 100, height: 50 },
  creature_dimensional_aberration: { width: 110, height: 55 },
  creature_abyssal_leviathan: { width: 110, height: 55 },
};

// Y offset overrides for animated creatures (0 = feet at shadow level)
export const ANIMATED_CREATURE_Y_OFFSET: Record<string, number> = {
  creature_void_crawler: 0,
  creature_coastal_scuttler: 0,
  creature_crystal_hunter: 0,
  creature_frost_stalker: 0,
  creature_canopy_grazer: 0,
  creature_tide_crab: 0,
  creature_coastal_urchin: 0,
  creature_reef_scavenger: 0,
  creature_crystal_crawler: 0,
  creature_void_horror: 0,
  creature_toxic_lurker: 0,
  creature_spore_carrier: 0,
  creature_miasma_drifter: 0,
  creature_marsh_lurker: 0,
  creature_dart_runner: 0,
  creature_petrified_lurker: 0,
  creature_kelp_grazer: 0,
  creature_tangle_stalker: 0,
  creature_current_rider: 0,
  creature_echo_drifter: 0,
  creature_phase_grazer: 0,
  creature_reality_scavenger: 0,
  creature_magma_beast: 0,
  creature_ash_skimmer: 0,
  creature_ice_burrower: 0,
  creature_null_feeder: 0,
  creature_dimensional_hunter: 0,
  creature_rift_hunter: 0,
  creature_pressure_feeder: 0,
  creature_trench_hunter: 0,
  creature_abyssal_scavenger: 0,
  creature_starfall_grazer: 0,
  creature_crater_stalker: 0,
  creature_guardian_construct: 0,
  creature_ruin_seeker: 0,
  creature_relic_beast: 0,
  creature_void_grazer: 0,
  creature_anomaly_scavenger: 0,
  creature_void_stalker: 0,
  creature_dimensional_aberration: 0,
  creature_abyssal_leviathan: 0,
};

// Scale overrides for specific plants (speciesId -> scale multiplier)
export const PLANT_SCALE_OVERRIDE: Record<string, number> = {
  plant_void_tree: 3.0,  // Large tree - towering over players (256px spritesheet frame)
  plant_tendril_tree: 3.0,  // Large fungal tree (256px sprite)
};

// Scale multipliers for rare/epic resource nodes
export const RARITY_SCALE_MULTIPLIER: Record<string, number> = {
  common: 1.0,
  rare: 1.4,    // 40% larger
  epic: 1.7,    // 70% larger
};

// NPC sprite scale (48px sprites scaled to match player character)
// Player uses 6x width, 4.5x height for isometric squash
export const NPC_SPRITE_SCALE_X = 6;
export const NPC_SPRITE_SCALE_Y = 4.5;

// Creatures with sprite sheets (idle + walk animations)
export const ANIMATED_CREATURES = new Set([
  'creature_void_crawler',
  'creature_coastal_scuttler',
  'creature_crystal_hunter',
  'creature_frost_stalker',
  'creature_canopy_grazer',
  'creature_tide_crab',
  'creature_coastal_urchin',
  'creature_reef_scavenger',
  'creature_crystal_crawler',
  'creature_void_horror',
  'creature_toxic_lurker',
  'creature_spore_carrier',
  'creature_miasma_drifter',
  'creature_marsh_lurker',
  'creature_dart_runner',
  'creature_petrified_lurker',
  'creature_kelp_grazer',
  'creature_tangle_stalker',
  'creature_current_rider',
  'creature_echo_drifter',
  'creature_phase_grazer',
  'creature_reality_scavenger',
  'creature_magma_beast',
  'creature_ash_skimmer',
  'creature_ice_burrower',
  'creature_null_feeder',
  'creature_dimensional_hunter',
  'creature_rift_hunter',
  'creature_pressure_feeder',
  'creature_trench_hunter',
  'creature_abyssal_scavenger',
  'creature_starfall_grazer',
  'creature_crater_stalker',
  'creature_guardian_construct',
  'creature_ruin_seeker',
  'creature_relic_beast',
  'creature_void_grazer',
  'creature_anomaly_scavenger',
  'creature_void_stalker',
  'creature_dimensional_aberration',
  'creature_abyssal_leviathan',
]);

// Features with sprite variants: entityId -> number of variants
// Used for plants, minerals, and artifacts
export const FEATURE_SPRITE_VARIANTS: Record<string, number> = {
  // Plants - void plains (from void-biome-features spritesheet)
  plant_void_tree: 1,
  plant_void_fern: 1,
  plant_drought_cactus: 1,
  // Plants - other biomes
  plant_tendril_tree: 1,
  plant_rare_fungi: 4,
  plant_magma_bloom: 4,
  // Minerals - void plains (from void-biome-features spritesheet)
  mineral_void_crystal: 1,
  mineral_void_slate: 1,
  // Plants - crystal caves (from crystal-biome-features spritesheet)
  plant_lattice_moss: 1,
  plant_crystal_lichen: 1,
  plant_prism_bloom: 1,
  // Minerals - crystal caves (from crystal-biome-features spritesheet)
  mineral_cave_geode: 1,
  mineral_prismatic_crystal: 1,
  // Plants - toxic wastes (from acid-biome-features spritesheet)
  plant_acid_fern: 1,
  plant_acid_bloom: 1,
  plant_chemical_bloom: 1,
  // Minerals - toxic wastes (from acid-biome-features spritesheet)
  mineral_corrosive_deposit: 1,
  mineral_acid_stone: 1,
};

/**
 * Simple hash function for entity ID to get deterministic variant selection.
 */
export function hashEntityId(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash) + id.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash);
}
