---
phase: 32-client-display
plan: 01
subsystem: ui
tags: [zustand, phaser, stats, keyboard, state-management]

# Dependency graph
requires:
  - phase: 31-server-wiring-socket-delivery
    provides: statsStore with stats:update socket wiring and CharStatsPayload type
  - phase: 30-type-foundation-pure-computation
    provides: CharacterStats 8-stat type (durability, toughness, power, haste, vigor, recovery, perception, resilience)
provides:
  - levelUpDeltas state in statsStore with automatic detection on base stat increase
  - clearLevelUpDeltas action for resetting delta notifications
  - STAT_DISPLAY_ORDER constant with all 8 stat keys and labels for consistent iteration
  - showStats boolean and toggleStats action in gameStore
  - P key handler in WorldScene calling toggleStats when keyboard enabled
affects: [32-02, 32-03, stats-panel-rendering, level-up-notifications]

# Tech tracking
tech-stack:
  added: []
  patterns: [keyboard-toggle-pattern, delta-detection-via-state-comparison]

key-files:
  created: []
  modified:
    - apps/web/src/store/statsStore.ts
    - apps/web/src/store/gameStore.ts
    - apps/web/src/game/scenes/WorldScene.ts
    - apps/web/src/ui/constants.ts

key-decisions:
  - "Compare base stats only (not total) for level-up detection — equipment changes affect total but not base"
  - "P key handler follows the same keyboard-enabled guard pattern as I/E/C keys"
  - "levelUpDeltas accumulates only positive deltas (increases) across STAT_DISPLAY_ORDER keys"

patterns-established:
  - "Keyboard toggle pattern: addKey + 'down' event + keyboard.enabled guard + store.getState().toggle()"
  - "Delta detection pattern: compare previous state vs incoming payload in setStats before assignment"

# Metrics
duration: 2min
completed: 2026-02-18
---

# Phase 32 Plan 01: State Foundations Summary

**statsStore tracks base-stat level-up deltas via before/after comparison, gameStore has showStats toggle, P key handler wired to WorldScene following I/E/C pattern, and STAT_DISPLAY_ORDER constant defines all 8 stats**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-18T11:05:40Z
- **Completed:** 2026-02-18T11:07:40Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Extended statsStore with levelUpDeltas detection: compares incoming base stats against previous base stats, accumulates positive deltas for any stat in STAT_DISPLAY_ORDER
- Added clearLevelUpDeltas action to statsStore for resetting notification state after display
- Added STAT_DISPLAY_ORDER constant to constants.ts with all 8 CharacterStats keys and display labels
- Extended gameStore with showStats boolean and toggleStats action following existing toggle pattern
- Added P key handler to WorldScene.create() calling useGameStore.getState().toggleStats() with keyboard.enabled guard

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend statsStore with level-up detection** - `f8a83a4` (feat)
2. **Task 2: Add stats toggle to gameStore and P key handler to WorldScene** - `21e6d5e` (feat)

## Files Created/Modified
- `apps/web/src/store/statsStore.ts` - Added levelUpDeltas state, clearLevelUpDeltas action, and base-stat comparison logic in setStats
- `apps/web/src/ui/constants.ts` - Added STAT_DISPLAY_ORDER array with 8 CharacterStats keys and labels; imported CharacterStats type
- `apps/web/src/store/gameStore.ts` - Added showStats boolean and toggleStats action to GameState interface and initial values
- `apps/web/src/game/scenes/WorldScene.ts` - Added P key handler after C key handler, calling toggleStats with keyboard.enabled guard

## Decisions Made
- Compare base stats only (not total) for level-up detection — equipment bonuses affect total, level gains affect base
- P key handler alphabetically placed after C key handler, consistent with existing key ordering
- levelUpDeltas accumulates only the delta amount (next - prev) per stat, not the new absolute value

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Stats panel toggle infrastructure complete; Phase 32 Plan 02 can now render stats panel reacting to showStats
- levelUpDeltas ready for notification UI consumption in Phase 32 Plan 03
- STAT_DISPLAY_ORDER available for consistent stat iteration in any stats-rendering component

---
*Phase: 32-client-display*
*Completed: 2026-02-18*

## Self-Check: PASSED

- FOUND: apps/web/src/store/statsStore.ts
- FOUND: apps/web/src/store/gameStore.ts
- FOUND: apps/web/src/game/scenes/WorldScene.ts
- FOUND: apps/web/src/ui/constants.ts
- FOUND commit: f8a83a4 (feat(32-01): extend statsStore with level-up detection and STAT_DISPLAY_ORDER)
- FOUND commit: 21e6d5e (feat(32-01): add stats toggle to gameStore and P key handler to WorldScene)
