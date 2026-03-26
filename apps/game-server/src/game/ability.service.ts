import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { Server } from 'socket.io';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { PlayerService } from './player.service';
import { ZonesService } from '../zones/zones.service';
import { InventoryService } from './inventory.service';
import { EntityService } from './entity.service';
import { CombatService } from './combat.service';
import { DatabaseService } from '../database/database.service';
import { Creature, Entity, isHubZone } from '@into-the-void/shared-types';
import { AbilityRegistry, canInteractPixel, MELEE_RANGE_PX, GATHER_RANGE_PX, TILE_SIZE_PX, computeCharStats, getEffectStrategy, initEffectStrategies } from '@into-the-void/game-logic';
import type { EffectServices, EffectContext, PlayerRef } from '@into-the-void/game-logic';
import { ItemRegistry } from '@into-the-void/items';
import { saveCooldown, loadCooldowns } from '@into-the-void/database';
import type { AbilityDefinition, Buff } from '@into-the-void/shared-types';
import type { EquipmentJson } from '@into-the-void/database';

interface AbilityCooldown {
  abilityId: string;
  endsAt: number;
}

interface UseAbilityResult {
  success: boolean;
  error?: string;
  damage?: number;
  targetHealth?: number;
  targetMaxHealth?: number;
  energyRemaining?: number;
  cooldownEndsAt?: number;
  casting?: boolean;
}

interface ActiveCast {
  playerId: string;
  socketId: string;
  abilityId: string;
  targetEntityId?: string;
  castEndsAt: number;
  timeoutHandle: NodeJS.Timeout;
}

/** Global cooldown in milliseconds - prevents ability spam */
const GCD_MS = 500;

/** Cooldowns >= this threshold are persisted to database (1 minute) */
const PERSISTENCE_THRESHOLD_MS = 60000;

@Injectable()
export class AbilityService {
  /** Cooldowns indexed by `${playerId}:${abilityId}` */
  private cooldowns: Map<string, number> = new Map();

  /** GCD indexed by playerId - timestamp when GCD expires */
  private globalCooldowns: Map<string, number> = new Map();

  /** Active buffs indexed by playerId */
  private activeBuffs: Map<string, Buff[]> = new Map();

  /** Active casts indexed by playerId */
  private activeCasts: Map<string, ActiveCast> = new Map();

  /** Active shield absorb pools indexed by playerId */
  private activeShields: Map<string, { absorbRemaining: number; maxAbsorb: number; expiresAt: number }> = new Map();

  /** Active damage reduction buffs indexed by playerId */
  private activeDamageReductions: Map<string, { reductionPercent: number; expiresAt: number }> = new Map();

  /** Stunned creatures indexed by creatureId - stun expiry timestamp */
  private stunnedCreatures: Map<string, number> = new Map();

  /** Hazard immunity indexed by playerId - immunity expiry timestamp */
  private hazardImmunities: Map<string, number> = new Map();

  /** Active damage reflect indexed by playerId */
  private activeReflects: Map<string, { reflectPercent: number; expiresAt: number }> = new Map();

  /** Buff expiration tick interval handle */
  private buffTickInterval: NodeJS.Timeout | null = null;

  private server: Server | null = null;

  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly playerService: PlayerService,
    private readonly zonesService: ZonesService,
    private readonly inventoryService: InventoryService,
    private readonly entityService: EntityService,
    @Inject(forwardRef(() => CombatService))
    private readonly combatService: CombatService,
    private readonly databaseService: DatabaseService,
  ) {}

  setServer(server: Server): void {
    this.server = server;
    initEffectStrategies();
    this.startBuffTick();
  }

  /**
   * Get all abilities available to a player from their equipped items.
   * Also includes universal abilities (home_recall).
   */
  getPlayerAbilities(playerId: string): AbilityDefinition[] {
    const inventory = this.inventoryService.getInventory(playerId);
    if (!inventory) return [];

    const abilityIds = new Set<string>();

    // Check equipped tool
    if (inventory.equipment.tool) {
      const toolDef = ItemRegistry.get(inventory.equipment.tool.itemId);
      if (toolDef?.grantedAbilities) {
        toolDef.grantedAbilities.forEach(id => abilityIds.add(id));
      }
    }

    // Check equipped exosuit
    if (inventory.equipment.exosuit) {
      const suitDef = ItemRegistry.get(inventory.equipment.exosuit.itemId);
      if (suitDef?.grantedAbilities) {
        suitDef.grantedAbilities.forEach(id => abilityIds.add(id));
      }
    }

    // Check equipped modules
    for (const mod of inventory.equipment.modules) {
      const modDef = ItemRegistry.get(mod.itemId);
      if (modDef?.grantedAbilities) {
        modDef.grantedAbilities.forEach(id => abilityIds.add(id));
      }
    }

    // Inject universal abilities
    abilityIds.add('home_recall');
    abilityIds.add('basic_strike');
    abilityIds.add('gather');

    // Resolve ability definitions
    const abilities: AbilityDefinition[] = [];
    for (const id of abilityIds) {
      const ability = AbilityRegistry.get(id);
      if (ability) abilities.push(ability);
    }

    return abilities;
  }

  /**
   * Check if ability is on cooldown for a player.
   */
  isOnCooldown(playerId: string, abilityId: string): boolean {
    const key = `${playerId}:${abilityId}`;
    const endsAt = this.cooldowns.get(key);
    if (!endsAt) return false;
    return Date.now() < endsAt;
  }

  /**
   * Check if player is on global cooldown.
   */
  isOnGcd(playerId: string): boolean {
    const endsAt = this.globalCooldowns.get(playerId);
    if (!endsAt) return false;
    return Date.now() < endsAt;
  }

  /**
   * Set ability cooldown for a player.
   * If cooldown >= PERSISTENCE_THRESHOLD_MS, also persist to database.
   */
  setCooldown(playerId: string, abilityId: string, cooldownMs: number): number {
    const key = `${playerId}:${abilityId}`;
    const endsAt = Date.now() + cooldownMs;
    this.cooldowns.set(key, endsAt);

    // Persist long cooldowns to database
    if (cooldownMs >= PERSISTENCE_THRESHOLD_MS) {
      const db = this.databaseService.getClient();
      saveCooldown(db, playerId, abilityId, new Date(endsAt)).catch((err) => {
        console.error('[AbilityService] Failed to persist cooldown:', err);
      });
    }

    return endsAt;
  }

  /**
   * Set global cooldown for a player.
   */
  setGcd(playerId: string): void {
    this.globalCooldowns.set(playerId, Date.now() + GCD_MS);
  }

  /**
   * Load cooldowns from database and populate in-memory map.
   * Returns list of active cooldowns for emission to client.
   */
  async loadCooldownsFromDb(playerId: string): Promise<AbilityCooldown[]> {
    const db = this.databaseService.getClient();
    const dbCooldowns = await loadCooldowns(db, playerId);

    const activeCooldowns: AbilityCooldown[] = [];
    for (const cd of dbCooldowns) {
      const endsAt = cd.expiresAt.getTime();
      const key = `${playerId}:${cd.abilityId}`;
      this.cooldowns.set(key, endsAt);
      activeCooldowns.push({ abilityId: cd.abilityId, endsAt });
    }

    return activeCooldowns;
  }

  /**
   * Restore cooldowns from DB and emit to client.
   * Called on player auth/reconnect.
   */
  async restoreCooldowns(playerId: string, socketId: string): Promise<void> {
    const cooldowns = await this.loadCooldownsFromDb(playerId);

    // Emit each cooldown to socket
    for (const cd of cooldowns) {
      this.server?.to(socketId).emit('ability:cooldown', {
        abilityId: cd.abilityId,
        cooldownEndsAt: cd.endsAt,
      });
    }
  }

  /**
   * Check if player is currently casting an ability.
   */
  isPlayerCasting(playerId: string): boolean {
    return this.activeCasts.has(playerId);
  }

  /**
   * Interrupt an active cast for a player.
   */
  interruptCast(playerId: string, reason: 'moved' | 'damaged' | 'cancelled' | 'died'): void {
    const cast = this.activeCasts.get(playerId);
    if (!cast) return;

    clearTimeout(cast.timeoutHandle);
    this.activeCasts.delete(playerId);

    this.server?.to(cast.socketId).emit('cast:interrupt', {
      abilityId: cast.abilityId,
      reason,
    });
  }

  /**
   * Handle player.damaged event — interrupt any active cast.
   */
  @OnEvent('player.damaged')
  handlePlayerDamaged(payload: { playerId: string }): void {
    this.interruptCast(payload.playerId, 'damaged');
  }

  /**
   * Use an ability. Validates and executes ability, returning result.
   * Abilities with castTimeMs > 0 will begin a cast and complete after the timer.
   */
  async useAbility(
    socketId: string,
    abilityId: string,
    targetEntityId?: string,
  ): Promise<UseAbilityResult> {
    const player = this.playerService.getPlayerBySocket(socketId);
    if (!player) {
      return { success: false, error: 'Player not found' };
    }

    // Block ability use while casting
    if (this.isPlayerCasting(player.id)) {
      return { success: false, error: 'Cannot use abilities while casting' };
    }

    // Check GCD
    if (this.isOnGcd(player.id)) {
      return { success: false, error: 'On cooldown' };
    }

    // Check player has ability (from equipped items)
    const abilities = this.getPlayerAbilities(player.id);
    const ability = abilities.find(a => a.id === abilityId);
    if (!ability) {
      return { success: false, error: 'Ability not available' };
    }

    // Hub zones are safe - no offensive abilities (but gathering and utility are allowed)
    const isGatherAbility = ability.effects.some(e => e.type === 'gather');
    const isUtilityAbility = ability.category === 'utility';
    if (isHubZone(player.position.zoneId) && !isGatherAbility && !isUtilityAbility) {
      return { success: false, error: 'Combat abilities are disabled in hub zones' };
    }

    // Check ability cooldown
    if (this.isOnCooldown(player.id, abilityId)) {
      return { success: false, error: 'On cooldown' };
    }

    // Check energy
    if (player.energy < ability.energyCost) {
      return { success: false, error: 'No energy' };
    }

    // Handle target requirement
    const hasGatherEffect = ability.effects.some(e => e.type === 'gather');

    if (ability.requiresTarget) {
      // Auto-target nearest valid entity when no target provided
      if (!targetEntityId) {
        const autoTarget = this.findNearestTarget(player, ability);
        if (!autoTarget) {
          return { success: false, error: 'No target' };
        }
        targetEntityId = autoTarget.id;
      }

      // Cross-zone entity lookup (search player's zone + 8 adjacent zones)
      const found = await this.zonesService.findEntityAcrossZones(player.position.zoneId, targetEntityId);
      if (!found) {
        return { success: false, error: 'Target not found' };
      }
      const entity = found.entity;

      // Gather abilities can target plants/minerals/artifacts, combat abilities target creatures
      if (hasGatherEffect) {
        if (entity.type !== 'plant' && entity.type !== 'mineral' && entity.type !== 'artifact') {
          return { success: false, error: 'Invalid target for gathering' };
        }
        // Range check for gathering (pixel distance, Phase 133)
        const rangeCheck = canInteractPixel(player.px, player.py, entity, GATHER_RANGE_PX);
        if (!rangeCheck.canInteract) {
          return { success: false, error: rangeCheck.reason };
        }
      } else {
        if (entity.type !== 'creature') {
          return { success: false, error: "Can't attack that" };
        }

        const target = entity as Creature;
        if (!target.active || target.health <= 0) {
          return { success: false, error: 'Target is dead' };
        }

        // Range check (pixel distance, Phase 133): convert tile range to pixels
        // +0.5 tile buffer accounts for player standing at adjacent tile edge
        const rangePx = (ability.range + 0.5) * TILE_SIZE_PX;
        const rangeCheck = canInteractPixel(player.px, player.py, target, rangePx);
        if (!rangeCheck.canInteract) {
          return { success: false, error: 'Out of range' };
        }
      }
    }

    // home_recall: extra validation (but don't execute yet — cast time handles it)
    if (abilityId === 'home_recall') {
      if (isHubZone(player.position.zoneId)) {
        return { success: false, error: 'Already in hub' };
      }
    }

    // Cast time branching: if ability has a cast time, start casting instead of executing
    const castTimeMs = ability.castTimeMs ?? 0;
    if (castTimeMs > 0) {
      // Compute effective cast time (haste reduces by 1% per point, cap 50%)
      const inventory = this.inventoryService.getInventory(player.id);
      const playerEquipment = inventory?.equipment as EquipmentJson ?? { modules: [] };
      const playerBuffs = this.getActiveBuffs(player.id);
      const playerStats = computeCharStats(player.level, playerEquipment, 'player', playerBuffs);
      const hasteReduction = Math.min(0.5, playerStats.haste * 0.01);
      const effectiveCastTime = Math.floor(castTimeMs * (1 - hasteReduction));

      const castEndsAt = Date.now() + effectiveCastTime;
      const timeoutHandle = setTimeout(() => {
        this.completeCast(player.id);
      }, effectiveCastTime);

      this.activeCasts.set(player.id, {
        playerId: player.id,
        socketId,
        abilityId,
        targetEntityId,
        castEndsAt,
        timeoutHandle,
      });

      this.server?.to(socketId).emit('cast:start', {
        abilityId,
        targetEntityId,
        castTimeMs: effectiveCastTime,
        castEndsAt,
      });

      this.setGcd(player.id);
      return { success: true, casting: true };
    }

    // Instant execution path
    return this.executeAbilityEffects(socketId, ability, targetEntityId);
  }

  /**
   * Complete a cast — re-validates and executes the ability.
   */
  private async completeCast(playerId: string): Promise<void> {
    const cast = this.activeCasts.get(playerId);
    if (!cast) {
      console.log(`[ABILITY] completeCast: no active cast for ${playerId}`);
      return;
    }

    this.activeCasts.delete(playerId);
    console.log(`[ABILITY] completeCast: abilityId=${cast.abilityId} target=${cast.targetEntityId ?? 'none'} player=${playerId}`);

    const player = this.playerService.getPlayerById(playerId);
    if (!player) {
      console.log(`[ABILITY] completeCast: player not found ${playerId}`);
      return;
    }

    const ability = AbilityRegistry.get(cast.abilityId);
    if (!ability) {
      console.log(`[ABILITY] completeCast: ability not found ${cast.abilityId}`);
      return;
    }

    // Re-validate energy
    if (player.energy < ability.energyCost) {
      this.server?.to(cast.socketId).emit('ability:result', {
        success: false,
        abilityId: cast.abilityId,
        error: 'No energy',
      });
      return;
    }

    // Re-validate target if required (cross-zone lookup)
    if (ability.requiresTarget && cast.targetEntityId) {
      const found = await this.zonesService.findEntityAcrossZones(player.position.zoneId, cast.targetEntityId);
      if (!found) {
        this.server?.to(cast.socketId).emit('ability:result', {
          success: false,
          abilityId: cast.abilityId,
          error: 'Target no longer available',
        });
        return;
      }
      const entity = found.entity;
      // For combat targets, check still alive
      if (entity.type === 'creature') {
        const creature = entity as Creature;
        if (!creature.active || creature.health <= 0) {
          this.server?.to(cast.socketId).emit('ability:result', {
            success: false,
            abilityId: cast.abilityId,
            error: 'Target is dead',
          });
          return;
        }
      }
    }

    // Execute the ability effects
    const result = await this.executeAbilityEffects(cast.socketId, ability, cast.targetEntityId);
    console.log(`[ABILITY] completeCast result: success=${result.success} error=${result.error ?? 'none'} abilityId=${cast.abilityId}`);

    // Emit result to client
    this.server?.to(cast.socketId).emit('ability:result', {
      success: result.success,
      abilityId: cast.abilityId,
      error: result.error,
      damage: result.damage,
      targetHealth: result.targetHealth,
      targetMaxHealth: result.targetMaxHealth,
      energyRemaining: result.energyRemaining,
      cooldownEndsAt: result.cooldownEndsAt,
    });

    if (result.success && result.cooldownEndsAt) {
      this.server?.to(cast.socketId).emit('ability:cooldown', {
        abilityId: cast.abilityId,
        cooldownEndsAt: result.cooldownEndsAt,
      });
    }
  }

  /**
   * Execute ability effects (energy consumption, cooldowns, effects).
   * Called by both instant path and completeCast.
   */
  private async executeAbilityEffects(
    socketId: string,
    ability: AbilityDefinition,
    targetEntityId?: string,
  ): Promise<UseAbilityResult> {
    const player = this.playerService.getPlayerBySocket(socketId);
    if (!player) return { success: false, error: 'Player not found' };

    // Handle home_recall special effect
    if (ability.id === 'home_recall') {
      // Teleport to hub
      const result = await this.playerService.teleportToHub(player.id);
      if (!result.success) {
        return { success: false, error: result.error };
      }

      // Set cooldown
      const cooldownEndsAt = this.setCooldown(player.id, ability.id, ability.cooldownMs);
      this.setGcd(player.id);

      // Emit zone transition events (gateway will handle zone:state emission)
      if (result.oldZoneId) {
        this.server?.to(result.oldZoneId).emit('player:left', { playerId: player.id });
      }

      // Emit domain event so gateway can handle room changes + zone:state
      this.eventEmitter.emit('player.teleported', {
        playerId: player.id,
        socketId,
        oldZoneId: result.oldZoneId,
        newZoneId: result.newZoneId,
      });

      return {
        success: true,
        cooldownEndsAt,
      };
    }

    // Consume energy
    const newEnergy = player.energy - ability.energyCost;
    this.playerService.updateEnergy(player.id, newEnergy);

    // Get tool stats from equipped item (for gather abilities)
    let toolStats = { yieldBonus: 0, gatherSpeed: 0 };
    const inventory = this.inventoryService.getInventory(player.id);
    if (inventory?.equipment.tool) {
      const toolDef = ItemRegistry.get(inventory.equipment.tool.itemId);
      // Extract stats from effects array (stats are stored as an effect with type='stats')
      const statsEffect = toolDef?.effects?.find(
        (e) => e.effect.type === 'stats'
      );
      if (statsEffect && statsEffect.effect.type === 'stats') {
        toolStats = {
          yieldBonus: statsEffect.effect.yieldBonus ?? 0,
          gatherSpeed: statsEffect.effect.gatherSpeed ?? 0,
        };
      }
    }

    // Apply gatherSpeed to cooldown calculation for gathering abilities
    let cooldownMs = ability.cooldownMs;
    if (ability.effects.some(e => e.type === 'gather')) {
      const speedReduction = 1 - toolStats.gatherSpeed;
      cooldownMs = Math.floor(cooldownMs * speedReduction);
    }

    // Set cooldowns
    const cooldownEndsAt = this.setCooldown(player.id, ability.id, cooldownMs);
    this.setGcd(player.id);

    // Apply effects via strategy pattern
    let damage = 0;
    let targetHealth: number | undefined;
    let targetMaxHealth: number | undefined;

    const effectServices = this.buildEffectServices();
    const playerRef: PlayerRef = this.toPlayerRef(player)!;

    for (const effect of ability.effects) {
      const strategy = getEffectStrategy(effect.type);
      if (!strategy) {
        console.warn(`[ABILITY] No strategy registered for effect type: ${effect.type}`);
        continue;
      }

      const effectContext: EffectContext = {
        effect,
        ability,
        socketId,
        player: playerRef,
        targetEntityId,
        toolStats,
        services: effectServices,
      };

      const result = await strategy.apply(effectContext);

      if (!result.success && result.earlyReturn) {
        return { success: false, error: result.error };
      }

      if (result.damage !== undefined) {
        damage += result.damage;
      }
      if (result.targetHealth !== undefined) {
        targetHealth = result.targetHealth;
      }
      if (result.targetMaxHealth !== undefined) {
        targetMaxHealth = result.targetMaxHealth;
      }
    }

    return {
      success: true,
      damage: damage > 0 ? damage : undefined,
      targetHealth,
      targetMaxHealth,
      energyRemaining: newEnergy,
      cooldownEndsAt,
    };
  }

  /**
   * Intercept incoming damage with active shield. Returns absorbed and passthrough amounts.
   */
  interceptShield(playerId: string, incomingDamage: number): { absorbed: number; passthrough: number } {
    const shield = this.activeShields.get(playerId);
    if (!shield || Date.now() >= shield.expiresAt) {
      this.activeShields.delete(playerId);
      return { absorbed: 0, passthrough: incomingDamage };
    }
    const absorbed = Math.min(shield.absorbRemaining, incomingDamage);
    shield.absorbRemaining -= absorbed;
    const playerSocket = this.playerService.getSocketByPlayerId(playerId);
    if (shield.absorbRemaining <= 0) {
      this.activeShields.delete(playerId);
      if (playerSocket) {
        this.server?.to(playerSocket).emit('shield:expire', { playerId });
      }
    } else if (playerSocket) {
      this.server?.to(playerSocket).emit('shield:absorb', {
        absorbed,
        remaining: shield.absorbRemaining,
        maxAbsorb: shield.maxAbsorb,
      });
    }
    return { absorbed, passthrough: incomingDamage - absorbed };
  }

  /**
   * Apply flat damage reduction if active. Returns reduced damage amount.
   */
  applyDamageReduction(playerId: string, damage: number): { reducedDamage: number; reducedBy: number } {
    const dr = this.activeDamageReductions.get(playerId);
    if (!dr || Date.now() >= dr.expiresAt) {
      this.activeDamageReductions.delete(playerId);
      return { reducedDamage: damage, reducedBy: 0 };
    }
    const reducedBy = Math.round(damage * dr.reductionPercent);
    return { reducedDamage: damage - reducedBy, reducedBy };
  }

  /**
   * Check if a creature is currently stunned.
   */
  isCreatureStunned(creatureId: string): boolean {
    const expiresAt = this.stunnedCreatures.get(creatureId);
    if (!expiresAt) return false;
    if (Date.now() >= expiresAt) {
      this.stunnedCreatures.delete(creatureId);
      return false;
    }
    return true;
  }

  /**
   * Check if a player has active hazard immunity (for Phase 120 HazardService).
   */
  isHazardImmune(playerId: string): boolean {
    const expiresAt = this.hazardImmunities.get(playerId);
    if (!expiresAt) return false;
    if (Date.now() >= expiresAt) {
      this.hazardImmunities.delete(playerId);
      return false;
    }
    return true;
  }

  /**
   * Calculate reflected damage from Magnetic Field. Returns damage to reflect back to attacker.
   */
  getReflectDamage(playerId: string, incomingDamage: number): number {
    const reflect = this.activeReflects.get(playerId);
    if (!reflect || Date.now() >= reflect.expiresAt) {
      this.activeReflects.delete(playerId);
      return 0;
    }
    return Math.round(incomingDamage * reflect.reflectPercent);
  }

  /**
   * Clean up cooldowns for disconnected player.
   */
  handleDisconnect(playerId: string): void {
    // Interrupt any active cast
    this.interruptCast(playerId, 'died');

    // Clear all active buffs
    this.clearBuffs(playerId);

    // Clean up all cooldowns for this player
    const keysToDelete: string[] = [];
    for (const key of this.cooldowns.keys()) {
      if (key.startsWith(`${playerId}:`)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(k => this.cooldowns.delete(k));
    this.globalCooldowns.delete(playerId);

    // Clean up defensive state maps
    this.activeShields.delete(playerId);
    this.activeDamageReductions.delete(playerId);
    this.hazardImmunities.delete(playerId);
    this.activeReflects.delete(playerId);
    // Note: stunnedCreatures is keyed by creatureId, not playerId — no cleanup needed on player disconnect
  }

  /**
   * Get all active buffs for a player.
   */
  getActiveBuffs(playerId: string): Buff[] {
    return this.activeBuffs.get(playerId) ?? [];
  }

  /**
   * Apply a buff to a player. If same abilityId+stat exists, refresh duration.
   */
  applyBuff(playerId: string, buff: Buff): void {
    const buffs = this.activeBuffs.get(playerId) ?? [];

    // Check for existing buff with same abilityId + stat (refresh strategy)
    const existingIndex = buffs.findIndex(
      (b) => b.abilityId === buff.abilityId && b.stat === buff.stat
    );

    if (existingIndex >= 0) {
      // Refresh duration, keep same buff id
      buffs[existingIndex].expiresAt = buff.expiresAt;
    } else {
      // Add new buff (max 15 buffs per player)
      if (buffs.length >= 15) {
        // Remove oldest buff
        const removed = buffs.shift();
        if (removed) {
          this.emitBuffExpire(playerId, removed.id);
        }
      }
      buffs.push(buff);
    }

    this.activeBuffs.set(playerId, buffs);

    // Emit buff:apply to player's zone
    const player = this.playerService.getPlayerById(playerId);
    if (player && this.server) {
      this.server.to(player.position.zoneId).emit('buff:apply', {
        buffId: buff.id,
        displayName: buff.displayName,
        stat: buff.stat,
        amount: buff.amount,
        expiresAt: buff.expiresAt,
        iconColor: buff.iconColor,
      });
    }
  }

  /**
   * Remove a buff from a player.
   */
  removeBuff(playerId: string, buffId: string): void {
    const buffs = this.activeBuffs.get(playerId);
    if (!buffs) return;

    const index = buffs.findIndex((b) => b.id === buffId);
    if (index >= 0) {
      buffs.splice(index, 1);
      if (buffs.length === 0) {
        this.activeBuffs.delete(playerId);
      }
      this.emitBuffExpire(playerId, buffId);
    }
  }

  /**
   * Emit buff:expire event to player's zone.
   */
  private emitBuffExpire(playerId: string, buffId: string): void {
    const player = this.playerService.getPlayerById(playerId);
    if (player && this.server) {
      this.server.to(player.position.zoneId).emit('buff:expire', { buffId });
    }
  }

  /**
   * Start the buff expiration tick loop.
   * Should be called once in setServer().
   */
  startBuffTick(): void {
    if (this.buffTickInterval) return;

    this.buffTickInterval = setInterval(() => {
      this.tickBuffExpiration();
    }, 500); // Check every 500ms
  }

  /**
   * Stop the buff expiration tick loop.
   */
  stopBuffTick(): void {
    if (this.buffTickInterval) {
      clearInterval(this.buffTickInterval);
      this.buffTickInterval = null;
    }
  }

  /**
   * Check for expired buffs and remove them.
   */
  private tickBuffExpiration(): void {
    const now = Date.now();

    for (const [playerId, buffs] of this.activeBuffs.entries()) {
      const expired: string[] = [];

      for (const buff of buffs) {
        if (now >= buff.expiresAt) {
          expired.push(buff.id);
        }
      }

      // Remove expired buffs and emit events
      for (const buffId of expired) {
        this.removeBuff(playerId, buffId);
      }
    }
  }

  /**
   * Clear all buffs for a player (called on disconnect/death).
   */
  clearBuffs(playerId: string): void {
    const buffs = this.activeBuffs.get(playerId);
    if (buffs) {
      for (const buff of buffs) {
        this.emitBuffExpire(playerId, buff.id);
      }
      this.activeBuffs.delete(playerId);
    }
  }

  /**
   * Find the nearest valid target for an ability when no target was specified.
   * For gather abilities: finds nearest plant/mineral/artifact in range.
   * For combat abilities: finds nearest active creature in range.
   */
  private findNearestTarget(player: any, ability: AbilityDefinition): Entity | undefined {
    const allEntities = this.zonesService.getEntitiesAcrossZones(player.position.zoneId);
    const isGather = ability.effects.some(e => e.type === 'gather');

    // Filter by valid target type
    const candidates = allEntities.filter(entity => {
      if (isGather) {
        return entity.type === 'plant' || entity.type === 'mineral' || entity.type === 'artifact';
      } else {
        if (entity.type !== 'creature') return false;
        const creature = entity as Creature;
        return creature.active && creature.health > 0;
      }
    });

    if (candidates.length === 0) return undefined;

    // Compute range limit in pixels
    const rangePx = isGather
      ? GATHER_RANGE_PX
      : (ability.range + 0.5) * TILE_SIZE_PX;

    // Find nearest by pixel distance
    let nearest: Entity | undefined;
    let nearestDist = Infinity;

    for (const entity of candidates) {
      // Entity pixel position: center of tile
      const entityPx = entity.position.x * TILE_SIZE_PX + TILE_SIZE_PX / 2;
      const entityPy = entity.position.y * TILE_SIZE_PX + TILE_SIZE_PX / 2;
      const dx = player.px - entityPx;
      const dy = player.py - entityPy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= rangePx && dist < nearestDist) {
        nearestDist = dist;
        nearest = entity;
      }
    }

    return nearest;
  }

  /**
   * Build EffectServices adapter that bridges NestJS services to the plain TS interface.
   * Used by effect strategies to interact with game state.
   */
  private buildEffectServices(): EffectServices {
    return {
      getPlayerBySocket: (sid) => this.toPlayerRef(this.playerService.getPlayerBySocket(sid)),
      getPlayerById: (pid) => this.toPlayerRef(this.playerService.getPlayerById(pid)),
      updateHealth: (pid, h) => this.playerService.updateHealth(pid, h),
      updateEnergy: (pid, e) => this.playerService.updateEnergy(pid, e),
      grantXp: (pid, xp) => this.playerService.grantXp(pid, xp),
      getSocketByPlayerId: (pid) => this.playerService.getSocketByPlayerId(pid),

      getEntity: async (zid, eid) => {
        const found = await this.zonesService.findEntityAcrossZones(zid, eid);
        return found?.entity;
      },
      getZoneEntities: (zid) => this.zonesService.getZoneEntities(zid),
      updateEntity: (zid, eid, c) => this.zonesService.updateEntity(zid, eid, c as any),
      recordEntityKill: (eid, zid, rs) => this.zonesService.recordEntityKill(eid, zid, rs),

      getInventory: (pid) => this.inventoryService.getInventory(pid),

      handleToolUse: (sid, eid, y) => this.entityService.handleToolUse(sid, eid, y),
      spawnGroundItemsForCombat: (l, x, y, z) => this.entityService.spawnGroundItemsForCombat(l, x, y, z),

      provokeCreature: (zid, cid) => this.combatService.provokeCreature(zid, cid),
      startCreatureCombat: (cid, pid, zid) => this.combatService.startCreatureCombat(cid, pid, zid),
      stopCreatureCombat: (cid) => { this.combatService.stopCreatureCombat(cid); },

      emitEvent: (evt, payload) => this.eventEmitter.emit(evt, payload),

      emitToZone: (zid, evt, payload) => { this.server?.to(zid).emit(evt, payload as any); },
      emitToSocket: (sid, evt, payload) => { this.server?.to(sid).emit(evt, payload as any); },

      getActiveBuffs: (pid) => this.getActiveBuffs(pid),
      applyBuff: (pid, buff) => this.applyBuff(pid, buff),

      setShield: (pid, s) => { this.activeShields.set(pid, s); },
      setDamageReduction: (pid, dr) => { this.activeDamageReductions.set(pid, dr); },
      setStunnedCreature: (cid, exp) => { this.stunnedCreatures.set(cid, exp); },
      deleteStunnedCreature: (cid) => { this.stunnedCreatures.delete(cid); },
      setHazardImmunity: (pid, exp) => { this.hazardImmunities.set(pid, exp); },
      setReflect: (pid, r) => { this.activeReflects.set(pid, r); },
    };
  }

  /**
   * Convert a player object to a PlayerRef for use in effect strategies.
   */
  private toPlayerRef(player: any): PlayerRef | undefined {
    if (!player) return undefined;
    return {
      id: player.id,
      name: player.name,
      level: player.level,
      health: player.health,
      maxHealth: player.maxHealth,
      energy: player.energy,
      position: player.position,
      px: player.px,
      py: player.py,
    };
  }
}
