import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { GameService } from './game.service';
import { PlayerService } from './player.service';
import { InventoryService } from './inventory.service';
import { StorageService } from './storage.service';
import { EntityService } from './entity.service';
import { ZonesService } from '../zones/zones.service';
import { AiService } from './ai.service';
import { CombatService } from './combat.service';
import { TradeService } from './trade.service';
import { AbilityService } from './ability.service';
import { QuestService } from './quest.service';
import { DiscoveryService } from './discovery.service';
import { GatheringService } from './gathering.service';
import { LoreService } from './lore.service';
import { ZoneMasteryService } from './zone-mastery.service';
import { ExpeditionService } from './expedition.service';
import { ChatService } from './chat.service';
import { HazardService } from './hazard.service';
import { AutomationService } from './automation.service';
import { CraftingService } from './crafting.service';
import {
  ClientEvents,
  Direction,
  AuthRequest,
  getErrorInfo,
  CharStatsPayload,
  CharacterStats,
  isHubZone,
  Npc,
  Mineral,
  Plant,
  BiomeType,
} from '@into-the-void/shared-types';
import { computeCharStats } from '@into-the-void/game-logic';
import { ItemRegistry } from '@into-the-void/items';
import { NpcRegistry } from '@into-the-void/npcs';
import { EquipmentJson } from '@into-the-void/database';
import { BiomeGenerator, getHubConfig } from '@into-the-void/world-gen';
import { createZoneId } from '@into-the-void/game-logic';
import { PoiType } from '@into-the-void/shared-types';

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  },
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutes
    skipMiddlewares: true,
  },
})
export class GameGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly chatBurstWindow: Map<string, number[]> = new Map();
  private readonly CHAT_BURST_LIMIT = 5;
  private readonly CHAT_BURST_WINDOW_MS = 5000;

  private canSendChat(playerId: string): boolean {
    const now = Date.now();
    const recent = (this.chatBurstWindow.get(playerId) || [])
      .filter(t => now - t < this.CHAT_BURST_WINDOW_MS);
    if (recent.length >= this.CHAT_BURST_LIMIT) return false;
    recent.push(now);
    this.chatBurstWindow.set(playerId, recent);
    return true;
  }

  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly gameService: GameService,
    private readonly playerService: PlayerService,
    private readonly inventoryService: InventoryService,
    private readonly storageService: StorageService,
    private readonly entityService: EntityService,
    private readonly zonesService: ZonesService,
    private readonly aiService: AiService,
    private readonly combatService: CombatService,
    private readonly tradeService: TradeService,
    private readonly abilityService: AbilityService,
    private readonly questService: QuestService,
    private readonly discoveryService: DiscoveryService,
    private readonly gatheringService: GatheringService,
    private readonly loreService: LoreService,
    private readonly zoneMasteryService: ZoneMasteryService,
    private readonly expeditionService: ExpeditionService,
    private readonly chatService: ChatService,
    private readonly hazardService: HazardService,
    private readonly automationService: AutomationService,
    private readonly craftingService: CraftingService,
  ) {}

  afterInit(server: Server) {
    this.zonesService.setServer(server);
    this.aiService.setServer(server);
    this.combatService.setServer(server);
    this.playerService.setServer(server);
    this.abilityService.setServer(server);
    this.questService.setServer(server);
    this.loreService.setServer(server);
    this.zoneMasteryService.setServer(server);
    this.expeditionService.setServer(server);
    this.chatService.setServer(server);
    this.hazardService.setServer(server);
    this.automationService.setServer(server);
    this.playerService.setZoneStateProvider((zoneId) => this.gameService.getZoneState(zoneId));
    // Wire aggro checker to ZonesService for immediate aggro on creature respawn
    this.zonesService.setAggroChecker(this.aiService);
    console.log('[GameGateway] WebSocket server initialized, ZonesService, AiService, CombatService, AbilityService, QuestService, LoreService, ZoneMasteryService, ExpeditionService, and PlayerService connected');
  }

  async handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);

    // Set 5 second auth timeout
    const authTimeout = setTimeout(() => {
      const player = this.playerService.getPlayerBySocket(client.id);
      if (!player) {
        console.log(`Auth timeout for client ${client.id}`);
        const errorInfo = getErrorInfo('AUTH_TIMEOUT');
        client.emit('auth:error', errorInfo);
        client.disconnect();
      }
    }, 5000);

    // Store timeout reference for cleanup
    client.data.authTimeout = authTimeout;
  }

  async handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);

    // Get player's zone BEFORE disconnect removes them from the service
    const player = this.playerService.getPlayerBySocket(client.id);
    const zoneId = player?.position.zoneId;

    // Clean up combat state before removing player
    if (player) {
      this.combatService.handleDisconnect(player.id);
      this.abilityService.handleDisconnect(player.id);
      this.gatheringService.unloadProficiency(player.id);
      this.craftingService.unloadPlayer(player.id);
      this.hazardService.onPlayerDisconnect(player.id);
      this.automationService.onPlayerDisconnect(player.id);
    }

    await this.playerService.handleDisconnect(client.id);

    // Deactivate zone if no players remain
    if (zoneId && this.playerService.getPlayersInZone(zoneId).length === 0) {
      this.aiService.deactivateZone(zoneId);
    }
  }

  @SubscribeMessage('auth')
  async handleAuth(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: AuthRequest
  ) {
    // Clear auth timeout immediately
    if (client.data.authTimeout) {
      clearTimeout(client.data.authTimeout);
      delete client.data.authTimeout;
    }

    try {
      const result = await this.playerService.authenticate(
        client.id,
        data.token,
        data.characterId
      );

      if (result.success && result.player) {
        // Join player to 3x3 grid of zone rooms (current + 8 adjacent)
        this.updatePlayerRooms(client, result.player.position.zoneId);

        // Join faction room for faction chat (CHAN-03)
        if (result.player.faction !== 'neutral') {
          client.join(`faction:${result.player.faction}`);
        }

        const playerZoneId = result.player.position.zoneId;
        const zoneAlreadyActive = this.aiService.isZoneActive(playerZoneId);

        // Activate AI tick loop for the zone the player just joined
        this.aiService.activateZone(playerZoneId);

        // If zone was already active (other players present), trigger immediate aggro
        // for this specific player. activateZone only runs checkImmediateAggro on first activation.
        if (zoneAlreadyActive) {
          this.aiService.checkImmediateAggroForPlayer(playerZoneId, result.player.id);
        }

        // Send initial zone state
        const zoneState = await this.gameService.getZoneState(
          result.player.position.zoneId
        );

        // Load inventory for this session
        const inventory = await this.inventoryService.loadForPlayer(result.player.id);

        // Load gathering proficiency for this session
        await this.gatheringService.loadProficiency(result.player.id);

        // Load crafting proficiency for this session (PROF-05)
        await this.craftingService.loadProficiency(result.player.id);

        // Send discovered rare nodes on join
        const discoveredResources = await this.discoveryService.getDiscoveredResources(result.player.id);
        client.emit('rare-nodes:discovered', { discoveries: discoveredResources });

        client.emit('auth:success', { player: result.player });
        client.emit('zone:state', zoneState);
        // Send NPC quest markers (! and ? above NPCs)
        this.emitNpcQuestMarkers(
          client,
          result.player.id,
          result.player.faction,
          zoneState.entities as Array<{ type: string; npcId?: string }>
        );
        // Send initial inventory state (PRIVATE - only to this client)
        client.emit('inventory:update', inventory);
        // Send initial stats (PRIVATE - only to this client)
        this.emitStats(client, result.player.id);

        // Restore persistent cooldowns (PRIVATE - only to this client)
        await this.abilityService.restoreCooldowns(result.player.id, client.id);

        // Emit zone entry event for quest tracking on login
        const biome = this.resolveZoneBiome(playerZoneId);
        this.eventEmitter.emit('zone.entered', {
          characterId: result.player.id,
          zoneId: playerZoneId,
          biome,
        });

        // Notify other players
        client.to(result.player.position.zoneId).emit('player:joined', {
          id: result.player.id,
          name: result.player.name,
          faction: result.player.faction,
          position: result.player.position,
          level: result.player.level,
          inCombat: result.player.inCombat,
        });
      } else {
        // Auth failed - send error info and disconnect
        console.error('Auth failed:', result.error);
        const errorCode = result.error?.includes('Character not found')
          ? 'INVALID_CHARACTER'
          : result.error?.includes('Invalid token') || result.error?.includes('expired')
          ? 'AUTH_EXPIRED'
          : 'AUTH_FAILED';
        const errorInfo = getErrorInfo(errorCode, result.error);
        client.emit('auth:error', errorInfo);
        client.disconnect();
      }
    } catch (error) {
      // Exception during auth - send error and disconnect
      console.error('Auth exception:', error);
      const errorInfo = getErrorInfo('AUTH_FAILED', 'Authentication failed');
      client.emit('auth:error', errorInfo);
      client.disconnect();
    }
  }

  @SubscribeMessage('player:move')
  async handleMove(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { direction: Direction; sequence?: number }
  ) {
    try {
      const player = this.playerService.getPlayerBySocket(client.id);
      if (!player) return;

      // Interrupt cast on movement
      if (this.abilityService.isPlayerCasting(player.id)) {
        this.abilityService.interruptCast(player.id, 'moved');
      }

      const now = Date.now();
      const lastMoveTime = this.playerService.getLastMoveTime(player.id);

      // Calculate destination position to determine tile-based movement delay
      const { calculateNewPosition } = await import('@into-the-void/game-logic');
      const destPosition = calculateNewPosition(player.position, data.direction);

      // Get tile-based movement delay (accounts for water tiles, biomes, etc)
      const movementDelay = await this.gameService.getMovementDelay(destPosition);
      const minDelay = movementDelay - 50; // 50ms tolerance for network latency

      // Dynamic rate limiting based on destination tile
      if (now - lastMoveTime < minDelay) {
        client.emit('error', {
          code: 'E-0006',
          message: 'Movement too fast',
          lastProcessedInput: data.sequence,
        });
        return;
      }

      this.playerService.setLastMoveTime(player.id, now);

      const result = await this.gameService.movePlayer(client.id, data.direction);

      if (result.success && result.position) {
        // Check for rare node discoveries after movement
        await this.checkRareNodeDiscovery(
          player.id,
          result.position.x,
          result.position.y,
          result.position.zoneId,
          client
        );

        // Notify players in old and new zone
        if (result.oldZoneId && result.newZoneId) {
          // Zone transition - update 3x3 room subscriptions
          this.updatePlayerRooms(client, result.newZoneId);

          // Notify old zone (broadcast to all rooms player just left)
          this.server.to(result.oldZoneId).emit('player:left', {
            playerId: result.playerId,
          });

          // Deactivate old zone if no players remain; activate new zone
          if (this.playerService.getPlayersInZone(result.oldZoneId).length === 0) {
            this.aiService.deactivateZone(result.oldZoneId);
          }
          const newZoneAlreadyActive = this.aiService.isZoneActive(result.newZoneId);
          this.aiService.activateZone(result.newZoneId);

          // If zone was already active, trigger immediate aggro for this player
          if (newZoneAlreadyActive && result.playerId) {
            this.aiService.checkImmediateAggroForPlayer(result.newZoneId, result.playerId);
          }

          // Send new zone state to player
          const zoneState = await this.gameService.getZoneState(result.newZoneId);
          client.emit('zone:state', zoneState);
          // Send NPC quest markers for the new zone
          this.emitNpcQuestMarkers(
            client,
            player.id,
            player.faction,
            zoneState.entities as Array<{ type: string; npcId?: string }>
          );

          // Emit zone entry event for quest tracking on zone transition
          if (result.playerId) {
            const biome = this.resolveZoneBiome(result.newZoneId);
            this.eventEmitter.emit('zone.entered', {
              characterId: result.playerId,
              zoneId: result.newZoneId,
              biome,
            });
          }

          // Notify new zone
          client.to(result.newZoneId).emit('player:joined', result.playerPublic);
        } else {
          // Same zone movement
          this.server.to(result.zoneId!).emit('player:moved', {
            playerId: result.playerId,
            position: result.position,
            lastProcessedInput: data.sequence,
          });
        }
      } else {
        client.emit('error', {
          code: 'MOVEMENT_BLOCKED',
          message: result.error || 'Movement blocked',
          lastProcessedInput: data.sequence,
        });
      }
    } catch (error) {
      client.emit('error', {
        code: 'SERVER_ERROR',
        message: 'Failed to process movement',
      });
    }
  }

  @SubscribeMessage('player:interact')
  async handleInteract(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: ClientEvents['player:interact']
  ) {
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

  @SubscribeMessage('chat:send')
  async handleChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: ClientEvents['chat:send']
  ) {
    const player = this.playerService.getPlayerBySocket(client.id);
    if (!player) return;

    // Validate message content (INFRA-04)
    const trimmed = data.message?.trim() ?? '';
    if (trimmed.length === 0) return; // silently discard empty/whitespace
    if (trimmed.length > 280) {
      client.emit('error', { code: 'INVALID_ACTION', message: 'Message too long (max 280 characters).' });
      return;
    }

    // Rate limit check (INFRA-03)
    if (!this.canSendChat(player.id)) return; // silently drop burst excess

    // Delegate to ChatService for channel routing (CHAN-01 through CHAN-05)
    await this.chatService.handleMessage(
      client,
      player.id,
      player.name,
      data.channel,
      trimmed,
      data.targetId,
    );
  }

  @SubscribeMessage('ping')
  handlePing(@MessageBody() timestamp: number): number {
    // Return timestamp for round-trip latency measurement
    return timestamp;
  }

  @SubscribeMessage('zone:request')
  async handleZoneRequest(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: ClientEvents['zone:request']
  ) {
    console.log('[GameGateway] zone:request received for', data.zoneId);
    try {
      const player = this.playerService.getPlayerBySocket(client.id);
      if (!player) {
        console.log('[GameGateway] No player found for socket', client.id);
        return;
      }

      // Get chunk data for requested zone
      const zoneState = await this.gameService.getZoneState(data.zoneId);
      console.log('[GameGateway] Sending zone:chunk for', data.zoneId);

      // Send chunk, biome, AND entities for cross-chunk visibility
      // Include zoneId so client can track entities for cleanup on chunk unload
      // Client-side isEntityVisible filters based on 48-tile radius
      client.emit('zone:chunk', {
        zoneId: data.zoneId,
        chunk: zoneState.chunk,
        biome: zoneState.biome,
        entities: zoneState.entities,
      });
    } catch (error) {
      console.error(`Failed to load zone ${data.zoneId}:`, error);
      client.emit('error', {
        code: 'ZONE_LOAD_ERROR',
        message: `Failed to load zone ${data.zoneId}`,
      });
    }
  }

  @SubscribeMessage('inventory:pickup')
  async handleInventoryPickup(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: ClientEvents['inventory:pickup']
  ) {
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

  @SubscribeMessage('inventory:drop')
  async handleInventoryDrop(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: ClientEvents['inventory:drop']
  ) {
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

  @SubscribeMessage('inventory:use')
  async handleInventoryUse(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: ClientEvents['inventory:use']
  ) {
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

  @SubscribeMessage('equipment:change')
  async handleEquipmentChange(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { instanceId: string }
  ) {
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

  @SubscribeMessage('inventory:unequip')
  async handleInventoryUnequip(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { instanceId: string }
  ) {
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

  @SubscribeMessage('equipment:tool_swap')
  async handleToolSwap(@ConnectedSocket() client: Socket) {
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

  @SubscribeMessage('inventory:reorder')
  async handleInventoryReorder(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: ClientEvents['inventory:reorder']
  ) {
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

  @SubscribeMessage('storage:open')
  async handleStorageOpen(
    @ConnectedSocket() client: Socket
  ): Promise<void> {
    const player = this.playerService.getPlayerBySocket(client.id);
    if (!player) return;

    const storage = await this.storageService.loadForPlayer(player.id);
    client.emit('storage:update', storage);
  }

  @SubscribeMessage('entity:tool_use')
  async handleToolUse(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { targetEntityId: string },
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

  @SubscribeMessage('ability:use')
  async handleAbilityUse(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { abilityId: string; targetEntityId?: string },
  ): Promise<void> {
    console.log('[ability:use] Received:', { abilityId: data.abilityId, targetEntityId: data.targetEntityId, socketId: client.id });
    const result = await this.abilityService.useAbility(
      client.id,
      data.abilityId,
      data.targetEntityId,
    );
    console.log('[ability:use] Result:', { success: result.success, error: result.error, casting: result.casting });

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

  @SubscribeMessage('cast:cancel')
  handleCastCancel(
    @ConnectedSocket() client: Socket,
  ): void {
    const player = this.playerService.getPlayerBySocket(client.id);
    if (!player) return;
    this.abilityService.interruptCast(player.id, 'cancelled');
  }

  @SubscribeMessage('respawn:sos')
  async handleRespawnSOS(
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
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
        this.updatePlayerRooms(client, respawnedPlayer.position.zoneId);

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

  @SubscribeMessage('respawn:reboot')
  async handleRespawnReboot(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { itemInstanceId: string },
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

  @SubscribeMessage('portal:use')
  async handlePortalUse(@ConnectedSocket() client: Socket): Promise<void> {
    try {
      const player = this.playerService.getPlayerBySocket(client.id);
      if (!player) return;

      // In hub, portal acts as an exit back to the open world
      if (isHubZone(player.position.zoneId)) {
        return this.handleHubLeave(client);
      }

      // Validate player is standing on a portal tile (TileId.PORTAL = 16)
      const zoneState = await this.gameService.getZoneState(player.position.zoneId);
      const tileId = zoneState.chunk.tiles[player.position.y]?.[player.position.x];

      if (tileId !== 16) {
        client.emit('error', {
          code: 'NOT_ON_PORTAL',
          message: 'Must stand on a portal to use it',
        });
        return;
      }

      // Teleport to faction hub
      const result = await this.playerService.teleportToHub(player.id);

      if (result.success && result.oldZoneId && result.newZoneId) {
        // Update 3x3 room subscriptions for new zone
        this.updatePlayerRooms(client, result.newZoneId);

        // Notify old zone that player left
        this.server.to(result.oldZoneId).emit('player:left', { playerId: player.id });

        // Deactivate old zone if no players remain
        if (this.playerService.getPlayersInZone(result.oldZoneId).length === 0) {
          this.aiService.deactivateZone(result.oldZoneId);
        }

        // Activate AI for the hub zone
        this.aiService.activateZone(result.newZoneId);

        // Send new zone state to player
        const newZoneState = await this.gameService.getZoneState(result.newZoneId);
        client.emit('zone:state', newZoneState);
        // Send NPC quest markers for the hub zone
        this.emitNpcQuestMarkers(
          client,
          player.id,
          player.faction,
          newZoneState.entities as Array<{ type: string; npcId?: string }>
        );

        // Emit zone entry event for hazard/quest tracking
        const portalBiome = this.resolveZoneBiome(result.newZoneId);
        this.eventEmitter.emit('zone.entered', {
          characterId: player.id,
          zoneId: result.newZoneId,
          biome: portalBiome,
        });

        // Notify new zone of player arrival
        client.to(result.newZoneId).emit('player:joined', {
          id: player.id,
          name: player.name,
          faction: player.faction,
          position: player.position,
          level: player.level,
          inCombat: player.inCombat,
          credits: player.credits,
        });
      } else {
        client.emit('error', {
          code: 'PORTAL_FAILED',
          message: result.error || 'Failed to use portal',
        });
      }
    } catch (error) {
      client.emit('error', {
        code: 'SERVER_ERROR',
        message: 'Failed to process portal use',
      });
    }
  }

  @SubscribeMessage('hub:recall')
  async handleHubRecall(@ConnectedSocket() client: Socket): Promise<void> {
    try {
      const player = this.playerService.getPlayerBySocket(client.id);
      if (!player) return;

      // Block recall if player is already in a hub
      if (isHubZone(player.position.zoneId)) {
        client.emit('error', {
          code: 'ALREADY_IN_HUB',
          message: 'Already in hub — use a portal or Leave Hub to return to the open world',
        });
        return;
      }

      // Teleport to faction hub (saves current position as lastWorldPosition)
      const result = await this.playerService.teleportToHub(player.id);

      if (result.success && result.oldZoneId && result.newZoneId) {
        // Update room subscriptions for new zone
        this.updatePlayerRooms(client, result.newZoneId);

        // Notify old zone that player left
        this.server.to(result.oldZoneId).emit('player:left', { playerId: player.id });

        // Deactivate old zone if no players remain
        if (this.playerService.getPlayersInZone(result.oldZoneId).length === 0) {
          this.aiService.deactivateZone(result.oldZoneId);
        }

        // Activate AI for the hub zone
        this.aiService.activateZone(result.newZoneId);

        // Send new zone state to player
        const newZoneState = await this.gameService.getZoneState(result.newZoneId);
        client.emit('zone:state', newZoneState);
        // Send NPC quest markers for the hub zone
        this.emitNpcQuestMarkers(
          client,
          player.id,
          player.faction,
          newZoneState.entities as Array<{ type: string; npcId?: string }>
        );

        // Notify new zone of player arrival
        client.to(result.newZoneId).emit('player:joined', {
          id: player.id,
          name: player.name,
          faction: player.faction,
          position: player.position,
          level: player.level,
          inCombat: player.inCombat,
          credits: player.credits,
        });
      } else {
        client.emit('error', {
          code: 'RECALL_FAILED',
          message: result.error || 'Failed to recall to hub',
        });
      }
    } catch (error) {
      client.emit('error', {
        code: 'SERVER_ERROR',
        message: 'Failed to process recall',
      });
    }
  }

  @OnEvent('player.teleported')
  async handlePlayerTeleported(data: { playerId: string; socketId: string; oldZoneId: string; newZoneId: string }): Promise<void> {
    const client = this.server.sockets.sockets.get(data.socketId);
    if (!client) return;
    const player = this.playerService.getPlayerBySocket(data.socketId);
    if (!player) return;

    this.updatePlayerRooms(client, data.newZoneId);

    // Notify old zone that player left
    this.server.to(data.oldZoneId).emit('player:left', { playerId: player.id });

    // Deactivate old zone if no players remain
    if (this.playerService.getPlayersInZone(data.oldZoneId).length === 0) {
      this.aiService.deactivateZone(data.oldZoneId);
    }
    this.aiService.activateZone(data.newZoneId);

    const newZoneState = await this.gameService.getZoneState(data.newZoneId);
    client.emit('zone:state', newZoneState);

    // Send NPC quest markers for the new zone
    this.emitNpcQuestMarkers(
      client,
      player.id,
      player.faction,
      newZoneState.entities as Array<{ type: string; npcId?: string }>
    );

    client.to(data.newZoneId).emit('player:joined', {
      id: player.id, name: player.name, faction: player.faction,
      position: player.position, level: player.level,
      inCombat: player.inCombat, credits: player.credits,
    });
  }

  @SubscribeMessage('hub:leave')
  async handleHubLeave(@ConnectedSocket() client: Socket): Promise<void> {
    try {
      const player = this.playerService.getPlayerBySocket(client.id);
      if (!player) return;

      // Teleport from hub back to saved open-world position
      const result = await this.playerService.teleportFromHub(player.id);

      if (result.success && result.oldZoneId && result.newZoneId) {
        // Update room subscriptions for new zone
        this.updatePlayerRooms(client, result.newZoneId);

        // Notify hub zone that player left
        this.server.to(result.oldZoneId).emit('player:left', { playerId: player.id });

        // No need to deactivate hub (it has no AI enemies)

        // Activate AI for the open-world zone the player returns to
        const newZoneAlreadyActive = this.aiService.isZoneActive(result.newZoneId);
        this.aiService.activateZone(result.newZoneId);

        // If zone was already active, trigger immediate aggro for this player
        if (newZoneAlreadyActive) {
          this.aiService.checkImmediateAggroForPlayer(result.newZoneId, player.id);
        }

        // Send new zone state to player
        const newZoneState = await this.gameService.getZoneState(result.newZoneId);
        client.emit('zone:state', newZoneState);
        // Send NPC quest markers for the new zone
        this.emitNpcQuestMarkers(
          client,
          player.id,
          player.faction,
          newZoneState.entities as Array<{ type: string; npcId?: string }>
        );

        // Emit zone entry event for hazard/quest tracking
        const hubLeaveBiome = this.resolveZoneBiome(result.newZoneId);
        this.eventEmitter.emit('zone.entered', {
          characterId: player.id,
          zoneId: result.newZoneId,
          biome: hubLeaveBiome,
        });

        // Notify new zone of player arrival
        client.to(result.newZoneId).emit('player:joined', {
          id: player.id,
          name: player.name,
          faction: player.faction,
          position: player.position,
          level: player.level,
          inCombat: player.inCombat,
          credits: player.credits,
        });
      } else {
        client.emit('error', {
          code: 'LEAVE_HUB_FAILED',
          message: result.error || 'Failed to leave hub',
        });
      }
    } catch (error) {
      client.emit('error', {
        code: 'SERVER_ERROR',
        message: 'Failed to process hub leave',
      });
    }
  }

  @SubscribeMessage('npc:interact')
  async handleNpcInteract(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { entityId: string }
  ): Promise<void> {
    const player = this.playerService.getPlayerBySocket(client.id);
    if (!player) return;

    // Find entity in zone to get npcId
    const entity = await this.zonesService.getEntity(player.position.zoneId, data.entityId);
    if (!entity || entity.type !== 'npc') return;

    // Get NPC definition from registry
    const npcDef = NpcRegistry.get((entity as Npc).npcId);

    // Build response payload from definition
    const response: {
      npcId: string;
      displayName: string;
      npcType: string;
      faction: string;
      description: string;
      dialogue: Array<{ text: string; condition?: string }>;
      color: number;
      inventory?: Array<{ itemId: string; buyPrice: number; sellPrice: number; stock: number }>;
      serviceType?: string;
      title?: string;
      role?: string;
      availableQuests?: Array<{
        questId: string;
        displayName: string;
        description: string;
        objectives: Array<{ description: string; required: number }>;
        rewards: { credits?: number; xp?: number; items?: Array<{ itemId: string; quantity: number }> };
        minLevel?: number;
      }>;
      activeQuests?: Array<{
        questId: string;
        displayName: string;
        description: string;
        objectives: Array<{ description: string; current: number; required: number; complete: boolean }>;
      }>;
      readyQuests?: Array<{
        questId: string;
        displayName: string;
      }>;
    } = {
      npcId: npcDef.id,
      displayName: npcDef.displayName,
      npcType: npcDef.npcType,
      faction: npcDef.faction,
      description: npcDef.description,
      dialogue: [...npcDef.dialogue],
      color: npcDef.color,
    };

    // Add type-specific fields
    if (npcDef.npcType === 'trader' && 'inventory' in npcDef) {
      response.inventory = [...npcDef.inventory];
    }
    if (npcDef.npcType === 'service' && 'serviceType' in npcDef) {
      response.serviceType = npcDef.serviceType;
    }
    if (npcDef.npcType === 'faction_rep' && 'title' in npcDef) {
      response.title = npcDef.title;
    }
    if (npcDef.npcType === 'ambient' && 'role' in npcDef) {
      response.role = npcDef.role;
    }

    // Add quest data for this NPC
    const questData = await this.questService.getQuestsForNpc(player.id, npcDef.id, player.faction);
    if (questData.available.length > 0) {
      response.availableQuests = questData.available;
    }
    if (questData.active.length > 0) {
      response.activeQuests = questData.active;
    }
    if (questData.ready.length > 0) {
      response.readyQuests = questData.ready;
    }

    // Add expedition destinations for expedition service NPCs
    if (npcDef.npcType === 'service' && 'serviceType' in npcDef && npcDef.serviceType === 'expedition') {
      const destinations = this.expeditionService.getDestinations(player.level);
      (response as { expeditionDestinations?: typeof destinations }).expeditionDestinations = destinations;
    }

    client.emit('npc:interact:response', response);
  }

  @SubscribeMessage('trade:buy')
  async handleTradeBuy(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { npcId: string; itemId: string; quantity: number },
  ): Promise<void> {
    try {
      const player = this.playerService.getPlayerBySocket(client.id);
      if (!player) return;

      const result = await this.tradeService.buy(
        player.id,
        data.npcId,
        data.itemId,
        data.quantity,
      );

      if (result.success) {
        // Send updated inventory
        const inventory = this.inventoryService.getInventory(player.id);
        if (inventory) {
          client.emit('inventory:update', inventory);
        }
        // Send updated credits
        if (result.newBalance !== undefined) {
          client.emit('credits:update', { credits: result.newBalance });
        }
        // Send trade result
        client.emit('trade:result', {
          success: true,
          action: 'buy',
          itemId: data.itemId,
          quantity: data.quantity,
          newBalance: result.newBalance,
        });
      } else {
        client.emit('trade:result', {
          success: false,
          action: 'buy',
          error: result.error,
        });
      }
    } catch (error) {
      client.emit('error', {
        code: 'TRADE_ERROR',
        message: 'Failed to process purchase',
      });
    }
  }

  @SubscribeMessage('trade:sell')
  async handleTradeSell(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { npcId: string; itemInstanceId: string; quantity: number },
  ): Promise<void> {
    try {
      const player = this.playerService.getPlayerBySocket(client.id);
      if (!player) return;

      const result = await this.tradeService.sell(
        player.id,
        data.npcId,
        data.itemInstanceId,
        data.quantity,
      );

      if (result.success) {
        // Send updated inventory
        const inventory = this.inventoryService.getInventory(player.id);
        if (inventory) {
          client.emit('inventory:update', inventory);
        }
        // Send updated credits
        if (result.newBalance !== undefined) {
          client.emit('credits:update', { credits: result.newBalance });
        }
        // Send trade result
        client.emit('trade:result', {
          success: true,
          action: 'sell',
          newBalance: result.newBalance,
        });
      } else {
        client.emit('trade:result', {
          success: false,
          action: 'sell',
          error: result.error,
        });
      }
    } catch (error) {
      client.emit('error', {
        code: 'TRADE_ERROR',
        message: 'Failed to process sale',
      });
    }
  }

  @SubscribeMessage('quest:complete')
  async handleQuestComplete(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { questId: string }
  ): Promise<void> {
    try {
      const player = this.playerService.getPlayerBySocket(client.id);
      if (!player) return;

      const result = await this.questService.completeQuest(player.id, data.questId);

      if (result.success) {
        // Send updated inventory (quest items were removed)
        const inventory = this.inventoryService.getInventory(player.id);
        if (inventory) {
          client.emit('inventory:update', inventory);
        }
        // Send updated credits
        if (result.rewards?.credits) {
          client.emit('credits:update', { credits: player.credits });
        }
        // Note: quest:completed event is emitted by QuestService.completeQuest
      } else {
        client.emit('error', {
          code: 'QUEST_COMPLETE_FAILED',
          message: result.error || 'Failed to complete quest',
        });
      }
    } catch (error) {
      client.emit('error', {
        code: 'SERVER_ERROR',
        message: 'Failed to process quest completion',
      });
    }
  }

  @SubscribeMessage('quest:abandon')
  async handleQuestAbandon(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { questId: string }
  ): Promise<void> {
    try {
      const player = this.playerService.getPlayerBySocket(client.id);
      if (!player) return;

      const result = await this.questService.abandonQuest(player.id, data.questId);

      if (!result.success) {
        client.emit('error', {
          code: 'QUEST_ABANDON_FAILED',
          message: result.error || 'Failed to abandon quest',
        });
      }
      // Note: quest:abandoned and inventory:update events are emitted by QuestService.abandonQuest
    } catch (error) {
      client.emit('error', {
        code: 'SERVER_ERROR',
        message: 'Failed to process quest abandonment',
      });
    }
  }

  @SubscribeMessage('quest:accept')
  async handleQuestAccept(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { questId: string }
  ): Promise<void> {
    console.log('[quest:accept] Received:', { socketId: client.id, questId: data?.questId });

    const player = this.playerService.getPlayerBySocket(client.id);
    if (!player) {
      console.log('[quest:accept] No player found for socket');
      return;
    }

    console.log('[quest:accept] Player:', { id: player.id, faction: player.faction });
    const result = await this.questService.acceptQuest(player.id, data.questId);
    console.log('[quest:accept] Result:', result);

    if (result.success) {
      client.emit('quest:accepted', { questId: data.questId });
    } else {
      client.emit('error', {
        code: 'QUEST_ACCEPT_FAILED',
        message: result.error || 'Failed to accept quest',
      });
    }
  }

  @SubscribeMessage('poi:discover')
  async handlePoiDiscover(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { poiId: string; worldX: number; worldY: number }
  ): Promise<void> {
    const player = this.playerService.getPlayerBySocket(client.id);
    if (!player) return;

    // Parse POI info from deterministic ID format: poi_${chunkX}_${chunkY}_${index}
    const [, chunkXStr, chunkYStr] = data.poiId.split('_');
    const chunkX = parseInt(chunkXStr, 10);
    const chunkY = parseInt(chunkYStr, 10);

    // Get chunk to validate POI exists and get type/biome
    const zoneId = createZoneId(chunkX, chunkY);
    const zoneState = await this.gameService.getZoneState(zoneId);

    if (!zoneState?.chunk?.pois) {
      console.warn(`No POIs in zone ${zoneId} for discovery attempt`);
      return;
    }

    const poi = zoneState.chunk.pois.find((p) => p.poiId === data.poiId);
    if (!poi) {
      console.warn(`POI ${data.poiId} not found in zone ${zoneId}`);
      return;
    }

    // Attempt discovery
    const result = await this.discoveryService.attemptDiscovery(
      player.id,
      data.poiId,
      poi.type as PoiType,
      poi.biome
    );

    if (result.alreadyDiscovered) {
      client.emit('poi:already_discovered', { poiId: data.poiId });
      return;
    }

    if (result.success && result.reward) {
      // Emit discovery success with reward
      client.emit('poi:discovered', {
        poiId: data.poiId,
        poiType: poi.type,
        reward: result.reward,
      });

      // Also emit XP and credits updates
      client.emit('player:xp', {
        playerId: player.id,
        xp: player.xp + result.reward.xp,
        xpToNextLevel: 100, // TODO: Calculate properly based on level
        level: player.level,
        leveledUp: false,
      });
      client.emit('credits:update', {
        credits: player.credits + result.reward.credits,
      });
    }
  }

  @SubscribeMessage('gathering:start')
  async handleGatheringStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { targetEntityId: string }
  ): Promise<void> {
    // Redirect to ability system
    // Determine ability based on entity type
    const player = this.playerService.getPlayerBySocket(client.id);
    if (!player) {
      client.emit('error', { code: 'GATHERING_ERROR', message: 'Player not found' });
      return;
    }

    const entity = await this.zonesService.getEntity(player.position.zoneId, data.targetEntityId);
    if (!entity) {
      client.emit('error', { code: 'GATHERING_ERROR', message: 'Target not found' });
      return;
    }

    // Find the appropriate gathering ability from player's equipped abilities
    const abilities = this.abilityService.getPlayerAbilities(player.id);
    let abilityId: string | undefined;

    if (entity.type === 'plant') {
      // Prefer specialized 'harvest' over 'basic_harvest', fall back to universal 'gather'
      abilityId = abilities.find(a => a.id === 'harvest')?.id
        ?? abilities.find(a => a.id === 'basic_harvest')?.id
        ?? abilities.find(a => a.id === 'gather')?.id;
    } else if (entity.type === 'mineral') {
      // Prefer specialized 'mine' over 'basic_mine', fall back to universal 'gather'
      abilityId = abilities.find(a => a.id === 'mine')?.id
        ?? abilities.find(a => a.id === 'basic_mine')?.id
        ?? abilities.find(a => a.id === 'gather')?.id;
    } else if (entity.type === 'artifact') {
      abilityId = abilities.find(a => a.id === 'gather')?.id;
    }

    if (!abilityId) {
      client.emit('error', { code: 'GATHERING_ERROR', message: 'No gathering ability available' });
      return;
    }

    // Delegate to ability:use
    await this.handleAbilityUse(client, {
      abilityId,
      targetEntityId: data.targetEntityId
    });
  }

  @SubscribeMessage('gathering:complete')
  async handleGatheringComplete(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: import('@into-the-void/shared-types').TimingResult
  ): Promise<void> {
    // Keep for backwards compatibility but gathering now auto-completes
    const result = await this.gatheringService.completeGathering(client.id, data);
    client.emit('gathering:result', result);
  }

  @SubscribeMessage('lore:collect')
  async handleLoreCollect(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { loreId: string; worldX: number; worldY: number }
  ): Promise<void> {
    const player = this.playerService.getPlayerBySocket(client.id);
    if (!player) return;

    await this.loreService.attemptCollect(player.id, data.loreId, client.id);
  }

  @SubscribeMessage('mastery:query')
  async handleMasteryQuery(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { biome: string }
  ): Promise<void> {
    const player = this.playerService.getPlayerBySocket(client.id);
    if (!player) return;

    const masteryMap = await this.zoneMasteryService.getMasteryForCharacter(player.id);
    const progress = masteryMap.get(data.biome);

    if (progress) {
      client.emit('mastery:progress', { biome: data.biome, progress });
    }
  }

  @SubscribeMessage('expedition:start')
  async handleExpeditionStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { biome: string },
  ): Promise<void> {
    try {
      const player = this.playerService.getPlayerBySocket(client.id);
      if (!player) return;

      // Must be in a hub to use expedition
      if (!isHubZone(player.position.zoneId)) {
        client.emit('error', {
          code: 'NOT_IN_HUB',
          message: 'Must be in a hub to start an expedition',
        });
        return;
      }

      const result = await this.expeditionService.startExpedition(
        player.id,
        data.biome as BiomeType,
      );

      if (!result.success) {
        client.emit('error', {
          code: 'EXPEDITION_FAILED',
          message: result.error || 'Failed to start expedition',
        });
        return;
      }

      // Update room subscriptions for new zone
      if (result.oldZoneId && result.newZoneId) {
        this.updatePlayerRooms(client, result.newZoneId);

        // Notify old zone that player left
        this.server.to(result.oldZoneId).emit('player:left', { playerId: player.id });

        // Activate AI for the new zone
        const newZoneAlreadyActive = this.aiService.isZoneActive(result.newZoneId);
        this.aiService.activateZone(result.newZoneId);

        // If zone was already active, trigger immediate aggro for this player
        if (newZoneAlreadyActive) {
          this.aiService.checkImmediateAggroForPlayer(result.newZoneId, player.id);
        }

        // Send new zone state to player
        const newZoneState = await this.gameService.getZoneState(result.newZoneId);
        client.emit('zone:state', newZoneState);

        // Send NPC quest markers for the new zone
        this.emitNpcQuestMarkers(
          client,
          player.id,
          player.faction,
          newZoneState.entities as Array<{ type: string; npcId?: string }>
        );

        // Emit zone entry event for quest tracking
        const biome = this.resolveZoneBiome(result.newZoneId);
        this.eventEmitter.emit('zone.entered', {
          characterId: player.id,
          zoneId: result.newZoneId,
          biome,
        });

        // Notify new zone of player arrival
        client.to(result.newZoneId).emit('player:joined', {
          id: player.id,
          name: player.name,
          faction: player.faction,
          position: result.position,
          level: player.level,
          inCombat: player.inCombat,
          credits: player.credits,
        });

        // Confirm expedition success to player
        client.emit('expedition:complete', {
          biome: data.biome,
          position: result.position,
        });
      }
    } catch (error) {
      client.emit('error', {
        code: 'SERVER_ERROR',
        message: 'Failed to process expedition',
      });
    }
  }

  /**
   * Compute and emit character stats to the requesting client.
   * Called after auth and after every equipment mutation.
   */
  private emitStats(client: Socket, playerId: string): void {
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

  /**
   * Resolve biome for a zone ID.
   * Hub zones use hub config, world zones use BiomeGenerator.
   */
  private resolveZoneBiome(zoneId: string): string {
    if (isHubZone(zoneId)) {
      const hubConfig = getHubConfig(zoneId);
      return hubConfig?.biome ?? 'hub';
    }

    // World zone: parse coordinates and compute biome
    const parts = zoneId.split('_');
    const zx = parseInt(parts[1], 10);
    const zy = parseInt(parts[2], 10);

    // BiomeGenerator needs world coordinates (chunk center)
    const worldSeed = this.zonesService.getWorldSeed();
    const biomeGenerator = new BiomeGenerator(worldSeed);
    // Chunk size is 64, use center point
    const centerX = zx * 64 + 32;
    const centerY = zy * 64 + 32;
    return biomeGenerator.getBiome(centerX, centerY);
  }

  /**
   * Update player's WebSocket room subscriptions to match 3x3 chunk grid.
   * Player receives entity updates from current zone and 8 adjacent zones.
   * Leaves old rooms and joins new rooms based on current position.
   */
  private updatePlayerRooms(client: Socket, playerZoneId: string): void {
    // Get current zone rooms only (exclude socket ID default room and non-zone rooms like faction:*)
    const currentRooms = Array.from(client.rooms).filter(r => r !== client.id && r.startsWith('z_'));

    // Parse player zone coordinates (format: z_X_Y)
    const parts = playerZoneId.split('_');
    const centerX = parseInt(parts[1], 10);
    const centerY = parseInt(parts[2], 10);

    // Calculate 3x3 grid (current + 8 adjacent)
    const requiredRooms = new Set<string>();
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        requiredRooms.add(`z_${centerX + dx}_${centerY + dy}`);
      }
    }

    // Leave rooms not in new grid
    for (const room of currentRooms) {
      if (!requiredRooms.has(room)) {
        client.leave(room);
      }
    }

    // Join rooms in new grid
    for (const room of requiredRooms) {
      if (!currentRooms.includes(room)) {
        client.join(room);
      }
    }
  }

  /**
   * Check for rare node discoveries when player moves.
   * Called from movement handler after position update.
   */
  private async checkRareNodeDiscovery(
    characterId: string,
    playerX: number,
    playerY: number,
    zoneId: string,
    socket: Socket
  ): Promise<void> {
    const RARE_DISCOVERY_RANGE = 3; // Tiles - player must be within 3 tiles to discover

    const entities = await this.zonesService.getZoneEntities(zoneId);

    for (const entity of entities) {
      // Only check minerals and plants
      if (entity.type !== 'mineral' && entity.type !== 'plant') continue;

      // Check if entity has rarity (rare or epic)
      const rarity = (entity as Mineral | Plant).rarity;
      if (!rarity || rarity === 'common') continue;

      // Calculate distance
      const distance = Math.hypot(
        playerX - entity.position.x,
        playerY - entity.position.y
      );

      if (distance <= RARE_DISCOVERY_RANGE) {
        // Attempt discovery
        const resourceId = entity.type === 'mineral'
          ? (entity as Mineral).resourceId
          : (entity as Plant).speciesId;

        const discoveryData = {
          entityId: entity.id,
          rarity: rarity as 'rare' | 'epic',
          resourceType: entity.type as 'mineral' | 'plant',
          zoneId,
          worldX: entity.position.x, // These are already world coords
          worldY: entity.position.y,
          resourceId,
        };

        const isNew = await this.discoveryService.discoverResource(
          characterId,
          discoveryData
        );

        if (isNew) {
          // Emit new discovery event to player
          socket.emit('rare-node:new-discovery', discoveryData);
        }
      }
    }
  }

  // ─── AUTOMATION EVENT HANDLERS (Phase 121) ─────────────────────

  @SubscribeMessage('automation:deploy')
  async handleAutomationDeploy(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: ClientEvents['automation:deploy'],
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

  @SubscribeMessage('automation:interact')
  async handleAutomationInteract(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: ClientEvents['automation:interact'],
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

  @SubscribeMessage('automation:collect')
  async handleAutomationCollect(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: ClientEvents['automation:collect'],
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

  @SubscribeMessage('automation:refuel')
  async handleAutomationRefuel(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: ClientEvents['automation:refuel'],
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

  @SubscribeMessage('automation:dismantle')
  async handleAutomationDismantle(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: ClientEvents['automation:dismantle'],
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

  @SubscribeMessage('automation:panel_request')
  async handleAutomationPanelRequest(
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    try {
      const player = this.playerService.getPlayerBySocket(client.id);
      if (!player) return;

      const structures = this.automationService.handlePanelRequest(player.id);
      client.emit('automation:panel_state', { structures });
    } catch (error) {
      client.emit('error', { code: 'AUTOMATION_ERROR', message: 'Failed to get panel state' });
    }
  }

  // ─── HELPER METHODS ───────────────────────────────────────────

  /**
   * Emit quest markers for all NPCs in a zone.
   * Called after zone:state to show ! and ? markers above NPCs.
   */
  private async emitNpcQuestMarkers(
    client: Socket,
    playerId: string,
    playerFaction: string,
    zoneEntities: Array<{ type: string; npcId?: string }>
  ): Promise<void> {
    // Extract NPC IDs from zone entities
    const npcIds = zoneEntities
      .filter((e) => e.type === 'npc' && e.npcId)
      .map((e) => e.npcId as string);

    if (npcIds.length === 0) {
      return;
    }

    const markers = await this.questService.getQuestMarkersForNpcs(
      playerId,
      npcIds,
      playerFaction
    );

    // Convert Map to array format for emission
    const markerArray: Array<{ npcId: string; markerType: 'available' | 'ready' | 'none' }> = [];
    for (const [npcId, markerType] of markers) {
      // Only include NPCs with actual markers (skip 'none')
      if (markerType !== 'none') {
        markerArray.push({ npcId, markerType });
      }
    }

    if (markerArray.length > 0) {
      client.emit('npc:quest-markers', { markers: markerArray });
    }
  }

  // ────────────────────────────────────────────────────────────────
  // Crafting handlers (CRFT-03, CRFT-05, CRFT-06)
  // ────────────────────────────────────────────────────────────────

  @SubscribeMessage('crafting:start')
  async handleCraftingStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: ClientEvents['crafting:start']
  ) {
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

  @SubscribeMessage('crafting:collect')
  async handleCraftingCollect(
    @ConnectedSocket() client: Socket,
  ) {
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

  @SubscribeMessage('crafting:recipes')
  async handleCraftingRecipes(
    @ConnectedSocket() client: Socket,
  ) {
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
