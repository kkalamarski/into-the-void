---
phase: 46-currency-and-hub-foundation
plan: 01
subsystem: database, ui, api
tags: [drizzle, postgresql, react, phaser, zustand, shared-types]

# Dependency graph
requires: []
provides:
  - "credits integer column in characters table (default 1000)"
  - "credits field on Player and PlayerPublic interfaces"
  - "PlayerService wires character.credits from DB into ConnectedPlayer on auth"
  - "HUD displays credits balance with gold coin icon and locale formatting"
affects:
  - "46-currency-and-hub-foundation"
  - "trading, shop, economy phases"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Currency fields on Player type propagate from DB schema through shared-types to HUD display"
    - "PlayerPublic interface includes credits so all players in zone carry balance"

key-files:
  created: []
  modified:
    - "packages/database/src/schema/characters.ts"
    - "packages/shared-types/src/core/player.ts"
    - "apps/game-server/src/game/player.service.ts"
    - "apps/game-server/src/game/game.service.ts"
    - "apps/web/src/ui/hud/HUD.tsx"
    - "apps/web/src/ui/hud/HUD.css"
    - "apps/web/src/store/gameStore.ts"

key-decisions:
  - "Credits added to PlayerPublic (not kept private) - balance visible to other clients"
  - "Default 1000 credits for new characters set at DB schema level"

patterns-established:
  - "Currency display uses GiTwoCoins icon with #ffd700 gold color in HUD"
  - "Locale-aware formatting via toLocaleString() for credit amounts"

# Metrics
duration: 8min
completed: 2026-02-19
---

# Phase 46 Plan 01: Credits Currency Foundation Summary

**Credits integer column added to characters DB schema, wired through Player type and PlayerService, displayed in HUD as '1,000 cr' with gold coin icon**

## Performance

- **Duration:** 8 min
- **Started:** 2026-02-19T20:44:16Z
- **Completed:** 2026-02-19T20:52:20Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments

- Added `credits` column to characters DB table with default 1000 and pushed schema to dev PostgreSQL
- Wired `credits` from DB through `Player` and `PlayerPublic` interfaces and `PlayerService.authenticate`
- Displayed credits in HUD with gold coin icon (`GiTwoCoins`) and locale-formatted number (e.g., "1,000 cr")

## Task Commits

Each task was committed atomically:

1. **Task 1: Add credits column to characters schema** - `d987066` (feat)
2. **Task 2: Add credits to Player type and wire through PlayerService** - `7db192b` (feat)
3. **Task 3: Display credits in HUD** - `fa5bdb8` (feat)

## Files Created/Modified

- `packages/database/src/schema/characters.ts` - Added `credits: integer('credits').notNull().default(1000)` after maxHealth
- `packages/shared-types/src/core/player.ts` - Added `credits: number` to both Player and PlayerPublic interfaces
- `apps/game-server/src/game/player.service.ts` - Added `credits: character.credits` in authenticate and `getPlayersInZone`
- `apps/game-server/src/game/game.service.ts` - Added `credits: player.credits` in zone-change playerPublic construction
- `apps/web/src/ui/hud/HUD.tsx` - Added GiTwoCoins import and credits-display div after stats-section
- `apps/web/src/ui/hud/HUD.css` - Added .credits-display and .credits-icon CSS with #ffd700 gold styling
- `apps/web/src/store/gameStore.ts` - Fixed player:respawn PlayerPublic construction to include required credits field

## Decisions Made

- Credits added to `PlayerPublic` (not kept private) — consistent with level and faction being public; economy mechanics don't require balance privacy at this stage
- Default set at DB schema level (`DEFAULT 1000`) rather than in application code — ensures consistency even if a character is created through direct DB inserts

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed missing credits field in game.service.ts playerPublic construction**
- **Found during:** Task 2 (Player type and PlayerService wiring)
- **Issue:** `game.service.ts` constructs a PlayerPublic object on zone change but didn't include `credits`, which became a required field after the interface update
- **Fix:** Added `credits: player.credits` to the playerPublic object in `game.service.ts` zone-change handler
- **Files modified:** `apps/game-server/src/game/game.service.ts`
- **Verification:** `tsc --noEmit` on game-server passes
- **Committed in:** `7db192b` (Task 2 commit)

**2. [Rule 1 - Bug] Fixed missing credits field in gameStore player:respawn handler**
- **Found during:** Task 3 (HUD display) — discovered during full `pnpm build`
- **Issue:** `gameStore.ts` constructs a PlayerPublic for `worldScene.addPlayer` in the `player:respawn` handler without `credits`, causing a TS2345 type error
- **Fix:** Added `credits: 0` as a placeholder (the real value arrives via the subsequent `player:joined` event)
- **Files modified:** `apps/web/src/store/gameStore.ts`
- **Verification:** Full tsc check passes, pnpm build succeeds for web package
- **Committed in:** `fa5bdb8` (Task 3 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 1 - missing required field on type update)
**Impact on plan:** Both fixes necessary for TypeScript correctness after adding `credits` to `PlayerPublic`. No scope creep.

## Issues Encountered

- `drizzle-kit push` requires interactive TTY selection — piping input doesn't work; resolved with `expect` script to send arrow-down + enter to select "Yes, I want to execute all statements"
- Pre-existing build errors in `TargetHighlight.ts` (TS18047 `progress` possibly null) unrelated to this plan — confirmed pre-existing by stash test

## User Setup Required

None - no external service configuration required. Database schema was pushed automatically via `db:push`.

## Next Phase Readiness

- Credits system foundation complete — DB, types, server, and HUD all consistent
- Ready for Phase 46 Plan 02: Hub zone infrastructure (portal structures, faction orbital station zones)
- Credits balance is read-only this phase; mutation functions (spend/earn) to be added in trading phases

## Self-Check: PASSED

- FOUND: packages/database/src/schema/characters.ts - credits column present
- FOUND: packages/shared-types/src/core/player.ts - credits field on Player and PlayerPublic
- FOUND: apps/web/src/ui/hud/HUD.tsx - credits-display with GiTwoCoins
- FOUND: apps/web/src/ui/hud/HUD.css - .credits-display and .credits-icon styles
- FOUND: .planning/phases/46-currency-and-hub-foundation/46-01-SUMMARY.md
- VERIFIED: commits d987066, 7db192b, fa5bdb8 all present in git log

---
*Phase: 46-currency-and-hub-foundation*
*Completed: 2026-02-19*
