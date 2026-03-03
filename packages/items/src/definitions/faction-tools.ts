/**
 * Faction Tool Definitions (Phase 113)
 *
 * 40 faction tools across 4 factions (10 each: 2 lines x 5 rarities).
 * All stats generated via getToolStats() -- no hand-coded stat values.
 * Tools grant faction-aligned abilities that escalate with rarity.
 *
 * @see packages/items/FACTION-IDENTITY.md for:
 *   - Tool type assignments per faction (Section 5)
 *   - Tool ability grant patterns (Section 5)
 *   - Naming conventions (Section 3)
 *   - Color palette anchors (Section 4)
 */

import type { ItemDefinition, ItemRarity, ToolType } from '../types';
import { computeIlvl, STAT_RARITY_MULTIPLIERS, TIER_MULTIPLIERS } from '../utils';

/**
 * Generate stat bonuses for a tool based on toolType, rarity, and tier
 * (Replicated from tools.ts -- not exported there)
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
// VERDANT DYNAMICS — Bio Tools (Line 1: bio)
// ============================================================

export const TOOL_VERDANT_ENZYME_PROBE_COMMON: ItemDefinition = {
  id: 'tool_verdant_enzyme_probe_common',
  displayName: 'Verdant Field Bioprobe',
  description: 'Basic Verdant bio-interface tool for specimen interaction and environmental sampling. Issued to all incoming research personnel as their primary field instrument.',
  category: 'tool',
  rarity: 'common',
  maxStack: 1,
  weight: 1.5,
  baseValue: 300,
  requiredLevel: 1,
  ilvl: computeIlvl(1, 'common'),
  textureKey: 'item_tool_research',
  color: 0x235f2f,
  equipSlot: 'tool',
  toolType: 'bio',
  effects: [
    { trigger: 'on_equip', effect: getToolStats('bio', 'common', 1) },
  ],
  range: 1,
  grantedAbilities: ['harvest', 'energy_pulse'],
};

export const TOOL_VERDANT_TENDRIL_EXTRACTOR_RARE: ItemDefinition = {
  id: 'tool_verdant_tendril_extractor_rare',
  displayName: 'Tendril Extractor',
  description: 'Specialized bio-interface tool with living tendrils that interface directly with Terminus flora nervous systems. Enables non-destructive sampling of even the most delicate symbiont organisms. The tendrils retract when not in use.',
  category: 'tool',
  rarity: 'rare',
  maxStack: 1,
  weight: 1.5,
  baseValue: 1200,
  requiredLevel: 11,
  ilvl: computeIlvl(2, 'rare'),
  textureKey: 'item_tool_research',
  color: 0x2a7a3a,
  equipSlot: 'tool',
  toolType: 'bio',
  effects: [
    { trigger: 'on_equip', effect: getToolStats('bio', 'rare', 2) },
  ],
  range: 2,
  grantedAbilities: ['harvest', 'analyze_specimen', 'energy_pulse'],
};

export const TOOL_VERDANT_PHYTO_SAMPLER_EPIC: ItemDefinition = {
  id: 'tool_verdant_phyto_sampler_epic',
  displayName: 'Phyto-Sampler',
  description: 'Advanced bio-extraction instrument incorporating engineered enzyme injectors and real-time genetic analysis. Can identify, categorize, and safely extract samples from organisms that would dissolve standard collection equipment. Verdant Bio-Engineering Division\'s field instrument of choice.',
  category: 'tool',
  rarity: 'epic',
  maxStack: 1,
  weight: 1.5,
  baseValue: 5000,
  requiredLevel: 21,
  ilvl: computeIlvl(3, 'epic'),
  textureKey: 'item_tool_research',
  color: 0x2f8a40,
  equipSlot: 'tool',
  toolType: 'bio',
  effects: [
    { trigger: 'on_equip', effect: getToolStats('bio', 'epic', 3) },
  ],
  range: 2,
  grantedAbilities: ['harvest', 'analyze_specimen', 'energy_pulse', 'nano_repair'],
};

export const TOOL_VERDANT_SYMBIONT_INTERFACE_EXOTIC: ItemDefinition = {
  id: 'tool_verdant_symbiont_interface_exotic',
  displayName: 'Symbiont Interface',
  description: 'Experimental bio-tool that establishes a temporary neural bridge between the user and target organism. Researchers describe the experience as "borrowing the organism\'s perspective." Extraction yields are perfect because the tool understands exactly how the organism is structured.',
  category: 'tool',
  rarity: 'exotic',
  maxStack: 1,
  weight: 1.4,
  baseValue: 20000,
  requiredLevel: 31,
  ilvl: computeIlvl(4, 'exotic'),
  textureKey: 'item_tool_research',
  color: 0x34994a,
  equipSlot: 'tool',
  toolType: 'bio',
  effects: [
    { trigger: 'on_equip', effect: getToolStats('bio', 'exotic', 4) },
  ],
  range: 3,
  grantedAbilities: ['harvest', 'analyze_specimen', 'energy_pulse', 'nano_repair', 'regeneration_protocol'],
};

export const TOOL_VERDANT_CANOPY_INTERPRETER_LEGENDARY: ItemDefinition = {
  id: 'tool_verdant_canopy_interpreter_legendary',
  displayName: 'Canopy Interpreter',
  description: 'The culmination of Verdant\'s bio-interface research program. This living instrument integrates with the Luminous Canopy\'s root network to achieve a state that researchers call "ecological communion." The tool does not merely sample -- it communicates. Specimens collected using the Interpreter have shown cooperative behavior during extraction. Dr. Solvik\'s personal instrument, recovered from the Canopy after her disappearance.',
  category: 'tool',
  rarity: 'legendary',
  maxStack: 1,
  weight: 1.2,
  baseValue: 80000,
  requiredLevel: 41,
  ilvl: computeIlvl(5, 'legendary'),
  textureKey: 'item_tool_research',
  color: 0x3aaa55,
  equipSlot: 'tool',
  toolType: 'bio',
  effects: [
    { trigger: 'on_equip', effect: getToolStats('bio', 'legendary', 5) },
  ],
  range: 3,
  grantedAbilities: ['harvest', 'analyze_specimen', 'energy_pulse', 'nano_repair', 'regeneration_protocol', 'resource_scan'],
};

// ============================================================
// VERDANT DYNAMICS — Research Tools (Line 2: research)
// ============================================================

export const TOOL_VERDANT_SPORE_ANALYZER_COMMON: ItemDefinition = {
  id: 'tool_verdant_spore_analyzer_common',
  displayName: 'Spore Analyzer',
  description: 'Standard Verdant analytical instrument for atmospheric and biological surveying. Catalogues airborne particulate and identifies known organism signatures. Required equipment for all Verdant survey operations.',
  category: 'tool',
  rarity: 'common',
  maxStack: 1,
  weight: 1.5,
  baseValue: 300,
  requiredLevel: 1,
  ilvl: computeIlvl(1, 'common'),
  textureKey: 'item_tool_research',
  color: 0x235f2f,
  equipSlot: 'tool',
  toolType: 'research',
  effects: [
    { trigger: 'on_equip', effect: getToolStats('research', 'common', 1) },
  ],
  range: 1,
  grantedAbilities: ['energy_pulse', 'resource_scan'],
};

export const TOOL_VERDANT_BLOOM_SCANNER_RARE: ItemDefinition = {
  id: 'tool_verdant_bloom_scanner_rare',
  displayName: 'Bloom Scanner',
  description: 'Multi-spectrum analysis tool calibrated for Terminus biome-specific signatures. Cross-references findings against Verdant\'s comprehensive xenobiology database in real-time. Significantly faster cataloguing than standard field scanners.',
  category: 'tool',
  rarity: 'rare',
  maxStack: 1,
  weight: 1.5,
  baseValue: 1200,
  requiredLevel: 11,
  ilvl: computeIlvl(2, 'rare'),
  textureKey: 'item_tool_research',
  color: 0x2a7a3a,
  equipSlot: 'tool',
  toolType: 'research',
  effects: [
    { trigger: 'on_equip', effect: getToolStats('research', 'rare', 2) },
  ],
  range: 2,
  grantedAbilities: ['energy_pulse', 'resource_scan', 'analyze_specimen'],
};

export const TOOL_VERDANT_SYNTHESIS_PROBE_EPIC: ItemDefinition = {
  id: 'tool_verdant_synthesis_probe_epic',
  displayName: 'Synthesis Probe',
  description: 'Advanced research instrument that combines spectrographic analysis with predictive biological modeling. Identifies compound interactions before physical testing. Verdant pharmaceutical division considers it indispensable for Fungal Depths alkaloid research.',
  category: 'tool',
  rarity: 'epic',
  maxStack: 1,
  weight: 1.5,
  baseValue: 5000,
  requiredLevel: 21,
  ilvl: computeIlvl(3, 'epic'),
  textureKey: 'item_tool_research',
  color: 0x2f8a40,
  equipSlot: 'tool',
  toolType: 'research',
  effects: [
    { trigger: 'on_equip', effect: getToolStats('research', 'epic', 3) },
  ],
  range: 2,
  grantedAbilities: ['energy_pulse', 'resource_scan', 'analyze_specimen', 'overclock'],
};

export const TOOL_VERDANT_CULTIVAR_PROBE_EXOTIC: ItemDefinition = {
  id: 'tool_verdant_cultivar_probe_exotic',
  displayName: 'Cultivar Probe',
  description: 'Experimental research tool that models complete organism lifecycles from a single sample interaction. The probe\'s predictive algorithms can project evolutionary trajectories centuries into the future. Verdant uses these projections to guide their "cultivation" programs.',
  category: 'tool',
  rarity: 'exotic',
  maxStack: 1,
  weight: 1.4,
  baseValue: 20000,
  requiredLevel: 31,
  ilvl: computeIlvl(4, 'exotic'),
  textureKey: 'item_tool_research',
  color: 0x34994a,
  equipSlot: 'tool',
  toolType: 'research',
  effects: [
    { trigger: 'on_equip', effect: getToolStats('research', 'exotic', 4) },
  ],
  range: 3,
  grantedAbilities: ['energy_pulse', 'resource_scan', 'analyze_specimen', 'overclock', 'fortify_systems'],
};

export const TOOL_VERDANT_ROOTBOUND_SPECTROMETER_LEGENDARY: ItemDefinition = {
  id: 'tool_verdant_rootbound_spectrometer_legendary',
  displayName: 'Rootbound Spectrometer',
  description: 'A research instrument that interfaces with the Luminous Canopy root network to perform analysis at a planetary scale. The spectrometer accesses biological data from every connected organism simultaneously. Verdant classifies its full capabilities. Researchers who have used it describe understanding Terminus not as a collection of species, but as a single distributed organism.',
  category: 'tool',
  rarity: 'legendary',
  maxStack: 1,
  weight: 1.2,
  baseValue: 80000,
  requiredLevel: 41,
  ilvl: computeIlvl(5, 'legendary'),
  textureKey: 'item_tool_research',
  color: 0x3aaa55,
  equipSlot: 'tool',
  toolType: 'research',
  effects: [
    { trigger: 'on_equip', effect: getToolStats('research', 'legendary', 5) },
  ],
  range: 3,
  grantedAbilities: ['energy_pulse', 'resource_scan', 'analyze_specimen', 'overclock', 'fortify_systems', 'nano_repair'],
};

// ============================================================
// HELIX EXTRACTION — Mining Tools (Line 1: mining)
// ============================================================

export const TOOL_HELIX_BORE_DRILL_COMMON: ItemDefinition = {
  id: 'tool_helix_bore_drill_common',
  displayName: 'Helix Bore Drill',
  description: 'Standard Helix extraction tool issued to all ground-level mining personnel. Crude rotary mechanism rated for Type-I mineral formations. Weighs what it weighs because it needs to.',
  category: 'tool',
  rarity: 'common',
  maxStack: 1,
  weight: 2.0,
  baseValue: 330,
  requiredLevel: 1,
  ilvl: computeIlvl(1, 'common'),
  textureKey: 'item_tool_mining',
  color: 0x6f221a,
  equipSlot: 'tool',
  toolType: 'mining',
  effects: [
    { trigger: 'on_equip', effect: getToolStats('mining', 'common', 1) },
  ],
  range: 1,
  grantedAbilities: ['mine', 'basic_strike'],
};

export const TOOL_HELIX_QUARRY_CUTTER_RARE: ItemDefinition = {
  id: 'tool_helix_quarry_cutter_rare',
  displayName: 'Quarry Cutter',
  description: 'Thermal-assisted extraction tool with variable-torque settings for different rock densities. Rated for deep-shaft operations at ambient temperatures exceeding 400 degrees. The cutting head is replaceable. It needs to be, frequently.',
  category: 'tool',
  rarity: 'rare',
  maxStack: 1,
  weight: 2.0,
  baseValue: 1320,
  requiredLevel: 11,
  ilvl: computeIlvl(2, 'rare'),
  textureKey: 'item_tool_mining',
  color: 0x8a2a1a,
  equipSlot: 'tool',
  toolType: 'mining',
  effects: [
    { trigger: 'on_equip', effect: getToolStats('mining', 'rare', 2) },
  ],
  range: 2,
  grantedAbilities: ['mine', 'basic_strike', 'thermal_lance'],
};

export const TOOL_HELIX_SLAG_BREAKER_EPIC: ItemDefinition = {
  id: 'tool_helix_slag_breaker_epic',
  displayName: 'Slag Breaker',
  description: 'Industrial-grade plasma extraction tool that processes rock and mineral formations in a single pass. Helix Deep Shaft Seven teams rely on it exclusively. The plasma cutting head operates at temperatures that would compromise lesser alloy housings.',
  category: 'tool',
  rarity: 'epic',
  maxStack: 1,
  weight: 2.0,
  baseValue: 5500,
  requiredLevel: 21,
  ilvl: computeIlvl(3, 'epic'),
  textureKey: 'item_tool_mining',
  color: 0x9a301f,
  equipSlot: 'tool',
  toolType: 'mining',
  effects: [
    { trigger: 'on_equip', effect: getToolStats('mining', 'epic', 3) },
  ],
  range: 2,
  grantedAbilities: ['mine', 'basic_strike', 'thermal_lance', 'plasma_burst'],
};

export const TOOL_HELIX_ANVIL_AUGER_EXOTIC: ItemDefinition = {
  id: 'tool_helix_anvil_auger_exotic',
  displayName: 'Anvil Auger',
  description: 'Experimental extraction device using focused seismic pulses to fracture mineral formations at their crystalline fault lines. Maximum yield with minimum waste. Helix Advanced Extraction developed it after losing three conventional drill teams to an unexpected magma pocket. The Auger reads seismic data before it drills.',
  category: 'tool',
  rarity: 'exotic',
  maxStack: 1,
  weight: 1.9,
  baseValue: 22000,
  requiredLevel: 31,
  ilvl: computeIlvl(4, 'exotic'),
  textureKey: 'item_tool_mining',
  color: 0xa83525,
  equipSlot: 'tool',
  toolType: 'mining',
  effects: [
    { trigger: 'on_equip', effect: getToolStats('mining', 'exotic', 4) },
  ],
  range: 3,
  grantedAbilities: ['mine', 'basic_strike', 'thermal_lance', 'plasma_burst', 'overload_pulse'],
};

export const TOOL_HELIX_CRUCIBLE_EXCAVATOR_LEGENDARY: ItemDefinition = {
  id: 'tool_helix_crucible_excavator_legendary',
  displayName: 'Crucible Excavator',
  description: 'The ultimate extraction instrument, forged in the same deep-mantle crucible as Helix\'s legendary armor. The Excavator dematerializes target mineral formations and reconstitutes purified yield in its collection chamber. Extraction efficiency approaches 100%. Helix Overseer Kael personally carries one during deep-shaft inspections. Only four exist.',
  category: 'tool',
  rarity: 'legendary',
  maxStack: 1,
  weight: 1.7,
  baseValue: 88000,
  requiredLevel: 41,
  ilvl: computeIlvl(5, 'legendary'),
  textureKey: 'item_tool_mining',
  color: 0xbb3a2a,
  equipSlot: 'tool',
  toolType: 'mining',
  effects: [
    { trigger: 'on_equip', effect: getToolStats('mining', 'legendary', 5) },
  ],
  range: 3,
  grantedAbilities: ['mine', 'basic_strike', 'thermal_lance', 'plasma_burst', 'overload_pulse', 'concussive_strike'],
};

// ============================================================
// HELIX EXTRACTION — Demolition Tools (Line 2: demolition)
// ============================================================

export const TOOL_HELIX_RIVET_GUN_COMMON: ItemDefinition = {
  id: 'tool_helix_rivet_gun_common',
  displayName: 'Helix Rivet Gun',
  description: 'Standard demolition instrument for clearing obstructions in extraction corridors. Fires hardened bolts capable of fracturing Type-I rock formations. Simple, loud, and effective.',
  category: 'tool',
  rarity: 'common',
  maxStack: 1,
  weight: 2.0,
  baseValue: 330,
  requiredLevel: 1,
  ilvl: computeIlvl(1, 'common'),
  textureKey: 'item_tool_mining',
  color: 0x6f221a,
  equipSlot: 'tool',
  toolType: 'demolition',
  effects: [
    { trigger: 'on_equip', effect: getToolStats('demolition', 'common', 1) },
  ],
  range: 1,
  grantedAbilities: ['basic_strike', 'concussive_strike'],
};

export const TOOL_HELIX_FOUNDRY_HAMMER_RARE: ItemDefinition = {
  id: 'tool_helix_foundry_hammer_rare',
  displayName: 'Foundry Hammer',
  description: 'Heavy pneumatic impact tool designed for structural demolition in mining operations. The compression wave it generates on impact clears debris from a six-meter radius. Helix demolition crews call it "the argument ender."',
  category: 'tool',
  rarity: 'rare',
  maxStack: 1,
  weight: 2.0,
  baseValue: 1320,
  requiredLevel: 11,
  ilvl: computeIlvl(2, 'rare'),
  textureKey: 'item_tool_mining',
  color: 0x8a2a1a,
  equipSlot: 'tool',
  toolType: 'demolition',
  effects: [
    { trigger: 'on_equip', effect: getToolStats('demolition', 'rare', 2) },
  ],
  range: 2,
  grantedAbilities: ['basic_strike', 'concussive_strike', 'overload_pulse'],
};

export const TOOL_HELIX_COMPRESSION_RAM_EPIC: ItemDefinition = {
  id: 'tool_helix_compression_ram_epic',
  displayName: 'Compression Ram',
  description: 'Industrial seismic demolition instrument that focuses kinetic energy into a directed shockwave. Can collapse reinforced corridors or clear multi-tonne rockfall in a single activation cycle. Helix safety protocols require a 30-meter exclusion zone during operation.',
  category: 'tool',
  rarity: 'epic',
  maxStack: 1,
  weight: 2.0,
  baseValue: 5500,
  requiredLevel: 21,
  ilvl: computeIlvl(3, 'epic'),
  textureKey: 'item_tool_mining',
  color: 0x9a301f,
  equipSlot: 'tool',
  toolType: 'demolition',
  effects: [
    { trigger: 'on_equip', effect: getToolStats('demolition', 'epic', 3) },
  ],
  range: 2,
  grantedAbilities: ['basic_strike', 'concussive_strike', 'overload_pulse', 'power_surge'],
};

export const TOOL_HELIX_TEMPERED_DISRUPTOR_EXOTIC: ItemDefinition = {
  id: 'tool_helix_tempered_disruptor_exotic',
  displayName: 'Tempered Disruptor',
  description: 'Experimental demolition weapon using harmonic resonance to shatter structures at their molecular bonds. The frequency is tuned per material -- the operator selects the target composition and the Disruptor does the rest. Helix found the resonance profiles by accident while studying Prior Inhabitant ruins.',
  category: 'tool',
  rarity: 'exotic',
  maxStack: 1,
  weight: 1.9,
  baseValue: 22000,
  requiredLevel: 31,
  ilvl: computeIlvl(4, 'exotic'),
  textureKey: 'item_tool_mining',
  color: 0xa83525,
  equipSlot: 'tool',
  toolType: 'demolition',
  effects: [
    { trigger: 'on_equip', effect: getToolStats('demolition', 'exotic', 4) },
  ],
  range: 3,
  grantedAbilities: ['basic_strike', 'concussive_strike', 'overload_pulse', 'power_surge', 'magnetic_field'],
};

export const TOOL_HELIX_FURNACE_LANCE_LEGENDARY: ItemDefinition = {
  id: 'tool_helix_furnace_lance_legendary',
  displayName: 'Furnace Lance',
  description: 'The most destructive tool Helix has ever forged. A directed plasma lance that converts solid matter into expanding gas at the point of contact. Named after the deep-mantle furnace where its core was tempered. Helix Overseer Kael authorized its creation after a Volcanic Reaches tunneling operation was blocked by a formation that resisted everything else. The formation did not resist the Lance.',
  category: 'tool',
  rarity: 'legendary',
  maxStack: 1,
  weight: 1.7,
  baseValue: 88000,
  requiredLevel: 41,
  ilvl: computeIlvl(5, 'legendary'),
  textureKey: 'item_tool_mining',
  color: 0xbb3a2a,
  equipSlot: 'tool',
  toolType: 'demolition',
  effects: [
    { trigger: 'on_equip', effect: getToolStats('demolition', 'legendary', 5) },
  ],
  range: 3,
  grantedAbilities: ['basic_strike', 'concussive_strike', 'overload_pulse', 'power_surge', 'magnetic_field', 'thermal_lance'],
};

// ============================================================
// NEXUS FRONTIERS — Research Tools (Line 1: research)
// ============================================================

export const TOOL_NEXUS_SIGNAL_PROBE_COMMON: ItemDefinition = {
  id: 'tool_nexus_signal_probe_common',
  displayName: 'Nexus Signal Probe',
  description: 'Entry-level Nexus analytical instrument for field data collection. Intercepts and processes electromagnetic signatures within scanning range. Standard issue for all intelligence gathering operatives.',
  category: 'tool',
  rarity: 'common',
  maxStack: 1,
  weight: 1.5,
  baseValue: 300,
  requiredLevel: 1,
  ilvl: computeIlvl(1, 'common'),
  textureKey: 'item_tool_research',
  color: 0x153b60,
  equipSlot: 'tool',
  toolType: 'research',
  effects: [
    { trigger: 'on_equip', effect: getToolStats('research', 'common', 1) },
  ],
  range: 1,
  grantedAbilities: ['energy_pulse', 'resource_scan'],
};

export const TOOL_NEXUS_CIPHER_SCANNER_RARE: ItemDefinition = {
  id: 'tool_nexus_cipher_scanner_rare',
  displayName: 'Cipher Scanner',
  description: 'Encrypted-signal analysis tool that decodes protected transmissions in real-time. Cross-references intercepted data against Nexus intelligence databases. Classified as a "survey instrument" in official documentation.',
  category: 'tool',
  rarity: 'rare',
  maxStack: 1,
  weight: 1.5,
  baseValue: 1200,
  requiredLevel: 11,
  ilvl: computeIlvl(2, 'rare'),
  textureKey: 'item_tool_research',
  color: 0x1a4a7a,
  equipSlot: 'tool',
  toolType: 'research',
  effects: [
    { trigger: 'on_equip', effect: getToolStats('research', 'rare', 2) },
  ],
  range: 2,
  grantedAbilities: ['energy_pulse', 'resource_scan', 'analyze_specimen'],
};

export const TOOL_NEXUS_LATTICE_ANALYZER_EPIC: ItemDefinition = {
  id: 'tool_nexus_lattice_analyzer_epic',
  displayName: 'Lattice Analyzer',
  description: 'Distributed analysis system that processes data across multiple quantum-linked nodes simultaneously. Identifies patterns in complex datasets that linear analysis would miss. Nexus Intelligence Division standard equipment for Prior Inhabitant artifact research.',
  category: 'tool',
  rarity: 'epic',
  maxStack: 1,
  weight: 1.5,
  baseValue: 5000,
  requiredLevel: 21,
  ilvl: computeIlvl(3, 'epic'),
  textureKey: 'item_tool_research',
  color: 0x1f5287,
  equipSlot: 'tool',
  toolType: 'research',
  effects: [
    { trigger: 'on_equip', effect: getToolStats('research', 'epic', 3) },
  ],
  range: 2,
  grantedAbilities: ['energy_pulse', 'resource_scan', 'analyze_specimen', 'overclock'],
};

export const TOOL_NEXUS_MERIDIAN_SPECTROMETER_EXOTIC: ItemDefinition = {
  id: 'tool_nexus_meridian_spectrometer_exotic',
  displayName: 'Meridian Spectrometer',
  description: 'Quantum-entangled analysis platform that processes research data faster than conventional physics should allow. Nexus theorizes it exploits the same spatial compression observed in Anomaly Zones. The answers arrive before the questions finish processing.',
  category: 'tool',
  rarity: 'exotic',
  maxStack: 1,
  weight: 1.4,
  baseValue: 20000,
  requiredLevel: 31,
  ilvl: computeIlvl(4, 'exotic'),
  textureKey: 'item_tool_research',
  color: 0x245a94,
  equipSlot: 'tool',
  toolType: 'research',
  effects: [
    { trigger: 'on_equip', effect: getToolStats('research', 'exotic', 4) },
  ],
  range: 3,
  grantedAbilities: ['energy_pulse', 'resource_scan', 'analyze_specimen', 'overclock', 'precision_shot'],
};

export const TOOL_NEXUS_ECHO_PRIME_INSTRUMENT_LEGENDARY: ItemDefinition = {
  id: 'tool_nexus_echo_prime_instrument_legendary',
  displayName: 'Echo Prime Instrument',
  description: 'A research instrument derived from Prior Inhabitant analytical technology. The Echo Prime processes information through mechanisms that Nexus cannot fully characterize. It answers questions that have not been asked. Researchers report insights appearing in their consciousness without the intermediate step of reading data. Three Nexus scientists have refused to use it again. Four others will not work without it.',
  category: 'tool',
  rarity: 'legendary',
  maxStack: 1,
  weight: 1.2,
  baseValue: 80000,
  requiredLevel: 41,
  ilvl: computeIlvl(5, 'legendary'),
  textureKey: 'item_tool_research',
  color: 0x2a65a0,
  equipSlot: 'tool',
  toolType: 'research',
  effects: [
    { trigger: 'on_equip', effect: getToolStats('research', 'legendary', 5) },
  ],
  range: 3,
  grantedAbilities: ['energy_pulse', 'resource_scan', 'analyze_specimen', 'overclock', 'precision_shot', 'electrocute'],
};

// ============================================================
// NEXUS FRONTIERS — Stealth Tools (Line 2: stealth)
// ============================================================

export const TOOL_NEXUS_PHANTOM_BLADE_COMMON: ItemDefinition = {
  id: 'tool_nexus_phantom_blade_common',
  displayName: 'Phantom Blade',
  description: 'Compact Nexus covert operations instrument. Combines precision targeting with signal-dampened operation. Officially classified as a "field survey tool" in Nexus procurement records.',
  category: 'tool',
  rarity: 'common',
  maxStack: 1,
  weight: 1.5,
  baseValue: 300,
  requiredLevel: 1,
  ilvl: computeIlvl(1, 'common'),
  textureKey: 'item_tool_research',
  color: 0x153b60,
  equipSlot: 'tool',
  toolType: 'stealth',
  effects: [
    { trigger: 'on_equip', effect: getToolStats('stealth', 'common', 1) },
  ],
  range: 1,
  grantedAbilities: ['precision_shot', 'resource_scan'],
};

export const TOOL_NEXUS_VECTOR_INFILTRATOR_RARE: ItemDefinition = {
  id: 'tool_nexus_vector_infiltrator_rare',
  displayName: 'Vector Infiltrator',
  description: 'Multi-function stealth operations tool with active signal masking. Suppresses the wearer\'s electromagnetic signature while maintaining full analytical capability. Nexus couriers operating in contested territory consider it essential.',
  category: 'tool',
  rarity: 'rare',
  maxStack: 1,
  weight: 1.5,
  baseValue: 1200,
  requiredLevel: 11,
  ilvl: computeIlvl(2, 'rare'),
  textureKey: 'item_tool_research',
  color: 0x1a4a7a,
  equipSlot: 'tool',
  toolType: 'stealth',
  effects: [
    { trigger: 'on_equip', effect: getToolStats('stealth', 'rare', 2) },
  ],
  range: 2,
  grantedAbilities: ['precision_shot', 'resource_scan', 'overclock'],
};

export const TOOL_NEXUS_RELAY_DISRUPTOR_EPIC: ItemDefinition = {
  id: 'tool_nexus_relay_disruptor_epic',
  displayName: 'Relay Disruptor',
  description: 'Advanced covert instrument that actively jams detection systems within operational range while maintaining the wearer\'s own sensor capability. Nexus Intelligence Division standard issue for deep-cover operations in corporate territory.',
  category: 'tool',
  rarity: 'epic',
  maxStack: 1,
  weight: 1.5,
  baseValue: 5000,
  requiredLevel: 21,
  ilvl: computeIlvl(3, 'epic'),
  textureKey: 'item_tool_research',
  color: 0x1f5287,
  equipSlot: 'tool',
  toolType: 'stealth',
  effects: [
    { trigger: 'on_equip', effect: getToolStats('stealth', 'epic', 3) },
  ],
  range: 3,
  grantedAbilities: ['precision_shot', 'resource_scan', 'overclock', 'void_drain'],
};

export const TOOL_NEXUS_TRACE_HARVESTER_EXOTIC: ItemDefinition = {
  id: 'tool_nexus_trace_harvester_exotic',
  displayName: 'Trace Harvester',
  description: 'Experimental covert operations platform that extracts energy and intelligence from targets without detection. The Harvester passively siphons power from nearby electronic systems while cataloguing their signal patterns. Targets do not notice the drain until it is too late.',
  category: 'tool',
  rarity: 'exotic',
  maxStack: 1,
  weight: 1.4,
  baseValue: 20000,
  requiredLevel: 31,
  ilvl: computeIlvl(4, 'exotic'),
  textureKey: 'item_tool_research',
  color: 0x245a94,
  equipSlot: 'tool',
  toolType: 'stealth',
  effects: [
    { trigger: 'on_equip', effect: getToolStats('stealth', 'exotic', 4) },
  ],
  range: 4,
  grantedAbilities: ['precision_shot', 'resource_scan', 'overclock', 'void_drain', 'electrocute'],
};

export const TOOL_NEXUS_GRID_GHOST_LEGENDARY: ItemDefinition = {
  id: 'tool_nexus_grid_ghost_legendary',
  displayName: 'Grid Ghost',
  description: 'A covert operations instrument that renders the wearer functionally invisible to electronic detection. Derived from analysis of Prior Inhabitant stealth technology. The Grid Ghost does not merely suppress signals -- it erases the wearer from the electromagnetic spectrum entirely. Nexus Intelligence Division denies it exists. Several rival factions have acquired evidence to the contrary.',
  category: 'tool',
  rarity: 'legendary',
  maxStack: 1,
  weight: 1.2,
  baseValue: 80000,
  requiredLevel: 41,
  ilvl: computeIlvl(5, 'legendary'),
  textureKey: 'item_tool_research',
  color: 0x2a65a0,
  equipSlot: 'tool',
  toolType: 'stealth',
  effects: [
    { trigger: 'on_equip', effect: getToolStats('stealth', 'legendary', 5) },
  ],
  range: 4,
  grantedAbilities: ['precision_shot', 'resource_scan', 'overclock', 'void_drain', 'electrocute', 'energy_pulse'],
};

// ============================================================
// UNAFFILIATED — Universal/Salvage Scanner Tools (Line 1: universal)
// ============================================================

export const TOOL_UNAFFILIATED_SCRAP_SCANNER_COMMON: ItemDefinition = {
  id: 'tool_unaffiliated_scrap_scanner_common',
  displayName: 'Scrap Scanner',
  description: 'Cobbled-together scanning device built from salvaged corporate components. Identifies recyclable materials in debris fields and abandoned equipment. Not pretty, but it finds what the corporate scanners miss.',
  category: 'tool',
  rarity: 'common',
  maxStack: 1,
  weight: 1.7,
  baseValue: 270,
  requiredLevel: 1,
  ilvl: computeIlvl(1, 'common'),
  textureKey: 'item_tool_universal',
  color: 0x5f5f45,
  equipSlot: 'tool',
  toolType: 'universal',
  effects: [
    { trigger: 'on_equip', effect: getToolStats('universal', 'common', 1) },
  ],
  range: 1,
  grantedAbilities: ['energy_pulse', 'resource_scan'],
};

export const TOOL_UNAFFILIATED_COBBLED_DETECTOR_RARE: ItemDefinition = {
  id: 'tool_unaffiliated_cobbled_detector_rare',
  displayName: 'Cobbled Detector',
  description: 'Field-modified scanning tool that cross-references material signatures from Helix, Verdant, and Nexus databases simultaneously. The builder reverse-engineered three proprietary protocols. The result identifies more salvageable material types than any single-faction scanner.',
  category: 'tool',
  rarity: 'rare',
  maxStack: 1,
  weight: 1.7,
  baseValue: 1080,
  requiredLevel: 11,
  ilvl: computeIlvl(2, 'rare'),
  textureKey: 'item_tool_universal',
  color: 0x7a7a5a,
  equipSlot: 'tool',
  toolType: 'universal',
  effects: [
    { trigger: 'on_equip', effect: getToolStats('universal', 'rare', 2) },
  ],
  range: 2,
  grantedAbilities: ['energy_pulse', 'resource_scan', 'analyze_specimen'],
};

export const TOOL_UNAFFILIATED_SALVAGE_PROBE_EPIC: ItemDefinition = {
  id: 'tool_unaffiliated_salvage_probe_epic',
  displayName: 'Salvage Probe',
  description: 'An impressively capable scanning platform assembled entirely from recovered components. The builder integrated a Nexus signal processor with a Verdant bio-sensor and a Helix mineral scanner. None of those components were designed to work together. They work together anyway.',
  category: 'tool',
  rarity: 'epic',
  maxStack: 1,
  weight: 1.7,
  baseValue: 4500,
  requiredLevel: 21,
  ilvl: computeIlvl(3, 'epic'),
  textureKey: 'item_tool_universal',
  color: 0x888865,
  equipSlot: 'tool',
  toolType: 'universal',
  effects: [
    { trigger: 'on_equip', effect: getToolStats('universal', 'epic', 3) },
  ],
  range: 2,
  grantedAbilities: ['energy_pulse', 'resource_scan', 'analyze_specimen', 'overclock'],
};

export const TOOL_UNAFFILIATED_DRIFTER_ANALYZER_EXOTIC: ItemDefinition = {
  id: 'tool_unaffiliated_drifter_analyzer_exotic',
  displayName: 'Drifter Analyzer',
  description: 'A masterwork of salvage engineering that rivals purpose-built corporate instruments. Incorporates components from every faction and at least one unidentified Prior Inhabitant element. The analyzer identifies materials and energy signatures that corporate scanners are not programmed to look for.',
  category: 'tool',
  rarity: 'exotic',
  maxStack: 1,
  weight: 1.6,
  baseValue: 18000,
  requiredLevel: 31,
  ilvl: computeIlvl(4, 'exotic'),
  textureKey: 'item_tool_universal',
  color: 0x959570,
  equipSlot: 'tool',
  toolType: 'universal',
  effects: [
    { trigger: 'on_equip', effect: getToolStats('universal', 'exotic', 4) },
  ],
  range: 3,
  grantedAbilities: ['energy_pulse', 'resource_scan', 'analyze_specimen', 'overclock', 'void_drain'],
};

export const TOOL_UNAFFILIATED_WASTELAND_ORACLE_LEGENDARY: ItemDefinition = {
  id: 'tool_unaffiliated_wasteland_oracle_legendary',
  displayName: 'Wasteland Oracle',
  description: 'The legendary scanner built by "Patch" Maren from components salvaged over fifteen years of independent operation. At its core is a Prior Inhabitant sensing crystal that Patch found embedded in a collapsed Ancient facility. The Oracle sees everything -- materials, energy signatures, life signs, and anomaly patterns. All three corporations have offered Patch a fortune for it. Patch says the Oracle is not for sale because the Oracle agrees.',
  category: 'tool',
  rarity: 'legendary',
  maxStack: 1,
  weight: 1.4,
  baseValue: 72000,
  requiredLevel: 41,
  ilvl: computeIlvl(5, 'legendary'),
  textureKey: 'item_tool_universal',
  color: 0xa0a07a,
  equipSlot: 'tool',
  toolType: 'universal',
  effects: [
    { trigger: 'on_equip', effect: getToolStats('universal', 'legendary', 5) },
  ],
  range: 3,
  grantedAbilities: ['energy_pulse', 'resource_scan', 'analyze_specimen', 'overclock', 'void_drain', 'harvest'],
};

// ============================================================
// UNAFFILIATED — Combat/Improvised Extractor Tools (Line 2: combat)
// ============================================================

export const TOOL_UNAFFILIATED_IMPROVISED_PICK_COMMON: ItemDefinition = {
  id: 'tool_unaffiliated_improvised_pick_common',
  displayName: 'Improvised Pick',
  description: 'A mining pick assembled from scavenged Helix drill components and whatever handle material was available. The head is mismatched to the shaft, but the balance is surprisingly good. A drifter\'s basic tool for extraction and self-defense.',
  category: 'tool',
  rarity: 'common',
  maxStack: 1,
  weight: 1.7,
  baseValue: 270,
  requiredLevel: 1,
  ilvl: computeIlvl(1, 'common'),
  textureKey: 'item_tool_combat',
  color: 0x5f5f45,
  equipSlot: 'tool',
  toolType: 'combat',
  effects: [
    { trigger: 'on_equip', effect: getToolStats('combat', 'common', 1) },
  ],
  range: 1,
  grantedAbilities: ['harvest', 'mine'],
};

export const TOOL_UNAFFILIATED_JURY_RIG_CUTTER_RARE: ItemDefinition = {
  id: 'tool_unaffiliated_jury_rig_cutter_rare',
  displayName: 'Jury-Rig Cutter',
  description: 'Field-modified cutting tool combining a salvaged plasma emitter with a hand-built focusing assembly. Cuts through salvage targets and hostile fauna with equal efficiency. The power cable is exposed but insulated with what appears to be tree resin.',
  category: 'tool',
  rarity: 'rare',
  maxStack: 1,
  weight: 1.7,
  baseValue: 1080,
  requiredLevel: 11,
  ilvl: computeIlvl(2, 'rare'),
  textureKey: 'item_tool_combat',
  color: 0x7a7a5a,
  equipSlot: 'tool',
  toolType: 'combat',
  effects: [
    { trigger: 'on_equip', effect: getToolStats('combat', 'rare', 2) },
  ],
  range: 2,
  grantedAbilities: ['harvest', 'mine', 'basic_strike'],
};

export const TOOL_UNAFFILIATED_SCROUNGER_DRILL_EPIC: ItemDefinition = {
  id: 'tool_unaffiliated_scrounger_drill_epic',
  displayName: 'Scrounger Drill',
  description: 'A hybrid extraction-combat tool built from components that span all three corporate manufacturing lines. The drill head is Helix, the power coupling is Nexus, and the stabilization system is Verdant bio-mechanical. The builder understood each system well enough to combine them into something none of the factions make.',
  category: 'tool',
  rarity: 'epic',
  maxStack: 1,
  weight: 1.7,
  baseValue: 4500,
  requiredLevel: 21,
  ilvl: computeIlvl(3, 'epic'),
  textureKey: 'item_tool_combat',
  color: 0x888865,
  equipSlot: 'tool',
  toolType: 'combat',
  effects: [
    { trigger: 'on_equip', effect: getToolStats('combat', 'epic', 3) },
  ],
  range: 2,
  grantedAbilities: ['harvest', 'mine', 'basic_strike', 'overload_pulse'],
};

export const TOOL_UNAFFILIATED_RECLAIMED_BREAKER_EXOTIC: ItemDefinition = {
  id: 'tool_unaffiliated_reclaimed_breaker_exotic',
  displayName: 'Reclaimed Breaker',
  description: 'A devastating salvage-extraction tool assembled from the wreckage of a Helix demolition platform. The original weapon was destroyed in a cave-in. The builder recovered the core components and rebuilt them into something more versatile and, somehow, more powerful. Helix engineers examined one and confirmed it operates outside documented parameters.',
  category: 'tool',
  rarity: 'exotic',
  maxStack: 1,
  weight: 1.6,
  baseValue: 18000,
  requiredLevel: 31,
  ilvl: computeIlvl(4, 'exotic'),
  textureKey: 'item_tool_combat',
  color: 0x959570,
  equipSlot: 'tool',
  toolType: 'combat',
  effects: [
    { trigger: 'on_equip', effect: getToolStats('combat', 'exotic', 4) },
  ],
  range: 3,
  grantedAbilities: ['harvest', 'mine', 'basic_strike', 'overload_pulse', 'power_surge'],
};

export const TOOL_UNAFFILIATED_MONGREL_TOOTH_LEGENDARY: ItemDefinition = {
  id: 'tool_unaffiliated_mongrel_tooth_legendary',
  displayName: 'Mongrel Tooth',
  description: '"Patch" Maren\'s personal extraction tool, built over a decade from the finest salvaged components on Terminus. At its core is a crystal-tipped cutting head fashioned from Prior Inhabitant material that Patch shaped using techniques learned from studying Ancient fabrication ruins. The Tooth cuts through anything. The corporations have tried to confiscate it twice. Patch was elsewhere both times. The Tooth was not.',
  category: 'tool',
  rarity: 'legendary',
  maxStack: 1,
  weight: 1.4,
  baseValue: 72000,
  requiredLevel: 41,
  ilvl: computeIlvl(5, 'legendary'),
  textureKey: 'item_tool_combat',
  color: 0xa0a07a,
  equipSlot: 'tool',
  toolType: 'combat',
  effects: [
    { trigger: 'on_equip', effect: getToolStats('combat', 'legendary', 5) },
  ],
  range: 3,
  grantedAbilities: ['harvest', 'mine', 'basic_strike', 'overload_pulse', 'power_surge', 'concussive_strike'],
};

// ============================================================
// ALL FACTION TOOLS
// ============================================================

export const ALL_FACTION_TOOLS: readonly ItemDefinition[] = [
  // Verdant Dynamics - Bio (5)
  TOOL_VERDANT_ENZYME_PROBE_COMMON,
  TOOL_VERDANT_TENDRIL_EXTRACTOR_RARE,
  TOOL_VERDANT_PHYTO_SAMPLER_EPIC,
  TOOL_VERDANT_SYMBIONT_INTERFACE_EXOTIC,
  TOOL_VERDANT_CANOPY_INTERPRETER_LEGENDARY,
  // Verdant Dynamics - Research (5)
  TOOL_VERDANT_SPORE_ANALYZER_COMMON,
  TOOL_VERDANT_BLOOM_SCANNER_RARE,
  TOOL_VERDANT_SYNTHESIS_PROBE_EPIC,
  TOOL_VERDANT_CULTIVAR_PROBE_EXOTIC,
  TOOL_VERDANT_ROOTBOUND_SPECTROMETER_LEGENDARY,
  // Helix Extraction - Mining (5)
  TOOL_HELIX_BORE_DRILL_COMMON,
  TOOL_HELIX_QUARRY_CUTTER_RARE,
  TOOL_HELIX_SLAG_BREAKER_EPIC,
  TOOL_HELIX_ANVIL_AUGER_EXOTIC,
  TOOL_HELIX_CRUCIBLE_EXCAVATOR_LEGENDARY,
  // Helix Extraction - Demolition (5)
  TOOL_HELIX_RIVET_GUN_COMMON,
  TOOL_HELIX_FOUNDRY_HAMMER_RARE,
  TOOL_HELIX_COMPRESSION_RAM_EPIC,
  TOOL_HELIX_TEMPERED_DISRUPTOR_EXOTIC,
  TOOL_HELIX_FURNACE_LANCE_LEGENDARY,
  // Nexus Frontiers - Research (5)
  TOOL_NEXUS_SIGNAL_PROBE_COMMON,
  TOOL_NEXUS_CIPHER_SCANNER_RARE,
  TOOL_NEXUS_LATTICE_ANALYZER_EPIC,
  TOOL_NEXUS_MERIDIAN_SPECTROMETER_EXOTIC,
  TOOL_NEXUS_ECHO_PRIME_INSTRUMENT_LEGENDARY,
  // Nexus Frontiers - Stealth (5)
  TOOL_NEXUS_PHANTOM_BLADE_COMMON,
  TOOL_NEXUS_VECTOR_INFILTRATOR_RARE,
  TOOL_NEXUS_RELAY_DISRUPTOR_EPIC,
  TOOL_NEXUS_TRACE_HARVESTER_EXOTIC,
  TOOL_NEXUS_GRID_GHOST_LEGENDARY,
  // Unaffiliated - Universal/Salvage Scanner (5)
  TOOL_UNAFFILIATED_SCRAP_SCANNER_COMMON,
  TOOL_UNAFFILIATED_COBBLED_DETECTOR_RARE,
  TOOL_UNAFFILIATED_SALVAGE_PROBE_EPIC,
  TOOL_UNAFFILIATED_DRIFTER_ANALYZER_EXOTIC,
  TOOL_UNAFFILIATED_WASTELAND_ORACLE_LEGENDARY,
  // Unaffiliated - Combat/Improvised Extractor (5)
  TOOL_UNAFFILIATED_IMPROVISED_PICK_COMMON,
  TOOL_UNAFFILIATED_JURY_RIG_CUTTER_RARE,
  TOOL_UNAFFILIATED_SCROUNGER_DRILL_EPIC,
  TOOL_UNAFFILIATED_RECLAIMED_BREAKER_EXOTIC,
  TOOL_UNAFFILIATED_MONGREL_TOOTH_LEGENDARY,
];
