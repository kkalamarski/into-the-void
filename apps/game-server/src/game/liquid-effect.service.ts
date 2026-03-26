import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';
import {
  type LiquidEffectState,
  type Creature,
} from '@into-the-void/shared-types';
import { TileRegistry, type LiquidEffect } from '@into-the-void/tiles';
import { TILE_SIZE_PX } from '@into-the-void/game-logic';
import { PlayerService } from './player.service';
import { ZonesService } from '../zones/zones.service';

/**
 * Tick interval for liquid damage/heal effects in milliseconds.
 * Every 2 seconds, entities in liquid receive damage or healing.
 */
const LIQUID_TICK_INTERVAL_MS = 2000;

/**
 * LiquidEffectService — manages per-entity liquid tile effects.
 *
 * Tracks which players and creatures are standing in liquid tiles
 * and applies movement slow, periodic damage, and periodic healing.
 *
 * Pattern follows HazardService:
 * - Synchronous Map<entityId, LiquidEffectState> for tick-budget-safe reads
 * - processLiquidTick() called from AiService.runZoneTick()
 * - setServer() called from GameGateway.afterInit()
 *
 * Requirements covered:
 * - FX-01: Movement slow via speedMultiplier
 * - FX-02: Periodic damage for damaging liquids
 * - FX-03: Periodic healing for healing liquids
 * - FX-04: Creatures receive same effects as players
 * - FX-05: Effects start immediately, stop within one tick of leaving
 */
@Injectable()
export class LiquidEffectService {
  private liquidStates: Map<string, LiquidEffectState> = new Map();
  private server: Server | null = null;

  constructor(
    private readonly playerService: PlayerService,
    private readonly zonesService: ZonesService,
  ) {}

  /**
   * Set the Socket.IO server reference.
   * Called from GameGateway.afterInit().
   */
  setServer(server: Server): void {
    this.server = server;
  }

  /**
   * Get the active speed multiplier for an entity.
   * Returns the liquid's speedMultiplier if entity is in liquid, or 1.0 otherwise.
   * Used by MovementService to slow player movement in liquid.
   */
  getSpeedMultiplier(entityId: string): number {
    const state = this.liquidStates.get(entityId);
    return state ? state.speedMultiplier : 1.0;
  }

  /**
   * Process liquid effects for all players and creatures in a zone.
   * Called from AiService.runZoneTick() — uses synchronous reads only.
   *
   * @param zoneId - Zone to process
   * @param creatures - Pre-fetched creatures array from AiService (avoids async call)
   */
  processLiquidTick(zoneId: string, creatures: Creature[]): void {
    if (!this.server) return;

    const chunk = this.zonesService.getChunkSync(zoneId);
    if (!chunk) return;

    const liquidTiles = chunk.liquidTiles;
    if (!liquidTiles) return; // No liquid overlay in this zone

    const now = Date.now();

    // Process players
    this.processPlayerLiquidEffects(zoneId, liquidTiles, now);

    // Process creatures
    this.processCreatureLiquidEffects(creatures, liquidTiles, now);
  }

  /**
   * Process liquid effects for all players in a zone.
   */
  private processPlayerLiquidEffects(
    zoneId: string,
    liquidTiles: (string | null)[][],
    now: number,
  ): void {
    const players = this.playerService.getPlayersInZone(zoneId);

    for (const playerPublic of players) {
      const player = this.playerService.getPlayerById(playerPublic.id);
      if (!player) continue;
      if (player.isDead || player.health <= 0) continue;

      // Convert pixel position to tile coordinates
      const tileX = Math.floor(player.px / TILE_SIZE_PX);
      const tileY = Math.floor(player.py / TILE_SIZE_PX);

      // Look up liquid tile at player position
      const liquidTileId = liquidTiles[tileY]?.[tileX] ?? null;

      if (liquidTileId) {
        this.applyPlayerLiquidEffect(player, liquidTileId, now);
      } else {
        // Player left liquid — clear state
        this.clearEntityState(player.id, true);
      }
    }
  }

  /**
   * Apply liquid effect to a player on a liquid tile.
   */
  private applyPlayerLiquidEffect(
    player: { id: string; health: number; maxHealth: number; socketId: string },
    liquidTileId: string,
    now: number,
  ): void {
    const tileDef = TileRegistry.get(liquidTileId);
    const liquidEffect = tileDef.liquidEffect;
    if (!liquidEffect) return;

    const existingState = this.liquidStates.get(player.id);

    if (!existingState || existingState.liquidTileId !== liquidTileId) {
      // New liquid entry or changed liquid type
      const newState: LiquidEffectState = {
        entityId: player.id,
        liquidTileId,
        displayName: tileDef.displayName,
        speedMultiplier: liquidEffect.speedMultiplier,
        damagePerTick: liquidEffect.damagePerTick,
        healPerTick: liquidEffect.healPerTick,
        enteredAt: now,
        lastTickAt: 0,
        color: tileDef.color,
      };
      this.liquidStates.set(player.id, newState);

      // Emit liquid:update on entry
      this.emitToPlayer(player.id, 'liquid:update', {
        active: true,
        liquidTileId,
        displayName: tileDef.displayName,
        color: tileDef.color,
        speedMultiplier: liquidEffect.speedMultiplier,
        damagePerTick: liquidEffect.damagePerTick,
        healPerTick: liquidEffect.healPerTick,
      });
      return;
    }

    // Existing state — check if tick interval elapsed
    if (now - existingState.lastTickAt < LIQUID_TICK_INTERVAL_MS) return;

    // Apply damage
    if (liquidEffect.damagePerTick > 0) {
      player.health = Math.max(0, player.health - liquidEffect.damagePerTick);

      this.emitToPlayer(player.id, 'liquid:damage', {
        playerId: player.id,
        damage: liquidEffect.damagePerTick,
        health: player.health,
        maxHealth: player.maxHealth,
        liquidTileId,
      });

      // Also emit player:health for HUD health bar update
      this.emitToPlayer(player.id, 'player:health', {
        playerId: player.id,
        health: player.health,
        maxHealth: player.maxHealth,
      });
    }

    // Apply healing
    if (liquidEffect.healPerTick > 0) {
      const previousHealth = player.health;
      player.health = Math.min(player.maxHealth, player.health + liquidEffect.healPerTick);
      const actualHeal = player.health - previousHealth;

      if (actualHeal > 0) {
        this.emitToPlayer(player.id, 'liquid:heal', {
          playerId: player.id,
          heal: actualHeal,
          health: player.health,
          maxHealth: player.maxHealth,
          liquidTileId,
        });

        // Also emit player:health for HUD health bar update
        this.emitToPlayer(player.id, 'player:health', {
          playerId: player.id,
          health: player.health,
          maxHealth: player.maxHealth,
        });
      }
    }

    // Update lastTickAt
    const updatedState: LiquidEffectState = {
      ...existingState,
      lastTickAt: now,
    };
    this.liquidStates.set(player.id, updatedState);
  }

  /**
   * Process liquid effects for creatures in a zone.
   * Creatures use tile-based position (x, y), not pixel-based.
   */
  private processCreatureLiquidEffects(
    creatures: Creature[],
    liquidTiles: (string | null)[][],
    now: number,
  ): void {
    for (const creature of creatures) {
      if (creature.health <= 0) continue;

      // Creatures use tile coordinates directly
      const tileX = creature.position.x;
      const tileY = creature.position.y;

      const liquidTileId = liquidTiles[tileY]?.[tileX] ?? null;

      if (liquidTileId) {
        this.applyCreatureLiquidEffect(creature, liquidTileId, now);
      } else {
        // Creature left liquid — clear state
        this.clearEntityState(creature.id, false);
      }
    }
  }

  /**
   * Apply liquid effect to a creature on a liquid tile.
   */
  private applyCreatureLiquidEffect(
    creature: Creature,
    liquidTileId: string,
    now: number,
  ): void {
    const tileDef = TileRegistry.get(liquidTileId);
    const liquidEffect = tileDef.liquidEffect;
    if (!liquidEffect) return;

    const existingState = this.liquidStates.get(creature.id);

    if (!existingState || existingState.liquidTileId !== liquidTileId) {
      // New liquid entry
      const newState: LiquidEffectState = {
        entityId: creature.id,
        liquidTileId,
        displayName: tileDef.displayName,
        speedMultiplier: liquidEffect.speedMultiplier,
        damagePerTick: liquidEffect.damagePerTick,
        healPerTick: liquidEffect.healPerTick,
        enteredAt: now,
        lastTickAt: 0,
        color: tileDef.color,
      };
      this.liquidStates.set(creature.id, newState);
      return;
    }

    // Check tick interval
    if (now - existingState.lastTickAt < LIQUID_TICK_INTERVAL_MS) return;

    // Apply damage to creature
    if (liquidEffect.damagePerTick > 0) {
      creature.health = Math.max(0, creature.health - liquidEffect.damagePerTick);
    }

    // Apply healing to creature
    if (liquidEffect.healPerTick > 0) {
      creature.health = Math.min(creature.maxHealth, creature.health + liquidEffect.healPerTick);
    }

    // Update lastTickAt
    const updatedState: LiquidEffectState = {
      ...existingState,
      lastTickAt: now,
    };
    this.liquidStates.set(creature.id, updatedState);
  }

  /**
   * Clear liquid effect state for an entity.
   * Emits liquid:update with active: false to players.
   */
  private clearEntityState(entityId: string, isPlayer: boolean): void {
    const had = this.liquidStates.has(entityId);
    this.liquidStates.delete(entityId);

    if (had && isPlayer) {
      this.emitToPlayer(entityId, 'liquid:update', {
        active: false,
      });
    }
  }

  /**
   * Emit an event to a specific player's socket.
   */
  private emitToPlayer(playerId: string, event: string, data: unknown): void {
    if (!this.server) return;

    const player = this.playerService.getPlayerById(playerId);
    if (!player) return;

    const socketId = (player as { socketId?: string }).socketId;
    if (socketId) {
      this.server.to(socketId).emit(event, data);
    }
  }

  /**
   * Clear liquid state for a player (zone transition or disconnect).
   * Emits liquid:update with active: false so the client clears the UI.
   */
  clearPlayerState(playerId: string): void {
    this.clearEntityState(playerId, true);
  }

  /**
   * Clean up liquid state on player disconnect.
   */
  onPlayerDisconnect(playerId: string): void {
    this.liquidStates.delete(playerId);
  }
}
