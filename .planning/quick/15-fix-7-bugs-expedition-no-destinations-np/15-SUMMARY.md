---
phase: quick-15
plan: 01
subsystem: gameplay-loop
tags: [bug-fix, expedition, npc-interaction, combat, harvest, pixel-movement, hub-npcs]
dependency_graph:
  requires: [quick-12, quick-13]
  provides: [expedition-full-loop, merchant-near-spawn, tight-wall-collision]
  affects: [player.service, expedition.service, hub.ts, pixel-validation]
tech_stack:
  added: []
  patterns: [px-py-sync-on-teleport, tier-retry-loop, hitbox-reduction]
key_files:
  created: []
  modified:
    - apps/game-server/src/game/player.service.ts
    - apps/game-server/src/game/expedition.service.ts
    - packages/world-gen/src/generation/hub.ts
    - packages/game-logic/src/movement/pixel-validation.ts
    - packages/game-logic/src/movement/pixel-validation.test.ts
decisions:
  - "Reduced PLAYER_HITBOX.height to 16px (0.125x tile) so collision is foot-anchored, matching visual wall edges"
  - "Retry all tier biomes shuffled before returning expedition failure to cover rare tier-4 biomes"
  - "Duplicate vendors added near docking bay spawn (y=96-98) — separate from NW trading area vendors"
metrics:
  duration: 3 min
  completed: "2026-03-20"
  tasks_completed: 3
  files_modified: 5
---

# Quick Task 15: Fix 7 Bugs (Expedition No Destinations + NPC/Combat/Harvest + Merchants + Hitbox)

**One-liner:** px/py sync in updatePosition + tier-biome retry loop + docking bay vendors + hitbox height 16px fix all 7 gameplay bugs blocking the full post-expedition loop.

## What Was Built

Fixed 3 root causes that collectively resolve 7 gameplay bugs preventing players from completing the expedition gameplay loop.

### Task 1: Fix px/py desync in updatePosition (Bugs 2, 5, 6)

Modified `updatePosition()` in `player.service.ts` to call `tileToPixelCenter()` and sync `player.px`, `player.py`, and `player.lastPxInputTime` whenever the tile position is updated.

**Root cause:** `startExpedition()` called `updatePosition()` which only set `player.position` (tile coords). All downstream pixel-distance checks — NPC interaction (`game.gateway.ts:1084`), combat range (`ability.service.ts:347`), harvest range (`ability.service.ts:330`) — used `player.px/py` which remained at the old zone's pixel coordinates, causing every interaction to fail with "too far away".

**Fix matches existing pattern** already used in `teleportToHub()` and `teleportFromHub()`.

### Task 2: Fix expedition "no suitable destinations" (Bug 1)

Modified `startExpeditionByTier()` to shuffle all biomes in the requested tier and try each one before returning failure. Also expanded `maxSearchRadius` from 50 to 100 zones.

**Root cause:** With only one random biome attempted and only 50 zones searched, tier-4 rare biomes like `void_rift` and `crystalline_wastes` were frequently not found, causing 100% failure for tier-4 expeditions.

### Task 3: Move merchants near spawn + reduce hitbox height (Bugs 3, 7)

Added 3 vendor NPCs (suit/tool/module) to each hub's docking bay area, 5-7 tiles from player spawn:
- `hub_verdant`: y=96-97 (spawn at y=102, distance 5-6 tiles)
- `hub_helix`: y=98 (spawn at y=103, distance 5 tiles)
- `hub_nexus`: y=96-97 (spawn at y=104, distance 7-8 tiles)
- `hub_neutral`: y=98 (spawn at y=103, distance 5 tiles)

Reduced `PLAYER_HITBOX.height` from 64px to 16px. With height=64, the hitbox top extended 0.5 tiles above feet, combined with the isometric south-neighbor collision extension (another 0.5 tiles) = player stopped ~1 full tile before wall's visual south face. At 16px, collision is based almost entirely on foot position.

## Verification

All checks pass:
- `npx nx run game-server:build` — SUCCESS
- `npx nx run game-logic:build` — SUCCESS
- `npx nx run game-logic:test -- --testPathPattern=pixel-validation` — SUCCESS (all 52 pixel-validation tests pass)
- `updatePosition` calls `tileToPixelCenter` and sets `player.px/py/lastPxInputTime`
- `startExpeditionByTier` loops through all shuffled biomes before returning failure
- `findZoneWithBiome` uses `maxSearchRadius = 100`
- Each hub has vendor NPCs with y-coord within 15 tiles of spawn y-coord
- `PLAYER_HITBOX.height` is 16, not 64

## Commits

| Hash | Task | Description |
|------|------|-------------|
| 950bd90 | Task 1 | fix(quick-15): sync px/py in updatePosition resolving NPC/combat/harvest bugs |
| d594ddd | Task 2 | fix(quick-15): retry all tier biomes in expedition, expand search radius to 100 |
| 1069bfb | Task 3 | fix(quick-15): add docking bay vendors near spawn + reduce hitbox height to 16px |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated pixel-validation test for new hitbox height**
- **Found during:** Task 3
- **Issue:** `pixel-validation.test.ts` line 40-42 asserted `PLAYER_HITBOX.height === 64`, failing after intentional change to 16
- **Fix:** Updated test description and assertion value from 64 to 16
- **Files modified:** `packages/game-logic/src/movement/pixel-validation.test.ts`
- **Commit:** 1069bfb

### Pre-existing Failures (Out of Scope)

`creature-ai.test.ts` — 6 failing tests existed before this task. Not caused by any of our changes (confirmed by `git stash` verification). Logged as deferred.

### NPC Coordinate Adjustments (Per Important Note)

Plan suggested y=92 for `npc_module_vendor` in hub_verdant and hub_nexus, but y=92 lands outside the docking bay rooms (rooms start at y=95 and y=94 respectively). Adjusted to y=97 per the important_note guidance. Similarly adjusted hub_helix and hub_neutral module vendors from y=94 to y=98 to ensure they land inside the docking bay rooms.

## Self-Check: PASSED

- `apps/game-server/src/game/player.service.ts` — FOUND, `updatePosition` syncs px/py
- `apps/game-server/src/game/expedition.service.ts` — FOUND, shuffle + retry loop present
- `packages/world-gen/src/generation/hub.ts` — FOUND, docking bay vendors for all 4 hubs
- `packages/game-logic/src/movement/pixel-validation.ts` — FOUND, height=16
- Commits 950bd90, d594ddd, 1069bfb — all present in git log
