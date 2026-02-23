import type { PlantDefinition } from '../types';

export const PLANT_TIDAL_KELP: PlantDefinition = {
  id: 'plant_tidal_kelp',
  displayName: 'Tidal Kelp',
  description: 'Common kelp that grows in shallow waters. Useful for basic crafting.',
  entityClass: 'plant',
  biomes: ['tidal_pools'],
  textureKey: 'plant_tidal_kelp',
  color: 0x556b2f,
  lootTableId: 'loot_plant_tidal_kelp',
  harvestYield: [
    { itemId: 'world_organic_material_common', minAmount: 1, maxAmount: 2, chance: 1.0 },
  ],
  respawnSeconds: 240,
};

export const PLANT_BIOLUMINESCENT_ALGAE: PlantDefinition = {
  id: 'plant_bioluminescent_algae',
  displayName: 'Bioluminescent Algae',
  description: 'Glowing algae colony clinging to rocks. Harvested for light-emitting compounds.',
  entityClass: 'plant',
  biomes: ['tidal_pools', 'kelp_forests'],
  textureKey: 'plant_bioluminescent_algae',
  color: 0x00ffff,
  lootTableId: 'loot_plant_bioluminescent_algae',
  harvestYield: [
    { itemId: 'world_organic_material_common', minAmount: 1, maxAmount: 2, chance: 1.0 },
    { itemId: 'reagent_biogenic_catalyst', minAmount: 1, maxAmount: 1, chance: 0.15 },
  ],
  respawnSeconds: 300,
};

export const PLANT_PRESSURE_FERN: PlantDefinition = {
  id: 'plant_pressure_fern',
  displayName: 'Pressure Fern',
  description: 'Deep-water plant adapted to extreme pressure. Fronds contain stress-resistant compounds.',
  entityClass: 'plant',
  biomes: ['kelp_forests', 'deep_trenches'],
  textureKey: 'plant_pressure_fern',
  color: 0x2e8b57,
  lootTableId: 'loot_plant_pressure_fern',
  harvestYield: [
    { itemId: 'world_organic_material_rare', minAmount: 1, maxAmount: 2, chance: 1.0 },
    { itemId: 'reagent_thermal_compound', minAmount: 1, maxAmount: 1, chance: 0.25 },
  ],
  respawnSeconds: 360,
};

export const PLANT_VOID_KELP: PlantDefinition = {
  id: 'plant_void_kelp',
  displayName: 'Void Kelp',
  description: 'Rare deep-sea kelp variant with dark, almost black fronds. Found only in the deepest trenches.',
  entityClass: 'plant',
  biomes: ['deep_trenches'],
  textureKey: 'plant_void_kelp',
  color: 0x191970,
  lootTableId: 'loot_plant_void_kelp',
  harvestYield: [
    { itemId: 'world_organic_material_rare', minAmount: 2, maxAmount: 3, chance: 1.0 },
  ],
  respawnSeconds: 480,
};

export const PLANT_THERMAL_VENT_COLONY: PlantDefinition = {
  id: 'plant_thermal_vent_colony',
  displayName: 'Thermal Vent Colony',
  description: 'Extremophile bacterial colony clustering around deep-sea thermal vents.',
  entityClass: 'plant',
  biomes: ['deep_trenches'],
  textureKey: 'plant_thermal_vent_colony',
  color: 0xff4500,
  lootTableId: 'loot_plant_thermal_vent_colony',
  harvestYield: [
    { itemId: 'world_geothermal_compound', minAmount: 1, maxAmount: 2, chance: 1.0 },
    { itemId: 'reagent_thermal_compound', minAmount: 1, maxAmount: 1, chance: 0.25 },
  ],
  respawnSeconds: 420,
};

export const ALL_AQUATIC_PLANTS: readonly PlantDefinition[] = [
  PLANT_TIDAL_KELP,
  PLANT_BIOLUMINESCENT_ALGAE,
  PLANT_PRESSURE_FERN,
  PLANT_VOID_KELP,
  PLANT_THERMAL_VENT_COLONY,
];
