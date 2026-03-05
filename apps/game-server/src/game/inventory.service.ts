import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  getInventory,
  createInventory,
  updateInventoryFull,
  updateInventoryItems,
  Inventory,
  InventoryItemJson,
  EquipmentJson,
} from '@into-the-void/database';
import { ItemRegistry } from '@into-the-void/items';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class InventoryService {
  private inventories: Map<string, Inventory> = new Map();

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

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
   * Handles stacking: if the item is stackable and an existing stack has room, adds to it.
   * Otherwise creates a new stack in an empty slot.
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

    // Check if item is stackable
    const itemDef = ItemRegistry.get(item.itemId);
    const maxStack = itemDef?.maxStack ?? 1;
    let remainingQty = item.quantity;

    // Try to stack with existing items first
    if (maxStack > 1) {
      for (const existingItem of inventory.items) {
        if (existingItem.itemId === item.itemId && remainingQty > 0) {
          const canAdd = maxStack - existingItem.quantity;
          if (canAdd > 0) {
            const toAdd = Math.min(canAdd, remainingQty);
            existingItem.quantity += toAdd;
            remainingQty -= toAdd;
          }
        }
      }
    }

    // If all items were stacked, we're done
    if (remainingQty <= 0) {
      const db = this.databaseService.getClient();
      await updateInventoryItems(db, playerId, inventory.items);

      // Emit collection event for quest tracking
      this.eventEmitter.emit('item.collected', {
        characterId: playerId,
        itemId: item.itemId,
        quantity: item.quantity,
      });

      return { success: true };
    }

    // Need to create new stack(s) for remaining items
    if (inventory.items.length >= inventory.maxSlots) {
      // Partial success - some items were stacked but inventory full for rest
      if (remainingQty < item.quantity) {
        const db = this.databaseService.getClient();
        await updateInventoryItems(db, playerId, inventory.items);
        return { success: false, reason: 'Inventory full (partial stack added)' };
      }
      return { success: false, reason: 'Inventory full' };
    }

    // Find first available slot (0 to maxSlots-1)
    const usedSlots = new Set(inventory.items.map(i => i.slot));
    let freeSlot = -1;
    for (let i = 0; i < inventory.maxSlots; i++) {
      if (!usedSlots.has(i)) {
        freeSlot = i;
        break;
      }
    }

    // Create new stack with remaining quantity
    const newItem: InventoryItemJson = {
      ...item,
      quantity: remainingQty,
      slot: freeSlot,
    };
    inventory.items.push(newItem);

    // Persist items change to DB
    const db = this.databaseService.getClient();
    await updateInventoryItems(db, playerId, inventory.items);

    // Emit collection event for quest tracking
    this.eventEmitter.emit('item.collected', {
      characterId: playerId,
      itemId: item.itemId,
      quantity: item.quantity,
    });

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

    const item = inventory.items[idx];

    // GUARD: Prevent removing quest items
    if (item.properties?.isQuestItem === true) {
      return { success: false, reason: 'Quest items cannot be dropped' };
    }

    const [removedItem] = inventory.items.splice(idx, 1);

    const db = this.databaseService.getClient();
    await updateInventoryItems(db, playerId, inventory.items);

    return { success: true, removedItem };
  }

  /**
   * Reduce the quantity of a stackable item.
   * Used for partial sells/trades.
   */
  async reduceItemQuantity(
    playerId: string,
    instanceId: string,
    amount: number
  ): Promise<{ success: boolean; reason?: string }> {
    const inventory = this.inventories.get(playerId);
    if (!inventory) {
      return { success: false, reason: 'Player inventory not loaded' };
    }

    const item = inventory.items.find((i) => i.instanceId === instanceId);
    if (!item) {
      return { success: false, reason: 'Item not found in inventory' };
    }

    if (amount >= item.quantity) {
      return { success: false, reason: 'Use removeItem for full stack removal' };
    }

    item.quantity -= amount;

    const db = this.databaseService.getClient();
    await updateInventoryItems(db, playerId, inventory.items);

    return { success: true };
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

    // If slot was occupied, return existing item to inventory with the freed slot
    if (currentEquipped) {
      inventory.items.push({ ...currentEquipped, slot: item.slot });
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

    // Find first empty slot in inventory
    const targetSlot = this.findEmptySlot(inventory.items, maxSlots);

    // Move from equipment slot to items with proper slot assignment
    (inventory.equipment as unknown as Record<string, InventoryItemJson | undefined>)[slot] = undefined;
    inventory.items.push({ ...equipped, slot: targetSlot });

    // Single atomic DB write
    const db = this.databaseService.getClient();
    await updateInventoryFull(db, playerId, {
      items: inventory.items,
      equipment: inventory.equipment,
    });

    return { success: true };
  }

  /**
   * Find the first empty slot index in inventory.
   */
  private findEmptySlot(items: InventoryItemJson[], maxSlots: number): number {
    const usedSlots = new Set(items.map(i => i.slot));
    for (let slot = 0; slot < maxSlots; slot++) {
      if (!usedSlots.has(slot)) {
        return slot;
      }
    }
    return 0; // Fallback, shouldn't happen if inventory full check passes
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

    // Find first empty slot in inventory
    const targetSlot = this.findEmptySlot(inventory.items, maxSlots);
    inventory.items.push({ ...module, slot: targetSlot });

    // Single atomic DB write
    const db = this.databaseService.getClient();
    await updateInventoryFull(db, playerId, {
      items: inventory.items,
      equipment: inventory.equipment,
    });

    return { success: true };
  }

  /**
   * Atomically consume multiple ingredients from inventory (CRFT-04).
   * Validates ALL ingredients are present with sufficient quantities BEFORE any mutation.
   * Used by CraftingService for atomic ingredient consumption.
   *
   * @returns success=true if all consumed, success=false with reason if any ingredient missing/insufficient
   */
  async consumeItems(
    playerId: string,
    ingredients: { itemId: string; quantity: number }[]
  ): Promise<{ success: boolean; reason?: string }> {
    const inventory = this.inventories.get(playerId);
    if (!inventory) {
      return { success: false, reason: 'Player inventory not loaded' };
    }

    // Phase 1: VALIDATE all ingredients are present with sufficient quantities
    const availableMap = new Map<string, number>();
    for (const item of inventory.items) {
      const current = availableMap.get(item.itemId) ?? 0;
      availableMap.set(item.itemId, current + item.quantity);
    }

    for (const ingredient of ingredients) {
      const available = availableMap.get(ingredient.itemId) ?? 0;
      if (available < ingredient.quantity) {
        const itemDef = ItemRegistry.get(ingredient.itemId);
        const name = itemDef?.displayName ?? ingredient.itemId;
        return {
          success: false,
          reason: `Insufficient ${name}: need ${ingredient.quantity}, have ${available}`,
        };
      }
    }

    // Phase 2: MUTATE — all validation passed, now consume
    for (const ingredient of ingredients) {
      let remaining = ingredient.quantity;

      for (let i = inventory.items.length - 1; i >= 0 && remaining > 0; i--) {
        const item = inventory.items[i];
        if (item.itemId !== ingredient.itemId) continue;

        if (item.quantity <= remaining) {
          remaining -= item.quantity;
          inventory.items.splice(i, 1);
        } else {
          item.quantity -= remaining;
          remaining = 0;
        }
      }
    }

    // Phase 3: PERSIST — single DB write
    const db = this.databaseService.getClient();
    await updateInventoryItems(db, playerId, inventory.items);

    return { success: true };
  }
}
