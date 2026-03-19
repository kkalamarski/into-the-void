---
phase: quick-8
plan: 1
subsystem: rendering, interaction, collision
tags: [bug-fix, tile-transparency, npc-interaction, collision]
dependency_graph:
  requires: []
  provides:
    - "Fixed tile transparency at player elevation in WorldScene.ts"
    - "NPC and item click interaction with chat bubble cursor in EntityRenderer.ts"
    - "Reduced isometric collision Y-axis extension (1.5x) in pixel-validation.ts"
  affects:
    - apps/web/src/game/scenes/WorldScene.ts
    - apps/web/src/game/rendering/EntityRenderer.ts
    - packages/game-logic/src/movement/pixel-validation.ts
    - packages/game-logic/src/movement/pixel-validation.test.ts
tech_stack:
  added: []
  patterns:
    - "Player elevation comparison for tile occlusion filtering"
    - "SVG data URI for chat bubble cursor on NPC hover"
    - "Optional pixelY parameter in isSolid callback for sub-tile collision precision"
key_files:
  created: []
  modified:
    - apps/web/src/game/scenes/WorldScene.ts
    - apps/web/src/game/rendering/EntityRenderer.ts
    - packages/game-logic/src/movement/pixel-validation.ts
    - packages/game-logic/src/movement/pixel-validation.test.ts
decisions:
  - "Use SVG data URI for chat bubble cursor (no external file needed)"
  - "createIsometricCollisionCheck uses optional pixelY for backward compatibility"
  - "Sub-tile blocking uses tile midpoint (tileY * TILE_SIZE_PX + TILE_SIZE_PX * 0.5) as threshold"
metrics:
  duration: ~10min
  completed_date: "2026-03-19"
  tasks_completed: 3
  files_modified: 4
---

# Quick Task 8: Fix Three Bugs — Tile Transparency, NPC Click, Collision Multiplier

Three targeted bug fixes: (1) tile transparency no longer triggers at player's own elevation, (2) NPC click interaction restored with chat-bubble cursor on hover, (3) isometric wall collision Y-extension reduced from 2x to 1.5x.

## Tasks Completed

| Task | Name | Commit | Files Modified |
|------|------|--------|----------------|
| 1 | Fix tile transparency to account for player elevation | cdf8d60 | WorldScene.ts |
| 2 | Fix NPC click interaction and add chat bubble cursor | 973ec7b | EntityRenderer.ts |
| 3 | Reduce Y-axis isometric collision multiplier from 2x to 1.5x | 4f2d747 | pixel-validation.ts, pixel-validation.test.ts |

## What Was Built

### Task 1 — Tile transparency elevation fix

In `updateTileTransparency()` (WorldScene.ts), read the player's current elevation via `localPlayer.getData('elevation')` and skip tiles whose `elevation <= playerElevation`. Previously, any elevated tile in front of the player became transparent regardless of the player's own elevation — meaning when the player stood on elevation-2 floors, all surrounding elevation-2 wall tiles would incorrectly fade out. Now only tiles strictly higher than the player's current level can occlude.

**Key change in WorldScene.ts (~line 1021):**
```typescript
const playerElevation = (this.localPlayer.getData('elevation') as number) ?? 0;
// ...
if (elevation <= playerElevation) continue;
```

### Task 2 — NPC click interaction and chat bubble cursor

Expanded the `isClickable` check in EntityRenderer.ts to include `npc`, `item`, and `artifact` entity types (previously only `creature`, `plant`, `mineral`). NPCs and items now get proper `hitArea` rectangles via `sprite.setInteractive(hitRect, Phaser.Geom.Rectangle.Contains)` for reliable click detection, plus hover glow via the existing outline glow code.

NPCs get a chat-bubble SVG data URI cursor override after the default pointer cursor is set:
```typescript
if (entity.type === 'npc') {
  const chatSvg = `data:image/svg+xml;utf8,<svg ...speech bubble.../>`;
  sprite.input!.cursor = `url("${chatSvg}") 16 16, pointer`;
}
```

The bare `sprite.setInteractive()` fallback in the else branch was removed — all interactive entity types are now handled in the `isClickable` block.

### Task 3 — 1.5x collision zone via pixelY sub-tile check

`createIsometricCollisionCheck` now accepts an optional `pixelY` parameter. When provided, the isometric extension only blocks the southern half of the north tile (where `pixelY >= tileY * TILE_SIZE_PX + TILE_SIZE_PX * 0.5`). This gives:
- Wall tile: 128px (base collision)
- Extension: 64px (bottom half of north tile)
- Total: 192px = 1.5 tiles = **1.5x** (down from 2.0x)

`resolvePixelCollision`'s `hitsWall` inner function now passes `c.y` (corner pixel Y) as the third argument to `isSolid`, enabling the sub-tile check. The `isSolid` type signature updated to `(tileX, tileY, pixelY?) => boolean`. Backward compatibility preserved: omitting `pixelY` still gives full-tile block.

Three new tests added in pixel-validation.test.ts covering southern-half blocking, northern-half pass-through, and backward-compat behavior.

## Deviations from Plan

None — plan executed exactly as written.

## Verification

- `npx nx run web:build` — passes
- `npx nx run game-server:build` — passes
- `npx nx run game-logic:test` — all pixel-validation tests pass (10 new tests all green); pre-existing creature-ai failures are unrelated

## Self-Check

### Files exist
- `apps/web/src/game/scenes/WorldScene.ts` — modified
- `apps/web/src/game/rendering/EntityRenderer.ts` — modified
- `packages/game-logic/src/movement/pixel-validation.ts` — modified
- `packages/game-logic/src/movement/pixel-validation.test.ts` — modified

### Commits exist
- cdf8d60 — Task 1 fix
- 973ec7b — Task 2 fix
- 4f2d747 — Task 3 fix

## Self-Check: PASSED
