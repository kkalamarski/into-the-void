# Feature Research: Pixel Movement Rewrite

**Domain:** 2D multiplayer top-down game — free sub-tile WASD movement
**Researched:** 2026-03-17
**Confidence:** HIGH (architecture from codebase analysis + MEDIUM for network patterns from verified sources)

---

## Context: What Is Being Replaced

The current system (v1.26) uses tile-to-tile movement:
- Position is a discrete `{x, y, zoneId}` — always snapped to integer tile coordinates
- Movement fires one event per tile (500ms interval, rate-limited at 140ms server-side)
- Direction enum `'n'|'s'|'e'|'w'|'ne'|'nw'|'se'|'sw'` is the unit of input
- `calculateNewPosition()` adds ±1 to tile x/y
- `validateMovement()` checks a `boolean[][]` collision map indexed by tile x/y
- Interaction range checks use `manhattanDistance()` in tile units
- `pathfindingController` drives A* click-to-move sequences

Everything downstream — combat range (tile distance), gathering range (tile proximity), NPC interaction (1 tile), visibility culling (15 tile radius), entity position in DB — uses tile coordinates.

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features that must exist for the movement rewrite to feel complete. Missing any makes the game feel broken.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Continuous pixel position** | Free movement means position is a float `{px, py}`, not `{tileX, tileY}`. Players expect to stand between tiles. | HIGH | `Position` type must gain `px`/`py` fields or become `{px, py, zoneId}`. All downstream consumers must be updated. DB schema changes required. |
| **Velocity-based WASD input** | Keys held down continuously move the character in real-time, not one-tile-at-a-time. No move timer/delay loop. | MEDIUM | Replace `key.isDown → direction → processInput(direction)` with `setVelocityX/Y` in Phaser update loop. Speed = pixels/sec constant. |
| **Pixel hitbox collision** | Character cannot walk through solid tile geometry. Collision must be sub-tile accurate. | HIGH | Replace `boolean[tileY][tileX]` lookup with AABB test against solid tile rectangles. Tile size is 96px (screen) but world coordinates can differ. See "Solid tile map" below. |
| **Diagonal normalization** | Moving W+S simultaneously should not be 41% faster than cardinal movement. | LOW | Normalize velocity vector when both axes are non-zero: `vx *= 0.707; vy *= 0.707`. Already exists conceptually in tile movement direction resolution. |
| **Camera follows player smoothly** | Camera must track the pixel-accurate player position each frame, not lerp between tile centers. | LOW | Phaser `camera.startFollow(playerSprite)` already does this — just needs sprite to move continuously rather than via tweens. |
| **Smooth local player animation** | Walking animation plays while moving, idle when stopped. Direction-aware sprite facing. | MEDIUM | Replace tween-based `movementTweenEndTime` logic with `velocity !== 0` check each frame. Facing direction maps velocity angle to 8-directional sprite. |
| **Other players interpolated** | Remote players must move smoothly between received server positions. Without interpolation they snap/teleport every update. | HIGH | Store a position buffer with timestamps. Render at `now - bufferDelay` (typically 100ms). Linear interpolate between last two received positions. Critical for multiplayer feel. |
| **Server-authoritative position sync** | Server validates final positions and corrects cheats/desync. Client predicts, server reconciles. | HIGH | Already exists conceptually (sequence numbers in `MovementController`). Must be redesigned for continuous coordinates. Server emits `{px, py, sequence}` instead of `{tileX, tileY}`. |
| **Pixel-distance interaction checks** | Combat, gathering, NPC interaction currently use `manhattanDistance(tile, tile)`. Must convert to Euclidean pixel distance. | MEDIUM | `Math.sqrt((px2-px1)^2 + (py2-py1)^2)`. Define pixel ranges per system: melee ~96px (1 tile), ranged ~288px (3 tiles), gathering/NPC ~144px (1.5 tiles). |
| **Flat tile visual fix** | Some tiles appear walkable but block movement (elevated tiles look flat from above, tiles at elevation > 0 that shouldn't be passable). | MEDIUM | Collision data must encode walkability per tile-face, not just per tile position. Elevation-based blocking already in `validateMovementWithElevation`. Needs pixel-space equivalent. |

### Differentiators (Competitive Advantage)

Features that improve feel beyond basic correctness. These are what separate "functional" from "great".

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Tile-speed modifiers as continuous velocity multipliers** | Biome/tile movement penalties (kelp forest 0.8x, deep trenches 0.7x) apply as smooth velocity scaling, not move-timer changes. Players feel environmental drag immediately. | LOW | Current `getMovementSpeedModifier(tileId, biome)` returns 0.0–1.0. Multiply into `baseSpeed * modifier` for the current tile under the player. Sample tile at player center. |
| **Zone boundary crossing at pixel granularity** | Player crosses zone boundary smoothly mid-step rather than snapping to tile 0 of the new zone. No visible stutter at chunk seams. | HIGH | Requires world-coordinate system: convert `{zoneId, tileX, tileY}` to absolute `{worldPx, worldPy}`. Zone boundary = zone width in pixels. Current ZONE_SIZE × 96px. |
| **Inertia / momentum feel** | Brief deceleration on key release makes the character feel physical, not robotic. Even 50–100ms of fade-out drag is perceptible. | LOW | `body.setDragX/Y` or manual velocity decay in update. Keep subtle — MMO context, not platformer. Optional: can skip for first pass. |
| **Collision sliding** | When walking into a wall at a shallow angle, player slides along the wall face rather than stopping dead. Standard AABB resolution behavior. | MEDIUM | Phaser Arcade Physics handles this natively when separating on X and Y axes independently. Ensures player doesn't feel "stuck" on corners. |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Click-to-move / pathfinding** | Legacy feature, some players prefer it | Out of scope for this milestone per PROJECT.md. Pathfinding in pixel space requires navmesh or expensive real-time A* over pixel grid. Complexity is disproportionate. | Remove `PathfindingController` entirely. Keep WASD only. |
| **Physics engine (Matter.js)** | Tempting for "real" physics, collision joints | Matter.js overkill for top-down with no jumping or complex physics interactions. Adds ~200KB to bundle and unpredictable collision behavior at high velocity. Arcade Physics' AABB is sufficient and fast. | Use Phaser Arcade Physics with `setCollisionByProperty` on tilemap layers. |
| **Server-side physics simulation** | "True" server authority on velocity | Running Phaser physics server-side is impractical in NestJS. Server should validate positions, not simulate step-by-step physics. Canonical approach: validate final position plausibility (max speed check + collision check). | Server validates: `|Δpx| ≤ maxSpeed × Δtime`. Reject teleportation. Trust client physics for smooth movement. |
| **Pixel-perfect click-to-interact** | Clicking a creature or node at pixel precision | Adds complexity without value. Existing click-to-target is sufficient: click → select entity → use action button/auto-attack. | Keep existing click-to-target system. Only interaction range becomes pixel-distance based. |
| **Per-pixel collision map** | More accurate than per-tile | A 256-tile zone at 96px/tile = 24,576 × 24,576 pixel grid. Completely impractical to store or query. | Per-tile solid/walkable flag is sufficient. AABB player hitbox (e.g., 48×48px) tested against tile rectangles. |
| **Interpolation delay elimination** | Players want to see others in real-time | Removing interpolation delay causes other players to snap/teleport every 100ms server tick. The 100ms lag on remote players is invisible in practice and is the industry standard approach. | Keep entity interpolation with 100ms buffer. Local player remains lag-free via prediction. |

---

## Feature Dependencies

```
[Continuous pixel position type]
    └──requires──> [Position schema update: px/py floats added]
                       └──requires──> [DB migration: player position columns]
                       └──requires──> [Shared-types Position interface update]

[Velocity-based WASD input]
    └──requires──> [Continuous pixel position type]
    └──requires──> [Phaser Arcade Physics body on player sprite]

[Pixel hitbox collision]
    └──requires──> [Velocity-based WASD input]
    └──requires──> [Solid tile map: per-tile walkability data available client-side]

[Server position sync (continuous)]
    └──requires──> [Continuous pixel position type]
    └──requires──> [player:move event redesign: send velocity vector or frequent px/py snapshots]

[Client-side prediction (continuous)]
    └──requires──> [Velocity-based WASD input]
    └──requires──> [Server position sync (continuous)]

[Other player interpolation]
    └──requires──> [Server position sync (continuous)]
    └──requires──> [player:moved event carries px/py]

[Pixel-distance interaction checks]
    └──requires──> [Continuous pixel position type]
    └──can proceed independently of physics collision]

[Zone boundary pixel crossing]
    └──requires──> [Continuous pixel position type]
    └──requires──> [World coordinate system (tile → world pixel mapping)]

[Tile speed modifier as velocity scale]
    └──requires──> [Velocity-based WASD input]
    └──enhances──> [Pixel hitbox collision (sample tile under player each frame)]
```

### Dependency Notes

- **Pixel position type is the root dependency.** Everything else flows from changing `Position` to carry `{px, py}` instead of (or in addition to) `{x, y}`. All consumers — DB, game-logic, network events, WorldScene — need updating.
- **Interaction range is independent of physics.** `canInteract()`, `canAttack()`, `getEntitiesInRange()` can be rewritten to use pixel Euclidean distance as a standalone change, before or after physics is done.
- **Pathfinding removal unblocks physics.** `PathfindingController` holds references to tile-grid movement. Removing it first simplifies the MovementController rewrite.
- **Entity interpolation conflicts with server reconciliation unless designed carefully.** Remote players use interpolation (past-rendering). Local player uses prediction + reconciliation (present-rendering). These are separate code paths and must not be conflated.

---

## MVP Definition

### Launch With (this milestone)

The milestone is a rewrite, not a new feature. Every item below is required to ship.

- [ ] **New Position type with pixel coordinates** — `{px: number, py: number, zoneId: string}`. Tile x/y retained only for legacy grid lookups during transition or removed entirely.
- [ ] **Velocity-based WASD in WorldScene update loop** — replace `processInput(direction)` rate-limited calls with per-frame velocity. No move timer. No direction queue.
- [ ] **Phaser Arcade Physics body on player sprite** — enables `setVelocity`, `setCollideWorldBounds`, and AABB tilemap collision.
- [ ] **Solid tile map as collidable tilemap layer** — mark tiles with `collides: true` property, use `setCollisionByProperty`. Remove `boolean[][]` collision map from MovementController.
- [ ] **Remove PathfindingController and A* click-to-move** — `pathfindingController.ts` deleted. Click-to-move UI removed. Click still selects entities/targets.
- [ ] **Continuous server position sync** — `player:move` event redesigned. Client sends input state (velocity vector or key bits) at ~20Hz. Server acknowledges and corrects via `player:moved` with `{px, py, sequence}`.
- [ ] **Client prediction + server reconciliation for pixel position** — sequence numbers on input. Replay unacknowledged inputs after server correction. Existing `reconcile()` logic ported to pixel coordinates.
- [ ] **Entity interpolation for remote players** — 100ms position buffer. Lerp between last two server snapshots. Replace tween-based remote player animation.
- [ ] **Pixel Euclidean distance for all range checks** — `canInteract()`, `canAttack()`, `getEntitiesInRange()`, `isPositionVisible()` all use `Math.sqrt(dx*dx + dy*dy)` in pixel units.
- [ ] **Tile speed modifiers as velocity multipliers** — `getMovementSpeedModifier()` applied to player velocity each frame based on current tile under player center.
- [ ] **DB migration for pixel position columns** — `player_position_px`, `player_position_py` columns. Old tile columns either retained for compatibility or removed.
- [ ] **Fix flat blocking tiles** — walkability encoded correctly in tile properties. Elevated tiles blocked based on elevation data not tile type alone.

### Add After Validation (post-ship)

- [ ] **Zone crossing at pixel granularity** — Smooth seam-crossing. Depends on world coordinate system (complex). Ship basic zone snap-to-tile-0 first, then refine.
- [ ] **Inertia / drag on key release** — Nice feel improvement. Low complexity. Defer until core movement is stable.
- [ ] **Collision sliding polish** — Arcade Physics handles this, but edge cases (corners, diagonal walls) may need tuning.

### Future Consideration (v1.28+)

- [ ] **Click-to-move return** — If player demand is strong. Would need pixel-space navmesh.
- [ ] **Server physics simulation** — Only if cheating becomes a real problem at scale.

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Velocity-based WASD | HIGH | MEDIUM | P1 |
| Pixel hitbox collision | HIGH | HIGH | P1 |
| Continuous server position sync | HIGH | HIGH | P1 |
| Client prediction for pixel pos | HIGH | MEDIUM | P1 |
| Remove click-to-move | HIGH (simplification) | LOW | P1 |
| Entity interpolation | HIGH | MEDIUM | P1 |
| Pixel distance interaction checks | HIGH | LOW | P1 |
| Position type update + DB migration | HIGH (enabler) | HIGH | P1 |
| Flat tile fix | MEDIUM | MEDIUM | P1 |
| Tile speed modifiers as velocity | MEDIUM | LOW | P1 |
| Zone boundary pixel crossing | MEDIUM | HIGH | P2 |
| Inertia / drag | LOW | LOW | P3 |

**Priority key:**
- P1: Required for this milestone — game will be broken without it
- P2: Strong improvement, ship in follow-up patch
- P3: Nice to have

---

## How Each Existing System Changes

This section maps each affected system to what specifically changes. Intended to inform phase breakdown.

### `Position` type (shared-types)
**Before:** `{x: number, y: number, zoneId: string}` — integer tile coordinates
**After:** `{px: number, py: number, zoneId: string}` — float pixel coordinates within zone. Tile coords derivable as `Math.floor(px / TILE_SIZE_PX)`.

### `player:move` network event (ClientEvents)
**Before:** `{direction: Direction, sequence?: number}` — fires at most once per 140ms
**After:** Options (choose one):
  - **Input streaming**: `{vx: number, vy: number, sequence: number}` — normalized velocity bits sent at ~20Hz while keys held
  - **State snapshot**: `{px: number, py: number, sequence: number}` — client sends predicted position at ~20Hz
  - Recommendation: **input streaming** (send key state, server simulates). Harder to validate but smaller payload.
  - Simpler alternative: **state snapshot with speed cap validation** on server. Server checks `distance_moved / time_elapsed <= maxSpeed`.

### `player:moved` network event (ServerEvents)
**Before:** `{playerId, position: {x, y, zoneId}, lastProcessedInput?}` — fires on tile arrival
**After:** `{playerId, position: {px, py, zoneId}, sequence: number}` — fires at server tick (~20Hz for auth updates)

### `MovementController` (apps/web)
**Before:** Direction-based, single-step, rate-limited, tile collision map lookup
**After:** Phaser update-loop velocity application. Pending inputs are velocity vectors with timestamps. Reconciliation snapshots position to server value then replays.

### `PathfindingController` (apps/web)
**After:** Deleted.

### `validateMovement()` (game-logic)
**Before:** Checks `boolean[tileY][tileX]`
**After:** Not needed server-side per-frame. Server validates max speed + basic zone bounds. Tile walkability checked at destination tile only.

### `canInteract()`, `getEntitiesInRange()`, `isPositionVisible()` (game-logic)
**Before:** `manhattanDistance(tile, tile)`, range in tiles
**After:** `euclideanDistance(px, py, px2, py2)`, range in pixels. Pixel equivalents:
  - `DEFAULT_INTERACTION_RANGE = 1 tile` → 144px (1.5 × 96px for diagonal comfort)
  - Melee attack range `1 tile` → 128px
  - Ranged attack range `3–5 tiles` → 288–480px
  - Visibility range `15 tiles` → 1440px

### `Entity.position` (shared-types, DB)
**Note:** Entity positions (creatures, NPCs, minerals) are still tile-snapped by the server's spawn system. Entities don't use pixel movement — only the player does. Entity range checks use player's `px/py` vs entity's `tile center px/py` (tileX × 96 + 48).

### DB schema (database package)
**Change:** `characters` table — add `position_px FLOAT`, `position_py FLOAT`. Remove `position_x INT`, `position_y INT` (or retain as derived). Zone ID column kept.

---

## Sources

- [Gabriel Gambetta — Client-Side Prediction and Server Reconciliation](https://www.gabrielgambetta.com/client-side-prediction-server-reconciliation.html) — MEDIUM confidence (authoritative industry reference, verified current)
- [Gabriel Gambetta — Entity Interpolation](https://www.gabrielgambetta.com/entity-interpolation.html) — MEDIUM confidence (canonical technique, verified)
- [Phaser 3 Arcade Physics documentation](https://docs.phaser.io/phaser/concepts/physics/arcade) — HIGH confidence (official Phaser docs)
- [Phaser 3 Arcade Physics API reference](https://newdocs.phaser.io/docs/3.80.0/Phaser.Physics.Arcade.Collider) — HIGH confidence (official)
- Codebase analysis of `MovementController.ts`, `validation.ts`, `interaction.ts`, `range.ts`, `speed.ts`, `WorldScene.ts`, `events.ts`, `position.ts`, `constants.ts` — HIGH confidence (direct source)

---

*Feature research for: pixel movement rewrite (v1.27)*
*Researched: 2026-03-17*
