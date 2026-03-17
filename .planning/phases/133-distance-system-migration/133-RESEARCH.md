# Phase 133: Distance System Migration - Research

**Researched:** 2026-03-18
**Domain:** Game systems range-check migration (tile → pixel Euclidean distance)
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Gather cancellation:**
- Immediate cancel the moment pixel distance exceeds GATHER_RANGE_PX — no grace buffer
- Full progress reset on cancel — must start over if player returns to range
- Progress bar simply disappears on cancel — no "Too far away" message or toast
- Range check at gather completion vs start: Claude's discretion on whether to add a small leniency buffer

**Range feedback:**
- Combat targets get a highlight/outline change when within MELEE_RANGE_PX (attackable indicator)
- Gather nodes get a similar highlight/outline when within GATHER_RANGE_PX — consistent system across interactables
- Failed attack due to range shows "Out of range" floating combat text
- NPC interaction prompt appears/disappears instantly at range boundary — no fade transition

**Fog of war:**
- DIST-05 is skipped entirely — fog of war system is being deleted, no migration needed

**Creature aggro:**
- ~0.5 second detection delay when player enters AGGRO_RADIUS_PX — creature "notices" before pursuing
- Immediate leash when player exceeds LEASH_RADIUS_PX — no gradual disengage
- "!" exclamation mark icon above creature when it first aggros (classic detection cue)
- Full HP heal when creature leashes and returns to spawn — prevents kiting exploits

### Claude's Discretion
- Exact gather completion range leniency (same vs slightly larger than start range)
- Zone boundary transition implementation details (DIST-06)
- Visual styling of range highlights (color, outline thickness, animation)
- Duration and animation of the "!" aggro indicator

### Deferred Ideas (OUT OF SCOPE)
- Fog of war deletion — handle in a cleanup/removal phase, not here
- Ranged weapon distance checks — not in scope until ranged combat exists
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DIST-01 | Combat range checks use pixel Euclidean distance instead of tile distance | `canInteract()` in `interaction.ts` uses `manhattanDistance` — replace with `pixelDistanceTo()` against `player.px/py` and entity tile center converted to px |
| DIST-02 | Gathering interaction range uses pixel distance | Same `canInteract()` path in `ability.service.ts` and `gathering.service.ts`; plus add continuous gather-cancel check |
| DIST-03 | NPC interaction range uses pixel distance | `handleNpcInteract` in `game.gateway.ts` has no range check at all — must add pixel range guard |
| DIST-04 | Creature AI aggro and leash ranges use pixel distance | `creature-ai.ts`, `ai.service.ts`, and `combat.service.ts` all use Chebyshev tile distance — replace with `pixelDistanceTo()` from creature tile center |
| DIST-05 | Fog of war reveal radius uses pixel distance | SKIPPED — fog of war system is being deleted |
| DIST-06 | Zone boundary detection works at pixel granularity | `getZoneBoundaryDepth()` in `WorldScene.ts` uses tile-integer x/y; convert to pixel threshold using `TILE_SIZE_PX` |
</phase_requirements>

---

## Summary

Phase 133 is a pure migration — the infrastructure is already built. `pixelDistanceTo()`, `tileToPixelCenter()`, `MELEE_RANGE_PX`, `GATHER_RANGE_PX`, `NPC_INTERACT_RANGE_PX`, `AGGRO_RADIUS_PX`, and `LEASH_RADIUS_PX` all exist in `packages/game-logic/src/movement/pixel-distance.ts` (from Phase 131-02). The task is wiring them into the systems that still use old tile-integer distances.

There are five distinct systems that need updating: (1) combat ability range via `canInteract()` in `interaction.ts`; (2) gathering range in `ability.service.ts` and `gathering.service.ts`; (3) NPC interaction range in `game.gateway.ts` (currently has no range check at all); (4) creature AI aggro/leash in `creature-ai.ts`, `ai.service.ts`, `combat.service.ts`; and (5) zone boundary transitions in `WorldScene.ts` (client-side). DIST-05 (fog of war) is explicitly skipped.

The key complexity is that creatures remain tile-snapped (`Position.x/y` are integers) while players now have pixel positions (`player.px/py` floats). For creature-player distance, the creature's tile center must be converted via `tileToPixelCenter()` before calling `pixelDistanceTo()`. The `PlayerPublic` type exposed to the AI does not yet carry `px/py` — the server-side `ConnectedPlayer` does. This means the AI/combat systems that receive `PlayerPublic[]` need to resolve the pixel position through `PlayerService.getPlayerById()` when performing pixel distance checks.

**Primary recommendation:** Migrate each system to `pixelDistanceTo()` using creature tile centers vs player `px/py`. Add aggro delay (500ms) and "!" icon as locked decisions require. Add gather-cancel tick. Replace zone boundary depth calculation with pixel-granularity threshold.

---

## Standard Stack

### Core (already in place — no new installs required)

| Library | Location | Purpose | Status |
|---------|----------|---------|--------|
| `pixelDistanceTo()` | `packages/game-logic/src/movement/pixel-distance.ts` | Euclidean pixel distance | Exists, tested |
| `tileToPixelCenter()` | same | Tile integer → pixel center coords | Exists, tested |
| `MELEE_RANGE_PX` (64px) | same | Melee attack range constant | Exists (0.5 * TILE_SIZE_PX) |
| `GATHER_RANGE_PX` (192px) | same | Gather/harvest range constant | Exists (1.5 * TILE_SIZE_PX) |
| `NPC_INTERACT_RANGE_PX` (192px) | same | NPC dialogue range | Exists (= GATHER_RANGE_PX) |
| `AGGRO_RADIUS_PX` (512px) | same | Creature aggro detection radius | Exists (4.0 * TILE_SIZE_PX) |
| `LEASH_RADIUS_PX` (1024px) | same | Creature leash / give-up radius | Exists (8.0 * TILE_SIZE_PX) |
| `TILE_SIZE_PX` (128) | `pixel-validation.ts` | Logical pixel size of one tile | Exists |

**Installation:** None required. All constants and functions are already published from `@into-the-void/game-logic`.

---

## Architecture Patterns

### Pattern 1: Creature-to-Player Pixel Distance (Server)

Creatures store tile-integer `Position.x/y`. Players store float `px/py` on `ConnectedPlayer`. The bridging pattern:

```typescript
// Source: packages/game-logic/src/movement/pixel-distance.ts
import { pixelDistanceTo, tileToPixelCenter } from '@into-the-void/game-logic';

// For a creature at tile (cx, cy) and a player with pixel pos (px, py):
const { px: creaturePx, py: creaturePy } = tileToPixelCenter(creature.position.x, creature.position.y);
const dist = pixelDistanceTo(creaturePx, creaturePy, player.px, player.py);

if (dist <= AGGRO_RADIUS_PX) { /* aggro */ }
if (dist >  LEASH_RADIUS_PX) { /* leash */ }
```

**Key insight:** `PlayerPublic` (passed to `tickCreatureAI`) does NOT have `px/py`. The AI FSM receives `PlayerPublic[]` whose `.position.x/y` are tile integers. When feeding pixel distance to the AI, either:
- Pass pixel coordinates directly alongside tile position (add `px/py` to `PlayerPublic`), OR
- Convert player tile coords to pixel center inside `tickCreatureAI` as an approximation

**Recommended approach:** Add `px?: number; py?: number` to `PlayerPublic` and populate them from `ConnectedPlayer.px/py` in `PlayerService.getPlayersInZone()`. This is the cleanest solution — the AI gets real sub-tile positions without knowledge of `ConnectedPlayer`.

### Pattern 2: Player Attack Range (Server, Ability Service)

Current code in `ability.service.ts` line 341:
```typescript
const rangeCheck = canInteract(player, entity, ability.range);
```

`canInteract()` in `interaction.ts` uses `manhattanDistance`. The migration replaces this function or adds a new pixel-aware version:

```typescript
// New function to add in interaction.ts
import { pixelDistanceTo, tileToPixelCenter, MELEE_RANGE_PX, GATHER_RANGE_PX } from './movement/pixel-distance';

export function canInteractPixel(
  playerPx: number,
  playerPy: number,
  entity: Entity,
  rangePx: number,
): { canInteract: boolean; reason?: string } {
  if (!entity.active) {
    return { canInteract: false, reason: 'Entity is not active' };
  }
  const { px: ex, py: ey } = tileToPixelCenter(entity.position.x, entity.position.y);
  const dist = pixelDistanceTo(playerPx, playerPy, ex, ey);
  if (dist > rangePx) {
    return { canInteract: false, reason: 'Out of range' };
  }
  return { canInteract: true };
}
```

The ability service then passes `player.px`, `player.py` and the appropriate constant (`MELEE_RANGE_PX` for combat, `GATHER_RANGE_PX` for gathering).

### Pattern 3: Gather Cancellation (Server, GatheringService)

Add a continuous range check to `GatheringService`. The `MovementService` 20Hz tick updates `player.px/py`. `GatheringService` must check on the movement tick path or use a polling loop.

**Recommended:** Hook into the existing `MovementService.tick()` emission pattern. After each tick, the gateway emits `positionBatch`. Add a method to `GatheringService.checkGatherRange(playerId)` that is called from `MovementService` after resolving position, or from `GameGateway` when processing `player:pixelMove`. Either way:

```typescript
// GatheringService
cancelIfOutOfRange(playerId: string, playerPx: number, playerPy: number): void {
  const active = this.activeChallenges.get(playerId);
  if (!active) return;

  const entity = active.entity;
  const { px: ex, py: ey } = tileToPixelCenter(entity.position.x, entity.position.y);
  const dist = pixelDistanceTo(playerPx, playerPy, ex, ey);

  if (dist > GATHER_RANGE_PX) {
    this.entityLocks.delete(active.entityId);
    this.activeChallenges.delete(playerId);
    // No toast — progress bar simply disappears (per user decision)
  }
}
```

### Pattern 4: NPC Interaction Range (Server, GameGateway)

Currently `handleNpcInteract` has NO range check. Add one at the top:

```typescript
// Before processing npc:interact
const { px: npcPx, py: npcPy } = tileToPixelCenter(entity.position.x, entity.position.y);
const dist = pixelDistanceTo(player.px, player.py, npcPx, npcPy);
if (dist > NPC_INTERACT_RANGE_PX) {
  client.emit('error', { code: 'OUT_OF_RANGE', message: 'Too far away' });
  return;
}
```

The NPC prompt visibility (appearing/disappearing) is a **client-side** concern. `WorldScene.ts` must poll distance each update and show/hide the prompt indicator.

### Pattern 5: Zone Boundary (Client, WorldScene)

Current tile-based depth check:
```typescript
// WorldScene.ts line 1290–1295
private getZoneBoundaryDepth(position: Position): number {
  const fromLeft = position.x;
  const fromRight = ZONE_SIZE - 1 - position.x;
  const fromTop = position.y;
  const fromBottom = ZONE_SIZE - 1 - position.y;
  return Math.min(fromLeft, fromRight, fromTop, fromBottom);
}
```

This uses tile integers from `position.x/y`. DIST-06 requires pixel-granularity. Since the client has `player.px/py` (from `ConnectedPlayer`/local prediction), the new version:

```typescript
import { TILE_SIZE_PX } from '@into-the-void/game-logic';

private getZoneBoundaryDepthPx(px: number, py: number): number {
  // Zone pixel size = ZONE_SIZE * TILE_SIZE_PX
  const zonePxSize = ZONE_SIZE * TILE_SIZE_PX;
  const fromLeft   = px;
  const fromRight  = zonePxSize - px;
  const fromTop    = py;
  const fromBottom = zonePxSize - py;
  return Math.min(fromLeft, fromRight, fromTop, fromBottom);
}
```

The hysteresis threshold becomes `HYSTERESIS_TILES * TILE_SIZE_PX` pixels. This preserves the exact same visual behavior but at pixel granularity.

### Pattern 6: Aggro Delay + "!" Icon (Server + Client)

The 500ms detection delay requires storing a per-creature pending-aggro timer. In `AiService`:

```typescript
// Pending aggro: creatureId -> { targetPlayerId, detectedAt }
private pendingAggro: Map<string, { targetPlayerId: string; detectedAt: number }> = new Map();

// In runZoneTick / FSM loop, instead of immediately calling startCreatureCombat:
if (result.aggroTarget) {
  const pending = this.pendingAggro.get(creature.id);
  if (!pending) {
    // First detection — store with timestamp
    this.pendingAggro.set(creature.id, { targetPlayerId: result.aggroTarget, detectedAt: Date.now() });
    // Emit "!" icon to zone
    this.server?.to(zoneId).emit('creature:aggro_detected', { entityId: creature.id });
  } else if (Date.now() - pending.detectedAt >= 500) {
    // Delay elapsed — commit aggro
    this.pendingAggro.delete(creature.id);
    await this.combatService.startCreatureCombat(creature.id, pending.targetPlayerId, zoneId);
    // ...
  }
}
```

Leash must also clear `pendingAggro` entry when `shouldReturn` fires.

### Pattern 7: Full HP Heal on Leash (Server, AiService)

When `shouldReturn` is true and the creature had a `combatTarget`:

```typescript
if (result.shouldReturn) {
  this.combatService.stopCreatureCombat(creature.id);
  this.pendingAggro.delete(creature.id);
  // Full HP heal
  await this.zonesService.updateEntity(zoneId, creature.id, {
    combatTarget: undefined,
    provoked: false,
    health: creature.maxHealth,   // full heal
  } as Partial<Creature>);
  // Broadcast entity update so clients see health bar refill
  this.server?.to(zoneId).emit('entity:update', {
    entityId: creature.id,
    changes: { health: creature.maxHealth, maxHealth: creature.maxHealth },
  });
}
```

### Pattern 8: Range Highlight System (Client, WorldScene)

The existing `TargetHighlight` class shows an outline ring around the selected target (combat or gather). The "attackable indicator" (MELEE_RANGE_PX) and "gatherable indicator" (GATHER_RANGE_PX) require the client to compare player pixel position against entity pixel position each frame.

```typescript
// In WorldScene.update() or on positionBatch receipt:
private updateRangeIndicators(playerPx: number, playerPy: number): void {
  const targetId = useCombatStore.getState().targetId;
  if (!targetId) return;

  const entity = useEntityStore.getState().entities.get(targetId);
  if (!entity) return;

  const { px: ex, py: ey } = tileToPixelCenter(entity.position.x, entity.position.y);
  const dist = pixelDistanceTo(playerPx, playerPy, ex, ey);

  const isCreature = entity.type === 'creature';
  const rangePx = isCreature ? MELEE_RANGE_PX : GATHER_RANGE_PX;
  const inRange = dist <= rangePx;

  // Change ring color or opacity based on inRange
  this.targetHighlight?.setInRange(inRange);
}
```

This requires adding a `setInRange(inRange: boolean)` method to `TargetHighlight` that changes the outline color (e.g., white = out of range, green = in range for gather, red = in range for combat).

### Anti-Patterns to Avoid

- **Using `manhattanDistance` or `chebyshevDistance` for gameplay range checks** — these are tile-integer functions in `pathfinding.ts` that remain valid for A* pathfinding (which is being removed in Phase 135) but not for pixel-based gameplay checks.
- **Calling `canInteract()` with `player` (which has tile-integer `position.x/y`) instead of `player.px/py`** — the old `canInteract` function uses manhattan distance on the tile grid. After migration, use `canInteractPixel()` with the float pixel coordinates.
- **Accessing `player.px/py` from `PlayerPublic`** — `PlayerPublic` does not have these fields. Only `ConnectedPlayer` (server internal) does. The gateway handlers receive `ConnectedPlayer` via `playerService.getPlayerBySocket()`, so they have access. The AI FSM receives `PlayerPublic[]` — extend this interface.
- **Skipping the `tileToPixelCenter` conversion for entity positions** — entities store tile-integer `Position.x/y`. Naively using `entity.position.x * TILE_SIZE_PX` would give the tile top-left corner, not the center. Always use `tileToPixelCenter()`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Euclidean distance | Custom Math.sqrt(dx²+dy²) | `pixelDistanceTo()` from game-logic | Already tested, exported, consistent |
| Tile → pixel conversion | Manual multiplication | `tileToPixelCenter()` | Handles the `(tileIndex + 0.5) * TILE_SIZE_PX` convention correctly |
| Range constants | Magic numbers (64, 192, 512, 1024) | `MELEE_RANGE_PX`, `GATHER_RANGE_PX`, etc. | Auto-scale if TILE_SIZE_PX changes, single source of truth |

---

## Common Pitfalls

### Pitfall 1: PlayerPublic Has No Pixel Coords

**What goes wrong:** `tickCreatureAI` receives `PlayerPublic[]`. Calling `player.px` on `PlayerPublic` gives `undefined`. Distance check silently fails (NaN comparisons always false).
**Why it happens:** `px/py` live on `ConnectedPlayer`, which is server-internal. `PlayerPublic` is the serialized subset.
**How to avoid:** Add `px?: number; py?: number` to `PlayerPublic` and populate in `PlayerService.getPlayersInZone()`. This is one field addition to `shared-types` that unlocks pixel-aware AI.
**Warning signs:** Aggro never triggers, leash never fires — distance is always NaN.

### Pitfall 2: Mixing Tile and Pixel Coordinates in Comparisons

**What goes wrong:** `pixelDistanceTo(creature.position.x, creature.position.y, player.px, player.py)` — creature position is in tiles (0–191), player `px` is in pixels (0–24575). Result is nonsensical.
**Why it happens:** Coordinate system confusion — both look like numbers but represent different scales.
**How to avoid:** Always run `tileToPixelCenter()` on any entity that stores tile-integer position before calling `pixelDistanceTo`. Convention: variables named `px/py` are pixels; `x/y` in `Position` are tiles.
**Warning signs:** Aggro triggers across the entire zone, or never triggers within 1 tile.

### Pitfall 3: Gather Cancel Fires Before Gathering Starts

**What goes wrong:** The gather-cancel check runs immediately on movement, canceling before the player has moved away.
**Why it happens:** `GatheringService.activeChallenges` is set on gather:start. The first movement tick immediately calls `cancelIfOutOfRange`.
**How to avoid:** Only call `cancelIfOutOfRange` when `activeChallenges.has(playerId)`. The range check at gather:start already passed — cancellation only applies to subsequent movement.

### Pitfall 4: AoE Ability Still Uses Chebyshev Range

**What goes wrong:** `getNearbyCreatures()` in `ability.service.ts` (line 1285) uses Chebyshev distance. After migration, AoE range is still tile-based.
**Why it happens:** AoE radius check is a separate code path from the target-based range check.
**How to avoid:** Also migrate `getNearbyCreatures` to use `pixelDistanceTo` + `tileToPixelCenter`. Note: AoE abilities use `ability.range` which is currently in tiles. Clarify whether to convert this constant or define a pixel variant. Since ranged combat is out of scope, only close-range AoE (Overload Pulse radius ~3 tiles) is affected — convert to `ability.range * TILE_SIZE_PX`.

### Pitfall 5: Zone Boundary Depth Returns Pixels But Threshold Still in Tiles

**What goes wrong:** `getZoneBoundaryDepthPx()` returns pixel distance from edge. The comparison `depth >= HYSTERESIS_TILES` fails because depth is now in pixels (could be 384px) and HYSTERESIS_TILES is 3.
**Why it happens:** Mixing units at the callsite.
**How to avoid:** Change comparison to `depth >= HYSTERESIS_TILES * TILE_SIZE_PX` — or define `const HYSTERESIS_PX = HYSTERESIS_TILES * TILE_SIZE_PX` (= 384px).

### Pitfall 6: No Pending-Aggro Cleanup on Creature Death

**What goes wrong:** If creature dies while pending-aggro timer is running, the `pendingAggro` map retains the entry. On next zone tick the creature may be inactive but the stale entry causes unexpected behavior.
**Why it happens:** Creatures die via combat resolution; `AiService.pendingAggro` is not cleared.
**How to avoid:** Clear `pendingAggro` entry in the same code path that stops `CombatService` sessions — or check `creature.active && creature.health > 0` before processing pending aggro.

---

## Code Examples

### Pixel Distance Between Creature and Player

```typescript
// Source: packages/game-logic/src/movement/pixel-distance.ts
import {
  pixelDistanceTo,
  tileToPixelCenter,
  AGGRO_RADIUS_PX,
  LEASH_RADIUS_PX,
} from '@into-the-void/game-logic';

// creature.position.x/y are tile integers; player.px/py are pixel floats
const { px: cpx, py: cpy } = tileToPixelCenter(creature.position.x, creature.position.y);
const dist = pixelDistanceTo(cpx, cpy, player.px, player.py);

const shouldAggro = dist <= AGGRO_RADIUS_PX;
const shouldLeash = dist >  LEASH_RADIUS_PX;
```

### Adding `px/py` to PlayerPublic

```typescript
// packages/shared-types/src/core/player.ts
export interface PlayerPublic {
  id: string;
  name: string;
  faction: FactionId;
  position: Position;
  level: number;
  inCombat: boolean;
  credits: number;
  // Phase 133: pixel position for AI distance checks
  px: number;
  py: number;
}
```

```typescript
// apps/game-server/src/game/player.service.ts
getPlayersInZone(zoneId: string): PlayerPublic[] {
  const players: PlayerPublic[] = [];
  for (const player of this.players.values()) {
    if (player.position.zoneId === zoneId && player.online) {
      players.push({
        id: player.id,
        name: player.name,
        faction: player.faction,
        position: player.position,
        level: player.level,
        inCombat: player.inCombat,
        credits: player.credits,
        px: player.px,    // add Phase 133
        py: player.py,    // add Phase 133
      });
    }
  }
  return players;
}
```

### New `canInteractPixel` Function

```typescript
// packages/game-logic/src/interaction/interaction.ts — add alongside canInteract()
import { pixelDistanceTo, tileToPixelCenter } from '../movement/pixel-distance';

export function canInteractPixel(
  playerPx: number,
  playerPy: number,
  entity: Entity,
  rangePx: number,
): { canInteract: boolean; reason?: string } {
  if (!entity.active) {
    return { canInteract: false, reason: 'Entity is not active' };
  }
  if (entity.position.zoneId !== /* player zone */ undefined) {
    // Note: zone check is handled by callers; entity and player must be in same zone
  }
  const { px: ex, py: ey } = tileToPixelCenter(entity.position.x, entity.position.y);
  const dist = pixelDistanceTo(playerPx, playerPy, ex, ey);
  if (dist > rangePx) {
    return { canInteract: false, reason: 'Out of range' };
  }
  return { canInteract: true };
}
```

### Creature-AI FSM Pixel Distance (creature-ai.ts)

```typescript
// In tickHerbivore — replace chebyshevDistance with pixel version
const nearbyPlayers = players
  .map((p) => ({
    player: p,
    dist: pixelDistanceTo(
      ...tileToPixelCenter(creature.position.x, creature.position.y),  // spread as ax, ay
      p.px,
      p.py,
    ),
  }))
  .filter(({ dist }) => dist <= FLEE_RADIUS_PX)  // new constant = FLEE_RADIUS * TILE_SIZE_PX
  .sort((a, b) => a.dist - b.dist);
```

Note: `tileToPixelCenter` returns `{ px, py }` — spread syntax won't work directly. Use explicit destructuring:
```typescript
const { px: ax, py: ay } = tileToPixelCenter(creature.position.x, creature.position.y);
const dist = pixelDistanceTo(ax, ay, p.px, p.py);
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `chebyshevDistance(tx1, ty1, tx2, ty2)` for aggro | `pixelDistanceTo()` with `tileToPixelCenter` | Phase 133 | More precise aggro; corner of tile vs center distinction |
| `manhattanDistance` in `canInteract()` | `canInteractPixel()` with float px/py | Phase 133 | Allows sub-tile interaction precision |
| Tile-depth hysteresis: `position.x >= HYSTERESIS_TILES` | Pixel-depth hysteresis: `px >= HYSTERESIS_PX` | Phase 133 | Zone transitions commit at exact pixel, not tile boundary |
| No NPC range check | `pixelDistanceTo(player.px, player.py, npc_center_px, npc_center_py) <= NPC_INTERACT_RANGE_PX` | Phase 133 | Prevents NPC interaction from across the zone |
| AGGRO_RADIUS = 5 (tiles), LEASH_DISTANCE = 10 (tiles) in `creature-ai.ts` | `AGGRO_RADIUS_PX` (512px), `LEASH_RADIUS_PX` (1024px) from `pixel-distance.ts` | Phase 133 | Constants auto-scale with tile size changes |

**Note on constant values:**
- Old `AGGRO_RADIUS = 5` tiles → new `AGGRO_RADIUS_PX = 512px` = 4 tiles. Slightly smaller than old. This is intentional per `pixel-distance.ts` comments.
- Old `LEASH_DISTANCE = 10` tiles → new `LEASH_RADIUS_PX = 1024px` = 8 tiles. Also slightly smaller.
- Old `FLEE_RADIUS = 5` tiles → new value should be `5 * TILE_SIZE_PX = 640px` (or define `FLEE_RADIUS_PX` constant). The CONTEXT.md does not lock flee radius, so Claude's discretion: use `5 * TILE_SIZE_PX`.

---

## Open Questions

1. **`FLEE_RADIUS_PX` constant: define or inline?**
   - What we know: `FLEE_RADIUS = 5` tiles is currently hardcoded in `creature-ai.ts` and `ai.service.ts`
   - What's unclear: Whether to add it to `pixel-distance.ts` or just compute `5 * TILE_SIZE_PX` inline
   - Recommendation: Add `FLEE_RADIUS_PX = 5 * TILE_SIZE_PX` to `pixel-distance.ts` for consistency with other range constants

2. **`ability.range` field units after migration**
   - What we know: Ability definitions have `range` field (e.g., `ability.range = 1` tile for melee). Used by `canInteract()` and `getNearbyCreatures()`.
   - What's unclear: Whether to convert all ability range values to pixels now, or pass `ability.range * TILE_SIZE_PX` at callsite
   - Recommendation: Convert at callsite (`ability.range * TILE_SIZE_PX`) in Phase 133. A separate Phase 135 cleanup can migrate ability definitions.

3. **AoE radius (`getNearbyCreatures`) for Overload Pulse**
   - What we know: `ability.range` for AoE abilities is also tile-based
   - What's unclear: Exact AoE radius in pixels vs current tile value
   - Recommendation: Use `ability.range * TILE_SIZE_PX` when calling the migrated version of `getNearbyCreatures`

4. **NPC prompt visibility on client: polling interval**
   - What we know: Client must check player-to-NPC distance each frame to show/hide interaction prompt
   - What's unclear: Whether distance is checked every frame (Phaser `update`) or on movement events only
   - Recommendation: Check on player position update events (after `positionBatch` receipt or local prediction step) — not every frame — to avoid performance overhead

---

## Sources

### Primary (HIGH confidence)
- Direct code inspection of `packages/game-logic/src/movement/pixel-distance.ts` — full API confirmed
- Direct code inspection of `packages/game-logic/src/movement/pixel-validation.ts` — TILE_SIZE_PX = 128 confirmed
- Direct code inspection of `packages/game-logic/src/interaction/interaction.ts` — `canInteract` uses `manhattanDistance`, confirmed
- Direct code inspection of `packages/game-logic/src/ai/creature-ai.ts` — `chebyshevDistance` usage, all AGGRO_RADIUS/LEASH_DISTANCE constants, confirmed
- Direct code inspection of `apps/game-server/src/game/ai.service.ts` — inline AGGRO_RADIUS=5, LEASH_DISTANCE=10 constants, aggro flow, confirmed
- Direct code inspection of `apps/game-server/src/game/combat.service.ts` — Chebyshev-based adjacency check (dist > 1), confirmed
- Direct code inspection of `apps/game-server/src/game/ability.service.ts` — `canInteract` call site, `getNearbyCreatures` Chebyshev usage, confirmed
- Direct code inspection of `apps/game-server/src/game/gathering.service.ts` — `canInteract` call at gather start, no continuous range check, confirmed
- Direct code inspection of `apps/game-server/src/game/game.gateway.ts` — `handleNpcInteract` has no range check, confirmed
- Direct code inspection of `apps/web/src/game/scenes/WorldScene.ts` — `getZoneBoundaryDepth` tile-based, confirmed
- Direct code inspection of `apps/game-server/src/game/player.service.ts` — `ConnectedPlayer.px/py`, `PlayerPublic` lacks px/py, confirmed
- Direct code inspection of `packages/shared-types/src/core/player.ts` — `PlayerPublic` interface, confirmed

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all functions/constants exist and are tested in `pixel-distance.test.ts`
- Architecture: HIGH — all call sites identified through code inspection, migration pattern is clear
- Pitfalls: HIGH — all pitfalls sourced from actual code reading, not speculation

**Research date:** 2026-03-18
**Valid until:** 2026-04-17 (stable codebase, no external dependency changes expected)

---

## Appendix: All Files to Touch

| File | Change Type | Requirement |
|------|------------|-------------|
| `packages/shared-types/src/core/player.ts` | Add `px/py` to `PlayerPublic` | DIST-04 (AI pixel coords) |
| `packages/game-logic/src/movement/pixel-distance.ts` | Add `FLEE_RADIUS_PX` constant | DIST-04 |
| `packages/game-logic/src/interaction/interaction.ts` | Add `canInteractPixel()` | DIST-01, DIST-02, DIST-03 |
| `packages/game-logic/src/ai/creature-ai.ts` | Replace `chebyshevDistance` with `pixelDistanceTo` + `tileToPixelCenter` | DIST-04 |
| `apps/game-server/src/game/player.service.ts` | Populate `px/py` in `getPlayersInZone()` | DIST-04 |
| `apps/game-server/src/game/ai.service.ts` | Replace AGGRO_RADIUS/LEASH_DISTANCE constants with pixel constants; add 500ms aggro delay + "!" emission; add full HP heal on leash | DIST-04 |
| `apps/game-server/src/game/combat.service.ts` | Replace Chebyshev adjacency check (`dist > 1`) with pixel distance | DIST-01 |
| `apps/game-server/src/game/ability.service.ts` | Replace `canInteract()` with `canInteractPixel()`; replace `getNearbyCreatures` Chebyshev with pixel distance | DIST-01, DIST-02 |
| `apps/game-server/src/game/gathering.service.ts` | Replace `canInteract()` with `canInteractPixel()`; add `cancelIfOutOfRange()` method | DIST-02 |
| `apps/game-server/src/game/game.gateway.ts` | Add NPC range guard to `handleNpcInteract`; call gather cancel on pixel move | DIST-03, DIST-02 |
| `apps/web/src/game/scenes/WorldScene.ts` | Replace `getZoneBoundaryDepth` with pixel version | DIST-06 |
| `apps/web/src/game/rendering/TargetHighlight.ts` | Add `setInRange(inRange: boolean)` for range highlight indicator | DIST-01, DIST-02 |
| `apps/web/src/game/scenes/WorldScene.ts` | Add per-frame/per-update range indicator check + NPC proximity prompt logic | DIST-01, DIST-02, DIST-03 |
| `packages/game-logic/src/movement/pixel-distance.test.ts` | Tests for new constants if added | QA |
| `packages/game-logic/src/interaction/interaction.ts` (test?) | Tests for `canInteractPixel` | QA |
