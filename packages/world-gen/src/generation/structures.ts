import { BiomeType, TileStructure, ZONE_SIZE } from '@into-the-void/shared-types';
import { TILE_IDS } from '@into-the-void/tiles';
import { SimplexNoise } from '../noise/simplex';

// Constants for wall generation
const WALL_NOISE_THRESHOLD = 0.6;     // Higher = fewer walls
const WALL_NOISE_FREQUENCY = 0.02;    // Lower = larger wall clusters
const WALL_SAMPLE_SPACING = 8;        // Sample every Nth tile for anchor points
const WALL_CONNECT_RANGE = 12;        // Max distance to connect anchors

/**
 * Per-type wall height configuration (STRUCT-01 requirement).
 * Different wall types have different heights above terrain base.
 * Heights chosen for visual/gameplay variety per biome.
 */
const WALL_HEIGHTS: Record<string, number> = {
  [TILE_IDS.VOID_WALL]: 3,           // Standard void walls
  [TILE_IDS.CRYSTAL_FORMATION]: 5,   // Crystals grow tall
  [TILE_IDS.TOXIC_POOL]: 2,          // Low toxic barriers
  [TILE_IDS.RUINS_WALL]: 4,          // Ancient ruins crumbling but tall
  [TILE_IDS.ICE_WALL]: 4,            // Frozen formations
  [TILE_IDS.LAVA]: 2,                // Low lava flows
  [TILE_IDS.FUNGAL_GROWTH]: 3,       // Medium fungal structures
  [TILE_IDS.CRATER_DEBRIS]: 3,       // Scattered debris
};

// Default height if tile ID not found in config
const DEFAULT_WALL_HEIGHT = 3;

/**
 * Get wall height for a specific wall tile type.
 * Returns the configured height above terrain base for this wall type.
 */
function getWallHeight(wallTileId: string): number {
  return WALL_HEIGHTS[wallTileId] ?? DEFAULT_WALL_HEIGHT;
}

/**
 * Generate structure walls procedurally for a chunk.
 * Uses noise to place anchor points, connects nearby anchors with line segments.
 * Updates collisions array in-place to block wall positions.
 */
export function generateStructures(
  worldSeed: string,
  chunkX: number,
  chunkY: number,
  biome: BiomeType,
  heights: number[][],
  collisions: boolean[][]
): TileStructure[] {
  const structures: TileStructure[] = [];
  const noise = new SimplexNoise(`${worldSeed}_structures_${chunkX}_${chunkY}`);

  // Find candidate anchor positions for wall segments
  const wallAnchors: Array<{ x: number; y: number }> = [];

  // Sample grid at spacing intervals (avoid edges for zone connectivity)
  for (let y = WALL_SAMPLE_SPACING; y < ZONE_SIZE - WALL_SAMPLE_SPACING; y += WALL_SAMPLE_SPACING) {
    for (let x = WALL_SAMPLE_SPACING; x < ZONE_SIZE - WALL_SAMPLE_SPACING; x += WALL_SAMPLE_SPACING) {
      // Skip if already blocked by terrain
      if (collisions[y][x]) continue;

      const worldX = chunkX * ZONE_SIZE + x;
      const worldY = chunkY * ZONE_SIZE + y;
      const noiseValue = noise.noise2D(worldX * WALL_NOISE_FREQUENCY, worldY * WALL_NOISE_FREQUENCY);

      if (noiseValue > WALL_NOISE_THRESHOLD) {
        wallAnchors.push({ x, y });
      }
    }
  }

  // Connect nearby anchors into wall segments
  const connected = new Set<string>();

  for (const start of wallAnchors) {
    const startKey = `${start.x},${start.y}`;
    if (connected.has(startKey)) continue;

    // Find nearest unconnected anchor within range
    let nearest: { x: number; y: number; distance: number } | null = null;
    for (const end of wallAnchors) {
      const endKey = `${end.x},${end.y}`;
      if (start === end || connected.has(endKey)) continue;

      const distance = Math.abs(end.x - start.x) + Math.abs(end.y - start.y);
      if (distance <= WALL_CONNECT_RANGE && (!nearest || distance < nearest.distance)) {
        nearest = { x: end.x, y: end.y, distance };
      }
    }

    if (nearest) {
      const wallSegment = createWallSegment(
        start,
        { x: nearest.x, y: nearest.y },
        heights,
        collisions,
        biome
      );

      if (wallSegment.tiles.length > 0) {
        structures.push(wallSegment);
        connected.add(startKey);
        connected.add(`${nearest.x},${nearest.y}`);

        // Update collision map with wall positions
        for (const tile of wallSegment.tiles) {
          if (tile.y >= 0 && tile.y < ZONE_SIZE && tile.x >= 0 && tile.x < ZONE_SIZE) {
            collisions[tile.y][tile.x] = true;
          }
        }
      }
    }
  }

  return structures;
}

/**
 * Create a wall segment between two points using Bresenham's line algorithm.
 * Wall height varies by tile type (per STRUCT-01).
 */
function createWallSegment(
  start: { x: number; y: number },
  end: { x: number; y: number },
  heights: number[][],
  collisions: boolean[][],
  biome: BiomeType
): TileStructure {
  const wallTileId = getWallTileIdForBiome(biome);
  const wallHeightAboveBase = getWallHeight(wallTileId); // Per-type height
  const tiles: TileStructure['tiles'] = [];

  // Bresenham's line algorithm
  const dx = Math.abs(end.x - start.x);
  const dy = Math.abs(end.y - start.y);
  const sx = start.x < end.x ? 1 : -1;
  const sy = start.y < end.y ? 1 : -1;
  let err = dx - dy;
  let x = start.x;
  let y = start.y;

  while (true) {
    // Skip if tile already blocked by terrain
    if (y >= 0 && y < ZONE_SIZE && x >= 0 && x < ZONE_SIZE && !collisions[y][x]) {
      const baseHeight = heights[y]?.[x] ?? 0;
      tiles.push({
        x,
        y,
        tileId: wallTileId,
        height: baseHeight + wallHeightAboveBase
      });
    }

    if (x === end.x && y === end.y) break;

    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x += sx;
    }
    if (e2 < dx) {
      err += dx;
      y += sy;
    }
  }

  return { type: 'wall', tiles };
}

/**
 * Get appropriate wall tile ID for biome.
 */
function getWallTileIdForBiome(biome: BiomeType): string {
  const wallTiles: Record<BiomeType, string> = {
    void_plains: TILE_IDS.VOID_WALL,
    crystal_caves: TILE_IDS.CRYSTAL_FORMATION,
    toxic_wastes: TILE_IDS.TOXIC_POOL,
    ancient_ruins: TILE_IDS.RUINS_WALL,
    frozen_expanse: TILE_IDS.ICE_WALL,
    volcanic_ridge: TILE_IDS.LAVA,
    fungal_forest: TILE_IDS.FUNGAL_GROWTH,
    starfall_crater: TILE_IDS.CRATER_DEBRIS
  };
  return wallTiles[biome];
}
