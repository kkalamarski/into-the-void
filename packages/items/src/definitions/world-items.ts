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
  maxStack: 99,
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
  maxStack: 99,
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
  maxStack: 99,
  weight: 0.1,
  baseValue: 350,
  requiredLevel: 5,
  ilvl: computeIlvl(2, 'rare'),
  textureKey: 'item_world_mycelial_fiber',
  color: 0xcc66cc,
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
  maxStack: 99,
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
  maxStack: 99,
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
  maxStack: 99,
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
  maxStack: 99,
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
  maxStack: 99,
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
  maxStack: 99,
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
  maxStack: 99,
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
  maxStack: 99,
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
  maxStack: 99,
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
  maxStack: 99,
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
  maxStack: 99,
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
  maxStack: 99,
  weight: 0.5,
  baseValue: 380,
  requiredLevel: 10,
  ilvl: computeIlvl(2, 'rare'),
  textureKey: 'item_world_alien_flora_petrified',
  color: 0xccaa88,
};

// ============================================================
// ALL WORLD ITEMS
// ============================================================

export const ALL_WORLD_ITEMS: readonly ItemDefinition[] = [
  WORLD_VOID_CRYSTAL,
  WORLD_FUNGAL_SPORE_CLUSTER,
  WORLD_MYCELIAL_FIBER,
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
];
