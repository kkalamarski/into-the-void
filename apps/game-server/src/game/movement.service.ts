import { Injectable, OnModuleInit } from '@nestjs/common';
import { Server } from 'socket.io';
import { PlayerService } from './player.service';
import { ZonesService } from '../zones/zones.service';
import {
  bitmaskToKeyState,
  velocityFromKeys,
  resolvePixelCollision,
  validatePixelSpeed,
} from '@into-the-void/game-logic';
import { ZONE_SIZE } from '@into-the-void/shared-types';

interface PixelMoveInput {
  keys: number;
  predictedPx: number;
  predictedPy: number;
  sequence: number;
}

/** 20Hz server tick rate for pixel movement processing */
const TICK_MS = 50;

/**
 * Broadcast radius in pixels — 12 tiles.
 * Covers aggro + leash range with a safety margin.
 */
const BROADCAST_RADIUS_PX = 1536;

/**
 * Maximum delta-time cap in seconds.
 * Prevents teleportation when a player has stale input.
 */
const MAX_DT = 0.2;

/** Collision divergence threshold — correct client if server position differs by more than this. */
const COLLISION_CORRECTION_THRESHOLD_PX = 2.0;

/**
 * MovementService — 20Hz authoritative pixel movement tick loop.
 *
 * Responsibilities:
 * - Accept queued key-state inputs from GameGateway (one per player per tick)
 * - Validate movement speed against validatePixelSpeed
 * - Resolve collisions via resolvePixelCollision + synchronous getChunkSync
 * - Broadcast positionBatch to nearby observers (self excluded)
 * - Emit positionCorrection to any player whose predicted position failed validation
 *
 * Zone transitions remain tile-based via the old player:move handler until Phase 134.
 * This tick loop only handles within-zone continuous movement.
 */
@Injectable()
export class MovementService implements OnModuleInit {
  /** Latest pending input per player (keyed by playerId). Overwritten each input event. */
  private pendingInputs: Map<string, PixelMoveInput> = new Map();

  /** Socket.IO server reference — set via setServer() from GameGateway.afterInit */
  private server: Server | null = null;

  /** Tick interval handle for cleanup (currently unused but kept for future OnModuleDestroy) */
  private tickTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly playerService: PlayerService,
    private readonly zonesService: ZonesService,
  ) {}

  /**
   * Store the Socket.IO server reference.
   * Called from GameGateway.afterInit, same pattern as PlayerService.setServer().
   */
  setServer(server: Server): void {
    this.server = server;
  }

  /**
   * Queue the latest pixel move input for a player.
   * Only the most recent input is retained per player per tick — no backlog.
   */
  queueInput(playerId: string, input: PixelMoveInput): void {
    this.pendingInputs.set(playerId, input);
  }

  /**
   * Start the 20Hz tick loop on module initialization.
   */
  onModuleInit(): void {
    this.tickTimer = setInterval(() => this.tick(), TICK_MS);
  }

  /**
   * Core 20Hz tick — drains pending inputs, validates and resolves each move,
   * then broadcasts position updates to nearby observers.
   */
  private tick(): void {
    if (this.pendingInputs.size === 0) return;

    // Drain the map into a local snapshot and clear it for the next tick
    const snapshot = new Map(this.pendingInputs);
    this.pendingInputs.clear();

    const dirty: Array<{ playerId: string; px: number; py: number }> = [];

    for (const [playerId, input] of snapshot) {
      const player = this.playerService.getPlayerById(playerId);

      // Skip disconnected, dead, or position-less players
      if (!player || player.isDead || !player.position) {
        continue;
      }

      // Cap delta-time to prevent teleportation on stale input
      const now = Date.now();
      const dt = Math.min((now - player.lastPxInputTime) / 1000, MAX_DT);
      player.lastPxInputTime = now;

      // Convert bitmask to KeyState
      const keyState = bitmaskToKeyState(input.keys);

      // Compute velocity from keys
      const { vx, vy } = velocityFromKeys(keyState, dt);

      // No keys held — update timestamp but player did not move; skip dirty list
      if (vx === 0 && vy === 0) {
        continue;
      }

      // Speed validation — reject teleport attempts
      const speedValid = validatePixelSpeed(
        player.px,
        player.py,
        input.predictedPx,
        input.predictedPy,
        dt,
      );

      if (!speedValid) {
        // Snap player back to last valid server position
        this.server?.to(player.socketId).emit('positionCorrection', {
          px: player.px,
          py: player.py,
          sequence: input.sequence,
        });
        continue;
      }

      // Collision resolution — synchronous chunk lookup (no async in tick path)
      const chunk = this.zonesService.getChunkSync(player.position.zoneId);
      if (!chunk) {
        // Zone not cached this tick — skip player; they will be processed next tick
        continue;
      }

      // Build collision callback — hub zones use local chunk data directly,
      // open-world zones use cross-zone world-tile lookup for boundary handling
      let isSolid: (tx: number, ty: number) => boolean;
      if (player.position.zoneId.startsWith('z_')) {
        const zoneCoords = this.parseZoneCoords(player.position.zoneId);
        const offsetX = zoneCoords.x * ZONE_SIZE;
        const offsetY = zoneCoords.y * ZONE_SIZE;
        isSolid = (tx: number, ty: number): boolean =>
          this.zonesService.isWorldTileBlocked(offsetX + tx, offsetY + ty);
      } else {
        const collisions = chunk.collisions;
        isSolid = (tx: number, ty: number): boolean =>
          collisions?.[ty]?.[tx] ?? true;
      }

      const resolved = resolvePixelCollision(player.px, player.py, vx, vy, isSolid);

      // Update authoritative position
      player.px = resolved.px;
      player.py = resolved.py;

      // Collision-divergence correction — if the server's collision-resolved position
      // differs from the client's predicted position by more than the threshold, snap the
      // client to the server's authoritative result immediately.  This prevents silent drift
      // that accumulates between ticks and causes rubber-banding near walls.
      const dxPred = resolved.px - input.predictedPx;
      const dyPred = resolved.py - input.predictedPy;
      const predDist = Math.sqrt(dxPred * dxPred + dyPred * dyPred);

      if (predDist > COLLISION_CORRECTION_THRESHOLD_PX) {
        this.server?.to(player.socketId).emit('positionCorrection', {
          px: resolved.px,
          py: resolved.py,
          sequence: input.sequence,
        });
      }

      dirty.push({ playerId, px: resolved.px, py: resolved.py });
    }

    if (dirty.length === 0) return;

    this.broadcastBatch(dirty);
  }

  /**
   * Parse zone coordinates (x, y) from a zoneId string.
   * Open-world zones follow "z_X_Y" format (e.g., "z_3_-2" -> {x:3, y:-2}).
   * Hub zones (e.g., "hub_verdant") are single-chunk spaces with no world offset.
   */
  private parseZoneCoords(zoneId: string): { x: number; y: number } {
    if (!zoneId.startsWith('z_')) {
      return { x: 0, y: 0 };
    }
    const parts = zoneId.split('_');
    return { x: parseInt(parts[1], 10), y: parseInt(parts[2], 10) };
  }

  /**
   * Broadcast position updates to nearby observers in each affected zone.
   * Each observer receives only movers within BROADCAST_RADIUS_PX of their position.
   * Self is excluded — clients rely on local prediction for their own character.
   */
  private broadcastBatch(dirty: Array<{ playerId: string; px: number; py: number }>): void {
    if (!this.server) return;

    // Group dirty movers by zone so we only iterate observers in the relevant zone
    const byZone = new Map<string, Array<{ playerId: string; px: number; py: number }>>();
    for (const mover of dirty) {
      const player = this.playerService.getPlayerById(mover.playerId);
      if (!player) continue;
      const zoneId = player.position.zoneId;
      if (!byZone.has(zoneId)) {
        byZone.set(zoneId, []);
      }
      byZone.get(zoneId)!.push(mover);
    }

    // For each zone, find all observers and emit relevant updates
    for (const [zoneId, movers] of byZone) {
      const observers = this.playerService
        .getAllOnlinePlayers()
        .filter((p) => p.position.zoneId === zoneId);

      for (const observer of observers) {
        // Collect movers that are within broadcast radius and not the observer themselves
        const nearby = movers.filter(
          (m) =>
            m.playerId !== observer.id &&
            Math.hypot(m.px - observer.px, m.py - observer.py) <= BROADCAST_RADIUS_PX,
        );

        if (nearby.length === 0) continue;

        this.server.to(observer.socketId).emit('positionBatch', {
          updates: nearby.map((m) => ({
            playerId: m.playerId,
            px: m.px,
            py: m.py,
          })),
        });
      }
    }
  }
}
