# Phase 20: Testing & Polish - Research

**Researched:** 2026-02-17
**Domain:** Cross-chunk gameplay validation, memory profiling, UX polish
**Confidence:** HIGH (based on direct codebase inspection)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Validation Scenarios**
- Focus on rapid back-and-forth movement at chunk boundaries (stress test boundary handling)
- Test long-distance pathfinding (click-to-move destinations 2+ chunks away)
- Validate entity visibility comprehensively: cross-chunk tracking AND spawn timing in loading chunks
- Disconnection/reconnection during chunk loading is a critical test scenario (verify state recovery)

**Issue Triage**
- Fix all found issues immediately — no deferral for v1.4
- If a fix requires significant refactoring, do it properly (quality over speed)
- Track issues in STATE.md blockers section
- Update PROJECT.md Known Issues after each fix (keep it current)

**UX Polish**
- Chunk loading should feel subtle — brief visual cue that something is loading nearby
- Chunk tiles appear instantly (no fade or reveal animation needed)
- Biome indicator already has sufficient polish from Phase 19 hysteresis
- General polish pass with Claude's judgment on visual rough edges

**Memory/Performance Thresholds**
- Test 30+ chunk transitions before declaring "no memory leak"
- Memory should return to baseline after transitions (no growth acceptable)
- Use both Browser DevTools profiling AND observed smoothness
- Fix consistent stutters; one-time hiccups are acceptable

### Claude's Discretion

- Specific DevTools profiling approach (heap snapshots, timeline recordings)
- Order and structure of test scenarios
- Visual polish opportunities not explicitly specified

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

---

## Summary

Phase 20 is a validation and fix phase for the v1.4 infinite world system built across Phases 17-19. The primary work involves manually testing five critical scenarios (rapid boundary crossing, long-distance pathfinding, entity visibility across chunks, spawn timing in loading chunks, and disconnect/reconnect during chunk loading), fixing every issue found, profiling memory over 30+ chunk transitions, and polishing the chunk loading UX.

The codebase is well-structured for this phase. All the critical systems are in place: ChunkManager with priority queue and concurrent request limiting (`apps/web/src/game/rendering/ChunkManager.ts`), chunk lifecycle in WorldScene (`apps/web/src/game/scenes/WorldScene.ts`), entity zone tracking (`entityZoneMap`), LRU server cache (`apps/game-server/src/zones/zones.service.ts`), and the chunk loading indicator in GameContainer (`apps/web/src/components/GameContainer.tsx`). The work is manual verification + targeted fixes + CSS polish. No new architectural systems are required.

One pre-existing visual conflict needs addressing: the chunk-loading indicator (`bottom: 20px; right: 20px` in `loading.css`) overlaps with the minimap placeholder (`bottom: 20px; right: 20px` in `HUD.css`). This is a known rough edge that the polish pass should resolve. The connection indicator sits at `top: 10px; right: 10px`, and chunk loading was intentionally placed bottom-right per Phase 18 decision [18-04] — the minimap element is 180x180px while the loading indicator is small, so repositioning the loading indicator slightly above the minimap bottom edge is the minimal fix.

**Primary recommendation:** Structure this phase as test-execute-fix cycles: run each test scenario, document findings in STATE.md, fix immediately if issues found, then continue. This matches the decision to fix all issues without deferral.

---

## Standard Stack

### Core (Already Installed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Phaser 3 | ^3.80.0 | Game rendering, scene management | Project standard |
| Browser DevTools | N/A | Memory profiling, performance timeline | Standard browser tooling |
| Vitest | (via nx/vite) | Unit test runner | Project testing framework |
| Socket.IO | ^4.7.0 | WebSocket for chunk requests | Project standard |
| LRU Cache | ^11.2.6 | Server-side chunk cache | Already in use |

### Supporting (No New Installs Required)

No new libraries needed. All infrastructure is in place.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Browser DevTools heap snapshots | Chrome Memory Profiler extension | DevTools is built-in, no install needed |
| Manual testing | Automated E2E (Playwright) | Playwright setup time not justified for validation phase |

---

## Architecture Patterns

### Recommended Test Execution Order

The test scenarios should run in order of increasing complexity:

1. **Basic chunk boundary crossing** — validates CHUNK-01 through CHUNK-07
2. **Rapid back-and-forth at boundaries** — stress tests ChunkManager queue and lifecycle
3. **Long-distance pathfinding** — validates PathfindingController across chunk boundaries
4. **Entity visibility across chunks** — validates COORD-02, CHUNK-05 entity cleanup
5. **Disconnection/reconnection during chunk loading** — validates network resilience
6. **30+ chunk transition memory profiling** — validates MEM-01 through MEM-04

### Pattern 1: Chunk Boundary Stress Test

**What:** Player rapidly moves back and forth crossing a chunk boundary.
**When to use:** Primary stress test — exercises queue cancellation, duplicate chunk prevention, and container lifecycle.
**What to verify:**
- `chunkStates` map does not accumulate stale `'loading'` entries
- `chunkTiles` map correctly removes tiles when chunks unload
- `entityZoneMap` correctly tracks entity cleanup on unload
- `loadedChunks` Map size stays bounded at 9 (3x3 grid)

**Key code to watch** (in `WorldScene.ts`):
```typescript
// ChunkManager.receiveChunk() has a guard for duplicate calls:
if (this.chunkStates.get(zoneId) === 'loaded') {
  return; // Guard: Don't reprocess chunk if already loaded
}

// WorldScene.renderChunk() has a guard too:
if (this.chunkTiles.has(zoneId)) {
  console.log(`[WorldScene] Chunk ${zoneId} already rendered, skipping`);
  return;
}
```
If these guards trigger unexpectedly on rapid boundary crossing, there may be a state desync between ChunkManager and WorldScene.

### Pattern 2: Long-Distance Pathfinding

**What:** Click-to-move to a target 2+ chunks away (e.g., from z_0_0 to z_2_0).
**When to use:** Validates that PathfindingController operates on current zone's collision map and correctly handles chunk streaming during path execution.
**Critical limitation found:** `PathfindingController.startPath()` uses `collisionMap` from WorldScene which only reflects the **current chunk**. Long paths that cross into adjacent chunks will follow the path but collision validation stops at zone boundary.

```typescript
// PathfindingController.ts line 43:
const path = findPath(startX, startY, targetX, targetY, collisionMap);
// collisionMap is ZONE_SIZE x ZONE_SIZE — only current chunk
```

**Expected behavior:** The path is calculated from local coords only. Cross-chunk pathfinding calculates a path in local coordinates and the MovementController handles zone transitions tile-by-tile. The test should verify the player navigates successfully even if the path visualization shows only current-chunk coordinates.

### Pattern 3: Entity Visibility During Chunk Load Race

**What:** When the player approaches a chunk boundary, entities in the loading chunk may arrive via `zone:chunk` event before or after the chunk tiles render.
**When to use:** Validates CHUNK-05 and entity spawn timing.
**Key flow to verify:**
```typescript
// GameContainer.tsx handles zone:chunk:
const handleChunkData = (data) => {
  worldScene.receiveChunkData(data.chunk, data.biome);
  if (data.entities) {
    data.entities.forEach(entity => worldScene.spawnEntity(entity, data.zoneId));
  }
};
```
The entity spawn and tile render happen in the same callback. The question is whether `spawnEntity` can fire before the tile elevations exist for that chunk. Check: `getTileElevation` falls back to `currentHeights` (current zone) if chunk not yet in ChunkManager — entity would render at wrong elevation if it's in a not-yet-loaded chunk.

### Pattern 4: Disconnection/Reconnection During Chunk Load

**What:** Simulate network drop mid-chunk-request (30-50 rapid moves, then disable network briefly).
**When to use:** Validates state recovery — the `connectionStateRecovery` on the server (2-minute window) should handle this.
**Gateway config:**
```typescript
// game.gateway.ts
connectionStateRecovery: {
  maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutes
  skipMiddlewares: true,
}
```
**Client socket behavior:**
```typescript
// socket.ts
this.socket.on('connect', () => {
  if (this.socket?.recovered) {
    // Connection recovered - skip auth, restore state
    this.setConnectionState('authenticated');
    this.startPingMonitoring();
  }
});
```
**Issue to verify:** After reconnection, does `ChunkManager` correctly re-request any chunks that were `'loading'` state when disconnection occurred? Currently, `chunkStates` with `'loading'` entries persist after disconnect. If the timeout fires (10 seconds), they'll be marked `'failed'` and removed. But if reconnection happens before timeout, those chunks stay `'loading'` indefinitely.

### Pattern 5: Memory Profiling (30+ Transitions)

**What:** Use Chrome DevTools Memory tab → Heap Snapshots + Performance timeline.
**DevTools approach (Claude's discretion):**

1. **Baseline heap snapshot:** Before any movement
2. **Move 10 chunks:** Take heap snapshot
3. **Move 20 chunks:** Take heap snapshot
4. **Move 30 chunks:** Take heap snapshot
5. **Return to origin:** Take heap snapshot — should match baseline closely

**What to look for:**
- `Phaser.GameObjects.Graphics` instances should not accumulate (each tile has 1-3 Graphics objects that must be destroyed on unload)
- `Phaser.GameObjects.Container` instances should stay bounded
- Socket.IO room subscriptions: no detached event listeners
- `chunkTiles` Map: should stay at max 9 entries

**Performance timeline recording:**
- Record 2 minutes of rapid boundary crossing
- Look for memory growth trend line in Memory chart
- Look for consistent >16ms frames (consistent stutters require fixing)

**Known tile destruction pattern:**
```typescript
// WorldScene.unloadChunkContainer():
tiles.forEach(tile => {
  const children = tile.getAll();
  children.forEach(child => child.destroy());
  tile.removeAll(true);
  tile.destroy();
});
```
Each tile container has Graphics children (south face, east face, top face). The `removeAll(true)` + `destroy()` pattern should handle cleanup. Verify no reference leaks.

### Anti-Patterns to Avoid

- **Do not add fade animations for chunk tiles:** The decision is tiles appear instantly. Do not add `alpha` tweens on tile appearance.
- **Do not change the priority queue algorithm:** Manhattan distance priority is locked from Phase 18.
- **Do not change max concurrent requests (3):** This was a deliberate network flooding prevention decision.
- **Do not change the 3x3 grid load radius:** CHUNK-01 requires this.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Memory leak detection | Custom memory tracker | Chrome DevTools Heap Snapshot | Built-in, authoritative |
| Chunk state tracking | Second state machine | Existing `chunkStates` Map | Already handles all states |
| Performance monitoring | Custom FPS counter | Phaser's built-in `game.loop.actualFps` | Available via `this.game.loop` |

**Key insight:** This is a validation phase. No new abstractions should be introduced. The goal is to find and fix existing code paths.

---

## Common Pitfalls

### Pitfall 1: Chunk Loading Indicator Overlaps Minimap

**What goes wrong:** The `.chunk-loading-indicator` CSS positions at `bottom: 20px; right: 20px`. The `.hud-minimap` CSS also positions at `bottom: 20px; right: 20px`. The minimap is 180x180px, so the loading indicator renders on top of the minimap canvas area.
**Why it happens:** The indicator was added in Phase 18 as bottom-right per decision [18-04], but the minimap is also bottom-right per HUD layout.
**How to avoid:** Reposition loading indicator. Recommended: change `bottom: 20px` to `bottom: 210px` (above the 180px minimap + 20px gap). The indicator is only ~32px tall, so this places it just above the minimap.
**Warning signs:** Loading terrain text obscured by minimap content.

### Pitfall 2: Rapid Boundary Crossing Leaves Stale 'loading' State

**What goes wrong:** Player rapidly crosses boundary, chunk X starts loading. Player immediately moves back. `updateChunks()` cancels `'loading'` state for chunk X. But if `receiveChunk()` arrives later (after state was deleted), it calls `onChunkLoaded` which calls `renderChunk()` — which creates tiles for a zone no longer tracked in `chunkStates`.
**Why it happens:** The race condition window between state deletion and response arrival.
**Current guard:** `receiveChunk()` checks distance > 1 and discards. But `chunkStates` was deleted before check, so `chunkStates.get(zoneId) !== 'loading'` — the chunk won't be reprocessed. The distance check may still correctly discard. Verify this works under rapid stress.
**How to avoid:** Monitor for orphaned containers — tiles added to scene but not tracked in `chunkTiles`.

### Pitfall 3: pathfindingController Uses Stale Collision Map Across Zones

**What goes wrong:** Player starts long-distance path in zone z_0_0. Player moves to z_1_0 mid-path. `collisionMap` in WorldScene updates to z_1_0 via `setCollisionMap()` from zone:state. But `pathfindingController` still has a live path computed from z_0_0 coordinates. Steps now execute against potentially wrong collision context.
**Why it happens:** The pathfinding is pure local-coordinate A* with no cross-chunk awareness.
**Current behavior:** `getDirection()` in PathfindingController uses grid deltas (dx, dy) — these work as long as local tile coords are correct within the new zone. The path continues executing but tile indices from z_0_0 may be out of bounds or wrong for z_1_0.
**How to avoid:** On zone transition (zone:state received), cancel any active path. This is already done in gameStore.ts for zone transitions:
```typescript
// gameStore.ts - isZoneTransition handling:
const pathfindingController = worldScene.getPathfindingController();
if (pathfindingController) {
  pathfindingController.cancelPath();
}
```
Verify this cancellation actually fires during long-distance navigation.

### Pitfall 4: Entity Elevation Mismatch on Cross-Chunk Spawn

**What goes wrong:** Entity in chunk z_1_0 spawns via `zone:chunk` event. `spawnEntity` calls `getTileElevation(entity.position.x, entity.position.y, entity.position.zoneId)`. If z_1_0 chunk hasn't been fully processed into ChunkManager yet at the moment of spawn, `getTileElevation` falls back to `currentHeights` (z_0_0) and entity renders at wrong elevation.
**Why it happens:** `GameContainer.handleChunkData` calls both `receiveChunkData` and entity spawns in sequence, but `receiveChunk` in ChunkManager needs to be fully processed before elevations are queryable.
**How to avoid:** Current code calls `receiveChunkData` then immediately iterates `data.entities`. Since `receiveChunk` synchronously updates `loadedChunks`, the chunk data should be available. Verify in practice — if entities appear slightly floating, this is the cause.

### Pitfall 5: Memory Growth from Pathfinding Graphics Object

**What goes wrong:** `PathfindingController` creates a `pathGraphics` Phaser.GameObjects.Graphics object on first path and reuses it. If `cancelPath()` is called without the graphics being cleared, or if the scene is restarted, the graphics object may not be properly destroyed.
**Current pattern:**
```typescript
// Only created once, reused via clear():
if (this.pathGraphics) {
  this.pathGraphics.clear();
} else {
  this.pathGraphics = this.scene.add.graphics();
}
```
**How to avoid:** Verify `pathGraphics` is destroyed in PathfindingController cleanup. Note: `PathfindingController` doesn't have a `destroy()` method — `WorldScene.shutdown()` calls `pathfindingController.cancelPath()` but that only clears the path, not the graphics object.

---

## Code Examples

Verified patterns from codebase inspection:

### DevTools Heap Snapshot Workflow

```
1. Open Chrome DevTools → Memory tab
2. Select "Heap snapshot" radio
3. Click "Take snapshot" → label it "Baseline"
4. Play game, cross 10 chunk boundaries
5. Take snapshot → label "10 chunks"
6. Continue to 30 chunks
7. Take snapshot → label "30 chunks"
8. Compare: In "30 chunks" snapshot, filter by "retained size"
   Look for: Phaser.GameObjects.Graphics with high counts
   Look for: Phaser.GameObjects.Container with high counts
   Look for: Objects with "(string)" type that grew significantly
```

### Checking Phaser FPS from Console (DevTools)

```javascript
// From browser console while game is running:
window.game.loop.actualFps  // Current FPS
window.game.loop.delta      // Last frame delta in ms
```
(Phaser exposes `game` via the window if started with `window.game = new Phaser.Game(...)` — current code stores it in `gameRef`, so access via React devtools or add `window.game = game` temporarily for profiling.)

### Manual ChunkManager State Inspection (Console)

```javascript
// Via gameRef in React DevTools → Profiler, or add to window temporarily:
const worldScene = gameRef.current.getWorldScene();
// ChunkManager exposes:
worldScene.chunkManager.getLoadedZoneIds()     // Currently loaded chunks
worldScene.chunkManager.getLoadingChunkCount() // In-flight requests
worldScene.chunkTiles.size                     // Tile containers tracked
```

### Chunk Loading Indicator CSS Fix

Current (overlaps minimap):
```css
.chunk-loading-indicator {
  bottom: 20px;
  right: 20px;
}
```

Recommended fix (above minimap):
```css
.chunk-loading-indicator {
  bottom: 210px;  /* 180px minimap + 20px gap + 10px buffer */
  right: 20px;
}
```

### Requirements Verification Pattern

For each COORD/CHUNK/BIOME/MEM requirement, the verification approach:

```
COORD-01: Depth sorting uses world coordinates
  → Verify: tiles rendered in different chunks have correct depth ordering
  → Code: TileRenderer.createTileWithElevationWorld() uses worldX,worldY for depth

COORD-02: Entity visibility uses world coordinate distance
  → Verify: entity in z_1_0 visible to player in z_0_0 within 48 tiles
  → Code: WorldScene.isEntityVisible() uses calculateWorldDistance()

COORD-03: Tile rendering calculates depth from world position
  → Verify: no z-fighting between chunk boundary tiles
  → Code: isoTransform.calculateDepth(worldX, worldY, elevation)

CHUNK-06: Loading indicator displayed while chunks pending
  → Verify: spinner appears when approaching boundary, disappears when loaded
  → Code: gameStore.chunksLoading drives GameContainer conditional render

CHUNK-07: Seamless boundary movement
  → Verify: no visible gap/seam between chunks z_0_0 and z_1_0
  → Code: renderChunk uses world coordinates for tile screen positions

MEM-01: Phaser containers destroyed on unload
  → Verify: heap snapshot shows container count stays bounded
  → Code: unloadChunkContainer() destroys children then container

MEM-02: WebSocket room subscriptions cleaned up
  → Verify: server logs show clean leave/join on zone transition
  → Code: updatePlayerRooms() in game.gateway.ts

MEM-03: Priority queue for chunk requests
  → Verify: current chunk loads before adjacent, adjacent before corners
  → Code: ChunkManager.queueChunkRequest() Manhattan distance priority

MEM-04: Server chunk cache bounded
  → Verify: ZonesService LRU max=500 (already implemented)
  → Code: zones.service.ts LRU with max: 500
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Zone-based visibility (same zoneId check) | World coordinate distance (48-tile radius) | Phase 17 | Entities visible across chunk boundaries |
| Single zone rendering | 3x3 chunk grid with priority queue | Phase 18 | Infinite streaming world |
| Chunk-level biome | Per-tile biome sampling | Phase 19 | Seamless biome transitions |
| Manual collision map updates | Automatic on zone:state | Phase 18 | Correct pathfinding in new chunks |

---

## Open Questions

1. **PathfindingController.pathGraphics memory leak**
   - What we know: `pathGraphics` is created once and reused via `clear()`. `cancelPath()` only clears path data, not the Phaser Graphics object.
   - What's unclear: Does `WorldScene.shutdown()` → `pathfindingController.cancelPath()` actually destroy the Graphics object? The Graphics object is added directly to scene via `this.scene.add.graphics()`. Phaser scenes should auto-destroy scene children on shutdown. But verify.
   - Recommendation: Add `pathGraphics.destroy()` call in a new `PathfindingController.destroy()` method called from `WorldScene.shutdown()`.

2. **Loading indicator fade behavior (UX)**
   - What we know: Decision is "subtle" — brief visual cue. Current implementation shows/hides instantly via React conditional render (`{chunksLoading > 0 && ...}`).
   - What's unclear: Should there be a CSS opacity transition for smoother appearance/disappearance, or is instant show/hide acceptable?
   - Recommendation: Add CSS `transition: opacity 0.3s ease` with 0.2s delay on appearance (so fast loads don't flash), using `opacity` instead of conditional render. This matches "subtle" intent without animation on chunk tiles themselves.

3. **Chunk request handler reset on reconnection**
   - What we know: `setChunkRequestHandler` is called in GameContainer's `useEffect` on zoneId change. After reconnection, `zone:state` arrives which triggers zoneId update which re-sets the handler.
   - What's unclear: Does ChunkManager's internal state (pending requests, request queue) get reset on disconnect, or do stale entries accumulate?
   - Recommendation: Verify `ChunkManager.clear()` is called on disconnect. Current code calls it in `WorldScene.shutdown()` but not on socket disconnect events.

---

## Sources

### Primary (HIGH confidence — direct codebase inspection)

- `/apps/web/src/game/rendering/ChunkManager.ts` — chunk state machine, priority queue, lifecycle
- `/apps/web/src/game/scenes/WorldScene.ts` — tile rendering, entity management, chunk cleanup
- `/apps/web/src/components/GameContainer.tsx` — chunk request handler, zone:chunk listener
- `/apps/game-server/src/game/game.gateway.ts` — zone:request handling, room subscriptions
- `/apps/game-server/src/zones/zones.service.ts` — LRU cache, deterministic generation
- `/apps/web/src/store/gameStore.ts` — chunksLoading state, zone transition handling
- `/apps/web/src/styles/loading.css` — chunk loading indicator CSS (position conflict identified)
- `/apps/web/src/ui/hud/HUD.css` — minimap position (conflict at bottom: 20px right: 20px)
- `/apps/web/src/game/systems/PathfindingController.ts` — pathGraphics lifecycle concern
- `/apps/web/src/game/systems/MovementController.ts` — zone transition handling
- `/.planning/codebase/TESTING.md` — Vitest setup, no existing tests

### Secondary (MEDIUM confidence)

- Chrome DevTools Memory profiling guidance is standard browser tooling, well-established pattern

### Tertiary (LOW confidence)

- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — direct codebase inspection, no external library uncertainty
- Architecture patterns: HIGH — specific code paths identified with line references
- Pitfalls: HIGH — identified from actual code patterns, race conditions visible in logic
- UX recommendations: MEDIUM — judgement calls based on current CSS and decision context

**Research date:** 2026-02-17
**Valid until:** 2026-03-17 (stable codebase, 30 days)
