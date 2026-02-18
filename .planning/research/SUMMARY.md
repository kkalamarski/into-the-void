# Project Research Summary

**Project:** Into the Void — v1.8 Entity System
**Domain:** Multiplayer 2D sci-fi survival MMO — entity definitions, spawning, creature AI, loot tables, tool interaction
**Researched:** 2026-02-18
**Confidence:** HIGH

## Executive Summary

The v1.8 Entity System milestone adds four entity categories (Creatures, Plants, Minerals, Artifacts), a creature behavior AI tick, weighted loot tables, server-side tool interaction with range validation, a respawn system, and a fertility noise layer to Into the Void's existing chunk-based world. The codebase already has substantial scaffolding: `Creature`, `Mineral`, `SpawnPoint`, and `EntityRegistry` types exist in shared-types; `canInteract()`, `canHarvest()`, and A* pathfinding exist in game-logic; `generateSpawnPoints()` with per-biome configs and `weightedPick()` exist in world-gen; `entity:spawn`, `entity:despawn`, and `entity:update` events are defined in the socket contract. The milestone is fundamentally about filling in existing gaps, not building new architecture — the critical gaps being: `createEntityFromSpawn()` does not enrich entities from the registry, no respawn tick loop exists, loot is not resolved on entity death, and creature behavior is stub-level. One new npm package (`@nestjs/schedule`) and one new workspace package (`packages/entities`) are the only additions required.

The recommended approach is to build in hard dependency order: first create `packages/entities` (mirroring `packages/items`) with approximately 35 entity definitions covering all 10 biomes, then enrich `ZonesService.createEntityFromSpawn()` to use the registry with a new `EntityLifecycle` DB table for persistence, then add loot resolution and respawn on top of that working foundation. Creature AI (the wander tick) should come last — it depends on everything else being correct and introduces the most ongoing performance risk. The `CreatureBehavior` type must be corrected from the current incorrect `passive|neutral|aggressive|defensive` to the lore-accurate `herbivore|omnivore|predator|maniac` before any entity definitions are written — this is a breaking type change that touches all downstream systems.

The primary risks are performance (a global AI tick iterating all loaded zones will stall the Node.js event loop at scale) and persistence (in-memory-only respawn timers and ground item state are lost on zone eviction or server restart). Both risks have well-understood mitigations: scope the AI tick to zones with active players only using a self-rescheduling `setTimeout` pattern, and persist entity lifecycle state and ground items to the database. Skipping either mitigation creates bugs that are expensive to recover from after launch. A secondary risk is the existing mismatch between `BIOME_SPAWN_CONFIGS` IDs in world-gen (e.g., `void_stalker`, `crystal_sentinel`) and the IDs actually present in the current `EntityRegistry` — the new `packages/entities` package must cover all IDs referenced in spawn configs.

---

## Key Findings

### Recommended Stack

The entity system requires exactly one new npm package (`@nestjs/schedule ^4.1.0`) for the AI tick and respawn sweep intervals. All other required capabilities — A* pathfinding, seeded random, noise generation, weighted pick, LRU zone cache, Socket.IO broadcast — are already installed. A new `packages/entities` workspace package modeled exactly on `packages/items` is the central new artifact. Loot tables are pure TypeScript in `game-logic/src/loot/`; no external library is warranted for a 15-line weighted pick function. The existing `heap-js` (installed) provides a priority queue for efficient respawn timer lookup once the queue grows beyond a few hundred entries.

**Core technologies:**
- `@nestjs/schedule ^4.1.0` — scheduled AI tick and respawn sweep — integrates with NestJS lifecycle via `SchedulerRegistry`; raw `setInterval` loses lifecycle management and testability
- `packages/entities` (new workspace package) — `EntityDefinition` types, `EntityRegistryImpl` singleton, per-category definition files — mirrors `packages/items` exactly; keeps game data out of wire-format contracts in shared-types
- `@into-the-void/game-logic` (extend) — `rollLootTable()`, `tickCreatureAI()` FSM, tool range validation — pure functions, importable by both server and client; extract `weightedPick` from world-gen here
- `@into-the-void/world-gen` (extend) — fertility noise as second `SimplexNoise(seed + '_fertility')` pass — zero API change, identical to existing terrain noise calls
- `@into-the-void/database` (extend) — `loot_tables`, `loot_table_entries`, `entity_lifecycle` Drizzle tables; `species.lootTableId` FK already exists

### Expected Features

**Must have (table stakes — v1.8):**
- BiomeType enum updated with `miasma_marshes` and `petrified_expanse` — blocks all entity definitions; critical path item
- `CreatureBehavior` type corrected to `herbivore | omnivore | predator | maniac` per lore world bible
- ~35 entity definitions (10 creatures, 10 plants, 10 minerals, 5 artifacts) covering all 10 biomes with loot tables, level ranges, and behavior types
- `Plant` and `Artifact` entity types added to `EntityType` with supporting interfaces and `PlantDefinition` / `ArtifactDefinition` types
- Loot table resolution on creature death and mineral depletion — weighted random drops spawned as ground item entities
- Respawn tick loop — reactivates entities after `SpawnPoint.respawnTime` elapses; permanently skips artifacts (`respawnTime === -1`)
- Creature wander and behavior AI tick — server-side position updates broadcast as `entity:update`; scoped to zones with active players only
- Fertility zone modifier — per-spawn-position density multiplier derived from noise, not chunk center
- Perception gating client-side — entity name and level rendered as `???` when `entity.level > player.perception * 3`
- Artifact one-time discovery — `respawnTime: -1` spawn points permanently skipped after pickup
- Server-side interaction range validation via `canInteract()` called before any interaction is processed

**Should have (competitive — first post-launch pass):**
- Creature aggro visual cue (exclamation sprite or red outline on client; no server change needed)
- Harvest depletion animation on minerals and plants (client-side, proportional to `yield / maxYield`)
- Codex entry on first entity discovery (discovered_entities per character, small DB addition)
- Creature level zone scaling (distance from 0,0 shifts creature level range upward by 1-3 levels)

**Defer (v2+):**
- Full A* pathfinding for creature AI — performance ceiling at scale; simplified directional wander is correct for v1
- Creature taming and domestication — separate system; lore-supported as a Verdant Dynamics faction feature
- Proximity trigger plants (spore clouds, acid pools) — requires status effect system; Miasma Marshes plants specifically
- Dynamic ecosystem simulation (prey-predator population dynamics within zones)
- Named boss entities — requires spawn announcement, boss-specific AI, and loot table design as a separate milestone

### Architecture Approach

The entity system extends the existing NestJS game-server and React/Phaser web client via targeted additions to existing services. The central new artifact is `packages/entities` — a workspace package with `EntityRegistryImpl` that replaces the flat `EntityRegistry` object currently in shared-types. The game-server acquires two new services (`AiService` for the creature tick, `EntityService` for tool use, combat, and loot resolution). The web client acquires a new `entityStore.ts` Zustand store to hold live entity state driven by socket events. All other changes are modifications to existing files.

**Major components:**
1. `packages/entities` — `EntityRegistryImpl` singleton with creature, mineral, plant, and artifact definitions; single source of truth for entity data shared between server and client; mirrors `packages/items` exactly
2. `apps/game-server/src/game/entity.service.ts` (new) — handles tool use, attack, harvest, loot resolution, and respawn queue; calls `game-logic` pure functions for validation and calculation
3. `apps/game-server/src/game/ai.service.ts` (new) — `@Interval(1000)` AI tick scoped to `activePlayerZones`; calls `tickCreatureAI()` from game-logic; broadcasts batched `entity:update` per zone per tick
4. `apps/game-server/src/zones/zones.service.ts` (modified) — `createEntityFromSpawn()` enriched with EntityRegistry data; `scheduleRespawn()` and `processRespawns()` added
5. `apps/web/src/store/entityStore.ts` (new) — Zustand store updated by `entity:spawn`, `entity:update`, `entity:despawn` socket events; no optimistic mutation
6. `apps/web/src/game/rendering/EntityRenderer.ts` (modified) — resolves per-species `textureKey` from EntityRegistry instead of generic type string; applies fallback color from definition

**Build order (hard dependency sequence):**
Types and definitions → enriched spawning + EntityLifecycle DB → loot + interaction + respawn → AI tick → fertility noise → client perception gating + polish

### Critical Pitfalls

1. **Duplicate entity spawn on zone reload** — `createEntityFromSpawn()` has no awareness of entity lifecycle state; killed creatures reappear instantly on zone re-entry. Prevention: implement `entity_lifecycle` DB table (`spawnId`, `zoneId`, `killedAt`, `respawnAt`) in the same phase as spawn enrichment. Apply lifecycle records on zone load before materializing spawn points. This table also solves respawn timer persistence across server restarts.

2. **AI tick stalling the Node.js event loop** — a global interval iterating all 500 possible LRU zones with 4-6 creatures each produces 2000-3000 entities per tick, each requiring collision validation and a broadcast. Prevention: scope AI tick to `activePlayerZones: Set<string>`, updated on player join/leave. Use self-rescheduling `setTimeout` pattern, not `setInterval`, to prevent tick pile-up. Batch all zone entity updates into one event per zone per tick.

3. **Loot items lost on zone eviction** — `ZonesService.spawnEntity()` writes only to in-memory zone state; if zone evicts before player picks up ground items, loot disappears permanently. Prevention: write ground items to a `ground_items` DB table immediately on spawn; restore on zone load; delete on pickup or `despawnAt` expiry. In-memory-only is never acceptable for core gameplay loot.

4. **Interaction range validated only client-side** — `handleInteraction()` in `game.service.ts` does not currently call `canInteract()` before processing. A modified client can interact from any distance. Prevention: `canInteract(player, entity, range)` must be the first call in every interaction handler, using the range value from the entity's definition in EntityRegistry.

5. **Biome spawn mismatch at biome transition tiles** — `generateSpawnPoints()` currently uses chunk-center biome sampling for spawn table selection; creatures spawned at biome-edge tiles are drawn from the wrong biome's spawn table. Prevention: sample biome at each candidate spawn position, not at chunk center. This is especially important for fertility noise — density should vary by tile biome, not zone biome.

---

## Implications for Roadmap

Based on the hard dependency chain identified across all four research files, the milestone should be structured into six sequential phases. Each phase produces a testable, shippable increment and avoids the most severe pitfalls by addressing them at the earliest safe moment.

### Phase 1: Foundation Types and Entity Definitions

**Rationale:** Every downstream system depends on correct entity types and the `packages/entities` registry. BiomeType and CreatureBehavior corrections must happen first because they are breaking type changes — all entity definitions reference them. No server or client logic can be written against entity definitions until the definitions exist. This phase is entirely package-level work with no server or client changes.
**Delivers:** Corrected `BiomeType` enum (10 biomes), corrected `CreatureBehavior` (`herbivore|omnivore|predator|maniac`), `packages/entities` package with `EntityRegistryImpl`, ~35 entity definitions with loot tables and level ranges, two new biome entries in `BIOME_SPAWN_CONFIGS`, `Plant` and `Artifact` interfaces in shared-types.
**Addresses:** BiomeType expansion (P1), CreatureBehavior lore accuracy (P1), entity definitions content (P1), Plant and Artifact entity types (P1).
**Avoids:** Writing entity definitions against wrong behavior type strings; downstream compile errors propagating from the type change caught immediately.

### Phase 2: Entity Lifecycle Persistence and Enriched Spawning

**Rationale:** `createEntityFromSpawn()` enrichment is the server-side integration point for Phase 1 definitions. The `entity_lifecycle` DB table must be built in the same phase — it is the foundation for both the respawn system (Phase 3) and server restart survival. Building these together avoids having to retrofit persistence onto an in-memory respawn system later, which is a high-recovery-cost fix.
**Delivers:** `createEntityFromSpawn()` producing fully typed `Creature` and `Mineral` entities from EntityRegistry; `entity_lifecycle` DB table; zone load applies lifecycle records before materializing spawn points; `EntityRenderer` resolves per-species texture key from EntityRegistry; client `entityStore.ts` wired to existing `entity:spawn`, `entity:update`, `entity:despawn` events.
**Uses:** `@into-the-void/entities` EntityRegistry, Drizzle ORM new table declarations.
**Avoids:** Duplicate entity spawn on zone reload (Critical Pitfall 1); respawn timer reset on server restart (Pitfall 6).

### Phase 3: Loot Tables, Tool Interaction, and Respawn

**Rationale:** Loot resolution, server-side range validation, and respawn are tightly coupled — they all trigger on the same events (entity death or depletion). Building them together creates one well-tested interaction path. Ground item persistence must be in this phase, not deferred; loot items in memory only is never acceptable for gameplay.
**Delivers:** `EntityService` with `handleToolUse()`, `handleAttack()`, `resolveLoot()`; `rollLootTable()` pure function in game-logic; `canInteract()` called server-side before every interaction; ground items written to `ground_items` DB table on spawn; respawn tick (`@Interval(5000)`) draining `entity_lifecycle` records; `entity:tool_use` and `entity:attack` added to `ClientEvents`; `xp:gained` added to `ServerEvents`.
**Addresses:** Loot tables (P1), loot resolution on death (P1), respawn tick loop (P1), artifact no-respawn (P1).
**Avoids:** Loot item loss on zone eviction (Critical Pitfall 3); client-side-only interaction range (Critical Pitfall 4); loot rolls on client (security); loot table item IDs not validated against ItemRegistry caught at server startup.

### Phase 4: Creature AI Wander and Behavior Tick

**Rationale:** The AI tick is the highest-risk component — a permanent server-side load that grows with player count. It must be built after spawning and interaction are proven correct so that AI movement does not obscure underlying entity state bugs. The active-zone scoping and self-rescheduling pattern must be the implementation model from day one, not a retrofit added after performance degrades.
**Delivers:** `AiService` with self-rescheduling tick scoped to `activePlayerZones`; `tickCreatureAI()` pure FSM in game-logic with `herbivore`, `omnivore`, `predator`, `maniac` behavior states; wander target selection via `getReachablePositions()` with dynamic tile occupancy check; `entity:update` position broadcasts batched per zone per tick; client Phaser interpolation to new creature positions; tick duration logging with a warning threshold.
**Uses:** `@nestjs/schedule` SchedulerRegistry, existing `findPath()` / `getReachablePositions()` from game-logic.
**Avoids:** AI tick accumulation stalling event loop (Critical Pitfall 2); creature overlapping player tile (Pitfall 8); per-entity broadcast storms.

### Phase 5: Fertility Noise and Biome Spawn Quality

**Rationale:** Fertility is an enhancement to spawning, not a prerequisite for any other system. It belongs after spawning and loot are proven correct. Per-tile biome sampling (vs chunk-center) is a correctness fix that becomes more visually obvious once entity definitions are diverse — biome-edge creatures appearing in the wrong biome tile is jarring once there are 10 distinct creature types.
**Delivers:** `getFertilityAt(worldSeed, x, y)` in world-gen using second `SimplexNoise(seed + '_fertility')` instance; fertility multiplier applied at each spawn position (not chunk center); per-tile biome sampling in `generateSpawnPoints()` replacing chunk-center sampling; spawn density variance cap per zone (15 creatures max, 10 minerals max, 5 plants max, 2 artifacts max per chunk).
**Addresses:** Fertility zone modifier (P1).
**Avoids:** Fertility noise sampled at chunk center (Pitfall 7); dominant-biome mismatch at biome-edge tiles (Chunk Streaming Pitfall 5).

### Phase 6: Perception Gating and Client Polish

**Rationale:** Perception gating is entirely client-side rendering logic — entity level is already on `Creature.level` and sent in zone state. This phase has no server dependencies beyond what earlier phases deliver. Placing it last allows the broadcast model (strict per-player filtering vs zone-room broadcast with field stripping) to be decided with full knowledge of how AI broadcasts perform in practice.
**Delivers:** Client-side `???` display when `entity.level > player.perception * 3`; internal AI state fields stripped from server broadcasts before emission; entity fade-in on spawn and respawn; harvest depletion visual on minerals proportional to `yield / maxYield`.
**Addresses:** Perception gating (P1), perception gating consistency on AI update broadcasts (Pitfall 5), creature AI state not exposed to client (security).
**Avoids:** Perception gating applied only at zone load but not on subsequent AI update broadcasts.

### Phase Ordering Rationale

- **Types before data before logic before AI** — each layer depends on the previous. Attempting to write game logic before entity definitions exist creates placeholder stubs that must be rewritten.
- **Persistence co-located with the feature it supports** — `entity_lifecycle` in Phase 2, `ground_items` in Phase 3. Retrofitting persistence after the feature is live means data loss in the interim and a high recovery cost.
- **AI tick last among server features** — all other entity interactions are player-triggered and bounded by player count; the AI tick is unbounded and grows with loaded zones.
- **Lore compliance as a blocker, not a nice-to-have** — `CreatureBehavior` type correction in Phase 1 is a breaking change that touches all entity definitions. Deferring it creates compounding refactor debt.
- **Client polish last** — perception gating and animations have no server dependencies and are safe to defer without blocking any other feature.

### Research Flags

Phases needing careful design decisions during planning:
- **Phase 2 (`entity_lifecycle` table):** Decide whether a single table can serve both the respawn check (skip spawn if `respawnAt > now`) and the ground item persistence, or whether those need separate tables. Query patterns differ enough that separate tables may be cleaner. Index on `(zoneId, spawnId)` is required for performance.
- **Phase 4 (AI tick):** Define the tick budget explicitly before implementation — max entities per tick, max milliseconds before a warning is logged. Define the `entities:batch_update` event payload shape and update `ServerEvents` in shared-types before writing client code, to avoid a breaking event shape change mid-implementation.
- **Phase 5 (fertility noise):** Confirm static (baked at world-gen time, deterministic per seed) vs dynamic (player activity affects it at runtime) fertility model before implementation. Static is far simpler and correct for v1.8. Document this decision explicitly; it is irreversible without a data migration.
- **Phase 6 (perception gating model):** Decide strict per-player filtering (`visibleEntities: Set<string>` per player, more CPU-intensive but accurate) vs relaxed zone-room broadcast with field stripping (simpler, leaks position data to players outside perception range). This decision affects Phase 4 broadcast implementation — if strict filtering is required, it should be designed in Phase 4, not retrofitted in Phase 6.

Phases with well-documented patterns (can skip additional research):
- **Phase 1 (types + definitions):** Purely data work following established `packages/items` patterns. `ItemRegistryImpl` is the direct blueprint.
- **Phase 3 (loot tables):** `weightedPick` already exists and is proven. Loot table schema is a standard relational model. `handleItemPickup` and the claim pattern are direct templates for `handleToolUse`.
- **Phase 6 (client polish):** Rendering conditionals are straightforward. Field stripping before broadcast is a one-line filter. `inventoryStore.ts` is the direct template for `entityStore.ts`.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All existing packages verified by direct file audit. One new package (`@nestjs/schedule`) version-verified against NestJS v10 peer constraints. All integration points traced to specific source files. |
| Features | HIGH | Direct codebase inspection confirmed which interfaces exist and what is missing. Lore world bible sourced directly for behavior class names and biome list. Competitor patterns (Tibia, Minecraft, ARK) used for table-stakes validation. |
| Architecture | HIGH | All component boundaries, integration points, and build order derived from direct file reads. No external architecture sources required. `packages/items` provides a proven pattern to mirror. Existing `createEntityFromSpawn()` gap confirmed with specific line numbers. |
| Pitfalls | HIGH | All critical pitfalls sourced from direct codebase gaps verified in source files (missing `canInteract()` call in `handleInteraction()`, in-memory-only entity state, chunk-center biome sampling). Performance thresholds for AI tick (50+ zones) are MEDIUM confidence — derived from Minecraft entity lag research, not measured against this NestJS/Socket.IO stack. |

**Overall confidence:** HIGH

### Gaps to Address

- **`entity_lifecycle` and `ground_items` table design:** Research identifies the need for both tables but not the final schemas. During Phase 2 planning, decide whether to merge them or keep separate. Separate tables are recommended: `entity_lifecycle` for spawn point state, `ground_items` for dropped items with `despawnAt`.
- **AI tick batch event format:** Research recommends batching entity updates per zone per tick but does not specify the event payload shape. During Phase 4 planning, define `entities:batch_update` payload and update `ServerEvents` before any client code is written.
- **Perception gating model (strict vs relaxed):** Two models identified; decision deferred. Must be made before Phase 4 AI tick broadcast implementation, not after, because strict filtering changes the broadcast architecture.
- **Plant interaction model:** FEATURES.md specifies passive harvest for v1.8 and proximity triggers for v2+. Confirm whether plants use the same `entity:tool_use` flow as minerals or a simpler `player:interact` proximity approach before `EntityService` is built in Phase 3.
- **AI tick performance baseline:** The 50-zone threshold is from Minecraft community research. Instrument tick duration logging in Phase 4 and establish a documented entity cap before AI is enabled in production.

---

## Sources

### Primary (HIGH confidence — direct codebase inspection)
- `packages/shared-types/src/core/entity.ts` — `Creature`, `Mineral`, `SpawnPoint`, `CreatureBehavior`, `EntityType` interface shapes confirmed
- `packages/shared-types/src/game/entity-registry.ts` — existing flat `EntityRegistry` object with `CreatureConfig`, `MineralConfig` (4 creatures, 4 minerals — incomplete)
- `packages/shared-types/src/network/events.ts` — `ClientEvents`, `ServerEvents` event maps; `entity:spawn`, `entity:despawn`, `entity:update` confirmed
- `packages/world-gen/src/generation/spawn.ts` — `BIOME_SPAWN_CONFIGS` with all 8 biomes, `weightedPick()`, `generateSpawnPoints()`; ID mismatch with EntityRegistry confirmed
- `packages/world-gen/src/generation/chunk.ts` — chunk-center biome sampling in `getChunkBiome()` confirmed as the spawning gap
- `packages/world-gen/src/noise/simplex.ts` — `SimplexNoise` class with `noise2D()` and `fbm()` confirmed; second instance pattern verified
- `packages/world-gen/src/random/seeded-random.ts` — `SeededRandom` with `nextInt`, `nextFloat`, `pick`, `derive` confirmed
- `packages/game-logic/src/movement/pathfinding.ts` — `findPath()`, `hasLineOfSight()`, `getReachablePositions()` confirmed
- `packages/game-logic/src/interaction/interaction.ts` — `canInteract()`, `canHarvest()`, `canAttack()` confirmed; NOT called in `handleInteraction()` confirmed
- `packages/game-logic/src/visibility/range.ts` — `getVisibleEntities()`, `getVisibilityChanges()`, `MAX_VISIBLE_ENTITIES = 20` confirmed
- `packages/items/src/registry.ts` — `ItemRegistryImpl` singleton confirmed as blueprint for `EntityRegistryImpl`
- `apps/game-server/src/zones/zones.service.ts` — `createEntityFromSpawn()` gap (missing health, speciesId, behavior fields) confirmed at lines 60-80
- `apps/game-server/src/game/game.service.ts` — `handleInteraction()` missing `canInteract()` call confirmed; claim pattern confirmed
- `apps/game-server/src/game/game.gateway.ts` — zone-room broadcast pattern; `player:interact` handler shape confirmed
- `apps/web/src/game/rendering/EntityRenderer.ts` — generic type-string texture key confirmed (to be replaced with per-species lookup)
- `apps/web/src/game/scenes/WorldScene.ts` — `spawnEntity()`, `despawnEntity()`, `updateEntity()` confirmed
- `lore/world-bible.md` — Creature Behavioral Classifications (Herbivore/Omnivore/Predator/Maniac), 10 biomes, survival tier table confirmed

### Secondary (MEDIUM confidence — official docs and npm)
- NestJS Task Scheduling docs — `@Interval()`, `SchedulerRegistry.addInterval()` API
- `@nestjs/schedule` GitHub releases — version 6.1.1 latest; ^4.1.0 compatible with NestJS v10
- Tibia creature behavior documentation — chase/wander/runaway/dead states; leash radius pattern
- Gabriel Gambetta client-server game architecture — reconciliation and server-authority patterns

### Tertiary (LOW confidence — community research)
- Minecraft entity lag thresholds — entity count vs event loop performance; not validated against NestJS/Socket.IO
- Redis sorted set for respawn queue — upgrade path only; not used in v1.8

---

*Research completed: 2026-02-18*
*Ready for roadmap: yes*
