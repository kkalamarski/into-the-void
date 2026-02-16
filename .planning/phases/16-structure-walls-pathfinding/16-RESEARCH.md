# Phase 16: Structure Walls & Pathfinding - Research

**Researched:** 2026-02-16
**Domain:** Multi-tile structure walls, elevation-based movement validation, A* pathfinding with terrain costs, occlusion culling
**Confidence:** HIGH

## Summary

Phase 16 makes elevation gameplay-relevant by blocking movement on steep slopes (2+ elevation difference), adding pathfinding costs for climbing, and introducing structure walls that block line-of-sight. Building on Phase 15's visual elevation system (side faces, depth sorting), this phase adds game logic: movement validation checks elevation delta, A* pathfinding applies cost penalties for uphill movement, and tall structures occlude entities behind them.

The standard approach for elevation-based movement uses neighbor tile comparison at validation time: allow movement if `abs(currentHeight - targetHeight) <= 1`, block if delta >= 2. A* pathfinding incorporates elevation as edge cost: flat movement costs 1, climbing 1 level costs 1.5-2.0, preferring flat routes when equal distance. Occlusion in 2D isometric games uses depth-based visibility checks: if entity depth < structure depth + threshold, entity alpha = 0.5 (semi-transparent) or alpha = 0 (fully hidden).

Structure walls are multi-tile linear segments placed procedurally during world generation. The TileStructure interface (already defined in ChunkData) stores wall tiles with positions and heights. Walls render using the same side-face system from Phase 15 but with blocking property true. Minimap shows walls as distinct colored markers overlaid on terrain.

**Primary recommendation:** Extend validateMovement to check elevation delta, add elevation cost to A* neighbor expansion, generate wall structures using noise threshold + line-drawing algorithm, implement depth-based occlusion culling in EntityRenderer, overlay structure markers on minimap camera.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| A* algorithm | In-repo (pathfinding.ts) | Grid-based pathfinding with cost support | Already implemented, extend edge cost calculation |
| TileRegistry | In-repo (@into-the-void/tiles) | Tile properties (blocking, height) | Centralized tile metadata, query for movement validation |
| ChunkData.structures[] | In-repo | Multi-tile structure storage | Already defined in shared-types, ready for wall data |
| IsometricTransform | In-repo | Click detection coordinate conversion | Existing screenToGrid handles clicks, extend for elevation offset |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| SimplexNoise | In-repo | Procedural wall placement | Use separate instance for structure noise (like heightNoise in terrain.ts) |
| Phaser Cameras | 3.85+ | Minimap rendering | MinimapCamera already exists, extend ignore list for structure markers |
| Container.setData() | Phaser 3.85+ | Store elevation/height for occlusion | Pattern from Phase 15, use for structure height metadata |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Elevation delta validation | Distance-based slope calculation | Delta simpler (one subtraction), slope accurate for diagonal but more complex |
| Fixed elevation cost penalty | Dynamic cost by slope steepness | Fixed predictable (1 level = +0.5 cost), dynamic realistic but harder to tune |
| Depth-based occlusion | Raycasting from camera | Depth leverages existing sorting (Phase 14/15), raycasting accurate but expensive |
| Noise-based wall placement | Hand-authored wall patterns | Noise deterministic/infinite, patterns require storage and lookup |

**Installation:**
No new dependencies required—all components exist in codebase or are standard Phaser features.

## Architecture Patterns

### Recommended Project Structure
```
packages/game-logic/src/
├── movement/
│   ├── validation.ts          # Extend validateMovement with elevation check
│   └── pathfinding.ts         # Add elevation cost to findPath
packages/world-gen/src/
└── generation/
    ├── structures.ts          # NEW: Procedural wall generation
    └── chunk.ts               # Call generateStructures, populate ChunkData.structures
apps/web/src/game/
├── rendering/
│   ├── EntityRenderer.ts      # Add occlusion check based on structure depth
│   └── MinimapCamera.ts       # Overlay structure markers
└── input/
    └── WorldInputHandler.ts   # Adjust click detection for elevation offset
```

### Pattern 1: Elevation-Based Movement Validation

**What:** Check elevation difference between current and target tile, block if delta >= 2
**When to use:** In validateMovement before allowing player/entity movement

**Example:**
```typescript
// Source: Extend existing validation.ts pattern + elevation delta logic
export function validateMovement(
  from: Position,
  to: Position,
  collisionMap: boolean[][],
  heights: number[][] // NEW: elevation data
): { valid: boolean; reason?: string } {
  // Existing bounds and collision checks
  if (!isWithinZoneBounds(to.x, to.y)) {
    return { valid: false, reason: 'Out of bounds' };
  }
  if (collisionMap[to.y]?.[to.x]) {
    return { valid: false, reason: 'Blocked terrain' };
  }

  // NEW: Elevation difference check
  const fromHeight = heights[from.y]?.[from.x] ?? 0;
  const toHeight = heights[to.y]?.[to.x] ?? 0;
  const elevationDelta = Math.abs(toHeight - fromHeight);

  if (elevationDelta >= 2) {
    return { valid: false, reason: 'Terrain too steep' };
  }

  // Existing distance check
  const dx = Math.abs(to.x - from.x);
  const dy = Math.abs(to.y - from.y);
  if (from.zoneId === to.zoneId && (dx > 1 || dy > 1)) {
    return { valid: false, reason: 'Movement too far' };
  }

  return { valid: true };
}
```

### Pattern 2: A* Pathfinding with Elevation Cost Penalty

**What:** Add cost modifier when moving to higher elevation tile (uphill climbing)
**When to use:** In findPath when calculating neighbor node cost (g value)

**Example:**
```typescript
// Source: Extend existing pathfinding.ts + A* elevation cost pattern
const ELEVATION_CLIMB_PENALTY = 0.5; // Additional cost per elevation level climbed

export function findPath(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  collisionMap: boolean[][],
  heights: number[][], // NEW: elevation data
  maxIterations = 1000
): Array<{ x: number; y: number }> | null {
  // ... existing validation and initialization

  while (openSet.length > 0 && iterations < maxIterations) {
    // ... get current node

    // Check neighbors
    for (const dir of directions) {
      const nx = current.x + dir.dx;
      const ny = current.y + dir.dy;

      // ... existing bounds and collision checks

      // NEW: Calculate elevation cost
      const currentHeight = heights[current.y]?.[current.x] ?? 0;
      const neighborHeight = heights[ny]?.[nx] ?? 0;
      const elevationDelta = neighborHeight - currentHeight;

      // Block movement if too steep (same as validation)
      if (Math.abs(elevationDelta) >= 2) {
        continue; // Skip this neighbor
      }

      // Base cost = 1 for flat/downhill, add penalty for uphill
      let moveCost = 1.0;
      if (elevationDelta > 0) {
        moveCost += elevationDelta * ELEVATION_CLIMB_PENALTY;
      }

      const g = current.g + moveCost;
      const h = manhattanDistance(nx, ny, endX, endY);
      const f = g + h;

      // ... existing node update logic
    }
  }

  return null;
}
```

### Pattern 3: Procedural Wall Structure Generation

**What:** Use noise threshold to place wall segments, connect with line-drawing
**When to use:** In chunk generation after terrain/heights, before spawn points

**Example:**
```typescript
// Source: Noise-based placement + line drawing algorithm
import { SimplexNoise } from '../noise/simplex';
import { TileStructure } from '@into-the-void/shared-types';

export function generateStructures(
  worldSeed: string,
  chunkX: number,
  chunkY: number,
  biome: BiomeType,
  heights: number[][],
  collisions: boolean[][]
): TileStructure[] {
  const structures: TileStructure[] = [];
  const noise = new SimplexNoise(`${worldSeed}_structures_${chunkX}_${chunkY}`);
  const ZONE_SIZE = heights.length;

  // Sample noise at lower frequency for structure placement zones
  const wallCandidates: Array<{ x: number; y: number }> = [];
  for (let y = 0; y < ZONE_SIZE; y += 4) { // Sample every 4th tile
    for (let x = 0; x < ZONE_SIZE; x += 4) {
      const worldX = chunkX * ZONE_SIZE + x;
      const worldY = chunkY * ZONE_SIZE + y;
      const noiseValue = noise.noise(worldX * 0.02, worldY * 0.02);

      // Threshold determines wall density (higher = fewer walls)
      if (noiseValue > 0.6 && !collisions[y][x]) {
        wallCandidates.push({ x, y });
      }
    }
  }

  // Connect nearby candidates into wall segments
  for (const start of wallCandidates) {
    // Find nearest unconnected candidate within range
    const nearest = wallCandidates.find(end =>
      end !== start &&
      Math.abs(end.x - start.x) <= 8 &&
      Math.abs(end.y - start.y) <= 8
    );

    if (nearest) {
      const wallSegment = createWallSegment(start, nearest, heights, biome);
      if (wallSegment.tiles.length > 0) {
        structures.push(wallSegment);
      }
    }
  }

  return structures;
}

function createWallSegment(
  start: { x: number; y: number },
  end: { x: number; y: number },
  heights: number[][],
  biome: BiomeType
): TileStructure {
  const wallTileId = getWallTileForBiome(biome); // e.g., 'void_wall', 'ruins_wall'
  const tiles: TileStructure['tiles'] = [];

  // Bresenham's line algorithm to connect start and end
  const dx = Math.abs(end.x - start.x);
  const dy = Math.abs(end.y - start.y);
  const sx = start.x < end.x ? 1 : -1;
  const sy = start.y < end.y ? 1 : -1;
  let err = dx - dy;
  let x = start.x;
  let y = start.y;

  while (true) {
    // Add wall tile at current position
    const tileHeight = heights[y]?.[x] ?? 0;
    tiles.push({
      x,
      y,
      tileId: wallTileId,
      height: tileHeight + 2 // Walls are 2 elevation levels tall
    });

    if (x === end.x && y === end.y) break;

    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x += sx;
    }
    if (e2 < dx) {
      err += dx;
      y += sy;
    }
  }

  return { type: 'wall', tiles };
}

function getWallTileForBiome(biome: BiomeType): string {
  const wallTiles: Record<BiomeType, string> = {
    void_plains: 'void_wall',
    crystal_caves: 'crystal_formation',
    toxic_wastes: 'toxic_pool',
    ancient_ruins: 'ruins_wall',
    frozen_expanse: 'ice_wall',
    volcanic_ridge: 'lava',
    fungal_forest: 'fungal_growth',
    starfall_crater: 'crater_debris'
  };
  return wallTiles[biome];
}
```

### Pattern 4: Depth-Based Occlusion Culling

**What:** Reduce entity alpha when behind tall structures based on depth comparison
**When to use:** In EntityRenderer update loop or DepthSorter

**Example:**
```typescript
// Source: 2D isometric occlusion pattern + depth sorting from Phase 14/15
const OCCLUSION_DEPTH_THRESHOLD = 5.0; // Structures this much "in front" occlude entities

export class EntityRenderer {
  // ... existing methods

  /**
   * Update entity visibility based on structures in front of them
   */
  updateOcclusion(
    entityContainer: Phaser.GameObjects.Container,
    structures: Array<{ depth: number; height: number }>
  ): void {
    const entityDepth = entityContainer.depth;
    const entityGridY = entityContainer.getData('gridY') as number;

    // Check if any tall structure is in front of entity
    let isOccluded = false;
    for (const structure of structures) {
      // Structure is "in front" if its depth is greater (renders after)
      const depthDiff = structure.depth - entityDepth;

      // Only occlude if structure is tall enough (height >= 3) and close in depth
      if (structure.height >= 3 && depthDiff > 0 && depthDiff < OCCLUSION_DEPTH_THRESHOLD) {
        isOccluded = true;
        break;
      }
    }

    // Set alpha based on occlusion
    entityContainer.setAlpha(isOccluded ? 0.3 : 1.0);
  }
}

// In WorldScene update or depth sorting pass:
function updateEntityOcclusion(): void {
  const structureDepths = this.getAllStructureDepths(); // Get all structure containers

  this.entityContainers.forEach(container => {
    this.entityRenderer?.updateOcclusion(container, structureDepths);
  });
}
```

### Pattern 5: Click Detection with Elevation Offset

**What:** Adjust click coordinates by elevation before grid conversion
**When to use:** In WorldInputHandler when processing pointer click events

**Example:**
```typescript
// Source: IsometricTransform.screenToTile + elevation offset adjustment
const ELEVATION_HEIGHT_STEP = 16; // From Phase 15

export function handleTerrainClick(
  pointer: Phaser.Input.Pointer,
  camera: Phaser.Cameras.Scene2D.Camera,
  isoTransform: IsometricTransform,
  getTileElevation: (x: number, y: number) => number
): { x: number; y: number } | null {
  // Convert pointer to world coordinates
  const worldX = pointer.worldX;
  const worldY = pointer.worldY;

  // Initial grid position (without elevation correction)
  const initialTile = isoTransform.screenToTile(worldX, worldY);

  // Get elevation at clicked tile
  const elevation = getTileElevation(initialTile.x, initialTile.y);
  const elevationOffset = elevation * ELEVATION_HEIGHT_STEP;

  // Adjust worldY by elevation offset (elevated tiles are higher on screen)
  const adjustedWorldY = worldY + elevationOffset;

  // Recalculate tile position with elevation correction
  const correctedTile = isoTransform.screenToTile(worldX, adjustedWorldY);

  // Validate tile is within bounds
  if (correctedTile.x < 0 || correctedTile.x >= ZONE_SIZE ||
      correctedTile.y < 0 || correctedTile.y >= ZONE_SIZE) {
    return null;
  }

  return correctedTile;
}
```

### Pattern 6: Minimap Structure Markers

**What:** Render structure tiles as colored rectangles on minimap camera
**When to use:** In minimap rendering loop or as separate markers layer

**Example:**
```typescript
// Source: Minimap rendering pattern + structure overlay
export class MinimapCamera {
  private structureMarkers: Phaser.GameObjects.Graphics | null = null;

  // ... existing methods

  /**
   * Render structure walls as markers on minimap
   */
  renderStructureMarkers(structures: TileStructure[]): void {
    if (!this.structureMarkers) {
      this.structureMarkers = this.scene.add.graphics();
      this.structureMarkers.setScrollFactor(1); // Moves with world
      this.structureMarkers.setDepth(999); // Above terrain, below UI
    }

    this.structureMarkers.clear();
    this.structureMarkers.fillStyle(0xff6b35, 0.8); // Orange for walls

    for (const structure of structures) {
      if (structure.type === 'wall') {
        for (const tile of structure.tiles) {
          const screenPos = this.isoTransform.gridToScreen(tile.x, tile.y);

          // Draw small rectangle at tile position
          this.structureMarkers.fillRect(
            screenPos.x - 2,
            screenPos.y - 2,
            4,
            4
          );
        }
      }
    }
  }

  destroy(): void {
    // ... existing cleanup
    if (this.structureMarkers) {
      this.structureMarkers.destroy();
      this.structureMarkers = null;
    }
  }
}
```

### Anti-Patterns to Avoid

- **Checking elevation in every pathfinding iteration:** Pre-filter unreachable tiles in collision map generation, not during A* search
- **Linear elevation cost scaling:** Use logarithmic or capped penalties (1 level = +0.5, 2+ levels blocked) to avoid exponential path costs
- **Occlusion for every entity every frame:** Use spatial partitioning or dirty flags, only check entities near structures
- **Regenerating structure markers every frame:** Cache minimap graphics, regenerate only on chunk load/unload
- **Iterative elevation offset correction:** Single-pass click detection with known elevation, not multiple screenToTile calls

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Dijkstra's algorithm for pathfinding | Custom distance flood-fill | Extend existing A* with elevation cost | A* already optimal with admissible heuristic, Dijkstra slower |
| Complex occlusion raycasting | Per-pixel visibility checks | Depth-based alpha blending | Depth sorting already done (Phase 14/15), raycast expensive |
| Custom line-drawing for walls | Recursive flood-fill for connected regions | Bresenham's line algorithm | Bresenham proven, deterministic, efficient for grid-based games |
| Dynamic structure placement system | Runtime structure spawning | Procedural generation in chunk.ts | Deterministic from seed, consistent across clients, no sync issues |

**Key insight:** Phase 15 established all rendering infrastructure (depth sorting, elevation offset, side faces). Phase 16 adds game logic layered on top: validation checks heights array, pathfinding adds edge costs, occlusion compares existing depth values. Don't rebuild coordinate systems or rendering pipelines.

## Common Pitfalls

### Pitfall 1: Elevation Delta Check Allows Diagonal Climbing

**What goes wrong:** Player at (10, 10, height 0) can move diagonally to (11, 11, height 2) because abs(2 - 0) = 2, which equals the threshold instead of exceeding it.

**Why it happens:** Using `>=` in check instead of `>`, or not accounting for diagonal movement allowing "corner cutting" over steep edges.

**How to avoid:**
- Strict inequality: `if (elevationDelta > 1)` blocks 2+ level differences
- Alternative: Check both intermediate tiles for diagonal moves: validate (10, 11) and (11, 10) are walkable
- Test case: Ensure (0,0,h0) → (1,1,h2) checks heights at (0,1) and (1,0)

**Warning signs:** Players teleporting up cliffs diagonally, diagonal movement bypassing steep terrain

### Pitfall 2: A* Elevation Penalty Causes Infinite Paths

**What goes wrong:** Pathfinding never finds route because uphill cost penalty makes path longer than `maxIterations` allows.

**Why it happens:** Penalty too high relative to heuristic, or heuristic inadmissible (underestimates cost with penalties).

**How to avoid:**
- Keep penalty small: 0.3-0.5 per level, not 5.0 or 10.0
- Ensure heuristic remains admissible: `h(n) <= actualCost(n, goal)` must hold even with penalties
- Increase maxIterations for larger zones or complex terrain
- Test with extreme case: path from bottom of zone to top with all uphill movement

**Warning signs:** Pathfinding always returns null on elevated terrain, paths avoid all slopes even when necessary

### Pitfall 3: Structure Walls Don't Update Collision Map

**What goes wrong:** Walls render visually but entities walk through them because collision map not updated.

**Why it happens:** Structures generated after collision map created in generateTerrain, collision map not patched with structure positions.

**How to avoid:**
- Update collisions array after generateStructures: `collisions[tile.y][tile.x] = true` for each wall tile
- Alternative: Merge structure generation into terrain generation before collision calculation
- Verify in validation.ts: check both collisionMap and structure positions

**Warning signs:** Entities moving through visible walls, pathfinding routing through wall tiles

### Pitfall 4: Occlusion Check Doesn't Account for Camera Angle

**What goes wrong:** Entities behind walls from player perspective still fully visible, or entities in front incorrectly occluded.

**Why it happens:** Depth comparison assumes isometric top-down view, but camera zoom/rotation can change what's "in front."

**How to avoid:**
- Depth-based occlusion works for fixed isometric view (current game state)
- If adding camera rotation (future): switch to screen-space bounds overlap check
- Test at different zoom levels to ensure depth threshold remains appropriate

**Warning signs:** Occlusion behaving differently at different zoom levels, entities flickering when camera moves

### Pitfall 5: Click Detection Iteration Doesn't Converge

**What goes wrong:** Iterative elevation correction (click → tile → elevation → adjust → tile → ...) loops or overshoots.

**Why it happens:** Elevation offset affects screenToTile result, which changes which tile's elevation to use, causing feedback loop.

**How to avoid:**
- Single-pass approach: `screenToTile(worldX, worldY + initialElevation * step)` where initialElevation from approximate tile
- Or use fixed iteration count (max 2-3 passes) instead of convergence check
- Test on steep elevation boundaries (0-5 transition) to ensure stability

**Warning signs:** Click detection slow, tiles "jumping" under cursor, clicks registering wrong tile on slopes

### Pitfall 6: Minimap Structure Markers Not Scaled

**What goes wrong:** Structure markers invisible or too large on minimap because marker size fixed while minimap zoom changes.

**Why it happens:** Marker pixel size hard-coded, not adjusted for minimap zoom level (0.1 in current implementation).

**How to avoid:**
- Scale marker size by minimap zoom: `markerSize = 4 / minimapZoom` (4px at zoom 1.0, 40px at zoom 0.1)
- Alternative: Use fillCircle with radius scaled to world units instead of screen pixels
- Test at different window sizes (minimap viewport changes on resize)

**Warning signs:** Markers too small to see at default zoom, markers covering entire minimap when zoomed

## Code Examples

Verified patterns from research and existing codebase:

### Complete Movement Validation with Elevation

```typescript
// Source: packages/game-logic/src/movement/validation.ts
import { Position, ZONE_SIZE } from '@into-the-void/shared-types';

export interface MovementValidationContext {
  collisionMap: boolean[][];
  heights: number[][]; // NEW: elevation data
}

export function validateMovement(
  from: Position,
  to: Position,
  context: MovementValidationContext
): { valid: boolean; reason?: string } {
  const { collisionMap, heights } = context;

  // Existing checks: bounds, collision, distance
  if (!isWithinZoneBounds(to.x, to.y)) {
    return { valid: false, reason: 'Out of bounds' };
  }
  if (collisionMap[to.y]?.[to.x]) {
    return { valid: false, reason: 'Blocked terrain' };
  }

  // NEW: Elevation walkability check
  const fromHeight = heights[from.y]?.[from.x] ?? 0;
  const toHeight = heights[to.y]?.[to.x] ?? 0;
  const elevationDelta = Math.abs(toHeight - fromHeight);

  if (elevationDelta > 1) { // Strict inequality: 2+ levels blocks
    return { valid: false, reason: 'Terrain too steep' };
  }

  // Existing distance validation
  const dx = Math.abs(to.x - from.x);
  const dy = Math.abs(to.y - from.y);
  if (from.zoneId === to.zoneId && (dx > 1 || dy > 1)) {
    return { valid: false, reason: 'Movement too far' };
  }

  return { valid: true };
}
```

### A* Pathfinding with Elevation Cost

```typescript
// Source: packages/game-logic/src/movement/pathfinding.ts
import { ZONE_SIZE } from '@into-the-void/shared-types';

const ELEVATION_CLIMB_COST = 0.5; // Cost per elevation level when climbing

export function findPath(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  collisionMap: boolean[][],
  heights: number[][], // NEW: elevation data
  maxIterations = 1000
): Array<{ x: number; y: number }> | null {
  // ... existing validation (startX/Y, endX/Y bounds, blocked checks)

  const openSet: PathNode[] = [];
  const closedSet = new Set<string>();

  const startNode: PathNode = {
    x: startX,
    y: startY,
    g: 0,
    h: manhattanDistance(startX, startY, endX, endY),
    f: 0,
    parent: null,
  };
  startNode.f = startNode.g + startNode.h;
  openSet.push(startNode);

  const directions = [
    { dx: 0, dy: -1 }, // N
    { dx: 0, dy: 1 },  // S
    { dx: 1, dy: 0 },  // E
    { dx: -1, dy: 0 }, // W
  ];

  let iterations = 0;

  while (openSet.length > 0 && iterations < maxIterations) {
    iterations++;

    openSet.sort((a, b) => a.f - b.f);
    const current = openSet.shift()!;

    if (current.x === endX && current.y === endY) {
      return reconstructPath(current);
    }

    closedSet.add(`${current.x},${current.y}`);

    for (const dir of directions) {
      const nx = current.x + dir.dx;
      const ny = current.y + dir.dy;
      const key = `${nx},${ny}`;

      if (nx < 0 || nx >= ZONE_SIZE || ny < 0 || ny >= ZONE_SIZE) {
        continue;
      }
      if (collisionMap[ny]?.[nx] || closedSet.has(key)) {
        continue;
      }

      // NEW: Calculate elevation-based movement cost
      const currentHeight = heights[current.y]?.[current.x] ?? 0;
      const neighborHeight = heights[ny]?.[nx] ?? 0;
      const elevationDelta = neighborHeight - currentHeight;

      // Block if too steep (consistent with movement validation)
      if (Math.abs(elevationDelta) > 1) {
        continue;
      }

      // Base cost = 1, add penalty for climbing
      let moveCost = 1.0;
      if (elevationDelta > 0) {
        moveCost += elevationDelta * ELEVATION_CLIMB_COST;
      }
      // Note: No penalty for downhill (elevationDelta < 0)

      const g = current.g + moveCost;
      const h = manhattanDistance(nx, ny, endX, endY);
      const f = g + h;

      const existingNode = openSet.find((n) => n.x === nx && n.y === ny);
      if (existingNode) {
        if (g < existingNode.g) {
          existingNode.g = g;
          existingNode.f = f;
          existingNode.parent = current;
        }
      } else {
        openSet.push({ x: nx, y: ny, g, h, f, parent: current });
      }
    }
  }

  return null;
}
```

### Procedural Wall Generation

```typescript
// Source: packages/world-gen/src/generation/structures.ts (NEW FILE)
import { BiomeType, TileStructure, ZONE_SIZE } from '@into-the-void/shared-types';
import { SimplexNoise } from '../noise/simplex';

const WALL_NOISE_THRESHOLD = 0.6; // Higher = fewer walls
const WALL_NOISE_FREQUENCY = 0.02; // Lower = larger wall clusters
const WALL_SAMPLE_SPACING = 4; // Sample every Nth tile for performance

export function generateStructures(
  worldSeed: string,
  chunkX: number,
  chunkY: number,
  biome: BiomeType,
  heights: number[][],
  collisions: boolean[][]
): TileStructure[] {
  const structures: TileStructure[] = [];
  const noise = new SimplexNoise(`${worldSeed}_structures_${chunkX}_${chunkY}`);

  // Find candidate positions for wall segments
  const wallAnchors: Array<{ x: number; y: number }> = [];
  for (let y = WALL_SAMPLE_SPACING; y < ZONE_SIZE - WALL_SAMPLE_SPACING; y += WALL_SAMPLE_SPACING) {
    for (let x = WALL_SAMPLE_SPACING; x < ZONE_SIZE - WALL_SAMPLE_SPACING; x += WALL_SAMPLE_SPACING) {
      // Skip if already blocked (terrain feature)
      if (collisions[y][x]) continue;

      const worldX = chunkX * ZONE_SIZE + x;
      const worldY = chunkY * ZONE_SIZE + y;
      const noiseValue = noise.noise(worldX * WALL_NOISE_FREQUENCY, worldY * WALL_NOISE_FREQUENCY);

      if (noiseValue > WALL_NOISE_THRESHOLD) {
        wallAnchors.push({ x, y });
      }
    }
  }

  // Connect nearby anchors into wall segments
  const connected = new Set<string>();
  for (const start of wallAnchors) {
    const startKey = `${start.x},${start.y}`;
    if (connected.has(startKey)) continue;

    // Find nearest unconnected anchor within range
    let nearest: { x: number; y: number; distance: number } | null = null;
    for (const end of wallAnchors) {
      const endKey = `${end.x},${end.y}`;
      if (start === end || connected.has(endKey)) continue;

      const distance = Math.abs(end.x - start.x) + Math.abs(end.y - start.y);
      if (distance <= 12 && (!nearest || distance < nearest.distance)) {
        nearest = { x: end.x, y: end.y, distance };
      }
    }

    if (nearest) {
      const wallSegment = createWallSegment(
        start,
        { x: nearest.x, y: nearest.y },
        heights,
        collisions,
        biome
      );

      if (wallSegment.tiles.length > 0) {
        structures.push(wallSegment);
        connected.add(startKey);
        connected.add(`${nearest.x},${nearest.y}`);

        // Update collision map with wall positions
        for (const tile of wallSegment.tiles) {
          if (tile.y >= 0 && tile.y < ZONE_SIZE && tile.x >= 0 && tile.x < ZONE_SIZE) {
            collisions[tile.y][tile.x] = true;
          }
        }
      }
    }
  }

  return structures;
}

function createWallSegment(
  start: { x: number; y: number },
  end: { x: number; y: number },
  heights: number[][],
  collisions: boolean[][],
  biome: BiomeType
): TileStructure {
  const wallTileId = getWallTileIdForBiome(biome);
  const tiles: TileStructure['tiles'] = [];

  // Bresenham's line algorithm
  const dx = Math.abs(end.x - start.x);
  const dy = Math.abs(end.y - start.y);
  const sx = start.x < end.x ? 1 : -1;
  const sy = start.y < end.y ? 1 : -1;
  let err = dx - dy;
  let x = start.x;
  let y = start.y;

  while (true) {
    // Skip if tile already blocked by terrain
    if (!collisions[y]?.[x]) {
      const baseHeight = heights[y]?.[x] ?? 0;
      tiles.push({
        x,
        y,
        tileId: wallTileId,
        height: baseHeight + 3 // Walls are 3 elevation levels tall
      });
    }

    if (x === end.x && y === end.y) break;

    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x += sx;
    }
    if (e2 < dx) {
      err += dx;
      y += sy;
    }
  }

  return { type: 'wall', tiles };
}

function getWallTileIdForBiome(biome: BiomeType): string {
  const wallTiles: Record<BiomeType, string> = {
    void_plains: 'void_wall',
    crystal_caves: 'crystal_formation',
    toxic_wastes: 'toxic_pool',
    ancient_ruins: 'ruins_wall',
    frozen_expanse: 'ice_wall',
    volcanic_ridge: 'lava',
    fungal_forest: 'fungal_growth',
    starfall_crater: 'crater_debris'
  };
  return wallTiles[biome];
}
```

### Structure Wall Rendering Integration

```typescript
// Source: apps/web/src/game/scenes/WorldScene.ts renderChunk modification
private renderChunk(chunkData: ChunkData, biome: BiomeType): void {
  const { zoneId, tiles, heights, structures, collisions } = chunkData;

  if (!this.tileRenderer) return;

  const container = this.add.container(0, 0);

  // Render terrain tiles (existing)
  for (let y = 0; y < ZONE_SIZE; y++) {
    for (let x = 0; x < ZONE_SIZE; x++) {
      const tileId = tiles[y][x] as TileId;
      const elevation = heights[y][x];
      const tile = this.tileRenderer.createTileWithElevation(x, y, tileId, elevation, heights);
      container.add(tile);
    }
  }

  // NEW: Render structure walls (same side-face rendering as terrain)
  for (const structure of structures) {
    if (structure.type === 'wall') {
      for (const wallTile of structure.tiles) {
        const tile = this.tileRenderer.createTileWithElevation(
          wallTile.x,
          wallTile.y,
          wallTile.tileId as TileId,
          wallTile.height,
          heights
        );
        tile.setData('isStructure', true); // Mark for occlusion checks
        container.add(tile);
      }
    }
  }

  this.chunkContainers.set(zoneId, container);
  this.collisionMap = collisions; // Updated with structure positions
}
```

### Depth-Based Occlusion

```typescript
// Source: apps/web/src/game/rendering/EntityRenderer.ts
const OCCLUSION_DEPTH_THRESHOLD = 10.0; // Structures this far "in front" occlude entities
const OCCLUSION_MIN_HEIGHT = 3; // Only structures >= 3 elevation levels occlude

export class EntityRenderer {
  // ... existing methods

  /**
   * Update entity alpha based on tall structures in front
   * Call from WorldScene.update or depth sorting pass
   */
  applyOcclusion(
    entityContainers: Map<string, Phaser.GameObjects.Container>,
    structureContainers: Phaser.GameObjects.Container[]
  ): void {
    // Build structure depth cache
    const occluders: Array<{ depth: number; height: number }> = [];
    for (const structContainer of structureContainers) {
      const isStructure = structContainer.getData('isStructure') as boolean;
      const height = structContainer.getData('elevation') as number; // Or use tile.height

      if (isStructure && height >= OCCLUSION_MIN_HEIGHT) {
        occluders.push({
          depth: structContainer.depth,
          height
        });
      }
    }

    // Check each entity against occluders
    entityContainers.forEach(entityContainer => {
      const entityDepth = entityContainer.depth;
      let isOccluded = false;

      for (const occluder of occluders) {
        const depthDiff = occluder.depth - entityDepth;

        // Occluder is "in front" if depth greater, and close enough
        if (depthDiff > 0 && depthDiff < OCCLUSION_DEPTH_THRESHOLD) {
          isOccluded = true;
          break;
        }
      }

      // Fade out occluded entities (or hide completely with alpha = 0)
      entityContainer.setAlpha(isOccluded ? 0.3 : 1.0);
    });
  }
}
```

### Minimap Structure Markers

```typescript
// Source: apps/web/src/game/rendering/MinimapCamera.ts
export class MinimapCamera {
  private structureMarkers: Phaser.GameObjects.Graphics | null = null;
  private isoTransform: IsometricTransform;

  constructor(scene: Phaser.Scene, isoTransform: IsometricTransform) {
    this.scene = scene;
    this.isoTransform = isoTransform;
  }

  create(): void {
    // ... existing minimap camera setup

    // Create graphics for structure markers
    this.structureMarkers = this.scene.add.graphics();
    this.structureMarkers.setScrollFactor(1); // Moves with world
    this.structureMarkers.setDepth(1000); // Above terrain, below UI

    // Make minimap camera ignore structure markers (render on main cam only)
    if (this.minimapCam) {
      this.minimapCam.ignore([this.structureMarkers]);
    }
  }

  /**
   * Update structure markers from current chunk structures
   */
  updateStructureMarkers(structures: TileStructure[]): void {
    if (!this.structureMarkers) return;

    this.structureMarkers.clear();

    // Wall markers: orange rectangles
    this.structureMarkers.fillStyle(0xff6b35, 0.9);
    this.structureMarkers.lineStyle(1, 0xffffff, 0.5);

    for (const structure of structures) {
      if (structure.type === 'wall') {
        for (const tile of structure.tiles) {
          const screenPos = this.isoTransform.gridToScreen(tile.x, tile.y);

          // Scale marker size by minimap zoom (4px at zoom 1.0, 40px at zoom 0.1)
          const markerSize = 4 / MINIMAP_ZOOM; // MINIMAP_ZOOM = 0.1 from existing code

          this.structureMarkers.fillRect(
            screenPos.x - markerSize / 2,
            screenPos.y - markerSize / 2,
            markerSize,
            markerSize
          );
          this.structureMarkers.strokeRect(
            screenPos.x - markerSize / 2,
            screenPos.y - markerSize / 2,
            markerSize,
            markerSize
          );
        }
      }
    }
  }

  destroy(): void {
    // ... existing cleanup
    if (this.structureMarkers) {
      this.structureMarkers.destroy();
      this.structureMarkers = null;
    }
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Binary walkable/blocked movement | Multi-level elevation with gradual slopes | Modern procedural games (2010s+) | More realistic terrain navigation, natural paths |
| Uniform pathfinding cost | Elevation-based cost penalties | A* Pathfinding Project popularized (~2012) | Entities prefer flat routes, avoid unnecessary climbing |
| No occlusion (all entities always visible) | Depth-based alpha blending | Isometric games with tall structures (Age of Empires, SimCity 2000) | Clearer spatial understanding, reduced visual clutter |
| Static hand-placed walls | Procedural noise-based generation | Roguelikes, procedural MMOs (2015+) | Infinite deterministic worlds, no asset storage |
| Full minimap re-render every frame | Cached graphics with dirty flags | Performance optimization (frame-independent rendering) | 60fps stable even with large zones |

**Deprecated/outdated:**
- Binary elevation (flat vs impassable cliff): Multi-level gradual slopes standard in modern games
- Flood-fill pathfinding for grid-based worlds: A* with heuristic provably optimal and faster
- Pixel-perfect occlusion raycasting in 2D: Depth sorting provides "good enough" occlusion at fraction of cost
- Hand-authored structure placement data: Procedural generation from seed eliminates storage, enables infinite worlds

## Open Questions

### Question 1: Elevation Cost Penalty Magnitude

**What we know:** Adding cost for climbing encourages flat routes. Too low (0.1) barely affects paths, too high (5.0) may cause infinite search or unnatural detours.

**What's unclear:** Optimal penalty value balancing realism with playability.

**Recommendation:** Start with 0.5 per elevation level (1 level climb = 1.5 total cost vs 1.0 flat). Test with extreme terrain (all uphill path) and ensure paths found within maxIterations. Tune based on playtesting: increase if players ignore elevation, decrease if paths overly circuitous.

### Question 2: Occlusion Threshold and Alpha Value

**What we know:** Structures with depth > entity depth + threshold occlude entity. Alpha 0.0 = fully hidden, 1.0 = fully visible.

**What's unclear:** Ideal threshold (how far "in front" triggers occlusion) and alpha value (how much to fade).

**Recommendation:** Start with threshold = 10.0 (roughly 1 tile screenY difference) and alpha = 0.3 (70% fade). Too low threshold = entities disappear too easily, too high = occlusion rarely triggers. Alpha 0.0 may frustrate players (entity "gone"), 0.3-0.5 indicates "behind wall" without hiding completely.

### Question 3: Cross-Chunk Structure Placement

**What we know:** Noise-based wall placement is deterministic per chunk. Wall segments starting near chunk edge may extend into adjacent chunk.

**What's unclear:** Should walls respect chunk boundaries, or support cross-chunk segments?

**Recommendation:** Phase 16 v1: Clamp wall segments to chunk bounds (simple, no cross-chunk coordination). Phase 16 v2 or later: Generate walls at chunk edges in deterministic order (e.g., always from lower chunkX/Y) to avoid duplicates. Most critical for Phase 16 is single-chunk walls working correctly.

### Question 4: Structure Height Variable by Type

**What we know:** TileStructure.tiles includes height property per tile. Walls generated with fixed height (base + 3 levels).

**What's unclear:** Should wall height vary by biome, noise, or position along segment?

**Recommendation:** Phase 16: Fixed height = baseElevation + 3 for all walls (consistent, predictable). Future: Add height variation using structure noise (start tall, taper at ends) or biome-specific heights (ruins taller than fungal growth). Complexity deferred for clearer requirements.

## Sources

### Primary (HIGH confidence)

- **Existing codebase:**
  - `/packages/game-logic/src/movement/pathfinding.ts` - A* implementation, extend for elevation cost
  - `/packages/game-logic/src/movement/validation.ts` - Movement validation pattern
  - `/packages/shared-types/src/core/zone.ts` - TileStructure interface, ChunkData.structures[]
  - `/apps/web/src/game/utils/IsometricTransform.ts` - screenToTile for click detection
  - `/apps/web/src/game/rendering/TileRenderer.ts` - Side face rendering (Phase 15)
  - `/packages/tiles/src/types.ts` - TileDefinition with isBlocking property

- **A* Pathfinding with Elevation:**
  - [Movement costs for pathfinders - Amit's Game Programming](http://theory.stanford.edu/~amitp/GameProgramming/MovementCosts.html) - Authoritative guide on terrain cost integration
  - [A* Pathfinding Project: Grid Graph Rules](https://arongranberg.com/astar/documentation/stable/gridrules.html) - Slope angle penalties, elevation penalties

### Secondary (MEDIUM confidence)

- [Toward More Realistic Pathfinding - Game Developer](https://www.gamedeveloper.com/programming/toward-more-realistic-pathfinding) - Natural path behavior with terrain preferences
- [Noise Functions and Map Generation - Red Blob Games](https://www.redblobgames.com/articles/noise/introduction.html) - Noise-based procedural placement techniques
- [2D Strategy Game Minimap - Patterns Game Programming](https://www.patternsgameprog.com/strategy-game-12-minimap) - Minimap marker rendering patterns
- [Godot Minimap Recipes - Kids Can Code](https://kidscancode.org/godot_recipes/3.x/ui/minimap/index.html) - Minimap object tracking and icons
- [Occlusion culling in isometric engine - GameDev.net](https://www.gamedev.net/forums/topic/174754-occlusion-culling-in-a-complex-isometric-engine/) - Depth-based occlusion discussion

### Tertiary (LOW confidence - requires validation)

- [Phaser 3 Isometric Plugin](https://github.com/sebashwa/phaser3-plugin-isometric) - Click detection examples (WIP fork, may be outdated)
- [Unity Isometric Occlusion](https://discussions.unity.com/t/isometric-occlusion-culling-inside-buildings/230721) - Unity-specific, not Phaser, but conceptual patterns
- [Bresenham's Line Algorithm - Wikipedia](https://en.wikipedia.org/wiki/Bresenham%27s_line_algorithm) - Mathematical foundation, not game-specific

## Metadata

**Confidence breakdown:**
- Elevation movement validation: **HIGH** - Simple height comparison, existing validation pattern
- A* elevation cost: **HIGH** - Well-documented technique, existing A* implementation to extend
- Procedural wall generation: **MEDIUM-HIGH** - Noise placement proven, line-drawing standard, integration needs testing
- Occlusion culling: **MEDIUM** - Depth-based approach sound, threshold tuning empirical
- Click detection: **MEDIUM** - Coordinate math straightforward, elevation offset needs testing
- Minimap markers: **HIGH** - Graphics API pattern from existing minimap, structure overlay simple

**Research date:** 2026-02-16
**Valid until:** ~60 days (pathfinding algorithms stable, Phaser API mature, elevation system established in Phase 14/15)

**Key unknowns requiring experimentation:**
- Elevation cost penalty magnitude (0.5 starting point, tune for playability)
- Occlusion depth threshold and alpha values (threshold 10.0, alpha 0.3 starting points)
- Wall height variation strategy (fixed height Phase 16 v1, vary later if needed)
- Cross-chunk structure coordination (clamp to chunk bounds Phase 16 v1, cross-chunk later)
