# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-18)

**Core value:** Real-time multiplayer gameplay with responsive movement and visual feedback
**Current focus:** v1.8 Entity System — Phase 35: Loot Tables, Tool Interaction, and Respawn

## Current Position

Phase: 35 of 38 (Loot Tables, Tool Interaction, and Respawn)
Plan: 2 of 4 in current phase
Status: In progress
Last activity: 2026-02-18 — Plan 35-02 complete (tool interaction range property)

Progress: [███░░░░░░░] 33% (v1.8 milestone — 2/6 phases complete)

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
| v1.8 | 33-34 | 7 | (in progress) |

**Recent Trend:** Stable, averaging 2-4 plans per phase

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
- [35-02]: range placed after effects in ItemDefinition — tool-only optional property, undefined for non-tools
- [35-02]: Rarity-to-range mapping: common=1, rare=2, epic=3, exotic=4, legendary=5 — linear scale, consistent across all three tool types (mining, combat, research)

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
Stopped at: Completed 35-02-PLAN.md — ItemDefinition.range property and all 15 tool range values
Resume file: None

**Next action:** Execute plan 35-03 (EntityService.handleToolUse tool interaction)

---
*Last updated: 2026-02-18 after Phase 35 Plan 02 complete (tool interaction range property)*
