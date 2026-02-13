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
} from '@into-the-void/shared-types';

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  },
})
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly gameService: GameService,
    private readonly playerService: PlayerService
  ) {}

  async handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
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
        client.emit('auth:error', { error: result.error });
      }
    } catch (error) {
      client.emit('auth:error', { error: 'Authentication failed' });
    }
  }

  @SubscribeMessage('player:move')
  async handleMove(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: ClientEvents['player:move']
  ) {
    try {
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
          });
        }
      } else {
        client.emit('error', {
          code: 'MOVEMENT_BLOCKED',
          message: result.error || 'Movement blocked',
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
}
