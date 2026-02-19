---
phase: 39-combat-core-and-damage-calculation
plan: 03
subsystem: api
tags: [game-logic, combat, haste, attack-interval, damage, vitest, nestjs]

# Dependency graph
requires:
  - phase: 39-02
    provides: CombatService with attackTick(), CombatSession, processCombatTick()
  - phase: 39-01
    provides: CombatService with session tracking, combat:start handler

provides:
  - calculateAttackInterval(haste) pure function in game-logic/combat/damage.ts
  - Unit tests for calculateAttackInterval and calculateDamage (8 tests passing)
  - CombatService.attackTick() gated by Haste-based interval per-player
  - CombatSession.lastAttackAt field tracks last successful attack time

affects:
  - 39-04-player-death-respawn

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Haste-to-interval: interval = 1000 * (50 / haste), clamped 200ms-3000ms
    - Timing gate: attackTick() checks (now - lastAttackAt) < attackInterval before fetching creature
    - lastAttackAt: 0 init enables immediate first attack on combat start

key-files:
  created:
    - packages/game-logic/src/combat/damage.test.ts
  modified:
    - packages/game-logic/src/combat/damage.ts
    - apps/game-server/src/game/combat.service.ts

key-decisions:
  - "calculateAttackInterval uses linear scaling (interval = 1000 * BASE_HASTE / haste): doubling haste halves interval, consistent with haste stat semantics"
  - "Timing gate placed before creature lookup in attackTick(): avoids DB/zone read on skipped ticks — performance optimization"
  - "lastAttackAt initialized to 0: ensures first attack fires immediately on combat start regardless of Haste value"

# Metrics
duration: 4min
completed: 2026-02-19
---

# Phase 39 Plan 03: Haste-Based Attack Interval Summary

**calculateAttackInterval() pure function wires Haste stat to attack frequency; CombatService respects per-player timing so high-Haste players attack up to 5x/sec while low-Haste players attack every 3 seconds**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-02-19T11:37:23Z
- **Completed:** 2026-02-19T11:41:55Z
- **Tasks:** 3
- **Files modified:** 3 (1 created, 2 modified)

## Accomplishments

- Added `calculateAttackInterval(haste: number): number` pure function to `packages/game-logic/src/combat/damage.ts` with linear scaling formula, clamped to 200ms-3000ms range
- Created `packages/game-logic/src/combat/damage.test.ts` with 8 unit tests covering: base haste (1000ms), doubled haste (500ms), halved haste (2000ms), max clamp, min clamp, zero edge case, power affects damage output, toughness reduces damage
- Updated `CombatSession` interface with `lastAttackAt: number` field and initialized to 0 in `startCombat()`
- Rewrote `attackTick()` to compute player stats early, derive `attackInterval` from Haste, guard with timing check, and update `session.lastAttackAt` after each successful hit
- Fixed pre-existing `TS2353` bug: `{ health, active }` cast as `Partial<Creature>` since base `Entity` lacks `health` field

## Task Commits

Each task was committed atomically:

1. **Task 1: Add calculateAttackInterval() pure function** - `199bf4a` (feat)
2. **Task 2: Add unit tests for calculateAttackInterval() and calculateDamage()** - `b88394c` (test)
3. **Task 3: Add per-player attack timing to CombatService** - `ed4c337` (feat)

## Files Created/Modified

- `packages/game-logic/src/combat/damage.ts` - Added BASE_ATTACK_INTERVAL_MS, BASE_HASTE constants, and calculateAttackInterval() exported function
- `packages/game-logic/src/combat/damage.test.ts` - Created: 6 interval tests + 2 damage tests, all passing
- `apps/game-server/src/game/combat.service.ts` - Added calculateAttackInterval import, lastAttackAt to CombatSession, timing gate in attackTick(), Partial<Creature> cast fix

## Decisions Made

- `calculateAttackInterval` uses linear scaling `interval = 1000 * (50 / haste)`: doubling haste halves interval, directly consistent with haste semantics in character stats
- Timing gate placed before creature lookup in `attackTick()`: avoids zone/DB access on skipped ticks; early return is a performance optimization
- `lastAttackAt` initialized to `0`: ensures first attack fires immediately on combat start regardless of Haste value — players don't wait a full interval before first hit

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed pre-existing TS2353: health not in Partial<Entity>**
- **Found during:** Task 3 build verification
- **Issue:** `zonesService.updateEntity(..., { health, active })` object literal failed excess property check because base `Entity` interface does not have `health` (it's on `Creature`). Error was present before this plan.
- **Fix:** Cast the update object as `Partial<Creature>` — valid since `Partial<Creature>` is assignable to `Partial<Entity>` and updateEntity uses `Object.assign` at runtime
- **Files modified:** `apps/game-server/src/game/combat.service.ts` (same commit as Task 3)
- **Commit:** `ed4c337`

## Issues Encountered

None beyond the pre-existing TS2353 auto-fix above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Haste-based attack timing active: players will attack at different frequencies based on their Haste stat from equipped gear
- CombatService ready for Plan 04 (player death/respawn): stopCombat(), session cleanup, and creature kill detection all unchanged
- calculateAttackInterval exported from game-logic index via `export * from './combat/damage'` — available to any future consumer

## Self-Check: PASSED

- packages/game-logic/src/combat/damage.ts: FOUND
- packages/game-logic/src/combat/damage.test.ts: FOUND
- apps/game-server/src/game/combat.service.ts: FOUND
- .planning/phases/39-combat-core-and-damage-calculation/39-03-SUMMARY.md: FOUND (this file)
- Commit 199bf4a (Task 1): FOUND
- Commit b88394c (Task 2): FOUND
- Commit ed4c337 (Task 3): FOUND

---
*Phase: 39-combat-core-and-damage-calculation*
*Completed: 2026-02-19*
