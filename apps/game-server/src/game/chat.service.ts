import { Injectable } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { ChatMessage, ChatChannel } from '@into-the-void/shared-types';
import { isPositionVisible, DEFAULT_VISIBILITY_RANGE } from '@into-the-void/game-logic';
import { isBlocked } from '@into-the-void/database';
import { PlayerService } from './player.service';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class ChatService {
  private server: Server | null = null;

  constructor(
    private readonly playerService: PlayerService,
    private readonly databaseService: DatabaseService,
  ) {}

  setServer(server: Server): void {
    this.server = server;
  }

  async handleMessage(
    client: Socket,
    senderId: string,
    senderName: string,
    channel: ChatChannel,
    text: string,
    targetId?: string,
  ): Promise<void> {
    if (!this.server) return;

    const message: ChatMessage = {
      id: crypto.randomUUID(),
      senderId,
      senderName,
      message: text,
      channel,
      timestamp: Date.now(),
    };

    switch (channel) {
      case 'zone':
        this.sendZone(message);
        break;
      case 'global':
        this.sendGlobal(message);
        break;
      case 'faction':
        this.sendFaction(senderId, message);
        break;
      case 'local':
        this.sendLocal(senderId, message);
        break;
      case 'whisper':
        await this.sendWhisper(client, senderId, message, targetId);
        break;
    }
  }

  private sendZone(message: ChatMessage): void {
    if (!this.server) return;

    const player = this.playerService.getPlayerById(message.senderId);
    if (!player) return;

    this.server.to(player.position.zoneId).emit('chat:message', message);
  }

  private sendGlobal(message: ChatMessage): void {
    if (!this.server) return;

    this.server.emit('chat:message', message);
  }

  private sendFaction(senderId: string, message: ChatMessage): void {
    if (!this.server) return;

    const player = this.playerService.getPlayerById(senderId);
    if (!player) return;

    // Neutral players (Unaffiliated) have no faction chat room
    if (player.faction === 'neutral') return;

    this.server.to(`faction:${player.faction}`).emit('chat:message', message);
  }

  private sendLocal(senderId: string, message: ChatMessage): void {
    if (!this.server) return;

    const sender = this.playerService.getPlayerById(senderId);
    if (!sender) return;

    const playersInZone = this.playerService.getPlayersInZone(sender.position.zoneId);

    for (const otherPlayer of playersInZone) {
      if (!isPositionVisible(sender.position, otherPlayer.position, DEFAULT_VISIBILITY_RANGE)) {
        continue;
      }

      const socketId = this.playerService.getSocketByPlayerId(otherPlayer.id);
      if (socketId) {
        this.server.to(socketId).emit('chat:message', message);
      }
    }

    // The sender always sees their own local message.
    // isPositionVisible returns true for distance 0, so normally the sender is already
    // included in the loop above (getPlayersInZone includes the sender themselves).
    // We guard here in case getPlayersInZone omits the sender for any reason.
    const senderInZone = playersInZone.some((p) => p.id === senderId);
    if (!senderInZone) {
      const senderSocketId = this.playerService.getSocketByPlayerId(senderId);
      if (senderSocketId) {
        this.server.to(senderSocketId).emit('chat:message', message);
      }
    }
  }

  private async sendWhisper(
    client: Socket,
    senderId: string,
    message: ChatMessage,
    targetId?: string,
  ): Promise<void> {
    if (!this.server) return;

    if (!targetId) {
      client.emit('chat:message', {
        id: crypto.randomUUID(),
        senderId: 'system',
        senderName: 'System',
        message: 'Whisper requires a target player.',
        channel: 'system' as ChatChannel,
        timestamp: Date.now(),
      });
      return;
    }

    // Check if target is online
    const target = this.playerService.getPlayerById(targetId);
    if (!target) {
      client.emit('chat:message', {
        id: crypto.randomUUID(),
        senderId: 'system',
        senderName: 'System',
        message: 'That player is not online.',
        channel: 'system' as ChatChannel,
        timestamp: Date.now(),
      });
      return;
    }

    // Check block status: has the target blocked the sender?
    const blocked = await isBlocked(this.databaseService.getClient(), senderId, targetId);
    if (blocked) {
      client.emit('chat:message', {
        id: crypto.randomUUID(),
        senderId: 'system',
        senderName: 'System',
        message: 'That player is not accepting whispers from you.',
        channel: 'system' as ChatChannel,
        timestamp: Date.now(),
      });
      return;
    }

    const targetSocket = this.playerService.getSocketByPlayerId(targetId);
    if (!targetSocket) return;

    // Deliver to target
    this.server.to(targetSocket).emit('chat:message', message);

    // Echo back to sender so they see their own whisper
    client.emit('chat:message', message);
  }
}
