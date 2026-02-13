import { Injectable } from '@nestjs/common';
import { PlayerService } from './player.service';
import { ZonesService } from '../zones/zones.service';
import {
  Direction,
  Position,
  ZoneState,
  PlayerPublic,
  Entity,
} from '@into-the-void/shared-types';
import {
  calculateNewPosition,
  validateMovement,
  isZoneTransition,
} from '@into-the-void/game-logic';

interface MoveResult {
  success: boolean;
  error?: string;
  playerId?: string;
  position?: Position;
  zoneId?: string;
  oldZoneId?: string;
  newZoneId?: string;
  playerPublic?: PlayerPublic;
}

interface InteractionResult {
  success: boolean;
  error?: string;
  zoneId?: string;
  entityChanges?: Partial<Entity>;
}

@Injectable()
export class GameService {
  constructor(
    private readonly playerService: PlayerService,
    private readonly zonesService: ZonesService
  ) {}

  async getZoneState(zoneId: string): Promise<ZoneState> {
    const entities = await this.zonesService.getZoneEntities(zoneId);
    const players = this.playerService.getPlayersInZone(zoneId);

    return {
      zoneId,
      entities,
      players,
      lastUpdate: Date.now(),
    };
  }

  async movePlayer(socketId: string, direction: Direction): Promise<MoveResult> {
    const player = this.playerService.getPlayerBySocket(socketId);
    if (!player) {
      return { success: false, error: 'Player not found' };
    }

    // Calculate new position
    const newPosition = calculateNewPosition(player.position, direction);

    // Get collision map for zone
    const chunk = await this.zonesService.getChunk(newPosition.zoneId);

    // Validate movement
    const validation = validateMovement(
      player.position,
      newPosition,
      chunk.collisions
    );

    if (!validation.valid) {
      return { success: false, error: validation.reason };
    }

    // Check for zone transition
    const zoneChanged = isZoneTransition(player.position, newPosition);

    // Update player position
    const oldZoneId = player.position.zoneId;
    this.playerService.updatePosition(player.id, newPosition);

    if (zoneChanged) {
      return {
        success: true,
        playerId: player.id,
        position: newPosition,
        oldZoneId,
        newZoneId: newPosition.zoneId,
        playerPublic: {
          id: player.id,
          name: player.name,
          faction: player.faction,
          position: newPosition,
          level: player.level,
          inCombat: player.inCombat,
        },
      };
    }

    return {
      success: true,
      playerId: player.id,
      position: newPosition,
      zoneId: newPosition.zoneId,
    };
  }

  async handleInteraction(
    socketId: string,
    targetId: string
  ): Promise<InteractionResult> {
    const player = this.playerService.getPlayerBySocket(socketId);
    if (!player) {
      return { success: false, error: 'Player not found' };
    }

    const entity = await this.zonesService.getEntity(
      player.position.zoneId,
      targetId
    );
    if (!entity) {
      return { success: false, error: 'Entity not found' };
    }

    // Basic interaction handling - extend based on entity type
    switch (entity.type) {
      case 'mineral':
        // Handle harvesting
        return {
          success: true,
          zoneId: player.position.zoneId,
          entityChanges: { active: false },
        };

      case 'item':
        // Handle pickup
        return {
          success: true,
          zoneId: player.position.zoneId,
          entityChanges: { active: false },
        };

      case 'creature':
        // Initiate combat (simplified)
        this.playerService.setInCombat(player.id, true);
        return {
          success: true,
          zoneId: player.position.zoneId,
        };

      default:
        return { success: false, error: 'Cannot interact with this entity' };
    }
  }
}
