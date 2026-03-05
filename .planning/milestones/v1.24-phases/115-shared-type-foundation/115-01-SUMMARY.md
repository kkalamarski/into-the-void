---
phase: 115-shared-type-foundation
plan: "01"
subsystem: shared-types
tags: [typescript, damage-types, abilities, deployables, creature-ai]

requires:
  - phase: 114
    provides: existing shared-types and game-logic packages
provides:
  - DamageType union and DamageResistances interface in shared-types
  - NEUTRAL_RESISTANCES constant for default creature resistances
  - shield and damage_reduction AbilityEffect variants
  - DeployableEntity interface and 'deployable' EntityType
  - AiTickResult behavior signal fields (stampede, packCall, ambush, frenzied)
affects: [115-02, 116-stat-caps, 117-damage-types, 118-ability-rebalance, 119-creature-ai, 120-biome-hazards, 121-automation]

tech-stack:
  added: []
  patterns: [discriminated-union-extension, readonly-interfaces, optional-signal-fields]

key-files:
  created: []
  modified:
    - packages/shared-types/src/game/combat.ts
    - packages/shared-types/src/game/ability.ts
    - packages/shared-types/src/core/entity.ts
    - packages/game-logic/src/ai/creature-ai.ts

key-decisions:
  - "Used durationMs (not duration) for shield/damage_reduction to disambiguate from existing buff/debuff variants"
  - "AI signal fields are optional booleans — existing FSM code unaffected"

patterns-established:
  - "Damage type discriminated union: DamageType = 'Thermal' | 'Cryo' | 'Bio' | 'Kinetic'"
  - "Resistance interface with readonly number fields per damage type"

requirements-completed: [FNDN-01, FNDN-03, FNDN-04, FNDN-05]

duration: 3min
completed: 2026-03-03
---

# Plan 115-01: Type Contracts for v1.24 Systems Summary

**DamageType/DamageResistances, shield/damage_reduction AbilityEffect variants, DeployableEntity interface, and AiTickResult behavior signals added to shared-types and game-logic**

## Performance

- **Duration:** 3 min
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- DamageType union (Thermal/Cryo/Bio/Kinetic), DamageResistances interface, and NEUTRAL_RESISTANCES constant exported from combat.ts
- AbilityEffect union extended with shield (absorbAmount + durationMs) and damage_reduction (reductionPercent + durationMs) variants
- EntityType extended with 'deployable' and DeployableEntity interface added to entity.ts
- AiTickResult extended with stampede, packCall, ambush, frenzied optional boolean signal fields

## Task Commits

Each task was committed atomically:

1. **Task 115-01-01: Add type contracts to shared-types** - `057e21f` (feat)
2. **Task 115-01-02: Add AiTickResult signal fields** - `52a59db` (feat)

## Files Created/Modified
- `packages/shared-types/src/game/combat.ts` - Added DamageType, DamageResistances, NEUTRAL_RESISTANCES
- `packages/shared-types/src/game/ability.ts` - Added shield and damage_reduction AbilityEffect variants
- `packages/shared-types/src/core/entity.ts` - Added 'deployable' to EntityType, DeployableEntity interface
- `packages/game-logic/src/ai/creature-ai.ts` - Added stampede/packCall/ambush/frenzied to AiTickResult

## Decisions Made
None - followed plan as specified

## Deviations from Plan
None - plan executed exactly as written

## Issues Encountered
None

## Next Phase Readiness
- All type contracts landed for Phases 116-121
- Plan 115-02 can now add resistances field to CreatureDefinition and import DamageResistances/NEUTRAL_RESISTANCES

---
*Phase: 115-shared-type-foundation*
*Completed: 2026-03-03*
