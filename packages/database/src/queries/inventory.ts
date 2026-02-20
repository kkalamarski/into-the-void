import { eq } from 'drizzle-orm';
import { DbClient } from '../client';
import { inventories, Inventory, NewInventory } from '../schema/inventories';

/**
 * Create inventory for a character.
 * @param data.equipment - Optional initial equipment (exosuit, tool, etc.)
 */
export async function createInventory(db: DbClient, data: NewInventory): Promise<Inventory> {
  const [inventory] = await db.insert(inventories).values(data).returning();
  return inventory;
}

/**
 * Get inventory for a character
 */
export async function getInventory(db: DbClient, characterId: string): Promise<Inventory | null> {
  const [inventory] = await db
    .select()
    .from(inventories)
    .where(eq(inventories.characterId, characterId))
    .limit(1);
  return inventory || null;
}

/**
 * Update inventory items
 */
export async function updateInventoryItems(
  db: DbClient,
  characterId: string,
  items: Inventory['items']
): Promise<void> {
  await db
    .update(inventories)
    .set({ items })
    .where(eq(inventories.characterId, characterId));
}

/**
 * Update equipment
 */
export async function updateEquipment(
  db: DbClient,
  characterId: string,
  equipment: Inventory['equipment']
): Promise<void> {
  await db
    .update(inventories)
    .set({ equipment })
    .where(eq(inventories.characterId, characterId));
}

/**
 * Atomically update both items and equipment in a single DB write.
 *
 * CRITICAL: Use this for ALL operations that modify both inventory items and equipment
 * (equip, unequip, pickup-and-equip). NEVER call updateInventoryItems + updateEquipment
 * as separate awaited operations - this creates a race window where a crash between
 * the two writes can duplicate items.
 *
 * This function generates a single SQL UPDATE statement with multiple SET columns,
 * which PostgreSQL executes atomically.
 */
export async function updateInventoryFull(
  db: DbClient,
  characterId: string,
  data: { items: Inventory['items']; equipment: Inventory['equipment'] }
): Promise<void> {
  await db
    .update(inventories)
    .set({ items: data.items, equipment: data.equipment })
    .where(eq(inventories.characterId, characterId));
}

/**
 * Update entire inventory
 */
export async function updateInventory(
  db: DbClient,
  characterId: string,
  data: Partial<Omit<Inventory, 'characterId'>>
): Promise<void> {
  await db
    .update(inventories)
    .set(data)
    .where(eq(inventories.characterId, characterId));
}

/**
 * Delete inventory (typically cascades from character deletion)
 */
export async function deleteInventory(db: DbClient, characterId: string): Promise<void> {
  await db.delete(inventories).where(eq(inventories.characterId, characterId));
}
