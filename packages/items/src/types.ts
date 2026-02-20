/**
 * Item categories - lore-mandated 6 categories
 * NOTE: Different from shared-types ItemCategory which has 7 categories
 */
export type ItemCategory = 'suit' | 'module' | 'tool' | 'consumable' | 'world-item' | 'reagent';

/**
 * Item rarity tiers - lore-mandated 5 tiers
 * NOTE: Different from shared-types ItemRarity which includes 'uncommon'
 */
export type ItemRarity = 'common' | 'rare' | 'epic' | 'exotic' | 'legendary';

/**
 * Equipment slots for equippable items
 */
export type EquipSlot = 'exosuit' | 'module' | 'tool' | 'accessory1' | 'accessory2';

/**
 * Effect trigger conditions
 */
export type EffectTrigger = 'on_use' | 'on_equip' | 'passive';

/**
 * Item effect definition with trigger
 */
export interface ItemEffectDef {
  readonly trigger: EffectTrigger;
  readonly effect: ItemEffect;
}

/**
 * Item effects - discriminated union for type-safe handling
 */
export type ItemEffect =
  | { readonly type: 'heal'; readonly amount: number }
  | { readonly type: 'energy_restore'; readonly amount: number }
  | { readonly type: 'stat_buff'; readonly stat: string; readonly amount: number; readonly duration: number }
  | { readonly type: 'suit_repair'; readonly amount: number }
  | { readonly type: 'emergency_reboot'; readonly healPercent: number }
  | { readonly type: 'armor'; readonly value: number }
  | { readonly type: 'speed'; readonly multiplier: number }
  | { readonly type: 'life_support'; readonly hazardResistance: number }
  | { readonly type: 'sensor'; readonly detectionRange: number }
  | { readonly type: 'power_core'; readonly energyCapacity: number; readonly rechargeRate: number }
  | { readonly type: 'mobility'; readonly jumpHeight: number };

/**
 * Tool specialization types
 */
export type ToolType = 'universal' | 'mining' | 'combat' | 'research' | 'bio' | 'demolition' | 'stealth' | 'anomaly';

/**
 * Complete item definition - single source of truth for item data
 */
export interface ItemDefinition {
  /** Unique item identifier (e.g., 'suit_basic_common', 'health_vial_common') */
  readonly id: string;
  /** Human-readable display name */
  readonly displayName: string;
  /** Item description for tooltips */
  readonly description: string;
  /** Item category - determines behavior and UI placement */
  readonly category: ItemCategory;
  /** Rarity tier - affects stats and visual styling */
  readonly rarity: ItemRarity;
  /** Maximum stack size (1 for equipment, up to 999 for materials) */
  readonly maxStack: number;
  /** Item weight for inventory capacity calculations */
  readonly weight: number;
  /** Base value for trading/selling */
  readonly baseValue: number;
  /** Minimum character level required to use/equip */
  readonly requiredLevel: number;
  /** Item power level - derived from tier and rarity */
  readonly ilvl: number;
  /** Texture key for sprite rendering */
  readonly textureKey: string;
  /** Fallback color (hex) until sprite exists */
  readonly color: number;
  /** Equipment slot (present only for equippable items) */
  readonly equipSlot?: EquipSlot;
  /** Number of module slots (suits only) */
  readonly moduleSlots?: number;
  /** Tool specialization (tools only) */
  readonly toolType?: ToolType;
  /** Item effects when used/equipped */
  readonly effects?: readonly ItemEffectDef[];
  /** Tool interaction range in tiles (tools only, 1-10). Higher rarity = longer reach. */
  readonly range?: number;
  /** Ability IDs granted when item is equipped (tools/suits) */
  readonly grantedAbilities?: readonly string[];
}
