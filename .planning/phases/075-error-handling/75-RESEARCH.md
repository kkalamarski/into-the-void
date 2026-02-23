# Phase 75: Error Handling - Research

**Researched:** 2026-02-23
**Domain:** React async operation error handling, loading states, toast notifications
**Confidence:** HIGH

## Summary

Error handling for async operations in React requires three coordinated mechanisms: (1) loading state management with disabled UI during pending operations, (2) toast notifications for error feedback outside modal context, and (3) conditional modal close prevention. The existing codebase provides strong patterns: `alertStore` implements a proven queue-based toast system with 3-second auto-dismiss, `global.css` defines a `.loading-spinner` class for visual feedback, and `NpcInteractionModal` already has Escape key + overlay click handlers that can be conditionally disabled.

Phase 75 builds directly on Phase 74's toast notification patterns and Phase 72's design token system. The core challenge is coordinating three UI states (loading, error, modal-close-prevention) across trade/quest operations without race conditions.

**Primary recommendation:** Use `useState` boolean flags (`isPending`) for each async operation, conditionally render inline spinner on buttons with `disabled={isPending}`, emit errors to `alertStore.addAlert(message, 'error')` instead of inline modal errors, and conditionally check `isPending` in Escape/overlay handlers to prevent modal close during operations.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React useState | 18.x (in use) | Pending state management per operation | Built-in hook, synchronous state updates, proven pattern for async operations |
| Zustand alertStore | 4.x (in use) | Toast notification queue for errors | Already implemented with auto-dismiss, error type support, 5-alert queue limit |
| CSS Animations | Native | Spinner rotation, toast transitions | Existing `.loading-spinner` class in global.css uses GPU-accelerated rotation |
| React useEffect | 18.x (in use) | Conditional event listener control | Standard pattern for enabling/disabling Escape key handler based on pending state |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Socket.IO error events | 4.x (in use) | Server-side error messages | Trade/quest failures emit `trade:result` or `quest:error` events with error text |
| CSS `:disabled` pseudo-class | Native | Visual feedback for disabled buttons | Existing `.btn:disabled` styles provide opacity 0.5, cursor not-allowed |
| stopPropagation() | Native | Prevent overlay click during pending | Block `handleOverlayClick` from executing `closeInteraction()` when operation active |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| useState pending flags | useTransition hook | React 19's `useTransition` is designed for non-blocking UI updates (transitions), not async I/O - overkill for simple socket.emit() calls |
| alertStore toasts | Inline modal error display | Phase 74 established toast pattern, keeping errors in modal contradicts "outside modal" requirement ERR-02 |
| Conditional Escape handler | react-modal library | Adding `react-modal` (30KB) for `shouldCloseOnEsc` prop unnecessary - existing pattern is 5 lines of conditional logic |
| Custom spinner component | react-loader-spinner library | Existing `.loading-spinner` CSS class (50px) works, just needs smaller variant (16px inline) - no library needed |

**Installation:**
```bash
# No new dependencies required - uses existing patterns
# Modifications to existing code only
```

## Architecture Patterns

### Recommended File Changes
```
apps/web/src/
├── store/
│   └── npcStore.ts              # ADD: isPending flags for trade/quest operations
├── ui/
│   └── panels/
│       ├── NpcInteractionModal.tsx  # MODIFY: conditional close handlers, pending checks
│       └── NpcInteractionModal.css  # ADD: .btn-spinner class for inline loading indicator
└── styles/
    └── global.css               # ADD: .spinner-small variant for button inline use
```

### Pattern 1: Pending State Management with useState
**What:** Track async operation state with boolean flag, disable button, show spinner
**When to use:** Any button that triggers Socket.IO emit (trade:buy, trade:sell, quest:accept, quest:complete)
**Example:**
```typescript
// Source: React useState best practices 2026
// https://react.dev/reference/react/useState
const TradeTab: React.FC<TradeTabProps> = ({ npc }) => {
  const [buyPending, setBuyPending] = useState(false);
  const [sellPending, setSellPending] = useState(false);

  const handleBuy = async (itemId: string, buyPrice: number) => {
    if (buyPending) return; // Prevent double-click

    setBuyPending(true);
    gameSocket.emit('trade:buy', { npcId: npc.npcId, itemId, quantity: 1 });

    // Socket listener will reset via trade:result handler
  };

  return (
    <button
      disabled={buyPending}
      onClick={() => handleBuy(item.itemId, item.buyPrice)}
    >
      {buyPending ? <span className="spinner-small" /> : 'Buy'}
    </button>
  );
};
```

### Pattern 2: Socket Event Error Handling with Toast
**What:** Listen for error events, route to alertStore instead of inline modal error state
**When to use:** Replace `setTradeError(data.error)` with toast notifications
**Example:**
```typescript
// Source: Existing alertStore pattern (apps/web/src/store/alertStore.ts)
import { useAlertStore } from '../store/alertStore';

// In npcStore.ts socket handler (replace current inline error):
gameSocket.on('trade:result', (data: { success: boolean; error?: string }) => {
  const { setTradeError } = useNpcStore.getState();

  if (!data.success && data.error) {
    // Phase 75: Route errors to toast instead of inline modal
    useAlertStore.getState().addAlert(data.error, 'error');
    setTradeError(null); // Clear any stale inline errors
  } else {
    setTradeError(null);
  }

  // Reset pending state (requires npcStore to track pending flags)
  useNpcStore.getState().setTradePending(false);
});

// Quest completion errors (NEW listener):
gameSocket.on('quest:error', (data: { message: string }) => {
  useAlertStore.getState().addAlert(data.message, 'error');
  useNpcStore.getState().setQuestPending(false);
});
```

### Pattern 3: Conditional Modal Close Prevention
**What:** Check pending state before allowing Escape key or overlay click to close modal
**When to use:** Prevent race conditions where user closes modal mid-operation
**Example:**
```typescript
// Source: Existing NpcInteractionModal.tsx Escape handler (lines 210-222)
export const NpcInteractionModal: React.FC = () => {
  const { interactingNpc, closeInteraction, isPending } = useNpcStore();

  // Escape key handler with pending check
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isPending) {  // ADD: pending check
        closeInteraction();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closeInteraction, isPending]);  // ADD: isPending dependency

  // Overlay click handler with pending check
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isPending) {  // ADD: pending check
      closeInteraction();
    }
  };

  return (
    <div className="npc-modal-overlay" onClick={handleOverlayClick}>
      {/* Modal content */}
    </div>
  );
};
```

### Pattern 4: Inline Button Spinner with CSS
**What:** Small spinner (16px) that fits inline with button text, reuses global animation
**When to use:** Loading state for async action buttons (Buy, Sell, Accept Quest, Turn In)
**Example:**
```css
/* Source: Existing global.css .loading-spinner + CSS spinner best practices 2026
   https://www.w3docs.com/snippets/css/how-to-create-loading-spinner-with-css.html */

/* Global spinner (existing - 50px for full-screen) */
.loading-spinner {
  width: 50px;
  height: 50px;
  border: 3px solid var(--color-bg-tertiary);
  border-top-color: var(--color-accent);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

/* NEW: Inline button spinner (16px) */
.spinner-small {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: currentColor;  /* Inherit button text color */
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

/* Reuse existing spin animation */
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
```

### Pattern 5: Per-Operation Pending Flags in Store
**What:** Store-level pending state for trade/quest operations to share across components
**When to use:** Button components need to know if ANY operation is pending (for modal close prevention)
**Example:**
```typescript
// Source: Zustand store patterns (existing npcStore.ts)
interface NpcState {
  interactingNpc: NpcInteraction | null;
  activeTab: 'dialogue' | 'trade' | 'quests';
  tradeError: string | null;

  // NEW: Pending state tracking
  tradePending: boolean;
  questPending: boolean;

  setTradePending: (pending: boolean) => void;
  setQuestPending: (pending: boolean) => void;

  // Computed: any operation pending
  get isPending(): boolean;
}

export const useNpcStore = create<NpcState>((set, get) => ({
  interactingNpc: null,
  activeTab: 'dialogue',
  tradeError: null,
  tradePending: false,
  questPending: false,

  setTradePending: (pending) => set({ tradePending: pending }),
  setQuestPending: (pending) => set({ questPending: pending }),

  get isPending() {
    return get().tradePending || get().questPending;
  },

  // ... existing methods
}));
```

### Anti-Patterns to Avoid
- **Using `disabled` without visual feedback:** Users perceive unresponsive UI as broken - always show spinner when disabled
- **Forgetting to reset pending state on error:** Socket error events MUST call `setPending(false)` or button stays disabled forever
- **Inline modal errors + toast errors simultaneously:** Choose one pattern (Phase 75 uses toast for consistency with Phase 74)
- **Global pending flag for all operations:** Selling item A shouldn't disable "Buy" button - use operation-specific flags
- **Not adding `isPending` to useEffect dependencies:** React won't re-register Escape handler when pending changes

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Toast notification system | Custom queue, positioning, auto-dismiss logic | Existing `alertStore` with `addAlert(message, 'error')` | Already supports error type, 5-second auto-dismiss (ERR-02 requires 5s), queue limit of 5 alerts |
| Loading spinner animation | Custom SVG spinner, canvas animation | Existing `.loading-spinner` CSS class + small variant | CSS `@keyframes spin` is GPU-accelerated, 0.8s linear infinite sufficient for button feedback |
| Modal close detection | Custom event delegation, focus trap management | Existing `handleOverlayClick` + Escape `useEffect` handler | Pattern already implemented in NpcInteractionModal (lines 210-222, 366-370) |
| Pending state management | Custom async state machine, promise tracking | React `useState` + Socket.IO event listeners | Socket events naturally delimit operation lifecycle (emit → result event → reset state) |

**Key insight:** Phase 75 is primarily integration work, not new infrastructure. All building blocks exist: `alertStore` for toasts, `.loading-spinner` for visual feedback, conditional close handlers. The implementation is connecting these pieces with pending state flags.

## Common Pitfalls

### Pitfall 1: Pending State Not Reset on Socket Error
**What goes wrong:** User clicks "Buy", trade fails, button stays disabled forever
**Why it happens:** Socket error handler routes to toast but forgets to call `setTradePending(false)`
**How to avoid:** Every socket error path MUST reset pending state - use finally-style pattern in listeners
**Warning signs:** Button stuck in disabled state after failed operation, spinner continues indefinitely

### Pitfall 2: Race Condition with Rapid Close Attempts
**What goes wrong:** User presses Escape rapidly during operation, modal closes mid-transaction
**Why it happens:** `isPending` check in handler evaluates before pending state updates from socket emit
**How to avoid:** Set pending state BEFORE socket.emit(), not after - synchronous state update prevents race
**Warning signs:** Modal occasionally closes during operation, server receives incomplete/cancelled requests

### Pitfall 3: Multiple Pending Flags Not Aggregated for Modal Close
**What goes wrong:** Trade pending, but quest button allows Escape to close modal
**Why it happens:** Escape handler checks `tradePending` only, ignores `questPending`
**How to avoid:** Use computed `isPending` getter that ORs all operation flags: `tradePending || questPending`
**Warning signs:** Modal closes during quest operation even though ERR-03 says "prevent modal close while async operation pending"

### Pitfall 4: Toast Notification Overlaps with Quest Completion Notifications
**What goes wrong:** Trade error toast appears at same time as quest complete banner (Phase 74), visual clash
**Why it happens:** AlertNotification (z-index 1200) overlaps QuestCompleteModal (z-index 200) at top 25% viewport
**How to avoid:** Both use vertical stacking at same position (top 25%) - acceptable per existing design, queue handles this
**Warning signs:** Error toasts obscure quest completion rewards - actually desired behavior (errors more urgent)

### Pitfall 5: Button Disabled But No Visual Loading State
**What goes wrong:** User clicks "Buy", button grays out (disabled), but no spinner - looks frozen
**Why it happens:** Conditional rendering shows empty string instead of spinner: `{isPending ? '' : 'Buy'}`
**How to avoid:** Always render spinner when pending: `{isPending ? <span className="spinner-small" /> : 'Buy'}`
**Warning signs:** User reports "clicking button does nothing" or "UI freezes when I click trade"

### Pitfall 6: Toast Auto-Dismiss Too Fast/Slow
**What goes wrong:** Error toast disappears before user reads it (3s), or lingers too long (10s)
**Why it happens:** Using existing alertStore duration (3s) but ERR-02 requires 5 seconds
**How to avoid:** Modify alertStore.ts `ALERT_DURATION` from 3000ms to 5000ms for consistency with Phase 74
**Warning signs:** User testing reveals errors dismissed too quickly, success criteria ERR-02 mandates 5s

### Pitfall 7: Inline Spinner Color Invisible Against Button Background
**What goes wrong:** White spinner on light green "Buy" button, can't see rotation
**Why it happens:** Fixed spinner color instead of `currentColor` to inherit button text color
**How to avoid:** Use `border-top-color: currentColor` in `.spinner-small` CSS to match button text
**Warning signs:** Spinner present but user reports "no loading indicator showing"

## Code Examples

Verified patterns from official sources and existing codebase:

### useState Pending Pattern with Socket.IO
```typescript
// Source: React useState docs + existing npcStore patterns
// https://react.dev/reference/react/useState
const TradeTab: React.FC<TradeTabProps> = ({ npc }) => {
  const { tradePending, setTradePending } = useNpcStore();
  const addAlert = useAlertStore(state => state.addAlert);

  const handleBuy = (itemId: string, buyPrice: number) => {
    if (tradePending) return; // Prevent double-click

    setTradePending(true);  // BEFORE emit to prevent race
    gameSocket.emit('trade:buy', {
      npcId: npc.npcId,
      itemId,
      quantity: 1,
    });
  };

  return (
    <button
      className="npc-trade-btn npc-trade-btn--buy"
      onClick={() => handleBuy(item.itemId, item.buyPrice)}
      disabled={tradePending}  // SUCCESS CRITERIA ERR-01: disabled during pending
    >
      {tradePending ? (
        <span className="spinner-small" />  // SUCCESS CRITERIA ERR-01: loading spinner
      ) : (
        'Buy'
      )}
    </button>
  );
};
```

### Socket Error Handler Routing to Toast
```typescript
// Source: Existing alertStore integration (apps/web/src/store/alertStore.ts)
// Modify existing npcStore.ts socket listeners:

gameSocket.on('trade:result', (data: { success: boolean; error?: string }) => {
  const { setTradePending } = useNpcStore.getState();

  if (!data.success && data.error) {
    // SUCCESS CRITERIA ERR-02: Toast notification outside modal
    useAlertStore.getState().addAlert(data.error, 'error');
  }

  // Always reset pending state (success OR failure)
  setTradePending(false);
});

// NEW: Quest error handler (quest:accept, quest:complete failures)
gameSocket.on('quest:error', (data: { message: string }) => {
  useAlertStore.getState().addAlert(data.message, 'error');  // ERR-02: toast
  useNpcStore.getState().setQuestPending(false);
});

// SUCCESS: Quest completion (existing Phase 74)
gameSocket.on('quest:completed', (data) => {
  useQuestStore.getState().addCompletedReward(data);
  useNpcStore.getState().setQuestPending(false);  // Reset pending after success
});
```

### Conditional Modal Close Prevention
```typescript
// Source: Existing NpcInteractionModal.tsx (apps/web/src/ui/panels/NpcInteractionModal.tsx)
export const NpcInteractionModal: React.FC = () => {
  const { closeInteraction } = useNpcStore();
  const isPending = useNpcStore(state => state.isPending);  // Computed getter

  // SUCCESS CRITERIA ERR-03: Prevent close while async pending
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isPending) {  // Conditional check
        closeInteraction();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closeInteraction, isPending]);  // Re-run when isPending changes

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isPending) {  // Conditional check
      closeInteraction();
    }
  };

  return (
    <div className="npc-modal-overlay" onClick={handleOverlayClick}>
      {/* Modal content */}
    </div>
  );
};
```

### Inline Spinner CSS (Small Variant)
```css
/* Source: Existing global.css .loading-spinner + CSS spinner best practices
   https://www.w3docs.com/snippets/css/how-to-create-loading-spinner-with-css.html */

/* ADD to global.css: Inline button spinner variant */
.spinner-small {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: currentColor;  /* Inherit button text color for visibility */
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  vertical-align: middle;
  margin-right: 4px;  /* Space between spinner and text (if any) */
}

/* Existing spin animation (no changes needed) */
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
```

### npcStore Pending State Management
```typescript
// Source: Existing npcStore.ts + Zustand patterns
import { create } from 'zustand';

interface NpcState {
  interactingNpc: NpcInteraction | null;
  activeTab: 'dialogue' | 'trade' | 'quests';
  tradeError: string | null;

  // NEW: Operation pending flags
  tradePending: boolean;
  questPending: boolean;

  setInteractingNpc: (npc: NpcInteraction | null) => void;
  closeInteraction: () => void;
  setActiveTab: (tab: 'dialogue' | 'trade' | 'quests') => void;
  setTradeError: (error: string | null) => void;
  acceptQuest: (questId: string) => void;
  completeQuestAtNpc: (questId: string) => void;

  // NEW: Pending state setters
  setTradePending: (pending: boolean) => void;
  setQuestPending: (pending: boolean) => void;
}

export const useNpcStore = create<NpcState>((set, get) => ({
  interactingNpc: null,
  activeTab: 'dialogue',
  tradeError: null,
  tradePending: false,
  questPending: false,

  setInteractingNpc: (npc) => set({ interactingNpc: npc }),
  closeInteraction: () => set({
    interactingNpc: null,
    activeTab: 'dialogue',
    tradeError: null,
    tradePending: false,   // Reset on close
    questPending: false,   // Reset on close
  }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setTradeError: (error) => set({ tradeError: error }),

  acceptQuest: (questId: string) => {
    set({ questPending: true });  // Set pending BEFORE emit
    gameSocket.emit('quest:accept', { questId });
  },

  completeQuestAtNpc: (questId: string) => {
    set({ questPending: true });  // Set pending BEFORE emit
    gameSocket.emit('quest:complete', { questId });
  },

  setTradePending: (pending) => set({ tradePending: pending }),
  setQuestPending: (pending) => set({ questPending: pending }),

  // Computed getter for "any operation pending"
  get isPending() {
    const state = get();
    return state.tradePending || state.questPending;
  },
}));
```

### alertStore Duration Update for 5-Second Requirement
```typescript
// Source: Existing alertStore.ts
// MODIFY: Change ALERT_DURATION from 3000 to 5000

const ALERT_DURATION = 5000; // SUCCESS CRITERIA ERR-02: 5 seconds auto-dismiss

export const useAlertStore = create<AlertState>((set, get) => ({
  alerts: [],

  addAlert: (message, type = 'info') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const alert: Alert = {
      id,
      message,
      type,
      timestamp: Date.now(),
    };

    set((state) => ({
      alerts: [...state.alerts.slice(-4), alert], // Keep max 5 alerts
    }));

    // Auto-remove after 5 seconds (ERR-02 requirement)
    setTimeout(() => {
      get().removeAlert(id);
    }, ALERT_DURATION);
  },

  // ... rest unchanged
}));
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Inline modal error messages | Toast notifications outside modal | 2023-2026 | Modern UX: errors don't block interaction flow, dismissible, stackable. Modals reserve space for content, not errors. |
| `componentDidMount` + `this.setState` for pending | `useState` hook + functional updates | 2019-2020 (React 16.8) | Hooks eliminate class component boilerplate, synchronous state updates prevent closure issues. |
| Manual promise tracking | Socket.IO event lifecycle (emit → result) | 2020-2026 | Event-driven state matches server timing naturally, no manual promise cancellation needed. |
| Fixed button disabled state | Disabled + visual spinner feedback | 2022-2026 | UX research shows disabled-only buttons feel "broken" - spinner provides "working" affordance. |
| react-modal library for close control | Conditional close handlers in useEffect | 2024-2026 | Modern React apps avoid modal libraries (bundle size), prefer controlled components with conditional logic. |

**Deprecated/outdated:**
- **Class component `this.setState` in lifecycle methods:** Replaced by `useState` + `useEffect` hooks (React 16.8+)
- **Global "isLoading" flag for all operations:** Modern pattern uses operation-specific pending flags to avoid false-positive UI locks
- **Custom promise cancellation with AbortController:** Socket.IO event listeners already handle operation lifecycle, no manual abort needed
- **Inline error text in modals:** Toast notifications preferred for error feedback (don't disrupt modal content layout)

## Open Questions

1. **Should trade/quest errors auto-retry on network failure?**
   - What we know: Socket.IO has auto-reconnect, but doesn't replay failed emits
   - What's unclear: User expectation when trade fails due to transient network issue
   - Recommendation: No auto-retry - show error toast, user manually retries (safer for financial transactions)

2. **How to handle pending state if modal force-closed by server event (NPC despawns)?**
   - What we know: `npc:interact:response` could set `interactingNpc: null` if NPC no longer exists
   - What's unclear: Should pending operation continue in background, or cancel?
   - Recommendation: Server event closes modal → reset all pending flags in `closeInteraction()` (already planned)

3. **Should "Turn In Quest" button disable during pending, or entire modal?**
   - What we know: Success criteria ERR-03 says "modal cannot be closed", ERR-01 says "button shows spinner"
   - What's unclear: Can user switch tabs during pending quest completion?
   - Recommendation: Disable close only (Escape/overlay), allow tab switching - user might review trade while waiting

4. **What if user has multiple quests ready at same NPC - click Turn In on both rapidly?**
   - What we know: Each quest has unique `questId`, server processes sequentially
   - What's unclear: Should UI allow clicking second "Turn In" while first pending?
   - Recommendation: Single `questPending` flag disables ALL quest buttons during any quest operation (simpler)

5. **Should alertStore duration remain 3 seconds or change to 5 seconds for Phase 75?**
   - What we know: Phase 74 uses 5-second auto-dismiss for quest rewards, ERR-02 specifies 5 seconds for errors
   - What's unclear: Should ALL alerts use 5 seconds, or just error type?
   - Recommendation: Change `ALERT_DURATION` to 5000ms globally for consistency (Phase 74 + Phase 75 both use 5s)

## Sources

### Primary (HIGH confidence)
- **Existing codebase:**
  - `apps/web/src/store/npcStore.ts` - Quest/trade action patterns, socket integration
  - `apps/web/src/store/alertStore.ts` - Toast notification queue pattern (3s auto-dismiss)
  - `apps/web/src/ui/panels/NpcInteractionModal.tsx` - Escape key handler (lines 210-222), overlay click handler (lines 366-370)
  - `apps/web/src/styles/global.css` - `.loading-spinner` class (lines 97-103), `.btn:disabled` styles (lines 166-178)
  - `apps/web/src/ui/AlertNotification.tsx` - Toast rendering, z-index 1200

- **React Official Documentation:**
  - [useState – React](https://react.dev/reference/react/useState) - State management for async operations

### Secondary (MEDIUM confidence)
- **React Patterns (2026):**
  - [React Form with Loading State (Pending Action)](https://www.robinwieruch.de/react-form-loading-pending-action/) - useState, useActionState, useTransition patterns for pending state
  - [Master React useState: Patterns That Scale](https://strapi.io/blog/react-usestate-hook-guide-best-practices) - Functional updates, pending flags, double-submission prevention

- **CSS Spinner Implementation:**
  - [How to Create Loading Spinner With CSS](https://www.w3docs.com/snippets/css/how-to-create-loading-spinner-with-css.html) - Border-radius 50%, border-top-color, rotation keyframes
  - [Northern Badger - Simple CSS Loading Spinner](https://www.blog.northernbadger.co.uk/articles/how-to-create-a-simple-css-loading-spinner-make-it-accessible/) - Minimal spinner with accessibility notes

- **Modal Close Control:**
  - [react-modal documentation - shouldCloseOnOverlayClick](https://reactcommunity.org/react-modal/examples/should_close_on_overlay_click/) - Conditional close patterns
  - [Beginner's Guide to Closing a Modal in React](https://medium.com/@priyaeswaran/beginners-guide-to-closing-a-modal-in-react-on-outside-click-and-escape-keypress-9812b1d48b84) - Escape key + overlay click handling

- **Toast Notifications (2026):**
  - [Top 9 React notification libraries in 2026 | Knock](https://knock.app/blog/the-top-notification-libraries-for-react) - Sonner, React Hot Toast, React-Toastify comparison
  - [React Toastify (2025 update)](https://blog.logrocket.com/react-toastify-guide/) - Auto-dismiss patterns, error types, toast stacking

### Tertiary (LOW confidence - context only)
- **React 19 Async Patterns:**
  - [Developer Guide to React 19: Async Handling](https://www.callstack.com/blog/the-complete-developer-guide-to-react-19-part-1-async-handling) - useTransition, useActionState for new projects
  - Note: Project uses React 18.x, React 19 patterns not applicable

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All patterns exist in codebase (useState, alertStore, CSS spinner, socket listeners)
- Architecture: HIGH - Modifications to existing files, no new infrastructure needed
- Pitfalls: HIGH - Based on known React async patterns, socket.io event timing, existing modal close handlers
- Socket error events: MEDIUM - Assumes server emits `quest:error` event (verify with backend team)
- alertStore duration change: MEDIUM - Success criteria says 5s, but impacts all alerts globally (get confirmation)

**Research date:** 2026-02-23
**Valid until:** 30 days (stable domain - React hooks, CSS animations, Socket.IO patterns mature)
