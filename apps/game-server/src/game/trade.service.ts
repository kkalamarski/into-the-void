import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { InventoryService } from './inventory.service';
import { PlayerService } from './player.service';
import { NpcRegistry, TraderDefinition } from '@into-the-void/npcs';
import { ItemRegistry } from '@into-the-void/items';
import { deductCredits, addCredits, InventoryItemJson } from '@into-the-void/database';

interface TradeResult {
  success: boolean;
  newBalance?: number;
  error?: string;
}

@Injectable()
export class TradeService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly inventoryService: InventoryService,
    private readonly playerService: PlayerService,
  ) {}

  /**
   * Buy an item from a trader NPC.
   * Validates: NPC is trader, item in inventory, player has credits, inventory space.
   * CRITICAL: If addItem fails after credit deduction, refund credits to prevent loss.
   */
  async buy(
    playerId: string,
    npcId: string,
    itemId: string,
    quantity: number,
  ): Promise<TradeResult> {
    // Validate NPC is a trader
    const npcDef = NpcRegistry.get(npcId);
    if (npcDef.npcType !== 'trader') {
      return { success: false, error: 'NPC is not a trader' };
    }

    const trader = npcDef as TraderDefinition;
    const tradeItem = trader.inventory.find(i => i.itemId === itemId);
    if (!tradeItem) {
      return { success: false, error: 'Item not available from this trader' };
    }

    // Check stock (-1 = unlimited)
    if (tradeItem.stock !== -1 && tradeItem.stock < quantity) {
      return { success: false, error: 'Insufficient stock' };
    }

    // Calculate total cost
    const totalCost = tradeItem.buyPrice * quantity;

    // Check inventory space (pre-check, but addItem is authoritative)
    const inventory = this.inventoryService.getInventory(playerId);
    if (!inventory) {
      return { success: false, error: 'Inventory not loaded' };
    }

    if (inventory.items.length >= inventory.maxSlots) {
      return { success: false, error: 'Inventory full' };
    }

    // Validate item exists in ItemRegistry
    const itemDef = ItemRegistry.get(itemId);
    if (!itemDef || itemDef.id === 'unknown') {
      return { success: false, error: 'Unknown item' };
    }

    // Deduct credits atomically
    const db = this.databaseService.getClient();
    const deductResult = await deductCredits(db, playerId, totalCost);
    if (!deductResult.success) {
      return { success: false, error: deductResult.error ?? 'Insufficient credits' };
    }

    // Add item to inventory
    const newItem: InventoryItemJson = {
      instanceId: crypto.randomUUID(),
      itemId: itemId,
      quantity: quantity,
      slot: this.findFirstEmptySlot(inventory.items, inventory.maxSlots),
      properties: {},
    };

    const addResult = await this.inventoryService.addItem(playerId, newItem);

    // CRITICAL: If addItem fails, refund credits to prevent permanent loss
    if (!addResult.success) {
      // Refund the deducted credits
      const refundResult = await addCredits(db, playerId, totalCost);

      // Update player's cached credits with refunded amount
      const player = this.playerService.getPlayerById(playerId);
      if (player && refundResult.newBalance !== undefined) {
        player.credits = refundResult.newBalance;
      }

      return {
        success: false,
        error: addResult.reason ?? 'Failed to add item to inventory',
        newBalance: refundResult.newBalance,
      };
    }

    // Update player's cached credits
    const player = this.playerService.getPlayerById(playerId);
    if (player && deductResult.newBalance !== undefined) {
      player.credits = deductResult.newBalance;
    }

    return { success: true, newBalance: deductResult.newBalance };
  }

  /**
   * Sell an item to a trader NPC.
   * Validates: NPC is trader, item in player inventory.
   * Any item can be sold - traders have specific prices for known items,
   * otherwise uses item's baseValue at 50% (junk price).
   */
  async sell(
    playerId: string,
    npcId: string,
    itemInstanceId: string,
    quantity: number,
  ): Promise<TradeResult> {
    // Validate NPC is a trader
    const npcDef = NpcRegistry.get(npcId);
    if (npcDef.npcType !== 'trader') {
      return { success: false, error: 'NPC is not a trader' };
    }

    const trader = npcDef as TraderDefinition;

    // Get item from inventory
    const inventory = this.inventoryService.getInventory(playerId);
    if (!inventory) {
      return { success: false, error: 'Inventory not loaded' };
    }

    const item = inventory.items.find(i => i.instanceId === itemInstanceId);
    if (!item) {
      return { success: false, error: 'Item not in inventory' };
    }

    // Get item definition for fallback pricing
    const itemDef = ItemRegistry.get(item.itemId);
    if (!itemDef || itemDef.id === 'unknown') {
      return { success: false, error: 'Unknown item' };
    }

    // GUARD: Prevent selling quest items
    if (item.properties?.isQuestItem === true) {
      return { success: false, error: 'Quest items cannot be sold' };
    }

    // Find sell price from trader's inventory (traders buy at sellPrice)
    // If not in trader's specific inventory, use item's baseValue at 50%
    const tradeItem = trader.inventory.find(i => i.itemId === item.itemId);
    const sellPrice = tradeItem?.sellPrice ?? Math.max(1, Math.floor(itemDef.baseValue * 0.5));
    const totalValue = sellPrice * quantity;

    // Remove item from inventory
    const removeResult = await this.inventoryService.removeItem(playerId, itemInstanceId);
    if (!removeResult.success) {
      return { success: false, error: removeResult.reason ?? 'Failed to remove item' };
    }

    // Add credits
    const db = this.databaseService.getClient();
    const addResult = await addCredits(db, playerId, totalValue);

    // Update player's cached credits
    const player = this.playerService.getPlayerById(playerId);
    if (player && addResult.newBalance !== undefined) {
      player.credits = addResult.newBalance;
    }

    return { success: true, newBalance: addResult.newBalance };
  }

  private findFirstEmptySlot(items: Array<{ slot: number }>, maxSlots: number): number {
    const usedSlots = new Set(items.map(i => i.slot));
    for (let i = 0; i < maxSlots; i++) {
      if (!usedSlots.has(i)) return i;
    }
    return items.length; // Fallback
  }
}
