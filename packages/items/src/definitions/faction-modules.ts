/**
 * Faction Module Definitions (Phase 113)
 *
 * 40 faction modules across 4 factions (10 each: 2 lines x 5 rarities).
 * All stats generated via getModuleStats() -- no hand-coded stat values.
 * No grantedAbilities on modules -- abilities are the suit's domain.
 *
 * @see packages/items/FACTION-IDENTITY.md for:
 *   - Module type assignments per faction (Section 5)
 *   - Naming conventions (Section 3)
 *   - Color palette anchors (Section 4)
 */

import type { ItemDefinition, ItemRarity } from '../types';
import { computeIlvl, STAT_RARITY_MULTIPLIERS, TIER_MULTIPLIERS } from '../utils';

/**
 * Generate stat bonuses for a module based on moduleType, rarity, and tier
 * Returns stats effect to be added alongside legacy effects
 * (Replicated from modules.ts -- not exported there)
 */
function getModuleStats(moduleType: string, rarity: ItemRarity, tier: 1 | 2 | 3 | 4 | 5): { type: 'stats'; [key: string]: number | string } {
  const base = 20;
  const rarityMult = STAT_RARITY_MULTIPLIERS[rarity];
  const tierMult = TIER_MULTIPLIERS[tier];
  const value = Math.round(base * rarityMult * tierMult);

  switch (moduleType) {
    case 'armor':
      return { type: 'stats', toughness: value };
    case 'speed':
      return { type: 'stats', haste: value };
    case 'life_support':
      return { type: 'stats', resilience: Math.round(value * 0.6), recovery: Math.round(value * 0.4) };
    case 'sensor':
      return { type: 'stats', perception: value };
    case 'power_core':
      return { type: 'stats', vigor: Math.round(value * 0.6), recovery: Math.round(value * 0.4) };
    case 'mobility':
      return { type: 'stats', haste: Math.round(value * 0.6), vigor: Math.round(value * 0.4) };
    default:
      return { type: 'stats', durability: value };
  }
}

// ============================================================
// VERDANT DYNAMICS — Life Support Modules (Line 1: resilience+recovery)
// ============================================================

export const MODULE_VERDANT_CHLORO_FILTER_COMMON: ItemDefinition = {
  id: 'module_verdant_chloro_filter_common',
  displayName: 'Chloro-Filter Unit',
  description: 'Standard Verdant atmospheric filtering unit derived from native Terminus flora. Issued to all incoming field researchers as part of basic survival kit.',
  category: 'module',
  rarity: 'common',
  maxStack: 1,
  weight: 0.6,
  baseValue: 200,
  requiredLevel: 1,
  ilvl: computeIlvl(1, 'common'),
  textureKey: 'item_module_life_support',
  color: 0x235f2f,
  equipSlot: 'module',
  effects: [
    { trigger: 'on_equip', effect: { type: 'life_support', hazardResistance: 10 } },
    { trigger: 'on_equip', effect: getModuleStats('life_support', 'common', 1) },
  ],
};

export const MODULE_VERDANT_SYMBIONT_FILTER_RARE: ItemDefinition = {
  id: 'module_verdant_symbiont_filter_rare',
  displayName: 'Symbiont Filter Array',
  description: 'Living filtration membrane cultivated from Verdant-engineered extremophile cultures. The organisms neutralize airborne toxins through enzymatic breakdown, adapting to new contaminants within hours of first exposure.',
  category: 'module',
  rarity: 'rare',
  maxStack: 1,
  weight: 0.5,
  baseValue: 800,
  requiredLevel: 11,
  ilvl: computeIlvl(2, 'rare'),
  textureKey: 'item_module_life_support',
  color: 0x2a7a3a,
  equipSlot: 'module',
  effects: [
    { trigger: 'on_equip', effect: { type: 'life_support', hazardResistance: 25 } },
    { trigger: 'on_equip', effect: getModuleStats('life_support', 'rare', 2) },
  ],
};

export const MODULE_VERDANT_PHYTO_FILTER_EPIC: ItemDefinition = {
  id: 'module_verdant_phyto_filter_epic',
  displayName: 'Phyto-Filter System',
  description: 'Advanced bio-catalytic purification array incorporating Fungal Depths mycelial networks. The filter anticipates atmospheric shifts before external sensors register the change. Verdant Bio-Engineering Division considers this their finest atmospheric processing achievement.',
  category: 'module',
  rarity: 'epic',
  maxStack: 1,
  weight: 0.5,
  baseValue: 3000,
  requiredLevel: 21,
  ilvl: computeIlvl(3, 'epic'),
  textureKey: 'item_module_life_support',
  color: 0x2f8a40,
  equipSlot: 'module',
  effects: [
    { trigger: 'on_equip', effect: { type: 'life_support', hazardResistance: 40 } },
    { trigger: 'on_equip', effect: getModuleStats('life_support', 'epic', 3) },
  ],
};

export const MODULE_VERDANT_CANOPY_RESPIRATOR_EXOTIC: ItemDefinition = {
  id: 'module_verdant_canopy_respirator_exotic',
  displayName: 'Canopy Respirator',
  description: 'Experimental closed-loop life support integrating six distinct Terminus organism strains in symbiotic cascade. The biological processing chain converts lethal concentrations of sulfur compounds and spore clouds into breathable atmosphere. Test subjects report the air tastes faintly of chlorophyll.',
  category: 'module',
  rarity: 'exotic',
  maxStack: 1,
  weight: 0.4,
  baseValue: 12000,
  requiredLevel: 31,
  ilvl: computeIlvl(4, 'exotic'),
  textureKey: 'item_module_life_support',
  color: 0x34994a,
  equipSlot: 'module',
  effects: [
    { trigger: 'on_equip', effect: { type: 'life_support', hazardResistance: 60 } },
    { trigger: 'on_equip', effect: getModuleStats('life_support', 'exotic', 4) },
  ],
};

export const MODULE_VERDANT_BLOOM_NETWORK_LEGENDARY: ItemDefinition = {
  id: 'module_verdant_bloom_network_legendary',
  displayName: 'Bloom Network Filter',
  description: 'A self-sustaining atmospheric processing ecosystem miniaturized into module form. The Bloom Network does not merely filter -- it actively cultivates a microbiome within the suit that renders the wearer immune to all documented Terminus atmospheric hazards. Dr. Maren Solvik\'s final research contribution before her disappearance into the Luminous Canopy.',
  category: 'module',
  rarity: 'legendary',
  maxStack: 1,
  weight: 0.3,
  baseValue: 50000,
  requiredLevel: 41,
  ilvl: computeIlvl(5, 'legendary'),
  textureKey: 'item_module_life_support',
  color: 0x3aaa55,
  equipSlot: 'module',
  effects: [
    { trigger: 'on_equip', effect: { type: 'life_support', hazardResistance: 85 } },
    { trigger: 'on_equip', effect: getModuleStats('life_support', 'legendary', 5) },
  ],
};

// ============================================================
// VERDANT DYNAMICS — Sensor Modules (Line 2: perception)
// ============================================================

export const MODULE_VERDANT_BIOSENSOR_COMMON: ItemDefinition = {
  id: 'module_verdant_biosensor_common',
  displayName: 'Biosensor Array',
  description: 'Standard-issue Verdant biological detection package. Identifies life signs, spore concentrations, and pheromone trails within close range. Every field researcher carries one.',
  category: 'module',
  rarity: 'common',
  maxStack: 1,
  weight: 0.6,
  baseValue: 200,
  requiredLevel: 1,
  ilvl: computeIlvl(1, 'common'),
  textureKey: 'item_module_sensor',
  color: 0x235f2f,
  equipSlot: 'module',
  effects: [
    { trigger: 'on_equip', effect: { type: 'sensor', detectionRange: 15 } },
    { trigger: 'on_equip', effect: getModuleStats('sensor', 'common', 1) },
  ],
};

export const MODULE_VERDANT_SPORE_ANALYZER_RARE: ItemDefinition = {
  id: 'module_verdant_spore_analyzer_rare',
  displayName: 'Spore Analyzer Module',
  description: 'Specialized biological detection unit calibrated for Miasma Marshes mycelial signatures. Cross-references spore density patterns against Verdant\'s xenobiology database to predict organism behavior within scanning radius.',
  category: 'module',
  rarity: 'rare',
  maxStack: 1,
  weight: 0.5,
  baseValue: 800,
  requiredLevel: 11,
  ilvl: computeIlvl(2, 'rare'),
  textureKey: 'item_module_sensor',
  color: 0x2a7a3a,
  equipSlot: 'module',
  effects: [
    { trigger: 'on_equip', effect: { type: 'sensor', detectionRange: 30 } },
    { trigger: 'on_equip', effect: getModuleStats('sensor', 'rare', 2) },
  ],
};

export const MODULE_VERDANT_ENZYME_DETECTOR_EPIC: ItemDefinition = {
  id: 'module_verdant_enzyme_detector_epic',
  displayName: 'Enzyme Detector',
  description: 'Chemical-signature tracking module using engineered receptor proteins. Detects trace enzymatic activity through solid rock and dense vegetation. Invaluable for locating buried specimens in Fungal Depths operations.',
  category: 'module',
  rarity: 'epic',
  maxStack: 1,
  weight: 0.5,
  baseValue: 3000,
  requiredLevel: 21,
  ilvl: computeIlvl(3, 'epic'),
  textureKey: 'item_module_sensor',
  color: 0x2f8a40,
  equipSlot: 'module',
  effects: [
    { trigger: 'on_equip', effect: { type: 'sensor', detectionRange: 50 } },
    { trigger: 'on_equip', effect: getModuleStats('sensor', 'epic', 3) },
  ],
};

export const MODULE_VERDANT_TENDRIL_SCANNER_EXOTIC: ItemDefinition = {
  id: 'module_verdant_tendril_scanner_exotic',
  displayName: 'Tendril Scanner',
  description: 'Living sensor network grown from modified Luminous Canopy neural-root tissue. The organic detection mesh extends through the wearer\'s suit surface, registering biological activity through vibration, chemical gradient, and electromagnetic fluctuation simultaneously.',
  category: 'module',
  rarity: 'exotic',
  maxStack: 1,
  weight: 0.4,
  baseValue: 12000,
  requiredLevel: 31,
  ilvl: computeIlvl(4, 'exotic'),
  textureKey: 'item_module_sensor',
  color: 0x34994a,
  equipSlot: 'module',
  effects: [
    { trigger: 'on_equip', effect: { type: 'sensor', detectionRange: 70 } },
    { trigger: 'on_equip', effect: getModuleStats('sensor', 'exotic', 4) },
  ],
};

export const MODULE_VERDANT_CANOPY_INTERPRETER_LEGENDARY: ItemDefinition = {
  id: 'module_verdant_canopy_interpreter_legendary',
  displayName: 'Canopy Interpreter',
  description: 'A biosensor array that interfaces directly with the Luminous Canopy\'s planet-spanning root network. Wearers describe sensing the ecosystem as a single interconnected organism. Three expeditions into the Canopy\'s deepest reaches were guided entirely by this module\'s readings. All three returned with specimens previously thought extinct.',
  category: 'module',
  rarity: 'legendary',
  maxStack: 1,
  weight: 0.3,
  baseValue: 50000,
  requiredLevel: 41,
  ilvl: computeIlvl(5, 'legendary'),
  textureKey: 'item_module_sensor',
  color: 0x3aaa55,
  equipSlot: 'module',
  effects: [
    { trigger: 'on_equip', effect: { type: 'sensor', detectionRange: 88 } },
    { trigger: 'on_equip', effect: getModuleStats('sensor', 'legendary', 5) },
  ],
};

// ============================================================
// HELIX EXTRACTION — Armor Modules (Line 1: toughness)
// ============================================================

export const MODULE_HELIX_SLAG_PLATING_COMMON: ItemDefinition = {
  id: 'module_helix_slag_plating_common',
  displayName: 'Slag Plating',
  description: 'Crude but effective armor plating cast from refined mining slag. Standard protective issue for all Helix ground-level extraction personnel. Rated for 200-tonne crush loads.',
  category: 'module',
  rarity: 'common',
  maxStack: 1,
  weight: 0.6,
  baseValue: 220,
  requiredLevel: 1,
  ilvl: computeIlvl(1, 'common'),
  textureKey: 'item_module_armor',
  color: 0x6f221a,
  equipSlot: 'module',
  effects: [
    { trigger: 'on_equip', effect: { type: 'armor', value: 10 } },
    { trigger: 'on_equip', effect: getModuleStats('armor', 'common', 1) },
  ],
};

export const MODULE_HELIX_FOUNDRY_PLATE_RARE: ItemDefinition = {
  id: 'module_helix_foundry_plate_rare',
  displayName: 'Foundry Plate',
  description: 'Forge-hardened composite armor produced in Helix deep-shaft foundries at 2,400 degrees. Impact-distribution lattice absorbs blunt trauma from cave-ins and predator strikes. The Volcanic Reaches demand nothing less.',
  category: 'module',
  rarity: 'rare',
  maxStack: 1,
  weight: 0.5,
  baseValue: 880,
  requiredLevel: 11,
  ilvl: computeIlvl(2, 'rare'),
  textureKey: 'item_module_armor',
  color: 0x8a2a1a,
  equipSlot: 'module',
  effects: [
    { trigger: 'on_equip', effect: { type: 'armor', value: 25 } },
    { trigger: 'on_equip', effect: getModuleStats('armor', 'rare', 2) },
  ],
};

export const MODULE_HELIX_TEMPERED_PLATE_EPIC: ItemDefinition = {
  id: 'module_helix_tempered_plate_epic',
  displayName: 'Tempered Plate',
  description: 'Multi-layered reactive armor incorporating silicon-carbide ceramic matrices. Each layer independently absorbs and distributes impact force. Withstands direct strikes from Scarred Badlands apex predators without structural compromise.',
  category: 'module',
  rarity: 'epic',
  maxStack: 1,
  weight: 0.5,
  baseValue: 3300,
  requiredLevel: 21,
  ilvl: computeIlvl(3, 'epic'),
  textureKey: 'item_module_armor',
  color: 0x9a301f,
  equipSlot: 'module',
  effects: [
    { trigger: 'on_equip', effect: { type: 'armor', value: 45 } },
    { trigger: 'on_equip', effect: getModuleStats('armor', 'epic', 3) },
  ],
};

export const MODULE_HELIX_ANVIL_PLATING_EXOTIC: ItemDefinition = {
  id: 'module_helix_anvil_plating_exotic',
  displayName: 'Anvil Plating',
  description: 'Experimental adaptive armor developed by Helix\'s Advanced Materials Division. The alloy restructures at the molecular level upon impact, becoming harder at the exact point of contact. Forge-Master Dravik\'s team spent four years perfecting the thermal cycling process.',
  category: 'module',
  rarity: 'exotic',
  maxStack: 1,
  weight: 0.4,
  baseValue: 13200,
  requiredLevel: 31,
  ilvl: computeIlvl(4, 'exotic'),
  textureKey: 'item_module_armor',
  color: 0xa83525,
  equipSlot: 'module',
  effects: [
    { trigger: 'on_equip', effect: { type: 'armor', value: 70 } },
    { trigger: 'on_equip', effect: getModuleStats('armor', 'exotic', 4) },
  ],
};

export const MODULE_HELIX_CRUCIBLE_BULWARK_LEGENDARY: ItemDefinition = {
  id: 'module_helix_crucible_bulwark_legendary',
  displayName: 'Crucible Bulwark',
  description: 'The apex of Helix defensive engineering. Forged in a one-of-a-kind deep-mantle crucible that reaches temperatures achievable nowhere else on Terminus. The alloy remembers every impact it has ever absorbed and pre-hardens against repeated strike patterns. Helix Overseer Kael commissioned it after losing three extraction teams to the same Volcanic Reaches worm.',
  category: 'module',
  rarity: 'legendary',
  maxStack: 1,
  weight: 0.3,
  baseValue: 55000,
  requiredLevel: 41,
  ilvl: computeIlvl(5, 'legendary'),
  textureKey: 'item_module_armor',
  color: 0xbb3a2a,
  equipSlot: 'module',
  effects: [
    { trigger: 'on_equip', effect: { type: 'armor', value: 100 } },
    { trigger: 'on_equip', effect: getModuleStats('armor', 'legendary', 5) },
  ],
};

// ============================================================
// HELIX EXTRACTION — Power Core Modules (Line 2: vigor+recovery)
// ============================================================

export const MODULE_HELIX_BORE_CELL_COMMON: ItemDefinition = {
  id: 'module_helix_bore_cell_common',
  displayName: 'Bore Cell',
  description: 'Compact geothermal energy cell designed for sustained extraction operations. Helix issues these to every drill operator. Not elegant, but the thermal tap keeps running when solar units fail underground.',
  category: 'module',
  rarity: 'common',
  maxStack: 1,
  weight: 0.6,
  baseValue: 220,
  requiredLevel: 1,
  ilvl: computeIlvl(1, 'common'),
  textureKey: 'item_module_power_core',
  color: 0x6f221a,
  equipSlot: 'module',
  effects: [
    { trigger: 'on_equip', effect: { type: 'power_core', energyCapacity: 20, rechargeRate: 1 } },
    { trigger: 'on_equip', effect: getModuleStats('power_core', 'common', 1) },
  ],
};

export const MODULE_HELIX_FURNACE_CELL_RARE: ItemDefinition = {
  id: 'module_helix_furnace_cell_rare',
  displayName: 'Furnace Cell',
  description: 'High-output thermal energy module that converts ambient heat into suit power. Performs exceptionally in Volcanic Reaches environments where waste heat is unlimited. Rated for continuous operation at 800 degrees ambient.',
  category: 'module',
  rarity: 'rare',
  maxStack: 1,
  weight: 0.5,
  baseValue: 880,
  requiredLevel: 11,
  ilvl: computeIlvl(2, 'rare'),
  textureKey: 'item_module_power_core',
  color: 0x8a2a1a,
  equipSlot: 'module',
  effects: [
    { trigger: 'on_equip', effect: { type: 'power_core', energyCapacity: 50, rechargeRate: 3 } },
    { trigger: 'on_equip', effect: getModuleStats('power_core', 'rare', 2) },
  ],
};

export const MODULE_HELIX_SMELT_CORE_EPIC: ItemDefinition = {
  id: 'module_helix_smelt_core_epic',
  displayName: 'Smelt Core',
  description: 'Dual-phase energy system combining geothermal tap with kinetic recapture. The module converts the operator\'s movement, ambient temperature, and even incoming impacts into stored power. Deep-shaft teams call it "the engine that feeds on punishment."',
  category: 'module',
  rarity: 'epic',
  maxStack: 1,
  weight: 0.5,
  baseValue: 3300,
  requiredLevel: 21,
  ilvl: computeIlvl(3, 'epic'),
  textureKey: 'item_module_power_core',
  color: 0x9a301f,
  equipSlot: 'module',
  effects: [
    { trigger: 'on_equip', effect: { type: 'power_core', energyCapacity: 80, rechargeRate: 5 } },
    { trigger: 'on_equip', effect: getModuleStats('power_core', 'epic', 3) },
  ],
};

export const MODULE_HELIX_INGOT_BATTERY_EXOTIC: ItemDefinition = {
  id: 'module_helix_ingot_battery_exotic',
  displayName: 'Ingot Battery',
  description: 'Solid-state energy storage using crystallized thermal compounds from deep-mantle deposits. Energy density exceeds conventional cells by an order of magnitude. Helix R&D considers the thermal crystallization process proprietary and has terminated three employees for attempting to document it.',
  category: 'module',
  rarity: 'exotic',
  maxStack: 1,
  weight: 0.4,
  baseValue: 13200,
  requiredLevel: 31,
  ilvl: computeIlvl(4, 'exotic'),
  textureKey: 'item_module_power_core',
  color: 0xa83525,
  equipSlot: 'module',
  effects: [
    { trigger: 'on_equip', effect: { type: 'power_core', energyCapacity: 120, rechargeRate: 8 } },
    { trigger: 'on_equip', effect: getModuleStats('power_core', 'exotic', 4) },
  ],
};

export const MODULE_HELIX_CRUCIBLE_REACTOR_LEGENDARY: ItemDefinition = {
  id: 'module_helix_crucible_reactor_legendary',
  displayName: 'Crucible Reactor',
  description: 'A miniaturized fusion reactor forged in the same deep-mantle crucible as the Bulwark armor. The reactor sustains a controlled micro-star at its core. Energy output is theoretically unlimited within rated parameters. Helix Overseer Kael personally approves each unit\'s deployment. Only seven exist.',
  category: 'module',
  rarity: 'legendary',
  maxStack: 1,
  weight: 0.3,
  baseValue: 55000,
  requiredLevel: 41,
  ilvl: computeIlvl(5, 'legendary'),
  textureKey: 'item_module_power_core',
  color: 0xbb3a2a,
  equipSlot: 'module',
  effects: [
    { trigger: 'on_equip', effect: { type: 'power_core', energyCapacity: 180, rechargeRate: 12 } },
    { trigger: 'on_equip', effect: getModuleStats('power_core', 'legendary', 5) },
  ],
};

// ============================================================
// NEXUS FRONTIERS — Sensor Modules (Line 1: perception)
// ============================================================

export const MODULE_NEXUS_CIPHER_ARRAY_COMMON: ItemDefinition = {
  id: 'module_nexus_cipher_array_common',
  displayName: 'Cipher Array',
  description: 'Entry-level Nexus signals intelligence module. Intercepts and decodes unencrypted transmissions within close range. Standard issue for all Nexus field operatives during orientation.',
  category: 'module',
  rarity: 'common',
  maxStack: 1,
  weight: 0.6,
  baseValue: 200,
  requiredLevel: 1,
  ilvl: computeIlvl(1, 'common'),
  textureKey: 'item_module_sensor',
  color: 0x153b60,
  equipSlot: 'module',
  effects: [
    { trigger: 'on_equip', effect: { type: 'sensor', detectionRange: 15 } },
    { trigger: 'on_equip', effect: getModuleStats('sensor', 'common', 1) },
  ],
};

export const MODULE_NEXUS_SIGNAL_DETECTOR_RARE: ItemDefinition = {
  id: 'module_nexus_signal_detector_rare',
  displayName: 'Signal Detector',
  description: 'Multi-band signal processing unit calibrated for Nexus intelligence gathering. Detects encrypted communications, power signatures, and electronic countermeasures. Field-calibrated for trade route monitoring operations.',
  category: 'module',
  rarity: 'rare',
  maxStack: 1,
  weight: 0.5,
  baseValue: 800,
  requiredLevel: 11,
  ilvl: computeIlvl(2, 'rare'),
  textureKey: 'item_module_sensor',
  color: 0x1a4a7a,
  equipSlot: 'module',
  effects: [
    { trigger: 'on_equip', effect: { type: 'sensor', detectionRange: 30 } },
    { trigger: 'on_equip', effect: getModuleStats('sensor', 'rare', 2) },
  ],
};

export const MODULE_NEXUS_LATTICE_SENSOR_EPIC: ItemDefinition = {
  id: 'module_nexus_lattice_sensor_epic',
  displayName: 'Lattice Sensor',
  description: 'Distributed sensor mesh operating across multiple frequency domains simultaneously. The lattice topology provides redundant detection paths that maintain coverage even when individual nodes are disrupted. Nexus Intelligence Division standard equipment for contested zone operations.',
  category: 'module',
  rarity: 'epic',
  maxStack: 1,
  weight: 0.5,
  baseValue: 3000,
  requiredLevel: 21,
  ilvl: computeIlvl(3, 'epic'),
  textureKey: 'item_module_sensor',
  color: 0x1f5287,
  equipSlot: 'module',
  effects: [
    { trigger: 'on_equip', effect: { type: 'sensor', detectionRange: 50 } },
    { trigger: 'on_equip', effect: getModuleStats('sensor', 'epic', 3) },
  ],
};

export const MODULE_NEXUS_MERIDIAN_SCANNER_EXOTIC: ItemDefinition = {
  id: 'module_nexus_meridian_scanner_exotic',
  displayName: 'Meridian Scanner',
  description: 'Quantum-entangled sensor array that processes detection data before light-speed propagation would deliver it conventionally. Nexus researchers theorize the scanner exploits the same spatial compression effects observed in Anomaly Zones. The data arrives impossibly fast.',
  category: 'module',
  rarity: 'exotic',
  maxStack: 1,
  weight: 0.4,
  baseValue: 12000,
  requiredLevel: 31,
  ilvl: computeIlvl(4, 'exotic'),
  textureKey: 'item_module_sensor',
  color: 0x245a94,
  equipSlot: 'module',
  effects: [
    { trigger: 'on_equip', effect: { type: 'sensor', detectionRange: 70 } },
    { trigger: 'on_equip', effect: getModuleStats('sensor', 'exotic', 4) },
  ],
};

export const MODULE_NEXUS_ECHO_PRIME_RELAY_LEGENDARY: ItemDefinition = {
  id: 'module_nexus_echo_prime_relay_legendary',
  displayName: 'Echo Prime Relay',
  description: 'A detection system that appears to receive sensor data from the future. Nexus operatives report knowing the positions of targets before they arrive. Echo Prime was developed from analysis of Prior Inhabitant communication devices. The relay\'s signal source has never been identified.',
  category: 'module',
  rarity: 'legendary',
  maxStack: 1,
  weight: 0.3,
  baseValue: 50000,
  requiredLevel: 41,
  ilvl: computeIlvl(5, 'legendary'),
  textureKey: 'item_module_sensor',
  color: 0x2a65a0,
  equipSlot: 'module',
  effects: [
    { trigger: 'on_equip', effect: { type: 'sensor', detectionRange: 88 } },
    { trigger: 'on_equip', effect: getModuleStats('sensor', 'legendary', 5) },
  ],
};

// ============================================================
// NEXUS FRONTIERS — Speed Modules (Line 2: haste)
// ============================================================

export const MODULE_NEXUS_VECTOR_BOOST_COMMON: ItemDefinition = {
  id: 'module_nexus_vector_boost_common',
  displayName: 'Vector Boost Unit',
  description: 'Basic Nexus movement enhancement module. Optimizes servo response timing for faster acceleration. Distributed to all trade route couriers and forward scouts during initial deployment.',
  category: 'module',
  rarity: 'common',
  maxStack: 1,
  weight: 0.6,
  baseValue: 200,
  requiredLevel: 1,
  ilvl: computeIlvl(1, 'common'),
  textureKey: 'item_module_speed',
  color: 0x153b60,
  equipSlot: 'module',
  effects: [
    { trigger: 'on_equip', effect: { type: 'speed', multiplier: 1.05 } },
    { trigger: 'on_equip', effect: getModuleStats('speed', 'common', 1) },
  ],
};

export const MODULE_NEXUS_RELAY_ACCELERATOR_RARE: ItemDefinition = {
  id: 'module_nexus_relay_accelerator_rare',
  displayName: 'Relay Accelerator',
  description: 'Predictive motion-assist system that pre-calculates optimal stride patterns. Reduces wasted energy in movement cycles by anticipating terrain changes. Nexus courier efficiency improved forty percent after deployment.',
  category: 'module',
  rarity: 'rare',
  maxStack: 1,
  weight: 0.5,
  baseValue: 800,
  requiredLevel: 11,
  ilvl: computeIlvl(2, 'rare'),
  textureKey: 'item_module_speed',
  color: 0x1a4a7a,
  equipSlot: 'module',
  effects: [
    { trigger: 'on_equip', effect: { type: 'speed', multiplier: 1.1 } },
    { trigger: 'on_equip', effect: getModuleStats('speed', 'rare', 2) },
  ],
};

export const MODULE_NEXUS_GRID_OPTIMIZER_EPIC: ItemDefinition = {
  id: 'module_nexus_grid_optimizer_epic',
  displayName: 'Grid Optimizer',
  description: 'Neural-linked locomotion enhancement that integrates with the wearer\'s motor cortex signals. Movement becomes reflexive rather than deliberate. Nexus Intelligence Division field agents report the sensation of their body knowing where to go before conscious intent forms.',
  category: 'module',
  rarity: 'epic',
  maxStack: 1,
  weight: 0.5,
  baseValue: 3000,
  requiredLevel: 21,
  ilvl: computeIlvl(3, 'epic'),
  textureKey: 'item_module_speed',
  color: 0x1f5287,
  equipSlot: 'module',
  effects: [
    { trigger: 'on_equip', effect: { type: 'speed', multiplier: 1.15 } },
    { trigger: 'on_equip', effect: getModuleStats('speed', 'epic', 3) },
  ],
};

export const MODULE_NEXUS_PHANTOM_DRIVE_EXOTIC: ItemDefinition = {
  id: 'module_nexus_phantom_drive_exotic',
  displayName: 'Phantom Drive',
  description: 'Experimental locomotion system utilizing micro-spatial compression to shorten effective distance traveled. The wearer covers more ground than their stride length should permit. Classified as a navigation instrument in official documentation.',
  category: 'module',
  rarity: 'exotic',
  maxStack: 1,
  weight: 0.4,
  baseValue: 12000,
  requiredLevel: 31,
  ilvl: computeIlvl(4, 'exotic'),
  textureKey: 'item_module_speed',
  color: 0x245a94,
  equipSlot: 'module',
  effects: [
    { trigger: 'on_equip', effect: { type: 'speed', multiplier: 1.2 } },
    { trigger: 'on_equip', effect: getModuleStats('speed', 'exotic', 4) },
  ],
};

export const MODULE_NEXUS_PULSE_ENGINE_LEGENDARY: ItemDefinition = {
  id: 'module_nexus_pulse_engine_legendary',
  displayName: 'Pulse Engine',
  description: 'A Prior Inhabitant movement device adapted by Nexus engineers. The Pulse Engine does not accelerate the wearer -- it appears to compress the space between origin and destination. Users describe movement as instantaneous rather than rapid. Nexus has made three attempts to scale the technology. All three resulted in spatial anomalies.',
  category: 'module',
  rarity: 'legendary',
  maxStack: 1,
  weight: 0.3,
  baseValue: 50000,
  requiredLevel: 41,
  ilvl: computeIlvl(5, 'legendary'),
  textureKey: 'item_module_speed',
  color: 0x2a65a0,
  equipSlot: 'module',
  effects: [
    { trigger: 'on_equip', effect: { type: 'speed', multiplier: 1.3 } },
    { trigger: 'on_equip', effect: getModuleStats('speed', 'legendary', 5) },
  ],
};

// ============================================================
// UNAFFILIATED — Power Core Modules (Line 1: salvaged Helix, vigor+recovery)
// ============================================================

export const MODULE_UNAFFILIATED_COBBLED_CELL_COMMON: ItemDefinition = {
  id: 'module_unaffiliated_cobbled_cell_common',
  displayName: 'Cobbled Cell',
  description: 'Power module assembled from scavenged Helix energy components. The casing is mismatched and the wiring is creative, but the thermal tap runs steady. Good enough to keep your suit powered in the Scarred Badlands.',
  category: 'module',
  rarity: 'common',
  maxStack: 1,
  weight: 0.6,
  baseValue: 180,
  requiredLevel: 1,
  ilvl: computeIlvl(1, 'common'),
  textureKey: 'item_module_power_core',
  color: 0x5f5f45,
  equipSlot: 'module',
  effects: [
    { trigger: 'on_equip', effect: { type: 'power_core', energyCapacity: 20, rechargeRate: 1 } },
    { trigger: 'on_equip', effect: getModuleStats('power_core', 'common', 1) },
  ],
};

export const MODULE_UNAFFILIATED_SALVAGE_CORE_RARE: ItemDefinition = {
  id: 'module_unaffiliated_salvage_core_rare',
  displayName: 'Salvage Core',
  description: 'Rebuilt energy module incorporating components from at least three different Helix power cells. The field modifications actually improved thermal efficiency beyond original specifications. Corporate engineers would be annoyed if they knew.',
  category: 'module',
  rarity: 'rare',
  maxStack: 1,
  weight: 0.5,
  baseValue: 720,
  requiredLevel: 11,
  ilvl: computeIlvl(2, 'rare'),
  textureKey: 'item_module_power_core',
  color: 0x7a7a5a,
  equipSlot: 'module',
  effects: [
    { trigger: 'on_equip', effect: { type: 'power_core', energyCapacity: 50, rechargeRate: 3 } },
    { trigger: 'on_equip', effect: getModuleStats('power_core', 'rare', 2) },
  ],
};

export const MODULE_UNAFFILIATED_DRIFTER_CELL_EPIC: ItemDefinition = {
  id: 'module_unaffiliated_drifter_cell_epic',
  displayName: 'Drifter Cell',
  description: 'A power module built entirely from salvaged parts that somehow outperforms its corporate-manufactured equivalents. The builder cross-wired a Helix thermal tap with a Nexus voltage regulator in a configuration that no official manual would endorse. It should not work this well.',
  category: 'module',
  rarity: 'epic',
  maxStack: 1,
  weight: 0.5,
  baseValue: 2700,
  requiredLevel: 21,
  ilvl: computeIlvl(3, 'epic'),
  textureKey: 'item_module_power_core',
  color: 0x888865,
  equipSlot: 'module',
  effects: [
    { trigger: 'on_equip', effect: { type: 'power_core', energyCapacity: 80, rechargeRate: 5 } },
    { trigger: 'on_equip', effect: getModuleStats('power_core', 'epic', 3) },
  ],
};

export const MODULE_UNAFFILIATED_RECLAIMED_BATTERY_EXOTIC: ItemDefinition = {
  id: 'module_unaffiliated_reclaimed_battery_exotic',
  displayName: 'Reclaimed Battery',
  description: 'A masterwork of salvage engineering. Components from Helix, Nexus, and Verdant power systems have been fused into a hybrid energy platform that draws from thermal, solar, and bio-chemical sources simultaneously. The original manufacturer logos are still visible under the field modifications.',
  category: 'module',
  rarity: 'exotic',
  maxStack: 1,
  weight: 0.4,
  baseValue: 10800,
  requiredLevel: 31,
  ilvl: computeIlvl(4, 'exotic'),
  textureKey: 'item_module_power_core',
  color: 0x959570,
  equipSlot: 'module',
  effects: [
    { trigger: 'on_equip', effect: { type: 'power_core', energyCapacity: 120, rechargeRate: 8 } },
    { trigger: 'on_equip', effect: getModuleStats('power_core', 'exotic', 4) },
  ],
};

export const MODULE_UNAFFILIATED_WASTELAND_REACTOR_LEGENDARY: ItemDefinition = {
  id: 'module_unaffiliated_wasteland_reactor_legendary',
  displayName: 'Wasteland Reactor',
  description: 'The legendary power module built by "Patch" Maren, the Scarred Badlands\' most respected independent engineer. Incorporates a salvaged Prior Inhabitant energy conduit that Patch found in a collapsed Ancient facility. The reactor converts any available energy source into suit power with near-perfect efficiency. Helix offered Patch a senior position three times. Patch declined three times.',
  category: 'module',
  rarity: 'legendary',
  maxStack: 1,
  weight: 0.3,
  baseValue: 45000,
  requiredLevel: 41,
  ilvl: computeIlvl(5, 'legendary'),
  textureKey: 'item_module_power_core',
  color: 0xa0a07a,
  equipSlot: 'module',
  effects: [
    { trigger: 'on_equip', effect: { type: 'power_core', energyCapacity: 180, rechargeRate: 12 } },
    { trigger: 'on_equip', effect: getModuleStats('power_core', 'legendary', 5) },
  ],
};

// ============================================================
// UNAFFILIATED — Life Support Modules (Line 2: salvaged Verdant, resilience+recovery)
// ============================================================

export const MODULE_UNAFFILIATED_MAKESHIFT_FILTER_COMMON: ItemDefinition = {
  id: 'module_unaffiliated_makeshift_filter_common',
  displayName: 'Makeshift Filter',
  description: 'Atmospheric filter assembled from salvaged Verdant components and whatever sealing compounds were available. The charcoal layer is hand-packed and the membrane is patched, but it keeps the spores out. That is what matters.',
  category: 'module',
  rarity: 'common',
  maxStack: 1,
  weight: 0.6,
  baseValue: 180,
  requiredLevel: 1,
  ilvl: computeIlvl(1, 'common'),
  textureKey: 'item_module_life_support',
  color: 0x5f5f45,
  equipSlot: 'module',
  effects: [
    { trigger: 'on_equip', effect: { type: 'life_support', hazardResistance: 10 } },
    { trigger: 'on_equip', effect: getModuleStats('life_support', 'common', 1) },
  ],
};

export const MODULE_UNAFFILIATED_JURY_RIG_SUPPORT_RARE: ItemDefinition = {
  id: 'module_unaffiliated_jury_rig_support_rare',
  displayName: 'Jury-Rig Support Unit',
  description: 'Field-modified life support combining Verdant bio-filter elements with improvised chemical scrubbers. The filter changes color when it needs replacing, which is more than some corporate units manage. Drifter engineering at its practical finest.',
  category: 'module',
  rarity: 'rare',
  maxStack: 1,
  weight: 0.5,
  baseValue: 720,
  requiredLevel: 11,
  ilvl: computeIlvl(2, 'rare'),
  textureKey: 'item_module_life_support',
  color: 0x7a7a5a,
  equipSlot: 'module',
  effects: [
    { trigger: 'on_equip', effect: { type: 'life_support', hazardResistance: 25 } },
    { trigger: 'on_equip', effect: getModuleStats('life_support', 'rare', 2) },
  ],
};

export const MODULE_UNAFFILIATED_SCROUNGER_RESPIRATOR_EPIC: ItemDefinition = {
  id: 'module_unaffiliated_scrounger_respirator_epic',
  displayName: 'Scrounger Respirator',
  description: 'A hybrid atmospheric system incorporating a salvaged Verdant bio-membrane with hand-built chemical processing stages. The builder understood the Verdant organisms well enough to keep them alive outside their original housing. Verdant researchers found the modifications ingenious, if unauthorized.',
  category: 'module',
  rarity: 'epic',
  maxStack: 1,
  weight: 0.5,
  baseValue: 2700,
  requiredLevel: 21,
  ilvl: computeIlvl(3, 'epic'),
  textureKey: 'item_module_life_support',
  color: 0x888865,
  equipSlot: 'module',
  effects: [
    { trigger: 'on_equip', effect: { type: 'life_support', hazardResistance: 40 } },
    { trigger: 'on_equip', effect: getModuleStats('life_support', 'epic', 3) },
  ],
};

export const MODULE_UNAFFILIATED_IMPROVISED_FILTER_EXOTIC: ItemDefinition = {
  id: 'module_unaffiliated_improvised_filter_exotic',
  displayName: 'Improvised Filter System',
  description: 'An atmospheric processing unit that defies easy categorization. Verdant bio-organisms, Helix thermal catalysts, and Nexus micro-processors work together in a configuration that no single faction would have designed. The builder clearly understood all three systems. The corporations would like to know who that builder is.',
  category: 'module',
  rarity: 'exotic',
  maxStack: 1,
  weight: 0.4,
  baseValue: 10800,
  requiredLevel: 31,
  ilvl: computeIlvl(4, 'exotic'),
  textureKey: 'item_module_life_support',
  color: 0x959570,
  equipSlot: 'module',
  effects: [
    { trigger: 'on_equip', effect: { type: 'life_support', hazardResistance: 60 } },
    { trigger: 'on_equip', effect: getModuleStats('life_support', 'exotic', 4) },
  ],
};

export const MODULE_UNAFFILIATED_TINKERED_LIFE_SYSTEM_LEGENDARY: ItemDefinition = {
  id: 'module_unaffiliated_tinkered_life_system_legendary',
  displayName: 'Tinkered Life System',
  description: '"Old Sal\'s Breather" -- named for the independent engineer who spent twelve years perfecting it from salvaged components. The system integrates Verdant symbiont cultures with a hand-built processing cascade that no corporate lab has replicated. Old Sal claims the secret ingredient is patience. Three factions have offered to buy the design. Old Sal is not selling.',
  category: 'module',
  rarity: 'legendary',
  maxStack: 1,
  weight: 0.3,
  baseValue: 45000,
  requiredLevel: 41,
  ilvl: computeIlvl(5, 'legendary'),
  textureKey: 'item_module_life_support',
  color: 0xa0a07a,
  equipSlot: 'module',
  effects: [
    { trigger: 'on_equip', effect: { type: 'life_support', hazardResistance: 85 } },
    { trigger: 'on_equip', effect: getModuleStats('life_support', 'legendary', 5) },
  ],
};

// ============================================================
// ALL FACTION MODULES
// ============================================================

export const ALL_FACTION_MODULES: readonly ItemDefinition[] = [
  // Verdant Dynamics - Life Support (5)
  MODULE_VERDANT_CHLORO_FILTER_COMMON,
  MODULE_VERDANT_SYMBIONT_FILTER_RARE,
  MODULE_VERDANT_PHYTO_FILTER_EPIC,
  MODULE_VERDANT_CANOPY_RESPIRATOR_EXOTIC,
  MODULE_VERDANT_BLOOM_NETWORK_LEGENDARY,
  // Verdant Dynamics - Sensor (5)
  MODULE_VERDANT_BIOSENSOR_COMMON,
  MODULE_VERDANT_SPORE_ANALYZER_RARE,
  MODULE_VERDANT_ENZYME_DETECTOR_EPIC,
  MODULE_VERDANT_TENDRIL_SCANNER_EXOTIC,
  MODULE_VERDANT_CANOPY_INTERPRETER_LEGENDARY,
  // Helix Extraction - Armor (5)
  MODULE_HELIX_SLAG_PLATING_COMMON,
  MODULE_HELIX_FOUNDRY_PLATE_RARE,
  MODULE_HELIX_TEMPERED_PLATE_EPIC,
  MODULE_HELIX_ANVIL_PLATING_EXOTIC,
  MODULE_HELIX_CRUCIBLE_BULWARK_LEGENDARY,
  // Helix Extraction - Power Core (5)
  MODULE_HELIX_BORE_CELL_COMMON,
  MODULE_HELIX_FURNACE_CELL_RARE,
  MODULE_HELIX_SMELT_CORE_EPIC,
  MODULE_HELIX_INGOT_BATTERY_EXOTIC,
  MODULE_HELIX_CRUCIBLE_REACTOR_LEGENDARY,
  // Nexus Frontiers - Sensor (5)
  MODULE_NEXUS_CIPHER_ARRAY_COMMON,
  MODULE_NEXUS_SIGNAL_DETECTOR_RARE,
  MODULE_NEXUS_LATTICE_SENSOR_EPIC,
  MODULE_NEXUS_MERIDIAN_SCANNER_EXOTIC,
  MODULE_NEXUS_ECHO_PRIME_RELAY_LEGENDARY,
  // Nexus Frontiers - Speed (5)
  MODULE_NEXUS_VECTOR_BOOST_COMMON,
  MODULE_NEXUS_RELAY_ACCELERATOR_RARE,
  MODULE_NEXUS_GRID_OPTIMIZER_EPIC,
  MODULE_NEXUS_PHANTOM_DRIVE_EXOTIC,
  MODULE_NEXUS_PULSE_ENGINE_LEGENDARY,
  // Unaffiliated - Power Core (5)
  MODULE_UNAFFILIATED_COBBLED_CELL_COMMON,
  MODULE_UNAFFILIATED_SALVAGE_CORE_RARE,
  MODULE_UNAFFILIATED_DRIFTER_CELL_EPIC,
  MODULE_UNAFFILIATED_RECLAIMED_BATTERY_EXOTIC,
  MODULE_UNAFFILIATED_WASTELAND_REACTOR_LEGENDARY,
  // Unaffiliated - Life Support (5)
  MODULE_UNAFFILIATED_MAKESHIFT_FILTER_COMMON,
  MODULE_UNAFFILIATED_JURY_RIG_SUPPORT_RARE,
  MODULE_UNAFFILIATED_SCROUNGER_RESPIRATOR_EPIC,
  MODULE_UNAFFILIATED_IMPROVISED_FILTER_EXOTIC,
  MODULE_UNAFFILIATED_TINKERED_LIFE_SYSTEM_LEGENDARY,
];
