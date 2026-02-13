import { pgTable, uuid, jsonb, integer } from 'drizzle-orm/pg-core';
import { characters } from './characters';

/**
 * Inventory item stored as JSON
 */
interface InventoryItemJson {
  instanceId: string;
  itemId: string;
  quantity: number;
  slot: number;
  properties: Record<string, unknown>;
}

/**
 * Equipment stored as JSON
 */
interface EquipmentJson {
  head?: InventoryItemJson;
  chest?: InventoryItemJson;
  legs?: InventoryItemJson;
  feet?: InventoryItemJson;
  hands?: InventoryItemJson;
  mainHand?: InventoryItemJson;
  offHand?: InventoryItemJson;
  accessory1?: InventoryItemJson;
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
  equipment: jsonb('equipment').$type<EquipmentJson>().notNull().default({}),
});

export type Inventory = typeof inventories.$inferSelect;
export type NewInventory = typeof inventories.$inferInsert;
