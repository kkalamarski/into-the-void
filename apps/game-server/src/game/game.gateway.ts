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
import { GameService } from './game.service';
import { PlayerService } from './player.service';
import { InventoryService } from './inventory.service';
import { StorageService } from './storage.service';
import { EntityService } from './entity.service';
import { ZonesService } from '../zones/zones.service';
import { AiService } from './ai.service';
import {
  ClientEvents,
  Direction,
  AuthRequest,
  getErrorInfo,
  CharStatsPayload,
  CharacterStats,
} from '@into-the-void/shared-types';
import { computeCharStats } from '@into-the-void/game-logic';
import { EquipmentJson } from '@into-the-void/database';

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

  constructor(
    private readonly gameService: GameService,
    private readonly playerService: PlayerService,
    private readonly inventoryService: InventoryService,
    private readonly storageService: StorageService,
    private readonly entityService: EntityService,
    private readonly zonesService: ZonesService,
    private readonly aiService: AiService,
  ) {}

  afterInit(server: Server) {
    this.zonesService.setServer(server);
    this.aiService.setServer(server);
    console.log('[GameGateway] WebSocket server initialized, ZonesService and AiService connected');
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

        // Activate AI tick loop for the zone the player just joined
        this.aiService.activateZone(result.player.position.zoneId);

        // Send initial zone state
        const zoneState = await this.gameService.getZoneState(
          result.player.position.zoneId
        );

        // Load inventory for this session
        const inventory = await this.inventoryService.loadForPlayer(result.player.id);

        client.emit('auth:success', { player: result.player });
        client.emit('zone:state', zoneState);
        // Send initial inventory state (PRIVATE - only to this client)
        client.emit('inventory:update', inventory);
        // Send initial stats (PRIVATE - only to this client)
        this.emitStats(client, result.player.id);

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

      const now = Date.now();
      const lastMoveTime = this.playerService.getLastMoveTime(player.id);

      // Rate limit: minimum 450ms between moves (500ms client delay - 50ms tolerance)
      if (now - lastMoveTime < 450) {
        client.emit('error', {
          code: 'E-0006',
          message: 'Movement too fast',
          lastProcessedInput: data.sequence,
        });
        return;
      }

      this.playerService.setLastMoveTime(player.id, now);

      const result = await this.gameService.movePlayer(client.id, data.direction);

      if (result.success) {
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
          this.aiService.activateZone(result.newZoneId);

          // Send new zone state to player
          const zoneState = await this.gameService.getZoneState(result.newZoneId);
          client.emit('zone:state', zoneState);

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

    const message = {
      id: crypto.randomUUID(),
      senderId: player.id,
      senderName: player.name,
      message: data.message,
      channel: data.channel,
      timestamp: Date.now(),
    };

    switch (data.channel) {
      case 'zone':
        this.server.to(player.position.zoneId).emit('chat:message', message);
        break;
      case 'global':
        this.server.emit('chat:message', message);
        break;
      case 'whisper':
        if (data.targetId) {
          const targetSocket = this.playerService.getSocketByPlayerId(data.targetId);
          if (targetSocket) {
            this.server.to(targetSocket).emit('chat:message', message);
            client.emit('chat:message', message);
          }
        }
        break;
    }
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

  /**
   * Compute and emit character stats to the requesting client.
   * Called after auth and after every equipment mutation.
   */
  private emitStats(client: Socket, playerId: string): void {
    const inventory = this.inventoryService.getInventory(playerId);
    const player = this.playerService.getPlayerById(playerId);
    if (!inventory || !player) return;

    // Base stats: level-scaled with empty equipment
    const emptyEquipment: EquipmentJson = { modules: [] };
    const base = computeCharStats(player.level, emptyEquipment, 'player');

    // Total stats: level-scaled + equipment bonuses
    const total = computeCharStats(player.level, inventory.equipment as EquipmentJson, 'player');

    // Equipment contribution: delta between total and base
    const equipment: CharacterStats = {
      durability: total.durability - base.durability,
      toughness: total.toughness - base.toughness,
      power: total.power - base.power,
      haste: total.haste - base.haste,
      vigor: total.vigor - base.vigor,
      recovery: total.recovery - base.recovery,
      perception: total.perception - base.perception,
      resilience: total.resilience - base.resilience,
    };

    const payload: CharStatsPayload = { total, base, equipment };
    client.emit('stats:update', payload);
  }

  /**
   * Update player's WebSocket room subscriptions to match 3x3 chunk grid.
   * Player receives entity updates from current zone and 8 adjacent zones.
   * Leaves old rooms and joins new rooms based on current position.
   */
  private updatePlayerRooms(client: Socket, playerZoneId: string): void {
    // Get current rooms (exclude socket ID default room)
    const currentRooms = Array.from(client.rooms).filter(r => r !== client.id);

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
}
