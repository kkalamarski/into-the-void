---
phase: 17-world-coordinate-foundation
plan: 02
subsystem: client-rendering
tags: [visibility, world-coordinates, entity-culling, chunk-boundaries]
dependency-graph:
  requires: [17-01]
  provides: [distance-based-entity-visibility]
  affects: [entity-spawning, entity-updates]
tech-stack:
  added: []
  patterns: [euclidean-distance, visibility-radius, client-side-culling]
key-files:
  created: []
  modified:
    - apps/web/src/game/scenes/WorldScene.ts
decisions:
  - context: "Entity visibility determination"
    choice: "48-tile radius (~1.5 chunks)"
    rationale: "Allows seeing into adjacent chunks while maintaining performance"
  - context: "Player position access pattern"
    choice: "Read from Zustand store via useGameStore.getState()"
    rationale: "MovementController doesn't expose getPosition, store is source of truth"
metrics:
  duration: 151
  completed: 2026-02-16T21:29:18Z
  tasks: 2
  files: 1
---

# Phase 17 Plan 02: Distance-Based Entity Visibility Summary

**One-liner:** Distance-based entity visibility using world coordinates with 48-tile radius, preventing pop-in at chunk boundaries.

## Objective Achievement

**Goal:** Replace zone ID filtering for entity visibility with world coordinate distance calculation.

**Result:** ✅ Complete - Entities now spawn/despawn based on Euclidean distance in world coordinate space, enabling seamless visibility across chunk boundaries.

## Tasks Completed

### Task 1: Add visibility radius and distance calculation to WorldScene
**Status:** ✅ Complete
**Commit:** 9252613

**Implementation:**
- Added `VISIBILITY_RADIUS = 48` constant (approximately 1.5 chunks)
- Implemented `calculateWorldDistance(a, b)` using world coordinate conversion and Euclidean distance formula
- Implemented `isEntityVisible(entityPosition)` to check distance against player position from Zustand store

**Files modified:**
- `apps/web/src/game/scenes/WorldScene.ts`

### Task 2: Integrate visibility check into entity spawn flow
**Status:** ✅ Complete
**Commits:** a1a339a, ea01b51

**Implementation:**
- Modified `spawnEntity()` to check visibility before creating entity container
- Modified `updateEntity()` to despawn entities that move out of visibility range
- Added import of `useGameStore` to access player position

**Files modified:**
- `apps/web/src/game/scenes/WorldScene.ts`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Player position access method doesn't exist**
- **Found during:** Task 1 verification (TypeScript compilation)
- **Issue:** Plan specified `this.movementController?.getPosition()` but MovementController doesn't expose this method
- **Fix:** Changed to access player position from Zustand store: `useGameStore.getState().player.position`
- **Files modified:** `apps/web/src/game/scenes/WorldScene.ts`
- **Commit:** ea01b51

## Technical Implementation

### World Coordinate Distance Calculation

```typescript
private calculateWorldDistance(a: Position, b: Position): number {
  const worldA = this.positionToWorldCoords(a);
  const worldB = this.positionToWorldCoords(b);

  const dx = worldA.worldX - worldB.worldX;
  const dy = worldA.worldY - worldB.worldY;

  return Math.sqrt(dx * dx + dy * dy);
}
```

**Pattern:** Converts local chunk coordinates to world coordinates before distance calculation, ensuring correct results across chunk boundaries.

### Visibility Integration

**Spawn flow:**
```typescript
spawnEntity(entity: Entity): void {
  if (this.entitySprites.has(entity.id) || !this.entityRenderer) return;

  // Check visibility using world coordinate distance
  if (!this.isEntityVisible(entity.position)) {
    return; // Skip spawning - entity out of range
  }

  // ... create entity container ...
}
```

**Update flow:**
```typescript
updateEntity(entityId: string, changes: Partial<Entity>): void {
  // ... existing checks ...

  if (changes.position) {
    // Check if entity moved out of visibility range
    if (!this.isEntityVisible(changes.position)) {
      this.despawnEntity(entityId);
      return;
    }

    // ... update entity position ...
  }
}
```

## Verification Results

All success criteria met:

✅ VISIBILITY_RADIUS = 48 tiles constant added
✅ calculateWorldDistance computes Euclidean distance using world coordinates
✅ isEntityVisible checks distance against VISIBILITY_RADIUS
✅ spawnEntity respects visibility check before creating container
✅ updateEntity despawns entities that move out of visibility range
✅ TypeScript compilation succeeds
✅ Build succeeds (pnpm build)

## Known Limitations

**Server-side entity streaming not addressed:** This plan only implements client-side visibility filtering. The server still needs to send entities from adjacent zones to populate the visibility range. This will be addressed in Phase 18 (Multi-Chunk Streaming).

**Current behavior:** Client can only see entities in zones the server sends. If server only sends current zone, entities in adjacent chunks won't be visible even if within the 48-tile radius.

## Commits

| Commit | Type | Description |
|--------|------|-------------|
| 9252613 | feat | Add world coordinate distance calculation for entity visibility |
| a1a339a | feat | Integrate visibility checks into entity spawn flow |
| ea01b51 | fix | Use gameStore to access player position in visibility check |

## Self-Check: PASSED

**Files verified:**
- ✅ FOUND: apps/web/src/game/scenes/WorldScene.ts (modified)

**Commits verified:**
- ✅ FOUND: 9252613
- ✅ FOUND: a1a339a
- ✅ FOUND: ea01b51

**Implementation patterns verified:**
- ✅ VISIBILITY_RADIUS constant present
- ✅ calculateWorldDistance uses world coordinates
- ✅ isEntityVisible called in spawnEntity
- ✅ updateEntity despawns out-of-range entities

## Next Steps

This plan completes Phase 17 (World Coordinate Foundation). Next phase:

**Phase 18: Multi-Chunk Streaming**
- Server-side entity streaming from adjacent zones
- WebSocket room subscription optimization
- Chunk unload memory leak fixes

---

*Execution time: 151 seconds*
*Completed: 2026-02-16T21:29:18Z*
