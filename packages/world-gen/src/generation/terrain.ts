import { BiomeType, ZONE_SIZE } from '@into-the-void/shared-types';
import { TileRegistry, TILE_IDS } from '@into-the-void/tiles';
import { SimplexNoise } from '../noise/simplex';
import { SeededRandom } from '../random/seeded-random';

/**
 * Tile types for terrain
 * @deprecated Use TILE_IDS from @into-the-void/tiles instead
 */
export enum TileId {
  VOID_FLOOR = 0,
  VOID_WALL = 1,
  CRYSTAL_FLOOR = 2,
  CRYSTAL_FORMATION = 3,
  TOXIC_FLOOR = 4,
  TOXIC_POOL = 5,
  RUINS_FLOOR = 6,
  RUINS_WALL = 7,
  ICE_FLOOR = 8,
  ICE_WALL = 9,
  VOLCANIC_FLOOR = 10,
  LAVA = 11,
  FUNGAL_FLOOR = 12,
  FUNGAL_GROWTH = 13,
  CRATER_FLOOR = 14,
  CRATER_DEBRIS = 15,
}

/**
 * Convert numeric TileId to string tile ID
 * Used for migration from enum-based to string-based tile system
 */
export function tileIdToString(id: TileId): string {
  const mapping: Record<TileId, string> = {
    [TileId.VOID_FLOOR]: TILE_IDS.VOID_FLOOR,
    [TileId.VOID_WALL]: TILE_IDS.VOID_WALL,
    [TileId.CRYSTAL_FLOOR]: TILE_IDS.CRYSTAL_FLOOR,
    [TileId.CRYSTAL_FORMATION]: TILE_IDS.CRYSTAL_FORMATION,
    [TileId.TOXIC_FLOOR]: TILE_IDS.TOXIC_FLOOR,
    [TileId.TOXIC_POOL]: TILE_IDS.TOXIC_POOL,
    [TileId.RUINS_FLOOR]: TILE_IDS.RUINS_FLOOR,
    [TileId.RUINS_WALL]: TILE_IDS.RUINS_WALL,
    [TileId.ICE_FLOOR]: TILE_IDS.ICE_FLOOR,
    [TileId.ICE_WALL]: TILE_IDS.ICE_WALL,
    [TileId.VOLCANIC_FLOOR]: TILE_IDS.VOLCANIC_FLOOR,
    [TileId.LAVA]: TILE_IDS.LAVA,
    [TileId.FUNGAL_FLOOR]: TILE_IDS.FUNGAL_FLOOR,
    [TileId.FUNGAL_GROWTH]: TILE_IDS.FUNGAL_GROWTH,
    [TileId.CRATER_FLOOR]: TILE_IDS.CRATER_FLOOR,
    [TileId.CRATER_DEBRIS]: TILE_IDS.CRATER_DEBRIS,
  };
  return mapping[id] ?? TILE_IDS.VOID_FLOOR;
}

/**
 * Biome to tile mapping
 */
const BIOME_TILES: Record<BiomeType, { floor: TileId; wall: TileId; feature: TileId }> = {
  void_plains: { floor: TileId.VOID_FLOOR, wall: TileId.VOID_WALL, feature: TileId.VOID_WALL },
  crystal_caves: {
    floor: TileId.CRYSTAL_FLOOR,
    wall: TileId.CRYSTAL_FORMATION,
    feature: TileId.CRYSTAL_FORMATION,
  },
  toxic_wastes: { floor: TileId.TOXIC_FLOOR, wall: TileId.TOXIC_POOL, feature: TileId.TOXIC_POOL },
  ancient_ruins: { floor: TileId.RUINS_FLOOR, wall: TileId.RUINS_WALL, feature: TileId.RUINS_WALL },
  frozen_expanse: { floor: TileId.ICE_FLOOR, wall: TileId.ICE_WALL, feature: TileId.ICE_WALL },
  volcanic_ridge: { floor: TileId.VOLCANIC_FLOOR, wall: TileId.LAVA, feature: TileId.LAVA },
  fungal_forest: {
    floor: TileId.FUNGAL_FLOOR,
    wall: TileId.FUNGAL_GROWTH,
    feature: TileId.FUNGAL_GROWTH,
  },
  starfall_crater: {
    floor: TileId.CRATER_FLOOR,
    wall: TileId.CRATER_DEBRIS,
    feature: TileId.CRATER_DEBRIS,
  },
};

/**
 * Biome to tile mapping (string IDs)
 */
const BIOME_TILE_IDS: Record<BiomeType, { floor: string; wall: string; feature: string }> = {
  void_plains: { floor: TILE_IDS.VOID_FLOOR, wall: TILE_IDS.VOID_WALL, feature: TILE_IDS.VOID_WALL },
  crystal_caves: { floor: TILE_IDS.CRYSTAL_FLOOR, wall: TILE_IDS.CRYSTAL_FORMATION, feature: TILE_IDS.CRYSTAL_FORMATION },
  toxic_wastes: { floor: TILE_IDS.TOXIC_FLOOR, wall: TILE_IDS.TOXIC_POOL, feature: TILE_IDS.TOXIC_POOL },
  ancient_ruins: { floor: TILE_IDS.RUINS_FLOOR, wall: TILE_IDS.RUINS_WALL, feature: TILE_IDS.RUINS_WALL },
  frozen_expanse: { floor: TILE_IDS.ICE_FLOOR, wall: TILE_IDS.ICE_WALL, feature: TILE_IDS.ICE_WALL },
  volcanic_ridge: { floor: TILE_IDS.VOLCANIC_FLOOR, wall: TILE_IDS.LAVA, feature: TILE_IDS.LAVA },
  fungal_forest: { floor: TILE_IDS.FUNGAL_FLOOR, wall: TILE_IDS.FUNGAL_GROWTH, feature: TILE_IDS.FUNGAL_GROWTH },
  starfall_crater: { floor: TILE_IDS.CRATER_FLOOR, wall: TILE_IDS.CRATER_DEBRIS, feature: TILE_IDS.CRATER_DEBRIS },
};

/**
 * Biome-specific elevation ranges
 * Heights are clamped to these ranges to maintain biome characteristics
 */
const BIOME_ELEVATION_RANGES: Record<BiomeType, { min: number; max: number }> = {
  starfall_crater: { min: 0, max: 2 }, // Flat impact zone
  ancient_ruins: { min: 0, max: 5 }, // Full range for multi-story structures
  volcanic_ridge: { min: 1, max: 4 }, // Elevated terrain, no deep valleys
  frozen_expanse: { min: 2, max: 5 }, // High-altitude ice sheets
  crystal_caves: { min: 0, max: 4 }, // Underground caverns with height variation
  toxic_wastes: { min: 0, max: 2 }, // Low-lying pools and waste
  fungal_forest: { min: 0, max: 3 }, // Organic growth canopy
  void_plains: { min: 0, max: 3 }, // Standard terrain variation
};

/**
 * Clamp height to biome-specific range
 */
function clampToBiomeRange(height: number, biome: BiomeType): number {
  const range = BIOME_ELEVATION_RANGES[biome];
  return Math.max(range.min, Math.min(range.max, height));
}

/**
 * Generate terrain data for a chunk
 */
export function generateTerrain(
  worldSeed: string,
  chunkX: number,
  chunkY: number,
  biome: BiomeType
): { tiles: number[][]; heights: number[][]; collisions: boolean[][] } {
  const noise = new SimplexNoise(`${worldSeed}_terrain_${chunkX}_${chunkY}`);
  // IMPORTANT: Height noise uses GLOBAL seed (not chunk-specific) for seamless elevation across chunks
  const heightNoise = new SimplexNoise(`${worldSeed}_height_global`);
  const random = new SeededRandom(`${worldSeed}_terrain_${chunkX}_${chunkY}`);

  const tiles: number[][] = [];
  const heights: number[][] = [];
  const collisions: boolean[][] = [];
  const biomeTileIds = BIOME_TILE_IDS[biome];
  const biomeTiles = BIOME_TILES[biome]; // Keep for numeric output

  // Base threshold for walls/obstacles
  const wallThreshold = getWallThreshold(biome);

  for (let y = 0; y < ZONE_SIZE; y++) {
    tiles[y] = [];
    heights[y] = [];
    collisions[y] = [];

    for (let x = 0; x < ZONE_SIZE; x++) {
      const worldX = chunkX * ZONE_SIZE + x;
      const worldY = chunkY * ZONE_SIZE + y;

      // Multi-octave noise for terrain
      const terrainValue = noise.fbm(worldX * 0.05, worldY * 0.05, 4);

      // Determine if this is a wall/obstacle
      const isWall = terrainValue > wallThreshold;

      // Add some random features
      const hasFeature = !isWall && random.nextBool(0.02);

      let tileId: string;
      if (isWall) {
        tiles[y][x] = biomeTiles.wall;
        tileId = biomeTileIds.wall;
      } else if (hasFeature) {
        tiles[y][x] = biomeTiles.feature;
        tileId = biomeTileIds.feature;
      } else {
        tiles[y][x] = biomeTiles.floor;
        tileId = biomeTileIds.floor;
      }

      // Get collision from registry instead of hardcoded function
      const tileDef = TileRegistry.get(tileId);
      collisions[y][x] = tileDef.isBlocking;

      // Add noise-based height variation using WORLD coordinates for seamless cross-chunk elevation
      // Use smoother noise with lower frequency for gradual elevation changes
      const heightValue = heightNoise.fbm(worldX * 0.03, worldY * 0.03, 2);
      // Map noise (-1 to 1) to height (0 to 3) for gentle terrain
      const rawHeight = Math.round((heightValue + 1) * 1.5);
      heights[y][x] = Math.max(0, Math.min(3, rawHeight));
    }
  }

  // Ensure edges have some openings for zone transitions
  ensureZoneConnectivity(tiles, heights, collisions, biomeTiles.floor, biomeTileIds.floor, biome);

  return { tiles, heights, collisions };
}

/**
 * Get wall density threshold for biome
 */
function getWallThreshold(biome: BiomeType): number {
  const thresholds: Record<BiomeType, number> = {
    void_plains: 0.6,
    crystal_caves: 0.4,
    toxic_wastes: 0.5,
    ancient_ruins: 0.45,
    frozen_expanse: 0.55,
    volcanic_ridge: 0.5,
    fungal_forest: 0.35,
    starfall_crater: 0.5,
  };
  return thresholds[biome];
}

/**
 * Check if biome features block movement
 */
function isFeatureBlocking(biome: BiomeType): boolean {
  const blocking: Record<BiomeType, boolean> = {
    void_plains: false,
    crystal_caves: true,
    toxic_wastes: false, // Toxic pools damage but don't block
    ancient_ruins: true,
    frozen_expanse: false,
    volcanic_ridge: true, // Lava blocks
    fungal_forest: false,
    starfall_crater: true,
  };
  return blocking[biome];
}

/**
 * Ensure zone edges have pathways for transitions
 */
function ensureZoneConnectivity(
  tiles: number[][],
  heights: number[][],
  collisions: boolean[][],
  floorTile: TileId,
  floorTileId: string,
  biome: BiomeType
): void {
  const size = ZONE_SIZE;
  const pathWidth = 3;
  const pathPositions = [
    Math.floor(size * 0.25),
    Math.floor(size * 0.5),
    Math.floor(size * 0.75),
  ];

  // Use height 1 for paths (middle ground that connects well across biomes)
  const pathHeight = 1;

  // Clear paths on edges
  for (const pos of pathPositions) {
    for (let i = 0; i < pathWidth; i++) {
      // Top edge
      tiles[0][pos + i] = floorTile;
      heights[0][pos + i] = pathHeight;
      collisions[0][pos + i] = false;

      // Bottom edge
      tiles[size - 1][pos + i] = floorTile;
      heights[size - 1][pos + i] = pathHeight;
      collisions[size - 1][pos + i] = false;

      // Left edge
      tiles[pos + i][0] = floorTile;
      heights[pos + i][0] = pathHeight;
      collisions[pos + i][0] = false;

      // Right edge
      tiles[pos + i][size - 1] = floorTile;
      heights[pos + i][size - 1] = pathHeight;
      collisions[pos + i][size - 1] = false;
    }
  }
}

/**
 * Check if a tile is walkable
 * @deprecated Use TileRegistry.get(tileId).isBlocking instead
 */
export function isWalkable(tileId: TileId): boolean {
  const stringId = tileIdToString(tileId);
  const tileDef = TileRegistry.get(stringId);
  return !tileDef.isBlocking;
}

/**
 * Get tile movement speed modifier
 * @deprecated Use TileRegistry.get(tileId).movementSpeed instead
 */
export function getTileSpeedModifier(tileId: TileId): number {
  const stringId = tileIdToString(tileId);
  const tileDef = TileRegistry.get(stringId);
  return tileDef.movementSpeed;
}
