---
phase: 72-visual-polish
plan: 01
subsystem: ui-polish
tags: [design-tokens, css-variables, gpu-acceleration, accessibility]
dependency_graph:
  requires: []
  provides:
    - Design tokens for animation timing (--duration-*, --ease-*, --transition-*)
    - Design tokens for shadows (--shadow-1 through --shadow-4)
    - Design tokens for glassmorphism (--glass-blur, --glass-tint)
    - GPU-accelerated button styles with hover/active/focus states
  affects:
    - All existing and future components using .btn classes
    - All future components that will use animation/shadow tokens
tech_stack:
  added: []
  patterns:
    - CSS custom properties for design tokens
    - GPU-accelerated transforms (translateY, scale)
    - GPU-accelerated filters (brightness)
    - prefers-reduced-motion accessibility support
key_files:
  created: []
  modified:
    - apps/web/src/styles/global.css
decisions:
  - "Design token naming: --duration-* for timing, --ease-* for curves, --transition-* for semantic usage"
  - "Shadow scale: 0-4 elevation levels with semantic aliases (--shadow-panel, --shadow-modal, --shadow-hover)"
  - "GPU acceleration: Use transform/filter instead of top/left/opacity for better performance"
  - "Touch device handling: @media (hover: none) disables hover transforms to prevent stuck states"
  - "Accessibility: prefers-reduced-motion sets all duration tokens to 0ms"
metrics:
  duration_seconds: 74
  tasks_completed: 2
  files_modified: 1
  commits: 2
  completed_date: 2026-02-23
---

# Phase 72 Plan 01: Design Token Foundation & Button Polish

**One-liner:** CSS design token system with animation timing, shadows, glassmorphism + GPU-accelerated button hover/active/focus states

## Overview

Established the visual polish design token foundation by adding CSS custom properties for animation timing, shadow elevation, and glassmorphism effects to global.css. Applied GPU-accelerated transforms and filters to the base .btn component for smooth hover/active/focus states with accessibility support.

**Purpose:** Create reusable design tokens that all components will use for consistent animation timing, shadows, and glassmorphism. Immediately apply polish to buttons (the most common interactive element) to demonstrate the system's capabilities.

**Result:** 13 animation tokens, 9 shadow tokens, 4 glassmorphism tokens, and fully polished button component with GPU-accelerated transitions, press feedback, keyboard focus ring, and accessibility features.

## Tasks Completed

### Task 1: Expand design tokens in global.css
**Status:** ✅ Complete
**Commit:** `cefbeff`

Added three new token categories to :root:
- **Animation timing tokens:** --duration-instant through --duration-slow (5 levels)
- **Easing curves:** --ease-out, --ease-in, --ease-in-out (cubic-bezier values)
- **Semantic transitions:** --transition-hover, --transition-active, --transition-modal
- **Shadow elevation scale:** --shadow-0 through --shadow-4 (5 levels)
- **Semantic shadows:** --shadow-panel, --shadow-modal, --shadow-hover
- **Glassmorphism:** --glass-blur, --glass-tint, --modal-backdrop-blur, --modal-backdrop-tint
- **Accessibility:** @media (prefers-reduced-motion: reduce) sets all durations to 0ms

**Key decision:** Organized tokens into logical groups (timing, easing, semantic) to support both direct usage (--duration-fast) and semantic usage (--transition-hover).

### Task 2: Apply GPU-accelerated styles to buttons
**Status:** ✅ Complete
**Commit:** `fff2773`

Replaced basic .btn styles with GPU-accelerated polish:
- **Base transitions:** transform, filter, box-shadow, background-color using design tokens
- **Hover state:** translateY(-1px) + brightness(1.15) + --shadow-hover
- **Active state:** scale(0.98) press feedback with faster transition
- **Focus-visible:** 2px accent outline + hover effects for keyboard users
- **Disabled state:** opacity 0.5, prevents all transforms
- **Touch devices:** @media (hover: none) disables hover transforms

**Performance win:** Using GPU-accelerated properties (transform, filter) instead of top/left/opacity for 60fps animations.

## Verification Results

All verification checks passed:
1. ✅ Duration tokens: 13 found (>= 5 required)
2. ✅ Shadow tokens: 9 found (>= 6 required)
3. ✅ Glass tokens: 4 found (>= 2 required)
4. ✅ prefers-reduced-motion media query exists
5. ✅ :focus-visible styles exist
6. ✅ scale(0.98) press feedback exists

## Deviations from Plan

None - plan executed exactly as written.

## Impact

**Immediate:**
- All buttons across the app now have smooth hover/active/focus states
- Keyboard users see visible focus rings
- Touch device users don't experience stuck hover states
- Users with motion sensitivity preferences get instant animations disabled

**Future:**
- 26 new design tokens available for use in all components
- Consistent animation timing across the entire UI
- Consistent shadow elevation system for depth
- Glassmorphism tokens ready for modal backdrops

## Next Steps

Plan 72-02 will apply these design tokens to modals, panels, and other components throughout the UI.

## Self-Check

Verifying all claims from this summary:

**Files created/modified:**
```bash
[ -f "apps/web/src/styles/global.css" ] && echo "FOUND: apps/web/src/styles/global.css" || echo "MISSING: apps/web/src/styles/global.css"
```
✅ FOUND: apps/web/src/styles/global.css

**Commits exist:**
```bash
git log --oneline --all | grep -q "cefbeff" && echo "FOUND: cefbeff" || echo "MISSING: cefbeff"
git log --oneline --all | grep -q "fff2773" && echo "FOUND: fff2773" || echo "MISSING: fff2773"
```
✅ FOUND: cefbeff
✅ FOUND: fff2773

**Design tokens exist:**
```bash
grep -c "duration-" apps/web/src/styles/global.css  # Should be >= 5
grep -c "shadow-" apps/web/src/styles/global.css    # Should be >= 6
grep -c "glass-" apps/web/src/styles/global.css     # Should be >= 2
```
✅ 13 duration tokens
✅ 9 shadow tokens
✅ 4 glass tokens

## Self-Check: PASSED

All files, commits, and token counts verified.
