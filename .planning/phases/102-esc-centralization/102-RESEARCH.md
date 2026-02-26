# Phase 102: ESC Centralization - Research

**Researched:** 2026-02-26
**Domain:** React keyboard event management, Zustand state, modal stack architecture
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Modal stack membership**
- All overlays that appear on top of the game canvas participate in the ESC stack (panels, popups, confirmation dialogs) — everything except toasts/notifications
- Explicit registration via a hook (e.g., `useModalStack()`) — components register/unregister themselves
- New overlay components are auto-included (opt-out model) — developers must explicitly opt out if a component should not be in the stack
- No "undismissable" modals — ESC always closes the topmost modal, no exceptions

**Close behavior & transitions**
- Instant removal — no animation on ESC close, modal disappears immediately
- No extra visual feedback beyond the modal disappearing
- One modal per ESC press — rapid key presses close modals sequentially, never collapse the entire stack
- Backdrop click behaves identically to ESC — closes the topmost modal in LIFO order

**Phaser event isolation**
- Only ESC is intercepted when a modal is open — other keys (WASD, hotkeys) still reach Phaser
- ESC priority chain (one action per press): (1) close topmost modal → (2) clear in-game state one at a time (e.g., cancel pathfinding, then deselect target) → (3) open game menu
- Single ESC handler lives in the React/HUD layer — it checks the modal stack, then signals Phaser via store/events for in-game actions. No separate Phaser ESC listener.

**Game menu behavior**
- Game menu is a regular modal in the stack — ESC opens it when stack is empty, ESC closes it when it's on top
- Sub-panels (e.g., settings opened from game menu) push onto the stack on top of the menu — ESC from settings returns to the menu
- Opening a new modal via hotkey while menu is open stacks on top — menu stays in the stack underneath
- Hotkey toggle only works when that modal is the topmost — pressing 'I' closes inventory only if it's on top; if something else is above it, the hotkey does nothing

### Claude's Discretion
- Exact hook API design and store shape
- In-game ESC action priority order (which clears first)
- How Phaser receives signals from the React ESC handler
- Stack state persistence (if any)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ESC-01 | Player can close the topmost open modal by pressing ESC | Modal stack Zustand store + single capture-phase ESC handler in GameUI.tsx |
| ESC-02 | ESC closes modals one-by-one in LIFO order until none remain | Stack data structure (array, push/pop) in Zustand store; each registered modal pushes/pops its close callback |
| ESC-03 | Pressing ESC when no modals are open opens the game menu | Priority chain after stack is empty falls through to `setIsMenuOpen(true)` (existing pattern in GameUI.tsx) |
</phase_requirements>

---

## Summary

The codebase currently has **scattered, competing ESC listeners** across multiple components. `GameUI.tsx` owns a capture-phase `window` listener that toggles the menu open/closed regardless of any other modals. `NpcInteractionModal.tsx` registers a bubble-phase `window` listener. `QuestLogPanel.tsx` and `LoreCodex.tsx` each have their own `window` listeners — none of them use `stopPropagation()`, meaning multiple handlers can fire on a single ESC keypress. `CastBar.tsx` also uses ESC (via `document`) to cancel casts.

The architecture change required is: create a single Zustand `useModalStackStore` holding an ordered array of close callbacks, move the one canonical ESC handler into `GameUI.tsx` (which already owns the capture-phase slot), and refactor every overlay to call `useModalStack()` instead of attaching their own listener.

The in-game ESC priority chain (after modal stack is empty): (1) cancel active pathfinding via `pathfindingController.cancelPath()`, (2) deselect combat target via `useCombatStore.getState().selectTarget(null)`, (3) open game menu. Both pathfinding and target-selection state are exposed through existing public methods and stores.

**Primary recommendation:** Implement a `useModalStackStore` Zustand store with `push(id, onClose)` / `pop()` / `popById(id)` actions, a `useModalStack(onClose)` hook that auto-registers on mount and removes on unmount, and replace the GameUI ESC handler with a single centralized dispatcher that reads from the store.

---

## Standard Stack

### Core (No new dependencies required)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Zustand | already installed | Modal stack state | All other stores in the project use Zustand; `create()` pattern consistent with `uiSettingsStore`, `combatStore`, etc. |
| React hooks | already installed | `useModalStack()` custom hook registration | Consistent with `useDraggablePanel` hook pattern already in project |

No new packages are needed. The feature is pure state management and event routing in the existing React/Zustand layer.

---

## Architecture Patterns

### Recommended Project Structure

No new directories needed. New files:

```
apps/web/src/store/modalStackStore.ts    — Zustand store for modal stack
apps/web/src/hooks/useModalStack.ts      — Custom hook: registers modal on mount, removes on unmount
```

Modified files:

```
apps/web/src/ui/GameUI.tsx               — Replace ESC toggle with centralized dispatcher
apps/web/src/ui/modals/GameMenu.tsx      — Remove local backdrop ESC; use useModalStack()
apps/web/src/ui/panels/NpcInteractionModal.tsx  — Replace own ESC listener with useModalStack()
apps/web/src/ui/panels/QuestLogPanel.tsx — Replace own ESC listener with useModalStack()
apps/web/src/components/LoreCodex.tsx    — Replace own ESC listener with useModalStack()
apps/web/src/ui/hud/CastBar.tsx          — Decide: is cast cancellation an "in-game state" clear or a modal? (see open questions)
```

### Pattern 1: modalStackStore

**What:** Zustand store holding an ordered array of `{ id: string; onClose: () => void }` entries. Last-pushed entry is the topmost modal.

**When to use:** Single source of truth for all registered modals.

```typescript
// apps/web/src/store/modalStackStore.ts
import { create } from 'zustand';

interface ModalEntry {
  id: string;
  onClose: () => void;
}

interface ModalStackState {
  stack: ModalEntry[];
  push: (id: string, onClose: () => void) => void;
  pop: () => void;
  popById: (id: string) => void;
  peek: () => ModalEntry | undefined;
}

export const useModalStackStore = create<ModalStackState>((set, get) => ({
  stack: [],
  push: (id, onClose) =>
    set((s) => ({ stack: [...s.stack, { id, onClose }] })),
  pop: () =>
    set((s) => ({ stack: s.stack.slice(0, -1) })),
  popById: (id) =>
    set((s) => ({ stack: s.stack.filter((e) => e.id !== id) })),
  peek: () => {
    const s = get().stack;
    return s[s.length - 1];
  },
}));
```

### Pattern 2: useModalStack hook

**What:** Custom hook that registers the calling component in the global stack on mount and removes it on unmount. Uses `useEffect` with a stable callback ref to avoid stale closures.

**When to use:** Every overlay that participates in the ESC chain calls this hook.

```typescript
// apps/web/src/hooks/useModalStack.ts
import { useEffect, useRef } from 'react';
import { useModalStackStore } from '../store/modalStackStore';

let counter = 0;
function uniqueId(prefix: string) {
  return `${prefix}-${++counter}`;
}

export function useModalStack(onClose: () => void): void {
  const push = useModalStackStore((s) => s.push);
  const popById = useModalStackStore((s) => s.popById);
  // Use a ref to always call the latest onClose without re-registering
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const id = uniqueId('modal');
    push(id, () => onCloseRef.current());
    return () => popById(id);
  }, []); // empty deps: register once on mount, remove on unmount
}
```

### Pattern 3: Centralized ESC dispatcher in GameUI.tsx

**What:** The single capture-phase `window` ESC listener already present in `GameUI.tsx` becomes the sole dispatcher. It reads from `modalStackStore`, pops the top entry and calls its `onClose`, or falls through to the in-game priority chain.

**When to use:** Replaces the current `setIsMenuOpen(prev => !prev)` toggle.

```typescript
// Inside GameUI.tsx useEffect
const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key !== 'Escape') return;
  e.stopPropagation();
  e.preventDefault();

  const top = useModalStackStore.getState().peek();
  if (top) {
    // Step 1: close topmost modal
    useModalStackStore.getState().pop();
    top.onClose();
    return;
  }

  // Step 2: no modals — clear in-game state one action per press
  const pathfinding = useGameStore.getState().game?.getWorldScene()?.getPathfindingController();
  if (pathfinding?.isPathActive()) {
    pathfinding.cancelPath();
    return;
  }

  const { selectedTarget } = useCombatStore.getState();
  if (selectedTarget !== null) {
    useCombatStore.getState().selectTarget(null);
    return;
  }

  // Step 3: open game menu
  setIsMenuOpen(true);
};

window.addEventListener('keydown', handleKeyDown, { capture: true });
```

Note: `getPathfindingController()` is already a public method on `WorldScene` (line 2113 of WorldScene.ts).

### Pattern 4: GameMenu as a regular modal in the stack

**What:** `GameMenu` calls `useModalStack(onClose)` so ESC closes it (not toggles it). The existing `setIsMenuOpen(false)` is passed as `onClose`.

```typescript
// apps/web/src/ui/modals/GameMenu.tsx
export function GameMenu({ onClose }: GameMenuProps) {
  useModalStack(onClose); // registers on mount, removes on unmount
  // ... rest of existing component unchanged
}
```

The open trigger remains in `GameUI.tsx` (step 3 of the ESC chain above, plus the existing `onMenuOpen` prop passed to HUD's GameShortcuts button).

### Pattern 5: Hotkey toggle behavior (per CONTEXT.md decision)

The locked decision: "Hotkey toggle only works when that modal is the topmost — pressing 'I' closes inventory only if it's on top; if something else is above it, the hotkey does nothing."

In `HUD.tsx` and `GameShortcuts.tsx`, hotkey handlers (I, E, K, Q, C, L) need to check `useModalStackStore.getState().peek()?.id` before toggling. Since modals use stable IDs (`uniqueId()` from the hook), the hotkey handlers cannot easily compare. Instead:

**Recommended approach:** Each toggle hotkey reads `showInventory` (etc.) from `gameStore` and compares it against whether the top-of-stack modal is "inventory-like". Simpler: just disable hotkey toggle when any modal is open (not topmost-check). But CONTEXT.md says only block if something else is above — so the hotkey checks if that specific panel is the peek().

The cleanest solution: each panel registers with a well-known ID (passed into `useModalStack`), and the hotkey handler reads `peek()?.id` and compares. Change the hook signature to `useModalStack(id: string, onClose: () => void)` with a fixed (not auto-generated) id per panel.

```typescript
// Revised hook signature:
export function useModalStack(id: string, onClose: () => void): void

// Usage in InventoryPanel:
useModalStack('inventory', toggleInventory);

// Usage in hotkey handler (HUD.tsx or GameShortcuts.tsx):
const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'i' || e.key === 'I') {
    const top = useModalStackStore.getState().peek();
    if (showInventory && top?.id === 'inventory') {
      toggleInventory(); // closes — it's on top
    } else if (!showInventory) {
      toggleInventory(); // opens
    }
    // if showInventory && top?.id !== 'inventory' → do nothing (blocked by something above)
  }
};
```

### Anti-Patterns to Avoid

- **Per-component ESC listeners:** The existing pattern (`NpcInteractionModal`, `QuestLogPanel`, `LoreCodex`) creates race conditions — multiple handlers firing on one keypress. All must be removed and replaced with `useModalStack`.
- **Toggle semantics for ESC on game menu:** The old `setIsMenuOpen(prev => !prev)` closes AND opens the menu on ESC. The new pattern only opens (step 3 of chain). Closing is handled by the modal stack popping GameMenu's entry.
- **Using `window` (bubble phase) for ESC in modals:** The existing `NpcInteractionModal` uses `window.addEventListener('keydown', ...)` without `{ capture: true }`. The new central handler runs in capture phase — it will fire first. Removing the per-component listeners eliminates the conflict.
- **Not using `e.stopPropagation()` in the central handler:** Omitting it allows other bubble-phase listeners (if any remain) to also receive the ESC key. The current `GameUI.tsx` handler already does this correctly.
- **Stack order drift:** Calling `popById` in the `onClose` of a modal means the modal removes itself twice (once from pop in dispatcher, once from hook unmount). Avoid double-removal: the dispatcher calls `pop()` (removes top), then `onClose()` which causes unmount, which calls `popById(id)` — but since `pop()` already removed it, `popById` is a no-op if the id is gone. This is safe as written.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Modal stack state | Custom React context or ref-based queue | Zustand store (same pattern as all other stores) | Consistent with project; reactive subscriptions work; no prop-drilling |
| Unique IDs for modals | UUID library | Simple auto-increment counter (`let counter = 0`) | No dependency needed; IDs are ephemeral per session |
| Focus trap | Custom focus management | Not needed per CONTEXT.md (instant close, no animation) | The requirement is instant removal — no focus trap needed |

**Key insight:** This feature is pure event routing and state shape. No new libraries are needed.

---

## Existing ESC Handlers — Inventory

Complete map of all ESC listeners that must be removed or replaced:

| File | Current behavior | Action |
|------|-----------------|--------|
| `apps/web/src/ui/GameUI.tsx:44-51` | Capture-phase; toggles `isMenuOpen` on ESC always | Replace with centralized dispatcher |
| `apps/web/src/ui/panels/NpcInteractionModal.tsx:223-234` | Bubble-phase; calls `closeInteraction()` if `!isPending` | Remove; replaced by `useModalStack('npc-interaction', closeInteraction)`. Note: `isPending` check (blocked during trade/quest/expedition operations) — the hook's `onClose` should respect `isPending` |
| `apps/web/src/ui/panels/QuestLogPanel.tsx:31-39` | Bubble-phase; calls `toggleQuestLog()` | Remove; replaced by `useModalStack('quest-log', toggleQuestLog)` |
| `apps/web/src/components/LoreCodex.tsx:26-32` | Bubble-phase; calls `toggleCodex()` if `isCodexOpen` | Remove; replaced by `useModalStack('lore-codex', toggleCodex)` |
| `apps/web/src/ui/hud/CastBar.tsx:38-48` | `document` listener; cancels cast via `gameSocket.emit('cast:cancel', {})` | Decide: cast cancel is "in-game state" step 2 in the priority chain, not a modal. Keep as-is or integrate into step 2 of priority chain. Recommend: integrate into step 2 (see open questions). |

Panels that disable Phaser keyboard (`setKeyboardEnabled(false)`) but have NO ESC listener:
- `InventoryPanel.tsx` — no own ESC handler (relies on GameUI.tsx + close button)
- `EquipmentPanel.tsx` — no own ESC handler
- `AbilitiesPanel.tsx` — no own ESC handler
- `PersonalStoragePanel.tsx` — no own ESC handler

These panels will automatically get ESC-to-close behavior once they call `useModalStack`.

---

## Common Pitfalls

### Pitfall 1: Double-firing ESC (current state)

**What goes wrong:** `GameUI.tsx` ESC handler (capture phase, `stopPropagation`) fires first and toggles the menu. Then `NpcInteractionModal.tsx` bubble-phase handler also fires because `stopPropagation` in capture phase does not stop other capture-phase handlers — it stops bubble-phase propagation after capture. Wait — actually `e.stopPropagation()` in capture phase stops the event from reaching the target AND bubble phase listeners. So `NpcInteractionModal.tsx` listener currently does NOT fire when `GameUI.tsx` handler calls `stopPropagation()`.

**Confirmed behavior (HIGH confidence):** The current `GameUI.tsx` capture-phase handler with `stopPropagation()` does intercept the event before any bubble-phase handler. The `NpcInteractionModal` ESC handler is currently dead code (never fires when the GameUI handler is active). This is why the STATE.md notes this pattern worked.

**How to avoid:** Maintain exactly one capture-phase handler (in `GameUI.tsx`). Remove all bubble-phase listeners. The dispatcher pattern naturally enforces this.

### Pitfall 2: Stale closure in useModalStack

**What goes wrong:** If `onClose` is passed as an inline lambda and the hook dependency array is empty, the `onClose` captured at mount time may become stale (e.g., `closeInteraction` uses `isPending` state that changes).

**Why it happens:** `useEffect(() => { push(id, onClose); return () => popById(id); }, [])` — empty deps means `onClose` is the original one.

**How to avoid:** Use a `useRef` to store the latest `onClose` and always call through the ref (shown in Pattern 2 above). This matches how `NpcInteractionModal` currently handles `isPending` — the ref will always point to the current closure.

### Pitfall 3: isPending gate in NpcInteractionModal

**What goes wrong:** `NpcInteractionModal` currently blocks ESC close when `isPending` (active trade/quest/expedition). The CONTEXT.md decision says "No undismissable modals — ESC always closes the topmost modal." However, the locked decision predates awareness of the `isPending` behavior.

**Resolution:** The CONTEXT.md says "no undismissable modals, no exceptions." The `isPending` check should be removed from the ESC path (the central dispatcher calls `onClose` unconditionally). The NPC modal's `onClose` (which maps to `closeInteraction`) should always be safe to call — it just resets store state.

**Warning signs:** If this creates UX issues (e.g., closing during an in-flight trade), consider showing a visual spinner but still allowing close. This is a UX decision, not a technical constraint.

### Pitfall 4: GameMenu open/close semantics

**What goes wrong:** The current GameUI handler toggles `isMenuOpen` (if open, closes; if closed, opens). The new pattern only opens the menu in step 3 of the chain. Closing is done when the modal stack dispatcher pops GameMenu's entry and calls its `onClose` (which calls `setIsMenuOpen(false)`).

**Edge case:** If the user presses ESC when the menu is closed and no modals are open, step 3 opens the menu. GameMenu mounts, calls `useModalStack('game-menu', onClose)`, pushing itself onto the stack. Next ESC press: dispatcher pops GameMenu's entry, calls `onClose()` = `setIsMenuOpen(false)`. GameMenu unmounts, hook calls `popById('game-menu')` — already removed, no-op. Correct behavior confirmed.

### Pitfall 5: Phaser keyboard `enabled` flag vs. capture-phase listener

**What goes wrong:** Several panels call `worldScene.setKeyboardEnabled(false)` when open. This sets `this.input.keyboard.enabled = false` in Phaser, preventing WASD movement keys. However, the React capture-phase ESC handler runs before Phaser sees any event. So ESC still works even with Phaser keyboard disabled.

**Note:** The `setKeyboardEnabled` calls should remain — they only affect Phaser's internal keyboard processing (WASD, H recall, etc.), not the React layer's capture-phase listener.

### Pitfall 6: STATE.md blocker — confirm `isPending` field name in npcStore

**From STATE.md:** "Confirm exact isPending field name in npcStore before removing per-component ESC handlers"

**Verified (HIGH confidence):** In `NpcInteractionModal.tsx` line 209:
```typescript
const isPending = tradePending || questPending || expeditionPending;
```
This is a local variable computed from three `npcStore` fields: `tradePending`, `questPending`, `expeditionPending`. There is no single `isPending` field in the store itself. When migrating to `useModalStack`, the `onClose` passed to the hook should be a stable function (e.g., `closeInteraction`) — the pending check becomes the UI's responsibility (disabling the close button) rather than blocking the ESC close.

---

## Code Examples

### Full centralized ESC dispatcher

```typescript
// GameUI.tsx — replaces existing ESC useEffect
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Escape') return;
    e.stopPropagation();
    e.preventDefault();

    // Step 1: Close topmost modal in LIFO stack
    const top = useModalStackStore.getState().peek();
    if (top) {
      useModalStackStore.getState().pop();
      top.onClose();
      return;
    }

    // Step 2: Clear in-game state, one action per press
    const game = useGameStore.getState().game;
    const worldScene = game?.getWorldScene();
    const pathfinding = worldScene?.getPathfindingController();
    if (pathfinding?.isPathActive()) {
      pathfinding.cancelPath();
      return;
    }

    const { selectedTarget } = useCombatStore.getState();
    if (selectedTarget !== null) {
      useCombatStore.getState().selectTarget(null);
      return;
    }

    // Step 3: No modals, no in-game state to clear — open game menu
    setIsMenuOpen(true);
  };

  window.addEventListener('keydown', handleKeyDown, { capture: true });
  return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
}, []); // stable: uses getState() snapshot, no reactive deps needed
```

### NpcInteractionModal migration

```typescript
// Remove the useEffect at lines 222-234 entirely
// Add at component top:
useModalStack('npc-interaction', closeInteraction);
// backdrop click remains: handleOverlayClick checks isPending before calling closeInteraction
```

### Hotkey guard for existing toggle keys (I, E, K, Q, C, L)

```typescript
// Example in HUD.tsx handleKeyDown:
const key = e.key.toLowerCase();
const top = useModalStackStore.getState().peek();

if (key === 'q') {
  if (isQuestLogOpen && top?.id === 'quest-log') {
    toggleQuestLog(); // closes — it's the topmost
  } else if (!isQuestLogOpen) {
    toggleQuestLog(); // opens
  }
  // else: quest log is open but blocked by something above — do nothing
}
```

---

## In-Game ESC Priority Order (Claude's Discretion)

The CONTEXT.md leaves priority order to Claude's discretion. Recommended order (from most specific to least):

1. **Cancel active pathfinding** — `pathfindingController.cancelPath()` — pathfinding is an active operation with visual feedback (entity moving); cancelling it is the most specific "undo last action"
2. **Deselect combat target** — `useCombatStore.getState().selectTarget(null)` — clearing selection is less urgent than stopping movement
3. **Open game menu** — last resort

This order matches the STATE.md blocker note about cast cancellation: `CastBar.tsx` already handles ESC for cast cancel via its own `document` listener. Since the central handler uses `window` + capture phase + `stopPropagation()`, cast cancel via `CastBar.tsx` is currently blocked (its listener never fires). Decision: move cast cancel into step 2 of the priority chain, before pathfinding:

Revised step 2 order:
1. Cancel active cast (`gameSocket.emit('cast:cancel', {})` if `abilityStore.isCasting()`)
2. Cancel active pathfinding
3. Deselect combat target

---

## Open Questions

1. **CastBar ESC integration**
   - What we know: `CastBar.tsx` adds a `document` keydown listener for ESC that emits `cast:cancel`. With the new central capture-phase handler calling `stopPropagation()`, CastBar's listener will never fire.
   - What's unclear: Should cast cancel be treated as step 1 of in-game state clearing, or should the modal stack also include "cast bar as a modal"?
   - Recommendation: Add cast cancel as the first in-game state step (step 2a). Remove the CastBar ESC listener. Simpler, and consistent with the "in-game state" category.

2. **QuestCompleteModal and AlertNotification**
   - What we know: `QuestCompleteModal` is click-to-dismiss with no ESC handler. `AlertNotification` has no ESC handler. Both are auto-visible (not opened by user action).
   - What's unclear: Should these participate in the ESC stack?
   - Recommendation: Based on CONTEXT.md, "all overlays that appear on top of the game canvas participate" — so yes. But they have `removeCompletedReward` actions (one reward at a time). This requires registering one entry per visible reward. Or: treat the entire QuestCompleteModal as one entry; ESC dismisses all at once (or just the topmost reward). Simpler: ESC dismisses the entire QuestCompleteModal component (remove all rewards). The CONTEXT.md says "one modal per ESC press" — if QuestCompleteModal is one component registered once in the stack, one ESC press removes it entirely (all rewards). Reasonable.

3. **Stack persistence**
   - What we know: CONTEXT.md says "Stack state persistence (if any)" is Claude's discretion.
   - Recommendation: No persistence. The stack is ephemeral UI state — it rebuilds from mounted components on each render. Persisting it would cause stale entries if the app reloads.

4. **DeathScreen ESC handling**
   - What we know: `DeathScreen` is rendered when `showDeathScreen === true`. It has no close button or ESC handler. It shows recovery options.
   - Recommendation: Do not register DeathScreen in the modal stack. ESC should not close the death screen. Use `opt-out` pattern — this is the exceptional case the CONTEXT.md "opt-out model" is designed for.

---

## Sources

### Primary (HIGH confidence)
- Direct code inspection of `/apps/web/src/ui/GameUI.tsx` — current ESC handler location and pattern
- Direct code inspection of all panel and modal files — complete ESC listener inventory
- Direct code inspection of `/apps/web/src/game/scenes/WorldScene.ts` — `setKeyboardEnabled`, `getPathfindingController`, `cancelPath` are all existing public methods
- Direct code inspection of `/apps/web/src/store/combatStore.ts` — `selectTarget(null)` clears selected target
- Direct code inspection of `npcStore.ts` — confirmed `isPending` field name breakdown
- `.planning/STATE.md` — confirmed ESC blockers and prior decisions

### Secondary (MEDIUM confidence)
- MDN event propagation model: capture-phase + `stopPropagation()` prevents bubble-phase listeners on target and ancestors — consistent with observed behavior in existing code

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries, all patterns confirmed in codebase
- Architecture: HIGH — patterns derived from existing code, not from external docs
- Pitfalls: HIGH — all pitfalls identified from actual code inspection (stale closures, double-fire, isPending)
- In-game priority order: MEDIUM — reasonable ordering, but no prior spec to validate against

**Research date:** 2026-02-26
**Valid until:** 2026-04-26 (stable codebase, no fast-moving dependencies)
