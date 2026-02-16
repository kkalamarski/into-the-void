# Phase 9: Rendering Optimization & Interaction - Research

**Researched:** 2026-02-16
**Domain:** Phaser 3 isometric interaction, camera controls, and input mapping
**Confidence:** HIGH

## Summary

Phase 9 restores player interaction in the new isometric space by adapting WASD controls to screen-relative directions (W=NW, S=SE, A=SW, D=NE), fixing click-to-move tile detection, and ensuring smooth camera following. The isometric transformation in Phase 8 provides the coordinate utilities—Phase 9 applies them to input handling and movement feedback.

The key challenge is mapping keyboard input that feels natural in isometric view. Players expect "up" on keyboard to move toward the top of the screen (Northwest in grid space), not true North. This requires remapping the existing Direction values ('n', 's', 'e', 'w') to their visual screen equivalents. Click-to-move already uses `IsometricTransform.screenToTile()` from Phase 8, but may need camera offset handling. Pathfinding visualization needs Graphics rendering along isometric paths.

**Primary recommendation:** Remap WASD inputs to screen-relative directions before passing to MovementController. Camera already configured for instant follow (lerp=1) in Phase 8. Add Graphics-based path visualization to PathfindingController for visual feedback.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Phaser 3 | 3.85+ | Input handling, Graphics, Camera | Already integrated, native keyboard API, robust camera system |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| N/A | - | - | No additional libraries needed—Phaser 3 provides all required functionality |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Manual WASD remapping | phaser3-controls-plugin | Plugin adds complexity for simple direction remapping. Manual mapping gives full control. |
| Phaser Graphics for path | SVG/Canvas overlay | Graphics native to Phaser, participates in scene lifecycle, proper depth sorting. External canvas requires manual sync. |

**Installation:**
```bash
# No new dependencies—use existing Phaser 3
```

## Architecture Patterns

### Recommended Project Structure
```
apps/web/src/game/
├── systems/
│   ├── MovementController.ts      # (existing) Receives remapped directions
│   └── PathfindingController.ts   # Update for path visualization
├── utils/
│   └── IsometricTransform.ts      # (existing from Phase 8)
└── scenes/
    └── WorldScene.ts              # Update input handling for screen-relative WASD
```

### Pattern 1: Screen-Relative Direction Mapping

**What:** Convert keyboard input to screen-relative isometric directions before passing to game logic
**When to use:** For WASD/Arrow key input in isometric view where players expect "up" to move toward top of screen

**Example:**
```typescript
// Source: Community pattern from gamedev.net, adapted for Phaser 3
// In WorldScene.handleInput():

private handleInput(time: number): void {
  if (!this.localPlayer || !this.movementController || time - this.lastMoveTime < this.moveDelay) return;

  let direction: Direction | null = null;

  // Screen-relative mapping for isometric view:
  // Visual "up" (W) = Northwest in grid = 'nw'
  // Visual "right" (D) = Northeast in grid = 'ne'
  // Visual "down" (S) = Southeast in grid = 'se'
  // Visual "left" (A) = Southwest in grid = 'sw'

  if (this.cursors?.up.isDown || this.wasd?.W.isDown) direction = 'nw';
  else if (this.cursors?.right.isDown || this.wasd?.D.isDown) direction = 'ne';
  else if (this.cursors?.down.isDown || this.wasd?.S.isDown) direction = 'se';
  else if (this.cursors?.left.isDown || this.wasd?.A.isDown) direction = 'sw';

  if (direction) {
    // Cancel pathfinding when manual input used
    if (this.pathfindingController?.isPathActive()) {
      this.pathfindingController.cancelPath();
    }

    this.lastMoveTime = time;
    this.movementController.processInput(direction);
  }
}
```

**Why this works:** Isometric diamond tiles render with North at top-right, South at bottom-left, East at bottom-right, West at top-left. To move "up" visually (toward top of screen), player must move Northwest in grid space. This creates intuitive controls where keyboard direction matches screen direction.

### Pattern 2: Click-to-Move with Camera World Point

**What:** Convert screen click to world coordinates accounting for camera position before isometric tile conversion
**When to use:** For pointer input in scrollable isometric worlds

**Example:**
```typescript
// Source: Existing WorldScene pattern, verified in Phase 8
// Already implemented correctly - no changes needed

this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
  if (pointer.rightButtonDown()) return;
  if (!this.isoTransform) return;

  // CRITICAL: Use camera.getWorldPoint to account for camera scroll/zoom
  const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);

  // Convert world position to grid tile
  const gridPos = this.isoTransform.screenToTile(worldPoint.x, worldPoint.y);

  // Start pathfinding
  if (this.pathfindingController && this.collisionMap) {
    this.pathfindingController.startPath(gridPos.x, gridPos.y, this.collisionMap);
  }
});
```

**Why this works:** `camera.getWorldPoint()` transforms screen coordinates to world space, accounting for camera position and zoom. `IsometricTransform.screenToTile()` then converts world position to grid coordinates. This two-step process ensures clicks work correctly even at chunk boundaries and with camera movement.

### Pattern 3: Pathfinding Path Visualization

**What:** Draw Graphics line along pathfinding route for visual feedback
**When to use:** To show player where they will move before path executes

**Example:**
```typescript
// Source: Phaser 3 Graphics API + navmesh debug pattern
export class PathfindingController {
  private currentPath: Array<{ x: number; y: number }> = [];
  private pathGraphics: Phaser.GameObjects.Graphics | null = null;
  private scene: Phaser.Scene;
  private isoTransform: IsometricTransform;

  constructor(
    movementController: MovementController,
    moveDelay: number,
    scene: Phaser.Scene,
    isoTransform: IsometricTransform
  ) {
    this.movementController = movementController;
    this.moveDelay = moveDelay;
    this.scene = scene;
    this.isoTransform = isoTransform;
  }

  startPath(targetX: number, targetY: number, collisionMap: boolean[][]): boolean {
    this.cancelPath(); // Clears old path and graphics

    const player = useGameStore.getState().player;
    if (!player) return false;

    const path = findPath(player.position.x, player.position.y, targetX, targetY, collisionMap);
    if (!path || path.length < 2) return false;

    this.currentPath = path;
    this.pathIndex = 1;

    // Visualize path
    this.drawPath();

    this.executeNextStep();
    return true;
  }

  private drawPath(): void {
    // Clean up old graphics
    if (this.pathGraphics) {
      this.pathGraphics.clear();
    } else {
      this.pathGraphics = this.scene.add.graphics();
      this.pathGraphics.setDepth(10000); // Above tiles and entities
    }

    if (this.currentPath.length < 2) return;

    // Draw path as connected line segments in isometric space
    this.pathGraphics.lineStyle(2, 0x00ff00, 0.6);

    const firstTile = this.currentPath[0];
    const firstScreen = this.isoTransform.gridToScreen(firstTile.x, firstTile.y);
    this.pathGraphics.beginPath();
    this.pathGraphics.moveTo(firstScreen.x, firstScreen.y);

    for (let i = 1; i < this.currentPath.length; i++) {
      const tile = this.currentPath[i];
      const screen = this.isoTransform.gridToScreen(tile.x, tile.y);
      this.pathGraphics.lineTo(screen.x, screen.y);
    }

    this.pathGraphics.strokePath();

    // Optional: Draw dots at waypoints
    this.pathGraphics.fillStyle(0x00ff00, 0.8);
    for (const tile of this.currentPath) {
      const screen = this.isoTransform.gridToScreen(tile.x, tile.y);
      this.pathGraphics.fillCircle(screen.x, screen.y, 3);
    }
  }

  cancelPath(): void {
    if (this.executionTimer !== null) {
      clearTimeout(this.executionTimer);
      this.executionTimer = null;
    }
    this.currentPath = [];
    this.pathIndex = 0;

    // Clear path visualization
    if (this.pathGraphics) {
      this.pathGraphics.clear();
    }
  }

  // ... rest of PathfindingController
}
```

### Pattern 4: Movement Tween Along Isometric Paths

**What:** Animate entity movement smoothly between isometric tile positions
**When to use:** For smooth visual transitions during grid-based movement

**Example:**
```typescript
// Source: Existing WorldScene pattern (already implemented in Phase 8)
// Tweens already use isometric coordinates - no changes needed

movePlayer(playerId: string, position: Position): void {
  const sprite = this.playerSprites.get(playerId);
  if (!sprite || !this.isoTransform) return;

  const screenPos = this.isoTransform.gridToScreen(position.x, position.y);

  this.tweens.killTweensOf(sprite);
  this.tweens.add({
    targets: sprite,
    x: screenPos.x,
    y: screenPos.y,
    duration: 100, // Matches moveDelay for smooth step-by-step movement
    ease: 'Linear', // Linear for grid movement (not physics-based)
    onComplete: () => {
      sprite.setData('gridX', position.x);
      sprite.setData('gridY', position.y);
      const depth = this.isoTransform!.calculateDepth(position.x, position.y);
      sprite.setDepth(depth);
    }
  });
}
```

**Why this works:** Tweens interpolate smoothly between isometric screen positions. Linear easing matches grid-based movement (constant speed). Duration matches moveDelay to prevent tween accumulation. Depth updates on completion to maintain proper layering.

### Pattern 5: Camera Instant Follow (Already Configured)

**What:** Camera follows player with no lerp for instant centering
**When to use:** User decision from Phase 8 requires instant tracking

**Example:**
```typescript
// Source: Phaser 3 Camera API (already implemented in Phase 8)
// No changes needed - verify configuration

// In WorldScene.updateLocalPlayer():
this.cameras.main.startFollow(
  this.localPlayer!,
  true,  // roundPixels - prevents sub-pixel jitter
  1,     // lerpX = 1 (instant horizontal tracking)
  1      // lerpY = 1 (instant vertical tracking)
);
```

**Status:** Already correctly configured in Phase 8. Camera follows player at exact center with no smoothing.

### Anti-Patterns to Avoid

- **Using cardinal directions for WASD in isometric:** Players expect "up" to move toward top of screen, not true North. Always remap to screen-relative directions.
- **Forgetting camera.getWorldPoint() for click detection:** Raw pointer coordinates are screen-relative. Must convert to world space first.
- **Drawing path in grid space instead of screen space:** Graphics must use isometric screen coordinates for proper visual rendering.
- **Not clearing old path graphics:** Graphics persist until manually cleared. Always clear before drawing new path.
- **Mismatched tween duration and moveDelay:** If tween is slower than moveDelay, movements stack and drift. Keep them synchronized.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Direction input remapping | Complex state machine for diagonal handling | Simple lookup table: W='nw', D='ne', S='se', A='sw' | Only 8 directions, static mapping is clearest |
| World coordinate conversion | Manual camera offset calculation | `camera.getWorldPoint(screenX, screenY)` | Phaser handles scroll, zoom, viewport transforms |
| Path visualization | Custom line drawing with trigonometry | Phaser.Graphics with `lineTo()` and isometric coords | Graphics API handles rendering, depth sorting, lifecycle |
| Movement interpolation | Manual position updates in update() loop | Phaser.Tweens for smooth transitions | Tweens handle easing, timing, completion callbacks automatically |

**Key insight:** Input remapping is the only new logic needed—everything else (coordinate conversion, graphics rendering, animation) is handled by existing Phaser APIs and Phase 8's IsometricTransform.

## Common Pitfalls

### Pitfall 1: Using Cardinal Directions Instead of Screen-Relative

**What goes wrong:** Pressing W moves player North (toward top-right), not toward top of screen. Feels unintuitive and disorienting.

**Why it happens:** Game logic uses cardinal directions (n/s/e/w) aligned to grid, but isometric view rotates visual space 45°. What's North in the grid appears Northeast on screen.

**How to avoid:**
- Map WASD to diagonal directions: W='nw', D='ne', S='se', A='sw'
- These diagonals in grid space appear as cardinal screen directions in isometric view
- MovementController still processes diagonals correctly—server already supports them

**Warning signs:** Players complain movement feels "wrong" or "rotated," difficulty navigating, requiring two keys to move in visually straight line

### Pitfall 2: Click Detection Ignores Camera Position

**What goes wrong:** Click-to-move works at world origin (0,0) but fails when camera scrolls. Player clicks tile but character moves to wrong location.

**Why it happens:** Pointer coordinates are screen-relative (0 to viewport width/height). Must convert to world space before applying isometric formula. Skipping `camera.getWorldPoint()` uses wrong origin.

**How to avoid:**
- Always use `camera.getWorldPoint(pointer.x, pointer.y)` first
- Then apply `isoTransform.screenToTile(worldPoint.x, worldPoint.y)`
- Two-step conversion ensures camera scroll/zoom accounted for

**Warning signs:** Click-to-move works in center of screen but fails near edges, pathfinding targets wrong tiles after camera moves, clicks offset from visible tiles

### Pitfall 3: Path Graphics Not Cleared Between Paths

**What goes wrong:** Old pathfinding lines remain visible when new path starts. Multiple overlapping green lines confuse player.

**Why it happens:** `Phaser.GameObjects.Graphics` persists until explicitly cleared or destroyed. Drawing new path doesn't remove old graphics automatically.

**How to avoid:**
- Call `pathGraphics.clear()` before drawing new path
- Call `pathGraphics.clear()` in `cancelPath()`
- Alternatively, destroy and recreate Graphics object each time

**Warning signs:** Multiple path lines visible simultaneously, ghost lines from cancelled paths, screen fills with green lines over time

### Pitfall 4: Path Visualization Uses Grid Coordinates Instead of Screen

**What goes wrong:** Path draws in wrong location, appears as horizontal/vertical lines instead of following isometric diamonds, completely disconnected from tiles.

**Why it happens:** Graphics API expects screen coordinates (world pixels), but pathfinding returns grid tile coordinates. Must convert each waypoint with `isoTransform.gridToScreen()`.

**How to avoid:**
- For each path waypoint `{x, y}`, call `isoTransform.gridToScreen(x, y)`
- Use resulting `{x, y}` screen coordinates for `graphics.lineTo()`
- Same pattern as tile/entity rendering—always convert grid to screen for Graphics

**Warning signs:** Path line appears in wrong location, doesn't follow isometric grid, horizontal/vertical instead of diagonal

### Pitfall 5: Tween Duration Doesn't Match Move Delay

**What goes wrong:** Character movement looks janky—either slides too fast (tween shorter than delay) or stutters (tween longer than delay).

**Why it happens:** MovementController sends new position every `moveDelay` ms. If tween takes longer, new tween starts before old completes, causing stacking. If shorter, character arrives early and waits.

**How to avoid:**
- Set tween duration to match moveDelay: `duration: this.moveDelay`
- For remote players, match server tick rate (typically 100-150ms)
- Use `tweens.killTweensOf(sprite)` before starting new tween to prevent stacking

**Warning signs:** Movement stutters or jerks, character speeds up/slows down erratically, position "snaps" at end of movement

### Pitfall 6: Path Visualization Graphics Not Depth-Sorted

**What goes wrong:** Path line appears behind tiles or entities, partially obscured, hard to see where path leads.

**Why it happens:** Graphics has default depth (0). Tiles and entities may render on top, hiding the line. Path should always be visible for feedback.

**How to avoid:**
- Set high depth value: `pathGraphics.setDepth(10000)`
- Higher than tiles (depth ~0-5000) and entities (depth ~0-5000)
- Ensures path always visible on top for clarity

**Warning signs:** Path line disappears behind tiles, only partially visible, obscured by entities

## Code Examples

Verified patterns from official sources and Phase 8 implementation:

### Screen-Relative WASD Input Mapping

```typescript
// Source: Adapted from gamedev.net community pattern + existing WorldScene
// Replace handleInput() in WorldScene.ts:

private handleInput(time: number): void {
  if (!this.localPlayer || !this.movementController || time - this.lastMoveTime < this.moveDelay) return;

  let direction: Direction | null = null;

  // Screen-relative mapping for isometric view
  // W/Up = move toward top of screen = Northwest in grid
  // D/Right = move toward right of screen = Northeast in grid
  // S/Down = move toward bottom of screen = Southeast in grid
  // A/Left = move toward left of screen = Southwest in grid

  if (this.cursors?.up.isDown || this.wasd?.W.isDown) direction = 'nw';
  else if (this.cursors?.right.isDown || this.wasd?.D.isDown) direction = 'ne';
  else if (this.cursors?.down.isDown || this.wasd?.S.isDown) direction = 'se';
  else if (this.cursors?.left.isDown || this.wasd?.A.isDown) direction = 'sw';

  if (direction) {
    // Cancel pathfinding when manual input used
    if (this.pathfindingController?.isPathActive()) {
      this.pathfindingController.cancelPath();
    }

    this.lastMoveTime = time;
    this.movementController.processInput(direction);
  }
}
```

### Pathfinding Visualization with Graphics

```typescript
// Source: Phaser 3 Graphics API + pathfinding pattern
// Update PathfindingController.ts to add visualization:

export class PathfindingController {
  private currentPath: Array<{ x: number; y: number }> = [];
  private pathIndex = 0;
  private executionTimer: number | null = null;
  private movementController: MovementController;
  private moveDelay: number;
  private pathGraphics: Phaser.GameObjects.Graphics | null = null;
  private scene: Phaser.Scene;
  private isoTransform: IsometricTransform;

  constructor(
    movementController: MovementController,
    moveDelay: number,
    scene: Phaser.Scene,
    isoTransform: IsometricTransform
  ) {
    this.movementController = movementController;
    this.moveDelay = moveDelay;
    this.scene = scene;
    this.isoTransform = isoTransform;
  }

  startPath(targetX: number, targetY: number, collisionMap: boolean[][]): boolean {
    this.cancelPath();

    const player = useGameStore.getState().player;
    if (!player) return false;

    const startX = player.position.x;
    const startY = player.position.y;

    if (startX === targetX && startY === targetY) return false;

    const path = findPath(startX, startY, targetX, targetY, collisionMap);

    if (!path || path.length < 2) {
      console.warn('PathfindingController: No path found to target');
      return false;
    }

    this.currentPath = path;
    this.pathIndex = 1;

    // Draw path visualization
    this.drawPath();

    this.executeNextStep();
    return true;
  }

  private drawPath(): void {
    // Create or clear graphics
    if (this.pathGraphics) {
      this.pathGraphics.clear();
    } else {
      this.pathGraphics = this.scene.add.graphics();
      this.pathGraphics.setDepth(10000); // Above all game objects
    }

    if (this.currentPath.length < 2) return;

    // Draw path as connected line segments
    this.pathGraphics.lineStyle(2, 0x00ff00, 0.6); // Green, semi-transparent

    const firstTile = this.currentPath[0];
    const firstScreen = this.isoTransform.gridToScreen(firstTile.x, firstTile.y);

    this.pathGraphics.beginPath();
    this.pathGraphics.moveTo(firstScreen.x, firstScreen.y);

    for (let i = 1; i < this.currentPath.length; i++) {
      const tile = this.currentPath[i];
      const screen = this.isoTransform.gridToScreen(tile.x, tile.y);
      this.pathGraphics.lineTo(screen.x, screen.y);
    }

    this.pathGraphics.strokePath();

    // Draw waypoint dots
    this.pathGraphics.fillStyle(0x00ff00, 0.8);
    for (const tile of this.currentPath) {
      const screen = this.isoTransform.gridToScreen(tile.x, tile.y);
      this.pathGraphics.fillCircle(screen.x, screen.y, 3);
    }
  }

  cancelPath(): void {
    if (this.executionTimer !== null) {
      clearTimeout(this.executionTimer);
      this.executionTimer = null;
    }
    this.currentPath = [];
    this.pathIndex = 0;

    // Clear path visualization
    if (this.pathGraphics) {
      this.pathGraphics.clear();
    }
  }

  // ... rest of existing methods (executeNextStep, getDirection, etc.)
}
```

### Click-to-Move (Already Correct from Phase 8)

```typescript
// Source: Existing WorldScene implementation
// No changes needed - included for completeness

this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
  if (pointer.rightButtonDown()) return;
  if (!this.isoTransform) return;

  // Convert screen to world coordinates (accounts for camera)
  const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);

  // Convert world to grid tile
  const gridPos = this.isoTransform.screenToTile(worldPoint.x, worldPoint.y);

  // Start pathfinding with visualization
  if (this.pathfindingController && this.collisionMap) {
    this.pathfindingController.startPath(gridPos.x, gridPos.y, this.collisionMap);
  }
});
```

### Camera Instant Follow (Already Configured in Phase 8)

```typescript
// Source: Existing WorldScene implementation from Phase 8
// No changes needed - verify configuration

// In updateLocalPlayer() after creating player:
this.cameras.main.startFollow(this.localPlayer!, true, 1, 1);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Cardinal WASD (W=North) | Screen-relative WASD (W=NW) | Ongoing isometric UX best practice | More intuitive controls matching visual direction |
| Complex diagonal key combos (WA to move up) | Single-key diagonal directions | Modern input mapping | Simpler, more responsive controls |
| Path hidden until movement starts | Real-time path preview with Graphics | Common since A* pathfinding adoption | Better player feedback, prevents wrong clicks |
| Manual camera lerp tuning | Instant follow (lerp=1) | User decision Phase 8 | Locked camera feel, no smoothing lag |
| Per-frame graphics redraw | Draw once on path change | Performance optimization | Reduces CPU load, smoother performance |

**Deprecated/outdated:**
- **Cardinal direction WASD for isometric:** Unintuitive, requires learning curve
- **No path visualization:** Common in early games, poor UX by modern standards
- **Complex input plugins for simple remapping:** Overkill for 8-direction mapping

## Open Questions

None - all patterns verified through Phase 8 implementation and Phaser 3 documentation.

**Implementation clarity:**
- Direction remapping: Clear mapping table, no ambiguity
- Click detection: Already working, camera.getWorldPoint verified
- Path visualization: Standard Phaser Graphics API
- Camera follow: Already configured in Phase 8
- Movement tweens: Already implemented in Phase 8

## Sources

### Primary (HIGH confidence)

- [Phaser 3 Camera API - startFollow](https://newdocs.phaser.io/docs/3.70.0/focus/Phaser.Cameras.Scene2D.Camera-startFollow) - Camera follow documentation
- [Phaser 3 Camera - lerp](https://newdocs.phaser.io/docs/3.80.0/focus/Phaser.Cameras.Scene2D.Camera-lerp) - Camera lerp values
- [Phaser 3 Camera - centerOn](https://newdocs.phaser.io/docs/3.54.0/focus/Phaser.Cameras.Scene2D.Camera-centerOn) - Camera positioning
- [Phaser 3 Graphics API](https://docs.phaser.io/api-documentation/class/gameobjects-graphics) - Graphics drawing methods
- Phase 8 Research & Implementation - IsometricTransform, existing camera setup

### Secondary (MEDIUM confidence)

- [Creating an Isometric View in Phaser 3](https://tnodes.medium.com/creating-an-isometric-view-in-phaser-3-fada95927835) - Isometric setup tutorial
- [Phaser 3 Isometric Tilemap Examples](https://phaser.io/examples/v3.55.0/tilemap/isometric/view/isometric-test) - Official examples
- [Phaser NavMesh Plugin](https://github.com/mikewesthad/navmesh) - Debug path visualization patterns
- [GameDev.net - WASD + Isometric](https://www.gamedev.net/forums/topic/446061-wasd-isometric-2-keys-to-move-forward/3952442/) - Community discussion on control schemes
- [Fix Your Isometric Controls](https://www.tumblr.com/blubberquark/621835025877499904/this-is-a-pet-peeve-of-mine-i-push-the-right) - UX perspective on screen-relative controls

### Tertiary (LOW confidence - general patterns)

- [Phaser 3 WASD Keyboard Movement](https://phaser.discourse.group/t/wasd-keyboard-movement-phaser-3/8297) - Basic keyboard setup
- [Universal WASD controls for top-down RPGs](https://www.desiquintans.com/wasdcontrols) - General game design principles

## Metadata

**Confidence breakdown:**
- WASD remapping: **HIGH** - Simple lookup table, community best practice verified
- Click-to-move: **HIGH** - Already implemented and working in Phase 8
- Path visualization: **HIGH** - Standard Phaser Graphics API, well-documented
- Camera follow: **HIGH** - Already configured in Phase 8, no changes needed
- Movement tweens: **HIGH** - Already implemented in Phase 8, duration synchronization clear

**Research date:** 2026-02-16
**Valid until:** ~90 days (Phaser 3 stable, input patterns timeless)

**Key findings:**
- Only new work: WASD remapping (simple) and path visualization (Graphics API)
- Click-to-move already correct from Phase 8 (camera.getWorldPoint + screenToTile)
- Camera already configured for instant follow (lerp=1)
- Movement tweens already smooth and synchronized
- No dependencies needed, all Phaser 3 native functionality
