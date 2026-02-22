---
phase: 70-modal-unification
plan: 01
subsystem: ui/npc-interaction
tags: [modal-unification, trade-ui, state-management]
dependency_graph:
  requires: [phase-49-npc-interaction-window, phase-38-trading-system]
  provides: [unified-npc-modal, embedded-trade-tab]
  affects: [npc-store, npc-interaction-modal]
tech_stack:
  added: []
  patterns: [embedded-components, unified-state]
key_files:
  created: []
  modified:
    - apps/web/src/store/npcStore.ts
    - apps/web/src/ui/panels/NpcInteractionModal.css
    - apps/web/src/ui/panels/NpcInteractionModal.tsx
decisions:
  - title: "Embedded TradeTab vs Separate Component"
    choice: "Embed TradeTab as internal function component within NpcInteractionModal"
    rationale: "Eliminates double-modal bug by ensuring trade UI is always part of NPC modal, shares context naturally"
  - title: "State Consolidation Strategy"
    choice: "Replace showTrading boolean with activeTab enum in npcStore"
    rationale: "Single source of truth for tab state, eliminates redundant boolean flags"
  - title: "Intelligent Default Tab"
    choice: "Default to quests tab when NPC has ready/available quests, otherwise dialogue"
    rationale: "Improves UX by showing most important content first (quest turn-ins)"
metrics:
  duration_seconds: 159
  tasks_completed: 3
  files_modified: 3
  lines_added: 353
  lines_removed: 22
  commits: 3
completed_date: 2026-02-22
---

# Phase 70 Plan 01: NPC Modal Trade Tab Embedding Summary

**One-liner:** Unified NPC interaction by embedding trade functionality as a tab within NpcInteractionModal, eliminating the double-modal bug.

## What Was Built

Embedded the trade UI directly into NpcInteractionModal as an internal TradeTab component, consolidating NPC interaction state in npcStore and eliminating redundant showTrading flags. The modal now supports three tabs (dialogue, trade, quests) with intelligent defaults based on NPC quest status.

## Tasks Completed

### Task 1: Modify npcStore to remove showTrading and add setActiveTab
**Commit:** `7a31b10`

Updated npcStore interface and implementation:
- Added `activeTab: 'dialogue' | 'trade' | 'quests'` state
- Added `setActiveTab` action for external tab control
- Removed `showTrading`, `openTrading`, `closeTrading` (redundant)
- Modified `closeInteraction` to reset activeTab to 'dialogue'

**Files modified:** `apps/web/src/store/npcStore.ts`

### Task 2: Add trade styles to NpcInteractionModal.css
**Commit:** `00a0135`

Appended complete trade UI styles to NpcInteractionModal.css:
- Added `.npc-trade-*` classes (tab, error, credits, columns, sections)
- Added item display styles (icon, info, action, price)
- Added buy/sell button styles with hover states
- Total: 166 lines of CSS with npc-trade- prefix for namespacing

**Files modified:** `apps/web/src/ui/panels/NpcInteractionModal.css`

### Task 3: Embed TradeTab in NpcInteractionModal and update imports
**Commit:** `1e57bf1`

Integrated trade functionality into NpcInteractionModal:
- Created `TradeTab` component as internal function
- Added trade dependencies (ItemRegistry, ItemTooltip, RARITY_COLORS)
- Implemented trade helper functions (getEquippedForSlot, getEquippedItemDef)
- Removed TradingPanel import and local activeTab state
- Added intelligent default: quests tab when NPC has ready/available quests
- Integrated buy/sell handlers with gameSocket.emit

**Files modified:** `apps/web/src/ui/panels/NpcInteractionModal.tsx`

## Deviations from Plan

None - plan executed exactly as written.

## Key Artifacts

### Trade State in npcStore
```typescript
interface NpcState {
  activeTab: 'dialogue' | 'trade' | 'quests';  // Replaces showTrading boolean
  setActiveTab: (tab: 'dialogue' | 'trade' | 'quests') => void;
  // ... other state
}
```

### TradeTab Component
Embedded within NpcInteractionModal.tsx at line 109, implementing full buy/sell functionality with:
- Credit display and affordability checks
- Item tooltips with equipped item comparison
- Buy/sell price calculations
- Error display integration with npcStore.tradeError

### Intelligent Default Tab
```typescript
useEffect(() => {
  if (interactingNpc) {
    if (interactingNpc.readyQuests?.length || interactingNpc.availableQuests?.length) {
      setActiveTab('quests');  // Prioritize quest turn-ins
    } else {
      setActiveTab('dialogue');
    }
  }
}, [interactingNpc, setActiveTab]);
```

## Known Issues

**Remaining TypeScript errors (expected, fixed in Plan 02):**
- `GameUI.tsx` still references removed `showTrading` property
- `TradingPanel.tsx` still references `showTrading` and `closeTrading`

These components will be updated in Plan 02 to complete the migration.

## Testing Notes

**Manual verification required:**
1. Open game and interact with a trader NPC
2. Verify single modal appears (not double)
3. Click Trade tab - verify buy/sell UI renders
4. Test buy functionality (check credit deduction)
5. Test sell functionality (check item removal)
6. Interact with quest-giving NPC - verify defaults to quests tab
7. Interact with NPC without quests - verify defaults to dialogue tab
8. Press Escape - verify modal closes cleanly

## Impact Analysis

**Fixed:** Double-modal bug where TradingPanel rendered separately from NpcInteractionModal

**State consolidation:** Single activeTab enum replaces multiple boolean flags

**UX improvement:** Intelligent tab defaults reduce clicks for quest turn-ins

**Preparation for Plan 02:** TradingPanel.tsx and GameUI.tsx can now be updated to remove standalone TradingPanel references

## Self-Check: PASSED

**Created files verification:**
- No files created (all modifications)

**Modified files verification:**
```
FOUND: apps/web/src/store/npcStore.ts
FOUND: apps/web/src/ui/panels/NpcInteractionModal.css
FOUND: apps/web/src/ui/panels/NpcInteractionModal.tsx
```

**Commits verification:**
```
FOUND: 7a31b10
FOUND: 00a0135
FOUND: 1e57bf1
```

**Key changes verification:**
- activeTab state exists in npcStore: YES (line 46, 58, 61-62)
- setActiveTab action exists: YES (line 50, 62)
- No showTrading in npcStore: YES (0 matches)
- TradeTab component in NpcInteractionModal: YES (line 109)
- Trade styles with npc-trade- prefix: YES (27 classes)
