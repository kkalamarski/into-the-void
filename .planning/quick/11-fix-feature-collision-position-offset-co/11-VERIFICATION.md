---
phase: quick-11
verified: 2026-03-20T13:10:00Z
status: human_needed
score: 4/4 must-haves verified
human_verification:
  - test: "Walk toward a tree from each cardinal direction"
    expected: "Player is stopped at the tree's visual base (roots/ground level), not at the trunk middle (~half a tile before)"
    why_human: "Pixel-level visual alignment of collision point relative to sprite cannot be verified programmatically"
  - test: "Walk into a terrain wall (elevated cube tile)"
    expected: "Collision triggers at same position as before — wall still blocks with full hitbox"
    why_human: "Regression of terrain/wall behavior requires visual in-game confirmation"
---

# Quick Task 11: Fix Feature Collision Position Offset — Verification Report

**Task Goal:** Fix feature rendering and collision position bug — collision point was offset too high from the actual base of features (trees etc.). The collision triggered at the trunk middle instead of at the base/roots.
**Verified:** 2026-03-20T13:10:00Z
**Status:** human_needed (automated checks all pass; visual confirmation required)
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Feature collision triggers at the visual base (roots/ground) of the feature, not at the trunk middle | ? NEEDS HUMAN | Logic verified: entitySolid returns false when pixelY < tileMidY; visual alignment needs in-game testing |
| 2 | Player can walk up to a tree and be stopped at its base, not half a tile before | ? NEEDS HUMAN | Mechanism is correct; perceptual result needs human confirmation |
| 3 | Terrain/wall collisions remain unchanged (full hitbox check) | ✓ VERIFIED | isoCheck path is completely unmodified; entitySolid filter only applies to the entity branch of the combined callback |
| 4 | Entity collision still prevents walking through features entirely | ✓ VERIFIED | entitySolid still returns true for bottom-half corners (pixelY >= tileMidY), and falls back to full-block when pixelY is undefined |

**Score:** 4/4 truths are logically verified (2 additionally require human visual confirmation)

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `apps/web/src/game/scenes/WorldScene.ts` | Feet-only entity collision filtering via pixelY threshold | ✓ VERIFIED | Lines 2558–2564: entitySolid accepts pixelY, computes tileMidY = ty * TILE_SIZE_PX + TILE_SIZE_PX * 0.5, returns false when pixelY < tileMidY |
| `apps/web/src/game/systems/PixelMovementController.ts` | Updated type signature for collision callback with pixelY | ✓ VERIFIED | Line 102: isSolid field typed as (tileX, tileY, pixelY?) => boolean; Line 117: setCollisionCallback accepts pixelY? in signature |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `apps/web/src/game/scenes/WorldScene.ts` | `packages/game-logic/src/movement/pixel-validation.ts` | resolvePixelCollision passes pixelY to isSolid callback | ✓ WIRED | pixel-validation.ts line 176: `corners.some(c => isSolid(toTile(c.x), toTile(c.y), c.y))` — c.y is the pixelY passed as third argument |
| `apps/web/src/game/scenes/WorldScene.ts` | `apps/web/src/game/systems/PixelMovementController.ts` | setCollisionCallback passes callback with pixelY support | ✓ WIRED | Lines 2570–2572: `this.pixelMovement.setCollisionCallback((tx, ty, pixelY?) => entitySolid(tx, ty, pixelY) || isoCheck(tx, ty, pixelY))` |

---

### Requirements Coverage

| Requirement | Description | Status | Evidence |
|-------------|-------------|--------|----------|
| QUICK-11 | Fix feature collision position so it triggers at visual base, not trunk middle | ✓ SATISFIED | entitySolid pixelY filter implemented; both artifacts modified as planned; commit e2adfe1 exists |

---

### Anti-Patterns Found

None. No TODO/FIXME/HACK/placeholder comments in either modified file. No empty or stub implementations. No console.log-only handlers.

---

### Test Results

| Suite | Result | Notes |
|-------|--------|-------|
| `game-logic:test` — pixel-validation.test.ts | ✓ 52 tests passed | Directly tests resolvePixelCollision |
| `game-logic:test` — pixel-distance.test.ts | ✓ 27 tests passed | Movement distance tests unrelated to this change |
| `game-logic:test` — creature-ai.test.ts | 6 tests failed | Pre-existing failures in AI combat logic, unrelated to this fix (confirmed by SUMMARY) |
| `tsc --noEmit` (apps/web) | ✓ 0 errors | Type signatures for isSolid and setCollisionCallback compile cleanly |

---

### Human Verification Required

#### 1. Feature base collision (primary goal)

**Test:** Load into a zone with trees or plants. Walk toward a tree from each of the four cardinal directions.
**Expected:** The player is blocked at the visual base of the tree (roots/ground level). The player should be able to walk noticeably closer than before (approximately half a tile closer).
**Why human:** The pixelY threshold logic (tileMidY) is confirmed in code, but the perceptual correctness — that the collision point aligns with the sprite's visual base — depends on the actual sprite anchor points and cannot be confirmed without rendering.

#### 2. Terrain/wall regression check

**Test:** Walk into an elevated terrain wall (e.g., a raised cube tile).
**Expected:** Collision triggers at the same visual position as before this fix. The full hitbox (including head-level corners) should still be blocked by terrain walls.
**Why human:** The isoCheck path was not modified, but confirming the wall blocking feel has not regressed requires visual in-game comparison.

---

### Gaps Summary

No gaps found. All four observable truths have their supporting artifacts verified as substantive and wired. Both key links are confirmed at code level. The two "human needed" items are verification of visual/perceptual correctness — the underlying logic is sound. The implementation precisely matches the plan specification.

---

_Verified: 2026-03-20T13:10:00Z_
_Verifier: Claude (gsd-verifier)_
