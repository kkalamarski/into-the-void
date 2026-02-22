# Architecture Patterns: UI Polish Features

**Domain:** React/Phaser MMO UI Layer
**Researched:** 2026-02-22
**Confidence:** HIGH

## Executive Summary

The current Into the Void architecture uses **React 18 UI layer over Phaser 3 game canvas** with Zustand for state management and plain CSS with design tokens. The double-modal bug stems from **separate component state** (NpcInteractionModal and TradingPanel) rendered conditionally in GameUI.tsx.

**Root cause:** Both `interactingNpc` (renders NpcInteractionModal) and `showTrading` (renders TradingPanel as standalone) are truthy simultaneously, causing GameUI to render both components.

**Solution pattern:** Unified window component with tab-based navigation, single source of truth for NPC interaction state, shared CSS patterns from existing panels.

## Recommended Architecture

### Single Modal Pattern (Unified NPC Window)

```
┌─────────────────────────────────────┐
│ NpcInteractionModal (SINGLE MODAL)  │
│ ┌─────────────────────────────────┐ │
│ │ Header (draggable, close btn)   │ │
│ ├─────────────────────────────────┤ │
│ │ Tabs: Dialogue | Trade | Quests │ │
│ ├─────────────────────────────────┤ │
│ │ Tab Content (conditional render)│ │
│ │ - DialogueTab                   │ │
│ │ - TradeTab (was TradingPanel)   │ │
│ │ - QuestsTab                     │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

**State management:**
- `npcStore.interactingNpc`: Source of truth (NPC present = modal open)
- `npcStore.activeTab`: Current tab ('dialogue' | 'trade' | 'quests')
- Remove `showTrading` boolean (replaced by `activeTab === 'trade'`)

**Render condition:**
```tsx
// GameUI.tsx (BEFORE - causes double render)
{interactingNpc && <NpcInteractionModal />}
{showTrading && <TradingPanel />}

// GameUI.tsx (AFTER - single render)
{interactingNpc && <NpcInteractionModal />}
```

### Component Structure

#### Modified Components

**1. NpcInteractionModal.tsx** (MODIFY - already exists)
- **Current:** Has dialogue/trade/quests tabs, conditionally renders TradingPanel inside
- **Changes:**
  - Extract trade tab content into `TradeTab` subcomponent
  - Remove `<TradingPanel />` import/render at line 261
  - Render `<TradeTab />` directly when `activeTab === 'trade'`
  - Use shared CSS patterns from existing tabs

**2. TradingPanel.tsx** (EXTRACT → TradeTab.tsx)
- **Current:** Standalone draggable panel with header, close button, own positioning
- **Changes:**
  - Extract core content (trade columns, buy/sell sections) into `TradeTab` component
  - Remove header, draggable logic, close button (parent modal handles)
  - Remove `ui-panel` class, positioning styles
  - Keep buy/sell grid, item rendering, trade logic
  - Export as `TradeTab` from `NpcInteractionModal.tsx` (colocate with modal)

**3. npcStore.ts** (MODIFY - remove redundant state)
- **Remove:** `showTrading` boolean
- **Remove:** `openTrading()`, `closeTrading()` actions
- **Modify:** `closeInteraction()` to also reset `tradeError`
- **Keep:** `activeTab` state (already exists at line 28 in NpcInteractionModal)
- **Add:** `setActiveTab(tab)` action to npcStore for external control

**4. GameUI.tsx** (MODIFY - remove double render)
- **Remove:** Line 116 `{showTrading && <TradingPanel />}`
- **Remove:** Line 24 import of TradingPanel
- **Keep:** Line 115 `{interactingNpc && <NpcInteractionModal />}`

#### New Components

**TradeTab.tsx** (extracted from TradingPanel.tsx)
```tsx
// Internal to NpcInteractionModal.tsx (not separate file)
const TradeTab: React.FC = () => {
  const { interactingNpc, tradeError, setTradeError } = useNpcStore();
  const { inventory } = useInventoryStore();
  const { player } = useGameStore();

  // Same trade logic as TradingPanel
  const handleBuy = (itemId: string, buyPrice: number) => { ... };
  const handleSell = (instanceId: string) => { ... };
  const getSellPrice = (itemId: string): number => { ... };

  return (
    <div className="npc-trade-tab">
      {tradeError && <div className="trade-error">{tradeError}</div>}
      <div className="trade-credits">Your Credits: ...</div>
      <div className="trade-columns">
        {/* Buy/Sell sections - same as TradingPanel */}
      </div>
    </div>
  );
};
```

### Data Flow

```
User clicks NPC
    ↓
WorldScene emits 'entity:interact'
    ↓
Server responds with 'npc:interact:response'
    ↓
npcStore.setInteractingNpc(npcData)
    ↓
GameUI renders NpcInteractionModal (interactingNpc truthy)
    ↓
User clicks "Trade" button or tab
    ↓
npcStore.setActiveTab('trade')
    ↓
NpcInteractionModal renders TradeTab content
```

**No separate modal state** → No double render

### Integration Points

| Integration Point | Current Behavior | Modified Behavior |
|------------------|------------------|-------------------|
| **GameUI.tsx render** | Renders both NpcInteractionModal AND TradingPanel when trader clicked | Renders only NpcInteractionModal |
| **Trade button click** | Calls `openTrading()` → sets `showTrading=true` | Calls `setActiveTab('trade')` |
| **Escape key** | TradingPanel captures with stopPropagation (line 66) | Single modal handles escape, closes entire interaction |
| **Close button** | TradingPanel has own close → calls `closeTrading()` | Tab content has no close, modal close button closes all |
| **Keyboard disable** | Both modals independently disable Phaser keyboard | Single modal disables once in parent useEffect |

## CSS Organization

### Existing Pattern Analysis

**Consistent panel structure:**
```css
/* Pattern from QuestLogPanel, InventoryPanel, NpcInteractionModal */
.{component}-panel {
  position: fixed;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  width: [component-specific];
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  z-index: 100;
}

.{component}-header {
  display: flex;
  justify-content: space-between;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--color-bg-tertiary);
  margin-bottom: 10px;
}

.close-btn {
  background: none;
  border: none;
  color: var(--color-text-secondary);
  font-size: 20px;
  cursor: pointer;
}
```

**Tab navigation pattern:**
```css
/* From NpcInteractionModal.css and QuestLogPanel.css */
.{component}-tabs {
  display: flex;
  gap: 4px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--color-border, #333);
  margin-bottom: 8px;
}

.{component}-tab {
  padding: 8px 16px;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-bottom: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  border-radius: 4px 4px 0 0;
}

.{component}-tab--active {
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
  border-bottom: 2px solid var(--color-accent);
}
```

### Unified Window CSS

**NpcInteractionModal.css modifications:**

1. **Add trade tab content styles** (reuse from TradingPanel.css):
```css
/* Trade tab content (from TradingPanel.css lines 130-235) */
.npc-trade-tab {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 8px;
}

.trade-error {
  background: rgba(255, 68, 68, 0.1);
  color: var(--color-danger);
  padding: 8px;
  border-radius: 4px;
  font-size: 13px;
  border: 1px solid var(--color-danger);
}

.trade-credits {
  display: flex;
  justify-content: space-between;
  padding: 8px 12px;
  background: var(--color-bg-tertiary);
  border-radius: 4px;
  font-size: 13px;
}

.trade-columns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.trade-section h3 {
  margin: 0 0 8px 0;
  font-size: 14px;
  color: var(--color-text-primary);
}

/* ... rest of trade item styles from TradingPanel.css */
```

2. **Remove standalone panel positioning** (TradingPanel.css lines 117-119):
```css
/* DELETE - TradeTab is embedded, not positioned */
.trading-panel {
  position: fixed;
  transform: translate(-50%, -50%);
  /* ... */
}
```

3. **Consistent tab content structure:**
```css
/* Same pattern for all tabs */
.npc-dialogue-tab,
.npc-trade-tab,
.npc-quests-tab {
  /* Tab content shares same container styles */
  padding: 8px;
  min-height: 200px;
  max-height: 400px;
  overflow-y: auto;
}
```

### Design Token Usage

**From global.css (lines 1-12):**
```css
:root {
  --color-bg-primary: #0a0a0f;
  --color-bg-secondary: #14141f;
  --color-bg-tertiary: #1e1e2e;
  --color-text-primary: #e0e0e0;
  --color-text-secondary: #a0a0a0;
  --color-accent: #7b68ee;
  --color-accent-hover: #9370db;
  --color-danger: #ff4444;
  --color-success: #44ff44;
  --color-warning: #ffaa44;
}
```

**Consistent token application:**
- Backgrounds: Use `--color-bg-*` hierarchy (primary darkest → tertiary lightest)
- Text: Use `--color-text-primary` (headings, important) / `--color-text-secondary` (labels, secondary)
- Interactive: Use `--color-accent` (buttons, active states, borders)
- Semantic: Use `--color-danger` (errors), `--color-success` (complete)

### CSS File Organization Strategy

**Current structure:**
```
apps/web/src/
├── styles/
│   └── global.css (design tokens)
└── ui/
    └── panels/
        ├── NpcInteractionModal.css
        ├── TradingPanel.css (WILL BE MERGED)
        └── QuestLogPanel.css
```

**Recommended consolidation:**
1. Merge TradingPanel.css trade-specific styles into NpcInteractionModal.css
2. Delete TradingPanel.css after extraction complete
3. Prefix trade styles with `.npc-trade-*` for consistency
4. Keep panel-level styles (`.npc-modal`, `.npc-modal-header`) unchanged

## Phaser Integration

### Keyboard Disable Pattern

**Current duplication (problem):**
```tsx
// NpcInteractionModal.tsx line 31-45
useEffect(() => {
  const worldScene = game?.getWorldScene();
  worldScene?.setKeyboardEnabled(false);
  return () => worldScene?.setKeyboardEnabled(true);
}, []);

// TradingPanel.tsx line 45-59 (DUPLICATE)
useEffect(() => {
  const worldScene = game?.getWorldScene();
  worldScene?.setKeyboardEnabled(false);
  return () => worldScene?.setKeyboardEnabled(true);
}, []);
```

**Unified solution:**
- Keep single useEffect in NpcInteractionModal parent
- Remove from TradeTab (child doesn't manage keyboard)
- Parent cleanup re-enables keyboard when modal closes

### Movement and Camera

**No changes required:**
- Phaser WorldScene continues to render game canvas
- React UI layer sits on top (z-index: 100)
- Modal visibility doesn't affect Phaser rendering
- Player movement already disabled when `interactingNpc` exists

## Build Order and Dependencies

### Phase 1: Extract and Refactor (No Breaking Changes)

**Goal:** Prepare TradeTab component without changing current behavior

1. **Create TradeTab component** (within NpcInteractionModal.tsx)
   - Copy trade UI from TradingPanel.tsx (lines 116-235)
   - Remove panel wrapper, keep content only
   - Test renders same when `activeTab === 'trade'`

2. **Add trade styles to NpcInteractionModal.css**
   - Copy relevant styles from TradingPanel.css
   - Rename `.trade-*` → `.npc-trade-*` for consistency
   - Test visual parity with current TradingPanel

**Verification:** Both modals still render (unchanged behavior), TradeTab ready

### Phase 2: Unified State (Breaking Change)

**Goal:** Switch to single modal rendering

3. **Modify npcStore.ts**
   - Remove `showTrading` boolean
   - Remove `openTrading()`, `closeTrading()` actions
   - Add `setActiveTab(tab)` action
   - Update `closeInteraction()` to clear `tradeError`

4. **Update NpcInteractionModal.tsx**
   - Replace `<TradingPanel />` with `<TradeTab />`
   - Use `activeTab` state for tab switching
   - Remove TradingPanel import

5. **Update GameUI.tsx**
   - Remove `{showTrading && <TradingPanel />}` render
   - Remove TradingPanel import
   - Verify only NpcInteractionModal renders

**Verification:** Single modal renders, trade tab works, no double render

### Phase 3: Cleanup

**Goal:** Remove dead code

6. **Delete TradingPanel.tsx**
7. **Delete TradingPanel.css** (styles merged)
8. **Remove unused imports** across codebase

**Verification:** Build succeeds, no import errors, tests pass

### Dependency Graph

```
Phase 1 (Parallel)
├─ Task 1.1: Create TradeTab component
└─ Task 1.2: Add trade CSS to NpcInteractionModal.css

Phase 2 (Sequential - depends on Phase 1)
├─ Task 2.1: Modify npcStore.ts
├─ Task 2.2: Update NpcInteractionModal.tsx (depends on 2.1, 1.1, 1.2)
└─ Task 2.3: Update GameUI.tsx (depends on 2.2)

Phase 3 (Sequential - depends on Phase 2)
├─ Task 3.1: Delete TradingPanel.tsx
└─ Task 3.2: Delete TradingPanel.css
```

## Risk Mitigation

### Potential Issues

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Trade functionality breaks** | HIGH - trading unavailable | Thorough testing of buy/sell after extraction, verify socket events unchanged |
| **CSS layout breaks** | MEDIUM - visual issues | Copy styles exactly, test at multiple viewport sizes |
| **Escape key behavior changes** | LOW - UX inconsistency | Test keyboard shortcuts after single modal switch |
| **State synchronization issues** | MEDIUM - modal doesn't close properly | Clear all NPC state (`interactingNpc`, `activeTab`, `tradeError`) in single action |

### Testing Strategy

**Unit tests (if added):**
- npcStore state transitions (open → trade tab → close)
- TradeTab renders with mock inventory data

**Manual testing checklist:**
1. Click trader NPC → modal opens on dialogue tab
2. Click "Trade" button → switches to trade tab
3. Buy item → inventory updates, credits decrease
4. Sell item → inventory updates, credits increase
5. Click X button → modal closes completely
6. Press Escape → modal closes completely
7. Open trader, switch tabs, close → no orphaned modals
8. Repeat with quest-giving NPC → quests tab works

## Alternative Architectures Considered

### Option A: Separate Modals with Z-Index Stacking

**Pattern:** Keep both components, manage stacking order
```tsx
{interactingNpc && <NpcInteractionModal zIndex={100} />}
{showTrading && <TradingPanel zIndex={101} />}
```

**Why rejected:**
- Adds complexity (z-index management, blur backgrounds)
- Doesn't solve root cause (two modals for same NPC)
- Inconsistent with existing single-modal pattern (InventoryPanel, QuestLogPanel)

### Option B: Portal-Based Modal Manager

**Pattern:** Centralized modal service (like react-modal library)
```tsx
const ModalManager = () => {
  const modals = useModalStore((s) => s.modals);
  return <>{modals.map(m => <Modal key={m.id} {...m} />)}</>;
};
```

**Why rejected:**
- Over-engineered for current scope (2 modals → 1 modal)
- Requires refactoring ALL modals (inventory, quests, equipment)
- Adds dependency ([react-modal](https://www.freecodecamp.org/news/create-react-reusable-modal-component/))
- Current issue is design (separate components), not technical limitation

### Option C: Keep Current Architecture, Add Mutex Lock

**Pattern:** Prevent both modals from being truthy
```tsx
useEffect(() => {
  if (showTrading) setInteractingNpc(null);
}, [showTrading]);
```

**Why rejected:**
- Band-aid solution, doesn't address UX (user wants NPC + trade in one window)
- Adds hidden coupling between unrelated state
- Makes debugging harder (implicit state dependencies)
- Doesn't leverage existing tab pattern already in NpcInteractionModal

## Recommended Solution Rationale

**Unified window with tabs** chosen because:
1. **Existing pattern:** NpcInteractionModal already has tabs (dialogue/trade/quests at line 223-247)
2. **Single source of truth:** `interactingNpc` presence = modal open, no redundant state
3. **Consistent UX:** Matches QuestLogPanel pattern (active/completed tabs)
4. **Low risk:** Extraction, not rewrite (core logic unchanged)
5. **Future-proof:** Easy to add new NPC interaction types as tabs

## Sources

### Architecture Patterns
- [How to Create a Reusable Modal Component in React](https://www.freecodecamp.org/news/create-react-reusable-modal-component/)
- [React Modal component - Material UI](https://mui.com/material-ui/react-modal/)
- [Existential React questions and a perfect Modal Dialog](https://www.developerway.com/posts/hard-react-questions-and-modal-dialog)

### State Management
- [React State Management in 2025: What You Actually Need](https://www.developerway.com/posts/react-state-management-2025)
- [Top 5 React State Management Tools Developers Actually Use in 2026](https://www.syncfusion.com/blogs/post/react-state-management-libraries)
- [Tabs - Headless UI](https://headlessui.com/react/tabs)

### CSS Organization
- [Organizing Design System Component Patterns With CSS Cascade Layers](https://css-tricks.com/organizing-design-system-component-patterns-with-css-cascade-layers/)
- [React & CSS in 2026: Best Styling Approaches Compared](https://medium.com/@imranmsa93/react-css-in-2026-best-styling-approaches-compared-d5e99a771753)
- [The Modern CSS Toolkit: What Actually Matters in 2026](https://www.nickpaolini.com/blog/modern-css-toolkit-2026)
- [Tailwind CSS Best Practices 2025-2026: Design Tokens](https://www.frontendtools.tech/blog/tailwind-css-best-practices-design-system-patterns)
