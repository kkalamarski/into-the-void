import { BiomeType, TileStructure, ZONE_SIZE } from '@into-the-void/shared-types';
import { TILE_IDS } from '@into-the-void/tiles';
import { SimplexNoise } from '../noise/simplex';

// Constants for blocking feature generation
const FEATURE_NOISE_FREQUENCY = 0.08;    // Higher = more variation
const FEATURE_THRESHOLD = 0.55;          // Higher = fewer features
const CLUSTER_CHANCE = 0.4;              // Chance a feature grows into a cluster
const MAX_CLUSTER_SIZE = 5;              // Max tiles in a cluster
const EDGE_BUFFER = 4;                   // Avoid zone edges for connectivity

/**
 * Per-type feature height configuration (STRUCT-01 requirement).
 * Different blocking features have different heights above terrain base.
 * Heights chosen for visual/gameplay variety per biome.
 */
const FEATURE_HEIGHTS: Record<string, number> = {
  [TILE_IDS.VOID_WALL]: 3,           // Void rock formations
  [TILE_IDS.CRYSTAL_FORMATION]: 5,   // Crystals grow tall
  [TILE_IDS.TOXIC_POOL]: 2,          // Low toxic barriers
  [TILE_IDS.RUINS_WALL]: 4,          // Ancient ruins crumbling but tall
  [TILE_IDS.ICE_WALL]: 4,            // Frozen formations
  [TILE_IDS.LAVA]: 2,                // Low lava flows
  [TILE_IDS.FUNGAL_GROWTH]: 3,       // Medium fungal structures
  [TILE_IDS.CRATER_DEBRIS]: 3,       // Scattered debris
};

// Default height if tile ID not found in config
const DEFAULT_FEATURE_HEIGHT = 3;

/**
 * Get feature height for a specific blocking tile type.
 * Returns the configured height above terrain base.
 */
function getFeatureHeight(featureTileId: string): number {
  return FEATURE_HEIGHTS[featureTileId] ?? DEFAULT_FEATURE_HEIGHT;
}

/**
 * Generate blocking terrain features procedurally for a chunk.
 * Creates single features or organic clusters (not linear walls).
 * Updates collisions array in-place to block feature positions.
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
  const noise = new SimplexNoise(`${worldSeed}_features_${chunkX}_${chunkY}`);
  const clusterNoise = new SimplexNoise(`${worldSeed}_clusters_${chunkX}_${chunkY}`);

  const featureTileId = getFeatureTileIdForBiome(biome);
  const featureHeight = getFeatureHeight(featureTileId);

  // Track which tiles have features to avoid overlap
  const placed = new Set<string>();

  // Scan zone for feature seed points
  for (let y = EDGE_BUFFER; y < ZONE_SIZE - EDGE_BUFFER; y++) {
    for (let x = EDGE_BUFFER; x < ZONE_SIZE - EDGE_BUFFER; x++) {
      // Skip if already blocked or has a feature
      if (collisions[y][x] || placed.has(`${x},${y}`)) continue;

      const worldX = chunkX * ZONE_SIZE + x;
      const worldY = chunkY * ZONE_SIZE + y;
      const noiseValue = noise.noise2D(worldX * FEATURE_NOISE_FREQUENCY, worldY * FEATURE_NOISE_FREQUENCY);

      if (noiseValue > FEATURE_THRESHOLD) {
        // Decide if single feature or cluster
        const clusterValue = clusterNoise.noise2D(worldX * 0.1, worldY * 0.1);
        const isCluster = clusterValue > (1 - CLUSTER_CHANCE * 2); // Map to probability

        const tiles: TileStructure['tiles'] = [];

        if (isCluster) {
          // Grow an organic cluster
          const clusterTiles = growCluster(x, y, heights, collisions, placed, clusterNoise, featureTileId, featureHeight);
          tiles.push(...clusterTiles);
        } else {
          // Single feature
          const baseHeight = heights[y]?.[x] ?? 0;
          tiles.push({
            x,
            y,
            tileId: featureTileId,
            height: baseHeight + featureHeight
          });
          placed.add(`${x},${y}`);
          collisions[y][x] = true;
        }

        if (tiles.length > 0) {
          structures.push({ type: 'feature', tiles });
        }
      }
    }
  }

  return structures;
}

/**
 * Grow an organic cluster from a seed point.
 * Uses noise-influenced flood fill for natural shapes.
 */
function growCluster(
  seedX: number,
  seedY: number,
  heights: number[][],
  collisions: boolean[][],
  placed: Set<string>,
  noise: SimplexNoise,
  featureTileId: string,
  featureHeight: number
): TileStructure['tiles'] {
  const tiles: TileStructure['tiles'] = [];
  const queue: Array<{ x: number; y: number }> = [{ x: seedX, y: seedY }];
  const visited = new Set<string>();

  // 4-directional neighbors for organic growth
  const directions = [
    { dx: 0, dy: -1 },
    { dx: 0, dy: 1 },
    { dx: -1, dy: 0 },
    { dx: 1, dy: 0 },
  ];

  while (queue.length > 0 && tiles.length < MAX_CLUSTER_SIZE) {
    const current = queue.shift()!;
    const key = `${current.x},${current.y}`;

    if (visited.has(key)) continue;
    visited.add(key);

    // Check bounds and availability
    if (current.x < EDGE_BUFFER || current.x >= ZONE_SIZE - EDGE_BUFFER) continue;
    if (current.y < EDGE_BUFFER || current.y >= ZONE_SIZE - EDGE_BUFFER) continue;
    if (collisions[current.y][current.x] || placed.has(key)) continue;

    // Add this tile to cluster
    const baseHeight = heights[current.y]?.[current.x] ?? 0;
    tiles.push({
      x: current.x,
      y: current.y,
      tileId: featureTileId,
      height: baseHeight + featureHeight
    });
    placed.add(key);
    collisions[current.y][current.x] = true;

    // Consider neighbors for expansion (noise-influenced)
    for (const dir of directions) {
      const nx = current.x + dir.dx;
      const ny = current.y + dir.dy;
      const nkey = `${nx},${ny}`;

      if (visited.has(nkey) || placed.has(nkey)) continue;

      // Use noise to decide if we grow in this direction (organic shape)
      const growthNoise = noise.noise2D(nx * 0.2, ny * 0.2);
      if (growthNoise > -0.2) { // ~60% chance to grow in any direction
        queue.push({ x: nx, y: ny });
      }
    }
  }

  return tiles;
}

/**
 * Get appropriate blocking feature tile ID for biome.
 */
function getFeatureTileIdForBiome(biome: BiomeType): string {
  const featureTiles: Record<BiomeType, string> = {
    void_plains: TILE_IDS.VOID_WALL,
    crystal_caves: TILE_IDS.CRYSTAL_FORMATION,
    toxic_wastes: TILE_IDS.TOXIC_POOL,
    ancient_ruins: TILE_IDS.RUINS_WALL,
    frozen_expanse: TILE_IDS.ICE_WALL,
    volcanic_ridge: TILE_IDS.LAVA,
    fungal_forest: TILE_IDS.FUNGAL_GROWTH,
    starfall_crater: TILE_IDS.CRATER_DEBRIS
  };
  return featureTiles[biome];
}
