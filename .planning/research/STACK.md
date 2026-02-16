# Technology Stack: Isometric Rendering in Phaser 3

**Project:** Into the Void v1.2 - Isometric View Transformation
**Researched:** 2026-02-16
**Confidence:** HIGH

## Executive Recommendation

**Use native Phaser 3 coordinate transforms + built-in depth sorting.** Roll your own isometric math with Phaser's existing rendering pipeline. Do NOT add phaser3-plugin-isometric (unmaintained since 2018).

## Recommended Stack

### Core Framework
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Phaser | 3.80.0 → 3.90.0 | Game engine | Already integrated. Upgrade to 3.90.0 for latest tilemap features and stability |
| Native Phaser Tilemaps | 3.50+ | Isometric tilemap support | Built-in since 3.50.0, handles isometric orientation natively |
| Custom coordinate utils | N/A | Cartesian ↔ Isometric transforms | Simple 2:1 dimetric math, 20-30 LOC, full control |

### Supporting Libraries
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| N/A | - | - | None needed for isometric transform |

## Rationale

### Why Native Phaser + Custom Utils?

**1. Plugin is unmaintained**
- `phaser3-plugin-isometric` last published 2018-12-12 (v0.0.7)
- No updates in 6+ years, marked as "Inactive" by npm
- Phaser 3 has added native isometric support since 3.50.0 (2020-12)
- Plugin predates Phaser's built-in isometric features

**2. Simple math, unnecessary dependency**
The coordinate transform for 2:1 isometric is straightforward:
```typescript
// Cartesian → Isometric
isoX = (cartX - cartY) * tileWidthHalf
isoY = (cartX + cartY) * tileHeightHalf

// Isometric → Cartesian
cartX = (isoX / tileWidthHalf + isoY / tileHeightHalf) / 2
cartY = (isoY / tileHeightHalf - isoX / tileWidthHalf) / 2
```
This is 20-30 LOC vs. adding an unmaintained 3rd-party plugin. For a monorepo with existing `@into-the-void/game-logic` package, this math belongs there.

**3. Depth sorting is built-in**
Phaser 3's `setDepth()` handles z-ordering perfectly for isometric:
```typescript
sprite.setDepth(centerY + (x + y) * tileHeightHalf)
```
Official Phaser examples use this pattern. No plugin needed.

**4. Project already uses Phaser 3.80.0**
Existing integration at 3.80.0 (released 2024). Native isometric support has been stable since 3.50.0 (2020). No breaking changes expected in upgrade to 3.90.0.

**5. Multiplayer constraints**
- Game logic stays in Cartesian coordinates (world data, collision, movement)
- Only rendering layer converts to isometric for display
- Plugin abstracts too much, makes server/client coordinate sync harder
- Custom utils give explicit control over conversion boundaries

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Coordinate Transform | Custom utils | phaser3-plugin-isometric | Unmaintained (2018), predates native features, overkill for simple math |
| Tilemap Support | Native Phaser Tilemaps (3.50+) | Plugin tilemaps | Native support is official, maintained, documented |
| Depth Sorting | `setDepth()` + formula | Plugin z-ordering | Native method works, examples exist, simpler |
| 3D Physics | None (tile-based) | Plugin Arcade 3D | Not needed - world logic stays 2D Cartesian |

### Why Not phaser3-rex-plugins?

phaser3-rex-plugins is actively maintained (v1.80.18, published 13 days ago) but does NOT include isometric features. It's a UI/component library (buttons, grids, text effects), not isometric rendering. Irrelevant to this milestone.

### Why Not @koreez/phaser3-isometric-plugin?

Alternative fork of the isometric plugin, but also unmaintained and unnecessary given native Phaser features.

## Implementation Approach

### 1. Upgrade Phaser (Low Risk)
```bash
pnpm add phaser@^3.90.0
```
**Why:** Latest stable (3.90.0 released 2026), includes all isometric features from 3.50.0+. Project currently on 3.80.0.

**Risk:** Minimal. Phaser maintains backward compatibility. Upgrade path is well-tested.

### 2. Create Coordinate Utils in `@into-the-void/game-logic`
```typescript
// packages/game-logic/src/isometric/coordinates.ts
export interface IsoConfig {
  tileWidth: number;   // 96 for existing sprites
  tileHeight: number;  // 48 for 2:1 dimetric
}

export function cartesianToIsometric(
  cartX: number,
  cartY: number,
  config: IsoConfig
): { isoX: number; isoY: number }

export function isometricToCartesian(
  isoX: number,
  isoY: number,
  config: IsoConfig
): { cartX: number; cartY: number }

export function calculateDepth(
  cartX: number,
  cartY: number,
  config: IsoConfig,
  centerY: number
): number
```

**Why here:** Shared logic package, can be tested in isolation, used by both client rendering and (if needed) server validation.

### 3. Integrate into Existing Rendering Pipeline
Modify:
- `apps/web/src/game/rendering/EntityRenderer.ts` - Apply transform when positioning sprites
- `apps/web/src/game/scenes/WorldScene.ts` - Configure isometric camera/viewport
- `apps/web/src/game/rendering/ChunkManager.ts` - Transform chunk positions
- Keep world data in Cartesian, convert only at render time

### 4. Depth Sorting Pattern
Use Phaser's official example pattern from [Isometric Blocks example](https://phaser.io/examples/v3.85.0/depth-sorting/view/isometric-blocks):
```typescript
const ty = (x + y) * tileHeightHalf;
sprite.setDepth(centerY + ty);
```

This ensures proper z-ordering for diamond tiles without sorting arrays every frame.

## Installation

### Phase Start
```bash
# Upgrade Phaser to latest stable
pnpm add phaser@^3.90.0
```

### No Additional Dependencies
All isometric functionality uses native Phaser + custom coordinate math in existing `@into-the-void/game-logic` package.

## Confidence Assessment

### HIGH Confidence
- **Phaser version:** 3.90.0 confirmed as latest (npm view phaser version)
- **Native isometric support:** Phaser 3.50.0+ has built-in tilemap isometric orientation ([Release Notes](https://phaser.io/news/2020/12/phaser-350-released))
- **Depth sorting pattern:** Official examples demonstrate `setDepth()` formula ([Isometric Blocks](https://phaser.io/examples/v3.85.0/depth-sorting/view/isometric-blocks), [Isometric Map](https://phaser.io/examples/v3.85.0/depth-sorting/view/isometric-map))

### MEDIUM Confidence
- **Plugin maintenance status:** Marked "Inactive" on npm ([Snyk Advisor](https://snyk.io/advisor/npm-package/phaser3-plugin-isometric)), last publish 2018-12-12
- **Coordinate math simplicity:** Community consensus that transform is straightforward ([Medium article](https://tnodes.medium.com/creating-an-isometric-view-in-phaser-3-fada95927835), [Phaser forums](https://phaser.discourse.group/t/isometric-support/558))

### LOW Confidence (needs validation)
- **Performance of depth sorting per-frame:** Not measured. May need optimization if entity count > 1000s
- **Phaser 3.80 → 3.90 breaking changes:** Assume none based on Phaser's compatibility history, but should verify in testing

## Open Questions

1. **Minimap rendering:** Does minimap stay top-down or also convert to isometric? (Design decision, not research)
2. **Camera bounds:** How do isometric camera bounds map to Cartesian world bounds? (Implementation detail)
3. **Click-to-move:** How to convert mouse position → isometric → Cartesian tile coordinates? (Covered by `isometricToCartesian` util)

## Key Findings Summary

1. **No plugin needed:** Phaser 3.50+ has native isometric tilemap support
2. **Roll your own math:** Coordinate transforms are simple (20-30 LOC), custom utils give control
3. **Depth sorting built-in:** Use `setDepth()` with formula from official examples
4. **Plugin unmaintained:** phaser3-plugin-isometric hasn't been updated since 2018
5. **Current version OK:** Phaser 3.80.0 → 3.90.0 upgrade is low-risk, adds stability

## Verification Sources

**Native Phaser Support:**
- [Phaser 3.50.0 Released](https://phaser.io/news/2020/12/phaser-350-released)
- [Phaser Editor 2D v3.10.0 - Isometric Tilemaps](https://phasereditor2d.com/blog/2020/12/phaser-editor-2d-v3100-released-phaser-350-layer-isometric-tilemaps)
- [Phaser Examples - Create Isometric Manually](https://phaser.io/examples/v3.85.0/tilemap/isometric/view/create-isometric-manually)
- [Tilemap API Documentation](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap)

**Depth Sorting:**
- [Phaser Examples - Isometric Blocks](https://phaser.io/examples/v3.85.0/depth-sorting/view/isometric-blocks)
- [Phaser Examples - Isometric Map](https://phaser.io/examples/v3.85.0/depth-sorting/view/isometric-map)
- [Phaser Depth Sorting Category](https://phaser.io/examples/v3/category/depth-sorting)

**Plugin Maintenance:**
- [phaser3-plugin-isometric on npm](https://www.npmjs.com/package/phaser3-plugin-isometric)
- [Snyk Advisor - phaser3-plugin-isometric](https://snyk.io/advisor/npm-package/phaser3-plugin-isometric)
- [sebashwa/phaser3-plugin-isometric GitHub](https://github.com/sebashwa/phaser3-plugin-isometric)

**Coordinate Math:**
- [Creating an Isometric View in Phaser 3](https://tnodes.medium.com/creating-an-isometric-view-in-phaser-3-fada95927835)
- [Phaser - Creating An Isometric View in Phaser 3](https://phaser.io/news/2020/07/creating-an-isometric-view-in-phaser-3)
- [IsometricWorldToTileXY API Docs](https://newdocs.phaser.io/docs/3.54.0/focus/Phaser.Tilemaps.Components.IsometricWorldToTileXY)

**Community Discussion:**
- [Isometric Support - Phaser 3 Forum](https://phaser.discourse.group/t/isometric-support/558)
- [Automatic Isometric Depth Sorting Help](https://phaser.discourse.group/t/automatic-isometric-depth-sorting-and-collisions-help/9656)
- [Phaser 3.5 Isometric Demo Discussion](https://phaser.discourse.group/t/phaser-3-5-isometric-demo-how-to-continue/8543)
