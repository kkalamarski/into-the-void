import { TileDefinition } from '../types';

// Import all tile definitions
import { VOID_FLOOR, VOID_WALL } from './void-tiles';
import { CRYSTAL_FLOOR, CRYSTAL_FORMATION } from './crystal-tiles';
import { TOXIC_FLOOR, TOXIC_POOL } from './toxic-tiles';
import { RUINS_FLOOR, RUINS_WALL } from './ruins-tiles';
import { ICE_FLOOR, ICE_WALL } from './ice-tiles';
import { VOLCANIC_FLOOR, LAVA } from './volcanic-tiles';
import { FUNGAL_FLOOR, FUNGAL_GROWTH } from './fungal-tiles';
import { CRATER_FLOOR, CRATER_DEBRIS } from './crater-tiles';
import { PORTAL } from './portal-tile';
import {
  TIDAL_FLOOR,
  TIDAL_SHALLOW,
  KELP_FLOOR,
  KELP_WALL,
  TRENCH_FLOOR,
  TRENCH_DEEP,
  SHORE_TRANSITION,
} from './aquatic-tiles';
import {
  VOID_RIFT_FLOOR,
  VOID_RIFT_DISTORTION,
  CRYSTALLINE_FLOOR,
  CRYSTAL_FORMATION_LARGE,
  BIOLUMINESCENT_FLOOR,
  BIOLUMINESCENT_FLORA,
} from './exotic-tiles';
import {
  CANOPY_FLOOR, CANOPY_WALL, CANOPY_DOOR, CANOPY_CORRIDOR,
  CANOPY_DECORATION, CANOPY_ACCENT, CANOPY_WINDOW, CANOPY_HAZARD,
} from './hub-canopy-tiles';
import {
  IRONHOLD_FLOOR, IRONHOLD_WALL, IRONHOLD_DOOR, IRONHOLD_CORRIDOR,
  IRONHOLD_DECORATION, IRONHOLD_ACCENT, IRONHOLD_WINDOW, IRONHOLD_HAZARD,
} from './hub-ironhold-tiles';
import {
  MERIDIAN_FLOOR, MERIDIAN_WALL, MERIDIAN_DOOR, MERIDIAN_CORRIDOR,
  MERIDIAN_DECORATION, MERIDIAN_ACCENT, MERIDIAN_WINDOW, MERIDIAN_HAZARD,
} from './hub-meridian-tiles';
import {
  SALVAGE_FLOOR, SALVAGE_WALL, SALVAGE_DOOR, SALVAGE_CORRIDOR,
  SALVAGE_DECORATION, SALVAGE_ACCENT, SALVAGE_WINDOW, SALVAGE_HAZARD,
} from './hub-salvage-tiles';
import {
  VOID_ETHER, LUMINOUS_SAP, SEAWATER, ANCIENT_RUNOFF,
  SPORE_SLUDGE, MIASMA_BILE, MINERAL_SLURRY, DEEP_SEAWATER, LUMINOUS_NECTAR,
  MAGMA, RESONANT_FLUID, GLACIAL_MELT, IMPACT_BRINE, ABYSSAL_WATER, SILICON_SOLUTION,
  RIFT_PLASMA,
  ALL_LIQUID_TILES, BIOME_LIQUID_MAP,
} from './liquid-tiles';

/**
 * All tile definitions - register these with TileRegistry
 */
export const ALL_TILES: readonly TileDefinition[] = [
  // Void Plains
  VOID_FLOOR,
  VOID_WALL,
  // Crystal Caves
  CRYSTAL_FLOOR,
  CRYSTAL_FORMATION,
  // Toxic Wastes
  TOXIC_FLOOR,
  TOXIC_POOL,
  // Ancient Ruins
  RUINS_FLOOR,
  RUINS_WALL,
  // Frozen Expanse
  ICE_FLOOR,
  ICE_WALL,
  // Volcanic Ridge
  VOLCANIC_FLOOR,
  LAVA,
  // Fungal Forest
  FUNGAL_FLOOR,
  FUNGAL_GROWTH,
  // Starfall Crater
  CRATER_FLOOR,
  CRATER_DEBRIS,
  // Portal Structure
  PORTAL,
  // Aquatic Biomes
  TIDAL_FLOOR,
  TIDAL_SHALLOW,
  KELP_FLOOR,
  KELP_WALL,
  TRENCH_FLOOR,
  TRENCH_DEEP,
  SHORE_TRANSITION,
  // Exotic Biomes
  VOID_RIFT_FLOOR,
  VOID_RIFT_DISTORTION,
  CRYSTALLINE_FLOOR,
  CRYSTAL_FORMATION_LARGE,
  BIOLUMINESCENT_FLOOR,
  BIOLUMINESCENT_FLORA,
  // Hub Stations — Canopy (Verdant)
  CANOPY_FLOOR, CANOPY_WALL, CANOPY_DOOR, CANOPY_CORRIDOR,
  CANOPY_DECORATION, CANOPY_ACCENT, CANOPY_WINDOW, CANOPY_HAZARD,
  // Hub Stations — Ironhold (Helix)
  IRONHOLD_FLOOR, IRONHOLD_WALL, IRONHOLD_DOOR, IRONHOLD_CORRIDOR,
  IRONHOLD_DECORATION, IRONHOLD_ACCENT, IRONHOLD_WINDOW, IRONHOLD_HAZARD,
  // Hub Stations — Meridian (Nexus)
  MERIDIAN_FLOOR, MERIDIAN_WALL, MERIDIAN_DOOR, MERIDIAN_CORRIDOR,
  MERIDIAN_DECORATION, MERIDIAN_ACCENT, MERIDIAN_WINDOW, MERIDIAN_HAZARD,
  // Hub Stations — Salvage (Unaffiliated)
  SALVAGE_FLOOR, SALVAGE_WALL, SALVAGE_DOOR, SALVAGE_CORRIDOR,
  SALVAGE_DECORATION, SALVAGE_ACCENT, SALVAGE_WINDOW, SALVAGE_HAZARD,
  // Liquid Tiles (all biomes)
  ...ALL_LIQUID_TILES,
];

/**
 * String constants for tile IDs - use these instead of hardcoded strings
 */
export const TILE_IDS = {
  VOID_FLOOR: 'void_floor',
  VOID_WALL: 'void_wall',
  CRYSTAL_FLOOR: 'crystal_floor',
  CRYSTAL_FORMATION: 'crystal_formation',
  TOXIC_FLOOR: 'toxic_floor',
  TOXIC_POOL: 'toxic_pool',
  RUINS_FLOOR: 'ruins_floor',
  RUINS_WALL: 'ruins_wall',
  ICE_FLOOR: 'ice_floor',
  ICE_WALL: 'ice_wall',
  VOLCANIC_FLOOR: 'volcanic_floor',
  LAVA: 'lava',
  FUNGAL_FLOOR: 'fungal_floor',
  FUNGAL_GROWTH: 'fungal_growth',
  CRATER_FLOOR: 'crater_floor',
  CRATER_DEBRIS: 'crater_debris',
  PORTAL: 'portal',
  TIDAL_FLOOR: 'tidal_floor',
  TIDAL_SHALLOW: 'tidal_shallow',
  KELP_FLOOR: 'kelp_floor',
  KELP_WALL: 'kelp_wall',
  TRENCH_FLOOR: 'trench_floor',
  TRENCH_DEEP: 'trench_deep',
  SHORE_TRANSITION: 'shore_transition',
  VOID_RIFT_FLOOR: 'void_rift_floor',
  VOID_RIFT_DISTORTION: 'void_rift_distortion',
  CRYSTALLINE_FLOOR: 'crystalline_floor',
  CRYSTAL_FORMATION_LARGE: 'crystal_formation_large',
  BIOLUMINESCENT_FLOOR: 'bioluminescent_floor',
  BIOLUMINESCENT_FLORA: 'bioluminescent_flora',
  // Hub Stations — Canopy
  CANOPY_FLOOR: 'canopy_floor',
  CANOPY_WALL: 'canopy_wall',
  CANOPY_DOOR: 'canopy_door',
  CANOPY_CORRIDOR: 'canopy_corridor',
  CANOPY_DECORATION: 'canopy_decoration',
  CANOPY_ACCENT: 'canopy_accent',
  CANOPY_WINDOW: 'canopy_window',
  CANOPY_HAZARD: 'canopy_hazard',
  // Hub Stations — Ironhold
  IRONHOLD_FLOOR: 'ironhold_floor',
  IRONHOLD_WALL: 'ironhold_wall',
  IRONHOLD_DOOR: 'ironhold_door',
  IRONHOLD_CORRIDOR: 'ironhold_corridor',
  IRONHOLD_DECORATION: 'ironhold_decoration',
  IRONHOLD_ACCENT: 'ironhold_accent',
  IRONHOLD_WINDOW: 'ironhold_window',
  IRONHOLD_HAZARD: 'ironhold_hazard',
  // Hub Stations — Meridian
  MERIDIAN_FLOOR: 'meridian_floor',
  MERIDIAN_WALL: 'meridian_wall',
  MERIDIAN_DOOR: 'meridian_door',
  MERIDIAN_CORRIDOR: 'meridian_corridor',
  MERIDIAN_DECORATION: 'meridian_decoration',
  MERIDIAN_ACCENT: 'meridian_accent',
  MERIDIAN_WINDOW: 'meridian_window',
  MERIDIAN_HAZARD: 'meridian_hazard',
  // Hub Stations — Salvage
  SALVAGE_FLOOR: 'salvage_floor',
  SALVAGE_WALL: 'salvage_wall',
  SALVAGE_DOOR: 'salvage_door',
  SALVAGE_CORRIDOR: 'salvage_corridor',
  SALVAGE_DECORATION: 'salvage_decoration',
  SALVAGE_ACCENT: 'salvage_accent',
  SALVAGE_WINDOW: 'salvage_window',
  SALVAGE_HAZARD: 'salvage_hazard',
  // Liquid Tiles
  VOID_ETHER: 'void_ether',
  LUMINOUS_SAP: 'luminous_sap',
  SEAWATER: 'seawater',
  ANCIENT_RUNOFF: 'ancient_runoff',
  SPORE_SLUDGE: 'spore_sludge',
  MIASMA_BILE: 'miasma_bile',
  MINERAL_SLURRY: 'mineral_slurry',
  DEEP_SEAWATER: 'deep_seawater',
  LUMINOUS_NECTAR: 'luminous_nectar',
  MAGMA: 'magma',
  RESONANT_FLUID: 'resonant_fluid',
  GLACIAL_MELT: 'glacial_melt',
  IMPACT_BRINE: 'impact_brine',
  ABYSSAL_WATER: 'abyssal_water',
  SILICON_SOLUTION: 'silicon_solution',
  RIFT_PLASMA: 'rift_plasma',
} as const;

// Re-export individual tiles for direct imports
export {
  VOID_FLOOR,
  VOID_WALL,
  CRYSTAL_FLOOR,
  CRYSTAL_FORMATION,
  TOXIC_FLOOR,
  TOXIC_POOL,
  RUINS_FLOOR,
  RUINS_WALL,
  ICE_FLOOR,
  ICE_WALL,
  VOLCANIC_FLOOR,
  LAVA,
  FUNGAL_FLOOR,
  FUNGAL_GROWTH,
  CRATER_FLOOR,
  CRATER_DEBRIS,
  PORTAL,
  TIDAL_FLOOR,
  TIDAL_SHALLOW,
  KELP_FLOOR,
  KELP_WALL,
  TRENCH_FLOOR,
  TRENCH_DEEP,
  SHORE_TRANSITION,
  VOID_RIFT_FLOOR,
  VOID_RIFT_DISTORTION,
  CRYSTALLINE_FLOOR,
  CRYSTAL_FORMATION_LARGE,
  BIOLUMINESCENT_FLOOR,
  BIOLUMINESCENT_FLORA,
  // Hub Stations
  CANOPY_FLOOR, CANOPY_WALL, CANOPY_DOOR, CANOPY_CORRIDOR,
  CANOPY_DECORATION, CANOPY_ACCENT, CANOPY_WINDOW, CANOPY_HAZARD,
  IRONHOLD_FLOOR, IRONHOLD_WALL, IRONHOLD_DOOR, IRONHOLD_CORRIDOR,
  IRONHOLD_DECORATION, IRONHOLD_ACCENT, IRONHOLD_WINDOW, IRONHOLD_HAZARD,
  MERIDIAN_FLOOR, MERIDIAN_WALL, MERIDIAN_DOOR, MERIDIAN_CORRIDOR,
  MERIDIAN_DECORATION, MERIDIAN_ACCENT, MERIDIAN_WINDOW, MERIDIAN_HAZARD,
  SALVAGE_FLOOR, SALVAGE_WALL, SALVAGE_DOOR, SALVAGE_CORRIDOR,
  SALVAGE_DECORATION, SALVAGE_ACCENT, SALVAGE_WINDOW, SALVAGE_HAZARD,
  // Liquid Tiles
  VOID_ETHER, LUMINOUS_SAP, SEAWATER, ANCIENT_RUNOFF,
  SPORE_SLUDGE, MIASMA_BILE, MINERAL_SLURRY, DEEP_SEAWATER, LUMINOUS_NECTAR,
  MAGMA, RESONANT_FLUID, GLACIAL_MELT, IMPACT_BRINE, ABYSSAL_WATER, SILICON_SOLUTION,
  RIFT_PLASMA,
  ALL_LIQUID_TILES, BIOME_LIQUID_MAP,
};
