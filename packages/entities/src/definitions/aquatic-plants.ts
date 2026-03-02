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

// ===== PHASE 111 TIER II ADDITIONS =====

export const PLANT_KELP_CANOPY: PlantDefinition = {
  id: 'plant_kelp_canopy',
  displayName: 'Kelp Canopy',
  description: 'Massive kelp fronds forming dense canopy layers. The uppermost fronds filter light into an eerie green twilight below.',
  entityClass: 'plant',
  biomes: ['kelp_forests'],
  textureKey: 'plant_kelp_canopy',
  color: 0x447744,
  lootTableId: 'loot_plant_kelp_canopy',
  harvestYield: [
    { itemId: 'world_organic_material_common', minAmount: 1, maxAmount: 3, chance: 1.0 },
    { itemId: 'reagent_biogenic_catalyst', minAmount: 1, maxAmount: 1, chance: 0.15 },
  ],
  respawnSeconds: 300,
};

export const PLANT_PRESSURE_FERN_RARE: PlantDefinition = {
  id: 'plant_pressure_fern_rare',
  displayName: 'Pressure Fern (Rare)',
  description: 'A pressure fern of extraordinary size, adapted to crush-depth conditions. Its fronds store compressed gases that hiss when harvested.',
  entityClass: 'plant',
  biomes: ['kelp_forests'],
  textureKey: 'plant_pressure_fern',
  color: 0x55aa77,
  lootTableId: 'loot_plant_pressure_fern_rare',
  harvestYield: [
    { itemId: 'world_organic_material_common', minAmount: 2, maxAmount: 4, chance: 1.0 },
    { itemId: 'reagent_biogenic_catalyst', minAmount: 1, maxAmount: 1, chance: 0.3 },
  ],
  respawnSeconds: 600,
  rarity: 'rare',
};

// ===== PHASE 111 TIER I ADDITIONS =====

export const PLANT_SALT_FROND: PlantDefinition = {
  id: 'plant_salt_frond',
  displayName: 'Salt Frond',
  description: 'Hardy seaweed anchored to shallow rocks, its fronds coated in mineral-rich salt crystals. A staple gathering target in tidal zones.',
  entityClass: 'plant',
  biomes: ['tidal_pools'],
  textureKey: 'plant_salt_frond',
  color: 0x66aa88,
  lootTableId: 'loot_plant_salt_frond',
  harvestYield: [
    { itemId: 'world_coastal_shell', minAmount: 1, maxAmount: 2, chance: 1.0 },
    { itemId: 'world_organic_material_common', minAmount: 1, maxAmount: 1, chance: 0.5 },
  ],
  respawnSeconds: 300,
};

export const PLANT_TIDAL_KELP_RARE: PlantDefinition = {
  id: 'plant_tidal_kelp_rare',
  displayName: 'Tidal Kelp (Rare)',
  description: 'An unusually large kelp specimen with iridescent fronds. Tidal researchers pay well for samples of this uncommon growth.',
  entityClass: 'plant',
  biomes: ['tidal_pools'],
  textureKey: 'plant_tidal_kelp',
  color: 0x44ddaa,
  lootTableId: 'loot_plant_tidal_kelp_rare',
  harvestYield: [
    { itemId: 'world_organic_material_common', minAmount: 2, maxAmount: 4, chance: 1.0 },
    { itemId: 'reagent_biogenic_catalyst', minAmount: 1, maxAmount: 1, chance: 0.3 },
  ],
  respawnSeconds: 600,
  rarity: 'rare',
};

export const ALL_AQUATIC_PLANTS: readonly PlantDefinition[] = [
  PLANT_TIDAL_KELP,
  PLANT_BIOLUMINESCENT_ALGAE,
  PLANT_PRESSURE_FERN,
  PLANT_VOID_KELP,
  PLANT_THERMAL_VENT_COLONY,
  // Phase 111 Tier I additions
  PLANT_SALT_FROND,
  PLANT_TIDAL_KELP_RARE,
  // Phase 111 Tier II additions
  PLANT_KELP_CANOPY,
  PLANT_PRESSURE_FERN_RARE,
];
