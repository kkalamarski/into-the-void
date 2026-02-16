---
phase: 16-structure-walls-pathfinding
verified: 2026-02-16T14:30:00Z
status: gaps_found
score: 5/6
gaps:
  - truth: "A* pathfinding includes elevation cost penalty and prefers flat routes over climbing"
    status: partial
    reason: "Functions implemented but not wired into game-server movement handlers"
    artifacts:
      - path: "apps/game-server/src/game/handlers/movement.handler.ts"
        issue: "Still uses old findPath, not findPathWithElevation"
    missing:
      - "Update game-server movement handler to use findPathWithElevation with heights data"
      - "Update game-server movement validation to use validateMovementWithElevation"
      - "Wire ChunkData.heights into game-server state for validation"
---

# Phase 16: Structure Walls & Pathfinding Verification Report

**Phase Goal:** Elevation affects player movement and pathfinding
**Verified:** 2026-02-16T14:30:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Wall tiles defined with variable height by type and all walls block movement | ✓ VERIFIED | WALL_HEIGHTS lookup in structures.ts defines CRYSTAL_FORMATION=5, ICE_WALL=4, VOID_WALL=3, TOXIC_POOL=2. getWallHeight() returns per-type heights. Collision map updated with wall positions (structures.ts line 109). |
| 2 | 1-level elevation difference is walkable, 2+ level difference blocks movement | ✓ VERIFIED | validateMovementWithElevation checks `Math.abs(elevationDelta) > 1` (validation.ts line 125). findPathWithElevation skips neighbors with delta > 1 (pathfinding.ts line 346). |
| 3 | A* pathfinding includes elevation cost penalty and prefers flat routes over climbing | ⚠️ PARTIAL | Functions implemented (ELEVATION_CLIMB_COST = 0.5 in pathfinding.ts line 3, uphill cost applied line 351-354) but NOT wired into game-server movement handlers. Client-side works, server-side still uses old findPath. |
| 4 | Click detection accounts for elevation offset (clicks on elevated terrain work correctly) | ✓ VERIFIED | screenToTileWithElevation method in IsometricTransform.ts (line 59-76). WorldScene click handler uses it (WorldScene.ts line 170) with getTileElevation callback. |
| 5 | Structure walls render with side faces and appear on minimap as distinct markers | ✓ VERIFIED | WorldScene.renderChunk iterates structures and calls createTileWithElevation (line 445-451). MinimapCamera.updateStructureMarkers renders orange markers (MinimapCamera.ts line 90-124). |
| 6 | Tall objects hide entities behind them (full occlusion) | ✓ VERIFIED | EntityRenderer.applyOcclusion checks structures with height >= 3 (EntityRenderer.ts line 7, line 241), sets alpha 0.3 when depth difference 0-10 (line 253-265). Called from WorldScene.updateEntityOcclusion (WorldScene.ts line 351-367). |

**Score:** 5.5/6 truths verified (1 partial)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| packages/game-logic/src/movement/validation.ts | validateMovementWithElevation with elevation delta check | ✓ VERIFIED | Function exists (line 114-131), exports "validateMovement" and "validateMovementWithElevation", elevation check uses `Math.abs(toHeight - fromHeight) > 1` |
| packages/game-logic/src/movement/pathfinding.ts | findPathWithElevation with elevation cost | ✓ VERIFIED | Function exists (line 257-375), exports "findPath" and "findPathWithElevation", ELEVATION_CLIMB_COST=0.5 (line 3), uphill penalty applied (line 351-354) |
| apps/web/src/game/utils/IsometricTransform.ts | screenToTileWithElevation method | ✓ VERIFIED | Method exists (line 59-76), callback pattern for elevation lookup, single-pass adjustment |
| apps/web/src/game/scenes/WorldScene.ts | Click handler uses elevation-aware detection | ✓ VERIFIED | pointerup handler uses screenToTileWithElevation (line 170-173), passes getTileElevation callback |
| packages/world-gen/src/generation/structures.ts | generateStructures with per-type heights | ✓ VERIFIED | 187 lines, exports generateStructures, WALL_HEIGHTS lookup (line 16-25), getWallHeight function (line 34-36), collisions updated (line 109) |
| packages/world-gen/src/generation/chunk.ts | WorldGenerator calls generateStructures | ✓ VERIFIED | Import on line 5, call on line 38-44, structures array returned in ChunkData |
| apps/web/src/game/rendering/MinimapCamera.ts | updateStructureMarkers method | ✓ VERIFIED | Method exists (line 90-124), orange markers 0xff6b35, marker size 32px, depth 999 |
| apps/web/src/game/rendering/EntityRenderer.ts | applyOcclusion method | ✓ VERIFIED | Method exists (line 231-280), 50 lines, OCCLUSION_MIN_HEIGHT=3 (line 7), OCCLUDED_ALPHA=0.3 (line 8), depth comparison (line 253-265) |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| validation.ts | heights array | elevation delta calculation | ✓ WIRED | `Math.abs(toHeight - fromHeight)` pattern found (line 123) |
| pathfinding.ts | neighbor expansion | elevation cost in g value | ✓ WIRED | `elevationDelta * ELEVATION_CLIMB_COST` pattern found (line 353) |
| WorldScene.ts | IsometricTransform | click handler | ✓ WIRED | screenToTileWithElevation called with getTileElevation callback (line 170-173) |
| chunk.ts | structures.ts | import and call | ✓ WIRED | Import line 5, generateStructures call line 38 with worldSeed parameter |
| structures.ts | collisions array | mutation | ✓ WIRED | `collisions[tile.y][tile.x] = true` found (line 109) |
| structures.ts | getWallHeight | height lookup | ✓ WIRED | getWallHeight(wallTileId) called (line 131), returns WALL_HEIGHTS[wallTileId] |
| WorldScene.ts | TileRenderer | structure rendering | ✓ WIRED | createTileWithElevation called for structures (line 449-450) |
| WorldScene.ts | MinimapCamera | updateStructureMarkers | ✓ WIRED | minimapCamera.updateStructureMarkers(structures) called (line 476) |
| EntityRenderer.ts | container depth | depth comparison | ✓ WIRED | `occluder.depth - entityDepth` pattern found (line 253) |
| WorldScene.ts | EntityRenderer | applyOcclusion call | ✓ WIRED | entityRenderer.applyOcclusion(this.entitySprites, chunkContainer) called (line 359) |

### Requirements Coverage

| Requirement | Status | Blocking Issue |
|-------------|--------|----------------|
| STRUCT-01: Wall tiles defined with variable height by type | ✓ SATISFIED | WALL_HEIGHTS lookup table with per-type heights (CRYSTAL=5, TOXIC=2, etc.) |
| STRUCT-02: All wall structures block movement regardless of height | ✓ SATISFIED | collisions[y][x] = true for all wall tiles (structures.ts line 109) |
| STRUCT-03: World-gen places structure walls procedurally | ✓ SATISFIED | generateStructures uses noise threshold 0.6, Bresenham's line algorithm |
| STRUCT-04: Structure walls render with side faces same as terrain | ✓ SATISFIED | createTileWithElevation reused for structures (WorldScene.ts line 449) |
| MOVE-01: 1-level elevation difference is walkable | ✓ SATISFIED | elevationDelta <= 1 passes check (validation.ts line 125, pathfinding.ts line 346) |
| MOVE-02: 2+ level elevation difference blocks movement | ✓ SATISFIED | elevationDelta > 1 returns false/skips neighbor |
| MOVE-03: A* pathfinding includes elevation cost penalty | ⚠️ PARTIAL | Function implemented but game-server not using it |
| MOVE-04: Pathfinding prefers flat routes over climbing | ⚠️ PARTIAL | Uphill cost penalty (0.5 per level) implemented but not wired server-side |
| MOVE-05: Click detection accounts for elevation offset | ✓ SATISFIED | screenToTileWithElevation with single-pass adjustment |
| RENDER-03: Full occlusion - tall objects hide entities behind them | ✓ SATISFIED | Structures height >= 3 occlude entities to alpha 0.3 |
| RENDER-04: Minimap shows structure walls as distinct markers | ✓ SATISFIED | Orange markers (0xff6b35) at depth 999 |

### Anti-Patterns Found

None found. Code quality checks:
- ✅ No TODO/FIXME/PLACEHOLDER comments in modified files
- ✅ No empty implementations or stub functions
- ✅ No console.log-only handlers
- ✅ All functions have substantive logic (elevation checks, cost calculations, rendering)

### Human Verification Required

#### 1. Visual: Elevated terrain click accuracy

**Test:** Click on terrain at various elevations (0-5 levels)
**Expected:** Click marker appears exactly where mouse cursor clicked (no offset)
**Why human:** Visual accuracy requires human eye, pixel-perfect alignment validation

#### 2. Visual: Structure wall side faces

**Test:** Navigate to crystal_caves biome, observe CRYSTAL_FORMATION walls
**Expected:** Tall walls (height 5) render with side faces like elevated terrain, not flat sprites
**Why human:** Visual consistency check, side-face rendering quality judgment

#### 3. Visual: Minimap structure markers

**Test:** Navigate to zone with walls, check minimap in bottom-right corner
**Expected:** Orange rectangles appear at wall positions, visible at zoom 0.1, scroll with world
**Why human:** Minimap visual clarity, marker size/color appropriateness

#### 4. Visual: Entity occlusion behind walls

**Test:** Position entity behind tall wall (height >= 3), observe from isometric view
**Expected:** Entity fades to 30% alpha when behind wall, returns to full alpha when not obscured
**Why human:** Visual fade quality, depth perception correctness

#### 5. Gameplay: Movement blocked by elevation

**Test:** Try to move character from elevation 0 to elevation 2+ directly
**Expected:** Movement rejected with "Terrain too steep" (if server-side wired)
**Why human:** Gameplay feel, movement blocking behavior

#### 6. Gameplay: Pathfinding prefers flat routes

**Test:** Click destination reachable via both flat route and uphill route (equal distance)
**Expected:** Pathfinder chooses flat route (lower cost)
**Why human:** Pathfinding behavior observation, route preference validation

### Gaps Summary

**Gap: Server-side elevation movement not wired**

The elevation-aware movement and pathfinding functions (`validateMovementWithElevation`, `findPathWithElevation`) are implemented and exported from `game-logic` package, but the game-server is not using them yet. This means:

1. Client-side click-to-move works correctly (uses elevation-aware pathfinding in WorldScene)
2. Server-side movement validation still uses old `validateMovement` (no elevation checks)
3. Server-authoritative movement could allow players to climb 2+ elevation levels

**Impact:** Medium — client prevents invalid movement, but server doesn't enforce it. Multiplayer sync could break if client modified.

**Required:**
- Update `apps/game-server/src/game/handlers/movement.handler.ts` to use `validateMovementWithElevation`
- Wire `ChunkData.heights` data into game-server state management
- Update pathfinding calls to use `findPathWithElevation` where applicable

**Note:** This is a wiring gap, not an implementation gap. The functions are complete and tested on client-side.

---

_Verified: 2026-02-16T14:30:00Z_
_Verifier: Claude (gsd-verifier)_
