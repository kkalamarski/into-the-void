import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { PlayerService } from '../player.service';
import { InventoryService } from '../inventory.service';
import { AbilityService } from '../ability.service';
import { AiService } from '../ai.service';
import { ItemRegistry } from '@into-the-void/items';
import { ZoneHandler } from './ZoneHandler';

@Injectable()
export class CombatHandler {
  private server!: Server;

  constructor(
    private readonly playerService: PlayerService,
    private readonly inventoryService: InventoryService,
    private readonly abilityService: AbilityService,
    private readonly aiService: AiService,
    @Inject(forwardRef(() => ZoneHandler))
    private readonly zoneHandler: ZoneHandler,
  ) {}

  setServer(server: Server): void {
    this.server = server;
    // Propagate to services owned by this handler
    this.abilityService.setServer(server);
  }

  async handleAbilityUse(
    client: Socket,
    data: { abilityId: string; targetEntityId?: string },
  ): Promise<void> {
    console.log(`[ABILITY] ability:use abilityId=${data.abilityId} target=${data.targetEntityId ?? 'none'} socket=${client.id}`);
    const result = await this.abilityService.useAbility(
      client.id,
      data.abilityId,
      data.targetEntityId,
    );
    console.log(`[ABILITY] result: success=${result.success} casting=${result.casting ?? false} error=${result.error ?? 'none'}`);
    // If a cast started, don't emit ability:result yet — completeCast will emit it when done
    if (result.casting) return;

    // Send result to the player who used the ability
    client.emit('ability:result', {
      success: result.success,
      abilityId: data.abilityId,
      error: result.error,
      damage: result.damage,
      targetHealth: result.targetHealth,
      targetMaxHealth: result.targetMaxHealth,
      energyRemaining: result.energyRemaining,
      cooldownEndsAt: result.cooldownEndsAt,
    });

    // If successful, also emit the cooldown event
    if (result.success && result.cooldownEndsAt) {
      client.emit('ability:cooldown', {
        abilityId: data.abilityId,
        cooldownEndsAt: result.cooldownEndsAt,
      });
    }
  }

  handleCastCancel(client: Socket): void {
    const player = this.playerService.getPlayerBySocket(client.id);
    if (!player) return;
    this.abilityService.interruptCast(player.id, 'cancelled');
  }

  async handleRespawnSOS(client: Socket): Promise<void> {
    try {
      const player = this.playerService.getPlayerBySocket(client.id);
      if (!player) return;

      // Validate player is dead
      if (!this.playerService.isDead(player.id)) {
        client.emit('error', { code: 'NOT_DEAD', message: 'You are not in Emergency Lockdown Mode' });
        return;
      }

      // Perform S.O.S. respawn (full health, teleport to faction hub)
      await this.playerService.respawnWithSOS(player.id);

      // Update 3x3 room subscriptions for new zone
      const respawnedPlayer = this.playerService.getPlayerById(player.id);
      if (respawnedPlayer) {
        this.zoneHandler.updatePlayerRooms(client, respawnedPlayer.position.zoneId);

        // Activate AI for the new zone
        this.aiService.activateZone(respawnedPlayer.position.zoneId);
      }
    } catch (error) {
      client.emit('error', {
        code: 'SERVER_ERROR',
        message: 'Failed to process S.O.S. respawn',
      });
    }
  }

  async handleRespawnReboot(
    client: Socket,
    payload: { itemInstanceId: string },
  ): Promise<void> {
    try {
      const player = this.playerService.getPlayerBySocket(client.id);
      if (!player) return;

      // Validate player is dead
      if (!this.playerService.isDead(player.id)) {
        client.emit('error', { code: 'NOT_DEAD', message: 'You are not in Emergency Lockdown Mode' });
        return;
      }

      // Validate item exists in inventory
      const inventory = this.inventoryService.getInventory(player.id);
      if (!inventory) {
        client.emit('error', { code: 'INVENTORY_ERROR', message: 'Inventory not loaded' });
        return;
      }

      const item = inventory.items.find(i => i.instanceId === payload.itemInstanceId);
      if (!item) {
        client.emit('error', { code: 'ITEM_NOT_FOUND', message: 'Item not found in inventory' });
        return;
      }

      // Validate item is an emergency reboot kit
      const itemDef = ItemRegistry.get(item.itemId);
      if (!itemDef) {
        client.emit('error', { code: 'INVALID_ITEM', message: 'Unknown item' });
        return;
      }

      const rebootEffect = itemDef.effects?.find(
        e => e.trigger === 'on_use' && e.effect.type === 'emergency_reboot'
      );
      if (!rebootEffect || rebootEffect.effect.type !== 'emergency_reboot') {
        client.emit('error', { code: 'INVALID_ITEM', message: 'Item is not an Emergency Reboot Kit' });
        return;
      }

      const healPercent = rebootEffect.effect.healPercent;

      // Remove item from inventory (consume it)
      await this.inventoryService.removeItem(player.id, payload.itemInstanceId);

      // Perform reboot respawn (partial health, stay in place)
      await this.playerService.respawnWithReboot(player.id, healPercent);

      // Send updated inventory
      const updatedInventory = this.inventoryService.getInventory(player.id);
      if (updatedInventory) {
        client.emit('inventory:update', updatedInventory);
      }
    } catch (error) {
      client.emit('error', {
        code: 'SERVER_ERROR',
        message: 'Failed to process reboot respawn',
      });
    }
  }
}
