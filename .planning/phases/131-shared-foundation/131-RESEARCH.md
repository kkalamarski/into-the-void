# Phase 131: Shared Foundation - Research

**Researched:** 2026-03-17
**Domain:** TypeScript shared infrastructure — coordinate types, pixel math constants, movement math
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **Pixel scale**: Claude's discretion on exact TILE_SIZE_PX — pick based on existing camera zoom, sprite rendering, and cleanest math. Tile sprites are 256x256 isometric cubes; logical tile size may differ from sprite size. Coordinates are world-space absolute (px/py are absolute positions in the zone, not chunk-relative). `tileToPixelCenter` returns center of tile (not top-left corner). `PixelPosition` is minimal: `{ px: number, py: number, zoneId: string }` — no timestamp field.
- **Player speed**: Moderate/deliberate pace — player crosses a tile in roughly 1-1.2 seconds. `velocityFromKeys(keys, dt, speedMultiplier?)` — delta-time based (frame-independent), with optional speed multiplier (defaults to 1.0). No sprint constant in this phase — base speed only.
- **Player hitbox**: Square AABB hitbox. Claude's discretion on hitbox size relative to tile. Hitbox anchored at player's feet (bottom-center of sprite). `resolvePixelCollision` implements wall sliding (player slides along walls on diagonal input, not dead-stop).
- **Range constants**: Claude's discretion on adjusting pre-specified values (melee=144, gather=192, aggro=480, leash=960) based on chosen tile scale. Define range constants as multiples of TILE_SIZE_PX (e.g., `MELEE_RANGE_PX = 0.5 * TILE_SIZE_PX`) so they auto-scale if tile size changes. `NPC_INTERACT_RANGE_PX = GATHER_RANGE_PX`. No fog of war reveal radius constant.

### Claude's Discretion

- Exact TILE_SIZE_PX value (match to existing codebase conventions)
- Player hitbox size as fraction of tile
- Final range constant values (as tile-fraction multiples that approximate the roadmap numbers)
- Module placement within the package structure
- Any additional utility functions needed for the math modules

### Deferred Ideas (OUT OF SCOPE)

- **Remove fog of war system** — User wants to remove fog of war entirely. This affects Phase 133 (DIST-05). Needs a decision before Phase 133 planning.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| MOVE-02 | Player velocity is normalized on diagonal input (no 41% speed boost) | `velocityFromKeys` must apply `1/sqrt(2)` normalization on diagonal keys; constant `DIAGONAL_NORMALIZATION = 1 / Math.sqrt(2)` defined and unit-tested in `pixel-validation.ts` |
</phase_requirements>

## Summary

Phase 131 establishes the shared coordinate contract and pixel math infrastructure that all five downstream phases (132-135) will depend on. The work is purely additive — new files added to `packages/shared-types` and `packages/game-logic`, with no modification to existing movement or gameplay code.

The existing codebase is tile-based throughout: `Position` uses integer `x, y` grid coordinates; `ZONE_SIZE = 64` tiles; the isometric rendering uses `ISO_TILE_WIDTH = 256` / `ISO_TILE_HEIGHT = 128` pixels per tile; the `IsometricTransform` class converts between grid and screen space. The new `PixelPosition` interface parallels `Position` but uses float `px, py` (world-space pixel coordinates). The `pixel-validation.ts` and `pixel-distance.ts` modules live in `packages/game-logic/src/movement/` alongside the existing `validation.ts` and `pathfinding.ts`.

The critical design decision for Claude is `TILE_SIZE_PX`. The isometric grid cell is a diamond: the logical tile width is 256 px but the logical "step" in screen X for a one-tile move along the grid X-axis is half that: `(gridX - gridY) * 128`. For pixel movement math the relevant quantity is the screen-space distance a player travels to cross one tile in the grid-aligned direction. Given `ISO_TILE_WIDTH = 256` and `ISO_TILE_HEIGHT = 128`, the natural "logical tile unit" in screen space is **128 px** (the half-width, also equal to the half-height × 2). This gives clean integer multiples for all range constants, matches the existing depth-sorting math, and makes a `1.0-1.2 s` tile-cross feel natural at around 100-128 px/s. All TILE_SIZE_PX-derived constants must be defined as `const X = N * TILE_SIZE_PX` to auto-scale.

**Primary recommendation:** Place `TILE_SIZE_PX = 128` in `pixel-validation.ts` (exported from game-logic). Add `PixelPosition` to `packages/shared-types/src/core/position.ts` and re-export from the index. Add `pixel-validation.ts` and `pixel-distance.ts` in `packages/game-logic/src/movement/`. Unit-test the diagonal normalization constant.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | ^5.4 (workspace) | All types and modules | Already project-wide |
| Vitest | ^4.0.18 (workspace) | Unit tests for math functions | Used in `packages/game-logic` already |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@into-the-void/shared-types` | workspace | PixelPosition interface | Shared between client and server |
| `@into-the-void/game-logic` | workspace | pixel-validation.ts, pixel-distance.ts | Server validation + client movement |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| game-logic/src/movement/ | game-logic/src/pixel/ | movement/ is already where validation.ts lives; consistent grouping wins |
| TILE_SIZE_PX = 128 | TILE_SIZE_PX = 256 | 256 = sprite size, not logical step; would produce odd fractions in range constants |
| TILE_SIZE_PX = 64 | TILE_SIZE_PX = 128 | 64 is ZONE_SIZE (confusing), 128 matches tileWidthHalf used in all rendering math |

**Installation:** No new packages required. This is pure TypeScript module additions.

## Architecture Patterns

### Recommended Project Structure

```
packages/
├── shared-types/src/core/
│   └── position.ts          # ADD: PixelPosition interface (alongside existing Position)
├── game-logic/src/movement/
│   ├── validation.ts        # EXISTING — tile-based, untouched
│   ├── pathfinding.ts       # EXISTING — tile-based, untouched
│   ├── speed.ts             # EXISTING — tile speed modifiers, untouched
│   ├── pixel-validation.ts  # NEW — velocityFromKeys, resolvePixelCollision, validatePixelSpeed, PLAYER_SPEED_PX, PLAYER_HITBOX, TILE_SIZE_PX, DIAGONAL_NORMALIZATION
│   └── pixel-distance.ts    # NEW — pixelDistanceTo, tileToPixelCenter, pixelToTile, range constants
└── game-logic/src/movement/pixel-validation.test.ts  # NEW — unit tests for diagonal normalization
```

The `pixel-validation.ts` and `pixel-distance.ts` modules export from game-logic's `src/index.ts` (existing barrel file) via new re-export lines.

### Pattern 1: PixelPosition Interface

Add to `packages/shared-types/src/core/position.ts` alongside existing `Position`:

```typescript
/**
 * Sub-tile pixel position for continuous movement.
 * px/py are absolute world-space pixel coordinates within the zone.
 * Not chunk-relative — (0,0) is the top corner of the zone in isometric space.
 */
export interface PixelPosition {
  /** Absolute X pixel coordinate within the zone */
  px: number;
  /** Absolute Y pixel coordinate within the zone */
  py: number;
  /** Zone identifier (e.g., "z_1_2") */
  zoneId: string;
}
```

The `shared-types` index already exports `./core/position` — no changes needed to the barrel.

### Pattern 2: pixel-validation.ts exports

```typescript
// Source: project pattern from packages/game-logic/src/movement/validation.ts

/** Logical pixel size of one grid tile. Equals ISO_TILE_WIDTH/2 = tileWidthHalf from IsometricTransform. */
export const TILE_SIZE_PX = 128;

/** Max player speed in pixels per second at base (1.0) multiplier */
export const PLAYER_SPEED_PX = TILE_SIZE_PX;  // 128 px/s → crosses tile in 1.0s

/** Diagonal movement normalization factor (1/sqrt(2) ≈ 0.7071) */
export const DIAGONAL_NORMALIZATION = 1 / Math.sqrt(2);

/** Player AABB hitbox dimensions (square, anchored at feet / bottom-center) */
export const PLAYER_HITBOX = {
  width: Math.round(TILE_SIZE_PX * 0.5),  // 64 px wide
  height: Math.round(TILE_SIZE_PX * 0.5), // 64 px tall
} as const;

/** KeyState passed to velocityFromKeys — booleans for active keys */
export interface KeyState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
}

/**
 * Compute frame velocity vector from key state.
 * Normalizes diagonal movement so speed is consistent in all directions.
 * @param keys - current WASD/arrow key state
 * @param dt - delta time in seconds
 * @param speedMultiplier - optional speed modifier (default 1.0)
 */
export function velocityFromKeys(
  keys: KeyState,
  dt: number,
  speedMultiplier = 1.0
): { vx: number; vy: number } { ... }

/**
 * Resolve AABB collision between player hitbox and tile grid.
 * Implements wall sliding: player slides along wall on diagonal input.
 * @param px - current X pixel position (feet anchor)
 * @param py - current Y pixel position (feet anchor)
 * @param vx - proposed X delta this frame
 * @param vy - proposed Y delta this frame
 * @param isSolid - function returning true if tile (tx, ty) is solid
 */
export function resolvePixelCollision(
  px: number, py: number,
  vx: number, vy: number,
  isSolid: (tx: number, ty: number) => boolean
): { px: number; py: number } { ... }

/**
 * Server-side speed validation.
 * Returns false if movement delta exceeds max possible speed given dt.
 */
export function validatePixelSpeed(
  fromPx: number, fromPy: number,
  toPx: number, toPy: number,
  dt: number,
  speedMultiplier = 1.0
): boolean { ... }
```

### Pattern 3: pixel-distance.ts exports

```typescript
// Source: project pattern from packages/game-logic/src/visibility/range.ts

// Range constants as tile multiples — auto-scale if TILE_SIZE_PX changes
export const MELEE_RANGE_PX    = 0.5  * TILE_SIZE_PX;  // 64 px  (~half tile)
export const GATHER_RANGE_PX   = 1.5  * TILE_SIZE_PX;  // 192 px (~1.5 tiles)
export const NPC_INTERACT_RANGE_PX = GATHER_RANGE_PX;  // Same "close enough" distance
export const AGGRO_RADIUS_PX   = 4.0  * TILE_SIZE_PX;  // 512 px (~4 tiles) — creatures aggro at ~4 tiles
export const LEASH_RADIUS_PX   = 8.0  * TILE_SIZE_PX;  // 1024 px (~8 tiles) — leash at ~8 tiles

/**
 * Euclidean pixel distance between two absolute pixel positions.
 * Both positions must be in the same zone (caller is responsible for zone check).
 */
export function pixelDistanceTo(
  ax: number, ay: number,
  bx: number, by: number
): number { ... }

/**
 * Convert tile grid coordinates (integer) to pixel center position.
 * Returns the center of the tile's top diamond face in screen-aligned pixel space.
 * (0,0) tile center → (0, 0) in pixel space (convention: tile center is origin).
 */
export function tileToPixelCenter(tileX: number, tileY: number): { px: number; py: number } {
  return {
    px: tileX * TILE_SIZE_PX,
    py: tileY * TILE_SIZE_PX,
  };
}

/**
 * Convert absolute pixel position to tile grid coordinates (integer, floored).
 */
export function pixelToTile(px: number, py: number): { tileX: number; tileY: number } {
  return {
    tileX: Math.floor(px / TILE_SIZE_PX),
    tileY: Math.floor(py / TILE_SIZE_PX),
  };
}
```

### Pattern 4: Unit test for diagonal normalization

```typescript
// packages/game-logic/src/movement/pixel-validation.test.ts
import { describe, it, expect } from 'vitest';
import { velocityFromKeys, DIAGONAL_NORMALIZATION, PLAYER_SPEED_PX } from './pixel-validation';

describe('velocityFromKeys', () => {
  const DT = 1.0; // 1 second for easy math

  it('diagonal movement is normalized to 1/sqrt(2)', () => {
    const { vx, vy } = velocityFromKeys({ up: true, right: true, down: false, left: false }, DT);
    const speed = Math.sqrt(vx * vx + vy * vy);
    expect(speed).toBeCloseTo(PLAYER_SPEED_PX, 5);
  });

  it('cardinal movement produces full speed', () => {
    const { vx, vy } = velocityFromKeys({ up: true, right: false, down: false, left: false }, DT);
    expect(Math.abs(vy)).toBeCloseTo(PLAYER_SPEED_PX, 5);
    expect(vx).toBe(0);
  });

  it('DIAGONAL_NORMALIZATION is 1/sqrt(2)', () => {
    expect(DIAGONAL_NORMALIZATION).toBeCloseTo(1 / Math.sqrt(2), 10);
  });
});
```

### Anti-Patterns to Avoid

- **Integer truncation of px/py**: TypeScript's `number` is float64 and never auto-truncates, but callers passing values through JSON serialization (e.g., database or Socket.IO) may silently drop fractional parts. Always treat pixel positions as floats and serialize carefully. The STATE.md blocker note explicitly warns about this: "ensure no integer-coercion of px/py floats in existing validation code."
- **Confusing `TILE_SIZE_PX = 128` with the sprite size (256)**: The sprite is 256×256 but the logical pixel step per tile is 128. Keep `SPRITE_SIZE = 256` in rendering code (TileRenderer.ts) and `TILE_SIZE_PX = 128` in game-logic. These are different concepts at different layers.
- **Name collision with existing `Position`**: Do NOT rename or replace the existing `Position` interface. `PixelPosition` is a parallel type, not a replacement. Many modules throughout the codebase import `Position` directly.
- **Mixing pixel and tile coordinates**: `px/py` are always pixel units; `x/y` (from `Position`) are always tile units. Name them distinctly and avoid using one as the other without an explicit conversion.
- **Hardcoding range values**: Range constants MUST be defined as `N * TILE_SIZE_PX`, not as literals (144, 192, etc.). This ensures they stay correct if tile scale ever changes.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| AABB vs tile collision | Custom ray-cast or polygon intersection | Simple AABB vs tile-rect check using `pixelToTile` | Only need to check 4 corner tiles of the hitbox. Per-pixel collision is out of scope per REQUIREMENTS.md |
| Square-root normalization | Lookup table or approximation | `Math.sqrt(2)` via `1 / Math.sqrt(2)` constant | `Math.sqrt` is hardware-accelerated at JS runtime; approximation would fail unit tests |
| Float equality in speed validation | Epsilon comparison | Simple `<= maxDist` check with a 10% tolerance for network jitter | Server-side validation needs generous tolerance, not precision |

**Key insight:** This phase is pure constant + pure function territory. No OOP, no classes, no dependencies on browser APIs. Keep each module a flat file of `export const` and `export function`.

## Common Pitfalls

### Pitfall 1: TILE_SIZE_PX vs ISO_TILE_WIDTH confusion

**What goes wrong:** Developer sets `TILE_SIZE_PX = 256` (matching the sprite size), then all range constants end up twice as large as intended.

**Why it happens:** `ISO_TILE_WIDTH = 256` exists in `WorldScene.ts` and refers to the full diamond width. The logical tile step is `tileWidthHalf = 128`. Player should move 128 px per tile-width step.

**How to avoid:** Comment `TILE_SIZE_PX` clearly: "equals ISO_TILE_WIDTH/2 = tileWidthHalf = 128". Check: at `PLAYER_SPEED_PX = TILE_SIZE_PX = 128 px/s`, crossing one tile takes exactly 1.0 second, which matches the "1-1.2 seconds" user requirement.

**Warning signs:** If `MELEE_RANGE_PX > 100`, the melee range is probably more than one full tile — reconsider scale.

### Pitfall 2: Skipping diagonal normalization

**What goes wrong:** `velocityFromKeys` adds `(vx, vy)` components without normalizing. Diagonal speed becomes `sqrt(2) × base = 1.41×` the cardinal speed.

**Why it happens:** Naive "if up and right, vx = speed, vy = speed" implementation.

**How to avoid:** `DIAGONAL_NORMALIZATION = 1 / Math.sqrt(2)`. When both an X and Y component are non-zero, multiply both by `DIAGONAL_NORMALIZATION` before scaling by `PLAYER_SPEED_PX * dt`. The unit test enforces this.

**Warning signs:** Unit test for diagonal magnitude fails; player visibly moves faster diagonally.

### Pitfall 3: Wall sliding not implemented in resolvePixelCollision

**What goes wrong:** `resolvePixelCollision` stops the player dead on any collision instead of sliding. Navigation in tight corridors becomes impossible.

**Why it happens:** Simple "if blocked, return (px, py)" implementation.

**How to avoid:** Separate the X and Y resolve passes. Try X move alone; if blocked, zero the X component. Try Y move alone; if blocked, zero the Y component. Apply both surviving components. The user specifically called out wall sliding as important.

**Warning signs:** Player gets stuck on any wall corner; cannot slide along walls.

### Pitfall 4: Pixel position using screen-space vs grid-space

**What goes wrong:** `px, py` are defined as isometric screen coordinates rather than grid-aligned pixel coordinates. This creates complex transforms when converting to/from tile positions.

**Why it happens:** The isometric rendering does `x_screen = (gridX - gridY) * 128`, so there's a temptation to use screen coords.

**How to avoid:** Use the **grid-aligned** coordinate system: `px = tileX * TILE_SIZE_PX, py = tileY * TILE_SIZE_PX`. This is NOT isometric screen space; it is a straightforward Cartesian pixel grid. Rendering converts pixel-space to isometric screen-space at draw time. This keeps math simple and collision detection axis-aligned.

**Warning signs:** `tileToPixelCenter(1, 0)` and `tileToPixelCenter(0, 1)` produce screen-like asymmetric values instead of `{ px: 128, py: 0 }` and `{ px: 0, py: 128 }`.

### Pitfall 5: Breaking existing `Position` consumers

**What goes wrong:** Adding `PixelPosition` to `position.ts` causes a naming conflict or accidental re-export that breaks existing code importing `Position`.

**Why it happens:** Barrel re-exports in `index.ts` can be sensitive to name clashes.

**How to avoid:** The new interface is named `PixelPosition` — distinct from `Position`, `WorldPosition`, and `ZoneCoords` already in that file. No name conflict. The `index.ts` already does `export * from './core/position'` so the new type is automatically available. TypeScript build check (success criteria #5) will catch any issues.

## Code Examples

Verified patterns from existing codebase:

### Existing IsometricTransform gridToScreen (WorldScene reference)

```typescript
// Source: apps/web/src/game/utils/IsometricTransform.ts
// This is the rendering-layer coordinate transform — NOT what pixel-distance.ts uses
gridToScreen(gridX: number, gridY: number): { x: number; y: number } {
  return {
    x: (gridX - gridY) * this.tileWidthHalf,   // tileWidthHalf = 128
    y: (gridX + gridY) * this.tileHeightHalf   // tileHeightHalf = 64
  };
}
// NOTE: pixel-distance.ts uses GRID pixel space (tileX * TILE_SIZE_PX),
// not the isometric screen projection above.
```

### Existing test file pattern (game-logic)

```typescript
// Source: packages/game-logic/src/inventory/effects.test.ts
import { resolveEffect } from './effects';

describe('resolveEffect', () => {
  it('should resolve single stat effect', () => {
    // ... vitest globals (describe, it, expect) are available via vitest.config.ts globals:true
  });
});
```

### Existing game-logic index barrel pattern

```typescript
// Source: packages/game-logic/src/index.ts
// New exports must be added here:
// Movement
export * from './movement/validation';
export * from './movement/pathfinding';
export * from './movement/speed';
// ADD:
export * from './movement/pixel-validation';
export * from './movement/pixel-distance';
```

### Running tests

```bash
nx run game-logic:test
# or for single file:
npx vitest run packages/game-logic/src/movement/pixel-validation.test.ts
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Tile-to-tile movement (`validateMovement`, `calculateNewPosition`) | New pixel movement (`velocityFromKeys`, `resolvePixelCollision`) | v1.27 milestone | Pixel modules are PARALLEL, not replacements; old tile code stays for v1.27 |
| Range checks using `manhattanDistance` (tile integer) | Range checks using `pixelDistanceTo` (float Euclidean) | Phase 133 uses new constants from this phase | pixel-distance.ts provides new range constants only; old tile range code in interaction.ts untouched in this phase |

**Deprecated/outdated:**
- `MOVE_DELAY_MS = 500` in `shared-types/src/constants.ts`: This is the old 500ms tick rate for tile movement. It is NOT modified in this phase (Phase 132 replaces the server tick model). Do not touch it here.
- `pathfinding.ts` (`findPath`, A*): Out of scope for v1.27 entirely (CLEAN-01 removes it in Phase 135). Do not reference in new modules.

## Open Questions

1. **`tileToPixelCenter` coordinate convention**
   - What we know: User wants "center of the tile, not top-left corner." In grid pixel space, tile (tileX, tileY) occupies the rectangle `[tileX*128, (tileX+1)*128) × [tileY*128, (tileY+1)*128)`. Center is `((tileX + 0.5) * 128, (tileY + 0.5) * 128)`.
   - What's unclear: Whether the user expects integer or float center. `0.5 * TILE_SIZE_PX = 64`, so for tile (0,0) the center is `{ px: 64, py: 64 }` which is clean.
   - Recommendation: Use `(tileX + 0.5) * TILE_SIZE_PX` for center. This is standard in all game movement math and avoids off-by-one on tile boundary checks.

2. **Wall sliding X/Y pass order**
   - What we know: Standard AABB sliding: try X move, if blocked zero X; try Y move, if blocked zero Y.
   - What's unclear: Which pass order is preferred (X-first or Y-first). For isometric games with no asymmetric geometry, both orderings produce equivalent results.
   - Recommendation: X-first is the most common convention and produces no observable difference for this game's tile geometry.

## Sources

### Primary (HIGH confidence)
- Codebase direct inspection — `packages/shared-types/src/core/position.ts` — existing Position interface
- Codebase direct inspection — `apps/web/src/game/scenes/WorldScene.ts` lines 37-38 — `ISO_TILE_WIDTH = 256`, `ISO_TILE_HEIGHT = 128`
- Codebase direct inspection — `apps/web/src/game/utils/IsometricTransform.ts` — `tileWidthHalf = 128` used in all grid-to-screen math
- Codebase direct inspection — `packages/game-logic/src/movement/validation.ts` — existing tile movement pattern to follow
- Codebase direct inspection — `packages/game-logic/src/index.ts` — barrel export pattern
- Codebase direct inspection — `packages/game-logic/vitest.config.ts` — test framework configuration
- Codebase direct inspection — `.planning/STATE.md` — blocker note about integer-coercion of px/py floats

### Secondary (MEDIUM confidence)
- CONTEXT.md user decisions — locked design choices for this phase
- REQUIREMENTS.md MOVE-02 — diagonal normalization requirement

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all project tooling confirmed by package.json and project.json files
- Architecture: HIGH — file locations, export patterns, and naming conventions all confirmed from existing code
- Pitfalls: HIGH — TILE_SIZE_PX confusion confirmed by actual code (WorldScene ISO_TILE_WIDTH=256 vs tileWidthHalf=128), integer coercion risk documented in STATE.md
- Range constants: MEDIUM — exact multipliers are Claude's discretion; roadmap suggested numbers (144, 192, 480, 960) map reasonably to 1×, 1.5×, 4×, 8× of 128

**Research date:** 2026-03-17
**Valid until:** 2026-04-17 (stable domain, pure TypeScript, no external dependencies)
