# Phase 34: Entity Lifecycle Persistence and Enriched Spawning - Research

**Researched:** 2026-02-18
**Domain:** NestJS + Drizzle ORM entity persistence, Zustand entity state, Phaser entity rendering, A* pathfinding entity blocking
**Confidence:** HIGH

## Summary

Phase 34 adds four interconnected capabilities on top of Phase 33's entity registry. First, `createEntityFromSpawn()` in `ZonesService` must be rewritten to look up the `EntityRegistry` singleton (from `@into-the-void/entities`) and populate the full typed entity shape — `health`, `maxHealth`, `behavior`, `textureKey`, `speciesId` — instead of returning a bare skeleton. Second, a new `entity_lifecycle` Drizzle table records whether a spawn point has been killed and when it may re-materialize; this table is queried during zone load so that killed entities are suppressed until their `respawnAt` timestamp elapses. Third, the client needs a dedicated `entityStore.ts` Zustand store (mirroring `inventoryStore.ts`) wired to `entity:spawn`, `entity:update`, and `entity:despawn` socket events, with entity positions also fed into the `PathfindingController`'s `CollisionAccessor` so that click-to-move routes around occupied tiles. Fourth, the server-side `validateMovement` call in `GameService.movePlayer()` must also check entity positions before accepting a move.

The key architectural insight is that entity blocking has two surfaces: the client-side `PathfindingController` receives an `isBlocked: CollisionAccessor` function at path-start time and uses it throughout the A* search, so injecting entity positions there is the minimal-change point; the server-side check requires reading live entity positions from `ZonesService` before calling `validateMovement`. Neither requires touching the existing `collisionMap` boolean array — entity blocking is additive via the accessor pattern already established.

**Primary recommendation:** Build strictly in task order — DB schema first (so `ZonesService` has the table to query), then enriched spawning using EntityRegistry, then `entityStore.ts` + client blocking, then `EntityRenderer` health-bar changes. Doing the DB table after spawning enrichment will require a rewrite of ZonesService.loadZone().

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| drizzle-orm | 0.30.10 (installed) | DB schema, query builder, migrations | Already the project ORM; all other tables use it |
| @into-the-void/entities | workspace | EntityRegistry lookup for enriched spawning | Built in Phase 33; auto-registers on import |
| zustand | (already installed in web) | entityStore client state | All other client stores use Zustand |
| zustand/middleware/immer | (already installed) | Mutable-style entity map updates | inventoryStore.ts uses same pattern |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lru-cache | (already in game-server) | Zone state cache (not changed) | ZonesService already uses LRU; lifecycle reads hit DB only on cache miss |
| drizzle-kit | 0.21.x (installed) | Generate SQL migration from schema | Run `pnpm db:generate` after adding entity_lifecycle table |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| DB-persisted lifecycle | In-memory Map<spawnId, killedAt> | Would not survive server restarts — PERS-05 explicitly forbids this |
| Separate entityStore | Adding entity CRUD to gameStore | gameStore is already large; dedicated store follows inventoryStore.ts pattern |
| Modifying collisionMap boolean[][] | Entity-overlay accessor | Modifying the static bool map causes stale state when entities move/die; accessor pattern reads live data |

**Installation:** No new packages required. All libraries are already installed in the workspace.

## Architecture Patterns

### Recommended Project Structure (changes only)
```
packages/database/src/
└── schema/
    └── entity-lifecycle.ts     # NEW: entity_lifecycle table definition

apps/game-server/src/zones/
└── zones.service.ts            # MODIFIED: enriched createEntityFromSpawn(), loadZone() applies lifecycle

apps/web/src/store/
└── entityStore.ts              # NEW: entity state Zustand store

apps/web/src/game/rendering/
└── EntityRenderer.ts           # MODIFIED: per-species textureKey, always-visible health bars

apps/web/src/game/scenes/
└── WorldScene.ts               # MODIFIED: entityStore-backed CollisionAccessor injected into pathfinding

packages/game-logic/src/movement/
└── validation.ts               # MODIFIED: entity blocking check added to validateMovement
```

### Pattern 1: Drizzle Schema for entity_lifecycle

**What:** A table keyed on `(zoneId, spawnId)` — the deterministic key already used as entity ID prefix in ZonesService (`${zoneId}_${spawn.spawnId}_${spawn.x}_${spawn.y}`). Records killedAt and respawnAt timestamps.

**When to use:** Written on entity death; read during `loadZone()` to suppress materialization.

```typescript
// Source: packages/database/src/schema/entity-lifecycle.ts (NEW FILE)
// Pattern follows structures.ts / world.ts exactly
import { pgTable, varchar, timestamp, primaryKey } from 'drizzle-orm/pg-core';

export const entityLifecycle = pgTable(
  'entity_lifecycle',
  {
    zoneId: varchar('zone_id', { length: 50 }).notNull(),
    spawnId: varchar('spawn_id', { length: 100 }).notNull(),
    killedAt: timestamp('killed_at', { withTimezone: true }).notNull(),
    respawnAt: timestamp('respawn_at', { withTimezone: true }).notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.zoneId, table.spawnId] }),
  })
);

export type EntityLifecycle = typeof entityLifecycle.$inferSelect;
export type NewEntityLifecycle = typeof entityLifecycle.$inferInsert;
```

The composite PK on `(zoneId, spawnId)` enforces one lifecycle record per spawn point across all restarts. `respawnAt` is a future timestamp computed from the EntityDefinition's `respawnSeconds` (plants/minerals) or `respawnTime` from SpawnPoint (creatures). Artifacts use `respawnAt = FAR_FUTURE` (e.g. year 9999) since `ArtifactDefinition.respawns` is always false.

### Pattern 2: Enriched createEntityFromSpawn()

**What:** Look up the `EntityRegistry` (imported from `@into-the-void/entities`) by `spawn.spawnId` and use the definition to populate the full entity shape.

**When to use:** Inside `ZonesService.createEntityFromSpawn()`. The EntityRegistry auto-registers on module import, so importing `EntityRegistry` at the top of `zones.service.ts` is sufficient.

```typescript
// Source: apps/game-server/src/zones/zones.service.ts (MODIFIED)
// Import at top of file:
import { EntityRegistry } from '@into-the-void/entities';
import type { CreatureDefinition, PlantDefinition, MineralDefinition, ArtifactDefinition } from '@into-the-void/entities';

private createEntityFromSpawn(spawn: SpawnPoint, zoneId: string): Entity {
  const id = `${zoneId}_${spawn.spawnId}_${spawn.x}_${spawn.y}`;
  const def = EntityRegistry.get(spawn.spawnId); // Returns UNKNOWN_ENTITY if missing
  const position = { x: spawn.x, y: spawn.y, zoneId };

  if (spawn.entityType === 'creature' && def.entityClass === 'creature') {
    const cDef = def as CreatureDefinition;
    // Level is random within range, seeded deterministically from spawnId
    const level = cDef.levelRange[0] +
      Math.floor(Math.random() * (cDef.levelRange[1] - cDef.levelRange[0] + 1));
    return {
      id,
      type: 'creature',
      name: cDef.displayName,
      position,
      active: true,
      speciesId: cDef.id,
      health: cDef.baseHealth,
      maxHealth: cDef.baseHealth,
      level,
      behavior: cDef.behavior,
    } satisfies Creature;
  }

  if (def.entityClass === 'mineral') {
    const mDef = def as MineralDefinition;
    return {
      id,
      type: 'mineral',
      name: mDef.displayName,
      position,
      active: true,
      resourceId: mDef.id,
      yield: 5,          // Use HarvestYield to compute in Phase 35
      maxYield: 5,
      requiredTier: mDef.requiredTier,
    } satisfies Mineral;
  }

  // plants, artifacts: minimal shape for Phase 34
  return {
    id,
    type: spawn.entityType as EntityType,
    name: def.displayName,
    position,
    active: true,
  };
}
```

**Critical note:** `@into-the-void/entities` is a workspace package not yet listed in `apps/game-server/package.json`. It must be added as a dependency. Check the items package pattern (`@into-the-void/items` is used in `game.service.ts`) to confirm the import works the same way.

### Pattern 3: Lifecycle-Aware Zone Loading

**What:** `loadZone()` becomes async; it queries `entity_lifecycle` for all dead spawn points in the zone before materializing entities.

**When to use:** In `ZonesService.loadZone()` which currently is synchronous. Must become async. `onModuleInit` must `await` it.

```typescript
// Source: apps/game-server/src/zones/zones.service.ts (MODIFIED)
// ZonesService needs DatabaseService injected via constructor

private async loadZone(zoneId: string): Promise<ZoneState> {
  const [, x, y] = zoneId.split('_').map(Number);
  const chunk = generateChunk(this.worldSeed, x, y);

  // Query all lifecycle records for this zone
  const db = this.databaseService.getClient();
  const now = new Date();
  const lifecycleRecords = await db
    .select()
    .from(entityLifecycle)
    .where(eq(entityLifecycle.zoneId, zoneId));

  // Build a set of suppressed spawnIds (killed and not yet respawned)
  const suppressed = new Set<string>(
    lifecycleRecords
      .filter(r => r.respawnAt > now)
      .map(r => r.spawnId)
  );

  const entities = new Map<string, Entity>();
  for (const spawn of chunk.spawnPoints) {
    if (suppressed.has(spawn.spawnId)) continue; // Skip — entity is dead
    const entity = this.createEntityFromSpawn(spawn, zoneId);
    entities.set(entity.id, entity);
  }

  const zoneState: ZoneState = { chunk, entities };
  this.zones.set(zoneId, zoneState);
  return zoneState;
}
```

**Async propagation:** `loadZone()` becoming async means all callers (`getChunk`, `getZoneEntities`, `spawnEntity`, `onModuleInit`) must await it. `getChunk` and `getZoneEntities` are already async. `onModuleInit` must await `loadZone('z_0_0')`.

### Pattern 4: entityStore.ts Zustand Store

**What:** A dedicated Zustand store for entity state with Map-based storage for O(1) lookup. Wired to all three entity socket events.

**When to use:** New file `apps/web/src/store/entityStore.ts`. The gameStore.ts already handles entity:spawn/update/despawn for the Phaser scene — the entityStore handles React-side state.

```typescript
// Source: apps/web/src/store/entityStore.ts (NEW FILE)
// Mirrors inventoryStore.ts pattern with immer middleware
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { Entity } from '@into-the-void/shared-types';
import { gameSocket } from '../network/socket';

interface EntityState {
  entities: Map<string, Entity>;
  spawnEntity: (entity: Entity) => void;
  updateEntity: (entityId: string, changes: Partial<Entity>) => void;
  despawnEntity: (entityId: string) => void;
  clearEntities: () => void;
  getEntityAtPosition: (x: number, y: number, zoneId: string) => Entity | undefined;
}

export const useEntityStore = create<EntityState>()(
  immer((set, get) => ({
    entities: new Map(),

    spawnEntity: (entity) => set((state) => {
      state.entities.set(entity.id, entity);
    }),

    updateEntity: (entityId, changes) => set((state) => {
      const existing = state.entities.get(entityId);
      if (existing) {
        state.entities.set(entityId, { ...existing, ...changes });
      }
    }),

    despawnEntity: (entityId) => set((state) => {
      state.entities.delete(entityId);
    }),

    clearEntities: () => set((state) => {
      state.entities = new Map();
    }),

    getEntityAtPosition: (x, y, zoneId) => {
      const { entities } = get();
      for (const e of entities.values()) {
        if (e.active && e.position.x === x && e.position.y === y && e.position.zoneId === zoneId) {
          return e;
        }
      }
      return undefined;
    },
  }))
);

// Wire socket events
gameSocket.on('entity:spawn', (entity: Entity) => {
  useEntityStore.getState().spawnEntity(entity);
});

gameSocket.on('entity:update', ({ entityId, changes }: { entityId: string; changes: Partial<Entity> }) => {
  useEntityStore.getState().updateEntity(entityId, changes);
});

gameSocket.on('entity:despawn', ({ entityId }: { entityId: string }) => {
  useEntityStore.getState().despawnEntity(entityId);
});
```

**Note on immer + Map:** Zustand's immer middleware supports `Map` mutations. The `state.entities.set(...)` and `state.entities.delete(...)` work correctly inside immer's `set` callback.

### Pattern 5: Entity Blocking in PathfindingController

**What:** The existing `CollisionAccessor` type in `PathfindingController.ts` is `(worldX: number, worldY: number) => boolean`. The WorldScene passes this accessor when calling `startPath()`. Extend the accessor to also check entity positions from `entityStore`.

**When to use:** In `WorldScene.ts` where `pathfindingController.startPath()` is called. The accessor function closes over the entity store.

```typescript
// Source: apps/web/src/game/scenes/WorldScene.ts (MODIFIED - startPath call site)
// Entity-aware collision accessor
const isBlocked: CollisionAccessor = (worldX, worldY) => {
  // 1. Terrain collision (existing)
  const zoneX = Math.floor(worldX / ZONE_SIZE);
  const zoneY = Math.floor(worldY / ZONE_SIZE);
  const localX = worldX - zoneX * ZONE_SIZE;
  const localY = worldY - zoneY * ZONE_SIZE;
  const zoneId = `z_${zoneX}_${zoneY}`;
  const terrainBlocked = this.chunkManager?.getCollision(zoneId, localX, localY) ?? false;
  if (terrainBlocked) return true;

  // 2. Entity blocking (new)
  const entityAtTile = useEntityStore.getState().getEntityAtPosition(localX, localY, zoneId);
  return entityAtTile !== undefined && entityAtTile.active;
};
```

### Pattern 6: Server-Side Entity Blocking in validateMovement

**What:** `GameService.movePlayer()` currently calls `validateMovement(from, to, chunk.collisions)`. Extend it to also check if an entity occupies the destination tile.

**When to use:** In `GameService.movePlayer()` after the terrain collision check. The zone entities are already in `ZonesService`.

```typescript
// Source: apps/game-server/src/game/game.service.ts (MODIFIED)
// After validateMovement call:
const validation = validateMovement(player.position, newPosition, chunk.collisions);
if (!validation.valid) {
  return { success: false, error: validation.reason };
}

// Entity blocking check
const entitiesAtDest = await this.zonesService.getEntitiesAtPosition(
  newPosition.zoneId,
  newPosition.x,
  newPosition.y
);
if (entitiesAtDest.length > 0) {
  return { success: false, error: 'Path blocked by entity' };
}
```

This requires adding `getEntitiesAtPosition(zoneId, x, y): Promise<Entity[]>` to `ZonesService`.

### Pattern 7: EntityRenderer Health Bar — Always-Visible

**What:** Currently, `EntityRenderer.createEntityContainer()` only adds the health bar when `entity.health < entity.maxHealth`. The requirement (INTR-08) mandates health bars for ALL entity types always visible. Also, the texture key should come from `entity.textureKey` (present after enriched spawning) rather than the hard-coded type map.

**When to use:** In `EntityRenderer.ts`.

```typescript
// Source: apps/web/src/game/rendering/EntityRenderer.ts (MODIFIED)
// Replace getEntityTexture(entity.type) with:
private getEntityTexture(entity: Entity): string {
  // After enrichment, creatures have speciesId. Use textureKey from enriched data.
  // For now, fall back to type-based key with species-specific override.
  if ('speciesId' in entity) {
    return (entity as any).speciesId || entity.type;
  }
  if ('resourceId' in entity) {
    return (entity as any).resourceId || 'mineral';
  }
  return entity.type;
}

// Always show health bar (INTR-08) — remove the health < maxHealth condition:
if (this.isCreature(entity)) {
  const healthBar = this.createHealthBar(entity.health, entity.maxHealth);
  healthBar.y = -this.elevationOffset - 24;
  container.add(healthBar);
}
// Also add health bar for plants and minerals (at full yield/health)
// Plants/minerals don't have health fields yet — show full bar
```

**Note:** The `Entity` base type in `shared-types/core/entity.ts` does not carry `textureKey`. Two approaches: (a) add `textureKey?: string` to the base `Entity` interface in shared-types (cleanest, enables renderer to use it directly), or (b) have the renderer do an `EntityRegistry.get(speciesId)` lookup. Option (a) is preferred since it avoids coupling the renderer to the registry singleton.

### Anti-Patterns to Avoid

- **Making loadZone() return a Promise without updating callers:** Every call site that was synchronous becomes a bug. `onModuleInit` must use `await`. Other callers (`getChunk`, `getZoneEntities`) are already async and call `loadZone()` lazily — they must `await` it.
- **Storing lifecycle state in ZonesService's in-memory LRU only:** The LRU evicts zones after 5 minutes of inactivity. Lifecycle must survive this — only DB records persist through eviction and restarts.
- **Checking entity blocking via collisionMap mutation:** Mutating the `boolean[][]` collisionMap with entity positions creates stale data when entities die/despawn. The accessor closure pattern reads live state from `entityStore` (client) or `ZonesService.entities` (server) at path-time.
- **Querying entity_lifecycle per-spawn instead of per-zone:** Fetch all records for the zone in one query on load, not one query per spawn point. The zone load is already the expensive step.
- **Not importing @into-the-void/entities in zones.service.ts:** The EntityRegistry singleton auto-registers on import; without the import, the registry is empty and all lookups return the `UNKNOWN_ENTITY` fallback.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| DB migration | Manual SQL ALTER TABLE | Drizzle `pnpm db:generate` + `pnpm db:migrate` | The project already uses Drizzle migrations; drizzle-kit generates correct SQL from schema diff |
| Respawn timer scheduling | setInterval / setTimeout respawn jobs | DB-persisted respawnAt timestamp + check on zone load | Timers in memory die with process; DB timestamp is process-death-safe (PERS-05) |
| Entity position index | Custom spatial hash map | Linear scan of entityStore.entities.values() on path computation | Entity counts per zone are low (<50); linear scan is acceptable; adding a spatial structure is premature optimization |
| A* with entity blocking | New pathfinding algorithm | Extend existing `CollisionAccessor` closure | The accessor pattern is already the extension point designed for this |

**Key insight:** The DB is the source of truth for respawn timers. The in-memory LRU is a cache. Never treat the cache as authoritative for persistence requirements.

## Common Pitfalls

### Pitfall 1: loadZone() Async Cascade

**What goes wrong:** `loadZone()` becomes async. Code that was `const state = this.loadZone(zoneId)` silently gets a Promise instead of a ZoneState, causing `state.entities` to be undefined.

**Why it happens:** TypeScript allows calling an async function without await if the caller is also async and doesn't use the result type strictly.

**How to avoid:** Make `loadZone()` return `Promise<ZoneState>`. Update `getChunk`, `getZoneEntities`, and `spawnEntity` to `await this.loadZone(zoneId)`. Add `await` to `onModuleInit`.

**Warning signs:** `entities is undefined` or `cannot read property 'get' of undefined` at zone load time.

### Pitfall 2: EntityRegistry Not Imported in Server Context

**What goes wrong:** `ZonesService` calls `EntityRegistry.get(spawn.spawnId)` but the registry is empty — always returns UNKNOWN_ENTITY with `baseHealth: 1`.

**Why it happens:** The registry auto-registers via the side-effect in `packages/entities/src/index.ts` — `EntityRegistry.registerAll(ALL_ENTITIES)` runs when the module is imported. If `@into-the-void/entities` is not in `apps/game-server/package.json` dependencies, or the import is from a sub-path that doesn't execute the side-effect, registration never happens.

**How to avoid:** Import `from '@into-the-void/entities'` (the index, not a sub-path). Add `"@into-the-void/entities": "workspace:*"` to `apps/game-server/package.json` dependencies.

**Warning signs:** All entities spawn with `health: 1`, `name: "Unknown Entity"`, `behavior: 'herbivore'`.

### Pitfall 3: entity_lifecycle Composite Key Collision on Re-Kill

**What goes wrong:** A creature is killed, a lifecycle record is written. After `respawnAt` elapses, the entity materializes again. When killed a second time, the INSERT fails with a unique constraint violation.

**Why it happens:** The PK is `(zoneId, spawnId)`. A second kill tries to INSERT the same PK.

**How to avoid:** Use Drizzle's `onConflictDoUpdate()` (upsert) when writing lifecycle records, updating `killedAt` and `respawnAt` in place.

```typescript
// Source: drizzle-orm docs pattern
await db.insert(entityLifecycle)
  .values({ zoneId, spawnId, killedAt: now, respawnAt: futureTime })
  .onConflictDoUpdate({
    target: [entityLifecycle.zoneId, entityLifecycle.spawnId],
    set: { killedAt: now, respawnAt: futureTime },
  });
```

**Warning signs:** `duplicate key value violates unique constraint "entity_lifecycle_pkey"` on second entity kill.

### Pitfall 4: Zustand immer + Map — Immer Draft Limitation

**What goes wrong:** Reading `state.entities.values()` inside an immer `set()` callback returns Immer proxy objects, not real entities.

**Why it happens:** Immer wraps the state in a Proxy. `state.entities.values()` inside `set()` yields proxied `Entity` objects.

**How to avoid:** Do reads outside `set()`. The `get()` accessor (second parameter of the immer `set` factory) returns the current un-proxied state. For `getEntityAtPosition`, use `get()` not `set()`.

**Warning signs:** Entity position comparisons returning wrong results, spread `{ ...entity }` producing unexpected shapes.

### Pitfall 5: gameStore.ts Already Handles entity:* Events

**What goes wrong:** Both `gameStore.ts` and the new `entityStore.ts` subscribe to `entity:spawn`, `entity:update`, and `entity:despawn`. They will both fire. The gameStore routes events to the Phaser scene; the entityStore maintains React-side state. This is intentional but must be coordinated.

**Why it happens:** Socket.io allows multiple listeners on the same event.

**How to avoid:** Keep both listeners. Do not remove the gameStore handlers — they drive the Phaser `WorldScene.spawnEntity()` / `despawnEntity()` calls. The entityStore handles HUD-side React component updates and client-side pathfinding. Verify that `entityStore.ts` imports `gameSocket` from the same singleton as `gameStore.ts` so both share the same socket connection.

**Warning signs:** Entities visible in Phaser but not available to pathfinding, or vice versa.

### Pitfall 6: SpawnId Uniqueness Within a Zone

**What goes wrong:** Two spawn points have the same `spawnId` (e.g., two `creature_void_crawler` spawn points in the same zone). Lifecycle records key on `(zoneId, spawnId)`. Both will be suppressed when either is killed.

**Why it happens:** The `spawnId` field in `SpawnPoint` is the entity definition ID (e.g., `'creature_void_crawler'`), NOT a unique per-spawn identifier.

**How to avoid:** The lifecycle record key must be the full entity ID: `${zoneId}_${spawn.spawnId}_${spawn.x}_${spawn.y}` — the same composite used for the entity's `id` field. Rename the column or the logic to use the entity's full `id` as the `spawnId` in `entity_lifecycle`. This makes the compound key globally unique.

**Action:** Change the schema to use `entity_id varchar(200)` as PK, not `(zoneId + spawnId)`. The entity ID already encodes zone, spawnId, and position.

### Pitfall 7: Artifact Lifecycle — Never Respawns

**What goes wrong:** Artifacts with `respawns: false` should never re-materialize. If the lifecycle check only compares `respawnAt > now`, a very far-future timestamp could eventually elapse.

**How to avoid:** Use a sentinel: when writing lifecycle for an artifact, set `respawnAt = new Date('2100-01-01')` (100 years in the future). Zone load suppression will always skip it. Alternatively, add a `respawns` boolean column to `entity_lifecycle`, but the sentinel approach avoids schema complexity.

## Code Examples

Verified patterns from official drizzle-orm sources:

### Drizzle pgTable with composite primary key (verified against schema/discoveries.ts pattern)
```typescript
// Source: packages/database/src/schema/discoveries.ts (existing code pattern)
import { pgTable, varchar, timestamp, primaryKey } from 'drizzle-orm/pg-core';

export const entityLifecycle = pgTable(
  'entity_lifecycle',
  {
    entityId: varchar('entity_id', { length: 200 }).notNull(),
    zoneId: varchar('zone_id', { length: 50 }).notNull(),
    killedAt: timestamp('killed_at', { withTimezone: true }).notNull(),
    respawnAt: timestamp('respawn_at', { withTimezone: true }).notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.entityId] }), // entityId is globally unique
  })
);
```

### Drizzle upsert pattern (drizzle-orm 0.30.x)
```typescript
// Source: drizzle-orm v0.30 docs - onConflictDoUpdate
import { eq } from 'drizzle-orm';

await db.insert(entityLifecycle)
  .values(newRecord)
  .onConflictDoUpdate({
    target: entityLifecycle.entityId,
    set: {
      killedAt: newRecord.killedAt,
      respawnAt: newRecord.respawnAt,
    },
  });
```

### Drizzle select with where filter (verified against queries/characters.ts pattern)
```typescript
// Source: packages/database/src/queries/characters.ts (existing pattern)
import { eq, gt } from 'drizzle-orm';

const now = new Date();
const activeLifecycle = await db
  .select()
  .from(entityLifecycle)
  .where(eq(entityLifecycle.zoneId, zoneId));
// Then filter in JS: .filter(r => r.respawnAt > now)
```

### DatabaseService injection into ZonesService (NestJS pattern — verified against game-server patterns)
```typescript
// Source: apps/game-server/src/database/database.service.ts (existing)
// ZonesService constructor — add DatabaseService parameter:
constructor(
  private readonly configService: ConfigService,
  private readonly databaseService: DatabaseService,
) { ... }
// ZonesModule must import DatabaseModule and inject DatabaseService as provider
```

### Zustand store with immer + Map (mirrors inventoryStore.ts)
```typescript
// Source: apps/web/src/store/inventoryStore.ts (existing pattern)
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

export const useEntityStore = create<EntityState>()(
  immer((set, get) => ({
    entities: new Map<string, Entity>(),
    spawnEntity: (entity) => set((state) => { state.entities.set(entity.id, entity); }),
    despawnEntity: (id) => set((state) => { state.entities.delete(id); }),
    getEntityAtPosition: (x, y, zoneId) => {
      // Read using get() not set() to avoid draft proxy
      for (const e of get().entities.values()) {
        if (e.active && e.position.x === x && e.position.y === y && e.position.zoneId === zoneId) return e;
      }
      return undefined;
    },
  }))
);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Bare entity skeleton in createEntityFromSpawn | Enriched entity from EntityRegistry | Phase 34 | health, maxHealth, behavior, speciesId correct from spawn |
| No spawn point persistence | entity_lifecycle DB table | Phase 34 | Killed entities stay dead across zone eviction and server restart |
| Health bar only when damaged | Health bar always visible | Phase 34 | INTR-08 requirement met |
| No entity blocking in pathfinding | CollisionAccessor extended with entity positions | Phase 34 | EBLK-01, EBLK-02 met |
| Single EntityRegistry in shared-types (deprecated) | EntityRegistryImpl in @into-the-void/entities | Phase 33 | Old registry marked deprecated; Phase 34 uses new one |

**Deprecated/outdated:**
- `EntityRegistry` in `packages/shared-types/src/game/entity-registry.ts`: Explicitly marked `@deprecated` since Phase 33. Phase 34 must NOT use it. Use `EntityRegistry` from `@into-the-void/entities` exclusively.
- Bare entity skeleton from the old `createEntityFromSpawn`: Returns only `id`, `type`, `name`, `position`, `active`. Phase 34 replaces this with the full typed shape.

## Open Questions

1. **SpawnPoint.entityType only has 'creature' | 'mineral' — plants and artifacts are not in the type**
   - What we know: `SpawnPoint.entityType` in `shared-types/core/zone.ts` is typed as `'creature' | 'mineral'`. Phase 33 added plant and artifact definitions but the spawn generation (`world-gen/spawn.ts`) only generates creatures and minerals.
   - What's unclear: Whether Phase 34 should also spawn plants/artifacts, or leave that for a later phase.
   - Recommendation: Phase 34 enriches whatever spawns exist (creatures and minerals). SpawnPoint type expansion and plant/artifact spawning can be deferred to Phase 35+. The enriched `createEntityFromSpawn()` should handle `entityClass: 'plant'` and `'artifact'` defensively but not need them.

2. **Level randomization for creatures — deterministic or random?**
   - What we know: The current `createEntityFromSpawn()` has no level logic. The world seed is available in ZonesService. The spawn gen already uses `SeededRandom`.
   - What's unclear: Should level be seeded (same entity always same level) or random (varies per zone load)?
   - Recommendation: Use a deterministic seed combining worldSeed + spawnId + position for level generation. This means the same spawn point always produces the same level creature, which feels more consistent and is testable.

3. **ZonesModule needs DatabaseModule access — is it already wired?**
   - What we know: `ZonesModule` only imports `ConfigModule`. `DatabaseModule` is imported at `AppModule` level. NestJS global modules would expose `DatabaseService` if `DatabaseModule` is `@Global()`.
   - What's unclear: Whether `DatabaseModule` is marked `@Global()`.
   - Recommendation: Check `database.module.ts`. If not global, add `DatabaseModule` to `ZonesModule.imports`. This is the safest approach regardless.

4. **Health bar for non-creature entities (plants, minerals)**
   - What we know: `Mineral` and `Plant` types in `shared-types/core/entity.ts` have `yield`/`maxYield`, not `health`/`maxHealth`. INTR-08 says "health bars displayed for all entity types."
   - What's unclear: Whether "health bar" for a mineral means its yield bar.
   - Recommendation: Display a yield/resource bar using the same `createHealthBar()` visual, driven by `yield / maxYield` ratio for minerals and plants. Label it differently if HUD space permits, but the visual is the same graphic.

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection — all findings verified against actual source files
  - `packages/entities/src/` — EntityRegistry singleton, auto-registration pattern, all 35 entity definitions
  - `packages/database/src/schema/` — all schema table patterns (discoveries.ts for composite PK, inventories.ts for jsonb)
  - `apps/game-server/src/zones/zones.service.ts` — current createEntityFromSpawn(), LRU cache, entity management
  - `apps/game-server/src/game/game.service.ts` — movePlayer() validateMovement call site
  - `apps/web/src/game/systems/PathfindingController.ts` — CollisionAccessor type, startPath() signature
  - `apps/web/src/store/inventoryStore.ts` — Zustand + immer + socket wiring pattern to replicate
  - `apps/web/src/game/rendering/EntityRenderer.ts` — current health bar logic, texture key lookup
  - `packages/game-logic/src/movement/validation.ts` — validateMovement() signature
  - `packages/game-logic/src/movement/pathfinding.ts` — A* implementation (server-side)

### Secondary (MEDIUM confidence)
- drizzle-orm 0.30.10 installed version confirmed via `node -e require(package.json)`
- `onConflictDoUpdate` upsert pattern: verified present in drizzle-orm 0.30.x per project's own usage in inventory queries and confirmed version match

### Tertiary (LOW confidence)
- Zustand immer + Map draft proxy behavior: Based on Zustand documentation and general immer behavior. The `get()` accessor approach is the documented way to read state outside mutations. Validate during implementation.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries are already installed in the project; no new dependencies required
- Architecture patterns: HIGH — all patterns derived from actual codebase files with direct source references
- entity_lifecycle schema: HIGH — directly modeled after discoveries.ts composite PK pattern in the same package
- PathfindingController entity blocking: HIGH — CollisionAccessor type already designed as the extension point
- Pitfalls: HIGH — derived from reading actual code paths; async cascade is the most likely real failure
- Plant/artifact health bars: MEDIUM — the requirement says "all entity types" but plant/mineral entities lack `health` field; interpretation needed

**Research date:** 2026-02-18
**Valid until:** 2026-03-20 (stable stack; 30 days)
