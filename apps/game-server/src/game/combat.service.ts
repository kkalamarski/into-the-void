import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';
import { PlayerService } from './player.service';
import { ZonesService } from '../zones/zones.service';
import { InventoryService } from './inventory.service';
import { EntityService } from './entity.service';
import { Creature, ItemEntity, isHubZone } from '@into-the-void/shared-types';
import {
  canInteract,
  canInteractLevel,
  calculateDamage,
  calculateAttackInterval,
  computeCharStats,
  rollLootTable,
  getCreatureLoot,
} from '@into-the-void/game-logic';
import { ItemRegistry } from '@into-the-void/items';
import { EntityRegistry } from '@into-the-void/entities';
import type { CreatureDefinition } from '@into-the-void/entities';
import type { EquipmentJson } from '@into-the-void/database';

interface CombatSession {
  playerId: string;
  targetId: string;
  zoneId: string;
  startedAt: number;
  lastAttackAt: number;
}

interface CreatureCombatSession {
  creatureId: string;
  targetPlayerId: string;
  zoneId: string;
  startedAt: number;
  lastAttackAt: number;
}

interface StartCombatResult {
  success: boolean;
  error?: string;
  session?: CombatSession;
}

interface CombatDamageResult {
  attackerId: string;
  defenderId: string;
  damage: number;
  defenderHealth: number;
  defenderMaxHealth: number;
  critical: boolean;
  killed: boolean;
  groundItems?: ItemEntity[];
}

@Injectable()
export class CombatService {
  /** Active combat sessions indexed by playerId */
  private sessions: Map<string, CombatSession> = new Map();

  /** Active creature combat sessions indexed by creatureId */
  private creatureSessions: Map<string, CreatureCombatSession> = new Map();

  private server: Server | null = null;

  constructor(
    private readonly playerService: PlayerService,
    private readonly zonesService: ZonesService,
    private readonly inventoryService: InventoryService,
    private readonly entityService: EntityService,
  ) {}

  /**
   * Set the Socket.IO server reference.
   * Called by GameGateway.afterInit().
   */
  setServer(server: Server): void {
    this.server = server;
  }

  /**
   * Start combat between a player and a creature.
   * Validates: player has combat tool equipped, target is creature in range, level gating.
   */
  async startCombat(socketId: string, targetEntityId: string): Promise<StartCombatResult> {
    const player = this.playerService.getPlayerBySocket(socketId);
    if (!player) return { success: false, error: 'Player not found' };

    // Hub zones are safe - no combat allowed
    if (isHubZone(player.position.zoneId)) {
      return { success: false, error: 'Combat is not allowed in hub zones' };
    }

    // Check if already in combat
    if (this.sessions.has(player.id)) {
      return { success: false, error: 'Already in combat' };
    }

    // Get equipped tool
    const inventory = this.inventoryService.getInventory(player.id);
    if (!inventory) return { success: false, error: 'Inventory not loaded' };

    const tool = inventory.equipment.tool;
    if (!tool) return { success: false, error: 'No tool equipped' };

    const toolDef = ItemRegistry.get(tool.itemId);
    if (!toolDef) return { success: false, error: 'Unknown tool' };

    // Must be a combat tool
    if (toolDef.toolType !== 'combat') {
      return { success: false, error: 'Equipped tool is not a combat tool' };
    }

    // Get target entity
    const entity = await this.zonesService.getEntity(player.position.zoneId, targetEntityId);
    if (!entity) return { success: false, error: 'Target not found' };

    // NPCs cannot be attacked
    if (entity.type === 'npc') {
      return { success: false, error: 'Cannot attack NPCs' };
    }

    if (entity.type !== 'creature') return { success: false, error: 'Target is not a creature' };

    const creature = entity as Creature;
    if (!creature.active || creature.health <= 0) {
      return { success: false, error: 'Target is already dead' };
    }

    // Validate range
    const toolRange = toolDef.range ?? 1;
    const rangeCheck = canInteract(player, entity, toolRange);
    if (!rangeCheck.canInteract) {
      return { success: false, error: rangeCheck.reason };
    }

    // Level gating (INTR-07)
    if (!canInteractLevel(player.level, creature.level)) {
      return { success: false, error: `Creature level ${creature.level} exceeds your level by more than 5` };
    }

    // Provoke omnivores when player attacks them (AGGR-02)
    if (creature.behavior === 'omnivore') {
      await this.provokeCreature(player.position.zoneId, targetEntityId);
    }

    // Create combat session
    const session: CombatSession = {
      playerId: player.id,
      targetId: targetEntityId,
      zoneId: player.position.zoneId,
      startedAt: Date.now(),
      lastAttackAt: 0,  // Allows immediate first attack
    };
    this.sessions.set(player.id, session);

    // Mark player in combat
    this.playerService.setInCombat(player.id, true);

    return { success: true, session };
  }

  /**
   * Stop combat for a player (creature died, player moved out of range, etc.)
   */
  stopCombat(playerId: string): void {
    this.sessions.delete(playerId);
    this.playerService.setInCombat(playerId, false);
  }

  /**
   * Get combat session for a player.
   */
  getSession(playerId: string): CombatSession | undefined {
    return this.sessions.get(playerId);
  }

  /**
   * Get all active combat sessions (for tick loop).
   */
  getAllSessions(): CombatSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Handle player disconnect — clean up combat state.
   */
  handleDisconnect(playerId: string): void {
    this.stopCombat(playerId);

    // Stop any creature combat sessions targeting this player
    for (const [creatureId, session] of this.creatureSessions.entries()) {
      if (session.targetPlayerId === playerId) {
        this.creatureSessions.delete(creatureId);
      }
    }
  }

  /**
   * Handle creature death: spawn loot and schedule respawn.
   * Mirrors the logic in EntityService.handleAttack() for consistency.
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

  /**
   * Execute one attack from player to target creature.
   * Returns damage result for broadcasting, or null if not time to attack yet.
   */
  async attackTick(session: CombatSession): Promise<CombatDamageResult | null> {
    const player = this.playerService.getPlayerById(session.playerId);
    if (!player) {
      this.stopCombat(session.playerId);
      return null;
    }

    // Get player inventory for tool and stats
    const inventory = this.inventoryService.getInventory(player.id);
    if (!inventory) {
      this.stopCombat(session.playerId);
      return null;
    }

    // Calculate player stats for interval calculation
    const playerStats = computeCharStats(player.level, inventory.equipment as EquipmentJson, 'player');
    const attackInterval = calculateAttackInterval(playerStats.haste);

    // Check if enough time has passed since last attack
    const now = Date.now();
    if (now - session.lastAttackAt < attackInterval) {
      // Not time to attack yet
      return null;
    }

    // Get target creature
    const entity = await this.zonesService.getEntity(session.zoneId, session.targetId);
    if (!entity || entity.type !== 'creature') {
      this.stopCombat(session.playerId);
      return null;
    }

    const creature = entity as Creature;
    if (!creature.active || creature.health <= 0) {
      this.stopCombat(session.playerId);
      return null;
    }

    // Validate range (player may have moved)
    const tool = inventory.equipment.tool;
    const toolDef = tool ? ItemRegistry.get(tool.itemId) : null;
    const toolRange = toolDef?.range ?? 1;

    const rangeCheck = canInteract(player, entity, toolRange);
    if (!rangeCheck.canInteract) {
      // Player moved out of range — stop combat
      this.stopCombat(session.playerId);
      return null;
    }

    // Calculate creature stats from definition
    const creatureLevel = creature.level;
    const emptyEquipment: EquipmentJson = { modules: [] };
    const creatureStats = computeCharStats(creatureLevel, emptyEquipment, 'creature');

    // Calculate damage: Power vs Toughness
    const damageResult = calculateDamage({
      baseDamage: 10,
      attackerLevel: player.level,
      defenderLevel: creatureLevel,
      attackerStats: playerStats,
      defenderStats: creatureStats,
      weaponDamage: toolDef?.ilvl ?? 0,
      armorReduction: creatureStats.toughness, // Toughness provides base armor for creatures
    });

    // Apply damage to creature
    creature.health = Math.max(0, creature.health - damageResult.damage);
    const killed = creature.health <= 0;

    let groundItems: ItemEntity[] = [];

    if (killed) {
      // Handle loot drop and respawn scheduling
      groundItems = await this.handleCreatureDeath(creature, session.zoneId);
      this.stopCombat(session.playerId);
    }

    // Update entity in zone
    await this.zonesService.updateEntity(session.zoneId, session.targetId, {
      health: creature.health,
      active: !killed,
    } as Partial<Creature>);

    // Update last attack time AFTER successful attack
    session.lastAttackAt = now;

    return {
      attackerId: player.id,
      defenderId: session.targetId,
      damage: damageResult.damage,
      defenderHealth: creature.health,
      defenderMaxHealth: creature.maxHealth,
      critical: damageResult.critical,
      killed,
      groundItems: groundItems.length > 0 ? groundItems : undefined,
    };
  }

  /**
   * Process all combat ticks for a zone.
   * Called by AiService during zone tick.
   * Returns damage events to broadcast.
   */
  async processCombatTick(zoneId: string): Promise<CombatDamageResult[]> {
    const results: CombatDamageResult[] = [];

    // Get all sessions in this zone
    const zoneSessions = this.getAllSessions().filter(s => s.zoneId === zoneId);

    for (const session of zoneSessions) {
      const result = await this.attackTick(session);
      if (result) {
        results.push(result);
      }
    }

    return results;
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

    // Calculate creature stats for interval calculation
    const emptyEquipment: EquipmentJson = { modules: [] };
    const creatureStats = computeCharStats(creature.level, emptyEquipment, 'creature');
    const attackInterval = calculateAttackInterval(creatureStats.haste);

    // Check if enough time has passed since last attack
    const now = Date.now();
    if (now - session.lastAttackAt < attackInterval) {
      return null;
    }

    // Check if player is still in range (adjacent)
    const dist = Math.max(
      Math.abs(creature.position.x - player.position.x),
      Math.abs(creature.position.y - player.position.y),
    );
    if (dist > 1) {
      // Player moved away — don't attack but don't stop combat (will chase)
      return null;
    }

    // Get player stats for damage calculation
    const inventory = this.inventoryService.getInventory(player.id);
    const playerEquipment = inventory?.equipment as EquipmentJson ?? { modules: [] };
    const playerStats = computeCharStats(player.level, playerEquipment, 'player');

    // Calculate damage: Creature Power vs Player Toughness
    const damageResult = calculateDamage({
      baseDamage: 10,
      attackerLevel: creature.level,
      defenderLevel: player.level,
      attackerStats: creatureStats,
      defenderStats: playerStats,
      weaponDamage: creature.level * 2, // Creature "weapon" scales with level
      armorReduction: playerStats.toughness, // Player toughness as armor
    });

    // Apply damage to player
    const newHealth = Math.max(0, player.health - damageResult.damage);
    const killed = newHealth <= 0;

    // Update player health via PlayerService
    this.playerService.updateHealth(player.id, newHealth);

    if (killed) {
      // Mark player as dead
      this.playerService.setDead(session.targetPlayerId, true);

      // Stop any player-initiated combat session (player can no longer attack)
      this.stopCombat(session.targetPlayerId);

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
      defenderId: session.targetPlayerId,
      damage: damageResult.damage,
      defenderHealth: newHealth,
      defenderMaxHealth: player.maxHealth,
      critical: damageResult.critical,
      killed,
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
   */
  async provokeCreature(zoneId: string, creatureId: string): Promise<void> {
    await this.zonesService.updateEntity(zoneId, creatureId, { provoked: true } as Partial<Creature>);
  }
}
