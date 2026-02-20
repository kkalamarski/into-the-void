import { BiomeType, FertilityType, SpawnPoint, ZONE_SIZE } from '@into-the-void/shared-types';
import { ENTITY_IDS } from '@into-the-void/entities';
import { SeededRandom } from '../random/seeded-random';
import { BiomeGenerator } from './biome';

const FERTILITY_MULTIPLIERS: Record<FertilityType, number> = {
  Barren: 0.5,
  Normal: 1.0,
  Lush: 1.5,
};

const SPAWN_CAPS = {
  creatures: 15,
  minerals: 10,
  plants: 5,
  artifacts: 2,
} as const;

/**
 * Spawn configuration per biome
 */
interface BiomeSpawnConfig {
  creatures: Array<{ id: string; weight: number; minLevel: number; maxLevel: number }>;
  minerals: Array<{ id: string; weight: number; rarity: number }>;
  creatureDensity: number; // Average creatures per chunk
  mineralDensity: number; // Average minerals per chunk
}

const BIOME_SPAWN_CONFIGS: Record<BiomeType, BiomeSpawnConfig> = {
  void_plains: {
    creatures: [
      { id: ENTITY_IDS.CREATURE_VOID_CRAWLER, weight: 10, minLevel: 1, maxLevel: 5 },
      { id: ENTITY_IDS.CREATURE_COASTAL_SCUTTLER, weight: 8, minLevel: 1, maxLevel: 4 },
    ],
    minerals: [
      { id: ENTITY_IDS.MINERAL_VOID_CRYSTAL, weight: 10, rarity: 1 },
    ],
    creatureDensity: 4,
    mineralDensity: 3,
  },
  crystal_caves: {
    creatures: [
      { id: ENTITY_IDS.CREATURE_CRYSTAL_HUNTER, weight: 8, minLevel: 5, maxLevel: 15 },
      { id: ENTITY_IDS.CREATURE_CRYSTAL_CRAWLER, weight: 6, minLevel: 5, maxLevel: 12 },
    ],
    minerals: [
      { id: ENTITY_IDS.MINERAL_PRISMATIC_CRYSTAL, weight: 8, rarity: 2 },
    ],
    creatureDensity: 3,
    mineralDensity: 8,
  },
  toxic_wastes: {
    creatures: [
      { id: ENTITY_IDS.CREATURE_TOXIC_LURKER, weight: 7, minLevel: 8, maxLevel: 20 },
    ],
    minerals: [
      { id: ENTITY_IDS.MINERAL_CORROSIVE_DEPOSIT, weight: 10, rarity: 1 },
    ],
    creatureDensity: 5,
    mineralDensity: 4,
  },
  ancient_ruins: {
    creatures: [
      { id: ENTITY_IDS.CREATURE_VOID_HORROR, weight: 3, minLevel: 10, maxLevel: 25 },
      { id: ENTITY_IDS.CREATURE_RUIN_SEEKER, weight: 4, minLevel: 18, maxLevel: 30 },
    ],
    minerals: [
      { id: ENTITY_IDS.MINERAL_ANOMALY_CRYSTAL, weight: 5, rarity: 3 },
    ],
    creatureDensity: 2,
    mineralDensity: 2,
  },
  frozen_expanse: {
    creatures: [
      { id: ENTITY_IDS.CREATURE_FROST_STALKER, weight: 5, minLevel: 10, maxLevel: 22 },
      { id: ENTITY_IDS.CREATURE_ICE_BURROWER, weight: 4, minLevel: 12, maxLevel: 24 },
    ],
    minerals: [
      { id: ENTITY_IDS.MINERAL_PERMAFROST_SHARD, weight: 6, rarity: 2 },
    ],
    creatureDensity: 3,
    mineralDensity: 4,
  },
  volcanic_ridge: {
    creatures: [
      { id: ENTITY_IDS.CREATURE_MAGMA_BEAST, weight: 4, minLevel: 12, maxLevel: 28 },
      { id: ENTITY_IDS.CREATURE_ASH_SKIMMER, weight: 6, minLevel: 10, maxLevel: 20 },
    ],
    minerals: [
      { id: ENTITY_IDS.MINERAL_VOLCANIC_ORE, weight: 8, rarity: 2 },
    ],
    creatureDensity: 4,
    mineralDensity: 5,
  },
  fungal_forest: {
    creatures: [
      { id: ENTITY_IDS.CREATURE_SPORE_CARRIER, weight: 8, minLevel: 4, maxLevel: 12 },
      { id: ENTITY_IDS.CREATURE_CANOPY_GRAZER, weight: 5, minLevel: 1, maxLevel: 6 },
    ],
    minerals: [
      { id: ENTITY_IDS.MINERAL_MYCELIAL_CLUSTER, weight: 10, rarity: 1 },
    ],
    creatureDensity: 6,
    mineralDensity: 7,
  },
  starfall_crater: {
    creatures: [
      { id: ENTITY_IDS.CREATURE_VOID_HORROR, weight: 2, minLevel: 20, maxLevel: 35 },
    ],
    minerals: [
      { id: ENTITY_IDS.MINERAL_COSMIC_FRAGMENT, weight: 4, rarity: 4 },
    ],
    creatureDensity: 2,
    mineralDensity: 3,
  },
  miasma_marshes: {
    creatures: [
      { id: ENTITY_IDS.CREATURE_MARSH_LURKER, weight: 7, minLevel: 5, maxLevel: 15 },
      { id: ENTITY_IDS.CREATURE_MIASMA_DRIFTER, weight: 6, minLevel: 3, maxLevel: 10 },
    ],
    minerals: [
      { id: ENTITY_IDS.MINERAL_CHEMICAL_SUMP, weight: 8, rarity: 2 },
    ],
    creatureDensity: 5,
    mineralDensity: 4,
  },
  petrified_expanse: {
    creatures: [
      { id: ENTITY_IDS.CREATURE_DART_RUNNER, weight: 8, minLevel: 6, maxLevel: 16 },
      { id: ENTITY_IDS.CREATURE_PETRIFIED_LURKER, weight: 5, minLevel: 8, maxLevel: 18 },
    ],
    minerals: [
      { id: ENTITY_IDS.MINERAL_MINERALIZED_LOG, weight: 6, rarity: 2 },
    ],
    creatureDensity: 3,
    mineralDensity: 6,
  },
};

/**
 * Generate spawn points for a chunk
 */
export function generateSpawnPoints(
  worldSeed: string,
  chunkX: number,
  chunkY: number,
  biomeGenerator: BiomeGenerator,
  collisionMap: boolean[][]
): SpawnPoint[] {
  const random = new SeededRandom(`${worldSeed}_spawns_${chunkX}_${chunkY}`);
  const biome = biomeGenerator.getChunkBiome(chunkX, chunkY, ZONE_SIZE);
  const config = BIOME_SPAWN_CONFIGS[biome];
  const spawnPoints: SpawnPoint[] = [];

  // Sample fertility at chunk center (density is chunk-level decision)
  const centerX = chunkX * ZONE_SIZE + ZONE_SIZE / 2;
  const centerY = chunkY * ZONE_SIZE + ZONE_SIZE / 2;
  const fertilityType = biomeGenerator.getFertilityAt(centerX, centerY);
  const multiplier = FERTILITY_MULTIPLIERS[fertilityType];

  // Generate creature spawns
  const rawCreatureCount = Math.round(config.creatureDensity * multiplier * (0.5 + random.next()));
  const creatureCount = Math.min(rawCreatureCount, SPAWN_CAPS.creatures);
  for (let i = 0; i < creatureCount; i++) {
    const position = findValidSpawnPosition(random, collisionMap);
    if (!position) continue;

    // Per-tile biome sampling for spawn table (SPWN-03)
    const worldX = chunkX * ZONE_SIZE + position.x;
    const worldY = chunkY * ZONE_SIZE + position.y;
    const tileBiome = biomeGenerator.getBiome(worldX, worldY);
    const tileConfig = BIOME_SPAWN_CONFIGS[tileBiome];

    const creature = weightedPick(random, tileConfig.creatures);
    if (creature) {
      spawnPoints.push({
        x: position.x,
        y: position.y,
        entityType: 'creature',
        spawnId: creature.id,
        respawnTime: 60 + random.nextInt(0, 60), // 60-120 seconds
      });
    }
  }

  // Generate mineral spawns
  const rawMineralCount = Math.round(config.mineralDensity * multiplier * (0.5 + random.next()));
  const mineralCount = Math.min(rawMineralCount, SPAWN_CAPS.minerals);
  for (let i = 0; i < mineralCount; i++) {
    const position = findValidSpawnPosition(random, collisionMap);
    if (!position) continue;

    // Per-tile biome sampling for spawn table (SPWN-03)
    const worldX = chunkX * ZONE_SIZE + position.x;
    const worldY = chunkY * ZONE_SIZE + position.y;
    const tileBiome = biomeGenerator.getBiome(worldX, worldY);
    const tileConfig = BIOME_SPAWN_CONFIGS[tileBiome];

    const mineral = weightedPick(random, tileConfig.minerals);
    if (mineral) {
      spawnPoints.push({
        x: position.x,
        y: position.y,
        entityType: 'mineral',
        spawnId: mineral.id,
        respawnTime: 120 + random.nextInt(0, 180), // 2-5 minutes
      });
    }
  }

  return spawnPoints;
}

/**
 * Pick item from weighted list
 */
function weightedPick<T extends { weight: number }>(
  random: SeededRandom,
  items: T[]
): T | null {
  if (items.length === 0) return null;

  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  let roll = random.nextFloat(0, totalWeight);

  for (const item of items) {
    roll -= item.weight;
    if (roll <= 0) return item;
  }

  return items[items.length - 1];
}

/**
 * Find a valid spawn position (not on collision)
 */
function findValidSpawnPosition(
  random: SeededRandom,
  collisionMap: boolean[][],
  maxAttempts = 20
): { x: number; y: number } | null {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const x = random.nextInt(2, ZONE_SIZE - 3);
    const y = random.nextInt(2, ZONE_SIZE - 3);

    if (!collisionMap[y]?.[x]) {
      return { x, y };
    }
  }
  return null;
}

/**
 * Get creatures that can spawn in a biome
 */
export function getBiomeCreatures(biome: BiomeType): string[] {
  return BIOME_SPAWN_CONFIGS[biome].creatures.map((c) => c.id);
}

/**
 * Get minerals that can spawn in a biome
 */
export function getBiomeMinerals(biome: BiomeType): string[] {
  return BIOME_SPAWN_CONFIGS[biome].minerals.map((m) => m.id);
}
