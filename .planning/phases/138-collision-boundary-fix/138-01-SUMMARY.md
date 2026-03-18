---
phase: 138-collision-boundary-fix
plan: 01
subsystem: collision
tags: [collision, chunk-boundary, pixel-movement, client, server]
dependency_graph:
  requires: []
  provides: [seamless-chunk-boundary-collision]
  affects: [WorldScene, MovementService, ZonesService]
tech_stack:
  added: []
  patterns: [cross-chunk collision lookup, zone-local to world coordinate conversion]
key_files:
  created: []
  modified:
    - apps/web/src/game/scenes/WorldScene.ts
    - apps/game-server/src/game/movement.service.ts
    - apps/game-server/src/zones/zones.service.ts
decisions:
  - "Used existing isWorldTileBlocked in WorldScene.ts rather than rewriting; method already handles multi-chunk lookup"
  - "Zone offset captured at callback-creation time to avoid repeated parseZoneCoords calls per frame"
  - "isWorldTileBlocked returns true for unloaded chunks — conservative but correct; 3x3 preload prevents players hitting this"
metrics:
  duration: 136s
  completed: "2026-03-18"
  tasks_completed: 2
  files_modified: 3
---

# Phase 138 Plan 01: Collision Boundary Fix Summary

**One-liner:** Fixed cross-chunk invisible walls by routing collision callbacks through world-coordinate resolvers on both client and server.

## What Was Done

The `PixelMovementController` calls `isSolid(tileX, tileY)` with zone-local tile coordinates. When the player's AABB hitbox extended past a zone boundary, these coordinates became negative or >= 64 (ZONE_SIZE), and the `?? true` fallback returned `true` (solid wall). This created invisible barriers at every chunk and zone boundary.

### Client Fix (WorldScene.ts)

`setCollisionMap` now captures the current zone's world offset (`offsetX`, `offsetY`) and wraps the collision callback to convert zone-local tile coordinates to world tile coordinates before calling `isWorldTileBlocked`. The `loadZoneFromState` inline callback was replaced with a call to `setCollisionMap` (DRY).

`isWorldTileBlocked` already handles cross-chunk lookups correctly by computing `z_X_Y` from world tile coordinates and using `ChunkManager.getChunk()`.

### Server Fix (zones.service.ts + movement.service.ts)

`ZonesService.isWorldTileBlocked(worldX, worldY)` was added — mirrors the client's logic using `getChunkSync` for the resolved zone. `MovementService.tick()` now captures the zone offset from `parseZoneCoords` and uses `zonesService.isWorldTileBlocked(offsetX + tx, offsetY + ty)` instead of the inline `chunk.collisions[ty]?.[tx] ?? true`. A `parseZoneCoords` helper was added to `MovementService`.

## Task Results

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Fix client-side collision callback | f516369 | WorldScene.ts |
| 2 | Fix server-side collision callback | 148089c | movement.service.ts, zones.service.ts |

## Deviations from Plan

None - plan executed exactly as written.

## Success Criteria Verification

- [x] Client collision callback in `setCollisionMap` and `loadZoneFromState` routes through `isWorldTileBlocked` with zone-to-world coordinate translation
- [x] Server collision callback in `MovementService.tick` routes through `ZonesService.isWorldTileBlocked` with zone-to-world coordinate translation
- [x] No remaining `collisionMap[ty]?.[tx] ?? true` inline callbacks in the collision code paths
- [x] Both `web:build` and `game-server:build` pass

## Self-Check: PASSED

Files exist:
- apps/web/src/game/scenes/WorldScene.ts: FOUND
- apps/game-server/src/game/movement.service.ts: FOUND
- apps/game-server/src/zones/zones.service.ts: FOUND

Commits exist:
- f516369: FOUND
- 148089c: FOUND
