# Feature Research: Isometric Elevation & Structures

**Domain:** Isometric 2D game terrain elevation and structure rendering
**Researched:** 2026-02-16
**Confidence:** MEDIUM

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Side-face rendering for elevated tiles | Visual clarity of height differences | MEDIUM | Requires additional sprites or procedural drawing for vertical faces between elevation levels |
| Depth sorting with height | Objects on higher terrain render above lower terrain | MEDIUM | Existing DepthSorter needs height component in depth calculation |
| Elevation-aware walkability | Players can't walk through height cliffs | LOW | Pathfinding already exists, needs cost function with elevation rules |
| Click detection respects elevation | Clicking elevated terrain selects correct tile | MEDIUM | Mouse picking must account for vertical offset of elevated surfaces |
| Visual elevation transitions | Gradual slopes or stairs between levels | HIGH | Smooth transitions require intermediate tiles (ramps/stairs) or complex sprite work |
| Structure walls block movement | Walls are impassable obstacles | LOW | Binary collision check, extends existing collision map |
| Structure walls block line-of-sight | Walls occlude vision and entities | MEDIUM | Requires occlusion system beyond current depth sorting |
| Height-based occlusion culling | Tall structures hide entities behind them | MEDIUM | Needs alpha fading or visibility detection for structures blocking view |
| Minimap elevation indicators | Map shows height differences or structures | LOW | Color coding or markers on existing minimap system |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valuable.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Dynamic wall transparency | Walls fade when blocking player view | MEDIUM | Creates superior UX compared to static occlusion (Diablo 2 style) |
| Multi-height structures | Structures with variable height per tile | HIGH | Allows complex buildings (e.g., towers, ramps) vs uniform-height only |
| Tile interaction hooks (onClick, onStep, onEnter) | Extensible tile behavior system | MEDIUM | Enables traps, triggers, events without hardcoding tile logic |
| TileDefinition registry pattern | Data-driven tile types with properties | LOW | Separates tile data from rendering, supports easy addition of new tiles |
| Elevation affects gameplay | Height advantage in combat, fall damage | HIGH | Goes beyond visual to mechanical depth (deferred to combat milestone) |
| Procedural side-face generation | Auto-generate cliff faces from elevation data | MEDIUM | Reduces art asset requirements, maintains visual consistency |
| Per-tile elevation granularity | Each tile has independent height (0-5) | LOW | More flexible than zone-level or chunk-level elevation |
| Smart pathfinding with elevation costs | Pathfinding prefers gentle slopes over cliffs | MEDIUM | Weighted A* with elevation penalties, better than binary walkable/blocked |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Arbitrary precision elevation (floats) | "More realistic terrain" | Complicates pathfinding, collision, and rendering depth sorting with minimal visual benefit | Discrete levels (0-5) provide gameplay clarity and simpler implementation |
| Camera rotation for viewing structures | "See behind walls" | Massively increases asset requirements (4-8 directions per sprite), causes player disorientation | Dynamic wall transparency/fading reveals hidden areas without rotation |
| Pixel-perfect isometric click detection | "More accurate selection" | Mouse maps and pixel masks add complexity, poor performance on large maps | Diamond-shaped tile bounds with elevation offset sufficient for 128x64 tiles |
| Separate tilemap layers per elevation | "Easier to manage height" | Multiple Phaser tilemaps create synchronization issues, memory overhead | Single tile grid with elevation property per tile, rendered with depth sorting |
| Real-time shadows cast by structures | "More immersive 3D feel" | Heavy performance cost for 2D game, requires light source calculations | Static drop shadows or simple ambient occlusion baked into sprites |
| Smooth terrain deformation | "Dynamic world changes" | Breaks tile-based pathfinding, requires mesh rendering instead of sprites | Pre-defined elevation transitions (ramps, stairs) as tile types |

## Feature Dependencies

```
TileDefinition Registry
    └──required by──> Elevation System
                          └──required by──> Side-Face Rendering
                          └──required by──> Elevation-Aware Pathfinding
                          └──required by──> Click Detection with Height

TileDefinition Registry
    └──required by──> Structure Walls
                          └──required by──> Wall-Based Occlusion
                          └──required by──> Line-of-Sight Blocking

Depth Sorting with Height
    └──required by──> Height-Based Occlusion
                          └──enhanced by──> Dynamic Wall Transparency

Elevation System ──enhances──> Procedural World Generation
Side-Face Rendering ──enhances──> Visual Elevation Transitions

Multi-Height Structures ──conflicts with──> Simple Wall Collision
    (requires per-tile height tracking vs boolean walkable flag)

Dynamic Wall Transparency ──conflicts with──> Static Occlusion
    (choose one approach, not both)
```

### Dependency Notes

- **TileDefinition Registry required first:** Foundation for all tile-specific behavior (elevation, walls, hooks). Must exist before elevation or structures.
- **Elevation System enables pathfinding:** Movement rules (1-level walkable, 2+ blocked) depend on elevation data being available during pathfinding.
- **Side-face rendering depends on elevation data:** Cannot render cliff faces without knowing which tiles are elevated and by how much.
- **Depth sorting must account for height:** Existing depth calculation uses gridX/gridY only. Height must be factored in: `depth = screenY + gridX * 0.0001 + height * tileHeight`.
- **Click detection needs height offset:** Mouse-to-tile conversion must adjust Y coordinate by `height * tileHeightHalf` to hit elevated tiles correctly.
- **Multi-height structures complicate collision:** Simple boolean walkable map insufficient; need height value per tile to determine if structure blocks at given elevation.
- **Dynamic transparency vs static occlusion:** Diablo 2 uses fade-out, Age of Empires uses fixed occlusion. Choose one approach for consistency.

## MVP Definition

### Launch With (v1.3)

Minimum viable elevation system — what's needed to validate terrain depth.

- [x] **TileDefinition registry** — Foundation for tile properties, supports elevation and structure data
- [x] **Terrain elevation (0-5 discrete levels)** — Core vertical dimension, per-tile granularity
- [x] **Side-face rendering for elevation** — Visual clarity of height differences, procedurally generated or sprite-based
- [x] **Elevation-aware pathfinding** — 1-level diff walkable, 2+ blocks movement
- [x] **Depth sorting with height** — Objects on elevated terrain render correctly
- [x] **Structure walls (boolean blocking)** — Impassable obstacles with uniform height
- [x] **Click detection with elevation** — Mouse picking accounts for height offset
- [x] **World-gen elevation noise** — Procedural terrain generation with elevation data
- [x] **Minimap structure markers** — Walls visible on minimap as distinct markers

### Add After Validation (v1.4)

Features to add once core elevation is working.

- [ ] **Visual elevation transitions (ramps/stairs)** — Trigger: Players confused by cliff walkability without visual cue
- [ ] **Multi-height structures** — Trigger: Need for towers, tiered buildings in world design
- [ ] **Height-based occlusion culling** — Trigger: Structures visually block entities, causing UX confusion
- [ ] **Dynamic wall transparency** — Trigger: Players complain about walls blocking view during gameplay
- [ ] **Tile interaction hooks (onStep, onEnter, onClick)** — Trigger: Need for interactive tiles (traps, doors, triggers)
- [ ] **Smart pathfinding with elevation costs** — Trigger: Pathfinding produces odd routes ignoring terrain difficulty

### Future Consideration (v2+)

Features to defer until core gameplay is validated.

- [ ] **Elevation affects combat mechanics** — Why defer: Combat system not yet implemented (separate milestone)
- [ ] **Fall damage from height differences** — Why defer: Requires health/damage system integration
- [ ] **Procedural side-face texture variation** — Why defer: Visual polish, not functional requirement
- [ ] **Per-structure custom occlusion zones** — Why defer: Complex editor tooling needed
- [ ] **Bridges/overpass tiles** — Why defer: Requires multi-layer tile system (tile above and below)

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| TileDefinition registry | HIGH | LOW | P1 |
| Terrain elevation (0-5) | HIGH | MEDIUM | P1 |
| Side-face rendering | HIGH | MEDIUM | P1 |
| Elevation-aware pathfinding | HIGH | LOW | P1 |
| Depth sorting with height | HIGH | LOW | P1 |
| Structure walls | HIGH | LOW | P1 |
| Click detection with elevation | HIGH | MEDIUM | P1 |
| World-gen elevation | HIGH | MEDIUM | P1 |
| Minimap structure markers | MEDIUM | LOW | P1 |
| Visual transitions (ramps) | MEDIUM | HIGH | P2 |
| Multi-height structures | MEDIUM | HIGH | P2 |
| Height-based occlusion | MEDIUM | MEDIUM | P2 |
| Dynamic wall transparency | LOW | MEDIUM | P2 |
| Tile interaction hooks | HIGH | MEDIUM | P2 |
| Smart elevation pathfinding | LOW | MEDIUM | P3 |
| Elevation gameplay effects | LOW | HIGH | P3 |
| Procedural textures | LOW | MEDIUM | P3 |

**Priority key:**
- P1: Must have for launch (v1.3) — table stakes features
- P2: Should have, add when possible (v1.4) — improves UX
- P3: Nice to have, future consideration (v2+) — polish and depth

## Existing System Integration

### Already Implemented (v1.2)

| System | Current State | Elevation Impact |
|--------|---------------|------------------|
| IsometricTransform | gridToScreen, screenToGrid, calculateDepth | Needs height parameter in calculateDepth |
| DepthSorter | Throttled depth updates, Y-based sorting | Must incorporate height into depth calculation |
| TileRenderer | Renders 128x64 diamond tiles | Needs side-face rendering for elevated tiles |
| ViewportCuller | Diamond-shaped culling bounds | Works as-is, elevation doesn't affect culling |
| ChunkManager | Loads/unloads chunks | Needs elevation data in ChunkData from server |
| PathfindingController | A* pathfinding on grid | Needs elevation-aware cost function |
| HoverController | Tile hover highlights | Works as-is, highlights correct tile at elevation |
| CollisionMap | Boolean walkable/blocked 2D array | Needs elevation data or separate structure map |
| Minimap | Orthogonal top-down view | Needs structure markers rendered on minimap camera |

### Integration Points

- **IsometricTransform.calculateDepth():** Add optional `height` parameter: `calculateDepth(gridX, gridY, height = 0, priorityBoost = 0)`. Formula: `screenY + gridX * 0.0001 + height * ISO_TILE_HEIGHT + priorityBoost`.
- **TileRenderer.renderTile():** Check tile elevation, render side-face sprite/graphic if `elevation > 0`. Side face extends from tile bottom to `elevation * ISO_TILE_HEIGHT / 2` pixels down.
- **ChunkData interface:** Add `elevation: number[][]` (2D array matching tiles array). Server sends elevation data with chunk.
- **PathfindingController cost function:** Check elevation difference between adjacent tiles. Cost = `1` if `abs(heightDiff) <= 1`, cost = `Infinity` if `abs(heightDiff) >= 2`.
- **HoverController screenToTile():** Adjust Y coordinate by elevation: `adjustedY = screenY - (elevation * ISO_TILE_HEIGHT / 2)` before calling `isoTransform.screenToTile()`.
- **MinimapCamera:** Add structure layer rendering. Iterate structure tiles, draw markers at grid positions on minimap camera.

## Competitor Feature Analysis

### Isometric Games Reference

| Feature | Diablo 2 (2000) | Age of Empires II (1999) | Rimworld (2018) | Our Approach |
|---------|-----------------|--------------------------|-----------------|--------------|
| Elevation | Fixed per map zone | Discrete levels (0-7) | Single-level only | Discrete levels (0-5), per-tile |
| Side faces | Pre-rendered sprites | Pre-rendered cliff tiles | N/A (no elevation) | Procedural or sprite-based (TBD in planning) |
| Walkability | Binary (walkable/blocked) | Gradual slopes walkable, cliffs blocked | All tiles walkable | 1-level walkable, 2+ blocked |
| Wall occlusion | Walls fade on approach | Static occlusion | Wall transparency toggle (roof removal) | Dynamic fade (v1.4), static for v1.3 |
| Structure height | Uniform height per structure | Variable height (walls, towers) | Uniform (no elevation) | Uniform (v1.3), variable (v1.4) |
| Pathfinding | Binary walkable check | Elevation-weighted costs | Open terrain only | Binary for v1.3, weighted for v1.4 |
| Click detection | Mouse maps (pixel masks) | Diamond bounds with elevation | Rectangular tiles (no iso) | Diamond bounds + elevation offset |
| Tile system | Hardcoded tile types | Tile definitions with properties | Def-based (XML configs) | TileDefinition registry (TypeScript) |

### Key Takeaways

- **Diablo 2 approach:** Fixed elevation per zone, pre-rendered art. Simple but inflexible. Avoid this — use per-tile elevation.
- **Age of Empires approach:** Discrete levels with transitions, weighted pathfinding. Good model for gradual complexity (binary → weighted).
- **Rimworld approach:** Def-based tile system with properties. Excellent pattern for TileDefinition registry.
- **Occlusion strategies:** Diablo 2 fades walls dynamically, AoE2 uses static occlusion. Start with static (simpler), add dynamic in v1.4.
- **Click detection:** Mouse maps (Diablo 2) overkill for 128x64 tiles. Diamond bounds with elevation offset sufficient.

## Implementation Complexity Assessment

### LOW Complexity (1-3 days)

- TileDefinition registry pattern (interfaces + Map-based lookup)
- Structure walls boolean blocking (extends collision map)
- Depth sorting with height (formula adjustment)
- Minimap structure markers (draw loop on minimap camera)
- Click detection elevation offset (Y-coordinate adjustment)

### MEDIUM Complexity (3-7 days)

- Terrain elevation system (ChunkData update, server/client sync)
- Side-face rendering (sprite or procedural drawing logic)
- Elevation-aware pathfinding (cost function with height check)
- World-gen elevation noise (integrate Perlin noise into generation)
- Height-based occlusion culling (visibility checks, alpha fading)
- Tile interaction hooks (event system architecture)

### HIGH Complexity (7-14 days)

- Visual elevation transitions (ramps/stairs as tile types, sprite work)
- Multi-height structures (per-tile height tracking, rendering complexity)
- Dynamic wall transparency (player proximity detection, smooth fading)
- Smart pathfinding with costs (weighted A* with elevation penalties)
- Procedural side-face generation (texture sampling, dynamic sprite creation)

## Sources

**Isometric Elevation Systems:**
- [Handling Height in Isometric Tile Maps](https://erikonarheim.com/posts/handling-height-in-isometric/)
- [Isometric Tiles Math](https://clintbellanger.net/articles/isometric_math/)

**Pathfinding with Elevation:**
- [GridGraph - A* Pathfinding Project](https://arongranberg.com/astar/documentation/stable/gridgraph.html)
- [A* Pathfinding Project Features](https://arongranberg.com/astar/features)

**Depth Sorting and Occlusion:**
- [Drawing isometric boxes in the correct order](https://shaunlebron.github.io/IsometricBlocks/)
- [Unity - Manual: Sort Sprites with a Custom Sorting Axis](https://docs.unity3d.com/6000.2/Documentation/Manual/tilemaps/work-with-tilemaps/isometric-tilemaps/renderer/sort-sprites-custom-sorting-axis.html)
- [Isometric Depth Sorting](https://mazebert.com/forum/news/isometric-depth-sorting--id775/)

**Wall Occlusion and Transparency:**
- [Isometric Occlusion - Justin D Johnson](https://justindjohnson.com/softdev/isometric-occlusion/)
- [Wall Fade for Isometric, Orthographic Game - Unity Discussions](https://discussions.unity.com/t/wall-fade-for-isometric-orthographic-game/1673205)
- [Replicated Isometric Wall Fading Plugin - UE Marketplace](https://www.unrealengine.com/marketplace/en-US/product/isometric-wall-hiding-and-line-of-sight-plugin)

**Click Detection with Height:**
- [Mouse Maps for Isometric Height Maps - GameDev.net](https://gamedev.net/tutorials/programming/general-and-gameplay-programming/mouse-maps-for-isometric-height-maps-r2026/)
- [How to find tile under cursor in multilevel isometric terrain - Godot Forum](https://forum.godotengine.org/t/solved-how-to-find-tile-under-cursor-in-a-multilevel-2d-isometric-terrain/7893)

**Tile Definition Patterns:**
- [Game Programming Design Patterns - The Factory Pattern](https://www.gamedeveloper.com/programming/game-programming-design-patterns---the-factory-pattern)
- [Type Object · Behavioral Patterns · Game Programming Patterns](https://gameprogrammingpatterns.com/type-object.html)
- [Flyweight · Design Patterns Revisited · Game Programming Patterns](https://gameprogrammingpatterns.com/flyweight.html)

**Event-Driven Tile Interactions:**
- [Event-Driven Architecture in Game Development: Unity & GameMaker](https://medium.com/@ahmadrezakml/event-driven-architecture-in-game-development-unity-gamemaker-c76915361ff0)
- [Event Queue · Decoupling Patterns · Game Programming Patterns](https://gameprogrammingpatterns.com/event-queue.html)

**Common Pitfalls:**
- [What I learned from trying to make an Isometric game in Unity](https://www.gamedeveloper.com/programming/what-i-learned-from-trying-to-make-an-isometric-game-in-unity)
- [Pikuma: Isometric Projection in Game Development](https://pikuma.com/blog/isometric-projection-in-games)

---
*Feature research for: Isometric elevation & structure systems*
*Researched: 2026-02-16*
*Confidence: MEDIUM — based on established isometric game patterns, official docs, and existing codebase analysis*
