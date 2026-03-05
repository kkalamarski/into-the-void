import type { ItemDefinition } from '../types';

// Import all definition arrays
import { ALL_SUITS } from './suits';
import { ALL_MODULES } from './modules';
import { ALL_TOOLS } from './tools';
import { ALL_CONSUMABLES } from './consumables';
import { ALL_WORLD_ITEMS } from './world-items';
import { ALL_REAGENTS } from './reagents';
import { ALL_AQUATIC_SUITS } from './aquatic-suits';
import { ALL_AQUATIC_TOOLS } from './aquatic-tools';
import { ALL_EXOTIC_SUITS } from './exotic-suits';
import { ALL_EXOTIC_TOOLS } from './exotic-tools';
import { ALL_AQUATIC_CONSUMABLES } from './aquatic-consumables';
import { ALL_EXOTIC_CONSUMABLES } from './exotic-consumables';
import { ALL_FACTION_SUITS } from './faction-suits';
import { ALL_FACTION_MODULES } from './faction-modules';
import { ALL_FACTION_TOOLS } from './faction-tools';
import { ALL_HAZARD_MODULES } from './hazard-modules';
import { ALL_HAZARD_CONSUMABLES } from './hazard-consumables';
import { ALL_FUEL_ITEMS } from './fuel-items';
import { ALL_DEPLOYABLE_ITEMS } from './deployable-items';

/**
 * All item definitions — register these with ItemRegistry.
 * Total: 242 items (234 previous + 4 fuel items + 4 deployable items)
 * Phase 121 adds 4 fuel items (reagent category) and 4 deployable structure items (consumable category).
 */
export const ALL_ITEMS: readonly ItemDefinition[] = [
  ...ALL_SUITS,
  ...ALL_MODULES,
  ...ALL_TOOLS,
  ...ALL_CONSUMABLES,
  ...ALL_WORLD_ITEMS,
  ...ALL_REAGENTS,
  // Phase 87 aquatic items
  ...ALL_AQUATIC_SUITS,
  ...ALL_AQUATIC_TOOLS,
  ...ALL_AQUATIC_CONSUMABLES,
  // Phase 87 exotic items
  ...ALL_EXOTIC_SUITS,
  ...ALL_EXOTIC_TOOLS,
  ...ALL_EXOTIC_CONSUMABLES,
  // Phase 112 faction suits
  ...ALL_FACTION_SUITS,
  // Phase 113 faction modules and tools
  ...ALL_FACTION_MODULES,
  ...ALL_FACTION_TOOLS,
  // Phase 120 hazard protection items
  ...ALL_HAZARD_MODULES,
  ...ALL_HAZARD_CONSUMABLES,
  // Phase 121 automation fuel and deployable items
  ...ALL_FUEL_ITEMS,
  ...ALL_DEPLOYABLE_ITEMS,
];

/**
 * String constants for item IDs — use these instead of hardcoded strings.
 * Provides type-safe access and prevents typo bugs.
 */
export const ITEM_IDS = {
  // ---- SUITS ----
  SUIT_BASIC_COMMON: 'suit_basic_common',
  SUIT_SALVAGED_COMMON: 'suit_salvaged_common',
  SUIT_WORKER_COMMON: 'suit_worker_common',
  SUIT_INDUSTRIAL_COMMON: 'suit_industrial_common',
  SUIT_VETERAN_COMMON: 'suit_veteran_common',
  SUIT_HARDENED_COMMON: 'suit_hardened_common',
  SUIT_REINFORCED_RARE: 'suit_reinforced_rare',
  SUIT_SCOUT_RARE: 'suit_scout_rare',
  SUIT_HAZMAT_RARE: 'suit_hazmat_rare',
  SUIT_FIELD_OPERATIVE_RARE: 'suit_field_operative_rare',
  SUIT_EXPEDITION_RARE: 'suit_expedition_rare',
  SUIT_ELITE_FIELD_RARE: 'suit_elite_field_rare',
  SUIT_MASTER_RARE: 'suit_master_rare',
  SUIT_TACTICAL_EPIC: 'suit_tactical_epic',
  SUIT_ENVIRONMENTAL_EPIC: 'suit_environmental_epic',
  SUIT_ASSAULT_FRAME_EPIC: 'suit_assault_frame_epic',
  SUIT_STALKER_RECON_EPIC: 'suit_stalker_recon_epic',
  SUIT_NEXUS_COMBAT_FRAME_EXOTIC: 'suit_nexus_combat_frame_exotic',
  SUIT_HELIX_RESEARCH_FRAME_EXOTIC: 'suit_helix_research_frame_exotic',
  SUIT_TERMINUS_ADAPTATION_EXOTIC: 'suit_terminus_adaptation_exotic',
  SUIT_VOID_WALKER_LEGENDARY: 'suit_void_walker_legendary',
  SUIT_ANCIENT_PROTOTYPE_LEGENDARY: 'suit_ancient_prototype_legendary',

  // ---- MODULES: ARMOR ----
  MODULE_ARMOR_COMMON: 'module_armor_common',
  MODULE_ARMOR_COMMON_MK2: 'module_armor_common_mk2',
  MODULE_ARMOR_COMMON_MK3: 'module_armor_common_mk3',
  MODULE_ARMOR_COMMON_MK4: 'module_armor_common_mk4',
  MODULE_ARMOR_COMMON_MK5: 'module_armor_common_mk5',
  MODULE_ARMOR_RARE: 'module_armor_rare',
  MODULE_ARMOR_RARE_MK2: 'module_armor_rare_mk2',
  MODULE_ARMOR_RARE_MK3: 'module_armor_rare_mk3',
  MODULE_ARMOR_RARE_MK4: 'module_armor_rare_mk4',
  MODULE_ARMOR_RARE_MK5: 'module_armor_rare_mk5',
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
  MODULE_POWER_CORE_COMMON_MK2: 'module_power_core_common_mk2',
  MODULE_POWER_CORE_COMMON_MK3: 'module_power_core_common_mk3',
  MODULE_POWER_CORE_COMMON_MK4: 'module_power_core_common_mk4',
  MODULE_POWER_CORE_COMMON_MK5: 'module_power_core_common_mk5',
  MODULE_POWER_CORE_RARE: 'module_power_core_rare',
  MODULE_POWER_CORE_RARE_MK2: 'module_power_core_rare_mk2',
  MODULE_POWER_CORE_RARE_MK3: 'module_power_core_rare_mk3',
  MODULE_POWER_CORE_RARE_MK4: 'module_power_core_rare_mk4',
  MODULE_POWER_CORE_RARE_MK5: 'module_power_core_rare_mk5',
  MODULE_POWER_CORE_EPIC: 'module_power_core_epic',
  MODULE_POWER_CORE_EXOTIC: 'module_power_core_exotic',
  MODULE_POWER_CORE_LEGENDARY: 'module_power_core_legendary',

  // ---- MODULES: MOBILITY ----
  MODULE_MOBILITY_COMMON: 'module_mobility_common',
  MODULE_MOBILITY_RARE: 'module_mobility_rare',
  MODULE_MOBILITY_EPIC: 'module_mobility_epic',
  MODULE_MOBILITY_EXOTIC: 'module_mobility_exotic',
  MODULE_MOBILITY_LEGENDARY: 'module_mobility_legendary',

  // ---- MODULES: DAMAGE TYPE AMPLIFIERS (Phase 117) ----
  MODULE_THERMAL_AMP_RARE: 'module_thermal_amp_rare',
  MODULE_CRYO_AMP_RARE: 'module_cryo_amp_rare',
  MODULE_BIO_AMP_RARE: 'module_bio_amp_rare',
  MODULE_KINETIC_AMP_RARE: 'module_kinetic_amp_rare',

  // ---- TOOLS: UNIVERSAL ----
  TOOL_UNIVERSAL_COMMON: 'tool_universal_common',

  // ---- TOOLS: MINING ----
  TOOL_MINING_COMMON: 'tool_mining_common',
  TOOL_MINING_COMMON_MK2: 'tool_mining_common_mk2',
  TOOL_MINING_COMMON_MK3: 'tool_mining_common_mk3',
  TOOL_MINING_COMMON_MK4: 'tool_mining_common_mk4',
  TOOL_MINING_COMMON_MK5: 'tool_mining_common_mk5',
  TOOL_MINING_RARE: 'tool_mining_rare',
  TOOL_MINING_RARE_MK2: 'tool_mining_rare_mk2',
  TOOL_MINING_RARE_MK3: 'tool_mining_rare_mk3',
  TOOL_MINING_RARE_MK4: 'tool_mining_rare_mk4',
  TOOL_MINING_RARE_MK5: 'tool_mining_rare_mk5',
  TOOL_MINING_EPIC: 'tool_mining_epic',
  TOOL_MINING_EXOTIC: 'tool_mining_exotic',
  TOOL_MINING_LEGENDARY: 'tool_mining_legendary',

  // ---- TOOLS: COMBAT ----
  TOOL_COMBAT_COMMON: 'tool_combat_common',
  TOOL_COMBAT_COMMON_MK2: 'tool_combat_common_mk2',
  TOOL_COMBAT_COMMON_MK3: 'tool_combat_common_mk3',
  TOOL_COMBAT_COMMON_MK4: 'tool_combat_common_mk4',
  TOOL_COMBAT_COMMON_MK5: 'tool_combat_common_mk5',
  TOOL_COMBAT_RARE: 'tool_combat_rare',
  TOOL_COMBAT_RARE_MK2: 'tool_combat_rare_mk2',
  TOOL_COMBAT_RARE_MK3: 'tool_combat_rare_mk3',
  TOOL_COMBAT_RARE_MK4: 'tool_combat_rare_mk4',
  TOOL_COMBAT_RARE_MK5: 'tool_combat_rare_mk5',
  TOOL_COMBAT_EPIC: 'tool_combat_epic',
  TOOL_COMBAT_EXOTIC: 'tool_combat_exotic',
  TOOL_COMBAT_LEGENDARY: 'tool_combat_legendary',

  // ---- TOOLS: RESEARCH ----
  TOOL_RESEARCH_COMMON: 'tool_research_common',
  TOOL_RESEARCH_COMMON_MK2: 'tool_research_common_mk2',
  TOOL_RESEARCH_COMMON_MK3: 'tool_research_common_mk3',
  TOOL_RESEARCH_COMMON_MK4: 'tool_research_common_mk4',
  TOOL_RESEARCH_COMMON_MK5: 'tool_research_common_mk5',
  TOOL_RESEARCH_RARE: 'tool_research_rare',
  TOOL_RESEARCH_RARE_MK2: 'tool_research_rare_mk2',
  TOOL_RESEARCH_RARE_MK3: 'tool_research_rare_mk3',
  TOOL_RESEARCH_RARE_MK4: 'tool_research_rare_mk4',
  TOOL_RESEARCH_RARE_MK5: 'tool_research_rare_mk5',
  TOOL_RESEARCH_EPIC: 'tool_research_epic',
  TOOL_RESEARCH_EXOTIC: 'tool_research_exotic',
  TOOL_RESEARCH_LEGENDARY: 'tool_research_legendary',

  // ---- TOOLS: SPECIALIZED ----
  TOOL_BIO_PROBE_RARE: 'tool_bio_probe_rare',
  TOOL_DEMOLITION_EPIC: 'tool_demolition_epic',
  TOOL_STEALTH_EXOTIC: 'tool_stealth_exotic',
  TOOL_ANOMALY_EXOTIC: 'tool_anomaly_exotic',

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

  // ---- AQUATIC SUITS (Phase 87) ----
  SUIT_DIVING_RARE: 'suit_diving_rare',
  SUIT_PRESSURE_EPIC: 'suit_pressure_epic',
  SUIT_ABYSSAL_EXOTIC: 'suit_abyssal_exotic',

  // ---- AQUATIC TOOLS (Phase 87) ----
  TOOL_HARPOON_RARE: 'tool_harpoon_rare',
  TOOL_DIVING_PICK_EPIC: 'tool_diving_pick_epic',
  TOOL_NET_RARE: 'tool_net_rare',

  // ---- EXOTIC SUITS (Phase 87) ----
  SUIT_VOID_TOUCHED_EXOTIC: 'suit_void_touched_exotic',
  SUIT_ANOMALY_EXOTIC: 'suit_anomaly_exotic',
  SUIT_NULL_LEGENDARY: 'suit_null_legendary',

  // ---- EXOTIC TOOLS (Phase 87) ----
  TOOL_PHASE_EXTRACTOR_EXOTIC: 'tool_phase_extractor_exotic',
  TOOL_VOID_PICK_EXOTIC: 'tool_void_pick_exotic',
  TOOL_REALITY_ANCHOR_EXOTIC: 'tool_reality_anchor_exotic',

  // ---- AQUATIC CONSUMABLES (Phase 87) ----
  PRESSURE_PILL_COMMON: 'pressure_pill_common',
  GILL_EXTRACT_RARE: 'gill_extract_rare',
  DEPTH_CHARGE_EPIC: 'depth_charge_epic',
  KELP_SALVE_COMMON: 'kelp_salve_common',
  BRINE_CAPACITOR_RARE: 'brine_capacitor_rare',

  // ---- EXOTIC CONSUMABLES (Phase 87) ----
  STABILITY_TONIC_EPIC: 'stability_tonic_epic',
  VOID_ESSENCE_VIAL_EXOTIC: 'void_essence_vial_exotic',
  PHASE_CAPSULE_EPIC: 'phase_capsule_epic',
  DIMENSIONAL_MEND_EXOTIC: 'dimensional_mend_exotic',
  NULL_PATCH_KIT_EPIC: 'null_patch_kit_epic',

  // ---- FACTION SUITS: VERDANT (Phase 112) ----
  SUIT_VERDANT_BIOWEAVE_COMMON: 'suit_verdant_bioweave_common',
  SUIT_VERDANT_CHLORO_RARE: 'suit_verdant_chloro_rare',
  SUIT_VERDANT_SYMBIONT_EPIC: 'suit_verdant_symbiont_epic',
  SUIT_VERDANT_MYCELIAL_EXOTIC: 'suit_verdant_mycelial_exotic',
  SUIT_VERDANT_CANOPY_SOVEREIGN_LEGENDARY: 'suit_verdant_canopy_sovereign_legendary',
  SUIT_VERDANT_CANOPY_WARDEN_EPIC: 'suit_verdant_canopy_warden_epic',
  SUIT_VERDANT_ROOTBOUND_SENTINEL_LEGENDARY: 'suit_verdant_rootbound_sentinel_legendary',

  // ---- FACTION SUITS: HELIX (Phase 112) ----
  SUIT_HELIX_IRONCLAD_COMMON: 'suit_helix_ironclad_common',
  SUIT_HELIX_FOUNDRY_RARE: 'suit_helix_foundry_rare',
  SUIT_HELIX_TEMPERED_EPIC: 'suit_helix_tempered_epic',
  SUIT_HELIX_ANVIL_EXOTIC: 'suit_helix_anvil_exotic',
  SUIT_HELIX_CRUCIBLE_LEGENDARY: 'suit_helix_crucible_legendary',
  SUIT_HELIX_BORE_SURVEYOR_EPIC: 'suit_helix_bore_surveyor_epic',
  SUIT_HELIX_QUARRY_PHANTOM_LEGENDARY: 'suit_helix_quarry_phantom_legendary',

  // ---- FACTION SUITS: NEXUS (Phase 112) ----
  SUIT_NEXUS_SPECTRE_COMMON: 'suit_nexus_spectre_common',
  SUIT_NEXUS_CIPHER_RARE: 'suit_nexus_cipher_rare',
  SUIT_NEXUS_LATTICE_EPIC: 'suit_nexus_lattice_epic',
  SUIT_NEXUS_MERIDIAN_EXOTIC: 'suit_nexus_meridian_exotic',
  SUIT_NEXUS_ECHO_PRIME_LEGENDARY: 'suit_nexus_echo_prime_legendary',
  SUIT_NEXUS_VECTOR_ENFORCER_EPIC: 'suit_nexus_vector_enforcer_epic',
  SUIT_NEXUS_PHANTOM_PROTOCOL_LEGENDARY: 'suit_nexus_phantom_protocol_legendary',

  // ---- FACTION SUITS: UNAFFILIATED (Phase 112) ----
  SUIT_UNAFFILIATED_PATCHWORK_COMMON: 'suit_unaffiliated_patchwork_common',
  SUIT_UNAFFILIATED_SALVAGE_RARE: 'suit_unaffiliated_salvage_rare',
  SUIT_UNAFFILIATED_DRIFTER_EPIC: 'suit_unaffiliated_drifter_epic',
  SUIT_UNAFFILIATED_RECLAIMED_EXOTIC: 'suit_unaffiliated_reclaimed_exotic',
  SUIT_UNAFFILIATED_WASTELAND_SOVEREIGN_LEGENDARY: 'suit_unaffiliated_wasteland_sovereign_legendary',
  SUIT_UNAFFILIATED_SCROUNGER_EPIC: 'suit_unaffiliated_scrounger_epic',
  SUIT_UNAFFILIATED_MONGREL_LEGENDARY: 'suit_unaffiliated_mongrel_legendary',

  // ---- FACTION MODULES: VERDANT (Phase 113) ----
  MODULE_VERDANT_CHLORO_FILTER_COMMON: 'module_verdant_chloro_filter_common',
  MODULE_VERDANT_SYMBIONT_FILTER_RARE: 'module_verdant_symbiont_filter_rare',
  MODULE_VERDANT_PHYTO_FILTER_EPIC: 'module_verdant_phyto_filter_epic',
  MODULE_VERDANT_CANOPY_RESPIRATOR_EXOTIC: 'module_verdant_canopy_respirator_exotic',
  MODULE_VERDANT_BLOOM_NETWORK_LEGENDARY: 'module_verdant_bloom_network_legendary',
  MODULE_VERDANT_BIOSENSOR_COMMON: 'module_verdant_biosensor_common',
  MODULE_VERDANT_SPORE_ANALYZER_RARE: 'module_verdant_spore_analyzer_rare',
  MODULE_VERDANT_ENZYME_DETECTOR_EPIC: 'module_verdant_enzyme_detector_epic',
  MODULE_VERDANT_TENDRIL_SCANNER_EXOTIC: 'module_verdant_tendril_scanner_exotic',
  MODULE_VERDANT_CANOPY_INTERPRETER_LEGENDARY: 'module_verdant_canopy_interpreter_legendary',

  // ---- FACTION MODULES: HELIX (Phase 113) ----
  MODULE_HELIX_SLAG_PLATING_COMMON: 'module_helix_slag_plating_common',
  MODULE_HELIX_FOUNDRY_PLATE_RARE: 'module_helix_foundry_plate_rare',
  MODULE_HELIX_TEMPERED_PLATE_EPIC: 'module_helix_tempered_plate_epic',
  MODULE_HELIX_ANVIL_PLATING_EXOTIC: 'module_helix_anvil_plating_exotic',
  MODULE_HELIX_CRUCIBLE_BULWARK_LEGENDARY: 'module_helix_crucible_bulwark_legendary',
  MODULE_HELIX_BORE_CELL_COMMON: 'module_helix_bore_cell_common',
  MODULE_HELIX_FURNACE_CELL_RARE: 'module_helix_furnace_cell_rare',
  MODULE_HELIX_SMELT_CORE_EPIC: 'module_helix_smelt_core_epic',
  MODULE_HELIX_INGOT_BATTERY_EXOTIC: 'module_helix_ingot_battery_exotic',
  MODULE_HELIX_CRUCIBLE_REACTOR_LEGENDARY: 'module_helix_crucible_reactor_legendary',

  // ---- FACTION MODULES: NEXUS (Phase 113) ----
  MODULE_NEXUS_CIPHER_ARRAY_COMMON: 'module_nexus_cipher_array_common',
  MODULE_NEXUS_SIGNAL_DETECTOR_RARE: 'module_nexus_signal_detector_rare',
  MODULE_NEXUS_LATTICE_SENSOR_EPIC: 'module_nexus_lattice_sensor_epic',
  MODULE_NEXUS_MERIDIAN_SCANNER_EXOTIC: 'module_nexus_meridian_scanner_exotic',
  MODULE_NEXUS_ECHO_PRIME_RELAY_LEGENDARY: 'module_nexus_echo_prime_relay_legendary',
  MODULE_NEXUS_VECTOR_BOOST_COMMON: 'module_nexus_vector_boost_common',
  MODULE_NEXUS_RELAY_ACCELERATOR_RARE: 'module_nexus_relay_accelerator_rare',
  MODULE_NEXUS_GRID_OPTIMIZER_EPIC: 'module_nexus_grid_optimizer_epic',
  MODULE_NEXUS_PHANTOM_DRIVE_EXOTIC: 'module_nexus_phantom_drive_exotic',
  MODULE_NEXUS_PULSE_ENGINE_LEGENDARY: 'module_nexus_pulse_engine_legendary',

  // ---- FACTION MODULES: UNAFFILIATED (Phase 113) ----
  MODULE_UNAFFILIATED_COBBLED_CELL_COMMON: 'module_unaffiliated_cobbled_cell_common',
  MODULE_UNAFFILIATED_SALVAGE_CORE_RARE: 'module_unaffiliated_salvage_core_rare',
  MODULE_UNAFFILIATED_DRIFTER_CELL_EPIC: 'module_unaffiliated_drifter_cell_epic',
  MODULE_UNAFFILIATED_RECLAIMED_BATTERY_EXOTIC: 'module_unaffiliated_reclaimed_battery_exotic',
  MODULE_UNAFFILIATED_WASTELAND_REACTOR_LEGENDARY: 'module_unaffiliated_wasteland_reactor_legendary',
  MODULE_UNAFFILIATED_MAKESHIFT_FILTER_COMMON: 'module_unaffiliated_makeshift_filter_common',
  MODULE_UNAFFILIATED_JURY_RIG_SUPPORT_RARE: 'module_unaffiliated_jury_rig_support_rare',
  MODULE_UNAFFILIATED_SCROUNGER_RESPIRATOR_EPIC: 'module_unaffiliated_scrounger_respirator_epic',
  MODULE_UNAFFILIATED_IMPROVISED_FILTER_EXOTIC: 'module_unaffiliated_improvised_filter_exotic',
  MODULE_UNAFFILIATED_TINKERED_LIFE_SYSTEM_LEGENDARY: 'module_unaffiliated_tinkered_life_system_legendary',

  // ---- FACTION TOOLS: VERDANT (Phase 113) ----
  TOOL_VERDANT_ENZYME_PROBE_COMMON: 'tool_verdant_enzyme_probe_common',
  TOOL_VERDANT_TENDRIL_EXTRACTOR_RARE: 'tool_verdant_tendril_extractor_rare',
  TOOL_VERDANT_PHYTO_SAMPLER_EPIC: 'tool_verdant_phyto_sampler_epic',
  TOOL_VERDANT_SYMBIONT_INTERFACE_EXOTIC: 'tool_verdant_symbiont_interface_exotic',
  TOOL_VERDANT_CANOPY_INTERPRETER_LEGENDARY: 'tool_verdant_canopy_interpreter_legendary',
  TOOL_VERDANT_SPORE_ANALYZER_COMMON: 'tool_verdant_spore_analyzer_common',
  TOOL_VERDANT_BLOOM_SCANNER_RARE: 'tool_verdant_bloom_scanner_rare',
  TOOL_VERDANT_SYNTHESIS_PROBE_EPIC: 'tool_verdant_synthesis_probe_epic',
  TOOL_VERDANT_CULTIVAR_PROBE_EXOTIC: 'tool_verdant_cultivar_probe_exotic',
  TOOL_VERDANT_ROOTBOUND_SPECTROMETER_LEGENDARY: 'tool_verdant_rootbound_spectrometer_legendary',

  // ---- FACTION TOOLS: HELIX (Phase 113) ----
  TOOL_HELIX_BORE_DRILL_COMMON: 'tool_helix_bore_drill_common',
  TOOL_HELIX_QUARRY_CUTTER_RARE: 'tool_helix_quarry_cutter_rare',
  TOOL_HELIX_SLAG_BREAKER_EPIC: 'tool_helix_slag_breaker_epic',
  TOOL_HELIX_ANVIL_AUGER_EXOTIC: 'tool_helix_anvil_auger_exotic',
  TOOL_HELIX_CRUCIBLE_EXCAVATOR_LEGENDARY: 'tool_helix_crucible_excavator_legendary',
  TOOL_HELIX_RIVET_GUN_COMMON: 'tool_helix_rivet_gun_common',
  TOOL_HELIX_FOUNDRY_HAMMER_RARE: 'tool_helix_foundry_hammer_rare',
  TOOL_HELIX_COMPRESSION_RAM_EPIC: 'tool_helix_compression_ram_epic',
  TOOL_HELIX_TEMPERED_DISRUPTOR_EXOTIC: 'tool_helix_tempered_disruptor_exotic',
  TOOL_HELIX_FURNACE_LANCE_LEGENDARY: 'tool_helix_furnace_lance_legendary',

  // ---- FACTION TOOLS: NEXUS (Phase 113) ----
  TOOL_NEXUS_SIGNAL_PROBE_COMMON: 'tool_nexus_signal_probe_common',
  TOOL_NEXUS_CIPHER_SCANNER_RARE: 'tool_nexus_cipher_scanner_rare',
  TOOL_NEXUS_LATTICE_ANALYZER_EPIC: 'tool_nexus_lattice_analyzer_epic',
  TOOL_NEXUS_MERIDIAN_SPECTROMETER_EXOTIC: 'tool_nexus_meridian_spectrometer_exotic',
  TOOL_NEXUS_ECHO_PRIME_INSTRUMENT_LEGENDARY: 'tool_nexus_echo_prime_instrument_legendary',
  TOOL_NEXUS_PHANTOM_BLADE_COMMON: 'tool_nexus_phantom_blade_common',
  TOOL_NEXUS_VECTOR_INFILTRATOR_RARE: 'tool_nexus_vector_infiltrator_rare',
  TOOL_NEXUS_RELAY_DISRUPTOR_EPIC: 'tool_nexus_relay_disruptor_epic',
  TOOL_NEXUS_TRACE_HARVESTER_EXOTIC: 'tool_nexus_trace_harvester_exotic',
  TOOL_NEXUS_GRID_GHOST_LEGENDARY: 'tool_nexus_grid_ghost_legendary',

  // ---- FACTION TOOLS: UNAFFILIATED (Phase 113) ----
  TOOL_UNAFFILIATED_SCRAP_SCANNER_COMMON: 'tool_unaffiliated_scrap_scanner_common',
  TOOL_UNAFFILIATED_COBBLED_DETECTOR_RARE: 'tool_unaffiliated_cobbled_detector_rare',
  TOOL_UNAFFILIATED_SALVAGE_PROBE_EPIC: 'tool_unaffiliated_salvage_probe_epic',
  TOOL_UNAFFILIATED_DRIFTER_ANALYZER_EXOTIC: 'tool_unaffiliated_drifter_analyzer_exotic',
  TOOL_UNAFFILIATED_WASTELAND_ORACLE_LEGENDARY: 'tool_unaffiliated_wasteland_oracle_legendary',
  TOOL_UNAFFILIATED_IMPROVISED_PICK_COMMON: 'tool_unaffiliated_improvised_pick_common',
  TOOL_UNAFFILIATED_JURY_RIG_CUTTER_RARE: 'tool_unaffiliated_jury_rig_cutter_rare',
  TOOL_UNAFFILIATED_SCROUNGER_DRILL_EPIC: 'tool_unaffiliated_scrounger_drill_epic',
  TOOL_UNAFFILIATED_RECLAIMED_BREAKER_EXOTIC: 'tool_unaffiliated_reclaimed_breaker_exotic',
  TOOL_UNAFFILIATED_MONGREL_TOOTH_LEGENDARY: 'tool_unaffiliated_mongrel_tooth_legendary',

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
  WORLD_VOID_FLORA_SAMPLE: 'world_void_flora_sample',
  // Phase 110 Tier I biome-specific creature materials
  WORLD_VOID_CHITIN: 'world_void_chitin',
  WORLD_FUNGAL_MEMBRANE: 'world_fungal_membrane',
  WORLD_TIDAL_PEARL: 'world_tidal_pearl',
  WORLD_RUIN_SHARD: 'world_ruin_shard',
  // Phase 110 Tier II toxic_wastes materials
  WORLD_CORROSIVE_CARAPACE: 'world_corrosive_carapace',
  WORLD_SLUDGE_MEMBRANE: 'world_sludge_membrane',
  WORLD_ACID_GLAND: 'world_acid_gland',
  // Phase 110 Tier IV void_rift legendary material
  WORLD_RIFT_CORE: 'world_rift_core',

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
  REAGENT_VOLATILE_EXTRACT: 'reagent_volatile_extract',
  REAGENT_ANOMALY_CATALYST: 'reagent_anomaly_catalyst',
  REAGENT_ANCIENT_STABILIZER: 'reagent_ancient_stabilizer',
  // Phase 110 Tier IV void_rift legendary reagent
  REAGENT_CORRUPTED_ESSENCE: 'reagent_corrupted_essence',

  // ---- HAZARD PROTECTION MODULES (Phase 120) ----
  MODULE_CHEM_FILTER_RARE: 'module_chem_filter_rare',
  MODULE_CHEM_FILTER_EPIC: 'module_chem_filter_epic',
  MODULE_THERMAL_REG_RARE: 'module_thermal_reg_rare',
  MODULE_THERMAL_REG_EPIC: 'module_thermal_reg_epic',
  MODULE_IMPACT_SHIELD_RARE: 'module_impact_shield_rare',
  MODULE_IMPACT_SHIELD_EPIC: 'module_impact_shield_epic',
  MODULE_BIO_SEAL_RARE: 'module_bio_seal_rare',
  MODULE_BIO_SEAL_EPIC: 'module_bio_seal_epic',
  MODULE_ANOMALY_WARD_RARE: 'module_anomaly_ward_rare',
  MODULE_ANOMALY_WARD_EPIC: 'module_anomaly_ward_epic',

  // ---- HAZARD PROTECTION CONSUMABLES (Phase 120) ----
  CONSUMABLE_CHEM_NEUTRALIZER: 'consumable_chem_neutralizer',
  CONSUMABLE_THERMAL_COOLANT: 'consumable_thermal_coolant',
  CONSUMABLE_IMPACT_GEL: 'consumable_impact_gel',
  CONSUMABLE_BIO_INOCULANT: 'consumable_bio_inoculant',
  CONSUMABLE_ANOMALY_ANCHOR: 'consumable_anomaly_anchor',

  // ---- FUEL ITEMS (Phase 121) ----
  FUEL_CELL_BASIC: 'fuel_cell_basic',
  FUEL_CELL_ADVANCED: 'fuel_cell_advanced',
  POWER_CORE: 'power_core',
  REFINERY_CORE: 'refinery_core',

  // ---- DEPLOYABLE ITEMS (Phase 121) ----
  DEPLOYABLE_EXTRACTOR: 'deployable_extractor',
  DEPLOYABLE_SURVEY_BEACON: 'deployable_survey_beacon',
  DEPLOYABLE_PLANETARY_EXTRACTOR: 'deployable_planetary_extractor',
  DEPLOYABLE_REFINERY: 'deployable_refinery',
} as const;

// Re-export individual items for direct imports
export * from './suits';
export * from './modules';
export * from './tools';
export * from './consumables';
export * from './world-items';
export * from './reagents';
export * from './aquatic-suits';
export * from './aquatic-tools';
export * from './exotic-suits';
export * from './exotic-tools';
export * from './aquatic-consumables';
export * from './exotic-consumables';
export * from './faction-suits';
export * from './faction-modules';
export * from './faction-tools';
export * from './hazard-modules';
export * from './hazard-consumables';
export * from './fuel-items';
export * from './deployable-items';
