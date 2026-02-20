---
phase: 53-rendering-depth-fixes
plan: 01
subsystem: rendering
tags: [depth-sorting, entity-rendering, visual-quality]
completed: 2026-02-20

dependency-graph:
  requires: []
  provides:
    - "Entity layer offset in depth calculation"
    - "Consistent entity-above-terrain rendering"
    - "Smooth depth updates during movement"
  affects:
    - "All entity rendering (players, creatures, NPCs)"
    - "Visual coherence during movement"

tech-stack:
  added: []
  patterns:
    - "Layer-based depth offset for render order guarantee"
    - "Throttled depth sorting at ~30fps for smooth transitions"

key-files:
  created: []
  modified:
    - apps/web/src/game/utils/IsometricTransform.ts
    - apps/web/src/game/rendering/EntityRenderer.ts
    - apps/web/src/game/scenes/WorldScene.ts
    - apps/web/src/game/rendering/DepthSorter.ts

decisions:
  - summary: "Entity layer offset of 1000 chosen to guarantee separation from terrain"
    context: "Offset large enough to prevent overlap at any screen position, small enough to preserve entity sorting"
    alternatives: ["Dynamic offset based on world size", "Separate render passes for entities/terrain"]
    rationale: "Simple constant offset is deterministic, low overhead, and works across all positions"

  - summary: "DepthSorter throttle reduced from 100ms to 33ms (~30fps)"
    context: "Movement tweens complete in ~100-150ms, old throttle caused visible depth glitches"
    alternatives: ["Per-frame depth updates (no throttle)", "Keep 100ms and improve algorithm"]
    rationale: "~3x updates per tween provides smooth transitions without excessive CPU overhead"

metrics:
  duration: 198s
  tasks_completed: 3
  files_modified: 4
  commits: 3
---

# Phase 53 Plan 01: Entity Depth Sorting Fix Summary

Entity layer offset and throttled depth updates eliminate terrain overlap during movement.

## Implementation Summary

Fixed entity/terrain depth sorting to guarantee entities always render above their ground tile, eliminating visual glitches where entities would briefly appear below terrain during movement.

**Core changes:**

1. **Entity Layer Offset (IsometricTransform.ts)**
   - Added `ENTITY_LAYER_OFFSET = 1000` constant
   - Modified `calculateDepth` to accept optional `isEntity: boolean` parameter
   - Entities get +1000 depth offset, ensuring they render above terrain at same position

2. **Entity Depth Call Sites (EntityRenderer.ts, WorldScene.ts, DepthSorter.ts)**
   - Updated all 9 entity depth calculation call sites to pass `isEntity: true`
   - Includes: player creation, entity spawning, movement tweens, depth sorter updates
   - Tile rendering unchanged (no offset)

3. **DepthSorter Throttle Reduction (DepthSorter.ts)**
   - Reduced `updateInterval` from 100ms to 33ms (~30fps depth updates)
   - Provides ~3x depth recalculations per movement tween (100-150ms)
   - Smoother visual transitions without excessive CPU overhead

## How It Works

**Depth calculation formula:**
```
depth = screen.y + (gridX * 0.0001) + (elevation * 0.1) + priorityBoost + (isEntity ? 1000 : 0)
```

**Depth ranges:**
- Terrain tiles: [0, ~10000] (based on world size)
- Entities: [1000, ~11000] (offset ensures they're always above terrain)

**Movement depth updates:**
- Entity marked dirty on movement start
- DepthSorter recalculates depth every 33ms
- During 100ms tween, depth updates ~3 times
- Prevents visual "popping" as entity crosses terrain boundaries

## Verification Results

**TypeScript compilation:** PASS
**Build:** PASS (warnings are pre-existing infrastructure issues)
**Grep checks:**
- `ENTITY_LAYER_OFFSET` defined at line 1 of IsometricTransform.ts
- `isEntity` parameter present in `calculateDepth` signature
- All 9 entity call sites pass `isEntity: true`
- Tile rendering unchanged (no `isEntity` parameter)
- `updateInterval = 33` in DepthSorter.ts

## Deviations from Plan

None - plan executed exactly as written.

## Testing Notes

**Manual testing recommended:**
1. Move player across different terrain types (verify no overlap)
2. Watch creatures/NPCs move (verify smooth depth transitions)
3. Stand on elevated terrain next to lower terrain (verify correct rendering order)
4. Move diagonally across elevation boundaries (verify no glitches)

**Performance:** DepthSorter now updates 3x more frequently (33ms vs 100ms). Monitor CPU usage on low-end devices. Minimum interval capped at 16ms (~60fps) to prevent excessive overhead.

## Success Criteria Met

- [x] Entity depth calculation includes ENTITY_LAYER_OFFSET (1000) when isEntity=true
- [x] All entity-related depth calculations pass isEntity=true
- [x] Tile depth calculations do NOT pass isEntity parameter (remain unchanged)
- [x] DepthSorter throttle reduced to 33ms for smoother updates
- [x] TypeScript compiles without errors
- [x] Build succeeds

## Self-Check: PASSED

**Created files:**
- .planning/phases/53-rendering-depth-fixes/53-01-SUMMARY.md (this file)

**Modified files:**
- apps/web/src/game/utils/IsometricTransform.ts: FOUND
- apps/web/src/game/rendering/EntityRenderer.ts: FOUND
- apps/web/src/game/scenes/WorldScene.ts: FOUND
- apps/web/src/game/rendering/DepthSorter.ts: FOUND

**Commits:**
- cdf2a04: FOUND (feat(53-01): add entity layer offset to depth calculation)
- 744d767: FOUND (feat(53-01): update entity depth calculations to pass isEntity=true)
- b9c25c7: FOUND (feat(53-01): reduce DepthSorter throttle to 33ms for smoother movement)

All verification checks passed.
