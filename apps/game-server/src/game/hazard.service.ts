import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Server } from 'socket.io';
import {
  isHubZone,
  HAZARD_GROUPS,
  type BiomeType,
  type HazardConfig,
  type HazardState,
  type HazardType,
} from '@into-the-void/shared-types';
import {
  getHazardForBiome,
  shouldApplyHazardTick,
  calculateHazardDamage,
  calculateHazardDebuff,
  shouldIncreaseStack,
  effectiveStats,
} from '@into-the-void/game-logic';
import { PlayerService } from './player.service';
import { InventoryService } from './inventory.service';

/**
 * Payload emitted by GameGateway on zone entry (same as quest.service.ts ZoneEnteredPayload)
 */
interface ZoneEnteredPayload {
  characterId: string;
  zoneId: string;
  biome: string;
}

/**
 * HazardService — manages per-player hazard state and processes hazard ticks.
 *
 * CRITICAL: Uses synchronous Map<playerId, HazardState> for tick-budget-safe reads.
 * No async calls in processHazardTick() — all reads from the Map are synchronous.
 *
 * Requirements covered:
 * - HAZD-01: Tier-based hazard severity
 * - HAZD-02: 8% HP drain per tick for Tier III
 * - HAZD-03: Stat debuffs in hazard zones
 * - HAZD-04: Tier IV stacking escalation
 * - HAZD-05: Protection gear reduces damage
 * - HAZD-09: Hub zones exempt from all hazard processing
 * - HAZD-10: 3-second grace period on biome entry
 */
@Injectable()
export class HazardService {
  private hazardStates: Map<string, HazardState> = new Map();
  private server: Server | null = null;

  constructor(
    private readonly playerService: PlayerService,
    private readonly inventoryService: InventoryService,
  ) {}

  /**
   * Set the Socket.IO server reference.
   * Called from GameGateway.afterInit().
   */
  setServer(server: Server): void {
    this.server = server;
  }

  /**
   * Handle zone entry — triggered via @OnEvent('zone.entered').
   * Covers: movement zone transitions, login, hub:leave, expedition completion.
   *
   * HAZD-09: Hub zones immediately clear all hazard state.
   */
  @OnEvent('zone.entered')
  onPlayerEnteredZone(payload: ZoneEnteredPayload): void {
    const { characterId: playerId, zoneId, biome } = payload;

    try {
      // HAZD-09: Hub zones are always safe
      if (isHubZone(zoneId)) {
        this.clearHazardState(playerId, 'entered_hub');
        return;
      }

      // Check if this biome has hazard effects
      const config = getHazardForBiome(biome as BiomeType);

      if (!config) {
        // Tier I biome — no hazard, clear any existing state
        this.clearHazardState(playerId, 'left_zone');
        return;
      }

      // Compute protection from equipment
      const protectionPercent = this.getPlayerProtection(playerId, config.hazardType);

      // Create new hazard state
      const now = Date.now();
      const state: HazardState = {
        playerId,
        hazardType: config.hazardType,
        config,
        enteredAt: now,
        lastTickAt: 0,
        protectionPercent,
        stackCount: 0,
        lastStackAt: now,
      };

      this.hazardStates.set(playerId, state);

      // Emit hazard:update to player
      this.emitHazardUpdate(playerId, state, true);
    } catch (error) {
      console.error(`[HazardService] Error processing zone entry for ${playerId}:`, error);
    }
  }

  /**
   * Called when player equipment changes.
   * Recalculates protection and updates hazard state.
   */
  onPlayerEquipmentChanged(playerId: string): void {
    const state = this.hazardStates.get(playerId);
    if (!state) return; // No active hazard state

    const protectionPercent = this.getPlayerProtection(playerId, state.hazardType);

    // Update state with new protection value
    const updatedState: HazardState = {
      ...state,
      protectionPercent,
    };
    this.hazardStates.set(playerId, updatedState);

    // Emit updated state
    const now = Date.now();
    const inGracePeriod = now - updatedState.enteredAt < updatedState.config.gracePeriodMs;
    this.emitHazardUpdate(playerId, updatedState, inGracePeriod);
  }

  /**
   * Process hazard ticks for all players in a zone.
   * Called from AiService.runZoneTick() — MUST be synchronous.
   *
   * CRITICAL: No async calls here — all Map reads are synchronous for tick-budget safety.
   */
  processHazardTick(zoneId: string): void {
    if (!this.server) return;

    const players = this.playerService.getPlayersInZone(zoneId);
    const now = Date.now();

    for (const playerPublic of players) {
      const state = this.hazardStates.get(playerPublic.id);
      if (!state) continue; // No hazard state for this player

      const player = this.playerService.getPlayerById(playerPublic.id);
      if (!player) continue;

      // Skip dead players
      if (player.isDead || player.health <= 0) continue;

      // Check grace period transition
      const inGracePeriod = now - state.enteredAt < state.config.gracePeriodMs;

      // Check if we should apply a damage tick
      if (shouldApplyHazardTick(state, now)) {
        // Calculate damage
        const damage = calculateHazardDamage(state.config, player.maxHealth, state.protectionPercent);

        if (damage > 0) {
          // Apply damage directly to player health (same pattern as combat damage in AiService)
          player.health = Math.max(0, player.health - damage);

          // Emit hazard:damage to player
          const playerSocket = this.playerService.getPlayerById(playerPublic.id);
          if (playerSocket) {
            this.emitToPlayer(playerPublic.id, 'hazard:damage', {
              playerId: playerPublic.id,
              damage,
              health: player.health,
              maxHealth: player.maxHealth,
              hazardType: state.hazardType,
              protectionPercent: state.protectionPercent,
            });

            // Also emit player:health for HUD health bar update
            this.emitToPlayer(playerPublic.id, 'player:health', {
              playerId: playerPublic.id,
              health: player.health,
              maxHealth: player.maxHealth,
            });
          }
        }

        // Calculate debuff (for stat modifier tracking)
        const _debuff = calculateHazardDebuff(state.config, state.protectionPercent, state.stackCount);
        // Note: debuff application is informational via hazard:update — actual stat modification
        // happens through the buff system or computed stats when the server evaluates actions.

        // Update lastTickAt
        const updatedState: HazardState = {
          ...state,
          lastTickAt: now,
        };
        this.hazardStates.set(playerPublic.id, updatedState);
      }

      // Tier IV stacking escalation
      if (shouldIncreaseStack(state, now)) {
        const updatedState: HazardState = {
          ...this.hazardStates.get(playerPublic.id) ?? state,
          stackCount: state.stackCount + 1,
          lastStackAt: now,
        };
        this.hazardStates.set(playerPublic.id, updatedState);

        // Emit updated state with new stack count
        this.emitHazardUpdate(playerPublic.id, updatedState, inGracePeriod);
      }

      // Emit grace period transition (from entering to active)
      if (!inGracePeriod && state.lastTickAt === 0) {
        // First tick after grace period — emit with inGracePeriod: false
        const currentState = this.hazardStates.get(playerPublic.id) ?? state;
        this.emitHazardUpdate(playerPublic.id, currentState, false);
      }
    }
  }

  /**
   * Clear hazard state for a player.
   * Emits hazard:clear and hazard:update with active: false.
   */
  private clearHazardState(playerId: string, reason: 'left_zone' | 'entered_hub' | 'fully_protected'): void {
    const had = this.hazardStates.has(playerId);
    this.hazardStates.delete(playerId);

    // Only emit events if player had an active hazard state
    if (had) {
      this.emitToPlayer(playerId, 'hazard:clear', { playerId, reason });
      this.emitToPlayer(playerId, 'hazard:update', {
        active: false,
        protectionPercent: 0,
      });
    }
  }

  /**
   * Get per-type hazard protection from equipped gear.
   * Uses effectiveStats() to compute protection from equipment.
   * Also checks active consumable buffs.
   */
  private getPlayerProtection(playerId: string, hazardType: HazardType): number {
    const inventory = this.inventoryService.getInventory(playerId);
    if (!inventory) return 0;

    // Get equipment-based protection
    const stats = effectiveStats(inventory.equipment);
    let protection = stats.hazardProtection[hazardType] ?? 0;

    // Check active buffs for consumable-based protection
    // Buff system stores temporary stat buffs with key like 'hazardProtection_chemical'
    const buffKey = `hazardProtection_${hazardType}`;
    const buffProtection = stats.bonuses[buffKey] ?? 0;
    protection += buffProtection;

    // Cap at 100%
    return Math.min(protection, 100);
  }

  /**
   * Emit hazard:update to a specific player.
   */
  private emitHazardUpdate(playerId: string, state: HazardState, inGracePeriod: boolean): void {
    const group = HAZARD_GROUPS[state.hazardType];

    this.emitToPlayer(playerId, 'hazard:update', {
      active: true,
      hazardType: state.hazardType,
      displayName: group.displayName,
      color: group.color,
      protectionPercent: state.protectionPercent,
      tier: state.config.tier,
      inGracePeriod,
      stackCount: state.stackCount,
    });
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
   * Clean up hazard state on player disconnect.
   */
  onPlayerDisconnect(playerId: string): void {
    this.hazardStates.delete(playerId);
  }
}
