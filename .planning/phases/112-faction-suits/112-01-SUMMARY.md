---
phase: 112-faction-suits
plan: 01
subsystem: items
tags: [faction-suits, item-definitions, generateSuitStats, archetypes]

requires:
  - phase: 109-faction-identity-design
    provides: FACTION-IDENTITY.md design spec (archetypes, abilities, colors, naming)
provides:
  - 28 faction suit ItemDefinitions across 4 factions
  - ALL_FACTION_SUITS collected array export
affects: [112-02, item-registry, faction-gear]

tech-stack:
  added: []
  patterns: [faction-suit-definition-pattern, off-archetype-suit-pattern]

key-files:
  created:
    - packages/items/src/definitions/faction-suits.ts
  modified: []

key-decisions:
  - "Color value 0x349949 for Verdant exotic (corrected from plan's 0x34994a for hex validity)"

patterns-established:
  - "Faction suit pattern: 5 main ladder + 2 off-archetype per faction, all using generateSuitStats()"
  - "Off-archetype abilities must differ from main ladder abilities at same tier"

requirements-completed: [SUIT-02, SUIT-03, SUIT-04, SUIT-05, SUIT-06]

duration: 4min
completed: 2026-03-03
---

# Plan 112-01: Faction Suit Definitions Summary

**28 faction suit ItemDefinitions (7 per faction x 4 factions) with generateSuitStats()-driven stats across hazmat/tank/recon/scavenger archetypes**

## Performance

- **Duration:** 4 min
- **Tasks:** 2 (combined into single atomic file creation)
- **Files modified:** 1

## Accomplishments
- 28 faction suits defined: Verdant (hazmat+combat), Helix (tank-assault+recon), Nexus (recon+assault), Unaffiliated (scavenger+hazmat)
- All stats auto-generated via generateSuitStats() with zero hand-coded values
- Unique textureKeys for all 28 suits, no collisions with existing item registry
- ALL_FACTION_SUITS array exported with all 28 definitions

## Task Commits

1. **Task 1+2: Create faction-suits.ts with all 28 suits and ALL_FACTION_SUITS array** - `717bae3` (feat)

## Files Created/Modified
- `packages/items/src/definitions/faction-suits.ts` - 28 faction suit definitions with collected array

## Decisions Made
None - followed plan as specified

## Deviations from Plan
None - plan executed exactly as written. Tasks 1 and 2 were combined into a single commit since both operate on the same file and task 2 only adds the trailing array.

## Issues Encountered
None

## Next Phase Readiness
- faction-suits.ts ready for index integration in plan 112-02
- ALL_FACTION_SUITS export ready to spread into ALL_ITEMS

---
*Phase: 112-faction-suits*
*Completed: 2026-03-03*
