/**
 * Faction Suit Design Reference
 * @see packages/items/FACTION-IDENTITY.md for:
 *   - Stat archetypes per faction (primary/secondary/off-archetype)
 *   - Ability assignment matrix (which abilities at which tier)
 *   - Naming conventions ({type}_{faction}_{name}_{rarity})
 *   - Color palette anchors per faction
 *   - Tier progression table
 */

import type { ItemDefinition } from '../types';
import { computeIlvl, generateSuitStats } from '../utils';

/**
 * Suit Archetype Classifications (Phase 63)
 *
 * tank: Heavy protection focus (durability/toughness/resilience)
 * scout: Mobility and awareness (haste/perception/vigor)
 * combat: Offensive capability (power/haste/toughness)
 * balanced: Even distribution across all stats
 * hazmat: Environmental survival (resilience/recovery/durability)
 * assault: Glass cannon offense (power/durability/haste)
 * recon: Scout variant with perception focus
 * scavenger: Survival versatility (vigor/recovery/perception) -- Unaffiliated
 */

// ============================================================
// COMMON SUITS (6)
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
    { trigger: 'on_equip', effect: { type: 'stats', ...generateSuitStats('balanced', 'common', 1) } },
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
  effects: [
    { trigger: 'on_equip', effect: { type: 'stats', ...generateSuitStats('balanced', 'common', 1) } },
  ],
  grantedAbilities: ['emergency_shield'],
};

// Level 10 common suit (tier 1 - levels 1-10)
export const SUIT_WORKER_COMMON: ItemDefinition = {
  id: 'suit_worker_common',
  displayName: "Worker's Exo-Suit",
  description:
    'A rugged suit designed for extended field operations. Popular among independent contractors who need reliability over features.',
  category: 'suit',
  rarity: 'common',
  maxStack: 1,
  weight: 9.0,
  baseValue: 1200,
  requiredLevel: 10,
  ilvl: computeIlvl(2, 'common'),
  textureKey: 'item_suit_basic',
  color: 0x777766,
  equipSlot: 'exosuit',
  moduleSlots: 3,
  effects: [
    { trigger: 'on_equip', effect: { type: 'stats', ...generateSuitStats('balanced', 'common', 1) } },
  ],
  grantedAbilities: ['nano_repair'],
};

// Level 20 common suit (tier 2 - levels 11-20)
export const SUIT_INDUSTRIAL_COMMON: ItemDefinition = {
  id: 'suit_industrial_common',
  displayName: 'Industrial Exo-Suit',
  description:
    'Heavy-duty corporate work suit. Built to withstand the rigors of Terminus industrial operations without expensive maintenance.',
  category: 'suit',
  rarity: 'common',
  maxStack: 1,
  weight: 10.0,
  baseValue: 3500,
  requiredLevel: 20,
  ilvl: computeIlvl(3, 'common'),
  textureKey: 'item_suit_reinforced',
  color: 0x666655,
  equipSlot: 'exosuit',
  moduleSlots: 4,
  effects: [
    { trigger: 'on_equip', effect: { type: 'stats', ...generateSuitStats('tank', 'common', 2) } },
  ],
  grantedAbilities: ['nano_repair', 'emergency_shield'],
};

// Level 30 common suit (tier 3 - levels 21-30)
export const SUIT_VETERAN_COMMON: ItemDefinition = {
  id: 'suit_veteran_common',
  displayName: "Veteran's Exo-Suit",
  description:
    'A proven design favored by experienced operatives. Nothing flashy, but it keeps you alive in situations that would kill a rookie.',
  category: 'suit',
  rarity: 'common',
  maxStack: 1,
  weight: 9.5,
  baseValue: 8000,
  requiredLevel: 30,
  ilvl: computeIlvl(4, 'common'),
  textureKey: 'item_suit_tactical',
  color: 0x555544,
  equipSlot: 'exosuit',
  moduleSlots: 4,
  effects: [
    { trigger: 'on_equip', effect: { type: 'stats', ...generateSuitStats('balanced', 'common', 3) } },
  ],
  grantedAbilities: ['nano_repair', 'emergency_shield', 'magnetic_field'],
};

// Level 40 common suit (tier 4 - levels 31-40)
export const SUIT_HARDENED_COMMON: ItemDefinition = {
  id: 'suit_hardened_common',
  displayName: 'Hardened Exo-Suit',
  description:
    'The pinnacle of standard-issue suit technology. Mass-produced but effective — corporations issue these to their most valuable non-specialist personnel.',
  category: 'suit',
  rarity: 'common',
  maxStack: 1,
  weight: 9.0,
  baseValue: 18000,
  requiredLevel: 40,
  ilvl: computeIlvl(5, 'common'),
  textureKey: 'item_suit_tactical',
  color: 0x444433,
  equipSlot: 'exosuit',
  moduleSlots: 5,
  effects: [
    { trigger: 'on_equip', effect: { type: 'stats', ...generateSuitStats('tank', 'common', 4) } },
  ],
  grantedAbilities: ['nano_repair', 'emergency_shield', 'magnetic_field', 'fortify_systems'],
};

// ============================================================
// RARE SUITS (7)
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
  effects: [
    { trigger: 'on_equip', effect: { type: 'stats', ...generateSuitStats('tank', 'rare', 1) } },
  ],
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
  effects: [
    { trigger: 'on_equip', effect: { type: 'stats', ...generateSuitStats('scout', 'rare', 1) } },
  ],
  grantedAbilities: ['nano_repair', 'overclock'],
};

// Level 15 rare suit (tier 2 - levels 11-20)
export const SUIT_FIELD_OPERATIVE_RARE: ItemDefinition = {
  id: 'suit_field_operative_rare',
  displayName: 'Field Operative Suit',
  description:
    'Standard field equipment for corporate operatives. Balanced protection and mobility for personnel expected to handle varied situations.',
  category: 'suit',
  rarity: 'rare',
  maxStack: 1,
  weight: 8.5,
  baseValue: 4500,
  requiredLevel: 15,
  ilvl: computeIlvl(2, 'rare'),
  textureKey: 'item_suit_scout',
  color: 0x4a5a6a,
  equipSlot: 'exosuit',
  moduleSlots: 4,
  effects: [
    { trigger: 'on_equip', effect: { type: 'stats', ...generateSuitStats('balanced', 'rare', 2) } },
  ],
  grantedAbilities: ['nano_repair', 'overclock'],
};

// Level 25 rare suit (tier 3 - levels 21-30)
export const SUIT_EXPEDITION_RARE: ItemDefinition = {
  id: 'suit_expedition_rare',
  displayName: 'Expedition Exo-Suit',
  description:
    'Designed for extended operations in Tier II-III zones. Self-contained life support and reinforced joints for rough terrain navigation.',
  category: 'suit',
  rarity: 'rare',
  maxStack: 1,
  weight: 10.0,
  baseValue: 12000,
  requiredLevel: 25,
  ilvl: computeIlvl(3, 'rare'),
  textureKey: 'item_suit_environmental',
  color: 0x5a6a5a,
  equipSlot: 'exosuit',
  moduleSlots: 4,
  effects: [
    { trigger: 'on_equip', effect: { type: 'stats', ...generateSuitStats('tank', 'rare', 3) } },
  ],
  grantedAbilities: ['nano_repair', 'energy_barrier', 'regeneration_protocol'],
};

// Level 35 rare suit (tier 4 - levels 31-40)
export const SUIT_ELITE_FIELD_RARE: ItemDefinition = {
  id: 'suit_elite_field_rare',
  displayName: 'Elite Field Suit',
  description:
    'Top-tier field equipment issued to senior corporate personnel. Represents the best that mass production can achieve.',
  category: 'suit',
  rarity: 'rare',
  maxStack: 1,
  weight: 9.0,
  baseValue: 25000,
  requiredLevel: 35,
  ilvl: computeIlvl(4, 'rare'),
  textureKey: 'item_suit_tactical',
  color: 0x4a5a7a,
  equipSlot: 'exosuit',
  moduleSlots: 5,
  effects: [
    { trigger: 'on_equip', effect: { type: 'stats', ...generateSuitStats('combat', 'rare', 4) } },
  ],
  grantedAbilities: ['nano_repair', 'magnetic_field', 'fortify_systems'],
};

// Level 45 rare suit (tier 5 - levels 41-50)
export const SUIT_MASTER_RARE: ItemDefinition = {
  id: 'suit_master_rare',
  displayName: "Master's Exo-Suit",
  description:
    'The finest conventional suit available through standard corporate channels. Only issued to operatives with proven track records.',
  category: 'suit',
  rarity: 'rare',
  maxStack: 1,
  weight: 8.5,
  baseValue: 45000,
  requiredLevel: 45,
  ilvl: computeIlvl(5, 'rare'),
  textureKey: 'item_suit_tactical',
  color: 0x3a4a6a,
  equipSlot: 'exosuit',
  moduleSlots: 5,
  effects: [
    { trigger: 'on_equip', effect: { type: 'stats', ...generateSuitStats('combat', 'rare', 5) } },
  ],
  grantedAbilities: ['nano_repair', 'magnetic_field', 'fortify_systems', 'emergency_shield'],
};

// ============================================================
// EPIC SUITS (4)
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
  effects: [
    { trigger: 'on_equip', effect: { type: 'stats', ...generateSuitStats('combat', 'epic', 2) } },
  ],
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
  effects: [
    { trigger: 'on_equip', effect: { type: 'stats', ...generateSuitStats('hazmat', 'epic', 2) } },
  ],
  grantedAbilities: ['nano_repair', 'energy_barrier', 'regeneration_protocol'],
};

// ============================================================
// EXOTIC SUITS (3)
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
  effects: [
    { trigger: 'on_equip', effect: { type: 'stats', ...generateSuitStats('combat', 'exotic', 3) } },
  ],
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
  effects: [
    { trigger: 'on_equip', effect: { type: 'stats', ...generateSuitStats('recon', 'exotic', 3) } },
  ],
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
  effects: [
    { trigger: 'on_equip', effect: { type: 'stats', ...generateSuitStats('scout', 'legendary', 4) } },
  ],
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
  effects: [
    { trigger: 'on_equip', effect: { type: 'stats', ...generateSuitStats('balanced', 'legendary', 4) } },
  ],
  grantedAbilities: ['nano_repair', 'regeneration_protocol', 'energy_barrier', 'overclock', 'analyze_specimen'],
};

// ============================================================
// SPECIALIZED SUITS (4) — unique defensive ability combinations
// ============================================================

export const SUIT_HAZMAT_RARE: ItemDefinition = {
  id: 'suit_hazmat_rare',
  displayName: 'Hazmat Response Suit',
  description:
    'A sealed containment suit rated for Miasma Marshes and toxic industrial zones. The integrated barrier system was designed after too many extraction teams didn\'t come back.',
  category: 'suit',
  rarity: 'rare',
  maxStack: 1,
  weight: 9.0,
  baseValue: 3000,
  requiredLevel: 8,
  ilvl: computeIlvl(1, 'rare'),
  textureKey: 'item_suit_environmental',
  color: 0x88aa44,
  equipSlot: 'exosuit',
  moduleSlots: 4,
  effects: [
    { trigger: 'on_equip', effect: { type: 'stats', ...generateSuitStats('hazmat', 'rare', 1) } },
  ],
  grantedAbilities: ['energy_barrier', 'regeneration_protocol'],
};

export const SUIT_ASSAULT_FRAME_EPIC: ItemDefinition = {
  id: 'suit_assault_frame_epic',
  displayName: 'Assault Frame Mk.III',
  description:
    'A Nexus Frontiers combat frame optimized for offensive operations. Where most suits emphasize survival, the Assault Frame emphasizes ensuring the other side doesn\'t survive.',
  category: 'suit',
  rarity: 'epic',
  maxStack: 1,
  weight: 10.0,
  baseValue: 15000,
  requiredLevel: 18,
  ilvl: computeIlvl(2, 'epic'),
  textureKey: 'item_suit_tactical',
  color: 0x4444aa,
  equipSlot: 'exosuit',
  moduleSlots: 4,
  effects: [
    { trigger: 'on_equip', effect: { type: 'stats', ...generateSuitStats('assault', 'epic', 2) } },
  ],
  grantedAbilities: ['emergency_shield', 'power_surge', 'fortify_systems'],
};

export const SUIT_STALKER_RECON_EPIC: ItemDefinition = {
  id: 'suit_stalker_recon_epic',
  displayName: 'Stalker Reconnaissance Suit',
  description:
    'Developed for long-range reconnaissance in hostile territory. The enhanced sensors and sustained mobility systems allow operatives to observe without being observed — usually.',
  category: 'suit',
  rarity: 'epic',
  maxStack: 1,
  weight: 7.0,
  baseValue: 15000,
  requiredLevel: 20,
  ilvl: computeIlvl(2, 'epic'),
  textureKey: 'item_suit_scout',
  color: 0x3d5a3d,
  equipSlot: 'exosuit',
  moduleSlots: 4,
  effects: [
    { trigger: 'on_equip', effect: { type: 'stats', ...generateSuitStats('recon', 'epic', 2) } },
  ],
  grantedAbilities: ['nano_repair', 'overclock', 'resource_scan', 'analyze_specimen'],
};

export const SUIT_TERMINUS_ADAPTATION_EXOTIC: ItemDefinition = {
  id: 'suit_terminus_adaptation_exotic',
  displayName: 'Terminus Adaptation Suit',
  description:
    'A suit that seems to respond to Terminus itself. Recovered from a sealed Prior Inhabitant cache, it incorporates materials that resist Anomaly effects. Wearing it produces unusual dreams.',
  category: 'suit',
  rarity: 'exotic',
  maxStack: 1,
  weight: 8.0,
  baseValue: 40000,
  requiredLevel: 28,
  ilvl: computeIlvl(3, 'exotic'),
  textureKey: 'item_suit_ancient_prototype',
  color: 0x2a4a4a,
  equipSlot: 'exosuit',
  moduleSlots: 5,
  effects: [
    { trigger: 'on_equip', effect: { type: 'stats', ...generateSuitStats('balanced', 'exotic', 3) } },
  ],
  grantedAbilities: ['nano_repair', 'regeneration_protocol', 'magnetic_field', 'power_surge'],
};

// ============================================================
// ALL SUITS
// ============================================================

export const ALL_SUITS: readonly ItemDefinition[] = [
  SUIT_BASIC_COMMON,
  SUIT_SALVAGED_COMMON,
  SUIT_WORKER_COMMON,
  SUIT_INDUSTRIAL_COMMON,
  SUIT_VETERAN_COMMON,
  SUIT_HARDENED_COMMON,
  SUIT_REINFORCED_RARE,
  SUIT_SCOUT_RARE,
  SUIT_HAZMAT_RARE,
  SUIT_FIELD_OPERATIVE_RARE,
  SUIT_EXPEDITION_RARE,
  SUIT_ELITE_FIELD_RARE,
  SUIT_MASTER_RARE,
  SUIT_TACTICAL_EPIC,
  SUIT_ENVIRONMENTAL_EPIC,
  SUIT_ASSAULT_FRAME_EPIC,
  SUIT_STALKER_RECON_EPIC,
  SUIT_NEXUS_COMBAT_FRAME_EXOTIC,
  SUIT_HELIX_RESEARCH_FRAME_EXOTIC,
  SUIT_TERMINUS_ADAPTATION_EXOTIC,
  SUIT_VOID_WALKER_LEGENDARY,
  SUIT_ANCIENT_PROTOTYPE_LEGENDARY,
];
