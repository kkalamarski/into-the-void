---
phase: 098-second-action-bar
verified: 2026-02-26T12:30:00Z
status: human_needed
score: 5/5 must-haves verified
human_verification:
  - test: "Press Shift+1 through Shift+8 in the game to trigger secondary bar abilities"
    expected: "Abilities in the second action bar fire; primary bar (keys 1-8) is unaffected"
    why_human: "Keyboard event dispatch requires a running browser with game session; cannot assert firing via static analysis alone"
  - test: "Drag an ability from the AbilitiesPanel onto slots in both action bars"
    expected: "Ability appears in the correct slot on each bar independently"
    why_human: "DnD behavior requires runtime DOM pointer events; cannot verify cross-component drag routing without execution"
  - test: "Shift+drag two abilities in a bar to swap their positions"
    expected: "Slots exchange contents; opposite bar is not affected"
    why_human: "shiftHeld state is set from activatorEvent at drag-start; can only confirm correct execution path exists, not actual input behavior"
  - test: "Drag a slot ability outside any droppable zone and release"
    expected: "Slot becomes empty; applies to both primary and secondary bar"
    why_human: "Pointer-leave detection depends on DnD runtime collision detection"
  - test: "Assign abilities to both bars, then refresh the page"
    expected: "Both bars restore their assignments from localStorage independently"
    why_human: "localStorage persistence requires browser environment"
  - test: "Confirm game shortcuts (I, E, K, Q, C) appear at bottom-right in vertical column, visually smaller than original"
    expected: "Buttons are 40x40px in a column beside the minimap, not overlapping action bars"
    why_human: "Visual layout verification requires rendered UI"
---

# Phase 98: Second Action Bar Verification Report

**Phase Goal:** Add second action bar row with Shift+1-8 keybindings and reorganize HUD layout
**Verified:** 2026-02-26T12:30:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Second action bar with 8 slots appears below first action bar | VERIFIED | HUD.tsx lines 146-149: `<ActionBar barIndex={0} />` and `<ActionBar barIndex={1} />` inside `.action-bars-container`; HUD.css defines `flex-direction: column` with `gap: 4px` |
| 2 | Second bar uses Shift+1-8 keybindings to trigger abilities | VERIFIED | ActionBar.tsx lines 240-241: `const targetBarIndex = e.shiftKey ? 1 : 0; if (targetBarIndex !== barIndex) return;` — bar 1 only responds when Shift held, bar 0 only responds without Shift |
| 3 | Second bar supports all Phase 97 drag-and-drop patterns | VERIFIED | GameUI.tsx: drop-outside-to-remove (lines 69-86), Shift+drag slot swap (lines 91-114), panel-to-slot assign (lines 117-135) all route by `bar-N-slot-N` regex — covers both bars. Old `startsWith('slot-')` pattern is absent |
| 4 | Second bar abilities persist across page refresh | VERIFIED | actionBarStore.ts: `SECONDARY_ABILITY_ORDER_STORAGE_KEY = 'action_bar_secondary_ability_order'` (line 7), `loadSecondaryAbilityOrderFromStorage()` on init (line 180), `saveSecondaryAbilityOrderToStorage()` called in every mutation |
| 5 | Game shortcuts are smaller and repositioned to bottom-right near minimap | VERIFIED | GameShortcuts.css: `.game-shortcut-btn { width: 40px; height: 40px; }` (lines 8-9), comment confirms "40x40 instead of 60x60"; HUD.css: `.hud-bottom-area .game-shortcuts { grid-column: 3; justify-self: end; margin-right: 200px; }` |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `apps/web/src/store/actionBarStore.ts` | Secondary ability order state with persistence | VERIFIED | `secondaryAbilityOrder` state (line 102), full CRUD actions (lines 182-214), distinct localStorage key (line 7), helper functions (lines 62-86) |
| `apps/web/src/ui/hud/ActionBar.tsx` | ActionBar component with barIndex prop | VERIFIED | `barIndex: 0 \| 1` in `ActionBarProps` (line 154), selector logic (lines 166-167), bar-prefixed slot IDs (lines 223-225), S1-S8 labels (line 52), no local DndContext |
| `apps/web/src/ui/hud/HUD.tsx` | Two ActionBar instances rendered | VERIFIED | Lines 146-149: `<ActionBar barIndex={0} />` + `<ActionBar barIndex={1} />` inside `action-bars-container`; `<GameShortcuts />` at line 150 |
| `apps/web/src/ui/hud/GameShortcuts.tsx` | Extracted shortcuts component | VERIFIED | Exports `GameShortcuts` with 5 real toggle handlers from gameStore (I/E/K/Q/C), each wired to `toggleInventory`, `toggleEquipment`, `toggleAbilities`, `toggleQuestLog`, `toggleChat` |
| `apps/web/src/ui/hud/GameShortcuts.css` | Compact shortcut button styles | VERIFIED | `.game-shortcut-btn { width: 40px; height: 40px; }` present; vertical flex column layout |
| `apps/web/src/ui/hud/HUD.css` | CSS Grid layout for bottom area | VERIFIED | `.hud-bottom-area { display: grid; grid-template-columns: 1fr auto 1fr; }` at lines 82-92; `.action-bars-container { grid-column: 2; }` at lines 99-105; `.game-shortcuts { grid-column: 3; margin-right: 200px; }` at lines 108-113 |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `ActionBar.tsx` | `actionBarStore.ts` | `barIndex === 0 ? abilityOrder : secondaryAbilityOrder` | WIRED | Line 166: selector exists, used to build `slots` memo and drive rendering |
| `GameUI.tsx` | `actionBarStore.ts` | `bar-(\d+)-slot-(\d+)` regex routing | WIRED | Three handleDragEnd paths all parse bar index from slot ID and route to correct store action |
| `HUD.tsx` | `GameShortcuts.tsx` | import and render | WIRED | Line 9: `import { GameShortcuts } from './GameShortcuts'`; line 150: `<GameShortcuts />` |
| `HUD.css` | layout grid | `grid-template-columns: 1fr auto 1fr` | WIRED | Line 88; auto-centers action bars in column 2, shortcuts in column 3 |
| `GameUI.tsx` | `actionBarStore.ts` | `handleDragStart` shiftHeld tracking | WIRED | Line 9: `DragStartEvent` imported; line 44: `handleDragStart` reads `activatorEvent.shiftKey`; line 193: `onDragStart={handleDragStart}` on DndContext |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| ABAR-05 | 98-01-PLAN.md | Second action bar with 8 slots exists below/beside first bar | SATISFIED | `<ActionBar barIndex={1} />` in HUD.tsx; 8 slots confirmed by `SLOT_COUNT = 8` in ActionBar.tsx; stacked via `action-bars-container` flex column |
| ABAR-06 | 98-01-PLAN.md | Second bar uses Shift+1-8 keybindings | SATISFIED | ActionBar.tsx keyboard handler checks `e.shiftKey` and gates by `targetBarIndex !== barIndex`; secondary bar only fires for Shift+number presses |
| HUD-01 | 98-02-PLAN.md | Game shortcuts are smaller | SATISFIED | GameShortcuts.css: `width: 40px; height: 40px;` — 33% reduction from 60x60 |
| HUD-02 | 98-02-PLAN.md | Game shortcuts moved to bottom-right next to minimap | SATISFIED | HUD.css: grid column 3, `justify-self: end`, `margin-right: 200px` (positions left of 180px minimap) |
| HUD-03 | 98-02-PLAN.md | Freed space accommodates second action bar | SATISFIED | action-bars-container occupies grid column 2 (auto, centered); both bars render with 4px gap in dedicated center column |

All 5 requirement IDs from REQUIREMENTS.md are fully accounted for by the plans and have implementation evidence. No orphaned requirements found.

### Anti-Patterns Found

None detected. All five modified/created files are free of TODO, FIXME, placeholder comments, empty implementations, and stub returns.

### Human Verification Required

#### 1. Shift+1-8 Keybinding Fires Secondary Bar

**Test:** Log in, equip at least one ability via Shift+drag to the secondary bar. Press Shift+1 through Shift+8.
**Expected:** Ability in the pressed slot fires (cooldown overlay appears, energy depletes); primary bar does not respond.
**Why human:** Requires browser with running game session and socket connection.

#### 2. Ability Drag from AbilitiesPanel to Both Bars

**Test:** Open the AbilitiesPanel. Drag an ability onto slot 3 of the primary bar; drag a different ability onto slot 3 of the secondary bar.
**Expected:** Each bar shows the assigned ability independently; no cross-bar contamination.
**Why human:** DnD drag routing requires pointer events over rendered DOM elements.

#### 3. Shift+Drag Slot Swap Within Bar

**Test:** Assign two abilities to slots 1 and 2 on the primary bar. Hold Shift and drag slot 1 onto slot 2.
**Expected:** The abilities swap positions; secondary bar is unchanged.
**Why human:** shiftHeld state captured from activatorEvent cannot be confirmed without real pointer input.

#### 4. Drag-Outside-to-Remove for Both Bars

**Test:** Drag an ability slot from each bar into an empty area of the game canvas and release.
**Expected:** The dragged slot becomes empty on the correct bar.
**Why human:** Requires DnD runtime to produce a null `over` event.

#### 5. Persistence Across Page Refresh

**Test:** Assign different abilities to both bars. Refresh the page.
**Expected:** Both bars restore their assignments. Browser DevTools localStorage should show two distinct keys: `action_bar_ability_order` and `action_bar_secondary_ability_order`.
**Why human:** Requires browser localStorage access and page lifecycle.

#### 6. Visual Layout Verification

**Test:** Open the game in a browser. Observe the bottom of the HUD.
**Expected:** Two action bars stacked centrally at bottom. Game shortcuts (I/E/K/Q/C) appear as a small vertical column to the left of the minimap at bottom-right. No overlap between shortcuts, action bars, or minimap.
**Why human:** Layout quality and overlap detection require rendered DOM and computed CSS.

---

## Commit Verification

All five commits claimed in SUMMARY files are confirmed present in git history:

| Commit | Message | Plan |
|--------|---------|------|
| `ab88fc7` | feat(98-01): extend actionBarStore with secondary ability order | 98-01 |
| `174cc50` | feat(98-01): add barIndex prop to ActionBar component | 98-01 |
| `c1e7a41` | feat(98-01): update HUD and GameUI for two action bars | 98-01 |
| `686068f` | feat(98-02): extract GameShortcuts component with compact 40x40 buttons | 98-02 |
| `12e0d22` | feat(98-02): update HUD layout with CSS Grid for action bars and shortcuts | 98-02 |

---

_Verified: 2026-02-26T12:30:00Z_
_Verifier: Claude (gsd-verifier)_
