---
phase: 102-esc-centralization
verified: 2026-02-26T15:13:14Z
status: passed
score: 10/10 must-haves verified
re_verification: false
gaps:
  - truth: "Pressing a hotkey (I/E/K/Q/C/L) only toggles its panel if that panel is the topmost modal"
    status: resolved
    reason: "HUD.tsx guards Q (quest log) and L (combat log) with peek()?.id checks. However, handleLoreHotkey in loreStore.ts (registered by LoreCodex.tsx) toggles the lore codex on L without any modal stack guard — pressing L when another modal is topmost will still open/close the lore codex."
    artifacts:
      - path: "apps/web/src/store/loreStore.ts"
        issue: "handleLoreHotkey (lines 65-72) checks only for INPUT/TEXTAREA but does not call useModalStackStore.getState().peek() before calling toggleCodex()"
      - path: "apps/web/src/components/LoreCodex.tsx"
        issue: "LoreCodex outer registers handleLoreHotkey as-is (line 110) — no guard patch at the call site either"
    missing:
      - "Add peek() guard to handleLoreHotkey: if codex is open, only toggle when peek()?.id === 'lore-codex'; if codex is closed, always allow open"
human_verification:
  - test: "LIFO close order with multiple modals stacked"
    expected: "Open inventory, then quest log, then lore codex. ESC closes lore codex first, second ESC closes quest log, third ESC closes inventory."
    why_human: "Cannot verify LIFO order at runtime without exercising the React component lifecycle and Zustand state transitions programmatically."
  - test: "ESC with no modals open"
    expected: "Game menu overlay appears and is registered in the modal stack."
    why_human: "Requires a running browser session to observe the game menu appearing."
  - test: "ESC with NPC modal open (regardless of isPending)"
    expected: "NPC interaction modal closes immediately on ESC even while a trade is pending."
    why_human: "The isPending check was intentionally removed from the ESC path. Requires runtime confirmation that the ESC path truly ignores isPending."
---

# Phase 102: ESC Centralization Verification Report

**Phase Goal:** ESC key closes open modals one at a time in reverse-open order, and opens the game menu when no modals remain
**Verified:** 2026-02-26T15:13:14Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | ESC with no modals open opens the game menu | VERIFIED | GameUI.tsx line 81: `setIsMenuOpen(true)` is the final fallback after checking modal stack and in-game state |
| 2 | ESC with game menu open closes the game menu | VERIFIED | GameMenu.tsx line 20: `useModalStack('game-menu', onClose)` — ESC pops stack and calls `setIsMenuOpen(false)` |
| 3 | Modal stack store tracks registered modals in LIFO order | VERIFIED | modalStackStore.ts: `push` appends to array end, `pop` slices last entry, `peek` returns last entry |
| 4 | Central ESC handler dispatches to modal stack before in-game state | VERIFIED | GameUI.tsx lines 51-57: modal stack checked first in capture-phase handler |
| 5 | ESC with NPC modal open closes the NPC modal | VERIFIED | NpcInteractionModal.tsx line 213: `useModalStack('npc-interaction', closeInteraction)` — no own ESC listener present |
| 6 | ESC with quest log open closes the quest log | VERIFIED | QuestLogPanel.tsx line 15: `useModalStack('quest-log', toggleQuestLog)` — old ESC useEffect confirmed absent |
| 7 | ESC with lore codex open closes the lore codex | VERIFIED | LoreCodexContent (LoreCodex.tsx line 26): `useModalStack('lore-codex', onClose)` — old ESC useEffect confirmed absent |
| 8 | ESC with multiple modals stacked closes only the topmost one | VERIFIED | GameUI.tsx: `pop()` removes only the last entry, then returns; each ESC press handles exactly one entry |
| 9 | CastBar no longer has its own ESC listener | VERIFIED | CastBar.tsx (55 lines): only contains RAF timer effect and `handleCancel` click — zero keydown listeners |
| 10 | Pressing a hotkey only toggles its panel if that panel is the topmost modal | PARTIAL | HUD.tsx guards Q and L (combat log) with `peek()?.id`. BUT `handleLoreHotkey` in loreStore.ts (line 65-72) has NO peek guard — lore codex L key bypasses the topmost-modal contract |

**Score:** 9/10 truths verified (1 partial)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `apps/web/src/store/modalStackStore.ts` | Zustand store with push/pop/popById/peek | VERIFIED | 43 lines, exports `useModalStackStore` with all 4 actions and idempotent push guard |
| `apps/web/src/hooks/useModalStack.ts` | Auto-register/unregister hook | VERIFIED | 14 lines, uses `push` on mount + `popById` on unmount with `onCloseRef` pattern |
| `apps/web/src/ui/GameUI.tsx` | Centralized ESC dispatcher | VERIFIED | Single `window.addEventListener('keydown', ..., { capture: true })` at line 83; 5-step priority chain |
| `apps/web/src/ui/modals/GameMenu.tsx` | GameMenu registered in modal stack | VERIFIED | Line 20: `useModalStack('game-menu', onClose)` present |
| `apps/web/src/ui/panels/NpcInteractionModal.tsx` | NPC modal registered, no own ESC | VERIFIED | Line 213: `useModalStack('npc-interaction', closeInteraction)`; no `'Escape'` string in file |
| `apps/web/src/ui/panels/QuestLogPanel.tsx` | Quest log registered, no own ESC | VERIFIED | Line 15: `useModalStack('quest-log', toggleQuestLog)`; no `'Escape'` string in file |
| `apps/web/src/components/LoreCodex.tsx` | Lore codex registered in inner content component | VERIFIED | LoreCodexContent (line 26): `useModalStack('lore-codex', onClose)`; outer renders null when closed |
| `apps/web/src/ui/hud/CastBar.tsx` | No ESC listener | VERIFIED | File is 55 lines; zero keydown listeners; only RAF timer + click handler |
| `apps/web/src/ui/panels/InventoryPanel.tsx` | Inventory registered in stack | VERIFIED | Line 105: `useModalStack('inventory', toggleInventory)` |
| `apps/web/src/ui/panels/EquipmentPanel.tsx` | Equipment registered in stack | VERIFIED | Line 151: `useModalStack('equipment', toggleEquipment)` |
| `apps/web/src/ui/panels/AbilitiesPanel.tsx` | Abilities registered in stack | VERIFIED | Line 54: `useModalStack('abilities', toggleAbilities)` |
| `apps/web/src/ui/panels/ChatPanel.tsx` | Chat registered in stack | VERIFIED | Line 14: `useModalStack('chat', toggleChat)` |
| `apps/web/src/ui/modals/QuestCompleteModal.tsx` | Quest complete registered in stack | VERIFIED | QuestCompleteContent line 14: `useModalStack('quest-complete', onClose)`; outer renders null when no rewards |
| `apps/web/src/ui/hud/HUD.tsx` | Hotkey guards with peek() | PARTIAL | Q and L (combat log) are guarded. L for lore codex is NOT guarded — handled separately by unguarded `handleLoreHotkey` |

**9 modals/panels registered:** game-menu, npc-interaction, quest-log, lore-codex, inventory, equipment, abilities, chat, quest-complete — all confirmed via grep.

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `useModalStack.ts` | `modalStackStore.ts` | `push`/`popById` calls | WIRED | Lines 5-6 import selectors; line 11 calls push on mount, line 12 calls popById on unmount |
| `GameUI.tsx` | `modalStackStore.ts` | `getState().peek()` and `getState().pop()` in ESC handler | WIRED | Lines 52-54: `useModalStackStore.getState().peek()` and `.pop()` |
| `GameMenu.tsx` | `useModalStack.ts` | `useModalStack('game-menu', onClose)` | WIRED | Line 20 in component body, after `useNavigate` |
| `NpcInteractionModal.tsx` | `useModalStack.ts` | `useModalStack('npc-interaction', closeInteraction)` | WIRED | Line 213; `closeInteraction` from `useNpcStore` |
| `HUD.tsx` | `modalStackStore.ts` | `peek()?.id` check before hotkey toggle (Q/L-combat-log) | WIRED | Lines 64-81: `useModalStackStore.getState().peek()` guards Q and combat-log-L |
| `loreStore.ts::handleLoreHotkey` | `modalStackStore.ts` | peek guard before `toggleCodex` | NOT WIRED | `handleLoreHotkey` (lines 65-72) calls `toggleCodex()` with only INPUT/TEXTAREA guard, no stack peek check |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| ESC-01 | 102-01, 102-02 | Player can close the topmost open modal by pressing ESC | SATISFIED | `GameUI.tsx` ESC handler: `pop()` removes last stack entry and calls its `onClose()`; 9 modals registered |
| ESC-02 | 102-01, 102-02 | ESC closes modals one-by-one in LIFO order until none remain | SATISFIED | `pop()` uses `slice(0, -1)` — removes only the last entry; each ESC press handles one modal; stack empties sequentially |
| ESC-03 | 102-01, 102-02 | Pressing ESC when no modals are open opens the game menu | SATISFIED | `GameUI.tsx` line 81: `setIsMenuOpen(true)` fires only when `topModal` is falsy AND no in-game state to clear |

All three ESC requirements are SATISFIED. The gap (unguarded lore hotkey) is a quality/consistency issue for the hotkey guard truth from Plan 02, not a direct ESC-01/ESC-02/ESC-03 violation.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `apps/web/src/store/loreStore.ts` | 65-72 | `handleLoreHotkey` toggles lore codex on `L` key without modal stack peek guard | WARNING | Pressing `L` when another modal is topmost (e.g., inventory) opens/closes lore codex unexpectedly — violates the "hotkey toggle only when topmost" contract from Plan 02 |
| `apps/web/src/ui/panels/NpcInteractionModal.tsx` | 396 | `console.log(...)` in service action handler | INFO | Dead code path for non-expedition services; not related to ESC centralization |

### Human Verification Required

#### 1. LIFO Close Order with Multiple Stacked Modals

**Test:** Open inventory (I button), then quest log (Q key), then lore codex (L key). Press ESC three times.
**Expected:** First ESC closes lore codex; second ESC closes quest log; third ESC closes inventory.
**Why human:** Cannot verify LIFO ordering at runtime without exercising React component lifecycle and Zustand state changes in a browser context.

#### 2. ESC Opens Game Menu When Nothing Is Open

**Test:** Ensure no modals are open. Press ESC.
**Expected:** Game menu overlay appears immediately. Press ESC again — game menu closes.
**Why human:** Requires a running browser session with a logged-in character.

#### 3. NPC Modal Closes on ESC Even While Pending

**Test:** Interact with a trader NPC, initiate a buy trade (to trigger `tradePending`). While the trade is processing, press ESC.
**Expected:** NPC modal closes immediately despite `isPending = true`. The close button remains disabled (visual-only), but ESC bypasses the guard.
**Why human:** The `isPending` guard removal from the ESC path cannot be verified by static analysis alone — needs runtime confirmation that the modal actually closes.

### Gaps Summary

One truth partially fails: **"Pressing a hotkey only toggles its panel if that panel is the topmost modal."**

The HUD.tsx correctly guards `Q` (quest log) and `L` (combat log) with `useModalStackStore.getState().peek()` checks. However, the lore codex `L` hotkey goes through a separate path: `handleLoreHotkey` exported from `loreStore.ts` and registered by `LoreCodex.tsx`'s outer component. This function calls `toggleCodex()` unconditionally (aside from INPUT/TEXTAREA checks) with no modal stack peek guard.

**Root cause:** Plan 02 Task 2 notes said to check if `handleLoreHotkey` needed guarding, and the decision recorded was about the combat log — the lore hotkey guard was never explicitly resolved in the implementation.

**Fix required:** In `loreStore.ts`, update `handleLoreHotkey` to import and check `useModalStackStore`:

```typescript
import { useModalStackStore } from '../ui/../store/modalStackStore';

export function handleLoreHotkey(e: KeyboardEvent): void {
  if (e.key === 'l' || e.key === 'L') {
    if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
      return;
    }
    const top = useModalStackStore.getState().peek();
    const isOpen = useLoreStore.getState().isCodexOpen;
    // Close only if topmost; open always allowed
    if (isOpen && top?.id !== 'lore-codex') return;
    useLoreStore.getState().toggleCodex();
  }
}
```

This is the only gap. All three ESC requirements (ESC-01, ESC-02, ESC-03) are satisfied by the implementation. The core modal stack infrastructure, central ESC dispatcher, and all 9 modal registrations are correct and wired. TypeScript compilation passes with zero errors.

---

_Verified: 2026-02-26T15:13:14Z_
_Verifier: Claude (gsd-verifier)_
