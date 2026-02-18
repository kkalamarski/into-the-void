---
phase: 28-equipment-system
plan: "02"
subsystem: game-server/inventory
tags: [equipment, tool-swap, computed-stats, server-side]
dependency_graph:
  requires:
    - 28-01 (EquipmentPanel drag-to-equip, DndContext wiring)
    - 26-04 (effectiveStats in game-logic/stats.ts)
    - 26-01 (InventoryService equip/unequip methods)
  provides:
    - equipment:tool_swap WebSocket handler
    - ComputedStats in shared-types for client consumption
    - effectiveStats returned in every equip/unequip response
    - Exo-suit unequip guard (modules must be removed first)
  affects:
    - apps/game-server/src/game/game.gateway.ts
    - apps/game-server/src/game/game.service.ts
    - apps/game-server/src/game/inventory.service.ts
    - packages/shared-types/src/game/inventory.ts
tech_stack:
  added: []
  patterns:
    - effectiveStats computed and attached to inventory:update payload after every equip/unequip
    - swapToolSlots delegates DB persistence to InventoryService (single updateInventoryFull call)
    - Exo-suit guard runs before unequipItem call to prevent orphaned module state
key_files:
  created: []
  modified:
    - packages/shared-types/src/game/inventory.ts
    - apps/game-server/src/game/game.service.ts
    - apps/game-server/src/game/inventory.service.ts
    - apps/game-server/src/game/game.gateway.ts
decisions:
  - ComputedStats defined in shared-types mirrors game-logic ComputedStats — client has access without importing game-logic
  - EquipResult.inventory typed as Inventory & { stats?: ComputedStats } — preserves database Inventory type while allowing stats attachment
  - swapToolSlots uses single updateInventoryFull call for atomic persistence — consistent with confirmed two-write exploit prevention pattern
  - Exo-suit guard checked before unequipItem call so database is never touched when guard fails
metrics:
  duration: 164s
  completed: "2026-02-18"
  tasks: 3
  files: 4
---

# Phase 28 Plan 02: Tool Swap Handler, Computed Stats, and Exo-Suit Guard Summary

Server-side tool swap handler (Q hotkey), effectiveStats attached to all equip/unequip responses, and exo-suit unequip guard preventing orphaned module state.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add ComputedStats to shared-types, stats in equip/unequip | 29a8fd9 | shared-types/game/inventory.ts, game.service.ts |
| 2 | swapToolSlots, handleToolSwap, equipment:tool_swap handler | c36c56c | inventory.service.ts, game.service.ts, game.gateway.ts |
| 3 | Exo-suit unequip guard when modules are equipped | d28d76b | game.service.ts |

## What Was Built

### ComputedStats in shared-types

`packages/shared-types/src/game/inventory.ts` now exports `ComputedStats` interface (mirroring game-logic) and the `Inventory` interface has an optional `stats?: ComputedStats` field. Clients can now import `ComputedStats` without depending on the server-side `game-logic` package.

### Stats in equip/unequip responses

Both `handleEquip` and `handleUnequip` in `game.service.ts` now call `effectiveStats(updatedInventory.equipment as EquipmentJson)` after the operation and attach the result to the `inventory:update` payload. The `EquipResult` interface uses `Inventory & { stats?: ComputedStats }` to type-safely extend the database `Inventory` type.

### Tool swap (Q hotkey)

- `InventoryService.swapToolSlots(playerId)`: swaps `equipment.tool` and `equipment.accessory1` in memory, then persists atomically with a single `updateInventoryFull` call.
- `GameService.handleToolSwap(socketId)`: calls `swapToolSlots`, computes stats on the updated inventory, returns `EquipResult` with stats.
- `GameGateway` handler `@SubscribeMessage('equipment:tool_swap')`: delegates to `gameService.handleToolSwap`, emits `inventory:update` on success, emits `error` on failure.

### Exo-suit unequip guard

In `handleUnequip`, before calling `inventoryService.unequipItem` for the exosuit slot, the guard checks `inventory.equipment.modules.length > 0`. If modules are equipped, it returns `{ success: false, error: 'Remove all modules before unequipping suit' }` immediately, without touching the database.

## Verification

All 9 plan verification criteria passed:
- Build passes: `nx run game-server:build` and `nx run shared-types:build` — PASS
- ComputedStats interface in shared-types/game/inventory.ts — PASS
- Inventory interface has optional stats field — PASS
- handleEquip returns inventory with stats — PASS
- handleUnequip returns inventory with stats — PASS
- swapToolSlots method exists in inventory.service.ts — PASS
- handleToolSwap method exists in game.service.ts — PASS
- equipment:tool_swap handler exists in gateway — PASS
- Exo-suit unequip guard checks modules.length > 0 — PASS

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] EquipResult.inventory type insufficient for stats field**

- **Found during:** Task 1 build
- **Issue:** `game.service.ts` imports `Inventory` from `@into-the-void/database` (Drizzle inferred type without `stats` field); spreading `stats` onto it caused TS2353 error
- **Fix:** Imported `ComputedStats` from game-logic and typed `EquipResult.inventory` as `Inventory & { stats?: ComputedStats }` — type-safe intersection preserving the database type while allowing stats attachment
- **Files modified:** `apps/game-server/src/game/game.service.ts`
- **Commit:** 29a8fd9

## Self-Check: PASSED

Files verified to exist:
- packages/shared-types/src/game/inventory.ts — FOUND
- apps/game-server/src/game/game.service.ts — FOUND
- apps/game-server/src/game/inventory.service.ts — FOUND
- apps/game-server/src/game/game.gateway.ts — FOUND

Commits verified:
- 29a8fd9 — FOUND
- c36c56c — FOUND
- d28d76b — FOUND
