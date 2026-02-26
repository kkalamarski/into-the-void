---
phase: 098-second-action-bar
plan: "02"
subsystem: ui
tags: [react, css-grid, hud, action-bar, game-shortcuts]

requires:
  - phase: 098-second-action-bar-01
    provides: second action bar with Shift+1-8 keybindings and DnD support

provides:
  - GameShortcuts component (40x40px compact vertical shortcut buttons)
  - CSS Grid hud-bottom-area layout (1fr auto 1fr columns)
  - action-bars-container centering both action bars
  - Shortcuts positioned bottom-right near minimap

affects: [hud, action-bar, game-shortcuts]

tech-stack:
  added: []
  patterns:
    - CSS Grid for HUD bottom layout with 1fr/auto/1fr columns
    - Extracted component pattern for menu shortcuts

key-files:
  created:
    - apps/web/src/ui/hud/GameShortcuts.tsx
    - apps/web/src/ui/hud/GameShortcuts.css
  modified:
    - apps/web/src/ui/hud/HUD.tsx
    - apps/web/src/ui/hud/HUD.css

key-decisions:
  - "GameShortcuts extracted as standalone component for separation of concerns"
  - "CSS Grid 1fr/auto/1fr layout centers action bars while allowing right-column shortcut placement"
  - "margin-right: 200px positions shortcuts left of minimap (180px minimap + 20px gap)"
  - "Labels shortened to Inv/Equip/Skill/Quest/Chat to fit 40x40 button footprint"

patterns-established:
  - "GameShortcuts: vertical flex column for compact sidebar placement beside minimap"

requirements-completed: []

duration: 2min
completed: 2026-02-26
---

# Phase 98 Plan 02: HUD Layout Reorganization Summary

**CSS Grid HUD bottom layout extracting GameShortcuts into 40x40px compact vertical column beside minimap, freeing center space for dual action bars**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-26T11:02:47Z
- **Completed:** 2026-02-26T11:04:20Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Extracted GameShortcuts component with 5 compact 40x40px buttons (I/E/K/Q/C) in vertical column
- Replaced `.hud-bottom` flex layout with `.hud-bottom-area` CSS Grid (1fr auto 1fr columns)
- Action bars centered in column 2; shortcuts positioned bottom-right near minimap in column 3
- Removed redundant `.action-btn` and `.action-bar` styles from HUD.css

## Task Commits

Each task was committed atomically:

1. **Task 1: Extract GameShortcuts component** - `686068f` (feat)
2. **Task 2: Update HUD layout with CSS Grid** - `12e0d22` (feat)

**Plan metadata:** `(pending docs commit)`

## Files Created/Modified
- `apps/web/src/ui/hud/GameShortcuts.tsx` - New compact shortcut buttons component (5 buttons, 40x40px each)
- `apps/web/src/ui/hud/GameShortcuts.css` - Compact shortcut button styles with vertical layout
- `apps/web/src/ui/hud/HUD.tsx` - Updated to use GameShortcuts and new CSS Grid bottom area layout
- `apps/web/src/ui/hud/HUD.css` - New hud-bottom-area grid layout replacing hud-bottom flex

## Decisions Made
- CSS Grid `1fr auto 1fr` centers the action bars exactly while allowing the shortcuts to sit in the right column without affecting center alignment
- `margin-right: 200px` positions the shortcuts to the left of the minimap (180px width + 20px edge padding)
- Shortened labels (Inv/Equip/Skill/Quest/Chat) fit the 40x40px button size without truncation
- Unused `toggleInventory`, `toggleEquipment`, `toggleAbilities`, `toggleChat` destructuring removed from HUD since they are now handled by GameShortcuts

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Pre-existing `map-editor:build` TypeScript error (TileId missing entries) and `web:lint` config issue (ESLint ignoring ts/tsx files) — both confirmed pre-existing before any changes, out of scope.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- HUD layout reorganization complete; dual action bars have clean centered space
- Game shortcuts 40x40px at bottom-right near minimap
- Phase 98 fully complete (2/2 plans done)
- v1.20 milestone complete

## Self-Check: PASSED

- GameShortcuts.tsx: FOUND
- GameShortcuts.css: FOUND
- HUD.tsx: FOUND (updated)
- HUD.css: FOUND (updated)
- 98-02-SUMMARY.md: FOUND
- Commit 686068f: FOUND
- Commit 12e0d22: FOUND

---
*Phase: 098-second-action-bar*
*Completed: 2026-02-26*
