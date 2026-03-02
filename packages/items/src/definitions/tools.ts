/**
 * Faction Tool Design Reference
 * @see packages/items/FACTION-IDENTITY.md for:
 *   - Tool type assignments per faction (bio, mining, research, etc.)
 *   - Tool ability grant patterns per faction
 *   - Naming conventions ({type}_{faction}_{name}_{rarity})
 *   - Color palette anchors per faction
 */

import type { ItemDefinition, ItemRarity, ToolType } from '../types';
import { computeIlvl, STAT_RARITY_MULTIPLIERS, TIER_MULTIPLIERS } from '../utils';

/**
 * Tool Stat Conventions (Phase 63)
 *
 * Tools provide role-appropriate stat bonuses:
 * - combat, demolition, universal: power (offensive capability)
 * - mining, research: perception (resource/specimen detection)
 * - bio: vigor (biological interaction)
 * - stealth: perception + haste (awareness and quick movement)
 * - anomaly: resilience (anomaly resistance)
 *
 * Stat Formula: base(15) * rarity_mult * tier_mult
 * Rarity: common=1.0, rare=1.4, epic=2.0, exotic=2.8, legendary=4.0
 * Tier: 1=1.0, 2=2.0, 3=3.5, 4=5.5, 5=8.0
 *
 * Gathering Stats (Phase 85):
 * - mining/bio tools: yieldBonus and gatherSpeed based on tier
 * - Tier 1: 0.0, Tier 2: 0.1, Tier 3: 0.2, Tier 4: 0.3, Tier 5: 0.5/0.4
 */

/**
 * Generate stat bonuses for a tool based on toolType, rarity, and tier
 */
function getToolStats(toolType: ToolType, rarity: ItemRarity, tier: 1 | 2 | 3 | 4 | 5): { type: 'stats'; [key: string]: number | string } {
  const base = 15;
  const rarityMult = STAT_RARITY_MULTIPLIERS[rarity];
  const tierMult = TIER_MULTIPLIERS[tier];
  const value = Math.round(base * rarityMult * tierMult);

  // Gathering stat bonuses (Phase 85)
  const gatheringStats: { yieldBonus?: number; gatherSpeed?: number } = {};
  if (toolType === 'mining' || toolType === 'bio') {
    switch (tier) {
      case 1:
        gatheringStats.yieldBonus = 0.0;
        gatheringStats.gatherSpeed = 0.0;
        break;
      case 2:
        gatheringStats.yieldBonus = 0.1;
        gatheringStats.gatherSpeed = 0.1;
        break;
      case 3:
        gatheringStats.yieldBonus = 0.2;
        gatheringStats.gatherSpeed = 0.2;
        break;
      case 4:
        gatheringStats.yieldBonus = 0.3;
        gatheringStats.gatherSpeed = 0.3;
        break;
      case 5:
        gatheringStats.yieldBonus = 0.5;
        gatheringStats.gatherSpeed = 0.4;
        break;
    }
  }

  switch (toolType) {
    case 'combat':
    case 'demolition':
    case 'universal':
      return { type: 'stats', power: value };
    case 'mining':
      return { type: 'stats', perception: value, ...gatheringStats };
    case 'research':
      return { type: 'stats', perception: value };
    case 'bio':
      return { type: 'stats', vigor: value, ...gatheringStats };
    case 'stealth':
      return { type: 'stats', perception: Math.round(value * 0.6), haste: Math.round(value * 0.4) };
    case 'anomaly':
      return { type: 'stats', resilience: value };
    default:
      return { type: 'stats', power: value };
  }
}

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
    { trigger: 'on_equip', effect: { type: 'stats', power: 3 } },
  ],
  range: 1,
  grantedAbilities: ['basic_strike', 'basic_mine', 'basic_harvest'],
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
  effects: [
    { trigger: 'on_equip', effect: getToolStats('mining', 'common', 1) },
  ],
  range: 1,
  grantedAbilities: ['mine', 'basic_strike'],
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
  effects: [
    { trigger: 'on_equip', effect: getToolStats('mining', 'rare', 1) },
  ],
  range: 2,
  grantedAbilities: ['mine', 'basic_strike', 'thermal_lance'],
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
  effects: [
    { trigger: 'on_equip', effect: getToolStats('mining', 'epic', 2) },
  ],
  range: 3,
  grantedAbilities: ['mine', 'basic_strike', 'thermal_lance', 'plasma_burst'],
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
  effects: [
    { trigger: 'on_equip', effect: getToolStats('mining', 'exotic', 3) },
  ],
  range: 4,
  grantedAbilities: ['mine', 'basic_strike', 'thermal_lance', 'plasma_burst', 'void_drain'],
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
  effects: [
    { trigger: 'on_equip', effect: getToolStats('mining', 'legendary', 4) },
  ],
  range: 5,
  grantedAbilities: ['mine', 'basic_strike', 'thermal_lance', 'plasma_burst', 'void_drain', 'overload_pulse'],
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
  effects: [
    { trigger: 'on_equip', effect: getToolStats('combat', 'common', 1) },
  ],
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
  effects: [
    { trigger: 'on_equip', effect: getToolStats('combat', 'rare', 1) },
  ],
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
  effects: [
    { trigger: 'on_equip', effect: getToolStats('combat', 'epic', 2) },
  ],
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
  effects: [
    { trigger: 'on_equip', effect: getToolStats('combat', 'exotic', 3) },
  ],
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
  effects: [
    { trigger: 'on_equip', effect: getToolStats('combat', 'legendary', 4) },
  ],
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
  effects: [
    { trigger: 'on_equip', effect: getToolStats('research', 'common', 1) },
  ],
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
  effects: [
    { trigger: 'on_equip', effect: getToolStats('research', 'rare', 1) },
  ],
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
  effects: [
    { trigger: 'on_equip', effect: getToolStats('research', 'epic', 2) },
  ],
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
  effects: [
    { trigger: 'on_equip', effect: getToolStats('research', 'exotic', 3) },
  ],
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
  effects: [
    { trigger: 'on_equip', effect: getToolStats('research', 'legendary', 4) },
  ],
  range: 5,
  grantedAbilities: ['energy_pulse', 'resource_scan', 'analyze_specimen', 'overclock', 'void_drain'],
};

// ============================================================
// INTERMEDIATE COMMON TOOLS — scaling progression
// ============================================================

// Level 10 common tools
export const TOOL_MINING_COMMON_MK2: ItemDefinition = {
  id: 'tool_mining_common_mk2',
  displayName: 'Mining Drill Mk.II',
  description:
    'An improved extraction tool with better torque control. Standard upgrade for operatives working deeper sites.',
  category: 'tool',
  rarity: 'common',
  maxStack: 1,
  weight: 3.2,
  baseValue: 800,
  requiredLevel: 10,
  ilvl: computeIlvl(2, 'common'),
  textureKey: 'item_tool_mining',
  color: 0xdd9955,
  equipSlot: 'tool',
  toolType: 'mining',
  effects: [
    { trigger: 'on_equip', effect: getToolStats('mining', 'common', 2) },
  ],
  range: 1,
  grantedAbilities: ['mine', 'basic_strike', 'thermal_lance'],
};

export const TOOL_COMBAT_COMMON_MK2: ItemDefinition = {
  id: 'tool_combat_common_mk2',
  displayName: 'Shock Baton Mk.II',
  description:
    'Enhanced electrostatic weapon with improved charge capacity. Favored by station security personnel.',
  category: 'tool',
  rarity: 'common',
  maxStack: 1,
  weight: 1.7,
  baseValue: 800,
  requiredLevel: 10,
  ilvl: computeIlvl(2, 'common'),
  textureKey: 'item_tool_combat',
  color: 0x5599dd,
  equipSlot: 'tool',
  toolType: 'combat',
  effects: [
    { trigger: 'on_equip', effect: getToolStats('combat', 'common', 2) },
  ],
  range: 1,
  grantedAbilities: ['basic_strike', 'shield_bash', 'electrocute'],
};

export const TOOL_RESEARCH_COMMON_MK2: ItemDefinition = {
  id: 'tool_research_common_mk2',
  displayName: 'Field Scanner Mk.II',
  description:
    'Enhanced analysis unit with improved spectrum coverage. Required for accurate Tier II biome cataloging.',
  category: 'tool',
  rarity: 'common',
  maxStack: 1,
  weight: 1.2,
  baseValue: 800,
  requiredLevel: 10,
  ilvl: computeIlvl(2, 'common'),
  textureKey: 'item_tool_research',
  color: 0x55dddd,
  equipSlot: 'tool',
  toolType: 'research',
  effects: [
    { trigger: 'on_equip', effect: getToolStats('research', 'common', 2) },
  ],
  range: 2,
  grantedAbilities: ['energy_pulse', 'resource_scan'],
};

// Level 20 common tools
export const TOOL_MINING_COMMON_MK3: ItemDefinition = {
  id: 'tool_mining_common_mk3',
  displayName: 'Industrial Drill',
  description:
    'Heavy-duty extraction equipment for serious mining operations. Cuts through compressed mineral deposits with ease.',
  category: 'tool',
  rarity: 'common',
  maxStack: 1,
  weight: 3.5,
  baseValue: 2500,
  requiredLevel: 20,
  ilvl: computeIlvl(3, 'common'),
  textureKey: 'item_tool_mining',
  color: 0xee8844,
  equipSlot: 'tool',
  toolType: 'mining',
  effects: [
    { trigger: 'on_equip', effect: getToolStats('mining', 'common', 3) },
  ],
  range: 2,
  grantedAbilities: ['mine', 'basic_strike', 'thermal_lance', 'plasma_burst'],
};

export const TOOL_COMBAT_COMMON_MK3: ItemDefinition = {
  id: 'tool_combat_common_mk3',
  displayName: 'Pulse Carbine',
  description:
    'Standard-issue directed energy weapon. Reliable performance in most combat situations.',
  category: 'tool',
  rarity: 'common',
  maxStack: 1,
  weight: 2.5,
  baseValue: 2500,
  requiredLevel: 20,
  ilvl: computeIlvl(3, 'common'),
  textureKey: 'item_tool_combat',
  color: 0x4488ee,
  equipSlot: 'tool',
  toolType: 'combat',
  effects: [
    { trigger: 'on_equip', effect: getToolStats('combat', 'common', 3) },
  ],
  range: 3,
  grantedAbilities: ['basic_strike', 'shield_bash', 'electrocute', 'concussive_strike'],
};

export const TOOL_RESEARCH_COMMON_MK3: ItemDefinition = {
  id: 'tool_research_common_mk3',
  displayName: 'Analysis Suite',
  description:
    'Comprehensive field laboratory in portable form. Handles most cataloging and research requirements.',
  category: 'tool',
  rarity: 'common',
  maxStack: 1,
  weight: 1.5,
  baseValue: 2500,
  requiredLevel: 20,
  ilvl: computeIlvl(3, 'common'),
  textureKey: 'item_tool_research',
  color: 0x44eeee,
  equipSlot: 'tool',
  toolType: 'research',
  effects: [
    { trigger: 'on_equip', effect: getToolStats('research', 'common', 3) },
  ],
  range: 3,
  grantedAbilities: ['energy_pulse', 'resource_scan', 'analyze_specimen'],
};

// Level 30 common tools
export const TOOL_MINING_COMMON_MK4: ItemDefinition = {
  id: 'tool_mining_common_mk4',
  displayName: 'Deep Core Extractor',
  description:
    'Professional-grade mining equipment. Capable of reaching mineral veins that cheaper tools cannot access.',
  category: 'tool',
  rarity: 'common',
  maxStack: 1,
  weight: 3.8,
  baseValue: 6000,
  requiredLevel: 30,
  ilvl: computeIlvl(4, 'common'),
  textureKey: 'item_tool_mining',
  color: 0xff7733,
  equipSlot: 'tool',
  toolType: 'mining',
  effects: [
    { trigger: 'on_equip', effect: getToolStats('mining', 'common', 4) },
  ],
  range: 3,
  grantedAbilities: ['mine', 'basic_strike', 'thermal_lance', 'plasma_burst', 'overload_pulse'],
};

export const TOOL_COMBAT_COMMON_MK4: ItemDefinition = {
  id: 'tool_combat_common_mk4',
  displayName: 'Heavy Pulse Rifle',
  description:
    'High-powered energy weapon for serious combat operations. Standard armament for corporate security forces.',
  category: 'tool',
  rarity: 'common',
  maxStack: 1,
  weight: 3.0,
  baseValue: 6000,
  requiredLevel: 30,
  ilvl: computeIlvl(4, 'common'),
  textureKey: 'item_tool_combat',
  color: 0x3377ff,
  equipSlot: 'tool',
  toolType: 'combat',
  effects: [
    { trigger: 'on_equip', effect: getToolStats('combat', 'common', 4) },
  ],
  range: 4,
  grantedAbilities: ['basic_strike', 'shield_bash', 'electrocute', 'concussive_strike', 'precision_shot'],
};

export const TOOL_RESEARCH_COMMON_MK4: ItemDefinition = {
  id: 'tool_research_common_mk4',
  displayName: 'Quantum Analyzer',
  description:
    'Advanced research equipment for detailed specimen analysis. Required for Tier III+ research operations.',
  category: 'tool',
  rarity: 'common',
  maxStack: 1,
  weight: 1.3,
  baseValue: 6000,
  requiredLevel: 30,
  ilvl: computeIlvl(4, 'common'),
  textureKey: 'item_tool_research',
  color: 0x33ffff,
  equipSlot: 'tool',
  toolType: 'research',
  effects: [
    { trigger: 'on_equip', effect: getToolStats('research', 'common', 4) },
  ],
  range: 4,
  grantedAbilities: ['energy_pulse', 'resource_scan', 'analyze_specimen', 'overclock'],
};

// Level 40 common tools
export const TOOL_MINING_COMMON_MK5: ItemDefinition = {
  id: 'tool_mining_common_mk5',
  displayName: 'Precision Bore System',
  description:
    'The finest conventional mining equipment available. Maximizes yield while minimizing waste.',
  category: 'tool',
  rarity: 'common',
  maxStack: 1,
  weight: 3.5,
  baseValue: 15000,
  requiredLevel: 40,
  ilvl: computeIlvl(5, 'common'),
  textureKey: 'item_tool_mining',
  color: 0xff6622,
  equipSlot: 'tool',
  toolType: 'mining',
  effects: [
    { trigger: 'on_equip', effect: getToolStats('mining', 'common', 5) },
  ],
  range: 4,
  grantedAbilities: ['mine', 'basic_strike', 'thermal_lance', 'plasma_burst', 'overload_pulse', 'void_drain'],
};

export const TOOL_COMBAT_COMMON_MK5: ItemDefinition = {
  id: 'tool_combat_common_mk5',
  displayName: 'Assault Platform',
  description:
    'Top-tier conventional combat equipment. Issued to elite corporate security and veteran operatives.',
  category: 'tool',
  rarity: 'common',
  maxStack: 1,
  weight: 3.2,
  baseValue: 15000,
  requiredLevel: 40,
  ilvl: computeIlvl(5, 'common'),
  textureKey: 'item_tool_combat',
  color: 0x2266ff,
  equipSlot: 'tool',
  toolType: 'combat',
  effects: [
    { trigger: 'on_equip', effect: getToolStats('combat', 'common', 5) },
  ],
  range: 5,
  grantedAbilities: ['basic_strike', 'shield_bash', 'electrocute', 'concussive_strike', 'precision_shot', 'cryo_blast'],
};

export const TOOL_RESEARCH_COMMON_MK5: ItemDefinition = {
  id: 'tool_research_common_mk5',
  displayName: 'Integrated Research Platform',
  description:
    'Comprehensive analysis system for professional researchers. Handles all standard cataloging requirements.',
  category: 'tool',
  rarity: 'common',
  maxStack: 1,
  weight: 1.4,
  baseValue: 15000,
  requiredLevel: 40,
  ilvl: computeIlvl(5, 'common'),
  textureKey: 'item_tool_research',
  color: 0x22ffff,
  equipSlot: 'tool',
  toolType: 'research',
  effects: [
    { trigger: 'on_equip', effect: getToolStats('research', 'common', 5) },
  ],
  range: 5,
  grantedAbilities: ['energy_pulse', 'resource_scan', 'analyze_specimen', 'overclock', 'void_drain'],
};

// ============================================================
// INTERMEDIATE RARE TOOLS — scaling progression
// ============================================================

// Level 15 rare tools
export const TOOL_MINING_RARE_MK2: ItemDefinition = {
  id: 'tool_mining_rare_mk2',
  displayName: 'Thermal Excavator',
  description:
    'High-performance extraction tool with integrated thermal processing. Preferred by Helix deep-site teams.',
  category: 'tool',
  rarity: 'rare',
  maxStack: 1,
  weight: 3.5,
  baseValue: 3500,
  requiredLevel: 15,
  ilvl: computeIlvl(2, 'rare'),
  textureKey: 'item_tool_mining',
  color: 0xee6633,
  equipSlot: 'tool',
  toolType: 'mining',
  effects: [
    { trigger: 'on_equip', effect: getToolStats('mining', 'rare', 2) },
  ],
  range: 2,
  grantedAbilities: ['mine', 'basic_strike', 'thermal_lance', 'plasma_burst'],
};

export const TOOL_COMBAT_RARE_MK2: ItemDefinition = {
  id: 'tool_combat_rare_mk2',
  displayName: 'Tactical Sidearm',
  description:
    'Military-specification combat weapon. Balanced performance for tactical operations.',
  category: 'tool',
  rarity: 'rare',
  maxStack: 1,
  weight: 2.0,
  baseValue: 3500,
  requiredLevel: 15,
  ilvl: computeIlvl(2, 'rare'),
  textureKey: 'item_tool_combat',
  color: 0x4477ee,
  equipSlot: 'tool',
  toolType: 'combat',
  effects: [
    { trigger: 'on_equip', effect: getToolStats('combat', 'rare', 2) },
  ],
  range: 3,
  grantedAbilities: ['basic_strike', 'shield_bash', 'electrocute', 'concussive_strike'],
};

export const TOOL_RESEARCH_RARE_MK2: ItemDefinition = {
  id: 'tool_research_rare_mk2',
  displayName: 'Spectral Analyzer',
  description:
    'Enhanced research equipment with expanded detection capabilities. Used by Verdant field scientists.',
  category: 'tool',
  rarity: 'rare',
  maxStack: 1,
  weight: 1.4,
  baseValue: 3500,
  requiredLevel: 15,
  ilvl: computeIlvl(2, 'rare'),
  textureKey: 'item_tool_research',
  color: 0x44ddee,
  equipSlot: 'tool',
  toolType: 'research',
  effects: [
    { trigger: 'on_equip', effect: getToolStats('research', 'rare', 2) },
  ],
  range: 3,
  grantedAbilities: ['energy_pulse', 'resource_scan', 'analyze_specimen'],
};

// Level 25 rare tools
export const TOOL_MINING_RARE_MK3: ItemDefinition = {
  id: 'tool_mining_rare_mk3',
  displayName: 'Magma Cutter',
  description:
    'Industrial extraction tool using superheated plasma. Cuts through any mineral formation.',
  category: 'tool',
  rarity: 'rare',
  maxStack: 1,
  weight: 3.8,
  baseValue: 10000,
  requiredLevel: 25,
  ilvl: computeIlvl(3, 'rare'),
  textureKey: 'item_tool_mining',
  color: 0xff5522,
  equipSlot: 'tool',
  toolType: 'mining',
  effects: [
    { trigger: 'on_equip', effect: getToolStats('mining', 'rare', 3) },
  ],
  range: 3,
  grantedAbilities: ['mine', 'basic_strike', 'thermal_lance', 'plasma_burst', 'overload_pulse'],
};

export const TOOL_COMBAT_RARE_MK3: ItemDefinition = {
  id: 'tool_combat_rare_mk3',
  displayName: 'Assault Carbine',
  description:
    'High-powered combat weapon for dangerous operations. Standard issue for corporate strike teams.',
  category: 'tool',
  rarity: 'rare',
  maxStack: 1,
  weight: 2.8,
  baseValue: 10000,
  requiredLevel: 25,
  ilvl: computeIlvl(3, 'rare'),
  textureKey: 'item_tool_combat',
  color: 0x3366ff,
  equipSlot: 'tool',
  toolType: 'combat',
  effects: [
    { trigger: 'on_equip', effect: getToolStats('combat', 'rare', 3) },
  ],
  range: 4,
  grantedAbilities: ['basic_strike', 'shield_bash', 'electrocute', 'concussive_strike', 'precision_shot'],
};

export const TOOL_RESEARCH_RARE_MK3: ItemDefinition = {
  id: 'tool_research_rare_mk3',
  displayName: 'Molecular Scanner',
  description:
    'Advanced analysis equipment for detailed molecular-level research. Required for classified projects.',
  category: 'tool',
  rarity: 'rare',
  maxStack: 1,
  weight: 1.5,
  baseValue: 10000,
  requiredLevel: 25,
  ilvl: computeIlvl(3, 'rare'),
  textureKey: 'item_tool_research',
  color: 0x33eeff,
  equipSlot: 'tool',
  toolType: 'research',
  effects: [
    { trigger: 'on_equip', effect: getToolStats('research', 'rare', 3) },
  ],
  range: 4,
  grantedAbilities: ['energy_pulse', 'resource_scan', 'analyze_specimen', 'overclock'],
};

// Level 35 rare tools
export const TOOL_MINING_RARE_MK4: ItemDefinition = {
  id: 'tool_mining_rare_mk4',
  displayName: 'Fusion Extractor',
  description:
    'Elite extraction equipment using controlled fusion reactions. Reaches deposits other tools cannot.',
  category: 'tool',
  rarity: 'rare',
  maxStack: 1,
  weight: 3.5,
  baseValue: 22000,
  requiredLevel: 35,
  ilvl: computeIlvl(4, 'rare'),
  textureKey: 'item_tool_mining',
  color: 0xff4411,
  equipSlot: 'tool',
  toolType: 'mining',
  effects: [
    { trigger: 'on_equip', effect: getToolStats('mining', 'rare', 4) },
  ],
  range: 4,
  grantedAbilities: ['mine', 'basic_strike', 'thermal_lance', 'plasma_burst', 'overload_pulse', 'void_drain'],
};

export const TOOL_COMBAT_RARE_MK4: ItemDefinition = {
  id: 'tool_combat_rare_mk4',
  displayName: 'Precision Rifle',
  description:
    'Elite combat weapon with enhanced targeting systems. Favored by Nexus intelligence operatives.',
  category: 'tool',
  rarity: 'rare',
  maxStack: 1,
  weight: 3.0,
  baseValue: 22000,
  requiredLevel: 35,
  ilvl: computeIlvl(4, 'rare'),
  textureKey: 'item_tool_combat',
  color: 0x2255ff,
  equipSlot: 'tool',
  toolType: 'combat',
  effects: [
    { trigger: 'on_equip', effect: getToolStats('combat', 'rare', 4) },
  ],
  range: 5,
  grantedAbilities: ['basic_strike', 'shield_bash', 'electrocute', 'concussive_strike', 'precision_shot', 'cryo_blast'],
};

export const TOOL_RESEARCH_RARE_MK4: ItemDefinition = {
  id: 'tool_research_rare_mk4',
  displayName: 'Subatomic Probe',
  description:
    'High-precision research equipment for advanced analysis. Classified corporate research standard.',
  category: 'tool',
  rarity: 'rare',
  maxStack: 1,
  weight: 1.3,
  baseValue: 22000,
  requiredLevel: 35,
  ilvl: computeIlvl(4, 'rare'),
  textureKey: 'item_tool_research',
  color: 0x22eeff,
  equipSlot: 'tool',
  toolType: 'research',
  effects: [
    { trigger: 'on_equip', effect: getToolStats('research', 'rare', 4) },
  ],
  range: 5,
  grantedAbilities: ['energy_pulse', 'resource_scan', 'analyze_specimen', 'overclock', 'void_drain'],
};

// Level 45 rare tools
export const TOOL_MINING_RARE_MK5: ItemDefinition = {
  id: 'tool_mining_rare_mk5',
  displayName: 'Quantum Bore',
  description:
    'The finest mining equipment available through standard channels. Maximum efficiency, maximum yield.',
  category: 'tool',
  rarity: 'rare',
  maxStack: 1,
  weight: 3.2,
  baseValue: 40000,
  requiredLevel: 45,
  ilvl: computeIlvl(5, 'rare'),
  textureKey: 'item_tool_mining',
  color: 0xff3300,
  equipSlot: 'tool',
  toolType: 'mining',
  effects: [
    { trigger: 'on_equip', effect: getToolStats('mining', 'rare', 5) },
  ],
  range: 5,
  grantedAbilities: ['mine', 'basic_strike', 'thermal_lance', 'plasma_burst', 'overload_pulse', 'void_drain', 'cryo_blast'],
};

export const TOOL_COMBAT_RARE_MK5: ItemDefinition = {
  id: 'tool_combat_rare_mk5',
  displayName: 'Elite Battle Platform',
  description:
    'Top-tier conventional combat system. The best that credits can buy through legitimate channels.',
  category: 'tool',
  rarity: 'rare',
  maxStack: 1,
  weight: 3.5,
  baseValue: 40000,
  requiredLevel: 45,
  ilvl: computeIlvl(5, 'rare'),
  textureKey: 'item_tool_combat',
  color: 0x1144ff,
  equipSlot: 'tool',
  toolType: 'combat',
  effects: [
    { trigger: 'on_equip', effect: getToolStats('combat', 'rare', 5) },
  ],
  range: 5,
  grantedAbilities: ['basic_strike', 'shield_bash', 'electrocute', 'concussive_strike', 'precision_shot', 'cryo_blast', 'power_surge'],
};

export const TOOL_RESEARCH_RARE_MK5: ItemDefinition = {
  id: 'tool_research_rare_mk5',
  displayName: 'Xenoanalysis Platform',
  description:
    'Comprehensive research system for professional xenobiologists. The pinnacle of conventional analysis technology.',
  category: 'tool',
  rarity: 'rare',
  maxStack: 1,
  weight: 1.5,
  baseValue: 40000,
  requiredLevel: 45,
  ilvl: computeIlvl(5, 'rare'),
  textureKey: 'item_tool_research',
  color: 0x11eeff,
  equipSlot: 'tool',
  toolType: 'research',
  effects: [
    { trigger: 'on_equip', effect: getToolStats('research', 'rare', 5) },
  ],
  range: 5,
  grantedAbilities: ['energy_pulse', 'resource_scan', 'analyze_specimen', 'overclock', 'void_drain', 'power_surge'],
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
  effects: [
    { trigger: 'on_equip', effect: getToolStats('bio', 'rare', 1) },
  ],
  range: 2,
  grantedAbilities: ['harvest', 'energy_pulse', 'analyze_specimen', 'nano_repair'],
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
  effects: [
    { trigger: 'on_equip', effect: getToolStats('demolition', 'epic', 2) },
  ],
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
  effects: [
    { trigger: 'on_equip', effect: getToolStats('stealth', 'exotic', 3) },
  ],
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
  effects: [
    { trigger: 'on_equip', effect: getToolStats('anomaly', 'exotic', 4) },
  ],
  range: 2,
  grantedAbilities: ['void_drain', 'cryo_blast', 'plasma_burst', 'power_surge'],
};

// ============================================================
// ALL TOOLS
// ============================================================

export const ALL_TOOLS: readonly ItemDefinition[] = [
  // Common tools by level
  TOOL_UNIVERSAL_COMMON,
  TOOL_MINING_COMMON,
  TOOL_COMBAT_COMMON,
  TOOL_RESEARCH_COMMON,
  TOOL_MINING_COMMON_MK2,
  TOOL_COMBAT_COMMON_MK2,
  TOOL_RESEARCH_COMMON_MK2,
  TOOL_MINING_COMMON_MK3,
  TOOL_COMBAT_COMMON_MK3,
  TOOL_RESEARCH_COMMON_MK3,
  TOOL_MINING_COMMON_MK4,
  TOOL_COMBAT_COMMON_MK4,
  TOOL_RESEARCH_COMMON_MK4,
  TOOL_MINING_COMMON_MK5,
  TOOL_COMBAT_COMMON_MK5,
  TOOL_RESEARCH_COMMON_MK5,
  // Rare tools by level
  TOOL_MINING_RARE,
  TOOL_COMBAT_RARE,
  TOOL_RESEARCH_RARE,
  TOOL_BIO_PROBE_RARE,
  TOOL_MINING_RARE_MK2,
  TOOL_COMBAT_RARE_MK2,
  TOOL_RESEARCH_RARE_MK2,
  TOOL_MINING_RARE_MK3,
  TOOL_COMBAT_RARE_MK3,
  TOOL_RESEARCH_RARE_MK3,
  TOOL_MINING_RARE_MK4,
  TOOL_COMBAT_RARE_MK4,
  TOOL_RESEARCH_RARE_MK4,
  TOOL_MINING_RARE_MK5,
  TOOL_COMBAT_RARE_MK5,
  TOOL_RESEARCH_RARE_MK5,
  // Epic+ tools
  TOOL_MINING_EPIC,
  TOOL_COMBAT_EPIC,
  TOOL_RESEARCH_EPIC,
  TOOL_DEMOLITION_EPIC,
  TOOL_MINING_EXOTIC,
  TOOL_COMBAT_EXOTIC,
  TOOL_RESEARCH_EXOTIC,
  TOOL_STEALTH_EXOTIC,
  TOOL_ANOMALY_EXOTIC,
  TOOL_MINING_LEGENDARY,
  TOOL_COMBAT_LEGENDARY,
  TOOL_RESEARCH_LEGENDARY,
];
