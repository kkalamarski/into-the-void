import { BiomeType, FertilityType, ZONE_SIZE } from '@into-the-void/shared-types';
import { SimplexNoise } from '../noise/simplex';

/**
 * Biome generation parameters
 */
interface BiomeParams {
  temperatureScale: number;
  moistureScale: number;
  elevationScale: number;
  minBiomeChunks: number; // Minimum biome region size in chunks
  chunkSize: number; // Tiles per chunk (ZONE_SIZE)
}

const DEFAULT_BIOME_PARAMS: BiomeParams = {
  temperatureScale: 0.002,
  moistureScale: 0.003,
  elevationScale: 0.0012,
  minBiomeChunks: 10, // Minimum 10 chunks per biome region (half previous size)
  chunkSize: ZONE_SIZE,
};

/**
 * Biome generator using multiple noise layers
 */
export class BiomeGenerator {
  private temperatureNoise: SimplexNoise;
  private moistureNoise: SimplexNoise;
  private elevationNoise: SimplexNoise;
  private fertilityNoise: SimplexNoise;
  private params: BiomeParams;
  private readonly FERTILITY_SCALE = 0.0012;

  constructor(worldSeed: string, params: Partial<BiomeParams> = {}) {
    this.temperatureNoise = new SimplexNoise(`${worldSeed}_temp`);
    this.moistureNoise = new SimplexNoise(`${worldSeed}_moisture`);
    this.elevationNoise = new SimplexNoise(`${worldSeed}_elevation`);
    this.fertilityNoise = new SimplexNoise(`${worldSeed}_fertility`);
    this.params = { ...DEFAULT_BIOME_PARAMS, ...params };
  }

  /**
   * Get temperature value at position (0-1)
   */
  getTemperature(worldX: number, worldY: number): number {
    const raw = this.temperatureNoise.fbm(
      worldX * this.params.temperatureScale,
      worldY * this.params.temperatureScale,
      4
    );
    return (raw + 1) / 2; // Normalize to 0-1
  }

  /**
   * Get moisture value at position (0-1)
   */
  getMoisture(worldX: number, worldY: number): number {
    const raw = this.moistureNoise.fbm(
      worldX * this.params.moistureScale,
      worldY * this.params.moistureScale,
      4
    );
    return (raw + 1) / 2;
  }

  /**
   * Get elevation value at position (0-1)
   */
  getElevation(worldX: number, worldY: number): number {
    const raw = this.elevationNoise.fbm(
      worldX * this.params.elevationScale,
      worldY * this.params.elevationScale,
      6
    );
    return (raw + 1) / 2;
  }

  /**
   * Get domain warp offset for organic biome boundaries.
   * Uses noise to offset coordinates before region lookup.
   */
  private getWarpOffset(worldX: number, worldY: number): { x: number; y: number } {
    const warpScale = 0.003; // Controls boundary wiggle frequency
    const regionSize = this.params.minBiomeChunks * this.params.chunkSize;
    const warpStrength = regionSize * 0.4; // 40% of region size for organic edges

    // Use different noise octaves for x and y warp
    const warpX = this.temperatureNoise.fbm(worldX * warpScale, worldY * warpScale, 2) * warpStrength;
    const warpY = this.moistureNoise.fbm(worldX * warpScale + 500, worldY * warpScale + 500, 2) * warpStrength;

    return { x: warpX, y: warpY };
  }

  /**
   * Snap world coordinates to biome region center.
   * Guarantees minimum biome size by sampling at region centers only.
   */
  private getRegionCenter(worldX: number, worldY: number): { x: number; y: number } {
    const regionSize = this.params.minBiomeChunks * this.params.chunkSize;
    const regionX = Math.floor(worldX / regionSize);
    const regionY = Math.floor(worldY / regionSize);
    return {
      x: regionX * regionSize + regionSize / 2,
      y: regionY * regionSize + regionSize / 2,
    };
  }

  /**
   * Determine biome at a world position.
   * Uses domain warping for organic boundaries while maintaining minimum region sizes.
   */
  getBiome(worldX: number, worldY: number): BiomeType {
    // Apply domain warping for organic boundaries
    const warp = this.getWarpOffset(worldX, worldY);
    const warpedX = worldX + warp.x;
    const warpedY = worldY + warp.y;

    // Snap warped coordinates to region center
    const center = this.getRegionCenter(warpedX, warpedY);
    const temp = this.getTemperature(center.x, center.y);
    const moisture = this.getMoisture(center.x, center.y);
    const elevation = this.getElevation(center.x, center.y);

    // Aquatic biomes - very low elevation with high moisture
    if (elevation < 0.15) {
      if (moisture > 0.8) {
        return 'deep_trenches';  // Tier III - lowest elevation, highest moisture
      }
      if (moisture > 0.5) {
        return 'kelp_forests';   // Tier II - low elevation, moderate-high moisture
      }
      if (moisture > 0.3) {
        return 'tidal_pools';    // Tier I - low elevation, moderate moisture
      }
      // Low elevation but low moisture = starfall_crater (existing)
    }

    // High elevation = special biomes
    if (elevation > 0.8) {
      if (temp < 0.3) return 'frozen_expanse';
      if (temp > 0.7) return 'volcanic_ridge';
      return 'ancient_ruins';
    }

    // Low elevation with special conditions
    if (elevation < 0.2) {
      if (moisture > 0.7) return 'fungal_forest';
      return 'starfall_crater';
    }

    // Middle elevations - based on temp/moisture
    if (temp < 0.3) {
      return 'frozen_expanse';
    }

    if (temp > 0.7) {
      if (moisture < 0.3) return 'volcanic_ridge';
      return 'toxic_wastes';
    }

    // Mid-elevation with high moisture and moderate temp = marshes
    if (moisture > 0.7 && temp > 0.3 && temp < 0.6 && elevation > 0.3 && elevation < 0.6) {
      return 'miasma_marshes';
    }

    // Low moisture + moderate elevation + moderate temp = petrified
    if (moisture < 0.4 && elevation > 0.4 && elevation < 0.7 && temp > 0.4 && temp < 0.7) {
      return 'petrified_expanse';
    }

    // Temperate zones
    if (moisture > 0.6) {
      return 'crystal_caves';
    }

    if (moisture < 0.3) {
      return 'toxic_wastes';
    }

    // Default
    return 'void_plains';
  }

  /**
   * Get biome for a chunk (uses center point)
   */
  getChunkBiome(chunkX: number, chunkY: number, chunkSize: number): BiomeType {
    const centerX = chunkX * chunkSize + chunkSize / 2;
    const centerY = chunkY * chunkSize + chunkSize / 2;
    return this.getBiome(centerX, centerY);
  }

  /**
   * Get fertility type at world coordinates.
   * Uses a 4th SimplexNoise layer seeded with '_fertility' suffix for
   * deterministic, seed-reproducible results independent of other noise layers.
   * Returns Barren (<0.33), Normal (0.33-0.66), or Lush (>0.66).
   */
  getFertilityAt(worldX: number, worldY: number): FertilityType {
    const raw = this.fertilityNoise.fbm(
      worldX * this.FERTILITY_SCALE,
      worldY * this.FERTILITY_SCALE,
      3 // 3 octaves for variation without tiny patches
    );
    const normalized = (raw + 1) / 2; // Map [-1, 1] to [0, 1]
    if (normalized < 0.33) return 'Barren';
    if (normalized < 0.66) return 'Normal';
    return 'Lush';
  }
}

/**
 * Get biome danger level
 */
export function getBiomeDangerLevel(biome: BiomeType): number {
  const dangerLevels: Record<BiomeType, number> = {
    void_plains: 1,
    crystal_caves: 4,
    toxic_wastes: 6,
    ancient_ruins: 5,
    frozen_expanse: 5,
    volcanic_ridge: 7,
    fungal_forest: 3,
    starfall_crater: 8,
    miasma_marshes: 4,      // Tier II hazardous
    petrified_expanse: 4,   // Tier II hazardous
    tidal_pools: 2,         // Tier I - safe
    kelp_forests: 4,        // Tier II - moderate
    deep_trenches: 7,       // Tier III - dangerous
  };
  return dangerLevels[biome];
}

/**
 * Get biome color for minimap
 */
export function getBiomeColor(biome: BiomeType): number {
  const colors: Record<BiomeType, number> = {
    void_plains: 0x4a4a5a,
    crystal_caves: 0x7b68ee,
    toxic_wastes: 0x9acd32,
    ancient_ruins: 0x8b7355,
    frozen_expanse: 0xb0e0e6,
    volcanic_ridge: 0xff4500,
    fungal_forest: 0x9370db,
    starfall_crater: 0x191970,
    miasma_marshes: 0x6b8e23,
    petrified_expanse: 0xa9a9a9,
    tidal_pools: 0x5f9ea0,        // Cadet blue
    kelp_forests: 0x228b22,       // Forest green
    deep_trenches: 0x191970,      // Midnight blue
  };
  return colors[biome];
}
