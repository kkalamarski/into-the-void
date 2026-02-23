---
phase: 71-quest-objective-tracker-hud
plan: 01
subsystem: ui/hud
tags: [quest-tracker, collapse, visual-hierarchy, localStorage]

dependency_graph:
  requires: []
  provides:
    - "QuestTracker collapse/expand with localStorage persistence"
    - "3-quest limit with overflow indicator"
    - "Primary/secondary quest visual hierarchy"
  affects:
    - "apps/web/src/ui/hud/QuestTracker.tsx"
    - "apps/web/src/ui/hud/QuestTracker.css"

tech_stack:
  added: []
  patterns:
    - "localStorage state persistence for UI preferences"
    - "Primary/secondary visual hierarchy via CSS classes"

key_files:
  created: []
  modified:
    - path: "apps/web/src/ui/hud/QuestTracker.tsx"
      changes: "Added isCollapsed state, toggleCollapse, 3-quest limit, primary/secondary classes"
    - path: "apps/web/src/ui/hud/QuestTracker.css"
      changes: "Repositioned to 110px, added header/content/primary/secondary/overflow styles"

decisions:
  - context: "Collapse state persistence"
    choice: "localStorage with 'quest-tracker-collapsed' key"
    rationale: "Simple, no dependencies, survives page refresh as required"

metrics:
  duration_seconds: 107
  tasks_completed: 2
  files_modified: 2
  completed_at: "2026-02-23T00:30:42Z"
---

# Phase 71 Plan 01: Quest Tracker HUD Enhancement Summary

Collapsible quest tracker with 3-quest limit and primary quest visual emphasis using localStorage persistence.

## What Was Built

### QuestTracker.tsx Enhancements
- **Collapse state**: `isCollapsed` initialized from localStorage, toggled via header click
- **Header UI**: Displays "Quests (N)" with arrow toggle indicator (> collapsed, v expanded)
- **3-quest limit**: `tracked.slice(0, 3)` limits visible quests
- **Primary/secondary classes**: First quest gets `tracked-quest--primary`, others get `tracked-quest--secondary`
- **Overflow indicator**: Shows "+N more" when more than 3 quests tracked

### QuestTracker.css Styles
- **Repositioned**: `top: 110px` to avoid overlap with status indicators
- **Header styles**: Flex layout with hover accent border
- **Content wrapper**: Gap control moved from parent to content div
- **Primary quest emphasis**: Left accent border + subtle purple background
- **Secondary quest styling**: Reduced opacity (0.85) and smaller font (12px)
- **Overflow indicator**: Centered italic text for "+N more"

## Commits

| Hash | Type | Description |
|------|------|-------------|
| 09c1782 | feat | Add collapse state and 3-quest limit to QuestTracker |
| 31ee157 | feat | Update QuestTracker.css with repositioning and new styles |

## Verification Results

- Build: PASSED (nx run web:build)
- CSS contains quest-tracker-header: FOUND
- CSS contains tracked-quest--primary: FOUND
- CSS contains top: 110px: FOUND
- TSX contains quest-tracker-collapsed: FOUND

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check: PASSED
