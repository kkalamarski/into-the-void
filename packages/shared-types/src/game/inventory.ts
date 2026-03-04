/**
 * Item rarity levels
 * Matches lore-mandated 5 tiers: no 'uncommon' (confirmed 25-01 decision)
 */
export type ItemRarity = 'common' | 'rare' | 'epic' | 'exotic' | 'legendary';

/**
 * Item categories
 * Matches game-logic 6 lore-mandated types (confirmed 25-01 decision)
 */
export type ItemCategory =
  | 'suit'
  | 'module'
  | 'tool'
  | 'consumable'
  | 'world-item'
  | 'reagent';

/**
 * Base item definition
 */
export interface ItemDef {
  /** Unique item identifier */
  id: string;
  /** Display name */
  name: string;
  /** Description */
  description: string;
  /** Item category */
  category: ItemCategory;
  /** Item rarity */
  rarity: ItemRarity;
  /** Maximum stack size */
  maxStack: number;
  /** Base value for trading */
  baseValue: number;
  /** Item weight */
  weight: number;
  /** Required level to use */
  requiredLevel: number;
}

/**
 * Item instance in inventory
 * Matches InventoryItemJson from database schema
 */
export interface InventoryItem {
  /** Instance ID */
  instanceId: string;
  /** Item definition ID */
  itemId: string;
  /** Current stack count */
  quantity: number;
  /** Slot position in inventory */
  slot: number;
  /** Custom properties (durability, enchants, etc.) */
  properties: Record<string, unknown>;
}

/**
 * Exo-suit equipment model
 * Matches EquipmentJson from database schema (confirmed 25-03 migration)
 *
 * The exo-suit is the base equipment piece. Module slots scale with suit rarity:
 * - Common: 3 slots
 * - Rare: 4 slots
 * - Epic: 4 slots
 * - Exotic: 5 slots
 * - Legendary: 6 slots
 */
export interface InventoryEquipment {
  /** Equipped exo-suit (determines available module slots) */
  exosuit?: InventoryItem;
  /** Equipped modules (max count = suit's moduleSlots) */
  modules: InventoryItem[];
  /** Primary tool slot */
  tool?: InventoryItem;
  /** First accessory slot */
  accessory1?: InventoryItem;
  /** Second accessory slot */
  accessory2?: InventoryItem;
}

/**
 * Computed effective stats derived from equipment.
 * Server-authoritative; client uses for display only.
 */
export interface ComputedStats {
  armor: number;
  speedMultiplier: number;
  hazardResistance: number;
  detectionRange: number;
  energyCapacity: number;
  rechargeRate: number;
  jumpHeight: number;
  /** Per-hazard-type protection percentages (chemical, thermal, physical, biological, anomalous) */
  hazardProtection: Record<string, number>;
  bonuses: Record<string, number>;
}

/**
 * Player inventory
 */
export interface Inventory {
  /** Character ID */
  characterId: string;
  /** Inventory items */
  items: InventoryItem[];
  /** Maximum inventory slots */
  maxSlots: number;
  /** Equipped items using exo-suit model */
  equipment: InventoryEquipment;
  /** Computed stats from equipment (populated by server on equip operations) */
  stats?: ComputedStats;
}

/**
 * Inventory operation result
 */
export interface InventoryResult {
  success: boolean;
  error?: string;
  /** Updated inventory state */
  inventory?: Inventory;
}
