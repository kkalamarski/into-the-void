# Stack Research: Elevation & Structures

**Domain:** Isometric tile elevation and structure rendering
**Researched:** 2026-02-16
**Confidence:** HIGH

## Executive Summary

Adding terrain elevation (height levels 0-5), side-face rendering, and structure walls to the existing Phaser 3 isometric game requires NO new external dependencies. Phaser 3.90.0 includes native IsoBox and IsoTriangle geometry for rendering elevated tile faces, and the existing TypeScript/Phaser stack is sufficient. The main architectural additions are: (1) extending the tile definition system with elevation metadata and rendering hooks, (2) using Phaser's native isometric geometry for side faces, and (3) enhancing depth sorting to account for vertical layering.

## Recommended Stack

### Core Framework (No Changes)

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Phaser | 3.90.0 (current) | Game engine with native isometric geometry | Built-in IsoBox/IsoTriangle provides side-face rendering without plugins. Already proven in existing isometric implementation. |
| TypeScript | 5.4.0 (current) | Type-safe tile definitions | Current version sufficient. Type registry pattern for TileDefinition scales well with metadata additions. |

**Recommendation:** Continue using existing Phaser 3.90.0. No upgrades needed.

### New Architecture Components (No External Dependencies)

| Component | Purpose | Implementation |
|-----------|---------|----------------|
| TileDefinition Registry | Centralized tile metadata with elevation + rendering hooks | TypeScript type registry pattern with interface extension. Each TileId gets definition object with height, walkable, renderHooks. |
| Elevation-Aware Depth Sorter | Depth calculation including vertical offset | Extend existing IsometricTransform.calculateDepth() to include elevation parameter. Formula: `screenY + (elevation * elevationStep) + gridX * 0.0001`. |
| Side Face Renderer | Render vertical tile faces using IsoBox | New TileSideFaceRenderer class using Phaser's native `scene.add.isobox()` for elevated terrain sides. |
| Structure Wall System | Walls as elevated tiles with specific definitions | Reuse TileDefinition registry with wall-specific metadata (facing, height, blocking). |

### Supporting Libraries (Existing)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @into-the-void/world-gen | current | Procedural generation with elevation data | Already has TileId enum. Extend to generate elevation values (0-5) per tile. |
| @into-the-void/game-logic | current | Movement validation with elevation | Extend pathfinding to respect elevation changes (max climb height per move). |

### Development Tools (No Changes)

| Tool | Purpose | Notes |
|------|---------|-------|
| Phaser Dev Tools | Runtime inspection | Use `scene.game.debug` to visualize elevation values and depth calculations. |

## What Already Exists

The project has validated isometric capabilities that DO NOT need re-implementation:

| Existing Component | Coverage |
|--------------------|----------|
| IsometricTransform | Grid-to-screen conversion for 128x64 tiles (2:1 ratio) |
| DepthSorter | Throttled depth updates with dirty tracking (100ms interval) |
| TileRenderer | Diamond tile rendering with color fallbacks |
| Phaser 3.90.0 | IsoBox and IsoTriangle geometry for side faces |

**Critical:** These are already working. Focus ONLY on elevation extensions, not rebuilding isometric basics.

## Installation

NO new packages required. All capabilities exist in current stack.

```bash
# Verify Phaser version includes isometric geometry
npm list phaser  # Should show 3.90.0 or higher

# No additional dependencies needed
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Phaser native IsoBox/IsoTriangle | phaser3-plugin-isometric | NEVER. Plugin adds complexity, predates Phaser's native isometric support (added in 3.50). Native API is simpler and maintained by core team. |
| Type registry pattern | Class inheritance hierarchy | If tile behaviors become complex enough to warrant strategy pattern per type. Current metadata approach cleaner for declarative definitions. |
| Extend calculateDepth() | Separate elevation sorter | NEVER. Elevation is fundamentally part of depth. Splitting creates synchronization issues. |
| Graphics.fillRect for side faces | Pre-rendered sprite sheets | When adding sprite art. Graphics approach correct for placeholder phase. Sprite sheets later via texture atlas (no architecture change). |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| phaser3-plugin-isometric | Deprecated pattern, predates native Phaser 3.50+ isometric support | Phaser's native IsoBox/IsoTriangle geometry |
| Three.js or Babylon.js | Massive overkill for 2.5D isometric. Increases bundle size 10x+ for no benefit. | Phaser native isometric geometry |
| Custom depth buffer | Painter's algorithm with proper depth calculation is sufficient for 2.5D isometric. | Enhanced calculateDepth() with elevation parameter |
| Separate ECS system for tiles | Over-engineering. Tiles are static rendering primitives, not entities with behaviors. | TileDefinition registry with metadata |
| Dynamic tile height changes | Requires re-rendering entire elevation faces, causes performance issues. | Static elevation per tile (set during world generation) |

## Stack Patterns by Feature

### Terrain Elevation (Height Levels 0-5)

**Pattern:** Elevation as tile metadata + depth calculation enhancement

```typescript
// Extend TileDefinition with elevation
interface TileDefinition {
  id: TileId;
  elevation: number; // 0-5
  walkable: boolean;
  renderHook?: (renderer: TileRenderer, x: number, y: number, elevation: number) => void;
}

// Enhance depth calculation
calculateDepth(gridX: number, gridY: number, elevation: number, priorityBoost: number = 0): number {
  const screen = this.gridToScreen(gridX, gridY);
  const elevationStep = this.tileHeight; // 64px per elevation level
  return screen.y + (elevation * elevationStep) + gridX * 0.0001 + priorityBoost;
}
```

**Why:** Minimal change to existing depth sorter. Elevation becomes input parameter, not separate system.

### Side Face Rendering

**Pattern:** Phaser IsoBox for elevated tile faces

```typescript
// In TileSideFaceRenderer
renderSideFaces(x: number, y: number, elevation: number): void {
  if (elevation === 0) return; // No sides for ground level

  const screenPos = this.isoTransform.gridToScreen(x, y);
  const faceHeight = elevation * this.isoTransform.tileHeight;

  // Native Phaser geometry
  const isoBox = this.scene.add.isobox(
    screenPos.x,
    screenPos.y,
    this.isoTransform.tileWidth,
    faceHeight,
    0xSIDECOLOR
  );
  isoBox.setDepth(screenPos.y - 1); // Render behind tile top
}
```

**Why:** IsoBox provides three faces (left, right, top) with individual colors. No custom polygon math needed.

### Structure Walls

**Pattern:** Walls as TileDefinitions with wall-specific metadata

```typescript
interface WallDefinition extends TileDefinition {
  wallHeight: number; // 1-3 (in elevation units)
  facing: 'N' | 'S' | 'E' | 'W'; // For texture/shadow direction
  blocking: boolean; // Always true for walls
}

// Wall tiles in TileId enum
enum TileId {
  // ... existing tiles
  WALL_METAL_N = 100,
  WALL_METAL_E = 101,
  // etc.
}
```

**Why:** Reuses TileDefinition registry. Walls are just tiles with specific elevation and blocking rules.

### TileDefinition Registry

**Pattern:** TypeScript type registry with factory pattern

```typescript
// Registry with all definitions
export const TILE_DEFINITIONS: Record<TileId, TileDefinition> = {
  [TileId.VOID_FLOOR]: {
    id: TileId.VOID_FLOOR,
    elevation: 0,
    walkable: true,
  },
  [TileId.ELEVATED_PLATFORM]: {
    id: TileId.ELEVATED_PLATFORM,
    elevation: 2,
    walkable: true,
    renderHook: renderPlatformWithSides,
  },
  // ... more definitions
};

// Hook pattern for custom rendering
function renderPlatformWithSides(
  renderer: TileRenderer,
  x: number,
  y: number,
  elevation: number
): void {
  renderer.renderTileTop(x, y, elevation, 0x4a4a5a);
  renderer.renderSideFaces(x, y, elevation);
}
```

**Why:** Centralized definitions scale better than scattered logic. Hooks provide flexibility for special-case rendering without inheritance complexity.

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| phaser@3.90.0 | TypeScript 5.4.0 | Native IsoBox/IsoTriangle added in 3.50, stable in 3.90. Full TypeScript definitions included. |
| @into-the-void/world-gen | Elevation data generation | Needs extension to generate elevation values (0-5) per tile. Compatible with existing noise-based generation. |
| @into-the-void/game-logic | Movement with elevation | Pathfinding needs elevation cost function (e.g., max 1 elevation change per move). A* algorithm unchanged. |

## Integration Points

### World Generation (@into-the-void/world-gen)

**Extend:** Add elevation to tile generation output.

```typescript
interface GeneratedTile {
  x: number;
  y: number;
  tileId: TileId;
  elevation: number; // NEW: 0-5 based on noise + biome rules
}
```

**Impact:** Minimal. Elevation calculated from existing noise functions. Biomes define elevation ranges (e.g., Crater = 0-2, Ruins = 0-5).

### Game Logic (@into-the-void/game-logic)

**Extend:** Movement validation includes elevation change cost.

```typescript
// In pathfinding
function isTraversable(from: Tile, to: Tile): boolean {
  const elevationDiff = Math.abs(to.elevation - from.elevation);
  return to.walkable && elevationDiff <= 1; // Max 1 level climb per move
}
```

**Impact:** Minimal. A* cost function adds elevation check. No algorithm changes.

### Rendering (apps/web/src/game/rendering)

**Extend:** TileRenderer gets side face rendering, IsometricTransform gets elevation parameter.

**Impact:** Moderate. Core rendering loop unchanged, but tile rendering expands from single diamond to diamond + side faces for elevated tiles.

### Database (@into-the-void/database)

**Extend:** Zone data schema includes elevation per tile.

```sql
-- Add elevation column to tiles or zones table
ALTER TABLE zone_data ADD COLUMN elevation SMALLINT DEFAULT 0;
```

**Impact:** Minimal. Storage increase: ~1 byte per tile. 1000x1000 zone = +1MB.

## Performance Considerations

| Concern | Mitigation |
|---------|------------|
| Increased draw calls (side faces) | Use Phaser's IsoBox which batches in WebGL. Only render side faces for elevated tiles (elevation > 0). Viewport culling already in place. |
| Depth sorting overhead | Elevation adds one multiplication to depth calculation. Negligible. Existing DepthSorter throttling (100ms) still applies. |
| Memory for TileDefinition registry | Registry is static constants, loaded once. ~1KB total for 50-100 tile types. Negligible. |
| Side face graphics memory | Each IsoBox is a batched geometry, not individual sprites. Memory scales with visible elevated tiles, not total tiles. Viewport culling limits to ~200-500 visible tiles. |

## Sources

### Phaser 3 Capabilities (HIGH CONFIDENCE)

- [Phaser Releases](https://github.com/phaserjs/phaser/releases) - v3.90.0 confirmed as latest stable (May 2025)
- [IsoTriangle API Documentation](https://docs.phaser.io/api-documentation/class/gameobjects-isotriangle) - Face control and rendering properties
- [IsoBox API Documentation](https://newdocs.phaser.io/docs/3.55.2/focus/Phaser.GameObjects.GameObjectFactory-isobox) - Isometric box geometry for side faces
- [Phaser Texture Documentation](https://docs.phaser.io/phaser/concepts/textures) - Texture atlas management

### Isometric Elevation Techniques (MEDIUM CONFIDENCE)

- [Handling Height in Isometric Tile Maps](https://erikonarheim.com/posts/handling-height-in-isometric/) - Elevation-based z-index sorting, depth calculation formulas
- [GameDev.net: 2D Terrain with Elevation](https://www.gamedev.net/forums/topic/622604-2d-terrain-with-elevation/4967223/) - Vertical offset techniques
- [Pikuma: Isometric Projection](https://pikuma.com/blog/isometric-projection-in-games) - Painter's algorithm for depth sorting

### TypeScript Patterns (HIGH CONFIDENCE)

- [Frontend Masters: Type Registry Pattern](https://frontendmasters.com/courses/typescript-v4/type-registry-pattern/) - TypeScript registry pattern for typed definitions
- [Design Patterns in TypeScript](https://refactoring.guru/design-patterns/typescript) - Factory and registry patterns
- [MDN: Tilemaps Overview](https://developer.mozilla.org/en-US/docs/Games/Techniques/Tilemaps) - General tile definition architecture

### Verified Against

- Existing codebase: IsometricTransform (gridToScreen, calculateDepth), DepthSorter (throttled updates), TileRenderer (diamond rendering)
- Phaser 3.90.0 installed in package.json (verified via `/Users/krzysztof.kalamarski/Projects/into-the-void/package.json`)

---
*Stack research for: Elevation & Structures Milestone*
*Researched: 2026-02-16*
*Confidence: HIGH - Phaser capabilities verified via official docs, existing isometric implementation reviewed, no new external dependencies required*
