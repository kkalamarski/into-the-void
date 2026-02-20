import type { ItemDefinition } from '../types';
import { computeIlvl } from '../utils';

// ============================================================
// HEALTH VIALS (5) — on_use heal effect, scaling by rarity
// ============================================================

export const HEALTH_VIAL_COMMON: ItemDefinition = {
  id: 'health_vial_common',
  displayName: 'Health Vial',
  description:
    'Injects a rapid-acting biofix compound. Restores 50 health. Standard issue in all faction medical kits.',
  category: 'consumable',
  rarity: 'common',
  maxStack: 20,
  weight: 0.2,
  baseValue: 50,
  requiredLevel: 1,
  ilvl: computeIlvl(1, 'common'),
  textureKey: 'item_health_vial',
  color: 0x44cc44,
  effects: [{ trigger: 'on_use', effect: { type: 'heal', amount: 50 } }],
};

export const HEALTH_VIAL_RARE: ItemDefinition = {
  id: 'health_vial_rare',
  displayName: 'Advanced Health Vial',
  description:
    'An improved biofix formula with accelerated cellular repair compounds. Restores 100 health. Available from faction medical stations.',
  category: 'consumable',
  rarity: 'rare',
  maxStack: 20,
  weight: 0.2,
  baseValue: 200,
  requiredLevel: 5,
  ilvl: computeIlvl(1, 'rare'),
  textureKey: 'item_health_vial',
  color: 0x44ee44,
  effects: [{ trigger: 'on_use', effect: { type: 'heal', amount: 100 } }],
};

export const HEALTH_VIAL_EPIC: ItemDefinition = {
  id: 'health_vial_epic',
  displayName: 'Verdant Biosynth Vial',
  description:
    'A Verdant Dynamics premium biofix compound using synthesized Terminus flora enzymes. Restores 200 health. The ecosystem-friendly packaging is purely aesthetic.',
  category: 'consumable',
  rarity: 'epic',
  maxStack: 20,
  weight: 0.2,
  baseValue: 750,
  requiredLevel: 15,
  ilvl: computeIlvl(2, 'epic'),
  textureKey: 'item_health_vial',
  color: 0x22ff22,
  effects: [{ trigger: 'on_use', effect: { type: 'heal', amount: 200 } }],
};

export const HEALTH_VIAL_EXOTIC: ItemDefinition = {
  id: 'health_vial_exotic',
  displayName: 'Anomaly-Infused Biofix',
  description:
    'A biofix formula incorporating trace anomaly-processed compounds. Restores 400 health with unusual efficiency — the anomaly materials appear to accelerate biological processes in ways current medicine cannot fully explain.',
  category: 'consumable',
  rarity: 'exotic',
  maxStack: 20,
  weight: 0.2,
  baseValue: 2500,
  requiredLevel: 25,
  ilvl: computeIlvl(3, 'exotic'),
  textureKey: 'item_health_vial',
  color: 0x00ff44,
  effects: [{ trigger: 'on_use', effect: { type: 'heal', amount: 400 } }],
};

export const HEALTH_VIAL_LEGENDARY: ItemDefinition = {
  id: 'health_vial_legendary',
  displayName: 'Ancient Restoration Compound',
  description:
    'A substance recovered from Prior Inhabitant medical installations. Restores 800 health. Analysis shows it does not follow known biochemistry — it should not work on human physiology. It does.',
  category: 'consumable',
  rarity: 'legendary',
  maxStack: 20,
  weight: 0.1,
  baseValue: 10000,
  requiredLevel: 35,
  ilvl: computeIlvl(4, 'legendary'),
  textureKey: 'item_health_vial',
  color: 0x88ff88,
  effects: [{ trigger: 'on_use', effect: { type: 'heal', amount: 800 } }],
};

// ============================================================
// ENERGY CELLS (5) — on_use energy_restore effect, scaling by rarity
// ============================================================

export const ENERGY_CELL_COMMON: ItemDefinition = {
  id: 'energy_cell_common',
  displayName: 'Energy Cell',
  description:
    'Standard fuel cell for exo-suit power restoration. Restores 50 energy. Compatible with all corporation suit models.',
  category: 'consumable',
  rarity: 'common',
  maxStack: 20,
  weight: 0.3,
  baseValue: 50,
  requiredLevel: 1,
  ilvl: computeIlvl(1, 'common'),
  textureKey: 'item_energy_cell',
  color: 0xaaaa44,
  effects: [{ trigger: 'on_use', effect: { type: 'energy_restore', amount: 50 } }],
};

export const ENERGY_CELL_RARE: ItemDefinition = {
  id: 'energy_cell_rare',
  displayName: 'High-Capacity Energy Cell',
  description:
    'A dense fuel cell with improved energy-to-mass ratio. Restores 100 energy. Favored by Helix field teams for extended deep-site operations.',
  category: 'consumable',
  rarity: 'rare',
  maxStack: 20,
  weight: 0.3,
  baseValue: 200,
  requiredLevel: 5,
  ilvl: computeIlvl(1, 'rare'),
  textureKey: 'item_energy_cell',
  color: 0xcccc44,
  effects: [{ trigger: 'on_use', effect: { type: 'energy_restore', amount: 100 } }],
};

export const ENERGY_CELL_EPIC: ItemDefinition = {
  id: 'energy_cell_epic',
  displayName: 'Geothermal Energy Cell',
  description:
    'A Helix-developed fuel cell using geothermally processed compounds. Restores 200 energy and discharges notably faster than standard cells. Somewhat warm to the touch.',
  category: 'consumable',
  rarity: 'epic',
  maxStack: 20,
  weight: 0.3,
  baseValue: 750,
  requiredLevel: 15,
  ilvl: computeIlvl(2, 'epic'),
  textureKey: 'item_energy_cell',
  color: 0xeeee22,
  effects: [{ trigger: 'on_use', effect: { type: 'energy_restore', amount: 200 } }],
};

export const ENERGY_CELL_EXOTIC: ItemDefinition = {
  id: 'energy_cell_exotic',
  displayName: 'Zero-Point Energy Cell',
  description:
    'Incorporates the same energy principles as the Nexus Power Core Mk.IV module in disposable cell form. Restores 400 energy. Each cell costs more than a standard suit.',
  category: 'consumable',
  rarity: 'exotic',
  maxStack: 20,
  weight: 0.2,
  baseValue: 2500,
  requiredLevel: 25,
  ilvl: computeIlvl(3, 'exotic'),
  textureKey: 'item_energy_cell',
  color: 0xffff00,
  effects: [{ trigger: 'on_use', effect: { type: 'energy_restore', amount: 400 } }],
};

export const ENERGY_CELL_LEGENDARY: ItemDefinition = {
  id: 'energy_cell_legendary',
  displayName: 'Void Resonance Cell',
  description:
    'A single-use energy container tapping the same anomalous source as the Void Resonance Core module. Restores 800 energy. The ICC has requested manufacturing details. No response was provided.',
  category: 'consumable',
  rarity: 'legendary',
  maxStack: 20,
  weight: 0.1,
  baseValue: 10000,
  requiredLevel: 35,
  ilvl: computeIlvl(4, 'legendary'),
  textureKey: 'item_energy_cell',
  color: 0xffff88,
  effects: [{ trigger: 'on_use', effect: { type: 'energy_restore', amount: 800 } }],
};

// ============================================================
// SUIT REPAIR KITS (5) — on_use suit_repair effect, scaling by rarity
// ============================================================

export const SUIT_REPAIR_KIT_COMMON: ItemDefinition = {
  id: 'suit_repair_kit_common',
  displayName: 'Suit Repair Kit',
  description:
    'Basic field repair compound for exo-suit maintenance. Patches minor breaches and restores 50 suit integrity. The warranty on your suit already expired anyway.',
  category: 'consumable',
  rarity: 'common',
  maxStack: 20,
  weight: 0.4,
  baseValue: 75,
  requiredLevel: 1,
  ilvl: computeIlvl(1, 'common'),
  textureKey: 'item_suit_repair',
  color: 0x886644,
  effects: [{ trigger: 'on_use', effect: { type: 'suit_repair', amount: 50 } }],
};

export const SUIT_REPAIR_KIT_RARE: ItemDefinition = {
  id: 'suit_repair_kit_rare',
  displayName: 'Advanced Suit Repair Kit',
  description:
    'Structural repair compound with nano-filament weaving capability. Restores 100 suit integrity and reinforces patch sites against future damage.',
  category: 'consumable',
  rarity: 'rare',
  maxStack: 20,
  weight: 0.4,
  baseValue: 300,
  requiredLevel: 5,
  ilvl: computeIlvl(1, 'rare'),
  textureKey: 'item_suit_repair',
  color: 0xaa8855,
  effects: [{ trigger: 'on_use', effect: { type: 'suit_repair', amount: 100 } }],
};

export const SUIT_REPAIR_KIT_EPIC: ItemDefinition = {
  id: 'suit_repair_kit_epic',
  displayName: 'Helix Structural Repair Kit',
  description:
    'Helix Extraction\'s field repair solution for deep-site operations. Restores 200 suit integrity using rapid-cure industrial compounds. Rated for Tier III damage profiles including silicon predator strikes.',
  category: 'consumable',
  rarity: 'epic',
  maxStack: 20,
  weight: 0.5,
  baseValue: 1000,
  requiredLevel: 15,
  ilvl: computeIlvl(2, 'epic'),
  textureKey: 'item_suit_repair',
  color: 0xcc9966,
  effects: [{ trigger: 'on_use', effect: { type: 'suit_repair', amount: 200 } }],
};

export const SUIT_REPAIR_KIT_EXOTIC: ItemDefinition = {
  id: 'suit_repair_kit_exotic',
  displayName: 'Bioweave Repair Matrix',
  description:
    'A Verdant Dynamics research-grade repair system using living organisms as repair agents. Restores 400 suit integrity. The organisms continue to work after application, slowly improving suit performance over the following hours.',
  category: 'consumable',
  rarity: 'exotic',
  maxStack: 20,
  weight: 0.3,
  baseValue: 3500,
  requiredLevel: 25,
  ilvl: computeIlvl(3, 'exotic'),
  textureKey: 'item_suit_repair',
  color: 0xeebb77,
  effects: [{ trigger: 'on_use', effect: { type: 'suit_repair', amount: 400 } }],
};

export const SUIT_REPAIR_KIT_LEGENDARY: ItemDefinition = {
  id: 'suit_repair_kit_legendary',
  displayName: 'Ancient Reconstruction Gel',
  description:
    'A substance from Prior Inhabitant installations that reconstructs damaged structures at a molecular level. Restores 800 suit integrity and appears to improve on the original specifications. Nexus researchers cannot determine where the additional material comes from.',
  category: 'consumable',
  rarity: 'legendary',
  maxStack: 20,
  weight: 0.1,
  baseValue: 15000,
  requiredLevel: 35,
  ilvl: computeIlvl(4, 'legendary'),
  textureKey: 'item_suit_repair',
  color: 0xffddaa,
  effects: [{ trigger: 'on_use', effect: { type: 'suit_repair', amount: 800 } }],
};

// ============================================================
// EMERGENCY REBOOT KITS (5) — on_use emergency_reboot effect
// For reviving from Emergency Lockdown Mode ("death" state)
// ============================================================

export const EMERGENCY_REBOOT_KIT_COMMON: ItemDefinition = {
  id: 'emergency_reboot_kit_common',
  displayName: 'Emergency Reboot Kit',
  description:
    'Basic field-deployable system restoration tool. Bypasses Emergency Lockdown protocols and restores 25% suit integrity. Standard issue for deep-site expeditions. Better than nothing.',
  category: 'consumable',
  rarity: 'common',
  maxStack: 5,
  weight: 1.0,
  baseValue: 500,
  requiredLevel: 1,
  ilvl: computeIlvl(1, 'common'),
  textureKey: 'item_reboot_kit',
  color: 0x886644,
  effects: [{ trigger: 'on_use', effect: { type: 'emergency_reboot', healPercent: 25 } }],
};

export const EMERGENCY_REBOOT_KIT_RARE: ItemDefinition = {
  id: 'emergency_reboot_kit_rare',
  displayName: 'Advanced Reboot Kit',
  description:
    'Enhanced system restoration with secondary power cell integration. Bypasses Emergency Lockdown and restores 50% suit integrity. Preferred by experienced operatives who understand the value of field independence.',
  category: 'consumable',
  rarity: 'rare',
  maxStack: 5,
  weight: 0.8,
  baseValue: 2000,
  requiredLevel: 10,
  ilvl: computeIlvl(2, 'rare'),
  textureKey: 'item_reboot_kit',
  color: 0x4488ff,
  effects: [{ trigger: 'on_use', effect: { type: 'emergency_reboot', healPercent: 50 } }],
};

export const EMERGENCY_REBOOT_KIT_EPIC: ItemDefinition = {
  id: 'emergency_reboot_kit_epic',
  displayName: 'Helix Crisis Kit',
  description:
    'Industrial-grade system restoration rated for Tier III environments. Bypasses Emergency Lockdown and restores 75% suit integrity. Helix deep-site teams carry these as standard equipment. The survival rate improvement is statistically significant.',
  category: 'consumable',
  rarity: 'epic',
  maxStack: 5,
  weight: 0.6,
  baseValue: 7500,
  requiredLevel: 20,
  ilvl: computeIlvl(3, 'epic'),
  textureKey: 'item_reboot_kit',
  color: 0xaa44ff,
  effects: [{ trigger: 'on_use', effect: { type: 'emergency_reboot', healPercent: 75 } }],
};

export const EMERGENCY_REBOOT_KIT_EXOTIC: ItemDefinition = {
  id: 'emergency_reboot_kit_exotic',
  displayName: 'Verdant Biotech Reboot',
  description:
    'A Verdant Dynamics research-grade restoration system using living organisms as repair and reboot agents. Bypasses Emergency Lockdown and restores 90% suit integrity. The organisms continue working after application, ensuring maximum system recovery.',
  category: 'consumable',
  rarity: 'exotic',
  maxStack: 5,
  weight: 0.4,
  baseValue: 25000,
  requiredLevel: 30,
  ilvl: computeIlvl(4, 'exotic'),
  textureKey: 'item_reboot_kit',
  color: 0x44ff88,
  effects: [{ trigger: 'on_use', effect: { type: 'emergency_reboot', healPercent: 90 } }],
};

export const EMERGENCY_REBOOT_KIT_LEGENDARY: ItemDefinition = {
  id: 'emergency_reboot_kit_legendary',
  displayName: 'Ancient Override Key',
  description:
    'A Prior Inhabitant device that interfaces directly with exo-suit firmware at a level human engineers cannot replicate. Bypasses Emergency Lockdown and restores 100% suit integrity. How it recognizes human technology as compatible remains unexplained.',
  category: 'consumable',
  rarity: 'legendary',
  maxStack: 5,
  weight: 0.2,
  baseValue: 100000,
  requiredLevel: 40,
  ilvl: computeIlvl(4, 'legendary'),
  textureKey: 'item_reboot_kit',
  color: 0xffcc00,
  effects: [{ trigger: 'on_use', effect: { type: 'emergency_reboot', healPercent: 100 } }],
};

// ============================================================
// BUFF ITEMS (5) — on_use stat_buff effect
// ============================================================

export const STIM_FOCUS_COMMON: ItemDefinition = {
  id: 'stim_focus_common',
  displayName: 'Focus Stim',
  description:
    'A mild cognitive enhancer used by Nexus operatives during extended surveillance shifts. Increases scan speed and target identification accuracy for 60 seconds.',
  category: 'consumable',
  rarity: 'common',
  maxStack: 10,
  weight: 0.1,
  baseValue: 100,
  requiredLevel: 1,
  ilvl: computeIlvl(1, 'common'),
  textureKey: 'item_stim',
  color: 0x4488ff,
  effects: [{ trigger: 'on_use', effect: { type: 'stat_buff', stat: 'scan_speed', amount: 20, duration: 60 } }],
};

export const STIM_ENDURANCE_RARE: ItemDefinition = {
  id: 'stim_endurance_rare',
  displayName: 'Endurance Stim',
  description:
    'A compound used by Helix workers on extended extraction shifts. Reduces fatigue accumulation and improves sustained performance for 120 seconds. Helix denies it has side effects.',
  category: 'consumable',
  rarity: 'rare',
  maxStack: 10,
  weight: 0.1,
  baseValue: 400,
  requiredLevel: 5,
  ilvl: computeIlvl(1, 'rare'),
  textureKey: 'item_stim',
  color: 0x5599ff,
  effects: [{ trigger: 'on_use', effect: { type: 'stat_buff', stat: 'endurance', amount: 30, duration: 120 } }],
};

export const STIM_COMBAT_EPIC: ItemDefinition = {
  id: 'stim_combat_epic',
  displayName: 'Combat Stim',
  description:
    'Military-grade performance enhancement for high-intensity combat situations. Dramatically improves reaction time and aggression thresholds for 90 seconds. Restricted by the ICC. Available everywhere anyway.',
  category: 'consumable',
  rarity: 'epic',
  maxStack: 10,
  weight: 0.1,
  baseValue: 1500,
  requiredLevel: 15,
  ilvl: computeIlvl(2, 'epic'),
  textureKey: 'item_stim',
  color: 0x6622ff,
  effects: [{ trigger: 'on_use', effect: { type: 'stat_buff', stat: 'combat_speed', amount: 50, duration: 90 } }],
};

export const STIM_VERDANT_ADAPTIVE_EXOTIC: ItemDefinition = {
  id: 'stim_verdant_adaptive_exotic',
  displayName: 'Verdant Adaptive Compound',
  description:
    'A Verdant Dynamics classified formula using Terminus organisms\' rapid adaptation properties. Improves all physical performance metrics simultaneously for 180 seconds. Director Voss uses this compound daily. She doesn\'t discuss the source of the biological agents.',
  category: 'consumable',
  rarity: 'exotic',
  maxStack: 10,
  weight: 0.1,
  baseValue: 5000,
  requiredLevel: 25,
  ilvl: computeIlvl(3, 'exotic'),
  textureKey: 'item_stim',
  color: 0x44ff44,
  effects: [{ trigger: 'on_use', effect: { type: 'stat_buff', stat: 'all_performance', amount: 40, duration: 180 } }],
};

export const STIM_VOID_TOUCHED_LEGENDARY: ItemDefinition = {
  id: 'stim_void_touched_legendary',
  displayName: 'Void-Touched Compound',
  description:
    'A substance of uncertain origin that appears to temporarily enhance the user\'s perception and physical capabilities beyond documented human limits. Duration 300 seconds. The ICC would very much like to know where this is coming from.',
  category: 'consumable',
  rarity: 'legendary',
  maxStack: 10,
  weight: 0.05,
  baseValue: 25000,
  requiredLevel: 35,
  ilvl: computeIlvl(4, 'legendary'),
  textureKey: 'item_stim',
  color: 0x00ffff,
  effects: [{ trigger: 'on_use', effect: { type: 'stat_buff', stat: 'all_performance', amount: 80, duration: 300 } }],
};

// ============================================================
// ANTITOXINS (5) — on_use stat_buff for hazard_resistance
// ============================================================

export const ANTITOXIN_COMMON: ItemDefinition = {
  id: 'antitoxin_common',
  displayName: 'Basic Antitoxin',
  description:
    'Standard-issue detoxification compound for operations in Miasma Marshes and Toxic Wastes. Provides 30 seconds of improved toxin resistance. Better than nothing.',
  category: 'consumable',
  rarity: 'common',
  maxStack: 20,
  weight: 0.2,
  baseValue: 60,
  requiredLevel: 1,
  ilvl: computeIlvl(1, 'common'),
  textureKey: 'item_antitoxin',
  color: 0x88cc44,
  effects: [{ trigger: 'on_use', effect: { type: 'stat_buff', stat: 'hazard_resistance', amount: 20, duration: 30 } }],
};

export const ANTITOXIN_RARE: ItemDefinition = {
  id: 'antitoxin_rare',
  displayName: 'Filtered Antitoxin',
  description:
    'An improved detoxification compound with extended duration. Provides 60 seconds of toxin resistance. Recommended for Tier II hazardous zones.',
  category: 'consumable',
  rarity: 'rare',
  maxStack: 20,
  weight: 0.2,
  baseValue: 250,
  requiredLevel: 5,
  ilvl: computeIlvl(1, 'rare'),
  textureKey: 'item_antitoxin',
  color: 0x99dd55,
  effects: [{ trigger: 'on_use', effect: { type: 'stat_buff', stat: 'hazard_resistance', amount: 35, duration: 60 } }],
};

export const ANTITOXIN_EPIC: ItemDefinition = {
  id: 'antitoxin_epic',
  displayName: 'Verdant Bio-Filter',
  description:
    'A Verdant Dynamics detoxification compound using synthesized Terminus organisms. Provides 90 seconds of enhanced toxin resistance. The organisms neutralize toxins as they enter the system.',
  category: 'consumable',
  rarity: 'epic',
  maxStack: 20,
  weight: 0.2,
  baseValue: 800,
  requiredLevel: 15,
  ilvl: computeIlvl(2, 'epic'),
  textureKey: 'item_antitoxin',
  color: 0xaaee66,
  effects: [{ trigger: 'on_use', effect: { type: 'stat_buff', stat: 'hazard_resistance', amount: 50, duration: 90 } }],
};

export const ANTITOXIN_EXOTIC: ItemDefinition = {
  id: 'antitoxin_exotic',
  displayName: 'Adaptive Immunity Compound',
  description:
    'An advanced compound that temporarily rewrites immune response patterns. Provides 120 seconds of near-complete toxin immunity. Side effects are... being studied.',
  category: 'consumable',
  rarity: 'exotic',
  maxStack: 20,
  weight: 0.15,
  baseValue: 3000,
  requiredLevel: 25,
  ilvl: computeIlvl(3, 'exotic'),
  textureKey: 'item_antitoxin',
  color: 0xccff88,
  effects: [{ trigger: 'on_use', effect: { type: 'stat_buff', stat: 'hazard_resistance', amount: 75, duration: 120 } }],
};

export const ANTITOXIN_LEGENDARY: ItemDefinition = {
  id: 'antitoxin_legendary',
  displayName: 'Ancient Purification Serum',
  description:
    'A Prior Inhabitant compound that appears to render the user completely immune to all known Terminus toxins for 180 seconds. How they knew human biochemistry would be compatible remains unexplained.',
  category: 'consumable',
  rarity: 'legendary',
  maxStack: 20,
  weight: 0.1,
  baseValue: 12000,
  requiredLevel: 35,
  ilvl: computeIlvl(4, 'legendary'),
  textureKey: 'item_antitoxin',
  color: 0xeeffaa,
  effects: [{ trigger: 'on_use', effect: { type: 'stat_buff', stat: 'hazard_resistance', amount: 100, duration: 180 } }],
};

// ============================================================
// ALL CONSUMABLES
// ============================================================

export const ALL_CONSUMABLES: readonly ItemDefinition[] = [
  HEALTH_VIAL_COMMON,
  HEALTH_VIAL_RARE,
  HEALTH_VIAL_EPIC,
  HEALTH_VIAL_EXOTIC,
  HEALTH_VIAL_LEGENDARY,
  ENERGY_CELL_COMMON,
  ENERGY_CELL_RARE,
  ENERGY_CELL_EPIC,
  ENERGY_CELL_EXOTIC,
  ENERGY_CELL_LEGENDARY,
  SUIT_REPAIR_KIT_COMMON,
  SUIT_REPAIR_KIT_RARE,
  SUIT_REPAIR_KIT_EPIC,
  SUIT_REPAIR_KIT_EXOTIC,
  SUIT_REPAIR_KIT_LEGENDARY,
  EMERGENCY_REBOOT_KIT_COMMON,
  EMERGENCY_REBOOT_KIT_RARE,
  EMERGENCY_REBOOT_KIT_EPIC,
  EMERGENCY_REBOOT_KIT_EXOTIC,
  EMERGENCY_REBOOT_KIT_LEGENDARY,
  STIM_FOCUS_COMMON,
  STIM_ENDURANCE_RARE,
  STIM_COMBAT_EPIC,
  STIM_VERDANT_ADAPTIVE_EXOTIC,
  STIM_VOID_TOUCHED_LEGENDARY,
  ANTITOXIN_COMMON,
  ANTITOXIN_RARE,
  ANTITOXIN_EPIC,
  ANTITOXIN_EXOTIC,
  ANTITOXIN_LEGENDARY,
];
