---
phase: 30-type-foundation-pure-computation
plan: 02
subsystem: game-logic
tags: [typescript, game-logic, character-stats, pure-function, vitest]

# Dependency graph
requires:
  - phase: 30-01
    provides: CharacterStats and StatScaleTarget types in shared-types
  - phase: 25-item-data-model-foundation
    provides: ItemRegistry, EquipmentJson, ItemDefinition
provides:
  - computeCharStats pure function in packages/game-logic/src/stats/char-stats.ts
  - 4 vitest unit tests covering all STAT requirements
  - computeCharStats exported from @into-the-void/game-logic
affects:
  - 31-character-stats-server (server calls computeCharStats for authoritative stat computation)

# Tech tracking
tech-stack:
  added: [vitest (test runner — first tests in game-logic package)]
  patterns:
    - "computeCharStats(level, equipment, target) — pure function, linear scaling + equipment aggregation"
    - "SCALE_CONSTANTS[target] pattern — single record lookup for player vs creature scaling"
    - "vi.spyOn(ItemRegistry, 'get') pattern for mocking registry in tests"

key-files:
  created:
    - packages/game-logic/src/stats/char-stats.ts
    - packages/game-logic/src/stats/char-stats.test.ts
    - packages/game-logic/vitest.config.ts
  modified:
    - packages/game-logic/src/index.ts
    - packages/game-logic/project.json

key-decisions:
  - "Linear scaling formula: base + (level - 1) * growth — matches plan spec exactly"
  - "Equipment aggregation uses 'if (stat in stats)' guard to silently skip unknown stat names (old buff names deferred to Phase 31)"
  - "vitest.config.ts added to game-logic — was missing, required by @nx/vite:test executor"

patterns-established:
  - "computeCharStats: canonical stat computation imported from game-logic by server (Phase 31)"
  - "SCALE_CONSTANTS record keyed by StatScaleTarget — add new targets without modifying function"

# Metrics
duration: 3min
completed: 2026-02-18
---

# Phase 30 Plan 02: computeCharStats Pure Function Summary

**computeCharStats() pure function with linear level scaling (player/creature targets) and equipment bonus aggregation, backed by 4 vitest tests covering all STAT requirements**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-02-18T09:41:29Z
- **Completed:** 2026-02-18T09:45:03Z
- **Tasks:** 3
- **Files created:** 3 / modified: 2

## Accomplishments

- Implemented `computeCharStats(level, equipment, target)` in `packages/game-logic/src/stats/char-stats.ts`
- Linear scaling: `stat = base + (level - 1) * growth` for each of the 8 CharacterStats fields
- Separate SCALE_CONSTANTS for 'player' and 'creature' targets (different base/growth values)
- Equipment bonus aggregation follows the effectiveStats() pattern: collects all equipped items, resolves on_equip + passive effects, adds to stats with `if (stat in stats)` guard
- Created 4 vitest unit tests covering: STAT-01 (type completeness), STAT-02 (equipment bonuses), STAT-03 (level scaling), STAT-04 (creature vs player)
- Exported `computeCharStats` from `@into-the-void/game-logic` index for Phase 31 server use
- Full workspace build (`pnpm build`) passes for all 9 projects

## Task Commits

Each task was committed atomically:

1. **Task 1: Create computeCharStats pure function** - `1f0d894` (feat)
2. **Task 2: Create unit tests for computeCharStats** - `80ec3c7` (test)
3. **Task 3: Export computeCharStats from game-logic index** - `a66c196` (feat)

## Files Created/Modified

- `packages/game-logic/src/stats/char-stats.ts` - New: pure function with SCALE_CONSTANTS and equipment aggregation
- `packages/game-logic/src/stats/char-stats.test.ts` - New: 4 vitest tests covering all STAT requirements
- `packages/game-logic/vitest.config.ts` - New: vitest configuration (Rule 3 fix — was missing, blocked test run)
- `packages/game-logic/src/index.ts` - Added `export * from './stats/char-stats'` under new `// Stats` section
- `packages/game-logic/project.json` - Added `configFile` and `reportsDirectory` options to test target

## Decisions Made

- `SCALE_CONSTANTS` as a `Record<StatScaleTarget, { base, growth }>` — extending to new targets requires only adding a key, not modifying `computeCharStats`
- `(stats as unknown as Record<string, number>)[stat] += value` — double cast needed because CharacterStats has no index signature; `as unknown` is the TypeScript-correct pattern
- Equipment guard uses `if (stat in stats)` not `if (stat in CharacterStats)` — runtime check on the mutable stats object

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Missing vitest.config.ts for game-logic package**
- **Found during:** Task 2 (first test run)
- **Issue:** `@nx/vite:test` executor requires a vitest config file; game-logic had no vitest.config.ts and project.json lacked `configFile` option — executor failed with "Unable to load test config from config file undefined"
- **Fix:** Created `packages/game-logic/vitest.config.ts` with `environment: 'node'`, updated `project.json` test target with `configFile` and `reportsDirectory` options
- **Files modified:** `packages/game-logic/vitest.config.ts` (new), `packages/game-logic/project.json`
- **Commit:** `80ec3c7` (included in Task 2 commit)

## Issues Encountered

None beyond the vitest config deviation above.

## User Setup Required

None.

## Next Phase Readiness

- `computeCharStats` is importable from `@into-the-void/game-logic`
- Phase 31 (character-stats-server) can call `computeCharStats(character.level, equipment, 'player')` to get server-authoritative stats
- The `vitest` test infrastructure is now established in game-logic — future packages can follow the same pattern
- Blocker reminder: existing DB rows still have old 5-stat JSON shape — Phase 31 must include migration script

---
*Phase: 30-type-foundation-pure-computation*
*Completed: 2026-02-18*

## Self-Check: PASSED

- All 3 created files exist on disk (char-stats.ts, char-stats.test.ts, vitest.config.ts)
- index.ts modified and present
- All 3 task commits (1f0d894, 80ec3c7, a66c196) found in git history
- All 4 tests pass via `npx nx run game-logic:test`
- Full workspace build (`pnpm build`) passes for all 9 projects
