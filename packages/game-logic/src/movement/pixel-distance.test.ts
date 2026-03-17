/**
 * pixel-distance.test.ts
 *
 * Unit tests for pixel-space distance calculations, coordinate conversions,
 * and range constants defined in pixel-distance.ts.
 */

import {
  pixelDistanceTo,
  tileToPixelCenter,
  pixelToTile,
  MELEE_RANGE_PX,
  GATHER_RANGE_PX,
  NPC_INTERACT_RANGE_PX,
  AGGRO_RADIUS_PX,
  LEASH_RADIUS_PX,
} from './pixel-distance';
import { TILE_SIZE_PX } from './pixel-validation';

// ============================================================
// pixelDistanceTo
// ============================================================

describe('pixelDistanceTo', () => {
  it('returns 128 for one tile horizontal distance', () => {
    expect(pixelDistanceTo(0, 0, 128, 0)).toBe(128);
  });

  it('returns 128 for one tile vertical distance', () => {
    expect(pixelDistanceTo(0, 0, 0, 128)).toBe(128);
  });

  it('returns 128*sqrt(2) for one tile diagonal distance', () => {
    expect(pixelDistanceTo(0, 0, 128, 128)).toBeCloseTo(128 * Math.sqrt(2), 10);
  });

  it('returns 0 when both positions are identical', () => {
    expect(pixelDistanceTo(100, 100, 100, 100)).toBe(0);
  });

  it('handles negative coordinates correctly', () => {
    expect(pixelDistanceTo(-64, 0, 64, 0)).toBe(128);
  });

  it('returns the same distance in both directions (symmetric)', () => {
    const ab = pixelDistanceTo(10, 20, 100, 200);
    const ba = pixelDistanceTo(100, 200, 10, 20);
    expect(ab).toBeCloseTo(ba, 10);
  });

  it('returns a non-negative value for all inputs', () => {
    expect(pixelDistanceTo(200, 300, 50, 50)).toBeGreaterThanOrEqual(0);
  });
});

// ============================================================
// tileToPixelCenter
// ============================================================

describe('tileToPixelCenter', () => {
  it('returns (64, 64) for tile (0, 0)', () => {
    expect(tileToPixelCenter(0, 0)).toEqual({ px: 64, py: 64 });
  });

  it('returns (192, 64) for tile (1, 0)', () => {
    expect(tileToPixelCenter(1, 0)).toEqual({ px: 192, py: 64 });
  });

  it('returns (64, 192) for tile (0, 1)', () => {
    expect(tileToPixelCenter(0, 1)).toEqual({ px: 64, py: 192 });
  });

  it('returns (192, 192) for tile (1, 1)', () => {
    expect(tileToPixelCenter(1, 1)).toEqual({ px: 192, py: 192 });
  });

  it('uses TILE_SIZE_PX so the result auto-scales with tile size', () => {
    const { px, py } = tileToPixelCenter(2, 3);
    expect(px).toBe(2.5 * TILE_SIZE_PX);
    expect(py).toBe(3.5 * TILE_SIZE_PX);
  });
});

// ============================================================
// pixelToTile
// ============================================================

describe('pixelToTile', () => {
  it('returns (0, 0) for the center of tile (0, 0)', () => {
    expect(pixelToTile(64, 64)).toEqual({ tileX: 0, tileY: 0 });
  });

  it('returns (1, 0) exactly on the tile-1 left boundary', () => {
    expect(pixelToTile(128, 0)).toEqual({ tileX: 1, tileY: 0 });
  });

  it('returns (0, 0) for pixel just before tile-1 boundary', () => {
    expect(pixelToTile(127, 127)).toEqual({ tileX: 0, tileY: 0 });
  });

  it('returns (1, 1) for tile center (1, 1)', () => {
    expect(pixelToTile(192, 192)).toEqual({ tileX: 1, tileY: 1 });
  });

  it('returns integer tile coordinates for any float pixel input', () => {
    const { tileX, tileY } = pixelToTile(130.7, 250.3);
    expect(Number.isInteger(tileX)).toBe(true);
    expect(Number.isInteger(tileY)).toBe(true);
  });
});

// ============================================================
// Round-trip: tileToPixelCenter → pixelToTile
// ============================================================

describe('tileToPixelCenter / pixelToTile round-trip', () => {
  it('round-trips (3, 5) back to the same tile', () => {
    const { px, py } = tileToPixelCenter(3, 5);
    expect(pixelToTile(px, py)).toEqual({ tileX: 3, tileY: 5 });
  });

  it('round-trips (0, 0) back to the same tile', () => {
    const { px, py } = tileToPixelCenter(0, 0);
    expect(pixelToTile(px, py)).toEqual({ tileX: 0, tileY: 0 });
  });

  it('round-trips (10, 10) back to the same tile', () => {
    const { px, py } = tileToPixelCenter(10, 10);
    expect(pixelToTile(px, py)).toEqual({ tileX: 10, tileY: 10 });
  });
});

// ============================================================
// Range constants
// ============================================================

describe('range constants', () => {
  it('MELEE_RANGE_PX equals 0.5 * TILE_SIZE_PX (64 px)', () => {
    expect(MELEE_RANGE_PX).toBe(0.5 * TILE_SIZE_PX);
    expect(MELEE_RANGE_PX).toBe(64);
  });

  it('GATHER_RANGE_PX equals 1.5 * TILE_SIZE_PX (192 px)', () => {
    expect(GATHER_RANGE_PX).toBe(1.5 * TILE_SIZE_PX);
    expect(GATHER_RANGE_PX).toBe(192);
  });

  it('NPC_INTERACT_RANGE_PX equals GATHER_RANGE_PX', () => {
    expect(NPC_INTERACT_RANGE_PX).toBe(GATHER_RANGE_PX);
  });

  it('AGGRO_RADIUS_PX equals 4 * TILE_SIZE_PX (512 px)', () => {
    expect(AGGRO_RADIUS_PX).toBe(4.0 * TILE_SIZE_PX);
    expect(AGGRO_RADIUS_PX).toBe(512);
  });

  it('LEASH_RADIUS_PX equals 8 * TILE_SIZE_PX (1024 px)', () => {
    expect(LEASH_RADIUS_PX).toBe(8.0 * TILE_SIZE_PX);
    expect(LEASH_RADIUS_PX).toBe(1024);
  });

  it('AGGRO_RADIUS_PX is less than LEASH_RADIUS_PX (creature leashes after aggroing)', () => {
    expect(AGGRO_RADIUS_PX).toBeLessThan(LEASH_RADIUS_PX);
  });

  it('MELEE_RANGE_PX is less than GATHER_RANGE_PX (gather reach exceeds melee reach)', () => {
    expect(MELEE_RANGE_PX).toBeLessThan(GATHER_RANGE_PX);
  });
});
