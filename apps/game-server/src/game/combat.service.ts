import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';
import { PlayerService } from './player.service';
import { ZonesService } from '../zones/zones.service';
import { InventoryService } from './inventory.service';
import { EntityService } from './entity.service';
import { AbilityService } from './ability.service';
import { Creature, ItemEntity, isHubZone } from '@into-the-void/shared-types';
import {
  calculateDamage,
  calculateAttackInterval,
  computeCharStats,
  rollLootTable,
  getCreatureLoot,
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
  groundItems?: ItemEntity[];
  defenderPosition?: { x: number; y: number };
}

@Injectable()
export class CombatService {
  /** Active creature combat sessions indexed by creatureId */
  private creatureSessions: Map<string, CreatureCombatSession> = new Map();

  private server: Server | null = null;

  constructor(
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
    const activeBuffs = this.abilityService.getActiveBuffs(player.id);
    const playerStats = computeCharStats(player.level, playerEquipment, 'player', activeBuffs);

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
      damage: damageResult.damage,
      defenderHealth: newHealth,
      defenderMaxHealth: player.maxHealth,
      critical: damageResult.critical,
      killed,
      defenderPosition: { x: player.position.x, y: player.position.y },
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
