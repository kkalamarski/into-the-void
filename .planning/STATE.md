# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-18)

**Core value:** Real-time multiplayer gameplay with responsive movement and visual feedback
**Current focus:** v1.8 Entity System — Phase 33: Foundation Types and Entity Definitions

## Current Position

Phase: 33 of 38 (Foundation Types and Entity Definitions)
Plan: 1 of TBD in current phase
Status: In progress
Last activity: 2026-02-18 — completed 33-01 (foundation types and entity definitions)

Progress: [█░░░░░░░░░] 10% (v1.8 milestone — 1 of ~10 plans complete)

## Performance Metrics

**Velocity:**
- Total plans completed: 95 (Phases 1-32 complete)
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
Stopped at: Completed 33-01-PLAN.md — foundation types (CreatureBehavior, BiomeType, EntityType) updated across 9 files
Resume file: None

**Next action:** Execute Phase 33 next plan (33-02 or beyond)

---
*Last updated: 2026-02-18 after completing 33-01 foundation types and entity definitions*
