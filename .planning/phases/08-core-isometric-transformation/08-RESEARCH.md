# Phase 8: Core Isometric Transformation - Research

**Researched:** 2026-02-16
**Domain:** Phaser 3 isometric rendering and coordinate transformation
**Confidence:** MEDIUM-HIGH

## Summary

Phase 8 transforms the game from top-down to isometric diamond view (2:1 ratio) using mathematical coordinate conversion, Y-based depth sorting, and centered camera tracking. This is a client-side-only rendering transformation—server logic remains unchanged.

The standard approach uses simple coordinate transformation formulas (cartesian to screen: `x_iso = (x - y) * tileWidthHalf`, `y_iso = (x + y) * tileHeightHalf`) combined with Phaser 3's `setDepth()` API for automatic depth sorting based on Y-position. The codebase already has chunk management and viewport culling in place, which will need adaptation for isometric coordinate space but provides a solid foundation.

**Primary recommendation:** Use custom coordinate transformation utilities (not phaser3-plugin-isometric) with Phaser 3's native `setDepth()` API for depth sorting. Transform at rendering boundaries only (screen input → grid, grid → screen rendering), keeping all game logic in cartesian coordinates.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Visual style:**
- 2:1 isometric ratio (classic diamond projection)
- Tile size: 128x64 pixels (upgrade from 96x48)
- Shadows only for depth cues, no tile borders
- Shadow direction: Southeast (light from NW)
- Soft blending at biome/tile transitions

**Entity placement:**
- Sprites anchor at tile center (classic positioning)
- Slight Y-offset for entities to appear elevated above tile surface
- Multiple entities on same tile stack vertically (visible stack)
- Blob shadow beneath each entity (circular/oval, not directional)

**Depth sorting:**
- Y-position based sorting (lower on screen = in front)
- X-position as tiebreaker when Y is identical (rightmost in front)
- Local player has priority at same depth — always visible
- Claude's Discretion: Whether depth updates per-frame or per-tile-change

**Camera behavior:**
- Direct center: player always at exact screen center
- Fixed zoom level (no player zoom control)
- Seamless scroll across zone/chunk boundaries
- Instant camera tracking (locked to player, no lerp)

### Claude's Discretion

- Depth sorting update frequency (continuous vs on-tile-change)
- Exact elevation offset amount for entity Y-offset
- Loading skeleton for chunk transitions
- Performance optimization approach for depth sorting with many entities

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope

</user_constraints>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Phaser 3 | 3.85+ | Game rendering engine | Already integrated, native isometric support since 3.50, mature depth sorting API |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| N/A | - | - | No additional libraries needed—Phaser 3 provides all required functionality |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom coordinate utils | phaser3-plugin-isometric | Plugin adds 3D physics engine and axonometric projection flexibility we don't need. Custom utils give full control and zero overhead. Plugin not actively maintained for latest Phaser versions. |
| setDepth() per sprite | Layer API with depthSort() | Layers good for grouped effects (post-processing) but add complexity. setDepth() simpler for our Y-based sorting. Layers better if applying shaders to entity groups. |

**Installation:**
```bash
# No new dependencies—use existing Phaser 3
```

## Architecture Patterns

### Recommended Project Structure
```
apps/web/src/game/
├── utils/
│   └── IsometricTransform.ts    # Coordinate conversion utilities
├── rendering/
│   ├── TileRenderer.ts           # Update for isometric positioning
│   ├── EntityRenderer.ts         # Update for isometric + depth + shadows
│   ├── DepthSorter.ts            # Throttled depth update manager
│   └── ViewportCuller.ts         # Update for diamond-shaped culling
└── scenes/
    └── WorldScene.ts             # Integrate isometric rendering
```

### Pattern 1: Coordinate Transformation Utilities

**What:** Pure functions converting between cartesian grid coordinates and isometric screen positions
**When to use:** At rendering boundaries (screen click → grid, grid → screen rendering)

**Example:**
```typescript
// Source: https://clintbellanger.net/articles/isometric_math/
export class IsometricTransform {
  private tileWidthHalf: number;
  private tileHeightHalf: number;

  constructor(tileWidth: number = 128, tileHeight: number = 64) {
    this.tileWidthHalf = tileWidth / 2;
    this.tileHeightHalf = tileHeight / 2;
  }

  // Grid to screen
  gridToScreen(gridX: number, gridY: number): { x: number; y: number } {
    return {
      x: (gridX - gridY) * this.tileWidthHalf,
      y: (gridX + gridY) * this.tileHeightHalf
    };
  }

  // Screen to grid
  screenToGrid(screenX: number, screenY: number): { x: number; y: number } {
    const x = (screenX / this.tileWidthHalf + screenY / this.tileHeightHalf) / 2;
    const y = (screenY / this.tileHeightHalf - screenX / this.tileWidthHalf) / 2;
    return { x, y };
  }

  // Screen to grid (integer tile coordinates)
  screenToTile(screenX: number, screenY: number): { x: number; y: number } {
    const grid = this.screenToGrid(screenX, screenY);
    return {
      x: Math.floor(grid.x),
      y: Math.floor(grid.y)
    };
  }
}
```

### Pattern 2: Depth-Based Rendering Order

**What:** Use sprite Y-position as depth value for automatic sorting
**When to use:** For all entities and tiles that need depth sorting

**Example:**
```typescript
// Source: https://phaser.io/examples/v3.85.0/depth-sorting/view/isometric-blocks
// Phaser 3 automatically sorts by depth value

// For tiles (static depth)
const tileSprite = this.add.sprite(screenX, screenY, 'tile');
tileSprite.setDepth(screenY);

// For entities (dynamic depth)
const entityContainer = this.add.container(screenX, screenY);
entityContainer.setDepth(screenY + entity.x * 0.0001); // X as tiebreaker

// Update depth when entity moves
updateEntityDepth(entity: Phaser.GameObjects.Container, gridX: number, gridY: number) {
  const screenPos = this.isoTransform.gridToScreen(gridX, gridY);
  entity.setDepth(screenPos.y + gridX * 0.0001); // X-position tiebreaker
}
```

### Pattern 3: Sprite Origin and Positioning

**What:** Set sprite origin to bottom-center for proper isometric tile alignment
**When to use:** For all tiles and entities in isometric view

**Example:**
```typescript
// Source: https://phasergames.com/how-to-set-an-image-anchor-point-of-origin-in-phaser-3/
// Tiles: origin at center (0.5, 0.5) - diamond anchors at middle
const tile = this.add.sprite(screenX, screenY, 'tile');
tile.setOrigin(0.5, 0.5);

// Entities: origin at bottom-center (0.5, 1.0) for ground alignment
const entity = this.add.sprite(screenX, screenY - elevationOffset, 'creature');
entity.setOrigin(0.5, 1.0); // Feet at screenY

// Blob shadow: separate sprite beneath entity
const shadow = this.add.sprite(screenX, screenY, 'blob_shadow');
shadow.setOrigin(0.5, 0.5);
shadow.setAlpha(0.3);
```

### Pattern 4: Throttled Depth Sorting

**What:** Update depth values at controlled intervals, not every frame
**When to use:** When many entities need sorting but don't move constantly

**Example:**
```typescript
// Source: https://blog.pocketcitygame.com/cheating-at-z-depth-sprite-sorting-in-an-isometric-game/
export class DepthSorter {
  private lastUpdateTime = 0;
  private updateInterval = 100; // ms
  private dirtyEntities = new Set<string>();

  markDirty(entityId: string): void {
    this.dirtyEntities.add(entityId);
  }

  update(time: number, entities: Map<string, EntityContainer>): void {
    if (time - this.lastUpdateTime < this.updateInterval) return;

    this.dirtyEntities.forEach(id => {
      const entity = entities.get(id);
      if (entity) {
        const depth = entity.y + entity.gridX * 0.0001;
        entity.setDepth(depth);
      }
    });

    this.dirtyEntities.clear();
    this.lastUpdateTime = time;
  }
}
```

### Pattern 5: Camera Instant Follow

**What:** Camera follows player with no lerp (instant tracking)
**When to use:** User requires direct centering with no smoothing

**Example:**
```typescript
// Source: https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera
// lerpX = 1, lerpY = 1 means instant tracking (no smoothing)
this.cameras.main.startFollow(
  playerSprite,
  true,  // roundPixels (prevents sub-pixel jitter)
  1,     // lerpX = 1 (instant horizontal tracking)
  1      // lerpY = 1 (instant vertical tracking)
);
```

### Anti-Patterns to Avoid

- **Converting coordinates everywhere:** Transform only at boundaries (input/output), keep game logic in cartesian grid space
- **Per-frame depth updates for all entities:** Only update depth when entity moves or changes tile
- **Forgetting X-tiebreaker:** When entities share Y-position, rightmost (higher X) should render in front
- **Using physics for depth:** Isometric depth is purely visual—don't involve physics engine
- **Recalculating static depths:** Tiles don't move—calculate depth once on creation

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Isometric coordinate math | Custom matrix transformations | Simple formula: `x_iso = (x-y)*halfW`, `y_iso = (x+y)*halfH` | 2:1 diamond projection has well-known closed-form solution, no need for matrix math |
| Z-sorting algorithm | Custom painter's algorithm, topological sort | Phaser's `setDepth()` with Y-based values | Phaser automatically sorts display list by depth, handles edge cases (flickering, stable sort) |
| Viewport culling in isometric | Complex diamond-shaped culling | Expand existing rectangular culling with padding | Diamond fits in rectangle with ~40% padding—simpler than precise diamond culling |
| Sprite atlases for tiles | Manual texture packing | Phaser's Multi-Atlas support | Phaser batches same-atlas sprites automatically, handles memory efficiently |

**Key insight:** Isometric rendering is 90% coordinate transformation + depth assignment. Phaser handles the hard parts (batched rendering, depth sorting, texture management). Focus on coordinate utilities and depth rules, not rendering internals.

## Common Pitfalls

### Pitfall 1: Incorrect Tile Origin Causing Offset Drift

**What goes wrong:** Tiles positioned with (0,0) origin don't align at chunk boundaries, creating visible seams or gaps as camera moves.

**Why it happens:** Isometric diamond tiles must anchor at their center (0.5, 0.5) because the coordinate formula calculates the diamond's center point, not top-left.

**How to avoid:**
- Always set tile origin to `setOrigin(0.5, 0.5)`
- For entities, use `setOrigin(0.5, 1.0)` (bottom-center) if sprite includes ground contact point
- Test chunk boundaries explicitly—render adjacent chunks and verify seamless alignment

**Warning signs:** Gaps between chunks, tiles shifting when camera moves, "tearing" at chunk edges

### Pitfall 2: Depth Fighting with Same Y-Position

**What goes wrong:** Entities at the same tile Y flicker or render in wrong order (z-fighting).

**Why it happens:** Multiple entities can share the same Y screen coordinate, so depth values collide. Phaser's stable sort helps but doesn't solve ordering.

**How to avoid:**
- Use X-position as sub-depth tiebreaker: `depth = screenY + gridX * 0.0001`
- For local player priority, add small constant: `depth = screenY + gridX * 0.0001 + 0.001`
- For stacked entities (same tile), add vertical index: `depth = screenY + stackIndex * 0.01`

**Warning signs:** Sprites flickering when overlapping, wrong sprite in front, local player disappearing behind others

### Pitfall 3: ViewportCuller Using Grid-Based Culling in Isometric Space

**What goes wrong:** Viewport culler calculates tile visibility using cartesian bounds, but isometric tiles occupy diamond-shaped screen space. Tiles at screen edges get culled prematurely or too many tiles remain visible.

**Why it happens:** Existing `ViewportCuller` converts screen bounds to tile coordinates assuming square tiles. In isometric, the diamond shape means tiles at extreme X/Y positions are visible even when their grid coords seem out-of-bounds.

**How to avoid:**
- Keep culling in screen space, not grid space
- Expand culling padding significantly (~3-4 tiles instead of 2) to account for diamond projection
- Alternative: Convert screen viewport corners to grid space, find min/max X+Y and X-Y ranges
- Test at chunk boundaries and screen corners explicitly

**Warning signs:** Tiles popping in/out at screen edges, culling too aggressive (visible gaps) or too loose (performance drop)

### Pitfall 4: Screen-to-Grid Click Detection at Chunk Boundaries

**What goes wrong:** Click-to-move calculates wrong tile near chunk boundaries, sending player to incorrect position.

**Why it happens:** Camera worldView coordinates represent screen pixels, but chunk containers have world offsets. Screen-to-grid calculation must account for chunk offset before applying isometric formula.

**How to avoid:**
- Use camera's `getWorldPoint(pointerX, pointerY)` to get world coordinates first
- Then apply screen-to-grid formula: accounts for camera scroll and zoom automatically
- For multi-chunk worlds, ensure world coordinates are continuous (chunks positioned correctly)

**Warning signs:** Click-to-move works in center chunk but fails near edges, pathfinding targets wrong tiles at boundaries

### Pitfall 5: Entity Shadows Not Following Isometric Perspective

**What goes wrong:** Blob shadows appear disconnected from entities or distort when moving, breaking visual illusion.

**Why it happens:** Shadow sprite positioned using wrong anchor or not updated with entity position. Isometric shadows need careful Y-positioning to appear "on ground."

**How to avoid:**
- Shadow as separate sprite child in entity container, positioned at container origin (0, 0)
- Entity sprite positioned at slight Y-offset (e.g., -8px) to appear elevated above shadow
- Shadow scale/alpha based on entity elevation (higher = smaller/fainter shadow)
- Both shadow and entity in same container—container's depth handles sorting

**Warning signs:** Shadows overlapping wrong tiles, shadows appearing "above" entities, shadows not moving with entities

### Pitfall 6: Not Updating Depth on Every Tile Change

**What goes wrong:** Entity moves to new tile but renders behind/in-front incorrectly because depth not recalculated.

**Why it happens:** Depth based on screen Y-position, which changes when grid position changes in isometric. Forgetting to update depth means sprite keeps old sorting order.

**How to avoid:**
- Call `setDepth()` in movement handler whenever grid position changes
- For smooth tweened movement, update depth at tween start (destination tile's depth)
- Mark entity "dirty" on position change, batch depth updates in throttled loop

**Warning signs:** Entity moves but disappears behind tiles it should be in front of, sorting correct until entity moves

## Code Examples

Verified patterns from official sources:

### Coordinate Conversion Utilities

```typescript
// Source: https://clintbellanger.net/articles/isometric_math/
export class IsometricTransform {
  constructor(
    private tileWidth: number = 128,
    private tileHeight: number = 64
  ) {}

  get tileWidthHalf(): number { return this.tileWidth / 2; }
  get tileHeightHalf(): number { return this.tileHeight / 2; }

  /**
   * Convert grid coordinates to screen position (isometric diamond center)
   */
  gridToScreen(gridX: number, gridY: number): { x: number; y: number } {
    return {
      x: (gridX - gridY) * this.tileWidthHalf,
      y: (gridX + gridY) * this.tileHeightHalf
    };
  }

  /**
   * Convert screen position to grid coordinates (floating-point)
   */
  screenToGrid(screenX: number, screenY: number): { x: number; y: number } {
    return {
      x: screenX / this.tileWidth + screenY / this.tileHeight,
      y: screenY / this.tileHeight - screenX / this.tileWidth
    };
  }

  /**
   * Convert screen position to tile coordinates (integer grid)
   */
  screenToTile(screenX: number, screenY: number): { x: number; y: number } {
    const grid = this.screenToGrid(screenX, screenY);
    return {
      x: Math.floor(grid.x),
      y: Math.floor(grid.y)
    };
  }
}
```

### Rendering Tiles with Proper Depth

```typescript
// Source: Phaser 3 isometric examples + existing TileRenderer.ts pattern
export class TileRenderer {
  private isoTransform: IsometricTransform;

  constructor(scene: Phaser.Scene, tileWidth: number = 128, tileHeight: number = 64) {
    this.scene = scene;
    this.isoTransform = new IsometricTransform(tileWidth, tileHeight);
  }

  createTile(gridX: number, gridY: number, tileId: TileId): Phaser.GameObjects.Sprite {
    const screenPos = this.isoTransform.gridToScreen(gridX, gridY);
    const texture = this.getTextureKey(tileId);

    const sprite = this.scene.add.sprite(screenPos.x, screenPos.y, texture);
    sprite.setOrigin(0.5, 0.5); // Center origin for diamond tiles
    sprite.setDepth(screenPos.y); // Y-based depth for proper layering

    return sprite;
  }
}
```

### Rendering Entities with Shadows and Depth

```typescript
// Source: Adapted from existing EntityRenderer.ts + isometric depth sorting patterns
export class EntityRenderer {
  private isoTransform: IsometricTransform;
  private elevationOffset = 12; // pixels entities hover above ground

  constructor(scene: Phaser.Scene, tileWidth: number = 128, tileHeight: number = 64) {
    this.scene = scene;
    this.isoTransform = new IsometricTransform(tileWidth, tileHeight);
  }

  createEntityContainer(entity: Entity): Phaser.GameObjects.Container {
    const screenPos = this.isoTransform.gridToScreen(
      entity.position.x,
      entity.position.y
    );

    const container = this.scene.add.container(screenPos.x, screenPos.y);

    // Blob shadow at container origin (ground level)
    const shadow = this.scene.add.sprite(0, 0, 'blob_shadow');
    shadow.setOrigin(0.5, 0.5);
    shadow.setAlpha(0.3);
    shadow.setScale(0.8);
    container.add(shadow);

    // Entity sprite elevated above ground
    const sprite = this.scene.add.sprite(0, -this.elevationOffset, this.getEntityTexture(entity.type));
    sprite.setOrigin(0.5, 1.0); // Bottom-center origin
    container.add(sprite);

    // Depth based on screen Y + X tiebreaker
    const depth = screenPos.y + entity.position.x * 0.0001;
    container.setDepth(depth);

    return container;
  }

  updateEntityPosition(
    container: Phaser.GameObjects.Container,
    gridX: number,
    gridY: number
  ): void {
    const screenPos = this.isoTransform.gridToScreen(gridX, gridY);
    container.setPosition(screenPos.x, screenPos.y);

    // Update depth when position changes
    const depth = screenPos.y + gridX * 0.0001;
    container.setDepth(depth);
  }
}
```

### Camera Instant Follow (No Lerp)

```typescript
// Source: https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera
// In WorldScene.create():
this.cameras.main.startFollow(
  this.localPlayer,
  true,  // roundPixels - prevents sub-pixel jitter
  1,     // lerpX = 1 (instant horizontal tracking, no smoothing)
  1      // lerpY = 1 (instant vertical tracking, no smoothing)
);
```

### Throttled Depth Updates

```typescript
// Source: https://blog.pocketcitygame.com/cheating-at-z-depth-sprite-sorting-in-an-isometric-game/
export class DepthSorter {
  private lastUpdateTime = 0;
  private updateInterval = 100; // ms - user's discretion
  private dirtyEntities = new Set<string>();

  /**
   * Mark entity as needing depth update
   */
  markDirty(entityId: string): void {
    this.dirtyEntities.add(entityId);
  }

  /**
   * Update depths for dirty entities (throttled)
   */
  update(
    time: number,
    entities: Map<string, Phaser.GameObjects.Container>,
    isoTransform: IsometricTransform
  ): void {
    if (time - this.lastUpdateTime < this.updateInterval) return;

    this.dirtyEntities.forEach(id => {
      const container = entities.get(id);
      if (!container) return;

      // Assume container stores gridX/gridY in data
      const gridX = container.getData('gridX') as number;
      const gridY = container.getData('gridY') as number;

      const screenPos = isoTransform.gridToScreen(gridX, gridY);
      const depth = screenPos.y + gridX * 0.0001;
      container.setDepth(depth);
    });

    this.dirtyEntities.clear();
    this.lastUpdateTime = time;
  }
}
```

### Click-to-Move in Isometric Space

```typescript
// Source: Adapted from existing WorldScene click handler + coordinate conversion
// In WorldScene.create():
this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
  if (pointer.rightButtonDown()) return;

  // Convert screen position to world position (accounts for camera scroll)
  const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);

  // Convert world position to grid coordinates
  const gridPos = this.isoTransform.screenToTile(worldPoint.x, worldPoint.y);

  // Start pathfinding
  if (this.pathfindingController && this.collisionMap) {
    this.pathfindingController.startPath(gridPos.x, gridPos.y, this.collisionMap);
  }
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| phaser3-plugin-isometric with physics | Custom coordinate utils + Phaser depth API | 2020+ (Phaser 3.50 added native isometric support) | Simpler integration, better performance, no physics overhead |
| Continuous depth sorting every frame | Throttled depth updates on position change | Ongoing optimization trend | Better performance with many entities (100+) |
| Complex diamond culling | Expanded rectangular culling | N/A (pragmatic tradeoff) | Simpler code, slight over-rendering acceptable |
| Per-sprite depth calculation | Batch depth updates with dirty flag | Performance optimization pattern | Reduces redundant calculations |
| Smooth camera lerp | Instant camera follow (lerp = 1) | User preference | More "locked" feel, eliminates lag |

**Deprecated/outdated:**
- **phaser2-plugin-isometric:** Phaser 2 version, incompatible with Phaser 3
- **Custom stable sort implementations:** Phaser 3 uses JS native sort (stable since ES2019)
- **96x48 tile size:** User decision upgrades to 128x64 for more visual detail

## Open Questions

### Question 1: Optimal depth update frequency

**What we know:** Throttling depth updates (100ms intervals) reduces CPU load. User has discretion over frequency.

**What's unclear:** Exact tradeoff between update frequency and visual artifacts (entities briefly rendering in wrong order during movement).

**Recommendation:** Start with 100ms throttle. If visual artifacts occur (flickering during fast movement), reduce to 50ms. If performance issues arise with many entities, increase to 150ms or switch to on-tile-change updates only.

### Question 2: Exact elevation offset for entities

**What we know:** Entities need slight Y-offset to appear elevated above tile surface. User has discretion over amount.

**What's unclear:** Ideal pixel offset that looks good with 128x64 tiles and 96x96 sprites.

**Recommendation:** Start with 12-16 pixels (roughly 1/4 of tile height). Too much looks "floating," too little makes shadows overlap sprite feet. Test with actual sprite assets and adjust.

### Question 3: Viewport culling expansion factor for isometric

**What we know:** Diamond-shaped tiles occupy more screen space than their grid coordinates suggest. Existing culler uses 2-tile padding for top-down.

**What's unclear:** Optimal padding for isometric without over-rendering.

**Recommendation:** Increase padding to 3-4 tiles. Diamond projection means tiles at grid extremes still visible on screen. Test at screen corners and adjust. Consider separate X/Y padding (more X padding due to diamond width).

### Question 4: Loading skeleton for chunk transitions

**What we know:** ChunkManager loads adjacent chunks proactively. User has discretion over loading UI.

**What's unclear:** Whether loading skeleton is needed given proactive chunk loading (3x3 grid).

**Recommendation:** Start without loading skeleton—existing buffer strategy should prevent visible gaps. If gaps occur during fast movement or slow chunk loading, add simple placeholder tile (gray diamond) until chunk arrives.

## Sources

### Primary (HIGH confidence)

- [Isometric Tiles Math](https://clintbellanger.net/articles/isometric_math/) - Coordinate conversion formulas, official reference
- [Phaser 3 Camera API](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera) - startFollow method, lerp parameters
- [Phaser 3 Depth Sorting Examples](https://phaser.io/examples/v3.85.0/depth-sorting/view/isometric-blocks) - Official isometric depth sorting example
- [Phaser 3 Layer API](https://docs.phaser.io/api-documentation/class/gameobjects-layer) - Layer vs setDepth usage
- [Phaser 3 Sprite Origin](https://phasergames.com/how-to-set-an-image-anchor-point-of-origin-in-phaser-3/) - setOrigin method documentation

### Secondary (MEDIUM confidence)

- [Managing Big Maps in Phaser 3](https://www.dynetisgames.com/2018/02/24/manage-big-maps-phaser-3/) - Chunk loading strategy, seamless boundaries
- [Cheating at Z-Depth Sorting](https://blog.pocketcitygame.com/cheating-at-z-depth-sprite-sorting-in-an-isometric-game/) - Performance optimization for depth sorting
- [Creating Isometric View in Phaser 3](https://tnodes.medium.com/creating-an-isometric-view-in-phaser-3-fada95927835) - Tutorial covering isometric setup
- [Isometric Depth Sorting Challenges](https://mazebert.com/forum/news/isometric-depth-sorting--id775/) - Common pitfalls and solutions
- [Phaser 3.50 Release Notes](https://phaser.io/news/2020/12/phaser-350-released) - Native isometric tilemap support announcement

### Tertiary (LOW confidence - requires validation)

- [phaser3-plugin-isometric](https://github.com/sebashwa/phaser3-plugin-isometric) - Alternative approach (not recommended for this project)
- [Phaser 3 Performance Issues #6215](https://github.com/photonstorm/phaser/issues/6215) - Depth sorting performance discussion (2022, may be outdated)
- WebSearch results on isometric shadows and biome blending (generic game dev concepts, not Phaser-specific)

## Metadata

**Confidence breakdown:**
- Standard stack: **HIGH** - Phaser 3 native capabilities verified through official docs and examples
- Architecture patterns: **HIGH** - Coordinate formulas mathematically proven, depth sorting API well-documented
- Pitfalls: **MEDIUM** - Derived from community discussions and general isometric game dev knowledge, not all Phaser-3-specific
- Performance: **MEDIUM** - Throttling strategies from practical experience (blog post), not official benchmarks
- Chunk seamlessness: **MEDIUM-HIGH** - Existing ChunkManager provides foundation, isometric adaptation straightforward

**Research date:** 2026-02-16
**Valid until:** ~90 days (Phaser 3 stable, isometric techniques timeless, coordinate math unchanging)

**Key unknowns requiring experimentation:**
- Exact depth update frequency that balances performance and visual quality
- Optimal elevation offset for 128x64 tiles with 96x96 sprites
- Viewport culling padding expansion factor for acceptable over-rendering
- Whether blob shadow sprites need dynamic scaling based on entity state
