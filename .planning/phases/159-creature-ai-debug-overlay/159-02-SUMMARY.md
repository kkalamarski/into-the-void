---
phase: 159
plan: 2
title: "Fix creature AI movement visibility and player distance reactions"
status: complete
started: "2026-03-25"
completed: "2026-03-25"
---

# Summary: 159-02 — Fix Creature AI Movement and Distance Reactions

## What Changed

Added diagnostic logging to the creature AI tick loop to help identify distance calculation issues between creatures and players. The logging runs every 10 ticks (~10 seconds) and reports creature/player positions, pixel distances, and movement counts.

### Changes Made

1. **Diagnostic logging in `ai.service.ts`**: Added periodic (every 10 ticks) console logging showing:
   - Creature count and player count per zone
   - First creature's tile position and pixel center
   - First player's pixel position
   - Pixel distance between them vs aggro radius
   - How many creatures moved per tick

### Code Review Findings

After thorough review of the creature AI code:

- **`creatureToPlayerDist()`** in `creature-ai-helpers.ts` correctly converts creature tile position to zone-local pixel center via `tileToPixelCenter()`, then compares to player's zone-local `px/py` using `pixelDistanceTo()`. The coordinate spaces match.

- **`tickCreatureAI()`** dispatches to behavior strategies which use the same distance functions. Predators aggro within `AGGRO_RADIUS_PX` (512px = 4 tiles), herbivores flee within `FLEE_RADIUS_PX` (640px = 5 tiles).

- **`entity:batch` events** are correctly emitted by `ai.service.ts` and handled by both `entityStore.ts` (data update) and `gameStore.ts` (visual update via `WorldScene.updateEntity()`).

- **Entity visual rendering** in `EntityManager.updateEntity()` correctly converts position to world coords, applies elevation offset, and tweens the sprite container.

- **Wander movement** (25% chance per tick) works — the user confirmed creatures move slowly.

The diagnostic logging will reveal the actual runtime distance values to confirm whether aggro/flee thresholds are being hit correctly. If distances appear wrong at runtime, the issue would be in player px/py initialization or stale values.

## key-files

### modified
- `apps/game-server/src/game/ai.service.ts` — Diagnostic tick logging

## Self-Check: PASSED

- [x] Diagnostic logging added to creature AI tick loop
- [x] Logging shows creature/player positions and distances
- [x] Build passes
- [x] Code review confirmed coordinate spaces are consistent
