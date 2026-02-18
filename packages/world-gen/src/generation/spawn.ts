import { BiomeType, SpawnPoint, ZONE_SIZE } from '@into-the-void/shared-types';
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
      { id: 'void_crawler', weight: 10, minLevel: 1, maxLevel: 5 },
      { id: 'void_stalker', weight: 3, minLevel: 3, maxLevel: 8 },
    ],
    minerals: [
      { id: 'void_crystal', weight: 10, rarity: 1 },
      { id: 'dark_ore', weight: 5, rarity: 2 },
    ],
    creatureDensity: 4,
    mineralDensity: 3,
  },
  crystal_caves: {
    creatures: [
      { id: 'crystal_sentinel', weight: 5, minLevel: 5, maxLevel: 15 },
      { id: 'crystal_shard', weight: 8, minLevel: 3, maxLevel: 10 },
    ],
    minerals: [
      { id: 'prismatic_crystal', weight: 8, rarity: 2 },
      { id: 'resonant_gem', weight: 3, rarity: 4 },
    ],
    creatureDensity: 3,
    mineralDensity: 8,
  },
  toxic_wastes: {
    creatures: [
      { id: 'toxic_lurker', weight: 7, minLevel: 8, maxLevel: 20 },
      { id: 'acid_spitter', weight: 5, minLevel: 6, maxLevel: 15 },
    ],
    minerals: [
      { id: 'toxic_sludge', weight: 10, rarity: 1 },
      { id: 'corrosive_compound', weight: 4, rarity: 3 },
    ],
    creatureDensity: 5,
    mineralDensity: 4,
  },
  ancient_ruins: {
    creatures: [
      { id: 'ancient_guardian', weight: 3, minLevel: 10, maxLevel: 25 },
      { id: 'ruin_crawler', weight: 8, minLevel: 5, maxLevel: 15 },
    ],
    minerals: [
      { id: 'ancient_alloy', weight: 5, rarity: 3 },
      { id: 'relic_fragment', weight: 2, rarity: 5 },
    ],
    creatureDensity: 2,
    mineralDensity: 2,
  },
  frozen_expanse: {
    creatures: [
      { id: 'frost_elemental', weight: 5, minLevel: 10, maxLevel: 25 },
      { id: 'ice_wraith', weight: 6, minLevel: 8, maxLevel: 18 },
    ],
    minerals: [
      { id: 'frozen_core', weight: 6, rarity: 2 },
      { id: 'permafrost_crystal', weight: 4, rarity: 3 },
    ],
    creatureDensity: 3,
    mineralDensity: 4,
  },
  volcanic_ridge: {
    creatures: [
      { id: 'magma_beast', weight: 4, minLevel: 12, maxLevel: 28 },
      { id: 'ember_sprite', weight: 7, minLevel: 8, maxLevel: 20 },
    ],
    minerals: [
      { id: 'volcanic_glass', weight: 8, rarity: 2 },
      { id: 'molten_core', weight: 3, rarity: 4 },
    ],
    creatureDensity: 4,
    mineralDensity: 5,
  },
  fungal_forest: {
    creatures: [
      { id: 'spore_carrier', weight: 8, minLevel: 4, maxLevel: 12 },
      { id: 'fungal_giant', weight: 3, minLevel: 8, maxLevel: 18 },
    ],
    minerals: [
      { id: 'bioluminescent_spore', weight: 10, rarity: 1 },
      { id: 'mycelium_cluster', weight: 5, rarity: 2 },
    ],
    creatureDensity: 6,
    mineralDensity: 7,
  },
  starfall_crater: {
    creatures: [
      { id: 'void_horror', weight: 2, minLevel: 20, maxLevel: 35 },
      { id: 'star_fragment', weight: 5, minLevel: 15, maxLevel: 25 },
    ],
    minerals: [
      { id: 'starsteel_ore', weight: 4, rarity: 4 },
      { id: 'cosmic_fragment', weight: 1, rarity: 5 },
    ],
    creatureDensity: 2,
    mineralDensity: 3,
  },
  miasma_marshes: {
    creatures: [
      { id: 'marsh_lurker', weight: 7, minLevel: 5, maxLevel: 15 },
      { id: 'chemical_grazer', weight: 5, minLevel: 4, maxLevel: 10 },
    ],
    minerals: [
      { id: 'chemical_sump', weight: 8, rarity: 2 },
      { id: 'biogas_vent', weight: 4, rarity: 3 },
    ],
    creatureDensity: 5,
    mineralDensity: 4,
  },
  petrified_expanse: {
    creatures: [
      { id: 'dart_runner', weight: 8, minLevel: 6, maxLevel: 16 },
      { id: 'shard_ambusher', weight: 4, minLevel: 8, maxLevel: 18 },
    ],
    minerals: [
      { id: 'mineralized_log', weight: 6, rarity: 2 },
      { id: 'crystallized_compound', weight: 3, rarity: 4 },
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
