# Phase 126: Procedural Terrain Cubes - Research

**Researched:** 2026-03-17
**Status:** Complete

## Current Architecture

### Tile Rendering Pipeline
The rendering pipeline is:
1. **PreloadScene** (`apps/web/src/game/scenes/PreloadScene.ts`) loads PNG tile sprites from `assets/sprites/` during preload, plus generates a few procedural textures (player fallback, creature/mineral/plant fallbacks) via `Phaser.Graphics.generateTexture()`.
2. **WorldScene** (`apps/web/src/game/scenes/WorldScene.ts`) receives chunk data from the game-server and calls `renderChunk()` which iterates over tiles calling `TileRenderer.createTileWithElevationWorld()`.
3. **TileRenderer** (`apps/web/src/game/rendering/TileRenderer.ts`) creates tiles as `Phaser.GameObjects.Container` with either:
   - A 256x256 PNG sprite (Image) if the texture exists and is valid cube format, OR
   - A **fallback procedural cube** drawn with `Phaser.GameObjects.Graphics` — this already draws 3 faces (top diamond, south face, east face) with shading.

### Key Constants
- `SPRITE_SIZE = 256` — all tile sprites are 256x256 isometric cubes
- `SPRITE_ORIGIN_X = 0.5, SPRITE_ORIGIN_Y = 0.25` — origin at top diamond center (128, 64)
- `ELEVATION_HEIGHT_STEP = 128` — pixels per elevation level
- `ELEVATION_TINT_BASE = 0.55, ELEVATION_TINT_STEP = 0.15` — brightness formula: `min(1.0, 0.55 + elevation * 0.15)`
- `SHADOW_TINT_FACTOR = 0.85` — 15% darken when adjacent to higher elevation
- `VARIANT_WEIGHTS = [0.7, 0.2, 0.1]` — base/v2/v3 variant probability

### Fallback Cube (current procedural code)
`createFallbackCube()` at line 430 already implements the 3-face isometric cube:
- Top face: base color from `TileRegistry.get(id).color`
- South face (left): base color * 0.6 brightness
- East face (right): base color * 0.4 brightness
- Uses `Phaser.GameObjects.Graphics` — NOT baked to GPU texture

### Elevation Tinting
`applyElevationTint()` at line 290 applies brightness tint via `Image.setTint()`:
- Only works on `Phaser.GameObjects.Image` sprites — **does NOT work on Graphics objects**
- Adjacent shadow: `isAdjacentToHigherElevation()` darkens tiles next to cliffs by 15%
- Edge highlights: `drawElevationEdge()` draws dark lines at invisible cliff edges (north/west)

### Variant Selection
`createCubeSprite()` at line 387 uses `seededRandom(x, y)` for deterministic variant selection per world coordinate. The hash function: `seed = x * 374761393 + y * 668265263`.

### Chunk Lifecycle
- `ChunkManager` manages 3x3 grid around player
- `renderChunk()` creates tiles for a 32x32 zone (ZONE_SIZE = 32)
- Each tile = 1 Container + 1 child (Image or Graphics)
- **Total objects per chunk: ~1024 containers + ~1024 children = ~2048 game objects**
- `unloadChunkContainer()` destroys all children and containers on unload

### Tile Definitions (30 total)
All tile definitions live in `packages/tiles/src/definitions/`:
- **16 biomes** with 2 tile types each (floor + wall/feature) = 30 tiles total (plus `portal`)
- Each definition has: `id`, `color`, `isBlocking`, `movementSpeed`, `defaultElevation`
- Colors are hex numbers (e.g., `0x1a1a2e` for void_floor)

### Biome-to-Tile Mapping
Each biome has exactly 2 tile types:
| Biome | Floor Tile | Feature/Wall Tile |
|-------|-----------|-------------------|
| void_plains | void_floor (0x1a1a2e) | void_wall (0x4a2a6a) |
| crystal_caves | crystal_floor (0x2a3a4a) | crystal_formation (0x6abaee) |
| toxic_wastes | toxic_floor (0x5c4033) | toxic_pool (0xaacc22) |
| ancient_ruins | ruins_floor (0x555544) | ruins_wall (0xaa8866) |
| frozen_expanse | ice_floor (0x8ac8e8) | ice_wall (0xcceeff) |
| volcanic_ridge | volcanic_floor (0x3a2020) | lava (0xff4422) |
| fungal_forest | fungal_floor (0x2a3a2a) | fungal_growth (0xaa55cc) |
| starfall_crater | crater_floor (0x222233) | crater_debris (0x445566) |
| miasma_marshes | (uses toxic_floor) | (uses toxic_pool) |
| petrified_expanse | (uses ruins_floor) | (uses ruins_wall) |
| tidal_pools | tidal_floor (0xc2b280) | tidal_shallow (0x87ceeb) |
| kelp_forests | kelp_floor (0x2e8b57) | kelp_wall (0x006400) |
| deep_trenches | trench_floor (0x000080) | trench_deep (0x00001a) |
| void_rift | void_rift_floor (0x4a0080) | void_rift_distortion (0x6a00a0) |
| crystalline_wastes | crystalline_floor (0xadd8e6) | crystal_formation_large (0x87ceeb) |
| bioluminescent_depths | bioluminescent_floor (0x00ff88) | bioluminescent_flora (0x00cc66) |

### PNG Assets Currently Loaded
- Floor tiles: 6 biomes with base + v2 + v3 = 18 PNGs
- Void tiles: spritesheet (2 frames) + 2 variant PNGs
- Crystal tiles: spritesheet (4 frames)
- Feature tiles: 6 individual PNGs
- Aquatic/exotic tiles: NO PNGs loaded (only fallback cubes)

## Technical Approach

### Strategy: generateTexture() Bake
The plan is to replace PNG loading AND the live Graphics fallback with **procedurally drawn cubes baked to GPU textures** via `Phaser.Graphics.generateTexture()`. This approach:
1. Draws cube geometry (top + south + east faces) with accent details using Graphics API
2. Calls `generateTexture(key, 256, 256)` to create a GPU-backed texture
3. Uses `scene.add.image(0, 0, key)` to render — same as current PNG path
4. Elevation tinting via `Image.setTint()` works natively (unlike Graphics)
5. Per-tile draw calls = 1 image blit (GPU-accelerated, same as PNG sprites)

### Bake Timing
Textures should be generated in **PreloadScene** (or a new init step) before WorldScene starts. This avoids:
- Mid-gameplay lag from texture generation
- Need to regenerate textures on chunk load

### Variant System
- Use `seededRandom(x, y)` (already exists) for deterministic variant selection
- Generate 3 variants per floor tile type: `tile_void_floor_proc`, `tile_void_floor_proc_v2`, `tile_void_floor_proc_v3`
- Wall/feature tiles: 1-2 variants sufficient (they're less common)
- Total procedural textures to generate: ~30 tile types x 2-3 variants = ~60-90 textures

### Accent Detail Drawing
Accent details are drawn on the Graphics canvas before calling `generateTexture()`:
- **Top face**: Surface features (grass blades, sand ripples, cracks, etc.)
- **South face**: Cross-section continuation (dirt layers, rock strata)
- **East face**: Cross-section with shadow (darker version of south details)
- Details use `fillRect()`, `fillCircle()`, `lineTo()` paths — low-cost at generation time
- For deterministic variety, use different `seededRandom` offsets per variant

### Color Palette Structure
Each tile type needs a palette:
```typescript
interface TilePalette {
  top: number;      // Top face base color
  south: number;    // South face (lit side) — top * 0.6-0.7 brightness
  east: number;     // East face (shadow side) — top * 0.35-0.45 brightness
  accent: number;   // Accent detail color (contrasting)
}
```
Palettes derived from existing `TileDefinition.color` values, pushed more vibrant per CONTEXT.md (Hyper Light Drifter reference).

### Elevation Tinting Preservation
Current `applyElevationTint()` uses `Image.setTint()` which applies a multiplicative color. Since baked textures produce `Phaser.GameObjects.Image` objects, elevation tinting works without changes. The formula: `brightness = min(1.0, 0.55 + elevation * 0.15)` is preserved as-is.

## Risk Assessment

### Performance
- **Current**: 9 chunks loaded x 1024 tiles = ~9216 tile containers + children
- **After**: Same count but all `Image` objects (no Graphics mix) — actually simpler for GPU
- `generateTexture()` creates canvas-backed textures — same GPU path as PNG sprites
- Risk: ~60-90 generateTexture() calls during preload — each takes <1ms, total <100ms

### Memory
- Each 256x256 RGBA texture = 256KB
- 90 textures = ~23MB VRAM — well within WebGL limits
- This is similar to current PNG memory footprint

### Compatibility
- `generateTexture()` works in both WebGL and Canvas renderers
- No shader or postFX dependency (those come in later phases)

## Files to Modify

### Primary
1. **`apps/web/src/game/rendering/TileRenderer.ts`** — Replace `createFallbackCube()` with palette-based procedural cube system; update `createCubeSprite()` to use generated procedural textures instead of PNG lookup
2. **`apps/web/src/game/scenes/PreloadScene.ts`** — Add procedural texture generation step in `loadAssets()` or `create()`, replacing PNG floor tile loading

### New Files
3. **`apps/web/src/game/rendering/ProceduralTileGenerator.ts`** — New module encapsulating: tile palettes, accent detail drawing functions, and `generateTexture()` bake logic. Keeps TileRenderer clean.

### Secondary
4. **`packages/tiles/src/types.ts`** — Potentially extend `TileDefinition` with palette data (or keep palettes client-side only since they're rendering-only data)

### No Changes Needed
- `ChunkManager.ts` — Chunk lifecycle unchanged
- `WorldScene.ts` — `renderChunk()` calls same TileRenderer API
- `packages/tiles/src/definitions/*.ts` — Existing color values serve as seed for palette generation
- `packages/world-gen/` — Terrain generation unchanged

## Requirement Mapping

| Requirement | Implementation |
|-------------|---------------|
| TERR-01 | Replace createFallbackCube and PNG path with procedural 3-face cubes |
| TERR-02 | Define per-biome color palettes with vibrant, distinct hues |
| TERR-03 | Draw accent details on all 3 cube faces before baking |
| TERR-04 | Use seededRandom(x, y) for variant selection (already exists) |
| TERR-05 | Elevation tinting preserved — Image.setTint() works on baked textures |
| TERR-06 | Use Graphics.generateTexture() to bake cubes as GPU textures |

## RESEARCH COMPLETE
