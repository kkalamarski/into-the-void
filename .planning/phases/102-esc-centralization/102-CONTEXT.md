# Phase 102: ESC Centralization - Context

**Gathered:** 2026-02-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Centralize ESC key handling so it closes open modals one at a time in LIFO order, clears in-game state one action at a time, and opens the game menu when nothing else remains. ESC must not simultaneously fire in-game Phaser actions when closing a modal. Backdrop clicks follow the same close logic as ESC.

</domain>

<decisions>
## Implementation Decisions

### Modal stack membership
- All overlays that appear on top of the game canvas participate in the ESC stack (panels, popups, confirmation dialogs) — everything except toasts/notifications
- Explicit registration via a hook (e.g., `useModalStack()`) — components register/unregister themselves
- New overlay components are auto-included (opt-out model) — developers must explicitly opt out if a component should not be in the stack
- No "undismissable" modals — ESC always closes the topmost modal, no exceptions

### Close behavior & transitions
- Instant removal — no animation on ESC close, modal disappears immediately
- No extra visual feedback beyond the modal disappearing
- One modal per ESC press — rapid key presses close modals sequentially, never collapse the entire stack
- Backdrop click behaves identically to ESC — closes the topmost modal in LIFO order

### Phaser event isolation
- Only ESC is intercepted when a modal is open — other keys (WASD, hotkeys) still reach Phaser
- ESC priority chain (one action per press): (1) close topmost modal → (2) clear in-game state one at a time (e.g., cancel pathfinding, then deselect target) → (3) open game menu
- Single ESC handler lives in the React/HUD layer — it checks the modal stack, then signals Phaser via store/events for in-game actions. No separate Phaser ESC listener.

### Game menu behavior
- Game menu is a regular modal in the stack — ESC opens it when stack is empty, ESC closes it when it's on top
- Sub-panels (e.g., settings opened from game menu) push onto the stack on top of the menu — ESC from settings returns to the menu
- Opening a new modal via hotkey while menu is open stacks on top — menu stays in the stack underneath
- Hotkey toggle only works when that modal is the topmost — pressing 'I' closes inventory only if it's on top; if something else is above it, the hotkey does nothing

### Claude's Discretion
- Exact hook API design and store shape
- In-game ESC action priority order (which clears first)
- How Phaser receives signals from the React ESC handler
- Stack state persistence (if any)

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 102-esc-centralization*
*Context gathered: 2026-02-26*
