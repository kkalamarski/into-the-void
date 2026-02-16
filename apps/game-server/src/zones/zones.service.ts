import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChunkData, Entity, SpawnPoint } from '@into-the-void/shared-types';
import { generateChunk } from '@into-the-void/world-gen';
import { LRUCache } from 'lru-cache';

interface ZoneState {
  chunk: ChunkData;
  entities: Map<string, Entity>;
}

@Injectable()
export class ZonesService implements OnModuleInit {
  private zones: LRUCache<string, ZoneState>;
  private worldSeed: string;

  constructor(private readonly configService: ConfigService) {
    this.worldSeed = configService.get<string>('WORLD_SEED', 'into-the-void-alpha-1');
    this.zones = new LRUCache<string, ZoneState>({
      max: 500, // Max chunks in memory (supports ~250 concurrent players)
      ttl: 5 * 60 * 1000, // 5 minute TTL for inactive chunks
      updateAgeOnGet: true, // Refresh TTL on access
      updateAgeOnHas: false, // Don't refresh on existence check
      dispose: (value, key) => {
        console.log(`[ZonesService] Evicted chunk ${key}`);
      },
    });
  }

  onModuleInit() {
    // Preload spawn zone
    this.loadZone('z_0_0');
  }

  private loadZone(zoneId: string): ZoneState {
    // Parse zone coordinates
    const [, x, y] = zoneId.split('_').map(Number);

    // Generate chunk
    const chunk = generateChunk(this.worldSeed, x, y);

    // Create entities from spawn points
    const entities = new Map<string, Entity>();
    for (const spawn of chunk.spawnPoints) {
      const entity = this.createEntityFromSpawn(spawn, zoneId);
      entities.set(entity.id, entity);
    }

    const zoneState: ZoneState = {
      chunk,
      entities,
    };

    this.zones.set(zoneId, zoneState);
    return zoneState;
  }

  private createEntityFromSpawn(spawn: SpawnPoint, zoneId: string): Entity {
    const id = `${zoneId}_${spawn.spawnId}_${spawn.x}_${spawn.y}`;

    if (spawn.entityType === 'creature') {
      return {
        id,
        type: 'creature',
        name: spawn.spawnId,
        position: { x: spawn.x, y: spawn.y, zoneId },
        active: true,
      };
    }

    return {
      id,
      type: 'mineral',
      name: spawn.spawnId,
      position: { x: spawn.x, y: spawn.y, zoneId },
      active: true,
    };
  }

  async getChunk(zoneId: string): Promise<ChunkData> {
    let zoneState = this.zones.get(zoneId);

    if (!zoneState) {
      zoneState = this.loadZone(zoneId);
    }

    return zoneState.chunk;
  }

  async getZoneEntities(zoneId: string): Promise<Entity[]> {
    let zoneState = this.zones.get(zoneId);

    if (!zoneState) {
      zoneState = this.loadZone(zoneId);
    }

    return Array.from(zoneState.entities.values()).filter((e) => e.active);
  }

  async getEntity(zoneId: string, entityId: string): Promise<Entity | undefined> {
    const zoneState = this.zones.get(zoneId);
    if (!zoneState) return undefined;

    return zoneState.entities.get(entityId);
  }

  async updateEntity(
    zoneId: string,
    entityId: string,
    changes: Partial<Entity>
  ): Promise<void> {
    const zoneState = this.zones.get(zoneId);
    if (!zoneState) return;

    const entity = zoneState.entities.get(entityId);
    if (entity) {
      Object.assign(entity, changes);
    }
  }

  async spawnEntity(zoneId: string, entity: Entity): Promise<void> {
    let zoneState = this.zones.get(zoneId);

    if (!zoneState) {
      zoneState = this.loadZone(zoneId);
    }

    zoneState.entities.set(entity.id, entity);
  }

  async despawnEntity(zoneId: string, entityId: string): Promise<void> {
    const zoneState = this.zones.get(zoneId);
    if (!zoneState) return;

    const entity = zoneState.entities.get(entityId);
    if (entity) {
      entity.active = false;
    }
  }

  getLoadedZoneCount(): number {
    return this.zones.size;
  }

  /**
   * Get cache statistics for monitoring.
   */
  getCacheStats(): { size: number; maxSize: number } {
    return {
      size: this.zones.size,
      maxSize: 500,
    };
  }

  getWorldSeed(): string {
    return this.worldSeed;
  }
}
