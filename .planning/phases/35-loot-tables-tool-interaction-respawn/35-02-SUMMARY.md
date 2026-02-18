---
phase: 35-loot-tables-tool-interaction-respawn
plan: 02
subsystem: items
tags: [items, tools, range, rarity, ItemDefinition, typescript]

# Dependency graph
requires:
  - phase: 33-entity-registry-and-definitions
    provides: items package established with ItemDefinition and all 15 tool definitions
provides:
  - ItemDefinition.range optional property (number, 1-10, tools only)
  - All 15 tools with rarity-gated range values (1/2/3/4/5)
affects:
  - 35-03 (EntityService.handleToolUse reads itemDef.range for distance validation)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Tool range encoded directly in ItemDefinition — no separate lookup table needed"

key-files:
  created: []
  modified:
    - packages/items/src/types.ts
    - packages/items/src/definitions/tools.ts

key-decisions:
  - "range placed after effects in ItemDefinition — tool-only optional property, undefined for non-tools"
  - "Rarity-to-range mapping: common=1, rare=2, epic=3, exotic=4, legendary=5 — linear scale, consistent across all three tool types"

patterns-established:
  - "Tool-specific properties are optional in ItemDefinition and only set on tool-category items"

# Metrics
duration: 3min
completed: 2026-02-18
---

# Phase 35 Plan 02: Tool Interaction Range Summary

**ItemDefinition extended with optional `range?: number` property; all 15 tools assigned rarity-tiered range values (common=1 through legendary=5) for entity interaction distance validation in Plan 35-03.**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-18T16:16:31Z
- **Completed:** 2026-02-18T16:19:32Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Added `readonly range?: number` to ItemDefinition interface with JSDoc explaining it is tool-only and ranges 1-10
- Added `range` property to all 15 tools: 5 mining, 5 combat, 5 research — each tier gets 1/2/3/4/5 tiles
- Package builds successfully; grep confirms exactly 15 `range:` occurrences in tools.ts

## Task Commits

Each task was committed atomically:

1. **Task 1: Add range property to ItemDefinition** - `c949af3` (feat)
2. **Task 2: Add range values to all 15 tools** - `313b453` (feat)

**Plan metadata:** (this commit)

## Files Created/Modified
- `packages/items/src/types.ts` - Added `readonly range?: number` after `effects` in ItemDefinition interface
- `packages/items/src/definitions/tools.ts` - Added `range:` to all 15 tool definitions with rarity-tiered values

## Decisions Made
- range property placed after `effects` in ItemDefinition, keeping tool-specific properties grouped at the end
- Linear 1/2/3/4/5 mapping applied uniformly across mining, combat, and research tools — no inter-type variance

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Plan 35-03 (EntityService.handleToolUse) can now look up `itemDef.range` directly from ItemRegistry
- The `itemDef?.range` pattern referenced in the plan's must_haves key_links is satisfied
- All tool definitions are complete and registered via ItemRegistry singleton

## Self-Check: PASSED

- FOUND: packages/items/src/types.ts
- FOUND: packages/items/src/definitions/tools.ts
- FOUND: .planning/phases/35-loot-tables-tool-interaction-respawn/35-02-SUMMARY.md
- FOUND commit c949af3 (Task 1: range property in ItemDefinition)
- FOUND commit 313b453 (Task 2: range values in all 15 tools)

---
*Phase: 35-loot-tables-tool-interaction-respawn*
*Completed: 2026-02-18*
