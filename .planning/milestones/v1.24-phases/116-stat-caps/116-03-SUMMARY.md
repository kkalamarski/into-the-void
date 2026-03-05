---
phase: 116-stat-caps
plan: 03
subsystem: ui
tags: [stats, diminishing-returns, react, css, zustand, tooltips]

requires:
  - phase: 116-01
    provides: applyDiminishingReturns function
  - phase: 116-02
    provides: CharStatsPayload.raw field
provides:
  - DR color indicators in equipment panel (amber for DR, red-orange for capped)
  - CAPPED label at hard cap (400 effective)
  - DR hover tooltip showing Raw vs Effective values
  - Hard cap toast notification via alertStore
  - DR-aware item comparison tooltips with (DR) annotation
  - CSS variables --color-stat-dr and --color-stat-capped
affects: [equipment-panel, item-tooltips, stat-display]

tech-stack:
  added: []
  patterns: [CSS variable-based stat theming, conditional DR class application]

key-files:
  created: []
  modified:
    - apps/web/src/styles/global.css
    - apps/web/src/ui/panels/EquipmentPanel.css
    - apps/web/src/ui/panels/EquipmentPanel.tsx
    - apps/web/src/store/statsStore.ts
    - apps/web/src/components/ItemTooltip.tsx
    - apps/web/src/components/ItemTooltip.css

key-decisions:
  - "Organic discovery approach: no tutorials or help icons, just color changes and hover tooltips"
  - "Subtle 200-threshold marker on ALL stat rows (0.3 opacity amber tick) for passive awareness"
  - "setTimeout(0) to escape immer draft context when calling alertStore from statsStore"
  - "Defensive fallback stats.raw?.[key] ?? stats.total[key] for backwards compatibility"

patterns-established:
  - "DR color coding: amber (#e8c849) for DR territory, red-orange (#e85d3a) for hard cap"
  - "Cross-store toast: setTimeout(0) pattern for calling external store from immer draft"

requirements-completed: [CAPS-04]

duration: 15min
completed: 2026-03-03
---

# Plan 03: Client UI DR Indicators Summary

**DR visual indicators in equipment panel with amber/red-orange stat coloring, CAPPED labels, hover tooltips, toast notifications, and DR-aware item comparison**

## Performance

- **Duration:** 15 min
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Stat rows turn amber when raw > 200 (DR territory), red-orange when effective = 400 (hard capped)
- CAPPED label appears next to stat value at hard cap
- Hover tooltip shows "Raw: X | Effective: Y" for stats in DR territory
- Subtle 200-threshold marker on all stat rows for passive awareness
- Toast notification fires when a stat newly reaches maximum effectiveness
- Item comparison tooltips show effective delta with (DR) annotation when in DR territory

## Task Commits

1. **Task 1: CSS variables and DR classes** - `fa4075d` (feat: add DR CSS)
2. **Task 2: CharStatRow DR awareness + toast + tooltip** - `fa4075d` (feat: DR-aware components)

## Files Created/Modified
- `apps/web/src/styles/global.css` - Added --color-stat-dr and --color-stat-capped CSS variables
- `apps/web/src/ui/panels/EquipmentPanel.css` - Added .char-stat--dr, .char-stat--capped, .char-stat-cap-label, .char-stat-dr-tooltip, .char-stat--has-threshold CSS rules
- `apps/web/src/ui/panels/EquipmentPanel.tsx` - Rewrote CharStatRow with DR awareness (useState, conditional classes, hover tooltip, CAPPED label)
- `apps/web/src/store/statsStore.ts` - Added hard cap toast detection comparing previous vs new effective stats
- `apps/web/src/components/ItemTooltip.tsx` - DR-aware comparison computing effective delta via applyDiminishingReturns
- `apps/web/src/components/ItemTooltip.css` - Added .tooltip-dr-tag and .tooltip-delta--neutral styles

## Decisions Made
- Used existing alertStore.addAlert for hard cap toast (no new notification system)
- Detect cap by comparing effective values (newEffective >= 400 && prevEffective < 400) rather than raw thresholds

## Deviations from Plan
None - plan executed as specified.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All stat cap visual indicators complete
- Phase 116 fully implemented across game-logic, shared-types, game-server, and web client

---
*Phase: 116-stat-caps, Plan: 03*
*Completed: 2026-03-03*
