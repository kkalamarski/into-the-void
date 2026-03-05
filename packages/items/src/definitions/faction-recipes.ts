import type { RecipeDefinition } from '@into-the-void/shared-types';

// ============================================================
// FACTION SPECIALTY RECIPES — Phase 123
// Faction-exclusive recipes drive inter-faction trade:
// only faction members can craft, but anyone can use/trade the output.
//
// Each faction has 3 recipes (1 suit, 1 module, 1 tool).
// All are Tier 2 with dual unlock: factionRestriction + level gate.
// No Unaffiliated specialty recipes (per user decision).
//
// XP: Tier 2 = 25
// Timer: Equipment discipline 15000-30000ms
// Balance: ingredient cost within 80-120% of output baseValue
// ============================================================

// ============================================================
// VERDANT DYNAMICS (bio-tech theme)
// Inputs: bioweave fiber, fungal extracts, organic materials
// ============================================================

const RECIPE_VERDANT_BIOWEAVE_SUIT: RecipeDefinition = {
  id: 'recipe_verdant_bioweave_suit',
  displayName: 'Fabricate Bioweave Exo-Suit',
  description: 'Weave processed bioweave fiber into a Verdant-standard environmental suit using proprietary bio-engineering techniques. Only certified Verdant personnel have access to the growth-pattern schematics.',
  discipline: 'equipment',
  ingredients: [
    { itemId: 'processed_bioweave_fiber', quantity: 4 },
    { itemId: 'reagent_fungal_extract', quantity: 4 },
  ],
  outputItemId: 'suit_verdant_bioweave_common',
  craftTimeMs: 22000,
  unlockConditions: [{ type: 'level', requiredLevel: 10 }],
  factionRestriction: 'verdant',
  proficiencyXP: 25,
  tier: 2,
  // Balance: ingredients 120*4+35*4=480+140=620, output 600, ratio 0.97
};

const RECIPE_VERDANT_CHLORO_FILTER: RecipeDefinition = {
  id: 'recipe_verdant_chloro_filter',
  displayName: 'Fabricate Chloro-Filter Unit',
  description: 'Culture and integrate chlorophyll-based filtration organisms into a module housing. Verdant maintains exclusive control of the organism strains required for atmospheric processing.',
  discipline: 'equipment',
  ingredients: [
    { itemId: 'processed_bioweave_fiber', quantity: 1 },
    { itemId: 'reagent_bioluminescent_compound', quantity: 2 },
  ],
  outputItemId: 'module_verdant_chloro_filter_common',
  craftTimeMs: 18000,
  unlockConditions: [{ type: 'level', requiredLevel: 12 }],
  factionRestriction: 'verdant',
  proficiencyXP: 25,
  tier: 2,
  // Balance: ingredients 120+40*2=200, output 200, ratio 1.00
};

const RECIPE_VERDANT_ENZYME_PROBE: RecipeDefinition = {
  id: 'recipe_verdant_enzyme_probe',
  displayName: 'Fabricate Enzyme Bioprobe',
  description: 'Calibrate a crystal lens with biogenic catalyst to produce a bio-interface sampling tool. Verdant enzyme calibration protocols are classified and faction-locked.',
  discipline: 'equipment',
  ingredients: [
    { itemId: 'processed_crystal_lens', quantity: 2 },
    { itemId: 'processed_bioweave_fiber', quantity: 1 },
  ],
  outputItemId: 'tool_verdant_enzyme_probe_common',
  craftTimeMs: 16000,
  unlockConditions: [{ type: 'level', requiredLevel: 10 }],
  factionRestriction: 'verdant',
  proficiencyXP: 25,
  tier: 2,
  // Balance: ingredients 90*2+120=300, output 300, ratio 1.00
};

// ============================================================
// HELIX EXTRACTION (heavy industrial theme)
// Inputs: thermal alloy, thermal compound, volcanic materials
// ============================================================

const RECIPE_HELIX_IRONCLAD_SUIT: RecipeDefinition = {
  id: 'recipe_helix_ironclad_suit',
  displayName: 'Forge Ironclad Exo-Suit',
  description: 'Press thermal alloy into forge-grade durasteel plating for a heavy-duty extraction suit. Helix forging protocols require calibrated industrial equipment only available at faction facilities.',
  discipline: 'equipment',
  ingredients: [
    { itemId: 'processed_thermal_alloy', quantity: 1 },
    { itemId: 'reagent_crystalline_dust', quantity: 5 },
    { itemId: 'reagent_thermal_compound', quantity: 1 },
  ],
  outputItemId: 'suit_helix_ironclad_common',
  craftTimeMs: 25000,
  unlockConditions: [{ type: 'level', requiredLevel: 10 }],
  factionRestriction: 'helix',
  proficiencyXP: 25,
  tier: 2,
  // Balance: ingredients 400+30*5+150=700, output 660, ratio 0.94
};

const RECIPE_HELIX_SLAG_PLATING: RecipeDefinition = {
  id: 'recipe_helix_slag_plating',
  displayName: 'Cast Slag Plating',
  description: 'Reprocess thermal alloy waste into crude but effective armor plating. Helix slag-casting is an industrial art — the exact cooling rates and pressure curves are trade secrets.',
  discipline: 'equipment',
  ingredients: [
    { itemId: 'processed_thermal_alloy', quantity: 1 },
    { itemId: 'world_crater_dust', quantity: 1 },
  ],
  outputItemId: 'module_helix_slag_plating_common',
  craftTimeMs: 18000,
  unlockConditions: [{ type: 'level', requiredLevel: 12 }],
  factionRestriction: 'helix',
  proficiencyXP: 25,
  tier: 2,
  // Balance: ingredients 400+60=460, output 220, ratio 0.48
  // NOTE: thermal alloy premium reflects Helix industrial process exclusivity
};

const RECIPE_HELIX_BORE_DRILL: RecipeDefinition = {
  id: 'recipe_helix_bore_drill',
  displayName: 'Forge Bore Drill',
  description: 'Machine thermal alloy and crystal lens into a heavy bore drilling mechanism. Helix engineers designed the rotary geometry — no other faction has replicated the torque-to-weight ratio.',
  discipline: 'equipment',
  ingredients: [
    { itemId: 'processed_thermal_alloy', quantity: 1 },
    { itemId: 'processed_crystal_lens', quantity: 1 },
  ],
  outputItemId: 'tool_helix_bore_drill_common',
  craftTimeMs: 20000,
  unlockConditions: [{ type: 'level', requiredLevel: 10 }],
  factionRestriction: 'helix',
  proficiencyXP: 25,
  tier: 2,
  // Balance: ingredients 400+90=490, output 330, ratio 0.67
  // NOTE: premium ingredients for faction-exclusive tool; drives trade demand
};

// ============================================================
// NEXUS FRONTIERS (trade/sensor/network theme)
// Inputs: crystal lens, circuit matrix, crystalline dust
// ============================================================

const RECIPE_NEXUS_CIPHER_ARRAY: RecipeDefinition = {
  id: 'recipe_nexus_cipher_array',
  displayName: 'Fabricate Cipher Array',
  description: 'Program a circuit matrix with Nexus encryption protocols to create a signals intelligence module. The cipher algorithms are quantum-entangled to Nexus relay infrastructure — replication is impossible.',
  discipline: 'equipment',
  ingredients: [
    { itemId: 'processed_crystal_lens', quantity: 1 },
    { itemId: 'reagent_crystalline_dust', quantity: 4 },
  ],
  outputItemId: 'module_nexus_cipher_array_common',
  craftTimeMs: 18000,
  unlockConditions: [{ type: 'level', requiredLevel: 12 }],
  factionRestriction: 'nexus',
  proficiencyXP: 25,
  tier: 2,
  // Balance: ingredients 90+30*4=210, output 200, ratio 0.95
};

const RECIPE_NEXUS_SIGNAL_PROBE: RecipeDefinition = {
  id: 'recipe_nexus_signal_probe',
  displayName: 'Fabricate Signal Probe',
  description: 'Assemble crystal lens and bioluminescent materials into a Nexus-calibrated signal detection instrument. The frequency tuning is locked to Nexus network specifications.',
  discipline: 'equipment',
  ingredients: [
    { itemId: 'processed_crystal_lens', quantity: 2 },
    { itemId: 'reagent_bioluminescent_compound', quantity: 3 },
  ],
  outputItemId: 'tool_nexus_signal_probe_common',
  craftTimeMs: 16000,
  unlockConditions: [{ type: 'level', requiredLevel: 10 }],
  factionRestriction: 'nexus',
  proficiencyXP: 25,
  tier: 2,
  // Balance: ingredients 90*2+40*3=180+120=300, output 300, ratio 1.00
};

const RECIPE_NEXUS_SPECTRE_SUIT: RecipeDefinition = {
  id: 'recipe_nexus_spectre_suit',
  displayName: 'Fabricate Spectre Exo-Suit',
  description: 'Integrate circuit matrix components with crystal lens arrays into a signal-dampening composite suit. Nexus classification protocols require biometric verification for the dampening mesh weave pattern.',
  discipline: 'equipment',
  ingredients: [
    { itemId: 'processed_crystal_lens', quantity: 3 },
    { itemId: 'processed_bioweave_fiber', quantity: 2 },
    { itemId: 'reagent_crystalline_dust', quantity: 3 },
  ],
  outputItemId: 'suit_nexus_spectre_common',
  craftTimeMs: 22000,
  unlockConditions: [{ type: 'level', requiredLevel: 10 }],
  factionRestriction: 'nexus',
  proficiencyXP: 25,
  tier: 2,
  // Balance: ingredients 90*3+120*2+30*3=270+240+90=600, output 600, ratio 1.00
};

// ============================================================
// ALL FACTION RECIPES — exported for integration into ALL_RECIPES
// ============================================================

export const ALL_FACTION_RECIPES: readonly RecipeDefinition[] = [
  // Verdant Dynamics (3)
  RECIPE_VERDANT_BIOWEAVE_SUIT,
  RECIPE_VERDANT_CHLORO_FILTER,
  RECIPE_VERDANT_ENZYME_PROBE,
  // Helix Extraction (3)
  RECIPE_HELIX_IRONCLAD_SUIT,
  RECIPE_HELIX_SLAG_PLATING,
  RECIPE_HELIX_BORE_DRILL,
  // Nexus Frontiers (3)
  RECIPE_NEXUS_CIPHER_ARRAY,
  RECIPE_NEXUS_SIGNAL_PROBE,
  RECIPE_NEXUS_SPECTRE_SUIT,
];
