import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';
import { DatabaseService } from '../database/database.service';
import { PlayerService } from './player.service';
import {
  getCollectedLore,
  hasCollectedLore,
  collectLore,
  markLoreRead,
  getCollectedLoreIds,
  addXp,
} from '@into-the-void/database';
import { LoreRegistry } from '@into-the-void/lore';
import type { CollectedLoreEntry } from '@into-the-void/shared-types';

@Injectable()
export class LoreService {
  private server: Server | null = null;

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly playerService: PlayerService,
  ) {}

  setServer(server: Server): void {
    this.server = server;
  }

  /**
   * Attempt to collect a lore fragment.
   * Validates fragment exists, checks if already collected, grants XP.
   */
  async attemptCollect(
    characterId: string,
    loreId: string,
    socketId: string
  ): Promise<{ success: boolean; alreadyCollected?: boolean }> {
    const db = this.databaseService.getClient();

    // Validate lore fragment exists in registry
    const fragment = LoreRegistry.get(loreId);
    if (!fragment) {
      console.warn(`[LoreService] Unknown lore fragment: ${loreId}`);
      return { success: false };
    }

    // Check if already collected
    const alreadyCollected = await hasCollectedLore(db, characterId, loreId);
    if (alreadyCollected) {
      this.emitAlreadyCollected(socketId, loreId);
      return { success: false, alreadyCollected: true };
    }

    // Record collection BEFORE granting reward (anti-exploit)
    await collectLore(db, {
      characterId,
      loreId,
      category: fragment.category,
    });

    // Grant XP reward
    await addXp(db, characterId, fragment.xpReward);

    // Update player's XP in memory
    this.playerService.grantXp(characterId, fragment.xpReward);

    // Emit success event
    this.emitCollected(socketId, fragment);

    return { success: true };
  }

  /**
   * Get all collected lore for a character (for codex display).
   */
  async getCollectedLoreForCharacter(characterId: string): Promise<CollectedLoreEntry[]> {
    const db = this.databaseService.getClient();
    const rows = await getCollectedLore(db, characterId);
    return rows.map(row => ({
      loreId: row.loreId,
      collectedAt: row.collectedAt.getTime(),
      isRead: row.isRead,
    }));
  }

  /**
   * Mark a lore fragment as read.
   */
  async markAsRead(characterId: string, loreId: string): Promise<void> {
    const db = this.databaseService.getClient();
    await markLoreRead(db, characterId, loreId);
  }

  /**
   * Get IDs of collected lore (lightweight for spawn filtering).
   */
  async getCollectedLoreIds(characterId: string): Promise<string[]> {
    const db = this.databaseService.getClient();
    return getCollectedLoreIds(db, characterId);
  }

  private emitCollected(socketId: string, fragment: { id: string; title: string; category: string; xpReward: number }): void {
    if (!this.server) return;
    this.server.to(socketId).emit('lore:collected', {
      loreId: fragment.id,
      title: fragment.title,
      category: fragment.category,
      xpReward: fragment.xpReward,
    });
  }

  private emitAlreadyCollected(socketId: string, loreId: string): void {
    if (!this.server) return;
    this.server.to(socketId).emit('lore:already_collected', { loreId });
  }
}
