---
phase: 50-trading-system
plan: 03
status: complete
subsystem: client-ui
tags: [trading, ui, panels, npc-interaction]
dependency-graph:
  requires: [50-01]
  provides: [trading-panel, npcStore-trading-state]
  affects: [GameUI, NpcInteractionModal]
tech-stack:
  added: []
  patterns: [capture-phase-escape-key, stopPropagation-modal-isolation]
key-files:
  created:
    - apps/web/src/ui/panels/TradingPanel.tsx
    - apps/web/src/ui/panels/TradingPanel.css
  modified:
    - apps/web/src/store/npcStore.ts
    - apps/web/src/ui/panels/NpcInteractionModal.tsx
    - apps/web/src/ui/GameUI.tsx
decisions:
  - "Escape key uses capture phase + stopPropagation to close TradingPanel without closing NpcInteractionModal"
  - "TradingPanel stays open when NpcInteractionModal is open (no mutual exclusion)"
  - "Items trader doesn't buy show 'Not traded' instead of sell button"
metrics:
  duration: "3m 10s"
  completed: "2026-02-20"
  tasks: 4
  files: 5
---

# Phase 50 Plan 03: Trading Panel UI Summary

TradingPanel component with dual buy/sell sections, wired to NpcInteractionModal Trade button and integrated into GameUI.

## What Was Done

### Task 1: Extend npcStore with trading state

Added trading-related state and actions to `apps/web/src/store/npcStore.ts`:

- `showTrading: boolean` - controls TradingPanel visibility
- `tradeError: string | null` - displays trade failure messages
- `openTrading()` - opens panel and clears error
- `closeTrading()` - closes panel and clears error
- `setTradeError(error)` - sets error message from trade:result

Added socket listener for `trade:result` event to display server-side trade errors.

**Commit:** 45536df

### Task 2: Create TradingPanel component

Created `apps/web/src/ui/panels/TradingPanel.tsx` (182 lines):

- **Buy section**: Shows trader inventory with item names, prices, and stock
- **Sell section**: Shows player inventory with sell prices from trader definition
- **Credits display**: Shows player's current credit balance
- **Error display**: Shows trade:result error messages
- **Buy button**: Disabled when player cannot afford item
- **Sell button**: Only appears for items trader will buy
- **Escape key**: Uses capture phase + stopPropagation to close only TradingPanel

Created `apps/web/src/ui/panels/TradingPanel.css` (177 lines):
- Two-column layout (buy/sell sections)
- Green accent for buy, orange accent for sell
- Gold color for prices
- Opacity reduction for unaffordable/unsellable items

**Commit:** f3eab44

### Task 3: Wire Trade button in NpcInteractionModal

Modified `apps/web/src/ui/panels/NpcInteractionModal.tsx`:

- Import `openTrading` from npcStore
- Trade button onClick now calls `openTrading()` instead of console.log placeholder

**Commit:** 9c10267

### Task 4: Add TradingPanel to GameUI

Modified `apps/web/src/ui/GameUI.tsx`:

- Import TradingPanel component
- Extract showTrading from npcStore
- Render TradingPanel when showTrading is true

**Commit:** 4ddeec2

## Technical Details

### Escape Key Isolation Pattern

The TradingPanel uses a specific pattern to ensure its Escape handler runs before NpcInteractionModal's handler:

```typescript
window.addEventListener('keydown', handleKeyDown, true); // capture phase
// ...
if (e.key === 'Escape') {
  e.stopPropagation();  // prevent bubble to NpcInteractionModal
  closeTrading();
}
```

This ensures pressing Escape closes only the TradingPanel while keeping the NpcInteractionModal open.

### Socket Event Integration

- `trade:buy` emitted with `{ npcId, itemId, quantity: 1 }`
- `trade:sell` emitted with `{ npcId, itemInstanceId, quantity: 1 }`
- `trade:result` listener updates tradeError state on failures

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

- `pnpm build --filter web` passes
- TradingPanel shows trader items with buy prices
- TradingPanel shows player items with sell prices
- Trade button in NpcInteractionModal opens TradingPanel
- Escape key closes TradingPanel ONLY (stopPropagation verified)
- Buy/Sell buttons emit correct socket events

## Self-Check: PASSED

- FOUND: apps/web/src/ui/panels/TradingPanel.tsx
- FOUND: apps/web/src/ui/panels/TradingPanel.css
- FOUND: commit 45536df (extend npcStore)
- FOUND: commit f3eab44 (create TradingPanel)
- FOUND: commit 9c10267 (wire Trade button)
- FOUND: commit 4ddeec2 (add to GameUI)
