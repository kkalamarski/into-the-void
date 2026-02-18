import type { MineralDefinition } from '../types';

export const MINERAL_VOID_CRYSTAL: MineralDefinition = {
  id: 'mineral_void_crystal',
  displayName: 'Void Crystal',
  description: 'Dark crystalline formation found in the scarred badlands.',
  entityClass: 'mineral',
  biomes: ['void_plains'],
  textureKey: 'mineral_void_crystal',
  color: 0x4a4a6a,
  lootTableId: 'loot_mineral_void_crystal',
  miningYield: [
    { itemId: 'world_void_crystal', minAmount: 1, maxAmount: 3, chance: 1.0 },
  ],
  requiredTier: 1,
  respawnSeconds: 300,
};

export const MINERAL_PRISMATIC_CRYSTAL: MineralDefinition = {
  id: 'mineral_prismatic_crystal',
  displayName: 'Prismatic Crystal',
  description: 'High-purity silicon crystal refracting light into rainbow patterns.',
  entityClass: 'mineral',
  biomes: ['crystal_caves'],
  textureKey: 'mineral_prismatic_crystal',
  color: 0x7b68ee,
  lootTableId: 'loot_mineral_prismatic_crystal',
  miningYield: [
    { itemId: 'world_crystal_fragment', minAmount: 2, maxAmount: 4, chance: 1.0 },
    { itemId: 'reagent_crystalline_dust', minAmount: 1, maxAmount: 2, chance: 0.4 },
  ],
  requiredTier: 3,
  respawnSeconds: 600,
};

export const MINERAL_CHEMICAL_SUMP: MineralDefinition = {
  id: 'mineral_chemical_sump',
  displayName: 'Chemical Sump',
  description: 'Concentrated chemical deposit in the marsh waters.',
  entityClass: 'mineral',
  biomes: ['miasma_marshes'],
  textureKey: 'mineral_chemical_sump',
  color: 0x808000,
  lootTableId: 'loot_mineral_chemical_sump',
  miningYield: [
    { itemId: 'world_toxic_residue', minAmount: 2, maxAmount: 5, chance: 1.0 },
    { itemId: 'reagent_thermal_compound', minAmount: 1, maxAmount: 1, chance: 0.3 },
  ],
  requiredTier: 2,
  respawnSeconds: 420,
};

export const MINERAL_MINERALIZED_LOG: MineralDefinition = {
  id: 'mineral_mineralized_log',
  displayName: 'Mineralized Log',
  description: 'Petrified tree trunk preserving ancient organic structures.',
  entityClass: 'mineral',
  biomes: ['petrified_expanse'],
  textureKey: 'mineral_mineralized_log',
  color: 0x8b7355,
  lootTableId: 'loot_mineral_mineralized_log',
  miningYield: [
    { itemId: 'world_alien_flora_petrified', minAmount: 1, maxAmount: 2, chance: 1.0 },
    { itemId: 'world_ancient_fragment', minAmount: 1, maxAmount: 1, chance: 0.15 },
  ],
  requiredTier: 2,
  respawnSeconds: 480,
};

export const MINERAL_VOLCANIC_ORE: MineralDefinition = {
  id: 'mineral_volcanic_ore',
  displayName: 'Volcanic Ore',
  description: 'Rich metal deposit exposed by volcanic activity.',
  entityClass: 'mineral',
  biomes: ['volcanic_ridge'],
  textureKey: 'mineral_volcanic_ore',
  color: 0xff4500,
  lootTableId: 'loot_mineral_volcanic_ore',
  miningYield: [
    { itemId: 'world_volcanic_glass', minAmount: 2, maxAmount: 4, chance: 1.0 },
    { itemId: 'world_geothermal_compound', minAmount: 1, maxAmount: 2, chance: 0.5 },
  ],
  requiredTier: 3,
  respawnSeconds: 540,
};

export const MINERAL_PERMAFROST_SHARD: MineralDefinition = {
  id: 'mineral_permafrost_shard',
  displayName: 'Permafrost Shard',
  description: 'Frozen mineral formation with cold-stable compounds.',
  entityClass: 'mineral',
  biomes: ['frozen_expanse'],
  textureKey: 'mineral_permafrost_shard',
  color: 0xb0c4de,
  lootTableId: 'loot_mineral_permafrost_shard',
  miningYield: [
    { itemId: 'world_frozen_shard', minAmount: 2, maxAmount: 4, chance: 1.0 },
  ],
  requiredTier: 3,
  respawnSeconds: 480,
};

export const MINERAL_CORROSIVE_DEPOSIT: MineralDefinition = {
  id: 'mineral_corrosive_deposit',
  displayName: 'Corrosive Deposit',
  description: 'Toxic mineral compound requiring protective equipment.',
  entityClass: 'mineral',
  biomes: ['toxic_wastes'],
  textureKey: 'mineral_corrosive_deposit',
  color: 0xadff2f,
  lootTableId: 'loot_mineral_corrosive_deposit',
  miningYield: [
    { itemId: 'world_toxic_residue', minAmount: 3, maxAmount: 6, chance: 1.0 },
  ],
  requiredTier: 3,
  respawnSeconds: 360,
};

export const MINERAL_MYCELIAL_CLUSTER: MineralDefinition = {
  id: 'mineral_mycelial_cluster',
  displayName: 'Mycelial Cluster',
  description: 'Dense fungal fiber formation with pharmaceutical value.',
  entityClass: 'mineral',
  biomes: ['fungal_forest'],
  textureKey: 'mineral_mycelial_cluster',
  color: 0xba55d3,
  lootTableId: 'loot_mineral_mycelial_cluster',
  miningYield: [
    { itemId: 'world_mycelial_fiber', minAmount: 2, maxAmount: 4, chance: 1.0 },
    { itemId: 'reagent_fungal_extract', minAmount: 1, maxAmount: 1, chance: 0.35 },
  ],
  requiredTier: 1,
  respawnSeconds: 240,
};

export const MINERAL_ANOMALY_CRYSTAL: MineralDefinition = {
  id: 'mineral_anomaly_crystal',
  displayName: 'Anomaly Crystal',
  description: 'Reality-warped mineral formation. Handle with extreme caution.',
  entityClass: 'mineral',
  biomes: ['ancient_ruins'],
  textureKey: 'mineral_anomaly_crystal',
  color: 0x8a2be2,
  lootTableId: 'loot_mineral_anomaly_crystal',
  miningYield: [
    { itemId: 'reagent_quantum_residue', minAmount: 1, maxAmount: 2, chance: 1.0 },
    { itemId: 'reagent_void_essence', minAmount: 1, maxAmount: 1, chance: 0.2 },
  ],
  requiredTier: 4,
  respawnSeconds: 900,
};

export const MINERAL_COSMIC_FRAGMENT: MineralDefinition = {
  id: 'mineral_cosmic_fragment',
  displayName: 'Cosmic Fragment',
  description: 'Starsteel ore from the crater impact. Exceptionally rare.',
  entityClass: 'mineral',
  biomes: ['starfall_crater'],
  textureKey: 'mineral_cosmic_fragment',
  color: 0x191970,
  lootTableId: 'loot_mineral_cosmic_fragment',
  miningYield: [
    { itemId: 'world_crater_dust', minAmount: 2, maxAmount: 3, chance: 1.0 },
    { itemId: 'reagent_void_essence', minAmount: 1, maxAmount: 1, chance: 0.15 },
  ],
  requiredTier: 4,
  respawnSeconds: 720,
};

export const ALL_MINERALS: readonly MineralDefinition[] = [
  MINERAL_VOID_CRYSTAL,
  MINERAL_PRISMATIC_CRYSTAL,
  MINERAL_CHEMICAL_SUMP,
  MINERAL_MINERALIZED_LOG,
  MINERAL_VOLCANIC_ORE,
  MINERAL_PERMAFROST_SHARD,
  MINERAL_CORROSIVE_DEPOSIT,
  MINERAL_MYCELIAL_CLUSTER,
  MINERAL_ANOMALY_CRYSTAL,
  MINERAL_COSMIC_FRAGMENT,
];
