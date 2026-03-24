---
phase: 150-creature-ai-strategy
plan: 01
subsystem: game-logic
tags: [strategy-pattern, creature-ai, behavior, refactor]

requires:
  - phase: 149-ability-effect-strategy
    provides: established strategy pattern conventions for this milestone
provides:
  - CreatureBehaviorStrategy interface for creature behavior dispatch
  - 4 named behavior classes (HerbivoreBehavior, OmnivoreBehavior, PredatorBehavior, ManiacBehavior)
  - Behavior registry with register/get/init functions
  - creature-ai-helpers.ts shared utility module
affects: [creature-ai, ai-service]

tech-stack:
  added: []
  patterns: [strategy-pattern-for-behavior-dispatch, helper-extraction-for-circular-dependency-avoidance]

key-files:
  created:
    - packages/game-logic/src/ai/behaviors/types.ts
    - packages/game-logic/src/ai/behaviors/HerbivoreBehavior.ts
    - packages/game-logic/src/ai/behaviors/OmnivoreBehavior.ts
    - packages/game-logic/src/ai/behaviors/PredatorBehavior.ts
    - packages/game-logic/src/ai/behaviors/ManiacBehavior.ts
    - packages/game-logic/src/ai/behaviors/index.ts
    - packages/game-logic/src/ai/creature-ai-helpers.ts
  modified:
    - packages/game-logic/src/ai/creature-ai.ts
    - packages/game-logic/src/index.ts

key-decisions:
  - "Extracted helpers to creature-ai-helpers.ts to break circular dependency between creature-ai.ts and behaviors/"
  - "ManiacBehavior composes PredatorBehavior + frenzy detection rather than duplicating predator logic"
  - "OmnivoreBehavior delegates to PredatorBehavior when provoked (same as original tickOmnivore->tickPredator)"
  - "Registry auto-initializes on module load to preserve zero-config behavior for existing consumers"

patterns-established:
  - "Helper extraction pattern: when strategy classes need utilities from the file they replace, extract helpers to a separate -helpers.ts module"
  - "Composition over inheritance: ManiacBehavior wraps PredatorBehavior rather than extending it"

requirements-completed: [AI-01, AI-02]

duration: 8min
completed: 2026-03-24
---

# Phase 150: Creature AI Strategy Summary

**creature-ai.ts behavior dispatch refactored from switch statement to CreatureBehaviorStrategy pattern with 4 named behavior classes and auto-initializing registry**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-24T13:00:00Z
- **Completed:** 2026-03-24T13:08:00Z
- **Tasks:** 1
- **Files modified:** 9 (7 created, 2 modified)

## Accomplishments
- Replaced switch-on-behavior dispatch in tickCreatureAI with getBehaviorStrategy() registry lookup
- Created 4 distinct named strategy classes: HerbivoreBehavior, OmnivoreBehavior, PredatorBehavior, ManiacBehavior
- Extracted shared helper functions (moveToward, flee, tickWander, creatureToPlayerDist) to creature-ai-helpers.ts
- All pre-existing tests pass identically (209 passed, 6 pre-existing failures unchanged)

## Task Commits

1. **Task 1: Define CreatureBehaviorStrategy interface, create all 4 behavior classes, registry, and refactor creature-ai.ts** - `779e1f4` (fix)

## Files Created/Modified
- `packages/game-logic/src/ai/behaviors/types.ts` - CreatureBehaviorStrategy interface definition
- `packages/game-logic/src/ai/behaviors/HerbivoreBehavior.ts` - Flee from attackers/nearby players, otherwise wander
- `packages/game-logic/src/ai/behaviors/OmnivoreBehavior.ts` - Passive wander unless provoked, then predator behavior
- `packages/game-logic/src/ai/behaviors/PredatorBehavior.ts` - Aggro/chase/attack with leash logic
- `packages/game-logic/src/ai/behaviors/ManiacBehavior.ts` - Predator behavior + CRAI-04 frenzy detection
- `packages/game-logic/src/ai/behaviors/index.ts` - Registry with register/get/init + auto-initialization
- `packages/game-logic/src/ai/creature-ai-helpers.ts` - Shared helper functions and AiTickResult interface
- `packages/game-logic/src/ai/creature-ai.ts` - Refactored to use registry dispatch, re-exports helpers
- `packages/game-logic/src/index.ts` - Added behavior strategy exports

## Decisions Made
- Extracted helper functions to `creature-ai-helpers.ts` instead of keeping them in `creature-ai.ts` to break circular dependency (creature-ai imports from behaviors/, behaviors import helpers from creature-ai)
- ManiacBehavior composes PredatorBehavior via delegation rather than class inheritance -- simpler and matches the original code pattern where maniac added frenzy wrapper around predator logic
- Registry auto-initializes on module load to maintain zero-configuration behavior for ai.service.ts consumer

## Deviations from Plan

### Auto-fixed Issues

**1. [Circular Dependency] Created creature-ai-helpers.ts**
- **Found during:** Task 1 (initial implementation)
- **Issue:** creature-ai.ts importing from behaviors/index.ts, while behavior classes import helpers from creature-ai.ts created a circular dependency causing undefined exports at module load time
- **Fix:** Extracted AiTickResult interface, helper functions (moveToward, flee, tickWander, creatureToPlayerDist), and WANDER_CHANCE to creature-ai-helpers.ts. Behavior classes import from helpers, creature-ai.ts re-exports everything for backward compatibility.
- **Files modified:** packages/game-logic/src/ai/creature-ai-helpers.ts (new), packages/game-logic/src/ai/creature-ai.ts
- **Verification:** All 209 passing tests still pass, build succeeds
- **Committed in:** 779e1f4 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 circular dependency resolution)
**Impact on plan:** Necessary structural change to avoid circular dependency. No scope creep. Public API unchanged.

## Issues Encountered
- 6 pre-existing test failures in creature-ai.test.ts (tests create PlayerPublic fixtures without required px/py fields, causing NaN distance calculations). These failures exist on the original code before refactor and are unrelated to this phase.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Creature AI strategy pattern complete, ready for Phase 151 (Atmosphere & Weather Strategy)
- No blockers or concerns

---
*Phase: 150-creature-ai-strategy*
*Completed: 2026-03-24*
