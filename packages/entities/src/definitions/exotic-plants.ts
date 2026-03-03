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

// ===== PHASE 111 TIER II ADDITIONS =====

export const PLANT_REALITY_MOSS_RARE: PlantDefinition = {
  id: 'plant_reality_moss_rare',
  displayName: 'Reality Moss (Rare)',
  description: 'A patch of reality moss pulsing in visible spectra not usually perceived. Looking at it directly causes a mild sense of temporal displacement.',
  entityClass: 'plant',
  biomes: ['bioluminescent_depths'],
  textureKey: 'plant_reality_moss',
  color: 0x33ffcc,
  lootTableId: 'loot_plant_reality_moss_rare',
  harvestYield: [
    { itemId: 'world_luminous_extract', minAmount: 2, maxAmount: 4, chance: 1.0 },
    { itemId: 'reagent_bioluminescent_compound', minAmount: 1, maxAmount: 1, chance: 0.35 },
  ],
  respawnSeconds: 700,
  rarity: 'rare',
};

// ===== PHASE 111 TIER III CRYSTALLINE_WASTES ADDITIONS =====

export const PLANT_SINGING_REED: PlantDefinition = {
  id: 'plant_singing_reed',
  displayName: 'Singing Reed',
  description:
    'Tall, thin crystalline plant that vibrates at frequencies just below human hearing. Nearby reeds synchronize their oscillations, creating standing waves that cause mild disorientation. The patterns are too regular to be accidental.',
  entityClass: 'plant',
  biomes: ['crystalline_wastes'],
  textureKey: 'plant_singing_reed',
  color: 0xccbbdd,
  lootTableId: 'loot_plant_singing_reed',
  harvestYield: [
    { itemId: 'world_crystal_fragment', minAmount: 1, maxAmount: 2, chance: 1.0 },
    { itemId: 'reagent_crystalline_dust', minAmount: 1, maxAmount: 1, chance: 0.2 },
  ],
  respawnSeconds: 450,
};

export const PLANT_LATTICE_FLOWER: PlantDefinition = {
  id: 'plant_lattice_flower',
  displayName: 'Lattice Flower',
  description:
    'A flower whose petals are composed of interlocking crystal planes. When you look away and look back, the petal arrangement has changed — but there is no evidence of movement on any recording.',
  entityClass: 'plant',
  biomes: ['crystalline_wastes'],
  textureKey: 'plant_lattice_flower',
  color: 0xddaaee,
  lootTableId: 'loot_plant_lattice_flower',
  harvestYield: [
    { itemId: 'world_crystal_fragment', minAmount: 1, maxAmount: 2, chance: 1.0 },
    { itemId: 'world_organic_material_rare', minAmount: 1, maxAmount: 1, chance: 0.3 },
  ],
  respawnSeconds: 480,
};

export const PLANT_SINGING_REED_RARE: PlantDefinition = {
  id: 'plant_singing_reed_rare',
  displayName: 'Singing Reed (Rare)',
  description:
    'A singing reed colony of unusual density, producing harmonics that cause visual distortion in the surrounding air. Prolonged proximity induces a false sense of being watched from multiple directions simultaneously.',
  entityClass: 'plant',
  biomes: ['crystalline_wastes'],
  textureKey: 'plant_singing_reed',
  color: 0xddccff,
  lootTableId: 'loot_plant_singing_reed_rare',
  harvestYield: [
    { itemId: 'world_crystal_fragment', minAmount: 2, maxAmount: 4, chance: 1.0 },
    { itemId: 'reagent_crystalline_dust', minAmount: 1, maxAmount: 1, chance: 0.4 },
  ],
  respawnSeconds: 900,
  rarity: 'rare',
};

export const PLANT_LATTICE_FLOWER_EPIC: PlantDefinition = {
  id: 'plant_lattice_flower_epic',
  displayName: 'Lattice Flower (Epic)',
  description:
    'A lattice flower of extraordinary complexity, its crystal petals refracting images of things that are not present. Harvesters consistently report seeing their own reflection watching them from inside the crystal matrix.',
  entityClass: 'plant',
  biomes: ['crystalline_wastes'],
  textureKey: 'plant_lattice_flower',
  color: 0xee88ff,
  lootTableId: 'loot_plant_lattice_flower_epic',
  harvestYield: [
    { itemId: 'world_crystal_fragment', minAmount: 2, maxAmount: 5, chance: 1.0 },
    { itemId: 'reagent_anomaly_catalyst', minAmount: 1, maxAmount: 1, chance: 0.4 },
  ],
  respawnSeconds: 1440,
  rarity: 'epic',
};

// ===== PHASE 111 VOID_RIFT ADDITIONS =====

export const PLANT_RIFT_TENDRIL: PlantDefinition = {
  id: 'plant_rift_tendril',
  displayName: 'Rift Tendril',
  description:
    'A vine-like growth that extends through localized tears in spatial geometry. Sections of its body appear to be in different locations simultaneously — harvesting requires cutting the same stem multiple times from different angles.',
  entityClass: 'plant',
  biomes: ['void_rift'],
  textureKey: 'plant_rift_tendril',
  color: 0x8844aa,
  lootTableId: 'loot_plant_rift_tendril',
  harvestYield: [
    { itemId: 'world_temporal_shard', minAmount: 1, maxAmount: 2, chance: 1.0 },
    { itemId: 'reagent_void_essence', minAmount: 1, maxAmount: 1, chance: 0.2 },
  ],
  respawnSeconds: 500,
};

export const PLANT_VOID_VINE_EXOTIC: PlantDefinition = {
  id: 'plant_void_vine_exotic',
  displayName: 'Void Vine (Exotic)',
  description:
    'A void vine of staggering size that extends into dimensional spaces invisible to standard observation. Pulling on its tendrils produces resistance from a direction perpendicular to all three spatial axes. The yield is extraordinary — and so is the sense of wrongness.',
  entityClass: 'plant',
  biomes: ['void_rift'],
  textureKey: 'plant_void_vine',
  color: 0xaa33ff,
  lootTableId: 'loot_plant_void_vine_exotic',
  harvestYield: [
    { itemId: 'world_temporal_shard', minAmount: 2, maxAmount: 5, chance: 1.0 },
    { itemId: 'reagent_corrupted_essence', minAmount: 1, maxAmount: 1, chance: 0.5 },
  ],
  respawnSeconds: 1500,
  rarity: 'exotic',
};

export const ALL_EXOTIC_PLANTS: readonly PlantDefinition[] = [
  PLANT_REALITY_MOSS,
  PLANT_ECHO_BLOOM,
  PLANT_TEMPORAL_FUNGUS,
  PLANT_VOID_VINE,
  PLANT_NULL_GRASS,
  // Phase 111 Tier II additions
  PLANT_REALITY_MOSS_RARE,
  // Phase 111 Tier III crystalline_wastes additions
  PLANT_SINGING_REED,
  PLANT_LATTICE_FLOWER,
  PLANT_SINGING_REED_RARE,
  PLANT_LATTICE_FLOWER_EPIC,
  // Phase 111 void_rift additions
  PLANT_RIFT_TENDRIL,
  PLANT_VOID_VINE_EXOTIC,
];
