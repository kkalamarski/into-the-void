# Phase 12: Polish - Research

**Researched:** 2026-02-16
**Domain:** Phaser 3 interactive features and visual feedback for isometric games
**Confidence:** HIGH

## Summary

Phase 12 adds visual polish through hover interactions and click feedback in the existing isometric game. The codebase already uses Phaser 3.80, polygon-based tile rendering, and established patterns for tweens and tinting. Research focused on Phaser's interactive system (`setInteractive`), performance considerations for thousands of objects, and visual feedback patterns appropriate for isometric games.

**Key findings:**
- Phaser's `setInteractive()` with `pointerover`/`pointerout` events provides hover detection
- Graphics objects require polygon hitAreas for accurate isometric tile interaction
- Tint/alpha animations via tweens are established patterns for visual feedback
- Performance concerns exist for making thousands of tiles interactive simultaneously
- Codebase already has tween patterns (movement reconciliation) and Graphics rendering (tiles, path visualization)

**Primary recommendation:** Use event-driven hover system with selective interactivity—track mouse position globally, compute hovered tile/entity via `IsometricTransform.screenToTile()`, and draw highlight overlays using dedicated Graphics objects. Avoid making every tile individually interactive.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Phaser | 3.80 | Game framework with input, rendering, tweens | Already in use, provides all needed interactive features |
| IsometricTransform | Internal | Screen↔grid coordinate conversion | Already implemented, critical for hover detection in isometric space |

### Supporting
| Component | Purpose | When to Use |
|-----------|---------|-------------|
| Phaser.GameObjects.Graphics | Dynamic shapes, overlays, highlights | Tile highlights, click markers (already used for path visualization) |
| Phaser Tweens | Alpha/tint animations | Smooth fade-in/out for visual feedback (already used for player movement) |
| Phaser Input Events | Mouse position, pointer events | Global pointer tracking for hover detection |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Global pointer tracking | `setInteractive()` on every tile | Individual interactivity: simple but causes memory/performance issues with 10,000+ tiles |
| Graphics overlays | Sprite pool for highlights | Sprites: slightly faster but less flexible for dynamic shapes |
| Tween alpha | CSS animations | CSS: N/A in Phaser canvas context |

**Installation:**
No new dependencies—all features exist in current Phaser 3.80.

## Architecture Patterns

### Recommended Project Structure
```
apps/web/src/game/
├── systems/
│   └── HoverController.ts       # NEW: Global hover detection & highlight management
├── rendering/
│   ├── TileRenderer.ts          # EXISTS: May need tile metadata access
│   └── EntityRenderer.ts        # EXISTS: May need hover highlight support
└── scenes/
    └── WorldScene.ts            # EXISTS: Wire up HoverController
```

### Pattern 1: Global Hover Detection (Not Per-Tile Interactive)
**What:** Track mouse position in scene update loop, convert to grid coordinates, determine hovered tile/entity

**When to use:** When you have thousands of tiles and need hover feedback without performance cost

**Why not per-tile interactive:** Making 10,000+ Graphics objects interactive via `setInteractive()` causes memory bloat and event overhead

**Example:**
```typescript
// Source: Derived from existing WorldScene patterns + Phaser input system
class HoverController {
  private scene: Phaser.Scene;
  private isoTransform: IsometricTransform;
  private highlightGraphics: Phaser.GameObjects.Graphics;
  private lastHoveredTile: { x: number; y: number } | null = null;

  update(): void {
    const pointer = this.scene.input.activePointer;
    if (!pointer) return;

    // Convert screen to world coordinates
    const worldPoint = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y);

    // Convert to grid tile
    const gridPos = this.isoTransform.screenToTile(worldPoint.x, worldPoint.y);

    // Check if tile changed
    if (!this.lastHoveredTile ||
        this.lastHoveredTile.x !== gridPos.x ||
        this.lastHoveredTile.y !== gridPos.y) {
      this.lastHoveredTile = gridPos;
      this.drawTileHighlight(gridPos.x, gridPos.y);
    }
  }

  private drawTileHighlight(gridX: number, gridY: number): void {
    this.highlightGraphics.clear();
    const screenPos = this.isoTransform.gridToScreen(gridX, gridY);

    // Draw isometric diamond outline (same pattern as PathfindingController)
    const hw = 64; // Half tile width
    const hh = 32; // Half tile height

    this.highlightGraphics.lineStyle(2, 0xffffff, 0.6);
    this.highlightGraphics.fillStyle(0xffffff, 0.1);
    this.highlightGraphics.beginPath();
    this.highlightGraphics.moveTo(screenPos.x, screenPos.y - hh);
    this.highlightGraphics.lineTo(screenPos.x + hw, screenPos.y);
    this.highlightGraphics.lineTo(screenPos.x, screenPos.y + hh);
    this.highlightGraphics.lineTo(screenPos.x - hw, screenPos.y);
    this.highlightGraphics.closePath();
    this.highlightGraphics.fillPath();
    this.highlightGraphics.strokePath();
  }
}
```

### Pattern 2: Click Target Visual Feedback
**What:** Show temporary marker at click location before pathfinding starts

**When to use:** For click-to-move feedback (PLSH-02 requirement)

**How:** Draw Graphics marker on `pointerup`, fade out with tween

**Example:**
```typescript
// Source: Derived from existing PathfindingController patterns + Phaser tween system
onPointerUp(pointer: Phaser.Input.Pointer): void {
  const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
  const gridPos = this.isoTransform.screenToTile(worldPoint.x, worldPoint.y);

  // Show click marker
  this.showClickMarker(gridPos.x, gridPos.y);

  // Then start pathfinding (existing logic)
  if (this.pathfindingController && this.collisionMap) {
    this.pathfindingController.startPath(gridPos.x, gridPos.y, this.collisionMap);
  }
}

private showClickMarker(gridX: number, gridY: number): void {
  const screenPos = this.isoTransform.gridToScreen(gridX, gridY);

  // Create temporary marker (circle or pulse effect)
  const marker = this.add.graphics();
  marker.setDepth(10001); // Above path graphics (10000)
  marker.fillStyle(0x00ff00, 0.8);
  marker.fillCircle(screenPos.x, screenPos.y, 8);

  // Fade out with tween
  this.tweens.add({
    targets: marker,
    alpha: 0,
    scale: 2,
    duration: 300,
    ease: 'Cubic.easeOut',
    onComplete: () => marker.destroy()
  });
}
```

### Pattern 3: Entity Hover Highlight
**What:** Add highlight to entity container on hover via global detection

**When to use:** For entity selection feedback (PLSH-03 requirement)

**How:** Check if hovered grid position matches entity position, add tint or overlay

**Example:**
```typescript
// Source: Derived from existing EntityRenderer patterns + input system
class HoverController {
  private hoveredEntityId: string | null = null;

  update(): void {
    const pointer = this.scene.input.activePointer;
    const worldPoint = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const gridPos = this.isoTransform.screenToTile(worldPoint.x, worldPoint.y);

    // Check entities at this position
    const entityAtPos = this.findEntityAtPosition(gridPos.x, gridPos.y);

    if (entityAtPos !== this.hoveredEntityId) {
      this.clearEntityHighlight();
      if (entityAtPos) {
        this.highlightEntity(entityAtPos);
      }
      this.hoveredEntityId = entityAtPos;
    }
  }

  private highlightEntity(entityId: string): void {
    const container = this.entitySprites.get(entityId);
    if (!container) return;

    // Add overlay Graphics to container (above sprite but below health bar)
    const sprite = container.getAt(1) as Phaser.GameObjects.Sprite; // Index 1 is sprite
    const overlay = this.scene.add.graphics();
    overlay.fillStyle(0xffffff, 0.2);
    overlay.fillCircle(0, -12, 24); // Centered on elevated sprite
    container.addAt(overlay, 2); // Insert after sprite
    container.setData('hoverOverlay', overlay);
  }

  private clearEntityHighlight(): void {
    if (!this.hoveredEntityId) return;
    const container = this.entitySprites.get(this.hoveredEntityId);
    if (!container) return;

    const overlay = container.getData('hoverOverlay');
    if (overlay) {
      overlay.destroy();
      container.setData('hoverOverlay', null);
    }
  }
}
```

### Anti-Patterns to Avoid
- **Making every tile individually interactive:** Causes memory bloat with 10,000+ tiles. Use global pointer tracking instead.
- **Setting interactivity without cleanup:** Event listeners and hitAreas consume memory. Always destroy or clear on scene shutdown.
- **Pixel-perfect hit detection on Graphics:** Computationally expensive. Use polygon hitAreas for shapes or global coordinate math.
- **Tweening thousands of objects simultaneously:** Creates performance bottleneck. Tween overlays/highlights, not base tiles.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Hover detection in isometric space | Custom ray-casting or tile iteration | `IsometricTransform.screenToTile()` + pointer tracking | Already implemented, handles coordinate conversion correctly |
| Visual feedback animations | Custom interpolation loops | Phaser Tweens | Built-in, optimized, supports ease functions and cleanup |
| Click markers / temporary effects | Custom timer-based fading | Phaser Tweens with `onComplete` destroy | Handles timing, easing, and cleanup automatically |
| Diamond-shaped hit areas | Bounding box approximation | `Phaser.Geom.Polygon` with diamond vertices | Accurate for isometric tiles, already used in rendering |
| Global pointer state | Custom mouse tracking | `scene.input.activePointer` | Phaser tracks this automatically, handles camera transform |

**Key insight:** Phaser's input system is designed for both object-level and scene-level interaction. For high object counts, scene-level pointer tracking with manual hit detection is more performant than per-object `setInteractive()`.

## Common Pitfalls

### Pitfall 1: Making Every Tile Interactive Individually
**What goes wrong:** Calling `setInteractive()` on 10,000+ Graphics tiles causes memory bloat and event listener overhead

**Why it happens:** Natural assumption that hover detection requires per-object interactivity

**How to avoid:** Use global pointer tracking in scene update loop. Convert pointer coordinates to grid position, then draw highlights on a separate Graphics layer

**Warning signs:** Memory usage climbs steadily, input lag on hover, frame rate drops when moving mouse

**Source:** [Phaser discourse on performance with many objects](https://phaser.discourse.group/t/performance-of-really-big-tile-maps/1192) + project context (10,000+ tiles across chunks)

### Pitfall 2: Not Cleaning Up Tweens and Graphics
**What goes wrong:** Tweens continue running after objects destroyed, Graphics accumulate in memory without cleanup

**Why it happens:** Forgetting that Phaser doesn't auto-cleanup by default unless `persist: false` set

**How to avoid:**
- Call `scene.tweens.killTweensOf(target)` before destroying objects
- Use `marker.destroy()` in tween `onComplete` callbacks
- Clear Graphics with `graphics.clear()` or destroy with `graphics.destroy()`

**Warning signs:** Memory grows over time, orphaned tweens appear in profiler, Graphics layer consumes increasing VRAM

**Source:** [Phaser tween cleanup best practices](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/tween/) + [memory leak discussions](https://phaser.discourse.group/t/memory-leak-in-my-game/5839)

### Pitfall 3: Z-Index Conflicts with Depth Sorting
**What goes wrong:** Highlight overlays appear behind entities due to incorrect depth values

**Why it happens:** Project uses isometric depth sorting (Y-based with X tiebreaker). Highlights need higher depth than all game objects

**How to avoid:**
- Set highlight Graphics to depth `10000+` (above path visualization at `10000`)
- Or use fixed depth relative to entity: `container.depth + 0.1`
- Document depth ranges in code comments

**Warning signs:** Highlights disappear behind entities, visual feedback not visible when needed

**Source:** Project code analysis (DepthSorter uses Y-based formula, PathfindingController uses depth 10000)

### Pitfall 4: Hover Detection on Camera Boundaries
**What goes wrong:** Hover highlights appear at wrong positions near screen edges or during camera movement

**Why it happens:** Forgetting to convert screen coordinates to world coordinates via `camera.getWorldPoint()`

**How to avoid:** Always use `this.cameras.main.getWorldPoint(pointer.x, pointer.y)` before passing to `screenToTile()`

**Warning signs:** Highlights offset from cursor, wrong tiles highlighted when camera moves

**Source:** [Phaser input system documentation](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/touchevents/) + existing WorldScene click-to-move implementation (line 156)

### Pitfall 5: Hover Updates Without Throttling
**What goes wrong:** Running hover detection every frame (60 FPS) causes unnecessary redraws and CPU usage

**Why it happens:** Scene `update()` runs every frame, tempting to check hover every time

**How to avoid:** Only redraw highlights when hovered tile/entity changes. Store `lastHoveredTile` and compare before redrawing

**Warning signs:** High CPU usage on mouse movement, profiler shows Graphics operations dominating frame time

**Source:** Pattern from existing throttling in ViewportCuller (100ms throttle) and DepthSorter (100ms throttle)

## Code Examples

Verified patterns from existing codebase and official sources:

### Isometric Diamond Rendering (for tile highlights)
```typescript
// Source: Existing PathfindingController.ts lines 75-98
// Already used for pathfinding destination marker
private drawIsometricDiamond(graphics: Phaser.GameObjects.Graphics, x: number, y: number, color: number, alpha: number): void {
  const hw = 64; // Half tile width (128/2)
  const hh = 32; // Half tile height (64/2)

  graphics.lineStyle(2, color, alpha);
  graphics.beginPath();
  graphics.moveTo(x, y - hh); // Top
  graphics.lineTo(x + hw, y); // Right
  graphics.lineTo(x, y + hh); // Bottom
  graphics.lineTo(x - hw, y); // Left
  graphics.closePath();
  graphics.strokePath();

  // Optional fill
  graphics.fillStyle(color, alpha * 0.3);
  graphics.fillPoints([
    { x: x, y: y - hh },
    { x: x + hw, y: y },
    { x: x, y: y + hh },
    { x: x - hw, y: y },
  ], true);
}
```

### Tween-Based Fade Out (for click markers)
```typescript
// Source: Existing WorldScene.ts movement tweens (lines 543-556) + Phaser tween docs
// Pattern: Create temporary object, tween properties, destroy on complete
const marker = this.add.graphics();
marker.fillStyle(0x00ff00, 0.8);
marker.fillCircle(screenX, screenY, 8);
marker.setDepth(10001);

this.tweens.add({
  targets: marker,
  alpha: 0,
  scale: 2,
  duration: 300,
  ease: 'Cubic.easeOut',
  persist: false, // Auto-cleanup
  onComplete: () => marker.destroy()
});
```

### Global Pointer to Grid Position
```typescript
// Source: Existing WorldScene.ts click-to-move (lines 149-159)
// Already implemented pattern for click handling
const pointer = this.input.activePointer;
if (!pointer) return;

// Convert screen to world coordinates (handles camera offset/zoom)
const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);

// Convert to tile coordinates
const gridPos = this.isoTransform.screenToTile(worldPoint.x, worldPoint.y);

// gridPos.x and gridPos.y are now tile coordinates
```

### Entity Position Lookup
```typescript
// Source: Derived from existing EntityRenderer.ts and WorldScene entity management
// Entities stored in Map with grid position in container data
private findEntityAtPosition(gridX: number, gridY: number): string | null {
  for (const [id, container] of this.entitySprites.entries()) {
    const entityGridX = container.getData('gridX') as number;
    const entityGridY = container.getData('gridY') as number;

    if (entityGridX === gridX && entityGridY === gridY) {
      return id;
    }
  }
  return null;
}
```

### Highlight Graphics Lifecycle
```typescript
// Source: Pattern from existing DepthSorter cleanup and PathfindingController graphics management
// Create once, reuse, clear on changes
class HoverController {
  private highlightGraphics: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene) {
    this.highlightGraphics = scene.add.graphics();
    this.highlightGraphics.setDepth(10000); // Above game objects, at path level
  }

  updateHighlight(screenX: number, screenY: number): void {
    this.highlightGraphics.clear(); // Clear previous highlight
    // Draw new highlight...
  }

  destroy(): void {
    this.highlightGraphics.destroy();
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Per-object `setInteractive()` for hover | Global pointer tracking + coordinate math | Phaser 3.x era | Better performance with thousands of objects |
| Individual tile sprites | Polygon Graphics (TileRenderer pattern) | Project Phase 08 | Enables flexible shape-based interaction |
| Immediate visual updates | Throttled updates (100ms intervals) | Project Phases 10-11 | Maintains 60 FPS with large entity counts |
| Fixed depth values | Isometric depth formula (Y + X*0.0001) | Project Phase 08 | Correct visual layering in isometric view |

**Deprecated/outdated:**
- `setInteractive(shape, Phaser.Geom.Polygon.Contains)` on every tile: Still works but doesn't scale to 10,000+ objects
- `pointerover`/`pointerout` per tile: Event overhead too high for large tilemaps
- Separate highlight sprites: Graphics more flexible for dynamic shapes (project already uses Graphics for tiles and paths)

**Current best practice (2026):**
- Scene-level pointer tracking for hover detection
- Coordinate-based hit detection using IsometricTransform
- Single Graphics object for highlights (reused, cleared, redrawn)
- Tweens for temporary effects with `persist: false` and `onComplete` cleanup

## Open Questions

1. **Tile highlight visibility through entities**
   - What we know: Depth sorting places entities above tiles (higher Y values)
   - What's unclear: Should tile highlight appear above or below entities? Requirements don't specify
   - Recommendation: Place at depth 10000 (same as path visualization), so highlights appear below entities but above tiles. This prevents visual clutter when hovering near creatures

2. **Hover feedback during pathfinding**
   - What we know: PathfindingController already draws destination marker (green diamond)
   - What's unclear: Should tile hover highlight persist during active pathfinding, or disable?
   - Recommendation: Disable tile highlight while path is active to avoid two competing visual indicators. Check `pathfindingController.isPathActive()` before drawing hover

3. **Entity highlight vs health bar z-order**
   - What we know: Creatures have health bars at Y=-20 in container (EntityRenderer.ts line 51)
   - What's unclear: Should hover overlay appear above or below health bar?
   - Recommendation: Below health bar (add at index 2 in container, after sprite but before health bar), so health remains readable

## Sources

### Primary (HIGH confidence)
- Phaser 3.80.0 (project package.json) - Version used in codebase
- Existing codebase patterns:
  - `WorldScene.ts` - Click-to-move, camera transform, tween usage
  - `PathfindingController.ts` - Graphics for visual feedback, isometric diamond rendering
  - `TileRenderer.ts` - Polygon-based tile rendering with IsometricTransform
  - `EntityRenderer.ts` - Container-based entity structure, health bars
  - `DepthSorter.ts` - Throttled update pattern, depth calculation
  - `IsometricTransform.ts` - Screen↔grid conversion, depth formula

### Secondary (MEDIUM confidence)
- [Rex's Phaser 3 Notes - Touch Events](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/touchevents/) - setInteractive configuration, pointer events, best practices (WebFetch verified)
- [Rex's Phaser 3 Notes - Tweens](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/tween/) - Tween configuration, ease functions, lifecycle management (WebFetch verified)
- [Phaser Examples - Tint Tween](https://phaser.io/examples/v3.55.0/tweens/view/tint-tween) - Tint animation patterns (WebSearch)
- [Phaser Discourse - Performance of really big tile maps](https://phaser.discourse.group/t/performance-of-really-big-tile-maps/1192) - Memory and performance considerations (WebSearch)

### Tertiary (LOW confidence - general best practices)
- [Game UI Database](https://www.gameuidatabase.com/) - Visual feedback examples (WebSearch)
- [5 ways to quickly improve your video game's UI | GDevelop](https://gdevelop.io/blog/5-ways-improve-game-UI) - UI feedback principles (WebSearch)
- [Game UI: design principles, best practices, and examples](https://www.justinmind.com/ui-design/game) - Click indicator patterns (WebSearch)
- [Pikuma: Isometric Projection in Games](https://pikuma.com/blog/isometric-projection-in-games) - Isometric coordinate systems (WebSearch)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Phaser 3.80 already in use, all features present, patterns verified in codebase
- Architecture: HIGH - Based on existing codebase patterns (IsometricTransform, Graphics, tweens all proven)
- Pitfalls: HIGH - Derived from project-specific constraints (10,000+ tiles, depth sorting, chunk system)
- Visual patterns: MEDIUM - Based on general game UI principles and Phaser examples, not isometric-specific

**Research date:** 2026-02-16
**Valid until:** ~30 days (Phaser 3.x stable, no breaking changes expected)

**Key research gaps:** No Context7 access prevented verification of latest Phaser 3.80 API specifics. Relied on community documentation (Rex's Notes) and WebSearch, which provided consistent information across sources. Project-specific patterns from codebase provide high confidence for implementation approach.
