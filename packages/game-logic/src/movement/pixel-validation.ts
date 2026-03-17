/**
 * pixel-validation.ts
 *
 * Core constants and pure functions for pixel-space movement math.
 * This module is the shared foundation for all downstream pixel movement phases (132–135).
 *
 * Coordinate convention:
 *   - (px, py) are absolute world-space pixel coordinates (not isometric screen space)
 *   - Positive X = right, positive Y = down (standard 2D grid)
 *   - px/py are floating-point; tile coords are derived via Math.floor(px / TILE_SIZE_PX)
 */

// ============================================================
// Constants
// ============================================================

/**
 * Logical pixel size of one grid tile.
 * Equals ISO_TILE_WIDTH / 2 = tileWidthHalf from IsometricTransform.
 * (Tile sprites are 256×256 isometric cubes; logical tile width-half is 128px.)
 */
export const TILE_SIZE_PX = 128;

/**
 * Maximum player movement speed in pixels per second at base (1.0) multiplier.
 * At 128 px/s the player crosses one tile in exactly 1.0 second — within the
 * 1–1.2 s deliberate-pace requirement for a survival MMO.
 */
export const PLAYER_SPEED_PX = TILE_SIZE_PX; // 128 px/s

/**
 * Diagonal normalization factor: 1/√2 ≈ 0.7071.
 * Applied to both X and Y velocity components when both axes have input,
 * so the resulting speed magnitude stays equal to PLAYER_SPEED_PX (MOVE-02).
 */
export const DIAGONAL_NORMALIZATION = 1 / Math.sqrt(2);

/**
 * Player AABB hitbox dimensions in pixels.
 * Square hitbox, half the tile size (64×64), anchored at the player's feet
 * (bottom-center of the sprite) — collision happens at ground level in
 * isometric view.
 */
export const PLAYER_HITBOX = {
  width: Math.round(TILE_SIZE_PX * 0.5),  // 64 px
  height: Math.round(TILE_SIZE_PX * 0.5), // 64 px
} as const;

// ============================================================
// Interfaces
// ============================================================

/** Input key state snapshot from the game client. */
export interface KeyState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
}

/** A 2D velocity vector in pixel-space. */
export interface Velocity {
  vx: number;
  vy: number;
}

/** A 2D position in pixel-space. */
export interface PixelPos {
  px: number;
  py: number;
}

// ============================================================
// velocityFromKeys
// ============================================================

/**
 * Computes the frame velocity vector from the current key state.
 *
 * Implements MOVE-02: diagonal input is normalized by DIAGONAL_NORMALIZATION
 * (1/√2) so speed magnitude never exceeds PLAYER_SPEED_PX regardless of
 * how many axes are active.
 *
 * @param keys         Current pressed-key snapshot.
 * @param dt           Delta-time in seconds (frame-independent scaling).
 * @param speedMultiplier  Optional speed multiplier for equipment/debuff effects (default 1.0).
 * @returns  Velocity vector { vx, vy } in pixels for this frame.
 */
export function velocityFromKeys(
  keys: KeyState,
  dt: number,
  speedMultiplier = 1.0,
): Velocity {
  // Raw directional intent on each axis (cancel opposing keys)
  let dirX = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
  let dirY = (keys.down  ? 1 : 0) - (keys.up   ? 1 : 0);

  // Apply diagonal normalization when both axes are active (MOVE-02)
  if (dirX !== 0 && dirY !== 0) {
    dirX *= DIAGONAL_NORMALIZATION;
    dirY *= DIAGONAL_NORMALIZATION;
  }

  const speed = PLAYER_SPEED_PX * dt * speedMultiplier;

  return {
    vx: dirX * speed,
    vy: dirY * speed,
  };
}

// ============================================================
// resolvePixelCollision
// ============================================================

/**
 * Resolves movement against solid tiles using AABB wall-sliding.
 *
 * Performs two independent collision passes (X then Y) so the player slides
 * along walls rather than dead-stopping on diagonal input — critical for
 * smooth navigation in tight corridors.
 *
 * The hitbox is anchored at the player's feet (bottom-center):
 *   left  edge  = px − width/2
 *   right edge  = px + width/2 − 1   (−1 prevents bleed into adjacent tile at boundary)
 *   bottom edge = py − 1              (feet pixel)
 *   top   edge  = py − height
 *
 * @param px       Player pixel X position (feet-anchor).
 * @param py       Player pixel Y position (feet-anchor).
 * @param vx       Candidate X displacement this frame.
 * @param vy       Candidate Y displacement this frame.
 * @param isSolid  Callback that returns true for solid tile coordinates.
 * @returns  Resolved { px, py } after collision.
 */
export function resolvePixelCollision(
  px: number,
  py: number,
  vx: number,
  vy: number,
  isSolid: (tileX: number, tileY: number) => boolean,
): PixelPos {
  const hw = PLAYER_HITBOX.width  / 2; // 32
  const hh = PLAYER_HITBOX.height;     // 64 (full height from feet up)

  /** Convert a pixel coordinate to a tile index. */
  const toTile = (p: number) => Math.floor(p / TILE_SIZE_PX);

  /**
   * Check whether any of the four hitbox corners at position (cpx, cpy) overlap
   * a solid tile. The hitbox is anchored at bottom-center (feet).
   */
  function hitsWall(cpx: number, cpy: number): boolean {
    const corners = [
      { x: cpx - hw,     y: cpy - hh },     // top-left
      { x: cpx + hw - 1, y: cpy - hh },     // top-right
      { x: cpx - hw,     y: cpy - 1   },    // bottom-left
      { x: cpx + hw - 1, y: cpy - 1   },    // bottom-right
    ];
    return corners.some(c => isSolid(toTile(c.x), toTile(c.y)));
  }

  // ── Pass 1: try X movement ──────────────────────────────────
  let resolvedPx = px;
  if (vx !== 0 && !hitsWall(px + vx, py)) {
    resolvedPx = px + vx;
  }

  // ── Pass 2: try Y movement (using resolved X position) ──────
  let resolvedPy = py;
  if (vy !== 0 && !hitsWall(resolvedPx, py + vy)) {
    resolvedPy = py + vy;
  }

  return { px: resolvedPx, py: resolvedPy };
}

// ============================================================
// bitmaskToKeyState
// ============================================================

/** Key bitmask constants matching the wire-format convention: W=1, A=2, S=4, D=8. */
export const KEY_BIT_W = 1;
export const KEY_BIT_A = 2;
export const KEY_BIT_S = 4;
export const KEY_BIT_D = 8;

/**
 * Converts a wire-format key bitmask to a KeyState struct.
 * Bitmask convention: W=1 (up), A=2 (left), S=4 (down), D=8 (right).
 *
 * @param keys  Bitmask of currently pressed WASD keys.
 * @returns     KeyState struct consumable by velocityFromKeys.
 */
export function bitmaskToKeyState(keys: number): KeyState {
  return {
    up:    !!(keys & KEY_BIT_W),
    left:  !!(keys & KEY_BIT_A),
    down:  !!(keys & KEY_BIT_S),
    right: !!(keys & KEY_BIT_D),
  };
}

// ============================================================
// validatePixelSpeed
// ============================================================

/**
 * Server-side speed validation: rejects movement that exceeds the maximum
 * allowed speed (with a 10 % tolerance for network jitter/interpolation).
 *
 * @param fromPx         Previous X position in pixels.
 * @param fromPy         Previous Y position in pixels.
 * @param toPx           New X position in pixels.
 * @param toPy           New Y position in pixels.
 * @param dt             Time elapsed since last validated position (seconds).
 * @param speedMultiplier  Active speed multiplier (default 1.0).
 * @returns  true if movement is within allowed bounds, false if teleportation detected.
 */
export function validatePixelSpeed(
  fromPx: number,
  fromPy: number,
  toPx: number,
  toPy: number,
  dt: number,
  speedMultiplier = 1.0,
): boolean {
  const dx = toPx - fromPx;
  const dy = toPy - fromPy;
  const distance = Math.sqrt(dx * dx + dy * dy);

  // 10 % tolerance accommodates network jitter without enabling cheating
  const maxAllowed = PLAYER_SPEED_PX * dt * speedMultiplier * 1.1;

  return distance <= maxAllowed;
}
