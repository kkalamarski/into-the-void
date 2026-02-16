import { BiomeType, TileStructure, ZONE_SIZE } from '@into-the-void/shared-types';
import { TILE_IDS } from '@into-the-void/tiles';
import { SimplexNoise } from '../noise/simplex';

// Constants for blocking feature generation
const FEATURE_SAMPLE_SPACING = 6;        // Check every Nth tile for features
const FEATURE_NOISE_FREQUENCY = 0.05;    // Noise frequency for placement
const FEATURE_THRESHOLD = 0.5;           // Higher = fewer features
const EDGE_BUFFER = 4;                   // Avoid zone edges for connectivity

/**
 * Per-type feature height configuration.
 * Different blocking features have different heights above terrain base.
 */
const FEATURE_HEIGHTS: Record<string, number> = {
  [TILE_IDS.VOID_WALL]: 3,
  [TILE_IDS.CRYSTAL_FORMATION]: 5,
  [TILE_IDS.TOXIC_POOL]: 2,
  [TILE_IDS.RUINS_WALL]: 4,
  [TILE_IDS.ICE_WALL]: 4,
  [TILE_IDS.LAVA]: 2,
  [TILE_IDS.FUNGAL_GROWTH]: 3,
  [TILE_IDS.CRATER_DEBRIS]: 3,
};

const DEFAULT_FEATURE_HEIGHT = 3;

function getFeatureHeight(featureTileId: string): number {
  return FEATURE_HEIGHTS[featureTileId] ?? DEFAULT_FEATURE_HEIGHT;
}

/**
 * Generate blocking terrain features procedurally for a chunk.
 * Simple approach: sparse sampling, single tiles only.
 * Collisions are set exactly where tiles are placed.
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

  const featureTileId = getFeatureTileIdForBiome(biome);
  const featureHeight = getFeatureHeight(featureTileId);

  // Sparse sampling - check every FEATURE_SAMPLE_SPACING tiles
  for (let y = EDGE_BUFFER; y < ZONE_SIZE - EDGE_BUFFER; y += FEATURE_SAMPLE_SPACING) {
    for (let x = EDGE_BUFFER; x < ZONE_SIZE - EDGE_BUFFER; x += FEATURE_SAMPLE_SPACING) {
      // Skip if already blocked by terrain
      if (collisions[y][x]) continue;

      const worldX = chunkX * ZONE_SIZE + x;
      const worldY = chunkY * ZONE_SIZE + y;
      const noiseValue = noise.noise2D(worldX * FEATURE_NOISE_FREQUENCY, worldY * FEATURE_NOISE_FREQUENCY);

      if (noiseValue > FEATURE_THRESHOLD) {
        // Place a single blocking feature
        const baseHeight = heights[y]?.[x] ?? 0;

        // Set collision FIRST
        collisions[y][x] = true;

        // Then create the structure tile
        structures.push({
          type: 'feature',
          tiles: [{
            x,
            y,
            tileId: featureTileId,
            height: baseHeight + featureHeight
          }]
        });
      }
    }
  }

  return structures;
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
