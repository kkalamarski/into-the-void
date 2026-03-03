/**
 * Faction Suit Definitions (Phase 112)
 *
 * 28 faction suits across 4 factions (7 each: 5 main ladder + 2 off-archetype).
 * All stats generated via generateSuitStats() -- no hand-coded stat values.
 *
 * @see packages/items/FACTION-IDENTITY.md for:
 *   - Stat archetypes per faction (Section 1)
 *   - Ability assignment matrix (Section 2)
 *   - Naming conventions (Section 3)
 *   - Color palette anchors (Section 4)
 *   - Suit count and structure (Section 6)
 */

import type { ItemDefinition } from '../types';
import { computeIlvl, generateSuitStats } from '../utils';

// ============================================================
// VERDANT DYNAMICS — Main Ladder (5)
// ============================================================

export const SUIT_VERDANT_BIOWEAVE_COMMON: ItemDefinition = {
  id: 'suit_verdant_bioweave_common',
  displayName: 'Bioweave Exo-Suit',
  description:
    'Standard-issue Verdant Dynamics environmental suit woven from synthetic cellulose fibers. Issued to all new research personnel upon completing orientation protocols. Moderate protection across all operational parameters.',
  category: 'suit',
  rarity: 'common',
  maxStack: 1,
  weight: 7.5,
  baseValue: 600,
  requiredLevel: 1,
  ilvl: computeIlvl(1, 'common'),
  textureKey: 'item_suit_verdant_common',
  color: 0x235f2f,
  equipSlot: 'exosuit',
  moduleSlots: 3,
  effects: [
    { trigger: 'on_equip', effect: { type: 'stats', ...generateSuitStats('balanced', 'common', 1) } },
  ],
  grantedAbilities: ['nano_repair'],
};

export const SUIT_VERDANT_CHLORO_RARE: ItemDefinition = {
  id: 'suit_verdant_chloro_rare',
  displayName: 'Chloro-Filtration Suit',
  description:
    'Verdant Dynamics hazardous-environment suit integrating chlorophyll-membrane filtration layers. Deployed to field researchers operating in contaminated zones where atmospheric particulates exceed baseline tolerances by 300%.',
  category: 'suit',
  rarity: 'rare',
  maxStack: 1,
  weight: 7.0,
  baseValue: 2200,
  requiredLevel: 11,
  ilvl: computeIlvl(2, 'rare'),
  textureKey: 'item_suit_verdant_rare',
  color: 0x2a7a3a,
  equipSlot: 'exosuit',
  moduleSlots: 4,
  effects: [
    { trigger: 'on_equip', effect: { type: 'stats', ...generateSuitStats('hazmat', 'rare', 2) } },
  ],
  grantedAbilities: ['energy_barrier', 'regeneration_protocol'],
};

export const SUIT_VERDANT_SYMBIONT_EPIC: ItemDefinition = {
  id: 'suit_verdant_symbiont_epic',
  displayName: 'Symbiont Exo-Frame',
  description:
    'Advanced Verdant Dynamics bio-integrated frame incorporating symbiotic micro-organisms within the suit membrane. The living filtration system actively metabolizes hazardous compounds, converting environmental toxins into supplemental energy for the operator.',
  category: 'suit',
  rarity: 'epic',
  maxStack: 1,
  weight: 7.5,
  baseValue: 9000,
  requiredLevel: 21,
  ilvl: computeIlvl(3, 'epic'),
  textureKey: 'item_suit_verdant_epic',
  color: 0x2f8a40,
  equipSlot: 'exosuit',
  moduleSlots: 4,
  effects: [
    { trigger: 'on_equip', effect: { type: 'stats', ...generateSuitStats('hazmat', 'epic', 3) } },
  ],
  grantedAbilities: ['energy_barrier', 'regeneration_protocol', 'nano_repair'],
};

export const SUIT_VERDANT_MYCELIAL_EXOTIC: ItemDefinition = {
  id: 'suit_verdant_mycelial_exotic',
  displayName: 'Mycelial Integration Suit',
  description:
    'Classified Verdant Dynamics prototype utilizing a mycelial neural network threaded throughout the suit substrate. The fungal mesh provides real-time environmental analysis while distributing impact energy across the entire surface area. Requisition requires Level 4 clearance.',
  category: 'suit',
  rarity: 'exotic',
  maxStack: 1,
  weight: 7.0,
  baseValue: 35000,
  requiredLevel: 31,
  ilvl: computeIlvl(4, 'exotic'),
  textureKey: 'item_suit_verdant_exotic',
  color: 0x349949,
  equipSlot: 'exosuit',
  moduleSlots: 5,
  effects: [
    { trigger: 'on_equip', effect: { type: 'stats', ...generateSuitStats('hazmat', 'exotic', 4) } },
  ],
  grantedAbilities: ['energy_barrier', 'regeneration_protocol', 'nano_repair', 'analyze_specimen'],
};

export const SUIT_VERDANT_CANOPY_SOVEREIGN_LEGENDARY: ItemDefinition = {
  id: 'suit_verdant_canopy_sovereign_legendary',
  displayName: 'The Canopy Sovereign',
  description:
    'The culmination of Verdant Dynamics bio-engineering research. Fewer than forty Canopy Sovereign units were ever completed, each requiring seven months of controlled cultivation. The living exo-frame achieves full environmental symbiosis -- the operator does not wear the suit so much as the suit accepts the operator.',
  category: 'suit',
  rarity: 'legendary',
  maxStack: 1,
  weight: 6.5,
  baseValue: 120000,
  requiredLevel: 41,
  ilvl: computeIlvl(5, 'legendary'),
  textureKey: 'item_suit_verdant_legendary',
  color: 0x3aaa55,
  equipSlot: 'exosuit',
  moduleSlots: 6,
  effects: [
    { trigger: 'on_equip', effect: { type: 'stats', ...generateSuitStats('hazmat', 'legendary', 5) } },
  ],
  grantedAbilities: ['energy_barrier', 'regeneration_protocol', 'nano_repair', 'analyze_specimen', 'fortify_systems'],
};

// ============================================================
// VERDANT DYNAMICS — Off-Archetype: Security Division (2)
// ============================================================

export const SUIT_VERDANT_CANOPY_WARDEN_EPIC: ItemDefinition = {
  id: 'suit_verdant_canopy_warden_epic',
  displayName: 'Canopy Warden Frame',
  description:
    'Verdant Security Division combat frame designed for perimeter enforcement in hostile biomes. Bio-reactive plating hardens on impact, channeling kinetic force into counter-offensive systems. Issued exclusively to field wardens with confirmed hostile-engagement certifications.',
  category: 'suit',
  rarity: 'epic',
  maxStack: 1,
  weight: 9.0,
  baseValue: 9500,
  requiredLevel: 25,
  ilvl: computeIlvl(3, 'epic'),
  textureKey: 'item_suit_verdant_combat_epic',
  color: 0x3a9a4a,
  equipSlot: 'exosuit',
  moduleSlots: 4,
  effects: [
    { trigger: 'on_equip', effect: { type: 'stats', ...generateSuitStats('combat', 'epic', 3) } },
  ],
  grantedAbilities: ['power_surge', 'fortify_systems', 'concussive_strike'],
};

export const SUIT_VERDANT_ROOTBOUND_SENTINEL_LEGENDARY: ItemDefinition = {
  id: 'suit_verdant_rootbound_sentinel_legendary',
  displayName: 'The Rootbound Sentinel',
  description:
    'The most heavily armed platform in Verdant\'s arsenal. Root-fiber actuators woven through reinforced bio-ceramic plating deliver devastating close-quarters force while maintaining the adaptive resilience Verdant engineering is known for. Only twelve units exist, each bonded to a specific operator through a classified neural-grafting process.',
  category: 'suit',
  rarity: 'legendary',
  maxStack: 1,
  weight: 8.5,
  baseValue: 125000,
  requiredLevel: 45,
  ilvl: computeIlvl(5, 'legendary'),
  textureKey: 'item_suit_verdant_combat_legendary',
  color: 0x3a9a4a,
  equipSlot: 'exosuit',
  moduleSlots: 6,
  effects: [
    { trigger: 'on_equip', effect: { type: 'stats', ...generateSuitStats('combat', 'legendary', 5) } },
  ],
  grantedAbilities: ['power_surge', 'fortify_systems', 'concussive_strike', 'magnetic_field', 'emergency_shield'],
};

// ============================================================
// HELIX EXTRACTION — Main Ladder (5)
// ============================================================

export const SUIT_HELIX_IRONCLAD_COMMON: ItemDefinition = {
  id: 'suit_helix_ironclad_common',
  displayName: 'Ironclad Exo-Suit',
  description:
    'Standard-issue Helix Extraction operational suit. Forge-pressed durasteel plating rated for 12-hour continuous extraction shifts. Every Helix operator receives one upon induction. It works.',
  category: 'suit',
  rarity: 'common',
  maxStack: 1,
  weight: 9.0,
  baseValue: 660,
  requiredLevel: 1,
  ilvl: computeIlvl(1, 'common'),
  textureKey: 'item_suit_helix_common',
  color: 0x6f221a,
  equipSlot: 'exosuit',
  moduleSlots: 3,
  effects: [
    { trigger: 'on_equip', effect: { type: 'stats', ...generateSuitStats('balanced', 'common', 1) } },
  ],
  grantedAbilities: ['nano_repair'],
};

export const SUIT_HELIX_FOUNDRY_RARE: ItemDefinition = {
  id: 'suit_helix_foundry_rare',
  displayName: 'Foundry Plating Suit',
  description:
    'Helix Extraction heavy-duty plating suit forged at 1,400 degrees in the Foundry Works. Rated for 6-tonne crush resistance and sustained kinetic bombardment. Operators report the weight stops being noticeable after the first three weeks.',
  category: 'suit',
  rarity: 'rare',
  maxStack: 1,
  weight: 10.0,
  baseValue: 2420,
  requiredLevel: 11,
  ilvl: computeIlvl(2, 'rare'),
  textureKey: 'item_suit_helix_rare',
  color: 0x8a2a1a,
  equipSlot: 'exosuit',
  moduleSlots: 4,
  effects: [
    { trigger: 'on_equip', effect: { type: 'stats', ...generateSuitStats('tank', 'rare', 2) } },
  ],
  grantedAbilities: ['magnetic_field', 'fortify_systems'],
};

export const SUIT_HELIX_TEMPERED_EPIC: ItemDefinition = {
  id: 'suit_helix_tempered_epic',
  displayName: 'Tempered Bulwark Frame',
  description:
    'Helix Extraction reinforced frame triple-tempered through proprietary metallurgical processes. The Bulwark designation signifies operational endurance beyond 72 continuous hours under sustained hostile fire. Operators who survive their first deployment rarely request reassignment.',
  category: 'suit',
  rarity: 'epic',
  maxStack: 1,
  weight: 11.0,
  baseValue: 9900,
  requiredLevel: 21,
  ilvl: computeIlvl(3, 'epic'),
  textureKey: 'item_suit_helix_epic',
  color: 0x9a301f,
  equipSlot: 'exosuit',
  moduleSlots: 4,
  effects: [
    { trigger: 'on_equip', effect: { type: 'stats', ...generateSuitStats('tank', 'epic', 3) } },
  ],
  grantedAbilities: ['magnetic_field', 'fortify_systems', 'power_surge'],
};

export const SUIT_HELIX_ANVIL_EXOTIC: ItemDefinition = {
  id: 'suit_helix_anvil_exotic',
  displayName: 'Anvil Assault Rig',
  description:
    'Helix Extraction\'s premier assault platform, forged from alloys recovered at extraction depths exceeding 800 meters. The Anvil designation indicates dual-certification for both sustained defensive operations and aggressive forward assault. Requisition requires personal authorization from a Forge Master.',
  category: 'suit',
  rarity: 'exotic',
  maxStack: 1,
  weight: 10.5,
  baseValue: 38500,
  requiredLevel: 31,
  ilvl: computeIlvl(4, 'exotic'),
  textureKey: 'item_suit_helix_exotic',
  color: 0xa83525,
  equipSlot: 'exosuit',
  moduleSlots: 5,
  effects: [
    { trigger: 'on_equip', effect: { type: 'stats', ...generateSuitStats('assault', 'exotic', 4) } },
  ],
  grantedAbilities: ['magnetic_field', 'fortify_systems', 'power_surge', 'emergency_shield'],
};

export const SUIT_HELIX_CRUCIBLE_LEGENDARY: ItemDefinition = {
  id: 'suit_helix_crucible_legendary',
  displayName: 'The Crucible',
  description:
    'The single most destructive platform Helix Extraction has ever produced. Forged in a reactor breach that should have killed everyone in the facility, The Crucible was instead tempered by forces no metallurgist can explain. Operators who bond with a Crucible unit describe feeling the heat of its creation with every step.',
  category: 'suit',
  rarity: 'legendary',
  maxStack: 1,
  weight: 10.0,
  baseValue: 132000,
  requiredLevel: 41,
  ilvl: computeIlvl(5, 'legendary'),
  textureKey: 'item_suit_helix_legendary',
  color: 0xbb3a2a,
  equipSlot: 'exosuit',
  moduleSlots: 6,
  effects: [
    { trigger: 'on_equip', effect: { type: 'stats', ...generateSuitStats('assault', 'legendary', 5) } },
  ],
  grantedAbilities: ['magnetic_field', 'fortify_systems', 'power_surge', 'emergency_shield', 'concussive_strike'],
};

// ============================================================
// HELIX EXTRACTION — Off-Archetype: Deep Survey Teams (2)
// ============================================================

export const SUIT_HELIX_BORE_SURVEYOR_EPIC: ItemDefinition = {
  id: 'suit_helix_bore_surveyor_epic',
  displayName: 'Bore Surveyor Frame',
  description:
    'Helix Deep Survey Teams reconnaissance frame optimized for subsurface exploration and resource mapping. Lighter than standard Helix plating, the Bore Surveyor trades raw stopping power for enhanced sensor arrays and rapid-traverse actuators.',
  category: 'suit',
  rarity: 'epic',
  maxStack: 1,
  weight: 7.5,
  baseValue: 10450,
  requiredLevel: 25,
  ilvl: computeIlvl(3, 'epic'),
  textureKey: 'item_suit_helix_recon_epic',
  color: 0xaa3a2a,
  equipSlot: 'exosuit',
  moduleSlots: 4,
  effects: [
    { trigger: 'on_equip', effect: { type: 'stats', ...generateSuitStats('recon', 'epic', 3) } },
  ],
  grantedAbilities: ['overclock', 'resource_scan', 'analyze_specimen'],
};

export const SUIT_HELIX_QUARRY_PHANTOM_LEGENDARY: ItemDefinition = {
  id: 'suit_helix_quarry_phantom_legendary',
  displayName: 'The Quarry Phantom',
  description:
    'The pinnacle of Helix Deep Survey engineering. The Quarry Phantom was designed for operators who map territories so deep that extraction teams cannot follow. Active camouflage plating and broad-spectrum sensor suites allow the Phantom to survey, catalog, and return before anything in the deep even knows it was there.',
  category: 'suit',
  rarity: 'legendary',
  maxStack: 1,
  weight: 7.0,
  baseValue: 137500,
  requiredLevel: 45,
  ilvl: computeIlvl(5, 'legendary'),
  textureKey: 'item_suit_helix_recon_legendary',
  color: 0xaa3a2a,
  equipSlot: 'exosuit',
  moduleSlots: 6,
  effects: [
    { trigger: 'on_equip', effect: { type: 'stats', ...generateSuitStats('recon', 'legendary', 5) } },
  ],
  grantedAbilities: ['overclock', 'resource_scan', 'analyze_specimen', 'precision_shot', 'nano_repair'],
};

// ============================================================
// NEXUS FRONTIERS — Main Ladder (5)
// ============================================================

export const SUIT_NEXUS_SPECTRE_COMMON: ItemDefinition = {
  id: 'suit_nexus_spectre_common',
  displayName: 'Spectre Exo-Suit',
  description:
    'Entry-level Nexus Frontiers operational suit issued upon clearance verification. Lightweight composite plating with basic signal-dampening mesh. Adequate for preliminary field assignments within monitored sectors.',
  category: 'suit',
  rarity: 'common',
  maxStack: 1,
  weight: 6.5,
  baseValue: 600,
  requiredLevel: 1,
  ilvl: computeIlvl(1, 'common'),
  textureKey: 'item_suit_nexus_common',
  color: 0x153b60,
  equipSlot: 'exosuit',
  moduleSlots: 3,
  effects: [
    { trigger: 'on_equip', effect: { type: 'stats', ...generateSuitStats('balanced', 'common', 1) } },
  ],
  grantedAbilities: ['nano_repair'],
};

export const SUIT_NEXUS_CIPHER_RARE: ItemDefinition = {
  id: 'suit_nexus_cipher_rare',
  displayName: 'Cipher Recon Suit',
  description:
    'Nexus Frontiers reconnaissance suit with integrated signal-intelligence arrays. Cipher-grade encryption protocols shield all telemetry data while multi-band sensors provide real-time environmental mapping. Calibrated for extended surveillance operations.',
  category: 'suit',
  rarity: 'rare',
  maxStack: 1,
  weight: 6.0,
  baseValue: 2200,
  requiredLevel: 11,
  ilvl: computeIlvl(2, 'rare'),
  textureKey: 'item_suit_nexus_rare',
  color: 0x1a4a7a,
  equipSlot: 'exosuit',
  moduleSlots: 4,
  effects: [
    { trigger: 'on_equip', effect: { type: 'stats', ...generateSuitStats('recon', 'rare', 2) } },
  ],
  grantedAbilities: ['overclock', 'resource_scan'],
};

export const SUIT_NEXUS_LATTICE_EPIC: ItemDefinition = {
  id: 'suit_nexus_lattice_epic',
  displayName: 'Lattice Sensor Frame',
  description:
    'Nexus Frontiers advanced sensor platform utilizing a crystalline lattice network for distributed environmental awareness. Every surface of the Lattice Frame functions as a sensor element, providing 360-degree coverage with sub-millimeter resolution. Field operatives report experiencing spatial awareness beyond normal human parameters.',
  category: 'suit',
  rarity: 'epic',
  maxStack: 1,
  weight: 6.5,
  baseValue: 9000,
  requiredLevel: 21,
  ilvl: computeIlvl(3, 'epic'),
  textureKey: 'item_suit_nexus_epic',
  color: 0x1f5287,
  equipSlot: 'exosuit',
  moduleSlots: 4,
  effects: [
    { trigger: 'on_equip', effect: { type: 'stats', ...generateSuitStats('recon', 'epic', 3) } },
  ],
  grantedAbilities: ['overclock', 'resource_scan', 'analyze_specimen'],
};

export const SUIT_NEXUS_MERIDIAN_EXOTIC: ItemDefinition = {
  id: 'suit_nexus_meridian_exotic',
  displayName: 'Meridian Intelligence Suit',
  description:
    'Nexus Frontiers classified intelligence platform integrating predictive threat-analysis algorithms with active counter-surveillance measures. The Meridian designation indicates the suit operates on data streams most operators never know exist. Requisition requires Echelon-4 clearance and a cognitive baseline score above 94th percentile.',
  category: 'suit',
  rarity: 'exotic',
  maxStack: 1,
  weight: 6.0,
  baseValue: 35000,
  requiredLevel: 31,
  ilvl: computeIlvl(4, 'exotic'),
  textureKey: 'item_suit_nexus_exotic',
  color: 0x245a94,
  equipSlot: 'exosuit',
  moduleSlots: 5,
  effects: [
    { trigger: 'on_equip', effect: { type: 'stats', ...generateSuitStats('recon', 'exotic', 4) } },
  ],
  grantedAbilities: ['overclock', 'resource_scan', 'analyze_specimen', 'precision_shot'],
};

export const SUIT_NEXUS_ECHO_PRIME_LEGENDARY: ItemDefinition = {
  id: 'suit_nexus_echo_prime_legendary',
  displayName: 'The Echo Prime',
  description:
    'The apex of Nexus Frontiers intelligence engineering. The Echo Prime processes environmental data at speeds that border on precognition -- operators describe knowing what will happen moments before it does. Fewer than twenty units were ever fabricated, each requiring a custom neural-interface calibration that takes eleven weeks to complete.',
  category: 'suit',
  rarity: 'legendary',
  maxStack: 1,
  weight: 5.5,
  baseValue: 120000,
  requiredLevel: 41,
  ilvl: computeIlvl(5, 'legendary'),
  textureKey: 'item_suit_nexus_legendary',
  color: 0x2a65a0,
  equipSlot: 'exosuit',
  moduleSlots: 6,
  effects: [
    { trigger: 'on_equip', effect: { type: 'stats', ...generateSuitStats('recon', 'legendary', 5) } },
  ],
  grantedAbilities: ['overclock', 'resource_scan', 'analyze_specimen', 'precision_shot', 'electrocute'],
};

// ============================================================
// NEXUS FRONTIERS — Off-Archetype: Enforcement Division (2)
// ============================================================

export const SUIT_NEXUS_VECTOR_ENFORCER_EPIC: ItemDefinition = {
  id: 'suit_nexus_vector_enforcer_epic',
  displayName: 'Vector Enforcer Frame',
  description:
    'Nexus Enforcement Division assault frame built for rapid-response operations in contested sectors. Heavier than standard Nexus platforms, the Vector Enforcer compensates with kinetic amplification systems that convert the operator\'s momentum into devastating strike force.',
  category: 'suit',
  rarity: 'epic',
  maxStack: 1,
  weight: 9.5,
  baseValue: 9500,
  requiredLevel: 25,
  ilvl: computeIlvl(3, 'epic'),
  textureKey: 'item_suit_nexus_assault_epic',
  color: 0x2a5a8a,
  equipSlot: 'exosuit',
  moduleSlots: 4,
  effects: [
    { trigger: 'on_equip', effect: { type: 'stats', ...generateSuitStats('assault', 'epic', 3) } },
  ],
  grantedAbilities: ['power_surge', 'magnetic_field', 'concussive_strike'],
};

export const SUIT_NEXUS_PHANTOM_PROTOCOL_LEGENDARY: ItemDefinition = {
  id: 'suit_nexus_phantom_protocol_legendary',
  displayName: 'The Phantom Protocol',
  description:
    'The most lethal platform in Nexus Frontiers\' classified arsenal. The Phantom Protocol merges assault-grade offensive systems with Nexus signal intelligence, creating an operator who strikes with perfect information. Its existence is officially denied by Nexus Frontiers command.',
  category: 'suit',
  rarity: 'legendary',
  maxStack: 1,
  weight: 9.0,
  baseValue: 125000,
  requiredLevel: 45,
  ilvl: computeIlvl(5, 'legendary'),
  textureKey: 'item_suit_nexus_assault_legendary',
  color: 0x2a5a8a,
  equipSlot: 'exosuit',
  moduleSlots: 6,
  effects: [
    { trigger: 'on_equip', effect: { type: 'stats', ...generateSuitStats('assault', 'legendary', 5) } },
  ],
  grantedAbilities: ['power_surge', 'magnetic_field', 'concussive_strike', 'fortify_systems', 'emergency_shield'],
};

// ============================================================
// UNAFFILIATED — Main Ladder (5)
// ============================================================

export const SUIT_UNAFFILIATED_PATCHWORK_COMMON: ItemDefinition = {
  id: 'suit_unaffiliated_patchwork_common',
  displayName: 'Patchwork Exo-Suit',
  description:
    'A functional exo-suit assembled from salvaged components across multiple manufacturers. Nothing matches, everything works. The patchwork construction is a point of pride among independent operators who answer to no faction.',
  category: 'suit',
  rarity: 'common',
  maxStack: 1,
  weight: 8.0,
  baseValue: 540,
  requiredLevel: 1,
  ilvl: computeIlvl(1, 'common'),
  textureKey: 'item_suit_unaffiliated_common',
  color: 0x5f5f45,
  equipSlot: 'exosuit',
  moduleSlots: 3,
  effects: [
    { trigger: 'on_equip', effect: { type: 'stats', ...generateSuitStats('balanced', 'common', 1) } },
  ],
  grantedAbilities: ['nano_repair'],
};

export const SUIT_UNAFFILIATED_SALVAGE_RARE: ItemDefinition = {
  id: 'suit_unaffiliated_salvage_rare',
  displayName: 'Salvage Runner Suit',
  description:
    'Field-modified salvage suit optimized for extended scavenging operations in unstable zones. The Salvage Runner prioritizes operator endurance and environmental awareness over raw combat capability -- staying alive long enough to find what you came for is the entire point.',
  category: 'suit',
  rarity: 'rare',
  maxStack: 1,
  weight: 7.5,
  baseValue: 1980,
  requiredLevel: 11,
  ilvl: computeIlvl(2, 'rare'),
  textureKey: 'item_suit_unaffiliated_rare',
  color: 0x7a7a5a,
  equipSlot: 'exosuit',
  moduleSlots: 4,
  effects: [
    { trigger: 'on_equip', effect: { type: 'stats', ...generateSuitStats('scavenger', 'rare', 2) } },
  ],
  grantedAbilities: ['nano_repair', 'emergency_shield'],
};

export const SUIT_UNAFFILIATED_DRIFTER_EPIC: ItemDefinition = {
  id: 'suit_unaffiliated_drifter_epic',
  displayName: 'Drifter Field Frame',
  description:
    'An independent operator\'s frame built from the best parts of three different faction designs. The Drifter designation is earned, not assigned -- operators who survive long enough to assemble one have proven they need no faction to thrive. Jury-rigged but remarkably effective.',
  category: 'suit',
  rarity: 'epic',
  maxStack: 1,
  weight: 8.0,
  baseValue: 8100,
  requiredLevel: 21,
  ilvl: computeIlvl(3, 'epic'),
  textureKey: 'item_suit_unaffiliated_epic',
  color: 0x888865,
  equipSlot: 'exosuit',
  moduleSlots: 4,
  effects: [
    { trigger: 'on_equip', effect: { type: 'stats', ...generateSuitStats('scavenger', 'epic', 3) } },
  ],
  grantedAbilities: ['emergency_shield', 'overclock', 'energy_barrier'],
};

export const SUIT_UNAFFILIATED_RECLAIMED_EXOTIC: ItemDefinition = {
  id: 'suit_unaffiliated_reclaimed_exotic',
  displayName: 'Reclaimed Operations Suit',
  description:
    'A masterwork of independent engineering, the Reclaimed Operations Suit integrates salvaged faction technology that the original manufacturers would barely recognize. Every component has been field-tested, broken, repaired, and refined until it performs beyond factory specifications.',
  category: 'suit',
  rarity: 'exotic',
  maxStack: 1,
  weight: 7.5,
  baseValue: 31500,
  requiredLevel: 31,
  ilvl: computeIlvl(4, 'exotic'),
  textureKey: 'item_suit_unaffiliated_exotic',
  color: 0x959570,
  equipSlot: 'exosuit',
  moduleSlots: 5,
  effects: [
    { trigger: 'on_equip', effect: { type: 'stats', ...generateSuitStats('scavenger', 'exotic', 4) } },
  ],
  grantedAbilities: ['emergency_shield', 'overclock', 'energy_barrier', 'resource_scan'],
};

export const SUIT_UNAFFILIATED_WASTELAND_SOVEREIGN_LEGENDARY: ItemDefinition = {
  id: 'suit_unaffiliated_wasteland_sovereign_legendary',
  displayName: 'The Wasteland Sovereign',
  description:
    'The ultimate testament to independent survival. The Wasteland Sovereign is not manufactured -- it is accumulated over years of operation, each component a trophy from a different expedition that should have been fatal. Operators who wear one have earned every gram through skill, endurance, and a refusal to die that borders on spite.',
  category: 'suit',
  rarity: 'legendary',
  maxStack: 1,
  weight: 7.0,
  baseValue: 108000,
  requiredLevel: 41,
  ilvl: computeIlvl(5, 'legendary'),
  textureKey: 'item_suit_unaffiliated_legendary',
  color: 0xa0a07a,
  equipSlot: 'exosuit',
  moduleSlots: 6,
  effects: [
    { trigger: 'on_equip', effect: { type: 'stats', ...generateSuitStats('scavenger', 'legendary', 5) } },
  ],
  grantedAbilities: ['emergency_shield', 'overclock', 'energy_barrier', 'resource_scan', 'power_surge'],
};

// ============================================================
// UNAFFILIATED — Off-Archetype: Wasteland Reclamation Crews (2)
// ============================================================

export const SUIT_UNAFFILIATED_SCROUNGER_EPIC: ItemDefinition = {
  id: 'suit_unaffiliated_scrounger_epic',
  displayName: 'Scrounger Reclamation Frame',
  description:
    'Wasteland Reclamation Crew hazmat frame designed for prolonged operations in contaminated zones where faction teams refuse to tread. The Scrounger designation reflects the reality of independent hazmat work -- you use what you find, and what you find keeps you alive.',
  category: 'suit',
  rarity: 'epic',
  maxStack: 1,
  weight: 7.5,
  baseValue: 8550,
  requiredLevel: 25,
  ilvl: computeIlvl(3, 'epic'),
  textureKey: 'item_suit_unaffiliated_hazmat_epic',
  color: 0x9a9a6a,
  equipSlot: 'exosuit',
  moduleSlots: 4,
  effects: [
    { trigger: 'on_equip', effect: { type: 'stats', ...generateSuitStats('hazmat', 'epic', 3) } },
  ],
  grantedAbilities: ['energy_barrier', 'regeneration_protocol', 'fortify_systems'],
};

export const SUIT_UNAFFILIATED_MONGREL_LEGENDARY: ItemDefinition = {
  id: 'suit_unaffiliated_mongrel_legendary',
  displayName: 'The Mongrel',
  description:
    'The hardest-wearing hazmat platform outside faction arsenals. The Mongrel is built from components that survived catastrophic environmental failures -- each piece proven by the disaster that destroyed everything around it. Reclamation crews consider wearing one the highest mark of professional respect.',
  category: 'suit',
  rarity: 'legendary',
  maxStack: 1,
  weight: 7.0,
  baseValue: 112500,
  requiredLevel: 45,
  ilvl: computeIlvl(5, 'legendary'),
  textureKey: 'item_suit_unaffiliated_hazmat_legendary',
  color: 0x9a9a6a,
  equipSlot: 'exosuit',
  moduleSlots: 6,
  effects: [
    { trigger: 'on_equip', effect: { type: 'stats', ...generateSuitStats('hazmat', 'legendary', 5) } },
  ],
  grantedAbilities: ['energy_barrier', 'regeneration_protocol', 'fortify_systems', 'nano_repair', 'analyze_specimen'],
};

// ============================================================
// ALL FACTION SUITS
// ============================================================

export const ALL_FACTION_SUITS: readonly ItemDefinition[] = [
  // Verdant Dynamics (7)
  SUIT_VERDANT_BIOWEAVE_COMMON,
  SUIT_VERDANT_CHLORO_RARE,
  SUIT_VERDANT_SYMBIONT_EPIC,
  SUIT_VERDANT_MYCELIAL_EXOTIC,
  SUIT_VERDANT_CANOPY_SOVEREIGN_LEGENDARY,
  SUIT_VERDANT_CANOPY_WARDEN_EPIC,
  SUIT_VERDANT_ROOTBOUND_SENTINEL_LEGENDARY,
  // Helix Extraction (7)
  SUIT_HELIX_IRONCLAD_COMMON,
  SUIT_HELIX_FOUNDRY_RARE,
  SUIT_HELIX_TEMPERED_EPIC,
  SUIT_HELIX_ANVIL_EXOTIC,
  SUIT_HELIX_CRUCIBLE_LEGENDARY,
  SUIT_HELIX_BORE_SURVEYOR_EPIC,
  SUIT_HELIX_QUARRY_PHANTOM_LEGENDARY,
  // Nexus Frontiers (7)
  SUIT_NEXUS_SPECTRE_COMMON,
  SUIT_NEXUS_CIPHER_RARE,
  SUIT_NEXUS_LATTICE_EPIC,
  SUIT_NEXUS_MERIDIAN_EXOTIC,
  SUIT_NEXUS_ECHO_PRIME_LEGENDARY,
  SUIT_NEXUS_VECTOR_ENFORCER_EPIC,
  SUIT_NEXUS_PHANTOM_PROTOCOL_LEGENDARY,
  // Unaffiliated (7)
  SUIT_UNAFFILIATED_PATCHWORK_COMMON,
  SUIT_UNAFFILIATED_SALVAGE_RARE,
  SUIT_UNAFFILIATED_DRIFTER_EPIC,
  SUIT_UNAFFILIATED_RECLAIMED_EXOTIC,
  SUIT_UNAFFILIATED_WASTELAND_SOVEREIGN_LEGENDARY,
  SUIT_UNAFFILIATED_SCROUNGER_EPIC,
  SUIT_UNAFFILIATED_MONGREL_LEGENDARY,
];
