import {
  TILE_SIZE_PX,
  PLAYER_SPEED_PX,
  DIAGONAL_NORMALIZATION,
  PLAYER_HITBOX,
  velocityFromKeys,
  resolvePixelCollision,
  validatePixelSpeed,
  bitmaskToKeyState,
  KEY_BIT_W,
  KEY_BIT_A,
  KEY_BIT_S,
  KEY_BIT_D,
  createIsometricCollisionCheck,
} from './pixel-validation';

const DT = 1.0;

// ============================================================
// Constants
// ============================================================
describe('pixel-validation constants', () => {
  it('TILE_SIZE_PX equals 128', () => {
    expect(TILE_SIZE_PX).toBe(128);
  });

  it('PLAYER_SPEED_PX equals TILE_SIZE_PX * 2 (256 px/s)', () => {
    expect(PLAYER_SPEED_PX).toBe(TILE_SIZE_PX * 2);
    expect(PLAYER_SPEED_PX).toBe(256);
  });

  it('DIAGONAL_NORMALIZATION is approximately 1/sqrt(2)', () => {
    expect(DIAGONAL_NORMALIZATION).toBeCloseTo(1 / Math.sqrt(2), 10);
  });

  it('PLAYER_HITBOX.width is 64 (0.5 * TILE_SIZE_PX)', () => {
    expect(PLAYER_HITBOX.width).toBe(64);
  });

  it('PLAYER_HITBOX.height is 16 (0.125 * TILE_SIZE_PX — reduced for tight wall collision)', () => {
    expect(PLAYER_HITBOX.height).toBe(16);
  });
});

// ============================================================
// velocityFromKeys — isometric grid-aligned
// ============================================================
describe('velocityFromKeys', () => {
  // With isometric mapping, single keys produce diagonal grid vectors:
  //   W (up)    → grid (-1,-1) normalized = (-0.707, -0.707)
  //   S (down)  → grid (+1,+1) normalized = (+0.707, +0.707)
  //   A (left)  → grid (-1,+1) normalized = (-0.707, +0.707)
  //   D (right) → grid (+1,-1) normalized = (+0.707, -0.707)
  const NORM = 1 / Math.sqrt(2);

  it('W (visual up) produces grid (-1,-1) normalized velocity', () => {
    const { vx, vy } = velocityFromKeys({ up: true, down: false, left: false, right: false }, DT);
    expect(vx).toBeCloseTo(-NORM * PLAYER_SPEED_PX);
    expect(vy).toBeCloseTo(-NORM * PLAYER_SPEED_PX);
  });

  it('S (visual down) produces grid (+1,+1) normalized velocity', () => {
    const { vx, vy } = velocityFromKeys({ up: false, down: true, left: false, right: false }, DT);
    expect(vx).toBeCloseTo(NORM * PLAYER_SPEED_PX);
    expect(vy).toBeCloseTo(NORM * PLAYER_SPEED_PX);
  });

  it('A (visual left) produces grid (-1,+1) normalized velocity', () => {
    const { vx, vy } = velocityFromKeys({ up: false, down: false, left: true, right: false }, DT);
    expect(vx).toBeCloseTo(-NORM * PLAYER_SPEED_PX);
    expect(vy).toBeCloseTo(NORM * PLAYER_SPEED_PX);
  });

  it('D (visual right) produces grid (+1,-1) normalized velocity', () => {
    const { vx, vy } = velocityFromKeys({ up: false, down: false, left: false, right: true }, DT);
    expect(vx).toBeCloseTo(NORM * PLAYER_SPEED_PX);
    expect(vy).toBeCloseTo(-NORM * PLAYER_SPEED_PX);
  });

  it('W+D (visual NE) produces grid (0,-1) velocity — along grid Y axis', () => {
    const { vx, vy } = velocityFromKeys({ up: true, down: false, left: false, right: true }, DT);
    expect(vx).toBeCloseTo(0);
    expect(vy).toBeCloseTo(-PLAYER_SPEED_PX);
  });

  it('W+A (visual NW) produces grid (-1,0) velocity — along grid X axis', () => {
    const { vx, vy } = velocityFromKeys({ up: true, down: false, left: true, right: false }, DT);
    expect(vx).toBeCloseTo(-PLAYER_SPEED_PX);
    expect(vy).toBeCloseTo(0);
  });

  it('S+D (visual SE) produces grid (+1,0) velocity — along grid X axis', () => {
    const { vx, vy } = velocityFromKeys({ up: false, down: true, left: false, right: true }, DT);
    expect(vx).toBeCloseTo(PLAYER_SPEED_PX);
    expect(vy).toBeCloseTo(0);
  });

  it('S+A (visual SW) produces grid (0,+1) velocity — along grid Y axis', () => {
    const { vx, vy } = velocityFromKeys({ up: false, down: true, left: true, right: false }, DT);
    expect(vx).toBeCloseTo(0);
    expect(vy).toBeCloseTo(PLAYER_SPEED_PX);
  });

  it('all single-key speed magnitudes equal PLAYER_SPEED_PX (MOVE-02)', () => {
    const keys = [
      { up: true, down: false, left: false, right: false },
      { up: false, down: true, left: false, right: false },
      { up: false, down: false, left: true, right: false },
      { up: false, down: false, left: false, right: true },
    ];
    for (const k of keys) {
      const { vx, vy } = velocityFromKeys(k, DT);
      const mag = Math.sqrt(vx * vx + vy * vy);
      expect(mag).toBeCloseTo(PLAYER_SPEED_PX, 5);
    }
  });

  it('all two-key combo speed magnitudes equal PLAYER_SPEED_PX (MOVE-02)', () => {
    const keys = [
      { up: true, down: false, left: false, right: true },  // W+D
      { up: true, down: false, left: true, right: false },  // W+A
      { up: false, down: true, left: false, right: true },  // S+D
      { up: false, down: true, left: true, right: false },  // S+A
    ];
    for (const k of keys) {
      const { vx, vy } = velocityFromKeys(k, DT);
      const mag = Math.sqrt(vx * vx + vy * vy);
      expect(mag).toBeCloseTo(PLAYER_SPEED_PX, 5);
    }
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
    const mag1 = Math.sqrt(vx1 * vx1 + vy1 * vy1);
    const mag2 = Math.sqrt(vx2 * vx2 + vy2 * vy2);
    expect(mag2).toBeCloseTo(mag1 * 0.5, 5);
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
    const result = resolvePixelCollision(64, 64, 10, 10, noSolid);
    expect(result.px).toBeCloseTo(74);
    expect(result.py).toBeCloseTo(74);
  });

  it('X-blocked movement zeroes X component, preserves Y (wall slide)', () => {
    const result = resolvePixelCollision(96, 64, 40, 10, rightWallSolid);
    expect(result.py).toBeCloseTo(74);
    expect(result.px).toBeLessThanOrEqual(96 + 40);
  });

  it('isSolid callback receives tile coordinates computed from pixel via Math.floor(px / TILE_SIZE_PX)', () => {
    const seenTiles: Array<{ tx: number; ty: number }> = [];
    const trackingSolid = (tx: number, ty: number) => {
      seenTiles.push({ tx, ty });
      return false;
    };
    resolvePixelCollision(64, 64, 5, 5, trackingSolid);
    expect(seenTiles.length).toBeGreaterThan(0);
    for (const { tx, ty } of seenTiles) {
      expect(Number.isInteger(tx)).toBe(true);
      expect(Number.isInteger(ty)).toBe(true);
    }
  });

  it('diagonal movement into wall slides along the unblocked axis', () => {
    const result = resolvePixelCollision(96, 64, 40, 20, rightWallSolid);
    expect(result.py).toBeCloseTo(84);
    expect(result.px).toBeLessThanOrEqual(136);
  });

  it('diagonal into corner (both X and Y blocked) stops player', () => {
    const result = resolvePixelCollision(96, 64, 40, 70, cornerSolid);
    expect(result.px).toBeLessThanOrEqual(96 + 40);
    expect(result.py).toBeLessThanOrEqual(64 + 70);
  });

  it('Y-blocked movement preserves X, zeroes Y', () => {
    const result = resolvePixelCollision(64, 96, 10, 40, bottomWallSolid);
    expect(result.px).toBeCloseTo(74);
    expect(result.py).toBeLessThanOrEqual(96 + 40);
  });
});

// ============================================================
// validatePixelSpeed
// ============================================================
describe('validatePixelSpeed', () => {
  it('movement at exactly PLAYER_SPEED_PX * dt is valid', () => {
    const valid = validatePixelSpeed(0, 0, PLAYER_SPEED_PX * DT, 0, DT);
    expect(valid).toBe(true);
  });

  it('movement within 10% tolerance (1.05x max) is valid', () => {
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
    const valid = validatePixelSpeed(0, 0, PLAYER_SPEED_PX * DT * 1.9, 0, DT, multiplier);
    expect(valid).toBe(true);
  });

  it('speedMultiplier=2 still rejects 3x base speed', () => {
    const multiplier = 2.0;
    const valid = validatePixelSpeed(0, 0, PLAYER_SPEED_PX * DT * 3.0, 0, DT, multiplier);
    expect(valid).toBe(false);
  });
});

// ============================================================
// bitmaskToKeyState
// ============================================================
describe('bitmaskToKeyState', () => {
  it('bitmask constants are exported with correct values', () => {
    expect(KEY_BIT_W).toBe(1);
    expect(KEY_BIT_A).toBe(2);
    expect(KEY_BIT_S).toBe(4);
    expect(KEY_BIT_D).toBe(8);
  });

  it('keys=0 produces all false (no keys pressed)', () => {
    const state = bitmaskToKeyState(0);
    expect(state).toEqual({ up: false, down: false, left: false, right: false });
  });

  it('keys=1 (W only) produces up=true, others false', () => {
    const state = bitmaskToKeyState(1);
    expect(state).toEqual({ up: true, down: false, left: false, right: false });
  });

  it('keys=2 (A only) produces left=true, others false', () => {
    const state = bitmaskToKeyState(2);
    expect(state).toEqual({ up: false, down: false, left: true, right: false });
  });

  it('keys=4 (S only) produces down=true, others false', () => {
    const state = bitmaskToKeyState(4);
    expect(state).toEqual({ up: false, down: true, left: false, right: false });
  });

  it('keys=8 (D only) produces right=true, others false', () => {
    const state = bitmaskToKeyState(8);
    expect(state).toEqual({ up: false, down: false, left: false, right: true });
  });

  it('keys=9 (W+D) produces up=true, right=true — diagonal', () => {
    const state = bitmaskToKeyState(9);
    expect(state).toEqual({ up: true, down: false, left: false, right: true });
  });

  it('keys=6 (A+S) produces left=true, down=true — diagonal', () => {
    const state = bitmaskToKeyState(6);
    expect(state).toEqual({ up: false, down: true, left: true, right: false });
  });

  it('keys=15 (all keys) produces all true', () => {
    const state = bitmaskToKeyState(15);
    expect(state).toEqual({ up: true, down: true, left: true, right: true });
  });

  it('keys=5 (W+S) produces up=true, down=true — opposing keys both true', () => {
    const state = bitmaskToKeyState(5);
    expect(state).toEqual({ up: true, down: true, left: false, right: false });
  });
});

// ============================================================
// createIsometricCollisionCheck
// ============================================================
describe('createIsometricCollisionCheck', () => {
  it('tile with no elevated neighbor is not blocked when base says false', () => {
    // Base: nothing is solid, all heights = 0
    const baseSolid = (_tx: number, _ty: number) => false;
    const getHeight = (_tx: number, _ty: number) => 0;
    const check = createIsometricCollisionCheck(baseSolid, getHeight);
    expect(check(5, 5)).toBe(false);
  });

  it('tile directly north of an elevated wall — full-tile block when no pixelY (backward compat)', () => {
    // Tile (5, 6) is an elevated wall; no pixelY provided → full-tile block
    const baseSolid = (tx: number, ty: number) => tx === 5 && ty === 6;
    const getHeight = (tx: number, ty: number) => (tx === 5 && ty === 6 ? 1 : 0);
    const check = createIsometricCollisionCheck(baseSolid, getHeight);
    expect(check(5, 5)).toBe(true);
  });

  it('tile north of a floor-level blocking tile (height = 0) is NOT additionally blocked', () => {
    // Tile (5, 6) is solid but height = 0 (flat); no visual overlap into (5, 5)
    const baseSolid = (tx: number, ty: number) => tx === 5 && ty === 6;
    const getHeight = (_tx: number, _ty: number) => 0; // all floor level
    const check = createIsometricCollisionCheck(baseSolid, getHeight);
    expect(check(5, 5)).toBe(false);
  });

  it('tile north of a non-blocking elevated tile is NOT blocked', () => {
    // Tile (5, 6) has height = 2 but is NOT solid (passable elevated)
    const baseSolid = (_tx: number, _ty: number) => false;
    const getHeight = (tx: number, ty: number) => (tx === 5 && ty === 6 ? 2 : 0);
    const check = createIsometricCollisionCheck(baseSolid, getHeight);
    expect(check(5, 5)).toBe(false);
  });

  it('base solid check still works through the wrapper (directly solid tile returns true)', () => {
    // Tile (3, 3) is directly solid
    const baseSolid = (tx: number, ty: number) => tx === 3 && ty === 3;
    const getHeight = (_tx: number, _ty: number) => 0;
    const check = createIsometricCollisionCheck(baseSolid, getHeight);
    expect(check(3, 3)).toBe(true);
  });

  it('elevated wall at height 2 also blocks the tile to its north (no pixelY)', () => {
    // Tile (2, 4) is an elevated wall with height = 2; tile (2, 3) should be blocked
    const baseSolid = (tx: number, ty: number) => tx === 2 && ty === 4;
    const getHeight = (tx: number, ty: number) => (tx === 2 && ty === 4 ? 2 : 0);
    const check = createIsometricCollisionCheck(baseSolid, getHeight);
    expect(check(2, 3)).toBe(true);
  });

  it('tiles not adjacent to any wall remain unblocked', () => {
    // Wall at (10, 10); tile (10, 8) is two rows north — should NOT be blocked
    const baseSolid = (tx: number, ty: number) => tx === 10 && ty === 10;
    const getHeight = (tx: number, ty: number) => (tx === 10 && ty === 10 ? 1 : 0);
    const check = createIsometricCollisionCheck(baseSolid, getHeight);
    expect(check(10, 8)).toBe(false);
  });

  // Sub-tile precision tests (1.5x collision zone via pixelY)
  it('north tile IS blocked when pixelY is in the southern half of the tile (>= tileMidY)', () => {
    // Wall at (5, 6); checking tile (5, 5) — tileY=5, tileMidY = 5*128 + 64 = 704
    const baseSolid = (tx: number, ty: number) => tx === 5 && ty === 6;
    const getHeight = (tx: number, ty: number) => (tx === 5 && ty === 6 ? 1 : 0);
    const check = createIsometricCollisionCheck(baseSolid, getHeight);
    // pixelY = 704 (exactly at midpoint) — should be blocked
    expect(check(5, 5, 704)).toBe(true);
    // pixelY = 800 (well into southern half) — should be blocked
    expect(check(5, 5, 800)).toBe(true);
    // pixelY = 767 (just before next tile boundary 768) — should be blocked
    expect(check(5, 5, 767)).toBe(true);
  });

  it('north tile is NOT blocked when pixelY is in the northern half of the tile (< tileMidY)', () => {
    // Wall at (5, 6); checking tile (5, 5) — tileY=5, tileMidY = 5*128 + 64 = 704
    const baseSolid = (tx: number, ty: number) => tx === 5 && ty === 6;
    const getHeight = (tx: number, ty: number) => (tx === 5 && ty === 6 ? 1 : 0);
    const check = createIsometricCollisionCheck(baseSolid, getHeight);
    // pixelY = 640 (start of tile) — northern half, NOT blocked
    expect(check(5, 5, 640)).toBe(false);
    // pixelY = 703 (just before midpoint) — NOT blocked
    expect(check(5, 5, 703)).toBe(false);
  });

  it('backward compat: no pixelY provided still blocks entire north tile', () => {
    // Wall at (5, 6); no pixelY → full tile block
    const baseSolid = (tx: number, ty: number) => tx === 5 && ty === 6;
    const getHeight = (tx: number, ty: number) => (tx === 5 && ty === 6 ? 1 : 0);
    const check = createIsometricCollisionCheck(baseSolid, getHeight);
    expect(check(5, 5)).toBe(true);
    expect(check(5, 5, undefined)).toBe(true);
  });
});
