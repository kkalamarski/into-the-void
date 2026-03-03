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

// ===== PHASE 111 TIER II ADDITIONS =====

export const MINERAL_DEPTH_QUARTZ: MineralDefinition = {
  id: 'mineral_depth_quartz',
  displayName: 'Depth Quartz',
  description: 'Pressure-formed quartz with trapped bioluminescent organisms suspended in its lattice. The crystals glow with a ghostly internal light.',
  entityClass: 'mineral',
  biomes: ['bioluminescent_depths'],
  textureKey: 'mineral_depth_quartz',
  color: 0x3388aa,
  lootTableId: 'loot_mineral_depth_quartz',
  miningYield: [
    { itemId: 'world_luminous_extract', minAmount: 1, maxAmount: 2, chance: 1.0 },
    { itemId: 'reagent_bioluminescent_compound', minAmount: 1, maxAmount: 1, chance: 0.2 },
  ],
  requiredTier: 2,
  respawnSeconds: 420,
};

export const MINERAL_DEPTH_QUARTZ_RARE: MineralDefinition = {
  id: 'mineral_depth_quartz_rare',
  displayName: 'Depth Quartz (Rare)',
  description: 'An enormous depth quartz cluster radiating light that seems to swim and shift. The trapped organisms may still be alive.',
  entityClass: 'mineral',
  biomes: ['bioluminescent_depths'],
  textureKey: 'mineral_depth_quartz',
  color: 0x44bbdd,
  lootTableId: 'loot_mineral_depth_quartz_rare',
  miningYield: [
    { itemId: 'world_luminous_extract', minAmount: 2, maxAmount: 4, chance: 1.0 },
    { itemId: 'reagent_bioluminescent_compound', minAmount: 1, maxAmount: 1, chance: 0.4 },
  ],
  requiredTier: 3,
  respawnSeconds: 840,
  rarity: 'rare',
};

// ===== PHASE 111 TIER III CRYSTALLINE_WASTES ADDITIONS =====

export const MINERAL_NULL_STONE_RARE: MineralDefinition = {
  id: 'mineral_null_stone_rare',
  displayName: 'Null Stone (Rare)',
  description:
    'A null stone formation that actively dampens sound in a sphere around it. The silence is absolute and deeply unsettling — your own heartbeat becomes inaudible within arm\'s reach.',
  entityClass: 'mineral',
  biomes: ['crystalline_wastes'],
  textureKey: 'mineral_null_stone',
  color: 0x99aabb,
  lootTableId: 'loot_mineral_null_stone_rare',
  miningYield: [
    { itemId: 'world_crystal_fragment', minAmount: 2, maxAmount: 5, chance: 1.0 },
    { itemId: 'reagent_crystalline_dust', minAmount: 1, maxAmount: 1, chance: 0.4 },
  ],
  requiredTier: 4,
  respawnSeconds: 1080,
  rarity: 'rare',
};

export const MINERAL_RESONANCE_CORE: MineralDefinition = {
  id: 'mineral_resonance_core',
  displayName: 'Resonance Core',
  description:
    'Dense crystalline core that generates audible tones when approached. The tones shift to match the observer\'s breathing rate — a phenomenon that has no geological explanation. Miners report persistent tinnitus for days after extraction.',
  entityClass: 'mineral',
  biomes: ['crystalline_wastes'],
  textureKey: 'mineral_resonance_core',
  color: 0xbb88dd,
  lootTableId: 'loot_mineral_resonance_core',
  miningYield: [
    { itemId: 'world_crystal_fragment', minAmount: 3, maxAmount: 6, chance: 1.0 },
    { itemId: 'reagent_anomaly_catalyst', minAmount: 1, maxAmount: 1, chance: 0.45 },
  ],
  requiredTier: 4,
  respawnSeconds: 1620,
  rarity: 'epic',
};

// ===== PHASE 111 VOID_RIFT EXOTIC ADDITION =====

export const MINERAL_VOID_CRYSTAL_NODE_EXOTIC: MineralDefinition = {
  id: 'mineral_void_crystal_node_exotic',
  displayName: 'Void Crystal Node (Exotic)',
  description:
    'A void crystal node of impossible geometry — its facets reflect a view of the landscape from a position several hundred meters distant and approximately thirty seconds in the future. The mining yield is the most valuable in known space, but prolonged extraction causes spatial orientation to deteriorate irreversibly.',
  entityClass: 'mineral',
  biomes: ['void_rift'],
  textureKey: 'mineral_void_crystal_node',
  color: 0xcc55ff,
  lootTableId: 'loot_mineral_void_crystal_node_exotic',
  miningYield: [
    { itemId: 'world_void_crystal', minAmount: 3, maxAmount: 6, chance: 1.0 },
    { itemId: 'reagent_corrupted_essence', minAmount: 1, maxAmount: 2, chance: 0.5 },
    { itemId: 'world_rift_core', minAmount: 1, maxAmount: 1, chance: 0.2 },
  ],
  requiredTier: 4,
  respawnSeconds: 2400,
  rarity: 'exotic',
};

export const ALL_EXOTIC_MINERALS: readonly MineralDefinition[] = [
  MINERAL_VOID_CRYSTAL_NODE,
  MINERAL_ANOMALY_SHARD,
  MINERAL_DIMENSIONAL_ORE,
  MINERAL_NULL_STONE,
  MINERAL_PHASE_MINERAL,
  // Phase 111 Tier II additions
  MINERAL_DEPTH_QUARTZ,
  MINERAL_DEPTH_QUARTZ_RARE,
  // Phase 111 Tier III crystalline_wastes additions
  MINERAL_NULL_STONE_RARE,
  MINERAL_RESONANCE_CORE,
  // Phase 111 void_rift exotic addition
  MINERAL_VOID_CRYSTAL_NODE_EXOTIC,
];
