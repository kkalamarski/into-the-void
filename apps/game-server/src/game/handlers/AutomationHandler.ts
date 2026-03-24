import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Server, Socket } from 'socket.io';
import { PlayerService } from '../player.service';
import { InventoryService } from '../inventory.service';
import { AutomationService } from '../automation.service';
import { CraftingService } from '../crafting.service';
import { ClientEvents } from '@into-the-void/shared-types';

@Injectable()
export class AutomationHandler {
  private server!: Server;

  constructor(
    private readonly playerService: PlayerService,
    private readonly inventoryService: InventoryService,
    private readonly automationService: AutomationService,
    private readonly craftingService: CraftingService,
  ) {}

  setServer(server: Server): void {
    this.server = server;
    // Propagate to services owned by this handler
    this.automationService.setServer(server);
  }

  async handleAutomationDeploy(
    client: Socket,
    data: ClientEvents['automation:deploy'],
  ): Promise<void> {
    try {
      const player = this.playerService.getPlayerBySocket(client.id);
      if (!player) return;

      const result = await this.automationService.handleDeploy(player.id, data.deployableItemId, data.position);
      if (!result.success) {
        client.emit('error', { code: 'AUTOMATION_DEPLOY_FAILED', message: result.error });
        return;
      }

      // Emit inventory update to player
      const inventory = this.inventoryService.getInventory(player.id);
      if (inventory) client.emit('inventory:update', inventory);

      // Emit deployed event to player
      client.emit('automation:deployed', {
        deployableId: result.deployable!.id,
        deployableType: result.deployable!.deployableType,
        position: data.position,
      });

      // Broadcast entity spawn to zone
      if (result.deployable) {
        this.server.to(player.position.zoneId).emit('entity:spawn', result.deployable);
      }
    } catch (error) {
      client.emit('error', { code: 'AUTOMATION_ERROR', message: 'Failed to deploy structure' });
    }
  }

  async handleAutomationInteract(
    client: Socket,
    data: ClientEvents['automation:interact'],
  ): Promise<void> {
    try {
      const player = this.playerService.getPlayerBySocket(client.id);
      if (!player) return;

      const lootData = this.automationService.handleInteract(player.id, data.entityId);
      if (lootData) {
        client.emit('automation:loot_window', lootData);
      } else {
        client.emit('error', { code: 'AUTOMATION_INTERACT_FAILED', message: 'Structure not found' });
      }
    } catch (error) {
      client.emit('error', { code: 'AUTOMATION_ERROR', message: 'Failed to interact with structure' });
    }
  }

  async handleAutomationCollect(
    client: Socket,
    data: ClientEvents['automation:collect'],
  ): Promise<void> {
    try {
      const player = this.playerService.getPlayerBySocket(client.id);
      if (!player) return;

      const result = await this.automationService.handleCollect(player.id, data.deployableId);
      if (!result.success) {
        client.emit('error', { code: 'AUTOMATION_COLLECT_FAILED', message: result.error });
        return;
      }

      // Emit collected event
      client.emit('automation:collected', {
        deployableId: data.deployableId,
        items: result.items || [],
      });

      // Emit inventory update
      const inventory = this.inventoryService.getInventory(player.id);
      if (inventory) client.emit('inventory:update', inventory);
    } catch (error) {
      client.emit('error', { code: 'AUTOMATION_ERROR', message: 'Failed to collect resources' });
    }
  }

  async handleAutomationRefuel(
    client: Socket,
    data: ClientEvents['automation:refuel'],
  ): Promise<void> {
    try {
      const player = this.playerService.getPlayerBySocket(client.id);
      if (!player) return;

      const result = await this.automationService.handleRefuel(player.id, data.deployableId, data.fuelInstanceId);
      if (!result.success) {
        client.emit('error', { code: 'AUTOMATION_REFUEL_FAILED', message: result.error });
        return;
      }

      // Emit refueled event
      client.emit('automation:refueled', {
        deployableId: data.deployableId,
        fuelLevel: result.fuelLevel!,
        maxFuel: result.maxFuel!,
      });

      // Emit inventory update
      const inventory = this.inventoryService.getInventory(player.id);
      if (inventory) client.emit('inventory:update', inventory);
    } catch (error) {
      client.emit('error', { code: 'AUTOMATION_ERROR', message: 'Failed to refuel structure' });
    }
  }

  async handleAutomationDismantle(
    client: Socket,
    data: ClientEvents['automation:dismantle'],
  ): Promise<void> {
    try {
      const player = this.playerService.getPlayerBySocket(client.id);
      if (!player) return;

      const result = await this.automationService.handleDismantle(player.id, data.deployableId);
      if (!result.success) {
        client.emit('error', { code: 'AUTOMATION_DISMANTLE_FAILED', message: result.error });
        return;
      }

      // Emit dismantled event
      client.emit('automation:dismantled', {
        deployableId: data.deployableId,
        recoveredItems: result.recoveredItems || [],
      });

      // Emit inventory update
      const inventory = this.inventoryService.getInventory(player.id);
      if (inventory) client.emit('inventory:update', inventory);

      // Broadcast entity despawn to zone
      this.server.to(player.position.zoneId).emit('entity:despawn', {
        entityId: `deployable_${data.deployableId}`,
      });
    } catch (error) {
      client.emit('error', { code: 'AUTOMATION_ERROR', message: 'Failed to dismantle structure' });
    }
  }

  async handleAutomationPanelRequest(client: Socket): Promise<void> {
    try {
      const player = this.playerService.getPlayerBySocket(client.id);
      if (!player) return;

      const structures = this.automationService.handlePanelRequest(player.id);
      client.emit('automation:panel_state', { structures });
    } catch (error) {
      client.emit('error', { code: 'AUTOMATION_ERROR', message: 'Failed to get panel state' });
    }
  }

  // ────────────────────────────────────────────────────────────────
  // Crafting handlers (CRFT-03, CRFT-05, CRFT-06)
  // ────────────────────────────────────────────────────────────────

  async handleCraftingStart(
    client: Socket,
    data: ClientEvents['crafting:start'],
  ): Promise<void> {
    const result = await this.craftingService.startCraft(client.id, data.recipeId);
    if (!result.success) {
      client.emit('crafting:error', { code: result.code, message: result.message });
      return;
    }

    // Send craft started to player
    client.emit('crafting:started', {
      recipeId: result.recipeId,
      durationMs: result.durationMs,
      startedAt: result.startedAt,
    });

    // Broadcast to nearby players in same zone (social indicator)
    const player = this.playerService.getPlayerBySocket(client.id);
    if (player) {
      client.to(player.position.zoneId).emit('crafting:nearby', {
        playerId: player.id,
        recipeId: result.recipeId,
      });
    }
  }

  async handleCraftingCollect(client: Socket): Promise<void> {
    const result = await this.craftingService.collectCraft(client.id);
    if (!result.success) {
      client.emit('crafting:error', { code: result.code, message: result.message });
      return;
    }

    // Send completion to player with updated proficiency data
    const player = this.playerService.getPlayerBySocket(client.id);
    if (player) {
      const updatedProf = await this.craftingService.loadProficiency(player.id);
      const discData = updatedProf[result.discipline];
      client.emit('crafting:completed', {
        recipeId: result.recipeId,
        outputItemId: result.outputItemId,
        qualityTier: result.qualityTier,
        proficiencyXP: result.proficiencyXP,
        discipline: result.discipline,
        newProficiencyLevel: discData.level,
        newProficiencyXP: discData.xp,
      });

      // Send updated inventory
      const inventory = this.inventoryService.getInventory(player.id);
      if (inventory) {
        client.emit('inventory:update', inventory);
      }
    }
  }

  async handleCraftingRecipes(client: Socket): Promise<void> {
    const player = this.playerService.getPlayerBySocket(client.id);
    if (!player) {
      client.emit('crafting:error', { code: 'PLAYER_NOT_FOUND', message: 'Player not found' });
      return;
    }
    const recipes = await this.craftingService.getRecipeList(player.id, {
      level: player.level,
      faction: player.faction,
    });
    const proficiency = await this.craftingService.loadProficiency(player.id);
    client.emit('crafting:recipe-list', { recipes, proficiency });
  }

  /**
   * Phase 123: Masterwork craft broadcast to nearby players in same zone.
   * Triggers when a player crafts a masterwork quality item.
   */
  @OnEvent('craft.masterwork')
  handleMasterworkBroadcast(data: {
    characterId: string;
    recipeId: string;
    outputItemId: string;
    qualityTier: string;
  }): void {
    const player = this.playerService.getPlayerById(data.characterId);
    if (!player) return;

    const socketId = this.playerService.getSocketByPlayerId(data.characterId);
    if (!socketId) return;

    // Broadcast to all other players in the same zone via Socket.IO room
    const socket = this.server.sockets.sockets.get(socketId);
    if (socket) {
      socket.to(player.position.zoneId).emit('crafting:nearby', {
        playerId: data.characterId,
        recipeId: data.recipeId,
      });
    }
  }
}
