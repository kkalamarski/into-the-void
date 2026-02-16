# Project Research Summary

**Project:** Isometric Elevation & Structures Milestone
**Domain:** Isometric 2D game terrain elevation and structure rendering
**Researched:** 2026-02-16
**Confidence:** HIGH

## Executive Summary

This research covers adding terrain elevation (height levels 0-5), side-face rendering, and structure walls to an existing Phaser 3.90.0 isometric multiplayer game. The key finding is that no new external dependencies are required - Phaser's native IsoBox and IsoTriangle geometry provides everything needed for side-face rendering. The recommended approach is to extend the existing tile system with elevation metadata through a TileDefinition registry pattern, enhance depth sorting to include vertical offset, and use Phaser's native isometric geometry for elevated tile faces.

The critical architecture insight is to avoid treating elevation as a separate system. Instead, elevation should be: (1) stored as parallel data alongside tiles in ChunkData (heights[][] array), (2) integrated into existing depth calculation as an additional parameter, and (3) rendered using the existing TileRenderer extended with ElevationRenderer composition. The existing systems (IsometricTransform, DepthSorter, TileRenderer, PathfindingController) remain largely intact with targeted extensions rather than wholesale replacements.

The primary risk is depth sorting breakdown when objects span multiple height levels. Simple Y-based sorting becomes non-transitive, causing flickering z-fighting artifacts. This is mitigated by immediately implementing composite depth calculation (screenY + elevation * elevationWeight + gridX * tiebreaker) before any visual rendering begins. Secondary risks include pathfinding treating all elevation changes as equal cost (players moonwalking up cliffs), side-face rendering explosion (6x draw calls), and ChunkData schema inadequacy forcing painful migrations later.

## Key Findings

### Recommended Stack

The existing stack is sufficient - no new packages needed. Phaser 3.90.0 includes native IsoBox/IsoTriangle for side-face rendering (added in Phaser 3.50, stable in current version). TypeScript 5.4.0 supports the type registry pattern for tile definitions. The main additions are architectural components, not external dependencies.

**Core technologies:**
- **Phaser 3.90.0** (current): Game engine with native isometric geometry - IsoBox provides three-face rendering without plugins or custom polygon math
- **TypeScript 5.4.0** (current): Type-safe tile definitions - Type registry pattern scales well with metadata additions
- **TileDefinition Registry** (new component): Centralized tile metadata with elevation + rendering hooks - TypeScript interface extension following existing EntityRegistry pattern
- **Elevation-Aware Depth Sorter** (enhancement): Depth calculation including vertical offset - Extend existing calculateDepth() to include elevation parameter
- **Side Face Renderer** (new component): Render vertical tile faces using IsoBox - New TileSideFaceRenderer class using Phaser's native geometry

**Critical constraint:** Focus only on elevation extensions, not rebuilding isometric basics. The project already has validated IsometricTransform (grid-to-screen), DepthSorter (throttled updates), and TileRenderer (diamond tiles) that work correctly.

### Expected Features

**Must have (table stakes):**
- **TileDefinition registry** - Foundation for tile properties, supports elevation and structure data
- **Terrain elevation (0-5 discrete levels)** - Core vertical dimension, per-tile granularity
- **Side-face rendering for elevation** - Visual clarity of height differences, procedurally generated
- **Elevation-aware pathfinding** - 1-level difference walkable, 2+ blocks movement
- **Depth sorting with height** - Objects on elevated terrain render correctly above/below
- **Structure walls (boolean blocking)** - Impassable obstacles with uniform height
- **Click detection with elevation** - Mouse picking accounts for height offset
- **World-gen elevation noise** - Procedural terrain generation with elevation data
- **Minimap structure markers** - Walls visible on minimap as distinct markers

**Should have (competitive):**
- **Visual elevation transitions (ramps/stairs)** - Gradual slopes or stairs between levels (trigger: players confused by cliff walkability)
- **Multi-height structures** - Structures with variable height per tile (trigger: need for towers, tiered buildings)
- **Height-based occlusion culling** - Tall structures hide entities behind them
- **Dynamic wall transparency** - Walls fade when blocking player view (Diablo 2 style)
- **Tile interaction hooks** (onClick, onStep, onEnter) - Extensible tile behavior system
- **Smart pathfinding with elevation costs** - Weighted A* prefers gentle slopes over cliffs

**Defer (v2+):**
- **Elevation affects combat mechanics** - Height advantage in combat (requires combat system implementation)
- **Fall damage from height differences** - Requires health/damage system integration
- **Procedural side-face texture variation** - Visual polish, not functional requirement
- **Bridges/overpass tiles** - Requires multi-layer tile system (tile above and below)

### Architecture Approach

The integration strategy minimizes disruption to existing systems while adding elevation capabilities. Store height as separate 2D array parallel to tiles[][] (not embedded in tile definition), allowing any tile type at any height. Use TileDefinition registry as static object with type-safe lookups, following the existing EntityRegistry pattern. Extend rendering with composition - TileRenderer calls new ElevationRenderer for elevated tiles rather than replacing the rendering pipeline.

**Major components:**

1. **TileDefinition Registry** (packages/shared-types/src/game/tile-registry.ts) - Static tile definitions with elevation metadata, walkability, speed modifiers, and optional rendering hooks. Registry pattern like EntityRegistry, type-safe lookups by TileId.

2. **ChunkData Extension** (packages/shared-types/src/core/zone.ts) - Add heights[][] (parallel to tiles[][]) and structures[] array. Elevation stored separately from tile type to avoid combinatorial explosion (16 tiles × 6 heights = 96 definitions).

3. **ElevationRenderer** (apps/web/src/game/rendering/ElevationRenderer.ts) - New component for side wall rendering using Phaser IsoBox. Calculates screen offset based on height levels (height × PIXELS_PER_LEVEL), renders top face at elevated position, adds south/east wall faces if elevated.

4. **PathfindingController Enhancement** (packages/game-logic/src/movement/pathfinding.ts) - Modified A* cost function includes elevation penalty (base cost 1.0 + elevationDelta × 0.5). Prefers flat routes over climbing.

5. **StructureGenerator** (packages/world-gen/src/generation/structure.ts) - New world-gen component for wall/structure placement using structural noise. Sets height data for wall tiles based on biome rules.

**Data flow:** Server WorldGenerator → generateTerrain() produces tiles[][] + heights[][] → ChunkData serialized → Client ChunkManager → WorldScene renders via TileRenderer → ElevationRenderer for elevated tiles → depth includes elevation offset.

### Critical Pitfalls

1. **Depth Sorting Algorithm Breakdown** - Simple Y-based sorting becomes non-transitive with multi-height objects, causing flickering z-fighting. Prevention: Switch to composite depth calculation (screenY + elevation × elevationWeight + gridX × 0.0001) immediately, before any visual rendering. Use elevation weight of 10000 to separate layers.

2. **Pathfinding Treats All Elevation as Equal Cost** - Existing A* uses Manhattan distance and uniform cost=1. Players will moonwalk up cliffs or get stuck at impassable heights. Prevention: Expand collision map to include elevation data, add elevation-aware cost function (base + elevationDiff × penalty), set MAX_STEP_HEIGHT to reject impossible climbs.

3. **ChunkData Structure Assumes Flat Tiles** - Current tiles[][] and collisions[][] cannot represent multi-level terrain. Adding elevation retroactively forces painful schema migration. Prevention: Refactor ChunkData NOW to include heights[][] parallel array before any elevation work begins. Version the schema for future migrations.

4. **Side-Face Rendering Explosion** - Each elevated tile needs up to 6 faces rendered (top + 4 sides + bottom). 64×64 zone with average elevation=2 creates 24,576 sprites vs current 4,096. FPS tanks. Prevention: Mesh side faces together into single sprite per chunk, implement visibility culling per face (only render south/east faces, check if neighbor is taller and occludes), use texture atlas for batching.

5. **Click Detection Breaks with Elevated Terrain** - Current screenToTile assumes flat plane. Clicking wall tops selects wrong tile behind the wall. Prevention: Add elevation-aware screenToTile that adjusts Y coordinate by elevation offset, or use ray-casting approach projecting 3D ray through camera to intersect all elevation levels.

## Implications for Roadmap

Based on research, suggested phase structure follows strict dependency chain: foundation (no visual changes) → data layer complete → rendering complete → movement integrated.

### Phase 1: Tile Definition Architecture
**Rationale:** TileDefinition registry is required by all other systems. ChunkData schema changes must happen before any elevation work to avoid painful migrations. This phase establishes the foundation with zero visual changes - existing game continues working while types evolve.

**Delivers:**
- TileDefinition registry interface with basic definitions (migrate existing 16 tiles)
- ChunkData extended with heights[][] and structures[] fields
- generateTerrain() modified to output new fields (all zeros initially)
- Network layer verification (serialize/deserialize validation)

**Addresses:**
- Prevents "ChunkData structure assumes flat tiles" pitfall by refactoring schema upfront
- Enables TileDefinition registry pattern from FEATURES.md (table stakes)
- Sets up type-safe tile metadata system from STACK.md

**Avoids:**
- Schema migration pain later (HIGH recovery cost pitfall)
- Combinatorial explosion of tile variants (FLOOR_E0, FLOOR_E1...)
- Data desync between elevation and tile data

**Dependencies:** None - this is the foundation phase

### Phase 2: Elevation System Core
**Rationale:** With data structures in place, generate real elevation data and wire it through the system. This phase makes elevation data flow from server to client before any visual rendering. Composite depth calculation must be implemented here to prevent depth sorting breakdown.

**Delivers:**
- Elevation noise layer in terrain generation (uses biome elevation as base + terrain detail)
- StructureGenerator for simple wall placement
- Collision map generation includes structures
- IsometricTransform.heightToScreenY() method
- Enhanced calculateDepth() with elevation parameter
- Server sends real height data to client

**Uses:**
- TileDefinition registry for default elevation values
- Phaser 3.90.0 calculateDepth() extension (from STACK.md)
- Multi-octave noise approach (biome base + terrain detail) to avoid biome/elevation mismatch

**Implements:**
- Elevation as separate data layer (heights[][] parallel to tiles[][])
- Composite depth calculation to prevent z-fighting
- Elevation-aware depth sorting

**Avoids:**
- "Depth sorting breakdown" pitfall by implementing composite depth immediately
- "Elevation noise mismatch" pitfall by reconciling biome/terrain noise layers
- "Depth sorting throttle issues" by adapting throttle for elevation changes

**Dependencies:** Phase 1 complete (ChunkData schema + TileDefinition registry exist)

### Phase 3: Elevation Rendering
**Rationale:** Data flows correctly, now make it visible. ElevationRenderer implements side-face rendering with visibility culling from the start to prevent rendering explosion. This phase makes terrain elevation appear visually.

**Delivers:**
- ElevationRenderer component with side wall rendering
- TileRenderer integration (composition pattern - TileRenderer calls ElevationRenderer)
- Side-face visibility culling (only render south/east faces, check neighbor occlusion)
- DepthSorter includes elevation in depth calculation
- Visual elevation appears in game

**Addresses:**
- Side-face rendering for elevation (table stakes from FEATURES.md)
- Prevents "side-face rendering explosion" by implementing culling immediately
- Visual clarity of height differences (table stakes)

**Avoids:**
- Rendering all 6 faces always (5-10x performance hit)
- ViewportCuller missing tall structures (expand bounds by max height)

**Dependencies:** Phase 2 complete (elevation data flowing, depth calculation correct)

### Phase 4: Structure Walls & Pathfinding
**Rationale:** With elevation rendering working, add gameplay integration. Pathfinding must respect elevation changes, and structure walls need proper collision handling. This phase makes elevation affect player movement.

**Delivers:**
- PathfindingController passes heightMap to findPath()
- A* modified for elevation cost (base + elevationDiff × penalty)
- MovementController validation checks height (prevent climbing 3+ levels)
- Structure wall collision integration
- Click detection with elevation offset
- Minimap structure markers

**Addresses:**
- Elevation-aware pathfinding (table stakes from FEATURES.md)
- Structure walls block movement (table stakes)
- Click detection with elevation (table stakes)
- Prevents "pathfinding treats elevation as flat" pitfall

**Avoids:**
- Moonwalking up cliffs (impossible elevation changes)
- Click detection broken on elevated terrain
- Server/client desync on movement validation

**Dependencies:** Phase 3 complete (rendering works, elevation visible)

### Phase Ordering Rationale

- **Foundation first:** TileDefinition registry and ChunkData schema must exist before any elevation work. Schema changes later are painful (1-2 week recovery cost).
- **Data before rendering:** Generate and flow elevation data through system before making it visible. Prevents implementing rendering twice when data structure changes.
- **Depth calculation immediate:** Composite depth including elevation must be implemented before any multi-level rendering to prevent z-fighting. Non-negotiable.
- **Rendering before gameplay:** Visual elevation must work correctly before pathfinding integration. Debugging pathfinding issues is impossible if you can't see terrain height.
- **Culling from start:** Side-face visibility culling implemented in Phase 3 prevents performance crisis. Retrofitting culling after explosion is harder than doing it correctly initially.

### Research Flags

**Phases with standard patterns (skip research-phase):**
- **Phase 1:** TileDefinition registry follows existing EntityRegistry pattern, ChunkData extension is straightforward interface addition
- **Phase 2:** Depth calculation enhancement is well-documented isometric technique, noise generation follows existing BiomeGenerator pattern
- **Phase 3:** Phaser IsoBox rendering is standard library feature with official documentation
- **Phase 4:** A* pathfinding with elevation cost is established pathfinding pattern, click detection adjustment is documented isometric technique

**All phases use standard patterns.** Research has identified clear implementation approaches with proven examples. No phases require additional research during planning.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Phaser 3.90.0 capabilities verified via official docs, IsoBox/IsoTriangle confirmed in release notes and API documentation. Existing codebase reviewed (IsometricTransform, DepthSorter verified). No new external dependencies required. |
| Features | MEDIUM | Table stakes features validated against established isometric games (Diablo 2, Age of Empires II, Rimworld). MVP definition clearly scoped. Some differentiator features (dynamic transparency, multi-height structures) have less documentation but are deferreable to v1.4+. |
| Architecture | HIGH | Direct codebase analysis of existing components completed. Integration points identified with specific file locations. Data flow patterns proven in existing world-gen system. Composition approach (ElevationRenderer called by TileRenderer) maintains existing architecture. |
| Pitfalls | HIGH | Depth sorting breakdown is well-documented isometric pitfall with proven solutions. Pathfinding elevation issues validated through pathfinding literature. ChunkData schema risks identified from existing system analysis. Performance traps backed by rendering profiling guidelines. |

**Overall confidence:** HIGH

Research is comprehensive with verified sources. Phaser capabilities confirmed through official documentation. Architecture approach maintains existing patterns rather than introducing risk through complete rewrites. Pitfalls identified early with clear prevention strategies.

### Gaps to Address

- **Side-face texture approach:** Research identifies procedural Graphics rendering (current system) vs sprite-based textures but doesn't choose. Recommendation: Start with Graphics extension (incremental to existing system), migrate to sprites only if profiling shows bottleneck during Phase 4.

- **Elevation-to-biome constraints:** Research mentions constraining elevation per biome (e.g., craters = 0-2, ruins = 0-5) but doesn't specify exact ranges. Resolution: Define during Phase 2 planning based on existing biome definitions in BiomeGenerator.

- **MAX_STEP_HEIGHT value:** Research suggests "1-level difference walkable, 2+ blocks" but doesn't validate gameplay feel. Resolution: Implement 1-level maximum initially, make tunable parameter for playtesting adjustment.

- **Minimap marker visual design:** Research confirms markers needed but not visual treatment. Resolution: Start with simple colored squares (walls = distinct color), iterate based on readability during Phase 4.

These gaps are minor and resolvable during phase planning - they don't block architecture decisions or require additional research.

## Sources

### Primary (HIGH confidence)
- [Phaser Releases](https://github.com/phaserjs/phaser/releases) - v3.90.0 confirmed as latest stable (May 2025), IsoBox/IsoTriangle API verified
- [IsoTriangle API Documentation](https://docs.phaser.io/api-documentation/class/gameobjects-isotriangle) - Face control and rendering properties confirmed
- [IsoBox API Documentation](https://newdocs.phaser.io/docs/3.55.2/focus/Phaser.GameObjects.GameObjectFactory-isobox) - Isometric box geometry for side faces validated
- Existing codebase analysis: IsometricTransform (gridToScreen, calculateDepth), DepthSorter (throttled updates), TileRenderer (diamond rendering), package.json (Phaser 3.90.0 verified)

### Secondary (MEDIUM confidence)
- [Handling Height in Isometric Tile Maps - Erik Onarheim](https://erikonarheim.com/posts/handling-height-in-isometric/) - Elevation-based z-index sorting, depth calculation formulas
- [Isometric Tiles Math - Clint Bellanger](https://clintbellanger.net/articles/isometric_math/) - Grid-to-screen conversion with height offset
- [Red Blob Games: Making maps with noise](https://www.redblobgames.com/maps/terrain-from-noise/) - Multi-octave noise for procedural elevation
- [Movement costs for pathfinders - Red Blob Games](http://theory.stanford.edu/~amitp/GameProgramming/MovementCosts.html) - A* elevation cost calculation
- [Design Patterns in TypeScript - Refactoring Guru](https://refactoring.guru/design-patterns/typescript) - Factory and registry patterns
- [Type Object - Game Programming Patterns](https://gameprogrammingpatterns.com/type-object.html) - TileDefinition registry pattern

### Tertiary (LOW confidence, needs validation)
- [GameDev.net: Isometric Depth Sorting in O(n)](https://www.gamedev.net/forums/topic/579515-isometric-depth-sorting-in-on-or-less/) - Topological sorting for overlapping structures (deferred to v2+)
- [Occlusion culling in isometric engine - GameDev.net](https://www.gamedev.net/forums/topic/174754-occlusion-culling-in-a-complex-isometric-engine/) - Advanced occlusion techniques (not needed for MVP)

---
*Research completed: 2026-02-16*
*Ready for roadmap: yes*
