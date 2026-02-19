---
phase: 43-click-to-attack-and-bug-fix
plan: 01
subsystem: ui
tags: [phaser, click-to-attack, combat, entity-interaction, inventory]

# Dependency graph
requires:
  - phase: 39-42
    provides: CombatService startCombat(), combat:start socket event in ClientEvents
  - phase: 43
    provides: ItemRegistry with toolType and range on ItemDefinition
provides:
  - Entity sprites are interactive in Phaser (setInteractive on all entity sprites)
  - Creature sprites show hand cursor on hover
  - Click-to-attack: clicking a creature with combat tool equipped and in range emits combat:start
  - Range pre-check (Chebyshev distance) on client before emitting combat:start
  - Entity clicks suppress click-to-move pathfinding
affects: [43-02, 43-03, combat-ui, combat-ux]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - gameobjectdown scene-level event delegation for entity clicks
    - Container.getData('entityId'/'entityType') for click identity
    - Client-side Chebyshev range pre-check before emitting combat:start

key-files:
  created: []
  modified:
    - apps/web/src/game/rendering/EntityRenderer.ts
    - apps/web/src/game/scenes/WorldScene.ts

key-decisions:
  - "gameobjectdown scene-level delegation used instead of per-entity handlers (cleaner, no memory leak per entity)"
  - "Chebyshev distance (max of dx, dy) for range check matches server-side validation logic"
  - "Entity clicks set lastClickedEntity flag to suppress pointerup pathfinding handler"
  - "Only creature entity type gets hand cursor; all others get standard interactive"

patterns-established:
  - "Pattern: Container.getData('entityId') + 'entityType' for scene-level click routing"
  - "Pattern: lastClickedEntity guard in pointerup to prevent click-to-move on entity click"

# Metrics
duration: 2min
completed: 2026-02-19
---

# Phase 43 Plan 01: Click-to-Attack Client Wiring Summary

**Click-to-attack wired via Phaser gameobjectdown delegation: creature sprites interactive, combat tool + range check gates combat:start emit**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-19T17:04:29Z
- **Completed:** 2026-02-19T17:06:33Z
- **Tasks:** 3
- **Files modified:** 2

## Accomplishments

- All entity sprites now have setInteractive() called; creature sprites show useHandCursor: true
- Entity identity (entityId, entityType) stored on Phaser containers for click routing
- Scene-level gameobjectdown handler delegates clicks, checks entity type, suppresses pathfinding
- handleEntityClick() validates: combat tool equipped → combat toolType → Chebyshev range check → emit combat:start
- Click-to-move pathfinding suppressed when entity is clicked via lastClickedEntity flag

## Task Commits

Each task was committed atomically:

1. **Task 1: Make entity sprites interactive in EntityRenderer** - `c89e8ae` (feat)
2. **Task 2 + 3: Add entity click handler and prevent pathfinding on entity click** - `32d5082` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `apps/web/src/game/rendering/EntityRenderer.ts` - Added setInteractive() on all sprites (useHandCursor for creatures), stored entityId/entityType on containers
- `apps/web/src/game/scenes/WorldScene.ts` - Added ItemRegistry + useInventoryStore imports, lastClickedEntity field, gameobjectdown handler, handleEntityClick() method, pathfinding suppression

## Decisions Made

- Used scene-level `gameobjectdown` event delegation instead of per-entity pointer handlers — cleaner, avoids memory leaks from handler registration per entity
- Chebyshev distance (`Math.max(dx, dy)`) matches server-side range validation logic
- `lastClickedEntity` flag set in `gameobjectdown` and cleared in `pointerup` to prevent pathfinding from firing after entity click
- Only creatures use `useHandCursor: true`; other entity types (mineral, plant) use basic `setInteractive()` without hand cursor

## Deviations from Plan

None - plan executed exactly as written. Tasks 2 and 3 were committed together as they are tightly coupled (lastClickedEntity field introduced in Task 3 was set in the Task 2 handler).

## Issues Encountered

Pre-existing failures unrelated to our changes:
- game-server build error (`game.gateway.ts:228` TS2345) — pre-existing before this plan
- ESLint config missing for web app — pre-existing project-wide issue

Both were confirmed pre-existing. Web build passes cleanly.

## Next Phase Readiness

- Click-to-attack client wiring complete (CATK-01, CATK-02, CATK-04)
- combat:start events will now flow from client clicks to server CombatService
- Ready for Phase 43-02: aggro bug fix in creature-ai.ts (FIX-01)

## Self-Check: PASSED

- EntityRenderer.ts: FOUND
- WorldScene.ts: FOUND
- 43-01-SUMMARY.md: FOUND
- Commit c89e8ae: FOUND
- Commit 32d5082: FOUND
- setInteractive(useHandCursor): FOUND
- container.setData('entityId'): FOUND (line 104)
- container.setData('entityType'): FOUND (line 105)
- gameobjectdown handler: FOUND
- handleEntityClick method: FOUND
- combat:start emit: FOUND
- lastClickedEntity guard: FOUND

---
*Phase: 43-click-to-attack-and-bug-fix*
*Completed: 2026-02-19*
