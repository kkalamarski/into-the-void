import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Player, Position, PlayerPublic, FactionId } from '@into-the-void/shared-types';
import { DatabaseService } from '../database/database.service';
import { findCharacterById, isCharacterOwnedByAccount, updateLastPlayed } from '@into-the-void/database';

interface ConnectedPlayer extends Player {
  socketId: string;
}

interface AuthResult {
  success: boolean;
  player?: Player;
  error?: string;
}

@Injectable()
export class PlayerService {
  private players: Map<string, ConnectedPlayer> = new Map(); // playerId -> player
  private socketToPlayer: Map<string, string> = new Map(); // socketId -> playerId

  constructor(
    private readonly jwtService: JwtService,
    private readonly databaseService: DatabaseService
  ) {}

  async authenticate(
    socketId: string,
    token: string,
    characterId: string
  ): Promise<AuthResult> {
    try {
      // Verify JWT token
      const payload = this.jwtService.verify<{ accountId: string }>(token);
      const db = this.databaseService.getClient();

      // Verify character ownership
      const isOwned = await isCharacterOwnedByAccount(db, characterId, payload.accountId);
      if (!isOwned) {
        return { success: false, error: 'Character not found or not owned by account' };
      }

      // Fetch character from database
      const character = await findCharacterById(db, characterId);
      if (!character) {
        return { success: false, error: 'Character not found' };
      }

      // Update last played timestamp
      await updateLastPlayed(db, characterId);

      // Create connected player from character data
      const player: ConnectedPlayer = {
        id: character.id,
        accountId: character.accountId,
        name: character.name,
        faction: character.factionId as FactionId,
        position: character.position,
        health: character.health,
        maxHealth: character.maxHealth,
        level: character.level,
        xp: character.xp,
        xpToNextLevel: character.level * 100,
        inCombat: false,
        online: true,
        socketId,
      };

      // Store player
      this.players.set(player.id, player);
      this.socketToPlayer.set(socketId, player.id);

      return { success: true, player };
    } catch (error) {
      return { success: false, error: 'Invalid token' };
    }
  }

  async handleDisconnect(socketId: string): Promise<void> {
    const playerId = this.socketToPlayer.get(socketId);
    if (playerId) {
      const player = this.players.get(playerId);
      if (player) {
        // In a real implementation, save player state to database
        player.online = false;
      }
      this.players.delete(playerId);
      this.socketToPlayer.delete(socketId);
    }
  }

  getPlayerBySocket(socketId: string): ConnectedPlayer | undefined {
    const playerId = this.socketToPlayer.get(socketId);
    return playerId ? this.players.get(playerId) : undefined;
  }

  getPlayerById(playerId: string): ConnectedPlayer | undefined {
    return this.players.get(playerId);
  }

  getSocketByPlayerId(playerId: string): string | undefined {
    const player = this.players.get(playerId);
    return player?.socketId;
  }

  isAuthenticated(socketId: string): boolean {
    return this.socketToPlayer.has(socketId);
  }

  getPlayersInZone(zoneId: string): PlayerPublic[] {
    const players: PlayerPublic[] = [];
    for (const player of this.players.values()) {
      if (player.position.zoneId === zoneId && player.online) {
        players.push({
          id: player.id,
          name: player.name,
          faction: player.faction,
          position: player.position,
          level: player.level,
          inCombat: player.inCombat,
        });
      }
    }
    return players;
  }

  updatePosition(playerId: string, position: Position): void {
    const player = this.players.get(playerId);
    if (player) {
      player.position = position;
    }
  }

  setInCombat(playerId: string, inCombat: boolean): void {
    const player = this.players.get(playerId);
    if (player) {
      player.inCombat = inCombat;
    }
  }

  getAllOnlinePlayers(): ConnectedPlayer[] {
    return Array.from(this.players.values()).filter((p) => p.online);
  }

  getOnlinePlayerCount(): number {
    return this.getAllOnlinePlayers().length;
  }
}
