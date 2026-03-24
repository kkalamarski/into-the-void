import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Server, Socket } from 'socket.io';
import { GameService } from '../game.service';
import { PlayerService } from '../player.service';
import { ZonesService } from '../../zones/zones.service';
import { AiService } from '../ai.service';
import { QuestService } from '../quest.service';
import { HazardService } from '../hazard.service';
import { ExpeditionService } from '../expedition.service';
import {
  isHubZone,
  BiomeTier,
} from '@into-the-void/shared-types';
import { pixelToTile } from '@into-the-void/game-logic';
import { BiomeGenerator, getHubConfig } from '@into-the-void/world-gen';

@Injectable()
export class ZoneHandler {
  private server!: Server;

  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly gameService: GameService,
    private readonly playerService: PlayerService,
    private readonly zonesService: ZonesService,
    private readonly aiService: AiService,
    private readonly questService: QuestService,
    private readonly hazardService: HazardService,
    private readonly expeditionService: ExpeditionService,
  ) {}

  setServer(server: Server): void {
    this.server = server;
    // Propagate server to services owned by this handler
    this.zonesService.setServer(server);
    this.aiService.setServer(server);
    this.questService.setServer(server);
    this.expeditionService.setServer(server);
    // Wire aggro checker to ZonesService for immediate aggro on creature respawn
    this.zonesService.setAggroChecker(this.aiService);
  }

  async handleZoneRequest(
    client: Socket,
    data: { zoneId: string },
  ): Promise<void> {
    try {
      const player = this.playerService.getPlayerBySocket(client.id);
      if (!player) return;

      const zoneState = await this.gameService.getZoneState(data.zoneId);

      // IMPORTANT: Emit zone:chunk (not zone:state) — client ChunkManager listens for zone:chunk
      // zone:state is only for initial load and zone transitions via auth/portal/expedition
      client.emit('zone:chunk', {
        zoneId: data.zoneId,
        chunk: zoneState.chunk,
        biome: zoneState.biome,
        entities: zoneState.entities,
      });
    } catch (error) {
      client.emit('error', {
        code: 'ZONE_LOAD_ERROR',
        message: `Failed to load zone ${data.zoneId}`,
      });
    }
  }

  async handlePortalUse(client: Socket): Promise<void> {
    try {
      const player = this.playerService.getPlayerBySocket(client.id);
      if (!player) return;

      // In hub, portal acts as an exit back to the open world
      if (isHubZone(player.position.zoneId)) {
        return this.handleHubLeave(client);
      }

      // Validate player is standing on a portal tile (TileId.PORTAL = 16)
      const zoneState = await this.gameService.getZoneState(player.position.zoneId);
      const { tileX, tileY } = pixelToTile(player.px, player.py);
      const tileId = zoneState.chunk.tiles[tileY]?.[tileX];

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
        client.emit('zone:state', { ...newZoneState, serverTime: Date.now() });
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

  async handleHubRecall(client: Socket): Promise<void> {
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
        client.emit('zone:state', { ...newZoneState, serverTime: Date.now() });
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
    client.emit('zone:state', { ...newZoneState, serverTime: Date.now() });

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

  async handleHubLeave(client: Socket): Promise<void> {
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
        client.emit('zone:state', { ...newZoneState, serverTime: Date.now() });
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

  async handleExpeditionStart(
    client: Socket,
    data: { tier: number },
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

      // Validate tier is a valid BiomeTier (1-4)
      const tier = data.tier;
      if (!tier || tier < 1 || tier > 4 || !Number.isInteger(tier)) {
        client.emit('error', {
          code: 'EXPEDITION_FAILED',
          message: 'Invalid expedition tier',
        });
        return;
      }

      const result = await this.expeditionService.startExpeditionByTier(
        player.id,
        tier as BiomeTier,
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
        client.emit('zone:state', { ...newZoneState, serverTime: Date.now() });

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
          biome,
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

  // ─── PUBLIC HELPERS (used by gateway auth handler) ──────────────

  /**
   * Update player's WebSocket room subscriptions to match 3x3 chunk grid.
   * Player receives entity updates from current zone and 8 adjacent zones.
   * Leaves old rooms and joins new rooms based on current position.
   */
  updatePlayerRooms(client: Socket, playerZoneId: string): void {
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
   * Resolve biome for a zone ID.
   * Hub zones use hub config, world zones use BiomeGenerator.
   */
  resolveZoneBiome(zoneId: string): string {
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
   * Emit quest markers for all NPCs in a zone.
   * Called after zone:state to show ! and ? markers above NPCs.
   */
  async emitNpcQuestMarkers(
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
}
