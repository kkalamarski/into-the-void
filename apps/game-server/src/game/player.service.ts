import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Server } from 'socket.io';
import { Player, Position, PlayerPublic, FactionId, ZoneState } from '@into-the-void/shared-types';
import { DatabaseService } from '../database/database.service';
import { findCharacterById, isCharacterOwnedByAccount, updateLastPlayed, saveLastWorldPosition, getLastWorldPosition, updateCharacterPosition } from '@into-the-void/database';
import { isHubZone } from '@into-the-void/shared-types';
import { InventoryService } from './inventory.service';
import { getFactionRespawnPosition } from '@into-the-void/game-logic';

const RESPAWN_DELAY_MS = 3000; // 3 seconds

interface ConnectedPlayer extends Player {
  socketId: string;
  lastWorldPosition?: Position;
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
  private lastMoveTimes: Map<string, number> = new Map(); // playerId -> timestamp
  private respawnTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private server: Server | null = null;
  private zoneStateProvider: ((zoneId: string) => Promise<ZoneState>) | null = null;

  setServer(server: Server): void {
    this.server = server;
  }

  setZoneStateProvider(provider: (zoneId: string) => Promise<ZoneState>): void {
    this.zoneStateProvider = provider;
  }

  constructor(
    private readonly jwtService: JwtService,
    private readonly databaseService: DatabaseService,
    private readonly inventoryService: InventoryService,
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
        energy: 100, // Default energy until database schema is updated
        maxEnergy: 100,
        level: character.level,
        xp: character.xp,
        xpToNextLevel: character.level * 100,
        inCombat: false,
        online: true,
        credits: character.credits,
        socketId,
      };

      // Restore last open-world position if character has one
      if (character.lastWorldPosition) {
        player.lastWorldPosition = character.lastWorldPosition;
      }

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
      // Clear any pending respawn timer
      const respawnTimer = this.respawnTimers.get(playerId);
      if (respawnTimer) {
        clearTimeout(respawnTimer);
        this.respawnTimers.delete(playerId);
      }

      // Flush inventory to DB before removing player
      await this.inventoryService.flushAndUnload(playerId);

      // Save current position to database
      const player = this.players.get(playerId);
      if (player) {
        await updateCharacterPosition(
          this.databaseService.getClient(),
          playerId,
          player.position
        );
        player.online = false;
      }
      this.players.delete(playerId);
      this.socketToPlayer.delete(socketId);
      this.lastMoveTimes.delete(playerId);
    }
  }

  /**
   * Schedule player respawn after RESPAWN_DELAY_MS.
   * Called when player dies.
   */
  scheduleRespawn(playerId: string): void {
    // Clear any existing respawn timer
    const existing = this.respawnTimers.get(playerId);
    if (existing) {
      clearTimeout(existing);
    }

    const timer = setTimeout(() => {
      this.respawnTimers.delete(playerId);
      this.respawnPlayer(playerId);
    }, RESPAWN_DELAY_MS);

    this.respawnTimers.set(playerId, timer);
  }

  /**
   * Respawn player at their faction hub (S.O.S. extraction).
   * Restores full health, clears death state, teleports to hub.
   */
  async respawnWithSOS(playerId: string): Promise<void> {
    const player = this.players.get(playerId);
    if (!player) return;

    // Get faction respawn position
    const respawnPos = getFactionRespawnPosition(player.faction);

    // Store old zone for leave notification
    const oldZoneId = player.position.zoneId;

    // Update player state - full health
    player.health = player.maxHealth;
    player.isDead = false;
    player.position = respawnPos;

    // Emit player:respawn to player socket
    if (this.server) {
      this.server.to(player.socketId).emit('player:respawn', {
        playerId,
        position: respawnPos,
        health: player.health,
        maxHealth: player.maxHealth,
      });

      // Emit zone:state to player if zone changed (mirrors handleAuth pattern)
      if (oldZoneId !== respawnPos.zoneId && this.zoneStateProvider) {
        const zoneState = await this.zoneStateProvider(respawnPos.zoneId);
        this.server.to(player.socketId).emit('zone:state', zoneState);
      }

      // Notify old zone that player left (if different from new zone)
      if (oldZoneId !== respawnPos.zoneId) {
        this.server.to(oldZoneId).emit('player:left', { playerId });
      }

      // Notify new zone that player respawned
      this.server.to(respawnPos.zoneId).emit('player:respawn', {
        playerId,
        position: respawnPos,
        health: player.health,
        maxHealth: player.maxHealth,
      });
    }
  }

  /**
   * Respawn player at their death position using Emergency Reboot Kit.
   * Restores partial health based on kit quality, clears death state.
   */
  async respawnWithReboot(playerId: string, healPercent: number): Promise<void> {
    const player = this.players.get(playerId);
    if (!player) return;

    // Calculate restored health (percentage of max)
    const restoredHealth = Math.floor(player.maxHealth * (healPercent / 100));

    // Update player state - partial health, same position
    player.health = restoredHealth;
    player.isDead = false;
    // Position stays the same (revive in place)

    // Emit player:respawn to player socket
    if (this.server) {
      this.server.to(player.socketId).emit('player:respawn', {
        playerId,
        position: player.position,
        health: player.health,
        maxHealth: player.maxHealth,
      });

      // Notify zone that player respawned (in same zone)
      this.server.to(player.position.zoneId).emit('player:respawn', {
        playerId,
        position: player.position,
        health: player.health,
        maxHealth: player.maxHealth,
      });
    }
  }

  /**
   * Legacy respawn method - used by scheduleRespawn for auto-respawn.
   * Kept for backwards compatibility but scheduleRespawn is no longer called on death.
   */
  private async respawnPlayer(playerId: string): Promise<void> {
    await this.respawnWithSOS(playerId);
  }

  /**
   * Teleport player to their faction hub, saving their current open-world position for return.
   * Rejects if player is already in a hub zone.
   */
  async teleportToHub(playerId: string): Promise<{
    success: boolean;
    error?: string;
    oldZoneId?: string;
    newZoneId?: string;
  }> {
    const player = this.players.get(playerId);
    if (!player) return { success: false, error: 'Player not found' };

    // Already in a hub — reject
    if (isHubZone(player.position.zoneId)) {
      return { success: false, error: 'Already in hub' };
    }

    // Determine faction hub position
    const hubPosition = getFactionRespawnPosition(player.faction);
    const oldZoneId = player.position.zoneId;

    // Save current open-world position (in-memory and DB)
    player.lastWorldPosition = { ...player.position };
    const db = this.databaseService.getClient();
    await saveLastWorldPosition(db, playerId, {
      x: player.position.x,
      y: player.position.y,
      zoneId: player.position.zoneId,
    });

    // Teleport to hub
    player.position = hubPosition;

    return {
      success: true,
      oldZoneId,
      newZoneId: hubPosition.zoneId,
    };
  }

  /**
   * Teleport player from their faction hub back to their saved open-world position.
   * Rejects if player is not in a hub zone.
   * Falls back to DB-persisted position, then z_0_0 center if nothing is saved.
   */
  async teleportFromHub(playerId: string): Promise<{
    success: boolean;
    error?: string;
    oldZoneId?: string;
    newZoneId?: string;
  }> {
    const player = this.players.get(playerId);
    if (!player) return { success: false, error: 'Player not found' };

    // Must be in hub
    if (!isHubZone(player.position.zoneId)) {
      return { success: false, error: 'Not in hub' };
    }

    // Get saved world position (in-memory first, then DB fallback)
    let returnPosition = player.lastWorldPosition;
    if (!returnPosition) {
      const db = this.databaseService.getClient();
      const dbPosition = await getLastWorldPosition(db, playerId);
      if (dbPosition) {
        returnPosition = dbPosition;
      }
    }

    // If no saved position, default to open world origin
    if (!returnPosition) {
      returnPosition = { x: 32, y: 32, zoneId: 'z_0_0' };
    }

    const oldZoneId = player.position.zoneId;

    // Clear saved position (it has been consumed)
    player.lastWorldPosition = undefined;
    const db = this.databaseService.getClient();
    await saveLastWorldPosition(db, playerId, null);

    // Teleport to open world
    player.position = { ...returnPosition };

    return {
      success: true,
      oldZoneId,
      newZoneId: returnPosition.zoneId,
    };
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
          credits: player.credits,
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

  /**
   * Update player health (called by CombatService when creature deals damage).
   */
  updateHealth(playerId: string, health: number): void {
    const player = this.players.get(playerId);
    if (player) {
      player.health = health;
    }
  }

  /**
   * Set or clear player dead state (called by CombatService on player death/respawn).
   */
  setDead(playerId: string, isDead: boolean): void {
    const player = this.players.get(playerId);
    if (player) {
      player.isDead = isDead;
    }
  }

  /**
   * Returns true if player is currently in dead state.
   */
  isDead(playerId: string): boolean {
    const player = this.players.get(playerId);
    return player?.isDead === true;
  }

  getAllOnlinePlayers(): ConnectedPlayer[] {
    return Array.from(this.players.values()).filter((p) => p.online);
  }

  getOnlinePlayerCount(): number {
    return this.getAllOnlinePlayers().length;
  }

  getLastMoveTime(playerId: string): number {
    return this.lastMoveTimes.get(playerId) || 0;
  }

  setLastMoveTime(playerId: string, timestamp: number): void {
    this.lastMoveTimes.set(playerId, timestamp);
  }
}
