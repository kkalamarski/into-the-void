---
phase: 132-server-movement-handler
plan: "02"
subsystem: game-server
tags: [pixel-movement, player-state, zones, game-server]
dependency_graph:
  requires: []
  provides: [ConnectedPlayer-pixel-state, ZonesService-getChunkSync]
  affects: [apps/game-server/src/game/player.service.ts, apps/game-server/src/zones/zones.service.ts]
tech_stack:
  added: []
  patterns: [pixel-to-tile conversion on disconnect, tile-to-pixel initialization on connect]
key_files:
  created: []
  modified:
    - apps/game-server/src/game/player.service.ts
    - apps/game-server/src/zones/zones.service.ts
decisions:
  - "Pixel state (px/py/lastPxInputTime) stored in-memory only on ConnectedPlayer; no DB schema change needed"
  - "handleDisconnect converts px/py via pixelToTile before updateCharacterPosition DB write"
  - "getChunkSync returns undefined if zone not cached; callers skip validation that tick rather than blocking"
metrics:
  duration: "~2 min"
  completed_date: "2026-03-17"
  tasks_completed: 2
  files_modified: 2
---

# Phase 132 Plan 02: Pixel State Infrastructure Summary

ConnectedPlayer extended with in-memory px/py/lastPxInputTime fields and ZonesService augmented with synchronous chunk accessor for the MovementService tick loop.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Extend ConnectedPlayer with pixel state and update connect/disconnect lifecycle | 3f837de | apps/game-server/src/game/player.service.ts |
| 2 | Add synchronous getChunkSync to ZonesService | eee126c | apps/game-server/src/zones/zones.service.ts |

## What Was Built

### Task 1: ConnectedPlayer pixel state lifecycle

Added three fields to the `ConnectedPlayer` interface:
- `px: number` — current pixel X in zone
- `py: number` — current pixel Y in zone
- `lastPxInputTime: number` — ms timestamp of last processed pixel input

Lifecycle management:
- **authenticate()**: calls `tileToPixelCenter(character.position.x, character.position.y)` to initialize `px`, `py`, `lastPxInputTime = Date.now()` on connect
- **handleDisconnect()**: calls `pixelToTile(player.px, player.py)` to convert back to tile integers before `updateCharacterPosition` DB write
- **respawnWithSOS()**: syncs `px`/`py`/`lastPxInputTime` from `tileToPixelCenter(respawnPos.x, respawnPos.y)` after position assignment
- **teleportToHub()**: syncs `px`/`py`/`lastPxInputTime` from `tileToPixelCenter(hubPosition.x, hubPosition.y)` after teleport
- **teleportFromHub()**: syncs `px`/`py`/`lastPxInputTime` from `tileToPixelCenter(returnPosition.x, returnPosition.y)` after teleport

Import added: `tileToPixelCenter, pixelToTile` from `@into-the-void/game-logic`.

### Task 2: ZonesService.getChunkSync

Added synchronous method to `ZonesService`:

```typescript
getChunkSync(zoneId: string): ChunkData | undefined {
  const zoneState = this.zones.get(zoneId);
  return zoneState?.chunk;
}
```

Pure LRU cache read — no `loadZone()`, no async I/O. Returns `undefined` if zone not cached (caller skips collision validation that tick). Placed immediately after existing `getChunk()` method for grouping.

## Verification

1. `npx nx run game-server:build` passes — no TypeScript errors
2. `ConnectedPlayer` interface includes `px: number`, `py: number`, `lastPxInputTime: number`
3. `authenticate()` calls `tileToPixelCenter` and sets px/py/lastPxInputTime
4. `handleDisconnect()` calls `pixelToTile` before `updateCharacterPosition`
5. `getChunkSync()` is synchronous, reads from LRU cache only

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- [x] `apps/game-server/src/game/player.service.ts` — modified (commit 3f837de)
- [x] `apps/game-server/src/zones/zones.service.ts` — modified (commit eee126c)
- [x] game-server build passes
- [x] ConnectedPlayer has px/py/lastPxInputTime
- [x] getChunkSync returns ChunkData | undefined synchronously
