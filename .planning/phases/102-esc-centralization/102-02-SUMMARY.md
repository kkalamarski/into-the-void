---
phase: 102-esc-centralization
plan: "02"
subsystem: ui
tags: [react, zustand, modal-stack, esc-key, keyboard-shortcuts]

# Dependency graph
requires:
  - phase: 102-01
    provides: modalStackStore (push/pop/popById/peek), useModalStack hook, centralized ESC dispatcher in GameUI.tsx

provides:
  - All modals/panels registered in LIFO modal stack with well-known IDs
  - Per-component ESC listeners fully removed (NpcInteractionModal, QuestLogPanel, LoreCodex, CastBar)
  - ESC-to-close added for panels that lacked it (Inventory, Equipment, Abilities, Chat, QuestComplete)
  - Hotkey toggles (L, Q) stack-aware — close only when panel is topmost
affects: [any future modal or panel added to the game UI]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Inner content component pattern for conditionally-rendered modals calling useModalStack (LoreCodex, QuestCompleteModal)"
    - "Hotkey guard pattern: check peek()?.id before toggling — open unrestricted, close only when topmost"
    - "Cast cancel removed from per-component ESC path — handled exclusively by central dispatcher priority chain"

key-files:
  created: []
  modified:
    - apps/web/src/ui/panels/NpcInteractionModal.tsx
    - apps/web/src/ui/panels/QuestLogPanel.tsx
    - apps/web/src/components/LoreCodex.tsx
    - apps/web/src/ui/hud/CastBar.tsx
    - apps/web/src/ui/panels/InventoryPanel.tsx
    - apps/web/src/ui/panels/EquipmentPanel.tsx
    - apps/web/src/ui/panels/AbilitiesPanel.tsx
    - apps/web/src/ui/panels/ChatPanel.tsx
    - apps/web/src/ui/modals/QuestCompleteModal.tsx
    - apps/web/src/ui/hud/HUD.tsx

key-decisions:
  - "LoreCodex split into outer (L hotkey + conditional render) + LoreCodexContent inner (useModalStack) — avoids hook-in-early-return anti-pattern"
  - "QuestCompleteModal split into outer (renders null when empty) + QuestCompleteContent inner (useModalStack) — same inner component pattern"
  - "ESC on QuestCompleteModal dismisses first (oldest) reward card in the array"
  - "isPending check removed from NpcInteractionModal ESC path — per locked CONTEXT.md rule: no undismissable modals"
  - "Combat log (L key) not pushed to modal stack — it is a HUD overlay, not an interrupting modal; L key guarded only for close direction when showCombatLog is true and it is topmost"
  - "I/E/K/C keyboard handlers do not exist — those panel toggles are button-click-only in GameShortcuts.tsx"

patterns-established:
  - "Inner component pattern: when a component conditionally renders null, extract modal content to inner component for useModalStack registration"
  - "Hotkey guard: if (isOpen && top?.id === 'modal-id') { toggle() } else if (!isOpen) { toggle() }"

requirements-completed: [ESC-01, ESC-02, ESC-03]

# Metrics
duration: 8min
completed: 2026-02-26
---

# Phase 102 Plan 02: ESC Centralization — All Panels Summary

**All 9 game overlays registered in LIFO modal stack; zero per-component ESC listeners remain; hotkey toggles stack-aware**

## Performance

- **Duration:** 8 min
- **Started:** 2026-02-26T15:05:00Z
- **Completed:** 2026-02-26T15:13:00Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments
- Removed all per-component ESC listeners from NpcInteractionModal, QuestLogPanel, LoreCodex, CastBar
- Registered 9 modals/panels in the LIFO stack: game-menu, npc-interaction, quest-log, lore-codex, inventory, equipment, abilities, chat, quest-complete
- Inventory, Equipment, Abilities, Chat, QuestComplete now close on ESC for the first time
- HUD.tsx L and Q hotkey toggles guarded with `peek()?.id` — closing only when panel is topmost, opening always allowed
- TypeScript compiles cleanly; zero Escape listeners outside GameUI.tsx

## Task Commits

Each task was committed atomically:

1. **Task 1: Migrate modals with existing ESC listeners to useModalStack** - `c232091` (feat)
2. **Task 2: Register remaining panels in modal stack and guard hotkey toggles** - `b0aecb3` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `apps/web/src/ui/panels/NpcInteractionModal.tsx` - Added useModalStack('npc-interaction', closeInteraction), removed ESC useEffect, removed isPending check from ESC path
- `apps/web/src/ui/panels/QuestLogPanel.tsx` - Added useModalStack('quest-log', toggleQuestLog), removed ESC useEffect, kept setKeyboardEnabled effect
- `apps/web/src/components/LoreCodex.tsx` - Split into LoreCodexContent (useModalStack) + LoreCodex outer (L hotkey + conditional render); removed ESC useEffect
- `apps/web/src/ui/hud/CastBar.tsx` - Removed ESC useEffect; click-to-cancel remains
- `apps/web/src/ui/panels/InventoryPanel.tsx` - Added useModalStack('inventory', toggleInventory)
- `apps/web/src/ui/panels/EquipmentPanel.tsx` - Added useModalStack('equipment', toggleEquipment)
- `apps/web/src/ui/panels/AbilitiesPanel.tsx` - Added useModalStack('abilities', toggleAbilities)
- `apps/web/src/ui/panels/ChatPanel.tsx` - Added useModalStack('chat', toggleChat)
- `apps/web/src/ui/modals/QuestCompleteModal.tsx` - Split into QuestCompleteContent (useModalStack) + outer (conditional render); ESC dismisses first reward
- `apps/web/src/ui/hud/HUD.tsx` - Imported useModalStackStore; L and Q hotkey handlers guarded with peek()?.id check

## Decisions Made
- LoreCodex and QuestCompleteModal use the inner component pattern (outer conditionally renders inner) to satisfy React hooks rules while still registering/unregistering from the stack on open/close
- isPending guard removed from NpcInteractionModal ESC path per locked CONTEXT.md decision: "no undismissable modals — ESC always closes the topmost modal"
- Combat log not pushed to modal stack (it is a HUD log panel, not an interrupting modal); L key guarded for close only
- I/E/K/C keyboard handlers confirmed to not exist in the codebase — those are click-only in GameShortcuts.tsx

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- NpcInteractionModal.tsx and QuestLogPanel.tsx were found to already have useModalStack applied (from a stray `.` commit in the git history from a prior session). The files were already in the correct state, so no diff was generated for those two files. Verified via grep that changes were present.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- ESC centralization is complete for all 9 overlays
- The modal stack system is extensible — any new modal simply calls useModalStack(id, onClose)
- No blockers for future phases

---
*Phase: 102-esc-centralization*
*Completed: 2026-02-26*
