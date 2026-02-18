import { BiomeType, SpawnPoint, ZONE_SIZE } from '@into-the-void/shared-types';
import { ENTITY_IDS } from '@into-the-void/entities';
import { SeededRandom } from '../random/seeded-random';

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
    ],
    minerals: [
      { id: ENTITY_IDS.MINERAL_ANOMALY_CRYSTAL, weight: 5, rarity: 3 },
    ],
    creatureDensity: 2,
    mineralDensity: 2,
  },
  frozen_expanse: {
    creatures: [
      { id: ENTITY_IDS.CREATURE_FROST_STALKER, weight: 5, minLevel: 10, maxLevel: 25 },
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
  biome: BiomeType,
  collisionMap: boolean[][]
): SpawnPoint[] {
  const random = new SeededRandom(`${worldSeed}_spawns_${chunkX}_${chunkY}`);
  const config = BIOME_SPAWN_CONFIGS[biome];
  const spawnPoints: SpawnPoint[] = [];

  // Generate creature spawns
  const creatureCount = Math.round(
    config.creatureDensity * (0.5 + random.next())
  );
  for (let i = 0; i < creatureCount; i++) {
    const creature = weightedPick(random, config.creatures);
    const position = findValidSpawnPosition(random, collisionMap);
    if (position && creature) {
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
  const mineralCount = Math.round(config.mineralDensity * (0.5 + random.next()));
  for (let i = 0; i < mineralCount; i++) {
    const mineral = weightedPick(random, config.minerals);
    const position = findValidSpawnPosition(random, collisionMap);
    if (position && mineral) {
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
