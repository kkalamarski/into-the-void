import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { Server } from 'socket.io';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import * as crypto from 'crypto';
import { PlayerService } from './player.service';
import { ZonesService } from '../zones/zones.service';
import { InventoryService } from './inventory.service';
import { EntityService } from './entity.service';
import { CombatService } from './combat.service';
import { DatabaseService } from '../database/database.service';
import { Creature, ItemEntity, isHubZone } from '@into-the-void/shared-types';
import type { DamageType } from '@into-the-void/shared-types';
import { AbilityRegistry, canInteractPixel, pixelDistanceTo, tileToPixelCenter, MELEE_RANGE_PX, GATHER_RANGE_PX, TILE_SIZE_PX, calculateDamage, computeCharStats, rollLootTable, getCreatureLoot } from '@into-the-void/game-logic';
import { ItemRegistry } from '@into-the-void/items';
import { EntityRegistry } from '@into-the-void/entities';
import { saveCooldown, loadCooldowns } from '@into-the-void/database';
import type { CreatureDefinition } from '@into-the-void/entities';
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
      return { success: false, error: 'Global cooldown active' };
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
      return { success: false, error: 'Ability on cooldown' };
    }

    // Check energy
    if (player.energy < ability.energyCost) {
      return { success: false, error: 'Not enough energy' };
    }

    // Handle target requirement
    const hasGatherEffect = ability.effects.some(e => e.type === 'gather');

    if (ability.requiresTarget) {
      if (!targetEntityId) {
        return { success: false, error: 'Ability requires a target' };
      }

      const entity = await this.zonesService.getEntity(player.position.zoneId, targetEntityId);
      if (!entity) {
        return { success: false, error: 'Target not found' };
      }

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
          return { success: false, error: 'Invalid target type' };
        }

        const target = entity as Creature;
        if (!target.active || target.health <= 0) {
          return { success: false, error: 'Target is dead' };
        }

        // Range check (pixel distance, Phase 133): convert tile range to pixels
        const rangePx = ability.range * TILE_SIZE_PX;
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
        error: 'Not enough energy',
      });
      return;
    }

    // Re-validate target if required
    if (ability.requiresTarget && cast.targetEntityId) {
      const entity = await this.zonesService.getEntity(player.position.zoneId, cast.targetEntityId);
      if (!entity) {
        this.server?.to(cast.socketId).emit('ability:result', {
          success: false,
          abilityId: cast.abilityId,
          error: 'Target no longer available',
        });
        return;
      }
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

    // Apply effects
    let damage = 0;
    let targetHealth: number | undefined;
    let targetMaxHealth: number | undefined;

    for (const effect of ability.effects) {
      if (effect.type === 'damage') {
        // Read ability damage type
        const abilityDamageType = (effect as { type: 'damage'; baseDamage: number; scaling: number; damageType?: DamageType }).damageType;

        if (!ability.requiresTarget) {
          // AoE damage: hit all creatures in range of the player (ABIL-05: Overload Pulse)
          const nearbyCreatures = await this.getNearbyCreatures(
            player.position.zoneId,
            player.position.x,
            player.position.y,
            ability.range,
          );
          for (const aoeTarget of nearbyCreatures) {
            const creatureDef = EntityRegistry.get(aoeTarget.speciesId) as CreatureDefinition | undefined;
            const defenderResistances = creatureDef?.resistances;
            const inv = this.inventoryService.getInventory(player.id);
            const playerEquipment = inv?.equipment as EquipmentJson ?? { modules: [] };
            const playerBuffs = this.getActiveBuffs(player.id);
            const playerStats = computeCharStats(player.level, playerEquipment, 'player', playerBuffs);
            const emptyEquipment: EquipmentJson = { modules: [] };
            const creatureStats = computeCharStats(aoeTarget.level, emptyEquipment, 'creature');

            const aoeDamageResult = calculateDamage({
              baseDamage: effect.baseDamage,
              attackerLevel: player.level,
              defenderLevel: aoeTarget.level,
              attackerStats: playerStats,
              defenderStats: creatureStats,
              weaponDamage: effect.baseDamage * effect.scaling,
              armorReduction: creatureStats.toughness * 0.1,
              damageType: abilityDamageType,
              defenderResistances,
            });

            const aoeDamage = aoeDamageResult.damage;
            damage += aoeDamage;
            aoeTarget.health = Math.max(0, aoeTarget.health - aoeDamage);
            const aoeKilled = aoeTarget.health <= 0;

            await this.zonesService.updateEntity(player.position.zoneId, aoeTarget.id, {
              health: aoeTarget.health,
              active: !aoeKilled,
            } as Partial<Creature>);

            this.server?.to(player.position.zoneId).emit('entity:update', {
              entityId: aoeTarget.id,
              changes: { health: aoeTarget.health, maxHealth: aoeTarget.maxHealth, active: !aoeKilled },
            });

            if (!aoeKilled) {
              if (aoeTarget.behavior === 'omnivore') {
                await this.combatService.provokeCreature(player.position.zoneId, aoeTarget.id);
              }
              await this.zonesService.updateEntity(player.position.zoneId, aoeTarget.id, {
                combatTarget: player.id,
              } as Partial<Creature>);
              if (aoeTarget.behavior === 'predator' || aoeTarget.behavior === 'maniac' || aoeTarget.behavior === 'omnivore') {
                await this.combatService.startCreatureCombat(aoeTarget.id, player.id, player.position.zoneId);
              }
            } else {
              this.combatService.stopCreatureCombat(aoeTarget.id);
              const groundItems = await this.handleCreatureDeath(aoeTarget, player.position.zoneId);
              for (const item of groundItems) {
                this.server?.to(player.position.zoneId).emit('entity:spawn', item);
              }
              const levelDiff = aoeTarget.level - player.level;
              const levelBonus = levelDiff > 0 ? 1 + levelDiff * 0.1 : 1;
              const xpReward = Math.floor(10 * aoeTarget.level * levelBonus);
              this.playerService.grantXp(player.id, xpReward);
              this.eventEmitter.emit('entity.killed', {
                characterId: player.id,
                entityId: aoeTarget.speciesId,
                entityType: 'creature',
                creatureLevel: aoeTarget.level,
                zoneId: player.position.zoneId,
              });
              this.server?.to(player.position.zoneId).emit('entity:despawn', { entityId: aoeTarget.id });
            }

            this.server?.to(player.position.zoneId).emit('combat:damage', {
              attackerId: player.id,
              attackerName: player.name,
              defenderId: aoeTarget.id,
              defenderName: aoeTarget.name,
              damage: aoeDamage,
              defenderHealth: aoeTarget.health,
              defenderMaxHealth: aoeTarget.maxHealth,
              critical: aoeDamageResult.critical,
              killed: aoeKilled,
              damageType: abilityDamageType,
              defenderPosition: { x: aoeTarget.position.x, y: aoeTarget.position.y },
            });
          }
        } else {
          // Single-target damage (existing code)
          if (!targetEntityId) continue;
          const entity = await this.zonesService.getEntity(player.position.zoneId, targetEntityId);
          if (!entity || entity.type !== 'creature') continue;
          const target = entity as Creature;

          // Look up creature definition for resistances
          const creatureDef = EntityRegistry.get(target.speciesId) as CreatureDefinition | undefined;
          const defenderResistances = creatureDef?.resistances;

          // ABIL-01: Conditional damage bonus (e.g., Plasma Burst +50% above 80% HP)
          let conditionMultiplier = 1.0;
          const damageEffect = effect as { type: 'damage'; baseDamage: number; scaling: number; damageType?: DamageType; conditionBonus?: { hpThresholdAbove: number; multiplier: number } };
          if (damageEffect.conditionBonus && target.health / target.maxHealth > damageEffect.conditionBonus.hpThresholdAbove) {
            conditionMultiplier = damageEffect.conditionBonus.multiplier;
          }

          // Calculate damage
          const inv = this.inventoryService.getInventory(player.id);
          const playerEquipment = inv?.equipment as EquipmentJson ?? { modules: [] };
          const playerBuffs = this.getActiveBuffs(player.id);
          const playerStats = computeCharStats(player.level, playerEquipment, 'player', playerBuffs);

          const emptyEquipment: EquipmentJson = { modules: [] };
          const creatureStats = computeCharStats(target.level, emptyEquipment, 'creature');

          // Read damage_type_bonus from equipped gear for this damage type
          let damageBonusMultiplier = 1.0;
          if (abilityDamageType) {
            const equippedSlots = [
              inv?.equipment?.exosuit,
              inv?.equipment?.tool,
              ...(inv?.equipment?.modules ?? []),
            ].filter(Boolean);
            for (const equipped of equippedSlots) {
              const itemDef = ItemRegistry.get(equipped!.itemId);
              for (const effectDef of itemDef?.effects ?? []) {
                if (effectDef.effect.type === 'damage_type_bonus' && effectDef.effect.damageType === abilityDamageType) {
                  damageBonusMultiplier += effectDef.effect.bonusPercent / 100;
                }
              }
            }
          }

          const damageResult = calculateDamage({
            baseDamage: Math.round(effect.baseDamage * conditionMultiplier),
            attackerLevel: player.level,
            defenderLevel: target.level,
            attackerStats: playerStats,
            defenderStats: creatureStats,
            weaponDamage: Math.round(effect.baseDamage * effect.scaling * conditionMultiplier),
            armorReduction: creatureStats.toughness * 0.1,
            damageType: abilityDamageType,
            defenderResistances,
            damageBonusMultiplier: damageBonusMultiplier > 1.0 ? damageBonusMultiplier : undefined,
          });

          damage = damageResult.damage;
          target.health = Math.max(0, target.health - damage);
          targetHealth = target.health;
          targetMaxHealth = target.maxHealth;

          const killed = target.health <= 0;
          let groundItems: ItemEntity[] = [];

          // Update entity in zone
          await this.zonesService.updateEntity(player.position.zoneId, targetEntityId, {
            health: target.health,
            active: !killed,
          } as Partial<Creature>);

          // Trigger creature retaliation if not killed
          if (!killed) {
            if (target.behavior === 'omnivore') {
              await this.combatService.provokeCreature(player.position.zoneId, targetEntityId);
            }
            await this.zonesService.updateEntity(player.position.zoneId, targetEntityId, {
              combatTarget: player.id,
            } as Partial<Creature>);
            if (target.behavior === 'predator' || target.behavior === 'maniac' || target.behavior === 'omnivore') {
              await this.combatService.startCreatureCombat(targetEntityId, player.id, player.position.zoneId);
            }
          }

          // Emit entity:update so entityStore syncs for UI (TargetFrame, etc.)
          this.server?.to(player.position.zoneId).emit('entity:update', {
            entityId: targetEntityId,
            changes: { health: target.health, maxHealth: target.maxHealth, active: !killed },
          });

          // Handle creature death: spawn loot and schedule respawn
          if (killed) {
            this.combatService.stopCreatureCombat(targetEntityId);
            groundItems = await this.handleCreatureDeath(target, player.position.zoneId);
            for (const item of groundItems) {
              this.server?.to(player.position.zoneId).emit('entity:spawn', item);
            }
            const levelDiff = target.level - player.level;
            const levelBonus = levelDiff > 0 ? 1 + levelDiff * 0.1 : 1;
            const xpReward = Math.floor(10 * target.level * levelBonus);
            this.playerService.grantXp(player.id, xpReward);
            this.eventEmitter.emit('entity.killed', {
              characterId: player.id,
              entityId: target.speciesId,
              entityType: 'creature',
              creatureLevel: target.level,
              zoneId: player.position.zoneId,
            });
            this.server?.to(player.position.zoneId).emit('entity:despawn', { entityId: targetEntityId });
          }

          // Broadcast damage to zone
          this.server?.to(player.position.zoneId).emit('combat:damage', {
            attackerId: player.id,
            attackerName: player.name,
            defenderId: targetEntityId,
            defenderName: target.name,
            damage,
            defenderHealth: target.health,
            defenderMaxHealth: target.maxHealth,
            critical: damageResult.critical,
            killed,
            damageType: abilityDamageType,
            groundItems: groundItems.length > 0 ? groundItems : undefined,
            defenderPosition: { x: target.position.x, y: target.position.y },
          });
        }
      }

      // Handle heal effect (self-heal)
      if (effect.type === 'heal') {
        const inv = this.inventoryService.getInventory(player.id);
        const playerEquipment = inv?.equipment as EquipmentJson ?? { modules: [] };
        const playerBuffs = this.getActiveBuffs(player.id);
        const playerStats = computeCharStats(player.level, playerEquipment, 'player', playerBuffs);

        const healAmount = Math.floor(effect.baseHeal + (effect.scaling * playerStats.power));
        const newHealth = Math.min(player.maxHealth, player.health + healAmount);

        this.playerService.updateHealth(player.id, newHealth);

        this.server?.to(player.position.zoneId).emit('player:health', {
          playerId: player.id,
          health: newHealth,
          maxHealth: player.maxHealth,
        });
      }

      // Handle buff effect (apply duration buff to self)
      if (effect.type === 'buff') {
        const buff: Buff = {
          id: crypto.randomUUID(),
          abilityId: ability.id,
          stat: effect.stat,
          amount: effect.amount,
          expiresAt: Date.now() + effect.duration,
          displayName: ability.displayName,
          iconColor: ability.iconColor,
        };
        this.applyBuff(player.id, buff);
      }

      // Handle gather effect (harvest from plants, mine from minerals, universal)
      if (effect.type === 'gather') {
        const gatherResult = await this.handleGatherEffect(
          socketId,
          targetEntityId!,
          effect,
          toolStats
        );
        if (!gatherResult.success) {
          return { success: false, error: gatherResult.error };
        }
      }

      // Handle shield effect (ABIL-09: Emergency Shield)
      if (effect.type === 'shield') {
        this.activeShields.set(player.id, {
          absorbRemaining: effect.absorbAmount,
          maxAbsorb: effect.absorbAmount,
          expiresAt: Date.now() + effect.durationMs,
        });
        // Emit shield:apply to player's socket for HUD shield bar
        this.server?.to(socketId).emit('shield:apply', {
          absorbAmount: effect.absorbAmount,
          durationMs: effect.durationMs,
          expiresAt: Date.now() + effect.durationMs,
        });
      }

      // Handle damage reduction effect (ABIL-12: Fortify Systems)
      if (effect.type === 'damage_reduction') {
        this.activeDamageReductions.set(player.id, {
          reductionPercent: effect.reductionPercent,
          expiresAt: Date.now() + effect.durationMs,
        });
        // Emit as a buff-like event so client can show buff icon
        this.server?.to(socketId).emit('buff:apply', {
          buffId: crypto.randomUUID(),
          displayName: ability.displayName,
          stat: 'damage_reduction',
          amount: Math.round(effect.reductionPercent * 100),
          expiresAt: Date.now() + effect.durationMs,
          iconColor: ability.iconColor,
        });
      }

      // Handle stun effect (ABIL-08: Concussive Strike)
      if (effect.type === 'stun' && targetEntityId) {
        const stunEntity = await this.zonesService.getEntity(player.position.zoneId, targetEntityId);
        if (stunEntity && stunEntity.type === 'creature') {
          const stunTarget = stunEntity as Creature;
          // ABIL-08: 3s vs maniacs, 1s otherwise
          let stunMs = effect.durationMs;
          if (stunTarget.behavior === 'maniac' && effect.maniacDurationMs) {
            stunMs = effect.maniacDurationMs;
          }
          this.stunnedCreatures.set(targetEntityId, Date.now() + stunMs);
          // Emit stun visual to zone
          this.server?.to(player.position.zoneId).emit('entity:update', {
            entityId: targetEntityId,
            changes: { stunned: true },
          });
          // Schedule stun expiry emission
          setTimeout(() => {
            this.stunnedCreatures.delete(targetEntityId);
            this.server?.to(player.position.zoneId).emit('entity:update', {
              entityId: targetEntityId,
              changes: { stunned: false },
            });
          }, stunMs);
        }
      }

      // Handle hazard immunity effect (ABIL-13: Energy Barrier)
      if (effect.type === 'hazard_immunity') {
        this.hazardImmunities.set(player.id, Date.now() + effect.durationMs);
        // Emit as a buff-like event for client display
        this.server?.to(socketId).emit('buff:apply', {
          buffId: crypto.randomUUID(),
          displayName: ability.displayName,
          stat: 'hazard_immunity',
          amount: 1,
          expiresAt: Date.now() + effect.durationMs,
          iconColor: ability.iconColor,
        });
      }

      // Handle DoT spread effect (ABIL-04: Electrocute chain spread)
      if (effect.type === 'dot') {
        const dotEffect = effect as { type: 'dot'; damagePerTick: number; tickInterval: number; duration: number; spreadRadius?: number };
        if (dotEffect.spreadRadius && dotEffect.spreadRadius > 0 && targetEntityId) {
          const primaryTarget = await this.zonesService.getEntity(player.position.zoneId, targetEntityId);
          if (primaryTarget && primaryTarget.type === 'creature') {
            const primary = primaryTarget as Creature;
            const nearbyCreatures = await this.getNearbyCreatures(
              player.position.zoneId,
              primary.position.x,
              primary.position.y,
              dotEffect.spreadRadius,
              targetEntityId,
            );
            for (const nearby of nearbyCreatures) {
              const spreadDamage = dotEffect.damagePerTick;
              nearby.health = Math.max(0, nearby.health - spreadDamage);
              const spreadKilled = nearby.health <= 0;
              await this.zonesService.updateEntity(player.position.zoneId, nearby.id, {
                health: nearby.health,
                active: !spreadKilled,
              } as Partial<Creature>);
              this.server?.to(player.position.zoneId).emit('combat:damage', {
                attackerId: player.id,
                attackerName: player.name,
                defenderId: nearby.id,
                defenderName: nearby.name,
                damage: spreadDamage,
                defenderHealth: nearby.health,
                defenderMaxHealth: nearby.maxHealth,
                critical: false,
                killed: spreadKilled,
                defenderPosition: { x: nearby.position.x, y: nearby.position.y },
              });
              if (!spreadKilled) {
                if (nearby.behavior === 'omnivore') {
                  await this.combatService.provokeCreature(player.position.zoneId, nearby.id);
                }
                if (nearby.behavior === 'predator' || nearby.behavior === 'maniac' || nearby.behavior === 'omnivore') {
                  await this.combatService.startCreatureCombat(nearby.id, player.id, player.position.zoneId);
                }
              } else {
                this.combatService.stopCreatureCombat(nearby.id);
                const groundItems = await this.handleCreatureDeath(nearby, player.position.zoneId);
                for (const item of groundItems) {
                  this.server?.to(player.position.zoneId).emit('entity:spawn', item);
                }
                const levelDiff = nearby.level - player.level;
                const levelBonus = levelDiff > 0 ? 1 + levelDiff * 0.1 : 1;
                const xpReward = Math.floor(10 * nearby.level * levelBonus);
                this.playerService.grantXp(player.id, xpReward);
                this.server?.to(player.position.zoneId).emit('entity:despawn', { entityId: nearby.id });
              }
            }
          }
        }
      }

      // Handle reveal effect (ABIL-06: Precision Shot predator reveal)
      if (effect.type === 'reveal') {
        const entities = await this.zonesService.getZoneEntities(player.position.zoneId);
        const predatorsInRange = entities.filter(
          (e): e is Creature =>
            e.type === 'creature' &&
            (e as Creature).active &&
            (e as Creature).behavior === 'predator' &&
            (() => {
              const { px: ePx, py: ePy } = tileToPixelCenter(e.position.x, e.position.y);
              return pixelDistanceTo(ePx, ePy, player.px, player.py) <= effect.radiusTiles * TILE_SIZE_PX;
            })(),
        );
        for (const pred of predatorsInRange) {
          await this.zonesService.updateEntity(player.position.zoneId, pred.id, {
            revealed: true,
          } as Partial<Creature>);
          this.server?.to(player.position.zoneId).emit('entity:update', {
            entityId: pred.id,
            changes: { revealed: true },
          });
          // Schedule reveal expiry
          const revealZoneId = player.position.zoneId;
          const revealEntityId = pred.id;
          setTimeout(async () => {
            await this.zonesService.updateEntity(revealZoneId, revealEntityId, {
              revealed: false,
            } as Partial<Creature>);
            this.server?.to(revealZoneId).emit('entity:update', {
              entityId: revealEntityId,
              changes: { revealed: false },
            });
          }, effect.durationMs);
        }
      }

      // Handle reflect effect (ABIL-11: Magnetic Field)
      if (effect.type === 'reflect') {
        this.activeReflects.set(player.id, {
          reflectPercent: effect.reflectPercent,
          expiresAt: Date.now() + effect.durationMs,
        });
        // Emit as buff for client display
        this.server?.to(socketId).emit('buff:apply', {
          buffId: crypto.randomUUID(),
          displayName: ability.displayName,
          stat: 'reflect',
          amount: Math.round(effect.reflectPercent * 100),
          expiresAt: Date.now() + effect.durationMs,
          iconColor: ability.iconColor,
        });
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
   * Find active creatures within a given radius (in tiles).
   * Used for Electrocute DoT spread and Overload Pulse AoE.
   * Phase 133: migrated from Chebyshev tile distance to pixel Euclidean distance.
   */
  private async getNearbyCreatures(
    zoneId: string,
    centerX: number,
    centerY: number,
    radius: number,
    excludeId?: string,
  ): Promise<Creature[]> {
    const entities = await this.zonesService.getZoneEntities(zoneId);
    const { px: cPx, py: cPy } = tileToPixelCenter(centerX, centerY);
    const radiusPx = radius * TILE_SIZE_PX;
    return entities.filter(
      (e): e is Creature => {
        if (
          e.type !== 'creature' ||
          !(e as Creature).active ||
          (e as Creature).health <= 0 ||
          e.id === excludeId
        ) {
          return false;
        }
        const { px: ePx, py: ePy } = tileToPixelCenter(e.position.x, e.position.y);
        return pixelDistanceTo(cPx, cPy, ePx, ePy) <= radiusPx;
      },
    );
  }

  /**
   * Handle gather effect from harvest/mine abilities.
   * Validates entity type, calculates yield with tool bonus, and processes gathering.
   */
  private async handleGatherEffect(
    socketId: string,
    targetEntityId: string,
    effect: { type: 'gather'; gatherType: 'harvest' | 'mine' | 'universal'; baseYield: number },
    toolStats: { yieldBonus: number; gatherSpeed: number }
  ): Promise<{ success: boolean; error?: string }> {
    // 1. Get target entity
    const player = this.playerService.getPlayerBySocket(socketId);
    if (!player) {
      return { success: false, error: 'Player not found' };
    }

    const entity = await this.zonesService.getEntity(player.position.zoneId, targetEntityId);
    if (!entity) {
      return { success: false, error: 'Target not found' };
    }

    // 2. Resolve gather type for universal
    let resolvedType = effect.gatherType;
    if (resolvedType === 'universal') {
      if (entity.type === 'plant') {
        resolvedType = 'harvest';
      } else if (entity.type === 'mineral') {
        resolvedType = 'mine';
      } else if (entity.type === 'artifact') {
        // Artifacts use handleToolUse directly — no special resolution needed
        resolvedType = 'harvest'; // Placeholder; artifact path below
      } else {
        return { success: false, error: 'Cannot gather from this target' };
      }
    }

    // 3. Validate entity type matches resolved gather type (non-universal)
    if (effect.gatherType !== 'universal') {
      if (resolvedType === 'harvest' && entity.type !== 'plant') {
        return { success: false, error: 'Cannot harvest this target' };
      }
      if (resolvedType === 'mine' && entity.type !== 'mineral') {
        return { success: false, error: 'Cannot mine this target' };
      }
    }

    // 4. Calculate yield with tool bonus + perception bonus for universal gather
    let yieldMultiplier = 1 + toolStats.yieldBonus;
    if (effect.gatherType === 'universal') {
      // Perception bonus: 1% per point, cap 50%
      const inventory = this.inventoryService.getInventory(player.id);
      const playerEquipment = inventory?.equipment as EquipmentJson ?? { modules: [] };
      const playerBuffs = this.getActiveBuffs(player.id);
      const playerStats = computeCharStats(player.level, playerEquipment, 'player', playerBuffs);
      const perceptionBonus = Math.min(0.5, playerStats.perception * 0.01);
      yieldMultiplier += perceptionBonus;
    }
    const finalYield = Math.max(1, Math.floor(effect.baseYield * yieldMultiplier));

    // 5. Call EntityService to process gathering
    console.log(`[ABILITY] handleGatherEffect: target=${targetEntityId} yield=${finalYield} resolvedType=${resolvedType}`);
    const result = await this.entityService.handleToolUse(
      socketId,
      targetEntityId,
      finalYield
    );
    console.log(`[ABILITY] handleGatherEffect result: success=${result.success} error=${result.error ?? 'none'}`);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    // 6. Emit events for entity update and loot
    if (result.entityChanges) {
      this.server?.to(player.position.zoneId).emit('entity:update', {
        entityId: targetEntityId,
        changes: result.entityChanges,
      });
    }

    if (result.groundItems && result.groundItems.length > 0) {
      for (const item of result.groundItems) {
        this.server?.to(player.position.zoneId).emit('entity:spawn', item);
      }
    }

    return { success: true };
  }

  /**
   * Handle creature death: spawn loot and schedule respawn.
   * Called when an ability kills a creature.
   */
  private async handleCreatureDeath(
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
}
