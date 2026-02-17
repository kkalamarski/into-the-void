---
phase: 26-server-inventoryservice-websocket-handlers
plan: 02
subsystem: api
tags: [nestjs, inventory, websocket, game-server, socket.io, race-condition]

# Dependency graph
requires:
  - phase: 26-01
    provides: "InventoryService with addItem/removeItem/equipItem/equipModule/unequipItem/unequipModule"

provides:
  - "claimEntity/releaseClaim synchronous claim map on ZonesService for atomic pickup"
  - "despawnAt filtering in getZoneEntities for expired ground items"
  - "handleItemPickup/handleItemDrop/handleItemUse/handleEquip/handleUnequip on GameService"
  - "5 @SubscribeMessage handlers in GameGateway: inventory:pickup, inventory:drop, inventory:use, equipment:change, inventory:unequip"

affects: [26-03-PLAN, 27-inventory-ui]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Synchronous claim-before-await pattern for race condition prevention (claimEntity before any await)"
    - "Private inventory:update via client.emit() — never zone broadcast"
    - "Zone-wide entity events (entity:spawn, entity:despawn) via server.to(zoneId).emit()"
    - "ItemEntity spawned on drop with 5-minute despawnAt timestamp"

key-files:
  created: []
  modified:
    - apps/game-server/src/zones/zones.service.ts
    - apps/game-server/src/game/game.service.ts
    - apps/game-server/src/game/game.gateway.ts

key-decisions:
  - "claimEntity is synchronous — must execute before any await to prevent TOCTOU race on simultaneous pickup"
  - "ItemEntity.name uses ItemDefinition.displayName (not item.name) — items package uses displayName field"
  - "equipment:change and inventory:unequip use inline { instanceId: string } type — not in ClientEvents interface (not client-initiated in current design)"

patterns-established:
  - "claim-release wraps entire async pickup flow in try/catch so claim is always released on failure"
  - "handleItemDrop uses ItemRegistry.get(itemId)?.displayName || itemId as ground entity name fallback"
  - "All inventory:update emissions are private (client.emit) — entity:spawn/despawn are zone-wide (server.to)"

# Metrics
duration: 3min 15s
completed: 2026-02-17
---

# Phase 26 Plan 02: WebSocket Inventory Handlers Summary

**5 @SubscribeMessage inventory handlers in GameGateway with atomic pickup via synchronous claim map in ZonesService and full handler methods in GameService**

## Performance

- **Duration:** ~3m 15s
- **Started:** 2026-02-17T21:33:44Z
- **Completed:** 2026-02-17T21:36:59Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments

- Added `claimEntity`/`releaseClaim` synchronous claim map to `ZonesService` with `despawnAt` filtering in `getZoneEntities`
- Added 5 handler methods to `GameService`: `handleItemPickup` (claim-before-await race protection), `handleItemDrop` (ground item spawn with 5-min despawn), `handleItemUse` (consumable effects + removal), `handleEquip` (category-based slot routing), `handleUnequip` (slot detection by instanceId)
- Added 5 `@SubscribeMessage` handlers to `GameGateway` with correct emit scoping: `inventory:update` private, `entity:spawn`/`entity:despawn` zone-wide

## Task Commits

Each task was committed atomically:

1. **Task 1: Add claim map to ZonesService** - `0cad20b` (feat)
2. **Task 2: Add inventory handler methods to GameService** - `e59e7cd` (feat)
3. **Task 3: Add 5 @SubscribeMessage handlers to GameGateway** - `719063b` (feat)

## Files Created/Modified

- `apps/game-server/src/zones/zones.service.ts` - Added `claimedEntities` Map, `claimEntity`/`releaseClaim` methods, updated `getZoneEntities` with `despawnAt` filtering
- `apps/game-server/src/game/game.service.ts` - Added `InventoryService` injection + `ItemRegistry`/`game-logic` imports + 5 handler methods
- `apps/game-server/src/game/game.gateway.ts` - Added `InventoryService` injection + 5 `@SubscribeMessage` handlers

## Decisions Made

- Used `ItemDefinition.displayName` (not `.name`) for ground entity name — items package uses `displayName` as the human-readable field; `.name` is not present
- `equipment:change` and `inventory:unequip` handlers use inline `{ instanceId: string }` type instead of `ClientEvents` — these events are not defined in `ClientEvents` interface in shared-types (no `ClientEventType` entry for them)
- `claimEntity` synchronous execution is positioned before the first `await` in `handleItemPickup` — this is the critical correctness invariant: no async gap between check and set

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed ItemEntity name field to use displayName**
- **Found during:** Task 2 (handleItemDrop implementation)
- **Issue:** Plan used `itemDef?.name || removedItem.itemId` but `ItemDefinition` from `@into-the-void/items` uses `displayName` (not `name`) as the human-readable field — using `.name` would result in a TypeScript error (property does not exist)
- **Fix:** Changed to `itemDef?.displayName || removedItem.itemId`
- **Files modified:** apps/game-server/src/game/game.service.ts
- **Verification:** `nx run game-server:build` passed
- **Committed in:** `e59e7cd` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - field name mismatch)
**Impact on plan:** Single field name correction, no scope change.

## Issues Encountered

None beyond the `displayName` fix documented above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `GameGateway` now has all 5 inventory WebSocket handlers — clients can now trigger `inventory:pickup`, `inventory:drop`, `inventory:use`, `equipment:change`, `inventory:unequip`
- `GameService.handleItemPickup` wires to `ZonesService.claimEntity` for race protection — ready for concurrent player testing
- `InventoryService.flushAndUnload` still needs to be wired into `GameGateway.handleDisconnect` (noted as pending from Plan 01 — check if Plan 03 covers this)

## Self-Check: PASSED

- FOUND: apps/game-server/src/zones/zones.service.ts
- FOUND: apps/game-server/src/game/game.service.ts
- FOUND: apps/game-server/src/game/game.gateway.ts
- FOUND: .planning/phases/26-server-inventoryservice-websocket-handlers/26-02-SUMMARY.md
- FOUND commit 0cad20b: feat(26-02): add claim map to ZonesService
- FOUND commit e59e7cd: feat(26-02): add inventory handler methods to GameService
- FOUND commit 719063b: feat(26-02): add 5 inventory @SubscribeMessage handlers to GameGateway

---
*Phase: 26-server-inventoryservice-websocket-handlers*
*Completed: 2026-02-17*
