/**
 * RemotePlayerInterpolator — smooth rendering of remote players between server updates.
 *
 * Stores a per-player buffer of position snapshots received from `positionBatch` events.
 * Each frame, interpolates between buffered snapshots so remote players glide smoothly
 * instead of teleporting between server ticks.
 *
 * Design: renders INTERPOLATION_DELAY_MS behind real-time so there is always a pair of
 * snapshots to interpolate between, even when packets arrive unevenly.
 */

import type { Direction } from '@into-the-void/shared-types';
import { velocityToDirection } from './PixelMovementController';

// ── Constants ────────────────────────────────────────────────────────────────

/** Maximum snapshots to keep per player. */
const BUFFER_SIZE = 3;

/** Render this many ms behind live to ensure two snapshots are always available. */
const INTERPOLATION_DELAY_MS = 100;

// ── Types ───────────────────────────────────────────────────────────────────

interface PositionSnapshot {
  px: number;
  py: number;
  timestamp: number;
}

export interface InterpolatedPosition {
  px: number;
  py: number;
  moving: boolean;
  direction: Direction | null;
}

// ── Interpolator ────────────────────────────────────────────────────────────

export class RemotePlayerInterpolator {
  private buffers: Map<string, PositionSnapshot[]> = new Map();

  /**
   * Record a new position snapshot for a remote player.
   * Called when a `positionBatch` event arrives from the server.
   */
  pushPosition(playerId: string, px: number, py: number): void {
    let buffer = this.buffers.get(playerId);
    if (!buffer) {
      buffer = [];
      this.buffers.set(playerId, buffer);
    }

    buffer.push({ px, py, timestamp: Date.now() });

    // Cap buffer size
    if (buffer.length > BUFFER_SIZE) {
      buffer.shift();
    }
  }

  /**
   * Get the interpolated position for a remote player at the given time.
   *
   * Returns null if not enough data is available for interpolation.
   *
   * @param playerId     The remote player to interpolate.
   * @param currentTime  Current wall-clock time (Date.now()).
   */
  getInterpolatedPosition(
    playerId: string,
    currentTime: number,
  ): InterpolatedPosition | null {
    const buffer = this.buffers.get(playerId);
    if (!buffer || buffer.length < 2) return null;

    // Render time — we look back by INTERPOLATION_DELAY_MS
    const renderTime = currentTime - INTERPOLATION_DELAY_MS;

    // Find the pair of snapshots that straddle renderTime
    let from: PositionSnapshot | null = null;
    let to: PositionSnapshot | null = null;

    for (let i = 0; i < buffer.length - 1; i++) {
      if (buffer[i].timestamp <= renderTime && buffer[i + 1].timestamp >= renderTime) {
        from = buffer[i];
        to = buffer[i + 1];
        break;
      }
    }

    // Render time is after all snapshots — hold at last known position
    if (!from || !to) {
      const last = buffer[buffer.length - 1];
      if (renderTime >= last.timestamp) {
        return { px: last.px, py: last.py, moving: false, direction: null };
      }
      // Render time is before all snapshots — hold at first position
      const first = buffer[0];
      return { px: first.px, py: first.py, moving: false, direction: null };
    }

    // Compute interpolation factor
    const duration = to.timestamp - from.timestamp;
    const t = duration > 0
      ? Math.max(0, Math.min(1, (renderTime - from.timestamp) / duration))
      : 0;

    // Linear interpolation
    const px = from.px + (to.px - from.px) * t;
    const py = from.py + (to.py - from.py) * t;

    // Derive direction from the delta between snapshots
    const dx = to.px - from.px;
    const dy = to.py - from.py;
    const direction = velocityToDirection(dx, dy);
    const moving = direction !== null;

    return { px, py, moving, direction };
  }

  /** Remove a player's buffer (called on player:left). */
  removePlayer(playerId: string): void {
    this.buffers.delete(playerId);
  }

  /** Clear all buffers (called on zone transition). */
  clear(): void {
    this.buffers.clear();
  }
}
