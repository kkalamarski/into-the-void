# Stack Research

**Domain:** Pixel movement rewrite — Phaser 3 + NestJS/Socket.IO multiplayer 2D isometric game
**Researched:** 2026-03-17
**Confidence:** HIGH (no new packages required; all patterns use existing stack)

---

## Executive Summary

The v1.27 pixel movement rewrite requires **zero new package installations**. Every technical
capability needed — continuous velocity-based movement, pixel hitbox collision, server-side
position validation, continuous position sync, and client-side interpolation for remote players
— is already present in the installed stack. The work is entirely architectural: replacing
tile-step logic with continuous physics logic within Phaser 3's Arcade Physics, adding a
server-side game loop for broadcasting positions at a fixed rate, and switching shared-types
`Position` from integer tile coords to float pixel coords.

---

## Recommended Stack

### Core Technologies (existing — no version changes needed)

| Technology | Current Version | Role in Pixel Movement | Why Sufficient |
|------------|-----------------|------------------------|----------------|
| Phaser 3 | ^3.80.0 (latest stable 3.90) | Arcade Physics for velocity-based movement + hitbox collision | `setVelocity(vx, vy)`, `setBodySize()`, `setOffset()` are the canonical pixel movement APIs. Physics update runs every frame against `delta` automatically. No new physics engine needed. |
| Socket.IO | ^4.7.0 | Continuous position sync — client sends input state, server broadcasts position snapshots | Already handles bi-directional real-time events. Rate limiting via emit throttle stays the same infrastructure. |
| NestJS | ^10.3.0 | Server-side game loop + position validation | `setInterval` in a NestJS service runs the broadcast loop; existing `PlayerService` and `GameService` own position state. |
| `@into-the-void/shared-types` | (internal) | `Position` type must gain `pixelX`, `pixelY` float fields (or replace `x`/`y` with floats) | All clients/server share this contract; changing it here propagates everywhere correctly. |
| `@into-the-void/game-logic` | (internal) | Replace `validateMovement` (tile-step) with `validatePixelMovement` (speed + bounds check) | Pure TypeScript functions; no new dependencies needed. |
| Zustand | ^4.5.0 | Client game state including pixel position — no changes to library usage | Existing store already holds player position; just stores float coords instead of int tile coords. |

### Supporting Libraries (existing — no additions)

| Library | Version | Role | Notes |
|---------|---------|------|-------|
| Phaser Arcade Physics (built-in) | Phaser 3.80+ | Player hitbox, velocity, world bounds | Already in Phaser. Enable physics on player sprite via `this.physics.add.existing(sprite)`. Body size set to ~48x24 to fit isometric footprint at base. |
| `immer` | ^11.1.4 | Zustand state updates | Already used; float coords flow through the same update pattern. |

### Development Tools (no changes)

| Tool | Purpose | Notes |
|------|---------|-------|
| vitest | Unit testing | Add unit tests for `validatePixelMovement()` and speed-cap logic in game-logic package |
| NX | Monorepo builds | No change required |

---

## Installation

No new packages. No version bumps required.

```bash
# Nothing to install — all capabilities exist in current dependencies
```

---

## Architecture Changes Required (not stack additions)

These are code-level changes within the existing stack, documented here to inform roadmap phase planning.

### 1. Shared Types — `Position` extension (HIGH confidence)

Current `Position.x` and `Position.y` are integer tile coordinates. Pixel movement requires
sub-tile float precision.

**Change:** Add `pixelX: number` and `pixelY: number` to `Position`. Keep `x`/`y` as derived tile
indices so all existing tile-coord consumers continue to work without modification. Tile coords
are computed as `Math.floor(pixelX / TILE_SIZE)`.

```typescript
// packages/shared-types/src/core/position.ts
export interface Position {
  x: number;        // tile column (derived: Math.floor(pixelX / TILE_SIZE))
  y: number;        // tile row (derived: Math.floor(pixelY / TILE_SIZE))
  pixelX: number;   // float pixel X within zone
  pixelY: number;   // float pixel Y within zone
  zoneId: string;
}
```

### 2. Client MovementController — velocity-based (HIGH confidence)

Replace direction-step logic with velocity accumulation pattern. In each Phaser `update(delta)`
frame, read held WASD keys, compute normalized velocity vector, scale by `PLAYER_SPEED * delta`,
apply to physics body, read back actual position (post-collision from Arcade Physics), and emit
to server on key state changes.

```typescript
// apps/web/src/game/systems/MovementController.ts (rewrite)
const PLAYER_SPEED = 200; // pixels per second — tunable

update(delta: number, keys: WASDKeys): void {
  const vx = (keys.D.isDown ? 1 : 0) - (keys.A.isDown ? 1 : 0);
  const vy = (keys.S.isDown ? 1 : 0) - (keys.W.isDown ? 1 : 0);
  // Normalize diagonal so diagonal speed equals cardinal speed
  const len = Math.sqrt(vx * vx + vy * vy) || 1;
  this.playerBody.setVelocity(
    (vx / len) * PLAYER_SPEED,
    (vy / len) * PLAYER_SPEED
  );
  // Position read-back happens after physics step, before rendering
}
```

No tweens involved. Movement is frame-rate-independent via `delta`.

### 3. Phaser Arcade Physics on player sprite (HIGH confidence)

Current player is a `Phaser.GameObjects.Sprite` (non-physics). For pixel collision and velocity
it must become a `Phaser.Physics.Arcade.Sprite` or have `this.physics.add.existing()` called.

```typescript
// WorldScene.create()
this.physics.add.existing(this.localPlayer); // makes body dynamic
const body = this.localPlayer.body as Phaser.Physics.Arcade.Body;
body.setCollideWorldBounds(false); // zone transitions handled manually
body.setSize(48, 24);              // isometric footprint (not full 96x96 cube)
body.setOffset(24, 72);            // anchor at base of isometric cube
```

Tile collision uses a `StaticGroup` of physics-enabled invisible blockers placed at each
`collisionMap[y][x] === true` cell during chunk load. Phaser handles AABB resolution automatically.

### 4. Server game loop for position broadcast (HIGH confidence)

Current pattern: server responds to `player:move` events only (pull). Pixel movement requires the
server to push position snapshots at a fixed rate regardless of event frequency.

**Pattern:** `setInterval` at 50ms (20Hz) in `PlayerService.onModuleInit()`. Each tick collects
dirty positions (changed since last broadcast), emits `player:moved` to zone room. 20Hz is the
established MMO standard — sufficient for smooth interpolation, cheap enough for an MMO server.

```typescript
// apps/game-server/src/game/player.service.ts
onModuleInit(): void {
  setInterval(() => {
    this.broadcastDirtyPositions();
  }, 50); // 20 Hz
}
```

Client receives authoritative position snapshots. Remote players are lerped toward the latest
received position in client `update()`. Local player uses client prediction + server reconciliation
(same concept as now, different coordinate type).

### 5. Server-side position validation (MEDIUM confidence)

Replace tile-to-tile step validation with speed-cap validation. Server checks:
- Max displacement per elapsed time: `distance <= PLAYER_SPEED * elapsed_seconds * 1.5` (1.5x tolerance for latency spikes)
- Zone bounds: `pixelX` within `[0, ZONE_SIZE * TILE_SIZE]`
- Walkability at computed tile index (existing collision map lookup)

No physics engine on server. Pure math in `game-logic` package.

### 6. Client input event shape change (HIGH confidence)

Replace `player:move` (direction + sequence) with a velocity-vector payload. Server accumulates
input state between ticks rather than processing discrete direction events.

```typescript
// shared-types ClientEvents update
'player:input': { vx: number; vy: number; sequence: number; timestamp: number };
```

### 7. Collision map as physics StaticGroup (HIGH confidence)

Current: `collisionMap: boolean[][]` used for discrete tile lookup.
New: On chunk load, iterate blocked tiles and place invisible static physics bodies in a
`StaticGroup`. Phaser Arcade Physics handles AABB separation automatically.

This is the correct Phaser pattern for collision without using `Tilemap` (which this project
does not use — rendering is procedural).

```typescript
// When chunk loads:
chunkData.tiles.forEach((row, y) => {
  row.forEach((tileId, x) => {
    if (TileRegistry.get(tileId).walkable === false) {
      const blocker = this.physics.add.staticImage(isoX, isoY, '__DEFAULT');
      blocker.setVisible(false);
      (blocker.body as Phaser.Physics.Arcade.StaticBody).setSize(96, 48);
      blockerGroup.add(blocker);
    }
  });
});
this.physics.add.collider(this.localPlayer, blockerGroup);
```

### 8. Remote player interpolation (HIGH confidence)

Implement two-snapshot linear interpolation for other players' sprites. Canonical pattern from
Gabriel Gambetta's entity interpolation: maintain a ring buffer of two most-recent snapshots,
interpolate based on elapsed time. At 20Hz, interpolation covers 50ms gaps smoothly.

```typescript
// In update() per remote player:
const t = (now - snapshot1.timestamp) / (snapshot2.timestamp - snapshot1.timestamp);
const clampedT = Math.min(t, 1.0); // never extrapolate
sprite.setPosition(
  lerp(snapshot1.pixelX, snapshot2.pixelX, clampedT),
  lerp(snapshot1.pixelY, snapshot2.pixelY, clampedT)
);
```

On position delta > 2 tiles, snap immediately instead of lerp (teleport, respawn, etc.).

---

## Alternatives Considered

| Recommended | Alternative | Why Not |
|-------------|-------------|---------|
| Phaser Arcade Physics (built-in) for collision | Matter.js (also built-in Phaser) | Matter.js is for rigid-body simulation. Arcade Physics AABB is exactly sufficient for rectangular tile blockers. Lower overhead. |
| Phaser Arcade Physics StaticGroup for tile blockers | Manual AABB math in MovementController | StaticGroup lets Phaser handle sub-pixel separation resolution. Manual math in MovementController was the source of "flat blocking tiles" bugs. |
| 20Hz server broadcast (50ms tick) | 60Hz (16ms tick) | 60Hz at MMO scale is expensive. 20Hz with client-side linear interpolation is visually smooth. Industry standard for MMOs. |
| Float pixel coords added to `Position` | Separate `PixelPosition` type | Single `Position` type reduces refactor scope; keeping derived tile `x`/`y` avoids breaking all existing tile-coord consumers. |
| `setInterval` server game loop | `@nestjs/schedule` `@Interval` decorator | Both work equivalently. `setInterval` is simpler; `AutomationService` already uses this pattern — consistency. |
| Manual lerp for remote player interpolation | `@geckos.io/snapshot-interpolation` | The library's last release was 1+ year ago (maintenance concern). It also assumes UDP/WebRTC transport (a major infrastructure change). Manual 2-snapshot lerp is 10 lines and zero dependencies. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Phaser Matter.js physics | Overkill for AABB-only tile collision. Significant CPU overhead for isometric use. | Phaser Arcade Physics |
| Phaser built-in `Tilemap`/`TilemapLayer` collision | Project uses procedural rendering — `Tilemap` assumes Tiled JSON input and a different rendering pipeline. Switching would break all rendering. | Manual `StaticGroup` of physics bodies per blocked tile |
| `@geckos.io/snapshot-interpolation` | Zero maintenance (1+ year since last release), switches transport to WebRTC/UDP (Docker/firewall implications, no Socket.IO compatibility). | Manual 2-snapshot lerp in `update()` |
| Tweens for player movement | Tweens are time-based animations not physics objects. They don't interact with Arcade Physics bodies. This is why current movement feels unresponsive. | `body.setVelocity()` with delta-time physics step |
| A* `PathfindingController` | Being explicitly removed in v1.27. Click-to-move dropped entirely. | WASD velocity-based movement only |
| `Direction` enum as primary movement signal | Discrete 8-way enum cannot express pixel-level movement direction or diagonal blending. | Float `{ vx, vy }` velocity vector in `player:input` event |

---

## Stack Patterns by Variant

**For local player movement:**
- Use Phaser `Arcade.Sprite` or `physics.add.existing(sprite)` to enable physics body
- Call `body.setVelocity(vx, vy)` each frame based on currently-held WASD keys
- Apply diagonal normalization to maintain consistent speed in all directions
- After physics step, read `body.x / body.y` as authoritative pixel position
- Emit `player:input` event on key-state changes (not every frame) with sequence number

**For remote player rendering:**
- Store ring buffer of last two received `player:moved` snapshots (position + timestamp)
- In `update()`, lerp pixel position based on `(now - t1) / (t2 - t1)`
- Cap interpolation factor at 1.0 — never extrapolate past last known position
- On position delta > ~192px (2 tiles), snap to avoid long-distance lag smearing

**For tile collision:**
- Populate a `StaticGroup` from `collisionMap` on each chunk load
- Position each static body at the isometric screen coordinate of the blocked tile
- Add a single `collider(localPlayer, staticGroup)` in `WorldScene.create()`
- Destroy and recreate `StaticGroup` entries when chunks unload/reload

**For server validation:**
- Accept `player:input` payload, compute displacement from last known server position
- Cap to `PLAYER_SPEED * elapsed_seconds * 1.5` (speed hack prevention)
- If valid, update server-side position; include in next 20Hz broadcast
- If invalid, send correction (`player:moved` with authoritative position + sequence)

---

## Version Compatibility

| Package | Version in Project | Compatibility Note |
|---------|-------------------|-------------------|
| `phaser@^3.80.0` | 3.80.x (3.90 latest stable) | Arcade Physics API stable since 3.60. `setVelocity`, `setBodySize`, `setOffset`, `physics.add.existing`, `StaticGroup` all exist in 3.80+. No upgrade required, 3.90 is a safe drop-in if desired. |
| `socket.io@^4.7.0` | 4.7.x | Event payload shape change (`player:move` to `player:input`) requires matching client+server deploy. Non-breaking since event name changes. |
| `@nestjs/websockets@^10.3.0` | 10.3.x | No changes to WebSocket infrastructure. `setInterval` loop in service is framework-agnostic. |

---

## Sources

- [Phaser 3 Arcade Physics concepts](https://docs.phaser.io/phaser/concepts/physics/arcade) — `setVelocity`, `setBodySize`, `setOffset`, `StaticGroup`, `collider` APIs (HIGH confidence, official docs)
- [Phaser 3 Arcade Body API](https://docs.phaser.io/api-documentation/class/physics-arcade-body) — velocity in pixels/second, drag, `setCollideWorldBounds` (HIGH confidence, official docs)
- [Phaser 3 latest version 3.90](https://phaser.io/download/stable) — confirmed 3.90 is last v3 release; v4 in RC4 as of May 2025, not released (HIGH confidence)
- [Gabriel Gambetta — Entity Interpolation](https://www.gabrielgambetta.com/entity-interpolation.html) — two-snapshot interpolation pattern, 100ms display delay, no extrapolation principle (HIGH confidence, canonical netcode reference)
- [Socket.IO v4 documentation](https://socket.io/docs/v4/server-options/) — event maps, connection recovery options (HIGH confidence, official docs)
- Existing codebase inspection of `MovementController.ts`, `WorldScene.ts`, `game.gateway.ts`, `player.service.ts`, `packages/shared-types/src/core/position.ts` — confirmed current tile-step architecture and exact callsites that require changes (HIGH confidence)
- WebSearch: multiplayer tick rate patterns — 20-30Hz standard for MMO position sync, corroborated by Valve Source Networking docs and GameDev.net discussions (MEDIUM confidence)
- [Phaser Arcade Physics isometric discussion](https://github.com/phaserjs/phaser/discussions/6312) — confirms manual StaticGroup approach is community standard for non-Tilemap collision (MEDIUM confidence)

---

*Stack research for: pixel movement rewrite (v1.27)*
*Researched: 2026-03-17*
