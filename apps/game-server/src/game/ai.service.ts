import { Injectable, OnModuleInit } from '@nestjs/common';
import { Creature, PlayerPublic, isHubZone } from '@into-the-void/shared-types';
import { tickCreatureAI, computeCharStats } from '@into-the-void/game-logic';
import {
  pixelDistanceTo,
  tileToPixelCenter,
  AGGRO_RADIUS_PX,
  FLEE_RADIUS_PX,
  TILE_SIZE_PX,
} from '@into-the-void/game-logic';
import type { EquipmentJson } from '@into-the-void/database';
import { Server } from 'socket.io';
import { ZonesService } from '../zones/zones.service';
import { PlayerService } from './player.service';
import { CombatService } from './combat.service';
import { InventoryService } from './inventory.service';
import { HazardService } from './hazard.service';
import { LiquidEffectService } from './liquid-effect.service';

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

// CRAI-01: Stampede constants
const STAMPEDE_MIN_HERBIVORES = 3; // Minimum fleeing herbivores to trigger stampede
const STAMPEDE_PATH_LENGTH = 8; // Tiles ahead of stampede corridor
const STAMPEDE_HALF_WIDTH = 1.5; // 3 tiles wide (1.5 on each side)

// CRAI-03: Ambush perception threshold
const AMBUSH_PERCEPTION_THRESHOLD = 150;

// 0.5s aggro delay — creature "notices" player before committing to combat
const AGGRO_DELAY_MS = 500;

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
  /** Diagnostic tick counter per zone — logs summary every N ticks */
  private tickCounters: Map<string, number> = new Map();

  /** Pending aggro delay: creatureId -> { targetPlayerId, detectedAt, zoneId } */
  private pendingAggro: Map<string, { targetPlayerId: string; detectedAt: number; zoneId: string }> = new Map();

  constructor(
    private readonly zonesService: ZonesService,
    private readonly playerService: PlayerService,
    private readonly combatService: CombatService,
    private readonly inventoryService: InventoryService,
    private readonly hazardService: HazardService,
    private readonly liquidEffectService: LiquidEffectService,
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
   * Note: immediate aggro (zone join) bypasses the 0.5s delay for responsiveness.
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

    // Check each aggressive creature for nearby players
    for (const creature of aggressiveCreatures) {
      // Find closest player within aggro radius using pixel distance
      let closestPlayer: PlayerPublic | null = null;
      let closestDist = Infinity;

      const { px: cpx, py: cpy } = tileToPixelCenter(creature.position.x, creature.position.y);

      for (const player of players) {
        const dist = pixelDistanceTo(cpx, cpy, player.px, player.py);

        if (dist <= AGGRO_RADIUS_PX && dist < closestDist) {
          closestDist = dist;
          closestPlayer = player;
        }
      }

      if (closestPlayer) {
        // Trigger aggro immediately (no delay on zone join for responsiveness)
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

    // Find aggressive creatures near this specific player using pixel distance
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
      const { px: cpx, py: cpy } = tileToPixelCenter(creature.position.x, creature.position.y);
      const dist = pixelDistanceTo(cpx, cpy, player.px, player.py);

      if (dist <= AGGRO_RADIUS_PX) {
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

    // Find closest player within aggro radius using pixel distance
    let closestPlayer: PlayerPublic | null = null;
    let closestDist = Infinity;

    const { px: cpx, py: cpy } = tileToPixelCenter(creature.position.x, creature.position.y);

    for (const player of players) {
      const dist = pixelDistanceTo(cpx, cpy, player.px, player.py);

      if (dist <= AGGRO_RADIUS_PX && dist < closestDist) {
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

    // Clear pending aggro for all creatures in this zone
    for (const [creatureId, pending] of this.pendingAggro) {
      if (pending.zoneId === zoneId) {
        this.pendingAggro.delete(creatureId);
      }
    }
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
   * CRAI-05: Zone-level pre-processing pass for group behaviors.
   * Runs BEFORE per-creature FSM loop to detect Stampede (3+ fleeing herbivores)
   * and ensure predators have stealth flags.
   */
  private async preProcessGroupBehaviors(
    zoneId: string,
    creatures: Creature[],
    players: PlayerPublic[],
  ): Promise<void> {
    // ── CRAI-01: Stampede Detection ──────────────────────────
    const herbivores = creatures.filter(c => c.behavior === 'herbivore');

    // Count herbivores that are fleeing (have combatTarget or near players) using pixel distance
    const fleeingHerbivores = herbivores.filter(h => {
      if (h.combatTarget) return true;
      // Check if any player is within flee radius using pixel distance
      const { px: hpx, py: hpy } = tileToPixelCenter(h.position.x, h.position.y);
      return players.some(p =>
        pixelDistanceTo(hpx, hpy, p.px, p.py) <= FLEE_RADIUS_PX,
      );
    });

    if (fleeingHerbivores.length >= STAMPEDE_MIN_HERBIVORES) {
      await this.processStampede(zoneId, fleeingHerbivores, players);
    }

    // ── CRAI-03: Ensure predators have stealth flag ──────────
    for (const creature of creatures) {
      if (creature.behavior === 'predator' && creature.stealthed === undefined && !creature.combatTarget) {
        await this.zonesService.updateEntity(zoneId, creature.id, {
          stealthed: true,
        } as Partial<Creature>);
        creature.stealthed = true; // Update local reference
      }
    }
  }

  /**
   * CRAI-01: Process stampede when 3+ herbivores are fleeing.
   * Computes corridor direction, finds players in path, applies kinetic damage.
   */
  private async processStampede(
    zoneId: string,
    fleeingHerbivores: Creature[],
    players: PlayerPublic[],
  ): Promise<void> {
    if (players.length === 0) return;

    // Compute centroid of fleeing herbivores (tile coords)
    let centroidX = 0;
    let centroidY = 0;
    let totalLevel = 0;
    for (const h of fleeingHerbivores) {
      centroidX += h.position.x;
      centroidY += h.position.y;
      totalLevel += h.level;
    }
    centroidX /= fleeingHerbivores.length;
    centroidY /= fleeingHerbivores.length;
    const averageLevel = totalLevel / fleeingHerbivores.length;

    // Compute average flee direction (away from nearest player to centroid)
    // Convert centroid to pixel coords for accurate distance comparison
    const centroidPx = (centroidX + 0.5) * TILE_SIZE_PX;
    const centroidPy = (centroidY + 0.5) * TILE_SIZE_PX;

    let nearestPlayer: PlayerPublic | null = null;
    let nearestDist = Infinity;
    for (const p of players) {
      const dist = pixelDistanceTo(centroidPx, centroidPy, p.px, p.py);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestPlayer = p;
      }
    }
    if (!nearestPlayer) return;

    const rawDx = centroidX - nearestPlayer.position.x;
    const rawDy = centroidY - nearestPlayer.position.y;
    const mag = Math.sqrt(rawDx * rawDx + rawDy * rawDy);
    if (mag === 0) return;
    const dirX = rawDx / mag;
    const dirY = rawDy / mag;

    // Find players in the stampede corridor
    const affectedPlayerIds: string[] = [];
    const damage = Math.floor(averageLevel * 2); // 2x creature level kinetic damage

    for (const p of players) {
      const toPlayerX = p.position.x - centroidX;
      const toPlayerY = p.position.y - centroidY;
      // Project player position onto stampede direction
      const dot = toPlayerX * dirX + toPlayerY * dirY;
      if (dot < -2 || dot > STAMPEDE_PATH_LENGTH) continue; // Behind or too far ahead
      // Perpendicular distance
      const perpDist = Math.abs(toPlayerX * dirY - toPlayerY * dirX);
      if (perpDist <= STAMPEDE_HALF_WIDTH) {
        affectedPlayerIds.push(p.id);
      }
    }

    // Apply damage to affected players
    for (const playerId of affectedPlayerIds) {
      const player = this.playerService.getPlayerById(playerId);
      if (!player || player.isDead) continue;

      const newHealth = Math.max(0, player.health - damage);
      this.playerService.updateHealth(playerId, newHealth);

      // Emit combat:damage for stampede hit
      const playerSocket = this.playerService.getSocketByPlayerId(playerId);
      if (playerSocket && this.server) {
        this.server.to(playerSocket).emit('combat:damage', {
          attackerId: fleeingHerbivores[0].id, // Use first herbivore as source
          defenderId: playerId,
          damage,
          defenderHealth: newHealth,
          defenderMaxHealth: player.maxHealth,
          critical: false,
          killed: newHealth <= 0,
          damageType: 'Kinetic' as const,
          defenderPosition: { x: player.position.x, y: player.position.y },
        });
      }

      if (newHealth <= 0) {
        this.playerService.setDead(playerId, true);
        this.server?.to(zoneId).emit('player:death', {
          playerId,
          killerId: fleeingHerbivores[0].id,
          position: player.position,
        });
      }
    }

    // Emit stampede event to zone
    if (affectedPlayerIds.length > 0 || fleeingHerbivores.length >= STAMPEDE_MIN_HERBIVORES) {
      this.server?.to(zoneId).emit('creature:stampede' as any, {
        zoneId,
        creatureIds: fleeingHerbivores.map(h => h.id),
        direction: { dx: Math.round(dirX), dy: Math.round(dirY) },
        affectedPlayerIds,
        damage,
      });
    }

    console.log(`[AiService] Stampede! ${fleeingHerbivores.length} herbivores, ${affectedPlayerIds.length} players hit for ${damage} damage`);
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

    // CRAI-05: Zone-level pre-processing pass for group behaviors
    await this.preProcessGroupBehaviors(zoneId, creatures, players);

    // Get collision map from chunk
    const chunk = await this.zonesService.getChunk(zoneId);
    const collisions = chunk.collisions;

    // Diagnostic logging every 10 ticks (~10 seconds)
    const tickCount = (this.tickCounters.get(zoneId) ?? 0) + 1;
    this.tickCounters.set(zoneId, tickCount);
    const shouldLog = tickCount % 10 === 1;

    if (shouldLog && creatures.length > 0 && players.length > 0) {
      const p = players[0];
      const c = creatures[0];
      const { px: cpx, py: cpy } = tileToPixelCenter(c.position.x, c.position.y);
      const dist = pixelDistanceTo(cpx, cpy, p.px, p.py);
      console.log(`[AiService] Zone ${zoneId} tick #${tickCount}: ${creatures.length} creatures, ${players.length} players | ` +
        `creature[0] tile=(${c.position.x},${c.position.y}) px=(${cpx},${cpy}) | ` +
        `player[0] px=(${p.px.toFixed(0)},${p.py.toFixed(0)}) | dist=${dist.toFixed(0)}px | ` +
        `aggro=${AGGRO_RADIUS_PX}px`);
    }

    // Collect all movements in a batch
    const movedCreatures: PublicCreatureUpdate[] = [];

    // Process each creature through FSM
    for (const creature of creatures) {
      // Clear stale pendingAggro for dead/inactive creatures
      if (!creature.active || creature.health <= 0) {
        this.pendingAggro.delete(creature.id);
        continue;
      }

      const result = tickCreatureAI(creature, players, collisions);

      // Handle aggro detection (predator/maniac found player) — with 0.5s delay
      if (result.aggroTarget) {
        const pending = this.pendingAggro.get(creature.id);
        if (!pending) {
          // First detection — store with timestamp and emit "!" icon
          this.pendingAggro.set(creature.id, {
            targetPlayerId: result.aggroTarget,
            detectedAt: Date.now(),
            zoneId,
          });
          // Emit "!" aggro detection indicator to zone (per user decision)
          this.server?.to(zoneId).emit('creature:aggro_detected' as any, {
            entityId: creature.id,
          });
        } else if (Date.now() - pending.detectedAt >= AGGRO_DELAY_MS) {
          // 0.5s delay elapsed — commit aggro
          this.pendingAggro.delete(creature.id);

          // CRAI-03: Ambush — check if predator is stealthed and player has high perception
          if (creature.behavior === 'predator' && creature.stealthed) {
            const targetPlayer = this.playerService.getPlayerById(pending.targetPlayerId);
            if (targetPlayer) {
              const inventory = this.inventoryService.getInventory(pending.targetPlayerId);
              const playerStats = computeCharStats(
                targetPlayer.level,
                (inventory?.equipment as EquipmentJson) ?? { modules: [] },
                'player',
              );
              if (playerStats.perception > AMBUSH_PERCEPTION_THRESHOLD) {
                // High perception player detects predator — clear stealth, no ambush bonus
                await this.zonesService.updateEntity(zoneId, creature.id, {
                  stealthed: false,
                } as Partial<Creature>);
                creature.stealthed = false;
                console.log(`[AiService] Player ${targetPlayer.name} detected stealthed predator ${creature.name} (Perception: ${playerStats.perception})`);
              }
              // If perception <= threshold: creature keeps stealthed=true → CombatService applies 2x on first hit
            }
          }

          await this.combatService.startCreatureCombat(
            creature.id,
            pending.targetPlayerId,
            zoneId,
          );
          await this.zonesService.updateEntity(zoneId, creature.id, {
            combatTarget: pending.targetPlayerId,
          } as Partial<Creature>);
        }
        // else: delay not yet elapsed — do nothing this tick, creature "notices" but hasn't committed
      }

      // Handle return to spawn (leash exceeded or target left)
      if (result.shouldReturn) {
        if (creature.combatTarget) {
          // Stop combat session
          this.combatService.stopCreatureCombat(creature.id);
        }
        // Clear any pending aggro for this creature
        this.pendingAggro.delete(creature.id);
        // Clear combat state on creature and restore full HP (prevents kiting exploits)
        await this.zonesService.updateEntity(zoneId, creature.id, {
          combatTarget: undefined,
          provoked: false,
          health: creature.maxHealth,
        } as Partial<Creature>);
        // Broadcast HP heal so clients see health bar refill
        this.server?.to(zoneId).emit('entity:update' as any, {
          entityId: creature.id,
          changes: { health: creature.maxHealth, maxHealth: creature.maxHealth },
        });
      }

      // CRAI-04: Handle frenzy state transitions
      if (result.frenzied === true && !creature.frenzied) {
        await this.zonesService.updateEntity(zoneId, creature.id, {
          frenzied: true,
        } as Partial<Creature>);
        this.server?.to(zoneId).emit('creature:frenzy' as any, {
          entityId: creature.id,
          frenzied: true,
        });
        console.log(`[AiService] ${creature.name} enters Frenzy!`);
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

    if (shouldLog) {
      console.log(`[AiService] Zone ${zoneId}: ${movedCreatures.length}/${creatures.length} creatures moved this tick`);
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
          absorbed: result.absorbed,
          reducedBy: result.reducedBy,
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
        absorbed: result.absorbed,
        reducedBy: result.reducedBy,
      });
    }

    // Process health and energy regeneration for players not in combat
    this.processPlayerRegeneration(zoneId);

    // Process hazard ticks for players in hazardous zones (HAZD-01/02/03/04)
    this.hazardService.processHazardTick(zoneId);

    // Process liquid tile effects for players and creatures (FX-01/02/03/04/05)
    this.liquidEffectService.processLiquidTick(zoneId, creatures);
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
