import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Artifact,
  ChunkData,
  Creature,
  Entity,
  ItemEntity,
  Mineral,
  Npc,
  Plant,
  SpawnPoint,
} from '@into-the-void/shared-types';
import { generateChunk, generateHubChunk, isKnownHub, getHubConfig } from '@into-the-void/world-gen';
import { isHubZone } from '@into-the-void/shared-types';
import { NpcRegistry } from '@into-the-void/npcs';
import { EntityRegistry } from '@into-the-void/entities';
import type {
  ArtifactDefinition,
  CreatureDefinition,
  MineralDefinition,
  PlantDefinition,
} from '@into-the-void/entities';
import { ItemRegistry } from '@into-the-void/items';
import { DatabaseService } from '../database/database.service';
import { entityLifecycle, groundItems } from '@into-the-void/database';
import { eq, lte, lt, and, gt } from 'drizzle-orm';
import { LRUCache } from 'lru-cache';
import { Server } from 'socket.io';

interface ZoneState {
  chunk: ChunkData;
  entities: Map<string, Entity>;
}

/**
 * Minimal interface for AI aggro checking.
 * Using interface (not import) to avoid circular dependency between ZonesModule and GameModule.
 */
interface AggroChecker {
  checkCreatureAggro(creature: Creature, zoneId: string): Promise<void>;
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
  // Socket.IO server reference for respawn broadcasts
  private server: Server | null = null;
  // AI aggro checker — set after GameModule initializes to avoid circular dep
  private aggroChecker: AggroChecker | null = null;

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
    // Start respawn tick loop (10 second interval)
    setInterval(() => this.processRespawnTick(), 10_000);
    console.log('[ZonesService] Respawn tick loop started (10s interval)');
    console.log(`[ZonesService] NpcRegistry initialized: ${NpcRegistry.size} NPCs registered`);
  }

  /**
   * Set the Socket.IO server reference for respawn broadcasts.
   * Called by GameGateway.afterInit().
   */
  setServer(server: Server): void {
    this.server = server;
  }

  /**
   * Set the aggro checker (AiService) for immediate aggro on respawn.
   * Called by GameGateway.afterInit() to avoid circular module dependency.
   */
  setAggroChecker(checker: AggroChecker): void {
    this.aggroChecker = checker;
  }

  private async loadZone(zoneId: string): Promise<ZoneState> {
    // Hub zones are safe areas — no creature spawning, only NPCs via loadHubZone()
    if (isHubZone(zoneId)) {
      return this.loadHubZone(zoneId);
    }

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

    // Load persisted ground items from DB (non-expired only)
    const groundItemRows = await db
      .select()
      .from(groundItems)
      .where(
        and(
          eq(groundItems.zoneId, zoneId),
          gt(groundItems.despawnAt, now),
        ),
      );

    for (const row of groundItemRows) {
      const itemDef = ItemRegistry.get(row.itemId);
      const itemEntity: ItemEntity = {
        id: row.id,
        type: 'item',
        name: itemDef?.displayName || row.itemId,
        position: { x: row.x, y: row.y, zoneId },
        active: true,
        itemId: row.itemId,
        quantity: row.quantity,
        despawnAt: row.despawnAt.getTime(),
      };
      entities.set(itemEntity.id, itemEntity);
    }

    const zoneState: ZoneState = {
      chunk,
      entities,
    };

    this.zones.set(zoneId, zoneState);
    return zoneState;
  }

  /**
   * Load a hub zone using static generation (no procedural world-gen, no entity spawns).
   * Hub zones are safe areas with a walkable floor and blocked perimeter.
   * Ground items dropped by players (trading) are still supported via the LRU cache.
   */
  private async loadHubZone(zoneId: string): Promise<ZoneState> {
    if (!isKnownHub(zoneId)) {
      throw new Error(`Unknown hub zone: ${zoneId}`);
    }

    console.log(`[ZonesService] Loading hub zone: ${zoneId}`);
    const chunk = generateHubChunk(zoneId);

    // Hub zones start with NPC entities from hub configuration
    const entities = new Map<string, Entity>();

    // Spawn NPCs for this hub zone
    const npcEntities = this.spawnHubNpcs(zoneId);
    for (const [id, npc] of npcEntities) {
      entities.set(id, npc);
    }

    const zoneState: ZoneState = {
      chunk,
      entities,
    };

    this.zones.set(zoneId, zoneState);
    return zoneState;
  }

  /**
   * Spawn NPCs for a hub zone based on hub configuration.
   * Called when loading a hub zone.
   */
  private spawnHubNpcs(zoneId: string): Map<string, Npc> {
    const npcs = new Map<string, Npc>();
    const hubConfig = getHubConfig(zoneId);
    if (!hubConfig) return npcs;

    if (NpcRegistry.size === 0) {
      console.error(`[ZonesService] CRITICAL: NpcRegistry is empty when spawning hub NPCs for ${zoneId}`);
      // Force import to ensure module side-effect runs
      // This should never happen with correct import order
    }

    for (const spawn of hubConfig.npcSpawns) {
      const def = NpcRegistry.get(spawn.npcId);

      const npcEntity: Npc = {
        id: `${zoneId}_npc_${spawn.npcId}`,
        type: 'npc',
        position: {
          x: spawn.x,
          y: spawn.y,
          zoneId: zoneId,
        },
        name: def.displayName,
        active: true,
        npcId: spawn.npcId,
        npcType: def.npcType,
        faction: def.faction,
      };

      npcs.set(npcEntity.id, npcEntity);
    }

    console.log(`[ZonesService] Spawned ${npcs.size} NPCs for ${hubConfig.displayName}`);
    return npcs;
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
        spawnPosition: { x: spawn.x, y: spawn.y },
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
   * Returns the cached chunk synchronously, or undefined if not loaded.
   * Used by MovementService tick loop to avoid async I/O in the hot path.
   * If the zone is not yet cached, the caller should skip validation for that tick —
   * the zone will be loaded by the normal flow (zone enter event) before the next tick.
   */
  getChunkSync(zoneId: string): ChunkData | undefined {
    const zoneState = this.zones.get(zoneId);
    return zoneState?.chunk;
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

  /**
   * Respawn tick loop — runs every 10 seconds.
   *
   * 1. Queries entity_lifecycle records where respawnAt <= now.
   * 2. For non-artifact records: re-materializes the entity in its zone,
   *    loading the zone from DB if it was evicted from the LRU cache.
   * 3. Broadcasts entity:spawn to the zone room (reaches any players present).
   * 4. Deletes the processed lifecycle record.
   * 5. Deletes expired ground_items rows from the DB.
   */
  private async processRespawnTick(): Promise<void> {
    try {
      const db = this.databaseService.getClient();
      const now = new Date();

      // Query entity_lifecycle records ready to respawn
      const ready = await db
        .select()
        .from(entityLifecycle)
        .where(lte(entityLifecycle.respawnAt, now));

      for (const record of ready) {
        // FAR_FUTURE check: year >= 2099 means artifact (never respawn)
        if (record.respawnAt.getFullYear() >= 2099) {
          continue;
        }

        // Get zone state, loading if evicted from LRU cache
        let zoneState = this.zones.get(record.zoneId);
        if (!zoneState) {
          // Zone was evicted from LRU cache — load it to process respawn
          await this.loadZone(record.zoneId);
          zoneState = this.zones.get(record.zoneId);
        }

        if (zoneState) {
          // Find the original SpawnPoint and re-materialize entity
          const spawn = this.findSpawnPointFromEntityId(record.entityId, zoneState.chunk);
          if (spawn) {
            const entity = this.createEntityFromSpawn(spawn, record.zoneId);
            zoneState.entities.set(entity.id, entity);

            // Broadcast entity:spawn to zone (players in zone will see respawn)
            if (this.server) {
              this.server.to(record.zoneId).emit('entity:spawn', entity);
            }

            // Trigger immediate aggro check if this is an aggressive creature
            if (entity.type === 'creature' && this.aggroChecker) {
              this.aggroChecker.checkCreatureAggro(entity as Creature, record.zoneId);
            }
          }
        }

        // Delete lifecycle record (entity is now alive)
        await db.delete(entityLifecycle).where(eq(entityLifecycle.entityId, record.entityId));
      }

      // Clean up expired ground items from DB
      await db.delete(groundItems).where(lt(groundItems.despawnAt, now));
    } catch (error) {
      console.error('[ZonesService] processRespawnTick error:', error);
    }
  }

  /**
   * Find the original SpawnPoint matching an entityId.
   * EntityId format: zoneId_spawnId_x_y — we match by suffix _spawnId_x_y.
   */
  private findSpawnPointFromEntityId(entityId: string, chunk: ChunkData): SpawnPoint | undefined {
    for (const spawn of chunk.spawnPoints) {
      if (entityId.endsWith(`_${spawn.spawnId}_${spawn.x}_${spawn.y}`)) {
        return spawn;
      }
    }
    return undefined;
  }
}
