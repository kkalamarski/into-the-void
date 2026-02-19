---
phase: 47-hub-travel
plan: 02
subsystem: game-server
tags: [portal, hub-travel, websocket, database, player-service, zone-transition]

# Dependency graph
requires:
  - phase: 47-01
    provides: TileId.PORTAL = 16 in terrain.ts enum, portal placed in every open-world chunk
  - phase: 46-hub-zones
    provides: hub zone infrastructure (isHubZone, getFactionRespawnPosition, hub_ zone IDs)
provides:
  - lastWorldPosition JSONB column in characters table (nullable)
  - saveLastWorldPosition() and getLastWorldPosition() exported from database package
  - portal:use in ClientEventType union and ClientEvents interface
  - lastWorldPosition optional field on Player and ConnectedPlayer interfaces
  - teleportToHub() method in PlayerService (saves position, teleports to faction hub)
  - handlePortalUse() @SubscribeMessage handler in GameGateway
affects: [47-hub-travel, 48-npc-dialogue, client-rendering]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Portal use validates player tile position server-side before teleporting (tileId === 16)"
    - "Zone transition sequence: update rooms -> notify old zone -> deactivate old if empty -> activate new -> send zone:state -> notify new zone"
    - "lastWorldPosition saved in-memory (ConnectedPlayer) and persisted to DB on hub entry"
    - "isHubZone guard in teleportToHub() prevents double-hub entry"

key-files:
  created: []
  modified:
    - packages/database/src/schema/characters.ts
    - packages/database/src/queries/characters.ts
    - packages/shared-types/src/network/events.ts
    - packages/shared-types/src/core/player.ts
    - apps/game-server/src/game/player.service.ts
    - apps/game-server/src/game/game.gateway.ts
    - apps/web/src/game/rendering/TileRenderer.ts

key-decisions:
  - "Server validates player stands on TileId.PORTAL (=16) before allowing hub teleport — client cannot bypass"
  - "lastWorldPosition saved both in-memory (ConnectedPlayer) and to DB on hub entry; restored from DB on authenticate()"
  - "Hub AI is activated after portal teleport (aiService.activateZone) to ensure hub creatures tick"

patterns-established:
  - "Zone transition from portal: same pattern as zone-crossing movement (update rooms, notify old/new zones, send zone:state)"
  - "Tile validation by numeric ID: use TileId enum constant comments (= 16) rather than importing the full enum in gateway"

# Metrics
duration: 7min
completed: 2026-02-19
---

# Phase 47 Plan 02: Portal Interaction and Hub Travel Summary

**Portal:use socket event with server-side tile validation teleports players to faction hub, saving open-world position to DB via lastWorldPosition JSONB column**

## Performance

- **Duration:** ~7 min
- **Started:** 2026-02-19T22:17:18Z
- **Completed:** 2026-02-19T22:24:28Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments
- `lastWorldPosition` nullable JSONB column added to characters schema and pushed to database via drizzle-kit
- `saveLastWorldPosition()` and `getLastWorldPosition()` query functions added to database package
- `portal:use` event added to `ClientEventType` union and `ClientEvents` interface with empty payload
- `teleportToHub()` method added to `PlayerService`: rejects if already in hub, saves current position to DB and in-memory, teleports to faction hub
- `handlePortalUse()` WebSocket handler added to `GameGateway`: validates player stands on tile ID 16, calls `teleportToHub()`, emits full zone transition events

## Task Commits

Each task was committed atomically:

1. **Task 1: Add lastWorldPosition DB column and query functions** - `eed6867` (feat)
2. **Task 2: Add portal:use event and teleportToHub to PlayerService** - `c20ab37` (feat)
3. **Task 3: Wire portal:use handler in GameGateway** - `1ecd3c1` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `packages/database/src/schema/characters.ts` - Added `lastWorldPosition` JSONB column (nullable `PositionJson | null`)
- `packages/database/src/queries/characters.ts` - Added `saveLastWorldPosition()` and `getLastWorldPosition()` functions
- `packages/shared-types/src/network/events.ts` - Added `portal:use` to `ClientEventType` and `ClientEvents`
- `packages/shared-types/src/core/player.ts` - Added optional `lastWorldPosition?: Position` to `Player` interface
- `apps/game-server/src/game/player.service.ts` - Added `teleportToHub()` method and `lastWorldPosition` to `ConnectedPlayer`; populates from DB on `authenticate()`
- `apps/game-server/src/game/game.gateway.ts` - Added `handlePortalUse()` handler with tile validation and zone transition logic
- `apps/web/src/game/rendering/TileRenderer.ts` - Auto-fix: added `TileId.PORTAL` entry to `TILE_TEXTURE_MAP`

## Decisions Made
- Server validates tile ID === 16 before teleporting; client has no authority over this check
- `lastWorldPosition` saved both in-memory and to DB on hub entry; DB ensures persistence across disconnects
- `aiService.activateZone()` called for the hub zone after portal use, matching the pattern used in `handleAuth`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Added TileId.PORTAL to TILE_TEXTURE_MAP in TileRenderer.ts**
- **Found during:** Task 2 verification (pnpm build)
- **Issue:** `TileId.PORTAL = 16` was added to the enum in Phase 47-01 but `TILE_TEXTURE_MAP` in `TileRenderer.ts` uses `Record<TileId, string>` which requires exhaustive coverage. The build failed with TS2741 (property missing from record type).
- **Fix:** Added `[TileId.PORTAL]: 'tile_portal'` to `TILE_TEXTURE_MAP` — matches the texture key set in Phase 47-01 portal tile definition
- **Files modified:** `apps/web/src/game/rendering/TileRenderer.ts`
- **Verification:** `pnpm build` passes with 0 errors
- **Committed in:** `c20ab37` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug: missing record entry from prior phase)
**Impact on plan:** Auto-fix resolved a carry-forward omission from Phase 47-01. No scope creep. All three success criteria satisfied.

## Issues Encountered
- `drizzle-kit push` uses an interactive TUI prompt for confirmation. Piping `echo "y"` does not satisfy it; required `printf '\033[B\r'` (down-arrow + carriage return) to navigate to "Yes" option and confirm. Changes were applied successfully.

## User Setup Required
None - no external service configuration required. DB column applied automatically via `drizzle-kit push`.

## Next Phase Readiness
- Portal interaction is fully wired end-to-end: player walks onto tile 16, sends `portal:use`, server validates, saves position, teleports to faction hub
- `lastWorldPosition` persists across sessions — ready for Phase 47-03 or later: "return from hub" mechanics
- Hub zone AI activates on arrival — hub creatures will tick for NPC interactions (Phase 48+)
- Client-side `portal:use` emission still needs to be added in the web client (not in plan scope — server-side complete)

## Self-Check: PASSED

- FOUND: packages/database/src/schema/characters.ts (lastWorldPosition column)
- FOUND: packages/database/src/queries/characters.ts (saveLastWorldPosition, getLastWorldPosition)
- FOUND: packages/shared-types/src/network/events.ts (portal:use in ClientEventType, ClientEvents)
- FOUND: packages/shared-types/src/core/player.ts (lastWorldPosition optional field)
- FOUND: apps/game-server/src/game/player.service.ts (teleportToHub method)
- FOUND: apps/game-server/src/game/game.gateway.ts (handlePortalUse handler)
- FOUND: apps/web/src/game/rendering/TileRenderer.ts (TileId.PORTAL entry)
- FOUND: commit eed6867 (Task 1)
- FOUND: commit c20ab37 (Task 2)
- FOUND: commit 1ecd3c1 (Task 3)

---
*Phase: 47-hub-travel*
*Completed: 2026-02-19*
