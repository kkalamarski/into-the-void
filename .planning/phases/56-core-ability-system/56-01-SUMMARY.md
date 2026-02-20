---
phase: 56-core-ability-system
plan: "01"
subsystem: game-logic
tags: [abilities, combat, item-effects, typescript]

# Dependency graph
requires:
  - phase: 06-items
    provides: ItemRegistry pattern and ItemDefinition interface
  - phase: 07-stats
    provides: Energy stat for ability cost
  - phase: 09-combat
    provides: Combat system foundation
provides:
  - AbilityDefinition type with category, cost, cooldown, range, effects
  - AbilityRegistry singleton for ability lookup
  - grantedAbilities field on items
  - 3 starter abilities (basic_strike, shield_bash, energy_pulse)
affects: [56-02, 56-03, server-validation, action-bar-ui]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Ability registry mirroring ItemRegistry singleton pattern
    - Discriminated union for AbilityEffect type safety
    - Item-granted abilities as differentiator (not skill trees)

key-files:
  created:
    - packages/shared-types/src/game/ability.ts
    - packages/game-logic/src/ability/ability-registry.ts
    - packages/game-logic/src/ability/definitions.ts
  modified:
    - packages/shared-types/src/index.ts
    - packages/game-logic/src/index.ts
    - packages/items/src/types.ts
    - packages/items/src/definitions/tools.ts

key-decisions:
  - "AbilityEffect uses discriminated union for type-safe effect handling"
  - "Abilities granted by items via grantedAbilities array of IDs"
  - "Starter Multi-Tool grants basic_strike, Stun Rod grants basic_strike+shield_bash, Field Scanner grants energy_pulse"

patterns-established:
  - "AbilityRegistry singleton mirrors ItemRegistry for consistency"
  - "Effects use readonly discriminated unions for immutability"
  - "Tools grant abilities based on specialization (combat/research)"

# Metrics
duration: 191s
completed: 2026-02-20
---

# Phase 56 Plan 01: Ability Type System Summary

**AbilityDefinition type with category/cost/cooldown/effects, AbilityRegistry singleton, and 3 starter abilities granted by tools**

## Performance

- **Duration:** 3min 11s
- **Started:** 2026-02-20T18:20:43Z
- **Completed:** 2026-02-20T18:23:54Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments
- Created AbilityDefinition interface with all required fields for ability metadata
- Built AbilityRegistry singleton with get/has/getAll methods mirroring ItemRegistry pattern
- Defined 3 starter abilities covering combat (basic_strike, shield_bash) and research (energy_pulse)
- Added grantedAbilities field to ItemDefinition enabling items to declare abilities
- Connected starter tools to abilities (Multi-Tool → basic_strike, Stun Rod → combat abilities, Field Scanner → energy_pulse)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add AbilityDefinition type to shared-types** - `7d6e24e` (feat)
2. **Task 2: Create AbilityRegistry with starter abilities** - `e6688b4` (feat)
3. **Task 3: Add grantedAbilities to ItemDefinition and update starter tools** - `5be0cee` (feat)

## Files Created/Modified
- `packages/shared-types/src/game/ability.ts` - AbilityDefinition, AbilityCategory, AbilityEffect types
- `packages/game-logic/src/ability/ability-registry.ts` - Singleton registry for ability lookups
- `packages/game-logic/src/ability/definitions.ts` - 3 starter ability definitions
- `packages/shared-types/src/index.ts` - Export ability types
- `packages/game-logic/src/index.ts` - Export AbilityRegistry
- `packages/items/src/types.ts` - Added grantedAbilities field to ItemDefinition
- `packages/items/src/definitions/tools.ts` - Added ability grants to 3 starter tools

## Decisions Made

- **AbilityEffect discriminated union:** Chose readonly discriminated union over class hierarchy for type-safe effect handling and immutability
- **Item-granted abilities:** Abilities are granted by equipped items (tools/suits), not learned via skill trees - this differentiates gear choices
- **Registry pattern:** Mirrored ItemRegistry singleton pattern for consistency across codebase
- **Starter tool abilities:** Multi-Tool (universal) grants basic strike, Stun Rod (combat) grants strike+bash, Field Scanner (research) grants energy pulse

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all packages compiled successfully. NX lockfile warnings are expected in this environment and do not affect builds.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- AbilityDefinition type system complete and exported from shared-types
- AbilityRegistry ready for server-side validation lookups
- Items can now declare abilities via grantedAbilities field
- Ready for Plan 02 (server validation) and Plan 03 (client UI)
- All builds passing, no blockers

## Self-Check: PASSED

All claimed files and commits verified:
- Created files: ability.ts, ability-registry.ts, definitions.ts - all exist
- Task commits: 7d6e24e, e6688b4, 5be0cee - all present in git history

---
*Phase: 56-core-ability-system*
*Completed: 2026-02-20*
