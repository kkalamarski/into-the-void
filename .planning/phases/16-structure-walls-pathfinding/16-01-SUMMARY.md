---
phase: 16-structure-walls-pathfinding
plan: 01
subsystem: game-logic/movement
tags: [elevation, pathfinding, validation, movement]
requires: [phase-14-elevation-system, heights-array]
provides: [validateMovementWithElevation, findPathWithElevation, elevation-based-movement]
affects: [movement-validation, pathfinding, gameplay-mechanics]
tech-stack:
  added: []
  patterns: [elevation-delta-check, uphill-cost-penalty]
key-files:
  created: []
  modified:
    - packages/game-logic/src/movement/validation.ts
    - packages/game-logic/src/movement/pathfinding.ts
    - packages/game-logic/src/index.ts
decisions:
  - "Elevation delta > 1 blocks movement (strict inequality)"
  - "Uphill cost = 0.5 per level climbed (flat/downhill = 1.0)"
  - "Elevation check runs before other validations (primary blocker)"
  - "Backward compatible - original functions unchanged"
metrics:
  duration: 104s
  tasks: 2
  files: 3
  commits: 2
  completed: 2026-02-16
---

# Phase 16 Plan 01: Elevation-Based Movement & Pathfinding Summary

Add elevation-aware movement validation and pathfinding with climb cost penalties.

## Overview

Extended movement validation and A* pathfinding to account for terrain elevation, blocking movement when slopes are too steep (delta > 1) and applying cost penalties for uphill pathfinding.

## Implementation Details

### Task 1: Elevation-Aware Movement Validation

**Commit:** de0d6d0

Added `validateMovementWithElevation` function that:
- Accepts `heights: number[][]` parameter
- Checks elevation delta BEFORE other validations (primary blocker)
- Blocks movement when `Math.abs(toHeight - fromHeight) > 1`
- Returns `{ valid: false, reason: 'Terrain too steep' }` for steep slopes
- Delegates remaining checks to original `validateMovement` for backward compatibility

**Key logic:**
```typescript
const fromHeight = heights[from.y]?.[from.x] ?? 0;
const toHeight = heights[to.y]?.[to.x] ?? 0;
const elevationDelta = Math.abs(toHeight - fromHeight);

if (elevationDelta > 1) {
  return { valid: false, reason: 'Terrain too steep' };
}
```

### Task 2: Elevation-Aware Pathfinding

**Commit:** ea75e4d

Added `findPathWithElevation` function that:
- Accepts `heights: number[][]` parameter
- Applies `ELEVATION_CLIMB_COST = 0.5` per level climbed
- Skips neighbors with elevation delta > 1 (too steep)
- Calculates dynamic move cost: `1.0 + (elevationDelta * 0.5)` for uphill
- Keeps flat/downhill movement at base cost of 1.0
- Exported both new functions from package index

**Key logic:**
```typescript
const elevationDelta = neighborHeight - currentHeight;

// Block if too steep
if (Math.abs(elevationDelta) > 1) {
  continue; // Skip this neighbor
}

// Add uphill cost penalty
let moveCost = 1.0;
if (elevationDelta > 0) {
  moveCost += elevationDelta * ELEVATION_CLIMB_COST;
}
```

## Deviations from Plan

None - plan executed exactly as written.

## Verification

**Build status:** PASSED
- `pnpm nx run game-logic:build` succeeded
- TypeScript compilation clean (warnings are pre-existing)

**Manual verification:**
- Elevation delta > 1 blocked in both validation and pathfinding
- Uphill cost penalty applied correctly (0.5 per level)
- Downhill/flat movement maintains base cost of 1.0
- Backward compatibility maintained (original functions unchanged)

## Success Criteria

- [x] validateMovementWithElevation blocks movement when elevation delta > 1
- [x] findPathWithElevation returns null when all paths require 2+ level jumps
- [x] Uphill paths cost more than flat paths (0.5 per level climbed)
- [x] Downhill paths cost same as flat (no penalty)
- [x] Original functions unchanged for backward compatibility

## Integration Points

**Upstream dependencies:**
- Phase 14: Elevation system (heights array generation)
- ChunkData interface with heights[][] field

**Downstream usage:**
- Movement handlers can use validateMovementWithElevation
- AI pathfinding can use findPathWithElevation
- Client prediction can incorporate elevation checks

## Performance Impact

- Minimal overhead: two array lookups per validation check
- Pathfinding: one additional array lookup per neighbor expansion
- No new data structures or significant memory allocation

## Next Steps

- Phase 16 Plan 02: Wall collision integration (elevation-blocking structures)
- Phase 16 Plan 03: Multi-tile structure pathfinding
- Consider adding elevation cost configuration (make ELEVATION_CLIMB_COST tunable)

## Self-Check: PASSED

**Created files:**
- None (extended existing files)

**Modified files:**
```bash
✓ packages/game-logic/src/movement/validation.ts
✓ packages/game-logic/src/movement/pathfinding.ts
✓ packages/game-logic/src/index.ts
```

**Commits exist:**
```bash
✓ de0d6d0: feat(16-01): add elevation-aware movement validation
✓ ea75e4d: feat(16-01): add elevation-aware pathfinding with climb cost
```

All files modified, commits created, and exports verified.
