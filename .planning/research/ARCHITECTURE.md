# Architecture Research: Isometric View Integration

**Domain:** Isometric rendering transformation for 2D multiplayer game client
**Researched:** 2026-02-16
**Confidence:** HIGH

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Presentation Layer                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │ WorldScene│  │MinimapCam│  │  ZoneHUD │  │Input Hdlr│    │
│  └─────┬────┘  └─────┬────┘  └─────┬────┘  └─────┬────┘    │
│        │             │              │             │          │
├────────┴─────────────┴──────────────┴─────────────┴──────────┤
│                   Transform Layer (NEW)                      │
│  ┌───────────────────────────────────────────────────────┐   │
│  │  CoordinateTransform: Grid ↔ Screen                   │   │
│  │  - toScreen(gridX, gridY): {x, y}                     │   │
│  │  - toGrid(screenX, screenY): {x, y}                   │   │
│  │  - getDepthValue(gridX, gridY): number                │   │
│  └───────────────────────────────────────────────────────┘   │
├───────────────────────────────────────────────────────────────┤
│                   Rendering Layer (MODIFIED)                 │
│  ┌────────────┐  ┌────────────┐  ┌──────────┐               │
│  │TileRenderer│  │EntityRender│  │  Layer   │               │
│  │ (isometric)│  │ (isometric)│  │ Manager  │               │
│  └────────────┘  └────────────┘  └──────────┘               │
├───────────────────────────────────────────────────────────────┤
│                   Culling Layer (MODIFIED)                   │
│  ┌────────────┐  ┌────────────┐  ┌──────────┐               │
│  │  Viewport  │  │   Chunk    │  │ Minimap  │               │
│  │   Culler   │  │  Manager   │  │ (ortho)  │               │
│  │ (diamond)  │  │            │  │          │               │
│  └────────────┘  └────────────┘  └──────────┘               │
├───────────────────────────────────────────────────────────────┤
│                     Game Logic Layer (UNCHANGED)             │
│  ┌───────────┐  ┌───────────┐  ┌─────────┐  ┌─────────┐    │
│  │ Movement  │  │Pathfinding│  │Collision│  │  Server │    │
│  │Controller │  │Controller │  │   Map   │  │ Events  │    │
│  └───────────┘  └───────────┘  └─────────┘  └─────────┘    │
└───────────────────────────────────────────────────────────────┘

Server: Grid coordinates only (x, y) → Client transforms for display
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| **CoordinateTransform** | Bidirectional grid ↔ screen conversion | Singleton utility class with static methods |
| **TileRenderer** | Render tiles using isometric projection | Modified to use transform layer for positioning |
| **EntityRenderer** | Render entities with depth sorting | Modified to calculate depth from grid position |
| **ViewportCuller** | Diamond-shaped viewport culling | Modified bounds calculation for isometric space |
| **Layer** (NEW) | Phaser Layer for automatic depth sorting | Container for all world objects needing y-sort |
| **MinimapCamera** | Orthographic minimap view | Uses grid coordinates directly, ignores transform |
| **WorldScene** | Scene orchestration | Delegates to transform layer, unchanged logic |

## Recommended Project Structure

```
apps/web/src/game/
├── rendering/
│   ├── TileRenderer.ts              # Modified: uses CoordinateTransform
│   ├── EntityRenderer.ts            # Modified: uses CoordinateTransform
│   ├── ViewportCuller.ts            # Modified: diamond culling bounds
│   ├── ChunkManager.ts              # Unchanged
│   ├── MinimapCamera.ts             # Unchanged (uses grid coords)
│   └── CoordinateTransform.ts       # NEW: Transform layer
├── systems/
│   ├── DepthManager.ts              # NEW: Y-sort orchestration
│   ├── MovementController.ts        # Unchanged (grid logic)
│   └── PathfindingController.ts     # Unchanged (grid logic)
├── scenes/
│   └── WorldScene.ts                # Modified: uses Layer + DepthManager
└── config/
    └── isometric.config.ts          # NEW: Transform constants
```

### Structure Rationale

- **rendering/CoordinateTransform.ts:** Centralized transform layer keeps conversion logic in one place, prevents scattered coordinate calculations throughout codebase
- **systems/DepthManager.ts:** Separates depth sorting concerns from rendering, allows switching between y-sort strategies without touching renderers
- **config/isometric.config.ts:** Externalizes tile dimensions, projection angles, and depth constants for easy tuning
- **Layer-based architecture:** Phaser 3 Layer provides built-in depth sorting, more performant than manual Container sorting

## Architectural Patterns

### Pattern 1: Transform Layer Separation

**What:** All coordinate transformations go through a single `CoordinateTransform` utility. Game logic operates exclusively in grid coordinates; only rendering components access screen coordinates.

**When to use:** Always. This is the foundational pattern for isometric integration.

**Trade-offs:**
- **Pro:** Clear separation of concerns, server stays grid-based, easy to debug coordinate issues
- **Pro:** Can toggle between orthographic and isometric by swapping transform implementation
- **Con:** Additional function calls for every render (minimal performance impact)

**Example:**
```typescript
// apps/web/src/game/rendering/CoordinateTransform.ts
export class CoordinateTransform {
  private static readonly TILE_WIDTH = 96;
  private static readonly TILE_HEIGHT = 48; // 2:1 ratio
  private static readonly TILE_WIDTH_HALF = 48;
  private static readonly TILE_HEIGHT_HALF = 24;

  /**
   * Convert grid coordinates to isometric screen coordinates
   * Formula: screen.x = (grid.x - grid.y) * TILE_WIDTH_HALF
   *          screen.y = (grid.x + grid.y) * TILE_HEIGHT_HALF
   */
  static toScreen(gridX: number, gridY: number): { x: number; y: number } {
    return {
      x: (gridX - gridY) * this.TILE_WIDTH_HALF,
      y: (gridX + gridY) * this.TILE_HEIGHT_HALF
    };
  }

  /**
   * Convert screen coordinates to grid coordinates (for click-to-move)
   * Formula: grid.x = screen.x / TILE_WIDTH + screen.y / TILE_HEIGHT
   *          grid.y = screen.y / TILE_HEIGHT - screen.x / TILE_WIDTH
   */
  static toGrid(screenX: number, screenY: number): { x: number; y: number } {
    const x = screenX / this.TILE_WIDTH + screenY / this.TILE_HEIGHT;
    const y = screenY / this.TILE_HEIGHT - screenX / this.TILE_WIDTH;
    return {
      x: Math.floor(x),
      y: Math.floor(y)
    };
  }

  /**
   * Calculate depth value for y-sort (higher = render on top)
   * Formula: depth = (gridX + gridY) * 1000 + gridY
   * The base (gridX + gridY) ensures proper row ordering
   * The +gridY tiebreaker ensures within-row ordering
   */
  static getDepthValue(gridX: number, gridY: number): number {
    return (gridX + gridY) * 1000 + gridY;
  }
}
```

### Pattern 2: Layer-Based Y-Sort

**What:** Use Phaser 3's `Layer` game object instead of manual Container depth sorting. All world objects (tiles, entities, players) are added to a single Layer that handles automatic depth sorting via `depthSort()`.

**When to use:** Always for isometric games with moving objects. Layer is more performant than Container for depth sorting.

**Trade-offs:**
- **Pro:** Built-in Phaser API, optimized for frequent re-sorting
- **Pro:** Methods like `bringToTop()`, `sendToBack()` work automatically
- **Con:** Cannot nest Layers (unlike Containers), but this isn't needed for isometric
- **Con:** Layers have no position/rotation/scale (use Containers if you need that)

**Example:**
```typescript
// apps/web/src/game/scenes/WorldScene.ts (modified)
export class WorldScene extends Phaser.Scene {
  private worldLayer: Phaser.GameObjects.Layer | null = null;

  create(): void {
    // Create single Layer for all world objects
    this.worldLayer = this.add.layer();

    // Tiles and entities added to layer instead of scene/container
    const tileSprite = this.add.sprite(screenX, screenY, 'tile');
    this.worldLayer.add(tileSprite);

    // Set depth using grid coordinates
    tileSprite.setDepth(CoordinateTransform.getDepthValue(gridX, gridY));
  }

  update(): void {
    // Trigger depth sort after movements (throttled to every 2-3 frames)
    if (this.worldLayer && this.shouldResort()) {
      this.worldLayer.depthSort();
    }
  }
}
```

### Pattern 3: Culling Transform

**What:** Viewport culling transforms from rectangular screen bounds to diamond-shaped grid bounds. Calculate which grid tiles are visible using inverse transform, then iterate only those tiles.

**When to use:** Essential for maintaining performance with isometric rendering.

**Trade-offs:**
- **Pro:** Only renders visible tiles, same as orthographic culling
- **Pro:** Diamond bounds are tighter than rectangle (fewer wasted checks)
- **Con:** More complex bounds calculation than simple divide-by-tile-size

**Example:**
```typescript
// apps/web/src/game/rendering/ViewportCuller.ts (modified)
export class ViewportCuller {
  /**
   * Calculate diamond-shaped grid bounds from screen viewport
   * Transforms camera rectangle corners to grid space, finds min/max
   */
  getCullBounds(camera: Phaser.Cameras.Scene2D.Camera): {
    minTileX: number;
    maxTileX: number;
    minTileY: number;
    maxTileY: number;
  } {
    const { x: camLeft, y: camTop } = camera.worldView;
    const { width, height } = camera.worldView;

    // Transform all four corners of screen rect to grid space
    const topLeft = CoordinateTransform.toGrid(camLeft, camTop);
    const topRight = CoordinateTransform.toGrid(camLeft + width, camTop);
    const bottomLeft = CoordinateTransform.toGrid(camLeft, camTop + height);
    const bottomRight = CoordinateTransform.toGrid(camLeft + width, camTop + height);

    // Find bounding box in grid space (diamond becomes rectangle here)
    const minTileX = Math.floor(Math.min(topLeft.x, topRight.x, bottomLeft.x, bottomRight.x)) - this.cullPaddingX;
    const maxTileX = Math.ceil(Math.max(topLeft.x, topRight.x, bottomLeft.x, bottomRight.x)) + this.cullPaddingX;
    const minTileY = Math.floor(Math.min(topLeft.y, topRight.y, bottomLeft.y, bottomRight.y)) - this.cullPaddingY;
    const maxTileY = Math.ceil(Math.max(topLeft.y, topRight.y, bottomLeft.y, bottomRight.y)) + this.cullPaddingY;

    return { minTileX, maxTileX, minTileY, maxTileY };
  }
}
```

### Pattern 4: Depth Manager for Dynamic Sorting

**What:** Separate component that manages when and how depth sorting occurs. Handles frequency throttling, identifies which objects need re-sorting, and orchestrates the sort operation.

**When to use:** When you have many moving entities and want to optimize sorting frequency.

**Trade-offs:**
- **Pro:** Centralizes sorting logic, easy to add optimizations (dirty flags, spatial partitioning)
- **Pro:** Can implement smart sorting (only resort affected regions)
- **Con:** Additional complexity if only a few objects move

**Example:**
```typescript
// apps/web/src/game/systems/DepthManager.ts (NEW)
export class DepthManager {
  private layer: Phaser.GameObjects.Layer;
  private lastSortTime = 0;
  private sortInterval = 50; // ms between sorts
  private dirtyObjects = new Set<Phaser.GameObjects.GameObject>();

  constructor(layer: Phaser.GameObjects.Layer) {
    this.layer = layer;
  }

  /**
   * Mark an object as needing depth recalculation
   */
  markDirty(gameObject: Phaser.GameObjects.GameObject, gridX: number, gridY: number): void {
    gameObject.setDepth(CoordinateTransform.getDepthValue(gridX, gridY));
    this.dirtyObjects.add(gameObject);
  }

  /**
   * Update depth sorting (throttled)
   */
  update(time: number): void {
    if (this.dirtyObjects.size === 0) return;
    if (time - this.lastSortTime < this.sortInterval) return;

    this.lastSortTime = time;
    this.layer.depthSort();
    this.dirtyObjects.clear();
  }

  /**
   * Immediate sort (for critical moments like spawns)
   */
  forceSort(): void {
    this.layer.depthSort();
    this.dirtyObjects.clear();
  }
}
```

## Data Flow

### Rendering Flow (Modified)

```
Server: Grid Position (x: 10, y: 15)
    ↓
Client: Receives position update
    ↓
MovementController: Updates grid state (logic layer)
    ↓
WorldScene.updateLocalPlayerSprite(position)
    ↓
CoordinateTransform.toScreen(10, 15) → {x: -240, y: 600}
    ↓
sprite.setPosition(-240, 600)
sprite.setDepth(CoordinateTransform.getDepthValue(10, 15)) → 25015
    ↓
DepthManager.markDirty(sprite, 10, 15)
    ↓
Layer.depthSort() (throttled, next frame)
    ↓
Render: sprite drawn at screen position with correct depth
```

### Click-to-Move Flow (Modified)

```
User: Clicks screen position (x: 400, y: 300)
    ↓
Phaser: pointer.x = 400, pointer.y = 300
    ↓
WorldScene: Get world point from camera
    ↓
CoordinateTransform.toGrid(worldX, worldY) → {x: 8, y: 12}
    ↓
PathfindingController.startPath(8, 12, collisionMap) (grid coordinates)
    ↓
MovementController: Grid-based pathfinding (UNCHANGED)
    ↓
Server: Move commands use grid coordinates (UNCHANGED)
```

### Culling Flow (Modified)

```
Camera: viewport bounds in screen space
    ↓
ViewportCuller.getCullBounds(camera)
    ↓
Transform 4 corners: screen → grid (CoordinateTransform.toGrid)
    ↓
Calculate min/max grid bounds (diamond → rectangle in grid space)
    ↓
Iterate tiles in bounds:
  for (y = minTileY; y <= maxTileY; y++)
    for (x = minTileX; x <= maxTileX; x++)
      if (tileSprites[y][x]) tile.setVisible(true)
    ↓
Tiles outside bounds: setVisible(false)
```

### Minimap Flow (UNCHANGED)

```
MinimapCamera: Separate camera, uses grid coordinates
    ↓
Follows player sprite in world space
    ↓
Renders at zoom 0.15 (orthographic projection, ignores transform)
    ↓
Because minimap ignores CoordinateTransform:
  - Shows traditional top-down view
  - No need to transform tiles
  - Player indicator remains centered
```

### Key Data Flows

1. **Grid-to-Screen (Rendering):** All sprite positioning goes through `CoordinateTransform.toScreen()`. Grid coordinates from server/logic → screen coordinates for Phaser sprites.

2. **Screen-to-Grid (Input):** All pointer input goes through `CoordinateTransform.toGrid()`. Mouse clicks → grid coordinates → pathfinding/movement logic.

3. **Depth Calculation:** Every sprite's depth value calculated from grid coordinates via `getDepthValue()`. Ensures proper y-sort ordering.

4. **Culling Transform:** Camera viewport (screen space) → grid bounds → visible tiles. Prevents rendering off-screen objects.

## Integration Points with Existing System

### Files to Modify

| File | Changes Required | Integration Strategy |
|------|------------------|----------------------|
| **TileRenderer.ts** | Replace `x * TILE_SIZE, y * TILE_SIZE` with `CoordinateTransform.toScreen(x, y)` | Low risk: only positioning logic changes |
| **EntityRenderer.ts** | Replace positioning calculation, add depth calculation | Low risk: isolated to `createEntityContainer()` method |
| **ViewportCuller.ts** | Replace `getCullBounds()` implementation with diamond culling | Medium risk: test with different zoom levels |
| **WorldScene.ts** | Replace Container with Layer, integrate DepthManager | Medium risk: test entity spawning/despawning |
| **WorldScene.ts (input)** | Replace `Math.floor(worldPoint.x / TILE_SIZE)` with `CoordinateTransform.toGrid()` | Low risk: only click-to-move handler |
| **MinimapCamera.ts** | No changes needed | Already uses world coordinates directly |
| **ChunkManager.ts** | No changes needed | Operates on grid coordinates |
| **MovementController.ts** | No changes needed | Pure grid logic |
| **PathfindingController.ts** | No changes needed | Pure grid logic |

### Files to Create

| File | Purpose | Dependencies |
|------|---------|--------------|
| **CoordinateTransform.ts** | Transform layer singleton | None (pure math) |
| **DepthManager.ts** | Depth sorting orchestration | Phaser.GameObjects.Layer |
| **isometric.config.ts** | Transform constants | None |

### Build Order (Dependency-Safe)

1. **Phase 1: Foundation (No Breaking Changes)**
   - Create `CoordinateTransform.ts` with toScreen/toGrid/getDepthValue methods
   - Create `isometric.config.ts` with TILE_WIDTH=96, TILE_HEIGHT=48
   - Add unit tests for transform functions
   - **Checkpoint:** Transform layer ready, no existing code broken

2. **Phase 2: Rendering Integration**
   - Modify `TileRenderer.createTile()` to use `CoordinateTransform.toScreen()`
   - Modify `EntityRenderer.createEntityContainer()` positioning
   - Set depth on tiles/entities using `CoordinateTransform.getDepthValue()`
   - **Checkpoint:** Isometric rendering works, may have depth sorting issues

3. **Phase 3: Depth Sorting**
   - Create `DepthManager.ts`
   - Modify `WorldScene.create()` to use `Layer` instead of `Container`
   - Integrate `DepthManager.update()` into `WorldScene.update()`
   - **Checkpoint:** Depth sorting functional, culling may be inefficient

4. **Phase 4: Culling Optimization**
   - Modify `ViewportCuller.getCullBounds()` to use diamond culling
   - Test with different camera zoom levels and positions
   - **Checkpoint:** Performance optimized

5. **Phase 5: Input Transform**
   - Modify `WorldScene` click-to-move handler to use `CoordinateTransform.toGrid()`
   - Test pathfinding with isometric clicks
   - **Checkpoint:** Full isometric integration complete

### Testing Integration Points

| Integration Point | Test Strategy |
|-------------------|---------------|
| **Transform accuracy** | Unit test: toScreen(5, 5) → toGrid() should return (5, 5) |
| **Depth sorting** | Visual test: Move entity diagonally, verify always renders correctly |
| **Culling bounds** | Performance test: Measure FPS with 1000 tiles, verify only visible tiles render |
| **Click-to-move** | Manual test: Click various screen positions, verify correct grid tile selected |
| **Multi-camera** | Visual test: Verify minimap remains orthographic while main view is isometric |
| **Chunk loading** | Edge case test: Load adjacent chunks, verify seamless isometric alignment |
| **Tweens** | Animation test: Verify movement tweens use screen coordinates (not grid) |

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 100-200 visible tiles | Base implementation sufficient. Layer.depthSort() every frame is fine. |
| 200-500 visible tiles | Throttle depth sorting to every 2-3 frames (30fps sorting). Use DepthManager with dirty flags. |
| 500+ visible tiles | Spatial partitioning: divide world into regions, only sort region containing moving objects. Consider octree/quadtree for very large worlds. |

### Scaling Priorities

1. **First bottleneck: Depth sorting frequency**
   - **Symptoms:** FPS drops when many entities move simultaneously
   - **Fix:** Throttle `Layer.depthSort()` to 20-30 fps instead of 60 fps. Use dirty flags to skip sorting when nothing moved.

2. **Second bottleneck: Transform calculations**
   - **Symptoms:** CPU spike in `toScreen()` calls during chunk loading
   - **Fix:** Pre-calculate screen positions for static tiles, cache in tile object. Only recalculate for moving entities.

3. **Third bottleneck: Culling complexity**
   - **Symptoms:** `getCullBounds()` shows up in profiler
   - **Fix:** Cache camera bounds, only recalculate when camera moves beyond threshold (e.g., 5 tiles).

## Anti-Patterns

### Anti-Pattern 1: Mixing Coordinate Systems

**What people do:** Store screen coordinates in game state, or mix grid and screen coordinates in same data structures.

**Why it's wrong:** Server operates in grid coordinates. If client stores screen coords, server reconciliation breaks. Debugging becomes nightmare (is this value grid or screen?).

**Do this instead:**
- Server and all game logic: grid coordinates only
- Transform to screen coordinates at render time only
- Use TypeScript types to enforce: `GridPosition { x: number, y: number }` vs `ScreenPosition { x: number, y: number }`

### Anti-Pattern 2: Per-Frame Depth Sorting

**What people do:** Call `Layer.depthSort()` every frame for all objects, even when nothing moved.

**Why it's wrong:** Sorting is O(n log n). With 500 objects, that's ~4500 comparisons per frame = 270k/sec at 60fps. Unnecessary CPU waste.

**Do this instead:**
- Use dirty flags to track which objects moved
- Throttle sorting to 20-30 fps (human eye can't detect depth sort at 60fps)
- Only sort when `dirtyObjects.size > 0`

### Anti-Pattern 3: Container Instead of Layer

**What people do:** Use nested Containers for depth sorting because "that's what I used before."

**Why it's wrong:** Containers have cumulative performance cost when nested. Each Container level adds transform calculations. Depth cannot be overridden for Container children.

**Do this instead:**
- Use single Layer for all world objects
- Layers are specifically designed for depth sorting
- Layers are more performant than Containers for this use case
- Reserve Containers for when you need grouped position/rotation/scale

### Anti-Pattern 4: Rectangular Culling with Isometric View

**What people do:** Keep old `getCullBounds()` that divides screen coords by tile size.

**Why it's wrong:** Isometric projection means diamond shape in grid space. Rectangular culling in grid space renders ~40% more tiles than necessary (corners of rectangle outside diamond).

**Do this instead:**
- Transform camera viewport corners to grid space
- Calculate min/max bounds in grid space (becomes diamond)
- Culling is automatically optimal for isometric projection

### Anti-Pattern 5: Transforming Server Data

**What people do:** Send isometric screen coordinates from server to client.

**Why it's wrong:** Breaks client-server separation. If client changes projection (zoom, different aspect ratio), server data is wrong. Bloats network packets (screen coords are larger than grid coords).

**Do this instead:**
- Server always sends grid coordinates
- Client transforms at render time
- Allows client to change projection without server changes
- Future-proofs for responsive design, mobile support

## Sources

### Coordinate Transformation & Isometric Math
- [Isometric Tiles Math - Clint Bellanger](https://clintbellanger.net/articles/isometric_math/) - Transformation formulas and architecture patterns
- [Pikuma: Isometric Projection in Game Development](https://pikuma.com/blog/isometric-projection-in-games) - Core projection formulas and best practices
- [Demystifying Isometric Projection in 2D Games with Python](https://medium.com/@kavierim/demystifying-isometric-projection-in-2d-games-with-python-bbcc2038a620) - Practical implementation

### Depth Sorting
- [Isometric Depth Sorting for Moving Platforms - Envato Tuts+](https://code.tutsplus.com/isometric-depth-sorting-for-moving-platforms--cms-30226t) - Block-based sorting algorithms
- [Drawing isometric boxes in the correct order](https://shaunlebron.github.io/IsometricBlocks/) - Topological sort visualization
- [Isometric depth sorting - Mazebert](https://mazebert.com/forum/news/isometric-depth-sorting--id775/) - Performance considerations

### Phaser 3 Implementation
- [Phaser 3 Layer Documentation](https://docs.phaser.io/api-documentation/class/gameobjects-layer) - Official Layer API
- [Container Sorting - Phaser Discourse](https://phaser.discourse.group/t/container-sorting/4479) - Container vs Layer performance
- [Layer vs Container - Rex Rainbow Notes](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/layer/) - Comprehensive comparison
- [Depth Sorting Examples - Ourcade](https://examples.ourcade.co/phaser3-typescript/depth-sorting/) - TypeScript examples
- [Display List Documentation](https://docs.phaser.io/phaser/concepts/gameobjects/display-list) - Display list concepts

### Architecture Patterns
- [Three-Tier Client Server Architecture - GeeksforGeeks](https://www.geeksforgeeks.org/computer-networks/three-tier-client-server-architecture-in-distributed-system/) - Layer separation principles
- [Best Features to Optimize 2D/3D Isometric Games - Retro Style Games](https://retrostylegames.com/blog/best-features-optimize-2d-3d-isometric-games/) - Optimization strategies

### Plugin References (For Comparison)
- [phaser3-plugin-isometric - GitHub](https://github.com/sebashwa/phaser3-plugin-isometric) - Reference implementation
- [Phaser 3 Isometric Plugin Examples](https://sebashwa.github.io/phaser3-plugin-isometric/) - Live examples

---
*Architecture research for: Into the Void isometric view integration*
*Researched: 2026-02-16*
*Confidence: HIGH - Based on official Phaser documentation, established isometric game development patterns, and mathematical foundations from authoritative sources*
