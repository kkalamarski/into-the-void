/**
 * Ability categories - determines targeting and effect behavior
 */
export type AbilityCategory = 'offensive' | 'defensive' | 'utility';

/**
 * Ability effect types - discriminated union for type-safe handling
 */
export type AbilityEffect =
  | { readonly type: 'damage'; readonly baseDamage: number; readonly scaling: number }
  | { readonly type: 'heal'; readonly baseHeal: number; readonly scaling: number }
  | { readonly type: 'buff'; readonly stat: string; readonly amount: number; readonly duration: number }
  | { readonly type: 'debuff'; readonly stat: string; readonly amount: number; readonly duration: number }
  | { readonly type: 'dot'; readonly damagePerTick: number; readonly tickInterval: number; readonly duration: number }
  | { readonly type: 'hot'; readonly healPerTick: number; readonly tickInterval: number; readonly duration: number }
  | { readonly type: 'gather'; readonly gatherType: 'harvest' | 'mine'; readonly baseYield: number };

/**
 * Complete ability definition
 */
export interface AbilityDefinition {
  /** Unique ability identifier (e.g., 'basic_strike', 'shield_bash') */
  readonly id: string;
  /** Human-readable display name */
  readonly displayName: string;
  /** Description for tooltips */
  readonly description: string;
  /** Ability category - determines targeting rules */
  readonly category: AbilityCategory;
  /** Energy cost to use */
  readonly energyCost: number;
  /** Cooldown in milliseconds */
  readonly cooldownMs: number;
  /** Range in tiles (0 = self-only, 1+ = targetable range) */
  readonly range: number;
  /** Whether ability requires a target (false for self-buffs) */
  readonly requiresTarget: boolean;
  /** Effects applied on use */
  readonly effects: readonly AbilityEffect[];
  /** Texture key for icon rendering */
  readonly iconKey: string;
  /** Fallback color (hex) for icon */
  readonly iconColor: number;
}
