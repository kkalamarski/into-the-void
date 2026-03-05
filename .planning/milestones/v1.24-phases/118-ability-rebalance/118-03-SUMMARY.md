---
phase: 118-ability-rebalance
plan: "03"
subsystem: game-server
tags: [abilities, combat, aoe, reflect, reveal]

requires:
  - phase: 118-02
    provides: Shield intercept, DR, stun state maps in AbilityService
provides:
  - AoE damage handler for Overload Pulse (hit all creatures in range without target)
  - DoT chain spread handler for Electrocute (spread to nearby creatures)
  - Reveal handler for Precision Shot (mark predators as revealed in cone)
  - Reflect state map and getReflectDamage() for Magnetic Field
  - getNearbyCreatures helper utility for spatial queries
affects: [118-04]

tech-stack:
  added: []
  patterns: [aoe-vs-single-target-branching, spatial-query-helper, reflect-intercept]

key-files:
  created: []
  modified:
    - apps/game-server/src/game/ability.service.ts
    - apps/game-server/src/game/combat.service.ts

key-decisions:
  - "AoE damage handler restructures existing damage effect block with requiresTarget check as branch guard"
  - "Reflect damage in combat.service.ts runs after player HP update to properly reflect final damage"

patterns-established:
  - "getNearbyCreatures: reusable Chebyshev distance filter for active creatures"
  - "AoE branch guard: `if (!ability.requiresTarget)` splits damage handler into AoE vs single-target paths"
  - "Reflect intercept: CombatService calls abilityService.getReflectDamage() after applying damage to player"

requirements-completed: [ABIL-04, ABIL-05, ABIL-06, ABIL-11]

duration: 8min
completed: 2026-03-04
---

# Plan 118-03: Server-Side Offensive Mechanics Summary

**Implemented AoE pulse, DoT chain spread, predator reveal cone, and damage reflect with proper creature death handling**

## Performance

- **Duration:** 8 min
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Added getNearbyCreatures private helper for Chebyshev-distance spatial queries
- Restructured damage handler with AoE branch for Overload Pulse (hits all creatures in range)
- Added DoT spread handler for Electrocute (chains to nearby creatures within spreadRadius)
- Added reveal handler for Precision Shot (marks predators as revealed, auto-clears after duration)
- Added activeReflects state map and reflect handler for Magnetic Field (30% damage reflect)
- Added getReflectDamage() public method for CombatService integration
- Wired reflect damage into creatureAttackTick with proper death handling (loot, XP, despawn)
- Updated handleDisconnect to clean activeReflects

## Task Commits

1. **Task 1: AoE helpers, DoT spread, reveal, and reflect in AbilityService** - `a13a601` (feat)
2. **Task 2: Wire reflect damage into CombatService.creatureAttackTick** - `53b34a4` (feat)

## Files Created/Modified
- `apps/game-server/src/game/ability.service.ts` - getNearbyCreatures, AoE branch, DoT spread, reveal, reflect handlers
- `apps/game-server/src/game/combat.service.ts` - Reflect damage intercept in creatureAttackTick

## Decisions Made
- AoE damage handler uses `!ability.requiresTarget` as guard, preserving single-target path in else branch
- Reflect damage applied after player HP update to reflect final (post-shield, post-DR) damage

## Deviations from Plan
None - plan executed exactly as written

## Issues Encountered
None

## User Setup Required
None

## Next Phase Readiness
- All offensive mechanics are server-side complete
- Reflect integrates cleanly with existing shield/DR pipeline
- TypeScript compiles clean for game-server

---
*Phase: 118-ability-rebalance*
*Completed: 2026-03-04*
