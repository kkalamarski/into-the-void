---
phase: 139-day-night-brightness-fix
plan: 01
subsystem: ui
tags: [phaser, colormatrix, postfx, vignette, day-night-cycle]

requires:
  - phase: 126-atmosphere-system
    provides: AtmosphereSystem cooperative ColorMatrix sharing
provides:
  - Corrected day/night brightness curve with direct getData() manipulation
  - Color temperature tinting (cool blue at night, warm amber at dawn/dusk)
  - Night vignette postFX effect with smooth fade-in/out
affects: []

tech-stack:
  added: []
  patterns:
    - "Direct ColorMatrix getData() diagonal manipulation instead of brightness() named method"
    - "Separate vignette postFX stacked in pipeline alongside ColorMatrix"

key-files:
  created: []
  modified:
    - apps/web/src/game/systems/DayNightCycle.ts

key-decisions:
  - "Used direct m[0]/m[6]/m[12] assignment instead of colorMatrix.brightness() to avoid additive quirks"
  - "Color temperature shifts applied as relative adjustments to the base brightness diagonal values"
  - "Vignette uses separate postFX (addVignette) — does not interfere with ColorMatrix pipeline"

patterns-established:
  - "Direct getData() manipulation: for precise per-channel control, set diagonal values directly instead of using named ColorMatrix methods"

requirements-completed: [VISUAL-01]

duration: 5min
completed: 2026-03-18
---

# Phase 139-01: Day/Night Brightness Fix Summary

**Corrected ColorMatrix brightness curve via direct getData() manipulation, added cool/warm color temperature tinting and subtle night vignette postFX**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-18
- **Completed:** 2026-03-18
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments
- Fixed inverted brightness curve where night appeared brighter than dusk/dawn — night is now darkest at ~42%, dawn/dusk at ~70-72%, day at full brightness
- Added color temperature tinting: cool blue at night (moonlight feel), warm amber at dawn/dusk
- Added subtle vignette postFX that darkens screen edges during night with smooth fade-in/out transitions
- Replaced colorMatrix.brightness() with direct getData() diagonal manipulation for precise per-channel control

## Task Commits

Each task was committed atomically:

1. **Task 1 + Task 2: Fix brightness curve, color temperature, and add night vignette** - `6f744f1` (fix)

## Files Created/Modified
- `apps/web/src/game/systems/DayNightCycle.ts` - Rewritten PHASE_VISUALS values, applyVisuals() uses direct matrix manipulation, added vignette property/create/update/destroy

## Decisions Made
- Combined Task 1 and Task 2 into a single commit since both modify the same file and are tightly coupled
- Used direct m[0]/m[6]/m[12] diagonal assignment instead of colorMatrix.brightness() to eliminate the additive quirk that caused night's blue channel boost to counteract brightness reduction
- Color temperature shifts applied as relative deltas to the diagonal brightness values (not as separate additive offsets)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Day/night brightness curve is now correct — Phase 139 is the final phase in v1.28 milestone
- All v1.28 post-movement polish bug fixes complete

---
*Phase: 139-day-night-brightness-fix*
*Completed: 2026-03-18*
