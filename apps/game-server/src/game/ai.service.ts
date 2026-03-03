import { Injectable, OnModuleInit } from '@nestjs/common';
import { Creature, PlayerPublic, isHubZone } from '@into-the-void/shared-types';
import { tickCreatureAI, computeCharStats } from '@into-the-void/game-logic';
import type { EquipmentJson } from '@into-the-void/database';
import { Server } from 'socket.io';
import { ZonesService } from '../zones/zones.service';
import { PlayerService } from './player.service';
import { CombatService } from './combat.service';
import { InventoryService } from './inventory.service';

/**
 * CRAI-09: Type-enforced whitelist for creature broadcasts.
 * Only position is broadcast — no AI internal state (FSM state, wander target, aggro flag).
 */
interface PublicCreatureUpdate {
  entityId: string;
  changes: { position: { x: number; y: number; zoneId: string } };
}

const AI_TICK_INTERVAL_MS = 1000; // Creatures move at half player speed
const AI_TICK_WARN_MS = 200; // Log warning if tick processing exceeds this threshold

// Regen scaling: 1% base, scales with Vigor up to 5% max
const REGEN_BASE_PERCENT = 0.01; // 1% base regen per second
const REGEN_MAX_PERCENT = 0.05; // 5% max regen per second
const VIGOR_MIN = 50; // Vigor value at which regen starts scaling
const VIGOR_MAX = 250; // Vigor value at which regen reaches maximum

@Injectable()
export class AiService implements OnModuleInit {
  private activeZones: Set<string> = new Set();
  private tickTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private server: Server | null = null;

  constructor(
    private readonly zonesService: ZonesService,
    private readonly playerService: PlayerService,
    private readonly combatService: CombatService,
    private readonly inventoryService: InventoryService,
  ) {}

  onModuleInit(): void {
    // Zones activate when players join — no active zones at startup
  }

  /**
   * Set the Socket.IO server reference.
   * Called by GameGateway.afterInit().
   */
  setServer(server: Server): void {
    this.server = server;
  }

  /**
   * Activate AI tick loop for a zone.
   * Called when the first player joins a zone.
   */
  activateZone(zoneId: string): void {
    // Hub zones have no AI - they're safe areas with no creatures
    if (isHubZone(zoneId)) {
      console.log(`[AiService] Skipping hub zone: ${zoneId}`);
      return;
    }

    if (this.activeZones.has(zoneId)) {
      // Zone already active — guard against duplicate timers
      console.log(`[AiService] Zone already active: ${zoneId}`);
      return;
    }
    console.log(`[AiService] Activating zone: ${zoneId}`);
    this.activeZones.add(zoneId);

    // Immediate aggro check for already-present aggressive creatures
    this.checkImmediateAggro(zoneId);

    this.scheduleNextTick(zoneId);
  }

  /**
   * Check if a zone has an active AI tick loop.
   */
  isZoneActive(zoneId: string): boolean {
    return this.activeZones.has(zoneId);
  }

  /**
   * Immediately check and trigger aggro for all aggressive creatures in a zone.
   * Called when a player joins a zone or entities respawn.
   * This ensures predators/maniacs aggro without waiting for the next tick.
   */
  async checkImmediateAggro(zoneId: string): Promise<void> {
    if (isHubZone(zoneId)) {
      return;
    }

    // Get all entities in the zone
    const entities = await this.zonesService.getZoneEntities(zoneId);
    console.log(`[AiService] checkImmediateAggro: ${zoneId} has ${entities.length} entities`);

    // Filter to active aggressive creatures (predator/maniac) not already in combat
    const aggressiveCreatures = entities.filter(
      (e): e is Creature =>
        e.type === 'creature' &&
        e.active &&
        (e as Creature).health > 0 &&
        ((e as Creature).behavior === 'predator' || (e as Creature).behavior === 'maniac') &&
        !this.combatService.isCreatureInCombat(e.id) &&
        !(e as Creature).combatTarget,
    );

    console.log(`[AiService] Found ${aggressiveCreatures.length} aggressive creatures in ${zoneId}`);

    if (aggressiveCreatures.length === 0) return;

    // Get players in zone
    const players = this.playerService.getPlayersInZone(zoneId);
    if (players.length === 0) return;

    const AGGRO_RADIUS = 5;

    // Check each aggressive creature for nearby players
    for (const creature of aggressiveCreatures) {
      // Find closest player within aggro radius
      let closestPlayer: PlayerPublic | null = null;
      let closestDist = Infinity;

      for (const player of players) {
        const dist = Math.max(
          Math.abs(creature.position.x - player.position.x),
          Math.abs(creature.position.y - player.position.y),
        );

        if (dist <= AGGRO_RADIUS && dist < closestDist) {
          closestDist = dist;
          closestPlayer = player;
        }
      }

      if (closestPlayer) {
        // Trigger aggro immediately
        await this.combatService.startCreatureCombat(
          creature.id,
          closestPlayer.id,
          zoneId,
        );

        // Update creature's combatTarget
        await this.zonesService.updateEntity(zoneId, creature.id, {
          combatTarget: closestPlayer.id,
        } as Partial<Creature>);
      }
    }
  }

  /**
   * Check aggro specifically for a newly-joined player.
   * More efficient than full zone scan — only checks creatures near this player.
   */
  async checkImmediateAggroForPlayer(zoneId: string, playerId: string): Promise<void> {
    if (isHubZone(zoneId)) {
      return;
    }

    const player = this.playerService.getPlayerById(playerId);
    if (!player || player.position.zoneId !== zoneId) return;

    const entities = await this.zonesService.getZoneEntities(zoneId);
    const AGGRO_RADIUS = 5;

    // Find aggressive creatures near this specific player
    const aggressiveCreatures = entities.filter(
      (e): e is Creature =>
        e.type === 'creature' &&
        e.active &&
        (e as Creature).health > 0 &&
        ((e as Creature).behavior === 'predator' || (e as Creature).behavior === 'maniac') &&
        !this.combatService.isCreatureInCombat(e.id) &&
        !(e as Creature).combatTarget,
    );

    for (const creature of aggressiveCreatures) {
      const dist = Math.max(
        Math.abs(creature.position.x - player.position.x),
        Math.abs(creature.position.y - player.position.y),
      );

      if (dist <= AGGRO_RADIUS) {
        await this.combatService.startCreatureCombat(creature.id, playerId, zoneId);
        await this.zonesService.updateEntity(zoneId, creature.id, {
          combatTarget: playerId,
        } as Partial<Creature>);
      }
    }
  }

  /**
   * Check if a newly spawned/respawned creature should immediately aggro.
   * Called by the respawn tick loop when a creature materializes.
   */
  async checkCreatureAggro(creature: Creature, zoneId: string): Promise<void> {
    if (isHubZone(zoneId)) {
      return;
    }

    // Only aggressive creatures
    if (creature.behavior !== 'predator' && creature.behavior !== 'maniac') return;

    // Already in combat?
    if (this.combatService.isCreatureInCombat(creature.id) || creature.combatTarget) return;

    // Zone must be active (has players)
    if (!this.activeZones.has(zoneId)) return;

    const players = this.playerService.getPlayersInZone(zoneId);
    if (players.length === 0) return;

    const AGGRO_RADIUS = 5;

    // Find closest player within aggro radius
    let closestPlayer: PlayerPublic | null = null;
    let closestDist = Infinity;

    for (const player of players) {
      const dist = Math.max(
        Math.abs(creature.position.x - player.position.x),
        Math.abs(creature.position.y - player.position.y),
      );

      if (dist <= AGGRO_RADIUS && dist < closestDist) {
        closestDist = dist;
        closestPlayer = player;
      }
    }

    if (closestPlayer) {
      await this.combatService.startCreatureCombat(creature.id, closestPlayer.id, zoneId);
      await this.zonesService.updateEntity(zoneId, creature.id, {
        combatTarget: closestPlayer.id,
      } as Partial<Creature>);
    }
  }

  /**
   * Deactivate AI tick loop for a zone.
   * Called when the last player leaves a zone.
   */
  deactivateZone(zoneId: string): void {
    this.activeZones.delete(zoneId);
    const timer = this.tickTimers.get(zoneId);
    if (timer !== undefined) {
      clearTimeout(timer);
    }
    this.tickTimers.delete(zoneId);
  }

  /**
   * Schedule the next AI tick for a zone using self-rescheduling setTimeout.
   * This pattern prevents event loop stalls (unlike setInterval).
   */
  private scheduleNextTick(zoneId: string): void {
    const timer = setTimeout(async () => {
      // Timer has fired — remove from map
      this.tickTimers.delete(zoneId);

      // Guard: zone may have been deactivated while timer was waiting
      if (!this.activeZones.has(zoneId)) {
        return;
      }

      const start = Date.now();
      await this.runZoneTick(zoneId);
      const elapsed = Date.now() - start;

      if (elapsed > AI_TICK_WARN_MS) {
        console.warn(`[AiService] Tick for zone ${zoneId} took ${elapsed}ms (threshold: ${AI_TICK_WARN_MS}ms)`);
      }

      // Guard: only reschedule if zone is still active
      if (this.activeZones.has(zoneId)) {
        this.scheduleNextTick(zoneId);
      }
    }, AI_TICK_INTERVAL_MS);

    this.tickTimers.set(zoneId, timer);
  }

  /**
   * Run one AI tick for a zone.
   * Processes all active creatures through the tickCreatureAI FSM and emits a
   * single entity:batch event with all position changes for the tick.
   * Also processes combat ticks for all players in combat in this zone.
   */
  private async runZoneTick(zoneId: string): Promise<void> {
    // Get all entities in the zone
    const entities = await this.zonesService.getZoneEntities(zoneId);

    // Filter to active creatures with health
    const creatures = entities.filter(
      (e): e is Creature => e.type === 'creature' && e.active && (e as Creature).health > 0,
    );

    // Get players in zone for flee calculations
    const players = this.playerService.getPlayersInZone(zoneId);

    // Get collision map from chunk
    const chunk = await this.zonesService.getChunk(zoneId);
    const collisions = chunk.collisions;

    // Collect all movements in a batch
    const movedCreatures: PublicCreatureUpdate[] = [];

    // Process each creature through FSM
    for (const creature of creatures) {
      const result = tickCreatureAI(creature, players, collisions);

      // Handle aggro detection (predator/maniac found player)
      if (result.aggroTarget) {
        await this.combatService.startCreatureCombat(
          creature.id,
          result.aggroTarget,
          zoneId,
        );
        await this.zonesService.updateEntity(zoneId, creature.id, {
          combatTarget: result.aggroTarget,
        } as Partial<Creature>);
      }

      // Handle return to spawn (leash exceeded or target left)
      if (result.shouldReturn) {
        if (creature.combatTarget) {
          // Stop combat session
          this.combatService.stopCreatureCombat(creature.id);
        }
        // Clear combat state on creature
        await this.zonesService.updateEntity(zoneId, creature.id, {
          combatTarget: undefined,
          provoked: false,
        } as Partial<Creature>);
      }

      // Update position if creature moved
      if (result.newPosition) {
        await this.zonesService.updateEntity(zoneId, creature.id, {
          position: result.newPosition,
        });

        movedCreatures.push({
          entityId: creature.id,
          changes: { position: result.newPosition },
        });
      }
    }

    // Emit single batched event if any creatures moved
    if (movedCreatures.length > 0) {
      this.server?.to(zoneId).emit('entity:batch', { updates: movedCreatures });
    }

    // Process creature combat ticks (creature -> player)
    const creatureCombatResults = await this.combatService.processCreatureCombatTick(zoneId, creatures);

    // Emit creature combat damage events
    for (const result of creatureCombatResults) {
      // Emit to the player being attacked
      const playerSocket = this.playerService.getSocketByPlayerId(result.defenderId);
      if (playerSocket) {
        this.server?.to(playerSocket).emit('combat:damage', {
          attackerId: result.attackerId,
          defenderId: result.defenderId,
          damage: result.damage,
          defenderHealth: result.defenderHealth,
          defenderMaxHealth: result.defenderMaxHealth,
          critical: result.critical,
          killed: result.killed,
          damageType: result.damageType,
          defenderPosition: result.defenderPosition,
        });
      }

      // Also emit to zone for other players to see
      this.server?.to(zoneId).emit('combat:damage', {
        attackerId: result.attackerId,
        defenderId: result.defenderId,
        damage: result.damage,
        defenderHealth: result.defenderHealth,
        defenderMaxHealth: result.defenderMaxHealth,
        critical: result.critical,
        killed: result.killed,
        damageType: result.damageType,
        defenderPosition: result.defenderPosition,
      });
    }

    // Process health and energy regeneration for players not in combat
    this.processPlayerRegeneration(zoneId);
  }

  /**
   * Calculate regen rate based on Vigor stat.
   * Base: 1%, scales linearly with Vigor up to 5% at Vigor 250.
   */
  private calculateRegenPercent(vigor: number): number {
    if (vigor <= VIGOR_MIN) {
      return REGEN_BASE_PERCENT;
    }
    if (vigor >= VIGOR_MAX) {
      return REGEN_MAX_PERCENT;
    }
    // Linear interpolation between min and max
    const vigorRange = VIGOR_MAX - VIGOR_MIN;
    const regenRange = REGEN_MAX_PERCENT - REGEN_BASE_PERCENT;
    return REGEN_BASE_PERCENT + ((vigor - VIGOR_MIN) / vigorRange) * regenRange;
  }

  /**
   * Regenerate health and energy for players in a zone who are not in combat.
   * Called once per tick (1 second). Regen rate scales with Vigor (1% base, up to 5%).
   */
  private processPlayerRegeneration(zoneId: string): void {
    const players = this.playerService.getPlayersInZone(zoneId);

    for (const playerPublic of players) {
      // Get full player data (not just public)
      const player = this.playerService.getPlayerById(playerPublic.id);
      if (!player) continue;

      // Skip players in combat or dead
      if (player.inCombat || player.isDead) {
        continue;
      }

      // Get player's total stats to determine vigor-based regen rate
      const inventory = this.inventoryService.getInventory(player.id);
      let regenPercent = REGEN_BASE_PERCENT;

      if (inventory) {
        const totalStats = computeCharStats(
          player.level,
          inventory.equipment as EquipmentJson,
          'player',
        );
        regenPercent = this.calculateRegenPercent(totalStats.vigor);
      }

      let healthChanged = false;
      let energyChanged = false;

      // Regenerate health if below max
      if (player.health < player.maxHealth) {
        const healthRegen = Math.ceil(player.maxHealth * regenPercent);
        const newHealth = Math.min(player.health + healthRegen, player.maxHealth);
        if (newHealth !== player.health) {
          this.playerService.updateHealth(player.id, newHealth);
          healthChanged = true;
        }
      }

      // Regenerate energy if below max
      if (player.energy < player.maxEnergy) {
        const energyRegen = Math.ceil(player.maxEnergy * regenPercent);
        const newEnergy = Math.min(player.energy + energyRegen, player.maxEnergy);
        if (newEnergy !== player.energy) {
          this.playerService.updateEnergy(player.id, newEnergy);
          energyChanged = true;
        }
      }

      // Emit updates to player if anything changed
      if (healthChanged || energyChanged) {
        const socketId = this.playerService.getSocketByPlayerId(player.id);
        if (socketId && this.server) {
          // Re-fetch player to get updated values
          const updatedPlayer = this.playerService.getPlayerById(player.id);
          if (updatedPlayer) {
            this.server.to(socketId).emit('player:regen', {
              playerId: player.id,
              health: updatedPlayer.health,
              maxHealth: updatedPlayer.maxHealth,
              energy: updatedPlayer.energy,
              maxEnergy: updatedPlayer.maxEnergy,
            });
          }
        }
      }
    }
  }
}
