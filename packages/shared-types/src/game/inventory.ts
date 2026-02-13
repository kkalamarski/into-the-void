/**
 * Item rarity levels
 */
export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

/**
 * Item categories
 */
export type ItemCategory =
  | 'weapon'
  | 'armor'
  | 'tool'
  | 'consumable'
  | 'material'
  | 'quest'
  | 'misc';

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
 * Equipment slots
 */
export type EquipmentSlot =
  | 'head'
  | 'chest'
  | 'legs'
  | 'feet'
  | 'hands'
  | 'mainHand'
  | 'offHand'
  | 'accessory1'
  | 'accessory2';

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
  /** Equipped items by slot */
  equipment: Partial<Record<EquipmentSlot, InventoryItem>>;
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
