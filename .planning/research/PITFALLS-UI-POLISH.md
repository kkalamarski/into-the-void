# Pitfalls Research

**Domain:** UI Polish and Modal Unification for React/Phaser MMO
**Researched:** 2026-02-22
**Confidence:** HIGH

## Critical Pitfalls

### Pitfall 1: Nested Modal Escape Key Cascade

**What goes wrong:**
Pressing Escape in a nested modal (TradingPanel inside NpcInteractionModal) triggers BOTH modal close handlers, closing the entire modal stack instead of just the innermost modal. This is the current double-modal bug in the codebase.

**Why it happens:**
Multiple `window.addEventListener('keydown', ...)` handlers are registered simultaneously. React's synthetic event system doesn't stop native DOM events from propagating, even if `e.stopPropagation()` is called. Both handlers execute in registration order.

**How to avoid:**
1. Use **event capture phase** (`addEventListener('keydown', handler, true)`) for nested modals to intercept before parent handlers
2. Use `e.stopPropagation()` in the innermost modal's handler
3. Alternative: Implement modal stack manager in Zustand that tracks which modal is "topmost" and only that handler executes

**Warning signs:**
- Multiple modals close when pressing Escape once
- Escape key closes parent modal when child modal is open
- Testing reveals modal state becomes inconsistent after multiple open/close cycles

**Phase to address:**
Phase 38-04 (Modal Escape Key Hierarchy). Current TradingPanel implementation (line 61-73) uses capture phase correctly, but pattern not applied to all modals.

---

### Pitfall 2: Keyboard Event Listener Memory Leaks

**What goes wrong:**
Modal components add window-level keyboard listeners in `useEffect` but fail to clean them up properly when unmounted. Listeners accumulate across modal open/close cycles, causing multiple handlers to fire and degrading performance. Eventually causes noticeable input lag.

**Why it happens:**
Missing or incorrect cleanup function in `useEffect`. Common mistakes:
- Forgetting `return () => removeEventListener(...)`
- Cleanup function references different handler instance (closure mismatch)
- Using `addEventListener` with different options (third parameter) in setup vs cleanup

**How to avoid:**
```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      closeModal();
    }
  };
  // Use same options (true/false) in both calls
  window.addEventListener('keydown', handleKeyDown, true);
  return () => window.removeEventListener('keydown', handleKeyDown, true);
}, [closeModal]); // Include deps to prevent stale closures
```

**Warning signs:**
- Chrome DevTools Performance Monitor shows increasing event listener count
- Input lag increases after opening/closing modals repeatedly
- React DevTools Profiler shows unmounted components still responding to events

**Phase to address:**
Phase 38-05 (Event Listener Audit). Review all modals (NpcInteractionModal, TradingPanel, QuestLogPanel, InventoryPanel) for proper cleanup.

---

### Pitfall 3: Phaser Keyboard State Desync After Modal Close

**What goes wrong:**
After closing a modal, Phaser keyboard input remains disabled. Player cannot move. Requires refreshing the game. This happens when modal cleanup fails to re-enable Phaser keyboard.

**Why it happens:**
Modal's `useEffect` cleanup reads stale game instance from closure. Pattern in codebase:
```typescript
useEffect(() => {
  const game = useGameStore.getState().game;
  game?.getWorldScene()?.setKeyboardEnabled(false);
  return () => {
    // BUG: 'game' is closure from mount time, may be stale
    game?.getWorldScene()?.setKeyboardEnabled(true);
  };
}, []);
```

If modal remains open across zone transitions or game restarts, cleanup references wrong game instance.

**How to avoid:**
Read game instance INSIDE cleanup function:
```typescript
useEffect(() => {
  const game = useGameStore.getState().game;
  game?.getWorldScene()?.setKeyboardEnabled(false);
  return () => {
    // CORRECT: Read fresh instance in cleanup
    const game = useGameStore.getState().game;
    game?.getWorldScene()?.setKeyboardEnabled(true);
  };
}, []);
```

**Warning signs:**
- Player cannot move after closing modal
- Keyboard works in React UI but not Phaser canvas
- Issue appears after zone transitions or long-duration modal sessions

**Phase to address:**
Phase 38-05 (Event Listener Audit). Pattern already implemented correctly in TradingPanel (line 45-58), NpcInteractionModal (line 31-44), and QuestLogPanel (line 14-27). Verify all future modals follow this pattern.

---

### Pitfall 4: Modal State Duplication Leading to Desync

**What goes wrong:**
TradingPanel has both `showTrading` in npcStore AND renders conditionally in GameUI based on `showTrading`. If stores get out of sync (one says open, one says closed), modal renders but doesn't respond to interactions, or vice versa.

**Why it happens:**
Zustand allows multiple stores to manage overlapping concerns. Current architecture:
- `npcStore.interactingNpc` controls NpcInteractionModal visibility
- `npcStore.showTrading` controls TradingPanel visibility
- But TradingPanel also checks `interactingNpc.npcType === 'trader'`

Multiple sources of truth for single boolean state.

**How to avoid:**
**Unified Modal State Pattern:**
```typescript
// Single source of truth
interface ModalState {
  activeModal: 'npc' | 'trading' | 'quest' | null;
  activeTab: 'dialogue' | 'trade' | 'quests' | null;
  context: NpcInteraction | null;
}
```

NpcInteractionModal contains TradingPanel as tab, not separate modal. Single modal controls keyboard state, single escape handler.

**Warning signs:**
- Modal visible but clicking buttons does nothing
- Store says modal is closed but it's still rendered
- `console.log` shows state mismatch between stores
- Clicking "Open Trading" twice shows two overlapping panels

**Phase to address:**
Phase 38-06 (Unified NPC Interaction Window). Merge TradingPanel into NpcInteractionModal as tab (pattern already started in NpcInteractionModal line 223-247).

---

### Pitfall 5: Z-Index Wars Between Modals

**What goes wrong:**
When unifying modals into single window, tooltips/dropdowns/context menus render BEHIND the modal. User cannot interact with them. Classic CSS stacking context trap.

**Why it happens:**
Modal creates new stacking context with `position: fixed; z-index: 1000`. Child elements (tooltips, dropdowns) use `z-index: 999` thinking it's "high enough", but they're in modal's stacking context, not root.

**How to avoid:**
1. **Portal tooltips to document body** (current ItemTooltip already does this correctly)
2. **Use CSS layers or higher z-index for nested overlays:**
   ```css
   .ui-panel { z-index: 1000; }
   .context-menu { z-index: 1001; } /* Higher than parent */
   .tooltip { z-index: 1002; } /* Highest */
   ```
3. **Use React Portal for all overlay content** (modals, tooltips, dropdowns)

**Warning signs:**
- Tooltip appears but is partially hidden behind modal
- Context menu appears in wrong visual order
- Dropdown menu appears behind parent modal

**Phase to address:**
Phase 38-07 (UI Consistency Pass). Audit all modals for nested interactive elements. Current InventoryPanel uses context menu (line 211-220) — verify it renders above panel.

---

### Pitfall 6: Modal Tab State Lost on Re-open

**What goes wrong:**
Player opens NPC trader, switches to "Trade" tab, buys item, closes modal, re-opens same NPC. Modal resets to "Dialogue" tab instead of remembering "Trade" tab. Breaks workflow continuity.

**Why it happens:**
Tab state stored in component-local `useState` (NpcInteractionModal line 28). When modal unmounts, state is lost. Next mount starts from initial value.

**How to avoid:**
**Decision point:** Should tab state persist across sessions?
- **YES (better UX):** Move `activeTab` to npcStore, persist per-NPC
  ```typescript
  interface NpcState {
    activeTab: Record<string, 'dialogue' | 'trade' | 'quests'>; // by npcId
  }
  ```
- **NO (simpler):** Keep in local state but default to last meaningful tab
  ```typescript
  // If NPC has ready quests, default to 'quests' tab
  const defaultTab = interactingNpc.readyQuests?.length ? 'quests' : 'dialogue';
  const [activeTab, setActiveTab] = useState(defaultTab);
  ```

**Warning signs:**
- User muscle memory expects tab to persist
- User complains about "having to switch tabs every time"
- Analytics show high "tab switch" events relative to "modal open" events

**Phase to address:**
Phase 38-06 (Unified NPC Interaction Window). Decide during UX polish whether tab state should persist. Lean toward NO (simpler) unless user testing demands it.

---

### Pitfall 7: Race Condition Between Modal Close and Socket Emission

**What goes wrong:**
Player clicks "Buy" button in TradingPanel, modal closes immediately (optimistic UI), but server rejects purchase due to insufficient credits. Error message appears AFTER modal closed, player never sees it. Purchase silently fails.

**Why it happens:**
TradingPanel emits `trade:buy` (line 88-92) but doesn't wait for server response before allowing modal close. Error handler sets `tradeError` state (npcStore line 80-86) but modal already unmounted.

**How to avoid:**
1. **Prevent modal close while trade pending:**
   ```typescript
   const [isPending, setIsPending] = useState(false);
   const handleBuy = async (itemId: string) => {
     setIsPending(true);
     gameSocket.emit('trade:buy', { ... });
     // Wait for server response or timeout
   };
   // Disable close button and Escape key while isPending
   ```

2. **Show toast/alert notification outside modal:**
   ```typescript
   // In npcStore socket handler
   gameSocket.on('trade:result', (data) => {
     if (!data.success && data.error) {
       alertStore.show({ type: 'error', message: data.error });
     }
   });
   ```

**Warning signs:**
- User reports "nothing happens" when clicking buttons
- Error messages logged to console but not visible to user
- Analytics show high "trade:buy" events with matching error events but low "error viewed" metrics

**Phase to address:**
Phase 38-08 (Error Feedback Polish). Add alertStore for transient notifications (separate from modal state). Pattern partially implemented in AlertNotification component.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Inline hover styles via `onMouseEnter`/`onMouseLeave` | Quick implementation, no CSS file changes | Re-renders on every hover, performance issues at scale, harder to theme | Never — always use CSS `:hover` pseudo-class |
| Single global `useEffect` for all Escape handlers | Centralized logic, easier to debug | Breaks when adding nested modals, tight coupling | Only if guaranteed never to have nested modals (unlikely for MMO UI) |
| Duplicating Phaser keyboard disable logic in every modal | Copy-paste fast, no abstraction needed | Maintenance nightmare, easy to forget cleanup in one modal | Never — extract to custom hook `useDisablePhaserKeyboard()` |
| Using `forceUpdate()` to sync modal state | Immediate fix for desync bugs | Bypasses React reconciliation, hides root cause | Never — indicates architectural issue with state management |
| Z-index increments by 1000 for each modal layer | "Safe" separation, unlikely to conflict | Z-index inflation (modal at 9000, tooltip at 10000), hard to reason about | Early prototyping only — standardize z-index scale before polish phase |

## Integration Gotchas

Common mistakes when connecting modals to WebSocket events.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| NPC interaction | Emit `npc:interact` and immediately open modal with stale NPC data | Wait for `npc:interact:response` event with fresh NPC data before rendering modal (current implementation correct) |
| Quest acceptance | Open quest log immediately after `quest:accept` emission | Wait for `quest:accepted` event to confirm server validation passed before updating UI |
| Trading | Close modal immediately after `trade:buy` emission | Wait for `trade:result` event, keep modal open if error, show pending state during round-trip |
| Modal close during reconnection | Modal remains open when socket disconnects/reconnects | Listen to `disconnect` event and close all modals to reset UI state |

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Re-rendering modal on every game tick | Smooth animations but 60fps drops to 30fps when modal open | Memoize modal content with `React.memo()`, extract animated parts to separate component | When modal contains >20 interactive elements (inventory, trading) |
| Inline style objects in render | Easy to read, co-located with JSX | Extract to CSS classes or `useMemo()` style objects | Every hover event creates new object, GC pressure |
| Tooltip on every inventory slot without debouncing | Shows immediately, responsive feedback | Debounce tooltip rendering by 200ms to prevent spam during drag operations | Inventory with >50 slots causes hundreds of tooltip renders per second during drag |
| Global event listeners for all modals | Centralized, single listener | Use event delegation on modal container, not window | When >5 modals exist, event handler executes for every modal on every keypress |

## UX Pitfalls

Common user experience mistakes in game UI polish.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No visual feedback on button click | User clicks multiple times, submits duplicate requests | Add `:active` state with instant visual change (scale down, darken) |
| Hover states too subtle (5% opacity change) | User doesn't notice interactive elements | Minimum 15% brightness change or add underline/border on hover |
| Modal appears instantly without transition | Jarring, feels unpolished | 150ms fade-in transition, matches game's aesthetic |
| Escape key closes modal without confirmation | User accidentally closes modal during trading, loses context | For destructive/lossy actions (active trading session), show "Are you sure?" before close |
| Tab order doesn't match visual order | Keyboard users tab in unexpected order, breaks accessibility | Set `tabIndex` explicitly or restructure DOM to match visual layout |
| Focus trap not implemented | Keyboard users tab out of modal into background UI, breaks accessibility | Use `focus-trap-react` or manual focus management to keep focus within modal |

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Modal keyboard handling:** Often missing Escape key handler cleanup — verify `removeEventListener` in `useEffect` return
- [ ] **Phaser keyboard re-enable:** Often missing cleanup or reads stale game instance — verify cleanup reads `useGameStore.getState().game` fresh
- [ ] **Nested modal Escape:** Often missing capture phase flag — verify `addEventListener('keydown', handler, true)` for child modals
- [ ] **Hover states:** Often missing `:active` and `:focus-visible` states — verify all interactive elements have all 5 states (default, hover, active, focus, disabled)
- [ ] **Error feedback:** Often missing "what happens when server rejects action" — verify all socket emissions have corresponding error event handlers
- [ ] **Loading states:** Often missing "what happens during network delay" — verify buttons show pending state (spinner or disabled) during async operations
- [ ] **Tooltip z-index:** Often missing portal or z-index consideration — verify tooltips render above ALL UI layers, not just parent
- [ ] **Tab state reset:** Often missing UX consideration — decide if tab state should persist across modal open/close cycles

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Nested modal Escape cascade | LOW | Add capture phase flag to innermost modal's listener: `addEventListener('keydown', handler, true)` |
| Keyboard listener memory leak | LOW | Add cleanup function to `useEffect`: `return () => removeEventListener(...)` |
| Phaser keyboard desync | LOW | Change cleanup to read fresh game instance: `const game = useGameStore.getState().game` |
| Modal state duplication desync | MEDIUM | Refactor to single source of truth, migrate state from local `useState` to Zustand store |
| Z-index wars | MEDIUM | Audit all z-index values, create z-index CSS custom properties (--z-modal, --z-tooltip, etc.), apply consistently |
| Race condition with socket | MEDIUM | Add pending state to UI, disable actions during async operations, show error via toast notification outside modal |
| Tab state lost on re-open | LOW | Move to Zustand store if persistence needed, or set smart default based on NPC state (e.g., ready quests → quests tab) |

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Nested modal Escape cascade | Phase 38-04 (Modal Escape Hierarchy) | Open TradingPanel inside NpcInteractionModal, press Escape once — only TradingPanel closes |
| Keyboard listener memory leak | Phase 38-05 (Event Listener Audit) | Chrome DevTools Performance Monitor shows stable listener count after 10 modal open/close cycles |
| Phaser keyboard desync | Phase 38-05 (Event Listener Audit) | Close modal after zone transition — player can still move |
| Modal state duplication desync | Phase 38-06 (Unified NPC Interaction) | Zustand DevTools shows single source of truth for modal state |
| Z-index wars | Phase 38-07 (UI Consistency Pass) | All tooltips, dropdowns, context menus render visually above modals |
| Race condition with socket | Phase 38-08 (Error Feedback Polish) | Trigger trade error (insufficient credits), error notification visible even after modal closes |
| Tab state lost on re-open | Phase 38-06 (Unified NPC Interaction) | UX decision documented: persist or smart default |
| No hover feedback | Phase 38-07 (UI Consistency Pass) | All interactive elements have visible hover state (15%+ brightness change) |

## Sources

### Modal Event Propagation
- [Reactstrap Modal double-click backdrop bug](https://github.com/reactstrap/reactstrap/issues/360) — MEDIUM confidence
- [React Bootstrap events hijacked by parent](https://github.com/react-bootstrap/react-bootstrap/issues/3105) — MEDIUM confidence
- [Event Propagation with React Modal](https://medium.com/@yosevu/event-propagation-with-a-react-modal-window-cc1a00f1e429) — MEDIUM confidence
- [Fix Modal Issues: Event Bubbling Solutions](https://medium.com/@nateghi/fixing-modal-issues-two-solutions-to-event-bubbling-2a3540ad39c0) — MEDIUM confidence

### Nested Modal Escape Handling
- [Cancel React Modal with Escape Key](https://keyholesoftware.com/cancel-a-react-modal-with-escape-key-or-external-click/) — HIGH confidence
- [Beginner's Guide to Modal Close on Outside Click](https://medium.com/@priyaeswaran/beginners-guide-to-closing-a-modal-in-react-on-outside-click-and-escape-keypress-9812b1d48b84) — HIGH confidence
- [Building Accessible Modal Dialog in React](https://clhenrick.io/blog/react-a11y-modal-dialog/) — HIGH confidence
- [Don't propagate handled escape key event](https://github.com/reactstrap/reactstrap/commit/5d45b26) — HIGH confidence

### Zustand Modal State Management
- [Effortless Modal Management with Zustand](https://medium.com/@selvakumar_P/effortless-modal-management-in-react-with-zustand-2e99dc876a82) — HIGH confidence
- [React State Management in 2025](https://www.developerway.com/posts/react-state-management-2025) — HIGH confidence
- [Zustand Best Practices Discussion](https://github.com/pmndrs/zustand/discussions/1682) — MEDIUM confidence

### Phaser-React Keyboard Conflicts
- [Phaser game with React UI](https://3ee.com/blog/phaser-game-react-ui/) — HIGH confidence
- [Phaser Keyboard Events Documentation](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/keyboardevents/) — HIGH confidence
- [Change keyboard event target](https://phaser.discourse.group/t/change-keyboard-event-target/12144) — MEDIUM confidence

### Memory Leaks
- [How to Fix Memory Leaks in React](https://www.freecodecamp.org/news/fix-memory-leaks-in-react-apps/) — HIGH confidence
- [Understanding Memory Leaks in React](https://medium.com/@ignatovich.dm/understanding-memory-leaks-in-react-how-to-find-and-fix-them-fc782cf182be) — HIGH confidence
- [React Native Memory Leak in Production](https://medium.com/@silverskytechnology/the-react-native-memory-leak-you-dont-see-until-production-8d62a18d840a) — MEDIUM confidence
- [How to Detect and Prevent Memory Leaks](https://www.dhiwise.com/post/the-complete-guide-to-detect-and-prevent-memory-leaks-in-react-js) — HIGH confidence

### UI Polish and Hover States
- [Button States Explained (2026)](https://www.designrush.com/best-designs/websites/trends/button-states) — HIGH confidence
- [An Interaction State of Mind](https://uxdesign.cc/an-interaction-state-of-mind-705572b3ad51) — HIGH confidence
- [React Style Hover Developer's Handbook](https://www.dhiwise.com/post/elevate-your-ui-with-react-style-hover-developers-handbook) — HIGH confidence
- [Interaction States for Designers](https://medium.com/weave-lab/interaction-states-for-dummies-designers-f743c682fae1) — HIGH confidence

### CSS Transition Performance
- [Interactive Guide to CSS Transitions](https://www.joshwcomeau.com/animation/css-transitions/) — HIGH confidence
- [Mastering CSS Transitions with React 18](https://blog.openreplay.com/mastering-css-transitions-with-react-18/) — HIGH confidence
- [Different Transitions for Hover On/Off](https://css-tricks.com/different-transitions-for-hover-on-hover-off/) — MEDIUM confidence

### Project-Specific Context
- Into the Void codebase at `/Users/krzysztof.kalamarski/Projects/into-the-void` — HIGH confidence
- NpcInteractionModal.tsx (line 47-59: Escape handler) — HIGH confidence
- TradingPanel.tsx (line 61-73: Nested Escape with capture phase) — HIGH confidence
- gameStore.ts (line 31-44: Phaser keyboard disable pattern) — HIGH confidence
- Phase 38-04 plan document — HIGH confidence

---
*Pitfalls research for: UI Polish and Modal Unification (Phase 38)*
*Researched: 2026-02-22*
*Focus: Integration pitfalls when adding polish to existing React/Phaser game UI*
