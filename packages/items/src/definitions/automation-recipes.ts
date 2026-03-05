import type { RecipeDefinition } from '@into-the-void/shared-types';

// ============================================================
// AUTOMATION DISCIPLINE RECIPES — Phase 124
// Deployable automation structures crafted from processed reagents.
// Players craft these items, then deploy them via the automation panel.
//
// DESIGN RULES:
// - Ingredient cost 2-3x typical equipment recipe (major infrastructure investment)
// - Timer range 30000-60000ms (longer than equipment 15-30s)
// - XP by tier: T2 = 25, T3 = 50, T4 = 50, T5 = 50
// - Dual unlock gate: character level + automation proficiency level
// - No faction restriction (automation is universal infrastructure)
// - Always produces exactly 1 deployable per craft
// - No fuel in recipe — player fuels separately after placing
// - Quality on deployables = yield/efficiency bonuses (Refined +15%, Masterwork +30%)
// ============================================================

const RECIPE_DEPLOYABLE_EXTRACTOR: RecipeDefinition = {
  id: 'recipe_deployable_extractor',
  displayName: 'Fabricate Portable Extractor',
  description:
    'Assemble thermal alloy plating with a circuit matrix control unit to produce a deployable extraction unit. The resulting device can be placed on resource nodes for passive harvesting.',
  discipline: 'automation',
  ingredients: [
    { itemId: 'processed_thermal_alloy', quantity: 2 },
    { itemId: 'processed_circuit_matrix', quantity: 1 },
  ],
  outputItemId: 'deployable_extractor',
  craftTimeMs: 30000,
  unlockConditions: [
    { type: 'level', requiredLevel: 10 },
    { type: 'proficiency', discipline: 'automation', requiredLevel: 3 },
  ],
  proficiencyXP: 25,
  tier: 2,
  // Balance: ingredients 400*2+800=1600, output baseValue 500, ratio 0.31
  // NOTE: 2-3x equipment cost rule met (equipment T2 recipes ~700-1200 ingredient cost)
  // Deployable value is in ongoing resource yield, not resale — premium ingredient cost is intentional
};

const RECIPE_DEPLOYABLE_SURVEY_BEACON: RecipeDefinition = {
  id: 'recipe_deployable_survey_beacon',
  displayName: 'Fabricate Survey Beacon',
  description:
    'Integrate dual circuit matrices with precision crystal lens arrays to produce a scanning beacon capable of zone-wide passive resource caching. Requires advanced automation proficiency.',
  discipline: 'automation',
  ingredients: [
    { itemId: 'processed_circuit_matrix', quantity: 2 },
    { itemId: 'processed_crystal_lens', quantity: 3 },
    { itemId: 'reagent_crystalline_dust', quantity: 10 },
  ],
  outputItemId: 'deployable_survey_beacon',
  craftTimeMs: 40000,
  unlockConditions: [
    { type: 'level', requiredLevel: 20 },
    { type: 'proficiency', discipline: 'automation', requiredLevel: 8 },
  ],
  proficiencyXP: 50,
  tier: 3,
  // Balance: ingredients 800*2+90*3+30*10=1600+270+300=2170, output baseValue 1500, ratio 0.69
  // NOTE: beacon provides 24hr passive caching — cost premium reflects significant ongoing value
};

const RECIPE_DEPLOYABLE_PLANETARY_EXTRACTOR: RecipeDefinition = {
  id: 'recipe_deployable_planetary_extractor',
  displayName: 'Fabricate Planetary Extractor',
  description:
    'Combine heavy-grade thermal alloy with circuit matrices and stabilize with quantum residue to produce a permanent heavy-duty extraction platform. Only experienced automation engineers can handle the quantum calibration.',
  discipline: 'automation',
  ingredients: [
    { itemId: 'processed_thermal_alloy', quantity: 3 },
    { itemId: 'processed_circuit_matrix', quantity: 2 },
    { itemId: 'reagent_quantum_residue', quantity: 1 },
  ],
  outputItemId: 'deployable_planetary_extractor',
  craftTimeMs: 50000,
  unlockConditions: [
    { type: 'level', requiredLevel: 30 },
    { type: 'proficiency', discipline: 'automation', requiredLevel: 15 },
  ],
  proficiencyXP: 50,
  tier: 4,
  // Balance: ingredients 400*3+800*2+2000=1200+1600+2000=4800, output baseValue 5000, ratio 1.04
  // NOTE: quantum residue makes this recipe require anomaly zone reagent chain access
};

const RECIPE_DEPLOYABLE_REFINERY: RecipeDefinition = {
  id: 'recipe_deployable_refinery',
  displayName: 'Fabricate Resource Refinery',
  description:
    'Construct a sophisticated transmutation facility from circuit matrices, thermal alloy, anomaly catalyst, and a nexus core fragment. This is the pinnacle of automation engineering — an endgame achievement.',
  discipline: 'automation',
  ingredients: [
    { itemId: 'processed_circuit_matrix', quantity: 3 },
    { itemId: 'processed_thermal_alloy', quantity: 2 },
    { itemId: 'reagent_anomaly_catalyst', quantity: 1 },
    { itemId: 'reagent_nexus_core_fragment', quantity: 1 },
  ],
  outputItemId: 'deployable_refinery',
  craftTimeMs: 60000,
  unlockConditions: [
    { type: 'level', requiredLevel: 40 },
    { type: 'proficiency', discipline: 'automation', requiredLevel: 20 },
  ],
  proficiencyXP: 50,
  tier: 5,
  // Balance: ingredients 800*3+400*2+6000+8000=2400+800+6000+8000=17200, output baseValue 10000, ratio 0.58
  // NOTE: endgame recipe requiring rare + exotic reagents from advanced crafting chains
  // Refinery enables resource type conversion — its value is in the ongoing transmutation capability
};

// ============================================================
// ALL AUTOMATION RECIPES — exported for integration into ALL_RECIPES
// ============================================================

export const ALL_AUTOMATION_RECIPES: readonly RecipeDefinition[] = [
  RECIPE_DEPLOYABLE_EXTRACTOR,
  RECIPE_DEPLOYABLE_SURVEY_BEACON,
  RECIPE_DEPLOYABLE_PLANETARY_EXTRACTOR,
  RECIPE_DEPLOYABLE_REFINERY,
];
