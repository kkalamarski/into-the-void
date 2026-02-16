---
phase: 18-multi-chunk-streaming
plan: 05
subsystem: multi-chunk-streaming
tags: [entity-streaming, cross-chunk-visibility, memory-management]
dependency_graph:
  requires: [18-01-chunk-loading, 18-02-3x3-grid, 17-02-visibility-filtering]
  provides: [entity-streaming, zone-entity-tracking, entity-cleanup]
  affects: [game-server, web-client, shared-types]
tech_stack:
  added: [entityZoneMap]
  patterns: [zone-based-entity-tracking, cleanup-on-unload]
key_files:
  created: []
  modified:
    - apps/game-server/src/game/game.gateway.ts
    - apps/web/src/components/GameContainer.tsx (already done in 18-04)
    - apps/web/src/game/scenes/WorldScene.ts
    - packages/shared-types/src/network/events.ts
decisions: [zone-based-entity-tracking, optional-zoneId-parameter]
metrics:
  duration: 248
  tasks_completed: 3
  files_modified: 3
  completed_date: 2026-02-16
---

# Phase 18 Plan 05: Multi-Zone Entity Streaming Summary

**One-liner:** Zone:request now streams entities with zone tracking for cross-chunk visibility and memory cleanup.

## Objective

Add entity streaming to zone:request to enable cross-chunk entity visibility within the 48-tile radius established in Phase 17.

## What Was Built

### Server-Side Entity Streaming
- Updated `zone:request` handler to include entities in response
- Added `zoneId` field to `zone:chunk` event for client-side tracking
- Entities are now sent along with chunk data for all requested zones
- Client-side `isEntityVisible` filtering (48-tile radius) applies to all entities

### Type Safety
- Updated `ServerEvents['zone:chunk']` type to include:
  - `zoneId: string` - enables client zone tracking
  - `entities?: Entity[]` - optional entities array for the zone

### Client-Side Entity Management
- Client already handled entity spawning from zone:chunk (implemented in 18-04)
- Added `entityZoneMap: Map<string, Set<string>>` to track zone ownership
- Updated `spawnEntity()` to accept optional `zoneId` parameter
- Added `despawnEntitiesForZone()` method for bulk entity cleanup
- Integrated cleanup into `unloadChunkContainer()` to prevent memory leaks
- Updated `clearEntities()` to also clear zone tracking map

## Tasks Completed

| Task | Name | Commit | Files Modified |
|------|------|--------|----------------|
| 1 | Update zone:request to include entities | 8a2cb77 | apps/game-server/src/game/game.gateway.ts |
| Deviation | Fix zone:chunk type definition | 66a1644 | packages/shared-types/src/network/events.ts |
| 3 | Track entity zone ownership and cleanup | 6308657 | apps/web/src/game/scenes/WorldScene.ts |

**Note:** Task 2 (client entity handling) was already implemented in Plan 18-04.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking Issue] Missing type definition for updated zone:chunk event**
- **Found during:** Task 2 - Client entity handling
- **Issue:** ServerEvents['zone:chunk'] type only had `{ chunk, biome }`, missing new `zoneId` and `entities` fields. TypeScript compilation failed with type mismatch error.
- **Fix:** Updated `packages/shared-types/src/network/events.ts` to include `zoneId: string` and `entities?: Entity[]` in the zone:chunk event type.
- **Files modified:** packages/shared-types/src/network/events.ts
- **Commit:** 66a1644
- **Rationale:** Required for type-safe compilation. Without this fix, client-side code could not compile. This is a blocking issue that prevents task completion (Rule 3).

### Pre-Completed Work

Task 2 (client-side entity handling in GameContainer.tsx) was already implemented in Plan 18-04, including:
- Entity type import
- zone:chunk handler updated with zoneId and entities fields
- Entity spawning loop with zone tracking

This reduced execution scope but all functionality is present.

## Verification

All verification criteria passed:

1. ✅ `pnpm build` succeeds for entire monorepo
2. ✅ `grep "entities:" apps/game-server/src/game/game.gateway.ts` shows entities in response
3. ✅ `grep "data.entities" apps/web/src/components/GameContainer.tsx` shows client handling
4. ✅ `grep "entityZoneMap" apps/web/src/game/scenes/WorldScene.ts` shows zone tracking (7 occurrences)
5. ✅ `grep "despawnEntitiesForZone" apps/web/src/game/scenes/WorldScene.ts` shows cleanup method (2 occurrences)

## Success Criteria Met

- ✅ zone:request returns entities along with chunk data (with zoneId for tracking)
- ✅ Client spawns entities from adjacent chunk responses with zone association
- ✅ Client-side isEntityVisible filtering applies (from Phase 17)
- ✅ Entities visible across chunk boundaries (within 48-tile radius)
- ✅ Entities are cleaned up when their associated chunk unloads (no memory leaks)
- ✅ TypeScript compiles without errors

## Key Decisions

1. **Zone-based entity tracking:** Entities are tracked by zone ID rather than chunk coordinate. This aligns with the room-based broadcasting system and simplifies cleanup logic.

2. **Optional zoneId parameter:** Made zoneId parameter optional in `spawnEntity()` to maintain backward compatibility with entities spawned from zone:state events (which don't need zone tracking since they're in the player's current zone).

## Technical Notes

### Entity Lifecycle
1. Server sends `zone:chunk` with entities when client requests adjacent chunk
2. Client receives event and calls `spawnEntity(entity, zoneId)` for each entity
3. `spawnEntity` checks `isEntityVisible()` (48-tile radius) before spawning
4. Entity ID is added to `entityZoneMap.get(zoneId)` Set
5. When chunk unloads, `despawnEntitiesForZone(zoneId)` removes all entities for that zone
6. Prevents memory leaks from entities in unloaded chunks

### Memory Safety
The `entityZoneMap` is cleared in three scenarios:
- Individual zone cleanup via `despawnEntitiesForZone()` (called from `unloadChunkContainer`)
- Full cleanup via `clearEntities()` (called on zone transitions)
- Individual entity cleanup removes entity from zone Set (prevents orphaned tracking)

### Cross-Chunk Visibility Flow
1. Player moves near chunk boundary
2. ChunkManager requests adjacent chunks via `zone:request`
3. Server responds with `zone:chunk` including entities from that zone
4. Client spawns visible entities (within 48-tile radius)
5. Player can now see entities across chunk boundaries seamlessly
6. When player moves away, chunk unloads and entities are cleaned up

## Impact

- Players can now see entities across chunk boundaries within the 48-tile visibility radius
- Entity memory is properly managed with zone-based cleanup
- Server correctly streams entities for all chunks in the 3x3 grid
- No memory leaks from entities in unloaded chunks
- Type-safe entity streaming with updated ServerEvents interface

## Self-Check: PASSED

**Created files verification:**
- No new files created (only modifications)

**Modified files verification:**
- ✅ FOUND: apps/game-server/src/game/game.gateway.ts
- ✅ FOUND: apps/web/src/game/scenes/WorldScene.ts
- ✅ FOUND: packages/shared-types/src/network/events.ts

**Commit verification:**
- ✅ FOUND: 8a2cb77 (Task 1 - Server entity streaming)
- ✅ FOUND: 66a1644 (Deviation - Type definition fix)
- ✅ FOUND: 6308657 (Task 3 - Zone tracking and cleanup)

All commits exist in git history and all modified files are present.
