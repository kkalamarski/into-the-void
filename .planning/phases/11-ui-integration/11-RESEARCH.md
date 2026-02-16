# Phase 11: UI Integration - Research

**Researched:** 2026-02-16
**Domain:** Phaser 3 UI elements in isometric games
**Confidence:** HIGH

## Summary

Phase 11 adapts existing HUD elements to work correctly with the new isometric view implemented in Phase 8. The primary challenge is handling two coordinate systems: world-space positioning for floating UI (health bars, behavior icons) and screen-space positioning for fixed UI (minimap, zone HUD).

The current implementation already has the correct patterns in place: containers with child offsets for health bars/icons, `setScrollFactor(0)` for screen-fixed UI, and `camera.ignore()` for selective rendering. The main issue is a **coordinate system mismatch in MinimapCamera.ts** - it uses the old 96px tile size instead of the current 128x64 isometric dimensions, causing incorrect minimap bounds and player positioning.

**Primary recommendation:** Fix MinimapCamera coordinate mismatch, verify health bar/behavior icon Y-offsets account for isometric elevation, test all UI elements visually.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Phaser 3 | 3.85.0 | Game framework | Built-in camera system, graphics API, container hierarchy |
| TypeScript | Latest | Type safety | Type-safe game object references, coordinate interfaces |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Phaser.GameObjects.Graphics | Built-in | Health bars, borders | Simple colored shapes (bars, rectangles, circles) |
| Phaser.GameObjects.Text | Built-in | Behavior icons, HUD labels | Small text overlays with backgrounds |
| Phaser.GameObjects.Container | Built-in | Grouping sprites + UI | When UI elements must follow game objects |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Container + child offsets | Manually position each frame | Containers add overhead but simplify hierarchical positioning |
| Graphics API | Sprite textures | Graphics better for dynamic (health bars), sprites better for static icons |
| Multiple cameras | Single camera with layers | Multiple cameras cleaner for minimap, but adds rendering overhead |

**Installation:**
No new dependencies - all functionality uses existing Phaser 3 built-ins.

## Architecture Patterns

### Recommended Project Structure
```
apps/web/src/game/
├── ui/                  # Screen-fixed HUD elements (scrollFactor=0)
│   └── ZoneHUD.ts       # Zone name + tier display
├── rendering/           # World-space and camera components
│   ├── MinimapCamera.ts # Minimap camera + player indicator
│   └── EntityRenderer.ts # Health bars + behavior icons (container children)
└── scenes/
    └── WorldScene.ts    # Wires UI to cameras via ignore()
```

### Pattern 1: Screen-Fixed HUD (ZoneHUD)
**What:** UI elements that don't scroll with camera
**When to use:** Zone name, minimap border, any screen-anchored UI
**Example:**
```typescript
// Source: apps/web/src/game/ui/ZoneHUD.ts (lines 17-25)
this.zoneNameText = scene.add.text(16, 50, '', {
  fontSize: '18px',
  color: '#e0e0e0',
  fontFamily: 'monospace',
  stroke: '#000000',
  strokeThickness: 3,
});
this.zoneNameText.setScrollFactor(0); // Fixed to camera
this.zoneNameText.setDepth(1000); // Above world
```

**Key principle:** `setScrollFactor(0)` makes object ignore camera movement. High depth (1000+) renders above world objects.

### Pattern 2: World-Space Floating UI (Health Bars)
**What:** UI elements attached to game objects (health bars, behavior icons)
**When to use:** Indicators that must follow moving entities
**Example:**
```typescript
// Source: apps/web/src/game/rendering/EntityRenderer.ts (lines 48-60)
// Health bar for damaged creatures (positioned above elevated sprite)
if (this.isCreature(entity) && entity.health < entity.maxHealth) {
  const healthBar = this.createHealthBar(entity.health, entity.maxHealth);
  healthBar.y = -this.elevationOffset - 24; // Above sprite
  container.add(healthBar);
}

// Behavior icon for creatures (above health bar)
if (this.isCreature(entity)) {
  const behaviorIcon = this.createBehaviorIcon(entity.behavior);
  behaviorIcon.y = -this.elevationOffset - 34; // Above health bar
  container.add(behaviorIcon);
}
```

**Key principle:** Add UI as children to entity container. Use negative Y-offset to position above sprite. Container's `gridToScreen()` position automatically moves children.

### Pattern 3: Minimap with Separate Camera
**What:** Second camera showing zoomed-out orthogonal view
**When to use:** Always for minimaps in isometric games
**Example:**
```typescript
// Source: apps/web/src/game/rendering/MinimapCamera.ts (lines 23-36)
this.minimapCam = this.scene.cameras.add(
  mainCam.width - MINIMAP_SIZE - MINIMAP_PADDING,
  mainCam.height - MINIMAP_SIZE - MINIMAP_PADDING,
  MINIMAP_SIZE,
  MINIMAP_SIZE
);

this.minimapCam.setZoom(MINIMAP_ZOOM); // 0.15 = zoomed out
this.minimapCam.setBackgroundColor(0x111122);
this.minimapCam.setBounds(0, 0, ZONE_SIZE * TILE_SIZE, ZONE_SIZE * TILE_SIZE);
this.minimapCam.setName('minimap');
```

**Key principle:** Minimap camera renders same world objects but with different zoom/bounds. Use `camera.ignore()` to exclude screen-fixed UI from minimap rendering.

### Pattern 4: Camera Ignore for Selective Rendering
**What:** Tell specific cameras to skip certain game objects
**When to use:** Prevent HUD elements from appearing in minimap
**Example:**
```typescript
// Source: apps/web/src/game/rendering/MinimapCamera.ts (lines 56-58)
// Make minimap camera ignore UI elements (border and player indicator)
// They should only render on main camera
this.minimapCam.ignore([this.border, this.playerIndicator]);

// Source: apps/web/src/game/scenes/WorldScene.ts (lines 75-78)
// Make minimap camera ignore ZoneHUD elements (they have scrollFactor 0)
if (this.zoneHUD) {
  this.minimapCamera.ignore(this.zoneHUD.getGameObjects());
}
```

**Key principle:** Screen-fixed UI (scrollFactor=0) should only render on main camera. World objects render on all cameras unless explicitly ignored.

### Anti-Patterns to Avoid
- **Manually positioning floating UI every frame:** Use containers instead - Phaser handles position updates automatically when container moves
- **Forgetting scrollFactor on HUD elements:** Results in HUD scrolling with world instead of staying fixed to screen
- **Wrong depth values:** HUD must have depth > world objects (1000+) or it renders behind tiles
- **Coordinate system mismatch:** Minimap must use same tile dimensions as world for correct bounds/positioning

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Health bar positioning | Manual update loop for each entity | Container child offsets | Phaser containers automatically transform children; manual updates cause frame delays and sync issues |
| Screen-fixed UI | Custom camera-relative math | `setScrollFactor(0)` | Phaser's built-in scroll factor handles zoom, rotation, parallax correctly; custom math breaks with camera transforms |
| Minimap rendering | Render-to-texture approach | Second camera with ignore list | Multiple cameras are first-class in Phaser; RTT adds overhead, breaks input, requires manual updates |
| Floating icon backgrounds | Image sprites for each icon | Graphics API with fillStyle | Dynamic health bars/icons change frequently; Graphics faster than texture swaps, less memory |

**Key insight:** Phaser's camera and container systems are designed for these exact use cases. Custom solutions break when camera zoom changes, scene transitions occur, or containers nest. The built-in APIs handle these edge cases.

## Common Pitfalls

### Pitfall 1: Coordinate System Mismatch Between World and Minimap
**What goes wrong:** Minimap bounds use wrong tile size, causing player indicator to appear at incorrect position or minimap to show wrong area of world.
**Why it happens:** Code evolution - system started with 96px tiles, Phase 8 changed to 128x64 isometric, but MinimapCamera.ts still has hardcoded `TILE_SIZE = 96` (line 4).
**How to avoid:** Single source of truth for tile dimensions. Pass tileWidth/Height to MinimapCamera constructor, or import ISO_TILE_WIDTH constant from WorldScene.
**Warning signs:** Player indicator doesn't stay centered in minimap, minimap shows wrong portion of zone, camera bounds errors in console.

**Evidence from codebase:**
```typescript
// WRONG (apps/web/src/game/rendering/MinimapCamera.ts:4)
const TILE_SIZE = 96;  // Outdated value!

// CORRECT (apps/web/src/game/scenes/WorldScene.ts:15-16)
const ISO_TILE_WIDTH = 128;
const ISO_TILE_HEIGHT = 64;
```

### Pitfall 2: Health Bar Offset Not Accounting for Isometric Elevation
**What goes wrong:** Health bars render too high or too low relative to entity sprite, especially on entities at different grid Y positions.
**Why it happens:** In orthogonal games, fixed Y-offset works. In isometric, entities have elevation offset (12px) and screen Y changes with grid position.
**How to avoid:** Offset health bar from `elevationOffset` constant, not magic numbers. Test entities at various grid positions.
**Warning signs:** Health bars appear disconnected from entities, vertical spacing inconsistent between entities.

**Current implementation already correct:**
```typescript
// apps/web/src/game/rendering/EntityRenderer.ts:50-51
const healthBar = this.createHealthBar(entity.health, entity.maxHealth);
healthBar.y = -this.elevationOffset - 24; // Correctly offset from elevation
```

### Pitfall 3: Forgetting to Ignore HUD from Minimap Camera
**What goes wrong:** ZoneHUD text, connection indicators, and other screen-fixed UI render inside minimap viewport, causing visual clutter.
**Why it happens:** By default, cameras render all visible game objects. `scrollFactor=0` doesn't prevent rendering, only disables scrolling.
**How to avoid:** Every screen-fixed UI element must be added to minimap's ignore list. Create `getGameObjects()` method on UI classes for batch ignoring.
**Warning signs:** HUD text appears tiny inside minimap, minimap border renders twice, player indicator duplicated.

**Current implementation already correct:**
```typescript
// apps/web/src/game/scenes/WorldScene.ts:75-78
if (this.zoneHUD) {
  this.minimapCamera.ignore(this.zoneHUD.getGameObjects());
}
```

### Pitfall 4: Container Performance Overhead with Deep Nesting
**What goes wrong:** FPS drops when many entities with health bars/icons exist, especially with nested containers.
**Why it happens:** Phaser documentation warns: "They add additional processing overhead into every one of their children. The deeper you nest them, the more the cost escalates."
**How to avoid:** Flat container hierarchy (entity container → shadow/sprite/healthbar/icon as direct children). Never nest containers inside containers for UI.
**Warning signs:** FPS drops proportional to entity count, profiler shows container transform calculations as hotspot.

**Current implementation already correct:**
```typescript
// apps/web/src/game/rendering/EntityRenderer.ts:32-60
const container = this.scene.add.container(screenPos.x, screenPos.y);
container.add(shadow);   // Direct child
container.add(sprite);   // Direct child
container.add(healthBar);// Direct child - NOT nested in another container
container.add(behaviorIcon); // Direct child
```

### Pitfall 5: Graphics Bounds Exclusion Breaking Container Calculations
**What goes wrong:** `container.getBounds()` returns incorrect size, causing camera or culling issues.
**Why it happens:** Phaser documentation states: "Graphics objects are unable to return their bounds, so they are skipped when calculating container bounds."
**How to avoid:** Don't rely on `getBounds()` for containers with Graphics children. Use explicit grid coordinates for culling/positioning.
**Warning signs:** Viewport culling cuts off entities with health bars, camera follow behaves erratically.

**Current implementation safe:** Uses `gridX`/`gridY` data properties for depth sorting and culling, not `getBounds()`.

## Code Examples

Verified patterns from official sources:

### Minimap Camera Setup
```typescript
// Source: apps/web/src/game/rendering/MinimapCamera.ts:19-77
// Complete minimap pattern: second camera + ignore list + player indicator

create(): void {
  const mainCam = this.scene.cameras.main;

  // Create minimap camera in bottom-right corner
  this.minimapCam = this.scene.cameras.add(
    mainCam.width - MINIMAP_SIZE - MINIMAP_PADDING,
    mainCam.height - MINIMAP_SIZE - MINIMAP_PADDING,
    MINIMAP_SIZE,
    MINIMAP_SIZE
  );

  // Configure: zoomed out, orthogonal view of isometric world
  this.minimapCam.setZoom(MINIMAP_ZOOM); // 0.15
  this.minimapCam.setBackgroundColor(0x111122);
  this.minimapCam.setBounds(0, 0, ZONE_SIZE * TILE_SIZE, ZONE_SIZE * TILE_SIZE);

  // Border fixed to screen (not in world space)
  this.border = this.scene.add.graphics();
  this.border.lineStyle(2, 0x666688, 1);
  this.border.strokeRect(/* minimap position */);
  this.border.setScrollFactor(0);
  this.border.setDepth(1000);

  // Player indicator fixed to screen center of minimap
  this.playerIndicator = this.scene.add.graphics();
  this.playerIndicator.setScrollFactor(0);
  this.playerIndicator.setDepth(1001);

  // Critical: minimap camera must ignore screen-fixed UI
  this.minimapCam.ignore([this.border, this.playerIndicator]);
}

startFollow(target: Phaser.GameObjects.Sprite): void {
  if (this.minimapCam) {
    this.minimapCam.startFollow(target, true); // Follow player in world
  }
}
```

### Health Bar Creation
```typescript
// Source: apps/web/src/game/rendering/EntityRenderer.ts:72-98
createHealthBar(currentHealth: number, maxHealth: number): Phaser.GameObjects.Graphics {
  const width = 30;
  const height = 4;
  const graphics = this.scene.add.graphics();

  // Background (dark gray)
  graphics.fillStyle(0x333333);
  graphics.fillRect(-width / 2, 0, width, height);

  // Color-coded fill based on health percentage
  const healthPercent = currentHealth / maxHealth;
  let fillColor: number;
  if (healthPercent > 0.5) {
    fillColor = 0x44cc44; // green
  } else if (healthPercent >= 0.25) {
    fillColor = 0xffcc00; // yellow
  } else {
    fillColor = 0xff4444; // red
  }

  // Fill bar proportional to health
  const fillWidth = width * healthPercent;
  graphics.fillStyle(fillColor);
  graphics.fillRect(-width / 2, 0, fillWidth, height);

  return graphics;
}
```

### Behavior Icon Creation
```typescript
// Source: apps/web/src/game/rendering/EntityRenderer.ts:103-136
createBehaviorIcon(behavior: CreatureBehavior): Phaser.GameObjects.Text {
  // Map behavior to lore-correct letter and color
  let letter: string;
  let color: string;

  switch (behavior) {
    case 'passive':
      letter = 'H'; // Herbivore
      color = '#44cc44'; // green
      break;
    case 'neutral':
      letter = 'O'; // Omnivore
      color = '#ffcc00'; // yellow
      break;
    case 'aggressive':
      letter = 'P'; // Predator
      color = '#ff6b35'; // orange
      break;
    case 'defensive':
      letter = 'M'; // Maniac
      color = '#ff4444'; // red
      break;
  }

  const text = this.scene.add.text(0, 0, letter, {
    fontSize: '12px',
    color: color,
    backgroundColor: '#000000',
    padding: { x: 4, y: 2 },
  });
  text.setOrigin(0.5, 0.5);

  return text;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Orthogonal 96x96 tiles | Isometric 128x64 tiles | Phase 8 (Feb 2026) | Minimap needs coordinate update, health bar offsets must account for elevation |
| Fixed tile sizes in each file | IsometricTransform shared utility | Phase 8 (Feb 2026) | Single source of truth for coordinate math, but MinimapCamera missed the update |
| Manual depth sorting every frame | Throttled DepthSorter (100ms) | Phase 8 (Feb 2026) | Better performance, UI elements in containers benefit from stable depths |
| `fixedToCamera` property | `setScrollFactor(0)` | Phaser 3 migration | Modern Phaser 3 API, works with zoom/rotation |

**Deprecated/outdated:**
- `fixedToCamera` (Phaser 2): Use `setScrollFactor(0)` in Phaser 3
- Manual render-to-texture minimaps: Use multiple cameras instead (less overhead, built-in input support)
- Hardcoded tile sizes in UI classes: Should accept tile dimensions via constructor or shared constant

## Open Questions

1. **Should minimap remain orthogonal or use isometric projection?**
   - What we know: Phase 8 verification (line 206) notes "Minimap needs isometric support (future phase)"
   - What's unclear: Requirements specify "orthogonal (top-down view)" but don't explain why
   - Recommendation: Keep orthogonal as specified - easier to read player position, standard for isometric games (Diablo, Starcraft). Orthogonal minimap viewing isometric world via zoomed-out camera is correct pattern.

2. **Are behavior icons always visible or only for damaged creatures?**
   - What we know: Current code shows behavior icons for all creatures (line 56-60), health bars only for damaged creatures (line 49-53)
   - What's unclear: Requirements don't specify visibility conditions
   - Recommendation: Keep current behavior - icons always visible (helps identify threats), health bars only when damaged (reduces clutter). Aligns with MMORPG conventions.

3. **Should player indicator use faction color like remote players?**
   - What we know: Player indicator is white dot with yellow border (line 106-110), remote players use faction tint (line 515)
   - What's unclear: Requirements don't specify player indicator styling
   - Recommendation: Keep white/yellow for local player (neutral/clear), faction colors for others. Easier to spot yourself on minimap.

## Sources

### Primary (HIGH confidence)
- Phaser 3 Official Documentation: [Cameras](https://docs.phaser.io/phaser/concepts/cameras) - Multiple camera setup, ignore lists
- Phaser 3 Official Documentation: [Container](https://docs.phaser.io/phaser/concepts/gameobjects/container) - Container transform, child positioning
- Project codebase: apps/web/src/game/rendering/EntityRenderer.ts - Verified health bar/behavior icon implementation
- Project codebase: apps/web/src/game/rendering/MinimapCamera.ts - Verified minimap camera pattern
- Project codebase: apps/web/src/game/ui/ZoneHUD.ts - Verified screen-fixed UI pattern
- Project codebase: .planning/phases/08-core-isometric-transformation/08-VERIFICATION.md - Isometric coordinate system specification

### Secondary (MEDIUM confidence)
- [How do I make a health bar that follows a boss sprite?](https://phaser.discourse.group/t/how-do-i-make-a-health-bar-that-follows-a-boss-sprite/6203) - Container-based health bar pattern
- [Creating An Isometric View in Phaser 3](https://phaser.io/news/2020/07/creating-an-isometric-view-in-phaser-3) - Isometric coordinate conversion
- [Set Scroll Factor Example](https://phaser.io/examples/v3.85.0/camera/view/set-scroll-factor) - Screen-fixed UI technique
- [Camera ignore method](https://newdocs.phaser.io/docs/3.54.0/focus/Phaser.Cameras.Scene2D.Camera-ignore) - Selective rendering API

### Tertiary (LOW confidence)
- [Unity World Space UI discussions](https://discussions.unity.com/t/floating-ui-health-bar-text-screen-space-ui-or-world-space-ui/943651) - Cross-engine pattern verification
- [Phaser 3 isometric plugin](https://github.com/sebashwa/phaser3-plugin-isometric) - Plugin approach (not used in project, manual implementation chosen)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All built-in Phaser APIs, verified in codebase
- Architecture: HIGH - Patterns already implemented and working (verified in Phase 8)
- Pitfalls: HIGH - Specific issue (TILE_SIZE mismatch) identified in codebase analysis

**Research date:** 2026-02-16
**Valid until:** 60 days (stable domain - Phaser 3 APIs and isometric patterns don't change frequently)

**Key finding:** Implementation is 90% correct. Main issue is MinimapCamera.ts coordinate mismatch (96px vs 128x64). Health bars/behavior icons already positioned correctly. UI rendering patterns (scrollFactor, depth, camera.ignore) already in place and working.
