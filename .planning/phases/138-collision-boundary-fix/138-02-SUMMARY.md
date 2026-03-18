---
phase: 138-collision-boundary-fix
plan: 02
subsystem: ui
tags: [react, phaser, zustand, css-animation, zone-transitions]

# Dependency graph
requires:
  - phase: 138-01
    provides: Zone boundary fix — collision callbacks routed through isWorldTileBlocked
provides:
  - Dark Souls-style zone name cinematic overlay (ZoneNameCinematic component)
  - Per-zone 30-second cooldown suppression for zone cinematic
  - Initial spawn cinematic trigger on game load
  - Tier-colored zone danger labels (Frontier/Hazardous/Hostile/Extreme)
affects: [zone-transitions, hud, world-scene, game-store]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "CSS animation with fixed timing keyframes (fade-in 500ms, hold 2500ms, fade-out 500ms)"
    - "Zustand instanceId counter pattern for forcing React component remount on re-trigger"
    - "Phaser time.delayedCall for deferred cinematic triggers on scene initialization"

key-files:
  created:
    - apps/web/src/ui/ZoneNameCinematic.tsx
    - apps/web/src/ui/ZoneNameCinematic.css
  modified:
    - apps/web/src/store/gameStore.ts
    - apps/web/src/components/GameContainer.tsx
    - apps/web/src/game/scenes/WorldScene.ts

key-decisions:
  - "Placed ZoneNameCinematic in GameContainer (not GameScreen) — GameContainer is the correct HUD layer alongside ConnectionIndicator and chunk-loading-indicator"
  - "Used instanceId counter in zoneCinematic state to force React remount and restart CSS animation on re-trigger"
  - "Removed unused useAlertStore import from WorldScene after replacing all alert-based zone notifications"

patterns-established:
  - "Zone cinematic pattern: triggerZoneCinematic in gameStore, showZoneCinematic in WorldScene with cooldown, ZoneNameCinematic component reads from store"

requirements-completed: [COLLIDE-02]

# Metrics
duration: 6min
completed: 2026-03-18
---

# Phase 138 Plan 02: Zone Name Cinematic Summary

**Dark Souls-style zone name overlay with tier-colored labels, 30-second per-zone cooldown, and initial spawn trigger — replacing alert-based zone notifications**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-03-18T10:46:00Z
- **Completed:** 2026-03-18T10:52:23Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Created `ZoneNameCinematic` React component with CSS animation (fade in 0.5s, hold 2.5s, fade out 0.5s) centered on screen
- Added `zoneCinematic` state to gameStore with `triggerZoneCinematic` (auto-clears after 3500ms) and `clearZoneCinematic`
- Added `showZoneCinematic` to WorldScene with 30-second per-zone cooldown map — prevents spam on back-and-forth zone crossing
- Replaced both `addAlert` zone transition notifications (in `commitZoneTransition` and `fullZoneReset`) with cinematic
- Added initial spawn cinematic trigger in `loadZoneFromState` with 500ms delay for scene initialization
- Tier labels use distinct colors: green (Frontier), gold (Hazardous), red (Hostile), purple (Extreme)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create ZoneNameCinematic component and store state** - `69e70f5` (feat)
2. **Task 2: Wire cinematic into zone transitions and GameContainer** - `48e0ca8` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified
- `apps/web/src/ui/ZoneNameCinematic.tsx` - Dark Souls-style zone name overlay component
- `apps/web/src/ui/ZoneNameCinematic.css` - Fade animation + tier-color CSS styles
- `apps/web/src/store/gameStore.ts` - Added zoneCinematic state, triggerZoneCinematic, clearZoneCinematic
- `apps/web/src/components/GameContainer.tsx` - Import and render ZoneNameCinematic alongside HUD overlays
- `apps/web/src/game/scenes/WorldScene.ts` - showZoneCinematic method, cooldown map, replaced addAlert notifications, initial spawn trigger

## Decisions Made
- Placed `ZoneNameCinematic` in `GameContainer` rather than `GameScreen` — GameContainer is the correct HUD layer where other overlays (ConnectionIndicator, chunk-loading-indicator) live
- Used `instanceId` counter in store to force React remount on each trigger, reliably restarting the CSS animation
- Removed `useAlertStore` import from WorldScene as zone transition alerts were its only usage there

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Removed now-unused useAlertStore import from WorldScene**
- **Found during:** Task 2 (wiring cinematic into WorldScene)
- **Issue:** After replacing both addAlert zone notification calls, useAlertStore was imported but unused — TypeScript/build would warn or error
- **Fix:** Removed the import line for useAlertStore from WorldScene.ts
- **Files modified:** apps/web/src/game/scenes/WorldScene.ts
- **Verification:** Build passes with no warnings about unused imports
- **Committed in:** 48e0ca8 (Task 2 commit)

**2. [Rule 1 - Architectural] ZoneNameCinematic placed in GameContainer instead of GameScreen**
- **Found during:** Task 2
- **Issue:** Plan specified GameScreen.tsx as the target for ZoneNameCinematic, but GameScreen only renders LoadingScreen, ErrorModal, and GameContainer — it has no HUD overlay structure. GameContainer is the correct location where all HUD overlays live.
- **Fix:** Added ZoneNameCinematic to GameContainer.tsx instead, which is the actual HUD layer
- **Files modified:** apps/web/src/components/GameContainer.tsx
- **Verification:** Component renders alongside ConnectionIndicator and other HUD elements
- **Committed in:** 48e0ca8 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 architectural placement)
**Impact on plan:** Both fixes necessary for correctness — no scope creep.

## Issues Encountered
None — plan executed cleanly.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Zone cinematic system is complete and integrated
- Phase 138 (collision-boundary-fix) is fully complete: Plan 01 fixed invisible walls at chunk/zone seams, Plan 02 added zone name cinematic replacing alert notifications
- Ready for Phase 136 (combat-gathering-fix) or remaining phases

---
*Phase: 138-collision-boundary-fix*
*Completed: 2026-03-18*
