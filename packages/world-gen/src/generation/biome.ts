import { BiomeType, ZONE_SIZE } from '@into-the-void/shared-types';
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
  temperatureScale: 0.001,
  moistureScale: 0.0015,
  elevationScale: 0.0006,
  minBiomeChunks: 20, // Minimum 20 chunks per biome region
  chunkSize: ZONE_SIZE,
};

/**
 * Biome generator using multiple noise layers
 */
export class BiomeGenerator {
  private temperatureNoise: SimplexNoise;
  private moistureNoise: SimplexNoise;
  private elevationNoise: SimplexNoise;
  private params: BiomeParams;

  constructor(worldSeed: string, params: Partial<BiomeParams> = {}) {
    this.temperatureNoise = new SimplexNoise(`${worldSeed}_temp`);
    this.moistureNoise = new SimplexNoise(`${worldSeed}_moisture`);
    this.elevationNoise = new SimplexNoise(`${worldSeed}_elevation`);
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
  };
  return colors[biome];
}
