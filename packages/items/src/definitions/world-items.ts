import type { ItemDefinition } from '../types';
import { computeIlvl } from '../utils';

// ============================================================
// ANOMALY ZONE MATERIALS (1)
// ============================================================

export const WORLD_VOID_CRYSTAL: ItemDefinition = {
  id: 'world_void_crystal',
  displayName: 'Void Crystal',
  description:
    'A crystalline formation found only in Anomaly Zones. Its internal structure defies crystallographic classification — the geometry changes depending on how it is observed. High crafting and research value.',
  category: 'world-item',
  rarity: 'exotic',
  maxStack: 20,
  weight: 0.5,
  baseValue: 2000,
  requiredLevel: 25,
  ilvl: computeIlvl(3, 'exotic'),
  textureKey: 'item_world_void_crystal',
  color: 0x8800ff,
};

// ============================================================
// FUNGAL DEPTHS MATERIALS (2)
// ============================================================

export const WORLD_FUNGAL_SPORE_CLUSTER: ItemDefinition = {
  id: 'world_fungal_spore_cluster',
  displayName: 'Fungal Spore Cluster',
  description:
    'A dense cluster of spores harvested from the massive fungal organisms of the Fungal Depths. Pharmaceutical precursor for several Verdant Dynamics products. Hallucinogenic if improperly handled.',
  category: 'world-item',
  rarity: 'common',
  maxStack: 20,
  weight: 0.2,
  baseValue: 80,
  requiredLevel: 1,
  ilvl: computeIlvl(1, 'common'),
  textureKey: 'item_world_fungal_spore',
  color: 0xaa44aa,
};

export const WORLD_MYCELIAL_FIBER: ItemDefinition = {
  id: 'world_mycelial_fiber',
  displayName: 'Mycelial Fiber',
  description:
    'Strands harvested from the mycelial network of the Fungal Depths. Remarkably strong for their mass — stronger than most manufactured polymers. Used in high-grade suit reinforcement.',
  category: 'world-item',
  rarity: 'rare',
  maxStack: 20,
  weight: 0.1,
  baseValue: 350,
  requiredLevel: 5,
  ilvl: computeIlvl(2, 'rare'),
  textureKey: 'item_world_mycelial_fiber',
  color: 0xcc66cc,
};

export const WORLD_VOID_FLORA_SAMPLE: ItemDefinition = {
  id: 'world_void_flora_sample',
  displayName: 'Void Flora Sample',
  description:
    'A preserved specimen from Terminus void-adapted plant life. Contains unique biological compounds that survive in low-nutrient, high-radiation environments. Essential for Verdant biodiversity research.',
  category: 'world-item',
  rarity: 'common',
  maxStack: 20,
  weight: 0.2,
  baseValue: 70,
  requiredLevel: 1,
  ilvl: computeIlvl(1, 'common'),
  textureKey: 'item_world_void_flora_sample',
  color: 0x55aa55,
};

// ============================================================
// MIASMA MARSHES MATERIALS (1)
// ============================================================

export const WORLD_TOXIC_RESIDUE: ItemDefinition = {
  id: 'world_toxic_residue',
  displayName: 'Toxic Residue',
  description:
    'Concentrated chemical byproduct collected from Miasma Marshes decomposition pools. Dangerous to handle without filtration. Valuable as a pharmaceutical precursor and industrial solvent.',
  category: 'world-item',
  rarity: 'rare',
  maxStack: 20,
  weight: 0.4,
  baseValue: 400,
  requiredLevel: 5,
  ilvl: computeIlvl(1, 'rare'),
  textureKey: 'item_world_toxic_residue',
  color: 0x88cc00,
};

// ============================================================
// FROZEN REACHES MATERIALS (1)
// ============================================================

export const WORLD_FROZEN_SHARD: ItemDefinition = {
  id: 'world_frozen_shard',
  displayName: 'Frozen Shard',
  description:
    'Ice crystal from the Frozen Reaches containing preserved Terminus biological material. Scientific value depends on what\'s inside. Corporate buyers pay premium rates without asking for details.',
  category: 'world-item',
  rarity: 'common',
  maxStack: 20,
  weight: 0.3,
  baseValue: 120,
  requiredLevel: 1,
  ilvl: computeIlvl(1, 'common'),
  textureKey: 'item_world_frozen_shard',
  color: 0x88ccff,
};

// ============================================================
// VOLCANIC REACHES MATERIALS (2)
// ============================================================

export const WORLD_VOLCANIC_GLASS: ItemDefinition = {
  id: 'world_volcanic_glass',
  displayName: 'Volcanic Glass',
  description:
    'Obsidian formed by Terminus\'s unique volcanic chemistry. Harder and more heat-resistant than Earth obsidian due to silicon-composite mineral content. Excellent for cutting tools and thermal shielding.',
  category: 'world-item',
  rarity: 'common',
  maxStack: 20,
  weight: 0.6,
  baseValue: 100,
  requiredLevel: 1,
  ilvl: computeIlvl(1, 'common'),
  textureKey: 'item_world_volcanic_glass',
  color: 0x220011,
};

export const WORLD_GEOTHERMAL_COMPOUND: ItemDefinition = {
  id: 'world_geothermal_compound',
  displayName: 'Geothermal Compound',
  description:
    'Mineral deposit formed by geothermal pressure processes unique to Terminus\'s volcanic zones. Helix Extraction pays above-market rates for bulk quantities. No explanation provided.',
  category: 'world-item',
  rarity: 'rare',
  maxStack: 20,
  weight: 0.8,
  baseValue: 450,
  requiredLevel: 10,
  ilvl: computeIlvl(2, 'rare'),
  textureKey: 'item_world_geothermal_compound',
  color: 0xff4400,
};

// ============================================================
// CRYSTALLINE WASTES MATERIALS (1)
// ============================================================

export const WORLD_CRYSTAL_FRAGMENT: ItemDefinition = {
  id: 'world_crystal_fragment',
  displayName: 'Crystal Fragment',
  description:
    'High-purity silicon crystal from the Crystalline Wastes. Resonant properties make it valuable for communication technology, sensor arrays, and — based on Nexus purchase orders — applications they prefer not to specify.',
  category: 'world-item',
  rarity: 'epic',
  maxStack: 20,
  weight: 0.3,
  baseValue: 1500,
  requiredLevel: 15,
  ilvl: computeIlvl(2, 'epic'),
  textureKey: 'item_world_crystal_fragment',
  color: 0xeeeeff,
};

// ============================================================
// ANCIENT RUINS MATERIALS (1)
// ============================================================

export const WORLD_ANCIENT_FRAGMENT: ItemDefinition = {
  id: 'world_ancient_fragment',
  displayName: 'Ancient Fragment',
  description:
    'A component recovered from Prior Inhabitant ruins. Material composition is partially unknown — current analysis tools cannot fully characterize it. All three corporations have standing purchase orders.',
  category: 'world-item',
  rarity: 'legendary',
  maxStack: 20,
  weight: 0.2,
  baseValue: 8000,
  requiredLevel: 35,
  ilvl: computeIlvl(4, 'legendary'),
  textureKey: 'item_world_ancient_fragment',
  color: 0x44ffaa,
};

// ============================================================
// SCARRED BADLANDS MATERIALS (1)
// ============================================================

export const WORLD_CRATER_DUST: ItemDefinition = {
  id: 'world_crater_dust',
  displayName: 'Crater Dust',
  description:
    'Mineral powder collected from the exposed rock strata of the Scarred Badlands. Easy to collect, moderate value, and stackable in large quantities. The primary income source for new arrivals in Helix territory.',
  category: 'world-item',
  rarity: 'common',
  maxStack: 20,
  weight: 0.1,
  baseValue: 40,
  requiredLevel: 1,
  ilvl: computeIlvl(1, 'common'),
  textureKey: 'item_world_crater_dust',
  color: 0xcc9966,
};

// ============================================================
// ORGANIC MATERIALS (3) — biome-variant
// ============================================================

export const WORLD_ORGANIC_MATERIAL_COMMON: ItemDefinition = {
  id: 'world_organic_material_common',
  displayName: 'Organic Sample',
  description:
    'A general biological specimen from Terminus fauna or flora. Value varies based on species. Verdant Dynamics buys all quantities at standard rates as part of their "cataloging" program.',
  category: 'world-item',
  rarity: 'common',
  maxStack: 20,
  weight: 0.3,
  baseValue: 60,
  requiredLevel: 1,
  ilvl: computeIlvl(1, 'common'),
  textureKey: 'item_world_organic_material',
  color: 0x66aa44,
};

export const WORLD_ORGANIC_MATERIAL_RARE: ItemDefinition = {
  id: 'world_organic_material_rare',
  displayName: 'Rare Organic Sample',
  description:
    'A biological specimen from a less common Terminus species. Enhanced pharmaceutical potential. Verdant\'s "Nurseries" research team pays above-market rates for intact specimens.',
  category: 'world-item',
  rarity: 'rare',
  maxStack: 20,
  weight: 0.3,
  baseValue: 300,
  requiredLevel: 5,
  ilvl: computeIlvl(2, 'rare'),
  textureKey: 'item_world_organic_material',
  color: 0x88cc55,
};

export const WORLD_ORGANIC_MATERIAL_EPIC: ItemDefinition = {
  id: 'world_organic_material_epic',
  displayName: 'Apex Organic Sample',
  description:
    'Biological material from a Tier III or IV zone apex predator or unique organism. Exceptional pharmaceutical and biological engineering potential. Handle with appropriate containment.',
  category: 'world-item',
  rarity: 'epic',
  maxStack: 20,
  weight: 0.4,
  baseValue: 1200,
  requiredLevel: 15,
  ilvl: computeIlvl(3, 'epic'),
  textureKey: 'item_world_organic_material',
  color: 0xaaee66,
};

// ============================================================
// ALIEN FLORA (2)
// ============================================================

export const WORLD_ALIEN_FLORA_LUMINOUS: ItemDefinition = {
  id: 'world_alien_flora_luminous',
  displayName: 'Luminous Flora Cutting',
  description:
    'A preserved cutting from the bioluminescent plants of Luminous Canopy. The glow persists for weeks after harvest. Used in Verdant\'s "living architecture" construction and as a lighting component.',
  category: 'world-item',
  rarity: 'common',
  maxStack: 20,
  weight: 0.2,
  baseValue: 90,
  requiredLevel: 1,
  ilvl: computeIlvl(1, 'common'),
  textureKey: 'item_world_alien_flora',
  color: 0x44ffcc,
};

export const WORLD_ALIEN_FLORA_PETRIFIED: ItemDefinition = {
  id: 'world_alien_flora_petrified',
  displayName: 'Petrified Flora Sample',
  description:
    'A specimen from the Petrified Expanse, caught mid-calcification. Part organic, part mineral — a snapshot of the biome\'s primary hazard in portable form. Scientific value significant; carelessly leaving it on a desk has caused minor incidents.',
  category: 'world-item',
  rarity: 'rare',
  maxStack: 20,
  weight: 0.5,
  baseValue: 380,
  requiredLevel: 10,
  ilvl: computeIlvl(2, 'rare'),
  textureKey: 'item_world_alien_flora_petrified',
  color: 0xccaa88,
};

// ============================================================
// COASTAL SHALLOWS MATERIALS (1) — analog in void_plains
// ============================================================

export const WORLD_COASTAL_SHELL: ItemDefinition = {
  id: 'world_coastal_shell',
  displayName: 'Coastal Shell Fragment',
  description:
    'Shell fragments from Terminus marine-analog creatures. Contains calcium-analogs useful in suit reinforcement and medical compounds. New arrivals often collect these as supplemental income.',
  category: 'world-item',
  rarity: 'common',
  maxStack: 20,
  weight: 0.2,
  baseValue: 55,
  requiredLevel: 1,
  ilvl: computeIlvl(1, 'common'),
  textureKey: 'item_world_coastal_shell',
  color: 0xeeddcc,
};

// ============================================================
// LUMINOUS CANOPY MATERIALS (1) — analog in fungal_forest
// ============================================================

export const WORLD_LUMINOUS_EXTRACT: ItemDefinition = {
  id: 'world_luminous_extract',
  displayName: 'Luminous Extract',
  description:
    'Concentrated bioluminescent compound harvested from canopy flora. Glows steadily for weeks after extraction. Verdant uses it for living architecture lighting systems.',
  category: 'world-item',
  rarity: 'rare',
  maxStack: 20,
  weight: 0.15,
  baseValue: 280,
  requiredLevel: 5,
  ilvl: computeIlvl(2, 'rare'),
  textureKey: 'item_world_luminous_extract',
  color: 0x44ffaa,
};

// ============================================================
// ANOMALY ZONE MATERIALS (1)
// ============================================================

export const WORLD_TEMPORAL_SHARD: ItemDefinition = {
  id: 'world_temporal_shard',
  displayName: 'Temporal Shard',
  description:
    'A crystalline fragment that appears to exist slightly out of phase with normal time. Objects near it age at inconsistent rates. Nexus pays premium rates and asks no questions.',
  category: 'world-item',
  rarity: 'epic',
  maxStack: 20,
  weight: 0.1,
  baseValue: 1800,
  requiredLevel: 20,
  ilvl: computeIlvl(3, 'epic'),
  textureKey: 'item_world_temporal_shard',
  color: 0xaaccff,
};

// ============================================================
// DEEP FUNGAL MATERIALS (1)
// ============================================================

export const WORLD_SPORE_SACK: ItemDefinition = {
  id: 'world_spore_sack',
  displayName: 'Intact Spore Sack',
  description:
    'A complete spore reproduction structure from Fungal Depths organisms. Contains millions of dormant spores. Valuable to Verdant bioengineering programs. Handle with filtration active.',
  category: 'world-item',
  rarity: 'rare',
  maxStack: 20,
  weight: 0.3,
  baseValue: 420,
  requiredLevel: 8,
  ilvl: computeIlvl(2, 'rare'),
  textureKey: 'item_world_spore_sack',
  color: 0xbb66bb,
};

// ============================================================
// STARFALL CRATER MATERIALS (1)
// ============================================================

export const WORLD_METEOR_FRAGMENT: ItemDefinition = {
  id: 'world_meteor_fragment',
  displayName: 'Meteor Fragment',
  description:
    'A fragment of extra-Terminus material from the Starfall Crater impact site. Contains elements not found elsewhere on the planet. All three corporations maintain standing purchase orders.',
  category: 'world-item',
  rarity: 'exotic',
  maxStack: 20,
  weight: 0.4,
  baseValue: 2500,
  requiredLevel: 25,
  ilvl: computeIlvl(3, 'exotic'),
  textureKey: 'item_world_meteor_fragment',
  color: 0x334455,
};

// ============================================================
// TIER I BIOME-SPECIFIC CREATURE MATERIALS (4) — Phase 110
// ============================================================

export const WORLD_VOID_CHITIN: ItemDefinition = {
  id: 'world_void_chitin',
  displayName: 'Void Chitin',
  description:
    'Hardened carapace fragment from void-adapted creatures. Lightweight but surprisingly durable.',
  category: 'world-item',
  rarity: 'common',
  maxStack: 20,
  weight: 0.2,
  baseValue: 45,
  requiredLevel: 1,
  ilvl: computeIlvl(1, 'common'),
  textureKey: 'item_world_void_chitin',
  color: 0x5a5a6a,
};

export const WORLD_FUNGAL_MEMBRANE: ItemDefinition = {
  id: 'world_fungal_membrane',
  displayName: 'Fungal Membrane',
  description:
    'Thin biological membrane saturated with fungal compounds. Used in basic filtration systems.',
  category: 'world-item',
  rarity: 'common',
  maxStack: 20,
  weight: 0.1,
  baseValue: 40,
  requiredLevel: 1,
  ilvl: computeIlvl(1, 'common'),
  textureKey: 'item_world_fungal_membrane',
  color: 0x7a44aa,
};

export const WORLD_TIDAL_PEARL: ItemDefinition = {
  id: 'world_tidal_pearl',
  displayName: 'Tidal Pearl',
  description:
    'A pearl-like concretion formed in the gullet of tidal predators. Valued for its resonant properties.',
  category: 'world-item',
  rarity: 'rare',
  maxStack: 20,
  weight: 0.2,
  baseValue: 180,
  requiredLevel: 3,
  ilvl: computeIlvl(1, 'rare'),
  textureKey: 'item_world_tidal_pearl',
  color: 0x88ccdd,
};

export const WORLD_RUIN_SHARD: ItemDefinition = {
  id: 'world_ruin_shard',
  displayName: 'Ruin Shard',
  description:
    'A fragment of Ancient construction material recovered from creature nests. Still faintly warm to the touch.',
  category: 'world-item',
  rarity: 'rare',
  maxStack: 20,
  weight: 0.3,
  baseValue: 220,
  requiredLevel: 3,
  ilvl: computeIlvl(1, 'rare'),
  textureKey: 'item_world_ruin_shard',
  color: 0xcc9944,
};

// ============================================================
// TIER II TOXIC WASTES MATERIALS (3) — Phase 110
// ============================================================

export const WORLD_CORROSIVE_CARAPACE: ItemDefinition = {
  id: 'world_corrosive_carapace',
  displayName: 'Corrosive Carapace',
  description:
    'Acid-resistant shell fragment from toxic_wastes creatures. Industrial applications as a corrosion barrier.',
  category: 'world-item',
  rarity: 'rare',
  maxStack: 20,
  weight: 0.3,
  baseValue: 280,
  requiredLevel: 8,
  ilvl: computeIlvl(2, 'rare'),
  textureKey: 'item_world_corrosive_carapace',
  color: 0x99aa00,
};

export const WORLD_SLUDGE_MEMBRANE: ItemDefinition = {
  id: 'world_sludge_membrane',
  displayName: 'Sludge Membrane',
  description:
    'Translucent membrane harvested from sludge-dwelling creatures. Naturally filters chemical contaminants.',
  category: 'world-item',
  rarity: 'common',
  maxStack: 20,
  weight: 0.1,
  baseValue: 65,
  requiredLevel: 7,
  ilvl: computeIlvl(2, 'common'),
  textureKey: 'item_world_sludge_membrane',
  color: 0x667744,
};

export const WORLD_ACID_GLAND: ItemDefinition = {
  id: 'world_acid_gland',
  displayName: 'Acid Gland',
  description:
    'Intact acid-producing organ from a toxic_wastes predator. Extremely corrosive if ruptured. Handle with filtration gear active.',
  category: 'world-item',
  rarity: 'rare',
  maxStack: 10,
  weight: 0.4,
  baseValue: 380,
  requiredLevel: 10,
  ilvl: computeIlvl(2, 'rare'),
  textureKey: 'item_world_acid_gland',
  color: 0xbbcc00,
};

// ============================================================
// ALL WORLD ITEMS
// ============================================================

export const ALL_WORLD_ITEMS: readonly ItemDefinition[] = [
  WORLD_VOID_CRYSTAL,
  WORLD_FUNGAL_SPORE_CLUSTER,
  WORLD_MYCELIAL_FIBER,
  WORLD_VOID_FLORA_SAMPLE,
  WORLD_TOXIC_RESIDUE,
  WORLD_FROZEN_SHARD,
  WORLD_VOLCANIC_GLASS,
  WORLD_GEOTHERMAL_COMPOUND,
  WORLD_CRYSTAL_FRAGMENT,
  WORLD_ANCIENT_FRAGMENT,
  WORLD_CRATER_DUST,
  WORLD_ORGANIC_MATERIAL_COMMON,
  WORLD_ORGANIC_MATERIAL_RARE,
  WORLD_ORGANIC_MATERIAL_EPIC,
  WORLD_ALIEN_FLORA_LUMINOUS,
  WORLD_ALIEN_FLORA_PETRIFIED,
  WORLD_COASTAL_SHELL,
  WORLD_LUMINOUS_EXTRACT,
  WORLD_TEMPORAL_SHARD,
  WORLD_SPORE_SACK,
  WORLD_METEOR_FRAGMENT,
  // Phase 110 Tier I biome-specific creature materials
  WORLD_VOID_CHITIN,
  WORLD_FUNGAL_MEMBRANE,
  WORLD_TIDAL_PEARL,
  WORLD_RUIN_SHARD,
  // Phase 110 Tier II toxic_wastes materials
  WORLD_CORROSIVE_CARAPACE,
  WORLD_SLUDGE_MEMBRANE,
  WORLD_ACID_GLAND,
];
