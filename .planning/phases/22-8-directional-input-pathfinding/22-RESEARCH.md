# Phase 22: 8-Directional Input & Pathfinding - Research

**Researched:** 2026-02-17
**Domain:** Phaser 3 keyboard input, isometric movement, A* pathfinding with diagonal neighbors
**Confidence:** HIGH

## Summary

Phase 22 adds full 8-directional movement to a Phaser 3.80 isometric game. Two independent sub-tasks compose the work: (22-01) replace the 4-direction else-if input chain in `WorldScene.handleInput` with a `resolveDirection()` function that reads simultaneous key presses; (22-02) add diagonal neighbors to the `findPath` A* function in `game-logic/pathfinding.ts` so that click-to-move generates straight diagonal paths instead of stair-stepping.

The `Direction` type, `DIRECTION_VECTORS`, `calculateNewPosition`, and `validateMovement` in the shared packages already support all 8 directions. `PathfindingController.getDirection` is already prepared with all 8 cases. No shared-type changes are needed for this phase; all changes are confined to `WorldScene.handleInput` (client) and `findPath` in `game-logic/pathfinding.ts`.

The critical isometric mapping is: single WASD key presses map to the four grid-cardinal directions (W=N, S=S, A=W, D=E — these are grid directions that visually appear as isometric diagonals on screen). Dual-key combos map to grid-diagonal directions (W+D=NE, W+A=NW, S+D=SE, S+A=SW — visually appearing as screen-cardinal directions in the isometric view).

**Primary recommendation:** Extract a pure `resolveDirection(keys)` function for testability, and add 4 diagonal entries to the `directions` array in `findPath` using `Math.SQRT2` cost (~1.414) with Chebyshev distance as the heuristic.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Phaser | ^3.80.0 | Game framework with keyboard input | Already in use; `Key.isDown` checks multiple simultaneous keys trivially |
| @into-the-void/shared-types | workspace | `Direction` type (already has all 8) | Zero changes needed for this phase |
| @into-the-void/game-logic | workspace | `findPath`, `calculateNewPosition`, `DIRECTION_VECTORS` | Already has 8-direction vectors; `findPath` needs diagonal neighbors added |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (none new) | — | No new dependencies needed | — |

**Installation:**
```bash
# No new packages to install
```

## Architecture Patterns

### Recommended Project Structure

No new files needed. Changes are modifications to existing files only:
```
apps/web/src/game/scenes/WorldScene.ts           # handleInput() - replace else-if chain
packages/game-logic/src/movement/pathfinding.ts  # findPath() - add diagonal neighbors
```

### Pattern 1: resolveDirection() with Simultaneous Key Detection

**What:** Read all key states at the same time and return the Direction that matches, instead of an else-if chain that stops at the first match.

**When to use:** Any time multiple keys can be held simultaneously and the combined press has different semantics than each individual key.

**Isometric mapping (grid directions — MUST match existing single-key behavior):**

The current code maps: `W → 'nw'` (grid NW), `D → 'ne'` (grid NE), `S → 'se'` (grid SE), `A → 'sw'` (grid SW).

The new requirement changes single keys to map to grid-cardinals:
- `W → 'n'` (grid north, visual up-left-and-right i.e. straight up in isometric)
- `S → 's'` (grid south)
- `A → 'w'` (grid west)
- `D → 'e'` (grid east)

And dual keys map to grid-diagonals:
- `W+D → 'ne'`, `W+A → 'nw'`, `S+D → 'se'`, `S+A → 'sw'`

**Example:**
```typescript
// Source: direct analysis of WorldScene.ts + shared-types Direction type

type KeySet = { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };

function resolveDirection(keys: KeySet): Direction | null {
  const w = keys.W.isDown;
  const a = keys.A.isDown;
  const s = keys.S.isDown;
  const d = keys.D.isDown;

  // Dual-key combos take priority (diagonal grid movement)
  if (w && d) return 'ne';
  if (w && a) return 'nw';
  if (s && d) return 'se';
  if (s && a) return 'sw';

  // Single key (cardinal grid movement — visually isometric diagonal)
  if (w) return 'n';
  if (d) return 'e';
  if (s) return 's';
  if (a) return 'w';

  return null;
}
```

Then in `handleInput`:
```typescript
private handleInput(time: number): void {
  if (!this.localPlayer || !this.movementController || time - this.lastMoveTime < this.moveDelay) return;
  if (!this.wasd) return;

  const direction = resolveDirection(this.wasd);

  if (direction) {
    if (this.pathfindingController?.isPathActive()) {
      this.pathfindingController.cancelPath();
    }
    this.lastMoveTime = time;
    this.movementController.processInput(direction);
  }
}
```

**Note:** Arrow key (cursor) support can be dropped or mapped to the same cardinals as WASD. The current code maps arrows 1:1 with WASD; keep that mapping if arrow key support is required, or handle cursor keys separately with same dual-detection logic.

### Pattern 2: 8-Directional A* with Diagonal Neighbors

**What:** Add 4 diagonal direction entries `{dx:1,dy:-1}`, `{dx:-1,dy:-1}`, `{dx:1,dy:1}`, `{dx:-1,dy:1}` to the `directions` array in `findPath`. Diagonals cost `Math.SQRT2` (~1.414) instead of 1.0. Switch heuristic from Manhattan to Chebyshev (already implemented in `chebyshevDistance` in the same file) for admissibility.

**When to use:** When movement allows diagonal grid steps — using Manhattan distance as a heuristic with diagonal movement makes the heuristic inadmissible (overestimates), which can produce non-optimal paths.

**Example:**
```typescript
// Source: direct analysis of pathfinding.ts + standard A* diagonal algorithm

const DIAGONAL_COST = Math.SQRT2; // ~1.414

const directions = [
  { dx: 0, dy: -1, cost: 1.0 },   // N
  { dx: 0, dy: 1,  cost: 1.0 },   // S
  { dx: 1, dy: 0,  cost: 1.0 },   // E
  { dx: -1, dy: 0, cost: 1.0 },   // W
  { dx: 1, dy: -1, cost: DIAGONAL_COST },  // NE
  { dx: -1, dy: -1, cost: DIAGONAL_COST }, // NW
  { dx: 1, dy: 1,  cost: DIAGONAL_COST },  // SE
  { dx: -1, dy: 1, cost: DIAGONAL_COST },  // SW
];

// Change heuristic from manhattanDistance to chebyshevDistance
// chebyshevDistance is already defined in the same file
const h = chebyshevDistance(nx, ny, endX, endY);

// Move cost for each neighbor
const g = current.g + dir.cost;
```

**Diagonal cutting corners — must decide:** When moving diagonally, the two cardinal neighbors on each side of the diagonal might be blocked. Two options:
- **Allow corner-cutting** (simpler): only check if the diagonal tile itself is blocked
- **Prevent corner-cutting** (realistic): also require both cardinal tiles adjacent to the diagonal to be passable

Recommendation: **prevent corner-cutting** to avoid situations where the player path appears to clip through wall corners. Checking both cardinal neighbors before allowing the diagonal:

```typescript
// In the neighbor loop, for diagonals:
if (Math.abs(dir.dx) === 1 && Math.abs(dir.dy) === 1) {
  // Prevent corner-cutting: both cardinal neighbors must be passable
  if (collisionMap[current.y]?.[current.x + dir.dx] ||
      collisionMap[current.y + dir.dy]?.[current.x]) {
    continue;
  }
}
```

### Anti-Patterns to Avoid

- **Else-if chain for multi-key detection:** An else-if chain means W+D registers only W because W is checked first. Check all keys, then resolve — dual combos must take priority over singles.
- **Manhattan heuristic with diagonal movement:** Manhattan distance overestimates cost when diagonal steps are available. This makes A* inadmissible (may miss optimal paths). Use Chebyshev instead.
- **Forgetting `findPathWithElevation`:** `findPath` and `findPathWithElevation` are separate functions in `pathfinding.ts`, both with their own `directions` array. Both need the diagonal neighbors added for consistency. Currently `PathfindingController.startPath` calls `findPath` (no elevation), but if elevation-aware pathfinding is added later, it should also have diagonals.
- **Direction flickering on simultaneous key down:** Phaser `Key.isDown` reads the current frame's hardware state — no debouncing needed at the key level. The `lastMoveTime` gate in `handleInput` already prevents sending multiple moves per tick.
- **Arrow keys conflict:** If cursor key support is kept alongside WASD, both need the same dual-detection logic, or they need to be clearly separated (e.g., arrow keys only do 4-directional, WASD does 8-directional).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Simultaneous key detection | Custom key state buffer | `Phaser.Input.Keyboard.Key.isDown` | Phaser polls hardware state every frame; no custom state tracking needed |
| Diagonal cost constant | Re-derive sqrt(2) | `Math.SQRT2` | Built-in JS constant, exact value |
| Chebyshev heuristic | Rewrite | `chebyshevDistance()` already in `pathfinding.ts` | Already implemented in the same file, just not used |
| Priority queue for A* | Binary heap implementation | `openSet.sort()` (current approach) | Already in use; acceptable for zone-sized grids (up to 64x64); replacing with a heap is an optimization, not a correctness fix |

**Key insight:** The infrastructure for 8-directional movement is already built. Both `Direction` type and `DIRECTION_VECTORS` support all 8 directions. The work is wiring up what's already there.

## Common Pitfalls

### Pitfall 1: Single-key mapping changes break existing feel
**What goes wrong:** The single-key mapping is changing from `W → 'nw'` (grid diagonal) to `W → 'n'` (grid cardinal). This is a deliberate behavior change (per requirements), but it means the visual direction of travel on screen changes: pressing W alone will now move north in the grid, which in isometric view appears as moving "straight up" rather than "upper-left."
**Why it happens:** Isometric games often map single keys to grid-cardinals (which look diagonal on screen), not grid-diagonals (which look cardinal on screen). The current code has this inverted.
**How to avoid:** Verify the isometric visual result of the new mapping manually. In an isometric view where the camera is at 45 degrees, moving N in grid space appears to move the sprite toward the top-center of the screen, which is the visual "north" the player expects.
**Warning signs:** After the change, pressing W and D together should produce a clearly different direction than W alone.

### Pitfall 2: A* open set sorted by reference
**What goes wrong:** The current A* uses `openSet.find(n => n.x === nx && n.y === ny)` to find existing nodes — this is O(n) per neighbor. With 8 neighbors instead of 4, and more nodes in the open set (diagonal paths explore a wider area), this becomes slower.
**Why it happens:** The current implementation was written for 4 cardinal neighbors and zone sizes up to 64x64. The sort-based open set is O(n log n) per iteration. For 64x64=4096 tiles, worst case is ~4096 × 4096 operations — which at 8 neighbors could become noticeable.
**How to avoid:** For this phase, the current sort-based approach is acceptable (the phase scope is correctness, not optimization). Flag the sort as a future optimization target in code comments.
**Warning signs:** Pathfinding in open areas takes noticeably longer after adding diagonals.

### Pitfall 3: Diagonal corner-cutting through walls
**What goes wrong:** Without corner-cut prevention, the A* path can route the player diagonally through a "corner" formed by two adjacent blocked tiles, causing the player sprite to visually clip through a wall.
**Why it happens:** Checking only the target tile for collision passes if the diagonal destination is free, even if both cardinal tiles adjacent to the move are blocked.
**How to avoid:** Add the cardinal-neighbor check shown in Pattern 2 before allowing a diagonal step.
**Warning signs:** In a test map with L-shaped walls, the path passes through the inner corner of the L.

### Pitfall 4: `findPathWithElevation` not updated
**What goes wrong:** `PathfindingController` uses `findPath` (no elevation), so it will benefit from diagonal neighbors. But `findPathWithElevation` is also exported and will remain 4-directional, creating inconsistency.
**Why it happens:** Two separate functions maintain their own `directions` arrays.
**How to avoid:** Update both `findPath` and `findPathWithElevation` directions arrays in the same commit.
**Warning signs:** Code review catches the inconsistency; or `findPathWithElevation` produces stair-step paths when called with diagonal goals.

### Pitfall 5: Cursor keys (arrow keys) not handled for dual-press
**What goes wrong:** The current code checks `cursors?.up.isDown || wasd?.W.isDown` — arrow keys and WASD are OR'd together for a single direction. With dual-key detection, if someone holds ArrowUp + D, the intent is ambiguous, and the or-combination breaks.
**Why it happens:** Arrow keys don't have a natural "pair" for diagonal detection.
**How to avoid:** Separate the cursor key check from WASD entirely. Option A: keep arrow keys as 4-directional only (they can't produce diagonals). Option B: remove arrow key support. Recommend Option A for backward compatibility.
**Warning signs:** Arrow key users get unexpected behavior when a WASD key is also held.

## Code Examples

Verified patterns from codebase analysis:

### Current handleInput (4-direction else-if, to be replaced)
```typescript
// Source: apps/web/src/game/scenes/WorldScene.ts:440-444
if (this.cursors?.up.isDown || this.wasd?.W.isDown) direction = 'nw';
else if (this.cursors?.right.isDown || this.wasd?.D.isDown) direction = 'ne';
else if (this.cursors?.down.isDown || this.wasd?.S.isDown) direction = 'se';
else if (this.cursors?.left.isDown || this.wasd?.A.isDown) direction = 'sw';
```

### Current findPath directions (4-cardinal, to have 4 diagonals added)
```typescript
// Source: packages/game-logic/src/movement/pathfinding.ts:82-87
const directions = [
  { dx: 0, dy: -1 }, // N
  { dx: 0, dy: 1 },  // S
  { dx: 1, dy: 0 },  // E
  { dx: -1, dy: 0 }, // W
];
```

### chebyshevDistance already available (use for 8-direction heuristic)
```typescript
// Source: packages/game-logic/src/movement/pathfinding.ts:29-36
export function chebyshevDistance(
  x1: number, y1: number,
  x2: number, y2: number
): number {
  return Math.max(Math.abs(x1 - x2), Math.abs(y1 - y2));
}
```

### DIRECTION_VECTORS already has all 8 entries
```typescript
// Source: packages/game-logic/src/movement/validation.ts:11-20
export const DIRECTION_VECTORS: Record<Direction, { dx: number; dy: number }> = {
  n: { dx: 0, dy: -1 },
  s: { dx: 0, dy: 1 },
  e: { dx: 1, dy: 0 },
  w: { dx: -1, dy: 0 },
  ne: { dx: 1, dy: -1 },
  nw: { dx: -1, dy: -1 },
  se: { dx: 1, dy: 1 },
  sw: { dx: -1, dy: 1 },
};
```

### PathfindingController.getDirection already handles all 8 cases
```typescript
// Source: apps/web/src/game/systems/PathfindingController.ts:176-191
private getDirection(from: Position, to: { x: number; y: number }): Direction | null {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (dx === 0 && dy === -1) return 'n';
  if (dx === 0 && dy === 1)  return 's';
  if (dx === 1 && dy === 0)  return 'e';
  if (dx === -1 && dy === 0) return 'w';
  if (dx === 1 && dy === -1)  return 'ne';
  if (dx === -1 && dy === -1) return 'nw';
  if (dx === 1 && dy === 1)   return 'se';
  if (dx === -1 && dy === 1)  return 'sw';
  return null;
}
```

### validateMovement already allows diagonal (dx ≤ 1, dy ≤ 1)
```typescript
// Source: packages/game-logic/src/movement/validation.ts:112-116
if (from.zoneId === to.zoneId) {
  if (dx > 1 || dy > 1) {
    return { valid: false, reason: 'Movement too far' };
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| 4-cardinal A* with Manhattan heuristic | 8-direction A* with Chebyshev heuristic | Phase 22 | Diagonal paths; must change heuristic to maintain admissibility |
| 4-direction else-if input | `resolveDirection()` with dual-key combos | Phase 22 | 8 directions accessible; no flickering |
| Single key = grid diagonal | Single key = grid cardinal, dual = grid diagonal | Phase 22 | Cardinal moves now accessible via dual-key; isometric visual behavior changes |

**No deprecated approaches in this phase** — all changes are additive expansions of existing patterns.

## Open Questions

1. **Arrow key behavior after dual-key WASD**
   - What we know: Current code OR's arrow keys with WASD. With dual-key detection, this OR creates ambiguity.
   - What's unclear: Should arrow keys support 8-directional as well, or remain 4-directional?
   - Recommendation: Keep arrow keys as 4-directional fallback (separate from WASD dual-key logic). This preserves backward compat without requiring cursor-key dual-key detection.

2. **Diagonal movement on the server — server validation uses `validateMovement` which allows dx ≤ 1, dy ≤ 1**
   - What we know: Server `game.service.ts` calls `validateMovement` which already accepts diagonal positions (any dx/dy ≤ 1). Server already handles diagonal zone transitions (via `calculateNewPosition`).
   - What's unclear: Whether the server rate limit of 125ms is appropriate for diagonal moves (diagonal moves cover ~1.414 grid tiles per step, which may be perceived as faster movement than cardinals).
   - Recommendation: Keep server rate limit at 125ms for this phase. Speed balance is a gameplay concern for a later phase. Do not change the rate limit as part of Phase 22.

3. **Whether to update `getReachablePositions` in `pathfinding.ts`**
   - What we know: `getReachablePositions` also has a 4-direction array at line 213-218.
   - What's unclear: Whether this function is used anywhere that depends on 4-directional behavior.
   - Recommendation: Search usages of `getReachablePositions` and update it to 8-direction only if it's used in pathfinding-adjacent contexts. If it's used for combat range or visibility, leave it 4-directional to avoid unintended behavior changes.

## Sources

### Primary (HIGH confidence)
- Direct codebase analysis — `packages/game-logic/src/movement/pathfinding.ts` (full file read)
- Direct codebase analysis — `packages/game-logic/src/movement/validation.ts` (full file read)
- Direct codebase analysis — `apps/web/src/game/scenes/WorldScene.ts` (full file read)
- Direct codebase analysis — `apps/web/src/game/systems/PathfindingController.ts` (full file read)
- Direct codebase analysis — `apps/web/src/game/systems/MovementController.ts` (full file read)
- Direct codebase analysis — `packages/shared-types/src/core/position.ts` (Direction type)
- Direct codebase analysis — `packages/shared-types/src/constants.ts` (MOVE_DELAY_MS = 150)
- Direct codebase analysis — `apps/game-server/src/game/game.gateway.ts` (server rate limit = 125ms)
- Direct codebase analysis — `apps/game-server/src/game/game.service.ts` (validateMovement usage)

### Secondary (MEDIUM confidence)
- A* algorithm with diagonal movement — standard algorithm literature; Chebyshev heuristic for diagonal A* is well-established and consistent with the `chebyshevDistance` already defined in the codebase
- Phaser 3 `Key.isDown` simultaneous key reading — standard Phaser 3 pattern; Phaser 3.80 is the workspace version

### Tertiary (LOW confidence)
- Diagonal corner-cutting prevention — standard game dev practice; not specific to Phaser or this project but widely applied in grid-based games

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries; Phaser 3.80 and shared-types are in use
- Architecture: HIGH — based on direct reading of all affected files
- Pitfalls: HIGH for input/A* specifics (verified against actual code); MEDIUM for server rate limit concern (judgment call)
- Isometric mapping: HIGH — based on reading existing mapping (`W → 'nw'`) and understanding the required change to (`W → 'n'`)

**Research date:** 2026-02-17
**Valid until:** 2026-03-19 (30 days — stable, no external dependencies changing)
