---
phase: 26-server-inventoryservice-websocket-handlers
plan: 03
subsystem: api
tags: [nestjs, inventory, websocket, game-server, socket.io, lifecycle]

# Dependency graph
requires:
  - phase: 26-01
    provides: "InventoryService with loadForPlayer/flushAndUnload lifecycle and in-memory cache"
  - phase: 26-02
    provides: "handleItemPickup in GameService with atomic claim-before-await race protection"

provides:
  - "inventory:update emitted privately on auth success after loadForPlayer call"
  - "inventory flush to DB on player disconnect via PlayerService.handleDisconnect -> flushAndUnload"
  - "handleInteraction case 'item' routes through handleItemPickup (writes inventory before despawn)"
  - "handleInteract gateway handler emits private inventory:update when interaction returns inventory"

affects: [27-inventory-ui]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Inventory lifecycle fully wired: loadForPlayer on auth -> flushAndUnload on disconnect"
    - "InteractionResult.inventory propagates pickup result from service to gateway for private emit"
    - "case 'item' in handleInteraction delegates to handleItemPickup (no duplicate pickup logic)"

key-files:
  created: []
  modified:
    - apps/game-server/src/game/game.gateway.ts
    - apps/game-server/src/game/player.service.ts
    - apps/game-server/src/game/game.service.ts

key-decisions:
  - "PlayerService injects InventoryService directly (no forwardRef needed — no circular dependency)"
  - "case 'item' in handleInteraction delegates fully to handleItemPickup — avoids duplicating claim/write logic"
  - "InteractionResult.inventory is optional — entity:update still broadcasts zone-wide; inventory:update only when non-null"

patterns-established:
  - "Inventory lifecycle complete: loadForPlayer on auth success -> private inventory:update -> flushAndUnload on disconnect"
  - "handleInteract emits inventory:update only if result.inventory is non-null — maintains backward compatibility with non-item interactions"

# Metrics
duration: 2min
completed: 2026-02-17
---

# Phase 26 Plan 03: Inventory Lifecycle Wiring Summary

**Inventory lifecycle fully wired — loadForPlayer on auth emits private inventory:update; flushAndUnload persists to DB on disconnect; case 'item' interact routes through handleItemPickup with claim-before-await race protection**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-02-17T21:39:37Z
- **Completed:** 2026-02-17T21:41:33Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments

- Wired `inventoryService.loadForPlayer` into `handleAuth` — inventory loaded from DB at session start, emitted to client as `inventory:update` immediately after `auth:success`
- Injected `InventoryService` into `PlayerService` — `handleDisconnect` now calls `flushAndUnload` before clearing player from in-memory maps, replacing the "In a real implementation" placeholder comment
- Updated `handleInteraction` `case 'item':` in `GameService` to delegate to `handleItemPickup` — uses existing race-protected claim map; added optional `inventory` field to `InteractionResult` so gateway can emit private `inventory:update` on interact

## Task Commits

Each task was committed atomically:

1. **Task 1: Emit inventory:update on auth success** - `fc361f8` (feat)
2. **Task 2: Wire PlayerService to flush inventory on disconnect** - `7f1990f` (feat)
3. **Task 3: Update handleInteraction for item pickup** - `5a30ae6` (feat)

## Files Created/Modified

- `apps/game-server/src/game/game.gateway.ts` - Added `loadForPlayer` call in `handleAuth`; added `inventory:update` emit after `auth:success`/`zone:state`; added `inventory:update` emit in `handleInteract` when `result.inventory` present
- `apps/game-server/src/game/player.service.ts` - Imported `InventoryService`; added to constructor injection; `handleDisconnect` calls `inventoryService.flushAndUnload(playerId)` before clearing maps
- `apps/game-server/src/game/game.service.ts` - Added `inventory?: Inventory` to `InteractionResult` interface; replaced `case 'item':` stub with `handleItemPickup` delegation returning `inventory` in result

## Decisions Made

- `PlayerService` injects `InventoryService` directly without `forwardRef` — verified `InventoryService` has no `PlayerService` dependency, so no circular reference exists
- `case 'item':` in `handleInteraction` delegates entirely to `handleItemPickup` rather than duplicating claim/inventory write logic — single source of truth for atomic item pickup with race protection
- `InteractionResult.inventory` is optional — zone-wide `entity:update` still broadcasts for all interaction types; `inventory:update` is only emitted when `result.inventory` is non-null, preserving backward compatibility with mineral/creature interactions

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added InteractionResult.inventory before Task 1 gateway emit could compile**
- **Found during:** Task 1 verification build (after adding `result.inventory` reference in `handleInteract`)
- **Issue:** TypeScript error TS2339: `Property 'inventory' does not exist on type 'InteractionResult'` — the interface in `game.service.ts` lacked the optional field, blocking Task 1 build
- **Fix:** Added `inventory?: Inventory` to `InteractionResult` interface as part of Task 3 changes; committed Task 3 service changes separately after Task 1 gateway commit
- **Files modified:** apps/game-server/src/game/game.service.ts
- **Verification:** `nx run game-server:build` passed after all three tasks
- **Committed in:** `5a30ae6` (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (Rule 3 - compile-time blocking)
**Impact on plan:** Single interface field addition required for Task 1 and Task 3 to be internally consistent. No scope change.

## Issues Encountered

Task 1 and Task 3 are compile-coupled at the TypeScript level — the gateway `handleInteract` references `result.inventory` which requires `InteractionResult.inventory` to exist in the service. Build order required Task 3's interface change to land before the final verification pass. Resolved by staging gateway changes first (Task 1 commit), then applying the service changes (Task 3 commit) and verifying the combined build.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Full inventory lifecycle is operational: load on auth → emit to client → persist on disconnect
- Both `player:interact` (world interaction) and `inventory:pickup` (direct pickup event) now route through the same `handleItemPickup` handler with atomic claim protection
- Phase 27 (Inventory UI) can now expect `inventory:update` events on auth success and after every pickup/drop/use/equip interaction

---

## Self-Check: PASSED

- FOUND: apps/game-server/src/game/game.gateway.ts
- FOUND: apps/game-server/src/game/player.service.ts
- FOUND: apps/game-server/src/game/game.service.ts
- FOUND: .planning/phases/26-server-inventoryservice-websocket-handlers/26-03-SUMMARY.md
- FOUND commit fc361f8: feat(26-03): emit inventory:update on auth success and item interact
- FOUND commit 7f1990f: feat(26-03): wire InventoryService into PlayerService to flush on disconnect
- FOUND commit 5a30ae6: feat(26-03): route handleInteraction case 'item' through handleItemPickup

---
*Phase: 26-server-inventoryservice-websocket-handlers*
*Completed: 2026-02-17*
