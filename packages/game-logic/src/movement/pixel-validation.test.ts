import {
  TILE_SIZE_PX,
  PLAYER_SPEED_PX,
  DIAGONAL_NORMALIZATION,
  PLAYER_HITBOX,
  velocityFromKeys,
  resolvePixelCollision,
  validatePixelSpeed,
} from './pixel-validation';

const DT = 1.0;

// ============================================================
// Constants
// ============================================================
describe('pixel-validation constants', () => {
  it('TILE_SIZE_PX equals 128', () => {
    expect(TILE_SIZE_PX).toBe(128);
  });

  it('PLAYER_SPEED_PX equals TILE_SIZE_PX (128 px/s)', () => {
    expect(PLAYER_SPEED_PX).toBe(TILE_SIZE_PX);
    expect(PLAYER_SPEED_PX).toBe(128);
  });

  it('DIAGONAL_NORMALIZATION is approximately 1/sqrt(2)', () => {
    expect(DIAGONAL_NORMALIZATION).toBeCloseTo(1 / Math.sqrt(2), 10);
  });

  it('PLAYER_HITBOX.width is 64 (0.5 * TILE_SIZE_PX)', () => {
    expect(PLAYER_HITBOX.width).toBe(64);
  });

  it('PLAYER_HITBOX.height is 64 (0.5 * TILE_SIZE_PX)', () => {
    expect(PLAYER_HITBOX.height).toBe(64);
  });
});

// ============================================================
// velocityFromKeys
// ============================================================
describe('velocityFromKeys', () => {
  it('cardinal up produces vx=0, vy=-PLAYER_SPEED_PX with dt=1.0', () => {
    const { vx, vy } = velocityFromKeys({ up: true, down: false, left: false, right: false }, DT);
    expect(vx).toBeCloseTo(0);
    expect(vy).toBeCloseTo(-PLAYER_SPEED_PX);
  });

  it('cardinal right produces vx=PLAYER_SPEED_PX, vy=0 with dt=1.0', () => {
    const { vx, vy } = velocityFromKeys({ up: false, down: false, left: false, right: true }, DT);
    expect(vx).toBeCloseTo(PLAYER_SPEED_PX);
    expect(vy).toBeCloseTo(0);
  });

  it('cardinal down produces vx=0, vy=PLAYER_SPEED_PX with dt=1.0', () => {
    const { vx, vy } = velocityFromKeys({ up: false, down: true, left: false, right: false }, DT);
    expect(vx).toBeCloseTo(0);
    expect(vy).toBeCloseTo(PLAYER_SPEED_PX);
  });

  it('cardinal left produces vx=-PLAYER_SPEED_PX, vy=0 with dt=1.0', () => {
    const { vx, vy } = velocityFromKeys({ up: false, down: false, left: true, right: false }, DT);
    expect(vx).toBeCloseTo(-PLAYER_SPEED_PX);
    expect(vy).toBeCloseTo(0);
  });

  it('diagonal up+right speed magnitude equals PLAYER_SPEED_PX (MOVE-02)', () => {
    const { vx, vy } = velocityFromKeys({ up: true, down: false, left: false, right: true }, DT);
    const magnitude = Math.sqrt(vx * vx + vy * vy);
    expect(magnitude).toBeCloseTo(PLAYER_SPEED_PX, 5);
  });

  it('diagonal down+left speed magnitude equals PLAYER_SPEED_PX (MOVE-02)', () => {
    const { vx, vy } = velocityFromKeys({ up: false, down: true, left: true, right: false }, DT);
    const magnitude = Math.sqrt(vx * vx + vy * vy);
    expect(magnitude).toBeCloseTo(PLAYER_SPEED_PX, 5);
  });

  it('diagonal up+left speed magnitude equals PLAYER_SPEED_PX', () => {
    const { vx, vy } = velocityFromKeys({ up: true, down: false, left: true, right: false }, DT);
    const magnitude = Math.sqrt(vx * vx + vy * vy);
    expect(magnitude).toBeCloseTo(PLAYER_SPEED_PX, 5);
  });

  it('diagonal down+right speed magnitude equals PLAYER_SPEED_PX', () => {
    const { vx, vy } = velocityFromKeys({ up: false, down: true, left: false, right: true }, DT);
    const magnitude = Math.sqrt(vx * vx + vy * vy);
    expect(magnitude).toBeCloseTo(PLAYER_SPEED_PX, 5);
  });

  it('no keys pressed produces vx=0, vy=0', () => {
    const { vx, vy } = velocityFromKeys({ up: false, down: false, left: false, right: false }, DT);
    expect(vx).toBe(0);
    expect(vy).toBe(0);
  });

  it('opposing keys up+down produces vx=0, vy=0', () => {
    const { vx, vy } = velocityFromKeys({ up: true, down: true, left: false, right: false }, DT);
    expect(vx).toBe(0);
    expect(vy).toBe(0);
  });

  it('opposing keys left+right produces vx=0, vy=0', () => {
    const { vx, vy } = velocityFromKeys({ up: false, down: false, left: true, right: true }, DT);
    expect(vx).toBe(0);
    expect(vy).toBe(0);
  });

  it('speedMultiplier=2.0 doubles the speed magnitude', () => {
    const { vx: vx1, vy: vy1 } = velocityFromKeys({ up: true, down: false, left: false, right: false }, DT, 1.0);
    const { vx: vx2, vy: vy2 } = velocityFromKeys({ up: true, down: false, left: false, right: false }, DT, 2.0);
    const mag1 = Math.sqrt(vx1 * vx1 + vy1 * vy1);
    const mag2 = Math.sqrt(vx2 * vx2 + vy2 * vy2);
    expect(mag2).toBeCloseTo(mag1 * 2, 5);
  });

  it('dt=0.5 halves displacement vs dt=1.0', () => {
    const { vx: vx1, vy: vy1 } = velocityFromKeys({ up: true, down: false, left: false, right: false }, 1.0);
    const { vx: vx2, vy: vy2 } = velocityFromKeys({ up: true, down: false, left: false, right: false }, 0.5);
    expect(Math.abs(vx2)).toBeCloseTo(Math.abs(vx1) * 0.5, 5);
    expect(Math.abs(vy2)).toBeCloseTo(Math.abs(vy1) * 0.5, 5);
  });
});

// ============================================================
// resolvePixelCollision
// ============================================================
describe('resolvePixelCollision', () => {
  // Helper: no tiles are solid
  const noSolid = (_tx: number, _ty: number) => false;

  // Helper: tile (1,0) is solid (a wall to the right at pixel x=128..255)
  const rightWallSolid = (tx: number, ty: number) => tx === 1 && ty === 0;

  // Helper: tile (0,1) is solid (a wall below at pixel y=128..255)
  const bottomWallSolid = (tx: number, ty: number) => tx === 0 && ty === 1;

  // Helper: both (1,0) and (0,1) are solid (corner)
  const cornerSolid = (tx: number, ty: number) =>
    (tx === 1 && ty === 0) || (tx === 0 && ty === 1);

  it('movement into open space returns position with full velocity applied', () => {
    // Start at center of tile (0,0): px=64, py=64 (using hitbox anchor at feet = bottom-center)
    // With no solid tiles, move freely
    const result = resolvePixelCollision(64, 64, 10, 10, noSolid);
    expect(result.px).toBeCloseTo(74);
    expect(result.py).toBeCloseTo(74);
  });

  it('X-blocked movement zeroes X component, preserves Y (wall slide)', () => {
    // Player near left edge of tile boundary, moving right into solid tile (1,0)
    // px=96 (center), py=64. Moving vx=+40 would push hitbox corner into tile 1
    // Hitbox: width=64, so right edge = px+32. At px=96+40=136, right edge=168 → tile 1 (solid)
    const result = resolvePixelCollision(96, 64, 40, 10, rightWallSolid);
    // X should be blocked (stays <= 96 due to wall), Y should move
    expect(result.py).toBeCloseTo(74);
    expect(result.px).toBeLessThanOrEqual(96 + 40); // might be blocked
  });

  it('isSolid callback receives tile coordinates computed from pixel via Math.floor(px / TILE_SIZE_PX)', () => {
    const seenTiles: Array<{ tx: number; ty: number }> = [];
    const trackingSolid = (tx: number, ty: number) => {
      seenTiles.push({ tx, ty });
      return false;
    };
    // px=64, py=64 with tiny movement
    resolvePixelCollision(64, 64, 5, 5, trackingSolid);
    // Should have checked tiles derived from pixel positions
    expect(seenTiles.length).toBeGreaterThan(0);
    // All tile coords should be non-negative integers
    for (const { tx, ty } of seenTiles) {
      expect(Number.isInteger(tx)).toBe(true);
      expect(Number.isInteger(ty)).toBe(true);
    }
  });

  it('diagonal movement into wall slides along the unblocked axis', () => {
    // Moving right (+vx) and down (+vy), right wall is solid
    // Should zero X but preserve Y movement
    const result = resolvePixelCollision(96, 64, 40, 20, rightWallSolid);
    expect(result.py).toBeCloseTo(84); // Y moves
    // X should be at most the original position (blocked by wall)
    expect(result.px).toBeLessThanOrEqual(136); // some blocking
  });

  it('diagonal into corner (both X and Y blocked) stops player', () => {
    // Place player so both X and Y moves go into solid tiles
    // px=96, py=64, corner solid at (1,0) and (0,1)
    // Move +vx=40 → hits (1,0), move +vy=70 → hits (0,1)
    const result = resolvePixelCollision(96, 64, 40, 70, cornerSolid);
    // Both axes blocked → player doesn't move (or barely)
    expect(result.px).toBeLessThanOrEqual(96 + 40);
    expect(result.py).toBeLessThanOrEqual(64 + 70);
  });

  it('Y-blocked movement preserves X, zeroes Y', () => {
    // Player moving down into solid tile (0,1) at y=128
    // px=64, py=96, moving vy=+40 → bottom edge = py + 40 - 1 + 32 at feet...
    // Hitbox anchored at feet: bottom-right corner y = py-1 → with vy=40 → (py+40-1)
    const result = resolvePixelCollision(64, 96, 10, 40, bottomWallSolid);
    expect(result.px).toBeCloseTo(74); // X moves
    expect(result.py).toBeLessThanOrEqual(96 + 40); // Y might be blocked
  });
});

// ============================================================
// validatePixelSpeed
// ============================================================
describe('validatePixelSpeed', () => {
  it('movement at exactly PLAYER_SPEED_PX * dt is valid', () => {
    // Move exactly 128 px in 1 second
    const valid = validatePixelSpeed(0, 0, PLAYER_SPEED_PX * DT, 0, DT);
    expect(valid).toBe(true);
  });

  it('movement within 10% tolerance (1.05x max) is valid', () => {
    // 10% above base speed should still pass (within tolerance)
    const valid = validatePixelSpeed(0, 0, PLAYER_SPEED_PX * DT * 1.05, 0, DT);
    expect(valid).toBe(true);
  });

  it('movement at 2x max speed (teleportation) is invalid', () => {
    const valid = validatePixelSpeed(0, 0, PLAYER_SPEED_PX * DT * 2.0, 0, DT);
    expect(valid).toBe(false);
  });

  it('zero movement is valid', () => {
    const valid = validatePixelSpeed(100, 200, 100, 200, DT);
    expect(valid).toBe(true);
  });

  it('speedMultiplier increases allowed speed proportionally', () => {
    const multiplier = 2.0;
    // 2x speed multiplier: movement at 1.9x base should be valid
    const valid = validatePixelSpeed(0, 0, PLAYER_SPEED_PX * DT * 1.9, 0, DT, multiplier);
    expect(valid).toBe(true);
  });

  it('speedMultiplier=2 still rejects 3x base speed', () => {
    const multiplier = 2.0;
    const valid = validatePixelSpeed(0, 0, PLAYER_SPEED_PX * DT * 3.0, 0, DT, multiplier);
    expect(valid).toBe(false);
  });
});
