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
 * Generate terrain data for a chunk
 */
export function generateTerrain(
  worldSeed: string,
  chunkX: number,
  chunkY: number,
  biome: BiomeType
): { tiles: number[][]; heights: number[][]; collisions: boolean[][] } {
  const noise = new SimplexNoise(`${worldSeed}_terrain_${chunkX}_${chunkY}`);
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

      // Set height from tile's default elevation
      // Phase 14 will add noise-based height variation
      heights[y][x] = tileDef.defaultElevation;
    }
  }

  // Ensure edges have some openings for zone transitions
  ensureZoneConnectivity(tiles, heights, collisions, biomeTiles.floor, biomeTileIds.floor);

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
  floorTileId: string
): void {
  const size = ZONE_SIZE;
  const pathWidth = 3;
  const pathPositions = [
    Math.floor(size * 0.25),
    Math.floor(size * 0.5),
    Math.floor(size * 0.75),
  ];

  const floorDef = TileRegistry.get(floorTileId);

  // Clear paths on edges
  for (const pos of pathPositions) {
    for (let i = 0; i < pathWidth; i++) {
      // Top edge
      tiles[0][pos + i] = floorTile;
      heights[0][pos + i] = floorDef.defaultElevation;
      collisions[0][pos + i] = false;

      // Bottom edge
      tiles[size - 1][pos + i] = floorTile;
      heights[size - 1][pos + i] = floorDef.defaultElevation;
      collisions[size - 1][pos + i] = false;

      // Left edge
      tiles[pos + i][0] = floorTile;
      heights[pos + i][0] = floorDef.defaultElevation;
      collisions[pos + i][0] = false;

      // Right edge
      tiles[pos + i][size - 1] = floorTile;
      heights[pos + i][size - 1] = floorDef.defaultElevation;
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
