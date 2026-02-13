import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChunkData, Entity, SpawnPoint } from '@into-the-void/shared-types';
import { generateChunk } from '@into-the-void/world-gen';

interface ZoneState {
  chunk: ChunkData;
  entities: Map<string, Entity>;
  lastAccessed: number;
}

@Injectable()
export class ZonesService implements OnModuleInit {
  private zones: Map<string, ZoneState> = new Map();
  private worldSeed: string;

  constructor(private readonly configService: ConfigService) {
    this.worldSeed = configService.get<string>('WORLD_SEED', 'into-the-void-alpha-1');
  }

  onModuleInit() {
    // Preload spawn zone
    this.loadZone('z_0_0');

    // Start cleanup interval for unused zones
    setInterval(() => this.cleanupUnusedZones(), 60000);
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
      lastAccessed: Date.now(),
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

  private cleanupUnusedZones(): void {
    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5 minutes

    for (const [zoneId, state] of this.zones.entries()) {
      if (now - state.lastAccessed > maxAge) {
        // Don't remove spawn zone
        if (zoneId !== 'z_0_0') {
          this.zones.delete(zoneId);
        }
      }
    }
  }

  async getChunk(zoneId: string): Promise<ChunkData> {
    let zoneState = this.zones.get(zoneId);

    if (!zoneState) {
      zoneState = this.loadZone(zoneId);
    }

    zoneState.lastAccessed = Date.now();
    return zoneState.chunk;
  }

  async getZoneEntities(zoneId: string): Promise<Entity[]> {
    let zoneState = this.zones.get(zoneId);

    if (!zoneState) {
      zoneState = this.loadZone(zoneId);
    }

    zoneState.lastAccessed = Date.now();
    return Array.from(zoneState.entities.values()).filter((e) => e.active);
  }

  async getEntity(zoneId: string, entityId: string): Promise<Entity | undefined> {
    const zoneState = this.zones.get(zoneId);
    if (!zoneState) return undefined;

    zoneState.lastAccessed = Date.now();
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

  getWorldSeed(): string {
    return this.worldSeed;
  }
}
