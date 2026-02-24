import { BiomeType, PoiSpawn, PoiType, ZONE_SIZE } from '@into-the-void/shared-types';
import { SeededRandom } from '../random/seeded-random';
import { SimplexNoise } from '../noise/simplex';

const POI_NOISE_FREQUENCY = 0.03; // Low frequency = clustered
const POI_DENSITY_THRESHOLD = 0.3; // Only 30% of chunks eligible

/**
 * Biome-specific POI type weights (lore-aligned)
 * Higher weights = more likely to spawn that POI type
 */
const BIOME_POI_WEIGHTS: Record<BiomeType, Record<PoiType, number>> = {
  ancient_ruins: { anomaly: 10, cache: 5, landmark: 8 },
  crystal_caves: { anomaly: 8, cache: 3, landmark: 6 },
  toxic_wastes: { anomaly: 6, cache: 8, landmark: 2 },
  void_plains: { anomaly: 5, cache: 5, landmark: 5 },
  fungal_forest: { anomaly: 4, cache: 6, landmark: 4 },
  starfall_crater: { anomaly: 10, cache: 4, landmark: 6 },
  miasma_marshes: { anomaly: 5, cache: 7, landmark: 3 },
  frozen_expanse: { anomaly: 7, cache: 4, landmark: 5 },
  volcanic_ridge: { anomaly: 6, cache: 5, landmark: 5 },
  petrified_expanse: { anomaly: 3, cache: 5, landmark: 8 },
  tidal_pools: { anomaly: 4, cache: 6, landmark: 5 },
  kelp_forests: { anomaly: 5, cache: 7, landmark: 4 },
  deep_trenches: { anomaly: 8, cache: 4, landmark: 6 },
  void_rift: { anomaly: 10, cache: 2, landmark: 3 },        // High anomaly (reality distortion)
  crystalline_wastes: { anomaly: 6, cache: 8, landmark: 7 }, // High cache/landmark (crystal formations)
  bioluminescent_depths: { anomaly: 5, cache: 6, landmark: 5 }, // Balanced
};

/**
 * Generate POIs for a chunk using procedural noise
 * @param worldSeed - World seed for deterministic generation
 * @param chunkX - Chunk X coordinate
 * @param chunkY - Chunk Y coordinate
 * @param biome - Biome type for this chunk
 * @param collisionMap - Collision map to avoid placing POIs on obstacles
 * @returns Array of POI spawns (0-2 POIs per eligible chunk)
 */
export function generatePOIs(
  worldSeed: string,
  chunkX: number,
  chunkY: number,
  biome: BiomeType,
  collisionMap: boolean[][]
): PoiSpawn[] {
  const random = new SeededRandom(`${worldSeed}_pois_${chunkX}_${chunkY}`);
  const noise = new SimplexNoise(`${worldSeed}_poi_density`);

  // Sample noise at chunk center
  const centerX = chunkX * ZONE_SIZE + ZONE_SIZE / 2;
  const centerY = chunkY * ZONE_SIZE + ZONE_SIZE / 2;
  const densityValue = noise.noise2D(centerX * POI_NOISE_FREQUENCY, centerY * POI_NOISE_FREQUENCY);

  // Normalize noise from [-1,1] to [0,1]
  const normalizedDensity = (densityValue + 1) / 2;

  // Only spawn POIs if noise exceeds threshold (sparse placement)
  if (normalizedDensity < POI_DENSITY_THRESHOLD) return [];

  // 0-2 POIs per eligible chunk based on density
  const poiCount = normalizedDensity > 0.7 ? 2 : 1;
  const pois: PoiSpawn[] = [];

  for (let i = 0; i < poiCount; i++) {
    const position = findValidPosition(random, collisionMap);
    if (!position) continue;

    const poiType = selectPoiTypeForBiome(biome, random);

    pois.push({
      x: position.x,
      y: position.y,
      type: poiType,
      poiId: `poi_${chunkX}_${chunkY}_${i}`,
      biome,
    });
  }

  return pois;
}

/**
 * Select POI type based on biome-specific weights
 * @param biome - Biome type
 * @param random - Seeded random generator
 * @returns Selected POI type
 */
export function selectPoiTypeForBiome(biome: BiomeType, random: SeededRandom): PoiType {
  const weights = BIOME_POI_WEIGHTS[biome] ?? { anomaly: 5, cache: 5, landmark: 5 };
  const totalWeight = weights.anomaly + weights.cache + weights.landmark;
  let roll = random.nextFloat(0, totalWeight);

  if (roll < weights.anomaly) return 'anomaly';
  roll -= weights.anomaly;
  if (roll < weights.cache) return 'cache';
  return 'landmark';
}

/**
 * Find a valid position for POI placement (avoids collisions)
 * @param random - Seeded random generator
 * @param collisionMap - Collision map
 * @param maxAttempts - Maximum placement attempts
 * @returns Valid position or null if failed
 */
function findValidPosition(
  random: SeededRandom,
  collisionMap: boolean[][],
  maxAttempts = 20
): { x: number; y: number } | null {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const x = random.nextInt(5, ZONE_SIZE - 6);
    const y = random.nextInt(5, ZONE_SIZE - 6);

    if (!collisionMap[y]?.[x]) {
      return { x, y };
    }
  }
  return null;
}
