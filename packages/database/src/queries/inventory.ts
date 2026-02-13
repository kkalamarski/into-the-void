import { eq } from 'drizzle-orm';
import { DbClient } from '../client';
import { inventories, Inventory, NewInventory } from '../schema/inventories';

/**
 * Create inventory for a character
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
