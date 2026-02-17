---
phase: 27-client-state-inventory-panel-ui
plan: 01
subsystem: ui
tags: [zustand, immer, websocket, inventory, socket.io, nestjs]

# Dependency graph
requires:
  - phase: 26-server-inventoryservice-websocket-handlers
    provides: InventoryService with full CRUD, inventory:update ServerEvent, Inventory type in shared-types
provides:
  - Zustand+immer inventoryStore with inventory/pendingReorder state
  - inventory:update socket wiring to populate client inventory state
  - inventory:reorder ClientEvent type in shared-types
  - InventoryService.moveSlot for slot swap/move with DB persistence
  - GameGateway inventory:reorder handler emitting inventory:update response
affects: [27-02, 27-03, phase-28]

# Tech tracking
tech-stack:
  added: [immer (via zustand/middleware/immer, already installed)]
  patterns: [Separate Zustand store per domain to avoid cross-render contamination, gameSocket.on wired at module level after store definition]

key-files:
  created:
    - apps/web/src/store/inventoryStore.ts
  modified:
    - packages/shared-types/src/network/events.ts
    - apps/game-server/src/game/inventory.service.ts
    - apps/game-server/src/game/game.gateway.ts

key-decisions:
  - "inventoryStore is a separate Zustand store from gameStore — inventory updates must not trigger Phaser canvas re-renders (matches v1.6 research decision)"
  - "moveSlot uses player.id (not characterId) — Player type exposes id field; characterId was a plan typo"
  - "inventory:reorder always responds with inventory:update regardless of moveSlot success/failure — clears pendingReorder flag on client"

patterns-established:
  - "Pattern: gameSocket.on registered at module level after store creation — ensures single registration, avoids React hook scoping"
  - "Pattern: pendingReorder flag in inventoryStore tracks optimistic UI state; cleared on every inventory:update from server"

# Metrics
duration: 2min
completed: 2026-02-17
---

# Phase 27 Plan 01: Client State & Inventory Store Summary

**Separate Zustand+immer inventoryStore wired to inventory:update, with server-side slot reorder round-trip via moveSlot and @SubscribeMessage('inventory:reorder')**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-17T12:42:33Z
- **Completed:** 2026-02-17T12:44:40Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments
- Created `inventoryStore.ts` as separate Zustand store with immer middleware, keeping inventory changes isolated from gameStore (avoids Phaser canvas re-renders)
- Added `inventory:reorder` event to `ClientEvents` in shared-types for type-safe client-to-server slot drag emits
- Implemented `InventoryService.moveSlot` with swap-or-move logic and DB persistence, plus `GameGateway` handler that always responds with `inventory:update`

## Task Commits

Each task was committed atomically:

1. **Task 1: Install dependencies and create inventoryStore** - `c66130b` (feat)
2. **Task 2: Add inventory:reorder to shared-types ClientEvents** - `862a931` (feat)
3. **Task 3: Add moveSlot to InventoryService and inventory:reorder handler to GameGateway** - `532ab00` (feat)

## Files Created/Modified
- `apps/web/src/store/inventoryStore.ts` - Zustand+immer store with inventory/pendingReorder state; wires gameSocket.on('inventory:update')
- `packages/shared-types/src/network/events.ts` - Added 'inventory:reorder' to ClientEventType union and ClientEvents interface
- `apps/game-server/src/game/inventory.service.ts` - Added moveSlot method for slot swap/move with DB persistence
- `apps/game-server/src/game/game.gateway.ts` - Added @SubscribeMessage('inventory:reorder') handler calling moveSlot and emitting inventory:update

## Decisions Made
- Used `player.id` not `player.characterId` in GameGateway handler — the `Player` type from shared-types uses `id`, not `characterId`; the plan had a typo
- Packages `immer`, `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`, `@floating-ui/react` were all already installed; no `pnpm add` needed

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed player.characterId → player.id in GameGateway**
- **Found during:** Task 3 (inventory:reorder handler)
- **Issue:** Plan specified `player.characterId` but the `Player` type from shared-types only has `id` field — `characterId` doesn't exist on the type; would cause TypeScript error
- **Fix:** Changed `player.characterId` to `player.id` in both the `moveSlot` call and `getInventory` call
- **Files modified:** apps/game-server/src/game/game.gateway.ts
- **Verification:** `nx run game-server:build` passes without TypeScript errors
- **Committed in:** `532ab00` (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Necessary fix for correctness — wrong field name would cause TypeScript build failure. No scope creep.

## Issues Encountered
- None beyond the auto-fixed deviation above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `useInventoryStore` ready for import in inventory panel UI components (Phase 27 Plan 02)
- `gameSocket.emit('inventory:reorder', { fromSlot, toSlot })` type-safe and server-handled
- `pendingReorder` flag available for optimistic UI feedback during drag-and-drop

---
*Phase: 27-client-state-inventory-panel-ui*
*Completed: 2026-02-17*

## Self-Check: PASSED

- FOUND: apps/web/src/store/inventoryStore.ts
- FOUND: .planning/phases/27-client-state-inventory-panel-ui/27-01-SUMMARY.md
- FOUND commit c66130b: feat(27-01): create inventoryStore with Zustand+immer
- FOUND commit 862a931: feat(27-01): add inventory:reorder to shared-types ClientEvents
- FOUND commit 532ab00: feat(27-01): add moveSlot to InventoryService and inventory:reorder handler
