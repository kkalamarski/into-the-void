# Pitfalls Research

**Domain:** Isometric Elevation Systems & Structure Rendering (Integration with Existing Game)
**Researched:** 2026-02-16
**Confidence:** HIGH

## Critical Pitfalls

### Pitfall 1: Depth Sorting Algorithm Breakdown with Multiple Heights

**What goes wrong:**
Depth sorting becomes non-transitive when objects span multiple height levels. Simple Y-based sorting breaks down because tall objects (walls, structures) can be simultaneously "behind" ground-level objects and "in front of" elevated objects. This causes flickering z-fighting artifacts where render order oscillates frame-to-frame.

**Why it happens:**
The existing depth calculation (`screen.y + gridX * 0.0001 + priorityBoost`) assumes all objects exist on a single plane. When introducing multi-level terrain:
- Ground-level sprite at (10, 10, elevation=0) has depth = 640
- Wall spanning (10, 10, elevation=0-2) base depth = 640, but top extends upward
- Elevated platform at (9, 11, elevation=2) has depth ≈ 672

The relation becomes non-transitive (A < B, B < C, but A > C), making regular sorting impossible.

**How to avoid:**
1. Switch to **composite depth calculation** that includes elevation: `depth = screenY + (elevation * elevationWeight) + gridX * 0.0001`
2. Use elevation weight large enough to separate layers but small enough for intra-layer sorting (recommend 10000 for 128x64 tiles)
3. For multi-tile tall objects (walls), calculate depth from **top anchor point** not base
4. Implement **topological sorting** for objects that overlap height ranges (expensive, use only for structures)

**Warning signs:**
- Entities "pop" in front/behind walls during movement
- Walls flicker when player walks nearby
- Console warnings about depth conflicts
- Visual glitches near height transitions

**Phase to address:**
**Phase 1: Tile Definition Architecture** - Build composite depth into tile metadata from the start
**Phase 2: Elevation System Core** - Implement elevation-aware depth calculation before any rendering

---

### Pitfall 2: Pathfinding Treats All Elevation Changes as Equal Cost

**What goes wrong:**
The existing A* implementation (`findPath()`) uses Manhattan distance and uniform cost=1 per tile. When elevation is added, the pathfinder will happily route players up 5-story cliffs because it treats vertical movement identically to horizontal movement. Players experience moonwalking up walls or get stuck at impassable height differences.

**Why it happens:**
Current pathfinding only checks `collisionMap[ny][nx]` (boolean). No elevation data in cost calculation. The heuristic `manhattanDistance()` doesn't account for 3D distance. When terrain has height:
- Moving from elevation=0 to elevation=1 should cost more (climbing)
- Moving from elevation=3 to elevation=0 should be impossible (falling)
- Steep slopes need different treatment than gradual ramps

**How to avoid:**
1. **Expand collision map to elevation map**: Change `boolean[][]` to `{ walkable: boolean, elevation: number }[][]`
2. **Add elevation-aware cost function**:
   ```typescript
   const elevationDiff = Math.abs(nextElevation - currentElevation);
   const baseCost = 1;

   if (elevationDiff > MAX_STEP_HEIGHT) return Infinity; // Impassable
   if (elevationDiff > 0) cost += elevationDiff * CLIMB_COST_MULTIPLIER;
   ```
3. **Update heuristic** to 3D Euclidean distance when elevation variance is high
4. **Add validation layer**: Server rejects moves with impossible elevation changes

**Warning signs:**
- Players teleporting up cliffs
- Server rejects client pathfinding results
- Path follows straight line regardless of terrain height
- Players stuck at base of ramps/stairs

**Phase to address:**
**Phase 2: Elevation System Core** - Change collision map structure BEFORE pathfinding integration
**Phase 3: Structure Walls** - Add elevation to pathfinding cost calculation as walls introduce multi-level navigation

---

### Pitfall 3: ChunkData Structure Assumes Flat Tiles, Breaking World-Gen

**What goes wrong:**
`ChunkData` stores `tiles: number[][]` (2D grid of TileIds) and `collisions: boolean[][]`. This structure cannot represent:
- Tiles with different elevations at same grid position
- Multi-layer structures (floor + wall on same tile)
- Vertical tile faces (wall sides)

Adding elevation retroactively forces choice between:
A) Breaking schema (migrate all saved chunks - impossible for procedural generation determinism)
B) Hacky workarounds (encode elevation in TileId, limiting to 256 tiles and few elevation levels)
C) Parallel data structure (elevation[][] separate from tiles[][] - data sync hell)

**Why it happens:**
The world-gen system (`generateTerrain()`) produces flat output:
```typescript
tiles[y][x] = biomeTiles.floor;  // Single tile per position
collisions[y][x] = isWall;       // Single boolean per position
```

Noise-based terrain (`noise.fbm()`) generates continuous elevation values, but current code only uses it for binary floor/wall decision (`terrainValue > wallThreshold`). The elevation data is discarded.

**How to avoid:**
1. **Refactor ChunkData NOW** before adding elevation:
   ```typescript
   interface TileCell {
     baseElevation: number;      // Ground height
     terrainTile: TileId;        // Ground texture
     structureTile?: TileId;     // Wall/feature above ground
     structureHeight?: number;   // How tall structure is
     walkable: boolean;
   }
   tiles: TileCell[][]  // Instead of number[][]
   ```
2. **Store elevation in world-gen**: Use `elevationNoise.fbm()` result directly, don't discard
3. **Quantize elevation** to fixed steps (0, 1, 2, 3...) not continuous, simplifies rendering
4. **Version ChunkData schema** for future migrations

**Warning signs:**
- Cannot represent ramps/stairs within single tile
- TileId enum keeps growing with elevation variants (FLOOR_0, FLOOR_1, FLOOR_2...)
- Separate elevation storage desyncs from tile data
- Database migration required to add elevation later

**Phase to address:**
**Phase 1: Tile Definition Architecture** - Refactor ChunkData structure before ANY elevation work
**Phase 2: Elevation System Core** - Use refactored structure to store elevation from world-gen

---

### Pitfall 4: Side-Face Rendering Explosion (Memory & Draw Calls)

**What goes wrong:**
Each elevated tile needs up to 6 faces rendered (top + 4 sides + bottom). For 64x64 zone with average elevation=2, that's 64*64*6 = 24,576 potential sprites vs current 4,096 tiles. Memory usage explodes, draw calls skyrocket, FPS tanks. Worse: elevated tiles behind walls are fully rendered despite being invisible.

**Why it happens:**
Current rendering creates one sprite per tile (`createTile(x, y, tileId)`). Adding elevation naively:
```typescript
// BAD: Create sprite for every face
for (let elevation = 0; elevation <= tileElevation; elevation++) {
  createTileTop(x, y, elevation);
  createSideFaceNorth(x, y, elevation);
  createSideFaceEast(x, y, elevation);
  // ... 6x sprites per elevation level
}
```

ViewportCuller only checks 2D tile visibility, not 3D face occlusion. All faces inside viewport get rendered, even if blocked by taller structures.

**How to avoid:**
1. **Mesh side faces together**: Don't create 4 sprites per elevation, create ONE sprite with combined side geometry
2. **Visibility culling per face**:
   - Only render side faces visible to camera (south/east faces, not north/west)
   - Check if neighbor is taller (if so, face is occluded)
   - Example: If tile (10,10) elevation=2 and tile (10,9) elevation=3, don't render north face
3. **Use texture atlas** for side faces, batch into single draw call per chunk
4. **Implement LOD**: Distant chunks render simplified elevation (group 3 levels into 1)
5. **Lazy face generation**: Only create side sprites when elevation differs from neighbor

**Warning signs:**
- FPS drops below 30 when elevated terrain visible
- Profiler shows thousands of draw calls (current: ~hundreds)
- Memory usage grows 5-10x compared to flat terrain
- Chunk loading takes >500ms (current: <100ms)

**Phase to address:**
**Phase 3: Structure Walls** - Implement face culling BEFORE adding vertical walls
**Phase 4: Performance Optimization** - Add LOD and batching after basic elevation works

---

### Pitfall 5: Click Detection Breaks with Elevated Terrain

**What goes wrong:**
Current click-to-move converts screen coordinates to 2D grid: `screenToTile(worldPoint.x, worldPoint.y)` assumes flat plane. With elevation, clicking on a wall's top should select the wall's base tile, but algorithm selects wrong tile or tile behind the wall. Pathfinding starts from incorrect position, or player tries to walk into solid wall.

**Why it happens:**
Isometric screen-to-grid conversion uses 2D math:
```typescript
screenToGrid(screenX, screenY) {
  return {
    x: screenX / tileWidth + screenY / tileHeight,
    y: screenY / tileHeight - screenX / tileWidth
  }
}
```

This projects screen point onto ground plane (elevation=0). When clicking on elevated terrain:
- Click on wall at screen (400, 200)
- Converts to grid (10, 10) - correct
- But wall's top is offset upward by 64px (elevation * 32)
- Actual ground tile is (9, 11)

MousePicker doesn't account for vertical offset of rendered sprites.

**How to avoid:**
1. **Ray-casting approach**: Project 3D ray from click point through camera, intersect with all elevation levels
2. **Store click targets in sprite metadata**: Each sprite knows its grid (x,y) + elevation, use Phaser's input system
3. **Elevation-aware screenToTile**:
   ```typescript
   screenToTile(screenX, screenY, elevationMap: number[][]) {
     const baseGrid = this.screenToGrid(screenX, screenY);
     const elevation = elevationMap[baseGrid.y][baseGrid.x];
     const adjustedY = screenY + (elevation * verticalOffset);
     return this.screenToGrid(screenX, adjustedY);
   }
   ```
4. **Visual debug layer**: Render click hitboxes to verify accuracy

**Warning signs:**
- Clicking on walls selects background tiles
- Click-to-move paths to wrong location
- Clicking elevated platforms selects ground below
- HoverController highlights wrong tiles on elevated terrain

**Phase to address:**
**Phase 2: Elevation System Core** - Fix screenToTile for elevation before pathfinding integration
**Phase 3: Structure Walls** - Validate click detection works for multi-height structures

---

### Pitfall 6: Elevation Noise Doesn't Match Existing Biome Noise

**What goes wrong:**
BiomeGenerator already generates `elevationNoise.fbm()` but only uses it for biome classification (high elevation = ruins/volcanic, low = crater). When adding terrain elevation, naively reusing this noise creates:
- Biome boundaries at wrong heights (toxic wastes on mountaintops)
- Discontinuous elevation (biome changes cause sudden cliffs)
- World-gen determinism breaks (same seed produces different results after elevation integration)

**Why it happens:**
Current biome logic: `if (elevation > 0.8) return 'ancient_ruins'` - threshold-based, ignores actual height.
Terrain generation: `terrainValue > wallThreshold` decides walls - different noise layer.

Two separate noise functions (`elevationNoise` for biomes, `terrainNoise` for walls) with different scales:
- Elevation: scale=0.003 (smooth, continental)
- Terrain: scale=0.05 (detailed, local features)

Trying to use biome elevation (smooth) for terrain elevation (needs detail) creates either:
- Blocky, unrealistic terrain (quantize smooth noise)
- Biomes in wrong locations (use terrain noise for biome classification - breaks biome logic)

**How to avoid:**
1. **Multi-octave approach**: Use biome elevation as **base layer**, add terrain detail as **secondary layer**
   ```typescript
   const baseHeight = biomeGenerator.getElevation(worldX, worldY) * 5;  // 0-5 elevation levels
   const detail = terrainNoise.fbm(worldX * 0.05, worldY * 0.05, 2) * 0.5; // -0.5 to +0.5
   const finalElevation = Math.floor(baseHeight + detail);
   ```
2. **Keep biome classification unchanged**: Still use elevation=0.8 threshold, but map biome to allowed elevation range
3. **Add elevation constraints per biome**:
   ```typescript
   const biomeElevationRange = {
     'void_plains': [0, 2],
     'ancient_ruins': [3, 5],
     // ...
   }
   ```
4. **Test determinism**: Assert `generateChunk(seed, x, y)` produces identical output pre/post elevation changes

**Warning signs:**
- Seed-based generation produces different biomes after elevation added
- Volcanic biomes at sea level, craters on mountains
- Elevation changes sharply at biome boundaries (stair-step effect)
- Integration tests fail: saved chunk data doesn't match regenerated chunks

**Phase to address:**
**Phase 2: Elevation System Core** - Reconcile biome elevation with terrain elevation
**Phase 1: Tile Definition Architecture** - Design elevation constraints into tile metadata

---

### Pitfall 7: Depth Sorting Throttle Breaks Multi-Level Rendering

**What goes wrong:**
Existing DepthSorter throttles updates to 100ms. When entities move between elevation levels, they appear to "float" or "sink" into terrain for several frames before depth corrects. Worse: an entity on elevation=2 can render behind a wall on elevation=0 for 100ms, then snap to correct depth.

**Why it happens:**
Current throttle assumes all depth changes are due to X/Y position changes on flat terrain. Elevation changes are discrete jumps (player climbs stairs, moves from elevation 0→1 instantly), not gradual position changes. The 100ms delay before recalculating depth is visually jarring for sudden elevation changes.

**How to avoid:**
1. **Immediate depth update on elevation change**: When entity elevation changes, bypass throttle and update immediately
2. **Reduce throttle for elevated entities**: If any entity has elevation >0, reduce throttle to 50ms or less
3. **Priority depth updates**: Entities crossing elevation boundaries get immediate update, others remain throttled
4. **Pre-calculate depth ranges**: Know min/max possible depth per elevation level, validate entities are in correct range

**Warning signs:**
- Entities appear to sink into elevated platforms before popping to surface
- Walls briefly render in front of entities at higher elevations
- Depth glitches coincide with elevation changes (stairs, ramps)
- Visual artifacts appear exactly 100ms after position updates

**Phase to address:**
**Phase 2: Elevation System Core** - Adapt depth sorting throttle for elevation before multi-level rendering

---

### Pitfall 8: ViewportCuller Only Checks 2D Bounds, Misses Tall Structures

**What goes wrong:**
Existing ViewportCuller calculates visible tile rectangle using 2D screen bounds. With elevation, a 5-tile-tall wall can be visible even when its base tile is outside the 2D culling bounds. The wall "pops in" suddenly when base tile enters viewport, or disappears while top is still visible.

**Why it happens:**
Current culling: `isTileVisible(x, y, bounds)` checks if tile (x,y) is in 2D rectangle. Doesn't account for sprite height:
```typescript
// Current: Only checks base tile position
const isVisible = x >= bounds.minTileX && x <= bounds.maxTileX &&
                  y >= bounds.minTileY && y <= bounds.maxTileY;
```

A wall at (50, 50) with height=5 has visual presence from screen Y=320 (base) to Y=160 (top). But culler only checks if (50,50) is visible.

**How to avoid:**
1. **Expand culling bounds by max structure height**: Add vertical padding = maxElevation * tileHeightHalf
2. **Per-sprite height-aware culling**: Store sprite height in metadata, check if ANY part of sprite intersects viewport
3. **Conservative culling**: If any tile in chunk has elevation >0, expand cull bounds for entire chunk
4. **Separate culling for structures**: Background tiles use 2D culling, structures/walls use 3D bounding box culling

**Warning signs:**
- Tall walls pop in/out abruptly at screen edges
- FPS doesn't improve with culling on elevated terrain (still rendering off-screen tiles)
- Top of structures visible but bottom culled (or vice versa)
- Culling behaves differently in flat vs elevated zones

**Phase to address:**
**Phase 3: Structure Walls** - Fix culling for tall structures before adding walls

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Encode elevation in TileId (FLOOR_E0, FLOOR_E1...) | No schema change, works with current ChunkData | Limited to ~8 elevation levels (256 tile limit), requires parallel collision map upgrade | NEVER - blocks future expansion |
| Render all 6 faces always (no culling) | Simple implementation, always correct visually | 5-10x performance hit, unplayable on large maps | Prototype only, must refactor before production |
| Use separate `elevation: number[][]` alongside `tiles: number[][]` | Minimal changes to existing code | Data sync issues, double memory usage, complex serialization | Early prototype to test gameplay, refactor within 2 weeks |
| Flat elevation map (only store ground height) | Simple world-gen, easy pathfinding | Cannot represent overhangs, bridges, multi-story buildings | Acceptable for first iteration if roadmap excludes multi-level structures |
| Client-side elevation inference from TileId | No network overhead, fast | Desyncs between client/server, physics bugs, cheating possible | NEVER in multiplayer game |
| Disable depth sorting throttle for elevated objects | Prevents z-fighting on multi-level | CPU usage increases 3-4x, mobile performance tanks | Debug only, never production |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Creating individual sprite per tile face | FPS drops to 15-20 with elevated terrain visible | Use texture atlas + batched draw calls, combine side faces into single mesh per chunk | >2000 visible tiles with elevation variance |
| Recalculating depth every frame for all entities | CPU spikes in DepthSorter.update(), choppy movement | Keep throttle at 100ms, only recalc on position change | >50 entities in viewport on elevated terrain |
| Pathfinding doesn't cache elevation lookups | FindPath() takes 50-200ms instead of 5-10ms | Cache elevationMap in PathfindingController, index by zoneId | Elevated terrain + paths >20 tiles |
| Full chunk re-render on elevation change | 500ms+ freeze when tile elevation updates (building/destruction) | Use dirty region tracking, only re-render affected tiles + neighbors | Any dynamic elevation changes |
| Storing full elevation mesh per chunk in memory | Memory usage 500MB+ for 9 loaded chunks | Lazy load side faces on demand, use shared geometry | >9 chunks loaded (3x3 grid) with average elevation >2 |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No visual feedback for elevation differences | Players can't tell if tile is reachable, try to walk up cliffs | Add elevation contour lines, shadow gradients, or height indicators on hover |
| Camera doesn't adjust for elevated structures | Tall walls block view of player behind them | Implement camera tilt adjustment or fade-out tall foreground objects |
| Click detection inaccuracy hidden | Frustration when click-to-move goes to wrong place, feels buggy | Show visual raycast debug line in dev mode, elevation-aware target reticle |
| Pathfinding silently fails on elevation | Player clicks elevated platform, nothing happens, no feedback | Show "unreachable" indicator, path preview before committing |
| Elevation changes during movement | Player starts path, elevation updates mid-path, teleport/stuck | Validate path elevation at each step, cancel and reroute on terrain change |

## "Looks Done But Isn't" Checklist

- [ ] **Elevation Rendering:** Often missing side face occlusion culling — verify faces behind taller tiles are not rendered (check draw call count)
- [ ] **Pathfinding Integration:** Often missing elevation validation on server — verify server rejects impossible elevation changes (test cliff walking)
- [ ] **Click Detection:** Often missing elevation offset in screenToTile — verify clicking wall top selects correct base tile (visual debug mode)
- [ ] **ChunkData Migration:** Often missing version field for schema changes — verify old/new chunks can coexist (test save/load)
- [ ] **Depth Sorting:** Often missing composite depth for multi-height — verify walls don't flicker behind moving entities (record 60s gameplay, check for artifacts)
- [ ] **World-Gen Determinism:** Often missing elevation seed consistency — verify same seed produces identical chunks pre/post changes (unit test 100 chunks)
- [ ] **Memory Profiling:** Often missing realistic load testing — verify 9 chunks with elevation uses <200MB (heap snapshot comparison)
- [ ] **Mobile Performance:** Often missing low-end device testing — verify >30fps on 3-year-old phones with elevation enabled (device lab test)

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Depth sorting breakdown | LOW | Add elevation weight to calculateDepth, use topological sort for overlapping structures (1-2 days) |
| Pathfinding treats elevation as flat | MEDIUM | Refactor collisionMap to include elevation, update cost function, revalidate server movement (3-5 days) |
| ChunkData structure inadequate | HIGH | Schema migration: TileCell structure, update world-gen, migrate existing data, test determinism (1-2 weeks) |
| Side-face rendering explosion | MEDIUM | Implement face culling, texture atlas batching, LOD system (5-7 days) |
| Click detection broken | LOW | Add ray-casting or elevation-aware screenToTile, update HoverController (2-3 days) |
| Elevation noise mismatch | MEDIUM | Reconcile biome/terrain noise layers, test biome placement, fix world-gen (4-6 days) |
| Performance degradation | MEDIUM-HIGH | Profile hotspots, implement batching/culling/LOD, optimize data structures (1-2 weeks) |
| Depth sorting throttle issues | LOW | Add immediate update on elevation change, priority queue for elevation transitions (1-2 days) |
| ViewportCuller misses tall structures | LOW | Expand bounds by max height, add 3D bounding box checks (1-2 days) |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| ChunkData structure inadequate | Phase 1: Tile Definition Architecture | Unit test: serialize/deserialize TileCell with elevation, verify deterministic world-gen |
| Depth sorting breakdown | Phase 2: Elevation System Core | Visual test: record 60s gameplay with elevation, check for z-fighting/flickering |
| Elevation noise mismatch | Phase 2: Elevation System Core | Determinism test: generate 100 chunks with same seed, compare before/after elevation |
| Click detection broken | Phase 2: Elevation System Core | Integration test: automated clicks on elevated tiles, verify correct grid coordinates |
| Pathfinding treats elevation as flat | Phase 3: Structure Walls | E2E test: click elevated platform, verify path rejected if unreachable OR valid if stairs present |
| Side-face rendering explosion | Phase 3: Structure Walls | Performance test: load 9 chunks with avg elevation=3, verify <200 draw calls per frame |
| Depth sorting throttle issues | Phase 2: Elevation System Core | Visual test: entity climbs stairs, verify no floating/sinking artifacts |
| ViewportCuller misses tall structures | Phase 3: Structure Walls | Visual test: tall walls at screen edge, verify no pop-in/pop-out |
| Performance degradation | Phase 4: Performance Optimization | Profiling: 60fps on target hardware with 9 loaded chunks, elevation variance 0-5 |

## Integration-Specific Gotchas

### Existing System: Depth Sorting (DepthSorter.ts)
**Common Mistake:** Assuming 100ms throttle sufficient for elevation changes
**Impact:** Z-fighting when entities move between elevation levels rapidly
**Correct Approach:** Reduce throttle to 50ms for elevation variance >1, or use immediate update on elevation change

### Existing System: World-Gen (BiomeGenerator + generateTerrain)
**Common Mistake:** Reusing elevation noise without reconciling biome classification
**Impact:** Biomes appear at wrong elevations (toxic wastes on mountains)
**Correct Approach:** Multi-layer noise (biome base + terrain detail), constrain elevation per biome

### Existing System: Pathfinding (findPath A*)
**Common Mistake:** Only checking `collisionMap[y][x]` boolean
**Impact:** Paths route through impassable elevation changes
**Correct Approach:** Change collision map to include elevation, add elevation cost to A* traversal

### Existing System: Collision Map (boolean[][])
**Common Mistake:** Keeping boolean collision separate from elevation data
**Impact:** Data desync, elevation walkable but collision says blocked (or vice versa)
**Correct Approach:** Unified data structure (`TileCell` with walkable + elevation + tileId)

### Existing System: ViewportCuller
**Common Mistake:** 2D tile visibility check doesn't account for elevated tiles being taller
**Impact:** Tall structures pop in/out of view incorrectly, culled when partially visible
**Correct Approach:** Expand cull bounds by max elevation height, check 3D bounding box not 2D tile

### Existing System: ChunkManager (load/unload chunks)
**Common Mistake:** Chunk loading doesn't pre-compute side faces, generates on-demand causing hitches
**Impact:** FPS drops to 10-15 when new chunk with elevation loads
**Correct Approach:** Pre-generate side face geometry in background thread, swap in when ready

## Domain-Specific Warnings

### Procedural Generation + Elevation
**Warning:** Changing world-gen algorithm invalidates all previously generated chunks with same seed
**Mitigation:** Version chunks (`schemaVersion: 1`), either migrate old chunks or mark incompatible and regenerate

### Multiplayer Sync + Elevation
**Warning:** Client-predicted movement on elevation requires server to send elevation map, doubling network payload
**Mitigation:** Send elevation as delta-compressed bitfield (0-7 elevation = 3 bits per tile), transmit once per chunk

### Isometric Rendering + Multiple Heights
**Warning:** Painter's algorithm (back-to-front rendering) requires perfect depth sorting, one mistake ruins scene
**Mitigation:** Implement strict layering (render ground layer, then elevation layer 1, then layer 2...) before mixing entities

## Sources

**Isometric Depth Sorting:**
- [Isometric depth sorting - Mazebert](https://mazebert.com/forum/news/isometric-depth-sorting--id775/)
- [Isometric Depth Sorting for Moving Platforms - Envato Tuts+](https://gamedevelopment.tutsplus.com/tutorials/isometric-depth-sorting-for-moving-platforms--cms-30226)
- [Isometric Depth Sorting in O(n) - GameDev.net](https://www.gamedev.net/forums/topic/579515-isometric-depth-sorting-in-on-or-less/)
- [Handling Height in Isometric Tile Maps - Erik Onarheim](https://erikonarheim.com/posts/handling-height-in-isometric/)

**Wall Rendering & Occlusion:**
- [Isometric Tiles Math - Clint Bellanger](https://clintbellanger.net/articles/isometric_math/)
- [Problem with Isometric Stairs - GameDev.net](https://www.gamedev.net/forums/topic/401916-problem-with-isometric-stairs/)
- [Occlusion culling in isometric engine - GameDev.net](https://www.gamedev.net/forums/topic/174754-occlusion-culling-in-a-complex-isometric-engine/)

**Pathfinding with Elevation:**
- [Movement costs for pathfinders - Red Blob Games](http://theory.stanford.edu/~amitp/GameProgramming/MovementCosts.html)
- [Isometric Pathfinding with A* - GitHub](https://github.com/fzillo/Isometric_Pathfinding_with_AStar)
- [A* Pathfinding on Isometric Map - GameDev.net](https://www.gamedev.net/forums/topic/424827-a-pathfinding-on-an-isometric-map/)

**Procedural Elevation:**
- [Procedural elevation - Red Blob Games](https://www.redblobgames.com/x/1725-procedural-elevation/)
- [Adventures in Procedural Terrain Generation - Medium](https://medium.com/@henchman/adventures-in-procedural-terrain-generation-part-1-b64c29e2367a)

**Click Detection & Mouse Picking:**
- [Mouse Picking with Ray Casting - Anton's OpenGL](https://antongerdelan.net/opengl/raycasting.html)
- [Problem with object detection in 2D isometric - Unity](https://discussions.unity.com/t/problem-with-object-detection-using-mouse-click-in-2d-isometric-view/784450)
- [Mouse Maps for Isometric Height Maps - GameDev.net](https://archive.gamedev.net/archive/reference/programming/features/mm4ihm/index.html)

**Tile Systems & Architecture:**
- [Tiles and tilemaps overview - MDN](https://developer.mozilla.org/en-US/docs/Games/Techniques/Tilemaps)
- [Creating a Dynamic Tile System - Game Developer](https://www.gamedeveloper.com/programming/creating-a-dynamic-tile-system)

---
*Pitfalls research for: Isometric Elevation & Structure Integration*
*Researched: 2026-02-16*
