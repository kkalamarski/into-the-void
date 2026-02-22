import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Server } from 'socket.io';
import { DatabaseService } from '../database/database.service';
import { PlayerService } from './player.service';
import {
  getActiveQuests,
  updateQuestObjectives,
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
}
