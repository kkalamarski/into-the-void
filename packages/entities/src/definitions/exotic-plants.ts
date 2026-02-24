import type { PlantDefinition } from '../types';

export const PLANT_REALITY_MOSS: PlantDefinition = {
  id: 'plant_reality_moss',
  displayName: 'Reality Moss',
  description: 'Bioluminescent moss with properties that defy conventional biology. Useful for exotic crafting.',
  entityClass: 'plant',
  biomes: ['bioluminescent_depths'],
  textureKey: 'plant_reality_moss',
  color: 0x00ff88,
  lootTableId: 'loot_plant_reality_moss',
  harvestYield: [
    { itemId: 'world_organic_material_common', minAmount: 1, maxAmount: 2, chance: 1.0 },
    { itemId: 'reagent_biogenic_catalyst', minAmount: 1, maxAmount: 1, chance: 0.25 },
  ],
  respawnSeconds: 300,
};

export const PLANT_ECHO_BLOOM: PlantDefinition = {
  id: 'plant_echo_bloom',
  displayName: 'Echo Bloom',
  description: 'Flowering plant that exists in multiple temporal states simultaneously. Petals shimmer with afterimages.',
  entityClass: 'plant',
  biomes: ['bioluminescent_depths', 'void_rift'],
  textureKey: 'plant_echo_bloom',
  color: 0x4488ff,
  lootTableId: 'loot_plant_echo_bloom',
  harvestYield: [
    { itemId: 'world_organic_material_rare', minAmount: 1, maxAmount: 2, chance: 1.0 },
    { itemId: 'reagent_quantum_residue', minAmount: 1, maxAmount: 1, chance: 0.3 },
  ],
  respawnSeconds: 420,
};

export const PLANT_TEMPORAL_FUNGUS: PlantDefinition = {
  id: 'plant_temporal_fungus',
  displayName: 'Temporal Fungus',
  description: 'Fungal growth found in dimensionally unstable areas. Spores exhibit non-linear aging.',
  entityClass: 'plant',
  biomes: ['bioluminescent_depths'],
  textureKey: 'plant_temporal_fungus',
  color: 0x9966ff,
  lootTableId: 'loot_plant_temporal_fungus',
  harvestYield: [
    { itemId: 'world_fungal_spore_cluster', minAmount: 1, maxAmount: 2, chance: 1.0 },
    { itemId: 'reagent_quantum_residue', minAmount: 1, maxAmount: 1, chance: 0.2 },
  ],
  respawnSeconds: 360,
};

export const PLANT_VOID_VINE: PlantDefinition = {
  id: 'plant_void_vine',
  displayName: 'Void Vine',
  description: 'Parasitic vine that feeds on dimensional tears. Partially phases through solid matter.',
  entityClass: 'plant',
  biomes: ['void_rift'],
  textureKey: 'plant_void_vine',
  color: 0x4a0080,
  lootTableId: 'loot_plant_void_vine',
  harvestYield: [
    { itemId: 'world_organic_material_rare', minAmount: 2, maxAmount: 3, chance: 1.0 },
    { itemId: 'reagent_void_essence', minAmount: 1, maxAmount: 1, chance: 0.35 },
  ],
  respawnSeconds: 540,
};

export const PLANT_NULL_GRASS: PlantDefinition = {
  id: 'plant_null_grass',
  displayName: 'Null Grass',
  description: 'Crystalline pseudo-grass that grows in mineral-rich anomaly zones. Sharp but valuable.',
  entityClass: 'plant',
  biomes: ['crystalline_wastes', 'void_rift'],
  textureKey: 'plant_null_grass',
  color: 0xb0e0e6,
  lootTableId: 'loot_plant_null_grass',
  harvestYield: [
    { itemId: 'world_organic_material_rare', minAmount: 1, maxAmount: 2, chance: 1.0 },
    { itemId: 'reagent_crystalline_dust', minAmount: 1, maxAmount: 1, chance: 0.3 },
  ],
  respawnSeconds: 480,
};

export const ALL_EXOTIC_PLANTS: readonly PlantDefinition[] = [
  PLANT_REALITY_MOSS,
  PLANT_ECHO_BLOOM,
  PLANT_TEMPORAL_FUNGUS,
  PLANT_VOID_VINE,
  PLANT_NULL_GRASS,
];
