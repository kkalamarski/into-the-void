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
  effects: [],
  range: 1,
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
];
