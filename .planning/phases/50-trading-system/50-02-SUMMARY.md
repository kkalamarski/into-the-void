---
phase: 50-trading-system
plan: 02
status: complete
subsystem: game-server/trading
tags: [trading, npc, socket-handlers, credits]
dependency-graph:
  requires: [50-01 (credit mutations, trade socket events)]
  provides: [TradeService with buy/sell, trade:buy handler, trade:sell handler]
  affects: [player credits, player inventory, NPC interactions]
tech-stack:
  added: [TradeService]
  patterns: [atomic credit operations, refund on failure, NpcRegistry lookup]
key-files:
  created:
    - apps/game-server/src/game/trade.service.ts
  modified:
    - apps/game-server/src/game/game.module.ts
    - apps/game-server/src/game/game.gateway.ts
decisions:
  - TradeService validates NPC type, item availability, credits, and inventory space
  - buy() uses atomic deductCredits with addCredits refund if addItem fails
  - sell() only accepts items that are in the trader's inventory (no generic selling)
  - Both handlers emit inventory:update, credits:update, and trade:result
metrics:
  duration: 191s
  completed: 2026-02-20
---

# Phase 50 Plan 02: Trade Service and Socket Handlers Summary

Server-side TradeService with buy()/sell() methods and trade:buy/trade:sell socket handlers.

## What Was Done

### Task 1: Create TradeService

Created `apps/game-server/src/game/trade.service.ts`:

**buy() method:**
- Validates NPC is a trader via NpcRegistry.get()
- Validates item exists in trader's inventory
- Checks stock availability (-1 = unlimited)
- Pre-checks inventory space
- Validates item in ItemRegistry
- Atomic credit deduction via deductCredits()
- Creates InventoryItemJson with crypto.randomUUID(), slot assignment, empty properties
- CRITICAL: If addItem fails after deduction, refunds via addCredits() to prevent credit loss
- Updates player's cached credits in memory

**sell() method:**
- Validates NPC is a trader
- Finds item in player inventory by instanceId
- Checks trader buys this item (must be in trader's inventory)
- Removes item from inventory
- Adds credits via addCredits()
- Updates player's cached credits in memory

### Task 2: Register TradeService in GameModule

Modified `apps/game-server/src/game/game.module.ts`:
- Import TradeService
- Added to providers array
- Added to exports array

### Task 3: Add Trade Socket Handlers

Modified `apps/game-server/src/game/game.gateway.ts`:
- Import TradeService
- Added TradeService to constructor

**trade:buy handler:**
- Receives `{ npcId, itemId, quantity }`
- Calls TradeService.buy()
- On success: emits inventory:update, credits:update, trade:result with success=true
- On failure: emits trade:result with success=false and error

**trade:sell handler:**
- Receives `{ npcId, itemInstanceId, quantity }`
- Calls TradeService.sell()
- On success: emits inventory:update, credits:update, trade:result with success=true
- On failure: emits trade:result with success=false and error

## Verification Results

- TypeScript compilation: PASSED
- TradeService registered in GameModule: CONFIRMED
- trade:buy handler at line 1010: CONFIRMED
- trade:sell handler at line 1059: CONFIRMED
- Handlers emit inventory:update, credits:update, trade:result: CONFIRMED
- buy() refund logic with addCredits on failure: CONFIRMED

## Commits

| Commit | Description |
|--------|-------------|
| 20b3a6b | feat(50-02): create TradeService with buy() and sell() methods |
| cd21f04 | feat(50-02): register TradeService in GameModule |
| 5cd53fe | feat(50-02): add trade:buy and trade:sell socket handlers to GameGateway |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed uuid import issue**
- **Found during:** Task 1 creation
- **Issue:** Plan used `import { v4 as uuidv4 } from 'uuid'` but uuid package not available
- **Fix:** Used `crypto.randomUUID()` (native Node.js) matching existing codebase pattern
- **Files modified:** apps/game-server/src/game/trade.service.ts

**2. [Rule 3 - Blocking] Fixed InventoryItemJson missing properties field**
- **Found during:** Task 1 compilation
- **Issue:** InventoryItemJson requires `properties: Record<string, unknown>` field
- **Fix:** Added `properties: {}` to newItem creation
- **Files modified:** apps/game-server/src/game/trade.service.ts

## Self-Check: PASSED

All created files exist and commits verified.
