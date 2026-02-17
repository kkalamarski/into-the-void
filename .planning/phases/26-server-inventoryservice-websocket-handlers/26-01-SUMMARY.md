---
phase: 26-server-inventoryservice-websocket-handlers
plan: 01
subsystem: api
tags: [nestjs, inventory, websocket, game-server, drizzle, postgresql]

# Dependency graph
requires:
  - phase: 25-item-data-model-foundation
    provides: "EquipmentJson migration to exo-suit model, updateInventoryFull atomic DB write, database schema"

provides:
  - "InventoryService NestJS injectable service with in-memory inventory cache"
  - "loadForPlayer / flushAndUnload lifecycle methods for player connection"
  - "addItem / removeItem / equipItem / equipModule / unequipItem / unequipModule CRUD methods"
  - "shared-types Inventory aligned to EquipmentJson DB schema (InventoryEquipment type)"

affects: [26-02-PLAN, 26-03-PLAN, 27-inventory-ui]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "In-memory Map cache pattern (Map<playerId, T>) for game-server services"
    - "loadForPlayer / flushAndUnload lifecycle hooks for socket connection/disconnect"
    - "Single updateInventoryFull atomic write for all equip/unequip operations"

key-files:
  created:
    - apps/game-server/src/game/inventory.service.ts
  modified:
    - packages/shared-types/src/game/inventory.ts
    - apps/game-server/src/game/game.module.ts

key-decisions:
  - "InventoryEquipment uses exosuit/modules[]/tool/accessory1/accessory2 — matches EquipmentJson DB schema"
  - "equipItem and unequipItem use unknown intermediate cast for dynamic slot key access on EquipmentJson"
  - "addItem uses updateInventoryItems (items only) — equip operations use updateInventoryFull (atomic both)"

patterns-established:
  - "InventoryService: all equip/unequip operations use updateInventoryFull single atomic call — prevents race-window duplication"
  - "removeItem returns removedItem so callers can spawn ground entities with correct itemId"

# Metrics
duration: 3min
completed: 2026-02-17
---

# Phase 26 Plan 01: InventoryService & Shared-Types Alignment Summary

**NestJS InventoryService with Map<playerId, Inventory> in-memory cache, atomic equip/unequip via updateInventoryFull, and shared-types Inventory aligned to exo-suit EquipmentJson DB schema**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-02-17T21:28:22Z
- **Completed:** 2026-02-17T21:30:31Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments

- Created `InventoryService` with full load/flush/CRUD/equip lifecycle following PlayerService pattern
- Updated `shared-types/src/game/inventory.ts` with `InventoryEquipment` interface matching `EquipmentJson` DB schema
- Registered `InventoryService` in `GameModule` as provider and export (DatabaseService injected via @Global())

## Task Commits

Each task was committed atomically:

1. **Task 1: Update shared-types Inventory to exo-suit model** - `56a3dfe` (feat)
2. **Task 2: Create InventoryService NestJS service** - `624e773` (feat)
3. **Task 3: Register InventoryService in GameModule** - `d8e3007` (feat)

## Files Created/Modified

- `packages/shared-types/src/game/inventory.ts` - Replaced EquipmentSlot with InventoryEquipment; updated ItemRarity (5 tiers) and ItemCategory (6 types)
- `apps/game-server/src/game/inventory.service.ts` - New NestJS service with in-memory cache and all inventory mutation methods
- `apps/game-server/src/game/game.module.ts` - Added InventoryService to providers and exports

## Decisions Made

- Used `unknown` intermediate cast for dynamic slot key assignment on `EquipmentJson` — TypeScript's structural typing requires it since `EquipmentJson` has no index signature
- `addItem` calls `updateInventoryItems` (items-only write) while equip operations call `updateInventoryFull` (atomic) — justified because addItem doesn't touch equipment
- `removeItem` returns `removedItem` from the `Promise` return type so the drop handler can correctly spawn a world entity with the removed item's `itemId`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed TypeScript cast error on dynamic slot key assignment**
- **Found during:** Task 2 (InventoryService build verification)
- **Issue:** TypeScript rejected `(equipment as Record<string, ...>)[slot]` — EquipmentJson lacks index signature, so the cast was flagged as type overlap error
- **Fix:** Changed cast to use `unknown` as intermediate: `(equipment as unknown as Record<string, ...>)[slot]`
- **Files modified:** apps/game-server/src/game/inventory.service.ts
- **Verification:** `nx run game-server:build` passed
- **Committed in:** `624e773` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - type error)
**Impact on plan:** Single-line TypeScript fix, no scope change.

## Issues Encountered

None beyond the TypeScript cast fix documented above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `InventoryService` is ready to be injected into `GameGateway` for WebSocket handler implementation (Plan 26-02)
- `InventoryEquipment` type in shared-types is aligned to DB schema — WebSocket event payloads can now use correct types
- The `flushAndUnload` method must be wired into `GameGateway.handleDisconnect` in next plan

---
*Phase: 26-server-inventoryservice-websocket-handlers*
*Completed: 2026-02-17*
