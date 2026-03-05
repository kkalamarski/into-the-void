---
phase: 118-ability-rebalance
plan: "01"
subsystem: game-logic
tags: [abilities, combat, shared-types, balance]

requires:
  - phase: 117-damage-types
    provides: DamageType union used in damage effects
provides:
  - Extended AbilityEffect union with stun, hazard_immunity, reflect, reveal variants
  - conditionBonus on damage effects, spreadRadius on dot effects
  - 13 rebalanced ability definitions with new effect types and values
affects: [118-02, 118-03, 118-04]

tech-stack:
  added: []
  patterns: [discriminated-union-extension]

key-files:
  created: []
  modified:
    - packages/shared-types/src/game/ability.ts
    - packages/game-logic/src/ability/definitions.ts

key-decisions:
  - "None - followed plan as specified"

patterns-established:
  - "conditionBonus pattern: optional field on damage effect for HP-threshold-based multipliers"
  - "spreadRadius pattern: optional field on dot effect for AoE chain spread"

requirements-completed: [ABIL-01, ABIL-02, ABIL-03, ABIL-04, ABIL-05, ABIL-06, ABIL-07, ABIL-08, ABIL-09, ABIL-10, ABIL-11, ABIL-12, ABIL-13]

duration: 5min
completed: 2026-03-04
---

# Plan 118-01: Types and Definitions Summary

**Extended AbilityEffect union with 4 new variants and rebalanced all 13 ability definitions with new effect types, damage types, and updated descriptions**

## Performance

- **Duration:** 5 min
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Added stun, hazard_immunity, reflect, reveal variants to AbilityEffect union
- Extended damage variant with conditionBonus and dot variant with spreadRadius
- Updated all 13 ability definitions with rebalanced values and new effect types
- All descriptions updated to reflect new mechanics

## Task Commits

1. **Task 1: Extend AbilityEffect union** - `6af027b` (feat)
2. **Task 2: Rebalance 13 ability definitions** - `fdc8c2f` (feat)

## Files Created/Modified
- `packages/shared-types/src/game/ability.ts` - Extended AbilityEffect union with 4 new variants
- `packages/game-logic/src/ability/definitions.ts` - 13 rebalanced ability definitions

## Decisions Made
None - followed plan as specified

## Deviations from Plan
None - plan executed exactly as written

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- AbilityEffect types ready for server-side handlers (Plan 02, 03)
- Definitions ready for client-side rendering (Plan 04)
- TypeScript compiles clean for both shared-types and game-logic

---
*Phase: 118-ability-rebalance*
*Completed: 2026-03-04*
