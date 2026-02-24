import { BiomeType, TileStructure, ZONE_SIZE } from '@into-the-void/shared-types';
import { TileRegistry, TILE_IDS } from '@into-the-void/tiles';
import { SimplexNoise } from '../noise/simplex';
import { SeededRandom } from '../random/seeded-random';
import { TileId } from './terrain';

// Constants for blocking feature generation
const FEATURE_SAMPLE_SPACING = 6;        // Check every Nth tile for features
const FEATURE_NOISE_FREQUENCY = 0.05;    // Noise frequency for placement
const FEATURE_THRESHOLD = 0.5;           // Higher = fewer features
const EDGE_BUFFER = 4;                   // Avoid zone edges for connectivity

/**
 * Mapping from biome to numeric TileId for features.
 * Used to update tiles[][] array for visual rendering.
 */
const BIOME_FEATURE_TILE_IDS: Record<BiomeType, TileId> = {
  void_plains: TileId.VOID_WALL,
  crystal_caves: TileId.CRYSTAL_FORMATION,
  toxic_wastes: TileId.TOXIC_POOL,
  ancient_ruins: TileId.RUINS_WALL,
  frozen_expanse: TileId.ICE_WALL,
  volcanic_ridge: TileId.LAVA,
  fungal_forest: TileId.FUNGAL_GROWTH,
  starfall_crater: TileId.CRATER_DEBRIS,
  miasma_marshes: TileId.TOXIC_POOL,
  petrified_expanse: TileId.VOID_WALL,
  tidal_pools: TileId.TIDAL_SHALLOW,
  kelp_forests: TileId.KELP_WALL,
  deep_trenches: TileId.TRENCH_DEEP,
  void_rift: TileId.VOID_RIFT_DISTORTION,
  crystalline_wastes: TileId.CRYSTAL_FORMATION_LARGE,
  bioluminescent_depths: TileId.BIOLUMINESCENT_FLORA,
};

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

/** Portal placement constants */
const PORTAL_MIN = 20;   // Min x/y position (avoid edges and walls)
const PORTAL_MAX = 44;   // Max x/y position (stay in center region)
const PORTAL_NUMERIC_ID = 16; // TileId.PORTAL — matches terrain.ts enum

function getFeatureHeight(featureTileId: string): number {
  return FEATURE_HEIGHTS[featureTileId] ?? DEFAULT_FEATURE_HEIGHT;
}

/**
 * Place exactly 1 portal in the chunk at a deterministic center-region position.
 * Portals are walkable (collision=false) and appear only on open (non-blocked) tiles.
 * Uses a dedicated seed so portal position is independent of other feature noise.
 */
function placePortals(
  worldSeed: string,
  chunkX: number,
  chunkY: number,
  tiles: number[][],
  heights: number[][],
  collisions: boolean[][],
  structures: TileStructure[]
): void {
  const random = new SeededRandom(`${worldSeed}_portals_${chunkX}_${chunkY}`);

  // Try up to 20 positions to find a non-blocked tile in the center region
  for (let attempt = 0; attempt < 20; attempt++) {
    const x = random.nextInt(PORTAL_MIN, PORTAL_MAX);
    const y = random.nextInt(PORTAL_MIN, PORTAL_MAX);

    // Skip if blocked by terrain or existing structure
    if (collisions[y][x]) continue;

    // Place portal tile
    tiles[y][x] = PORTAL_NUMERIC_ID;
    collisions[y][x] = false; // Portals are always walkable
    heights[y][x] = 0;        // Floor level

    structures.push({
      type: 'feature',
      tiles: [{
        x,
        y,
        tileId: TILE_IDS.PORTAL,
        height: 0,
      }]
    });

    // Successfully placed — 1 portal per chunk
    return;
  }
  // If all attempts are blocked (very dense zone), skip portal placement gracefully
}

/**
 * Generate blocking terrain features procedurally for a chunk.
 * Simple approach: sparse sampling, single tiles only.
 * Modifies tiles[][] for visual rendering and collisions[][] for movement.
 */
export function generateStructures(
  worldSeed: string,
  chunkX: number,
  chunkY: number,
  biome: BiomeType,
  tiles: number[][],
  heights: number[][],
  collisions: boolean[][]
): TileStructure[] {
  const structures: TileStructure[] = [];
  const noise = new SimplexNoise(`${worldSeed}_features_${chunkX}_${chunkY}`);

  const featureTileId = getFeatureTileIdForBiome(biome);
  const featureNumericId = BIOME_FEATURE_TILE_IDS[biome];
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
        // Place a feature tile
        const baseHeight = heights[y]?.[x] ?? 0;

        // Update tile for visual rendering
        tiles[y][x] = featureNumericId;

        // Set collision based on tile definition (respects design - e.g., toxic pools don't block)
        const tileDef = TileRegistry.get(featureTileId);
        collisions[y][x] = tileDef.isBlocking;

        // Create structure entry for metadata
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

  // Place portal structure (1 per chunk, deterministic)
  placePortals(worldSeed, chunkX, chunkY, tiles, heights, collisions, structures);

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
    starfall_crater: TILE_IDS.CRATER_DEBRIS,
    miasma_marshes: TILE_IDS.TOXIC_POOL,
    petrified_expanse: TILE_IDS.VOID_WALL,
    tidal_pools: TILE_IDS.TIDAL_SHALLOW,
    kelp_forests: TILE_IDS.KELP_WALL,
    deep_trenches: TILE_IDS.TRENCH_DEEP,
    void_rift: TILE_IDS.VOID_RIFT_DISTORTION,
    crystalline_wastes: TILE_IDS.CRYSTAL_FORMATION_LARGE,
    bioluminescent_depths: TILE_IDS.BIOLUMINESCENT_FLORA,
  };
  return featureTiles[biome];
}
