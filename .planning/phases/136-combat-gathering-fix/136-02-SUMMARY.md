---
phase: 136-combat-gathering-fix
plan: 02
subsystem: ui
tags: [phaser, worldscene, combat, gathering, auto-attack, zustand]

requires:
  - phase: 133-distance-system-migration
    provides: pixel distance utilities and canInteractPixel
  - phase: 134-client-movement-rewrite
    provides: WASD pixel movement and WorldScene entity rendering
provides:
  - Click-to-attack triggers auto-attack loop on creatures
  - Click-to-gather triggers gathering ability on resource nodes
  - Auto-attack interval timer managed by combatStore
  - Range indicator matches server-side ability range
affects: []

tech-stack:
  added: []
  patterns:
    - "Auto-attack loop pattern: setInterval with self-termination checks per tick"

key-files:
  created: []
  modified:
    - apps/web/src/store/combatStore.ts
    - apps/web/src/game/scenes/WorldScene.ts

key-decisions:
  - "Auto-attack interval set to 1500ms matching basic_strike cooldown"
  - "Gathering ability lookup falls back through harvest->basic_harvest->gather chain for plants, mine->basic_mine->gather for minerals"
  - "Range indicator uses 1*TILE_SIZE_PX (128px) for creatures matching server's ability.range*TILE_SIZE_PX, not MELEE_RANGE_PX (64px)"

patterns-established:
  - "Auto-attack loop: fire immediate attack on click, then setInterval at cooldown rate with graceful skip on cooldown/casting/energy"

requirements-completed: [INTERACT-01, INTERACT-02, INTERACT-03]

duration: 5min
completed: 2026-03-18
---

# Phase 136-02: Client-Side Click-to-Interact Summary

**Click-to-attack starts auto-attack loop on creatures, click-to-gather triggers gathering ability on resources, range indicator corrected to match server**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-18
- **Completed:** 2026-03-18
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Added startAutoAttack/stopAutoAttack to combatStore with interval timer that fires basic_strike every 1500ms
- Creature click now triggers auto-attack loop immediately (first click attacks, then repeats)
- Plant/mineral click now triggers the appropriate gathering ability (harvest/mine/gather)
- Fixed range indicator to use TILE_SIZE_PX (128px) for creature range instead of MELEE_RANGE_PX (64px)
- Auto-attack self-terminates on target death, deselection, or player death
- Ground click clears target and stops auto-attack

## Task Commits

Each task was committed atomically:

1. **Task 1: Add auto-attack loop to combatStore** - `03c85e1` (feat)
2. **Task 2: Wire entity click handlers to trigger abilities and update range indicator** - `318700b` (feat)

## Files Created/Modified
- `apps/web/src/store/combatStore.ts` - Added auto-attack interval timer, startAutoAttack/stopAutoAttack methods, integrated with socket event listeners
- `apps/web/src/game/scenes/WorldScene.ts` - Updated creature/plant/mineral click handlers to trigger abilities, fixed range indicator, added getEquippedAbilities import

## Decisions Made
- Auto-attack fires at 1500ms interval matching basic_strike cooldown — the interval gracefully skips ticks when ability is on cooldown or player is casting
- Gathering ability lookup chains through harvest->basic_harvest->gather for plants, mine->basic_mine->gather for minerals, covering all possible ability naming conventions
- Range indicator uses ability range (1 * TILE_SIZE_PX = 128px) to exactly match the server's range conversion formula

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Combat and gathering client-side interaction fully wired
- Server-side distance checks are clean from plan 136-01
- Phase 136 requirements complete

---
*Phase: 136-combat-gathering-fix*
*Completed: 2026-03-18*
