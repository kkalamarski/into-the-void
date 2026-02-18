# Stack Research: Entity System

**Domain:** Multiplayer 2D sci-fi survival MMO — entity definitions (Creatures, Plants, Minerals, Artifacts), fertility noise layer, loot tables, creature AI (idle wander FSM), entity respawn system, tool interaction with range
**Researched:** 2026-02-18
**Confidence:** HIGH

## Executive Summary

The entity system milestone requires **one new package** (`@nestjs/schedule`) and **zero frontend packages**. Every other capability — noise generation for fertility layer, weighted random selection for loot tables, A* pathfinding for creature AI movement, entity management in memory — is already in the installed stack or can be implemented as pure TypeScript functions in existing packages.

The game-logic package already has A* pathfinding (`findPath`, `hasLineOfSight`), seeded random (`SeededRandom.pick` / weighted selection helpers), and the interaction validation scaffold (`canInteract`, `canHarvest`). The world-gen package has a `SimplexNoise` class, `SeededRandom`, and the `generateSpawnPoints` function with a working `weightedPick` helper. The database already has a `species` table with `lootTableId` FK stub and a `discoveredSpecies` junction table. The shared-types package already defines `Creature`, `Mineral`, `ItemEntity`, `CreatureBehavior`, `Entity` base interfaces, and `ServerEvents` for `entity:spawn` / `entity:despawn` / `entity:update`.

What is genuinely new:
1. **`@nestjs/schedule` v4+** — for the AI tick loop (`@Interval(1000)`) and respawn sweep (`@Interval(5000)`). Native `setInterval` would work, but `@nestjs/schedule` integrates cleanly with the NestJS lifecycle (start on `OnModuleInit`, stop on `OnModuleDestroy`) and provides `SchedulerRegistry` for testability.
2. **Entity definition packages** — A new `packages/entities` package modeled on the existing `packages/items` pattern: `EntityDefinition` types, `EntityRegistry` singleton, per-category definition files (creatures, minerals, plants, artifacts). The `items` package is the exact blueprint — same structure, same registry pattern.
3. **Loot table system** — Pure TypeScript in `packages/game-logic/src/loot/`. No library needed. The `weightedPick` function already exists in `world-gen/src/generation/spawn.ts` — extract, generalize, and move it to `game-logic` as `rollLootTable(table, rng)`.
4. **Creature AI FSM** — Pure TypeScript state machine in `packages/game-logic/src/ai/`. States: `idle`, `wander`, `alert`, `flee`. Transitions driven by the AI tick. Uses existing `SeededRandom` for wander target selection and existing `findPath` for movement.
5. **Fertility noise layer** — New named seed layer (`${worldSeed}_fertility`) passed through `SimplexNoise.fbm()` — same pattern as the existing biome and terrain noise layers. No new library.

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| TypeScript | ^5.4.0 (installed) | Entity definition types, FSM state types, loot table types | All new capabilities are type definitions and pure functions. The `CreatureBehavior` union type already exists in shared-types. Extension follows existing discriminated union patterns. |
| `@nestjs/schedule` | ^4.1.0 (install) | `@Interval()` for AI tick loop and respawn sweep in game-server | The game-server is NestJS. An AI tick that fires every 1s and a respawn sweep every 5s are the primary new runtime behaviors. `@nestjs/schedule` v4 integrates with NestJS lifecycle via `SchedulerModule.forRoot()`. The alternative (raw `setInterval` in `OnModuleInit`) works but loses lifecycle integration and testability. Latest released version is 6.1.1 as of 2026-02. Pinning to ^4.1.0 matches the existing NestJS v10 peer constraint. |
| `@into-the-void/game-logic` | workspace (extend) | `rollLootTable()`, `CreatureAI` FSM, `canInteractWithTool()` range validation | The pattern is established: pure functions, no DB calls, importable by server and client. The loot table roller, AI state transitions, and tool range validation all belong here. The existing `canInteract()` and `canHarvest()` functions are the extension points. |
| `@into-the-void/world-gen` | workspace (extend) | Fertility noise layer as a second `SimplexNoise` pass | `SimplexNoise` and `SeededRandom` already exist. A fertility layer is `new SimplexNoise(worldSeed + '_fertility')` with `fbm(x, y, 3)` — identical to the existing terrain noise calls. No API change to the noise classes. |
| `@into-the-void/database` | workspace (extend) | `loot_tables` and `loot_table_entries` tables, optional plants/artifacts schema | `species` table already has `lootTableId varchar(50)`. The loot table schema is two new tables (`loot_tables`, `loot_table_entries`) following the relational pattern of `species` + `species_stats`. For plants and artifacts (static world entities that do not need per-instance rows), JSONB definitions in the entity registry are sufficient — no new DB tables needed. |
| Drizzle ORM | ^0.30.0 (installed) | Schema for loot_tables + loot_table_entries | No version upgrade needed. Two new `pgTable` declarations following existing patterns. |
| Socket.IO | ^4.7.0 (installed) | Broadcast `entity:spawn`, `entity:despawn`, `entity:update` on AI movement and respawn | All three event types already defined in `ServerEvents` interface. No new events needed. AI movement is delivered as `entity:update` with new position. Respawn is `entity:spawn`. Death is `entity:despawn`. |
| Zustand | ^4.5.0 (installed) | Client-side entity state for AI-moving creatures | The `gameStore` already tracks `entities` from `ZoneState`. AI movement updates arrive as `entity:update` events and merge into the entity map. No new store slice needed. |
| Phaser 3 | ^3.80.0 (installed) | Creature sprite interpolation toward new AI-updated position | Existing Phaser entity rendering already handles `entity:update` events. Smooth movement between tiles requires interpolation logic in the scene, not a new library. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `lru-cache` | ^11.2.6 (installed) | Zone entity cache — already used in `ZonesService` | No change needed. The existing `LRUCache<string, ZoneState>` already holds entities per zone. AI-mutated entity state lives in this cache. |
| `ioredis` | ^5.4.0 (installed) | Respawn queue as Redis sorted set (optional optimization) | Use if respawn load becomes significant (>1000 respawning entities across all active zones). For the initial milestone, an in-memory `Map<timestamp, SpawnPoint[]>` in `ZonesService` is sufficient. Redis sorted sets are the upgrade path if the game scales to many active zones. |
| `heap-js` | ^2.7.1 (installed) | Priority queue for respawn timer ordering | Already installed. Use a `MinHeap<RespawnEntry>` keyed on `respawnAt` timestamp to efficiently find which entities are due for respawn in the 5s sweep. More efficient than iterating all pending respawns. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| NX | Monorepo task runner for the new `packages/entities` package | Follow the existing `packages/items/project.json` pattern. `nx run entities:build` and `nx run entities:test`. |
| Drizzle Studio | Schema inspection for new loot_tables and loot_table_entries | `nx run database:studio` — no change to workflow. |

---

## Installation

```bash
# One new package only
pnpm add @nestjs/schedule --filter @into-the-void/game-server

# Corresponding types (if not bundled)
pnpm add -D @types/cron --filter @into-the-void/game-server
```

The new `packages/entities` package is a workspace package — no npm install needed, just create the directory structure following the `packages/items` blueprint.

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| `@nestjs/schedule @Interval()` | Raw `setInterval` in `OnModuleInit` | Use raw `setInterval` if NestJS lifecycle integration is not needed (e.g., standalone Node process). In the existing NestJS game-server, `@nestjs/schedule` is the idiomatic choice. |
| In-memory `MinHeap` for respawn queue | Redis sorted set for respawn queue | Use Redis sorted set if the server runs multiple instances (horizontal scaling). For a single-process game-server, in-memory heap is simpler and faster. Redis becomes necessary if respawn state must survive process restarts. |
| Pure TypeScript FSM in `game-logic` | A behavior tree library (e.g., `behaviortree.js`) | Use a behavior tree library if AI complexity grows to 10+ behaviors with complex preconditions. For idle wander (2 states, 3 transitions), a plain TypeScript discriminated union state machine is 30 lines and has zero dependencies. |
| `weightedPick` as a pure function in `game-logic` | External loot table library (e.g., `LootTable.js`) | External libraries add 10KB+ for what is genuinely a 15-line function. The algorithm is `sum weights → random roll → linear scan` — no external library is justified. |
| New `packages/entities` workspace package | Embed entity definitions in `packages/shared-types` | `shared-types` is for wire-format contracts. Entity definitions (full stat blocks, loot table IDs, texture keys) are game data, not wire contracts. Separate package keeps the contract layer thin. Mirrors the `packages/items` architecture exactly. |
| Fertility noise as a second `SimplexNoise(seed + '_fertility')` layer | Separate noise library (e.g., `simplex-noise` npm) | The existing `SimplexNoise` class in `world-gen` is the established abstraction. A second npm noise library creates a divergence between noise implementations. The project owns the noise implementation — extend it, don't fork it. |

---

## What NOT to Add

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `behaviortree.js` or similar AI library | Idle wander FSM is 2 active states with simple random walk logic. A full behavior tree library adds 40KB+ bundle and API complexity for what is a switch statement over `CreatureBehavior`. | Plain TypeScript FSM: `type AIState = 'idle' \| 'wander' \| 'alert' \| 'flee'` with a `tickAI(state, context) → AIState` pure function |
| `pathfinding.js` or A* library | `findPath(x1, y1, x2, y2, collisionMap)` already exists in `packages/game-logic/src/movement/pathfinding.ts`. It handles diagonals, elevation costs, and corner-cutting prevention. It is exactly what wander movement needs. | Existing `findPath` — already used for movement validation; extend for creature wander |
| `LootTable.js` or loot library | The `weightedPick` function already exists in `world-gen/src/generation/spawn.ts` and handles the full weighted random selection algorithm. Moving it to `game-logic` and generalizing it covers all loot use cases. | Extract `weightedPick` from world-gen into `game-logic/src/loot/weighted-pick.ts` |
| A separate `EntityManager` service for each entity type | Over-engineering. The existing `ZonesService` already manages entities in an `LRUCache<string, ZoneState>` with `Map<string, Entity>`. Adding a separate `CreatureManager`, `MineralManager`, `PlantManager` service layer for the same data structure is redundant. | Extend `ZonesService` with entity-type-specific methods or add a single `EntityService` that delegates to `ZonesService` for state |
| Colyseus or other game-server framework | The NestJS WebSocket server is established and working with Socket.IO. A framework migration for one new feature is a full rewrite risk. | Extend the existing `game.gateway.ts` + `game.service.ts` pattern |
| A database row per live entity instance | Creatures and minerals are runtime state, not persistent state. They respawn from `SpawnPoint` definitions in world-gen. Storing live entity positions in PostgreSQL creates O(entities * zones) write load on every AI tick. | Keep live entity state in the in-memory `ZonesService` LRU cache. Only persist player-created structures and loot table configuration (static game data). |

---

## Stack Patterns by Variant

**If AI tick load becomes a bottleneck (>500 creatures moving simultaneously):**
- Batch AI ticks by zone rather than individual entity ticks
- Only tick creatures in zones with active players (skip unpopulated zones entirely)
- Wander step probability: roll once per creature per tick (e.g., 20% chance to move) — reduces path calculations by 80%

**If respawn queue grows large (>1000 pending respawns):**
- Migrate from in-memory `MinHeap` to Redis sorted set (`ZADD respawns <timestamp> <entityKey>`)
- `ZRANGEBYSCORE respawns 0 <now>` efficiently retrieves all due respawns
- `ioredis` is already installed — zero new infrastructure required

**If loot tables need designer-editable data:**
- Promote `loot_tables` from code-defined to database-seeded (DB migration + seed script)
- Admin API endpoint (NestJS REST) for loot table CRUD
- For MVP: define loot tables as TypeScript constants in `packages/entities` — the same pattern as item definitions in `packages/items/src/definitions/`

---

## New Package: `packages/entities`

Model this exactly after `packages/items`. It is the single source of truth for entity definitions that the game-server and world-gen spawn system reference.

```
packages/entities/
  src/
    types.ts          — EntityDefinition, CreatureDefinition, MineralDefinition, PlantDefinition, ArtifactDefinition
    registry.ts       — EntityRegistry singleton (same Map<id, Definition> pattern as ItemRegistry)
    index.ts          — public exports
    definitions/
      creatures.ts    — void_crawler, crystal_sentinel, toxic_lurker, frost_elemental, etc.
      minerals.ts     — void_stone, crystal_shard, volcanic_ore, ancient_fragment, etc.
      plants.ts       — flora definitions (fertility-seeded spawn)
      artifacts.ts    — ancient/alien artifact definitions (rare, high-tier biomes)
  project.json        — NX project config (build, test targets)
  package.json        — { name: "@into-the-void/entities" }
  tsconfig.json       — extends tsconfig.base.json
```

The `EntityRegistry` exposes:
- `EntityRegistry.get(id)` → `EntityDefinition | undefined`
- `EntityRegistry.getByType(type)` → `EntityDefinition[]`
- `EntityRegistry.getByBiome(biome)` → `EntityDefinition[]`

The existing `EntityRegistry` object in `packages/shared-types/src/game/entity-registry.ts` is a flat object — migrate it to a proper class-based registry matching `ItemRegistryImpl` in `packages/items/src/registry.ts`.

---

## AI Tick Architecture

The AI tick runs in the game-server as a NestJS scheduled interval:

```typescript
// apps/game-server/src/game/ai.service.ts
@Injectable()
export class AiService implements OnModuleInit, OnModuleDestroy {
  constructor(
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly zonesService: ZonesService,
    private readonly gameGateway: GameGateway,  // for broadcasting entity:update
  ) {}

  onModuleInit() {
    // Only tick zones with active players
    const interval = setInterval(() => this.tickActiveZones(), 1000);
    this.schedulerRegistry.addInterval('ai-tick', interval);
  }

  onModuleDestroy() {
    this.schedulerRegistry.deleteInterval('ai-tick');
  }

  private async tickActiveZones() {
    // Get zones with players → tick creature AI for each
    // Broadcast entity:update for creatures that moved
  }
}
```

The FSM logic (`tickAI(creature, context) → { newState, newPosition? }`) lives in `packages/game-logic/src/ai/` as a pure function, following the same pattern as `validateMovement`, `calculateDamage`, etc.

---

## Loot Table Schema

Two new tables in `packages/database/src/schema/`:

```typescript
// loot_tables table — grouping of loot entries
export const lootTables = pgTable('loot_tables', {
  id: varchar('id', { length: 50 }).primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
});

// loot_table_entries table — weighted item entries
export const lootTableEntries = pgTable('loot_table_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  tableId: varchar('table_id', { length: 50 }).notNull().references(() => lootTables.id),
  itemId: varchar('item_id', { length: 100 }).notNull(),  // references ItemRegistry
  weight: integer('weight').notNull().default(10),
  minQuantity: integer('min_quantity').notNull().default(1),
  maxQuantity: integer('max_quantity').notNull().default(1),
  condition: varchar('condition', { length: 50 }),  // 'always', 'rare', 'lucky' — future
});
```

The `species` table's existing `lootTableId varchar(50)` FK already points to `loot_tables.id`. No species schema change needed.

---

## Version Compatibility

| Package | Version | Compatibility Notes |
|---------|---------|---------------------|
| `@nestjs/schedule` | ^4.1.0 | Peer dependency requires `@nestjs/common ^10.0.0` (installed at ^10.3.0). Compatible. Latest available is 6.1.1 — either works; pin to 4.x to stay conservative with existing NestJS v10 peer range. |
| `heap-js` | ^2.7.1 (installed) | `MinHeap<T>` with custom comparator. Already used in the project. No version change needed. |
| Drizzle ORM | ^0.30.0 (installed) | Two new `pgTable` declarations — standard patterns. No version upgrade needed. |
| TypeScript | ^5.4.0 (installed) | Discriminated union FSM states, `const` enum for behavior types — all within ^5.4 capabilities. |

---

## Sources

### HIGH Confidence (Verified in Codebase)

- `packages/game-logic/src/movement/pathfinding.ts` — `findPath()`, `hasLineOfSight()`, `getReachablePositions()` confirmed. A* with diagonal support, corner-cutting prevention, elevation cost. Directly usable for creature wander movement.
- `packages/game-logic/src/interaction/interaction.ts` — `canInteract()`, `canHarvest()`, `getEntitiesInRange()` confirmed. Range validation already exists using `manhattanDistance`. Tool range can extend `canHarvest` with a range parameter.
- `packages/world-gen/src/generation/spawn.ts` — `weightedPick()` confirmed. Weighted random selection algorithm present. Extract to `game-logic/src/loot/`.
- `packages/world-gen/src/noise/simplex.ts` — `SimplexNoise` class with `noise2D()` and `fbm()` confirmed. Fertility layer = second `SimplexNoise` instance with a different seed. Zero API changes.
- `packages/world-gen/src/random/seeded-random.ts` — `SeededRandom` with `nextInt`, `nextFloat`, `pick`, `derive` confirmed. Creature wander target selection uses this for deterministic behavior.
- `packages/shared-types/src/core/entity.ts` — `Creature`, `Mineral`, `ItemEntity`, `Structure`, `CreatureBehavior` ('passive'|'neutral'|'aggressive'|'defensive') all confirmed. AI FSM can extend `CreatureBehavior` or use a separate `AIState` type.
- `packages/shared-types/src/network/events.ts` — `entity:spawn`, `entity:despawn`, `entity:update` in `ServerEvents` confirmed. No new socket events needed for AI movement or respawn.
- `packages/shared-types/src/game/entity-registry.ts` — Flat `EntityRegistry` object confirmed. Exists but is a plain object, not a class-based registry. Migration to `EntityRegistryImpl` class (matching `ItemRegistryImpl`) is the correct evolution.
- `packages/database/src/schema/species.ts` — `lootTableId varchar(50)` column confirmed on `species` table. New `loot_tables` and `loot_table_entries` tables complete the FK chain.
- `packages/database/src/schema/discoveries.ts` — `discovered_species` junction table confirmed (`characterId`, `speciesId`, `killCount`). The entity system milestone populates this table on first creature kill.
- `apps/game-server/src/zones/zones.service.ts` — `LRUCache<string, ZoneState>` with `Map<string, Entity>` confirmed. AI-updated entity positions update values in this map. `spawnEntity` / `despawnEntity` methods exist for respawn use.
- `package.json` — `heap-js ^2.7.1`, `ioredis ^5.4.0`, `lru-cache ^11.2.6` all confirmed installed. No new dependencies needed beyond `@nestjs/schedule`.
- `packages/items/src/registry.ts` — `ItemRegistryImpl` class pattern confirmed as the blueprint for `packages/entities/src/registry.ts`.

### MEDIUM Confidence (Official Docs / npm Verified)

- `@nestjs/schedule` latest version is 6.1.1 (verified via GitHub releases). Peer dependency is `@nestjs/common ^10`. Compatible with installed `^10.3.0`. `SchedulerRegistry.addInterval()` API confirmed via official NestJS docs. (Source: [nestjs/schedule GitHub releases](https://github.com/nestjs/schedule/releases))
- `SchedulerRegistry.addInterval(name, interval)` confirmed as the idiomatic NestJS pattern for runtime interval management. Integrates with `OnModuleInit` / `OnModuleDestroy` lifecycle hooks. (Source: [NestJS Task Scheduling docs](https://docs.nestjs.com/techniques/task-scheduling))

### LOW Confidence (Pattern Reference Only)

- Redis sorted set for respawn queue: The pattern (`ZADD + ZRANGEBYSCORE`) is well-documented for delayed task queues. Not verified against the specific ioredis version installed. Noted as an upgrade path, not a requirement for the initial milestone.

---

## Integration Points

### New Package

| Package | Created From | What It Adds |
|---------|--------------|--------------|
| `packages/entities` | Blueprint: `packages/items` | `EntityDefinition` types, `EntityRegistry` singleton, creature/mineral/plant/artifact definition files |

### New Files in Existing Packages

| File | Package | What It Adds |
|------|---------|--------------|
| `src/loot/weighted-pick.ts` | `game-logic` | Extracted + generalized from `world-gen/src/generation/spawn.ts` |
| `src/loot/loot-table.ts` | `game-logic` | `rollLootTable(table, rng): LootDrop[]` pure function |
| `src/ai/creature-ai.ts` | `game-logic` | `tickCreatureAI(creature, context): AIResult` pure FSM function |
| `src/ai/wander.ts` | `game-logic` | `getWanderTarget(pos, collisionMap, rng): Position \| null` — uses `getReachablePositions` |
| `src/generation/fertility.ts` | `world-gen` | `getFertilityAt(worldSeed, x, y): number` — second noise layer |
| `src/schema/loot-tables.ts` | `database` | `lootTables` and `lootTableEntries` Drizzle table definitions |

### New Files in Game Server

| File | What It Adds |
|------|--------------|
| `apps/game-server/src/game/ai.service.ts` | `@Interval(1000)` AI tick, broadcasts `entity:update` |
| `apps/game-server/src/game/respawn.service.ts` | `@Interval(5000)` respawn sweep, broadcasts `entity:spawn` |

### Modified Files

| File | Change |
|------|--------|
| `apps/game-server/src/game/game.module.ts` | Register `AiService`, `RespawnService`; import `ScheduleModule.forRoot()` |
| `apps/game-server/src/zones/zones.service.ts` | Add respawn queue (`MinHeap<RespawnEntry>`); add `queueRespawn()`, `drainDueRespawns()` methods |
| `packages/shared-types/src/game/entity-registry.ts` | Migrate flat object to `EntityRegistryImpl` class pattern |
| `packages/game-logic/src/interaction/interaction.ts` | Extend `canHarvest()` with tool range parameter; add tool-specific range constants |

---

*Stack research for: Entity System — Into the Void*
*Researched: 2026-02-18*
*Confidence: HIGH — All existing packages verified by direct file audit. One new package (@nestjs/schedule) identified and version-verified. All integration points traced to specific source files.*
