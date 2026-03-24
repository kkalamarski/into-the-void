import { Injectable } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { GameService } from '../game.service';
import { PlayerService } from '../player.service';
import { InventoryService } from '../inventory.service';
import { StorageService } from '../storage.service';
import { EntityService } from '../entity.service';
import { HazardService } from '../hazard.service';
import {
  ClientEvents,
  CharStatsPayload,
  CharacterStats,
} from '@into-the-void/shared-types';
import { computeCharStats } from '@into-the-void/game-logic';
import { EquipmentJson } from '@into-the-void/database';

@Injectable()
export class InventoryHandler {
  private server!: Server;

  constructor(
    private readonly gameService: GameService,
    private readonly playerService: PlayerService,
    private readonly inventoryService: InventoryService,
    private readonly storageService: StorageService,
    private readonly entityService: EntityService,
    private readonly hazardService: HazardService,
  ) {}

  setServer(server: Server): void {
    this.server = server;
  }

  async handleInteract(
    client: Socket,
    data: ClientEvents['player:interact'],
  ): Promise<void> {
    try {
      const result = await this.gameService.handleInteraction(
        client.id,
        data.targetId
      );

      if (result.success) {
        // Broadcast interaction result
        if (result.zoneId) {
          this.server.to(result.zoneId).emit('entity:update', {
            entityId: data.targetId,
            changes: result.entityChanges,
          });
        }
        // If interaction returned inventory (e.g., item pickup), emit private update
        if (result.inventory) {
          client.emit('inventory:update', result.inventory);
          // If interaction was an item pickup, stats may have changed
          const interactPlayer = this.playerService.getPlayerBySocket(client.id);
          if (interactPlayer) {
            this.emitStats(client, interactPlayer.id);
          }
        }
      } else {
        client.emit('error', {
          code: 'INVALID_TARGET',
          message: result.error || 'Cannot interact with target',
        });
      }
    } catch (error) {
      client.emit('error', {
        code: 'SERVER_ERROR',
        message: 'Failed to process interaction',
      });
    }
  }

  async handleInventoryPickup(
    client: Socket,
    data: ClientEvents['inventory:pickup'],
  ): Promise<void> {
    try {
      const player = this.playerService.getPlayerBySocket(client.id);
      if (!player) return;

      const result = await this.gameService.handleItemPickup(client.id, data.entityId);

      if (result.success) {
        // Zone-wide: entity is gone for everyone
        if (result.zoneId) {
          this.server.to(result.zoneId).emit('entity:despawn', { entityId: data.entityId });
        }
        // PRIVATE: only the picking-up player receives inventory update
        if (result.inventory) {
          client.emit('inventory:update', result.inventory);
        }
      } else {
        client.emit('error', {
          code: 'INVALID_TARGET',
          message: result.error || 'Cannot pick up item',
        });
      }
    } catch (error) {
      client.emit('error', {
        code: 'SERVER_ERROR',
        message: 'Failed to process pickup',
      });
    }
  }

  async handleInventoryDrop(
    client: Socket,
    data: ClientEvents['inventory:drop'],
  ): Promise<void> {
    try {
      const player = this.playerService.getPlayerBySocket(client.id);
      if (!player) return;

      const result = await this.gameService.handleItemDrop(client.id, data.instanceId, data.quantity);

      if (result.success) {
        // Zone-wide: new ground item spawned
        if (result.zoneId && result.groundItem) {
          this.server.to(result.zoneId).emit('entity:spawn', result.groundItem);
        }
        // PRIVATE: updated inventory
        if (result.inventory) {
          client.emit('inventory:update', result.inventory);
        }
      } else {
        client.emit('error', {
          code: 'INVALID_ACTION',
          message: result.error || 'Cannot drop item',
        });
      }
    } catch (error) {
      client.emit('error', {
        code: 'SERVER_ERROR',
        message: 'Failed to process drop',
      });
    }
  }

  async handleInventoryUse(
    client: Socket,
    data: ClientEvents['inventory:use'],
  ): Promise<void> {
    try {
      const player = this.playerService.getPlayerBySocket(client.id);
      if (!player) return;

      const result = await this.gameService.handleItemUse(client.id, data.instanceId);

      if (result.success) {
        // PRIVATE: updated inventory and effects
        if (result.inventory) {
          client.emit('inventory:update', result.inventory);
        }
      } else {
        client.emit('error', {
          code: 'INVALID_ACTION',
          message: result.error || 'Cannot use item',
        });
      }
    } catch (error) {
      client.emit('error', {
        code: 'SERVER_ERROR',
        message: 'Failed to use item',
      });
    }
  }

  async handleEquipmentChange(
    client: Socket,
    data: { instanceId: string },
  ): Promise<void> {
    try {
      const player = this.playerService.getPlayerBySocket(client.id);
      if (!player) return;

      const result = await this.gameService.handleEquip(client.id, data.instanceId);

      if (result.success) {
        if (result.inventory) {
          client.emit('inventory:update', result.inventory);
          this.emitStats(client, player.id);
          this.hazardService.onPlayerEquipmentChanged(player.id);
        }
      } else {
        client.emit('error', {
          code: 'INVALID_ACTION',
          message: result.error || 'Cannot equip item',
        });
      }
    } catch (error) {
      client.emit('error', {
        code: 'SERVER_ERROR',
        message: 'Failed to equip item',
      });
    }
  }

  async handleInventoryUnequip(
    client: Socket,
    data: { instanceId: string },
  ): Promise<void> {
    try {
      const player = this.playerService.getPlayerBySocket(client.id);
      if (!player) return;

      const result = await this.gameService.handleUnequip(client.id, data.instanceId);

      if (result.success) {
        if (result.inventory) {
          client.emit('inventory:update', result.inventory);
          this.emitStats(client, player.id);
          this.hazardService.onPlayerEquipmentChanged(player.id);
        }
      } else {
        client.emit('error', {
          code: 'INVALID_ACTION',
          message: result.error || 'Cannot unequip item',
        });
      }
    } catch (error) {
      client.emit('error', {
        code: 'SERVER_ERROR',
        message: 'Failed to unequip item',
      });
    }
  }

  async handleToolSwap(client: Socket): Promise<void> {
    try {
      const player = this.playerService.getPlayerBySocket(client.id);
      if (!player) return;

      const result = await this.gameService.handleToolSwap(client.id);

      if (result.success) {
        if (result.inventory) {
          client.emit('inventory:update', result.inventory);
          this.emitStats(client, player.id);
        }
      } else {
        client.emit('error', {
          code: 'INVALID_ACTION',
          message: result.error || 'Cannot swap tools',
        });
      }
    } catch (error) {
      client.emit('error', {
        code: 'SERVER_ERROR',
        message: 'Failed to swap tools',
      });
    }
  }

  async handleInventoryReorder(
    client: Socket,
    data: ClientEvents['inventory:reorder'],
  ): Promise<void> {
    const player = this.playerService.getPlayerBySocket(client.id);
    if (!player) return;

    await this.inventoryService.moveSlot(
      player.id,
      data.fromSlot,
      data.toSlot
    );

    // Always emit inventory:update to clear client pendingReorder
    const inventory = this.inventoryService.getInventory(player.id);
    if (inventory) {
      client.emit('inventory:update', inventory);
    }
  }

  async handleStorageOpen(client: Socket): Promise<void> {
    const player = this.playerService.getPlayerBySocket(client.id);
    if (!player) return;

    const storage = await this.storageService.loadForPlayer(player.id);
    client.emit('storage:update', storage);
  }

  async handleToolUse(
    client: Socket,
    payload: { targetEntityId: string },
  ): Promise<void> {
    try {
      const result = await this.entityService.handleToolUse(client.id, payload.targetEntityId);
      if (!result.success) {
        client.emit('error', { code: 'TOOL_USE_FAILED', message: result.error });
        return;
      }

      // Emit entity update to zone
      if (result.entityChanges && result.zoneId) {
        const player = this.playerService.getPlayerBySocket(client.id);
        if (player) {
          this.server.to(result.zoneId).emit('entity:update', {
            entityId: payload.targetEntityId,
            changes: result.entityChanges,
          });
        }
      }

      // Emit ground item spawns to zone
      if (result.groundItems && result.zoneId) {
        for (const item of result.groundItems) {
          this.server.to(result.zoneId).emit('entity:spawn', item);
        }
      }
    } catch (error) {
      client.emit('error', {
        code: 'SERVER_ERROR',
        message: 'Failed to process tool use',
      });
    }
  }

  /**
   * Compute and emit character stats to the requesting client.
   * Called after auth and after every equipment mutation.
   */
  emitStats(client: Socket, playerId: string): void {
    const inventory = this.inventoryService.getInventory(playerId);
    const player = this.playerService.getPlayerById(playerId);
    if (!inventory || !player) return;

    const emptyEquipment: EquipmentJson = { modules: [] };
    const playerEquipment = inventory.equipment as EquipmentJson;

    // Base stats: level-scaled with empty equipment
    const base = computeCharStats(player.level, emptyEquipment, 'player');

    // Total effective stats: DR-capped (base + equipment + DR)
    const total = computeCharStats(player.level, playerEquipment, 'player');

    // Raw total stats: uncapped (base + equipment, no DR) — for client DR display
    const raw = computeCharStats(player.level, playerEquipment, 'player', [], { skipDR: true });

    // Equipment contribution: raw delta (uncapped) for breakdown display
    const equipment: CharacterStats = {
      durability: raw.durability - base.durability,
      toughness: raw.toughness - base.toughness,
      power: raw.power - base.power,
      haste: raw.haste - base.haste,
      vigor: raw.vigor - base.vigor,
      recovery: raw.recovery - base.recovery,
      perception: raw.perception - base.perception,
      resilience: raw.resilience - base.resilience,
    };

    const payload: CharStatsPayload = { level: player.level, total, base, equipment, raw };
    client.emit('stats:update', payload);

    // Update player's maxHealth based on durability stat
    // Durability directly translates to max health
    const newMaxHealth = total.durability;
    if (player.maxHealth !== newMaxHealth) {
      this.playerService.updateMaxHealth(playerId, newMaxHealth);
      // If current health exceeds new max, cap it
      if (player.health > newMaxHealth) {
        this.playerService.updateHealth(playerId, newMaxHealth);
      }
      // Emit health update to client
      client.emit('player:health', {
        playerId,
        health: Math.min(player.health, newMaxHealth),
        maxHealth: newMaxHealth,
      });
    }
  }
}
