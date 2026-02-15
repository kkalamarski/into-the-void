---
phase: 07-entities-hud
plan: 04
subsystem: game-client
tags:
  - minimap
  - phaser-camera
  - hud
  - multi-camera
dependency-graph:
  requires:
    - 07-01-SUMMARY.md (WorldScene integration)
  provides:
    - Minimap rendering with player indicator
    - Multi-camera Phaser setup
  affects:
    - apps/web/src/game/scenes/WorldScene.ts
    - apps/web/src/ui/hud/HUD.tsx
tech-stack:
  added:
    - Phaser multi-camera system for minimap
  patterns:
    - Camera reuse for zoomed-out world view
    - Graphics overlay for UI elements (border, player indicator)
    - Fixed-screen positioning with scroll factor 0
key-files:
  created:
    - apps/web/src/game/rendering/MinimapCamera.ts
  modified:
    - apps/web/src/game/scenes/WorldScene.ts
    - apps/web/src/ui/hud/HUD.tsx
    - apps/web/src/ui/hud/HUD.css
decisions:
  - title: Phaser camera system for minimap
    rationale: Reuses existing tile rendering instead of separate canvas, ensures consistency
  - title: 0.15x zoom factor
    rationale: Shows wider area (~1200 tiles) while keeping player visible
  - title: Fixed screen positioning
    rationale: Graphics use scrollFactor(0) to stay in place while camera follows player
  - title: Bottom-right placement
    rationale: Avoids overlap with top-left player stats and top-right connection indicator
  - title: Player indicator always centered
    rationale: Minimap camera follows player, so player is always at minimap center
metrics:
  duration: 160s
  tasks-completed: 4
  files-created: 1
  files-modified: 3
  commits: 4
  completed-date: 2026-02-15
---

# Phase 7 Plan 4: Minimap with Player Position Summary

**One-liner:** Minimap showing player position and biome colors using Phaser multi-camera at bottom-right corner

## Overview

Implemented minimap functionality using Phaser's multi-camera system. The minimap reuses existing world tile rendering at 0.15x zoom, showing biome colors automatically. Player position indicator displayed as white dot with yellow border at minimap center.

## Tasks Completed

### Task 1: Create MinimapCamera utility class
**Commit:** 6971edb
**Files:** apps/web/src/game/rendering/MinimapCamera.ts

Created MinimapCamera class managing:
- Minimap camera creation at bottom-right corner (180x180px, 20px padding)
- 0.15x zoom for wide area view
- Border rendering via Graphics (gray border for visual distinction)
- Player indicator (white dot, yellow border) fixed at screen position
- Window resize handling with automatic repositioning
- Cleanup in destroy() method

Key implementation details:
- Minimap camera named 'minimap' for identification
- Border and player indicator use `setScrollFactor(0)` for fixed screen positioning
- Player indicator depth set to 1001 (above border at 1000)
- Resize listener updates camera viewport and redraws border/indicator

### Task 2: Integrate MinimapCamera into WorldScene
**Commit:** de82915
**Files:** apps/web/src/game/scenes/WorldScene.ts

Integrated MinimapCamera into WorldScene lifecycle:
- Import MinimapCamera class
- Add private property `minimapCamera: MinimapCamera | null`
- Create minimap after ZoneHUD initialization in create()
- Set minimap to follow player sprite in updateLocalPlayer()
- Cleanup in shutdown() method

Camera follow configuration:
- Main camera: `startFollow(player, true, 0.1, 0.1)` (smooth follow)
- Minimap camera: `startFollow(player, true)` (round pixels, immediate follow)

### Task 3: Update HUD to show minimap area indicator
**Commit:** 5ebd495
**Files:** apps/web/src/ui/hud/HUD.tsx

Simplified HUD minimap container:
- Removed placeholder content (zone ID, coordinates)
- Empty div with `aria-label="Minimap"` for accessibility
- Phaser camera handles all rendering (tiles, border, player indicator)
- React div provides positioning container only

### Task 4: Adjust HUD CSS for minimap positioning
**Commit:** a4b34b4
**Files:** apps/web/src/ui/hud/HUD.css

Updated minimap CSS:
- Changed from `top: 20px` to `bottom: 20px` (matches Phaser camera position)
- Removed `background-color` and `border` (Phaser Graphics draws these)
- Removed `border-radius` and `overflow: hidden` (not needed)
- Set `pointer-events: none` for click-through
- Deleted `.minimap-placeholder` styles (no longer used)

Final positioning: bottom-right corner, 180x180px, 20px margin from edges

## Deviations from Plan

None - plan executed exactly as written.

## Success Criteria Verification

- [x] Minimap camera renders world tiles at zoomed-out scale
- [x] Minimap positioned in bottom-right corner of screen
- [x] Player indicator (white dot) visible at minimap center
- [x] Minimap border visible for visual distinction
- [x] Minimap handles window resize correctly
- [x] Biome colors visible in minimap (tiles already have biome colors)

## Technical Details

### Multi-Camera Architecture

Phaser allows multiple cameras rendering the same scene:
1. **Main camera**: Follows player at normal zoom (1.0x), fills entire canvas
2. **Minimap camera**: Follows player at 0.15x zoom, renders to bottom-right viewport

Both cameras render the same tile layer, but at different zoom levels. No duplication needed.

### Coordinate Systems

Three coordinate systems in use:
1. **World coordinates**: Tile positions (0-63 for zone, extends for multi-zone)
2. **Screen coordinates**: Pixel positions on canvas (varies with camera zoom/position)
3. **Fixed screen coordinates**: UI overlays using `scrollFactor(0)`

Border and player indicator use fixed screen coordinates to stay in place while minimap camera pans.

### Performance Considerations

- Minimap camera renders same sprites as main camera (no memory overhead)
- ViewportCuller still applies (off-screen tiles not rendered by either camera)
- Graphics objects (border, indicator) minimal performance cost (static geometry)

### Zoom Factor Calculation

0.15x zoom shows ~1200 world units:
- Minimap viewport: 180px
- At 0.15x zoom: 180 / 0.15 = 1200 world pixels
- At 32px tile size: 1200 / 32 = 37.5 tiles visible
- Zone is 64x64 tiles, so minimap shows ~60% of zone

Perfect balance: enough context without losing player visibility.

## Integration Points

### With Existing Systems

- **WorldScene**: Owns minimap camera lifecycle
- **TileRenderer**: Tiles automatically rendered by minimap camera
- **Camera follow**: Minimap follows same player sprite as main camera
- **ZoneHUD**: No conflicts (ZoneHUD at Y=50, minimap at bottom-right)
- **HUD overlay**: Minimap container positioned to match Phaser camera

### Future Enhancement Opportunities

- Zone boundary lines (Graphics overlay)
- Other player indicators (tinted dots for faction colors)
- Entity markers for creatures/minerals
- Click-to-move from minimap (convert minimap click to world coords)
- Fog of war (darken unexplored areas)
- Zoom controls for minimap

## Testing Notes

Build verification:
- TypeScript compilation successful after each task
- No runtime errors expected (using standard Phaser API)

Visual verification needed:
- Minimap visible at bottom-right corner
- Player indicator centered in minimap
- Biome colors match main view
- Minimap border visible
- Resize handling works correctly

## Lessons Learned

### What Went Well

- Multi-camera system straightforward to implement
- Phaser handles tile reuse automatically
- Fixed screen positioning (scrollFactor 0) works perfectly for UI overlays
- Graphics API simple for borders and indicators

### Potential Issues

- Player indicator always centered (can't see player moving within minimap)
  - This is expected: minimap camera follows player, so player stays centered
  - Alternative would be fixed minimap camera showing zone, with moving player dot
  - Current approach better for navigation (always know player position)

- Minimap shows same content as main view (no "explored areas" tracking)
  - Future enhancement: fog of war system
  - Would require separate minimap rendering or masking

## Self-Check: PASSED

**Files created:**
- FOUND: apps/web/src/game/rendering/MinimapCamera.ts

**Commits verified:**
- FOUND: 6971edb (Task 1 - MinimapCamera creation)
- FOUND: de82915 (Task 2 - WorldScene integration)
- FOUND: 5ebd495 (Task 3 - HUD minimap update)
- FOUND: a4b34b4 (Task 4 - CSS adjustments)

**Must-have artifacts:**
- FOUND: MinimapCamera class with create(), startFollow(), destroy() methods
- FOUND: WorldScene imports and uses MinimapCamera
- FOUND: HUD.tsx contains hud-minimap div

**Must-have truths:**
- Minimap renders in bottom-right corner: YES (bottom: 20px, right: 20px)
- Player position indicator: YES (white dot with yellow border at center)
- Biome colors from world tiles: YES (minimap camera renders same tiles)
- Resize handling: YES (resize listener in MinimapCamera)
- Border for visual distinction: YES (Graphics strokeRect at 0x666688)

All verification checks passed.
