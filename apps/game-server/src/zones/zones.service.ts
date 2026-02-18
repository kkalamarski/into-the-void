import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Artifact,
  ChunkData,
  Creature,
  Entity,
  ItemEntity,
  Mineral,
  Plant,
  SpawnPoint,
} from '@into-the-void/shared-types';
import { generateChunk } from '@into-the-void/world-gen';
import { EntityRegistry } from '@into-the-void/entities';
import type {
  ArtifactDefinition,
  CreatureDefinition,
  MineralDefinition,
  PlantDefinition,
} from '@into-the-void/entities';
import { DatabaseService } from '../database/database.service';
import { entityLifecycle } from '@into-the-void/database';
import { eq } from 'drizzle-orm';
import { LRUCache } from 'lru-cache';

interface ZoneState {
  chunk: ChunkData;
  entities: Map<string, Entity>;
}

/**
 * Far-future date used as respawnAt for artifacts (they never respawn).
 * Using 2100-01-01 as a sentinel value.
 */
const FAR_FUTURE = new Date('2100-01-01T00:00:00.000Z');

@Injectable()
export class ZonesService implements OnModuleInit {
  private zones: LRUCache<string, ZoneState>;
  private worldSeed: string;
  // Claim map: entityId -> playerId who claimed it (prevents simultaneous pickup)
  private claimedEntities: Map<string, string> = new Map();

  constructor(
    private readonly configService: ConfigService,
    private readonly databaseService: DatabaseService,
  ) {
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

  async onModuleInit() {
    // Preload spawn zone
    await this.loadZone('z_0_0');
  }

  private async loadZone(zoneId: string): Promise<ZoneState> {
    // Parse zone coordinates
    const [, x, y] = zoneId.split('_').map(Number);

    // Generate chunk
    const chunk = generateChunk(this.worldSeed, x, y);

    // Query entity lifecycle records for this zone to find suppressed entities
    const db = this.databaseService.getClient();
    const lifecycleRecords = await db
      .select()
      .from(entityLifecycle)
      .where(eq(entityLifecycle.zoneId, zoneId));

    // Build suppressed set: entityIds where respawnAt is still in the future
    const now = new Date();
    const suppressed = new Set<string>(
      lifecycleRecords
        .filter((r) => r.respawnAt > now)
        .map((r) => r.entityId),
    );

    // Create entities from spawn points, skipping suppressed ones
    const entities = new Map<string, Entity>();
    for (const spawn of chunk.spawnPoints) {
      const entityId = `${zoneId}_${spawn.spawnId}_${spawn.x}_${spawn.y}`;
      if (suppressed.has(entityId)) {
        // Entity is dead and has not yet respawned — skip
        continue;
      }
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
    const def = EntityRegistry.get(spawn.spawnId);

    // ---- Creature ----
    if (spawn.entityType === 'creature' && def.entityClass === 'creature') {
      const creatureDef = def as CreatureDefinition;

      // Deterministic level from seed: hash worldSeed + entityId into level range
      const level = this.deriveLevel(id, creatureDef.levelRange);

      const creature: Creature = {
        id,
        type: 'creature',
        name: creatureDef.displayName,
        position: { x: spawn.x, y: spawn.y, zoneId },
        active: true,
        speciesId: creatureDef.id,
        health: creatureDef.baseHealth,
        maxHealth: creatureDef.baseHealth,
        level,
        behavior: creatureDef.behavior,
      };
      return creature;
    }

    // ---- Mineral ----
    if (spawn.entityType === 'mineral' && def.entityClass === 'mineral') {
      const mineralDef = def as MineralDefinition;

      const mineral: Mineral = {
        id,
        type: 'mineral',
        name: mineralDef.displayName,
        position: { x: spawn.x, y: spawn.y, zoneId },
        active: true,
        resourceId: mineralDef.id,
        yield: 5,
        maxYield: 5,
        requiredTier: mineralDef.requiredTier,
      };
      return mineral;
    }

    // ---- Plant (forward-compatibility stub) ----
    // world-gen does not yet produce 'plant' entityType, but the branch is ready
    if (def.entityClass === 'plant') {
      const plantDef = def as PlantDefinition;

      const plant: Plant = {
        id,
        type: 'plant',
        name: plantDef.displayName,
        position: { x: spawn.x, y: spawn.y, zoneId },
        active: true,
        speciesId: plantDef.id,
        yield: 5,
        maxYield: 5,
      };
      return plant;
    }

    // ---- Artifact (forward-compatibility stub) ----
    // world-gen does not yet produce 'artifact' entityType, but the branch is ready
    if (def.entityClass === 'artifact') {
      const artifactDef = def as ArtifactDefinition;

      const artifact: Artifact = {
        id,
        type: 'artifact',
        name: artifactDef.displayName,
        position: { x: spawn.x, y: spawn.y, zoneId },
        active: true,
        artifactId: artifactDef.id,
        rarity: artifactDef.rarity,
      };
      return artifact;
    }

    // ---- Default fallback ----
    return {
      id,
      type: 'mineral',
      name: spawn.spawnId,
      position: { x: spawn.x, y: spawn.y, zoneId },
      active: true,
    } as Entity;
  }

  /**
   * Deterministically derive a level within levelRange from seed + entityId.
   * Uses a simple numeric hash to avoid external dependencies.
   */
  private deriveLevel(entityId: string, levelRange: readonly [number, number]): number {
    const seed = this.worldSeed + entityId;
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
    }
    const [min, max] = levelRange;
    return min + (hash % (max - min + 1));
  }

  /**
   * Record an entity kill in the database so the respawn timer survives zone eviction
   * and server restarts.
   *
   * For artifacts, respawnSeconds is ignored and FAR_FUTURE is used instead (they never respawn).
   */
  async recordEntityKill(
    entityId: string,
    zoneId: string,
    respawnSeconds: number,
    isArtifact = false,
  ): Promise<void> {
    const db = this.databaseService.getClient();
    const now = new Date();
    const respawnAt = isArtifact
      ? FAR_FUTURE
      : new Date(now.getTime() + respawnSeconds * 1000);

    await db
      .insert(entityLifecycle)
      .values({
        entityId,
        zoneId,
        killedAt: now,
        respawnAt,
      })
      .onConflictDoUpdate({
        target: entityLifecycle.entityId,
        set: {
          killedAt: now,
          respawnAt,
        },
      });
  }

  /**
   * Get all entities at a given tile position in a zone.
   * Useful for entity blocking and collision checks.
   */
  async getEntitiesAtPosition(zoneId: string, x: number, y: number): Promise<Entity[]> {
    let zoneState = this.zones.get(zoneId);
    if (!zoneState) {
      zoneState = await this.loadZone(zoneId);
    }

    return Array.from(zoneState.entities.values()).filter(
      (e) => e.active && e.position.x === x && e.position.y === y,
    );
  }

  async getChunk(zoneId: string): Promise<ChunkData> {
    let zoneState = this.zones.get(zoneId);

    if (!zoneState) {
      zoneState = await this.loadZone(zoneId);
    }

    return zoneState.chunk;
  }

  /**
   * Attempt to claim an entity for pickup.
   * Returns true if claim was successful (entity was unclaimed).
   * Returns false if entity is already claimed by another player.
   *
   * SYNCHRONOUS - must be called BEFORE any async operation in pickup handler.
   */
  claimEntity(entityId: string, playerId: string): boolean {
    if (this.claimedEntities.has(entityId)) {
      return false; // Already claimed
    }
    this.claimedEntities.set(entityId, playerId);
    return true;
  }

  /**
   * Release a claim (called after pickup completes or fails).
   */
  releaseClaim(entityId: string): void {
    this.claimedEntities.delete(entityId);
  }

  async getZoneEntities(zoneId: string): Promise<Entity[]> {
    let zoneState = this.zones.get(zoneId);

    if (!zoneState) {
      zoneState = await this.loadZone(zoneId);
    }

    const now = Date.now();
    return Array.from(zoneState.entities.values()).filter(
      (e) => e.active && (!('despawnAt' in e) || (e as ItemEntity).despawnAt > now)
    );
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
      zoneState = await this.loadZone(zoneId);
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
