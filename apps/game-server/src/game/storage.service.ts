import { Injectable } from '@nestjs/common';
import {
  getOrCreatePlayerStorage,
  updatePlayerStorage,
  type PlayerStorage,
} from '@into-the-void/database';
import { DatabaseService } from '../database/database.service';
import type { PersonalStorage } from '@into-the-void/shared-types';

@Injectable()
export class StorageService {
  private cache: Map<string, PlayerStorage> = new Map();

  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Load personal storage from DB for a player.
   * Creates a default storage record if none exists.
   * Caches the result in memory for fast subsequent access.
   */
  async loadForPlayer(characterId: string): Promise<PersonalStorage> {
    const db = this.databaseService.getClient();
    const storage = await getOrCreatePlayerStorage(db, characterId);
    this.cache.set(characterId, storage);
    return {
      characterId: storage.characterId,
      items: storage.items as PersonalStorage['items'],
      maxSlots: storage.maxSlots,
    };
  }

  /**
   * Return cached storage for a player without hitting DB.
   * Returns undefined if player storage is not loaded.
   */
  getStorage(characterId: string): PlayerStorage | undefined {
    return this.cache.get(characterId);
  }

  /**
   * Persist storage to DB and evict from memory cache.
   * Called on player disconnect.
   */
  async flushAndUnload(characterId: string): Promise<void> {
    const storage = this.cache.get(characterId);
    if (!storage) return;

    const db = this.databaseService.getClient();
    await updatePlayerStorage(db, characterId, storage.items);
    this.cache.delete(characterId);
  }
}
