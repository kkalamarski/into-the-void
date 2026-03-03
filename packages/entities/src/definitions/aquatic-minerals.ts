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

// ===== PHASE 111 TIER II ADDITIONS =====

export const MINERAL_PEARL_NODE_RARE: MineralDefinition = {
  id: 'mineral_pearl_node_rare',
  displayName: 'Pearl Node (Rare)',
  description: 'A pearl node of unusual size and iridescence. The organism that created it must have been exceptionally old — possibly centuries.',
  entityClass: 'mineral',
  biomes: ['kelp_forests'],
  textureKey: 'mineral_pearl_node',
  color: 0xeeddcc,
  lootTableId: 'loot_mineral_pearl_node_rare',
  miningYield: [
    { itemId: 'world_crystal_fragment', minAmount: 2, maxAmount: 4, chance: 1.0 },
    { itemId: 'reagent_crystalline_dust', minAmount: 1, maxAmount: 1, chance: 0.35 },
  ],
  requiredTier: 3,
  respawnSeconds: 840,
  rarity: 'rare',
};

// ===== PHASE 111 TIER I ADDITIONS =====

export const MINERAL_SEA_CRYSTAL_RARE: MineralDefinition = {
  id: 'mineral_sea_crystal_rare',
  displayName: 'Sea Crystal (Rare)',
  description: 'An unusually large sea crystal formation with brilliant internal refraction. Deep-water pressure has compressed its lattice into remarkable clarity.',
  entityClass: 'mineral',
  biomes: ['tidal_pools'],
  textureKey: 'mineral_sea_crystal',
  color: 0x66ccee,
  lootTableId: 'loot_mineral_sea_crystal_rare',
  miningYield: [
    { itemId: 'world_crystal_fragment', minAmount: 2, maxAmount: 4, chance: 1.0 },
    { itemId: 'reagent_crystalline_dust', minAmount: 1, maxAmount: 1, chance: 0.3 },
  ],
  requiredTier: 2,
  respawnSeconds: 720,
  rarity: 'rare',
};

// ===== PHASE 111 TIER III ADDITIONS =====

export const MINERAL_TRENCH_CRYSTAL: MineralDefinition = {
  id: 'mineral_trench_crystal',
  displayName: 'Trench Crystal',
  description:
    'Pressure-formed crystal growing in deep trench walls. The crushing depth has forced its lattice into a configuration not achievable on the surface — and not entirely stable.',
  entityClass: 'mineral',
  biomes: ['deep_trenches'],
  textureKey: 'mineral_trench_crystal',
  color: 0x334466,
  lootTableId: 'loot_mineral_trench_crystal',
  miningYield: [
    { itemId: 'world_crystal_fragment', minAmount: 1, maxAmount: 3, chance: 1.0 },
    { itemId: 'reagent_bioluminescent_compound', minAmount: 1, maxAmount: 1, chance: 0.2 },
  ],
  requiredTier: 3,
  respawnSeconds: 540,
};

export const MINERAL_ABYSSAL_ORE_RARE: MineralDefinition = {
  id: 'mineral_abyssal_ore_rare',
  displayName: 'Abyssal Ore (Rare)',
  description:
    'An abyssal ore vein with an unnatural blue luminescence. Deep-sea miners report hearing a low hum near large deposits that persists even through pressure suits.',
  entityClass: 'mineral',
  biomes: ['deep_trenches'],
  textureKey: 'mineral_abyssal_ore',
  color: 0x4466aa,
  lootTableId: 'loot_mineral_abyssal_ore_rare',
  miningYield: [
    { itemId: 'world_crystal_fragment', minAmount: 2, maxAmount: 5, chance: 1.0 },
    { itemId: 'reagent_bioluminescent_compound', minAmount: 1, maxAmount: 1, chance: 0.4 },
  ],
  requiredTier: 4,
  respawnSeconds: 1080,
  rarity: 'rare',
};

export const MINERAL_ABYSSAL_ORE_EPIC: MineralDefinition = {
  id: 'mineral_abyssal_ore_epic',
  displayName: 'Abyssal Ore (Epic)',
  description:
    'A massive abyssal ore deposit that pulses with visible energy. The rock face around it has been restructured into geometric patterns — this was not formed by geology alone.',
  entityClass: 'mineral',
  biomes: ['deep_trenches'],
  textureKey: 'mineral_abyssal_ore',
  color: 0x5588cc,
  lootTableId: 'loot_mineral_abyssal_ore_epic',
  miningYield: [
    { itemId: 'world_crystal_fragment', minAmount: 3, maxAmount: 6, chance: 1.0 },
    { itemId: 'reagent_bioluminescent_compound', minAmount: 1, maxAmount: 2, chance: 0.5 },
  ],
  requiredTier: 4,
  respawnSeconds: 1620,
  rarity: 'epic',
};

export const ALL_AQUATIC_MINERALS: readonly MineralDefinition[] = [
  MINERAL_CORAL_DEPOSIT,
  MINERAL_SEA_CRYSTAL,
  MINERAL_ABYSSAL_ORE,
  MINERAL_TIDAL_STONE,
  MINERAL_PEARL_NODE,
  // Phase 111 Tier I additions
  MINERAL_SEA_CRYSTAL_RARE,
  // Phase 111 Tier II additions
  MINERAL_PEARL_NODE_RARE,
  // Phase 111 Tier III additions
  MINERAL_TRENCH_CRYSTAL,
  MINERAL_ABYSSAL_ORE_RARE,
  MINERAL_ABYSSAL_ORE_EPIC,
];
