import type { PlantDefinition } from '../types';

export const PLANT_LUMINOUS_VINE: PlantDefinition = {
  id: 'plant_luminous_vine',
  displayName: 'Luminous Vine',
  description: 'Glowing vine network of the canopy. Pulses with soft bioluminescence.',
  entityClass: 'plant',
  biomes: ['fungal_forest'],
  textureKey: 'plant_luminous_vine',
  color: 0x44ff88,
  lootTableId: 'loot_plant_luminous_vine',
  harvestYield: [
    { itemId: 'world_alien_flora_luminous', minAmount: 1, maxAmount: 3, chance: 1.0 },
    { itemId: 'reagent_biogenic_catalyst', minAmount: 1, maxAmount: 1, chance: 0.15 },
  ],
  respawnSeconds: 300,
};

export const PLANT_VOID_FERN: PlantDefinition = {
  id: 'plant_void_fern',
  displayName: 'Void Fern',
  description: 'Hardy fern adapted to low-light conditions beneath the fungal canopy. Produces spores with unusual radiation-resistant properties.',
  entityClass: 'plant',
  biomes: ['fungal_forest', 'void_plains'],
  textureKey: 'plant_void_fern',
  color: 0x446644,
  lootTableId: 'loot_plant_void_fern',
  harvestYield: [
    { itemId: 'world_void_flora_sample', minAmount: 1, maxAmount: 2, chance: 1.0 },
    { itemId: 'world_organic_material_common', minAmount: 1, maxAmount: 1, chance: 0.3 },
  ],
  respawnSeconds: 240,
};

export const PLANT_DROUGHT_CACTUS: PlantDefinition = {
  id: 'plant_drought_cactus',
  displayName: 'Drought Cactus',
  description: 'Water-storing desert plant. Tap roots reach deep underground.',
  entityClass: 'plant',
  biomes: ['void_plains'],
  textureKey: 'plant_drought_cactus',
  color: 0x228b22,
  lootTableId: 'loot_plant_drought_cactus',
  harvestYield: [
    { itemId: 'world_organic_material_common', minAmount: 1, maxAmount: 2, chance: 1.0 },
  ],
  respawnSeconds: 240,
};

export const PLANT_VOID_TREE: PlantDefinition = {
  id: 'plant_void_tree',
  displayName: 'Void Tree',
  description: 'Towering crimson tree adapted to the void plains. Its deep roots tap into underground water reserves, and its bark contains valuable organic compounds.',
  entityClass: 'plant',
  biomes: ['void_plains'],
  textureKey: 'plant_void_tree',
  color: 0x8b0000,
  lootTableId: 'loot_plant_void_tree',
  harvestYield: [
    { itemId: 'world_organic_material_common', minAmount: 2, maxAmount: 4, chance: 1.0 },
    { itemId: 'world_void_flora_sample', minAmount: 1, maxAmount: 2, chance: 0.5 },
  ],
  respawnSeconds: 360,
};

export const PLANT_GAS_POD: PlantDefinition = {
  id: 'plant_gas_pod',
  displayName: 'Gas Pod',
  description: 'Bulbous marsh plant releasing chemical vapors. Handle with care.',
  entityClass: 'plant',
  biomes: ['miasma_marshes'],
  textureKey: 'plant_gas_pod',
  color: 0x6b8e23,
  lootTableId: 'loot_plant_gas_pod',
  harvestYield: [
    { itemId: 'world_toxic_residue', minAmount: 1, maxAmount: 2, chance: 1.0 },
    { itemId: 'reagent_thermal_compound', minAmount: 1, maxAmount: 1, chance: 0.2 },
  ],
  respawnSeconds: 360,
};

export const PLANT_MOBILE_VINE: PlantDefinition = {
  id: 'plant_mobile_vine',
  displayName: 'Mobile Vine',
  description: 'Fast-growing vine of the petrified expanse. Matures before calcification.',
  entityClass: 'plant',
  biomes: ['petrified_expanse'],
  textureKey: 'plant_mobile_vine',
  color: 0x556b2f,
  lootTableId: 'loot_plant_mobile_vine',
  harvestYield: [
    { itemId: 'world_alien_flora_petrified', minAmount: 1, maxAmount: 2, chance: 1.0 },
  ],
  respawnSeconds: 180,
};

export const PLANT_THERMAL_VENT_MOSS: PlantDefinition = {
  id: 'plant_thermal_vent_moss',
  displayName: 'Thermal Vent Moss',
  description: 'Heat-resistant fungal mat surrounding geothermal vents.',
  entityClass: 'plant',
  biomes: ['volcanic_ridge'],
  textureKey: 'plant_thermal_vent_moss',
  color: 0xff6347,
  lootTableId: 'loot_plant_thermal_vent_moss',
  harvestYield: [
    { itemId: 'world_geothermal_compound', minAmount: 1, maxAmount: 2, chance: 1.0 },
    { itemId: 'reagent_thermal_compound', minAmount: 1, maxAmount: 1, chance: 0.25 },
  ],
  respawnSeconds: 420,
};

export const PLANT_LATTICE_MOSS: PlantDefinition = {
  id: 'plant_lattice_moss',
  displayName: 'Lattice Moss',
  description: 'Silicon-based moss spreading across crystal formations.',
  entityClass: 'plant',
  biomes: ['crystal_caves'],
  textureKey: 'plant_lattice_moss',
  color: 0xdda0dd,
  lootTableId: 'loot_plant_lattice_moss',
  harvestYield: [
    { itemId: 'world_crystal_fragment', minAmount: 1, maxAmount: 2, chance: 1.0 },
    { itemId: 'reagent_crystalline_dust', minAmount: 1, maxAmount: 1, chance: 0.3 },
  ],
  respawnSeconds: 480,
};

export const PLANT_ICE_ALGAE: PlantDefinition = {
  id: 'plant_ice_algae',
  displayName: 'Ice Algae',
  description: 'Hardy extremophile photosynthesizing through ice sheets.',
  entityClass: 'plant',
  biomes: ['frozen_expanse'],
  textureKey: 'plant_ice_algae',
  color: 0xafeeee,
  lootTableId: 'loot_plant_ice_algae',
  harvestYield: [
    { itemId: 'world_frozen_shard', minAmount: 1, maxAmount: 2, chance: 1.0 },
  ],
  respawnSeconds: 360,
};

export const PLANT_ACID_FERN: PlantDefinition = {
  id: 'plant_acid_fern',
  displayName: 'Acid Fern',
  description: 'Chemically aggressive plant secreting acidic compounds.',
  entityClass: 'plant',
  biomes: ['toxic_wastes'],
  textureKey: 'plant_acid_fern',
  color: 0x7fff00,
  lootTableId: 'loot_plant_acid_fern',
  harvestYield: [
    { itemId: 'world_toxic_residue', minAmount: 2, maxAmount: 4, chance: 1.0 },
  ],
  respawnSeconds: 300,
};

export const PLANT_PHASE_BLOOM: PlantDefinition = {
  id: 'plant_phase_bloom',
  displayName: 'Phase Bloom',
  description: 'Anomaly-touched flower existing partially out of phase with normal spacetime.',
  entityClass: 'plant',
  biomes: ['ancient_ruins'],
  textureKey: 'plant_phase_bloom',
  color: 0x9400d3,
  lootTableId: 'loot_plant_phase_bloom',
  harvestYield: [
    { itemId: 'reagent_quantum_residue', minAmount: 1, maxAmount: 1, chance: 0.8 },
    { itemId: 'reagent_void_essence', minAmount: 1, maxAmount: 1, chance: 0.1 },
  ],
  respawnSeconds: 900,
};

export const PLANT_STAR_LICHEN: PlantDefinition = {
  id: 'plant_star_lichen',
  displayName: 'Star Lichen',
  description: 'Cosmic-origin organism clinging to crater walls.',
  entityClass: 'plant',
  biomes: ['starfall_crater'],
  textureKey: 'plant_star_lichen',
  color: 0x483d8b,
  lootTableId: 'loot_plant_star_lichen',
  harvestYield: [
    { itemId: 'world_crater_dust', minAmount: 1, maxAmount: 2, chance: 1.0 },
    { itemId: 'reagent_quantum_residue', minAmount: 1, maxAmount: 1, chance: 0.2 },
  ],
  respawnSeconds: 600,
};

export const PLANT_TENDRIL_TREE: PlantDefinition = {
  id: 'plant_tendril_tree',
  displayName: 'Tendril Tree',
  description: 'Towering fungal tree with grasping bioluminescent tendrils. Its purple bark pulses with soft light, and green-tipped branches sway without wind.',
  entityClass: 'plant',
  biomes: ['fungal_forest'],
  textureKey: 'plant_tendril_tree',
  color: 0x7744cc,
  lootTableId: 'loot_plant_tendril_tree',
  harvestYield: [
    { itemId: 'world_alien_flora_luminous', minAmount: 2, maxAmount: 4, chance: 1.0 },
    { itemId: 'reagent_biogenic_catalyst', minAmount: 1, maxAmount: 1, chance: 0.2 },
  ],
  respawnSeconds: 360,
};

// ===== RARE VARIANTS =====
// Higher yield (1.5x), slower respawn (2x), increased bonus drop rates

export const PLANT_LUMINOUS_VINE_RARE: PlantDefinition = {
  id: 'plant_luminous_vine_rare',
  displayName: 'Luminous Vine (Rare)',
  description: 'Intensely glowing vine network. Bioluminescence visible from great distance.',
  entityClass: 'plant',
  biomes: ['fungal_forest'],
  textureKey: 'plant_luminous_vine', // Same sprite as base, rendered larger via rarity scaling
  color: 0x66ffaa, // Brighter green
  lootTableId: 'loot_plant_luminous_vine_rare',
  harvestYield: [
    { itemId: 'world_alien_flora_luminous', minAmount: 2, maxAmount: 4, chance: 1.0 }, // 1.5x (was 1-3)
    { itemId: 'reagent_biogenic_catalyst', minAmount: 1, maxAmount: 2, chance: 0.35 }, // Bonus increased
  ],
  respawnSeconds: 600, // 2x (was 300)
  rarity: 'rare',
};

export const PLANT_LATTICE_MOSS_RARE: PlantDefinition = {
  id: 'plant_lattice_moss_rare',
  displayName: 'Lattice Moss (Rare)',
  description: 'Dense silicon-based moss with intricate crystalline patterns throughout.',
  entityClass: 'plant',
  biomes: ['crystal_caves'],
  textureKey: 'plant_lattice_moss', // Same sprite as base, rendered larger via rarity scaling
  color: 0xffb0ff, // Brighter pink
  lootTableId: 'loot_plant_lattice_moss_rare',
  harvestYield: [
    { itemId: 'world_crystal_fragment', minAmount: 2, maxAmount: 3, chance: 1.0 }, // 1.5x (was 1-2)
    { itemId: 'reagent_crystalline_dust', minAmount: 1, maxAmount: 2, chance: 0.5 }, // Bonus increased
  ],
  respawnSeconds: 960, // 2x (was 480)
  rarity: 'rare',
};

export const PLANT_PHASE_BLOOM_RARE: PlantDefinition = {
  id: 'plant_phase_bloom_rare',
  displayName: 'Phase Bloom (Rare)',
  description: 'Anomaly flower in perfect quantum superposition. Reality shimmers around it.',
  entityClass: 'plant',
  biomes: ['ancient_ruins'],
  textureKey: 'plant_phase_bloom', // Same sprite as base, rendered larger via rarity scaling
  color: 0xaa00ff, // Brighter purple
  lootTableId: 'loot_plant_phase_bloom_rare',
  harvestYield: [
    { itemId: 'reagent_quantum_residue', minAmount: 2, maxAmount: 2, chance: 1.0 }, // Increased (was 1 with 0.8 chance)
    { itemId: 'reagent_void_essence', minAmount: 1, maxAmount: 1, chance: 0.25 }, // Bonus increased
  ],
  respawnSeconds: 1800, // 2x (was 900)
  rarity: 'rare',
};

// ===== PHASE 111 TIER I ADDITIONS =====

export const PLANT_VOID_FERN_RARE: PlantDefinition = {
  id: 'plant_void_fern_rare',
  displayName: 'Void Fern (Rare)',
  description: 'An unusually vibrant specimen of void fern, its fronds shimmering with concentrated void energy. These rare growths are prized by field researchers.',
  entityClass: 'plant',
  biomes: ['void_plains'],
  textureKey: 'plant_void_fern',
  color: 0x55cc88,
  lootTableId: 'loot_plant_void_fern_rare',
  harvestYield: [
    { itemId: 'world_void_flora_sample', minAmount: 2, maxAmount: 4, chance: 1.0 },
    { itemId: 'reagent_void_essence', minAmount: 1, maxAmount: 1, chance: 0.25 },
  ],
  respawnSeconds: 600,
  rarity: 'rare',
};

export const PLANT_RELIC_LICHEN: PlantDefinition = {
  id: 'plant_relic_lichen',
  displayName: 'Relic Lichen',
  description: 'Slow-growing lichen found on Ancient construction surfaces. Its metabolic processes seem to be influenced by trace energy from the ruins themselves.',
  entityClass: 'plant',
  biomes: ['ancient_ruins'],
  textureKey: 'plant_relic_lichen',
  color: 0xaaaa55,
  lootTableId: 'loot_plant_relic_lichen',
  harvestYield: [
    { itemId: 'world_ancient_fragment', minAmount: 1, maxAmount: 2, chance: 1.0 },
    { itemId: 'reagent_ancient_circuitry', minAmount: 1, maxAmount: 1, chance: 0.1 },
  ],
  respawnSeconds: 360,
};

// ===== PHASE 111 TIER II ADDITIONS =====

export const PLANT_ACID_BLOOM: PlantDefinition = {
  id: 'plant_acid_bloom',
  displayName: 'Acid Bloom',
  description: 'Bright yellow flower with petals that secrete contact acids. Toxic_wastes chemists prize these for pharmaceutical compounds.',
  entityClass: 'plant',
  biomes: ['toxic_wastes'],
  textureKey: 'plant_acid_bloom',
  color: 0xddee00,
  lootTableId: 'loot_plant_acid_bloom',
  harvestYield: [
    { itemId: 'world_toxic_residue', minAmount: 1, maxAmount: 3, chance: 1.0 },
    { itemId: 'reagent_volatile_extract', minAmount: 1, maxAmount: 1, chance: 0.2 },
  ],
  respawnSeconds: 300,
};

export const PLANT_CHEMICAL_BLOOM: PlantDefinition = {
  id: 'plant_chemical_bloom',
  displayName: 'Chemical Bloom',
  description: 'Resilient bush that thrives in chemically saturated soil. Its root system filters toxins, concentrating them in vivid red berries.',
  entityClass: 'plant',
  biomes: ['toxic_wastes', 'miasma_marshes'],
  textureKey: 'plant_chemical_bloom',
  color: 0xcc4444,
  lootTableId: 'loot_plant_chemical_bloom',
  harvestYield: [
    { itemId: 'world_toxic_residue', minAmount: 1, maxAmount: 2, chance: 1.0 },
    { itemId: 'world_organic_material_common', minAmount: 1, maxAmount: 1, chance: 0.5 },
  ],
  respawnSeconds: 300,
};

export const PLANT_ACID_BLOOM_RARE: PlantDefinition = {
  id: 'plant_acid_bloom_rare',
  displayName: 'Acid Bloom (Rare)',
  description: 'A fluorescent acid bloom radiating intense heat. The concentrated acids have etched the surrounding ground.',
  entityClass: 'plant',
  biomes: ['toxic_wastes'],
  textureKey: 'plant_acid_bloom',
  color: 0xffff33,
  lootTableId: 'loot_plant_acid_bloom_rare',
  harvestYield: [
    { itemId: 'world_toxic_residue', minAmount: 2, maxAmount: 5, chance: 1.0 },
    { itemId: 'reagent_volatile_extract', minAmount: 1, maxAmount: 1, chance: 0.4 },
  ],
  respawnSeconds: 600,
  rarity: 'rare',
};

export const PLANT_MARSH_TENDRIL: PlantDefinition = {
  id: 'plant_marsh_tendril',
  displayName: 'Marsh Tendril',
  description: 'Long, sinuous vine growing from submerged roots. Curls toward motion, suggesting a rudimentary sensory system.',
  entityClass: 'plant',
  biomes: ['miasma_marshes'],
  textureKey: 'plant_marsh_tendril',
  color: 0x446622,
  lootTableId: 'loot_plant_marsh_tendril',
  harvestYield: [
    { itemId: 'world_organic_material_common', minAmount: 1, maxAmount: 3, chance: 1.0 },
    { itemId: 'reagent_biogenic_catalyst', minAmount: 1, maxAmount: 1, chance: 0.15 },
  ],
  respawnSeconds: 300,
};

export const PLANT_GAS_POD_RARE: PlantDefinition = {
  id: 'plant_gas_pod_rare',
  displayName: 'Gas Pod (Rare)',
  description: 'An oversized gas pod straining against its own membrane. The concentrated marsh gas inside glows a sickly green.',
  entityClass: 'plant',
  biomes: ['miasma_marshes'],
  textureKey: 'plant_gas_pod',
  color: 0x88cc44,
  lootTableId: 'loot_plant_gas_pod_rare',
  harvestYield: [
    { itemId: 'world_toxic_residue', minAmount: 2, maxAmount: 4, chance: 1.0 },
    { itemId: 'reagent_volatile_extract', minAmount: 1, maxAmount: 1, chance: 0.3 },
  ],
  respawnSeconds: 600,
  rarity: 'rare',
};

export const PLANT_STONE_MOSS: PlantDefinition = {
  id: 'plant_stone_moss',
  displayName: 'Stone Moss',
  description: 'Moss colony growing on petrified surfaces, constantly shedding calcified layers to avoid hardening. The inner tissue stays defiantly green.',
  entityClass: 'plant',
  biomes: ['petrified_expanse'],
  textureKey: 'plant_stone_moss',
  color: 0x669955,
  lootTableId: 'loot_plant_stone_moss',
  harvestYield: [
    { itemId: 'world_alien_flora_petrified', minAmount: 1, maxAmount: 2, chance: 1.0 },
    { itemId: 'reagent_petrification_enzyme', minAmount: 1, maxAmount: 1, chance: 0.15 },
  ],
  respawnSeconds: 300,
};

export const PLANT_CALCITE_FERN: PlantDefinition = {
  id: 'plant_calcite_fern',
  displayName: 'Calcite Fern',
  description: 'Fern with fronds partially mineralized into translucent calcite. The living portions grow faster than the petrification front — barely.',
  entityClass: 'plant',
  biomes: ['petrified_expanse'],
  textureKey: 'plant_calcite_fern',
  color: 0xaabb88,
  lootTableId: 'loot_plant_calcite_fern',
  harvestYield: [
    { itemId: 'world_alien_flora_petrified', minAmount: 1, maxAmount: 2, chance: 1.0 },
    { itemId: 'world_organic_material_common', minAmount: 1, maxAmount: 1, chance: 0.4 },
  ],
  respawnSeconds: 320,
};

export const PLANT_MOBILE_VINE_RARE: PlantDefinition = {
  id: 'plant_mobile_vine_rare',
  displayName: 'Mobile Vine (Rare)',
  description: 'A mobile vine exhibiting unusual speed and coordination. Its root tendrils pull it across the stone with purpose, leaving glowing chemical trails.',
  entityClass: 'plant',
  biomes: ['petrified_expanse'],
  textureKey: 'plant_mobile_vine',
  color: 0x88dd66,
  lootTableId: 'loot_plant_mobile_vine_rare',
  harvestYield: [
    { itemId: 'world_alien_flora_petrified', minAmount: 2, maxAmount: 4, chance: 1.0 },
    { itemId: 'reagent_petrification_enzyme', minAmount: 1, maxAmount: 1, chance: 0.3 },
  ],
  respawnSeconds: 640,
  rarity: 'rare',
};

// ===== PHASE 88 ADDITIONS =====

export const PLANT_RARE_FUNGI: PlantDefinition = {
  id: 'plant_rare_fungi',
  displayName: 'Rare Bioluminescent Fungi',
  description: 'Exceptionally bright fungal cluster with concentrated biogenic compounds. Highly sought by Verdant researchers.',
  entityClass: 'plant',
  biomes: ['fungal_forest'],
  textureKey: 'plant_luminous_vine',
  color: 0xff44ff,
  lootTableId: 'loot_plant_rare_fungi',
  harvestYield: [
    { itemId: 'world_alien_flora_luminous', minAmount: 2, maxAmount: 4, chance: 1.0 },
    { itemId: 'reagent_biogenic_catalyst', minAmount: 1, maxAmount: 2, chance: 0.4 },
  ],
  respawnSeconds: 600,
  rarity: 'rare',
};

export const PLANT_EPIC_SPORES: PlantDefinition = {
  id: 'plant_epic_spores',
  displayName: 'Ancient Spore Cluster',
  description: 'Primordial fungal formation predating colonial settlement. Spores contain unknown genetic material of extreme scientific value.',
  entityClass: 'plant',
  biomes: ['fungal_forest'],
  textureKey: 'plant_luminous_vine',
  color: 0xff00ff,
  lootTableId: 'loot_plant_epic_spores',
  harvestYield: [
    { itemId: 'world_mycelial_fiber', minAmount: 2, maxAmount: 3, chance: 1.0 },
    { itemId: 'reagent_fungal_extract', minAmount: 1, maxAmount: 2, chance: 0.6 },
    { itemId: 'world_ancient_fragment', minAmount: 1, maxAmount: 1, chance: 0.15 },
  ],
  respawnSeconds: 900,
  rarity: 'epic',
};

export const ALL_PLANTS: readonly PlantDefinition[] = [
  PLANT_LUMINOUS_VINE,
  PLANT_VOID_FERN,
  PLANT_DROUGHT_CACTUS,
  PLANT_VOID_TREE,
  PLANT_GAS_POD,
  PLANT_MOBILE_VINE,
  PLANT_THERMAL_VENT_MOSS,
  PLANT_LATTICE_MOSS,
  PLANT_ICE_ALGAE,
  PLANT_ACID_FERN,
  PLANT_PHASE_BLOOM,
  PLANT_STAR_LICHEN,
  PLANT_TENDRIL_TREE,
  // Rare variants
  PLANT_LUMINOUS_VINE_RARE,
  PLANT_LATTICE_MOSS_RARE,
  PLANT_PHASE_BLOOM_RARE,
  // Phase 88 fungal_forest rare/epic
  PLANT_RARE_FUNGI,
  PLANT_EPIC_SPORES,
  // Phase 111 Tier I additions
  PLANT_VOID_FERN_RARE,
  PLANT_RELIC_LICHEN,
  // Phase 111 Tier II additions
  PLANT_ACID_BLOOM,
  PLANT_CHEMICAL_BLOOM,
  PLANT_ACID_BLOOM_RARE,
  PLANT_MARSH_TENDRIL,
  PLANT_GAS_POD_RARE,
  PLANT_STONE_MOSS,
  PLANT_CALCITE_FERN,
  PLANT_MOBILE_VINE_RARE,
];
