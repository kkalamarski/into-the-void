import { ChunkData, BiomeType, ZONE_SIZE } from '@into-the-void/shared-types';
import { BiomeGenerator } from './biome';
import { generateTerrain } from './terrain';
import { generateSpawnPoints } from './spawn';
import { generateStructures } from './structures';
import { generatePOIs } from './pois';
import { generateShoreTransitions } from './shore';
import { generateKelpCorridors } from './kelp-corridors';
import { createZoneId } from '@into-the-void/game-logic';

/**
 * World generator that creates chunks deterministically
 */
export class WorldGenerator {
  private worldSeed: string;
  private biomeGenerator: BiomeGenerator;

  constructor(worldSeed: string) {
    this.worldSeed = worldSeed;
    this.biomeGenerator = new BiomeGenerator(worldSeed);
  }

  /**
   * Generate a complete chunk (zone)
   */
  generateChunk(chunkX: number, chunkY: number): ChunkData {
    const zoneId = createZoneId(chunkX, chunkY);

    // Determine dominant biome for this chunk (used for structures)
    const biome = this.biomeGenerator.getChunkBiome(chunkX, chunkY, ZONE_SIZE);

    // Generate terrain (uses BiomeGenerator for per-tile biome sampling)
    const { tiles, heights, collisions, liquidTiles } = generateTerrain(
      this.worldSeed,
      chunkX,
      chunkY,
      this.biomeGenerator
    );

    // Post-process: Generate shore transitions at water/land boundaries
    generateShoreTransitions(tiles, collisions);

    // Post-process: Carve navigable corridors in kelp forests
    generateKelpCorridors(this.worldSeed, chunkX, chunkY, tiles, collisions);

    // Generate structure features (modifies tiles and collisions in place)
    // Uses dominant biome for consistency
    const structures = generateStructures(
      this.worldSeed,
      chunkX,
      chunkY,
      biome,
      tiles,
      heights,
      collisions
    );

    // Generate spawn points (uses updated collision map)
    // Biome is derived from chunk center inside generateSpawnPoints via biomeGenerator
    const spawnPoints = generateSpawnPoints(
      this.worldSeed,
      chunkX,
      chunkY,
      this.biomeGenerator,
      collisions
    );

    // Generate POIs (uses updated collision map)
    const pois = generatePOIs(
      this.worldSeed,
      chunkX,
      chunkY,
      biome,
      collisions
    );

    return {
      zoneId,
      tiles,
      heights,
      structures, // Now populated instead of empty []
      collisions,
      liquidTiles,
      spawnPoints,
      pois,
    };
  }

  /**
   * Get biome at chunk coordinates
   */
  getChunkBiome(chunkX: number, chunkY: number): BiomeType {
    return this.biomeGenerator.getChunkBiome(chunkX, chunkY, ZONE_SIZE);
  }

  /**
   * Get biome at world coordinates
   */
  getBiomeAt(worldX: number, worldY: number): BiomeType {
    return this.biomeGenerator.getBiome(worldX, worldY);
  }

  /**
   * Get terrain values at position
   */
  getTerrainValues(worldX: number, worldY: number): {
    temperature: number;
    moisture: number;
    elevation: number;
  } {
    return {
      temperature: this.biomeGenerator.getTemperature(worldX, worldY),
      moisture: this.biomeGenerator.getMoisture(worldX, worldY),
      elevation: this.biomeGenerator.getElevation(worldX, worldY),
    };
  }

  /**
   * Get the world seed
   */
  getSeed(): string {
    return this.worldSeed;
  }
}

/**
 * Create a world generator instance
 */
export function createWorldGenerator(worldSeed: string): WorldGenerator {
  return new WorldGenerator(worldSeed);
}

/**
 * Generate a single chunk without persisting generator state
 */
export function generateChunk(
  worldSeed: string,
  chunkX: number,
  chunkY: number
): ChunkData {
  const generator = new WorldGenerator(worldSeed);
  return generator.generateChunk(chunkX, chunkY);
}

/**
 * Get biome at chunk without generating full chunk
 */
export function getBiome(
  worldSeed: string,
  chunkX: number,
  chunkY: number
): BiomeType {
  const biomeGenerator = new BiomeGenerator(worldSeed);
  return biomeGenerator.getChunkBiome(chunkX, chunkY, ZONE_SIZE);
}
