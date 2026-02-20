import type { ItemDefinition } from '../types';
import { computeIlvl } from '../utils';

// ============================================================
// UNIVERSAL TOOLS (1) — starter multi-purpose tool
// ============================================================

export const TOOL_UNIVERSAL_COMMON: ItemDefinition = {
  id: 'tool_universal_common',
  displayName: 'Multi-Tool',
  description:
    'A versatile all-purpose instrument issued to new arrivals. Can be used for basic mining, combat, and research tasks. Not specialized, but reliable.',
  category: 'tool',
  rarity: 'common',
  maxStack: 1,
  weight: 2.0,
  baseValue: 200,
  requiredLevel: 1,
  ilvl: computeIlvl(1, 'common'),
  textureKey: 'item_tool_universal',
  color: 0x888888,
  equipSlot: 'tool',
  toolType: 'universal',
  effects: [
    { trigger: 'on_equip', effect: { type: 'stat_buff', stat: 'power', amount: 3, duration: 0 } },
  ],
  range: 1,
  grantedAbilities: ['basic_strike'],
};

// ============================================================
// MINING TOOLS (5) — resource extraction specialization
// ============================================================

export const TOOL_MINING_COMMON: ItemDefinition = {
  id: 'tool_mining_common',
  displayName: 'Basic Mining Drill',
  description:
    'Standard-issue extraction tool distributed to new arrivals in Helix territory. Effective on exposed mineral deposits in Scarred Badlands Tier I zones.',
  category: 'tool',
  rarity: 'common',
  maxStack: 1,
  weight: 3.0,
  baseValue: 300,
  requiredLevel: 1,
  ilvl: computeIlvl(1, 'common'),
  textureKey: 'item_tool_mining',
  color: 0xcc8844,
  equipSlot: 'tool',
  toolType: 'mining',
  effects: [],
  range: 1,
  grantedAbilities: ['basic_strike'],
};

export const TOOL_MINING_RARE: ItemDefinition = {
  id: 'tool_mining_rare',
  displayName: 'Excavator Mk.II',
  description:
    'A rotary excavation tool with variable-torque settings. Cuts through the silicon-composite rock formations common in Volcanic Reaches efficiently.',
  category: 'tool',
  rarity: 'rare',
  maxStack: 1,
  weight: 3.5,
  baseValue: 1200,
  requiredLevel: 5,
  ilvl: computeIlvl(1, 'rare'),
  textureKey: 'item_tool_mining',
  color: 0xdd9944,
  equipSlot: 'tool',
  toolType: 'mining',
  effects: [],
  range: 2,
  grantedAbilities: ['basic_strike', 'thermal_lance'],
};

export const TOOL_MINING_EPIC: ItemDefinition = {
  id: 'tool_mining_epic',
  displayName: 'Plasma Cutter',
  description:
    'Industrial-grade plasma extraction tool. Melts through any mineral formation and processes the raw yield in a single pass. Helix\'s Deep Shaft Seven teams use nothing else.',
  category: 'tool',
  rarity: 'epic',
  maxStack: 1,
  weight: 4.0,
  baseValue: 5000,
  requiredLevel: 15,
  ilvl: computeIlvl(2, 'epic'),
  textureKey: 'item_tool_mining',
  color: 0xee5500,
  equipSlot: 'tool',
  toolType: 'mining',
  effects: [],
  range: 3,
  grantedAbilities: ['basic_strike', 'thermal_lance', 'plasma_burst'],
};

export const TOOL_MINING_EXOTIC: ItemDefinition = {
  id: 'tool_mining_exotic',
  displayName: 'Void Harvester',
  description:
    'A prototype extraction device that uses localized spatial compression to extract materials from solid rock without physical contact. How it works is proprietary. That it works is undeniable.',
  category: 'tool',
  rarity: 'exotic',
  maxStack: 1,
  weight: 2.5,
  baseValue: 20000,
  requiredLevel: 25,
  ilvl: computeIlvl(3, 'exotic'),
  textureKey: 'item_tool_mining',
  color: 0xff2200,
  equipSlot: 'tool',
  toolType: 'mining',
  effects: [],
  range: 4,
  grantedAbilities: ['basic_strike', 'thermal_lance', 'plasma_burst', 'void_drain'],
};

export const TOOL_MINING_LEGENDARY: ItemDefinition = {
  id: 'tool_mining_legendary',
  displayName: 'Ancient Extractor',
  description:
    'A Prior Inhabitant mining instrument that appears to selectively dematerialize target materials. The Ancients mined on a scale that dwarfs current operations. This tool is a hint at how. Helix classified research teams have been studying it for three years and cannot replicate its mechanism.',
  category: 'tool',
  rarity: 'legendary',
  maxStack: 1,
  weight: 1.5,
  baseValue: 80000,
  requiredLevel: 35,
  ilvl: computeIlvl(4, 'legendary'),
  textureKey: 'item_tool_mining',
  color: 0xff8800,
  equipSlot: 'tool',
  toolType: 'mining',
  effects: [],
  range: 5,
  grantedAbilities: ['basic_strike', 'thermal_lance', 'plasma_burst', 'void_drain', 'overload_pulse'],
};

// ============================================================
// COMBAT TOOLS (5) — combat specialization
// ============================================================

export const TOOL_COMBAT_COMMON: ItemDefinition = {
  id: 'tool_combat_common',
  displayName: 'Stun Rod',
  description:
    'A compact electrostatic baton for close-quarters defense. Standard safety equipment for colonists operating in areas with aggressive wildlife.',
  category: 'tool',
  rarity: 'common',
  maxStack: 1,
  weight: 1.5,
  baseValue: 300,
  requiredLevel: 1,
  ilvl: computeIlvl(1, 'common'),
  textureKey: 'item_tool_combat',
  color: 0x4488cc,
  equipSlot: 'tool',
  toolType: 'combat',
  effects: [],
  range: 1,
  grantedAbilities: ['basic_strike', 'shield_bash'],
};

export const TOOL_COMBAT_RARE: ItemDefinition = {
  id: 'tool_combat_rare',
  displayName: 'Pulse Pistol',
  description:
    'A directed energy sidearm with adjustable pulse frequency. Effective against both organic targets and Terminus\'s silicon-armored fauna. Favored by Nexus operatives.',
  category: 'tool',
  rarity: 'rare',
  maxStack: 1,
  weight: 1.8,
  baseValue: 1200,
  requiredLevel: 5,
  ilvl: computeIlvl(1, 'rare'),
  textureKey: 'item_tool_combat',
  color: 0x5599dd,
  equipSlot: 'tool',
  toolType: 'combat',
  effects: [],
  range: 2,
  grantedAbilities: ['basic_strike', 'shield_bash', 'electrocute'],
};

export const TOOL_COMBAT_EPIC: ItemDefinition = {
  id: 'tool_combat_epic',
  displayName: 'Energy Blade',
  description:
    'A plasma-edged melee weapon that cuts through exo-suit plating. Illegal in ICC-monitored spaces. Ubiquitous in frontier skirmish zones where ICC monitoring doesn\'t reach.',
  category: 'tool',
  rarity: 'epic',
  maxStack: 1,
  weight: 1.2,
  baseValue: 5000,
  requiredLevel: 15,
  ilvl: computeIlvl(2, 'epic'),
  textureKey: 'item_tool_combat',
  color: 0x2266ff,
  equipSlot: 'tool',
  toolType: 'combat',
  effects: [],
  range: 3,
  grantedAbilities: ['basic_strike', 'shield_bash', 'electrocute', 'concussive_strike'],
};

export const TOOL_COMBAT_EXOTIC: ItemDefinition = {
  id: 'tool_combat_exotic',
  displayName: 'Nexus Targeting Rifle',
  description:
    'A Nexus Frontiers precision combat instrument incorporating a predictive targeting system. The AI calculates trajectory before the user decides to fire — a feature that Nexus intelligence divisions find particularly useful.',
  category: 'tool',
  rarity: 'exotic',
  maxStack: 1,
  weight: 3.5,
  baseValue: 20000,
  requiredLevel: 25,
  ilvl: computeIlvl(3, 'exotic'),
  textureKey: 'item_tool_combat',
  color: 0x1133ff,
  equipSlot: 'tool',
  toolType: 'combat',
  effects: [],
  range: 4,
  grantedAbilities: ['basic_strike', 'shield_bash', 'electrocute', 'concussive_strike', 'precision_shot'],
};

export const TOOL_COMBAT_LEGENDARY: ItemDefinition = {
  id: 'tool_combat_legendary',
  displayName: 'Void Annihilator',
  description:
    'A weapon of unknown origin that appears to draw energy from Anomaly zones. It functions in Null Pockets where all other technology fails. The corporations have classified its existence. Several attempts to confiscate it have been made. All were unsuccessful.',
  category: 'tool',
  rarity: 'legendary',
  maxStack: 1,
  weight: 2.0,
  baseValue: 80000,
  requiredLevel: 40,
  ilvl: computeIlvl(4, 'legendary'),
  textureKey: 'item_tool_combat',
  color: 0x0000ff,
  equipSlot: 'tool',
  toolType: 'combat',
  effects: [],
  range: 5,
  grantedAbilities: ['basic_strike', 'shield_bash', 'electrocute', 'concussive_strike', 'precision_shot', 'cryo_blast'],
};

// ============================================================
// RESEARCH TOOLS (5) — research and analysis specialization
// ============================================================

export const TOOL_RESEARCH_COMMON: ItemDefinition = {
  id: 'tool_research_common',
  displayName: 'Field Scanner',
  description:
    'Multi-spectrum analysis unit for field cataloging. Identifies species, mineral compositions, and atmospheric readings. Standard equipment for Verdant Dynamics survey teams.',
  category: 'tool',
  rarity: 'common',
  maxStack: 1,
  weight: 1.0,
  baseValue: 300,
  requiredLevel: 1,
  ilvl: computeIlvl(1, 'common'),
  textureKey: 'item_tool_research',
  color: 0x44cccc,
  equipSlot: 'tool',
  toolType: 'research',
  effects: [],
  range: 1,
  grantedAbilities: ['energy_pulse'],
};

export const TOOL_RESEARCH_RARE: ItemDefinition = {
  id: 'tool_research_rare',
  displayName: 'Compound Analyzer',
  description:
    'A portable laboratory capable of breaking down complex molecular structures. Essential for identifying pharmaceutical compounds in Miasma Marshes and Fungal Depths.',
  category: 'tool',
  rarity: 'rare',
  maxStack: 1,
  weight: 1.5,
  baseValue: 1200,
  requiredLevel: 5,
  ilvl: computeIlvl(1, 'rare'),
  textureKey: 'item_tool_research',
  color: 0x44dddd,
  equipSlot: 'tool',
  toolType: 'research',
  effects: [],
  range: 2,
  grantedAbilities: ['energy_pulse', 'resource_scan'],
};

export const TOOL_RESEARCH_EPIC: ItemDefinition = {
  id: 'tool_research_epic',
  displayName: 'Quantum Probe',
  description:
    'Subatomic analysis device capable of characterizing materials at the quantum level. Used by Nexus research teams studying Anomaly physics. Results are always interesting. They are not always safe to read.',
  category: 'tool',
  rarity: 'epic',
  maxStack: 1,
  weight: 1.2,
  baseValue: 5000,
  requiredLevel: 15,
  ilvl: computeIlvl(2, 'epic'),
  textureKey: 'item_tool_research',
  color: 0x22eeee,
  equipSlot: 'tool',
  toolType: 'research',
  effects: [],
  range: 3,
  grantedAbilities: ['energy_pulse', 'resource_scan', 'analyze_specimen'],
};

export const TOOL_RESEARCH_EXOTIC: ItemDefinition = {
  id: 'tool_research_exotic',
  displayName: 'Helix Gene Decoder',
  description:
    'Helix Extraction\'s flagship biological research instrument, capable of sequencing and partially interpreting Terminus organism genetics in real-time. "Optimizing" native species for corporate use begins here.',
  category: 'tool',
  rarity: 'exotic',
  maxStack: 1,
  weight: 1.8,
  baseValue: 20000,
  requiredLevel: 25,
  ilvl: computeIlvl(3, 'exotic'),
  textureKey: 'item_tool_research',
  color: 0x00ffff,
  equipSlot: 'tool',
  toolType: 'research',
  effects: [],
  range: 4,
  grantedAbilities: ['energy_pulse', 'resource_scan', 'analyze_specimen', 'overclock'],
};

export const TOOL_RESEARCH_LEGENDARY: ItemDefinition = {
  id: 'tool_research_legendary',
  displayName: 'Ancient Interpreter',
  description:
    'A Prior Inhabitant analytical device that appears to process information through mechanisms that current science cannot explain. It responds to questions. Whether it answers them in ways that can be understood is a separate matter. Three researchers have requested permanent reassignment after extended use.',
  category: 'tool',
  rarity: 'legendary',
  maxStack: 1,
  weight: 0.5,
  baseValue: 80000,
  requiredLevel: 40,
  ilvl: computeIlvl(4, 'legendary'),
  textureKey: 'item_tool_research',
  color: 0x88ffff,
  equipSlot: 'tool',
  toolType: 'research',
  effects: [],
  range: 5,
  grantedAbilities: ['energy_pulse', 'resource_scan', 'analyze_specimen', 'overclock', 'void_drain'],
};

// ============================================================
// HYBRID/SPECIALIZED TOOLS (4) — unique ability combinations
// ============================================================

export const TOOL_BIO_PROBE_RARE: ItemDefinition = {
  id: 'tool_bio_probe_rare',
  displayName: 'Verdant Bio-Probe',
  description:
    'Verdant Dynamics field biology instrument for studying Terminus lifeforms. Integrates bio-scanning with defensive protocols — research specimens don\'t always cooperate.',
  category: 'tool',
  rarity: 'rare',
  maxStack: 1,
  weight: 1.5,
  baseValue: 2500,
  requiredLevel: 8,
  ilvl: computeIlvl(1, 'rare'),
  textureKey: 'item_tool_research',
  color: 0x44aa44,
  equipSlot: 'tool',
  toolType: 'bio',
  effects: [],
  range: 2,
  grantedAbilities: ['energy_pulse', 'analyze_specimen', 'nano_repair'],
};

export const TOOL_DEMOLITION_EPIC: ItemDefinition = {
  id: 'tool_demolition_epic',
  displayName: 'Helix Seismic Disruptor',
  description:
    'Helix Extraction heavy demolition instrument for breaking through stubborn formations. The shockwave feature was originally an accident — now it\'s a selling point.',
  category: 'tool',
  rarity: 'epic',
  maxStack: 1,
  weight: 3.0,
  baseValue: 12000,
  requiredLevel: 18,
  ilvl: computeIlvl(2, 'epic'),
  textureKey: 'item_tool_mining',
  color: 0xaa4400,
  equipSlot: 'tool',
  toolType: 'demolition',
  effects: [],
  range: 1,
  grantedAbilities: ['basic_strike', 'concussive_strike', 'overload_pulse', 'cryo_blast'],
};

export const TOOL_STEALTH_EXOTIC: ItemDefinition = {
  id: 'tool_stealth_exotic',
  displayName: 'Nexus Infiltrator Module',
  description:
    'Nexus Frontiers covert operations instrument. Officially classified as a "survey device." The energy drain capability and combat features are not mentioned in the manual.',
  category: 'tool',
  rarity: 'exotic',
  maxStack: 1,
  weight: 1.8,
  baseValue: 35000,
  requiredLevel: 28,
  ilvl: computeIlvl(3, 'exotic'),
  textureKey: 'item_tool_combat',
  color: 0x444488,
  equipSlot: 'tool',
  toolType: 'stealth',
  effects: [],
  range: 4,
  grantedAbilities: ['precision_shot', 'void_drain', 'overclock', 'resource_scan'],
};

export const TOOL_ANOMALY_EXOTIC: ItemDefinition = {
  id: 'tool_anomaly_exotic',
  displayName: 'Anomaly Harmonizer',
  description:
    'An instrument of uncertain origin, found in the border regions of Anomaly Zones. It appears to channel spatial distortion effects. Using it feels wrong — but it works.',
  category: 'tool',
  rarity: 'exotic',
  maxStack: 1,
  weight: 2.0,
  baseValue: 35000,
  requiredLevel: 30,
  ilvl: computeIlvl(3, 'exotic'),
  textureKey: 'item_tool_universal',
  color: 0x8800aa,
  equipSlot: 'tool',
  toolType: 'anomaly',
  effects: [],
  range: 2,
  grantedAbilities: ['void_drain', 'cryo_blast', 'plasma_burst', 'power_surge'],
};

// ============================================================
// ALL TOOLS
// ============================================================

export const ALL_TOOLS: readonly ItemDefinition[] = [
  TOOL_UNIVERSAL_COMMON,
  TOOL_MINING_COMMON,
  TOOL_MINING_RARE,
  TOOL_MINING_EPIC,
  TOOL_MINING_EXOTIC,
  TOOL_MINING_LEGENDARY,
  TOOL_COMBAT_COMMON,
  TOOL_COMBAT_RARE,
  TOOL_COMBAT_EPIC,
  TOOL_COMBAT_EXOTIC,
  TOOL_COMBAT_LEGENDARY,
  TOOL_RESEARCH_COMMON,
  TOOL_RESEARCH_RARE,
  TOOL_RESEARCH_EPIC,
  TOOL_RESEARCH_EXOTIC,
  TOOL_RESEARCH_LEGENDARY,
  TOOL_BIO_PROBE_RARE,
  TOOL_DEMOLITION_EPIC,
  TOOL_STEALTH_EXOTIC,
  TOOL_ANOMALY_EXOTIC,
];
