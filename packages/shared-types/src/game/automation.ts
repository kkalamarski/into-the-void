/**
 * Automation structure types — the 4 tiers of deployable automation
 */
export type AutomationStructureType = 'extractor' | 'survey_beacon' | 'planetary_extractor' | 'refinery';

/**
 * Per-type configuration for automation structures
 */
export interface AutomationConfig {
  readonly type: AutomationStructureType;
  readonly displayName: string;
  readonly tier: number;
  readonly requiredLevel: number;
  readonly maxPerPlayer: number;
  readonly outputPerTick: number;        // resources per 60s tick (0 for refinery)
  readonly fuelPerTick: number;          // fuel units consumed per 60s tick
  readonly maxFuel: number;              // max fuel capacity
  readonly fuelItemId: string;           // item ID of fuel consumable
  readonly fuelPerItem: number;          // fuel units restored per fuel item
  readonly maxDurability: number;
  readonly degradationPerDay: number;    // 0.0 = no degradation, 0.1 = 10%/day
  readonly expiresAfterMs: number | null; // null = permanent
  readonly nodeRequired: boolean;        // true = must place on resource node
}

/**
 * Automation configs keyed by structure type
 * Values match BALANCE-SHEET.md ratios (maintenance cost >= 60% of hourly output)
 */
export const AUTOMATION_CONFIGS: Record<AutomationStructureType, AutomationConfig> = {
  extractor: {
    type: 'extractor',
    displayName: 'Extractor',
    tier: 2,
    requiredLevel: 10,
    maxPerPlayer: 2,
    outputPerTick: 1,
    fuelPerTick: 1,
    maxFuel: 5,
    fuelItemId: 'fuel_cell_basic',
    fuelPerItem: 5,
    maxDurability: 100,
    degradationPerDay: 0,
    expiresAfterMs: null,
    nodeRequired: true,
  },
  survey_beacon: {
    type: 'survey_beacon',
    displayName: 'Survey Beacon',
    tier: 3,
    requiredLevel: 20,
    maxPerPlayer: 1,
    outputPerTick: 1,
    fuelPerTick: 1,
    maxFuel: 24,
    fuelItemId: 'fuel_cell_advanced',
    fuelPerItem: 4,
    maxDurability: 100,
    degradationPerDay: 0,
    expiresAfterMs: 24 * 60 * 60 * 1000, // 24 hours
    nodeRequired: false,
  },
  planetary_extractor: {
    type: 'planetary_extractor',
    displayName: 'Planetary Extractor',
    tier: 4,
    requiredLevel: 30,
    maxPerPlayer: 3,
    outputPerTick: 1,
    fuelPerTick: 1,
    maxFuel: 10,
    fuelItemId: 'power_core',
    fuelPerItem: 2,
    maxDurability: 100,
    degradationPerDay: 0.1,
    expiresAfterMs: null,
    nodeRequired: true,
  },
  refinery: {
    type: 'refinery',
    displayName: 'Refinery',
    tier: 5,
    requiredLevel: 40,
    maxPerPlayer: 1,
    outputPerTick: 0,
    fuelPerTick: 1,
    maxFuel: 8,
    fuelItemId: 'refinery_core',
    fuelPerItem: 2,
    maxDurability: 200,
    degradationPerDay: 0,
    expiresAfterMs: null,
    nodeRequired: false,
  },
};

/**
 * Refinery transmutation recipe
 */
export interface RefineryRecipe {
  readonly id: string;
  readonly displayName: string;
  readonly inputItemId: string;
  readonly inputQuantity: number;
  readonly outputItemId: string;
  readonly outputQuantity: number;
  readonly durationMs: number;
  readonly crossBiome: boolean;
}

/**
 * Refinery recipes — all are deliberately net-negative in credit value
 * Input/output item IDs are generic placeholders resolved at runtime by AutomationService
 */
export const REFINERY_RECIPES: readonly RefineryRecipe[] = [
  {
    id: 'recipe_common_to_rare',
    displayName: 'Refine Common to Rare',
    inputItemId: 'resource_common',
    inputQuantity: 10,
    outputItemId: 'resource_rare',
    outputQuantity: 1,
    durationMs: 30 * 60 * 1000, // 30 minutes
    crossBiome: false,
  },
  {
    id: 'recipe_rare_to_epic',
    displayName: 'Refine Rare to Epic',
    inputItemId: 'resource_rare',
    inputQuantity: 5,
    outputItemId: 'resource_epic',
    outputQuantity: 1,
    durationMs: 2 * 60 * 60 * 1000, // 2 hours
    crossBiome: false,
  },
  {
    id: 'recipe_cross_biome',
    displayName: 'Cross-Biome Transmutation',
    inputItemId: 'resource_source',
    inputQuantity: 10,
    outputItemId: 'resource_target',
    outputQuantity: 1,
    durationMs: 60 * 60 * 1000, // 1 hour
    crossBiome: true,
  },
];

/**
 * Data structure for the automation HUD panel
 */
export interface AutomationPanelEntry {
  deployableId: string;
  deployableType: AutomationStructureType;
  name: string;
  status: 'active' | 'depleted' | 'husk';
  fuelLevel: number;
  maxFuel: number;
  position: { x: number; y: number; zoneId: string };
  accumulatedCount: number;
  durabilityPercent: number;
}

/**
 * Data for the Minecraft-furnace-style loot window
 */
export interface LootWindowData {
  deployableId: string;
  deployableType: AutomationStructureType;
  ownerName: string;
  ownerId: string;
  isOwner: boolean;
  status: 'active' | 'depleted' | 'husk';
  fuelLevel: number;
  maxFuel: number;
  accumulatedResources: { itemId: string; quantity: number }[];
  durability: number;
  maxDurability: number;
  activeRecipe?: { recipeId: string; progressPercent: number; outputItemId: string };
}
