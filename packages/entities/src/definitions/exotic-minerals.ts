import type { MineralDefinition } from '../types';

export const MINERAL_VOID_CRYSTAL_NODE: MineralDefinition = {
  id: 'mineral_void_crystal_node',
  displayName: 'Void Crystal Node',
  description: 'Rare crystalline formation found only in Void Rifts. Internal structure defies normal physics.',
  entityClass: 'mineral',
  biomes: ['void_rift'],
  textureKey: 'mineral_void_crystal_node',
  color: 0x8800ff,
  lootTableId: 'loot_mineral_void_crystal_node',
  miningYield: [
    { itemId: 'world_void_crystal', minAmount: 1, maxAmount: 2, chance: 1.0 },
    { itemId: 'reagent_void_essence', minAmount: 1, maxAmount: 1, chance: 0.3 },
  ],
  requiredTier: 4,
  respawnSeconds: 720,
  rarity: 'epic',
};

export const MINERAL_ANOMALY_SHARD: MineralDefinition = {
  id: 'mineral_anomaly_shard',
  displayName: 'Anomaly Shard',
  description: 'Crystallized dimensional distortion. Valuable to researchers studying the Anomaly phenomenon.',
  entityClass: 'mineral',
  biomes: ['void_rift', 'bioluminescent_depths'],
  textureKey: 'mineral_anomaly_shard',
  color: 0x6a00a0,
  lootTableId: 'loot_mineral_anomaly_shard',
  miningYield: [
    { itemId: 'world_crystal_fragment', minAmount: 1, maxAmount: 2, chance: 1.0 },
    { itemId: 'reagent_quantum_residue', minAmount: 1, maxAmount: 1, chance: 0.25 },
  ],
  requiredTier: 3,
  respawnSeconds: 540,
  rarity: 'rare',
};

export const MINERAL_DIMENSIONAL_ORE: MineralDefinition = {
  id: 'mineral_dimensional_ore',
  displayName: 'Dimensional Ore',
  description: 'Metallic ore exposed by dimensional rifts. Contains trace amounts of exotic matter.',
  entityClass: 'mineral',
  biomes: ['void_rift'],
  textureKey: 'mineral_dimensional_ore',
  color: 0x4a0080,
  lootTableId: 'loot_mineral_dimensional_ore',
  miningYield: [
    { itemId: 'world_void_crystal', minAmount: 1, maxAmount: 2, chance: 1.0 },
    { itemId: 'world_organic_material_rare', minAmount: 1, maxAmount: 1, chance: 0.15 },
  ],
  requiredTier: 4,
  respawnSeconds: 600,
};

export const MINERAL_NULL_STONE: MineralDefinition = {
  id: 'mineral_null_stone',
  displayName: 'Null Stone',
  description: 'Dense crystalline stone from Crystalline Wastes. Absorbs energy rather than conducting it.',
  entityClass: 'mineral',
  biomes: ['crystalline_wastes'],
  textureKey: 'mineral_null_stone',
  color: 0xb0e0e6,
  lootTableId: 'loot_mineral_null_stone',
  miningYield: [
    { itemId: 'world_crystal_fragment', minAmount: 2, maxAmount: 3, chance: 1.0 },
    { itemId: 'reagent_crystalline_dust', minAmount: 1, maxAmount: 2, chance: 0.4 },
  ],
  requiredTier: 3,
  respawnSeconds: 480,
};

export const MINERAL_PHASE_MINERAL: MineralDefinition = {
  id: 'mineral_phase_mineral',
  displayName: 'Phase Mineral',
  description: 'Mineral deposit that exists in multiple temporal states. Difficult to extract consistently.',
  entityClass: 'mineral',
  biomes: ['bioluminescent_depths', 'crystalline_wastes'],
  textureKey: 'mineral_phase_mineral',
  color: 0x4488ff,
  lootTableId: 'loot_mineral_phase_mineral',
  miningYield: [
    { itemId: 'world_crystal_fragment', minAmount: 1, maxAmount: 2, chance: 1.0 },
    { itemId: 'reagent_quantum_residue', minAmount: 1, maxAmount: 1, chance: 0.3 },
  ],
  requiredTier: 2,
  respawnSeconds: 420,
};

export const ALL_EXOTIC_MINERALS: readonly MineralDefinition[] = [
  MINERAL_VOID_CRYSTAL_NODE,
  MINERAL_ANOMALY_SHARD,
  MINERAL_DIMENSIONAL_ORE,
  MINERAL_NULL_STONE,
  MINERAL_PHASE_MINERAL,
];
