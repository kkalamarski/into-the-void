---
phase: 133-distance-system-migration
plan: "01"
subsystem: game-logic / shared-types / game-server
tags: [pixel-movement, interaction, player-public, constants]
dependency_graph:
  requires: [131-pixel-movement-types, 132-server-movement-handler]
  provides: [PlayerPublic.px, PlayerPublic.py, canInteractPixel, FLEE_RADIUS_PX]
  affects: [combat-system, gathering-system, npc-system, ai-system]
tech_stack:
  added: []
  patterns: [pixel-distance-range-check, barrel-auto-export]
key_files:
  created: []
  modified:
    - packages/shared-types/src/core/player.ts
    - packages/game-logic/src/movement/pixel-distance.ts
    - packages/game-logic/src/interaction/interaction.ts
    - apps/game-server/src/game/player.service.ts
decisions:
  - "canInteractPixel does not check zone equality — callers pre-validate zone match before calling"
  - "FLEE_RADIUS_PX = 5.0 * TILE_SIZE_PX (640px) mirrors old tile-based FLEE_RADIUS = 5"
  - "px/py added as required fields on PlayerPublic so downstream AI/combat plans always have pixel coords"
metrics:
  duration: "1 min"
  completed_date: "2026-03-18"
  tasks_completed: 2
  files_modified: 4
---

# Phase 133 Plan 01: Distance System Migration Contracts Summary

**One-liner:** Pixel-distance interaction contract established — PlayerPublic carries px/py, canInteractPixel uses Euclidean distance, FLEE_RADIUS_PX = 640px added as constant.

## What Was Built

The shared contracts that all downstream Phase 133 plans (02, 03, 04) depend on:

1. **PlayerPublic px/py fields** — Added `px: number` and `py: number` to the `PlayerPublic` interface in `packages/shared-types/src/core/player.ts`. These are populated from `ConnectedPlayer.px/py` in `getPlayersInZone()`, making real-time pixel positions available to all consumers of the zone player list.

2. **FLEE_RADIUS_PX constant** — Added `FLEE_RADIUS_PX = 5.0 * TILE_SIZE_PX` (640px) to `packages/game-logic/src/movement/pixel-distance.ts`. This replaces the old tile-count `FLEE_RADIUS = 5` used by herbivore AI.

3. **canInteractPixel function** — Added pixel-space interaction range check to `packages/game-logic/src/interaction/interaction.ts`. Function takes player pixel coordinates, entity (tile coords converted internally via `tileToPixelCenter`), and a range in pixels, then returns `{ canInteract: boolean; reason?: string }`. Auto-exported via the existing barrel in `packages/game-logic/src/index.ts`.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add px/py to PlayerPublic and FLEE_RADIUS_PX | 746bcde | shared-types/player.ts, pixel-distance.ts, player.service.ts |
| 2 | Create canInteractPixel function | 865bda5 | interaction/interaction.ts |

## Verification Results

- `npx nx run shared-types:build` — PASSED
- `npx nx run game-logic:build` — PASSED
- `grep canInteractPixel packages/game-logic/src/interaction/interaction.ts` — found at line 84
- `grep FLEE_RADIUS_PX packages/game-logic/src/movement/pixel-distance.ts` — found at line 54 (640px)
- `grep "px: player.px" apps/game-server/src/game/player.service.ts` — found at line 396

## Deviations from Plan

None - plan executed exactly as written.

## Decisions Made

- `canInteractPixel` does not check zone equality — callers already validate that player and entity share a zone before calling the function, consistent with existing `canInteract` caller pattern.
- `FLEE_RADIUS_PX` placed after `LEASH_RADIUS_PX` in the constants block to maintain ordering by logical radius size.
- `px`/`py` added as **required** fields (not optional) on `PlayerPublic` — since `ConnectedPlayer` always has them populated from Phase 132, there is no scenario where they would be absent.

## Self-Check: PASSED

All modified files exist and both commits verified in git log.
