---
phase: 139-day-night-brightness-fix
status: passed
verified: 2026-03-18
verifier: orchestrator
requirement_ids: [VISUAL-01]
must_have_score: 7/7
---

# Phase 139: Day/Night Brightness Fix — Verification

## Goal
The day/night ColorMatrix produces a brightness curve where night is the darkest period and dusk/dawn are noticeably brighter than night.

## Must-Have Verification

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Night (midnight, progress ~0.8) is visibly the darkest period — brightness ~40-50% | PASS | Night brightness=0.42; after blueShift: R=0.39, G=0.41, B=0.43 — all channels in 40-50% range, clearly darkest |
| 2 | Dawn (progress ~0.05) and dusk (progress ~0.55) are noticeably brighter than night — brightness ~70-75% | PASS | Dawn=0.72, Dusk=0.70 — both 28-30 percentage points brighter than night's 0.42 |
| 3 | Day (noon, progress ~0.3) is full brightness — no filter applied | PASS | Day brightness=1.0, saturation=0.0, blueShift=0.0, warmShift=0.0 — identity matrix |
| 4 | Transitions between phases use smooth ease-in-out curves with no abrupt jumps | PASS | getBlendedVisuals() uses smoothStep() interpolation at phase boundaries (TRANSITION_FRACTION=0.2) |
| 5 | Night has a cool blue tint with slight desaturation (moonlight feel) | PASS | blueShift=0.12 reduces R/G more than B; saturation=-0.20 desaturates |
| 6 | Dawn and dusk have a subtle warm amber/golden tint | PASS | Dawn warmShift=0.08, Dusk warmShift=0.10 — boost R/G, reduce B |
| 7 | A subtle vignette darkens screen edges at night, creating a soft spotlight around the player | PASS | Vignette created via camera.postFX.addVignette(); updateVignette() ramps strength 0→0.3 during night (0.6-1.0) |

**Score: 7/7 must-haves verified**

## Requirement Traceability

| Requirement ID | Description | Status | Evidence |
|----------------|-------------|--------|----------|
| VISUAL-01 | Day/night cycle brightness is correct — dusk and dawn are brighter than night, not darker | PASS | Dawn=72%, Dusk=70%, Night=42% — brightness ordering correct; smooth transitions via smoothStep |

## Key Artifact Links

- `DayNightCycle.applyVisuals()` (line 150-193): Writes brightness via direct getData() diagonal manipulation, then color temperature shifts, then saturation, then AtmosphereSystem overlay
- `DayNightCycle.updateVignette()` (line 200-221): Smooth night vignette with fade-in/out using smoothStep
- `AtmosphereSystem.applyToMatrix()`: Unchanged — continues cooperative ColorMatrix sharing as last step

## Build Verification

- `npx nx run web:build` — PASSED (no TypeScript errors)

## Gaps

None found.

## Summary

Phase 139 goal achieved. The day/night brightness curve is corrected: night is the darkest period at ~42% brightness with cool blue tint and subtle vignette, dawn/dusk are noticeably brighter at 70-72% with warm amber tint, and day is full brightness with no filter. Transitions are smooth via smoothStep interpolation. The AtmosphereSystem cooperative ColorMatrix sharing remains unchanged.
