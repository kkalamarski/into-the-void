import { Injectable, OnModuleInit } from '@nestjs/common';
import { Creature, PlayerPublic } from '@into-the-void/shared-types';
import { tickCreatureAI } from '@into-the-void/game-logic';
import { Server } from 'socket.io';
import { ZonesService } from '../zones/zones.service';
import { PlayerService } from './player.service';
import { CombatService } from './combat.service';

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

@Injectable()
export class AiService implements OnModuleInit {
  private activeZones: Set<string> = new Set();
  private tickTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private server: Server | null = null;

  constructor(
    private readonly zonesService: ZonesService,
    private readonly playerService: PlayerService,
    private readonly combatService: CombatService,
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
    if (this.activeZones.has(zoneId)) {
      // Zone already active — guard against duplicate timers
      return;
    }
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
    // Get all entities in the zone
    const entities = await this.zonesService.getZoneEntities(zoneId);

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

    // Process combat ticks for players in this zone (player -> creature)
    const combatResults = await this.combatService.processCombatTick(zoneId);

    // Emit combat damage events to zone
    for (const result of combatResults) {
      this.server?.to(zoneId).emit('combat:damage', {
        attackerId: result.attackerId,
        defenderId: result.defenderId,
        damage: result.damage,
        defenderHealth: result.defenderHealth,
        defenderMaxHealth: result.defenderMaxHealth,
        critical: result.critical,
        killed: result.killed,
      });

      // If creature was killed, emit entity:update for death state
      if (result.killed) {
        this.server?.to(zoneId).emit('entity:update', {
          entityId: result.defenderId,
          changes: { health: 0, active: false },
        });

        // Emit spawned loot items
        if (result.groundItems) {
          for (const item of result.groundItems) {
            this.server?.to(zoneId).emit('entity:spawn', item);
          }
        }
      }
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
      });
    }

  }
}
