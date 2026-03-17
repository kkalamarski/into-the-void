import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PlayerService } from './player.service';
import { ZonesService } from '../zones/zones.service';
import { InventoryService } from './inventory.service';
import { EntityService } from './entity.service';
import { AbilityService } from './ability.service';
import { Creature, ItemEntity, isHubZone } from '@into-the-void/shared-types';
import type { DamageType } from '@into-the-void/shared-types';
import {
  calculateDamage,
  calculateAttackInterval,
  computeCharStats,
  rollLootTable,
  getCreatureLoot,
  pixelDistanceTo,
  tileToPixelCenter,
  MELEE_RANGE_PX,
  TILE_SIZE_PX,
} from '@into-the-void/game-logic';
import { EntityRegistry } from '@into-the-void/entities';
import type { CreatureDefinition } from '@into-the-void/entities';
import type { EquipmentJson } from '@into-the-void/database';

interface CreatureCombatSession {
  creatureId: string;
  targetPlayerId: string;
  zoneId: string;
  startedAt: number;
  lastAttackAt: number;
}

interface CombatDamageResult {
  attackerId: string;
  attackerName: string;
  defenderId: string;
  defenderName: string;
  damage: number;
  defenderHealth: number;
  defenderMaxHealth: number;
  critical: boolean;
  killed: boolean;
  damageType?: DamageType;
  groundItems?: ItemEntity[];
  defenderPosition?: { x: number; y: number };
  absorbed?: number;
  reducedBy?: number;
}

@Injectable()
export class CombatService {
  /** Active creature combat sessions indexed by creatureId */
  private creatureSessions: Map<string, CreatureCombatSession> = new Map();

  private server: Server | null = null;

  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly playerService: PlayerService,
    private readonly zonesService: ZonesService,
    private readonly inventoryService: InventoryService,
    private readonly entityService: EntityService,
    private readonly abilityService: AbilityService,
  ) {}

  /**
   * Set the Socket.IO server reference.
   * Called by GameGateway.afterInit().
   */
  setServer(server: Server): void {
    this.server = server;
  }

  /**
   * Handle player disconnect — clean up combat state.
   */
  handleDisconnect(playerId: string): void {
    // Stop any creature combat sessions targeting this player
    for (const [creatureId, session] of this.creatureSessions.entries()) {
      if (session.targetPlayerId === playerId) {
        this.creatureSessions.delete(creatureId);
      }
    }
  }

  /**
   * Handle creature death: spawn loot and schedule respawn.
   */
  async handleCreatureDeath(
    creature: Creature,
    zoneId: string,
  ): Promise<ItemEntity[]> {
    const def = EntityRegistry.get(creature.speciesId) as CreatureDefinition | undefined;
    if (!def) return [];

    // Get loot from creature's loot table
    const lootEntries = getCreatureLoot(def.lootTableId);
    const loot = rollLootTable(lootEntries);

    // Spawn ground items using EntityService
    const groundItems = await this.entityService.spawnGroundItemsForCombat(
      loot,
      creature.position.x,
      creature.position.y,
      creature.position.zoneId,
    );

    // Schedule respawn with +/-25% variance (RESP-02)
    const variance = def.respawnSeconds * 0.25;
    const offset = (Math.random() * 2 - 1) * variance;
    const respawnSeconds = Math.round(def.respawnSeconds + offset);
    await this.zonesService.recordEntityKill(creature.id, zoneId, respawnSeconds);

    return groundItems;
  }

  /**
   * Start combat where a creature targets a player.
   * Called by AiService when FSM returns aggroTarget.
   */
  async startCreatureCombat(
    creatureId: string,
    targetPlayerId: string,
    zoneId: string,
  ): Promise<boolean> {
    // Hub zones are safe - creatures cannot attack players
    if (isHubZone(zoneId)) {
      return false;
    }

    // Don't start duplicate session
    if (this.creatureSessions.has(creatureId)) {
      return false;
    }

    const session: CreatureCombatSession = {
      creatureId,
      targetPlayerId,
      zoneId,
      startedAt: Date.now(),
      lastAttackAt: 0, // Allows immediate first attack
    };

    this.creatureSessions.set(creatureId, session);

    // Emit combat:start to the targeted player
    const playerSocket = this.playerService.getSocketByPlayerId(targetPlayerId);
    if (playerSocket && this.server) {
      this.server.to(playerSocket).emit('combat:start', {
        attackerId: creatureId,
        defenderId: targetPlayerId,
        timestamp: session.startedAt,
      });
    }

    return true;
  }

  /**
   * Stop creature combat (creature died, target left, leash exceeded).
   */
  stopCreatureCombat(creatureId: string): void {
    this.creatureSessions.delete(creatureId);
  }

  /**
   * Get creature combat session.
   */
  getCreatureSession(creatureId: string): CreatureCombatSession | undefined {
    return this.creatureSessions.get(creatureId);
  }

  /**
   * Check if creature has an active combat session.
   */
  isCreatureInCombat(creatureId: string): boolean {
    return this.creatureSessions.has(creatureId);
  }

  /**
   * Execute one attack from creature to player.
   * Returns damage result for broadcasting, or null if not time to attack yet.
   */
  async creatureAttackTick(
    session: CreatureCombatSession,
    creature: Creature,
  ): Promise<CombatDamageResult | null> {
    const player = this.playerService.getPlayerById(session.targetPlayerId);
    if (!player) {
      this.stopCreatureCombat(session.creatureId);
      return null;
    }

    // Check if player is still in same zone
    if (player.position.zoneId !== session.zoneId) {
      this.stopCreatureCombat(session.creatureId);
      return null;
    }

    // Check if creature is stunned (ABIL-08: Concussive Strike)
    if (this.abilityService.isCreatureStunned(creature.id)) {
      return null; // Creature can't attack while stunned
    }

    // Calculate creature stats for interval calculation
    const emptyEquipment: EquipmentJson = { modules: [] };
    const creatureStats = computeCharStats(creature.level, emptyEquipment, 'creature');
    let attackInterval = calculateAttackInterval(creatureStats.haste);

    // CRAI-04: Frenzy — maniacs below 30% HP attack at double speed
    if (creature.frenzied) {
      attackInterval = Math.max(200, attackInterval / 2); // Half interval, min 200ms
    }

    // Check if enough time has passed since last attack
    const now = Date.now();
    if (now - session.lastAttackAt < attackInterval) {
      return null;
    }

    // Check if player is still in melee range (pixel distance, Phase 133)
    const { px: cpx, py: cpy } = tileToPixelCenter(creature.position.x, creature.position.y);
    const dist = pixelDistanceTo(cpx, cpy, player.px, player.py);
    if (dist > MELEE_RANGE_PX) {
      // Player moved out of melee range — don't attack but don't stop combat (will chase)
      return null;
    }

    // Get player stats for damage calculation
    const inventory = this.inventoryService.getInventory(player.id);
    const playerEquipment = inventory?.equipment as EquipmentJson ?? { modules: [] };
    const activeBuffs = this.abilityService.getActiveBuffs(player.id);
    const playerStats = computeCharStats(player.level, playerEquipment, 'player', activeBuffs);

    // CRAI-03: Ambush — first attack from stealth deals 2x damage
    let ambushMultiplier = 1;
    if (creature.stealthed) {
      ambushMultiplier = 2;
      // Clear stealth after first attack — no re-stealth
      await this.zonesService.updateEntity(session.zoneId, session.creatureId, {
        stealthed: false,
      } as Partial<Creature>);
      creature.stealthed = false;
      console.log(`[CombatService] Ambush! ${creature.name} deals 2x damage on first strike`);
    }

    // Calculate damage: Creature Power vs Player Toughness
    // Creature auto-attacks default to Kinetic damage type
    // Players have no resistance stats (per REQUIREMENTS.md Out-of-Scope), so defenderResistances is omitted
    const damageResult = calculateDamage({
      baseDamage: 10,
      attackerLevel: creature.level,
      defenderLevel: player.level,
      attackerStats: creatureStats,
      defenderStats: playerStats,
      weaponDamage: creature.level * 2, // Creature "weapon" scales with level
      armorReduction: playerStats.toughness, // Player toughness as armor
      damageType: 'Kinetic' as const,
    });

    // Apply ambush multiplier to base damage
    const effectiveDamage = damageResult.damage * ambushMultiplier;

    // Shield intercept (ABIL-09: Emergency Shield)
    const { passthrough: afterShield, absorbed } = this.abilityService.interceptShield(
      session.targetPlayerId,
      effectiveDamage,
    );

    // Damage reduction (ABIL-12: Fortify Systems)
    const { reducedDamage: finalDamage, reducedBy } = this.abilityService.applyDamageReduction(
      session.targetPlayerId,
      afterShield,
    );

    // Apply final damage to player
    const newHealth = Math.max(0, player.health - finalDamage);
    const killed = newHealth <= 0;

    // Update player health via PlayerService
    this.playerService.updateHealth(player.id, newHealth);

    // Reflect damage back to creature (ABIL-11: Magnetic Field)
    const reflectDamage = this.abilityService.getReflectDamage(session.targetPlayerId, finalDamage);
    if (reflectDamage > 0) {
      creature.health = Math.max(0, creature.health - reflectDamage);
      const creatureKilled = creature.health <= 0;
      await this.zonesService.updateEntity(session.zoneId, session.creatureId, {
        health: creature.health,
        active: !creatureKilled,
      } as Partial<Creature>);
      this.server?.to(session.zoneId).emit('combat:damage', {
        attackerId: session.targetPlayerId,
        attackerName: player.name,
        defenderId: session.creatureId,
        defenderName: creature.name,
        damage: reflectDamage,
        defenderHealth: creature.health,
        defenderMaxHealth: creature.maxHealth,
        critical: false,
        killed: creatureKilled,
        defenderPosition: { x: creature.position.x, y: creature.position.y },
      });
      this.server?.to(session.zoneId).emit('entity:update', {
        entityId: session.creatureId,
        changes: { health: creature.health, maxHealth: creature.maxHealth, active: !creatureKilled },
      });
      if (creatureKilled) {
        this.stopCreatureCombat(session.creatureId);
        const groundItems = await this.handleCreatureDeath(creature, session.zoneId);
        for (const item of groundItems) {
          this.server?.to(session.zoneId).emit('entity:spawn', item);
        }
        this.server?.to(session.zoneId).emit('entity:despawn', { entityId: session.creatureId });
        const levelDiff = creature.level - player.level;
        const levelBonus = levelDiff > 0 ? 1 + levelDiff * 0.1 : 1;
        const xpReward = Math.floor(10 * creature.level * levelBonus);
        this.playerService.grantXp(player.id, xpReward);
        return null; // Creature is dead, stop processing this session
      }
    }

    // Emit player.damaged event (interrupts casting, etc.)
    this.eventEmitter.emit('player.damaged', { playerId: session.targetPlayerId });

    if (killed) {
      // Mark player as dead
      this.playerService.setDead(session.targetPlayerId, true);

      // Stop creature's combat session
      this.stopCreatureCombat(session.creatureId);

      // Emit player:death event to player socket
      const playerSocket = this.playerService.getSocketByPlayerId(session.targetPlayerId);
      if (playerSocket && this.server) {
        this.server.to(playerSocket).emit('player:death', {
          playerId: session.targetPlayerId,
          killerId: session.creatureId,
          position: player.position,
        });
      }

      // Also emit to zone room so other players see the death
      this.server?.to(session.zoneId).emit('player:death', {
        playerId: session.targetPlayerId,
        killerId: session.creatureId,
        position: player.position,
      });

      // Player now chooses respawn method via death screen (S.O.S. or Reboot Kit)
      // No auto-respawn - player must select an option
    }

    // Update last attack time
    session.lastAttackAt = now;

    return {
      attackerId: session.creatureId,
      attackerName: creature.name,
      defenderId: session.targetPlayerId,
      defenderName: player.name,
      damage: finalDamage,
      defenderHealth: newHealth,
      defenderMaxHealth: player.maxHealth,
      critical: damageResult.critical,
      killed,
      damageType: 'Kinetic' as const,
      defenderPosition: { x: player.position.x, y: player.position.y },
      absorbed: absorbed > 0 ? absorbed : undefined,
      reducedBy: reducedBy > 0 ? reducedBy : undefined,
    };
  }

  /**
   * Process all creature combat ticks for a zone.
   * Called by AiService during zone tick.
   */
  async processCreatureCombatTick(
    zoneId: string,
    creatures: Creature[],
  ): Promise<CombatDamageResult[]> {
    const results: CombatDamageResult[] = [];

    for (const creature of creatures) {
      const session = this.creatureSessions.get(creature.id);
      if (!session || session.zoneId !== zoneId) continue;

      const result = await this.creatureAttackTick(session, creature);
      if (result) {
        results.push(result);
      }
    }

    return results;
  }

  /**
   * Mark creature as provoked (for omnivore retaliation).
   * Called when player attacks an omnivore.
   * CRAI-02: 30% chance to trigger Pack Call, summoning nearby omnivores.
   */
  async provokeCreature(zoneId: string, creatureId: string): Promise<void> {
    await this.zonesService.updateEntity(zoneId, creatureId, { provoked: true } as Partial<Creature>);

    // CRAI-02: Pack Call — 30% chance to summon nearby omnivores
    if (Math.random() < 0.3) {
      await this.triggerPackCall(zoneId, creatureId);
    }
  }

  /**
   * CRAI-02: Pack Call — summon up to 2 nearby omnivores within 10 tiles.
   * Called creatures instantly switch to combat targeting the provoker's target.
   */
  private async triggerPackCall(zoneId: string, provokerId: string): Promise<void> {
    const entities = await this.zonesService.getZoneEntities(zoneId);
    const provoker = entities.find(e => e.id === provokerId) as Creature | undefined;
    if (!provoker || !provoker.combatTarget) return;

    const targetPlayerId = provoker.combatTarget;
    const PACK_CALL_RANGE_PX = 10 * TILE_SIZE_PX; // 1280px — same 10-tile radius in pixels
    const MAX_REINFORCEMENTS = 2;

    // Pre-compute provoker pixel center for filter and sort (DIST-04)
    const { px: provPx, py: provPy } = tileToPixelCenter(provoker.position.x, provoker.position.y);

    // Find eligible nearby omnivores: same zone, within range, not already in combat, not the provoker
    const nearbyOmnivores = entities.filter((e): e is Creature =>
      e.type === 'creature' &&
      e.id !== provokerId &&
      e.active &&
      (e as Creature).health > 0 &&
      (e as Creature).behavior === 'omnivore' &&
      !this.isCreatureInCombat(e.id) &&
      !(e as Creature).combatTarget &&
      (() => {
        const { px: ePx, py: ePy } = tileToPixelCenter(e.position.x, e.position.y);
        return pixelDistanceTo(ePx, ePy, provPx, provPy) <= PACK_CALL_RANGE_PX;
      })(),
    );

    // Take up to MAX_REINFORCEMENTS, sorted by distance (closest first)
    const reinforcements = nearbyOmnivores
      .sort((a, b) => {
        const { px: aPx, py: aPy } = tileToPixelCenter(a.position.x, a.position.y);
        const { px: bPx, py: bPy } = tileToPixelCenter(b.position.x, b.position.y);
        return pixelDistanceTo(aPx, aPy, provPx, provPy) - pixelDistanceTo(bPx, bPy, provPx, provPy);
      })
      .slice(0, MAX_REINFORCEMENTS);

    for (const ally of reinforcements) {
      // Instantly switch to combat targeting the same player
      await this.zonesService.updateEntity(zoneId, ally.id, {
        combatTarget: targetPlayerId,
        provoked: true,
      } as Partial<Creature>);
      await this.startCreatureCombat(ally.id, targetPlayerId, zoneId);
    }

    if (reinforcements.length > 0) {
      console.log(`[CombatService] Pack Call: ${provoker.name} called ${reinforcements.length} allies`);
    }
  }
}
