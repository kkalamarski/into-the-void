/**
 * PixelMovementController — continuous WASD pixel movement with client-side prediction.
 *
 * Replaces the tile-step MovementController for Phase 134.
 * Computes per-frame velocity from WASD key state, resolves AABB collision against
 * solid tiles, buffers inputs for server reconciliation, and emits pixel move events
 * to the server at ~20Hz.
 *
 * Coordinate convention:
 *   - (px, py) are absolute world-space pixel coordinates within the zone
 *   - Positive X = right, positive Y = down (standard 2D grid)
 */

import {
  velocityFromKeys,
  resolvePixelCollision,
  type KeyState,
} from '@into-the-void/game-logic';
import type { Direction } from '@into-the-void/shared-types';
import { gameSocket } from '../../network/socket';

// ── Constants ────────────────────────────────────────────────────────────────

/** Emit to server every 50ms (20Hz — matches server tick rate). */
const EMIT_INTERVAL_MS = 50;

/** Ignore server corrections under this distance to prevent micro-jitter. */
const RECONCILIATION_THRESHOLD_PX = 3;

/** Maximum buffered inputs to prevent memory issues on high latency. */
const MAX_PENDING_INPUTS = 30;

/** Key bitmask constants matching wire format: W=1, A=2, S=4, D=8. */
const KEY_W = 1;
const KEY_A = 2;
const KEY_S = 4;
const KEY_D = 8;

// ── Shared direction helper ─────────────────────────────────────────────────

/**
 * Maps a grid-space velocity vector (vx, vy) to one of 8 Direction strings.
 * Returns null if velocity is essentially zero.
 *
 * Sprite directions are grid-aligned (e.g. the 'n' sprite faces grid-north,
 * which appears as visual up-right in the isometric view). Using grid-space
 * velocity directly produces the correct sprite facing.
 *
 * Exported so RemotePlayerInterpolator can reuse the same mapping.
 */
export function velocityToDirection(vx: number, vy: number): Direction | null {
  if (Math.abs(vx) < 0.01 && Math.abs(vy) < 0.01) return null;

  const angle = Math.atan2(vy, vx) * (180 / Math.PI);

  if (angle >= -22.5 && angle < 22.5) return 'e';
  if (angle >= 22.5 && angle < 67.5) return 'se';
  if (angle >= 67.5 && angle < 112.5) return 's';
  if (angle >= 112.5 && angle < 157.5) return 'sw';
  if (angle >= 157.5 || angle < -157.5) return 'w';
  if (angle >= -157.5 && angle < -112.5) return 'nw';
  if (angle >= -112.5 && angle < -67.5) return 'n';
  if (angle >= -67.5 && angle < -22.5) return 'ne';

  return null;
}

// ── Types ───────────────────────────────────────────────────────────────────

interface PendingPixelInput {
  sequence: number;
  keys: number;
  vx: number;
  vy: number;
  /** Predicted position AFTER this input was applied. */
  px: number;
  py: number;
}

interface UpdateResult {
  px: number;
  py: number;
  moved: boolean;
  direction: Direction | null;
}

interface ReconcileResult {
  px: number;
  py: number;
  corrected: boolean;
}

// ── Controller ──────────────────────────────────────────────────────────────

export class PixelMovementController {
  private px = 0;
  private py = 0;
  private zoneId = '';
  private inputSequence = 0;
  private pendingInputs: PendingPixelInput[] = [];
  private lastEmitTime = 0;
  private isSolid: ((tileX: number, tileY: number) => boolean) | null = null;
  // ── Lifecycle ───────────────────────────────────────────────────────────

  /** Initialise position (called on zone load from zone:state). */
  init(px: number, py: number, zoneId: string): void {
    this.px = px;
    this.py = py;
    this.zoneId = zoneId;
    this.pendingInputs = [];
    this.inputSequence = 0;
    this.lastEmitTime = 0;
  }

  /** Set the collision lookup callback. Called by WorldScene when chunk data is available. */
  setCollisionCallback(isSolid: (tx: number, ty: number) => boolean): void {
    this.isSolid = isSolid;
  }

  // ── Per-frame update ────────────────────────────────────────────────────

  /**
   * Called every frame from WorldScene.update().
   *
   * @param dt    Delta-time in seconds.
   * @param keys  WASD key state (true = pressed).
   * @param time  Current Phaser time (ms) for emission throttling.
   */
  update(
    dt: number,
    keys: { W: boolean; A: boolean; S: boolean; D: boolean },
    time: number,
  ): UpdateResult {
    // Build KeyState for game-logic functions
    const keyState: KeyState = {
      up: keys.W,
      down: keys.S,
      left: keys.A,
      right: keys.D,
    };

    // Compute frame velocity
    const { vx, vy } = velocityFromKeys(keyState, dt);

    // No movement this frame
    if (vx === 0 && vy === 0) {
      return { px: this.px, py: this.py, moved: false, direction: null };
    }

    // Resolve collision (if callback is available)
    let resolvedPx: number;
    let resolvedPy: number;

    if (this.isSolid) {
      const resolved = resolvePixelCollision(this.px, this.py, vx, vy, this.isSolid);
      resolvedPx = resolved.px;
      resolvedPy = resolved.py;
    } else {
      resolvedPx = this.px + vx;
      resolvedPy = this.py + vy;
    }

    // Check if position actually changed (collision may block both axes)
    if (resolvedPx === this.px && resolvedPy === this.py) {
      return { px: this.px, py: this.py, moved: false, direction: null };
    }

    // Apply resolved position
    this.px = resolvedPx;
    this.py = resolvedPy;

    // Build input record
    this.inputSequence++;
    const bitmask =
      (keys.W ? KEY_W : 0) |
      (keys.A ? KEY_A : 0) |
      (keys.S ? KEY_S : 0) |
      (keys.D ? KEY_D : 0);

    this.pendingInputs.push({
      sequence: this.inputSequence,
      keys: bitmask,
      vx,
      vy,
      px: this.px,
      py: this.py,
    });

    // Cap buffer
    if (this.pendingInputs.length > MAX_PENDING_INPUTS) {
      this.pendingInputs.shift();
    }

    // Throttled server emission (~20Hz)
    if (time - this.lastEmitTime >= EMIT_INTERVAL_MS) {
      gameSocket.emit('player:pixelMove', {
        keys: bitmask,
        predictedPx: this.px,
        predictedPy: this.py,
        sequence: this.inputSequence,
      });
      this.lastEmitTime = time;
    }

    // Derive animation direction from velocity
    const direction = velocityToDirection(vx, vy);

    return { px: this.px, py: this.py, moved: true, direction };
  }

  // ── Server reconciliation ───────────────────────────────────────────────

  /**
   * Reconcile client prediction with server-authoritative position.
   * Called when a `positionCorrection` event arrives from the server.
   *
   * 1. Discards acknowledged inputs (sequence <= server sequence).
   * 2. Replays remaining unacknowledged inputs from the server position.
   * 3. If replayed position differs from current prediction by >= threshold,
   *    snaps to replayed position (corrected=true).
   */
  reconcile(serverPx: number, serverPy: number, sequence: number): ReconcileResult {
    // Discard acknowledged inputs
    this.pendingInputs = this.pendingInputs.filter(
      (input) => input.sequence > sequence,
    );

    // Replay remaining inputs from server position
    let replayPx = serverPx;
    let replayPy = serverPy;

    for (const input of this.pendingInputs) {
      if (this.isSolid) {
        const resolved = resolvePixelCollision(replayPx, replayPy, input.vx, input.vy, this.isSolid);
        replayPx = resolved.px;
        replayPy = resolved.py;
      } else {
        replayPx += input.vx;
        replayPy += input.vy;
      }
    }

    // Check distance between replayed and current prediction
    const dx = replayPx - this.px;
    const dy = replayPy - this.py;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < RECONCILIATION_THRESHOLD_PX) {
      // Prediction was close enough — keep current position
      return { px: this.px, py: this.py, corrected: false };
    }

    // Snap to replayed position
    this.px = replayPx;
    this.py = replayPy;

    return { px: this.px, py: this.py, corrected: true };
  }

  // ── Accessors ───────────────────────────────────────────────────────────

  getPosition(): { px: number; py: number; zoneId: string } {
    return { px: this.px, py: this.py, zoneId: this.zoneId };
  }

  /** Reset state — called on zone transition. */
  reset(): void {
    this.pendingInputs = [];
    this.inputSequence = 0;
    this.lastEmitTime = 0;
  }
}
