---
phase: 47-hub-travel
verified: 2026-02-19T23:07:08Z
status: passed
score: 5/5 must-haves verified
re_verification:
  previous_status: gaps_found
  previous_score: 4/5
  gaps_closed:
    - "Player in hub can leave and return to saved open-world position — hub.ts now places PORTAL_TILE_ID (16) at (32,32); checkPortalTile() in WorldScene emits portal:use on that tile; server handlePortalUse delegates to handleHubLeave when in hub zone"
  gaps_remaining: []
  regressions: []
---

# Phase 47: Hub Travel Verification Report

**Phase Goal:** Players can travel to their faction hub from the open world via portal structures, return instantly from anywhere via a recall ability, and leave the hub back to their last open-world position
**Verified:** 2026-02-19T23:07:08Z
**Status:** passed
**Re-verification:** Yes — after gap closure (Plans 04 and 05)

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Portal tile type exists and spawns in open-world zones | VERIFIED | `TileId.PORTAL=16` in terrain.ts; `placePortals()` called from `generateStructures()` — 1 portal per open-world chunk at deterministic position in range 20-44 |
| 2 | Player's last open-world position is saved when entering a hub | VERIFIED | `teleportToHub()` writes `player.lastWorldPosition` in memory and calls `saveLastWorldPosition(db, playerId, ...)` in DB; `authenticate()` restores from `character.lastWorldPosition` on reconnect |
| 3 | H key recall teleports player to faction hub from open world | VERIFIED | H key → `gameSocket.emit('hub:recall', {})` (WorldScene line 246) → `@SubscribeMessage('hub:recall')` handler calls `teleportToHub()` with `isHubZone` guard |
| 4 | Portal interaction in open world teleports player to faction hub | VERIFIED | `checkPortalTile()` emits `portal:use` when `tileNumericId === 16` (WorldScene lines 540-542); `@SubscribeMessage('portal:use')` validates tile 16 in chunk and calls `teleportToHub()` |
| 5 | Player in hub can leave and return to saved open-world position | VERIFIED | `generateHubChunk()` places `PORTAL_TILE_ID` (16) at (32,32) after generation loop (hub.ts lines 99-103); `checkPortalTile()` fires in hub — emits `portal:use`; server `handlePortalUse` detects `isHubZone` and delegates to `handleHubLeave` → `teleportFromHub()` |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `packages/tiles/src/ids.ts` | PORTAL tile ID constant | VERIFIED | `PORTAL: 'portal'` in TILE_IDS |
| `packages/tiles/src/registry.ts` | Portal tile definition in TileRegistry | VERIFIED | `portal` entry with `walkable: true` |
| `packages/world-gen/src/generation/terrain.ts` | TileId.PORTAL enum value 16 | VERIFIED | `PORTAL = 16` and `[TileId.PORTAL]: TILE_IDS.PORTAL` in `tileIdToString()` |
| `packages/world-gen/src/generation/structures.ts` | `placePortals()` spawns portals | VERIFIED | `PORTAL_NUMERIC_ID = 16`, `placePortals()` places 1 per open-world chunk; called from `generateStructures()` |
| `packages/world-gen/src/generation/hub.ts` | Hub contains portal tile for exit | VERIFIED | `PORTAL_TILE_ID = 16` constant at line 3; `tiles[32][32] = PORTAL_TILE_ID` placed after generation loop (lines 99-103); commit 2c8ed20 |
| `packages/database/src/schema/characters.ts` | `lastWorldPosition` JSONB column | VERIFIED | `lastWorldPosition: jsonb('last_world_position').$type<PositionJson | null>()` |
| `packages/database/src/queries/characters.ts` | `saveLastWorldPosition` + `getLastWorldPosition` | VERIFIED | Both functions exported and implemented |
| `packages/shared-types/src/network/events.ts` | `portal:use`, `hub:recall`, `hub:leave` events | VERIFIED | All three in `ClientEventType` union and `ClientEvents` interface |
| `apps/game-server/src/game/player.service.ts` | `teleportToHub()` + `teleportFromHub()` | VERIFIED | Both fully implemented; DB persistence included |
| `apps/game-server/src/game/game.gateway.ts` | `handlePortalUse`, `handleHubRecall`, `handleHubLeave` | VERIFIED | All three `@SubscribeMessage` handlers present; `handlePortalUse` delegates to `handleHubLeave` in hub (line 774) |
| `apps/web/src/game/scenes/WorldScene.ts` | H key emits `hub:recall` | VERIFIED | Line 246 |
| `apps/web/src/game/scenes/WorldScene.ts` | `checkPortalTile` emits `portal:use` on tile 16 | VERIFIED | Lines 516-548; called from `updateLocalPlayerSprite` on non-reconciling moves (line 1528); commit 39def83 |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `WorldScene.ts` | socket | `emit hub:recall` on H key | WIRED | Line 246 |
| `WorldScene.ts` | socket | `emit portal:use` on tile 16 | WIRED | `checkPortalTile()` lines 540-542; debounced by posKey |
| `hub.ts` | tiles | portal tile ID 16 at (32,32) | WIRED | `tiles[32][32] = PORTAL_TILE_ID` after generation loop — commit 2c8ed20 |
| `WorldScene.ts` | socket | `emit portal:use` in hub (tile 16 at 32,32) | WIRED | `checkPortalTile()` uses `currentTiles` fast path; hub tile (32,32)=16 triggers the emit |
| `game.gateway.ts` | `player.service.ts` | `handlePortalUse` → `teleportToHub` | WIRED | Line 789+ |
| `game.gateway.ts` | `player.service.ts` | `handlePortalUse` delegates to `handleHubLeave` in hub | WIRED | Lines 773-774 |
| `game.gateway.ts` | `player.service.ts` | `handleHubLeave` → `teleportFromHub` | WIRED | Line 903 |
| `player.service.ts` | database | `saveLastWorldPosition` DB call | WIRED | Lines 266-270 in `teleportToHub`; line 321 in `teleportFromHub` (clear on consume) |

### Requirements Coverage

| Requirement | Status | Blocking Issue |
|-------------|--------|----------------|
| TRVL-01: Travel via portal structure (open world → hub) | SATISFIED | Tile 16 → `portal:use` → `handlePortalUse` → `teleportToHub` fully wired |
| TRVL-02: Recall ability H key (open world → hub) | SATISFIED | H key → `hub:recall` → `handleHubRecall` → `teleportToHub` fully wired |
| TRVL-03: Leave hub to last open-world position | SATISFIED | Hub tile 16 at (32,32) → `portal:use` → `handlePortalUse` delegates to `handleHubLeave` → `teleportFromHub` restores `lastWorldPosition` |
| TRVL-04: Hub arrival/departure visible to other players | SATISFIED | `handlePortalUse` and `handleHubLeave` both emit `player:left` to old zone and `zone:state` to new zone |

### Anti-Patterns Found

None — no TODO/FIXME/placeholder patterns in hub.ts or WorldScene.ts gap-closure additions.

### Human Verification Required

The following should be tested by a human once the server is running:

#### 1. Portal Entry Flow

**Test:** Walk onto a portal tile (purple tile) in an open-world zone.
**Expected:** Player is teleported to faction hub zone. Zone changes to hub. Other players in open world see player disappear.
**Why human:** Visual confirmation of tile appearance, teleport effect, and zone name in HUD.

#### 2. H Key Recall

**Test:** Press H while in an open-world zone.
**Expected:** Player instantly teleports to faction hub.
**Why human:** Visual confirmation of instant teleport and position change.

#### 3. Hub Exit via Center Portal

**Test:** Enter hub (via portal or H key recall), navigate to tile (32,32) (hub center), step on portal tile.
**Expected:** Player returns to their previous open-world zone at the exact tile position they left from.
**Why human:** Visual confirmation that the tile is visible/discoverable, that the return position is accurate, and that other players in both zones see the transition.

#### 4. Position Persistence Across Reconnect

**Test:** Enter hub, disconnect, reconnect.
**Expected:** Player re-enters hub with `lastWorldPosition` still saved; leave hub and arrive at correct open-world position.
**Why human:** Requires a real WebSocket reconnect cycle to verify DB persistence.

### Gaps Summary

No gaps remain. All five observable truths are verified:

- Plan 05 (commit 2c8ed20) added `PORTAL_TILE_ID = 16` to `generateHubChunk()` at position (32,32), providing the tile that `checkPortalTile()` can detect inside a hub zone.
- Plan 04 (commit 39def83) added `checkPortalTile()` to `WorldScene` — it fires after each non-reconciling movement step, emits `portal:use` when `tileNumericId === 16`, and is debounced by position key.
- The server's `handlePortalUse` (pre-existing from Plan 03) correctly distinguishes hub from open-world by calling `isHubZone()` and delegating to `handleHubLeave` → `teleportFromHub()` when in a hub.

The full hub travel loop — open-world portal entry, H key recall, and hub exit — is now end-to-end wired.

---

_Verified: 2026-02-19T23:07:08Z_
_Verifier: Claude (gsd-verifier)_
