# Architecture Research — Entity System

**Domain:** Entity definitions, spawning, and interactions in existing multiplayer 2D sci-fi survival MMO
**Researched:** 2026-02-18
**Confidence:** HIGH (entire codebase read directly; no external sources needed)

---

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│  packages/shared-types                                               │
│  ┌───────────────────────┐   ┌───────────────────────────────────┐  │
│  │  core/entity.ts        │   │  game/entity-registry.ts          │  │
│  │  Entity (base)         │   │  CreatureConfig, MineralConfig     │  │
│  │  Creature, Mineral,    │   │  (flat object map - CURRENT)       │  │
│  │  Structure, ItemEntity │   │  EntityRegistry (EXISTING)         │  │
│  └───────────────────────┘   └───────────────────────────────────┘  │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │  network/events.ts                                               │  │
│  │  ClientEvents: player:interact, entity:tool_use (NEW)            │  │
│  │  ServerEvents: entity:spawn, entity:despawn, entity:update        │  │
│  └─────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                              shared by
┌─────────────────────────────────────────────────────────────────────┐
│  packages/items  (existing pattern to mirror)                        │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │  src/types.ts          — ItemDefinition interface                │  │
│  │  src/registry.ts       — ItemRegistryImpl singleton              │  │
│  │  src/definitions/      — consumables.ts, suits.ts, tools.ts ...  │  │
│  └─────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                              mirrored by
┌─────────────────────────────────────────────────────────────────────┐
│  packages/entities  (NEW PACKAGE — mirrors items package structure)   │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │  src/types.ts           — EntityDefinition, CreatureDefinition,  │  │
│  │                           StaticEntityDefinition interfaces       │  │
│  │  src/registry.ts        — EntityRegistryImpl singleton           │  │
│  │  src/definitions/       — creatures/*.ts, minerals/*.ts          │  │
│  │  src/index.ts           — re-exports                             │  │
│  └─────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                    used by
┌──────────────────────────────────────────────────────────────────────┐
│  packages/world-gen                                                   │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  src/generation/spawn.ts (MODIFIED)                               │  │
│  │  — BIOME_SPAWN_CONFIGS drives which entity IDs appear per biome   │  │
│  │  — spawnId values must match EntityRegistry keys                  │  │
│  │  — EntityRegistry.get(spawnId) for validation at generation time  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  src/generation/chunk.ts (UNCHANGED interface)                    │  │
│  │  — generateSpawnPoints() still returns SpawnPoint[]               │  │
│  │  — ChunkData.spawnPoints shape unchanged                          │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
                    consumed by
┌──────────────────────────────────────────────────────────────────────┐
│  apps/game-server                                                     │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │  zones/zones.service.ts (MODIFIED)                              │   │
│  │  — createEntityFromSpawn() enriched via EntityRegistry.get()    │   │
│  │  — Creature entities get health, maxHealth, behavior, level     │   │
│  │  — Mineral entities get yield, maxYield, requiredTier           │   │
│  │  — Respawn scheduling per SpawnPoint.respawnTime                │   │
│  └────────────────────────────────────────────────────────────────┘   │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │  game/entity.service.ts (NEW)                                   │   │
│  │  — Tool interaction logic (harvest minerals)                    │   │
│  │  — Combat initiation logic (attack creatures)                   │   │
│  │  — Loot table resolution on creature death                      │   │
│  │  — Respawn queue management                                     │   │
│  └────────────────────────────────────────────────────────────────┘   │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │  game/game.gateway.ts (MODIFIED)                                │   │
│  │  — entity:tool_use handler -> EntityService.handleToolUse()     │   │
│  │  — entity:attack handler -> EntityService.handleAttack()        │   │
│  │  — Broadcasts entity:update, entity:despawn to zone room        │   │
│  └────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────┘
                    broadcasts to
┌──────────────────────────────────────────────────────────────────────┐
│  apps/web                                                             │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │  game/rendering/EntityRenderer.ts (MODIFIED)                    │   │
│  │  — Reads speciesId/resourceId -> EntityRegistry for textureKey  │   │
│  │  — Health bar always rendered for creature (not just damaged)    │   │
│  │  — Tool interaction cursor on hover                              │   │
│  └────────────────────────────────────────────────────────────────┘   │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │  store/entityStore.ts (NEW)                                     │   │
│  │  — Zustand store holding entity state per zone                  │   │
│  │  — Updated by entity:spawn, entity:update, entity:despawn       │   │
│  └────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Status |
|-----------|---------------|--------|
| `packages/entities/src/types.ts` | `EntityDefinition`, `CreatureDefinition`, `StaticEntityDefinition` interfaces | NEW |
| `packages/entities/src/registry.ts` | `EntityRegistryImpl` singleton — `get(id)`, `getAllCreatures()`, `getAllMinerals()` | NEW |
| `packages/entities/src/definitions/creatures/` | Per-species files: void_crawler.ts, crystal_sentinel.ts etc. | NEW |
| `packages/entities/src/definitions/minerals/` | Per-resource files: void_crystal.ts, dark_ore.ts etc. | NEW |
| `packages/shared-types/src/game/entity-registry.ts` | Existing flat object registry — REPLACED by packages/entities (keep file for backward compat, re-export from new package) | MODIFIED |
| `packages/world-gen/src/generation/spawn.ts` | BIOME_SPAWN_CONFIGS already has creature/mineral IDs — validate against EntityRegistry at load | MODIFIED (validation only) |
| `apps/game-server/src/zones/zones.service.ts` | `createEntityFromSpawn()` enriched with EntityRegistry data; respawn scheduling | MODIFIED |
| `apps/game-server/src/game/entity.service.ts` | Tool use, attack, harvest, loot resolution, respawn queue | NEW |
| `apps/game-server/src/game/game.gateway.ts` | `entity:tool_use` and `entity:attack` handlers; zone-broadcast of results | MODIFIED |
| `apps/web/src/store/entityStore.ts` | Zustand store for live entity state; updated by socket events | NEW |
| `apps/web/src/game/rendering/EntityRenderer.ts` | Uses EntityRegistry textureKey per speciesId/resourceId | MODIFIED |

---

## Existing Architecture — Ground Truth

### What Already Exists (Do Not Duplicate)

| Asset | File | Relevance to Entity System |
|-------|------|---------------------------|
| `EntityType` union | `shared-types/src/core/entity.ts` | Covers `creature`, `mineral`, `structure`, `item`, `npc` — no changes needed |
| `Creature` interface | `shared-types/src/core/entity.ts` | Has `speciesId`, `health`, `maxHealth`, `level`, `behavior` — fully typed already |
| `Mineral` interface | `shared-types/src/core/entity.ts` | Has `resourceId`, `yield`, `maxYield`, `requiredTier` — fully typed already |
| `SpawnPoint` | `shared-types/src/core/zone.ts` | Has `entityType: 'creature' \| 'mineral'`, `spawnId`, `respawnTime` — no changes needed |
| `BIOME_SPAWN_CONFIGS` | `world-gen/src/generation/spawn.ts` | IDs like `void_crawler`, `crystal_shard` exist but point at nothing in EntityRegistry yet |
| `EntityRegistry` (shared-types) | `shared-types/src/game/entity-registry.ts` | Flat object with `CreatureConfig`, `MineralConfig` — 4 creatures, 4 minerals total — incomplete but structurally correct |
| `entity:spawn`, `entity:despawn`, `entity:update` events | `shared-types/src/network/events.ts` | Already defined in `ServerEvents` — no new server event types needed for basic entity flow |
| `player:interact` handler | `game-server/src/game/game.gateway.ts` | Exists but only handles `mineral` (deactivate), `item` (pickup route), `creature` (set inCombat). Tool-specific logic missing. |
| `spawnEntity()`, `despawnEntity()` | `game-server/src/zones/zones.service.ts` | Already implemented. `createEntityFromSpawn()` creates bare-minimum Entity with no health/yield data. |
| `createEntityFromSpawn()` gap | `zones.service.ts` line 60-80 | Creates `{ id, type, name, position, active }` only. Missing `health`, `maxHealth`, `speciesId`, `behavior`, `yield`, `requiredTier`. |
| `EntityRenderer.createEntityContainer()` | `apps/web/src/game/rendering/EntityRenderer.ts` | Creates container with sprite, nameplate, health bar for creatures. Uses generic `'creature'`/`'mineral'` texture key regardless of species. |
| `WorldScene.spawnEntity()` | `apps/web/src/game/scenes/WorldScene.ts` | Calls `entityRenderer.createEntityContainer(entity, elevation)` — works for any `Entity` shape |

### Critical Gap: createEntityFromSpawn Does Not Use EntityRegistry

The most important gap in the current system. `ZonesService.createEntityFromSpawn()` creates skeleton entities without enrichment:

```typescript
// CURRENT (zones.service.ts line 60-80):
return {
  id,
  type: 'creature',
  name: spawn.spawnId,       // just the raw id string
  position: { x: spawn.x, y: spawn.y, zoneId },
  active: true,
  // MISSING: health, maxHealth, speciesId, behavior, level
};
```

The `Creature` interface in `shared-types/src/core/entity.ts` requires `speciesId`, `health`, `maxHealth`, `level`, `behavior` — but none of these are populated. Fixing this is the primary server-side integration point.

### Mismatch: spawn.ts IDs vs entity-registry.ts IDs

`BIOME_SPAWN_CONFIGS` in `spawn.ts` uses IDs like `void_crawler`, `void_stalker`, `crystal_sentinel` — but the `EntityRegistry` in `shared-types/src/game/entity-registry.ts` only has `void_crawler`, `crystal_hound`, `acid_stalker`, `ancient_guardian`. Several IDs referenced in spawn configs do not exist in the registry. The new `packages/entities` package must cover all IDs used in spawn configs.

---

## Recommended Project Structure

### New Package: packages/entities

```
packages/entities/
  package.json
  project.json
  tsconfig.json
  tsconfig.lib.json
  src/
    types.ts                    # EntityDefinition, CreatureDefinition, StaticEntityDefinition
    registry.ts                 # EntityRegistryImpl singleton
    index.ts                    # re-exports
    definitions/
      creatures/
        index.ts                # registerAll() call for all creatures
        void_crawler.ts
        void_stalker.ts
        crystal_sentinel.ts
        crystal_shard.ts        # NOTE: crystal_shard is also a mineral ID - use distinct prefixes
        toxic_lurker.ts
        acid_spitter.ts
        ancient_guardian.ts
        ruin_crawler.ts
        frost_elemental.ts
        ice_wraith.ts
        magma_beast.ts
        ember_sprite.ts
        spore_carrier.ts
        fungal_giant.ts
        void_horror.ts
        star_fragment.ts
      minerals/
        index.ts                # registerAll() call for all minerals
        void_crystal.ts
        dark_ore.ts
        prismatic_crystal.ts
        resonant_gem.ts
        toxic_sludge.ts
        corrosive_compound.ts
        ancient_alloy.ts
        relic_fragment.ts
        frozen_core.ts
        permafrost_crystal.ts
        volcanic_glass.ts
        molten_core.ts
        bioluminescent_spore.ts
        mycelium_cluster.ts
        starsteel_ore.ts
        cosmic_fragment.ts
```

### New Server File: apps/game-server/src/game/entity.service.ts

```
apps/game-server/src/game/
  entity.service.ts             # Tool interaction, attack, harvest, loot, respawn queue
```

### New Client File: apps/web/src/store/entityStore.ts

```
apps/web/src/store/
  entityStore.ts                # Zustand store for live entity state
```

### Modified Files (Summary)

```
packages/
  shared-types/src/game/entity-registry.ts   # Either delete (move to entities pkg) or re-export
  world-gen/src/generation/spawn.ts           # Import EntityRegistry for ID validation (optional but safe)

apps/
  game-server/src/zones/zones.service.ts      # createEntityFromSpawn() enrichment
  game-server/src/game/game.module.ts         # Register EntityService
  game-server/src/game/game.gateway.ts        # entity:tool_use, entity:attack handlers
  web/src/game/rendering/EntityRenderer.ts    # Per-species texture lookup
  web/src/game/scenes/WorldScene.ts           # Wire entityStore updates from socket events
```

---

## Architectural Patterns

### Pattern 1: Entity Definitions Mirror Items Package

**What:** `packages/entities` follows the exact same structure as `packages/items` — a `types.ts` with interfaces, a `registry.ts` with a singleton class, and `definitions/` subdirectories with files per species/resource. The registry is imported by game-server and web client.

**When to use:** Any time entity data needs to be looked up by ID (spawn creation, rendering, interaction validation).

**Trade-offs:** One more package to maintain, but the separation makes entity data shareable between server and client without duplicating logic. The items package already proves this pattern scales.

**Example:**
```typescript
// packages/entities/src/types.ts
export interface CreatureDefinition {
  readonly id: string;
  readonly displayName: string;
  readonly baseHealth: number;
  readonly levelRange: [number, number];
  readonly behavior: CreatureBehavior;
  readonly textureKey: string;
  readonly color: number;          // fallback hex color
  readonly xpReward: number;
  readonly lootTable: LootEntry[];
}

export interface StaticEntityDefinition {
  readonly id: string;
  readonly displayName: string;
  readonly baseYield: number;
  readonly maxYield: number;
  readonly requiredToolType: ToolType;
  readonly requiredTier: number;
  readonly harvestTimeMs: number;
  readonly textureKey: string;
  readonly color: number;
  readonly drops: LootEntry[];
}

export interface LootEntry {
  readonly itemId: string;
  readonly minQty: number;
  readonly maxQty: number;
  readonly chance: number;  // 0.0 - 1.0
}
```

### Pattern 2: ZonesService Creates Full Typed Entities via EntityRegistry

**What:** `createEntityFromSpawn()` in `ZonesService` imports `EntityRegistry` from `@into-the-void/entities` and enriches the skeleton entity with all required fields before adding it to the zone map. The entity stored in `ZoneState.entities` is a fully typed `Creature` or `Mineral`, not just an `Entity`.

**When to use:** Every time a chunk is loaded and spawn points are materialized into live entities.

**Trade-offs:** ZonesService becomes dependent on the entities package (acceptable — game-server already depends on world-gen, items, game-logic).

**Example:**
```typescript
// apps/game-server/src/zones/zones.service.ts
import { EntityRegistry } from '@into-the-void/entities';
import { SeededRandom } from '@into-the-void/world-gen';

private createEntityFromSpawn(spawn: SpawnPoint, zoneId: string): Entity {
  const id = `${zoneId}_${spawn.spawnId}_${spawn.x}_${spawn.y}`;

  if (spawn.entityType === 'creature') {
    const def = EntityRegistry.getCreature(spawn.spawnId);
    if (!def) throw new Error(`Unknown creature: ${spawn.spawnId}`);

    const rng = new SeededRandom(`${id}_level`);
    const level = rng.nextInt(def.levelRange[0], def.levelRange[1]);
    const health = Math.round(def.baseHealth * (1 + level * 0.1));

    return {
      id,
      type: 'creature',
      speciesId: def.id,
      name: def.displayName,
      position: { x: spawn.x, y: spawn.y, zoneId },
      active: true,
      health,
      maxHealth: health,
      level,
      behavior: def.behavior,
    } satisfies Creature;
  }

  const def = EntityRegistry.getMineral(spawn.spawnId);
  if (!def) throw new Error(`Unknown mineral: ${spawn.spawnId}`);

  return {
    id,
    type: 'mineral',
    resourceId: def.id,
    name: def.displayName,
    position: { x: spawn.x, y: spawn.y, zoneId },
    active: true,
    yield: def.baseYield,
    maxYield: def.maxYield,
    requiredTier: def.requiredTier,
  } satisfies Mineral;
}
```

### Pattern 3: Tool Interaction via Discriminated entity:tool_use Event

**What:** Client sends `entity:tool_use` with `{ targetId, toolType }`. Server validates tool type matches entity's `requiredToolType`, applies yield deduction, emits `entity:update` zone-wide (for updated yield bar), or `entity:despawn` if depleted. Loot is resolved server-side and emitted privately as `inventory:update`.

**When to use:** Player right-clicks or presses interact key on a mineral entity with a mining tool equipped.

**Trade-offs:** New client event type needed in `ClientEvents`. Keeps all interaction logic server-authoritative — client never mutates entity state.

**Example:**
```typescript
// apps/game-server/src/game/game.gateway.ts
@SubscribeMessage('entity:tool_use')
async handleToolUse(
  @ConnectedSocket() client: Socket,
  @MessageBody() data: { targetId: string; toolType: ToolType }
) {
  const result = await this.entityService.handleToolUse(client.id, data);
  if (result.success && result.zoneId) {
    // Zone-wide: updated yield (or despawn if depleted)
    if (result.depleted) {
      this.server.to(result.zoneId).emit('entity:despawn', { entityId: data.targetId });
    } else {
      this.server.to(result.zoneId).emit('entity:update', {
        entityId: data.targetId,
        changes: { yield: result.remainingYield },
      });
    }
    // Private: loot goes to interacting player only
    if (result.inventory) {
      client.emit('inventory:update', result.inventory);
    }
  }
}
```

### Pattern 4: Respawn Queue in ZonesService

**What:** When an entity is despawned, `ZonesService` stores a `{ spawnPoint, despawnedAt }` entry in a per-zone respawn queue. A periodic tick (setInterval at server startup) checks the queue, compares `Date.now() - despawnedAt` against `spawnPoint.respawnTime * 1000`, and re-creates the entity if the timer has elapsed.

**When to use:** Any entity with a `respawnTime > 0` in its spawn point.

**Trade-offs:** Simple in-memory queue — lost on server restart. For the current single-server architecture this is acceptable. If persistence is added later, the respawn queue can be persisted to Redis or a DB table.

**Example:**
```typescript
// apps/game-server/src/zones/zones.service.ts
interface PendingRespawn {
  zoneId: string;
  spawn: SpawnPoint;
  despawnedAt: number;
}

private respawnQueue: PendingRespawn[] = [];

scheduleRespawn(zoneId: string, spawn: SpawnPoint): void {
  this.respawnQueue.push({ zoneId, spawn, despawnedAt: Date.now() });
}

// Called by a NestJS @Interval(5000) in EntityService or ZonesService
processRespawns(emitFn: (zoneId: string, entity: Entity) => void): void {
  const now = Date.now();
  const remaining: PendingRespawn[] = [];
  for (const pending of this.respawnQueue) {
    const elapsed = (now - pending.despawnedAt) / 1000;
    if (elapsed >= pending.spawn.respawnTime) {
      const zone = this.zones.get(pending.zoneId);
      if (zone) {
        const entity = this.createEntityFromSpawn(pending.spawn, pending.zoneId);
        zone.entities.set(entity.id, entity);
        emitFn(pending.zoneId, entity);
      }
    } else {
      remaining.push(pending);
    }
  }
  this.respawnQueue = remaining;
}
```

---

## Data Flow

### Spawn Flow (Chunk Load → Live Entities)

```
Player enters zone or zone:request received
    |
ZonesService.getChunk(zoneId)
    | (cache miss)
ZonesService.loadZone(zoneId)
    |
generateChunk(seed, x, y)           [world-gen]
    | → ChunkData.spawnPoints[]
    |
createEntityFromSpawn(spawn, zoneId) [zones.service.ts — MODIFIED]
    | EntityRegistry.getCreature(spawn.spawnId)
    | → full Creature with health, maxHealth, behavior, level
    |
ZoneState.entities.set(entity.id, entity)
    |
GameGateway sends zone:chunk with entities[]
    |
Client WorldScene.spawnEntity() → EntityRenderer.createEntityContainer()
    | speciesId → EntityRegistry.getCreature() → textureKey
    | → per-species sprite or fallback color
```

### Tool Interaction Flow

```
Player presses interact key on mineral entity
    |
Client: socket.emit('entity:tool_use', { targetId, toolType: 'mining' })
    |
GameGateway.handleToolUse()
    |
EntityService.handleToolUse(socketId, { targetId, toolType })
    | validate: player adjacent to entity (canInteract from game-logic)
    | validate: toolType matches mineral.requiredToolType (game-logic)
    | validate: player tool tier >= mineral.requiredTier (game-logic)
    | ZonesService.getEntity(zoneId, targetId) → Mineral
    | mineral.yield -= harvestAmount
    |
    ├─ mineral.yield > 0
    │     ZonesService.updateEntity(zoneId, targetId, { yield: remaining })
    │     server.to(zoneId).emit('entity:update', { entityId, changes: { yield } })
    │     client.emit('inventory:update', newLoot)
    │
    └─ mineral.yield <= 0
          ZonesService.despawnEntity(zoneId, targetId)
          ZonesService.scheduleRespawn(zoneId, spawnPoint)
          server.to(zoneId).emit('entity:despawn', { entityId })
          client.emit('inventory:update', newLoot)
```

### Creature Interaction Flow

```
Player presses attack on creature entity
    |
Client: socket.emit('entity:attack', { targetId })
    |
GameGateway.handleAttack()
    |
EntityService.handleAttack(socketId, { targetId })
    | validate: canAttack (from game-logic/src/interaction)
    | calculateCombat (from game-logic/src/combat/damage)
    | ZonesService.updateEntity(zoneId, targetId, { health: newHealth })
    | PlayerService.setInCombat(playerId, true)
    |
    ├─ creature.health > 0
    │     server.to(zoneId).emit('entity:update', { entityId, changes: { health } })
    │
    └─ creature.health <= 0
          calculateXpReward (game-logic)
          resolveLoot (EntityService - rolls against CreatureDefinition.lootTable)
          ZonesService.despawnEntity(zoneId, targetId)
          ZonesService.scheduleRespawn(zoneId, spawnPoint)
          server.to(zoneId).emit('entity:despawn', { entityId })
          client.emit('inventory:update', loot)
          client.emit('xp:gained', { amount, newTotal })
```

### State Management (Client)

```
entityStore (Zustand)
    |
    ├─ entity:spawn    → entityStore.addEntity(entity)
    ├─ entity:update   → entityStore.updateEntity(entityId, changes)
    └─ entity:despawn  → entityStore.removeEntity(entityId)

WorldScene
    ├─ zone:chunk received → for each entity: WorldScene.spawnEntity(entity)
    └─ entity socket events → delegated to WorldScene methods (existing pattern)

EntityRenderer
    └─ createEntityContainer(entity)
         → speciesId/resourceId → EntityRegistry → textureKey
         → sprite or fallback color rectangle
```

---

## Build Order

Dependencies must flow from shared-types → packages → game-server → web. This is non-negotiable per project context.

1. **`packages/entities/src/types.ts`** — `EntityDefinition`, `CreatureDefinition`, `StaticEntityDefinition`, `LootEntry`. Nothing else compiles without this.

2. **`packages/entities/src/registry.ts`** — `EntityRegistryImpl` singleton with `getCreature()`, `getMineral()`, `getAllCreatureIds()`, `getAllMineralIds()`.

3. **`packages/entities/src/definitions/creatures/`** — One file per creature species. Cover all IDs used in `BIOME_SPAWN_CONFIGS` in `world-gen/src/generation/spawn.ts`.

4. **`packages/entities/src/definitions/minerals/`** — One file per mineral resource. Cover all IDs used in `BIOME_SPAWN_CONFIGS`.

5. **`packages/entities/src/index.ts`** — Re-exports; also calls `registerAll()` for both creatures and minerals.

6. **`packages/shared-types/src/network/events.ts`** — Add `entity:tool_use: { targetId: string; toolType: ToolType }` and `entity:attack: { targetId: string }` to `ClientEvents`. Add `xp:gained: { amount: number; newTotal: number }` to `ServerEvents` if XP reward events are needed.

7. **`packages/world-gen/src/generation/spawn.ts`** — Import `EntityRegistry` from `@into-the-void/entities`; add validation assertion in `generateSpawnPoints()` that every `spawnId` exists in the registry (throws at dev time, never in production since same seed).

8. **`apps/game-server/src/zones/zones.service.ts`** — Enrich `createEntityFromSpawn()` with EntityRegistry data. Add `scheduleRespawn()` and `processRespawns()`.

9. **`apps/game-server/src/game/entity.service.ts`** — `handleToolUse()`, `handleAttack()`, `resolveLoot()`, `processRespawns()` tick via `@Interval`. Depends on ZonesService, PlayerService, InventoryService, game-logic.

10. **`apps/game-server/src/game/game.module.ts`** — Register `EntityService` as a provider.

11. **`apps/game-server/src/game/game.gateway.ts`** — Add `entity:tool_use` and `entity:attack` handlers. Inject `EntityService`.

12. **`apps/web/src/store/entityStore.ts`** — Zustand store; wire `entity:spawn`, `entity:update`, `entity:despawn` socket events.

13. **`apps/web/src/game/rendering/EntityRenderer.ts`** — Import `EntityRegistry` from `@into-the-void/entities`; resolve `textureKey` by `speciesId` or `resourceId` instead of generic type string.

14. **`apps/web/src/game/scenes/WorldScene.ts`** — Ensure `entity:tool_use` and `entity:attack` are emitted on appropriate input events (right-click on entity, interact key).

---

## Integration Points — New vs. Modified

| File | Status | Change Description |
|------|--------|--------------------|
| `packages/entities/src/types.ts` | NEW | `EntityDefinition`, `CreatureDefinition`, `StaticEntityDefinition`, `LootEntry` |
| `packages/entities/src/registry.ts` | NEW | `EntityRegistryImpl` singleton; `getCreature()`, `getMineral()` |
| `packages/entities/src/definitions/creatures/*.ts` | NEW | ~16 creature definition files (one per species in BIOME_SPAWN_CONFIGS) |
| `packages/entities/src/definitions/minerals/*.ts` | NEW | ~16 mineral definition files (one per resource in BIOME_SPAWN_CONFIGS) |
| `packages/entities/src/index.ts` | NEW | Re-exports, calls `registerAll()` |
| `packages/entities/package.json` | NEW | Package manifest with `@into-the-void/entities` name |
| `packages/shared-types/src/network/events.ts` | MODIFIED | Add `entity:tool_use`, `entity:attack` to `ClientEvents`; `xp:gained` to `ServerEvents` |
| `packages/shared-types/src/game/entity-registry.ts` | MODIFIED | Either re-export from `@into-the-void/entities` or mark deprecated — avoid duplication |
| `packages/world-gen/src/generation/spawn.ts` | MODIFIED | Import EntityRegistry; add dev-time validation of spawnId references |
| `apps/game-server/src/zones/zones.service.ts` | MODIFIED | `createEntityFromSpawn()` enrichment; `scheduleRespawn()`; `processRespawns()` |
| `apps/game-server/src/game/entity.service.ts` | NEW | `handleToolUse()`, `handleAttack()`, `resolveLoot()`, `@Interval` respawn tick |
| `apps/game-server/src/game/game.module.ts` | MODIFIED | Register `EntityService` |
| `apps/game-server/src/game/game.gateway.ts` | MODIFIED | `entity:tool_use` and `entity:attack` handlers; inject `EntityService` |
| `apps/web/src/store/entityStore.ts` | NEW | Zustand store; wires entity socket events |
| `apps/web/src/game/rendering/EntityRenderer.ts` | MODIFIED | Per-species texture/color lookup via EntityRegistry |
| `apps/web/src/game/scenes/WorldScene.ts` | MODIFIED | Emit `entity:tool_use`/`entity:attack` on interaction; wire entityStore |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| `EntityService` <-> `ZonesService` | Direct method call (NestJS injection) | `getEntity()`, `updateEntity()`, `despawnEntity()`, `scheduleRespawn()` |
| `EntityService` <-> `InventoryService` | Direct method call | `addItem()` for loot; same pattern as pickup flow |
| `EntityService` <-> `game-logic/src/interaction` | Import and call `canInteract()`, `canHarvest()`, `canAttack()` | Pure functions, no side effects |
| `EntityService` <-> `game-logic/src/combat` | Import and call `calculateCombat()`, `calculateXpReward()` | Pure functions |
| `EntityService` <-> `packages/entities` | Import `EntityRegistry` | Reads `CreatureDefinition.lootTable`, `StaticEntityDefinition.requiredToolType` |
| `ZonesService` <-> `packages/entities` | Import `EntityRegistry` | Reads definition data at spawn creation time |
| `world-gen/spawn.ts` <-> `packages/entities` | Import `EntityRegistry` | Validation only — spawn.ts remains pure generation code |
| `entityStore` <-> `gameSocket` | `gameSocket.on(event, ...)` | Same pattern as `inventoryStore.ts` |
| `EntityRenderer` <-> `packages/entities` | Import `EntityRegistry` | Texture key lookup per speciesId/resourceId |

---

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-500 concurrent | In-memory respawn queue in `ZonesService`. LRU cache (max 500 zones, 5 min TTL) already implemented. No changes needed. |
| 500-2k concurrent | Respawn queue can grow large — move to a sorted priority queue (min-heap by `nextRespawnAt`) instead of linear scan every 5 seconds. |
| 2k+ concurrent | Multiple game-server instances require shared entity state. Move `ZoneState` to Redis with pub/sub for entity events. Respawn queue becomes Redis sorted set. Outside current scope. |

### Scaling Priorities

1. **First bottleneck:** Respawn queue linear scan. At 500 zones × 10 entities per zone = 5000 pending respawns scanned every 5 seconds. Fix: priority queue (O(log n) vs O(n)).
2. **Second bottleneck:** `entity:update` broadcast storms during combat (every hit broadcasts zone-wide). Fix: batch updates per tick (e.g., every 100ms) rather than per event.

---

## Anti-Patterns

### Anti-Pattern 1: Placing Entity Definitions in shared-types

**What people do:** Add `CreatureDefinition` and `StaticEntityDefinition` to `packages/shared-types/src/game/entity-registry.ts` (extending what's already there).

**Why it's wrong:** `shared-types` is for TypeScript contracts (interfaces, event maps), not data. The existing `EntityRegistry` object in `entity-registry.ts` is already a data-in-types violation — it mixes config data with type definitions. Extending it makes the package larger and ties data changes to type recompilation.

**Do this instead:** Create `packages/entities` as a dedicated data package (mirrors `packages/items`). `shared-types` keeps the `Creature`, `Mineral`, `Entity` interfaces only. `packages/entities` owns the data.

### Anti-Pattern 2: Client-Side Entity State Mutation

**What people do:** When player mines a mineral, immediately reduce `yield` in `entityStore` before server confirms. Applies optimistic updates to entity state.

**Why it's wrong:** Unlike movement (which has client-side prediction intentionally), entity interaction is low-frequency and latency-tolerant (player has to be adjacent). Optimistic entity mutation creates desyncs when multiple players interact with the same entity simultaneously. The server already handles claim locking (see `claimEntity()` pattern for items).

**Do this instead:** Send `entity:tool_use`. Wait for server `entity:update` or `entity:despawn`. Apply to `entityStore` only on server confirmation. No optimistic updates for entity state.

### Anti-Pattern 3: Embedding Loot Resolution in ZonesService

**What people do:** Put `resolveLoot()` inside `ZonesService.despawnEntity()` since despawn is already there.

**Why it's wrong:** `ZonesService` is responsible for zone/chunk lifecycle (load, cache, entity map). Loot resolution is a gameplay rule. Mixing them violates the existing service boundary pattern (GameService holds gameplay rules, ZonesService holds zone state).

**Do this instead:** `EntityService.handleToolUse()` calls `ZonesService.despawnEntity()` and `resolveLoot()` separately. `ZonesService` only manages the entity map.

### Anti-Pattern 4: One Monolithic Entity Definition File

**What people do:** Put all 16+ creature definitions and 16+ mineral definitions in a single `definitions.ts` file.

**Why it's wrong:** The biome spawn system already shows that each biome has 2 creature types and 2 mineral types across 8 biomes = 16 creature IDs and 16 mineral IDs minimum. A single file becomes a maintenance burden and produces large diffs. The `packages/items/src/definitions/` directory demonstrates the correct pattern — one file per category/species group.

**Do this instead:** One file per creature species in `definitions/creatures/`. One file per mineral in `definitions/minerals/`. Index file calls `registerAll()`.

### Anti-Pattern 5: Adding Entity AI Loops on First Milestone

**What people do:** Implement creature movement AI (roaming, aggro range detection) alongside entity definitions.

**Why it's wrong:** Entity AI requires a server-side game tick that moves creatures independently of player actions. This tick must broadcast `entity:update` position events. That is a separate and large feature. Entity definitions + spawning + player-initiated interactions are enough for the first milestone and can ship independently.

**Do this instead:** First milestone: entities spawn, render, and respond to player interaction (tool use, attack). Creatures are stationary (or trivially random walk). AI loops are a subsequent milestone.

---

## Sources

- Codebase (direct read, 2026-02-18): `packages/shared-types/src/core/entity.ts` — `Creature`, `Mineral`, `Structure`, `ItemEntity` interface shapes
- Codebase (direct read, 2026-02-18): `packages/shared-types/src/game/entity-registry.ts` — existing `EntityRegistry` flat object, `CreatureConfig`, `MineralConfig`
- Codebase (direct read, 2026-02-18): `packages/shared-types/src/network/events.ts` — existing `ClientEvents`, `ServerEvents` event maps
- Codebase (direct read, 2026-02-18): `packages/world-gen/src/generation/spawn.ts` — `BIOME_SPAWN_CONFIGS` with all 8 biomes, creature/mineral IDs
- Codebase (direct read, 2026-02-18): `packages/world-gen/src/generation/chunk.ts` — `WorldGenerator.generateChunk()` pipeline, `ChunkData` return shape
- Codebase (direct read, 2026-02-18): `packages/items/src/types.ts` — `ItemDefinition` interface (pattern to mirror for entities)
- Codebase (direct read, 2026-02-18): `packages/items/src/registry.ts` — `ItemRegistryImpl` singleton (pattern to mirror for EntityRegistry)
- Codebase (direct read, 2026-02-18): `apps/game-server/src/zones/zones.service.ts` — `createEntityFromSpawn()` gap, `claimEntity()` pattern, LRU cache config
- Codebase (direct read, 2026-02-18): `apps/game-server/src/game/game.gateway.ts` — existing `player:interact` handler, `entity:spawn`/`entity:despawn`/`entity:update` broadcast pattern
- Codebase (direct read, 2026-02-18): `apps/game-server/src/game/game.service.ts` — `handleInteraction()`, `handleItemPickup()` — interaction result pattern
- Codebase (direct read, 2026-02-18): `packages/game-logic/src/interaction/interaction.ts` — `canInteract()`, `canHarvest()`, `canAttack()` pure functions
- Codebase (direct read, 2026-02-18): `packages/game-logic/src/combat/damage.ts` — `calculateCombat()`, `calculateXpReward()`
- Codebase (direct read, 2026-02-18): `apps/web/src/game/rendering/EntityRenderer.ts` — `createEntityContainer()`, generic texture key pattern
- Codebase (direct read, 2026-02-18): `apps/web/src/game/scenes/WorldScene.ts` — `spawnEntity()`, `despawnEntity()`, `updateEntity()`, `entityZoneMap` tracking
- Confidence: HIGH — all claims verified against actual source files; no external sources required

---

*Architecture research for: Entity system — Into the Void MMO*
*Researched: 2026-02-18*
