# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-18)

**Core value:** Real-time multiplayer gameplay with responsive movement and visual feedback
**Current focus:** v1.8 Entity System — Phase 36: Creature AI Wander and Behavior Tick

## Current Position

Phase: 36 of 38 (Creature AI Wander and Behavior Tick)
Plan: 4 of 4 in current phase
Status: In progress
Last activity: 2026-02-18 — Phase 36 Plan 03 complete (AiService integration + entity:batch broadcast)

Progress: [█████░░░░░] 50% (v1.8 milestone — 3/6 phases complete)

## Performance Metrics

**Velocity:**
- Total plans completed: 102 (Phases 1-34 complete)
- Average duration: ~3m per plan
- Total execution time: ~4.5 hours

**By Milestone:**

| Milestone | Phases | Plans | Timeline |
|-----------|--------|-------|----------|
| v1.0 | 1-3 | 7 | 2 days |
| v1.1 | 4-7 | 20 | 3 days |
| v1.2 | 8-12 | 8 | 1 day |
| v1.3 | 13-16 | 13 | 1 day |
| v1.4 | 17-20 | 13 | 2 days |
| v1.5 | 21-24 | 9 | 1 day |
| v1.6 | 25-29 | 16 | 2 days |
| v1.7 | 30-32 | 9 | 1 day |
| v1.8 | 33-35 | 11 | (in progress) |

**Recent Trend:** Stable, averaging 2-4 plans per phase
| Phase 36 P01 | 5 | 2 tasks | 2 files |
| Phase 36 P03 | 3 | 3 tasks | 4 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [v1.8 research]: Build order is non-negotiable: types → enriched spawning + lifecycle DB → loot + interaction + respawn → AI tick → fertility → client polish
- [v1.8 research]: `CreatureBehavior` type correction (`herbivore|omnivore|predator|maniac`) is a breaking change — must happen in Phase 33 before any entity definitions are written
- [v1.8 research]: `entity_lifecycle` DB table must be built in Phase 34 alongside `createEntityFromSpawn()` enrichment — retrofitting persistence later is high recovery cost
- [v1.8 research]: AI tick scoped to `activePlayerZones` only with self-rescheduling setTimeout — setInterval is explicitly rejected; global tick stalls event loop
- [v1.8 research]: `ground_items` DB table in Phase 35 — loot in memory only is never acceptable; items must survive zone eviction
- [v1.8 research]: Fertility model is static (baked at world-gen time, deterministic per seed) — dynamic fertility deferred; decision is irreversible without data migration
- [v1.8 research]: Perception gating model: relaxed zone-room broadcast with field stripping (simpler) rather than strict per-player filtering — finalize before Phase 36 AI broadcast implementation
- [33-01]: CreatureBehavior renamed from passive|neutral|aggressive|defensive to herbivore|omnivore|predator|maniac — lore mandate applied as first change in Phase 33
- [33-01]: miasma_marshes and petrified_expanse added as Tier II biomes — uses existing tile visuals (fungal/void/toxic) without new sprites
- [33-01]: Plant and Artifact EntityType variants added with full interfaces — foundation for entity lifecycle system in Phase 34+
- [33-01]: Legacy EntityRegistry in shared-types marked @deprecated — to be replaced by @into-the-void/entities package
- [33-02]: packages/entities mirrors packages/items exactly — same package.json shape, project.json executor, tsconfig.lib.json, and registry singleton pattern
- [33-02]: ArtifactDefinition.respawns typed as literal false (not boolean) — type-level enforcement of one-time discovery rule
- [33-02]: src/definitions/ directory created empty — definitions population deferred to Plan 33-03
- [33-03]: BIOME_SPAWN_CONFIGS reduced to one primary entry per biome — old hardcoded IDs (void_stalker, etc.) had no registry entries; only ENTITY_IDS-backed entries kept to satisfy must-have truth "references only IDs present in registry"
- [33-03]: CREATURE_VOID_HORROR spans ancient_ruins + starfall_crater — single maniac-class creature covers both Tier IV biomes per lore
- [33-03]: Auto-registration on module import — EntityRegistry.registerAll(ALL_ENTITIES) in index.ts side-effect runs at load time
- [34-01]: entity_lifecycle uses entityId (zoneId_spawnId_x_y format) as PK — globally unique, eliminates composite key
- [34-01]: FAR_FUTURE (2100-01-01) used as artifact respawnAt sentinel rather than nullable column — simpler queries
- [34-01]: Deterministic level from hash(worldSeed + entityId) — no RNG state needed, reproducible per seed
- [34-01]: Plant and Artifact branches in createEntityFromSpawn() are forward-compatibility stubs — world-gen not yet producing those entityTypes
- [34-02]: GameSocket.on() upgraded to array-based multi-handler dispatch — both gameStore (Phaser) and entityStore (React/pathfinding) can independently handle entity events without silent handler replacement
- [34-02]: enableMapSet() from immer called at module top in entityStore.ts — required for immer v11 Map mutation support in draft producers
- [34-04]: Entity check in isWorldTileBlocked uses local tile coords — same space as terrain collision, no remapping needed
- [34-04]: Terrain checked first in isWorldTileBlocked, entity scan only if passable — short-circuit avoids O(n) scan for walls
- [34-04]: Server entity blocking placed between validateMovement and isZoneTransition in movePlayer — logically correct layering
- [34-03]: createHealthBar() reused for mineral/plant yield bars — parameter semantics (current/max) are identical; no new visual component needed
- [34-03]: getEntityTexture() now accepts Entity not EntityType — enables species-specific texture lookup; missing textures handled gracefully by Phaser until Phase 38 adds sprites
- [35-01]: Seed script accepts Map parameter instead of importing CREATURE_LOOT_TABLES directly — avoids circular dependency: database -> game-logic -> database
- [35-01]: CREATURE_LOOT_TABLES is runtime source of truth (in-memory); DB tables (loot_tables, loot_table_entries) exist for admin tooling and future dynamic config
- [35-01]: rollLootTable is a pure function — each HarvestYield entry evaluated independently, multiple items can drop per roll
- [35-02]: range placed after effects in ItemDefinition — tool-only optional property, undefined for non-tools
- [35-02]: Rarity-to-range mapping: common=1, rare=2, epic=3, exotic=4, legendary=5 — linear scale, consistent across all three tool types (mining, combat, research)
- [Phase 35-04]: Error handling wraps entire processRespawnTick() body — tick loop never crashes the server on DB errors
- [Phase 35-04]: ZonesService injected into GameGateway for setServer() wiring — server reference flows gateway -> zones, avoids circular injection
- [35-03]: ToolUseResult.entityChanges typed as Record<string,unknown> — Partial<Entity> excludes subtype fields (health, yield) needed for gateway broadcast
- [35-03]: EntityService injected directly into GameService (no forwardRef) — no circular dependency exists between them
- [35-03]: UNKNOWN_ENTITY fallback given respawnSeconds: 60 — satisfies new required property on CreatureDefinition without semantic impact
- [Phase 36]: AiService uses self-rescheduling setTimeout (not setInterval) — prevents event loop stalls when tick exceeds interval
- [Phase 36]: AI_TICK_INTERVAL_MS=1000 for creature speed; AI_TICK_WARN_MS=200 performance monitoring threshold
- [Phase 36-02]: tickCreatureAI is pure function — callers apply result; no mutations inside FSM
- [Phase 36-02]: Flee fallback chain: diagonal -> cardinal-x -> cardinal-y -> partial backtrack — prevents herbivores cornering
- [Phase 36-02]: Creature bounds check uses ZONE_SIZE directly — creatures do not trigger zone transitions
- [36-04]: isBlocked accessor stored as class field in PathfindingController — re-evaluated per step via closure over entityStore; cleared to null in cancelPath() for cleanup
- [36-03]: entity:batch emitted once per zone per tick (not N individual entity:update events) — relaxed zone-room broadcast per v1.8 research decision
- [36-03]: activateZone safe to call multiple times due to idempotency guard — calling on every player join and zone-transition is correct pattern
- [36-03]: deactivateZone called after playerService.handleDisconnect() so getPlayersInZone returns accurate post-disconnect count

### Pending Todos

None.

### Blockers/Concerns

**Carried from Phase 28 planning (deferred):**
- Module type compatibility rules (whether module types are mutually exclusive) — not specified in lore; deferred to future design decision
- ilvl formula lore validation still pending

**Carried from v1.3:**
- Server-side elevation validation not wired (client-side complete, server uses old validation)
- Low priority — only relevant if elevation interacts with item pickup range

**For Phase 36 planning:**
- Decide perception gating model (strict per-player vs relaxed zone broadcast) before AI tick broadcast is implemented — retroactively changing broadcast architecture is expensive

## Session Continuity

Last session: 2026-02-18
Stopped at: Phase 36 Plan 03 complete — AiService integration + entity:batch broadcast wired
Resume file: None

**Next action:** Continue Phase 36 Plan 04 (client pathfinding interruption on creature proximity)

---
*Last updated: 2026-02-18 after Phase 36 Plan 03 complete (AiService integration + entity:batch broadcast)*
