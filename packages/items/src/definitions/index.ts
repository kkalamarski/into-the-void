import type { ItemDefinition } from '../types';

// Import all definition arrays
import { ALL_SUITS } from './suits';
import { ALL_MODULES } from './modules';
import { ALL_TOOLS } from './tools';
import { ALL_CONSUMABLES } from './consumables';
import { ALL_WORLD_ITEMS } from './world-items';
import { ALL_REAGENTS } from './reagents';

/**
 * All item definitions — register these with ItemRegistry.
 * Total: 100 items (10 suits + 30 modules + 15 tools + 20 consumables + 15 world-items + 10 reagents)
 */
export const ALL_ITEMS: readonly ItemDefinition[] = [
  ...ALL_SUITS,
  ...ALL_MODULES,
  ...ALL_TOOLS,
  ...ALL_CONSUMABLES,
  ...ALL_WORLD_ITEMS,
  ...ALL_REAGENTS,
];

/**
 * String constants for item IDs — use these instead of hardcoded strings.
 * Provides type-safe access and prevents typo bugs.
 */
export const ITEM_IDS = {
  // ---- SUITS ----
  SUIT_BASIC_COMMON: 'suit_basic_common',
  SUIT_SALVAGED_COMMON: 'suit_salvaged_common',
  SUIT_REINFORCED_RARE: 'suit_reinforced_rare',
  SUIT_SCOUT_RARE: 'suit_scout_rare',
  SUIT_TACTICAL_EPIC: 'suit_tactical_epic',
  SUIT_ENVIRONMENTAL_EPIC: 'suit_environmental_epic',
  SUIT_NEXUS_COMBAT_FRAME_EXOTIC: 'suit_nexus_combat_frame_exotic',
  SUIT_HELIX_RESEARCH_FRAME_EXOTIC: 'suit_helix_research_frame_exotic',
  SUIT_VOID_WALKER_LEGENDARY: 'suit_void_walker_legendary',
  SUIT_ANCIENT_PROTOTYPE_LEGENDARY: 'suit_ancient_prototype_legendary',

  // ---- MODULES: ARMOR ----
  MODULE_ARMOR_COMMON: 'module_armor_common',
  MODULE_ARMOR_RARE: 'module_armor_rare',
  MODULE_ARMOR_EPIC: 'module_armor_epic',
  MODULE_ARMOR_EXOTIC: 'module_armor_exotic',
  MODULE_ARMOR_LEGENDARY: 'module_armor_legendary',

  // ---- MODULES: SPEED ----
  MODULE_SPEED_COMMON: 'module_speed_common',
  MODULE_SPEED_RARE: 'module_speed_rare',
  MODULE_SPEED_EPIC: 'module_speed_epic',
  MODULE_SPEED_EXOTIC: 'module_speed_exotic',
  MODULE_SPEED_LEGENDARY: 'module_speed_legendary',

  // ---- MODULES: LIFE SUPPORT ----
  MODULE_LIFE_SUPPORT_COMMON: 'module_life_support_common',
  MODULE_LIFE_SUPPORT_RARE: 'module_life_support_rare',
  MODULE_LIFE_SUPPORT_EPIC: 'module_life_support_epic',
  MODULE_LIFE_SUPPORT_EXOTIC: 'module_life_support_exotic',
  MODULE_LIFE_SUPPORT_LEGENDARY: 'module_life_support_legendary',

  // ---- MODULES: SENSOR ----
  MODULE_SENSOR_COMMON: 'module_sensor_common',
  MODULE_SENSOR_RARE: 'module_sensor_rare',
  MODULE_SENSOR_EPIC: 'module_sensor_epic',
  MODULE_SENSOR_EXOTIC: 'module_sensor_exotic',
  MODULE_SENSOR_LEGENDARY: 'module_sensor_legendary',

  // ---- MODULES: POWER CORE ----
  MODULE_POWER_CORE_COMMON: 'module_power_core_common',
  MODULE_POWER_CORE_RARE: 'module_power_core_rare',
  MODULE_POWER_CORE_EPIC: 'module_power_core_epic',
  MODULE_POWER_CORE_EXOTIC: 'module_power_core_exotic',
  MODULE_POWER_CORE_LEGENDARY: 'module_power_core_legendary',

  // ---- MODULES: MOBILITY ----
  MODULE_MOBILITY_COMMON: 'module_mobility_common',
  MODULE_MOBILITY_RARE: 'module_mobility_rare',
  MODULE_MOBILITY_EPIC: 'module_mobility_epic',
  MODULE_MOBILITY_EXOTIC: 'module_mobility_exotic',
  MODULE_MOBILITY_LEGENDARY: 'module_mobility_legendary',

  // ---- TOOLS: MINING ----
  TOOL_MINING_COMMON: 'tool_mining_common',
  TOOL_MINING_RARE: 'tool_mining_rare',
  TOOL_MINING_EPIC: 'tool_mining_epic',
  TOOL_MINING_EXOTIC: 'tool_mining_exotic',
  TOOL_MINING_LEGENDARY: 'tool_mining_legendary',

  // ---- TOOLS: COMBAT ----
  TOOL_COMBAT_COMMON: 'tool_combat_common',
  TOOL_COMBAT_RARE: 'tool_combat_rare',
  TOOL_COMBAT_EPIC: 'tool_combat_epic',
  TOOL_COMBAT_EXOTIC: 'tool_combat_exotic',
  TOOL_COMBAT_LEGENDARY: 'tool_combat_legendary',

  // ---- TOOLS: RESEARCH ----
  TOOL_RESEARCH_COMMON: 'tool_research_common',
  TOOL_RESEARCH_RARE: 'tool_research_rare',
  TOOL_RESEARCH_EPIC: 'tool_research_epic',
  TOOL_RESEARCH_EXOTIC: 'tool_research_exotic',
  TOOL_RESEARCH_LEGENDARY: 'tool_research_legendary',

  // ---- CONSUMABLES: HEALTH VIALS ----
  HEALTH_VIAL_COMMON: 'health_vial_common',
  HEALTH_VIAL_RARE: 'health_vial_rare',
  HEALTH_VIAL_EPIC: 'health_vial_epic',
  HEALTH_VIAL_EXOTIC: 'health_vial_exotic',
  HEALTH_VIAL_LEGENDARY: 'health_vial_legendary',

  // ---- CONSUMABLES: ENERGY CELLS ----
  ENERGY_CELL_COMMON: 'energy_cell_common',
  ENERGY_CELL_RARE: 'energy_cell_rare',
  ENERGY_CELL_EPIC: 'energy_cell_epic',
  ENERGY_CELL_EXOTIC: 'energy_cell_exotic',
  ENERGY_CELL_LEGENDARY: 'energy_cell_legendary',

  // ---- CONSUMABLES: SUIT REPAIR KITS ----
  SUIT_REPAIR_KIT_COMMON: 'suit_repair_kit_common',
  SUIT_REPAIR_KIT_RARE: 'suit_repair_kit_rare',
  SUIT_REPAIR_KIT_EPIC: 'suit_repair_kit_epic',
  SUIT_REPAIR_KIT_EXOTIC: 'suit_repair_kit_exotic',
  SUIT_REPAIR_KIT_LEGENDARY: 'suit_repair_kit_legendary',

  // ---- CONSUMABLES: EMERGENCY REBOOT KITS ----
  EMERGENCY_REBOOT_KIT_COMMON: 'emergency_reboot_kit_common',
  EMERGENCY_REBOOT_KIT_RARE: 'emergency_reboot_kit_rare',
  EMERGENCY_REBOOT_KIT_EPIC: 'emergency_reboot_kit_epic',
  EMERGENCY_REBOOT_KIT_EXOTIC: 'emergency_reboot_kit_exotic',
  EMERGENCY_REBOOT_KIT_LEGENDARY: 'emergency_reboot_kit_legendary',

  // ---- CONSUMABLES: STIMS ----
  STIM_FOCUS_COMMON: 'stim_focus_common',
  STIM_ENDURANCE_RARE: 'stim_endurance_rare',
  STIM_COMBAT_EPIC: 'stim_combat_epic',
  STIM_VERDANT_ADAPTIVE_EXOTIC: 'stim_verdant_adaptive_exotic',
  STIM_VOID_TOUCHED_LEGENDARY: 'stim_void_touched_legendary',

  // ---- CONSUMABLES: ANTITOXINS ----
  ANTITOXIN_COMMON: 'antitoxin_common',
  ANTITOXIN_RARE: 'antitoxin_rare',
  ANTITOXIN_EPIC: 'antitoxin_epic',
  ANTITOXIN_EXOTIC: 'antitoxin_exotic',
  ANTITOXIN_LEGENDARY: 'antitoxin_legendary',

  // ---- WORLD ITEMS ----
  WORLD_VOID_CRYSTAL: 'world_void_crystal',
  WORLD_FUNGAL_SPORE_CLUSTER: 'world_fungal_spore_cluster',
  WORLD_MYCELIAL_FIBER: 'world_mycelial_fiber',
  WORLD_TOXIC_RESIDUE: 'world_toxic_residue',
  WORLD_FROZEN_SHARD: 'world_frozen_shard',
  WORLD_VOLCANIC_GLASS: 'world_volcanic_glass',
  WORLD_GEOTHERMAL_COMPOUND: 'world_geothermal_compound',
  WORLD_CRYSTAL_FRAGMENT: 'world_crystal_fragment',
  WORLD_ANCIENT_FRAGMENT: 'world_ancient_fragment',
  WORLD_CRATER_DUST: 'world_crater_dust',
  WORLD_ORGANIC_MATERIAL_COMMON: 'world_organic_material_common',
  WORLD_ORGANIC_MATERIAL_RARE: 'world_organic_material_rare',
  WORLD_ORGANIC_MATERIAL_EPIC: 'world_organic_material_epic',
  WORLD_ALIEN_FLORA_LUMINOUS: 'world_alien_flora_luminous',
  WORLD_ALIEN_FLORA_PETRIFIED: 'world_alien_flora_petrified',
  WORLD_COASTAL_SHELL: 'world_coastal_shell',
  WORLD_LUMINOUS_EXTRACT: 'world_luminous_extract',
  WORLD_TEMPORAL_SHARD: 'world_temporal_shard',
  WORLD_SPORE_SACK: 'world_spore_sack',
  WORLD_METEOR_FRAGMENT: 'world_meteor_fragment',

  // ---- REAGENTS ----
  REAGENT_CRYSTALLINE_DUST: 'reagent_crystalline_dust',
  REAGENT_FUNGAL_EXTRACT: 'reagent_fungal_extract',
  REAGENT_THERMAL_COMPOUND: 'reagent_thermal_compound',
  REAGENT_ANCIENT_CIRCUITRY: 'reagent_ancient_circuitry',
  REAGENT_BIOGENIC_CATALYST: 'reagent_biogenic_catalyst',
  REAGENT_QUANTUM_RESIDUE: 'reagent_quantum_residue',
  REAGENT_NEXUS_CORE_FRAGMENT: 'reagent_nexus_core_fragment',
  REAGENT_VOID_ESSENCE: 'reagent_void_essence',
  REAGENT_HELIX_GENE_SAMPLE: 'reagent_helix_gene_sample',
  REAGENT_VOID_HEART: 'reagent_void_heart',
  REAGENT_BIOLUMINESCENT_COMPOUND: 'reagent_bioluminescent_compound',
  REAGENT_FROST_ESSENCE: 'reagent_frost_essence',
  REAGENT_PETRIFICATION_ENZYME: 'reagent_petrification_enzyme',
  REAGENT_ANOMALY_CATALYST: 'reagent_anomaly_catalyst',
  REAGENT_ANCIENT_STABILIZER: 'reagent_ancient_stabilizer',
} as const;

// Re-export individual items for direct imports
export * from './suits';
export * from './modules';
export * from './tools';
export * from './consumables';
export * from './world-items';
export * from './reagents';
