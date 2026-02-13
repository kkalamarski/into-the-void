import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Player, Position, PlayerPublic, FactionId } from '@into-the-void/shared-types';

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

  private jwtService: JwtService;

  constructor(private readonly configService: ConfigService) {
    this.jwtService = new JwtService({
      secret: configService.get<string>('JWT_SECRET', 'dev-secret-change-in-production'),
    });
  }

  async authenticate(
    socketId: string,
    token: string,
    characterId: string
  ): Promise<AuthResult> {
    try {
      // Verify JWT token
      const payload = this.jwtService.verify<{ accountId: string }>(token);

      // In a real implementation, fetch character from database
      // For now, create a mock player
      const player: ConnectedPlayer = {
        id: characterId,
        accountId: payload.accountId,
        name: `Player_${characterId.slice(0, 8)}`,
        faction: 'neutral' as FactionId,
        position: { x: 32, y: 32, zoneId: 'z_0_0' },
        health: 100,
        maxHealth: 100,
        level: 1,
        xp: 0,
        xpToNextLevel: 100,
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
