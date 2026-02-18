import { Injectable } from '@nestjs/common';
import {
  getInventory,
  createInventory,
  updateInventoryFull,
  updateInventoryItems,
  Inventory,
  InventoryItemJson,
  EquipmentJson,
} from '@into-the-void/database';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class InventoryService {
  private inventories: Map<string, Inventory> = new Map();

  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Load inventory from DB for a player, creating a default one if none exists.
   * Caches the result in memory for fast subsequent access.
   */
  async loadForPlayer(playerId: string): Promise<Inventory> {
    const db = this.databaseService.getClient();
    let inventory = await getInventory(db, playerId);

    if (!inventory) {
      inventory = await createInventory(db, {
        characterId: playerId,
        items: [],
        maxSlots: 20,
        equipment: { modules: [] },
      });
    }

    this.inventories.set(playerId, inventory);
    return inventory;
  }

  /**
   * Return cached inventory for a player without hitting DB.
   * Returns undefined if player is not loaded.
   */
  getInventory(playerId: string): Inventory | undefined {
    return this.inventories.get(playerId);
  }

  /**
   * Persist inventory to DB and evict from memory cache.
   * Called on player disconnect.
   */
  async flushAndUnload(playerId: string): Promise<void> {
    const inventory = this.inventories.get(playerId);
    if (!inventory) return;

    const db = this.databaseService.getClient();
    await updateInventoryFull(db, playerId, {
      items: inventory.items,
      equipment: inventory.equipment,
    });

    this.inventories.delete(playerId);
  }

  /**
   * Add an item to a player's inventory.
   * Checks maxSlots before adding. Does NOT flush — batching is the caller's responsibility
   * for high-frequency events; flush happens on disconnect or on explicit equip operations.
   *
   * Returns {success: true} on success or {success: false, reason} if inventory is full.
   */
  async addItem(
    playerId: string,
    item: InventoryItemJson
  ): Promise<{ success: boolean; reason?: string }> {
    const inventory = this.inventories.get(playerId);
    if (!inventory) {
      return { success: false, reason: 'Player inventory not loaded' };
    }

    if (inventory.items.length >= inventory.maxSlots) {
      return { success: false, reason: 'Inventory full' };
    }

    inventory.items.push(item);

    // Persist items change to DB
    const db = this.databaseService.getClient();
    await updateInventoryItems(db, playerId, inventory.items);

    return { success: true };
  }

  /**
   * Remove an item from inventory by instanceId.
   * Returns the removed item so callers (e.g. handleDrop) can spawn a ground entity.
   */
  async removeItem(
    playerId: string,
    instanceId: string
  ): Promise<{ success: boolean; reason?: string; removedItem?: InventoryItemJson }> {
    const inventory = this.inventories.get(playerId);
    if (!inventory) {
      return { success: false, reason: 'Player inventory not loaded' };
    }

    const idx = inventory.items.findIndex((i) => i.instanceId === instanceId);
    if (idx === -1) {
      return { success: false, reason: 'Item not found in inventory' };
    }

    const [removedItem] = inventory.items.splice(idx, 1);

    const db = this.databaseService.getClient();
    await updateInventoryItems(db, playerId, inventory.items);

    return { success: true, removedItem };
  }

  /**
   * Equip an item from inventory to a named slot (exosuit, tool, accessory1, accessory2).
   * Atomically swaps item between items array and equipment slot using updateInventoryFull.
   *
   * If a different item is already in the slot, it is returned to inventory.
   */
  async equipItem(
    playerId: string,
    instanceId: string,
    slot: keyof Omit<EquipmentJson, 'modules'>
  ): Promise<{ success: boolean; reason?: string }> {
    const inventory = this.inventories.get(playerId);
    if (!inventory) {
      return { success: false, reason: 'Player inventory not loaded' };
    }

    const itemIdx = inventory.items.findIndex((i) => i.instanceId === instanceId);
    if (itemIdx === -1) {
      return { success: false, reason: 'Item not found in inventory' };
    }

    const item = inventory.items[itemIdx];
    const currentEquipped = inventory.equipment[slot] as InventoryItemJson | undefined;

    // Remove item from items array
    inventory.items.splice(itemIdx, 1);

    // If slot was occupied, return existing item to inventory
    if (currentEquipped) {
      inventory.items.push(currentEquipped);
    }

    // Place item in slot
    (inventory.equipment as unknown as Record<string, InventoryItemJson | undefined>)[slot] = item;

    // Single atomic DB write
    const db = this.databaseService.getClient();
    await updateInventoryFull(db, playerId, {
      items: inventory.items,
      equipment: inventory.equipment,
    });

    return { success: true };
  }

  /**
   * Equip a module into the modules array.
   * Respects maxModuleSlots — rejects if array is already at capacity.
   */
  async equipModule(
    playerId: string,
    instanceId: string,
    maxModuleSlots: number
  ): Promise<{ success: boolean; reason?: string }> {
    const inventory = this.inventories.get(playerId);
    if (!inventory) {
      return { success: false, reason: 'Player inventory not loaded' };
    }

    if (inventory.equipment.modules.length >= maxModuleSlots) {
      return { success: false, reason: 'No module slots available' };
    }

    const itemIdx = inventory.items.findIndex((i) => i.instanceId === instanceId);
    if (itemIdx === -1) {
      return { success: false, reason: 'Item not found in inventory' };
    }

    const [item] = inventory.items.splice(itemIdx, 1);
    inventory.equipment.modules.push(item);

    // Single atomic DB write
    const db = this.databaseService.getClient();
    await updateInventoryFull(db, playerId, {
      items: inventory.items,
      equipment: inventory.equipment,
    });

    return { success: true };
  }

  /**
   * Unequip an item from a named slot back to inventory.
   * Checks that inventory has room before moving.
   */
  async unequipItem(
    playerId: string,
    slot: keyof Omit<EquipmentJson, 'modules'>,
    inventoryCount: number,
    maxSlots: number
  ): Promise<{ success: boolean; reason?: string }> {
    const inventory = this.inventories.get(playerId);
    if (!inventory) {
      return { success: false, reason: 'Player inventory not loaded' };
    }

    const equipped = inventory.equipment[slot] as InventoryItemJson | undefined;
    if (!equipped) {
      return { success: false, reason: 'No item equipped in that slot' };
    }

    if (inventoryCount >= maxSlots) {
      return { success: false, reason: 'Inventory full' };
    }

    // Move from slot to items
    (inventory.equipment as unknown as Record<string, InventoryItemJson | undefined>)[slot] = undefined;
    inventory.items.push(equipped);

    // Single atomic DB write
    const db = this.databaseService.getClient();
    await updateInventoryFull(db, playerId, {
      items: inventory.items,
      equipment: inventory.equipment,
    });

    return { success: true };
  }

  /**
   * Move item from one slot to another.
   * If toSlot is occupied, swap the two items' slot values.
   * If toSlot is empty, just update fromItem's slot.
   */
  async moveSlot(
    playerId: string,
    fromSlot: number,
    toSlot: number
  ): Promise<{ success: boolean; reason?: string }> {
    const inventory = this.inventories.get(playerId);
    if (!inventory) {
      return { success: false, reason: 'Player inventory not loaded' };
    }

    const fromItem = inventory.items.find((i) => i.slot === fromSlot);
    if (!fromItem) {
      return { success: false, reason: 'No item in fromSlot' };
    }

    const toItem = inventory.items.find((i) => i.slot === toSlot);

    // Swap or move
    fromItem.slot = toSlot;
    if (toItem) {
      toItem.slot = fromSlot;
    }

    // Persist
    const db = this.databaseService.getClient();
    await updateInventoryItems(db, playerId, inventory.items);

    return { success: true };
  }

  /**
   * Swap main tool and secondary tool (accessory1) positions.
   * Used for Q hotkey tool swap functionality.
   */
  async swapToolSlots(playerId: string): Promise<{ success: boolean; error?: string }> {
    const inventory = this.inventories.get(playerId);
    if (!inventory) return { success: false, error: 'Inventory not loaded' };

    // Swap tool <-> accessory1 in memory
    const mainTool = inventory.equipment.tool;
    const secondaryTool = inventory.equipment.accessory1;
    inventory.equipment.tool = secondaryTool;
    inventory.equipment.accessory1 = mainTool;

    // Persist to database
    const db = this.databaseService.getClient();
    await updateInventoryFull(db, playerId, {
      items: inventory.items,
      equipment: inventory.equipment,
    });

    return { success: true };
  }

  /**
   * Unequip a specific module by instanceId from the modules array back to inventory.
   * Checks that inventory has room before moving.
   */
  async unequipModule(
    playerId: string,
    moduleInstanceId: string,
    inventoryCount: number,
    maxSlots: number
  ): Promise<{ success: boolean; reason?: string }> {
    const inventory = this.inventories.get(playerId);
    if (!inventory) {
      return { success: false, reason: 'Player inventory not loaded' };
    }

    if (inventoryCount >= maxSlots) {
      return { success: false, reason: 'Inventory full' };
    }

    const moduleIdx = inventory.equipment.modules.findIndex(
      (m) => m.instanceId === moduleInstanceId
    );
    if (moduleIdx === -1) {
      return { success: false, reason: 'Module not found in equipment' };
    }

    const [module] = inventory.equipment.modules.splice(moduleIdx, 1);
    inventory.items.push(module);

    // Single atomic DB write
    const db = this.databaseService.getClient();
    await updateInventoryFull(db, playerId, {
      items: inventory.items,
      equipment: inventory.equipment,
    });

    return { success: true };
  }
}
