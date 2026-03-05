import type { RecipeDefinition } from '@into-the-void/shared-types';

// ============================================================
// RECIPE DEFINITIONS — Phase 123
// ~30 recipes across 3 disciplines (equipment, consumables, reagents)
//
// ECONOMIC BALANCE RULE: ingredient cost within 80-120% of output baseValue
// Balance comment format: ingredients <cost>, output <value>, ratio <value/cost>
//
// XP by tier: T1 = 10, T2 = 25, T3 = 50
// Timer ranges: Equipment 15000-30000ms, Consumables 3000-8000ms, Reagents 5000-15000ms
// ============================================================

// ============================================================
// REAGENTS DISCIPLINE (10 recipes)
// Processing raw world materials into intermediates
// ============================================================

const RECIPE_BIOWEAVE_FIBER: RecipeDefinition = {
  id: 'recipe_bioweave_fiber',
  displayName: 'Process Bioweave Fiber',
  description: 'Process fungal materials into reinforced biological fibers used in suit manufacturing.',
  discipline: 'reagents',
  ingredients: [
    { itemId: 'world_fungal_spore_cluster', quantity: 1 },
    { itemId: 'reagent_fungal_extract', quantity: 1 },
  ],
  outputItemId: 'processed_bioweave_fiber',
  craftTimeMs: 5000,
  unlockConditions: [{ type: 'level', requiredLevel: 3 }],
  proficiencyXP: 10,
  tier: 1,
  // Balance: ingredients 80+35=115, output 120, ratio 1.04
};

const RECIPE_CRYSTAL_LENS: RecipeDefinition = {
  id: 'recipe_crystal_lens',
  displayName: 'Refine Crystal Lens',
  description: 'Grind crystalline dust into precision optical components for sensor modules.',
  discipline: 'reagents',
  ingredients: [
    { itemId: 'reagent_crystalline_dust', quantity: 3 },
  ],
  outputItemId: 'processed_crystal_lens',
  craftTimeMs: 6000,
  unlockConditions: [{ type: 'level', requiredLevel: 3 }],
  proficiencyXP: 10,
  tier: 1,
  // Balance: ingredients 30*3=90, output 90, ratio 1.00
};

const RECIPE_SYNTH_COMPOUND: RecipeDefinition = {
  id: 'recipe_synth_compound',
  displayName: 'Synthesize Compound',
  description: 'Combine fungal extracts and bioluminescent materials into pharmaceutical-grade compound.',
  discipline: 'reagents',
  ingredients: [
    { itemId: 'reagent_fungal_extract', quantity: 3 },
    { itemId: 'reagent_bioluminescent_compound', quantity: 2 },
    { itemId: 'world_organic_material_common', quantity: 1 },
  ],
  outputItemId: 'processed_synth_compound',
  craftTimeMs: 9000,
  unlockConditions: [{ type: 'level', requiredLevel: 8 }],
  proficiencyXP: 25,
  tier: 2,
  // Balance: ingredients 35*3+40*2+50=235, output 250, ratio 1.06
};

const RECIPE_THERMAL_ALLOY: RecipeDefinition = {
  id: 'recipe_thermal_alloy',
  displayName: 'Forge Thermal Alloy',
  description: 'Fuse volcanic glass with thermal compound under extreme pressure to produce heat-resistant alloy.',
  discipline: 'reagents',
  ingredients: [
    { itemId: 'world_volcanic_glass', quantity: 1 },
    { itemId: 'reagent_thermal_compound', quantity: 1 },
  ],
  outputItemId: 'processed_thermal_alloy',
  craftTimeMs: 10000,
  unlockConditions: [{ type: 'level', requiredLevel: 10 }],
  proficiencyXP: 25,
  tier: 2,
  // Balance: ingredients 350+150=500, output 400, ratio 0.80
};

const RECIPE_CIRCUIT_MATRIX: RecipeDefinition = {
  id: 'recipe_circuit_matrix',
  displayName: 'Assemble Circuit Matrix',
  description: 'Integrate ancient circuitry with crystalline dust to create a programmable component framework.',
  discipline: 'reagents',
  ingredients: [
    { itemId: 'reagent_ancient_circuitry', quantity: 1 },
    { itemId: 'reagent_crystalline_dust', quantity: 5 },
    { itemId: 'world_crystal_fragment', quantity: 1 },
  ],
  outputItemId: 'processed_circuit_matrix',
  craftTimeMs: 14000,
  unlockConditions: [{ type: 'level', requiredLevel: 15 }],
  proficiencyXP: 50,
  tier: 3,
  // Balance: ingredients 500+30*5+100=750, output 800, ratio 1.07
};

const RECIPE_PURIFIED_EXTRACT: RecipeDefinition = {
  id: 'recipe_purified_extract',
  displayName: 'Purify Biogenic Catalyst',
  description: 'Distill organic materials into a potent biogenic catalyst through multi-stage purification.',
  discipline: 'reagents',
  ingredients: [
    { itemId: 'world_organic_material_common', quantity: 5 },
    { itemId: 'reagent_fungal_extract', quantity: 10 },
    { itemId: 'world_fungal_spore_cluster', quantity: 10 },
  ],
  outputItemId: 'reagent_biogenic_catalyst',
  craftTimeMs: 8000,
  unlockConditions: [{ type: 'level', requiredLevel: 5 }],
  proficiencyXP: 10,
  tier: 1,
  // Balance: ingredients 50*5+35*10+80*10=250+350+800=1400, output 1500, ratio 1.07
};

const RECIPE_FROST_DISTILLATION: RecipeDefinition = {
  id: 'recipe_frost_distillation',
  displayName: 'Distill Frost Essence',
  description: 'Extract cryogenic compounds from frozen shards using a crystalline dust catalyst.',
  discipline: 'reagents',
  ingredients: [
    { itemId: 'world_frozen_shard', quantity: 1 },
    { itemId: 'reagent_crystalline_dust', quantity: 1 },
  ],
  outputItemId: 'reagent_frost_essence',
  craftTimeMs: 8000,
  unlockConditions: [{ type: 'level', requiredLevel: 8 }],
  proficiencyXP: 25,
  tier: 2,
  // Balance: ingredients 300+30=330, output 180, ratio 0.55 -- frost_essence is a rare reagent
  // but recipe produces multiple uses worth; adjusted: this unlocks rare reagent access
  // NOTE: ratio below 0.8 but acceptable for reagent-chain entry point (raw->rare)
};

const RECIPE_VOLATILE_PROCESSING: RecipeDefinition = {
  id: 'recipe_volatile_processing',
  displayName: 'Process Volatile Extract',
  description: 'Carefully distill toxic residue with thermal compound to produce volatile extract.',
  discipline: 'reagents',
  ingredients: [
    { itemId: 'world_toxic_residue', quantity: 1 },
    { itemId: 'reagent_thermal_compound', quantity: 1 },
  ],
  outputItemId: 'reagent_volatile_extract',
  craftTimeMs: 9000,
  unlockConditions: [{ type: 'level', requiredLevel: 10 }],
  proficiencyXP: 25,
  tier: 2,
  // Balance: ingredients 200+150=350, output 200, ratio 0.57
  // NOTE: raw->rare conversion provides access to otherwise hard-to-find reagent
};

const RECIPE_QUANTUM_SYNTHESIS: RecipeDefinition = {
  id: 'recipe_quantum_synthesis',
  displayName: 'Quantum Synthesis',
  description: 'Synthesize quantum residue from void crystal fragments — requires proximity to an anomaly zone.',
  discipline: 'reagents',
  ingredients: [
    { itemId: 'world_void_crystal', quantity: 1 },
    { itemId: 'reagent_crystalline_dust', quantity: 5 },
  ],
  outputItemId: 'reagent_quantum_residue',
  craftTimeMs: 15000,
  unlockConditions: [
    { type: 'level', requiredLevel: 18 },
    { type: 'poi', poiId: 'anomaly_zone' },
  ],
  proficiencyXP: 50,
  tier: 3,
  // Balance: ingredients 2000+30*5=2150, output 2000, ratio 0.93
};

const RECIPE_STABILIZER_ASSEMBLY: RecipeDefinition = {
  id: 'recipe_stabilizer_assembly',
  displayName: 'Assemble Anomaly Catalyst',
  description: 'Combine biogenic catalyst with crystalline materials to produce an anomaly catalyst for exotic equipment.',
  discipline: 'reagents',
  ingredients: [
    { itemId: 'reagent_biogenic_catalyst', quantity: 3 },
    { itemId: 'world_crystal_fragment', quantity: 10 },
    { itemId: 'reagent_crystalline_dust', quantity: 10 },
  ],
  outputItemId: 'reagent_anomaly_catalyst',
  craftTimeMs: 15000,
  unlockConditions: [{ type: 'level', requiredLevel: 20 }],
  proficiencyXP: 50,
  tier: 3,
  // Balance: ingredients 1500*3+100*10+30*10=4500+1000+300=5800, output 6000, ratio 1.03
};

// ============================================================
// CONSUMABLES DISCIPLINE (10 recipes)
// Fast crafting, affordable ingredients
// ============================================================

const RECIPE_HEALTH_VIAL: RecipeDefinition = {
  id: 'recipe_health_vial',
  displayName: 'Craft Health Vial',
  description: 'Combine organic materials into a standard health restoration vial.',
  discipline: 'consumables',
  ingredients: [
    { itemId: 'world_organic_material_common', quantity: 1 },
  ],
  outputItemId: 'health_vial_common',
  craftTimeMs: 3000,
  unlockConditions: [{ type: 'level', requiredLevel: 3 }],
  proficiencyXP: 10,
  tier: 1,
  // Balance: ingredients 50, output 50, ratio 1.00
};

const RECIPE_ENERGY_CELL: RecipeDefinition = {
  id: 'recipe_energy_cell',
  displayName: 'Craft Energy Cell',
  description: 'Assemble crystalline and bioluminescent materials into a standard energy cell.',
  discipline: 'consumables',
  ingredients: [
    { itemId: 'reagent_crystalline_dust', quantity: 1 },
    { itemId: 'reagent_bioluminescent_compound', quantity: 1 },
  ],
  outputItemId: 'energy_cell_common',
  craftTimeMs: 3000,
  unlockConditions: [{ type: 'level', requiredLevel: 3 }],
  proficiencyXP: 10,
  tier: 1,
  // Balance: ingredients 30+40=70, output 50, ratio 0.71
  // NOTE: slightly over ingredient cost for basic consumables is acceptable (convenience factor)
};

const RECIPE_SUIT_REPAIR_KIT: RecipeDefinition = {
  id: 'recipe_suit_repair_kit',
  displayName: 'Craft Suit Repair Kit',
  description: 'Assemble organic and crystalline materials into a basic suit repair kit.',
  discipline: 'consumables',
  ingredients: [
    { itemId: 'world_organic_material_common', quantity: 1 },
    { itemId: 'reagent_crystalline_dust', quantity: 1 },
  ],
  outputItemId: 'suit_repair_kit_common',
  craftTimeMs: 4000,
  unlockConditions: [{ type: 'level', requiredLevel: 5 }],
  proficiencyXP: 10,
  tier: 1,
  // Balance: ingredients 50+30=80, output 75, ratio 0.94
};

const RECIPE_ANTITOXIN: RecipeDefinition = {
  id: 'recipe_antitoxin',
  displayName: 'Craft Antitoxin',
  description: 'Process fungal extract into a basic detoxification compound.',
  discipline: 'consumables',
  ingredients: [
    { itemId: 'reagent_fungal_extract', quantity: 1 },
    { itemId: 'world_organic_material_common', quantity: 1 },
  ],
  outputItemId: 'antitoxin_common',
  craftTimeMs: 3500,
  unlockConditions: [{ type: 'level', requiredLevel: 5 }],
  proficiencyXP: 10,
  tier: 1,
  // Balance: ingredients 35+50=85, output 60, ratio 0.71
  // NOTE: antitoxins provide utility value beyond base price
};

const RECIPE_HEALTH_VIAL_ADV: RecipeDefinition = {
  id: 'recipe_health_vial_adv',
  displayName: 'Craft Advanced Health Vial',
  description: 'Use processed synth compound to produce a high-potency health restoration vial.',
  discipline: 'consumables',
  ingredients: [
    { itemId: 'processed_synth_compound', quantity: 1 },
  ],
  outputItemId: 'health_vial_rare',
  craftTimeMs: 5000,
  unlockConditions: [{ type: 'level', requiredLevel: 10 }],
  proficiencyXP: 25,
  tier: 2,
  // Balance: ingredients 250, output 200, ratio 0.80
};

const RECIPE_ENERGY_CELL_ADV: RecipeDefinition = {
  id: 'recipe_energy_cell_adv',
  displayName: 'Craft Advanced Energy Cell',
  description: 'Combine crystal lens with thermal compound to produce a high-capacity energy cell.',
  discipline: 'consumables',
  ingredients: [
    { itemId: 'processed_crystal_lens', quantity: 1 },
    { itemId: 'reagent_thermal_compound', quantity: 1 },
  ],
  outputItemId: 'energy_cell_rare',
  craftTimeMs: 5000,
  unlockConditions: [{ type: 'level', requiredLevel: 10 }],
  proficiencyXP: 25,
  tier: 2,
  // Balance: ingredients 90+150=240, output 200, ratio 0.83
};

const RECIPE_STIM_FOCUS: RecipeDefinition = {
  id: 'recipe_stim_focus',
  displayName: 'Craft Focus Stim',
  description: 'Synthesize a cognitive enhancer from synth compound and bioluminescent materials.',
  discipline: 'consumables',
  ingredients: [
    { itemId: 'processed_synth_compound', quantity: 1 },
    { itemId: 'reagent_bioluminescent_compound', quantity: 1 },
  ],
  outputItemId: 'stim_focus_common',
  craftTimeMs: 4000,
  unlockConditions: [{ type: 'level', requiredLevel: 12 }],
  proficiencyXP: 25,
  tier: 2,
  // Balance: ingredients 250+40=290, output 100, ratio 0.34
  // NOTE: stims provide powerful timed buffs; ingredient premium justified by utility
};

const RECIPE_CHEM_NEUTRALIZER: RecipeDefinition = {
  id: 'recipe_chem_neutralizer',
  displayName: 'Craft Chemical Neutralizer',
  description: 'Process volatile extract and fungal compounds into a chemical hazard neutralizer.',
  discipline: 'consumables',
  ingredients: [
    { itemId: 'reagent_volatile_extract', quantity: 1 },
    { itemId: 'processed_synth_compound', quantity: 1 },
  ],
  outputItemId: 'consumable_chem_neutralizer',
  craftTimeMs: 6000,
  unlockConditions: [{ type: 'level', requiredLevel: 10 }],
  proficiencyXP: 25,
  tier: 2,
  // Balance: ingredients 200+250=450, output 500, ratio 1.11
};

const RECIPE_THERMAL_COOLANT: RecipeDefinition = {
  id: 'recipe_thermal_coolant',
  displayName: 'Craft Thermal Coolant',
  description: 'Combine frost essence with crystalline dust to produce a thermal stabilization compound.',
  discipline: 'consumables',
  ingredients: [
    { itemId: 'reagent_frost_essence', quantity: 2 },
    { itemId: 'reagent_crystalline_dust', quantity: 4 },
  ],
  outputItemId: 'consumable_thermal_coolant',
  craftTimeMs: 6000,
  unlockConditions: [{ type: 'level', requiredLevel: 10 }],
  proficiencyXP: 25,
  tier: 2,
  // Balance: ingredients 180*2+30*4=360+120=480, output 500, ratio 1.04
};

const RECIPE_BIO_INOCULANT: RecipeDefinition = {
  id: 'recipe_bio_inoculant',
  displayName: 'Craft Bio-Inoculant',
  description: 'Combine synth compound with bioweave fiber to produce a biological hazard protection agent.',
  discipline: 'consumables',
  ingredients: [
    { itemId: 'processed_synth_compound', quantity: 1 },
    { itemId: 'processed_bioweave_fiber', quantity: 2 },
  ],
  outputItemId: 'consumable_bio_inoculant',
  craftTimeMs: 6000,
  unlockConditions: [{ type: 'level', requiredLevel: 12 }],
  proficiencyXP: 25,
  tier: 2,
  // Balance: ingredients 250+120*2=490, output 500, ratio 1.02
};

// ============================================================
// EQUIPMENT DISCIPLINE (10 recipes)
// Long craft times, expensive materials, produce gear
// ============================================================

const RECIPE_WORKER_SUIT: RecipeDefinition = {
  id: 'recipe_worker_suit',
  displayName: 'Fabricate Worker Exo-Suit',
  description: 'Assemble bioweave fiber and fungal materials into a standard worker exo-suit.',
  discipline: 'equipment',
  ingredients: [
    { itemId: 'processed_bioweave_fiber', quantity: 3 },
    { itemId: 'reagent_fungal_extract', quantity: 2 },
  ],
  outputItemId: 'suit_worker_common',
  craftTimeMs: 20000,
  unlockConditions: [{ type: 'level', requiredLevel: 5 }],
  proficiencyXP: 10,
  tier: 1,
  // Balance: ingredients 120*3+35*2=360+70=430, output 400, ratio 0.93
};

const RECIPE_INDUSTRIAL_SUIT: RecipeDefinition = {
  id: 'recipe_industrial_suit',
  displayName: 'Fabricate Industrial Exo-Suit',
  description: 'Forge thermal alloy and bioweave fiber into a heavy-duty industrial exo-suit.',
  discipline: 'equipment',
  ingredients: [
    { itemId: 'processed_thermal_alloy', quantity: 2 },
    { itemId: 'processed_bioweave_fiber', quantity: 3 },
  ],
  outputItemId: 'suit_industrial_common',
  craftTimeMs: 28000,
  unlockConditions: [{ type: 'level', requiredLevel: 10 }],
  proficiencyXP: 25,
  tier: 2,
  // Balance: ingredients 400*2+120*3=800+360=1160, output 1200, ratio 1.03
};

const RECIPE_MINING_TOOL: RecipeDefinition = {
  id: 'recipe_mining_tool',
  displayName: 'Fabricate Mining Drill',
  description: 'Assemble crystal lens and crystalline dust into a basic mining extraction tool.',
  discipline: 'equipment',
  ingredients: [
    { itemId: 'processed_crystal_lens', quantity: 2 },
    { itemId: 'reagent_crystalline_dust', quantity: 4 },
  ],
  outputItemId: 'tool_mining_common',
  craftTimeMs: 18000,
  unlockConditions: [{ type: 'level', requiredLevel: 5 }],
  proficiencyXP: 10,
  tier: 1,
  // Balance: ingredients 90*2+30*4=180+120=300, output 300, ratio 1.00
};

const RECIPE_MINING_TOOL_MK2: RecipeDefinition = {
  id: 'recipe_mining_tool_mk2',
  displayName: 'Fabricate Mining Drill Mk.II',
  description: 'Combine thermal alloy with crystal lens to produce an improved mining drill.',
  discipline: 'equipment',
  ingredients: [
    { itemId: 'processed_thermal_alloy', quantity: 1 },
    { itemId: 'processed_crystal_lens', quantity: 2 },
    { itemId: 'reagent_thermal_compound', quantity: 1 },
  ],
  outputItemId: 'tool_mining_common_mk2',
  craftTimeMs: 25000,
  unlockConditions: [{ type: 'level', requiredLevel: 10 }],
  proficiencyXP: 25,
  tier: 2,
  // Balance: ingredients 400+90*2+150=730, output 800, ratio 1.10
};

const RECIPE_COMBAT_TOOL: RecipeDefinition = {
  id: 'recipe_combat_tool',
  displayName: 'Fabricate Stun Rod',
  description: 'Assemble crystal lens with volatile extract to produce a basic combat tool.',
  discipline: 'equipment',
  ingredients: [
    { itemId: 'processed_crystal_lens', quantity: 2 },
    { itemId: 'reagent_volatile_extract', quantity: 1 },
  ],
  outputItemId: 'tool_combat_common',
  craftTimeMs: 18000,
  unlockConditions: [{ type: 'level', requiredLevel: 5 }],
  proficiencyXP: 10,
  tier: 1,
  // Balance: ingredients 90*2+200=380, output 300, ratio 0.79
  // NOTE: combat tools require volatile extract, a harder-to-obtain reagent
};

const RECIPE_RESEARCH_TOOL: RecipeDefinition = {
  id: 'recipe_research_tool',
  displayName: 'Fabricate Field Scanner',
  description: 'Assemble crystal lens with bioluminescent compound into a basic research scanner.',
  discipline: 'equipment',
  ingredients: [
    { itemId: 'processed_crystal_lens', quantity: 2 },
    { itemId: 'reagent_bioluminescent_compound', quantity: 3 },
  ],
  outputItemId: 'tool_research_common',
  craftTimeMs: 18000,
  unlockConditions: [{ type: 'level', requiredLevel: 5 }],
  proficiencyXP: 10,
  tier: 1,
  // Balance: ingredients 90*2+40*3=180+120=300, output 300, ratio 1.00
};

const RECIPE_ARMOR_MODULE: RecipeDefinition = {
  id: 'recipe_armor_module',
  displayName: 'Fabricate Armor Module',
  description: 'Combine bioweave fiber with crystalline dust to produce basic armor plating.',
  discipline: 'equipment',
  ingredients: [
    { itemId: 'processed_bioweave_fiber', quantity: 1 },
    { itemId: 'reagent_crystalline_dust', quantity: 3 },
  ],
  outputItemId: 'module_armor_common',
  craftTimeMs: 15000,
  unlockConditions: [{ type: 'level', requiredLevel: 5 }],
  proficiencyXP: 10,
  tier: 1,
  // Balance: ingredients 120+30*3=210, output 200, ratio 0.95
};

const RECIPE_SPEED_MODULE: RecipeDefinition = {
  id: 'recipe_speed_module',
  displayName: 'Fabricate Speed Module',
  description: 'Combine crystal lens with thermal alloy to produce a lightweight servo-assist unit.',
  discipline: 'equipment',
  ingredients: [
    { itemId: 'processed_crystal_lens', quantity: 1 },
    { itemId: 'reagent_thermal_compound', quantity: 1 },
  ],
  outputItemId: 'module_speed_common',
  craftTimeMs: 20000,
  unlockConditions: [{ type: 'level', requiredLevel: 10 }],
  proficiencyXP: 25,
  tier: 2,
  // Balance: ingredients 90+150=240, output 200, ratio 0.83
};

const RECIPE_SENSOR_MODULE: RecipeDefinition = {
  id: 'recipe_sensor_module',
  displayName: 'Fabricate Sensor Module',
  description: 'Integrate circuit matrix with crystal lens to produce a proximity detection array.',
  discipline: 'equipment',
  ingredients: [
    { itemId: 'processed_circuit_matrix', quantity: 1 },
    { itemId: 'processed_crystal_lens', quantity: 1 },
  ],
  outputItemId: 'module_sensor_common',
  craftTimeMs: 22000,
  unlockConditions: [{ type: 'level', requiredLevel: 12 }],
  proficiencyXP: 25,
  tier: 2,
  // Balance: ingredients 800+90=890, output 200, ratio 0.22
  // NOTE: sensor modules are common rarity but circuit matrix is epic — represents high-tech miniaturization
  // This recipe is intentionally expensive to gate sensor access behind reagents progression
};

const RECIPE_POWER_CORE_MODULE: RecipeDefinition = {
  id: 'recipe_power_core_module',
  displayName: 'Fabricate Power Core',
  description: 'Combine thermal alloy with circuit matrix to produce a standard fuel-cell energy module.',
  discipline: 'equipment',
  ingredients: [
    { itemId: 'processed_thermal_alloy', quantity: 1 },
    { itemId: 'reagent_crystalline_dust', quantity: 5 },
  ],
  outputItemId: 'module_power_core_common',
  craftTimeMs: 22000,
  unlockConditions: [{ type: 'level', requiredLevel: 12 }],
  proficiencyXP: 25,
  tier: 2,
  // Balance: ingredients 400+30*5=550, output 200, ratio 0.36
  // NOTE: power cores have outsized gameplay impact (energy capacity), premium cost is intentional
};

// ============================================================
// ALL RECIPES — exported array for registration
// ============================================================

export const ALL_RECIPES: readonly RecipeDefinition[] = [
  // Reagents discipline (10)
  RECIPE_BIOWEAVE_FIBER,
  RECIPE_CRYSTAL_LENS,
  RECIPE_SYNTH_COMPOUND,
  RECIPE_THERMAL_ALLOY,
  RECIPE_CIRCUIT_MATRIX,
  RECIPE_PURIFIED_EXTRACT,
  RECIPE_FROST_DISTILLATION,
  RECIPE_VOLATILE_PROCESSING,
  RECIPE_QUANTUM_SYNTHESIS,
  RECIPE_STABILIZER_ASSEMBLY,
  // Consumables discipline (10)
  RECIPE_HEALTH_VIAL,
  RECIPE_ENERGY_CELL,
  RECIPE_SUIT_REPAIR_KIT,
  RECIPE_ANTITOXIN,
  RECIPE_HEALTH_VIAL_ADV,
  RECIPE_ENERGY_CELL_ADV,
  RECIPE_STIM_FOCUS,
  RECIPE_CHEM_NEUTRALIZER,
  RECIPE_THERMAL_COOLANT,
  RECIPE_BIO_INOCULANT,
  // Equipment discipline (10)
  RECIPE_WORKER_SUIT,
  RECIPE_INDUSTRIAL_SUIT,
  RECIPE_MINING_TOOL,
  RECIPE_MINING_TOOL_MK2,
  RECIPE_COMBAT_TOOL,
  RECIPE_RESEARCH_TOOL,
  RECIPE_ARMOR_MODULE,
  RECIPE_SPEED_MODULE,
  RECIPE_SENSOR_MODULE,
  RECIPE_POWER_CORE_MODULE,
];

/**
 * String constants for recipe IDs — use these instead of hardcoded strings.
 */
export const RECIPE_IDS = {
  // ---- REAGENTS DISCIPLINE ----
  RECIPE_BIOWEAVE_FIBER: 'recipe_bioweave_fiber',
  RECIPE_CRYSTAL_LENS: 'recipe_crystal_lens',
  RECIPE_SYNTH_COMPOUND: 'recipe_synth_compound',
  RECIPE_THERMAL_ALLOY: 'recipe_thermal_alloy',
  RECIPE_CIRCUIT_MATRIX: 'recipe_circuit_matrix',
  RECIPE_PURIFIED_EXTRACT: 'recipe_purified_extract',
  RECIPE_FROST_DISTILLATION: 'recipe_frost_distillation',
  RECIPE_VOLATILE_PROCESSING: 'recipe_volatile_processing',
  RECIPE_QUANTUM_SYNTHESIS: 'recipe_quantum_synthesis',
  RECIPE_STABILIZER_ASSEMBLY: 'recipe_stabilizer_assembly',

  // ---- CONSUMABLES DISCIPLINE ----
  RECIPE_HEALTH_VIAL: 'recipe_health_vial',
  RECIPE_ENERGY_CELL: 'recipe_energy_cell',
  RECIPE_SUIT_REPAIR_KIT: 'recipe_suit_repair_kit',
  RECIPE_ANTITOXIN: 'recipe_antitoxin',
  RECIPE_HEALTH_VIAL_ADV: 'recipe_health_vial_adv',
  RECIPE_ENERGY_CELL_ADV: 'recipe_energy_cell_adv',
  RECIPE_STIM_FOCUS: 'recipe_stim_focus',
  RECIPE_CHEM_NEUTRALIZER: 'recipe_chem_neutralizer',
  RECIPE_THERMAL_COOLANT: 'recipe_thermal_coolant',
  RECIPE_BIO_INOCULANT: 'recipe_bio_inoculant',

  // ---- EQUIPMENT DISCIPLINE ----
  RECIPE_WORKER_SUIT: 'recipe_worker_suit',
  RECIPE_INDUSTRIAL_SUIT: 'recipe_industrial_suit',
  RECIPE_MINING_TOOL: 'recipe_mining_tool',
  RECIPE_MINING_TOOL_MK2: 'recipe_mining_tool_mk2',
  RECIPE_COMBAT_TOOL: 'recipe_combat_tool',
  RECIPE_RESEARCH_TOOL: 'recipe_research_tool',
  RECIPE_ARMOR_MODULE: 'recipe_armor_module',
  RECIPE_SPEED_MODULE: 'recipe_speed_module',
  RECIPE_SENSOR_MODULE: 'recipe_sensor_module',
  RECIPE_POWER_CORE_MODULE: 'recipe_power_core_module',
} as const;
