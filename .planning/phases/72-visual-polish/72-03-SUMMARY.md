---
phase: 72-visual-polish
plan: 03
subsystem: ui/npc-modal
tags: [glassmorphism, modal-overlay, visual-polish, gap-closure]
completed: 2026-02-23T09:03:09Z

dependency_graph:
  requires:
    - "72-02 (glassmorphism CSS implementation)"
  provides:
    - "Working NPC modal with 150ms fade-in and backdrop blur"
  affects:
    - "All NPC interactions (trader, quest-giver, service, faction-rep)"

tech_stack:
  patterns:
    - "Overlay wrapper pattern for modal centering"
    - "Event delegation for background-click-to-close"
    - "GPU-accelerated backdrop-filter glassmorphism"
  css_features:
    - "Flexbox centering via overlay container"
    - "backdrop-filter with fallback for unsupported browsers"
    - "CSS variable-driven transition timing (--transition-modal)"

key_files:
  created: []
  modified:
    - path: "apps/web/src/ui/panels/NpcInteractionModal.tsx"
      description: "Added overlay wrapper div with --visible class and background-click handler"
      lines_changed: 19
    - path: "apps/web/src/ui/panels/NpcInteractionModal.css"
      description: "Removed fixed positioning from .npc-modal (overlay handles centering)"
      lines_changed: 4

decisions:
  - decision: "Use e.target === e.currentTarget pattern for background-click-to-close"
    rationale: "Prevents modal from closing when clicking modal content (only closes on overlay background)"
    alternatives: "Separate click handler on modal to stopPropagation"
    chosen_because: "Simpler, fewer event handlers, clearer intent"

metrics:
  duration_seconds: 77
  tasks_completed: 2
  files_modified: 2
  commits: 2
---

# Phase 72 Plan 03: Wire Glassmorphism Modal Overlay to React Component — Summary

**One-liner:** Connected NPC modal overlay wrapper with backdrop blur and 150ms fade transition to close gap from Phase 72 verification

## What Was Built

Wired the glassmorphism CSS (implemented in 72-02) to the NpcInteractionModal React component. The CSS for `.npc-modal-overlay` with backdrop-filter blur, fade transition, and browser fallback was fully implemented but orphaned — the component didn't render the overlay wrapper div.

**Before:** Modal rendered directly with fixed positioning (`position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%)`)

**After:** Modal wrapped in overlay container with glassmorphism effect (backdrop blur + semi-transparent tint), centered via flexbox, fades in over 150ms

## Tasks Completed

### Task 1: Add overlay wrapper to NpcInteractionModal component
**Commit:** 3b9e40b
**Changes:**
- Wrapped modal JSX in `<div className="npc-modal-overlay npc-modal-overlay--visible">`
- Added `handleOverlayClick` handler to close modal on background click (not modal content)
- Updated transform to use drag offset only: `transform: translate(${position.x}px, ${position.y}px)`
- Removed centering transform (`translate(-50%, -50%)`) since overlay handles centering via flexbox

**Files modified:** apps/web/src/ui/panels/NpcInteractionModal.tsx

### Task 2: Update modal CSS for overlay-based centering
**Commit:** d135726
**Changes:**
- Removed `position: fixed`, `top: 50%`, `left: 50%` from `.npc-modal`
- Kept `width: 700px`, `max-height: 80vh`, `display: flex`, `flex-direction: column`, `z-index: 100`, `box-shadow: var(--shadow-modal)`
- Modal now centered by overlay's `display: flex; align-items: center; justify-content: center` (CSS lines 6-8)
- Drag functionality still works — transform only contains drag offset, not centering offset

**Files modified:** apps/web/src/ui/panels/NpcInteractionModal.css

## Deviations from Plan

None. Plan executed exactly as written.

## Verification Results

### Automated Verification
- **TypeScript check:** PASSED — `npx tsc --noEmit -p apps/web/tsconfig.json` (no errors)
- **Overlay wrapper present:** VERIFIED — `grep "npc-modal-overlay" NpcInteractionModal.tsx` shows wrapper with `--visible` class (line 373)
- **Fixed positioning removed:** VERIFIED — `.npc-modal` CSS no longer contains `position: fixed`, `top`, `left`

### Human Verification Required
1. **Modal fade-in:** Open NPC modal, observe 150ms opacity fade with backdrop blur showing game world
2. **Glassmorphism effect:** Verify blurred backdrop is visible behind modal (semi-transparent tint)
3. **Background click:** Clicking overlay background (not modal content) should close modal
4. **Escape key:** Still closes modal (verified in code — handler unchanged)
5. **Close button:** Still works (verified in code — handler unchanged)
6. **Drag functionality:** Modal remains draggable with new transform structure
7. **Tabs/trade/quests:** All existing functionality unchanged

## Gap Closure

**Gap from 72-VERIFICATION.md:**
- **Truth #2:** "Modal windows fade in over 150ms with backdrop blur effect" — STATUS: PARTIAL (CSS ready but not wired)
- **Requirement VIS-03:** Smooth transitions on modal open/close — BLOCKED by missing overlay wrapper
- **Requirement VIS-04:** Glassmorphism effect on NPC modal — BLOCKED by missing overlay wrapper

**Resolution:**
- Added overlay wrapper div to component JSX
- Connected `--visible` class to trigger fade transition (opacity 0 → 1 over 150ms)
- Wired backdrop-filter blur and semi-transparent tint
- Integrated overlay click-to-close handler
- Updated modal positioning to work with overlay flexbox centering

**Impact:** Truth #2, VIS-03, and VIS-04 are now SATISFIED (pending human visual verification)

## Technical Notes

### Overlay Pattern
The modal overlay follows a standard pattern:
1. **Overlay layer:** Full-screen container (`position: fixed; inset: 0`) with glassmorphism backdrop
2. **Modal container:** Centered via flexbox (`display: flex; align-items: center; justify-content: center`)
3. **Visibility toggle:** `--visible` class triggers fade transition (opacity 0 → 1)
4. **Close on background:** Click handler with `e.target === e.currentTarget` check

### GPU Acceleration
- **backdrop-filter:** Uses GPU for blur effect (isolate creates stacking context)
- **Transition:** Animates only opacity (GPU-friendly property)
- **Fallback:** `@supports not (backdrop-filter)` provides solid background for unsupported browsers

### Drag Integration
The drag functionality remains intact. The transform now contains ONLY the drag offset:
- **Before:** `transform: translate(-50%, -50%) translate(${position.x}px, ${position.y}px)` (centering + drag)
- **After:** `transform: translate(${position.x}px, ${position.y}px)` (drag only)

Centering is handled by the overlay's flexbox layout, not the modal's transform.

## Self-Check: PASSED

**Files verified:**
```
FOUND: apps/web/src/ui/panels/NpcInteractionModal.tsx
FOUND: apps/web/src/ui/panels/NpcInteractionModal.css
```

**Commits verified:**
```
FOUND: 3b9e40b (feat(72-03): add overlay wrapper to NPC modal for glassmorphism)
FOUND: d135726 (refactor(72-03): remove fixed positioning from NPC modal)
```

**Code patterns verified:**
- Overlay wrapper: `npc-modal-overlay npc-modal-overlay--visible` on line 373 of NpcInteractionModal.tsx
- Background click handler: `handleOverlayClick` with `e.target === e.currentTarget` check
- Transform update: `translate(${position.x}px, ${position.y}px)` (no centering offset)
- CSS cleanup: `.npc-modal` no longer has `position: fixed`, `top: 50%`, `left: 50%`

All claims in this summary have been verified against the codebase.

---

_Completed: 2026-02-23T09:03:09Z (77 seconds)_
_Executor: Claude (gsd-executor)_
