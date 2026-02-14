---
phase: 04-websocket-connection-auth-handshake
plan: 03
subsystem: ui
tags: [react, loading-screen, connection-indicator, lore-tips, latency-display, zustand]

# Dependency graph
requires:
  - phase: 04-02
    provides: "Loading stage and latency state in gameStore"
provides:
  - "LoadingScreen component with progress bar and rotating lore tips"
  - "ConnectionIndicator component with real-time latency display"
  - "Lore-accurate loading tips from world-bible.md"
affects: [04-04-error-recovery, 04-05-game-screen-integration, game-ui]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "React functional components with Zustand state subscription"
    - "Rotating content using setInterval + useEffect cleanup"
    - "Conditional rendering based on connection state"
    - "Inline styles for dynamic values (progress bar width, status colors)"

key-files:
  created:
    - apps/web/src/components/LoadingScreen.tsx
    - apps/web/src/components/ConnectionIndicator.tsx
  modified:
    - apps/web/src/styles/loading.css

key-decisions:
  - "12 lore-accurate tips selected from world-bible.md for variety and atmosphere"
  - "5-second tip rotation interval balances readability with content exposure"
  - "Latency bars use 4-tier system (50/100/200ms thresholds) for clear visual feedback"
  - "Connection indicator always visible in top-right corner during gameplay"

patterns-established:
  - "Pattern 1: Loading screens show progress (0-100%), stage text, and contextual tips"
  - "Pattern 2: Connection status uses color-coded dot + latency bars for at-a-glance feedback"
  - "Pattern 3: Lore integration through UI elements (tips reinforce world-building)"

# Metrics
duration: 2m 33s
completed: 2026-02-14
---

# Phase 04 Plan 03: Loading Screen & Connection Indicator Summary

**React UI components for loading progress and connection status with lore-accurate tips**

## Performance

- **Duration:** 2m 33s
- **Started:** 2026-02-14T11:30:47Z
- **Completed:** 2026-02-14T11:33:20Z
- **Tasks:** 3
- **Files created:** 2
- **Files modified:** 1

## Accomplishments
- LoadingScreen component displays progress bar (0-100%), stage text, and percentage
- 12 lore-accurate tips rotate every 5 seconds from world-bible.md content
- ConnectionIndicator shows colored dot (green/yellow/red) based on connection state and latency
- Latency bars (1-4) and ms value displayed when authenticated
- Status text ("Connecting...", "Disconnected", etc.) shown when not authenticated
- Full CSS styling for both components in loading.css

## Task Commits

Each task was committed atomically:

1. **Task 1: Create LoadingScreen component with lore tips** - `32824e5` (feat)
2. **Task 2: Create ConnectionIndicator component** - `2675b8e` (feat)
3. **Task 3: Create loading.css styles** - `254b886` (feat)

## Files Created/Modified
- `apps/web/src/components/LoadingScreen.tsx` - Full-screen loading overlay with progress bar, stage text, percentage, and rotating lore tips
- `apps/web/src/components/ConnectionIndicator.tsx` - Top-right corner connection status with colored dot, latency bars, and ms value
- `apps/web/src/styles/loading.css` - Added loading screen and connection indicator styles (appended to existing error modal styles)

## Decisions Made

**12 lore tips from world-bible.md**
- Selected tips covering factions, biomes, The Ancients, Anomalies, and Terminus lore
- Each tip is self-contained and meaningful to new players
- Rotation every 5 seconds provides variety without overwhelming

**Latency thresholds**
- 4 bars: <50ms (excellent)
- 3 bars: <100ms (good)
- 2 bars: <200ms (fair)
- 1 bar: >=200ms (poor)
- Color changes: green (<100ms), yellow (<200ms), orange (>=200ms)

**Connection indicator placement**
- Fixed to top-right corner for always-visible status
- Semi-transparent background doesn't obscure game view
- Compact design (dot + bars + ms) minimizes screen real estate

**Stage text mapping**
- `connecting` → "Connecting to server..."
- `authenticating` → "Authenticating character..."
- `loading-world` → "Loading world data..."
- `spawning` → "Spawning into world..."
- `ready` → "Ready!"

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - components ready for integration into GameScreen.

## Next Phase Readiness

**Ready for:**
- Plan 04: Error recovery components can coexist with loading screen
- Plan 05: GameScreen can integrate both LoadingScreen and ConnectionIndicator
- Future: Loading tips can be expanded with more lore content as world-bible.md grows

**No blockers**

## Self-Check: PASSED

**Files verified:**
- ✓ LoadingScreen.tsx created at apps/web/src/components/LoadingScreen.tsx
- ✓ ConnectionIndicator.tsx created at apps/web/src/components/ConnectionIndicator.tsx
- ✓ loading.css modified at apps/web/src/styles/loading.css
- ✓ Web app builds successfully without errors

**Commits verified:**
- ✓ 32824e5: Task 1 commit exists
- ✓ 2675b8e: Task 2 commit exists
- ✓ 254b886: Task 3 commit exists

**Component verification:**
- ✓ LoadingScreen exports component and uses gameStore (loadingStage, loadingProgress)
- ✓ LoadingScreen contains LOADING_TIPS array with lore content
- ✓ ConnectionIndicator exports component and uses gameStore (connectionState, latency)
- ✓ ConnectionIndicator contains getStatusColor and getLatencyBars helpers
- ✓ loading.css contains all required classes (loading-screen, connection-indicator, etc.)

---
*Phase: 04-websocket-connection-auth-handshake*
*Completed: 2026-02-14*
