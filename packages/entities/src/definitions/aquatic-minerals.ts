import type { MineralDefinition } from '../types';

export const MINERAL_CORAL_DEPOSIT: MineralDefinition = {
  id: 'mineral_coral_deposit',
  displayName: 'Coral Deposit',
  description: 'Calcium carbonate structure built by tiny organisms. Useful construction material.',
  entityClass: 'mineral',
  biomes: ['tidal_pools'],
  textureKey: 'mineral_coral_deposit',
  color: 0xff7f50,
  lootTableId: 'loot_mineral_coral_deposit',
  miningYield: [
    { itemId: 'world_organic_material_common', minAmount: 2, maxAmount: 4, chance: 1.0 },
    { itemId: 'reagent_biogenic_catalyst', minAmount: 1, maxAmount: 1, chance: 0.2 },
  ],
  requiredTier: 1,
  respawnSeconds: 300,
};

export const MINERAL_SEA_CRYSTAL: MineralDefinition = {
  id: 'mineral_sea_crystal',
  displayName: 'Sea Crystal',
  description: 'Translucent crystalline formation grown in tidal caves. Refracts light beautifully.',
  entityClass: 'mineral',
  biomes: ['tidal_pools', 'kelp_forests'],
  textureKey: 'mineral_sea_crystal',
  color: 0x00ced1,
  lootTableId: 'loot_mineral_sea_crystal',
  miningYield: [
    { itemId: 'world_crystal_fragment', minAmount: 1, maxAmount: 2, chance: 1.0 },
    { itemId: 'reagent_crystalline_dust', minAmount: 1, maxAmount: 1, chance: 0.2 },
  ],
  requiredTier: 1,
  respawnSeconds: 360,
};

export const MINERAL_ABYSSAL_ORE: MineralDefinition = {
  id: 'mineral_abyssal_ore',
  displayName: 'Abyssal Ore',
  description: 'Dense metallic ore exposed on trench walls. Forged under extreme pressure.',
  entityClass: 'mineral',
  biomes: ['deep_trenches'],
  textureKey: 'mineral_abyssal_ore',
  color: 0x2f4f4f,
  lootTableId: 'loot_mineral_abyssal_ore',
  miningYield: [
    { itemId: 'world_void_crystal', minAmount: 1, maxAmount: 2, chance: 1.0 },
    { itemId: 'reagent_void_essence', minAmount: 1, maxAmount: 1, chance: 0.15 },
  ],
  requiredTier: 3,
  respawnSeconds: 540,
};

export const MINERAL_TIDAL_STONE: MineralDefinition = {
  id: 'mineral_tidal_stone',
  displayName: 'Tidal Stone',
  description: 'Smooth stone polished by constant wave action. Contains trace minerals.',
  entityClass: 'mineral',
  biomes: ['tidal_pools'],
  textureKey: 'mineral_tidal_stone',
  color: 0x708090,
  lootTableId: 'loot_mineral_tidal_stone',
  miningYield: [
    { itemId: 'world_crater_dust', minAmount: 2, maxAmount: 3, chance: 1.0 },
  ],
  requiredTier: 1,
  respawnSeconds: 240,
};

export const MINERAL_PEARL_NODE: MineralDefinition = {
  id: 'mineral_pearl_node',
  displayName: 'Pearl Node',
  description: 'Rare concentration of pearl-producing mollusks. Highly valuable.',
  entityClass: 'mineral',
  biomes: ['kelp_forests'],
  textureKey: 'mineral_pearl_node',
  color: 0xf0e68c,
  lootTableId: 'loot_mineral_pearl_node',
  miningYield: [
    { itemId: 'world_organic_material_rare', minAmount: 1, maxAmount: 2, chance: 1.0 },
    { itemId: 'reagent_biogenic_catalyst', minAmount: 1, maxAmount: 1, chance: 0.4 },
  ],
  requiredTier: 2,
  respawnSeconds: 600,
};

export const ALL_AQUATIC_MINERALS: readonly MineralDefinition[] = [
  MINERAL_CORAL_DEPOSIT,
  MINERAL_SEA_CRYSTAL,
  MINERAL_ABYSSAL_ORE,
  MINERAL_TIDAL_STONE,
  MINERAL_PEARL_NODE,
];
