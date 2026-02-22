import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Server } from 'socket.io';
import { DatabaseService } from '../database/database.service';
import { PlayerService } from './player.service';
import { InventoryService } from './inventory.service';
import {
  getActiveQuests,
  updateQuestObjectives,
  getQuestProgress,
  completeQuestAtomic,
  updateQuestState,
  updateInventoryItems,
  addCredits,
  type ObjectiveProgressJson,
} from '@into-the-void/database';
import { QuestRegistry, type QuestDefinition } from '@into-the-void/quests';
import type { QuestState, ObjectiveProgress } from '@into-the-void/shared-types';

/**
 * Payload for entity.killed event
 */
export interface EntityKilledPayload {
  characterId: string;
  entityId: string;  // speciesId, NOT instance id (e.g., 'creature_void_crawler')
  entityType: string;
  creatureLevel: number;
  zoneId: string;
}

/**
 * Payload for item.collected event
 */
export interface ItemCollectedPayload {
  characterId: string;
  itemId: string;
  quantity: number;
}

/**
 * Payload for zone.entered event
 */
export interface ZoneEnteredPayload {
  characterId: string;
  zoneId: string;
  biome: string;
}

/**
 * QuestService handles event-driven quest objective tracking.
 *
 * Listens to domain events (entity.killed, item.collected, zone.entered)
 * and updates quest progress in the database, then emits quest:progress
 * WebSocket events to individual player sockets.
 *
 * CRITICAL patterns from research:
 * - Emit entityId/speciesId NOT instance id (quests target species like 'creature_void_crawler')
 * - Database update BEFORE WebSocket emit
 * - try/catch in all @OnEvent handlers
 * - Check obj.complete before incrementing to prevent double counting
 */
@Injectable()
export class QuestService {
  private server: Server | null = null;

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly playerService: PlayerService,
    private readonly inventoryService: InventoryService,
  ) {}

  /**
   * Set the WebSocket server instance.
   * Called from GameGateway.afterInit().
   */
  setServer(server: Server): void {
    this.server = server;
  }

  /**
   * Handle entity kill events for 'kill' quest objectives.
   * Updates progress for all active quests with matching kill objectives.
   */
  @OnEvent('entity.killed')
  async handleEntityKilled(payload: EntityKilledPayload): Promise<void> {
    try {
      const db = this.databaseService.getClient();
      const activeQuests = await getActiveQuests(db, payload.characterId);

      for (const questProgress of activeQuests) {
        const questDef = QuestRegistry.get(questProgress.questId);
        if (!questDef || questDef.id === 'unknown') continue;

        let changed = false;
        const updatedObjectives = questProgress.objectives.map((obj) => {
          // Match kill objectives targeting this entity species
          // CRITICAL: Check !obj.complete before incrementing to prevent double counting
          if (
            obj.objectiveType === 'kill' &&
            obj.targetId === payload.entityId &&
            !obj.complete
          ) {
            const newCurrent = Math.min(obj.current + 1, obj.required);
            changed = true;
            return {
              ...obj,
              current: newCurrent,
              complete: newCurrent >= obj.required,
            };
          }
          return obj;
        });

        if (changed) {
          // Atomic database update BEFORE WebSocket emit
          await updateQuestObjectives(db, questProgress.id, updatedObjectives);

          // Emit progress update to player socket
          this.emitProgressUpdate(
            payload.characterId,
            questProgress.questId,
            questProgress.state as QuestState,
            questDef,
            updatedObjectives
          );
        }
      }
    } catch (error) {
      // Log errors but don't rethrow - prevents event error from crashing server
      console.error('[QuestService] Error handling entity.killed event:', error);
    }
  }

  /**
   * Handle item collection events for 'gather' quest objectives.
   * Updates progress for all active quests with matching gather objectives.
   */
  @OnEvent('item.collected')
  async handleItemCollected(payload: ItemCollectedPayload): Promise<void> {
    try {
      const db = this.databaseService.getClient();
      const activeQuests = await getActiveQuests(db, payload.characterId);

      for (const questProgress of activeQuests) {
        const questDef = QuestRegistry.get(questProgress.questId);
        if (!questDef || questDef.id === 'unknown') continue;

        let changed = false;
        const updatedObjectives = questProgress.objectives.map((obj) => {
          // Match gather objectives for this item
          // Add quantity (not just 1) for multiple item pickups
          if (
            obj.objectiveType === 'gather' &&
            obj.targetId === payload.itemId &&
            !obj.complete
          ) {
            const newCurrent = Math.min(obj.current + payload.quantity, obj.required);
            changed = true;
            return {
              ...obj,
              current: newCurrent,
              complete: newCurrent >= obj.required,
            };
          }
          return obj;
        });

        if (changed) {
          // Atomic database update BEFORE WebSocket emit
          await updateQuestObjectives(db, questProgress.id, updatedObjectives);

          // Emit progress update to player socket
          this.emitProgressUpdate(
            payload.characterId,
            questProgress.questId,
            questProgress.state as QuestState,
            questDef,
            updatedObjectives
          );
        }
      }
    } catch (error) {
      console.error('[QuestService] Error handling item.collected event:', error);
    }
  }

  /**
   * Handle zone entry events for 'explore' quest objectives.
   * Updates progress for all active quests with matching explore objectives.
   */
  @OnEvent('zone.entered')
  async handleZoneEntered(payload: ZoneEnteredPayload): Promise<void> {
    try {
      const db = this.databaseService.getClient();
      const activeQuests = await getActiveQuests(db, payload.characterId);

      for (const questProgress of activeQuests) {
        const questDef = QuestRegistry.get(questProgress.questId);
        if (!questDef || questDef.id === 'unknown') continue;

        let changed = false;
        const updatedObjectives = questProgress.objectives.map((obj) => {
          // Match explore objectives for this biome
          // Binary: set current = 1 and complete = true (explored or not)
          if (
            obj.objectiveType === 'explore' &&
            obj.targetId === payload.biome &&
            !obj.complete
          ) {
            changed = true;
            return {
              ...obj,
              current: 1,
              complete: true,
            };
          }
          return obj;
        });

        if (changed) {
          // Atomic database update BEFORE WebSocket emit
          await updateQuestObjectives(db, questProgress.id, updatedObjectives);

          // Emit progress update to player socket
          this.emitProgressUpdate(
            payload.characterId,
            questProgress.questId,
            questProgress.state as QuestState,
            questDef,
            updatedObjectives
          );
        }
      }
    } catch (error) {
      console.error('[QuestService] Error handling zone.entered event:', error);
    }
  }

  /**
   * Emit quest:progress WebSocket event to player socket.
   * Private data - only sent to the individual player, not broadcast to zone.
   */
  private emitProgressUpdate(
    characterId: string,
    questId: string,
    state: QuestState,
    questDef: QuestDefinition,
    objectives: ObjectiveProgressJson[]
  ): void {
    if (!this.server) return;

    // Get player socket via PlayerService
    const socketId = this.playerService.getSocketByPlayerId(characterId);
    if (!socketId) return; // Player offline

    // Map objectives to client payload format
    const objectivePayload: ObjectiveProgress[] = objectives.map((o) => ({
      objectiveType: o.objectiveType,
      description: o.description,
      current: o.current,
      required: o.required,
      targetId: o.targetId,
      complete: o.complete,
    }));

    // Build rewards payload - handle readonly arrays from QuestDefinition
    const rewards: {
      credits?: number;
      xp?: number;
      items?: { itemId: string; quantity: number }[];
    } = {};

    if (questDef.rewards.credits !== undefined) {
      rewards.credits = questDef.rewards.credits;
    }
    if (questDef.rewards.xp !== undefined) {
      rewards.xp = questDef.rewards.xp;
    }
    if (questDef.rewards.items && questDef.rewards.items.length > 0) {
      rewards.items = questDef.rewards.items.map((item: { readonly itemId: string; readonly quantity: number }) => ({
        itemId: item.itemId,
        quantity: item.quantity,
      }));
    }

    // Emit to individual player socket
    this.server.to(socketId).emit('quest:progress', {
      questId,
      displayName: questDef.displayName,
      description: questDef.description,
      state,
      objectives: objectivePayload,
      rewards,
    });
  }

  /**
   * Complete a quest and grant rewards atomically.
   * Validates: quest active, all objectives complete, player at NPC (if questGiverId set).
   * Transaction: validate -> remove quest items -> mark complete -> grant credits.
   * XP granted in-memory after transaction commits.
   */
  async completeQuest(
    characterId: string,
    questId: string,
    npcEntityId?: string
  ): Promise<{ success: boolean; error?: string; rewards?: { credits?: number; xp?: number; items?: Array<{ itemId: string; quantity: number }> } }> {
    const db = this.databaseService.getClient();

    // Get quest definition and progress
    const questDef = QuestRegistry.get(questId);
    if (!questDef || questDef.id === 'unknown') {
      return { success: false, error: 'Quest not found' };
    }

    const questProgressRow = await getQuestProgress(db, characterId, questId);
    if (!questProgressRow) {
      return { success: false, error: 'Quest not started' };
    }
    if (questProgressRow.state !== 'active') {
      return { success: false, error: 'Quest is not active' };
    }

    // Validate all objectives complete
    const allComplete = questProgressRow.objectives.every(obj => obj.complete);
    if (!allComplete) {
      return { success: false, error: 'Not all objectives are complete' };
    }

    // TODO: NPC proximity validation - Phase 67 will implement when questGiverId is populated
    // For now, allow completion without NPC proximity check

    // Transaction: remove quest items -> mark complete -> grant credits
    try {
      await db.transaction(async (tx) => {
        // 1. Remove quest items from inventory
        const inventory = this.inventoryService.getInventory(characterId);
        if (inventory) {
          const filteredItems = inventory.items.filter(
            item => item.properties?.questId !== questId
          );
          if (filteredItems.length !== inventory.items.length) {
            // Quest items were removed, update in-memory and persist
            inventory.items = filteredItems;
            await updateInventoryItems(tx, characterId, filteredItems);
          }
        }

        // 2. Atomically mark quest complete (prevents double completion)
        const completed = await completeQuestAtomic(tx, questProgressRow.id);
        if (!completed) {
          throw new Error('Quest already completed');
        }

        // 3. Grant credits (inside transaction for atomicity)
        if (questDef.rewards.credits && questDef.rewards.credits > 0) {
          await addCredits(tx, characterId, questDef.rewards.credits);
        }

        // 4. Grant item rewards (inside transaction)
        if (questDef.rewards.items && questDef.rewards.items.length > 0) {
          for (const reward of questDef.rewards.items) {
            const newItem = {
              instanceId: crypto.randomUUID(),
              itemId: reward.itemId,
              quantity: reward.quantity,
              slot: this.findFreeSlot(inventory?.items ?? []),
              properties: {},
            };
            if (inventory) {
              inventory.items.push(newItem);
            }
          }
          if (inventory) {
            await updateInventoryItems(tx, characterId, inventory.items);
          }
        }
      });

      // After transaction commits: grant XP (in-memory, persisted on disconnect)
      if (questDef.rewards.xp && questDef.rewards.xp > 0) {
        this.playerService.grantXp(characterId, questDef.rewards.xp);
      }

      // Update player credits cache
      if (questDef.rewards.credits && questDef.rewards.credits > 0) {
        const player = this.playerService.getPlayerById(characterId);
        if (player) {
          player.credits += questDef.rewards.credits;
        }
      }

      // Emit quest completed event to player
      this.emitQuestCompleted(characterId, questId, questDef);

      return {
        success: true,
        rewards: {
          credits: questDef.rewards.credits,
          xp: questDef.rewards.xp,
          items: questDef.rewards.items ? [...questDef.rewards.items] : undefined,
        },
      };
    } catch (error) {
      console.error('[QuestService] Error completing quest:', error);
      return { success: false, error: 'Quest completion failed' };
    }
  }

  /**
   * Find first free inventory slot.
   */
  private findFreeSlot(items: Array<{ slot: number }>): number {
    const usedSlots = new Set(items.map(i => i.slot));
    for (let i = 0; i < 20; i++) {
      if (!usedSlots.has(i)) return i;
    }
    return items.length;
  }

  /**
   * Emit quest:completed WebSocket event to player.
   */
  private emitQuestCompleted(
    characterId: string,
    questId: string,
    questDef: QuestDefinition
  ): void {
    if (!this.server) return;

    const socketId = this.playerService.getSocketByPlayerId(characterId);
    if (!socketId) return;

    this.server.to(socketId).emit('quest:completed', {
      questId,
      displayName: questDef.displayName,
      rewards: {
        credits: questDef.rewards.credits,
        xp: questDef.rewards.xp,
        items: questDef.rewards.items ? questDef.rewards.items.map(i => ({
          itemId: i.itemId,
          quantity: i.quantity,
        })) : undefined,
      },
    });
  }

  /**
   * Abandon an active quest and clean up quest items.
   */
  async abandonQuest(
    characterId: string,
    questId: string
  ): Promise<{ success: boolean; error?: string }> {
    const db = this.databaseService.getClient();

    const questProgressRow = await getQuestProgress(db, characterId, questId);
    if (!questProgressRow) {
      return { success: false, error: 'Quest not found' };
    }
    if (questProgressRow.state !== 'active') {
      return { success: false, error: 'Quest is not active' };
    }

    try {
      await db.transaction(async (tx) => {
        // 1. Remove quest items from inventory
        const inventory = this.inventoryService.getInventory(characterId);
        if (inventory) {
          const filteredItems = inventory.items.filter(
            item => item.properties?.questId !== questId
          );
          if (filteredItems.length !== inventory.items.length) {
            inventory.items = filteredItems;
            await updateInventoryItems(tx, characterId, filteredItems);
          }
        }

        // 2. Mark quest as failed (abandoned)
        await updateQuestState(tx, questProgressRow.id, 'failed');
      });

      // Emit quest abandoned event
      if (this.server) {
        const socketId = this.playerService.getSocketByPlayerId(characterId);
        if (socketId) {
          this.server.to(socketId).emit('quest:abandoned', { questId });
          // Also send inventory update
          const inventory = this.inventoryService.getInventory(characterId);
          if (inventory) {
            this.server.to(socketId).emit('inventory:update', inventory);
          }
        }
      }

      return { success: true };
    } catch (error) {
      console.error('[QuestService] Error abandoning quest:', error);
      return { success: false, error: 'Failed to abandon quest' };
    }
  }
}
