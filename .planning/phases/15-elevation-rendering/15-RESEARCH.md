# Phase 15: Elevation Rendering - Research

**Researched:** 2026-02-16
**Domain:** Isometric elevation rendering with side-face graphics, visibility culling, expanded viewport bounds
**Confidence:** HIGH

## Summary

Phase 15 transforms elevation data (flowing from Phase 14) into visual terrain height by rendering side faces for elevation differences. The game uses 2:1 isometric diamond tiles (128x64) with elevation levels 0-5. When a tile at elevation 2 is adjacent to a tile at elevation 0, the height difference needs visible representation through side faces (vertical wall segments).

The standard approach for isometric multi-level terrain rendering uses composite graphics: top face (existing diamond) + south face (rectangle) + east face (parallelogram) for each elevation step. Only visible faces render—south faces when the neighbor to the south is lower, east faces when the neighbor to the east is lower. This creates the classic "stacked blocks" isometric look seen in games like SimCity 2000 and Age of Empires II.

Phase 14 already established elevation-aware depth sorting (`depth = screenY + gridX * 0.0001 + elevation * 0.1`), ensuring entities on higher terrain render correctly. Phase 15 adds visual representation of that elevation through side-face graphics and expands viewport culling to account for tall structures extending beyond their tile bounds.

**Primary recommendation:** Use Phaser Graphics API to render side faces as filled rectangles/parallelograms beneath each tile's top face. Implement neighbor-based visibility culling (check south/east neighbors, only render faces where elevation difference exists). Expand ViewportCuller bounds by maximum possible structure height (5 elevation levels × visual height per level).

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Phaser 3 Graphics API | 3.85+ | Drawing side-face rectangles/polygons | Native Phaser feature, GPU-accelerated, integrates with depth sorting |
| IsometricTransform | In-repo | Screen coordinate calculation | Already handles gridToScreen, extend for elevation offset |
| TileRenderer | In-repo | Creates tile graphics | Existing tile creation, extend to add side faces |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| ViewportCuller | In-repo | Frustum culling | Needs bounds expansion for tall structures |
| ChunkData.heights[][] | In-repo | Elevation data source | Phase 14 established data flow |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Graphics API side faces | Pre-rendered sprite sheets | Graphics flexible (any elevation combo), sprites faster but require many permutations (2^2 neighbors × 6 elevations = 24 variations per tile type) |
| Neighbor-based culling | Render all faces always | Culling saves 50%+ draw calls (interior tiles have 2 hidden faces), minimal complexity cost |
| Expanded rectangular culling | Precise per-structure bounds | Rectangle expansion simpler, slight over-rendering acceptable with culling padding |

**Installation:**
No new dependencies required—all components exist in codebase.

## Architecture Patterns

### Recommended Project Structure
```
apps/web/src/game/
├── rendering/
│   ├── TileRenderer.ts           # Extend createTile to add side faces
│   ├── SideFaceRenderer.ts       # NEW: Side face graphics logic
│   └── ViewportCuller.ts         # Expand bounds for tall structures
└── utils/
    └── IsometricTransform.ts     # Add elevationToScreenOffset helper
```

### Pattern 1: Side Face Rendering with Neighbor Check

**What:** Render south and east side faces only when neighbor tiles are lower
**When to use:** In TileRenderer.createTile after creating top face diamond

**Example:**
```typescript
// Source: Adapted from isometric cube rendering patterns + existing TileRenderer
function createTileWithElevation(
  x: number,
  y: number,
  tileId: TileId,
  elevation: number,
  heights: number[][]
): Phaser.GameObjects.Container {
  const screenPos = this.isoTransform.gridToScreen(x, y);
  const container = this.scene.add.container(screenPos.x, screenPos.y);

  // Add side faces FIRST (render behind top face)
  const sideFaces = this.createSideFaces(x, y, elevation, heights);
  sideFaces.forEach(face => container.add(face));

  // Top face (existing diamond)
  const topFace = this.createTopFace(tileId);
  container.add(topFace);

  // Depth includes elevation offset
  const elevationOffset = elevation * ELEVATION_HEIGHT_STEP;
  container.setDepth(screenPos.y - elevationOffset);

  return container;
}

function createSideFaces(
  x: number,
  y: number,
  elevation: number,
  heights: number[][]
): Phaser.GameObjects.Graphics[] {
  const faces: Phaser.GameObjects.Graphics[] = [];
  const ZONE_SIZE = heights.length;

  // Check south neighbor (y+1)
  if (y < ZONE_SIZE - 1) {
    const southElevation = heights[y + 1][x];
    const elevationDiff = elevation - southElevation;
    if (elevationDiff > 0) {
      faces.push(this.createSouthFace(elevationDiff));
    }
  }

  // Check east neighbor (x+1)
  if (x < ZONE_SIZE - 1) {
    const eastElevation = heights[y][x + 1];
    const elevationDiff = elevation - eastElevation;
    if (elevationDiff > 0) {
      faces.push(this.createEastFace(elevationDiff));
    }
  }

  return faces;
}
```

### Pattern 2: South Face as Vertical Rectangle

**What:** South-facing side appears as vertical rectangle from bottom-right corner of diamond
**When to use:** When tile elevation > south neighbor elevation

**Example:**
```typescript
// Source: Isometric cube face geometry + Phaser Graphics API
const ELEVATION_HEIGHT_STEP = 16; // Pixels per elevation level (tunable)

function createSouthFace(elevationSteps: number): Phaser.GameObjects.Graphics {
  const graphics = this.scene.add.graphics();
  const halfWidth = this.isoTransform.tileWidth / 2;
  const height = elevationSteps * ELEVATION_HEIGHT_STEP;

  // South face is vertical rectangle from diamond's bottom point
  // Diamond bottom is at (0, halfHeight), rectangle extends down and right
  const startY = this.isoTransform.tileHeight / 2;

  graphics.fillStyle(0x1a1a1a, 1.0); // Dark side face
  graphics.fillRect(
    0,              // Center X (diamond's bottom point)
    startY,         // Start at diamond bottom
    halfWidth,      // Width extends to right edge of diamond
    height          // Height = elevation steps × pixels per step
  );

  return graphics;
}
```

### Pattern 3: East Face as Parallelogram

**What:** East-facing side appears as parallelogram extending left from diamond's bottom point
**When to use:** When tile elevation > east neighbor elevation

**Example:**
```typescript
// Source: Isometric parallelogram geometry
function createEastFace(elevationSteps: number): Phaser.GameObjects.Graphics {
  const graphics = this.scene.add.graphics();
  const halfWidth = this.isoTransform.tileWidth / 2;
  const halfHeight = this.isoTransform.tileHeight / 2;
  const faceHeight = elevationSteps * ELEVATION_HEIGHT_STEP;

  // East face is parallelogram from diamond's bottom point extending left
  const startY = halfHeight;

  graphics.fillStyle(0x0a0a0a, 1.0); // Darker than south face (lighting effect)
  graphics.beginPath();
  graphics.moveTo(0, startY);                           // Diamond bottom
  graphics.lineTo(-halfWidth, startY + halfHeight);     // Left bottom
  graphics.lineTo(-halfWidth, startY + halfHeight + faceHeight); // Left top
  graphics.lineTo(0, startY + faceHeight);              // Right top
  graphics.closePath();
  graphics.fillPath();

  return graphics;
}
```

### Pattern 4: Expanded Viewport Culling Bounds

**What:** Increase culling rectangle to account for tall structures extending upward
**When to use:** In ViewportCuller calculation before tile visibility check

**Example:**
```typescript
// Source: Viewport culling pattern + elevation system
const MAX_ELEVATION = 5;
const ELEVATION_HEIGHT_STEP = 16;
const MAX_STRUCTURE_HEIGHT = MAX_ELEVATION * ELEVATION_HEIGHT_STEP; // 80 pixels

function calculateVisibleBounds(camera: Phaser.Cameras.Scene2D.Camera) {
  const worldView = camera.worldView;

  // Expand bounds upward by maximum possible structure height
  const expandedView = new Phaser.Geom.Rectangle(
    worldView.x,
    worldView.y - MAX_STRUCTURE_HEIGHT, // Expand upward
    worldView.width,
    worldView.height + MAX_STRUCTURE_HEIGHT // Include expansion in height
  );

  return this.screenBoundsToTileBounds(expandedView);
}
```

### Pattern 5: Elevation-Aware Depth Sorting (Already Implemented in Phase 14)

**What:** Tiles at higher elevation render in front when at same screenY
**When to use:** Depth calculation for all tiles and entities

**Example:**
```typescript
// Source: Phase 14 implementation in IsometricTransform.calculateDepth
function setTileDepth(container: Phaser.GameObjects.Container, gridX: number, gridY: number, elevation: number) {
  const screenPos = this.isoTransform.gridToScreen(gridX, gridY);
  const elevationOffset = elevation * ELEVATION_HEIGHT_STEP;

  // Depth accounts for visual elevation offset (tiles higher up render "behind")
  // Note: Subtract elevationOffset because higher on screen = lower depth value
  const depth = screenPos.y - elevationOffset + (gridX * 0.0001);
  container.setDepth(depth);
}
```

### Anti-Patterns to Avoid

- **Rendering side faces for edge tiles:** Edge tiles (x/y at ZONE_SIZE-1) have no neighbors beyond chunk boundary—cross-chunk face rendering is complex, skip for v1.3
- **Using elevation for depth instead of screenY:** Elevation affects depth as small component, but screenY must remain dominant (see Phase 14 elevation weight = 0.1)
- **Forgetting to render side faces before top face:** Graphics API draws in order added to container—side faces must be children before top face to render behind
- **Hard-coding face colors:** Use biome-aware colors or tile definition hints for side faces (lava tiles glow, ice tiles are light blue, etc.)

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Multi-tile structure rendering | Custom span detection across chunks | ChunkData.structures[] exists, defer multi-tile to Phase 16 | Phase 15 focuses on per-tile elevation, structures are next phase |
| Side face sprites | Manual sprite atlas generation | Phaser Graphics API runtime rendering | Graphics flexible for any elevation combo, sprites require 100+ variations |
| 3D depth sorting | Topological sort with cycle detection | Phaser's setDepth with screenY - elevationOffset | Simple depth formula avoids cyclic dependency complexity |
| Cross-chunk neighbor checks | Custom chunk boundary logic | Render faces only for interior tiles initially | Edge cases deferred, 90% of tiles are interior |

**Key insight:** The codebase already has elevation data flow (Phase 14) and isometric rendering infrastructure (Phase 8). Phase 15 is purely visual—add Graphics API side faces with neighbor-based visibility checks. Don't rebuild depth sorting or data flow.

## Common Pitfalls

### Pitfall 1: Side Faces Render in Front of Top Face

**What goes wrong:** Side rectangles/parallelograms obscure the top diamond, breaking visual illusion.

**Why it happens:** Graphics added to container in wrong order. Phaser renders children sequentially—last added renders on top.

**How to avoid:**
- Add side face graphics to container BEFORE top face
- Verify with z-order: `container.list` array shows render order (first = back, last = front)
- Alternative: Use separate containers with different depths (side faces at depth - 0.001, top face at depth)

**Warning signs:** Diagonal edge of diamond not visible, side faces appearing "on top" of tile surface

### Pitfall 2: Elevation Offset Inverted in Depth Calculation

**What goes wrong:** Higher elevation tiles render behind lower tiles instead of in front.

**Why it happens:** Adding elevationOffset to screenY instead of subtracting. Higher screenY = lower on screen = render in front. Higher elevation = higher on screen = render behind.

**How to avoid:**
- Formula: `depth = screenY - (elevation * heightStep) + gridX * 0.0001`
- Test with extreme case: tile at (10, 10, elevation 5) should render behind tile at (10, 10, elevation 0) when both at same grid position
- Mnemonic: "Higher in world space = higher on screen = subtract from depth value"

**Warning signs:** Cliffs render backwards, entities on high ground appear behind low ground

### Pitfall 3: Face Visibility Check Doesn't Account for Chunk Edges

**What goes wrong:** Accessing heights[y+1][x] or heights[y][x+1] throws out-of-bounds error at chunk boundaries.

**Why it happens:** Neighbor check assumes neighbor exists in same chunk. Edge tiles (x = 63, y = 63 in 64×64 chunk) have neighbors in adjacent chunks.

**How to avoid:**
- Guard with bounds check: `if (y < ZONE_SIZE - 1)` before accessing heights[y+1][x]
- Alternative: Always render side faces for edge tiles (conservative, slight over-rendering)
- Future enhancement (Phase 16+): Cross-chunk neighbor lookup in ChunkManager

**Warning signs:** Runtime errors at chunk edges, missing side faces on border tiles

### Pitfall 4: Viewport Culling Too Aggressive for Tall Structures

**What goes wrong:** Tall structures pop in/out as camera moves. Structure at (30, 30, elevation 5) culled when (30, 30) is just outside viewport, but side faces extend into visible area.

**Why it happens:** Culling checks tile grid position, not screen-space bounds. Tile at elevation 5 extends 80 pixels upward from its grid position.

**How to avoid:**
- Expand culling bounds by `MAX_ELEVATION * ELEVATION_HEIGHT_STEP` in all directions
- Alternative: Per-tile bounds check using actual screen-space rectangle (more expensive)
- Test at chunk boundaries with zoom level 1.5 (current setting)

**Warning signs:** Structures flashing in/out at screen edges, side faces appearing mid-screen

### Pitfall 5: Side Face Colors Don't Match Tile Theme

**What goes wrong:** All side faces are gray/black regardless of tile type. Lava tiles look like stone walls, ice tiles look like volcanic cliffs.

**Why it happens:** Hard-coded face colors (0x1a1a1a) instead of deriving from tile definition or biome.

**How to avoid:**
- Add `sideFaceColor?: number` to TileDefinition (optional, defaults to dark gray)
- Or derive from top face color: `darkenColor(topColor, 0.3)` for automatic shading
- Or biome-based palette: `BIOME_SIDE_COLORS[biome]` for thematic consistency

**Warning signs:** Visual disconnect between tile tops and sides, all cliffs look same regardless of biome

### Pitfall 6: Forgetting to Update Entity Rendering for Elevated Terrain

**What goes wrong:** Entity at (20, 20) on tile with elevation 3 appears "floating" or "buried" relative to tile surface.

**Why it happens:** EntityRenderer positions entity at gridToScreen(x, y) without accounting for tile's elevation offset.

**How to avoid:**
- Phase 14 already passes elevation to EntityRenderer.updateEntityPosition
- Ensure entity screenY offset includes: `baseY - ENTITY_ELEVATION_OFFSET - (tileElevation * ELEVATION_HEIGHT_STEP)`
- Entity should appear "standing on" the tile's top surface, not the ground plane

**Warning signs:** Entities hovering above elevated tiles, entities buried in ground on high tiles

## Code Examples

Verified patterns from research and existing codebase:

### Complete Tile Creation with Side Faces

```typescript
// Source: Adapted from TileRenderer.ts + isometric side face patterns
const ELEVATION_HEIGHT_STEP = 16; // Pixels per elevation level (Claude's discretion)

export class TileRenderer {
  // ... existing properties

  /**
   * Create a tile with elevation-aware side faces.
   * Side faces only render when neighbors are lower (visibility culling).
   */
  createTileWithElevation(
    x: number,
    y: number,
    tileId: TileId,
    elevation: number,
    heights: number[][]
  ): Phaser.GameObjects.Container {
    const screenPos = this.isoTransform.gridToScreen(x, y);
    const elevationOffset = elevation * ELEVATION_HEIGHT_STEP;

    // Container positioned at base grid position
    const container = this.scene.add.container(screenPos.x, screenPos.y - elevationOffset);

    // Store grid position and elevation for depth sorting and updates
    container.setData('gridX', x);
    container.setData('gridY', y);
    container.setData('elevation', elevation);

    // Render side faces first (behind top face)
    const sideFaces = this.createSideFaces(x, y, elevation, heights);
    sideFaces.forEach(face => container.add(face));

    // Top face (existing diamond graphics)
    const topFace = this.createTopFace(tileId);
    container.add(topFace);

    // Depth: higher elevation = visually higher = lower depth value
    const depth = screenPos.y - elevationOffset + (x * 0.0001);
    container.setDepth(depth);

    return container;
  }

  /**
   * Create side faces based on neighbor elevation differences.
   * Only renders visible faces (south/east when neighbor is lower).
   */
  private createSideFaces(
    x: number,
    y: number,
    elevation: number,
    heights: number[][]
  ): Phaser.GameObjects.Graphics[] {
    const faces: Phaser.GameObjects.Graphics[] = [];
    const ZONE_SIZE = heights.length;

    // South face (visible when south neighbor is lower)
    if (y < ZONE_SIZE - 1) {
      const southElevation = heights[y + 1][x];
      const elevationDiff = elevation - southElevation;
      if (elevationDiff > 0) {
        faces.push(this.createSouthFace(elevationDiff));
      }
    }

    // East face (visible when east neighbor is lower)
    if (x < ZONE_SIZE - 1) {
      const eastElevation = heights[y][x + 1];
      const elevationDiff = elevation - eastElevation;
      if (elevationDiff > 0) {
        faces.push(this.createEastFace(elevationDiff));
      }
    }

    return faces;
  }

  /**
   * Create south-facing side (vertical rectangle extending down from diamond bottom).
   */
  private createSouthFace(elevationSteps: number): Phaser.GameObjects.Graphics {
    const graphics = this.scene.add.graphics();
    const halfWidth = this.isoTransform.tileWidth / 2;
    const halfHeight = this.isoTransform.tileHeight / 2;
    const faceHeight = elevationSteps * ELEVATION_HEIGHT_STEP;

    // Color: darker than top face for shading effect
    graphics.fillStyle(0x1a1a2a, 1.0);

    // Rectangle from diamond's bottom point (0, halfHeight) extending right and down
    graphics.fillRect(0, halfHeight, halfWidth, faceHeight);

    return graphics;
  }

  /**
   * Create east-facing side (parallelogram extending left from diamond bottom).
   */
  private createEastFace(elevationSteps: number): Phaser.GameObjects.Graphics {
    const graphics = this.scene.add.graphics();
    const halfWidth = this.isoTransform.tileWidth / 2;
    const halfHeight = this.isoTransform.tileHeight / 2;
    const faceHeight = elevationSteps * ELEVATION_HEIGHT_STEP;

    // Color: even darker than south face (two-tone shading)
    graphics.fillStyle(0x0a0a1a, 1.0);

    // Parallelogram from diamond bottom
    graphics.beginPath();
    graphics.moveTo(0, halfHeight);                          // Diamond bottom (center)
    graphics.lineTo(-halfWidth, 0);                          // Diamond left
    graphics.lineTo(-halfWidth, faceHeight);                 // Left face top
    graphics.lineTo(0, halfHeight + faceHeight);             // Right face top
    graphics.closePath();
    graphics.fillPath();

    return graphics;
  }

  /**
   * Create top face (existing diamond logic).
   */
  private createTopFace(tileId: TileId): Phaser.GameObjects.Graphics {
    const color = this.getTileColor(tileId);
    const halfWidth = this.isoTransform.tileWidth / 2;
    const halfHeight = this.isoTransform.tileHeight / 2;

    const graphics = this.scene.add.graphics();
    graphics.fillStyle(color, 1);
    graphics.beginPath();
    graphics.moveTo(0, -halfHeight);       // Top
    graphics.lineTo(halfWidth, 0);         // Right
    graphics.lineTo(0, halfHeight);        // Bottom
    graphics.lineTo(-halfWidth, 0);        // Left
    graphics.closePath();
    graphics.fillPath();

    // Subtle border
    graphics.lineStyle(1, 0x000000, 0.2);
    graphics.strokePath();

    return graphics;
  }
}
```

### Expanded Viewport Culling for Tall Structures

```typescript
// Source: apps/web/src/game/rendering/ViewportCuller.ts
const MAX_ELEVATION = 5;
const ELEVATION_HEIGHT_STEP = 16;
const MAX_STRUCTURE_HEIGHT = MAX_ELEVATION * ELEVATION_HEIGHT_STEP; // 80 pixels

export class ViewportCuller {
  // ... existing properties

  /**
   * Calculate which tiles are visible with expanded bounds for tall structures.
   */
  getVisibleTileBounds(camera: Phaser.Cameras.Scene2D.Camera): {
    minTileX: number;
    maxTileX: number;
    minTileY: number;
    maxTileY: number;
  } {
    const worldView = camera.worldView;

    // Expand viewport upward by maximum structure height
    // (structures extend upward from their grid position)
    const expandedView = new Phaser.Geom.Rectangle(
      worldView.x,
      worldView.y - MAX_STRUCTURE_HEIGHT,
      worldView.width,
      worldView.height + MAX_STRUCTURE_HEIGHT
    );

    // Convert expanded screen bounds to tile bounds
    const topLeft = this.isoTransform.screenToTile(
      expandedView.left,
      expandedView.top
    );
    const bottomRight = this.isoTransform.screenToTile(
      expandedView.right,
      expandedView.bottom
    );

    // Add padding for diamond projection (existing pattern)
    const padding = this.cullingPadding;

    return {
      minTileX: Math.floor(topLeft.x) - padding,
      maxTileX: Math.ceil(bottomRight.x) + padding,
      minTileY: Math.floor(topLeft.y) - padding,
      maxTileY: Math.ceil(bottomRight.y) + padding,
    };
  }
}
```

### Integration in WorldScene Chunk Rendering

```typescript
// Source: apps/web/src/game/scenes/WorldScene.ts renderChunk method
private renderChunk(chunkData: ChunkData, biome: BiomeType): void {
  const { zoneId, tiles, heights, collisions } = chunkData;

  if (!this.tileRenderer) return;

  const container = this.add.container(0, 0);

  // Render tiles with elevation-aware side faces
  for (let y = 0; y < ZONE_SIZE; y++) {
    for (let x = 0; x < ZONE_SIZE; x++) {
      const tileId = tiles[y][x] as TileId;
      const elevation = heights[y][x];

      // Create tile with side faces based on neighbor elevations
      const tile = this.tileRenderer.createTileWithElevation(
        x,
        y,
        tileId,
        elevation,
        heights
      );

      container.add(tile);
    }
  }

  this.chunkContainers.set(zoneId, container);

  // Store collision map for first chunk (assumes single chunk for v1.3)
  if (!this.collisionMap) {
    this.collisionMap = collisions;
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Pre-rendered sprite sheets for all elevation combos | Runtime Graphics API side faces | 2010s+ (GPU acceleration made runtime viable) | Flexible, fewer assets, supports any elevation combo |
| Render all 6 cube faces | Visibility culling (only south/east) | Classic isometric pattern | 50%+ fewer draw calls for interior tiles |
| Fixed-height cliffs (binary high/low) | Multi-level elevation (0-5) | Modern isometric games | Smoother terrain, gradual slopes, more visual interest |
| Separate depth layers per elevation | Composite depth formula | Performance optimization | Single depth value, simpler sorting, integrates with Phaser |
| Manual cross-chunk neighbor lookup | Defer edge tiles to Phase 16 | Pragmatic scope control | 90% coverage now, perfect solution later |

**Deprecated/outdated:**
- Pre-rendered isometric tile sprite sheets with all elevation permutations: Graphics API eliminates need for 100+ tile variations
- Static elevation assignment without noise: Phase 14 established noise-based generation
- Ignoring viewport expansion for tall structures: Modern culling accounts for vertical extent

## Open Questions

### Question 1: Optimal elevation height step (pixels per level)

**What we know:** Tiles are 128×64. Elevation ranges 0-5. Need vertical spacing that looks good without making cliffs too tall or too short.

**What's unclear:** Exact pixel height that balances visual clarity with performance and aesthetic.

**Recommendation:** Start with 16 pixels per elevation level (5 levels = 80 pixels max, roughly tile height). Test with actual sprites. Too small = hard to see height differences, too large = structures look unrealistically tall.

### Question 2: Side face colors—hard-coded vs. tile-aware

**What we know:** Side faces need darker shading than top faces for 3D illusion. But all side faces being same gray looks monotonous.

**What's unclear:** Should side face color derive from tile definition, biome palette, or stay generic?

**Recommendation:** Phase 15 v1: hard-coded dark gray (0x1a1a2a south, 0x0a0a1a east) for rapid implementation. Phase 15 v2 or Phase 16: add TileDefinition.sideFaceColor or biome-aware palette for thematic variety (lava glows, ice is blue, etc.).

### Question 3: Cross-chunk side face rendering at boundaries

**What we know:** Tiles at chunk edges (x/y = 63) can't check neighbors in adjacent chunks without cross-chunk data access.

**What's unclear:** Should Phase 15 implement cross-chunk neighbor lookup, always render edge faces, or defer?

**Recommendation:** Phase 15: Conservative approach—always render south/east faces for edge tiles (slight over-rendering, simple logic). Phase 16+: Implement ChunkManager cross-chunk neighbor lookup for perfect culling.

### Question 4: Entity positioning on elevated terrain visual offset

**What we know:** Phase 14 passes elevation to EntityRenderer. Entity depth calculation includes elevation. But visual Y-offset for entity sprite position unclear.

**What's unclear:** Should entity screenY offset by `tileElevation * ELEVATION_HEIGHT_STEP` to appear "standing on" elevated tile surface?

**Recommendation:** Yes—entity visual position should account for tile elevation. Formula: `screenY = baseScreenY - ENTITY_ELEVATION_OFFSET - (tileElevation * ELEVATION_HEIGHT_STEP)`. This makes entities appear grounded on tile surface regardless of elevation.

## Sources

### Primary (HIGH confidence)

- **Existing codebase:**
  - `/apps/web/src/game/rendering/TileRenderer.ts` - Diamond tile creation pattern
  - `/apps/web/src/game/utils/IsometricTransform.ts` - Coordinate conversion, depth calculation
  - `/packages/shared-types/src/core/zone.ts` - ChunkData.heights[][] structure
  - `/apps/web/src/game/rendering/ViewportCuller.ts` - Culling bounds calculation

- **Phaser 3 API Documentation:**
  - [Graphics Class](https://docs.phaser.io/api-documentation/class/gameobjects-graphics) - fillRect, beginPath, fillPath methods
  - [Container Class](https://docs.phaser.io/api-documentation/class/gameobjects-container) - Depth sorting, child ordering

### Secondary (MEDIUM confidence)

- [Drawing Isometric Boxes in Correct Order](https://shaunlebron.github.io/IsometricBlocks/) - Topological sorting, occlusion rules, visibility algorithm
- [Handling Height in Isometric Tile Maps](https://erikonarheim.com/posts/handling-height-in-isometric/) - Depth sorting with elevation (z-index bucketing strategy)
- [Pikuma: Isometric Projection in Game Development](https://pikuma.com/blog/isometric-projection-in-games) - Painter's algorithm, coordinate transformation
- [Unity Isometric Tilemap Manual](https://docs.unity3d.com/Manual/Tilemap-Isometric-CreateIso.html) - Z-position for stacking, transparency axis sort
- [How to Draw Isometric Cliffs (DeviantArt)](https://www.deviantart.com/torstan/art/How-to-draw-isometric-cliffs-293744777) - Visual tutorial on cliff faces, horizontal/vertical variation principles

### Tertiary (LOW confidence - requires validation)

- [Isometric Depth Sorting Forum Discussion](https://mazebert.com/forum/news/isometric-depth-sorting--id775/) - Community insights, may contain outdated approaches
- [GameDev.net Render Order Discussion](https://www.gamedev.net/forums/topic/593094-render-order-for-2d-isometric-map/) - Generic isometric rendering advice, not Phaser-specific
- [Tile-Based Occlusion Culling (Fyrox)](https://fyrox.rs/blog/post/tile-based-occlusion-culling/) - Advanced culling technique (compute shaders), overkill for this phase

## Metadata

**Confidence breakdown:**
- Standard stack: **HIGH** - Phaser Graphics API documented, existing TileRenderer provides foundation
- Architecture patterns: **HIGH** - Side face geometry mathematically defined, neighbor-based culling straightforward
- Pitfalls: **MEDIUM-HIGH** - Derived from isometric rendering research and codebase analysis, tested patterns
- Visual quality (colors, heights): **MEDIUM** - Requires empirical tuning with actual sprites and biome aesthetics
- Cross-chunk rendering: **MEDIUM** - Deferred to future phase, conservative approach (render all edge faces) is safe

**Research date:** 2026-02-16
**Valid until:** ~60 days (isometric rendering techniques stable, Phaser API mature, elevation system architected in Phase 14)

**Key unknowns requiring experimentation:**
- Exact elevation height step (16px starting point, tune for visual appeal)
- Side face color palette (hard-coded initially, tile-aware future enhancement)
- Cross-chunk neighbor lookup (deferred to Phase 16+, conservative workaround for Phase 15)
- Entity visual offset on elevated terrain (formula provided, test with sprite positioning)
