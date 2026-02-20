import type { ItemDefinition } from '../types';
import { computeIlvl } from '../utils';

// ============================================================
// COMMON SUITS (2)
// ============================================================

export const SUIT_BASIC_COMMON: ItemDefinition = {
  id: 'suit_basic_common',
  displayName: 'Basic Exo-Suit',
  description:
    'Standard-issue survival suit issued to all new arrivals on Terminus. Provides minimal environmental protection against Tier I biome hazards.',
  category: 'suit',
  rarity: 'common',
  maxStack: 1,
  weight: 8.0,
  baseValue: 500,
  requiredLevel: 1,
  ilvl: computeIlvl(1, 'common'),
  textureKey: 'item_suit_basic',
  color: 0x666666,
  equipSlot: 'exosuit',
  moduleSlots: 3,
  effects: [
    { trigger: 'on_equip', effect: { type: 'armor', value: 5 } },
    { trigger: 'on_equip', effect: { type: 'stat_buff', stat: 'durability', amount: 20, duration: 0 } },
  ],
  grantedAbilities: ['nano_repair'],
};

export const SUIT_SALVAGED_COMMON: ItemDefinition = {
  id: 'suit_salvaged_common',
  displayName: 'Salvaged Exo-Suit',
  description:
    'A patchwork suit assembled from recovered parts. Functional but worn — held together by field repairs and optimism.',
  category: 'suit',
  rarity: 'common',
  maxStack: 1,
  weight: 9.5,
  baseValue: 400,
  requiredLevel: 1,
  ilvl: computeIlvl(1, 'common'),
  textureKey: 'item_suit_salvaged',
  color: 0x7a6040,
  equipSlot: 'exosuit',
  moduleSlots: 3,
  effects: [],
  grantedAbilities: ['emergency_shield'],
};

// ============================================================
// RARE SUITS (2)
// ============================================================

export const SUIT_REINFORCED_RARE: ItemDefinition = {
  id: 'suit_reinforced_rare',
  displayName: 'Reinforced Exo-Suit',
  description:
    'A heavy-duty suit with layered composite plating. Built for Tier II hazard zones, favored by Helix Extraction field teams.',
  category: 'suit',
  rarity: 'rare',
  maxStack: 1,
  weight: 11.0,
  baseValue: 2000,
  requiredLevel: 5,
  ilvl: computeIlvl(1, 'rare'),
  textureKey: 'item_suit_reinforced',
  color: 0x4a6080,
  equipSlot: 'exosuit',
  moduleSlots: 4,
  effects: [],
  grantedAbilities: ['nano_repair', 'magnetic_field'],
};

export const SUIT_SCOUT_RARE: ItemDefinition = {
  id: 'suit_scout_rare',
  displayName: 'Scout Exo-Suit',
  description:
    'A lightweight suit optimized for mobility and stealth. Used by Nexus Frontiers intelligence operatives and frontier explorers.',
  category: 'suit',
  rarity: 'rare',
  maxStack: 1,
  weight: 6.5,
  baseValue: 2200,
  requiredLevel: 5,
  ilvl: computeIlvl(1, 'rare'),
  textureKey: 'item_suit_scout',
  color: 0x3d5a3d,
  equipSlot: 'exosuit',
  moduleSlots: 4,
  effects: [],
  grantedAbilities: ['nano_repair', 'overclock'],
};

// ============================================================
// EPIC SUITS (2)
// ============================================================

export const SUIT_TACTICAL_EPIC: ItemDefinition = {
  id: 'suit_tactical_epic',
  displayName: 'Tactical Exo-Suit',
  description:
    'Military-grade exo-suit with integrated targeting assist and reactive plating. Deployed in contested frontier zones where shadow war skirmishes are routine.',
  category: 'suit',
  rarity: 'epic',
  maxStack: 1,
  weight: 10.0,
  baseValue: 8000,
  requiredLevel: 15,
  ilvl: computeIlvl(2, 'epic'),
  textureKey: 'item_suit_tactical',
  color: 0x2a3a5a,
  equipSlot: 'exosuit',
  moduleSlots: 4,
  effects: [],
  grantedAbilities: ['nano_repair', 'magnetic_field', 'fortify_systems'],
};

export const SUIT_ENVIRONMENTAL_EPIC: ItemDefinition = {
  id: 'suit_environmental_epic',
  displayName: 'Environmental Exo-Suit',
  description:
    'A Verdant Dynamics research-grade suit with advanced biome filtration and chemical resistance. Rated for Tier III hazard zones including Miasma Marshes and Fungal Depths.',
  category: 'suit',
  rarity: 'epic',
  maxStack: 1,
  weight: 8.5,
  baseValue: 8500,
  requiredLevel: 15,
  ilvl: computeIlvl(2, 'epic'),
  textureKey: 'item_suit_environmental',
  color: 0x2a5a2a,
  equipSlot: 'exosuit',
  moduleSlots: 4,
  effects: [],
  grantedAbilities: ['nano_repair', 'energy_barrier', 'regeneration_protocol'],
};

// ============================================================
// EXOTIC SUITS (2)
// ============================================================

export const SUIT_NEXUS_COMBAT_FRAME_EXOTIC: ItemDefinition = {
  id: 'suit_nexus_combat_frame_exotic',
  displayName: 'Nexus Combat Frame',
  description:
    'A proprietary Nexus Frontiers combat exo-frame with adaptive plating that reconfigures based on threat analysis. Extremely rare — reserved for senior operatives.',
  category: 'suit',
  rarity: 'exotic',
  maxStack: 1,
  weight: 9.0,
  baseValue: 30000,
  requiredLevel: 25,
  ilvl: computeIlvl(3, 'exotic'),
  textureKey: 'item_suit_nexus_combat',
  color: 0x1a2a4a,
  equipSlot: 'exosuit',
  moduleSlots: 5,
  effects: [],
  grantedAbilities: ['nano_repair', 'magnetic_field', 'fortify_systems', 'emergency_shield'],
};

export const SUIT_HELIX_RESEARCH_FRAME_EXOTIC: ItemDefinition = {
  id: 'suit_helix_research_frame_exotic',
  displayName: 'Helix Research Frame',
  description:
    'A Helix Extraction experimental suit designed for deep-site Ancient ruin exploration. Incorporates partial PI (Prior Inhabitant) material shielding — how Helix acquired PI materials is classified.',
  category: 'suit',
  rarity: 'exotic',
  maxStack: 1,
  weight: 10.5,
  baseValue: 32000,
  requiredLevel: 25,
  ilvl: computeIlvl(3, 'exotic'),
  textureKey: 'item_suit_helix_research',
  color: 0x4a1a1a,
  equipSlot: 'exosuit',
  moduleSlots: 5,
  effects: [],
  grantedAbilities: ['nano_repair', 'energy_barrier', 'regeneration_protocol', 'resource_scan'],
};

// ============================================================
// LEGENDARY SUITS (2)
// ============================================================

export const SUIT_VOID_WALKER_LEGENDARY: ItemDefinition = {
  id: 'suit_void_walker_legendary',
  displayName: 'Void Walker Suit',
  description:
    'An extraordinary suit forged using anomaly-processed alloys from Terminus\'s extreme zones. Believed to partially resist temporal distortions. Only a handful exist. The corporations deny knowing how they were made.',
  category: 'suit',
  rarity: 'legendary',
  maxStack: 1,
  weight: 8.0,
  baseValue: 100000,
  requiredLevel: 35,
  ilvl: computeIlvl(4, 'legendary'),
  textureKey: 'item_suit_void_walker',
  color: 0x0a0a2a,
  equipSlot: 'exosuit',
  moduleSlots: 6,
  effects: [],
  grantedAbilities: ['nano_repair', 'magnetic_field', 'fortify_systems', 'emergency_shield', 'power_surge'],
};

export const SUIT_ANCIENT_PROTOTYPE_LEGENDARY: ItemDefinition = {
  id: 'suit_ancient_prototype_legendary',
  displayName: 'Ancient Prototype Suit',
  description:
    'A recovered Prior Inhabitant exo-suit, incompletely deciphered and carefully re-fitted for human anatomy. Proportions feel subtly wrong — the Ancients were not quite our shape. Its full capabilities remain unknown.',
  category: 'suit',
  rarity: 'legendary',
  maxStack: 1,
  weight: 6.0,
  baseValue: 150000,
  requiredLevel: 40,
  ilvl: computeIlvl(4, 'legendary'),
  textureKey: 'item_suit_ancient_prototype',
  color: 0x1a3a3a,
  equipSlot: 'exosuit',
  moduleSlots: 6,
  effects: [],
  grantedAbilities: ['nano_repair', 'regeneration_protocol', 'energy_barrier', 'overclock', 'analyze_specimen'],
};

// ============================================================
// ALL SUITS
// ============================================================

export const ALL_SUITS: readonly ItemDefinition[] = [
  SUIT_BASIC_COMMON,
  SUIT_SALVAGED_COMMON,
  SUIT_REINFORCED_RARE,
  SUIT_SCOUT_RARE,
  SUIT_TACTICAL_EPIC,
  SUIT_ENVIRONMENTAL_EPIC,
  SUIT_NEXUS_COMBAT_FRAME_EXOTIC,
  SUIT_HELIX_RESEARCH_FRAME_EXOTIC,
  SUIT_VOID_WALKER_LEGENDARY,
  SUIT_ANCIENT_PROTOTYPE_LEGENDARY,
];
