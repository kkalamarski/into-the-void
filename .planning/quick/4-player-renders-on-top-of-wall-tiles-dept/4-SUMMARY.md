---
phase: quick-4
plan: 01
subsystem: rendering/depth-sorting
tags: [depth-sorting, isometric, player, rendering, fix]
dependency_graph:
  requires: []
  provides: [correct-entity-wall-depth-sorting]
  affects: [IsometricTransform, WorldScene, DepthSorter, EntityRenderer]
tech_stack:
  added: []
  patterns: [unified-depth-space, sub-row-entity-offset]
key_files:
  created: []
  modified:
    - apps/web/src/game/utils/IsometricTransform.ts
    - apps/web/src/game/scenes/WorldScene.ts
decisions:
  - "Unified depth space: removed ENTITY_LAYER_OFFSET=1000 so tiles and entities share the same depth band; entities get +0.5 offset to sit above floor tiles at same position but below wall tiles one row ahead"
  - "Local player priority boost reduced from 10 to 0.1: must stay << 64 (adjacent row diff) to not skip depth bands; 0.1 is enough as a same-position tiebreaker"
metrics:
  duration: 8 minutes
  completed_date: "2026-03-19T09:20:36Z"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 2
---

# Quick Task 4: Player Renders on Top of Wall Tiles — Depth Fix Summary

**One-liner:** Removed `ENTITY_LAYER_OFFSET=1000` blanket bump and replaced with `+0.5` sub-row entity offset so players correctly render behind wall tiles that are at a higher isometric row.

## What Was Done

### Root Cause

The `IsometricTransform.calculateDepth` method applied a +1000 depth offset to all entities
(`isEntity=true`). Since adjacent isometric rows differ by only 64 depth units
(`tileHeightHalf=64`), this meant a player at row N had depth ≈ N*64+1000, while a wall tile
15 rows in front had depth ≈ (N+15)*64 = N*64+960. The player always rendered on top of the
wall — clearly wrong.

### Fix

**Task 1 — IsometricTransform.ts:**

- Removed `ENTITY_LAYER_OFFSET = 1000` constant entirely.
- Replaced entity bump with `entityOffset = isEntity ? 0.5 : 0`.
- The value 0.5 is safely sub-row (0.5 << 64), so entities render above floor tiles at the
  same position but cannot jump to a higher row's depth band to override a wall tile.
- Updated JSDoc to document the unified depth model clearly.

**Task 2 — WorldScene.ts:**

- Changed `priorityBoost` from `10` to `0.1` in all three local player `calculateDepth` calls
  (lines ~817, ~2095, ~2191).
- With the layer offset removed, a boost of 10 would push the player above walls within
  ~0.15 rows (10/64). The new 0.1 boost is a safe same-position tiebreaker only.
- Did not change `updateTileTransparency()` — wall fading at 35% alpha still provides UX
  feedback when the player is correctly occluded behind a wall.
- Did not change DepthSorter's `localPlayerPriority=0.001` — already correct and compatible.

## Depth Model (After Fix)

```
depth = screen.y + (gridX * 0.0001) + (elevation * 0.1) + priorityBoost + entityOffset
```

Where:
- `screen.y = (gridX + gridY) * 64` — primary iso-row sort (64 units per row)
- `gridX * 0.0001` — tiebreaker: rightmost tile renders in front within same row
- `elevation * 0.1` — slight correction for elevated terrain (e.g., raised platforms)
- `priorityBoost` — `0.1` for local player (tiebreaker vs peer entities), `0` for others
- `entityOffset` — `0.5` for entities (above same-position floor), `0` for tiles

## Verification

Build passes:
```
npx nx run web:build — succeeded in 4.11s
```

## Deviations from Plan

None — plan executed exactly as written.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1    | 3dd36fc | fix(quick-4): remove ENTITY_LAYER_OFFSET and use 0.5 entity sub-row offset |
| 2    | f5b4ab7 | fix(quick-4): reduce local player priority boost from 10 to 0.1 in WorldScene |

## Self-Check: PASSED

Files exist:
- apps/web/src/game/utils/IsometricTransform.ts — FOUND
- apps/web/src/game/scenes/WorldScene.ts — FOUND

Commits verified in git log:
- 3dd36fc — FOUND
- f5b4ab7 — FOUND
