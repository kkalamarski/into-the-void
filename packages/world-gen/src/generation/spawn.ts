import { BiomeType, FertilityType, SpawnPoint, ZONE_SIZE, NodeRarity } from '@into-the-void/shared-types';
import { ENTITY_IDS } from '@into-the-void/entities';
import { SeededRandom } from '../random/seeded-random';
import { BiomeGenerator } from './biome';
import {
  calculateRarityWeight,
  getRareBiomeMinerals,
  getEpicBiomeMinerals,
  RARE_SPAWN_CONFIG
} from './rarity';

const FERTILITY_MULTIPLIERS: Record<FertilityType, number> = {
  Barren: 0.5,
  Normal: 1.0,
  Lush: 1.5,
};

const SPAWN_CAPS = {
  creatures: 15,
  minerals: 10,
  plants: 20,  // Increased for forests
  artifacts: 2,
  rareMinerals: 3,
  epicMinerals: 1,
} as const;

/**
 * Spawn configuration per biome
 */
interface BiomeSpawnConfig {
  creatures: Array<{ id: string; weight: number; minLevel: number; maxLevel: number }>;
  minerals: Array<{ id: string; weight: number; rarity: number }>;
  plants: Array<{ id: string; weight: number; rarity?: NodeRarity }>;
  artifacts: Array<{ id: string; weight: number; rarity: 'rare' | 'epic' | 'exotic' | 'legendary' }>;
  creatureDensity: number; // Average creatures per chunk
  mineralDensity: number; // Average minerals per chunk
  plantDensity: number; // Average plants per chunk
  artifactDensity: number; // Artifact spawn attempts per chunk (gated by probability)
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
    plants: [
      { id: ENTITY_IDS.PLANT_VOID_TREE, weight: 20 },  // High spawn rate - dominant feature
      { id: ENTITY_IDS.PLANT_DROUGHT_CACTUS, weight: 8 },
      { id: ENTITY_IDS.PLANT_VOID_FERN, weight: 8 },
    ],
    artifacts: [], // No artifacts in void_plains
    creatureDensity: 4,
    mineralDensity: 3,
    plantDensity: 12,  // Dense forest
    artifactDensity: 1,
  },
  crystal_caves: {
    creatures: [
      { id: ENTITY_IDS.CREATURE_CRYSTAL_HUNTER, weight: 8, minLevel: 5, maxLevel: 15 },
      { id: ENTITY_IDS.CREATURE_CRYSTAL_CRAWLER, weight: 6, minLevel: 5, maxLevel: 12 },
    ],
    minerals: [
      { id: ENTITY_IDS.MINERAL_PRISMATIC_CRYSTAL, weight: 8, rarity: 2 },
    ],
    plants: [
      { id: ENTITY_IDS.PLANT_LATTICE_MOSS, weight: 10 },
      { id: ENTITY_IDS.PLANT_LATTICE_MOSS_RARE, weight: 2, rarity: 'rare' },
    ],
    artifacts: [
      { id: ENTITY_IDS.ARTIFACT_CRYSTALLINE_RESONATOR, weight: 6, rarity: 'epic' },
    ],
    creatureDensity: 3,
    mineralDensity: 8,
    plantDensity: 3,
    artifactDensity: 1,
  },
  toxic_wastes: {
    creatures: [
      { id: ENTITY_IDS.CREATURE_TOXIC_LURKER, weight: 7, minLevel: 8, maxLevel: 20 },
    ],
    minerals: [
      { id: ENTITY_IDS.MINERAL_CORROSIVE_DEPOSIT, weight: 10, rarity: 1 },
    ],
    plants: [
      { id: ENTITY_IDS.PLANT_ACID_FERN, weight: 10 },
    ],
    artifacts: [], // No artifacts in toxic_wastes
    creatureDensity: 5,
    mineralDensity: 4,
    plantDensity: 3,
    artifactDensity: 1,
  },
  ancient_ruins: {
    creatures: [
      { id: ENTITY_IDS.CREATURE_VOID_HORROR, weight: 3, minLevel: 10, maxLevel: 25 },
      { id: ENTITY_IDS.CREATURE_RUIN_SEEKER, weight: 4, minLevel: 18, maxLevel: 30 },
    ],
    minerals: [
      { id: ENTITY_IDS.MINERAL_ANOMALY_CRYSTAL, weight: 5, rarity: 3 },
    ],
    plants: [
      { id: ENTITY_IDS.PLANT_PHASE_BLOOM, weight: 10 },
      { id: ENTITY_IDS.PLANT_PHASE_BLOOM_RARE, weight: 2, rarity: 'rare' },
    ],
    artifacts: [
      { id: ENTITY_IDS.ARTIFACT_ANCIENT_DATA_CORE, weight: 3, rarity: 'exotic' },
      { id: ENTITY_IDS.ARTIFACT_VOID_TOUCHED_RELIC, weight: 1, rarity: 'legendary' },
    ],
    creatureDensity: 2,
    mineralDensity: 2,
    plantDensity: 3,
    artifactDensity: 1,
  },
  frozen_expanse: {
    creatures: [
      { id: ENTITY_IDS.CREATURE_FROST_STALKER, weight: 5, minLevel: 10, maxLevel: 22 },
      { id: ENTITY_IDS.CREATURE_ICE_BURROWER, weight: 4, minLevel: 12, maxLevel: 24 },
    ],
    minerals: [
      { id: ENTITY_IDS.MINERAL_PERMAFROST_SHARD, weight: 6, rarity: 2 },
    ],
    plants: [
      { id: ENTITY_IDS.PLANT_ICE_ALGAE, weight: 10 },
    ],
    artifacts: [
      { id: ENTITY_IDS.ARTIFACT_PRESERVED_SPECIMEN, weight: 10, rarity: 'rare' },
    ],
    creatureDensity: 3,
    mineralDensity: 4,
    plantDensity: 3,
    artifactDensity: 1,
  },
  volcanic_ridge: {
    creatures: [
      { id: ENTITY_IDS.CREATURE_MAGMA_BEAST, weight: 4, minLevel: 12, maxLevel: 28 },
      { id: ENTITY_IDS.CREATURE_ASH_SKIMMER, weight: 6, minLevel: 10, maxLevel: 20 },
    ],
    minerals: [
      { id: ENTITY_IDS.MINERAL_VOLCANIC_ORE, weight: 8, rarity: 2 },
    ],
    plants: [
      { id: ENTITY_IDS.PLANT_THERMAL_VENT_MOSS, weight: 10 },
    ],
    artifacts: [
      { id: ENTITY_IDS.ARTIFACT_THERMAL_CORE, weight: 6, rarity: 'epic' },
    ],
    creatureDensity: 4,
    mineralDensity: 5,
    plantDensity: 3,
    artifactDensity: 1,
  },
  fungal_forest: {
    creatures: [
      { id: ENTITY_IDS.CREATURE_SPORE_CARRIER, weight: 8, minLevel: 4, maxLevel: 12 },
      { id: ENTITY_IDS.CREATURE_CANOPY_GRAZER, weight: 5, minLevel: 1, maxLevel: 6 },
    ],
    minerals: [
      { id: ENTITY_IDS.MINERAL_MYCELIAL_CLUSTER, weight: 10, rarity: 1 },
    ],
    plants: [
      { id: ENTITY_IDS.PLANT_LUMINOUS_VINE, weight: 10 },
      { id: ENTITY_IDS.PLANT_VOID_FERN, weight: 10 },
      { id: ENTITY_IDS.PLANT_LUMINOUS_VINE_RARE, weight: 2, rarity: 'rare' },
      { id: ENTITY_IDS.PLANT_RARE_FUNGI, weight: 2, rarity: 'rare' },
      { id: ENTITY_IDS.PLANT_EPIC_SPORES, weight: 1, rarity: 'epic' },
    ],
    artifacts: [], // No artifacts in fungal_forest
    creatureDensity: 6,
    mineralDensity: 7,
    plantDensity: 4, // Lush biome
    artifactDensity: 1,
  },
  starfall_crater: {
    creatures: [
      { id: ENTITY_IDS.CREATURE_VOID_HORROR, weight: 2, minLevel: 20, maxLevel: 35 },
    ],
    minerals: [
      { id: ENTITY_IDS.MINERAL_COSMIC_FRAGMENT, weight: 4, rarity: 4 },
    ],
    plants: [
      { id: ENTITY_IDS.PLANT_STAR_LICHEN, weight: 10 },
    ],
    artifacts: [
      { id: ENTITY_IDS.ARTIFACT_VOID_TOUCHED_RELIC, weight: 1, rarity: 'legendary' },
    ],
    creatureDensity: 2,
    mineralDensity: 3,
    plantDensity: 3,
    artifactDensity: 1,
  },
  miasma_marshes: {
    creatures: [
      { id: ENTITY_IDS.CREATURE_MARSH_LURKER, weight: 7, minLevel: 5, maxLevel: 15 },
      { id: ENTITY_IDS.CREATURE_MIASMA_DRIFTER, weight: 6, minLevel: 3, maxLevel: 10 },
    ],
    minerals: [
      { id: ENTITY_IDS.MINERAL_CHEMICAL_SUMP, weight: 8, rarity: 2 },
      { id: ENTITY_IDS.MINERAL_TOXIC_CRYSTAL, weight: 5, rarity: 2 },
      { id: ENTITY_IDS.MINERAL_MARSH_GAS_NODE, weight: 3, rarity: 3 },
    ],
    plants: [
      { id: ENTITY_IDS.PLANT_GAS_POD, weight: 10 },
    ],
    artifacts: [], // No artifacts in miasma_marshes
    creatureDensity: 5,
    mineralDensity: 4,
    plantDensity: 3,
    artifactDensity: 1,
  },
  petrified_expanse: {
    creatures: [
      { id: ENTITY_IDS.CREATURE_DART_RUNNER, weight: 8, minLevel: 6, maxLevel: 16 },
      { id: ENTITY_IDS.CREATURE_PETRIFIED_LURKER, weight: 5, minLevel: 8, maxLevel: 18 },
    ],
    minerals: [
      { id: ENTITY_IDS.MINERAL_MINERALIZED_LOG, weight: 6, rarity: 2 },
    ],
    plants: [
      { id: ENTITY_IDS.PLANT_MOBILE_VINE, weight: 10 },
    ],
    artifacts: [
      { id: ENTITY_IDS.ARTIFACT_PRESERVED_SPECIMEN, weight: 10, rarity: 'rare' },
    ],
    creatureDensity: 3,
    mineralDensity: 6,
    plantDensity: 3,
    artifactDensity: 1,
  },
  tidal_pools: {
    creatures: [
      { id: ENTITY_IDS.CREATURE_TIDE_CRAB, weight: 10, minLevel: 1, maxLevel: 6 },
      { id: ENTITY_IDS.CREATURE_COASTAL_URCHIN, weight: 8, minLevel: 1, maxLevel: 5 },
      { id: ENTITY_IDS.CREATURE_REEF_SCAVENGER, weight: 6, minLevel: 2, maxLevel: 7 },
    ],
    minerals: [
      { id: ENTITY_IDS.MINERAL_CORAL_DEPOSIT, weight: 10, rarity: 1 },
      { id: ENTITY_IDS.MINERAL_SEA_CRYSTAL, weight: 8, rarity: 1 },
      { id: ENTITY_IDS.MINERAL_TIDAL_STONE, weight: 12, rarity: 1 },
    ],
    plants: [
      { id: ENTITY_IDS.PLANT_TIDAL_KELP, weight: 10 },
      { id: ENTITY_IDS.PLANT_BIOLUMINESCENT_ALGAE, weight: 10 },
    ],
    artifacts: [], // No artifacts in tidal_pools
    creatureDensity: 6,  // 1.5x terrestrial Tier I baseline (void_plains: 4 -> 6)
    mineralDensity: 5,   // Abundant shallow resources
    plantDensity: 5,     // Aquatic biome
    artifactDensity: 1,
  },
  kelp_forests: {
    creatures: [
      { id: ENTITY_IDS.CREATURE_KELP_GRAZER, weight: 8, minLevel: 6, maxLevel: 14 },
      { id: ENTITY_IDS.CREATURE_TANGLE_STALKER, weight: 5, minLevel: 8, maxLevel: 16 },
      { id: ENTITY_IDS.CREATURE_CURRENT_RIDER, weight: 7, minLevel: 7, maxLevel: 15 },
    ],
    minerals: [
      { id: ENTITY_IDS.MINERAL_SEA_CRYSTAL, weight: 8, rarity: 1 },
      { id: ENTITY_IDS.MINERAL_PEARL_NODE, weight: 4, rarity: 2 },
    ],
    plants: [
      { id: ENTITY_IDS.PLANT_BIOLUMINESCENT_ALGAE, weight: 10 },
      { id: ENTITY_IDS.PLANT_PRESSURE_FERN, weight: 10 },
    ],
    artifacts: [
      { id: ENTITY_IDS.ARTIFACT_SUNKEN_TECH, weight: 6, rarity: 'epic' },
    ],
    creatureDensity: 6,  // Dense kelp = more creature cover
    mineralDensity: 4,
    plantDensity: 5,     // Aquatic biome
    artifactDensity: 1,
  },
  deep_trenches: {
    creatures: [
      { id: ENTITY_IDS.CREATURE_PRESSURE_FEEDER, weight: 6, minLevel: 12, maxLevel: 20 },
      { id: ENTITY_IDS.CREATURE_TRENCH_HUNTER, weight: 4, minLevel: 14, maxLevel: 24 },
      { id: ENTITY_IDS.CREATURE_ABYSSAL_SCAVENGER, weight: 5, minLevel: 13, maxLevel: 22 },
      { id: ENTITY_IDS.CREATURE_ABYSSAL_LEVIATHAN, weight: 1, minLevel: 20, maxLevel: 32 },
    ],
    minerals: [
      { id: ENTITY_IDS.MINERAL_ABYSSAL_ORE, weight: 8, rarity: 3 },
    ],
    plants: [
      { id: ENTITY_IDS.PLANT_PRESSURE_FERN, weight: 10 },
      { id: ENTITY_IDS.PLANT_VOID_KELP, weight: 10 },
      { id: ENTITY_IDS.PLANT_THERMAL_VENT_COLONY, weight: 10 },
    ],
    artifacts: [
      { id: ENTITY_IDS.ARTIFACT_SUNKEN_TECH, weight: 6, rarity: 'epic' },
      { id: ENTITY_IDS.ARTIFACT_ANCIENT_SHELL, weight: 10, rarity: 'rare' },
      { id: ENTITY_IDS.ARTIFACT_DROWNED_RELIC, weight: 1, rarity: 'legendary' },
    ],
    creatureDensity: 3,  // Sparse but dangerous
    mineralDensity: 5,   // Rich deep mineral deposits
    plantDensity: 5,     // Aquatic biome
    artifactDensity: 1,
  },
  void_rift: {
    creatures: [
      { id: ENTITY_IDS.CREATURE_VOID_GRAZER, weight: 4, minLevel: 18, maxLevel: 28 },
      { id: ENTITY_IDS.CREATURE_ANOMALY_SCAVENGER, weight: 3, minLevel: 20, maxLevel: 30 },
      { id: ENTITY_IDS.CREATURE_VOID_STALKER, weight: 2, minLevel: 22, maxLevel: 32 },
      { id: ENTITY_IDS.CREATURE_DIMENSIONAL_ABERRATION, weight: 1, minLevel: 24, maxLevel: 35 },
    ],
    minerals: [
      { id: ENTITY_IDS.MINERAL_VOID_CRYSTAL_NODE, weight: 6, rarity: 3 },
      { id: ENTITY_IDS.MINERAL_ANOMALY_SHARD, weight: 8, rarity: 2 },
      { id: ENTITY_IDS.MINERAL_DIMENSIONAL_ORE, weight: 10, rarity: 2 },
    ],
    plants: [
      { id: ENTITY_IDS.PLANT_VOID_VINE, weight: 6 },
      { id: ENTITY_IDS.PLANT_ECHO_BLOOM, weight: 4 },
      { id: ENTITY_IDS.PLANT_NULL_GRASS, weight: 5 },
    ],
    artifacts: [
      { id: ENTITY_IDS.ARTIFACT_ANOMALY_CORE, weight: 1, rarity: 'legendary' },
      { id: ENTITY_IDS.ARTIFACT_DIMENSIONAL_FRAGMENT, weight: 3, rarity: 'exotic' },
      { id: ENTITY_IDS.ARTIFACT_VOID_RELIC, weight: 1, rarity: 'legendary' },
    ],
    creatureDensity: 2,   // Tier IV extreme (very sparse, very dangerous)
    mineralDensity: 8,    // High value resources (risk/reward)
    plantDensity: 2,      // Minimal plants (reality distortion harsh)
    artifactDensity: 1,
  },
  crystalline_wastes: {
    creatures: [
      { id: ENTITY_IDS.CREATURE_NULL_FEEDER, weight: 6, minLevel: 12, maxLevel: 20 },
      { id: ENTITY_IDS.CREATURE_DIMENSIONAL_HUNTER, weight: 5, minLevel: 13, maxLevel: 22 },
      { id: ENTITY_IDS.CREATURE_RIFT_HUNTER, weight: 4, minLevel: 14, maxLevel: 24 },
    ],
    minerals: [
      { id: ENTITY_IDS.MINERAL_NULL_STONE, weight: 10, rarity: 1 },
      { id: ENTITY_IDS.MINERAL_PHASE_MINERAL, weight: 6, rarity: 2 },
    ],
    plants: [
      { id: ENTITY_IDS.PLANT_NULL_GRASS, weight: 8 },
    ],
    artifacts: [
      { id: ENTITY_IDS.ARTIFACT_DIMENSIONAL_FRAGMENT, weight: 6, rarity: 'exotic' },
      { id: ENTITY_IDS.ARTIFACT_ECHO_RECORD, weight: 8, rarity: 'rare' },
    ],
    creatureDensity: 3,   // Tier III hostile (sparse but dangerous)
    mineralDensity: 10,   // VERY HIGH mineral density (crystal theme)
    plantDensity: 1,      // Minimal plants (harsh crystalline environment)
    artifactDensity: 1,
  },
  bioluminescent_depths: {
    creatures: [
      { id: ENTITY_IDS.CREATURE_ECHO_DRIFTER, weight: 8, minLevel: 6, maxLevel: 14 },
      { id: ENTITY_IDS.CREATURE_PHASE_GRAZER, weight: 7, minLevel: 7, maxLevel: 15 },
      { id: ENTITY_IDS.CREATURE_REALITY_SCAVENGER, weight: 5, minLevel: 8, maxLevel: 16 },
    ],
    minerals: [
      { id: ENTITY_IDS.MINERAL_ANOMALY_SHARD, weight: 6, rarity: 2 },
      { id: ENTITY_IDS.MINERAL_PHASE_MINERAL, weight: 8, rarity: 1 },
    ],
    plants: [
      { id: ENTITY_IDS.PLANT_REALITY_MOSS, weight: 10 },
      { id: ENTITY_IDS.PLANT_ECHO_BLOOM, weight: 6 },
      { id: ENTITY_IDS.PLANT_TEMPORAL_FUNGUS, weight: 8 },
    ],
    artifacts: [
      { id: ENTITY_IDS.ARTIFACT_ECHO_RECORD, weight: 10, rarity: 'rare' },
    ],
    creatureDensity: 5,   // Tier II hazardous (similar to kelp_forests)
    mineralDensity: 4,
    plantDensity: 8,      // HIGH plant density (bioluminescent flora theme)
    artifactDensity: 1,
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

  // Generate rare mineral spawns (proximity-based)
  let rareNodesSpawned = 0;
  const creatureSpawns = spawnPoints.filter(sp => sp.entityType === 'creature');

  for (let attempt = 0; attempt < 30 && rareNodesSpawned < SPAWN_CAPS.rareMinerals; attempt++) {
    const position = findValidSpawnPosition(random, collisionMap);
    if (!position) continue;

    const rarityWeight = calculateRarityWeight(position, creatureSpawns, 'rare');

    if (random.next() < rarityWeight) {
      const worldX = chunkX * ZONE_SIZE + position.x;
      const worldY = chunkY * ZONE_SIZE + position.y;
      const tileBiome = biomeGenerator.getBiome(worldX, worldY);

      const rareMinerals = getRareBiomeMinerals(tileBiome);
      if (rareMinerals.length > 0) {
        const mineralId = rareMinerals[random.nextInt(0, rareMinerals.length)];
        spawnPoints.push({
          x: position.x,
          y: position.y,
          entityType: 'mineral',
          spawnId: mineralId,
          respawnTime: 300 + random.nextInt(0, 300), // 5-10 minutes
        });
        rareNodesSpawned++;
      }
    }
  }

  // Generate epic mineral spawns (very rare, high danger zones only)
  let epicNodesSpawned = 0;
  for (let attempt = 0; attempt < 15 && epicNodesSpawned < SPAWN_CAPS.epicMinerals; attempt++) {
    const position = findValidSpawnPosition(random, collisionMap);
    if (!position) continue;

    const epicWeight = calculateRarityWeight(position, creatureSpawns, 'epic');

    if (random.next() < epicWeight) {
      const worldX = chunkX * ZONE_SIZE + position.x;
      const worldY = chunkY * ZONE_SIZE + position.y;
      const tileBiome = biomeGenerator.getBiome(worldX, worldY);

      const epicMinerals = getEpicBiomeMinerals(tileBiome);
      if (epicMinerals.length > 0) {
        const mineralId = epicMinerals[random.nextInt(0, epicMinerals.length)];
        spawnPoints.push({
          x: position.x,
          y: position.y,
          entityType: 'mineral',
          spawnId: mineralId,
          respawnTime: 600 + random.nextInt(0, 300), // 10-15 minutes
        });
        epicNodesSpawned++;
      }
    }
  }

  // Generate plant spawns
  const rawPlantCount = Math.round(config.plantDensity * multiplier * (0.5 + random.next()));
  const plantCount = Math.min(rawPlantCount, SPAWN_CAPS.plants);
  for (let i = 0; i < plantCount; i++) {
    const position = findValidSpawnPosition(random, collisionMap);
    if (!position) continue;

    // Per-tile biome sampling for spawn table
    const worldX = chunkX * ZONE_SIZE + position.x;
    const worldY = chunkY * ZONE_SIZE + position.y;
    const tileBiome = biomeGenerator.getBiome(worldX, worldY);
    const tileConfig = BIOME_SPAWN_CONFIGS[tileBiome];

    const plant = weightedPick(random, tileConfig.plants);
    if (plant) {
      spawnPoints.push({
        x: position.x,
        y: position.y,
        entityType: 'plant',
        spawnId: plant.id,
        respawnTime: 300 + random.nextInt(0, 300), // 5-10 minutes
      });
    }
  }

  // Generate artifact spawns (extremely rare)
  const artifactAttempts = Math.round(config.artifactDensity);
  for (let i = 0; i < artifactAttempts; i++) {
    // Only 5% base chance per attempt (extremely rare)
    if (random.next() >= 0.05) continue;

    const position = findValidSpawnPosition(random, collisionMap);
    if (!position) continue;

    // Per-tile biome sampling for spawn table
    const worldX = chunkX * ZONE_SIZE + position.x;
    const worldY = chunkY * ZONE_SIZE + position.y;
    const tileBiome = biomeGenerator.getBiome(worldX, worldY);
    const tileConfig = BIOME_SPAWN_CONFIGS[tileBiome];

    const artifact = weightedPick(random, tileConfig.artifacts);
    if (artifact) {
      spawnPoints.push({
        x: position.x,
        y: position.y,
        entityType: 'artifact',
        spawnId: artifact.id,
        respawnTime: -1, // Artifacts don't respawn
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

/**
 * Get plants that can spawn in a biome
 */
export function getBiomePlants(biome: BiomeType): string[] {
  return BIOME_SPAWN_CONFIGS[biome].plants.map((p) => p.id);
}

/**
 * Get artifacts that can spawn in a biome
 */
export function getBiomeArtifacts(biome: BiomeType): string[] {
  return BIOME_SPAWN_CONFIGS[biome].artifacts.map((a) => a.id);
}
