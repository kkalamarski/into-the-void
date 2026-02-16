# Phase 17: World Coordinate Foundation - Research

**Researched:** 2026-02-16
**Domain:** Coordinate system transformation, isometric depth sorting, multi-chunk rendering
**Confidence:** HIGH

## Summary

Phase 17 transforms the coordinate system from zone-local to world-based coordinates, enabling seamless depth sorting and rendering across chunk boundaries. The current implementation already has partial world coordinate support (`positionToWorldCoords()` in WorldScene.ts) but inconsistently applies it—tiles use world coords for depth while entities use local coords, causing z-order breaks at chunk boundaries.

The core challenge is ensuring ALL depth-sorted objects (tiles, entities, players) use the same world coordinate space for depth calculation. This is a well-understood problem in isometric games with documented patterns in Phaser 3.

**Primary recommendation:** Refactor depth calculation to use world coordinates consistently across all renderable objects, store world coordinates in container data, and update entity visibility to use world coordinate distance instead of zone ID matching.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Phaser 3 | 3.85.0 (current) | Game engine with depth sorting | De facto standard for 2D browser games, built-in depth management |
| TypeScript | 5.x | Type safety for coordinate systems | Prevents coordinate space confusion at compile time |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Socket.IO | 4.x | Chunk streaming requests | Already integrated for multiplayer, reuse for zone:request events |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| World coordinate transform | Per-chunk coordinate spaces | Would require complex cross-chunk sorting, breaks seamless rendering |
| Phaser depth sorting | Manual z-index layers | Phaser's setDepth is optimized, manual sorting is slower |
| Distance-based visibility | Zone ID filtering | Zone ID approach already proven broken at chunk boundaries (research flag) |

**Installation:**
No new dependencies required. Uses existing Phaser 3 and shared-types packages.

## Architecture Patterns

### Recommended Project Structure
```
apps/web/src/game/
├── utils/
│   └── IsometricTransform.ts    # Already exists - add world coord helpers
├── rendering/
│   ├── TileRenderer.ts           # Already uses world coords - verified correct
│   ├── EntityRenderer.ts         # Needs world coord support
│   └── DepthSorter.ts            # Update to expect world coords
└── scenes/
    └── WorldScene.ts             # Centralize world coord conversion
```

### Pattern 1: World Coordinate Conversion
**What:** Convert Position (local coords + zoneId) to world coordinates at render time
**When to use:** All depth-sorted objects (tiles, entities, players)
**Example:**
```typescript
// Source: Current implementation in WorldScene.ts:536-542
private positionToWorldCoords(position: Position): { worldX: number; worldY: number } {
  const zoneCoords = this.parseZoneCoords(position.zoneId);
  return {
    worldX: zoneCoords.x * ZONE_SIZE + position.x,
    worldY: zoneCoords.y * ZONE_SIZE + position.y,
  };
}

// Apply to entities (currently missing)
const { worldX, worldY } = this.positionToWorldCoords(entity.position);
const screenPos = this.isoTransform.gridToScreen(worldX, worldY);
```

### Pattern 2: Consistent Container Data Storage
**What:** Store world coordinates in Phaser container data for depth sorting
**When to use:** All containers (tiles, entities, players)
**Example:**
```typescript
// Source: Derived from TileRenderer.ts:184-187
container.setData('gridX', worldX);  // Store world coords, not local
container.setData('gridY', worldY);
container.setData('elevation', elevation);

// DepthSorter uses these for depth calculation
const gridX = container.getData('gridX') as number;
const gridY = container.getData('gridY') as number;
const depth = isoTransform.calculateDepth(gridX, gridY, elevation);
```

### Pattern 3: World Coordinate Distance Calculation
**What:** Calculate visibility using world coordinate Euclidean distance
**When to use:** Entity visibility checks, interaction range validation
**Example:**
```typescript
// Source: Adapted from game-logic/src/utils/zone.ts:68-76
function calculateWorldDistance(a: Position, b: Position): number {
  const worldA = toWorldPosition(a);
  const worldB = toWorldPosition(b);

  const dx = worldA.worldX - worldB.worldX;
  const dy = worldA.worldY - worldB.worldY;

  return Math.sqrt(dx * dx + dy * dy);
}

// Use for visibility (replace zone ID check)
const distance = calculateWorldDistance(player.position, entity.position);
const isVisible = distance <= VISIBILITY_RADIUS; // e.g., 48 tiles (3/4 of chunk)
```

### Pattern 4: Depth Calculation Formula
**What:** Phaser depth value from world coordinates for proper z-order
**When to use:** All setDepth calls in rendering pipeline
**Example:**
```typescript
// Source: IsometricTransform.ts:83-86 (already correct)
calculateDepth(gridX: number, gridY: number, elevation: number = 0, priorityBoost: number = 0): number {
  const screen = this.gridToScreen(gridX, gridY);
  // Y-position primary, X tiebreaker (rightmost in front), elevation offset, priority boost
  return screen.y + (gridX * 0.0001) + (elevation * this.elevationWeight) + priorityBoost;
}
```

**Key insight:** Screen Y from isometric projection naturally encodes depth. The formula `(gridX - gridY) * halfWidth, (gridX + gridY) * halfHeight` means objects further "south-east" in grid space have higher screen Y and render in front. World coordinates work identically since the projection is position-independent.

### Anti-Patterns to Avoid
- **Zone ID filtering for visibility:** Breaks at chunk boundaries. Always use world coordinate distance.
- **Mixing local and world coords in depth calculation:** Causes z-fighting at chunk boundaries. Ensure consistency.
- **Storing local coords then converting in DepthSorter:** Performance hit. Convert once at creation, store world coords.
- **Using large depth values:** Phaser docs recommend fractional/negative values. Current formula (screen.y + offsets) is safe, screen.y maxes at ~2000 for 32x32 chunks.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Depth sorting algorithm | Custom z-index manager | Phaser's setDepth | Phaser internally optimizes render order, handles thousands of objects efficiently |
| Coordinate conversion | Ad-hoc math in each renderer | Centralized helper functions | Already exists in zone.ts (toWorldPosition), prevents bugs from inconsistent formulas |
| Distance calculation | Manhattan or naive formulas | Euclidean distance with world coords | Euclidean matches player perception, world coords already proven in zone.ts:68-76 |
| Container data schema | Custom metadata objects | Phaser's setData/getData | Built-in, type-safe, no memory overhead |

**Key insight:** Phaser 3 is battle-tested for isometric depth sorting (official examples exist). The challenge is not the depth algorithm but ensuring consistent coordinate space across subsystems.

## Common Pitfalls

### Pitfall 1: Local Coordinates in Depth Calculation
**What goes wrong:** Entities in different chunks with same local coordinates get identical depth, causing z-fighting or incorrect layering at chunk boundaries.
**Why it happens:** EntityRenderer.createEntityContainer (line 38-40) uses `entity.position.x/y` directly, which are local coords. TileRenderer already fixed this (line 184-186 uses world coords).
**How to avoid:** Always convert Position to world coords before passing to gridToScreen or calculateDepth. Store world coords in container data.
**Warning signs:** Entities disappear/reappear when crossing chunk boundaries, or tiles render on top of entities incorrectly.

### Pitfall 2: Zone ID Visibility Filtering
**What goes wrong:** Research flag notes "Entity visibility boundary mismatch (must use world coords, not zone ID)". Current system likely filters entities by zone ID, so entities in adjacent chunks are hidden even if within visual range.
**Why it happens:** Legacy design from single-zone world. Zone ID matching is simpler but breaks with multi-chunk streaming.
**How to avoid:** Replace zone ID checks with world coordinate distance. Example: `calculateDistance(playerPos, entityPos) <= VISIBILITY_RADIUS` where VISIBILITY_RADIUS is 48-64 tiles (1.5-2 chunks).
**Warning signs:** Entities pop in/out abruptly at chunk boundaries instead of smoothly entering view.

### Pitfall 3: DepthSorter Assumes Local Coordinates
**What goes wrong:** DepthSorter.update (line 48-62) reads gridX/gridY from container data and passes to calculateDepth. If containers store local coords, depth calculation is wrong.
**Why it happens:** DepthSorter is coordinate-space agnostic—it trusts container data. If WorldScene stores local coords for entities but world coords for tiles, inconsistency breaks sorting.
**How to avoid:** Audit ALL setData('gridX', ...) calls. Ensure tiles, entities, and players store world coords consistently.
**Warning signs:** Depth sorting works within chunks but fails across chunks, or works for tiles but not entities.

### Pitfall 4: Screen Position vs Depth Coordinate Mismatch
**What goes wrong:** Screen position calculated from local coords but depth from world coords (or vice versa) causes visual displacement from z-order.
**Why it happens:** Screen position is for rendering location (where to draw), depth is for layer order (what draws on top). They use same coordinate input but if inputs differ, object renders in wrong location for its layer.
**How to avoid:** Use same coordinate values for both gridToScreen (screen position) and calculateDepth (z-order). If using world coords for depth, use world coords for screen position too.
**Warning signs:** Objects render offset from their grid positions, or correct position but wrong layering.

### Pitfall 5: Fractional World Coordinates from Chunk Parsing
**What goes wrong:** parseZoneCoords (WorldScene.ts:524-530) uses parseInt which is correct, but if zone IDs are malformed (e.g., "z_1.5_2"), world coord calculation silently produces wrong values.
**Why it happens:** No validation on zone ID format. parseInt("1.5") returns 1, hiding the bug.
**How to avoid:** Validate zone IDs with regex pattern /^z_-?\d+_-?\d+$/ (already exists in zone.ts:105). Use validated parser from shared package instead of local implementation.
**Warning signs:** Rare coordinate glitches, hard to reproduce, usually tied to server-generated zone IDs.

## Code Examples

Verified patterns from official sources and current codebase:

### World Coordinate Conversion (Entity Rendering)
```typescript
// Source: Adapt WorldScene.ts:536-542 pattern to EntityRenderer
// Location: EntityRenderer.ts createEntityContainer method

createEntityContainer(entity: Entity, elevation: number = 0): Phaser.GameObjects.Container {
  // Convert to world coordinates BEFORE screen projection
  const { worldX, worldY } = this.positionToWorldCoords(entity.position);
  const screenPos = this.isoTransform.gridToScreen(worldX, worldY);

  const elevationOffset = elevation * ELEVATION_HEIGHT_STEP;
  const container = this.scene.add.container(screenPos.x, screenPos.y - elevationOffset);

  // Store WORLD coordinates for depth sorting
  container.setData('gridX', worldX);
  container.setData('gridY', worldY);
  container.setData('elevation', elevation);

  // ... rest of method
}

// Helper function (add to EntityRenderer or centralize in WorldScene)
private positionToWorldCoords(position: Position): { worldX: number; worldY: number } {
  const parts = position.zoneId.split('_');
  const zoneX = parseInt(parts[1], 10);
  const zoneY = parseInt(parts[2], 10);
  return {
    worldX: zoneX * ZONE_SIZE + position.x,
    worldY: zoneY * ZONE_SIZE + position.y,
  };
}
```

### Distance-Based Visibility Check
```typescript
// Source: Derived from game-logic zone.ts:68-76
// Location: WorldScene.ts or new VisibilityManager.ts

private isEntityVisible(playerPos: Position, entityPos: Position): boolean {
  const VISIBILITY_RADIUS = 48; // tiles (~1.5 chunks, tune during testing)

  // Use world coordinate distance
  const distance = this.calculateWorldDistance(playerPos, entityPos);
  return distance <= VISIBILITY_RADIUS;
}

private calculateWorldDistance(a: Position, b: Position): number {
  const worldA = this.positionToWorldCoords(a);
  const worldB = this.positionToWorldCoords(b);

  const dx = worldA.worldX - worldB.worldX;
  const dy = worldA.worldY - worldB.worldY;

  return Math.sqrt(dx * dx + dy * dy);
}

// Usage in entity spawning
spawnEntity(entity: Entity): void {
  // Check visibility using world coords, not zone ID
  if (!this.isEntityVisible(this.localPlayerPosition, entity.position)) {
    return; // Skip spawning, out of range
  }

  // ... rest of spawn logic
}
```

### Consistent Depth Calculation
```typescript
// Source: Verified correct in IsometricTransform.ts:83-86
// Ensure ALL renderers use this pattern

// Tiles (already correct in TileRenderer.ts:211)
const depth = this.isoTransform.calculateDepth(worldX, worldY, elevation);
container.setDepth(depth);

// Entities (needs update in EntityRenderer.ts:81 and updateEntityPosition:213)
const depth = this.isoTransform.calculateDepth(worldX, worldY, elevation);
container.setDepth(depth);

// Players (needs update in WorldScene.ts:367, 735, 809)
const { worldX, worldY } = this.positionToWorldCoords(player.position);
const depth = this.isoTransform.calculateDepth(worldX, worldY, elevation + 0.001);
container.setDepth(depth);
```

### Zone ID Validation
```typescript
// Source: game-logic zone.ts:105-108
// Use shared validator instead of ad-hoc parsing

import { isValidZoneId, parseZoneId } from '@into-the-void/game-logic';

function safeParseZoneCoords(zoneId: string): { x: number; y: number } | null {
  if (!isValidZoneId(zoneId)) {
    console.error(`Invalid zone ID: ${zoneId}`);
    return null;
  }
  return parseZoneId(zoneId);
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Zone-local coordinates only | Hybrid: tiles use world, entities use local | Phase 16 (2026-02-16) | Partial world coord support exists, needs consistency |
| Zone ID filtering for visibility | Should be distance-based | Not yet implemented | Research flag identified the issue |
| Ad-hoc zone parsing in WorldScene | Shared zone utilities in game-logic | Phase 16 | Utilities exist but not consistently used |
| Manual depth sorting | Phaser setDepth with formula | Phase 8 (isometric transform) | Formula already accounts for elevation |

**Current state:** The codebase has all the building blocks—world coord conversion, proper depth formula, shared utilities—but applies them inconsistently. Tiles use world coords (TileRenderer.ts:170-214), entities/players still use local coords (EntityRenderer.ts:37-85, WorldScene.ts:338-373).

**Deprecated/outdated:**
- Zone ID matching for entity visibility: Replaced by world coordinate distance in v1.4.
- Local coordinates in container data: Replaced by world coordinates for cross-chunk consistency.

## Open Questions

1. **What is the optimal visibility radius for entities?**
   - What we know: Current system probably shows all entities in player's zone (32x32 tiles)
   - What's unclear: Should it be viewport-based (show what's on screen) or fixed radius (e.g., 48 tiles = 1.5 chunks)?
   - Recommendation: Start with 48 tile radius (1.5 chunks), allows seeing into adjacent chunks. Tune based on performance and gameplay feel. Phase 18 can optimize with viewport culling.

2. **Should world coordinates be calculated once and cached, or computed on-demand?**
   - What we know: Position objects arrive from server with zoneId + local coords, conversion happens client-side
   - What's unclear: Performance impact of repeated conversion vs memory cost of caching
   - Recommendation: Compute on container creation and store in container data. DepthSorter already reads from container data, no repeated conversion. Only recompute on position update (rare for entities, frequent for players).

3. **How should camera following handle world coordinates?**
   - What we know: Camera follows local player sprite (WorldScene.ts:819)
   - What's unclear: Does camera need world coordinate awareness, or is sprite screen position sufficient?
   - Recommendation: Camera follows sprite screen position (current approach is correct). Screen position already calculated from world coords, so camera is indirectly world-aware. No changes needed.

4. **Should shared-types export world coordinate conversion functions?**
   - What we know: game-logic/zone.ts has toWorldPosition/toLocalPosition but not imported in web client
   - What's unclear: Should web client use these instead of local parseZoneCoords implementation?
   - Recommendation: Yes. Centralize in shared-types or game-logic, import in WorldScene/EntityRenderer. Ensures consistent conversion formula across client/server. Phase 18 server-side chunk streaming will need same conversion.

5. **What happens to entities at exact chunk boundaries (e.g., x=0 of chunk)?**
   - What we know: World coords are continuous (chunk z_1_0 x=0 is worldX=32, not worldX=0)
   - What's unclear: Edge case handling—does an entity at chunk boundary "belong" to both chunks for visibility?
   - Recommendation: Use world coordinate distance, no special cases. An entity at worldX=32, worldY=0 (boundary between z_0_0 and z_1_0) is visible to players in either chunk if distance < VISIBILITY_RADIUS. Phase 18 WebSocket subscriptions handle this by subscribing player to 3x3 chunk grid.

## Sources

### Primary (HIGH confidence)
- Phaser 3 Official Documentation - Depth Components: [Phaser.GameObjects.Components.Depth](https://docs.phaser.io/api-documentation/namespace/gameobjects-components-depth)
- Current codebase implementation (verified):
  - TileRenderer.ts createTileWithElevationWorld (lines 170-214) - world coord pattern
  - IsometricTransform.ts calculateDepth (lines 83-86) - depth formula
  - game-logic zone.ts (toWorldPosition, calculateDistance) - conversion utilities
  - WorldScene.ts positionToWorldCoords (lines 536-542) - local implementation

### Secondary (MEDIUM confidence)
- Phaser 3 Isometric Examples: [Isometric Blocks](https://phaser.io/examples/v3.85.0/depth-sorting/view/isometric-blocks) - depth sorting patterns
- Unity Tilemap Renderer Isometric Modes: [Unity Manual](https://docs.unity3d.com/Manual/Tilemap-Isometric-RenderModes.html) - chunk vs individual rendering tradeoffs (concept applies to Phaser)
- Understanding Isometric Grids: [yal.cc guide](https://yal.cc/understanding-isometric-grids/) - coordinate conversion formulas

### Tertiary (LOW confidence, verification needed)
- Phaser community discussions on automatic isometric depth sorting - implementation patterns vary, no canonical approach
- Generic game dev resources on chunk management - mostly Unity/Unreal-specific, concepts transferable but not directly applicable

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Phaser 3 depth sorting is well-documented, current implementation verified functional within single chunks
- Architecture: HIGH - World coordinate pattern already partially implemented in codebase, just needs consistency
- Pitfalls: HIGH - Identified from research flags and code analysis (local vs world coord mismatch is visible in source)
- Code examples: HIGH - Derived from existing codebase patterns that already work for tiles

**Research date:** 2026-02-16
**Valid until:** 90 days (stable patterns, Phaser 3 API unlikely to change)

**Key risks:**
- LOW: Technical feasibility (pattern proven in TileRenderer)
- LOW: Performance impact (depth calculation unchanged, just input coordinate space)
- MEDIUM: Refactor scope (touches 3 major systems: WorldScene, EntityRenderer, DepthSorter)
- LOW: Breaking changes (internal coordinate space change, no API changes)

**Validation needed during planning:**
- Confirm visibility radius value (48 tiles is estimate, needs playtesting)
- Decide on shared utility location (game-logic vs shared-types)
- Verify no other systems depend on local coordinates in container data
