# Phase 35: Loot Tables, Tool Interaction, and Respawn - Research

**Researched:** 2026-02-18
**Domain:** Game server feature — loot tables, tool-range interaction, ground-item persistence, respawn tick loop
**Confidence:** HIGH

## Summary

Phase 35 closes the core game loop: player equips a tool, uses it on an in-range entity, the entity yields loot that drops on the ground as a persisted `ItemEntity`, and depleted non-artifact entities eventually respawn at their original spawn point. The data foundations are entirely in place: `entity_lifecycle` table exists (with `killedAt`/`respawnAt` columns and FAR_FUTURE sentinel for artifacts), `EntityRegistry` has `lootTableId` references on all 35 definitions, `HarvestYield` arrays are on `MineralDefinition` and `PlantDefinition`, `canInteract()` exists in `game-logic`, and `ItemEntity` is already typed with `despawnAt`. The sole missing pieces are: (1) the `ground_items` DB table, (2) the `rollLootTable()` pure function, (3) the `entity:tool_use` client event, (4) a `range` property on `ItemDefinition`, and (5) the respawn tick loop that processes `entity_lifecycle` records and re-materializes entities in memory.

The architecture is straightforward because ground items already follow the "spawn as Entity, despawn on pickup" pattern established for player-dropped items in Phase 34. The primary design decision is whether loot tables live in the DB (`loot_tables` + `loot_table_entries` tables) or are encoded entirely in code from `HarvestYield` arrays already on entity definitions. Both approaches are viable; the requirement says LOOT-01 requires DB tables, but the entity definitions already carry the same data. Given the prior decision — "loot in memory only is never acceptable; items must survive zone eviction" — DB persistence for `ground_items` is non-negotiable, but the loot table schema itself can reasonably be code-only since `HarvestYield` arrays on entity definitions already provide a complete, typed, code-resident loot table.

**Primary recommendation:** Implement loot tables as code-resident `HarvestYield[]` arrays (already on entity definitions) rather than a separate `loot_tables` DB schema. The DB table requirement in LOOT-01 likely predates the `HarvestYield` design in Phase 33. Use the `HarvestYield[]` as the loot table, persist only `ground_items` to DB. The `rollLootTable()` function takes a `HarvestYield[]` and returns rolled `InventoryItemJson[]`. This avoids a redundant schema layer. However, if the planner interprets LOOT-01 strictly, two thin DB tables are a minimal addition.

## Standard Stack

### Core (already in project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `drizzle-orm/pg-core` | 0.30.10 | DB schema definition | Project standard, used for all tables |
| `@nestjs/common` | 10.4.22 | NestJS DI, Injectable, OnModuleInit | Project standard for all services |
| `@into-the-void/database` | workspace | DB client, schema exports, query helpers | Project standard |
| `@into-the-void/entities` | workspace | EntityRegistry with HarvestYield arrays | Phase 33 output |
| `@into-the-void/game-logic` | workspace | canInteract(), pure logic functions | Project standard |
| `@into-the-void/items` | workspace | ItemRegistry, ItemDefinition | Project standard |

### No New Dependencies Required
All necessary packages are already installed. The respawn tick loop uses `setInterval` via `OnModuleInit` — no `@nestjs/schedule` needed. `@nestjs/schedule` is NOT in the lockfile and must NOT be added without explicit approval.

**Installation:** None required.

## Architecture Patterns

### Recommended Project Structure

New files needed:

```
packages/database/src/schema/
└── ground-items.ts              # ground_items table definition

packages/game-logic/src/
└── loot/
    └── loot-table.ts            # rollLootTable() pure function

apps/game-server/src/
├── game/
│   ├── entity.service.ts        # EntityService (new)
│   └── game.module.ts           # add EntityService provider
└── zones/
    └── zones.service.ts         # add respawn tick loop (OnModuleInit setInterval)
```

Modifications:
```
packages/shared-types/src/network/events.ts   # add entity:tool_use to ClientEvents
packages/items/src/types.ts                   # add range to ItemDefinition
packages/items/src/definitions/tools.ts       # add range values to all tools
packages/database/src/schema/index.ts         # export ground-items schema
packages/game-logic/src/index.ts              # export rollLootTable
apps/game-server/src/game/game.gateway.ts     # add entity:tool_use handler
```

### Pattern 1: Ground Items as Persisted ItemEntity

The existing `ItemEntity` type already has `despawnAt`. The `ground_items` DB table mirrors `ItemEntity` fields to survive zone eviction. On zone load, ground items are fetched from DB and reconstituted as `ItemEntity` objects injected into `zoneState.entities`. On pickup or expiry, the DB row is deleted.

**Schema:**
```typescript
// Source: packages/database/src/schema/ground-items.ts
// Follows entity-lifecycle.ts pattern (varchar PK, no uuid, zone-scoped queries)
import { pgTable, varchar, integer, timestamp } from 'drizzle-orm/pg-core';

export const groundItems = pgTable('ground_items', {
  id: varchar('id', { length: 200 }).primaryKey(),        // 'item_<uuid>'
  zoneId: varchar('zone_id', { length: 50 }).notNull(),   // for zone-scoped load
  itemId: varchar('item_id', { length: 100 }).notNull(),
  quantity: integer('quantity').notNull(),
  x: integer('x').notNull(),
  y: integer('y').notNull(),
  despawnAt: timestamp('despawn_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
```

### Pattern 2: rollLootTable() Pure Function

Takes a `HarvestYield[]` (from `MineralDefinition.miningYield` or `PlantDefinition.harvestYield`) and a random seed source. Returns an `InventoryItemJson[]` ready to spawn as ground items. Pure function in `game-logic` — no side effects, fully testable.

```typescript
// Source: packages/game-logic/src/loot/loot-table.ts
import type { HarvestYield } from '@into-the-void/entities';
import type { InventoryItemJson } from '@into-the-void/database';

export function rollLootTable(entries: readonly HarvestYield[]): InventoryItemJson[] {
  const results: InventoryItemJson[] = [];
  for (const entry of entries) {
    if (Math.random() < entry.chance) {
      const qty = entry.minAmount + Math.floor(Math.random() * (entry.maxAmount - entry.minAmount + 1));
      results.push({
        instanceId: crypto.randomUUID(),
        itemId: entry.itemId,
        quantity: qty,
        slot: -1,
        properties: {},
      });
    }
  }
  return results;
}
```

For creature loot tables (where `HarvestYield` is NOT on `CreatureDefinition`), the `lootTableId` on the creature definition (`'loot_creature_void_crawler'` etc.) must be resolved. Since creature definitions do not carry `HarvestYield` arrays, creature loot tables must be defined separately — either in a static map in game-logic or as DB rows. Use a static code map for Phase 35 (matches the pattern already established for HarvestYield on minerals/plants).

### Pattern 3: EntityService — handleToolUse()

New service in `apps/game-server/src/game/` following the same DI pattern as `GameService`. Injected into `GameGateway`.

```typescript
// Source: apps/game-server/src/game/entity.service.ts
@Injectable()
export class EntityService {
  constructor(
    private readonly zonesService: ZonesService,
    private readonly inventoryService: InventoryService,
    private readonly databaseService: DatabaseService,
  ) {}

  async handleToolUse(
    player: Player,
    targetEntityId: string,
    toolRange: number,
  ): Promise<ToolUseResult> {
    const entity = await this.zonesService.getEntity(player.position.zoneId, targetEntityId);
    if (!entity) return { success: false, error: 'Entity not found' };

    // canInteract() validates range using manhattanDistance
    const check = canInteract(player, entity, toolRange);
    if (!check.canInteract) return { success: false, error: check.reason };

    // Route by entity type
    switch (entity.type) {
      case 'mineral': return this.handleMine(player, entity as Mineral);
      case 'plant':   return this.handleHarvest(player, entity as Plant);
      case 'artifact': return this.handleCollect(player, entity as Artifact);
      case 'creature': return this.handleAttack(player, entity as Creature);
      default: return { success: false, error: 'Cannot use tool on this entity' };
    }
  }
}
```

### Pattern 4: Respawn Tick Loop

Implemented in `ZonesService.onModuleInit()` using `setInterval`. Runs every 10 seconds. Queries `entity_lifecycle` for records where `respawnAt <= now AND respawnAt < FAR_FUTURE`. For each matching record, if the zone is loaded in the LRU cache, respawns the entity using `createEntityFromSpawn()`. Deletes the lifecycle record from DB after respawn.

```typescript
// Source: apps/game-server/src/zones/zones.service.ts
async onModuleInit() {
  await this.loadZone('z_0_0');
  // Start respawn tick loop
  setInterval(() => this.processRespawnTick(), 10_000);
}

private async processRespawnTick(): Promise<void> {
  const db = this.databaseService.getClient();
  const now = new Date();

  // Query records ready to respawn (not artifacts - FAR_FUTURE sentinel filters them)
  const ready = await db
    .select()
    .from(entityLifecycle)
    .where(lte(entityLifecycle.respawnAt, now));

  for (const record of ready) {
    // Skip artifacts (FAR_FUTURE sentinel = year 2100)
    if (record.respawnAt.getFullYear() >= 2099) continue;

    // Re-materialize entity in zone if loaded
    const zoneState = this.zones.get(record.zoneId);
    if (zoneState) {
      // Reconstruct spawn point from entityId (format: zoneId_spawnId_x_y)
      const entity = this.respawnFromLifecycleRecord(record, zoneState);
      if (entity) {
        zoneState.entities.set(entity.id, entity);
        // Emit entity:spawn to zone (needs server reference - inject via callback or return)
      }
    }
    // Delete lifecycle record regardless (next zone load will create entity fresh)
    await db.delete(entityLifecycle).where(eq(entityLifecycle.entityId, record.entityId));
  }
}
```

**Note:** The respawn tick needs to broadcast `entity:spawn` to the zone's Socket.IO room. Two approaches:
1. ZonesService receives the Socket.IO `Server` via a callback/EventEmitter pattern
2. Return respawned entities to the caller (GameGateway) and broadcast from there

Approach 2 is cleaner given NestJS DI — use a custom EventEmitter or return the respawned entities from `processRespawnTick()` and let GameGateway broadcast. The preferred pattern in this codebase is to NOT inject `Server` directly into `ZonesService` (the gateway owns WebSocket concerns). Use NestJS `EventEmitter2` or return data from service to gateway.

However, NestJS `@nestjs/event-emitter` is also NOT in lockfile. The simplest approach: inject the `Server` reference into `ZonesService` post-init via a `setServer(server: Server)` method called from `GameGateway.afterInit()`. This keeps things in-process without new dependencies.

### Pattern 5: Ground Items Loaded on Zone Load

`ZonesService.loadZone()` already fetches `entity_lifecycle` records. It must also fetch `ground_items` for the zone and inject them as `ItemEntity` objects into `zoneState.entities`.

```typescript
// In loadZone(), after building entities from spawn points:
const groundItemRows = await db
  .select()
  .from(groundItems)
  .where(
    and(
      eq(groundItems.zoneId, zoneId),
      gt(groundItems.despawnAt, now)  // only non-expired
    )
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
```

### Pattern 6: Tool Range Property

Add `range` to `ItemDefinition.toolType === 'tool'` items only. The field is optional so non-tool items are unaffected.

```typescript
// packages/items/src/types.ts — add to ItemDefinition
/** Tool interaction range in tiles (tools only, 1-10) */
readonly range?: number;
```

Range values by rarity (MEDIUM confidence — reasonable game design, not derived from existing code):
- common: 1 tile
- rare: 2 tiles
- epic: 3 tiles
- exotic: 4 tiles
- legendary: 5 tiles

### Anti-Patterns to Avoid

- **Storing loot tables only in DB without code:** The `HarvestYield[]` arrays are already on entity definitions in code. Creating a redundant `loot_tables` DB schema would require keeping two sources in sync. Use code as source of truth for loot table definitions; DB for ground item instances only.
- **In-memory-only ground items:** Violates the non-negotiable prior decision. Ground items MUST be written to DB on spawn and deleted on pickup/expiry.
- **Deleting ground items lazily (only on access):** Instead, add a separate cleanup pass in the respawn tick loop that deletes expired `ground_items` rows from DB. In-memory filtering already exists in `getZoneEntities()`.
- **Injecting Socket.IO Server into ZonesService:** ZonesService should not own WebSocket concerns. Use `setServer()` post-init pattern or broadcast from a higher-level caller.
- **Using @nestjs/schedule for respawn loop:** Not installed, avoid adding. Use `setInterval` in `OnModuleInit`.
- **Rolling loot inside ZonesService:** Keep `rollLootTable()` pure in game-logic. Services call it and persist results.
- **Artifacts dropping loot on collection:** Artifact collection via tool use should write FAR_FUTURE lifecycle record (already done in `recordEntityKill`) and spawn the artifact item as a ground item using the artifact's `lootTableId` lookup. The artifact entity type already has `respawns: false` enforced.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Random weighted drops | Custom probability system | `rollLootTable()` using Math.random() over HarvestYield | Simple enough to write once cleanly as a pure function |
| Ground item persistence | Complex serialization | Drizzle ORM with `ground_items` table | DB handles persistence, zone load queries existing pattern |
| Tick loop scheduling | cron-like scheduler | `setInterval` in `OnModuleInit` | No external dep, sufficient precision for 10s respawn cycle |
| Range calculation | Custom distance formula | `manhattanDistance()` from `game-logic/movement/pathfinding.ts` (already imported in `canInteract`) | Already exists and is correct for tile-grid games |

**Key insight:** `canInteract()` already validates zone membership, range (via `manhattanDistance`), and entity active state. It is the authoritative gate — the gateway handler must call it before any processing.

## Common Pitfalls

### Pitfall 1: Creature Loot Tables Have No HarvestYield Arrays
**What goes wrong:** `MineralDefinition` and `PlantDefinition` have `miningYield`/`harvestYield` arrays. `CreatureDefinition` does NOT — it only has `lootTableId` string. `rollLootTable()` would receive undefined input.
**Why it happens:** `CreatureDefinition` predates the `HarvestYield` pattern or was intentionally deferred.
**How to avoid:** Define creature loot as a static `Map<string, HarvestYield[]>` in game-logic, keyed by `lootTableId`. Each creature's `lootTableId` (`'loot_creature_void_crawler'` etc.) maps to its drops. `rollLootTable()` accepts the resolved array.
**Warning signs:** TypeScript error when passing `undefined` to `rollLootTable()`.

### Pitfall 2: Ground Item Spawn Race — Same Entity Killed by Two Players
**What goes wrong:** Two players kill the same creature simultaneously. Both trigger `handleToolUse()`. Both see the creature alive (health > 0 check passes), both kill it, loot spawns twice.
**Why it happens:** No atomic check-and-kill operation for health reduction.
**How to avoid:** Use the same `claimEntity()` synchronous lock already in `ZonesService` for the "apply killing blow" step. The entity health check and health reduction must be atomic (in-memory only, no DB round-trip). Since JS is single-threaded, a synchronous `entity.health -= damage; if (entity.health <= 0) { /* kill */ }` sequence is safe as long as no `await` interrupts it.
**Warning signs:** Duplicate ground items spawning for the same entity.

### Pitfall 3: Respawn Tick Overwrites Live Entity
**What goes wrong:** Zone is loaded, entity was already re-created at zone load time (because lifecycle record was deleted), but a stale lifecycle record remains in DB and tick loop re-spawns the entity again at `(0, 0)` or incorrect position.
**Why it happens:** Zone load clears lifecycle records from the suppressed set but does not delete them from DB.
**How to avoid:** Lifecycle records should be DELETED from DB after respawn (either at zone load time for entities that have passed their respawnAt, or by the tick loop). Currently `loadZone()` only reads records to build the suppressed set but does not delete them. The tick loop deletes records it processes. Zone load should also delete records where `respawnAt <= now` (they are ready to live, not dead).
**Warning signs:** Duplicate entities in a zone, or entity appears at spawn point despite already being alive.

### Pitfall 4: Ground Item IDs Collide with Entity IDs
**What goes wrong:** Ground item entity ID `'item_<uuid>'` collides with a zone entity ID `'zoneId_spawnId_x_y'`.
**Why it happens:** Different ID formats can theoretically overlap if uuid generation produces a segment matching spawn format.
**How to avoid:** Ground items use `'item_' + crypto.randomUUID()` prefix — this is already the convention from `game.service.ts` line 290 (`id: 'item_${crypto.randomUUID()}'`). Maintain this prefix strictly.
**Warning signs:** Entity map overwrites — second `.set()` silently replaces first.

### Pitfall 5: Despawn Timer Not Persisted for Player-Dropped Items
**What goes wrong:** Player drops an item (already implemented in `GameService.handleItemDrop()`). Item gets a 5-minute despawn timer in memory but is NOT written to `ground_items` DB. Server restarts → item is gone.
**Why it happens:** Phase 34 `handleItemDrop()` only calls `zonesService.spawnEntity()` (in-memory). No DB write.
**How to avoid:** Phase 35 must also retrofit `handleItemDrop()` to write to `ground_items` table. This is PERS-03/PERS-04 scope.
**Warning signs:** Player-dropped items vanish on server restart.

### Pitfall 6: FAR_FUTURE Sentinel Check in Respawn Loop
**What goes wrong:** Tick loop queries `respawnAt <= now` and processes artifact lifecycle records (FAR_FUTURE = year 2100). With a year-2100 sentinel, `respawnAt <= now` will be false for 74 years — so artifacts are safe with just the WHERE clause. No extra check needed IF the query is correct.
**Why it happens:** Developer adds defensive check using wrong year constant (e.g., checks 2099 instead of comparing to FAR_FUTURE constant).
**How to avoid:** Use `lte(entityLifecycle.respawnAt, now)` as the sole filter. The FAR_FUTURE date (2100-01-01) is always > now, so it will never be included. No additional filtering needed in application code.
**Warning signs:** Artifacts appear to respawn or the loop logs artifacts as "respawned."

### Pitfall 7: `canInteract()` Range Parameter Source
**What goes wrong:** Tool use is processed using `DEFAULT_INTERACTION_RANGE = 1` instead of the equipped tool's actual `range` property.
**Why it happens:** Caller forgets to look up the equipped tool and pass its range.
**How to avoid:** In `EntityService.handleToolUse()`, always read the player's equipped tool from inventory, look up `ItemDefinition.range`, and pass it to `canInteract()`. If no tool equipped or range is undefined, default to 1.
**Warning signs:** High-tier tools have no extended range advantage.

## Code Examples

### Drizzle Upsert Pattern (from existing code)
```typescript
// Source: apps/game-server/src/zones/zones.service.ts
await db
  .insert(entityLifecycle)
  .values({ entityId, zoneId, killedAt: now, respawnAt })
  .onConflictDoUpdate({
    target: entityLifecycle.entityId,
    set: { killedAt: now, respawnAt },
  });
```
Use the same `onConflictDoUpdate` pattern for `ground_items` if needed (re-dropping same item to same position).

### Ground Item DB Insert (new)
```typescript
// Source: apps/game-server/src/game/entity.service.ts
await db.insert(groundItems).values({
  id: groundItem.id,
  zoneId: groundItem.position.zoneId,
  itemId: groundItem.itemId,
  quantity: groundItem.quantity,
  x: groundItem.position.x,
  y: groundItem.position.y,
  despawnAt: new Date(groundItem.despawnAt),
});
```

### Ground Item DB Delete on Pickup (new)
```typescript
// Source: apps/game-server/src/game/entity.service.ts (or game.service.ts)
await db.delete(groundItems).where(eq(groundItems.id, entityId));
```

### Respawn Tick Drizzle Query (new)
```typescript
// Source: apps/game-server/src/zones/zones.service.ts
import { lte, and } from 'drizzle-orm';
const now = new Date();
const ready = await db
  .select()
  .from(entityLifecycle)
  .where(lte(entityLifecycle.respawnAt, now));
```

### Entity Spawn Point Reconstruction from entityId
```typescript
// entityId format: 'zoneId_spawnId_x_y' e.g. 'z_0_0_creature_void_crawler_5_7'
// The spawn point fields were encoded at creation: createEntityFromSpawn(spawn, zoneId)
// where spawn.spawnId, spawn.x, spawn.y, spawn.entityType come from world-gen.
// To reconstruct a spawn from entityId:
//   const parts = entityId.split('_');
//   const x = parseInt(parts[parts.length - 1]);  // last segment
//   const y = parseInt(parts[parts.length - 2]);  // second-to-last segment
// BUT: this is fragile if zoneId contains underscores ('z_0_0').
// Better: store originalSpawnId in entity_lifecycle, or reconstruct by querying
// the zone's spawnPoints and matching by position.
```

**CRITICAL:** The entityId encoding `${zoneId}_${spawn.spawnId}_${spawn.x}_${spawn.y}` makes parsing fragile due to underscore-heavy zone IDs. In the respawn tick, to reconstruct the `SpawnPoint`, re-query `generateChunk()` for the zone to get its spawn points and find the matching spawn by entityId. This avoids brittle string splitting. `generateChunk()` is deterministic (seeded), so the result is identical every time.

### canInteract() Call Pattern (existing)
```typescript
// Source: packages/game-logic/src/interaction/interaction.ts
const check = canInteract(player, entity, toolRange);
if (!check.canInteract) {
  return { success: false, error: check.reason };
}
```

### ZonesService.setServer() Post-Init Pattern (new)
```typescript
// In ZonesService:
private server: Server | null = null;
setServer(server: Server): void { this.server = server; }

// In GameGateway.afterInit():
afterInit(server: Server) {
  this.zonesService.setServer(server);
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Loot in memory only | ground_items DB table + memory | Phase 35 decision | Items survive zone eviction and server restart |
| Generic entity ID (uuid) | Structured entityId (zoneId_spawnId_x_y) | Phase 34 (34-01) | Globally unique, encodes spawn location |
| `player:interact` for all interactions | `entity:tool_use` for tool-specific | Phase 35 (INTR-04) | Separates interaction types, enables range validation |
| FAR_FUTURE via nullable | FAR_FUTURE via 2100-01-01 sentinel | Phase 34 (34-01) | Simpler queries — artifacts never need NULL checks |

**Deprecated/outdated:**
- `EntityRegistry` from `@into-the-void/shared-types` (`entity-registry.ts`): Marked `@deprecated`, replaced by `EntityRegistry` from `@into-the-void/entities`. Do not use the deprecated registry for Phase 35.
- `handleInteraction()` in `GameService` for mineral case: Currently returns `{ entityChanges: { active: false } }` without doing anything real. Phase 35 replaces this with proper tool-use logic in `EntityService`.

## Open Questions

1. **Creature loot tables: code map vs DB rows**
   - What we know: `CreatureDefinition` has `lootTableId` string but no `HarvestYield[]`. Minerals and plants have inline `HarvestYield[]` arrays.
   - What's unclear: The requirement LOOT-01 says "loot_tables + loot_table_entries" DB tables. But all plant/mineral data is already code-resident. Adding DB tables introduces a new sync problem.
   - Recommendation: Define creature loot as a static `Map<string, HarvestYield[]>` in game-logic keyed by `lootTableId`. This is consistent with the mineral/plant pattern and avoids an unnecessary DB schema. If strictly required, add `loot_tables` + `loot_table_entries` DB tables as thin wrappers, but load them at startup into a memory Map to avoid per-interaction DB queries.

2. **Broadcast from ZonesService respawn tick**
   - What we know: `ZonesService` does not have access to the Socket.IO `Server`. `GameGateway` owns it.
   - What's unclear: Best NestJS pattern without adding `@nestjs/event-emitter`.
   - Recommendation: Use `setServer(server: Server)` method on `ZonesService`, called from `GameGateway.afterInit(server)`. This is a one-line addition to `ZonesService` and zero new dependencies.

3. **Expired ground_items cleanup timing**
   - What we know: `getZoneEntities()` already filters expired items in memory. But expired rows in DB are never deleted until pickup.
   - What's unclear: How often to run cleanup.
   - Recommendation: Add DB cleanup to the respawn tick loop — same `setInterval`, query `ground_items WHERE despawnAt < now` and delete. One tick loop for both concerns.

4. **handleItemDrop() ground_items DB write — retrofit or new handler**
   - What we know: Existing `handleItemDrop()` in `GameService` does not write to `ground_items` DB (it was implemented before Phase 35 DB table existed).
   - What's unclear: Should 35-03 or 35-01 add DB writes to `handleItemDrop()`?
   - Recommendation: PERS-03/PERS-04 is in Phase 35 scope. Task 35-03 (EntityService) should also update `GameService.handleItemDrop()` to write to `ground_items` table. The `EntityService` can provide a shared `persistGroundItem(item: ItemEntity)` helper used by both paths.

## Sources

### Primary (HIGH confidence)
- Codebase: `packages/entities/src/types.ts` — `HarvestYield` interface, `lootTableId` on all definitions
- Codebase: `packages/entities/src/definitions/minerals.ts` — 10 minerals with `miningYield` arrays
- Codebase: `packages/entities/src/definitions/plants.ts` — 10 plants with `harvestYield` arrays
- Codebase: `packages/entities/src/definitions/creatures.ts` — 10 creatures with `lootTableId` only (no HarvestYield)
- Codebase: `packages/entities/src/definitions/artifacts.ts` — 5 artifacts with `respawns: false`
- Codebase: `packages/database/src/schema/entity-lifecycle.ts` — existing lifecycle table with FAR_FUTURE pattern
- Codebase: `packages/game-logic/src/interaction/interaction.ts` — existing `canInteract()` with `manhattanDistance`
- Codebase: `packages/shared-types/src/network/events.ts` — existing ClientEvents/ServerEvents maps
- Codebase: `packages/shared-types/src/core/entity.ts` — `ItemEntity` with `despawnAt`
- Codebase: `apps/game-server/src/zones/zones.service.ts` — `loadZone()`, `recordEntityKill()`, LRU pattern
- Codebase: `apps/game-server/src/game/game.service.ts` — `handleItemDrop()`, pickup/drop patterns
- Codebase: `packages/items/src/types.ts` — `ItemDefinition` (no `range` field yet)
- Codebase: `pnpm-lock.yaml` — confirms `drizzle-orm@0.30.10`, `lru-cache@10.4.3`, NO `@nestjs/schedule`

### Secondary (MEDIUM confidence)
- Prior phase decisions: build order is non-negotiable (types → lifecycle → loot+interaction+respawn)
- Prior phase decisions: `ground_items` DB table required; loot in memory only is unacceptable
- Prior phase decisions: `entity_lifecycle` PK is `entityId` (zoneId_spawnId_x_y format)

### Tertiary (LOW confidence)
- Tool range values by rarity (1/2/3/4/5 tiles): reasonable design inference, not derived from lore or prior decisions

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — codebase verified, all packages confirmed in lockfile
- Architecture: HIGH — patterns derived directly from existing codebase code
- Pitfalls: HIGH — derived from actual code analysis (creature loot gap, clock format, entityId parsing fragility all verified)
- Tool range values: LOW — design inference, no prior spec

**Research date:** 2026-02-18
**Valid until:** 2026-03-18 (stable domain, 30 days)
