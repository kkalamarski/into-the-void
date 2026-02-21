---
phase: 62-calculation-parity
plan: 01
subsystem: equipment-stats
tags: [refactor, parity, shared-code, testing]
dependency-graph:
  requires: [59-01, 60-01, 61-01]
  provides: [shared-stat-extraction, client-server-parity]
  affects: [client-tooltips, server-stats, equipment-system]
tech-stack:
  added: [stat-helpers-module]
  patterns: [pure-functions, shared-calculation-logic]
key-files:
  created:
    - packages/game-logic/src/stats/stat-helpers.ts
    - packages/game-logic/src/stats/stat-helpers.test.ts
  modified:
    - packages/game-logic/src/index.ts
    - apps/web/src/components/ItemTooltip.tsx
decisions:
  - Shared stat extraction functions eliminate client/server drift
  - Type guard filters non-stat effects from equipment bonuses
  - Integration tests verify parity between tooltip predictions and actual server deltas
metrics:
  duration: 233s
  completed: 2026-02-21
---

# Phase 62 Plan 01: Calculation Parity Summary

**One-liner:** Shared stat extraction functions in game-logic ensure client tooltip predictions match server stat calculations exactly

## What Was Built

Created shared pure functions for equipment stat extraction and delta computation, eliminating calculation drift between client tooltips and server stat aggregation.

### Artifacts Created

1. **packages/game-logic/src/stats/stat-helpers.ts** (109 lines)
   - `extractItemStats(itemDef)` - Pure function extracting equipment stat bonuses
   - `computeEquipmentDelta(hoveredItem, equippedItem)` - Delta calculation for tooltips
   - Type guard `isCharacterStatKey()` filters non-stat effects
   - Both functions resolve on_equip and passive effects using existing `resolveEffectsForTrigger`

2. **packages/game-logic/src/stats/stat-helpers.test.ts** (272 lines)
   - 5 integration tests proving PARI-03 (client/server parity)
   - Tests verify `extractItemStats` matches `computeCharStats` deltas
   - Tests verify `computeEquipmentDelta` matches server swap calculations
   - Edge cases: empty stats, non-stat filtering, unequip scenarios

3. **Refactored apps/web/src/components/ItemTooltip.tsx**
   - Removed 36 lines of local `extractStatBonuses()` implementation
   - Removed local `computeStatDeltas()` implementation
   - Now imports and uses shared functions from `@into-the-void/game-logic`
   - Zero functional changes - identical tooltip behavior

### Integration Points

- **Client → Shared:** ItemTooltip imports extractItemStats, computeEquipmentDelta
- **Server → Shared:** computeCharStats already uses resolveEffectsForTrigger (same underlying logic)
- **Package Exports:** game-logic/index.ts exports stat-helpers alongside char-stats

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

All verification criteria satisfied:

**PARI-01: Shared functions exist**
```bash
$ grep "export function" packages/game-logic/src/stats/stat-helpers.ts
22:export function extractItemStats(itemDef: ItemDefinition): Partial<CharacterStats>
65:export function computeEquipmentDelta(...)
```

**PARI-02: Client uses shared functions**
```bash
$ grep "import.*extractItemStats" apps/web/src/components/ItemTooltip.tsx
16:import { extractItemStats, computeEquipmentDelta, AbilityRegistry } from '@into-the-void/game-logic';
```

**PARI-03: Integration tests prove parity**
```bash
$ pnpm nx test game-logic
✓ src/stats/stat-helpers.test.ts (5 tests) 2ms
Test Files  4 passed (4)
Tests       24 passed (24)
```

**Full build succeeds:**
```bash
$ pnpm build
NX   Successfully ran target build for 12 projects
```

## Self-Check: PASSED

**Created files verified:**
```bash
$ [ -f "packages/game-logic/src/stats/stat-helpers.ts" ] && echo "FOUND"
FOUND
$ [ -f "packages/game-logic/src/stats/stat-helpers.test.ts" ] && echo "FOUND"
FOUND
```

**Commits verified:**
```bash
$ git log --oneline --all | grep -E "(de4e45d|f48c9b0|929ea63)"
de4e45d feat(62-01): create shared stat extraction functions in game-logic package
f48c9b0 refactor(62-01): use shared stat functions in ItemTooltip
929ea63 test(62-01): add integration tests for client/server stat parity (PARI-03)
```

**Modified files verified:**
```bash
$ grep -q "stat-helpers" packages/game-logic/src/index.ts && echo "EXPORT FOUND"
EXPORT FOUND
$ grep -q "extractItemStats" apps/web/src/components/ItemTooltip.tsx && echo "IMPORT FOUND"
IMPORT FOUND
```

All artifacts created, all tests passing, all integration points verified.

## Technical Notes

### Design Decisions

1. **Type Guard for CharacterStats Keys**
   - `isCharacterStatKey()` prevents non-stat effects (health, healthPercent) from leaking into stat calculations
   - Emergency reboot's `healPercent` correctly filtered out
   - Maintains type safety with `keyof CharacterStats`

2. **Pure Function Strategy**
   - Both functions are pure (no side effects, no DB calls)
   - Same inputs always produce same outputs
   - Enables identical behavior on client and server

3. **Reusing Existing Infrastructure**
   - Uses `resolveEffectsForTrigger` from inventory/effects.ts
   - Follows same aggregation pattern as `computeCharStats`
   - No new effect resolution logic needed

### Test Coverage

Integration tests prove:
- Single item: client extraction = server delta
- Item swap: client delta = server swap delta
- Empty items: returns {}
- Mixed effects: filters non-stats correctly
- Unequip scenario: handles undefined equippedItem

### Performance Impact

- Zero performance impact - functions are pure and lightweight
- Client tooltips already called similar local functions
- Server continues using existing `computeCharStats` path
- Shared code reduces bundle size slightly (eliminated duplicate logic)

## Next Steps

Phase 62 Plan 02 will verify server-side services use `computeCharStats` consistently (PARI-04).

## Key Files

**Created:**
- `/Users/krzysztof.kalamarski/Projects/into-the-void/packages/game-logic/src/stats/stat-helpers.ts`
- `/Users/krzysztof.kalamarski/Projects/into-the-void/packages/game-logic/src/stats/stat-helpers.test.ts`

**Modified:**
- `/Users/krzysztof.kalamarski/Projects/into-the-void/packages/game-logic/src/index.ts`
- `/Users/krzysztof.kalamarski/Projects/into-the-void/apps/web/src/components/ItemTooltip.tsx`

## Commits

- `de4e45d`: feat(62-01): create shared stat extraction functions in game-logic package
- `f48c9b0`: refactor(62-01): use shared stat functions in ItemTooltip
- `929ea63`: test(62-01): add integration tests for client/server stat parity (PARI-03)
