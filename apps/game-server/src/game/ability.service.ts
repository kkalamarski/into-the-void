import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { Server } from 'socket.io';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as crypto from 'crypto';
import { PlayerService } from './player.service';
import { ZonesService } from '../zones/zones.service';
import { InventoryService } from './inventory.service';
import { EntityService } from './entity.service';
import { CombatService } from './combat.service';
import { Creature, ItemEntity, isHubZone } from '@into-the-void/shared-types';
import { AbilityRegistry, canInteract, calculateDamage, computeCharStats, rollLootTable, getCreatureLoot } from '@into-the-void/game-logic';
import { ItemRegistry } from '@into-the-void/items';
import { EntityRegistry } from '@into-the-void/entities';
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
}

/** Global cooldown in milliseconds - prevents ability spam */
const GCD_MS = 500;

@Injectable()
export class AbilityService {
  /** Cooldowns indexed by `${playerId}:${abilityId}` */
  private cooldowns: Map<string, number> = new Map();

  /** GCD indexed by playerId - timestamp when GCD expires */
  private globalCooldowns: Map<string, number> = new Map();

  /** Active buffs indexed by playerId */
  private activeBuffs: Map<string, Buff[]> = new Map();

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
  ) {}

  setServer(server: Server): void {
    this.server = server;
    this.startBuffTick();
  }

  /**
   * Get all abilities available to a player from their equipped items.
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
   */
  setCooldown(playerId: string, abilityId: string, cooldownMs: number): number {
    const key = `${playerId}:${abilityId}`;
    const endsAt = Date.now() + cooldownMs;
    this.cooldowns.set(key, endsAt);
    return endsAt;
  }

  /**
   * Set global cooldown for a player.
   */
  setGcd(playerId: string): void {
    this.globalCooldowns.set(playerId, Date.now() + GCD_MS);
  }

  /**
   * Use an ability. Validates and executes ability, returning result.
   */
  async useAbility(
    socketId: string,
    abilityId: string,
    targetEntityId?: string,
  ): Promise<UseAbilityResult> {
    const player = this.playerService.getPlayerBySocket(socketId);
    if (!player) return { success: false, error: 'Player not found' };

    // Hub zones are safe - no offensive abilities
    if (isHubZone(player.position.zoneId)) {
      return { success: false, error: 'Abilities are disabled in hub zones' };
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

    // Check ability cooldown
    if (this.isOnCooldown(player.id, abilityId)) {
      return { success: false, error: 'Ability on cooldown' };
    }

    // Check energy
    if (player.energy < ability.energyCost) {
      return { success: false, error: 'Not enough energy' };
    }

    // Handle target requirement
    let target: Creature | null = null;
    if (ability.requiresTarget) {
      if (!targetEntityId) {
        return { success: false, error: 'Ability requires a target' };
      }

      const entity = await this.zonesService.getEntity(player.position.zoneId, targetEntityId);
      if (!entity) {
        return { success: false, error: 'Target not found' };
      }

      if (entity.type !== 'creature') {
        return { success: false, error: 'Invalid target type' };
      }

      target = entity as Creature;
      if (!target.active || target.health <= 0) {
        return { success: false, error: 'Target is dead' };
      }

      // Range check
      const rangeCheck = canInteract(player, target, ability.range);
      if (!rangeCheck.canInteract) {
        return { success: false, error: rangeCheck.reason };
      }
    }

    // Consume energy
    const newEnergy = player.energy - ability.energyCost;
    this.playerService.updateEnergy(player.id, newEnergy);

    // Set cooldowns
    const cooldownEndsAt = this.setCooldown(player.id, abilityId, ability.cooldownMs);
    this.setGcd(player.id);

    // Apply effects
    let damage = 0;
    let targetHealth: number | undefined;
    let targetMaxHealth: number | undefined;

    for (const effect of ability.effects) {
      if (effect.type === 'damage' && target) {
        // Calculate damage
        const inventory = this.inventoryService.getInventory(player.id);
        const playerEquipment = inventory?.equipment as EquipmentJson ?? { modules: [] };
        const playerBuffs = this.getActiveBuffs(player.id);
        const playerStats = computeCharStats(player.level, playerEquipment, 'player', playerBuffs);

        const emptyEquipment: EquipmentJson = { modules: [] };
        const creatureStats = computeCharStats(target.level, emptyEquipment, 'creature');

        const damageResult = calculateDamage({
          baseDamage: effect.baseDamage,
          attackerLevel: player.level,
          defenderLevel: target.level,
          attackerStats: playerStats,
          defenderStats: creatureStats,
          weaponDamage: effect.baseDamage * effect.scaling,
          armorReduction: creatureStats.toughness * 0.1, // Base armor, toughness adds multiplier in formula
        });

        damage = damageResult.damage;
        target.health = Math.max(0, target.health - damage);
        targetHealth = target.health;
        targetMaxHealth = target.maxHealth;

        const killed = target.health <= 0;
        let groundItems: ItemEntity[] = [];

        // Update entity in zone
        await this.zonesService.updateEntity(player.position.zoneId, targetEntityId!, {
          health: target.health,
          active: !killed,
        } as Partial<Creature>);

        // Trigger creature retaliation if not killed
        if (!killed) {
          // Provoke omnivores so they fight back
          if (target.behavior === 'omnivore') {
            await this.combatService.provokeCreature(player.position.zoneId, targetEntityId!);
          }

          // Set combatTarget so creature knows who attacked it
          await this.zonesService.updateEntity(player.position.zoneId, targetEntityId!, {
            combatTarget: player.id,
          } as Partial<Creature>);

          // Start creature combat for aggressive creatures (predator, maniac, omnivore)
          if (target.behavior === 'predator' || target.behavior === 'maniac' || target.behavior === 'omnivore') {
            await this.combatService.startCreatureCombat(targetEntityId!, player.id, player.position.zoneId);
          }
        }

        // Emit entity:update so entityStore syncs for UI (TargetFrame, etc.)
        this.server?.to(player.position.zoneId).emit('entity:update', {
          entityId: targetEntityId,
          changes: { health: target.health, maxHealth: target.maxHealth, active: !killed },
        });

        // Handle creature death: spawn loot and schedule respawn
        if (killed) {
          // Stop any creature combat session (prevents stale sessions from blocking re-aggro)
          this.combatService.stopCreatureCombat(targetEntityId!);

          groundItems = await this.handleCreatureDeath(target, player.position.zoneId);

          // Emit entity:spawn for each loot item so clients render them
          for (const item of groundItems) {
            this.server?.to(player.position.zoneId).emit('entity:spawn', item);
          }

          // Grant XP to player based on creature level
          const levelDiff = target.level - player.level;
          const levelBonus = levelDiff > 0 ? 1 + levelDiff * 0.1 : 1;
          const xpReward = Math.floor(10 * target.level * levelBonus);
          this.playerService.grantXp(player.id, xpReward);

          // Emit kill event for quest tracking (CRITICAL: use speciesId, not target.id)
          this.eventEmitter.emit('entity.killed', {
            characterId: player.id,
            entityId: target.speciesId,
            entityType: 'creature',
            creatureLevel: target.level,
            zoneId: player.position.zoneId,
          });

          // Despawn the creature entity
          this.server?.to(player.position.zoneId).emit('entity:despawn', { entityId: targetEntityId });
        }

        // Broadcast damage to zone
        this.server?.to(player.position.zoneId).emit('combat:damage', {
          attackerId: player.id,
          attackerName: player.name,
          defenderId: targetEntityId!,
          defenderName: target.name,
          damage,
          defenderHealth: target.health,
          defenderMaxHealth: target.maxHealth,
          critical: damageResult.critical,
          killed,
          groundItems: groundItems.length > 0 ? groundItems : undefined,
          defenderPosition: { x: target.position.x, y: target.position.y },
        });
      }

      // Handle heal effect (self-heal)
      if (effect.type === 'heal') {
        // Calculate heal amount: baseHeal + (scaling * power)
        const inventory = this.inventoryService.getInventory(player.id);
        const playerEquipment = inventory?.equipment as EquipmentJson ?? { modules: [] };
        const playerBuffs = this.getActiveBuffs(player.id);
        const playerStats = computeCharStats(player.level, playerEquipment, 'player', playerBuffs);

        const healAmount = Math.floor(effect.baseHeal + (effect.scaling * playerStats.power));
        const newHealth = Math.min(player.maxHealth, player.health + healAmount);

        this.playerService.updateHealth(player.id, newHealth);

        // Emit heal event to zone for visual feedback
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
   * Clean up cooldowns for disconnected player.
   */
  handleDisconnect(playerId: string): void {
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
