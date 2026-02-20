---
phase: 49-npc-interaction-window
plan: 01
subsystem: ui
tags: [zustand, socket.io, npc, phaser, nestjs]

# Dependency graph
requires:
  - phase: 48-npc-definition-system-and-hub-spawns
    provides: NpcRegistry with registered NPCs; Npc entity type in shared-types; NPC spawning in hub zones
provides:
  - NPC click round-trip: WorldScene emits npc:interact, server validates and responds with NPC definition
  - npcStore with interactingNpc state for UI consumption
  - npc:interact and npc:interact:response event types in shared-types
affects:
  - 49-02 (NPC interaction modal UI - reads from npcStore)

# Tech tracking
tech-stack:
  added: []
  patterns: [socket event round-trip for entity interaction (click -> server lookup -> store update)]

key-files:
  created:
    - apps/web/src/store/npcStore.ts
  modified:
    - packages/shared-types/src/network/events.ts
    - apps/web/src/game/scenes/WorldScene.ts
    - apps/game-server/src/game/game.gateway.ts

key-decisions:
  - "npcStore listens for npc:interact:response at module level (same pattern as combatStore)"
  - "GameGateway uses zonesService.getEntity to look up entity, NpcRegistry.get to resolve definition"
  - "Type-specific NPC fields (inventory, serviceType, title, role) conditionally added to response payload"

patterns-established:
  - "Entity click interaction pattern: WorldScene emits event -> GameGateway validates entity -> server responds with definition data -> store updates for UI"

# Metrics
duration: 5min
completed: 2026-02-20
---

# Phase 49 Plan 01: NPC Click-to-Server Round-Trip Summary

**NPC click detection wired to server round-trip: WorldScene emits npc:interact, GameGateway validates and responds with NPC definition via NpcRegistry, npcStore receives and stores for UI consumption**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-02-20T10:00:32Z
- **Completed:** 2026-02-20T10:05:32Z
- **Tasks:** 4
- **Files modified:** 4 (1 created, 3 modified)

## Accomplishments
- Created npcStore Zustand store with NpcInteraction interface, socket wiring for npc:interact:response
- Added npc:interact (ClientEvents) and npc:interact:response (ServerEvents) to shared-types events
- Replaced console.log NPC click placeholder in WorldScene with gameSocket.emit('npc:interact', { entityId })
- GameGateway handleNpcInteract: validates entity exists and is NPC type, resolves definition from NpcRegistry, emits typed response

## Task Commits

Each task was committed atomically:

1. **Task 1: Create npcStore Zustand store** - `4fa3bbd` (feat)
2. **Task 2: Add npc:interact event types to shared-types** - `2d1e44c` (feat)
3. **Task 3: Wire WorldScene NPC click to emit npc:interact** - `b2090d4` (feat)
4. **Task 4: Add npc:interact handler to GameGateway** - `2a5f4e6` (feat)

## Files Created/Modified
- `apps/web/src/store/npcStore.ts` - Created: Zustand store for NPC interaction state with socket wiring
- `packages/shared-types/src/network/events.ts` - Added npc:interact to ClientEvents, npc:interact:response to ServerEvents
- `apps/web/src/game/scenes/WorldScene.ts` - NPC click branch now emits npc:interact instead of console.log
- `apps/game-server/src/game/game.gateway.ts` - Added handleNpcInteract handler with NpcRegistry lookup

## Decisions Made
- npcStore socket wiring at module level follows existing combatStore pattern — consistent, no lifecycle issues
- GameGateway imports Npc type from shared-types for type-safe entity cast when reading npcId field
- NpcRegistry.get() always returns a fallback (UNKNOWN_NPC) so no null guard needed on the definition
- Type-specific fields appended conditionally using `'inventory' in npcDef` pattern matching existing codebase style

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Foundation complete: npcStore.interactingNpc populated on NPC click, ready for Phase 49 plan 02 to render the interaction modal UI
- All TypeScript compiles cleanly (11 projects built successfully)

---
## Self-Check: PASSED

- FOUND: apps/web/src/store/npcStore.ts
- FOUND: .planning/phases/49-npc-interaction-window/49-01-SUMMARY.md
- FOUND: 4fa3bbd (feat: create npcStore)
- FOUND: 2d1e44c (feat: add shared-types event types)
- FOUND: b2090d4 (feat: WorldScene NPC click wiring)
- FOUND: 2a5f4e6 (feat: GameGateway npc:interact handler)

*Phase: 49-npc-interaction-window*
*Completed: 2026-02-20*
