# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-19)

**Core value:** Real-time multiplayer gameplay with responsive movement and visual feedback
**Current focus:** v1.11 NPCs & Trading — Phase 49: NPC Interaction Window

## Current Position

Phase: 49 of 50 (NPC Interaction Window)
Plan: 3 of 3 in current phase (COMPLETE)
Status: In progress
Last activity: 2026-02-20 — 49-03: NPC modal action buttons and Escape key dismissal complete

Progress: [██░░░░░░░░] 20% (v1.11 milestone — 2/5 phases)

## Performance Metrics

**Velocity:**
- Total plans completed: 152 (Phases 1-48 plan 03 complete)
- Average duration: ~3m per plan
- Total execution time: ~5.6 hours

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
| v1.11 | 46-50 | 11/TBD | in progress |

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
- [47-04]: Portal check in WorldScene runs on reconciling=false only; debounced by position key (clears on non-portal)
- [47-04]: Portal travel fully wired end-to-end (open world <-> hub) via tile 16 detection + portal:use emit
- [47-05]: Portal tile placed at hub center (32,32); hub exit chain complete (tile 16 -> portal:use -> handleHubLeave -> lastWorldPosition)
- [48-01]: npcs package uses commonjs type + src/index.ts main (matching entities/items pattern, not esm/dist)
- [48-01]: NpcFaction: 'verdant' | 'helix' | 'nexus' | 'neutral' matching lore factions
- [48-01]: UNKNOWN_NPC fallback is ambient type with magenta color (0xff00ff) — consistent with EntityRegistry
- [48-02]: 5-NPC hub layout: trader NW (20,20), guard N (32,15), rep NE (44,20), ambient SW (20,44), service SE (44,44)
- [48-02]: NpcRegistry.registerAll(ALL_NPCS) called on module load in packages/npcs/src/index.ts
- [48-02]: NpcSpawn exported from world-gen (not npcs) since it describes world position, not NPC identity
- [48-03]: NPC fallback texture is 'player' sprite until NPC sprites are created; NPC scale set to 2.2 (slightly smaller than creatures at 2.5)
- [48-03]: spawnHubNpcs uses NpcRegistry.get() which returns UNKNOWN_NPC fallback — no null guard needed
- [48-03]: NPC entities included in hub zone entity map from load time — appear in zone:state on hub entry without extra events
- [48-03]: NPC click handler suppresses pathfinding (lastClickedEntity) but does not emit combat:start — placeholder for Phase 49 interaction
- [49-01]: npcStore socket wiring at module level follows combatStore pattern — consistent, no lifecycle issues
- [49-01]: GameGateway uses zonesService.getEntity + NpcRegistry.get() for NPC interaction response
- [49-01]: Type-specific NPC fields (inventory, serviceType, title, role) conditionally added to npc:interact:response payload
- [49-02]: NpcInteractionModal follows EquipmentPanel pattern: useDraggablePanel, useEffect keyboard disable/enable, ui-panel class
- [49-02]: Portrait rendered as colored div (NPC definition hex color) — placeholder until NPC sprites exist
- [49-02]: Greeting dialogue: condition=greeting line or first dialogue line, fallback to '...'
- [Phase 49]: Guard and Ambient NPCs render no action buttons (dialogue-only interaction)
- [Phase 49]: Trade/service/faction_rep action buttons are placeholders with console.log — to be wired in Phase 50

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

Last session: 2026-02-20
Stopped at: Completed 49-npc-interaction-window/49-03-PLAN.md — NPC modal action buttons and Escape key dismissal, Phase 49 complete
Resume file: None

**Next action:** Execute Phase 50 (Trading System)

---
*Last updated: 2026-02-20 after 49-03 execution complete*
