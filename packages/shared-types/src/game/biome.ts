/**
 * Biome types in the game world
 */
export type BiomeType =
  | 'void_plains'
  | 'crystal_caves'
  | 'toxic_wastes'
  | 'ancient_ruins'
  | 'frozen_expanse'
  | 'volcanic_ridge'
  | 'fungal_forest'
  | 'starfall_crater'
  | 'miasma_marshes'     // Tier II - toxic swamp biome
  | 'petrified_expanse'  // Tier II - stone forest biome
  | 'tidal_pools'        // Tier I - shallow coastal biome
  | 'kelp_forests'       // Tier II - dense underwater vegetation
  | 'deep_trenches'      // Tier III - high-pressure deep ocean
  | 'void_rift'          // Tier IV - reality distortion biome
  | 'crystalline_wastes' // Tier III - high-elevation crystal formations
  | 'bioluminescent_depths' // Tier II - glowing flora caverns
  // Hub Station Biomes
  | 'canopy_station'         // Verdant Dynamics hub — bioluminescent green/blue
  | 'ironhold_station'       // Helix Extraction hub — industrial gray/rust/orange
  | 'meridian_station'       // Nexus Frontiers hub — corporate silver/white/blue
  | 'salvage_station';       // Unaffiliated hub — patchwork/mixed

/**
 * Biome data
 */
export interface Biome {
  /** Biome type identifier */
  type: BiomeType;
  /** Display name */
  name: string;
  /** Description */
  description: string;
  /** Primary tile set */
  tileSet: string;
  /** Base danger level (1-10) */
  dangerLevel: number;
  /** Resource multipliers */
  resources: BiomeResources;
  /** Environmental hazards */
  hazards: BiomeHazard[];
}

/**
 * Resource availability in a biome
 */
export interface BiomeResources {
  /** Mineral spawn rate modifier */
  minerals: number;
  /** Creature spawn rate modifier */
  creatures: number;
  /** Rare resource chance modifier */
  rareChance: number;
}

/**
 * Environmental hazard
 */
export interface BiomeHazard {
  /** Hazard type */
  type: 'radiation' | 'toxic' | 'cold' | 'heat' | 'void_storm' | 'pressure';
  /** Damage per tick */
  damage: number;
  /** Hazard frequency (0-1) */
  frequency: number;
}

/**
 * Tile type for terrain
 */
export interface TileType {
  /** Tile ID */
  id: number;
  /** Tile name */
  name: string;
  /** Whether tile blocks movement */
  blocking: boolean;
  /** Movement speed modifier */
  speedModifier: number;
  /** Whether tile is harvestable */
  harvestable: boolean;
}

/**
 * Human-readable biome names for HUD display
 */
export const BIOME_DISPLAY_NAMES: Record<BiomeType, string> = {
  void_plains: 'Void Plains',
  crystal_caves: 'Crystal Caves',
  toxic_wastes: 'Toxic Wastes',
  ancient_ruins: 'Ancient Ruins',
  frozen_expanse: 'Frozen Expanse',
  volcanic_ridge: 'Volcanic Ridge',
  fungal_forest: 'Fungal Forest',
  starfall_crater: 'Starfall Crater',
  miasma_marshes: 'Miasma Marshes',
  petrified_expanse: 'Petrified Expanse',
  tidal_pools: 'Tidal Pools',
  kelp_forests: 'Kelp Forests',
  deep_trenches: 'Deep Trenches',
  void_rift: 'Void Rift',
  crystalline_wastes: 'Crystalline Wastes',
  bioluminescent_depths: 'Bioluminescent Depths',
  // Hub Station Biomes
  canopy_station: 'Canopy Station',
  ironhold_station: 'Ironhold Station',
  meridian_station: 'Meridian Station',
  salvage_station: 'Salvage Station',
};

/**
 * Biome colors for UI elements (minimap, indicators)
 */
export const BIOME_COLORS: Record<BiomeType, string> = {
  void_plains: '#4a4a5a',
  crystal_caves: '#7b68ee',
  toxic_wastes: '#9acd32',
  ancient_ruins: '#8b7355',
  frozen_expanse: '#b0e0e6',
  volcanic_ridge: '#ff4500',
  fungal_forest: '#9370db',
  starfall_crater: '#191970',
  miasma_marshes: '#6b8e23',      // Olive drab (toxic swamp)
  petrified_expanse: '#a9a9a9',   // Dark gray (stone forest)
  tidal_pools: '#5f9ea0',         // Cadet blue (shallow coastal)
  kelp_forests: '#228b22',        // Forest green (dense vegetation)
  deep_trenches: '#191970',       // Midnight blue (deep ocean)
  void_rift: '#4a0080',           // Deep purple (void/anomaly theme)
  crystalline_wastes: '#b0e0e6',  // Pale cyan (crystal reflections)
  bioluminescent_depths: '#00ff88', // Bright cyan-green (bioluminescence)
  // Hub Station Biomes
  canopy_station: '#22cc88',       // Bioluminescent green
  ironhold_station: '#aa5522',     // Rust/industrial orange
  meridian_station: '#c0d0e0',     // Corporate silver-blue
  salvage_station: '#8a7a5a',      // Patchwork tan/mixed
};

/** Biome survival tiers from lore (I-IV) */
export type BiomeTier = 1 | 2 | 3 | 4;

/**
 * Biome tier classification per world-bible.md
 * Tier I (Frontier): Standard gear, starting zones
 * Tier II (Hazardous): Specialized equipment
 * Tier III (Hostile): Advanced gear, survival training
 * Tier IV (Extreme): Elite equipment, corporate authorization
 */
export const BIOME_TIERS: Record<BiomeType, BiomeTier> = {
  // Tier I - Frontier
  void_plains: 1,
  fungal_forest: 1,      // Luminous Canopy equivalent
  tidal_pools: 1,        // Coastal Shallows equivalent
  ancient_ruins: 1,      // Scarred Badlands equivalent

  // Tier II - Hazardous
  toxic_wastes: 2,       // Miasma Marshes equivalent
  miasma_marshes: 2,
  petrified_expanse: 2,
  bioluminescent_depths: 2,
  kelp_forests: 2,

  // Tier III - Hostile
  volcanic_ridge: 3,
  crystal_caves: 3,      // Crystalline Wastes equivalent
  crystalline_wastes: 3,
  frozen_expanse: 3,
  deep_trenches: 3,
  starfall_crater: 3,    // Fungal Depths equivalent

  // Tier IV - Extreme
  void_rift: 4,          // Anomaly Zones

  // Hub Station Biomes (safe zones)
  canopy_station: 1,
  ironhold_station: 1,
  meridian_station: 1,
  salvage_station: 1,
};

/**
 * Level requirements to access each tier
 * Tier I: No requirement (starting zones)
 * Tier II: Level 10
 * Tier III: Level 25
 * Tier IV: Level 40
 */
export const TIER_LEVEL_REQUIREMENTS: Record<BiomeTier, number> = {
  1: 1,   // No restriction
  2: 10,
  3: 25,
  4: 40,
};
