import { BiomeType, ZONE_SIZE } from '@into-the-void/shared-types';
import { SimplexNoise } from '../noise/simplex';
import { SeededRandom } from '../random/seeded-random';

/**
 * Tile types for terrain
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
 * Generate terrain data for a chunk
 */
export function generateTerrain(
  worldSeed: string,
  chunkX: number,
  chunkY: number,
  biome: BiomeType
): { tiles: number[][]; collisions: boolean[][] } {
  const noise = new SimplexNoise(`${worldSeed}_terrain_${chunkX}_${chunkY}`);
  const random = new SeededRandom(`${worldSeed}_terrain_${chunkX}_${chunkY}`);

  const tiles: number[][] = [];
  const collisions: boolean[][] = [];
  const biomeTiles = BIOME_TILES[biome];

  // Base threshold for walls/obstacles
  const wallThreshold = getWallThreshold(biome);

  for (let y = 0; y < ZONE_SIZE; y++) {
    tiles[y] = [];
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

      if (isWall) {
        tiles[y][x] = biomeTiles.wall;
        collisions[y][x] = true;
      } else if (hasFeature) {
        tiles[y][x] = biomeTiles.feature;
        collisions[y][x] = isFeatureBlocking(biome);
      } else {
        tiles[y][x] = biomeTiles.floor;
        collisions[y][x] = false;
      }
    }
  }

  // Ensure edges have some openings for zone transitions
  ensureZoneConnectivity(tiles, collisions, biomeTiles.floor);

  return { tiles, collisions };
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
  collisions: boolean[][],
  floorTile: TileId
): void {
  const size = ZONE_SIZE;
  const pathWidth = 3;
  const pathPositions = [
    Math.floor(size * 0.25),
    Math.floor(size * 0.5),
    Math.floor(size * 0.75),
  ];

  // Clear paths on edges
  for (const pos of pathPositions) {
    for (let i = 0; i < pathWidth; i++) {
      // Top edge
      tiles[0][pos + i] = floorTile;
      collisions[0][pos + i] = false;

      // Bottom edge
      tiles[size - 1][pos + i] = floorTile;
      collisions[size - 1][pos + i] = false;

      // Left edge
      tiles[pos + i][0] = floorTile;
      collisions[pos + i][0] = false;

      // Right edge
      tiles[pos + i][size - 1] = floorTile;
      collisions[pos + i][size - 1] = false;
    }
  }
}

/**
 * Check if a tile is walkable
 */
export function isWalkable(tileId: TileId): boolean {
  const nonWalkable = [
    TileId.VOID_WALL,
    TileId.CRYSTAL_FORMATION,
    TileId.RUINS_WALL,
    TileId.ICE_WALL,
    TileId.LAVA,
    TileId.CRATER_DEBRIS,
  ];
  return !nonWalkable.includes(tileId);
}

/**
 * Get tile movement speed modifier
 */
export function getTileSpeedModifier(tileId: TileId): number {
  const modifiers: Partial<Record<TileId, number>> = {
    [TileId.TOXIC_POOL]: 0.5, // Slow in toxic
    [TileId.ICE_FLOOR]: 1.2, // Fast on ice
    [TileId.FUNGAL_FLOOR]: 0.8, // Slightly slow in fungal
  };
  return modifiers[tileId] ?? 1.0;
}
