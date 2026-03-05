import type { FactionId } from './faction';

/**
 * Crafting discipline categories — three independent proficiency tracks
 */
export type CraftingDiscipline = 'equipment' | 'consumables' | 'reagents';

/**
 * Recipe ingredient requirement
 */
export interface RecipeIngredient {
  readonly itemId: string;
  readonly quantity: number;
}

/**
 * Recipe unlock condition — recipes can require level, quest, or POI discovery
 */
export type RecipeUnlockCondition =
  | { readonly type: 'level'; readonly requiredLevel: number }
  | { readonly type: 'quest'; readonly questId: string }
  | { readonly type: 'poi'; readonly poiId: string };

/**
 * Complete recipe definition — static data, compile-time validated.
 * Recipes produce exactly one output item (per user decision).
 * Timer range: 5000-30000ms (per user decision).
 */
export interface RecipeDefinition {
  readonly id: string;
  readonly displayName: string;
  readonly description: string;
  readonly discipline: CraftingDiscipline;
  readonly ingredients: readonly RecipeIngredient[];
  readonly outputItemId: string;
  /** Base craft time in ms (5000-30000). Proficiency reduces this up to 50%. */
  readonly craftTimeMs: number;
  readonly unlockConditions: readonly RecipeUnlockCondition[];
  /** If defined, only members of this faction can craft. undefined = any faction. */
  readonly factionRestriction?: FactionId;
  /** Proficiency XP awarded on successful craft */
  readonly proficiencyXP: number;
  /** Recipe tier (1-5). Affects quality thresholds in Phase 123. */
  readonly tier: number;
}

/**
 * Per-character crafting proficiency state — three independent discipline tracks.
 * Mirrors ProficiencyData shape from gathering.
 */
export interface CraftingProficiencyData {
  equipment: { xp: number; level: number };
  consumables: { xp: number; level: number };
  reagents: { xp: number; level: number };
}

/**
 * Quality tiers for crafted items.
 * Proficiency determines probability of higher tiers (Phase 123).
 * For Phase 122: always 'standard'.
 */
export type QualityTier = 'standard' | 'refined' | 'masterwork';
