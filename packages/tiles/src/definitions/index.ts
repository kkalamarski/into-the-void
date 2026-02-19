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
};
