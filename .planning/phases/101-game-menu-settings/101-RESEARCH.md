# Phase 101: Game Menu & Settings - Research

**Researched:** 2026-02-26
**Domain:** React overlay UI, Zustand state, localStorage persistence, WebSocket disconnect
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **Layout:** Tabbed modal overlay, ~60% screen width, dark semi-transparent backdrop, same CSS variables as existing HUD
- **Tabs:** Settings tab + About tab; "Leave Game" button always visible outside tabs
- **Audio section (Settings tab):** Master, Music, Effects, Ambient sliders + mute/unmute icon toggle each; wires to existing `useAudioStore` setters
- **Interface section (Settings tab):** "Secondary Action Bar" toggle switch with label
- **All changes live** — no save/apply button
- **Leave Game flow:** "Leave Game" label, confirmation dialog ("Are you sure?") with Cancel/Leave; on confirm disconnect WebSocket and navigate to `/character-select`; keep auth token and all localStorage intact
- **Open/close:** HUD gear/menu button + ESC key; game continues running (MMO, no pause); backdrop blocks clicks behind overlay
- **React Portal** to `document.body` (per STATE.md accumulated decisions)
- **ESC centralization deferred** to Phase 102 — Phase 101 adds a simple ESC listener for the menu only

### Claude's Discretion

- Menu button placement in HUD (top-right, top-left, wherever fits existing layout)
- Tab styling details (underline, pill, sidebar tabs)
- About tab content (version number, credits, links)
- Overlay animation (fade, slide, or instant)
- Exact confirmation dialog styling

### Deferred Ideas (OUT OF SCOPE)

- ESC key centralization (LIFO modal stack) — Phase 102
- Keybinding customization tab
- Graphics/performance settings
- Account management (password change, delete account)
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| MENU-01 | Player can open/close game menu overlay | React Portal pattern + ESC keydown listener in GameUI.tsx; menu open/close state in local React state or a new `useMenuStore` |
| MENU-02 | Game menu shows audio settings with sliders for music, effects, and ambient | `useAudioStore` already has `master`, `music`, `effects`, `ambient` + setters; wire `<input type="range">` onChange to those setters |
| MENU-03 | Game menu shows interface setting to toggle secondary action bar visibility | `useActionBarStore` (or a new `useUiSettingsStore`) needs a `showSecondaryBar` boolean persisted to localStorage |
| MENU-04 | Player can log out (leave game) from the game menu | `gameSocket.disconnect()` already used in `GameScreen.tsx` L92; then `navigate('/character-select')` |
| MENU-05 | Settings persist across browser sessions via localStorage | `useAudioStore` already persisted via Zustand `persist` middleware. Secondary bar visibility needs same treatment. |
</phase_requirements>

---

## Summary

Phase 101 is a pure frontend feature — no backend changes required. All four moving parts are already established in the codebase: (1) `useAudioStore` is persisted and has all four volume setters ready; (2) `gameSocket.disconnect()` + `navigate('/character-select')` is the exact leave-game pattern already used in `GameScreen.tsx`; (3) React Portals are the decided pattern for overlays (recorded in STATE.md); (4) the HUD bottom area (`GameShortcuts`) already has the button row pattern for adding a menu/gear button.

The only new infrastructure needed is: (a) a `useUiSettingsStore` (Zustand + persist) for the secondary action bar visibility boolean, (b) a `<GameMenu>` React component rendered as a Portal to `document.body`, and (c) a gear/menu button added to the `GameShortcuts` bar.

The secondary action bar visibility toggle is the only piece requiring a new store. It should follow the Zustand `persist` pattern already used by `useAudioStore` (using the `audio-settings` localStorage key as a model).

**Primary recommendation:** Build `GameMenu` as a React Portal, wire it to `useAudioStore` setters directly, add `useUiSettingsStore` for secondary bar visibility, and reuse the leave-game pattern from `GameScreen.tsx`.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React (createPortal) | already installed | Render menu outside HUD stacking context | Already decided in STATE.md; escapes `.game-ui` z-index |
| Zustand + persist middleware | already installed | Store secondary bar visibility, survive refresh | Already used by `useAudioStore` |
| CSS variables (plain CSS) | project convention | Match existing HUD dark theme | Project uses plain CSS with `--color-*` variables; no Tailwind/CSS-in-JS |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-icons (GiSettings or similar) | already installed | Gear icon for HUD menu button | HUD already uses `react-icons/gi` icons |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Plain CSS modal | Radix UI Dialog | Radix adds accessibility but is not in the project deps; keep plain CSS for consistency |
| Local useState for open | gameStore toggle | Local state in GameUI.tsx is fine for menu open/close; no need to pollute gameStore |

**Installation:** No new packages required.

---

## Architecture Patterns

### Recommended Project Structure
```
apps/web/src/
├── ui/
│   ├── GameUI.tsx                  # Add ESC listener + render <GameMenu> Portal
│   ├── hud/
│   │   ├── GameShortcuts.tsx       # Add gear/menu button
│   │   └── GameShortcuts.css
│   └── modals/
│       ├── GameMenu.tsx            # New: tabbed overlay component
│       └── GameMenu.css            # New: overlay styles
├── store/
│   └── uiSettingsStore.ts          # New: showSecondaryBar + persist
```

### Pattern 1: React Portal Overlay
**What:** Render modal outside `.game-ui` div to avoid stacking context and z-index conflicts.
**When to use:** All fullscreen/modal overlays in this project.
**Example:**
```tsx
// GameMenu.tsx
import { createPortal } from 'react-dom';

export const GameMenu: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  return createPortal(
    <div className="game-menu-backdrop" onClick={onClose}>
      <div className="game-menu-modal" onClick={e => e.stopPropagation()}>
        {/* tabs, content, Leave Game button */}
      </div>
    </div>,
    document.body
  );
};
```

### Pattern 2: Audio Slider Wired to Existing Store
**What:** `<input type="range">` with `onChange` calling audioStore setter — updates AudioManager gain node in real time.
**When to use:** For all four volume sliders.
**Example:**
```tsx
// Inside GameMenu Settings tab
const { master, music, effects, ambient, setMaster, setMusic, setEffects, setAmbient } = useAudioStore();

<input type="range" min={0} max={1} step={0.01}
  value={music}
  onChange={e => setMusic(Number(e.target.value))}
/>
```
Note: `onChange` fires on every drag tick in React — this satisfies the "live update while dragging" requirement.

### Pattern 3: Leave Game Flow
**What:** Reuse the exact pattern from `GameScreen.tsx` (line 92).
**When to use:** On "Leave Game" confirmation.
**Example:**
```tsx
// Source: apps/web/src/screens/GameScreen.tsx L92
import { gameSocket } from '../../network/socket';
import { useNavigate } from 'react-router';

const navigate = useNavigate();

const handleLeaveGame = () => {
  gameSocket.disconnect();
  navigate('/character-select');
};
```
Do NOT call `useAuthStore.logout()` — the decision is to keep the token intact.

### Pattern 4: Persisted UI Settings Store
**What:** Zustand store with `persist` middleware for `showSecondaryBar` boolean.
**When to use:** Any HUD visibility setting that should survive refresh.
**Example:**
```ts
// store/uiSettingsStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UiSettingsState {
  showSecondaryBar: boolean;
  setShowSecondaryBar: (v: boolean) => void;
}

export const useUiSettingsStore = create<UiSettingsState>()(
  persist(
    (set) => ({
      showSecondaryBar: true,
      setShowSecondaryBar: (v) => set({ showSecondaryBar: v }),
    }),
    {
      name: 'ui-settings',
      partialize: (state) => ({ showSecondaryBar: state.showSecondaryBar }),
    }
  )
);
```

### Pattern 5: ESC Key Listener in GameUI
**What:** Single `keydown` listener in `GameUI.tsx` (existing component), toggles menu open state.
**When to use:** For Phase 101. Phase 102 will centralize ESC into a LIFO stack.
**Example:**
```tsx
// In GameUI.tsx, add to existing component
const [isMenuOpen, setIsMenuOpen] = useState(false);

useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsMenuOpen(prev => !prev);
    }
  };
  window.addEventListener('keydown', handleKeyDown, { capture: true });
  return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
}, []);
```
Note: `{ capture: true }` is the existing project pattern for ESC (per STATE.md: "Single capture-phase handler in GameUI.tsx — prevents Phaser dual-fire").

### Pattern 6: Secondary Bar Visibility Consumed by ActionBar
**What:** `ActionBar` component for `barIndex={1}` reads `showSecondaryBar` from `useUiSettingsStore` and renders `null` when false.
**When to use:** HUD already renders `<ActionBar barIndex={1} />` unconditionally in `HUD.tsx` L148.
**Example:**
```tsx
// In ActionBar.tsx, near top
const { showSecondaryBar } = useUiSettingsStore();
if (barIndex === 1 && !showSecondaryBar) return null;
```

### Anti-Patterns to Avoid
- **Calling `useAuthStore.logout()` on Leave Game:** User decision is to keep the token; logout clears it.
- **Adding menu open state to gameStore:** Menu open/close is UI-local state; gameStore is for gameplay state.
- **Using `onMouseUp` for slider:** React `onChange` fires live on drag; `onMouseUp` only fires on release — wrong for live audio feedback.
- **Skipping `e.stopPropagation()` on modal:** Without it, clicks inside the modal bubble to the backdrop and close it.
- **Rendering `<GameMenu>` inside `.game-ui` div:** Must be a Portal to `document.body` to escape z-index stacking context.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Volume persistence | Manual localStorage read/write | `useAudioStore` already persisted | Already done in Phase 100 |
| Tab switching | Custom tab state machine | Simple `useState<'settings' \| 'about'>` | Two tabs; no complexity |
| WebSocket disconnect | Custom disconnect logic | `gameSocket.disconnect()` | Already works in GameScreen.tsx |

---

## Common Pitfalls

### Pitfall 1: ESC Fires Twice (Phaser + React)
**What goes wrong:** Phaser captures keyboard events via its own input system; ESC fires in both Phaser and the React handler.
**Why it happens:** Phaser registers global keyboard listeners that run before React handlers.
**How to avoid:** Use `{ capture: true }` on the `addEventListener` call AND call `e.stopPropagation()` — this is the existing project pattern (STATE.md).
**Warning signs:** ESC opens and immediately closes the menu in the same tick.

### Pitfall 2: Backdrop Click-Through
**What goes wrong:** Clicks on the backdrop reach the Phaser canvas below, triggering game actions while the menu is open.
**Why it happens:** The backdrop is a DOM overlay but the canvas still receives pointer events.
**How to avoid:** The backdrop must have `pointer-events: all` and call `e.preventDefault()` or rely on CSS to block input. Alternatively, add `pointer-events: none` to the canvas while menu is open.
**Warning signs:** Clicking outside the modal moves the player character.

### Pitfall 3: Slider onChange vs onInput in React
**What goes wrong:** Developer uses `onInput` expecting live updates; React's synthetic event system normalizes this differently.
**Why it happens:** In React, `onChange` on `<input type="range">` fires on every tick of the slider drag (equivalent to native `oninput`). Using `onInput` is not the React idiom.
**How to avoid:** Use `onChange` — it fires live during drag in React.

### Pitfall 4: useNavigate outside Router context
**What goes wrong:** `useNavigate` throws if called in a component not inside the Router tree.
**Why it happens:** GameMenu renders in a Portal (outside `.game-ui`) but is still within the React tree mounted inside the Router — so this is safe as long as `GameMenu` is rendered from within `GameUI` which is inside the Router.
**Warning signs:** "useNavigate() may be used only in the context of a <Router> component" error.

### Pitfall 5: Secondary Bar Toggle Doesn't Persist
**What goes wrong:** Toggle works in session but resets on refresh.
**Why it happens:** Developer stores `showSecondaryBar` in local `useState` instead of `useUiSettingsStore`.
**How to avoid:** Store must use Zustand `persist` middleware with `localStorage` (default for persist).

---

## Code Examples

### HUD Gear Button (in GameShortcuts.tsx)
```tsx
// Add alongside existing shortcut buttons
<button className="game-shortcut-btn" onClick={onMenuOpen} title="Menu (ESC)">
  <span>☰</span>
  <label>Menu</label>
</button>
```
Wire `onMenuOpen` prop from `HUD.tsx` → `GameShortcuts`. Or lift menu state to `GameUI.tsx` and pass open handler down.

### Confirmation Dialog Pattern
```tsx
// Simple inline — no library needed
const [confirming, setConfirming] = useState(false);

{confirming ? (
  <div className="confirm-dialog">
    <p>Are you sure you want to leave?</p>
    <button onClick={() => setConfirming(false)}>Cancel</button>
    <button onClick={handleLeaveGame}>Leave</button>
  </div>
) : (
  <button onClick={() => setConfirming(true)}>Leave Game</button>
)}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Store all UI state in gameStore | Per-domain stores (audioStore, uiSettingsStore) | Phase 100 | Cleaner separation; persist only what belongs to that domain |

---

## Open Questions

1. **Menu button placement in HUD**
   - What we know: HUD has `hud-top-left` (player info), `hud-bottom-area` (action bars + GameShortcuts), `hud-minimap` (top-right corner), biome/combat/safe-zone indicators
   - What's unclear: Whether the gear button belongs in `GameShortcuts` (bottom) or near the minimap (top-right)
   - Recommendation: Add to `GameShortcuts` bottom row — it's already the "panel shortcuts" strip; this is consistent with existing I/E/K/Q/C buttons. Claude's discretion per CONTEXT.md.

2. **ActionBar barIndex=1 visibility vs full removal**
   - What we know: `HUD.tsx` renders `<ActionBar barIndex={0} />` and `<ActionBar barIndex={1} />` unconditionally
   - What's unclear: Whether to gate inside `ActionBar` or in `HUD.tsx`
   - Recommendation: Gate inside `ActionBar` — `barIndex === 1 && !showSecondaryBar → return null`. Keeps HUD.tsx clean.

---

## Validation Architecture

> `workflow.nyquist_validation` is not set in `.planning/config.json` — skipping this section.

---

## Sources

### Primary (HIGH confidence)
- Direct codebase read: `apps/web/src/store/audioStore.ts` — confirmed `useAudioStore` with persist, all 4 setters
- Direct codebase read: `apps/web/src/store/actionBarStore.ts` — confirmed secondary bar state structure; no `showSecondaryBar` exists yet (needs new store)
- Direct codebase read: `apps/web/src/ui/GameUI.tsx` — confirmed component structure, no existing menu
- Direct codebase read: `apps/web/src/ui/hud/HUD.tsx` — confirmed `<ActionBar barIndex={1} />` rendered unconditionally
- Direct codebase read: `apps/web/src/ui/hud/GameShortcuts.tsx` — confirmed button strip pattern; 5 buttons; gear can be 6th
- Direct codebase read: `apps/web/src/screens/GameScreen.tsx` — confirmed `gameSocket.disconnect()` + `navigate('/character-select')` pattern
- Direct codebase read: `.planning/STATE.md` — confirmed React Portal decision, ESC capture-phase decision

### Secondary (MEDIUM confidence)
- React docs pattern: `createPortal(children, document.body)` is the standard Portal API

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already in project, no new deps
- Architecture: HIGH — patterns directly observed in codebase; reusing existing patterns
- Pitfalls: HIGH — ESC/Phaser pattern verified in STATE.md; slider onChange behavior is well-known React behavior

**Research date:** 2026-02-26
**Valid until:** 2026-03-28 (stable codebase; valid until major refactor)
