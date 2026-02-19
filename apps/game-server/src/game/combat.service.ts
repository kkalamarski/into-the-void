import { Injectable } from '@nestjs/common';
import { PlayerService } from './player.service';
import { ZonesService } from '../zones/zones.service';
import { InventoryService } from './inventory.service';
import { Creature } from '@into-the-void/shared-types';
import { canInteract, canInteractLevel } from '@into-the-void/game-logic';
import { ItemRegistry } from '@into-the-void/items';

interface CombatSession {
  playerId: string;
  targetId: string;
  zoneId: string;
  startedAt: number;
}

interface StartCombatResult {
  success: boolean;
  error?: string;
  session?: CombatSession;
}

@Injectable()
export class CombatService {
  /** Active combat sessions indexed by playerId */
  private sessions: Map<string, CombatSession> = new Map();

  constructor(
    private readonly playerService: PlayerService,
    private readonly zonesService: ZonesService,
    private readonly inventoryService: InventoryService,
  ) {}

  /**
   * Start combat between a player and a creature.
   * Validates: player has combat tool equipped, target is creature in range, level gating.
   */
  async startCombat(socketId: string, targetEntityId: string): Promise<StartCombatResult> {
    const player = this.playerService.getPlayerBySocket(socketId);
    if (!player) return { success: false, error: 'Player not found' };

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

    // Create combat session
    const session: CombatSession = {
      playerId: player.id,
      targetId: targetEntityId,
      zoneId: player.position.zoneId,
      startedAt: Date.now(),
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
  }
}
