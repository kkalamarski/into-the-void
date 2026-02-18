---
phase: 31-server-wiring-socket-delivery
plan: 03
subsystem: ui
tags: [react, zustand, socket.io, side-effect-import, module-graph]

# Dependency graph
requires:
  - phase: 31-02
    provides: statsStore.ts with module-level gameSocket.on('stats:update') handler
provides:
  - GameUI.tsx side-effect import that loads statsStore into the module graph at runtime
affects: [32-stats-panel-rendering]

# Tech tracking
tech-stack:
  added: []
  patterns: [side-effect import to activate module-level socket wiring (same as inventoryStore pattern)]

key-files:
  created: []
  modified:
    - apps/web/src/ui/GameUI.tsx

key-decisions:
  - "statsStore activated via side-effect import in GameUI.tsx — no useStatsStore hook yet (rendering deferred to Phase 32)"

patterns-established:
  - "Side-effect import pattern: import '../store/statsStore' in always-rendered component guarantees socket handler registration"

# Metrics
duration: 2min
completed: 2026-02-18
---

# Phase 31 Plan 03: statsStore Module Graph Wiring Summary

**Side-effect import in GameUI.tsx connects statsStore.ts to the module graph, activating the `stats:update` socket handler at runtime without rendering changes**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-02-18T10:33:17Z
- **Completed:** 2026-02-18T10:35:00Z
- **Tasks:** 1 completed
- **Files modified:** 1

## Accomplishments
- statsStore.ts is now reachable from the module graph via GameUI.tsx
- `gameSocket.on('stats:update', ...)` handler executes when the game client loads
- The two verification gap truths are now satisfiable: client can receive and store stats:update payload

## Task Commits

Each task was committed atomically:

1. **Task 1: Add statsStore side-effect import to GameUI.tsx** - `6a6ef65` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `apps/web/src/ui/GameUI.tsx` - Added `import '../store/statsStore'` side-effect import at line 12, after the inventoryStore import

## Decisions Made
- Side-effect import placed after inventoryStore and before actionBarStore imports for consistency with other store registration order
- No `useStatsStore` hook added — rendering of stats data is Phase 32's responsibility

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None - pnpm build succeeded with all 9 projects completing. Pre-existing NX pruned lockfile warnings (unrelated to this change) present before and after.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- statsStore.ts is fully wired: created in 31-02, activated in 31-03
- Phase 32 can now import `useStatsStore` and render the stats panel — the store will already contain data when the panel mounts
- No blockers

---
*Phase: 31-server-wiring-socket-delivery*
*Completed: 2026-02-18*
