---
phase: 36-creature-ai-wander-behavior-tick
plan: 02
subsystem: game-logic
tags: [ai, creature, fsm, herbivore, wander, flee, game-logic]

# Dependency graph
requires:
  - phase: 33-creature-behavior-types
    provides: CreatureBehavior type (herbivore|omnivore|predator|maniac)
  - phase: 36-creature-ai-wander-behavior-tick
    plan: 01
    provides: AiService tick loop that will call tickCreatureAI
provides:
  - Pure tickCreatureAI FSM function in game-logic
  - AiTickResult interface (newPosition: Position | null)
  - Herbivore flee behavior within 5-tile Chebyshev radius
  - 25% chance wander for omnivore/predator/maniac types
affects:
  - 36-03 (game-server integration of tickCreatureAI into AiService tick loop)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Pure function FSM: tickCreatureAI computes movement decisions with no side effects
    - Flee with fallback chain: diagonal flee -> cardinal fallbacks -> last-resort backtrack
    - Behavior dispatch via switch on CreatureBehavior string literal union

key-files:
  created:
    - packages/game-logic/src/ai/creature-ai.ts
  modified:
    - packages/game-logic/src/index.ts

key-decisions:
  - "tickCreatureAI is a pure function — callers (AiService) apply the result; no mutations inside"
  - "Flee attempts diagonal first, then cardinal only x, then cardinal only y, then partial backtrack — avoids creatures getting stuck in corners"
  - "ZONE_SIZE bounds check uses nx >= 0 && nx < ZONE_SIZE (not isWithinZoneBounds) to avoid zone-transition semantics — creatures do not cross zone boundaries"

patterns-established:
  - "AI FSM pattern: behavior switch dispatches to private strategy functions"
  - "Flee fallback chain: preferred direction -> partial directions -> last-resort reverse"

# Metrics
duration: 2min
completed: 2026-02-18
---

# Phase 36 Plan 02: Creature AI Pure FSM Summary

**tickCreatureAI pure function in game-logic: herbivore flee (5-tile Chebyshev radius) and 25% wander for all behavior types, with zone-bounds and collision-map guards**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-02-18T20:20:51Z
- **Completed:** 2026-02-18T20:22:10Z
- **Tasks:** 2
- **Files modified:** 2 (1 created, 1 modified)

## Accomplishments

- Created `packages/game-logic/src/ai/creature-ai.ts` with complete pure FSM implementation
- Herbivore behavior: flees from the closest player within 5-tile Chebyshev distance with a 5-attempt fallback chain
- Wander behavior: 25% chance per tick for omnivore/predator/maniac types using shuffled DIRECTION_VECTORS
- Exported `tickCreatureAI` and `AiTickResult` from `@into-the-void/game-logic` index

## Task Commits

Each task was committed atomically:

1. **Task 1: Create creature-ai.ts with tickCreatureAI pure FSM** - `1888696` (feat)
2. **Task 2: Export creature-ai module from game-logic index** - `827d3cd` (feat)

## Files Created/Modified

- `packages/game-logic/src/ai/creature-ai.ts` - Pure FSM: tickCreatureAI, flee, tickWander, AiTickResult
- `packages/game-logic/src/index.ts` - Added `export * from './ai/creature-ai'`

## Decisions Made

- `tickCreatureAI` is a pure function — callers (AiService) apply the result; no mutations inside the function.
- Flee attempts use a 5-step fallback chain: `{dx,dy}` → `{dx,0}` → `{0,dy}` → `{-dx,0}` → `{0,-dy}`. This prevents herbivores from getting stuck in wall corners by trying partial and reversed directions.
- Zone bounds check uses direct `nx >= 0 && nx < ZONE_SIZE` rather than `isWithinZoneBounds` (which wraps zone ID logic). Creatures must not cross zone boundaries during a tick.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. The `npx nx run game-logic:build` lockfile pruning warnings are pre-existing (pnpm workspace package resolution issue in nx's pruner, not a TypeScript error). Build reports "Successfully ran target build" in all cases.

## Next Phase Readiness

- `tickCreatureAI` and `AiTickResult` are importable from `@into-the-void/game-logic`
- Plan 36-03 (game-server AiService integration) can now call `tickCreatureAI` from within the zone tick loop
- No blockers

---
*Phase: 36-creature-ai-wander-behavior-tick*
*Completed: 2026-02-18*

## Self-Check: PASSED

- FOUND: packages/game-logic/src/ai/creature-ai.ts
- FOUND: packages/game-logic/src/index.ts
- FOUND: commit 1888696 (feat(36-02): create tickCreatureAI pure FSM)
- FOUND: commit 827d3cd (feat(36-02): export creature-ai from index)
