# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-19)

**Core value:** Real-time multiplayer gameplay with responsive movement and visual feedback
**Current focus:** v1.11 NPCs & Trading — Phase 47: Hub Travel

## Current Position

Phase: 47 of 50 (Hub Travel)
Plan: 3 of TBD in current phase
Status: In progress
Last activity: 2026-02-19 — 47-03: Hub recall hotkey (H key) and leave-hub mechanic

Progress: [██░░░░░░░░] 20% (v1.11 milestone — 1/5 phases)

## Performance Metrics

**Velocity:**
- Total plans completed: 149 (Phases 1-47 plan 03 complete)
- Average duration: ~3m per plan
- Total execution time: ~5.5 hours

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
| v1.8 | 33-38 | 22 | 2 days |
| v1.9 | 39-42 | 12 | 1 day |
| v1.10 | 43-45 | 5 | 1 day |
| v1.11 | 46-50 | 6/TBD | in progress |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [v1.11]: Orbital stations as faction hubs (not surface HQs)
- [v1.11]: Credits as currency
- [v1.11]: Portal structures + recall (H key) for hub travel
- [v1.11]: Simple linear dialogue (no branching)
- [v1.11]: NPCs are static at fixed hub positions (no schedules)
- [46-02]: Hub zones use hub_ prefix; BiomeType mapped to valid values (fungal_forest, volcanic_ridge, void_plains)
- [46-02]: hub_neutral respawns to hub_nexus (Meridian Station — neutral welcome)
- [46-03]: isHubZone guard pattern: add early-return to any system that must be skipped for hubs
- [46-03]: Safe Zone indicator positioned top-right (mutually exclusive with combat indicator)
- [Phase 46]: Credits added to PlayerPublic (not kept private) - balance visible to other clients at this stage
- [Phase 46]: Default 1000 credits set at DB schema level to ensure consistency
- [47-01]: Portal numeric ID = 16 (next after CRATER_DEBRIS = 15 in TileId enum)
- [47-01]: 1 portal per open-world chunk; hub chunks unaffected (generateHubChunk returns structures: [])
- [47-01]: Portal placement range x/y 20-44 (center third of 64x64 chunk)
- [47-01]: tile_portal sprite key reserved; renderer falls back gracefully until sprite added
- [47-02]: Server validates player stands on TileId.PORTAL (=16) before allowing hub teleport
- [47-02]: lastWorldPosition saved both in-memory (ConnectedPlayer) and to DB on hub entry; restored from DB on authenticate()
- [47-02]: Hub AI activated (aiService.activateZone) after portal teleport, matching handleAuth pattern
- [47-03]: H key recall delegates to teleportToHub (same as portal:use) — saves position and teleports to faction hub
- [47-03]: teleportFromHub clears saved position after use — one-way trip, returning to hub re-saves
- [47-03]: portal:use in hub delegates to handleHubLeave via method call (no code duplication)

### Pending Todos

None.

### Blockers/Concerns

**Carried from Phase 28 planning (deferred):**
- Module type compatibility rules (whether module types are mutually exclusive) — not specified in lore; deferred to future design decision
- ilvl formula lore validation still pending

**Carried from v1.3:**
- Server-side elevation validation not wired (client-side complete, server uses old validation)
- Low priority — only relevant if elevation interacts with item pickup range

## Session Continuity

Last session: 2026-02-19
Stopped at: Completed 47-hub-travel/47-03-PLAN.md — hub recall hotkey and leave-hub mechanic
Resume file: None

**Next action:** Execute next plan in hub travel phase

---
*Last updated: 2026-02-19 after 47-03 execution complete*
