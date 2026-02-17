# Phase 24: Zone Boundary Hysteresis - Research

**Researched:** 2026-02-17
**Domain:** Client-side zone transition management, chunk loading debouncing
**Confidence:** HIGH

## Summary

Zone boundary thrashing occurs because the game uses a hard zone boundary: the instant a player steps from tile `x=63` in zone `z_0_0` to tile `x=0` in zone `z_1_0`, a zone transition fires. Walking back crosses again. Each crossing triggers `ChunkManager.updateChunks()`, which unloads the old 3x3 grid and begins loading a new 3x3 grid, firing network requests and toggling `chunksLoading > 0` — which makes the "Loading terrain..." indicator flash.

The fix is a hysteresis band: only commit to a zone transition after the player has moved N tiles past the zone boundary, not at the instant of crossing. The HUD already uses this exact pattern for biome display flickering — requiring 3 consistent "frames" before updating. The same principle applies here but measured in tiles deep into the new zone rather than render frames.

This is a pure client-side fix. The server zone tracking is authoritative (correctly places the player in the right zone) and must not be changed. The client receives `zone:state` events (which carry the server's authoritative zone ID) and can apply hysteresis before calling `ChunkManager.updateChunks()` and `WorldScene.onPlayerZoneChanged()`.

**Primary recommendation:** In `WorldScene.onPlayerZoneChanged()`, add a tile-depth check: only call `chunkManager.updateChunks()` when the player is at least 3 tiles inside the new zone (measured from the zone boundary). The displayed zone identity in ChunkManager lags the server's authoritative position by hysteresis tiles.

## Standard Stack

No new libraries needed. This phase is pure TypeScript logic applied to existing systems.

### Core
| Component | File | Purpose | Role in fix |
|-----------|------|---------|-------------|
| `ChunkManager` | `apps/web/src/game/rendering/ChunkManager.ts` | Manages 3x3 chunk grid around player | `updateChunks(zoneId)` is what causes thrashing — needs hysteresis before calling |
| `WorldScene.onPlayerZoneChanged` | `apps/web/src/game/scenes/WorldScene.ts:553` | Called on every server zone transition | Entry point for hysteresis logic |
| `gameStore zone:state handler` | `apps/web/src/store/gameStore.ts:100` | Detects zone transitions from server | Also calls `onPlayerZoneChanged` indirectly via `GameContainer` |
| `GameContainer` | `apps/web/src/components/GameContainer.tsx:135` | Calls `worldScene.onPlayerZoneChanged(zoneId!, biome)` | Direct call site to add hysteresis |
| `HUD.tsx` | `apps/web/src/ui/hud/HUD.tsx:17-38` | Already has biome hysteresis (3-frame stability) | Reference pattern to follow |

### Supporting
| Component | File | Purpose | Notes |
|-----------|------|---------|-------|
| `ZONE_SIZE` | `packages/shared-types/src/core/zone.ts:8` | Zone is 64 tiles | Boundary at tiles 0 and 63 |
| `calculateNewPosition` | `packages/game-logic/src/movement/validation.ts:37` | Zone wrapping logic | Zone IDs change when x/y leaves [0, ZONE_SIZE-1] |
| `isZoneTransition` | `packages/game-logic/src/movement/validation.ts:147` | `from.zoneId !== to.zoneId` | Used server-side only |
| `chunksLoading` / `setChunksLoading` | `apps/web/src/store/gameStore.ts:18` | Count of in-flight chunk loads | `chunksLoading > 0` shows the loading indicator |
| `ChunkManager.notifyLoadingStateChange` | `apps/web/src/game/rendering/ChunkManager.ts:273` | Broadcasts loading count to store | Fires on every load/unload/cancel |

## Architecture Patterns

### How Zone Transitions Currently Flow

```
Player presses key → handleInput() → movementController.processInput()
    → server receives player:move
    → server: isZoneTransition(from, to) → true
    → server: emits zone:state with newZoneId
    → client gameStore: zone:state handler
        → detects currentZoneId !== newZoneId → isZoneTransition = true
        → setZoneState(data)
    → client GameContainer: zoneId effect (line 106-173)
        → detects previousZoneIdRef !== zoneId
        → calls worldScene.onPlayerZoneChanged(zoneId!, biome)
    → WorldScene.onPlayerZoneChanged()
        → this.currentZoneId = newZoneId
        → this.chunkManager.updateChunks(newZoneId)
            → calculates required 3x3 grid
            → unloads distant chunks
            → queues/loads new chunks
            → fires notifyLoadingStateChange → chunksLoading > 0 → indicator shows
```

### Thrashing Scenario

```
Player at (63, 32) in z_0_0:
  Move right → zone:state for z_1_0 → updateChunks(z_1_0) → loads z_1_0 3x3, unloads z_-1_* columns
  Move left  → zone:state for z_0_0 → updateChunks(z_0_0) → loads z_0_0 3x3, unloads z_2_* columns
  Move right → zone:state for z_1_0 → ... (repeats)
Each crossing: unload 3 chunks, request 3 new chunks, loading indicator flashes.
```

### Pattern 1: Tile-Depth Hysteresis (Recommended)

**What:** Track how many tiles deep the player is inside the new zone. Only commit to `updateChunks()` after N tiles of depth. If the player returns before reaching N tiles, cancel the pending transition.

**When to use:** This is the correct approach because it directly addresses the root cause (premature zone commitment) with minimal state.

**Key insight:** The player's `position.x` or `position.y` reveals tile depth from the nearest boundary. For a zone of size 64:
- Player stepped from `x=63` in old zone → now `x=0` in new zone. Depth = 0.
- After 1 more step right: `x=1`. Depth = 1.
- After 2 more steps: `x=2`. Depth = 2.
- At depth >= HYSTERESIS_TILES (e.g., 3): commit the zone switch.

Similarly for other axes and all 4 cardinal directions.

```typescript
// In WorldScene.ts — tracking pending zone transition
private pendingZoneId: string | null = null;
private pendingBiome: BiomeType | null = null;
private HYSTERESIS_TILES = 3; // Must be >= 1, must be < ZONE_SIZE

onPlayerZoneChanged(newZoneId: string, biome: BiomeType): void {
  const serverPosition = /* current server-acknowledged position */ this.getServerPosition();
  const depth = this.getZoneBoundaryDepth(serverPosition);

  if (depth >= this.HYSTERESIS_TILES) {
    // Player is deep enough — commit
    this.commitZoneTransition(newZoneId, biome);
  } else {
    // Store as pending; wait for player to go deeper
    this.pendingZoneId = newZoneId;
    this.pendingBiome = biome;
  }
}

// Called each time player position updates
private checkPendingZoneTransition(position: Position): void {
  if (!this.pendingZoneId) return;

  if (position.zoneId !== this.pendingZoneId) {
    // Player returned to old zone — cancel pending
    this.pendingZoneId = null;
    this.pendingBiome = null;
    return;
  }

  const depth = this.getZoneBoundaryDepth(position);
  if (depth >= this.HYSTERESIS_TILES) {
    this.commitZoneTransition(this.pendingZoneId, this.pendingBiome!);
    this.pendingZoneId = null;
    this.pendingBiome = null;
  }
}

private getZoneBoundaryDepth(position: Position): number {
  // Distance from nearest edge of zone (0 = on edge, 31 = center for 64-tile zone)
  const fromLeft = position.x;
  const fromRight = ZONE_SIZE - 1 - position.x;
  const fromTop = position.y;
  const fromBottom = ZONE_SIZE - 1 - position.y;
  return Math.min(fromLeft, fromRight, fromTop, fromBottom);
}

private commitZoneTransition(newZoneId: string, biome: BiomeType): void {
  // Original onPlayerZoneChanged logic
  this.currentZoneId = newZoneId;
  const chunk = this.chunkManager?.getChunk(newZoneId);
  if (chunk) {
    this.currentHeights = chunk.data.heights;
    // ... rest of state update
  }
  this.chunkManager?.updateChunks(newZoneId);
  this.cleanupOrphanedEntities();
}
```

**Source:** Codebase analysis (HIGH confidence — derived from actual code)

### Pattern 2: Move-Count Hysteresis (Alternative)

**What:** Count consecutive moves in the same direction. After N moves all going deeper, commit the transition.

**When to avoid:** More complex to track than tile depth. Use tile depth instead.

### Pattern 3: Time-Based Debounce (Avoid)

**What:** Delay the `updateChunks` call by X milliseconds. If a new zone:state arrives within the window, reset the timer.

**When to avoid:** Time-based debounce can cause the player to see mismatched chunk data if they genuinely cross quickly. Tile depth is more semantically correct.

### Anti-Patterns to Avoid

- **Debouncing the zone:state handler in gameStore:** The zone:state event also updates player position, collision maps, and entity state. Debouncing it would break those updates.
- **Adding hysteresis to server-side zone tracking:** The server must accurately track which zone the player is in for correct entity visibility, room subscriptions, and persistence. Keep server authoritative.
- **Blocking the zone:state update entirely:** The `zone:state` event must still update `player.position`, `collisionMap`, and `entities` — only `chunkManager.updateChunks()` needs the hysteresis delay.
- **Using `chunksLoading` count as hysteresis:** Blocking new `updateChunks` calls while chunks are loading would cause permanent blocking in slow network conditions.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Hysteresis state management | Custom event queue, Redux-style reducer | Simple private fields on WorldScene | The state is local to WorldScene; overengineering adds nothing |
| Boundary depth calculation | Complex geometry math | Min of 4 distances from edges | Zone is a 2D rectangle; depth = nearest edge distance |
| Loading indicator debounce | CSS animation hacks, separate debounce timer | Fix at source (don't trigger extra `updateChunks`) | Treating symptoms not causes |

**Key insight:** The biome hysteresis in `HUD.tsx` (lines 17-38) is a direct pattern reference. The tile-depth approach is even simpler because it uses spatial reasoning (tiles deep) rather than temporal reasoning (frames elapsed), making it deterministic regardless of frame rate.

## Common Pitfalls

### Pitfall 1: Hysteresis Blocking Pre-Loading
**What goes wrong:** If hysteresis delays `updateChunks()`, adjacent chunks in the new zone may not be pre-loaded when the player arrives deep enough to commit. The 3x3 pre-load strategy only works when ChunkManager knows the player zone.
**Why it happens:** ChunkManager uses `currentPlayerZone` to calculate the 3x3 required grid. If that is not updated, it can't request the right chunks.
**How to avoid:** On first entry into new zone (depth = 0), still call `chunkManager.updateChunks(newZoneId)` for the purpose of pre-loading — but defer updating `this.currentZoneId` (the source of truth for collision/height lookups, ZoneHUD, entity occlusion) until depth >= HYSTERESIS_TILES. Alternatively, expose a separate `preloadChunks(zoneId)` method on ChunkManager that only queues requests without updating `currentPlayerZone`.
**Warning signs:** Adjacent chunk tiles not rendering when player crosses boundary after hysteresis period.

### Pitfall 2: Position Source Confusion
**What goes wrong:** Using the wrong position as the depth reference. The client has two positions: the server-acknowledged position (from `zone:state`) and the predicted position (from `movementController`).
**Why it happens:** The server's `zone:state` is what determines the new `zoneId`. The predicted position may be ahead of the server.
**How to avoid:** Use the position from the `zone:state` event (`data` payload from server) as the reference for depth calculation, not the predicted position. This is already available in `GameContainer.tsx` as `zoneState` from the store.
**Warning signs:** Hysteresis firing incorrectly on diagonal movement at corners.

### Pitfall 3: Missing Position from zone:state
**What goes wrong:** The `zone:state` event includes `players[]` which contains the player's authoritative position. But `WorldScene.onPlayerZoneChanged()` currently doesn't receive the player's position — only `newZoneId` and `biome`.
**Why it happens:** `GameContainer.tsx:138` calls `worldScene.onPlayerZoneChanged(zoneId!, biome)` with only 2 arguments.
**How to avoid:** Pass the player position from the zone:state payload as a 3rd argument to `onPlayerZoneChanged()`, or access it from `useGameStore.getState().player.position` inside `WorldScene`.
**Warning signs:** `getZoneBoundaryDepth()` computing wrong depth.

### Pitfall 4: Hysteresis During Diagonal Zone Transitions
**What goes wrong:** At zone corners (e.g., x=63, y=63 stepping to x=0, y=0 in z_1_1), the player is simultaneously 0 tiles deep on both axes. Depth = min(0, 63, 0, 63) = 0. Hysteresis correctly delays, but the player could corner-jump repeatedly without triggering it.
**Why it happens:** Corner transitions are already unusual (require moving diagonally). The depth formula handles this correctly — depth 0 at the corner entry — and the fix is consistent: require N tiles before committing.
**How to avoid:** No special case needed; the depth formula is already correct. Accept that corners require N tiles inward on at least one axis.
**Warning signs:** None expected; this is correct behavior.

### Pitfall 5: Loading Indicator Still Flashing After Fix
**What goes wrong:** Even with hysteresis on `updateChunks()`, the indicator still flashes if `receiveChunk()` is called for chunks that are immediately unloaded.
**Why it happens:** ChunkManager may have in-flight requests from before the hysteresis kicked in. `receiveChunk()` calls `notifyLoadingStateChange()` which updates `chunksLoading`.
**How to avoid:** The existing guard in `ChunkManager.receiveChunk()` (lines 192-203) already handles this: it checks Chebyshev distance and discards chunks that are no longer needed. Once hysteresis prevents premature zone switches, the guard's condition changes less frequently, reducing spurious discards.
**Warning signs:** Loading indicator flashing after zone is stable; check `ChunkManager.currentPlayerZone` is being set correctly.

## Code Examples

### Current Zone Transition Call Sites

```typescript
// GameContainer.tsx:135-139 — zone transition detection
} else if (isZoneTransition) {
  // ZONE TRANSITION: Just update chunks, don't re-render current zone
  console.log('[GameContainer] Zone transition to', zoneId);
  worldScene.onPlayerZoneChanged(zoneId!, biome);
}
```

```typescript
// WorldScene.ts:553-583 — current onPlayerZoneChanged (no hysteresis)
onPlayerZoneChanged(newZoneId: string, biome: BiomeType): void {
  console.log('[WorldScene] onPlayerZoneChanged:', { from: this.currentZoneId, to: newZoneId });
  this.currentZoneId = newZoneId; // Immediate — causes thrashing

  if (this.chunkManager) {
    const chunk = this.chunkManager.getChunk(newZoneId);
    if (chunk) {
      this.currentHeights = chunk.data.heights;
      this.currentTiles = chunk.data.tiles;
      this.currentStructures = chunk.data.structures;
      this.currentBiome = chunk.biome;
      if (chunk.data.collisions) {
        this.setCollisionMap(chunk.data.collisions);
      }
      if (this.zoneHUD) {
        this.zoneHUD.updateZone(newZoneId, chunk.biome);
      }
    }
    this.chunkManager.updateChunks(newZoneId); // Triggers load/unload thrashing
  }
  this.cleanupOrphanedEntities();
}
```

### HUD Biome Hysteresis (Reference Pattern)

```typescript
// HUD.tsx:18-39 — frame-based hysteresis (already exists in codebase)
const HYSTERESIS_FRAMES = 3; // Require 3 consistent frames before updating

useEffect(() => {
  if (!zoneState?.biome) return;
  const currentBiome = zoneState.biome;

  if (currentBiome === lastBiomeRef.current) {
    biomeStableCountRef.current++;
    if (biomeStableCountRef.current >= HYSTERESIS_FRAMES && displayedBiome !== currentBiome) {
      setDisplayedBiome(currentBiome);
    }
  } else {
    lastBiomeRef.current = currentBiome;
    biomeStableCountRef.current = 1; // Reset on change
  }
}, [zoneState?.biome, displayedBiome]);
```

### Tile-Depth Boundary Calculation

```typescript
// Utility function — place in WorldScene or extract to game-logic
function getZoneBoundaryDepth(position: Position, zoneSize: number): number {
  const fromLeft   = position.x;
  const fromRight  = zoneSize - 1 - position.x;
  const fromTop    = position.y;
  const fromBottom = zoneSize - 1 - position.y;
  return Math.min(fromLeft, fromRight, fromTop, fromBottom);
}

// Examples (ZONE_SIZE = 64):
// position.x = 0: fromLeft = 0, depth = 0 (just entered)
// position.x = 3: fromLeft = 3, depth = 3 (3 tiles in from left)
// position.x = 32: depth = 31 (center)
// position.y = 63: fromBottom = 0, depth = 0 (on south edge)
```

### ChunkManager Pre-load vs. Commit Pattern

```typescript
// Strategy: pre-load chunks immediately on zone entry, commit state after hysteresis
// This avoids visible pop-in when hysteresis expires

onPlayerZoneChanged(newZoneId: string, biome: BiomeType, playerPosition: Position): void {
  const depth = getZoneBoundaryDepth(playerPosition, ZONE_SIZE);

  // ALWAYS pre-load chunks for new zone (prevents pop-in when hysteresis commits)
  // ChunkManager handles deduplication — safe to call repeatedly
  if (this.chunkManager && !this.committedZoneId || this.committedZoneId !== newZoneId) {
    // Queue pre-load for new zone's 3x3 grid without changing currentPlayerZone yet
    // This requires a new ChunkManager method or we accept the side effect of
    // calling updateChunks early (which also updates currentPlayerZone)
    // Decision: see Open Questions #1
  }

  if (depth >= HYSTERESIS_TILES) {
    this.commitZoneTransition(newZoneId, biome);
  } else {
    this.pendingZoneId = newZoneId;
    this.pendingBiome = biome;
  }
}
```

## State of the Art

| Old Approach | Current Approach (Pre-fix) | Recommended Fix | Impact |
|--------------|---------------------------|-----------------|--------|
| Immediate zone commit on first boundary crossing | Immediate — causes thrashing | N-tile depth hysteresis before committing | Eliminates repeated chunk load/unload cycles at boundaries |
| HUD biome display | Frame-based hysteresis (already fixed) | Already fixed — reference pattern | Shows stable biome display |
| Loading indicator | Reacts directly to `chunksLoading > 0` | Hysteresis prevents spurious loads | Loading indicator stays invisible when walking at boundaries |

**Deprecated/outdated:**
- Immediate `this.currentZoneId = newZoneId` on first zone:state — replace with pending + depth check.

## Open Questions

1. **Should ChunkManager pre-load new zone chunks before hysteresis commits?**
   - What we know: Pre-loading adjacent chunks is the whole point of the 3x3 strategy. If we don't call `updateChunks()` until depth >= 3, chunks won't be requested until then, causing visible loading delay.
   - What's unclear: Whether the 3x3 grid from the OLD zone's perspective already includes the new zone's chunks. Answer: YES — the 3x3 grid around `z_0_0` already includes `z_1_0` as an adjacent zone. So chunks for the new zone are pre-loaded by the time the player crosses. The hysteresis just delays the UNLOAD of old zone chunks.
   - Recommendation: Call `chunkManager.updateChunks(newZoneId)` immediately (no hysteresis) to keep pre-loading working, but delay updating `this.currentZoneId`, `this.currentHeights`, `this.zoneHUD`, and `this.cleanupOrphanedEntities()` until depth >= HYSTERESIS_TILES. This means ChunkManager unloads correctly without the state flip causing visual issues.

2. **What HYSTERESIS_TILES value is right?**
   - What we know: Zone size is 64 tiles. The player moves 1 tile per step. At 150ms per step, 3 tiles = 450ms lag before zone commits.
   - What's unclear: Whether 3 tiles is visually acceptable. If the player stops at tile 2 and stays there, the zone display never updates — potentially confusing.
   - Recommendation: Start with `HYSTERESIS_TILES = 3`. This matches the HUD's 3-frame pattern and eliminates all boundary oscillation. If UX testing shows display issues, consider 2 or even 1.

3. **Does the "Loading terrain..." indicator need its own debounce?**
   - What we know: The indicator shows whenever `chunksLoading > 0`. With hysteresis preventing extra `updateChunks()` calls, loading will be stable.
   - What's unclear: Whether residual flashing from initial zone loads (not boundary thrashing) is acceptable.
   - Recommendation: Fix the root cause first (hysteresis in zone transition). Only add indicator debounce if residual flashing remains after that fix.

4. **Does the server need any changes?**
   - What we know: The server correctly handles zone transitions (room subscriptions, player:left, player:joined notifications). The server is authoritative.
   - What's unclear: Nothing.
   - Recommendation: No server changes needed. This is purely a client rendering concern.

## Sources

### Primary (HIGH confidence)
- Direct codebase analysis:
  - `apps/web/src/game/rendering/ChunkManager.ts` — full implementation read
  - `apps/web/src/game/scenes/WorldScene.ts` — full implementation read (1227 lines)
  - `apps/web/src/components/GameContainer.tsx` — zone transition call site
  - `apps/web/src/store/gameStore.ts` — zone:state handler and chunksLoading store
  - `apps/game-server/src/game/game.gateway.ts` — server zone transition trigger
  - `apps/game-server/src/game/game.service.ts` — isZoneTransition usage
  - `packages/game-logic/src/movement/validation.ts` — calculateNewPosition, isZoneTransition
  - `packages/game-logic/src/utils/zone.ts` — zone utilities
  - `packages/shared-types/src/core/zone.ts` — ZONE_SIZE = 64
  - `packages/shared-types/src/constants.ts` — MOVE_DELAY_MS = 150
  - `apps/web/src/ui/hud/HUD.tsx` — existing biome hysteresis pattern (HYSTERESIS_FRAMES = 3)

### Secondary (MEDIUM confidence)
- Hysteresis as control theory concept: well-established in game development for avoiding oscillation at state boundaries. Universally applied in MMO chunk streaming systems.

### Tertiary (LOW confidence)
- N/A — all findings are verified from codebase.

## Metadata

**Confidence breakdown:**
- Root cause analysis: HIGH — traced the full call chain from player move to loading indicator
- Architecture patterns: HIGH — derived from actual codebase, not assumption
- Hysteresis approach: HIGH — existing biome hysteresis in HUD.tsx proves the pattern works
- HYSTERESIS_TILES value (3): MEDIUM — reasonable estimate, needs UX validation
- Pre-load vs. commit separation (Open Question 1): MEDIUM — analysis suggests 3x3 old zone already covers new zone; needs verification in testing

**Research date:** 2026-02-17
**Valid until:** 2026-03-17 (stable domain — no external dependencies)
