import { pgTable, uuid, jsonb, integer } from 'drizzle-orm/pg-core';
import { characters } from './characters';

/**
 * Inventory item stored as JSON
 */
export interface InventoryItemJson {
  instanceId: string;
  itemId: string;
  quantity: number;
  slot: number;
  properties: Record<string, unknown>;
}

/**
 * Equipment stored as JSON - exo-suit model
 *
 * The exo-suit is the base equipment piece. Module slots scale with suit rarity:
 * - Common: 3 slots
 * - Rare: 4 slots
 * - Epic: 4 slots
 * - Exotic: 5 slots
 * - Legendary: 6 slots
 *
 * Tools are held in main/secondary slots (hot-swappable).
 * Accessories provide passive bonuses.
 */
export interface EquipmentJson {
  /** Equipped exo-suit (determines available module slots) */
  exosuit?: InventoryItemJson;
  /** Equipped modules (max count = suit's moduleSlots) */
  modules: InventoryItemJson[];
  /** Primary tool slot */
  tool?: InventoryItemJson;
  /** First accessory slot */
  accessory1?: InventoryItemJson;
  /** Second accessory slot */
  accessory2?: InventoryItemJson;
}

/**
 * Character inventories
 */
export const inventories = pgTable('inventories', {
  characterId: uuid('character_id')
    .primaryKey()
    .references(() => characters.id, { onDelete: 'cascade' }),
  items: jsonb('items').$type<InventoryItemJson[]>().notNull().default([]),
  maxSlots: integer('max_slots').notNull().default(20),
  equipment: jsonb('equipment').$type<EquipmentJson>().notNull().default({ modules: [] }),
});

export type Inventory = typeof inventories.$inferSelect;
export type NewInventory = typeof inventories.$inferInsert;
