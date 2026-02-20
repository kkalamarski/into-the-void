---
phase: 58-ability-content-and-polish
plan: 01
subsystem: game-logic
tags: [abilities, combat, items, content, game-balance]

# Dependency graph
requires:
  - phase: 56-ability-system-foundation
    provides: AbilityDefinition interface, ability execution infrastructure
  - phase: 57-buff-system
    provides: Buff effects for defensive/utility abilities
  - phase: 38-perception-gating-and-client-polish
    provides: Item definitions for tools and suits

provides:
  - 21 complete ability definitions across offensive/defensive/utility categories
  - Item-granted abilities for all tools (16 total) and suits (10 total)
  - Sci-fi naming conventions aligned with Terminus lore
  - Ability progression via item rarity tiers

affects: [combat-balance, item-progression, ability-ui, player-builds]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Ability content distributed across 3 categories: offensive (damage), defensive (survivability), utility (buffs/support)"
    - "Item rarity determines ability count: Common=1-2, Rare=2-3, Epic=3-4, Exotic=4-5, Legendary=5-6"
    - "Tool abilities match tool type: mining=extraction+damage, combat=offense, research=utility+analysis"
    - "Suit abilities focus on defensive/utility for survivability and support"

key-files:
  created: []
  modified:
    - packages/game-logic/src/ability/definitions.ts
    - packages/items/src/definitions/tools.ts
    - packages/items/src/definitions/suits.ts

key-decisions:
  - "Added 18 new abilities to reach 21 total (3 original + 18 new)"
  - "Offensive abilities use damage + DoT effects for variety"
  - "Defensive abilities use heal + buff effects for survivability"
  - "Utility abilities use buff effects for resource/combat enhancement"
  - "Mining tools grant heat-based extraction abilities (thermal_lance, plasma_burst)"
  - "Combat tools grant melee and ranged damage abilities"
  - "Research tools grant analysis and utility buffs"
  - "All suits grant at least one defensive ability"

patterns-established:
  - "Sci-fi naming: tech verbs (Deploy, Activate, Pulse) + sci-fi nouns (Plasma, Nano, Void)"
  - "Balance guidelines: higher energy cost = higher effect, longer cooldown = more powerful"
  - "Ability thematic matching: tool type determines granted ability category"

# Metrics
duration: 5min
completed: 2026-02-20
---

# Phase 58 Plan 01: Ability Content and Polish Summary

**21 ability definitions with Terminus sci-fi lore naming across 3 categories, all tools and suits grant abilities for item-based progression**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-20T19:34:54Z
- **Completed:** 2026-02-20T19:40:24Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- Created 18 new ability definitions reaching 21 total abilities
- Updated all 16 tools with grantedAbilities arrays matching tool type
- Updated all 10 suits with grantedAbilities arrays focused on defense
- Achieved sci-fi naming throughout (no fantasy terms)
- Established item-based ability progression via rarity tiers

## Task Commits

Each task was committed atomically:

1. **Task 1: Define 17+ New Abilities** - `a385321` (feat)
2. **Task 2: Update Tools with Granted Abilities** - `40d2467` (feat)
3. **Task 3: Update Suits with Granted Abilities** - `72af0d7` (feat)

## Files Created/Modified
- `packages/game-logic/src/ability/definitions.ts` - Added 18 new ability definitions (8 offensive, 6 defensive, 4 utility) with sci-fi naming
- `packages/items/src/definitions/tools.ts` - Added grantedAbilities to all 16 tools (mining=5, combat=5, research=5, universal=1)
- `packages/items/src/definitions/suits.ts` - Added grantedAbilities to all 10 suits (common=1-2, rare=2, epic=3, exotic=4, legendary=5)

## Ability Breakdown

**Offensive (11 total):** basic_strike, shield_bash, energy_pulse, electrocute, plasma_burst, concussive_strike, thermal_lance, void_drain, cryo_blast, overload_pulse, precision_shot

**Defensive (6 total):** nano_repair, magnetic_field, emergency_shield, regeneration_protocol, fortify_systems, energy_barrier

**Utility (4 total):** resource_scan, overclock, power_surge, analyze_specimen

## Item-Ability Mapping

**Mining tools:** Progressive from basic_strike (common) to 5 abilities (legendary), emphasizing heat-based extraction (thermal_lance, plasma_burst)

**Combat tools:** Progressive from basic_strike+shield_bash (common) to 6 abilities (legendary), covering melee and ranged combat

**Research tools:** Progressive from energy_pulse (common) to 5 abilities (legendary), emphasizing analysis and utility buffs

**Suits:** All grant defensive/utility abilities, from 1 (common) to 5 (legendary) for survivability

## Decisions Made

**Ability design:**
- Offensive abilities use damage + DoT/heal effects for variety (electrocute=damage+shock DoT, void_drain=damage+self-heal)
- Defensive abilities use heal + buff effects (nano_repair=instant heal, regeneration_protocol=heal-over-time, magnetic_field=toughness buff)
- Utility abilities use buff effects for enhancement (resource_scan=perception, overclock=haste, power_surge=power)

**Item progression:**
- Higher rarity items grant more abilities for build diversity
- Tool type determines ability category: mining=extraction+offense, combat=pure offense, research=utility+analysis
- Suits focus on defensive/utility for survivability and support

**Balance:**
- Energy costs: 10-30 (higher cost = more powerful)
- Cooldowns: 1500-25000ms (longer cooldown = more powerful or impactful)
- Ranges: 0-4 tiles (0=self-only buffs, 1+=targeted abilities)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## Next Phase Readiness

- All 21 abilities registered and ready for use
- All tools and suits grant abilities for item-based progression
- Ability system infrastructure complete (from Phase 56)
- Buff system integrated for defensive/utility abilities (from Phase 57)
- Ready for content polish and balance tuning (58-02)

## Self-Check

Verifying plan outputs:

**Ability count verification:**
- Expected: 20+ abilities (3 original + 17+ new)
- Actual: 21 abilities (verified in definitions.ts)
- Status: PASSED

**Tools with grantedAbilities:**
- Expected: All 16 tools
- Actual: 16 tools with grantedAbilities
- Status: PASSED

**Suits with grantedAbilities:**
- Expected: All 10 suits
- Actual: 10 suits with grantedAbilities
- Status: PASSED

**Commits verification:**
- Task 1 commit: a385321 (feat: add 18 new ability definitions)
- Task 2 commit: 40d2467 (feat: update all tools with granted abilities)
- Task 3 commit: 72af0d7 (feat: update all suits with granted abilities)
- Status: PASSED

**Build verification:**
- TypeScript compilation: SUCCESS
- All packages build successfully
- Status: PASSED

## Self-Check: PASSED

All success criteria met. Plan execution complete.

---
*Phase: 58-ability-content-and-polish*
*Completed: 2026-02-20*
