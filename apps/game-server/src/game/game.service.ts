import { Injectable } from '@nestjs/common';
import { PlayerService } from './player.service';
import { ZonesService } from '../zones/zones.service';
import { InventoryService } from './inventory.service';
import { EntityService } from './entity.service';
import {
  Direction,
  Position,
  ZoneState,
  PlayerPublic,
  Entity,
  ItemEntity,
} from '@into-the-void/shared-types';
import {
  calculateNewPosition,
  validateMovement,
  isZoneTransition,
  validateItemUse,
  resolveEffectsForTrigger,
  validateEquip,
  validateUnequip,
  effectiveStats,
  type ComputedStats,
} from '@into-the-void/game-logic';
import { ItemRegistry } from '@into-the-void/items';
import type { Inventory, InventoryItemJson, EquipmentJson } from '@into-the-void/database';
import { getBiome, BiomeGenerator, getHubConfig } from '@into-the-void/world-gen';
import { isHubZone } from '@into-the-void/shared-types';

interface MoveResult {
  success: boolean;
  error?: string;
  playerId?: string;
  position?: Position;
  zoneId?: string;
  oldZoneId?: string;
  newZoneId?: string;
  playerPublic?: PlayerPublic;
}

interface InteractionResult {
  success: boolean;
  error?: string;
  zoneId?: string;
  entityChanges?: Partial<Entity>;
  inventory?: Inventory;
}

interface PickupResult {
  success: boolean;
  error?: string;
  zoneId?: string;
  inventory?: Inventory;
}

interface DropResult {
  success: boolean;
  error?: string;
  zoneId?: string;
  groundItem?: ItemEntity;
  inventory?: Inventory;
}

interface UseResult {
  success: boolean;
  error?: string;
  inventory?: Inventory;
  effects?: { type: string; applied: Record<string, number> }[];
}

interface EquipResult {
  success: boolean;
  error?: string;
  inventory?: Inventory & { stats?: ComputedStats };
}

@Injectable()
export class GameService {
  constructor(
    private readonly playerService: PlayerService,
    private readonly zonesService: ZonesService,
    private readonly inventoryService: InventoryService,
    private readonly entityService: EntityService,
  ) {}

  async getZoneState(zoneId: string): Promise<ZoneState> {
    // Hub zones don't use coordinate-based biome/fertility — use static config.
    // This early return must come BEFORE the coordinate parsing that would produce
    // NaN values for hub zone IDs like 'hub_verdant'.
    if (isHubZone(zoneId)) {
      const hubConfig = getHubConfig(zoneId);
      const entities = await this.zonesService.getZoneEntities(zoneId);
      const players = this.playerService.getPlayersInZone(zoneId);
      const chunk = await this.zonesService.getChunk(zoneId);

      return {
        zoneId,
        entities,
        players,
        lastUpdate: Date.now(),
        chunk,
        biome: hubConfig?.biome ?? 'void_plains',
        fertilityType: hubConfig?.fertilityType ?? 'Normal',
        zoneType: 'hub',
      };
    }

    // Existing open-world zone logic
    const entities = await this.zonesService.getZoneEntities(zoneId);
    const players = this.playerService.getPlayersInZone(zoneId);
    const chunk = await this.zonesService.getChunk(zoneId);

    // Parse zone coordinates and get biome
    const parts = zoneId.split('_');
    const x = parseInt(parts[1], 10);
    const y = parseInt(parts[2], 10);
    const biome = getBiome(this.zonesService.getWorldSeed(), x, y);

    // Compute fertility at chunk center
    const biomeGenerator = new BiomeGenerator(this.zonesService.getWorldSeed());
    const centerX = x * 64 + 32; // ZONE_SIZE = 64, center = ZONE_SIZE/2
    const centerY = y * 64 + 32;
    const fertilityType = biomeGenerator.getFertilityAt(centerX, centerY);

    return {
      zoneId,
      entities,
      players,
      lastUpdate: Date.now(),
      chunk,
      biome,
      fertilityType,
    };
  }

  async movePlayer(socketId: string, direction: Direction): Promise<MoveResult> {
    const player = this.playerService.getPlayerBySocket(socketId);
    if (!player) {
      return { success: false, error: 'Player not found' };
    }

    // Calculate new position
    const newPosition = calculateNewPosition(player.position, direction);

    // Get collision map for zone
    const chunk = await this.zonesService.getChunk(newPosition.zoneId);

    // Validate movement
    const validation = validateMovement(
      player.position,
      newPosition,
      chunk.collisions
    );

    if (!validation.valid) {
      return { success: false, error: validation.reason };
    }

    // Entity blocking check (EBLK-01)
    const entitiesAtDest = await this.zonesService.getEntitiesAtPosition(
      newPosition.zoneId,
      newPosition.x,
      newPosition.y
    );
    if (entitiesAtDest.length > 0) {
      return { success: false, error: 'Path blocked by entity' };
    }

    // Check for zone transition
    const zoneChanged = isZoneTransition(player.position, newPosition);

    // Update player position
    const oldZoneId = player.position.zoneId;
    this.playerService.updatePosition(player.id, newPosition);

    if (zoneChanged) {
      return {
        success: true,
        playerId: player.id,
        position: newPosition,
        oldZoneId,
        newZoneId: newPosition.zoneId,
        playerPublic: {
          id: player.id,
          name: player.name,
          faction: player.faction,
          position: newPosition,
          level: player.level,
          inCombat: player.inCombat,
          credits: player.credits,
        },
      };
    }

    return {
      success: true,
      playerId: player.id,
      position: newPosition,
      zoneId: newPosition.zoneId,
    };
  }

  async handleInteraction(
    socketId: string,
    targetId: string
  ): Promise<InteractionResult> {
    const player = this.playerService.getPlayerBySocket(socketId);
    if (!player) {
      return { success: false, error: 'Player not found' };
    }

    const entity = await this.zonesService.getEntity(
      player.position.zoneId,
      targetId
    );
    if (!entity) {
      return { success: false, error: 'Entity not found' };
    }

    // Basic interaction handling - extend based on entity type
    switch (entity.type) {
      case 'mineral':
        // Handle harvesting
        return {
          success: true,
          zoneId: player.position.zoneId,
          entityChanges: { active: false },
        };

      case 'item': {
        // Route to proper pickup handler (writes to inventory before despawn)
        const pickupResult = await this.handleItemPickup(socketId, targetId);
        if (pickupResult.success) {
          return {
            success: true,
            zoneId: player.position.zoneId,
            entityChanges: { active: false },
            inventory: pickupResult.inventory,
          };
        } else {
          return { success: false, error: pickupResult.error };
        }
      }

      case 'creature':
        // Initiate combat (simplified)
        this.playerService.setInCombat(player.id, true);
        return {
          success: true,
          zoneId: player.position.zoneId,
        };

      default:
        return { success: false, error: 'Cannot interact with this entity' };
    }
  }

  async handleItemPickup(socketId: string, entityId: string): Promise<PickupResult> {
    const player = this.playerService.getPlayerBySocket(socketId);
    if (!player) return { success: false, error: 'Player not found' };

    // CRITICAL: Claim BEFORE any await (synchronous check-and-set)
    const claimed = this.zonesService.claimEntity(entityId, player.id);
    if (!claimed) {
      return { success: false, error: 'Item already being picked up' };
    }

    try {
      const entity = await this.zonesService.getEntity(player.position.zoneId, entityId);
      if (!entity || entity.type !== 'item' || !entity.active) {
        this.zonesService.releaseClaim(entityId);
        return { success: false, error: 'Item not found' };
      }

      // Create inventory item from entity
      const itemEntity = entity as ItemEntity;
      const newItem: InventoryItemJson = {
        instanceId: crypto.randomUUID(), // New instance ID on pickup
        itemId: itemEntity.itemId,
        quantity: itemEntity.quantity,
        slot: -1, // Will be assigned on client
        properties: {},
      };

      const addResult = await this.inventoryService.addItem(player.id, newItem);
      if (!addResult.success) {
        this.zonesService.releaseClaim(entityId);
        return { success: false, error: addResult.reason };
      }

      // Mark entity inactive AFTER inventory write succeeds
      await this.zonesService.despawnEntity(player.position.zoneId, entityId);

      // Remove from ground_items DB
      await this.entityService.removeGroundItem(entityId);

      this.zonesService.releaseClaim(entityId);

      return {
        success: true,
        zoneId: player.position.zoneId,
        inventory: this.inventoryService.getInventory(player.id),
      };
    } catch (error) {
      this.zonesService.releaseClaim(entityId);
      throw error;
    }
  }

  async handleItemDrop(socketId: string, instanceId: string, quantity: number): Promise<DropResult> {
    const player = this.playerService.getPlayerBySocket(socketId);
    if (!player) return { success: false, error: 'Player not found' };

    if (quantity <= 0) {
      return { success: false, error: 'Invalid quantity' };
    }

    const removeResult = await this.inventoryService.removeItem(player.id, instanceId);
    if (!removeResult.success) {
      return { success: false, error: removeResult.reason };
    }

    const removedItem = removeResult.removedItem!;
    const itemDef = ItemRegistry.get(removedItem.itemId);

    // Spawn ground item entity
    const groundItem: ItemEntity = {
      id: `item_${crypto.randomUUID()}`,
      type: 'item',
      name: itemDef?.displayName || removedItem.itemId,
      position: { ...player.position },
      active: true,
      itemId: removedItem.itemId,
      quantity: removedItem.quantity,
      despawnAt: Date.now() + 5 * 60 * 1000, // 5 minutes
    };

    await this.zonesService.spawnEntity(player.position.zoneId, groundItem);

    // Persist to ground_items DB for survival across zone eviction/restart
    await this.entityService.persistGroundItem(groundItem);

    return {
      success: true,
      zoneId: player.position.zoneId,
      groundItem,
      inventory: this.inventoryService.getInventory(player.id),
    };
  }

  async handleItemUse(socketId: string, instanceId: string): Promise<UseResult> {
    const player = this.playerService.getPlayerBySocket(socketId);
    if (!player) return { success: false, error: 'Player not found' };

    const inventory = this.inventoryService.getInventory(player.id);
    if (!inventory) return { success: false, error: 'Inventory not loaded' };

    const item = inventory.items.find(i => i.instanceId === instanceId);
    if (!item) return { success: false, error: 'Item not found in inventory' };

    const itemDef = ItemRegistry.get(item.itemId);
    if (!itemDef) return { success: false, error: 'Unknown item type' };

    // Validate item use
    const validation = validateItemUse(itemDef, player.level);
    if (!validation.valid) {
      return { success: false, error: validation.reason };
    }

    // Resolve on_use effects
    const effects = resolveEffectsForTrigger(itemDef.effects, 'on_use');

    // Apply effects to player (basic implementation - extend as needed)
    for (const effect of effects) {
      if (effect.applied.health) {
        // Apply heal - clamp to maxHealth
        player.health = Math.min(player.health + effect.applied.health, player.maxHealth);
      }
      if (effect.applied.energy) {
        player.energy = Math.min(player.energy + effect.applied.energy, player.maxEnergy);
      }
      // Note: stat_buff with duration tracked separately (future work)
    }

    // Remove consumed item
    await this.inventoryService.removeItem(player.id, instanceId);

    return {
      success: true,
      inventory: this.inventoryService.getInventory(player.id),
      effects,
    };
  }

  async handleEquip(socketId: string, instanceId: string): Promise<EquipResult> {
    const player = this.playerService.getPlayerBySocket(socketId);
    if (!player) return { success: false, error: 'Player not found' };

    const inventory = this.inventoryService.getInventory(player.id);
    if (!inventory) return { success: false, error: 'Inventory not loaded' };

    const item = inventory.items.find(i => i.instanceId === instanceId);
    if (!item) return { success: false, error: 'Item not found in inventory' };

    const itemDef = ItemRegistry.get(item.itemId);
    if (!itemDef) return { success: false, error: 'Unknown item type' };

    // Determine module slot count from equipped suit
    const suitModuleSlots = inventory.equipment.exosuit
      ? ItemRegistry.get(inventory.equipment.exosuit.itemId)?.moduleSlots || 0
      : 0;

    const validation = validateEquip(itemDef, player.level, inventory.equipment.modules.length, suitModuleSlots);
    if (!validation.valid) {
      return { success: false, error: validation.reason };
    }

    // Equip based on category
    let result;
    if (itemDef.category === 'module') {
      result = await this.inventoryService.equipModule(player.id, instanceId, suitModuleSlots);
    } else if (itemDef.category === 'suit') {
      result = await this.inventoryService.equipItem(player.id, instanceId, 'exosuit');
    } else if (itemDef.category === 'tool') {
      result = await this.inventoryService.equipItem(player.id, instanceId, 'tool');
    } else {
      return { success: false, error: 'Item cannot be equipped' };
    }

    if (!result.success) {
      return { success: false, error: result.reason };
    }

    const updatedInventory = this.inventoryService.getInventory(player.id);
    if (!updatedInventory) return { success: false, error: 'Failed to get inventory' };
    const stats = effectiveStats(updatedInventory.equipment as EquipmentJson);
    return {
      success: true,
      inventory: { ...updatedInventory, stats },
    };
  }

  async handleUnequip(socketId: string, instanceId: string): Promise<EquipResult> {
    const player = this.playerService.getPlayerBySocket(socketId);
    if (!player) return { success: false, error: 'Player not found' };

    const inventory = this.inventoryService.getInventory(player.id);
    if (!inventory) return { success: false, error: 'Inventory not loaded' };

    // Check inventory space
    const validation = validateUnequip(inventory.items.length, inventory.maxSlots);
    if (!validation.valid) {
      return { success: false, error: validation.reason };
    }

    // Find which slot has this instanceId
    if (inventory.equipment.exosuit?.instanceId === instanceId) {
      // Guard: Cannot unequip suit while modules are equipped
      if (inventory.equipment.modules.length > 0) {
        return { success: false, error: 'Remove all modules before unequipping suit' };
      }
      const result = await this.inventoryService.unequipItem(player.id, 'exosuit', inventory.items.length, inventory.maxSlots);
      if (!result.success) return { success: false, error: result.reason };
    } else if (inventory.equipment.tool?.instanceId === instanceId) {
      const result = await this.inventoryService.unequipItem(player.id, 'tool', inventory.items.length, inventory.maxSlots);
      if (!result.success) return { success: false, error: result.reason };
    } else if (inventory.equipment.accessory1?.instanceId === instanceId) {
      const result = await this.inventoryService.unequipItem(player.id, 'accessory1', inventory.items.length, inventory.maxSlots);
      if (!result.success) return { success: false, error: result.reason };
    } else if (inventory.equipment.accessory2?.instanceId === instanceId) {
      const result = await this.inventoryService.unequipItem(player.id, 'accessory2', inventory.items.length, inventory.maxSlots);
      if (!result.success) return { success: false, error: result.reason };
    } else {
      // Check modules
      const moduleIndex = inventory.equipment.modules.findIndex(m => m.instanceId === instanceId);
      if (moduleIndex !== -1) {
        const result = await this.inventoryService.unequipModule(player.id, instanceId, inventory.items.length, inventory.maxSlots);
        if (!result.success) return { success: false, error: result.reason };
      } else {
        return { success: false, error: 'Item not found in equipment' };
      }
    }

    const updatedInventory = this.inventoryService.getInventory(player.id);
    if (!updatedInventory) return { success: false, error: 'Failed to get inventory' };
    const stats = effectiveStats(updatedInventory.equipment as EquipmentJson);
    return {
      success: true,
      inventory: { ...updatedInventory, stats },
    };
  }

  async handleToolSwap(socketId: string): Promise<EquipResult> {
    const player = this.playerService.getPlayerBySocket(socketId);
    if (!player) return { success: false, error: 'Player not found' };

    const inventory = this.inventoryService.getInventory(player.id);
    if (!inventory) return { success: false, error: 'Inventory not loaded' };

    // Delegate swap to InventoryService (which has DatabaseService)
    const result = await this.inventoryService.swapToolSlots(player.id);
    if (!result.success) return { success: false, error: result.error };

    // Get updated inventory and compute stats
    const updatedInventory = this.inventoryService.getInventory(player.id);
    if (!updatedInventory) return { success: false, error: 'Failed to get inventory' };
    const stats = effectiveStats(updatedInventory.equipment as EquipmentJson);

    return {
      success: true,
      inventory: { ...updatedInventory, stats },
    };
  }
}
