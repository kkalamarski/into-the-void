import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { GameService } from './game.service';
import { PlayerService } from './player.service';
import {
  ClientEvents,
  Direction,
  AuthRequest,
  getErrorInfo,
} from '@into-the-void/shared-types';

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
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly gameService: GameService,
    private readonly playerService: PlayerService
  ) {}

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
    await this.playerService.handleDisconnect(client.id);
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
        // Join player to their zone room
        client.join(result.player.position.zoneId);

        // Send initial zone state
        const zoneState = await this.gameService.getZoneState(
          result.player.position.zoneId
        );

        client.emit('auth:success', { player: result.player });
        client.emit('zone:state', zoneState);

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

      // Rate limit: minimum 140ms between moves (150ms client delay - 10ms tolerance)
      if (now - lastMoveTime < 140) {
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
          // Zone transition
          client.leave(result.oldZoneId);
          client.join(result.newZoneId);

          // Notify old zone
          this.server.to(result.oldZoneId).emit('player:left', {
            playerId: result.playerId,
          });

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
    try {
      const player = this.playerService.getPlayerBySocket(client.id);
      if (!player) return;

      // Get chunk data for requested zone
      const zoneState = await this.gameService.getZoneState(data.zoneId);

      // Send only chunk and biome (not players/entities for adjacent zones)
      client.emit('zone:chunk', {
        chunk: zoneState.chunk,
        biome: zoneState.biome,
      });
    } catch (error) {
      console.error(`Failed to load zone ${data.zoneId}:`, error);
      client.emit('error', {
        code: 'ZONE_LOAD_ERROR',
        message: `Failed to load zone ${data.zoneId}`,
      });
    }
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
