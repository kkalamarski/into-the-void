---
phase: quick-fix
plan: 2
subsystem: world-gen
tags: [hub, connectivity, corridor, bug-fix]
dependency_graph:
  requires: []
  provides: [hub_verdant fully connected walkable area]
  affects: [hub_verdant.json, hub-loader.ts]
tech_stack:
  added: []
  patterns: [BFS connectivity check, JSON map editing]
key_files:
  created: []
  modified:
    - packages/world-gen/src/maps/hubs/hub_verdant.json
decisions:
  - "Extended NW fix to include col 44 rows 28-31 (plan only specified cols 36-37 rows 28-29)"
  - "Extended NE fix to include col 83 rows 27-29 and col 84 rows 28-29 (plan only specified col 91 rows 28-29)"
metrics:
  duration: ~20 min
  completed_date: "2026-03-19"
---

# Phase quick-fix Plan 2: Hub Verdant Corridor Fix Summary

**One-liner:** Carved 13 corridor tiles at two wall-band gaps to fully connect 3 disconnected room regions (1166 + 535 + 2350 tiles) into a single 4064-tile walkable area in Canopy Station.

## What Was Built

Fixed `hub_verdant.json` (Canopy Station) by carving walkable CANOPY_CORRIDOR (tile 33) tiles through wall bands that blocked passage between three isolated regions:
- **Region 1 (NW):** Trading Garden + Communion Hall (1166 tiles, x=[12-44])
- **Region 2 (NE):** Nursery (535 tiles, x=[84-115])
- **Region 3 (Center/South):** Atrium + Docking Bay (2350 tiles, x=[44-83])

After the fix: all 4064 walkable tiles form one connected region (BFS verified).

## Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Carve corridors in hub_verdant.json | af8e52e | packages/world-gen/src/maps/hubs/hub_verdant.json |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Extended NW corridor fix beyond plan specification**
- **Found during:** Task 1 - verification BFS check showed 2887 unreachable tiles after applying only the plan's prescribed 4 tiles (cols 36-37, rows 28-29)
- **Issue:** The plan's analysis identified the wall at rows 28-29 cols 36-37 as the NW gap, but the actual critical connection is at col 44 rows 28-31. R1's corridor ends at (44, 27) and R3's Atrium starts at (44, 32) — the 4-row gap between them was not in the plan's fix.
- **Fix:** Added col 44 rows 28-31 (4 additional CANOPY_CORRIDOR tiles) to bridge the gap. Plan's original tiles (cols 36-37 rows 28-29) were also kept as they correctly restore corridor style.
- **Files modified:** packages/world-gen/src/maps/hubs/hub_verdant.json
- **Commit:** af8e52e

**2. [Rule 1 - Bug] Extended NE corridor fix — wrong column identified in plan**
- **Found during:** Task 1 - after NW fix, NE Nursery (537 tiles) remained disconnected despite applying col 91 rows 28-29 from the plan
- **Issue:** The plan specified col 91 rows 28-29 as the NE gap fix. However, the NE corridor (cols 84-91, rows 25-27) connects to R2 (Nursery), while R3 starts at col 83 row 30. The wall barrier spans col 83-84 rows 24-29 and col 84 rows 28+. Opening only col 91 connected those tiles to R2 rather than bridging R2 to R3.
- **Fix:** Opened col 83 rows 27-29 (creates adjacent bridge: (84,27)[R2] ↔ (83,27) → (83,28) → (83,29) → (83,30)[R3]) and col 84 rows 28-29 (full corridor width). This merged R2 into the connected region.
- **Files modified:** packages/world-gen/src/maps/hubs/hub_verdant.json
- **Commit:** af8e52e

## Tile Changes Summary

**NW corridor fixes (13 total tiles opened):**
- `[28][36]`, `[28][37]`, `[29][36]`, `[29][37]` — plan's original fix (CANOPY_CORRIDOR)
- `[28][44]`, `[29][44]`, `[30][44]`, `[31][44]` — additional bridge at col 44 (CANOPY_CORRIDOR)

**NE corridor fixes:**
- `[27][83]`, `[28][83]`, `[29][83]` — col 83 bridge from R2 to R3 (CANOPY_CORRIDOR)
- `[28][84]`, `[29][84]` — col 84 corridor width (CANOPY_CORRIDOR)

All modified tiles: tile=33 (CANOPY_CORRIDOR), collision=false, height=0

## Verification Results

- hub_verdant: PASS — All 4064 walkable tiles are connected (was 3 regions)
- hub_helix: PASS — All 5100 walkable tiles connected (unchanged)
- hub_nexus: PASS — All 4819 walkable tiles connected (unchanged)
- hub_neutral: PASS — All 4341 walkable tiles connected (unchanged)
- world-gen build: PASS — `npx nx run world-gen:build` succeeded

## Self-Check: PASSED

- [x] packages/world-gen/src/maps/hubs/hub_verdant.json modified and committed
- [x] Commit af8e52e exists and staged only hub_verdant.json
- [x] BFS verification: 0 unreachable tiles
- [x] No other hub files modified
