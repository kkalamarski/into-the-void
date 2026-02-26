/**
 * Item Sprite Map
 *
 * Maps each item ID to a spritesheet file + frame index.
 * Spritesheets are 128x128 per frame, 10 columns per row.
 * Frame index = row * 10 + col (0-indexed).
 */

export interface ItemSpriteInfo {
  sheet: string; // filename under /assets/sprites/items/
  frame: number; // frame index in spritesheet
}

const SHEETS = {
  EXOSUITS: 'exo-suits.png',
  EXOSUITS2: 'exo-suits-2.png',
  EXOSUITS3: 'exo-suit-3.png',
  ARMOUR: 'armour.png',
  MODULES: 'modules.png',
  MODULES2: 'modules-2.png',
  MODULES3: 'modules-3.png',
  MULTITOOL: 'multitool.png',
  MULTITOOL2: 'multitool-2.png',
  VIALS: 'vials.png',
  CRYSTALS: 'crystals.png',
  DUST: 'dust.png',
  POWER: 'power.png',
  FLORA: 'flora.png',
  MISC: 'misc.png',
  MISC2: 'misc-2.png',
} as const;

// Sheet dimensions for CSS rendering (cols x rows)
export const SHEET_DIMENSIONS: Record<string, { cols: number; rows: number }> = {
  [SHEETS.EXOSUITS]: { cols: 10, rows: 5 },
  [SHEETS.EXOSUITS2]: { cols: 10, rows: 5 },
  [SHEETS.EXOSUITS3]: { cols: 10, rows: 5 },
  [SHEETS.ARMOUR]: { cols: 10, rows: 5 },
  [SHEETS.MODULES]: { cols: 10, rows: 5 },
  [SHEETS.MODULES2]: { cols: 10, rows: 5 },
  [SHEETS.MODULES3]: { cols: 10, rows: 5 },
  [SHEETS.MULTITOOL]: { cols: 10, rows: 5 },
  [SHEETS.MULTITOOL2]: { cols: 10, rows: 5 },
  [SHEETS.VIALS]: { cols: 10, rows: 2 },
  [SHEETS.CRYSTALS]: { cols: 10, rows: 2 },
  [SHEETS.DUST]: { cols: 10, rows: 2 },
  [SHEETS.POWER]: { cols: 10, rows: 2 },
  [SHEETS.FLORA]: { cols: 10, rows: 5 },
  [SHEETS.MISC]: { cols: 10, rows: 2 },
  [SHEETS.MISC2]: { cols: 10, rows: 5 },
};

export const ITEM_SPRITE_MAP: Record<string, ItemSpriteInfo> = {
  // ================================================================
  // SUITS — exo-suits.png
  // Row 0: Common (basic/gray), Row 1: Rare (colored), Row 2: Epic,
  // Row 3: Exotic, Row 4: Legendary
  // ================================================================

  // Common suits
  suit_basic_common:          { sheet: SHEETS.EXOSUITS, frame: 0 },
  suit_salvaged_common:       { sheet: SHEETS.EXOSUITS, frame: 1 },
  suit_worker_common:         { sheet: SHEETS.EXOSUITS, frame: 2 },
  suit_industrial_common:     { sheet: SHEETS.EXOSUITS, frame: 3 },
  suit_veteran_common:        { sheet: SHEETS.EXOSUITS, frame: 4 },
  suit_hardened_common:       { sheet: SHEETS.EXOSUITS, frame: 5 },

  // Rare suits
  suit_reinforced_rare:       { sheet: SHEETS.EXOSUITS, frame: 10 },
  suit_scout_rare:            { sheet: SHEETS.EXOSUITS, frame: 11 },
  suit_hazmat_rare:           { sheet: SHEETS.EXOSUITS, frame: 12 },
  suit_field_operative_rare:  { sheet: SHEETS.EXOSUITS, frame: 13 },
  suit_expedition_rare:       { sheet: SHEETS.EXOSUITS, frame: 14 },
  suit_elite_field_rare:      { sheet: SHEETS.EXOSUITS, frame: 15 },
  suit_master_rare:           { sheet: SHEETS.EXOSUITS, frame: 16 },

  // Epic suits
  suit_tactical_epic:         { sheet: SHEETS.EXOSUITS, frame: 20 },
  suit_environmental_epic:    { sheet: SHEETS.EXOSUITS, frame: 21 },
  suit_assault_frame_epic:    { sheet: SHEETS.EXOSUITS, frame: 22 },
  suit_stalker_recon_epic:    { sheet: SHEETS.EXOSUITS, frame: 23 },

  // Exotic suits
  suit_nexus_combat_frame_exotic:   { sheet: SHEETS.EXOSUITS, frame: 30 },
  suit_helix_research_frame_exotic: { sheet: SHEETS.EXOSUITS, frame: 31 },
  suit_terminus_adaptation_exotic:  { sheet: SHEETS.EXOSUITS, frame: 32 },

  // Legendary suits
  suit_void_walker_legendary:       { sheet: SHEETS.EXOSUITS, frame: 40 },
  suit_ancient_prototype_legendary: { sheet: SHEETS.EXOSUITS, frame: 41 },

  // Aquatic suits (exo-suits-2.png)
  suit_diving_rare:     { sheet: SHEETS.EXOSUITS2, frame: 17 },
  suit_pressure_epic:   { sheet: SHEETS.EXOSUITS2, frame: 24 },
  suit_abyssal_exotic:  { sheet: SHEETS.EXOSUITS2, frame: 33 },

  // Exotic/anomaly suits (exo-suit-3.png)
  suit_void_touched_exotic: { sheet: SHEETS.EXOSUITS3, frame: 34 },
  suit_anomaly_exotic:      { sheet: SHEETS.EXOSUITS3, frame: 35 },
  suit_null_legendary:      { sheet: SHEETS.EXOSUITS3, frame: 42 },

  // ================================================================
  // MODULES — modules.png
  // Row 0 (green glow): Life Support
  // Row 1 (cyan glow): Sensor
  // Row 2 (red glow): Armor
  // Row 3 (yellow glow): Speed + Power Core
  // Row 4 (purple glow): Mobility
  // ================================================================

  // Life Support modules (green, row 0)
  module_life_support_common:    { sheet: SHEETS.MODULES, frame: 0 },
  module_life_support_rare:      { sheet: SHEETS.MODULES, frame: 1 },
  module_life_support_epic:      { sheet: SHEETS.MODULES, frame: 2 },
  module_life_support_exotic:    { sheet: SHEETS.MODULES, frame: 3 },
  module_life_support_legendary: { sheet: SHEETS.MODULES, frame: 4 },

  // Sensor modules (cyan, row 1)
  module_sensor_common:    { sheet: SHEETS.MODULES, frame: 10 },
  module_sensor_rare:      { sheet: SHEETS.MODULES, frame: 11 },
  module_sensor_epic:      { sheet: SHEETS.MODULES, frame: 12 },
  module_sensor_exotic:    { sheet: SHEETS.MODULES, frame: 13 },
  module_sensor_legendary: { sheet: SHEETS.MODULES, frame: 14 },

  // Armor modules (red, row 2)
  module_armor_common:      { sheet: SHEETS.MODULES, frame: 20 },
  module_armor_common_mk2:  { sheet: SHEETS.MODULES, frame: 21 },
  module_armor_common_mk3:  { sheet: SHEETS.MODULES, frame: 22 },
  module_armor_common_mk4:  { sheet: SHEETS.MODULES, frame: 23 },
  module_armor_common_mk5:  { sheet: SHEETS.MODULES, frame: 24 },
  module_armor_rare:        { sheet: SHEETS.MODULES, frame: 25 },
  module_armor_rare_mk2:    { sheet: SHEETS.MODULES, frame: 26 },
  module_armor_rare_mk3:    { sheet: SHEETS.MODULES, frame: 27 },
  module_armor_rare_mk4:    { sheet: SHEETS.MODULES, frame: 28 },
  module_armor_rare_mk5:    { sheet: SHEETS.MODULES, frame: 29 },
  module_armor_epic:        { sheet: SHEETS.ARMOUR, frame: 20 },
  module_armor_exotic:      { sheet: SHEETS.ARMOUR, frame: 21 },
  module_armor_legendary:   { sheet: SHEETS.ARMOUR, frame: 22 },

  // Speed modules (yellow, row 3 left)
  module_speed_common:    { sheet: SHEETS.MODULES, frame: 30 },
  module_speed_rare:      { sheet: SHEETS.MODULES, frame: 31 },
  module_speed_epic:      { sheet: SHEETS.MODULES, frame: 32 },
  module_speed_exotic:    { sheet: SHEETS.MODULES, frame: 33 },
  module_speed_legendary: { sheet: SHEETS.MODULES, frame: 34 },

  // Power Core modules (yellow, row 3 right + armour.png)
  module_power_core_common:      { sheet: SHEETS.MODULES, frame: 35 },
  module_power_core_common_mk2:  { sheet: SHEETS.MODULES, frame: 36 },
  module_power_core_common_mk3:  { sheet: SHEETS.MODULES, frame: 37 },
  module_power_core_common_mk4:  { sheet: SHEETS.MODULES, frame: 38 },
  module_power_core_common_mk5:  { sheet: SHEETS.MODULES, frame: 39 },
  module_power_core_rare:        { sheet: SHEETS.ARMOUR, frame: 30 },
  module_power_core_rare_mk2:    { sheet: SHEETS.ARMOUR, frame: 31 },
  module_power_core_rare_mk3:    { sheet: SHEETS.ARMOUR, frame: 32 },
  module_power_core_rare_mk4:    { sheet: SHEETS.ARMOUR, frame: 33 },
  module_power_core_rare_mk5:    { sheet: SHEETS.ARMOUR, frame: 34 },
  module_power_core_epic:        { sheet: SHEETS.ARMOUR, frame: 35 },
  module_power_core_exotic:      { sheet: SHEETS.ARMOUR, frame: 36 },
  module_power_core_legendary:   { sheet: SHEETS.ARMOUR, frame: 37 },

  // Mobility modules (purple, row 4)
  module_mobility_common:    { sheet: SHEETS.MODULES, frame: 40 },
  module_mobility_rare:      { sheet: SHEETS.MODULES, frame: 41 },
  module_mobility_epic:      { sheet: SHEETS.MODULES, frame: 42 },
  module_mobility_exotic:    { sheet: SHEETS.MODULES, frame: 43 },
  module_mobility_legendary: { sheet: SHEETS.MODULES, frame: 44 },

  // ================================================================
  // TOOLS — multitool.png + multitool-2.png
  // ================================================================

  // Universal
  tool_universal_common: { sheet: SHEETS.MULTITOOL, frame: 0 },

  // Mining tools (multitool.png rows 0-2)
  tool_mining_common:      { sheet: SHEETS.MULTITOOL, frame: 1 },
  tool_mining_common_mk2:  { sheet: SHEETS.MULTITOOL, frame: 2 },
  tool_mining_common_mk3:  { sheet: SHEETS.MULTITOOL, frame: 3 },
  tool_mining_common_mk4:  { sheet: SHEETS.MULTITOOL, frame: 4 },
  tool_mining_common_mk5:  { sheet: SHEETS.MULTITOOL, frame: 5 },
  tool_mining_rare:        { sheet: SHEETS.MULTITOOL, frame: 6 },
  tool_mining_rare_mk2:    { sheet: SHEETS.MULTITOOL, frame: 7 },
  tool_mining_rare_mk3:    { sheet: SHEETS.MULTITOOL, frame: 8 },
  tool_mining_rare_mk4:    { sheet: SHEETS.MULTITOOL, frame: 9 },
  tool_mining_rare_mk5:    { sheet: SHEETS.MULTITOOL, frame: 10 },
  tool_mining_epic:        { sheet: SHEETS.MULTITOOL, frame: 11 },
  tool_mining_exotic:      { sheet: SHEETS.MULTITOOL, frame: 12 },
  tool_mining_legendary:   { sheet: SHEETS.MULTITOOL, frame: 13 },

  // Combat tools (multitool.png rows 1-3)
  tool_combat_common:      { sheet: SHEETS.MULTITOOL, frame: 14 },
  tool_combat_common_mk2:  { sheet: SHEETS.MULTITOOL, frame: 15 },
  tool_combat_common_mk3:  { sheet: SHEETS.MULTITOOL, frame: 16 },
  tool_combat_common_mk4:  { sheet: SHEETS.MULTITOOL, frame: 17 },
  tool_combat_common_mk5:  { sheet: SHEETS.MULTITOOL, frame: 18 },
  tool_combat_rare:        { sheet: SHEETS.MULTITOOL, frame: 19 },
  tool_combat_rare_mk2:    { sheet: SHEETS.MULTITOOL, frame: 20 },
  tool_combat_rare_mk3:    { sheet: SHEETS.MULTITOOL, frame: 21 },
  tool_combat_rare_mk4:    { sheet: SHEETS.MULTITOOL, frame: 22 },
  tool_combat_rare_mk5:    { sheet: SHEETS.MULTITOOL, frame: 23 },
  tool_combat_epic:        { sheet: SHEETS.MULTITOOL, frame: 24 },
  tool_combat_exotic:      { sheet: SHEETS.MULTITOOL, frame: 25 },
  tool_combat_legendary:   { sheet: SHEETS.MULTITOOL, frame: 26 },

  // Research tools (multitool-2.png)
  tool_research_common:      { sheet: SHEETS.MULTITOOL2, frame: 0 },
  tool_research_common_mk2:  { sheet: SHEETS.MULTITOOL2, frame: 1 },
  tool_research_common_mk3:  { sheet: SHEETS.MULTITOOL2, frame: 2 },
  tool_research_common_mk4:  { sheet: SHEETS.MULTITOOL2, frame: 3 },
  tool_research_common_mk5:  { sheet: SHEETS.MULTITOOL2, frame: 4 },
  tool_research_rare:        { sheet: SHEETS.MULTITOOL2, frame: 5 },
  tool_research_rare_mk2:    { sheet: SHEETS.MULTITOOL2, frame: 6 },
  tool_research_rare_mk3:    { sheet: SHEETS.MULTITOOL2, frame: 7 },
  tool_research_rare_mk4:    { sheet: SHEETS.MULTITOOL2, frame: 8 },
  tool_research_rare_mk5:    { sheet: SHEETS.MULTITOOL2, frame: 9 },
  tool_research_epic:        { sheet: SHEETS.MULTITOOL2, frame: 10 },
  tool_research_exotic:      { sheet: SHEETS.MULTITOOL2, frame: 11 },
  tool_research_legendary:   { sheet: SHEETS.MULTITOOL2, frame: 12 },

  // Specialty tools (multitool-2.png + modules-2.png)
  tool_bio_probe_rare:     { sheet: SHEETS.MULTITOOL2, frame: 13 },
  tool_demolition_epic:    { sheet: SHEETS.MULTITOOL2, frame: 14 },
  tool_stealth_exotic:     { sheet: SHEETS.MULTITOOL2, frame: 15 },
  tool_anomaly_exotic:     { sheet: SHEETS.MULTITOOL2, frame: 16 },

  // Aquatic tools
  tool_harpoon_rare:    { sheet: SHEETS.MULTITOOL2, frame: 20 },
  tool_diving_pick_epic: { sheet: SHEETS.MULTITOOL2, frame: 21 },
  tool_net_rare:         { sheet: SHEETS.MULTITOOL2, frame: 22 },

  // Exotic tools
  tool_phase_extractor_exotic: { sheet: SHEETS.MULTITOOL2, frame: 30 },
  tool_void_pick_exotic:       { sheet: SHEETS.MULTITOOL2, frame: 31 },
  tool_reality_anchor_exotic:  { sheet: SHEETS.MULTITOOL2, frame: 32 },

  // ================================================================
  // CONSUMABLES — vials.png, power.png, misc.png, misc-2.png
  // ================================================================

  // Health vials (vials.png — green-toned vials)
  health_vial_common:    { sheet: SHEETS.VIALS, frame: 4 },
  health_vial_rare:      { sheet: SHEETS.VIALS, frame: 5 },
  health_vial_epic:      { sheet: SHEETS.VIALS, frame: 6 },
  health_vial_exotic:    { sheet: SHEETS.VIALS, frame: 7 },
  health_vial_legendary: { sheet: SHEETS.VIALS, frame: 8 },

  // Energy cells (power.png — energy patterns)
  energy_cell_common:    { sheet: SHEETS.POWER, frame: 0 },
  energy_cell_rare:      { sheet: SHEETS.POWER, frame: 1 },
  energy_cell_epic:      { sheet: SHEETS.POWER, frame: 2 },
  energy_cell_exotic:    { sheet: SHEETS.POWER, frame: 3 },
  energy_cell_legendary: { sheet: SHEETS.POWER, frame: 4 },

  // Suit repair kits (misc-2.png — tech items)
  suit_repair_kit_common:    { sheet: SHEETS.MISC2, frame: 0 },
  suit_repair_kit_rare:      { sheet: SHEETS.MISC2, frame: 1 },
  suit_repair_kit_epic:      { sheet: SHEETS.MISC2, frame: 2 },
  suit_repair_kit_exotic:    { sheet: SHEETS.MISC2, frame: 3 },
  suit_repair_kit_legendary: { sheet: SHEETS.MISC2, frame: 4 },

  // Emergency reboot kits (misc-2.png)
  emergency_reboot_kit_common:    { sheet: SHEETS.MISC2, frame: 5 },
  emergency_reboot_kit_rare:      { sheet: SHEETS.MISC2, frame: 6 },
  emergency_reboot_kit_epic:      { sheet: SHEETS.MISC2, frame: 7 },
  emergency_reboot_kit_exotic:    { sheet: SHEETS.MISC2, frame: 8 },
  emergency_reboot_kit_legendary: { sheet: SHEETS.MISC2, frame: 9 },

  // Stims (vials.png — blue-toned vials, row 1)
  stim_focus_common:            { sheet: SHEETS.VIALS, frame: 14 },
  stim_endurance_rare:          { sheet: SHEETS.VIALS, frame: 15 },
  stim_combat_epic:             { sheet: SHEETS.VIALS, frame: 16 },
  stim_verdant_adaptive_exotic: { sheet: SHEETS.VIALS, frame: 17 },
  stim_void_touched_legendary:  { sheet: SHEETS.VIALS, frame: 18 },

  // Antitoxins (vials.png — yellow/green vials)
  antitoxin_common:    { sheet: SHEETS.VIALS, frame: 9 },
  antitoxin_rare:      { sheet: SHEETS.VIALS, frame: 10 },
  antitoxin_epic:      { sheet: SHEETS.VIALS, frame: 11 },
  antitoxin_exotic:    { sheet: SHEETS.VIALS, frame: 12 },
  antitoxin_legendary: { sheet: SHEETS.VIALS, frame: 13 },

  // Aquatic consumables (misc.png)
  pressure_pill_common:  { sheet: SHEETS.MISC, frame: 0 },
  gill_extract_rare:     { sheet: SHEETS.MISC, frame: 1 },
  depth_charge_epic:     { sheet: SHEETS.MISC, frame: 2 },
  kelp_salve_common:     { sheet: SHEETS.MISC, frame: 3 },
  brine_capacitor_rare:  { sheet: SHEETS.MISC, frame: 4 },

  // Exotic consumables (misc-2.png row 2)
  stability_tonic_epic:      { sheet: SHEETS.MISC2, frame: 20 },
  void_essence_vial_exotic:  { sheet: SHEETS.MISC2, frame: 21 },
  phase_capsule_epic:        { sheet: SHEETS.MISC2, frame: 22 },
  dimensional_mend_exotic:   { sheet: SHEETS.MISC2, frame: 23 },
  null_patch_kit_epic:       { sheet: SHEETS.MISC2, frame: 24 },

  // ================================================================
  // WORLD ITEMS — crystals.png, dust.png, flora.png, misc.png
  // ================================================================

  // Crystals/minerals
  world_void_crystal:        { sheet: SHEETS.CRYSTALS, frame: 0 },
  world_frozen_shard:        { sheet: SHEETS.CRYSTALS, frame: 10 },
  world_volcanic_glass:      { sheet: SHEETS.CRYSTALS, frame: 2 },
  world_crystal_fragment:    { sheet: SHEETS.CRYSTALS, frame: 8 },
  world_temporal_shard:      { sheet: SHEETS.CRYSTALS, frame: 12 },
  world_meteor_fragment:     { sheet: SHEETS.CRYSTALS, frame: 6 },
  world_ancient_fragment:    { sheet: SHEETS.CRYSTALS, frame: 14 },
  world_coastal_shell:       { sheet: SHEETS.CRYSTALS, frame: 18 },

  // Dust/powders
  world_crater_dust:         { sheet: SHEETS.DUST, frame: 7 },
  world_geothermal_compound: { sheet: SHEETS.DUST, frame: 5 },
  world_toxic_residue:       { sheet: SHEETS.DUST, frame: 4 },

  // Flora
  world_alien_flora_luminous:   { sheet: SHEETS.FLORA, frame: 0 },
  world_alien_flora_petrified:  { sheet: SHEETS.FLORA, frame: 30 },
  world_void_flora_sample:      { sheet: SHEETS.FLORA, frame: 5 },
  world_luminous_extract:       { sheet: SHEETS.FLORA, frame: 6 },

  // Organic / fungal
  world_fungal_spore_cluster:  { sheet: SHEETS.MISC, frame: 10 },
  world_mycelial_fiber:        { sheet: SHEETS.FLORA, frame: 40 },
  world_spore_sack:            { sheet: SHEETS.MISC, frame: 11 },
  world_organic_material_common: { sheet: SHEETS.FLORA, frame: 2 },
  world_organic_material_rare:   { sheet: SHEETS.FLORA, frame: 3 },
  world_organic_material_epic:   { sheet: SHEETS.FLORA, frame: 4 },

  // ================================================================
  // REAGENTS — crystals.png, dust.png, power.png, misc-2.png
  // ================================================================

  reagent_crystalline_dust:       { sheet: SHEETS.DUST, frame: 0 },
  reagent_fungal_extract:         { sheet: SHEETS.DUST, frame: 2 },
  reagent_bioluminescent_compound: { sheet: SHEETS.POWER, frame: 9 },
  reagent_thermal_compound:       { sheet: SHEETS.DUST, frame: 5 },
  reagent_ancient_circuitry:      { sheet: SHEETS.MISC2, frame: 30 },
  reagent_frost_essence:          { sheet: SHEETS.CRYSTALS, frame: 11 },
  reagent_biogenic_catalyst:      { sheet: SHEETS.DUST, frame: 3 },
  reagent_quantum_residue:        { sheet: SHEETS.POWER, frame: 10 },
  reagent_petrification_enzyme:   { sheet: SHEETS.DUST, frame: 8 },
  reagent_nexus_core_fragment:    { sheet: SHEETS.POWER, frame: 14 },
  reagent_void_essence:           { sheet: SHEETS.POWER, frame: 12 },
  reagent_anomaly_catalyst:       { sheet: SHEETS.POWER, frame: 15 },
  reagent_helix_gene_sample:      { sheet: SHEETS.VIALS, frame: 1 },
  reagent_void_heart:             { sheet: SHEETS.POWER, frame: 16 },
  reagent_ancient_stabilizer:     { sheet: SHEETS.CRYSTALS, frame: 15 },
};

const SPRITE_BASE_PATH = '/assets/sprites/items/';
const COLS = 10;

/**
 * Get sprite info for an item. Returns null if no sprite mapping exists.
 */
export function getItemSprite(itemId: string): ItemSpriteInfo | null {
  return ITEM_SPRITE_MAP[itemId] ?? null;
}

/**
 * Get CSS background properties for rendering an item sprite at a given display size.
 */
export function getItemSpriteStyle(
  itemId: string,
  displaySize: number
): React.CSSProperties | null {
  const info = ITEM_SPRITE_MAP[itemId];
  if (!info) return null;

  const dims = SHEET_DIMENSIONS[info.sheet];
  if (!dims) return null;

  const col = info.frame % COLS;
  const row = Math.floor(info.frame / COLS);

  return {
    backgroundImage: `url(${SPRITE_BASE_PATH}${info.sheet})`,
    backgroundPosition: `${col * -displaySize}px ${row * -displaySize}px`,
    backgroundSize: `${dims.cols * displaySize}px ${dims.rows * displaySize}px`,
    width: `${displaySize}px`,
    height: `${displaySize}px`,
    backgroundRepeat: 'no-repeat',
    imageRendering: 'pixelated',
  };
}
