import { BiomeType } from '@into-the-void/shared-types';
import { SimplexNoise } from '../noise/simplex';

/**
 * Biome generation parameters
 */
interface BiomeParams {
  temperatureScale: number;
  moistureScale: number;
  elevationScale: number;
}

const DEFAULT_BIOME_PARAMS: BiomeParams = {
  temperatureScale: 0.005,
  moistureScale: 0.007,
  elevationScale: 0.003,
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
   * Determine biome at a world position
   */
  getBiome(worldX: number, worldY: number): BiomeType {
    const temp = this.getTemperature(worldX, worldY);
    const moisture = this.getMoisture(worldX, worldY);
    const elevation = this.getElevation(worldX, worldY);

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
  };
  return colors[biome];
}
