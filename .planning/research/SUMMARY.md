# Project Research Summary

**Project:** Into the Void v1.2 - Isometric View Transformation
**Domain:** Isometric rendering for multiplayer 2D MMO with Phaser 3
**Researched:** 2026-02-16
**Confidence:** HIGH

## Executive Summary

Adding isometric projection to an existing top-down multiplayer game requires a strict separation between coordinate spaces. Research confirms that the isometric transformation should be purely presentational - game logic stays in cartesian (grid) coordinates, with screen coordinates calculated only at render time. Native Phaser 3 capabilities (built-in since v3.50.0) are sufficient; the unmaintained phaser3-plugin-isometric should be avoided. The core transformation math is simple (20-30 lines), but integration requires careful attention to coordinate space boundaries to prevent common pitfalls like click detection misalignment, depth sorting instability, and multiplayer position desync.

The recommended approach uses a transform layer pattern: create a centralized CoordinateTransform utility that handles all bidirectional conversions between grid and screen space. All rendering components (TileRenderer, EntityRenderer, ViewportCuller) use this utility for positioning and depth calculations. Game logic, server communication, pathfinding, and collision detection remain completely unchanged - they continue using grid coordinates. This pattern allows toggling between orthographic and isometric views by swapping transform implementations and provides clear debugging boundaries.

The critical risk is coordinate space confusion, which manifests as "looks done but isn't" problems - visually correct rendering but broken click detection, pathfinding that produces strange paths, or multiplayer position drift. Prevention requires disciplined architecture: never mix coordinate systems, always transform at render boundaries, and validate coordinate conversions at multiple zoom levels and map edges. The second major risk is depth sorting instability causing sprite flickering, mitigated by using Phaser's Layer-based automatic depth sorting with throttled updates and proper depth value calculations.

## Key Findings

### Recommended Stack

Native Phaser 3 with custom coordinate utilities is the clear choice for isometric transformation. The phaser3-plugin-isometric is unmaintained (last updated 2018), predates Phaser's built-in isometric features, and adds unnecessary complexity for simple coordinate math. Phaser 3.50.0+ (released 2020) includes native isometric tilemap support and depth sorting APIs that handle all required functionality.

**Core technologies:**
- **Phaser 3.90.0** (upgrade from 3.80.0): Game engine with native isometric support - Latest stable with built-in tilemap isometric orientation and depth sorting
- **Custom coordinate utilities**: Cartesian to/from isometric transforms - 20-30 LOC of simple math provides full control without dependencies
- **Phaser Layer API**: Automatic depth sorting - Built-in `Layer.depthSort()` optimized for frequent re-sorting of moving objects
- **Native `setDepth()` method**: Z-ordering - Uses formula `depth = (gridX + gridY) * 1000 + gridY` for correct isometric layering

**No additional dependencies required.** The transformation math is straightforward (diamond projection with 2:1 aspect ratio), and all required rendering APIs exist in Phaser core.

### Expected Features

Isometric view transformation delivers the table stakes features needed for visual coherence and interactivity, with some polish features deferred to later phases. The MVP focuses on correct coordinate transformation, proper depth sorting, and restoring click-to-move functionality in isometric space.

**Must have (table stakes):**
- **Correct depth sorting** - Y-position based z-index so entities layer properly; without this, sprites flicker and appear in wrong order
- **Diamond tile coordinate transformation** - Players expect isometric diamond grid; screen-to-grid and grid-to-screen conversions with 2:1 ratio
- **Accurate mouse/click detection** - Click-to-move must work on diamond tiles; inverse transform from screen to grid coordinates
- **Proper tile rendering order** - Back-to-front row ordering prevents visual glitches
- **Entity positioning on tiles** - Entities aligned to isometric grid with health bars staying positioned correctly
- **Minimap representation** - Keep orthogonal (easier to read) or transform to isometric (consistent with main view)

**Should have (competitive):**
- **Highlight/outline on hover** - Improves UX for tile/entity selection in dense isometric scenes; screen-space outlines preferred
- **Smooth camera panning** - Edge pan or middle-click drag expected in modern isometric games
- **Viewport culling optimization** - Diamond-shaped culling bounds to avoid rendering off-screen tiles

**Defer (v2+):**
- **Zoom levels (2-3 discrete)** - Tactical overview vs detail view; requires viewport culling recalculation per zoom
- **Dynamic shadows** - Visual polish after core mechanics proven; simple circular shadow sprites sufficient initially
- **Visual depth cues (elevation)** - Stacked tiles for height; needs design decisions about world structure
- **Camera rotation** - Explicitly avoided (anti-feature); massively increases asset requirements and causes disorientation

### Architecture Approach

The transform layer separation pattern is the industry-standard architecture for isometric games. All coordinate transformations flow through a single `CoordinateTransform` utility, creating a clear boundary between world space (game logic) and screen space (rendering). The pattern uses Phaser's Layer API for automatic depth sorting rather than manual Container sorting, providing better performance for frequent re-sorting of moving entities.

**Major components:**
1. **CoordinateTransform utility** - Centralized singleton for bidirectional grid-to-screen conversions and depth calculations; keeps transformation logic in one place, prevents scattered coordinate math
2. **Layer-based Y-sort system** - Single Phaser Layer containing all world objects (tiles + entities); built-in `depthSort()` method handles automatic z-ordering
3. **DepthManager system** - Orchestrates when depth sorting occurs; uses dirty flags and throttling (every 50ms) to optimize performance
4. **Modified rendering components** - TileRenderer, EntityRenderer, ViewportCuller use CoordinateTransform for positioning; game logic (MovementController, PathfindingController) remains unchanged
5. **Diamond-shaped viewport culling** - Transforms camera rectangle corners to grid space to calculate visible tile bounds; prevents rendering off-screen tiles while avoiding pop-in

**Data flow:** Server sends grid coordinates → Client logic operates in grid space → Rendering layer applies transform → Sprites positioned at screen coordinates with depth values → Layer sorts by depth → Display. Input flow reverses: Mouse click at screen position → Transform to grid coordinates → Pathfinding/movement in grid space → Server validates in grid space.

### Critical Pitfalls

Research identified eight major pitfalls, with three requiring immediate attention in phase planning.

1. **Depth sorting instability (flickering sprites)** - Simple Y-based sorting breaks with overlapping entities of different sizes; use Phaser Layer with cached depth values and dirty flags; address in Phase 1 (Core Transformation) or compounds through all features
2. **Click detection coordinate space confusion** - Mixing screen/grid coordinates causes click-to-move to target wrong tiles; maintain strict separation with transform utilities; address in Phase 1 or interaction features will be fundamentally broken
3. **Viewport culling using wrong bounds** - Rectangular culling for diamond viewport renders 40% more tiles or causes pop-in; recalculate bounds for isometric projection; address in Phase 2 (Optimization) after core rendering works
4. **Multiplayer position synchronization mismatch** - Tweening screen coordinates instead of world coordinates causes rubber-banding; keep all logic in grid space, transform only for rendering; address in Phase 3 (Multiplayer Integration)
5. **Minimap coordinate misalignment** - Different projection between minimap/main view causes position drift; decide orthogonal vs isometric and apply consistently; address in Phase 4 (UI Integration)

## Implications for Roadmap

Based on research dependencies and risk mitigation, the isometric transformation should follow a five-phase structure. The ordering prioritizes establishing correct coordinate transformation and depth sorting early (Phase 1), optimizing performance once core mechanics work (Phase 2), and integrating with multiplayer/UI systems after the rendering pipeline is proven (Phase 3-4).

### Phase 1: Core Isometric Transformation
**Rationale:** Foundation phase - coordinate transformation and depth sorting must be correct before any other isometric features. These are the load-bearing architectural decisions that all subsequent work depends on. Getting coordinate spaces wrong here creates compounding technical debt.

**Delivers:**
- CoordinateTransform utility with toScreen/toGrid/getDepthValue methods
- Modified TileRenderer and EntityRenderer using isometric positioning
- Layer-based depth sorting replacing Container approach
- Unit tests verifying transform accuracy (toScreen → toGrid returns original values)

**Addresses features:**
- Diamond tile coordinate transformation (table stakes)
- Correct depth sorting (table stakes)
- Entity positioning on tiles (table stakes)

**Avoids pitfalls:**
- Depth sorting instability - Implements Layer + depth calculation from start
- Click detection coordinate confusion - Establishes transform boundaries early
- Pathfinding heuristic breaks - Keeps pathfinding in grid space, only rendering transforms

**Research flag:** Standard patterns, skip research-phase. Transformation math well-documented in Phaser examples and isometric resources.

### Phase 2: Rendering Optimization & Interaction
**Rationale:** After core transformation works visually, optimize rendering performance and restore interactive features. Viewport culling critical for performance with large maps. Click-to-move must work in isometric space or game is unplayable.

**Delivers:**
- Diamond-shaped viewport culling bounds
- Mouse click detection with inverse coordinate transform
- Restored click-to-move pathfinding
- Camera follow offset tuning for isometric centering
- DepthManager with dirty flags and throttling

**Addresses features:**
- Accurate mouse/click detection (table stakes)
- Proper tile rendering order (table stakes)
- Viewport culling optimization (should-have)
- Smooth camera panning (should-have)

**Avoids pitfalls:**
- Viewport culling wrong bounds - Calculates diamond culling from start
- Camera follow offset incorrect - Tunes screen-space offset for diamond grid

**Research flag:** Standard patterns, skip research-phase. Culling and click detection documented in Phaser/isometric resources.

### Phase 3: Multiplayer Integration
**Rationale:** After rendering and interaction work locally, validate that coordinate transformation survives multiplayer synchronization. Tweened movement, server reconciliation, and remote player positioning must use grid coordinates to avoid desync.

**Delivers:**
- Audit of movement tweens to use world-space coordinates
- Verification that server sends grid coordinates only
- Testing with network latency (100ms+) to expose position drift
- Remote player rendering using same transform as local player

**Addresses features:**
- Entity positioning consistency across clients
- Movement animation correctness for remote players

**Avoids pitfalls:**
- Multiplayer position synchronization mismatch - Ensures tweens use grid space
- Different draw order between client and server - Standardizes depth calculation

**Research flag:** Standard patterns, skip research-phase. Multiplayer coordinate synchronization is well-understood pattern.

### Phase 4: UI Integration
**Rationale:** After core game rendering and multiplayer work, integrate isometric view with existing UI systems (minimap, HUD). Minimap requires design decision (orthogonal vs isometric) and consistent coordinate handling.

**Delivers:**
- Minimap projection decision (recommend orthogonal for readability)
- Minimap click-to-move using correct coordinate space
- Health bar Y-offset adjustment for isometric sprite heights
- Behavior icon positioning verification

**Addresses features:**
- Minimap representation (table stakes)
- Health bars above entities (table stakes)

**Avoids pitfalls:**
- Minimap coordinate misalignment - Establishes consistent projection early

**Research flag:** Standard patterns, skip research-phase. Minimap coordinate handling straightforward.

### Phase 5: Polish & Advanced Features
**Rationale:** After all core functionality works, add polish features that enhance visual quality and UX. These are lower priority but improve perceived quality significantly.

**Delivers:**
- Hover highlighting with screen-space outlines
- Tile edge anti-aliasing
- Visual feedback for click targets
- Optional: Dynamic shadows using circular shadow sprites
- Optional: Zoom levels (requires viewport culling recalculation)

**Addresses features:**
- Highlight/outline on hover (should-have)
- Tile edge anti-aliasing (should-have)
- Dynamic shadows (deferred from v2+)
- Zoom levels (deferred from v2+)

**Avoids pitfalls:**
- No visual feedback for click targets - Adds hover highlights

**Research flag:** Skip research-phase for hover/highlighting (standard patterns). If implementing zoom levels, may need research-phase for viewport culling recalculation strategies.

### Phase Ordering Rationale

- **Phase 1 before all others:** Coordinate transformation is foundational. Getting grid-to-screen conversion wrong creates cascading bugs in click detection, pathfinding, multiplayer sync. Depth sorting must work early or will cause constant rework.

- **Phase 2 before Phase 3:** Optimization and interaction must work locally before testing with multiplayer latency. Culling performance and click detection are local concerns that don't involve network.

- **Phase 3 before Phase 4:** Multiplayer synchronization more critical than UI polish. Remote player positions affect gameplay; minimap projection is UX concern. Validate network-facing features before cosmetic features.

- **Phase 5 last:** Polish features depend on all core systems working. Hover highlights need click detection (Phase 2), shadows need depth sorting (Phase 1), zoom needs culling (Phase 2).

### Research Flags

**Phases with standard patterns (skip research-phase):**
- **Phase 1 (Core Transformation):** Coordinate math and depth sorting well-documented in Phaser examples and isometric game dev resources
- **Phase 2 (Rendering Optimization):** Viewport culling and click detection have established patterns
- **Phase 3 (Multiplayer Integration):** Network synchronization patterns well-understood for grid-based games
- **Phase 4 (UI Integration):** Minimap coordinate handling straightforward given transform layer

**Phases potentially needing research:**
- **Phase 5 (Polish):** Only if implementing zoom levels - may need research into dynamic viewport culling strategies for multiple zoom levels

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Phaser 3.90.0 verified as latest stable, native isometric support confirmed in v3.50.0+, plugin maintenance status verified on npm/GitHub |
| Features | HIGH | Table stakes features validated against recent isometric MMO examples (Dreadmyst 2026), coordinate transformation requirements from authoritative sources (Clint Bellanger) |
| Architecture | HIGH | Transform layer pattern used across Unity/Godot/Phaser implementations, Phaser Layer API well-documented for depth sorting, official examples demonstrate patterns |
| Pitfalls | MEDIUM | Critical pitfalls (depth sorting, coordinate confusion) verified in multiple community sources, but some edge cases (multi-tile entities, platform-specific quirks) may emerge during implementation |

**Overall confidence:** HIGH

Research draws from official Phaser documentation, authoritative isometric game development resources (Clint Bellanger, Red Blob Games), and verified community implementations. The core technology decisions (native Phaser, no plugin) are well-supported. The transform layer pattern is industry-standard with proven examples.

### Gaps to Address

Research identified areas needing validation during implementation:

- **Performance of per-frame depth sorting:** Not measured for this specific codebase. May need optimization if entity count exceeds 200+ visible entities. Mitigation: Implement dirty flags and throttling from start, profile during Phase 2.

- **Phaser 3.80 to 3.90 breaking changes:** Assumed minimal based on Phaser's compatibility history, but should verify during Phase 1 upgrade. Mitigation: Review Phaser 3.81-3.90 changelogs before upgrading.

- **Minimap projection decision:** Research shows no consensus - some games keep orthogonal, others match main view. Player preference varies. Mitigation: Make design decision in Phase 4, implement toggle for testing if unclear.

- **Click detection with multi-tile entities:** Diamond shape means overlapping hit areas. Research covers single-tile entities but not large objects like buildings. Mitigation: Test with placeholder large sprites in Phase 2, adjust hit detection as needed.

- **Camera bounds mapping:** How isometric camera bounds map to cartesian world bounds not fully validated. Mitigation: Test camera follow at zone edges and during zone transitions in Phase 2.

- **Zoom level viewport culling:** Research indicates culling bounds must recalculate per zoom, but specific implementation strategy not validated. Mitigation: If implementing zoom in Phase 5, prototype culling approach first.

## Sources

### Primary Sources (HIGH confidence)

**Phaser Native Support:**
- [Phaser 3.50.0 Release Notes](https://phaser.io/news/2020/12/phaser-350-released) - Native isometric tilemap support announcement
- [Phaser Examples - Isometric Blocks](https://phaser.io/examples/v3.85.0/depth-sorting/view/isometric-blocks) - Official depth sorting pattern
- [Phaser Examples - Create Isometric Manually](https://phaser.io/examples/v3.85.0/tilemap/isometric/view/create-isometric-manually) - Tilemap creation
- [Phaser 3 Layer Documentation](https://docs.phaser.io/api-documentation/class/gameobjects-layer) - Official Layer API reference

**Coordinate Transformation:**
- [Clint Bellanger: Isometric Tiles Math](https://clintbellanger.net/articles/isometric_math/) - Authoritative transformation formulas
- [2D Engine: Isometric Graphics Tutorial](https://2dengine.com/doc/isometric.html) - Comprehensive isometric techniques

**Depth Sorting:**
- [Drawing Isometric Boxes in Correct Order](https://shaunlebron.github.io/IsometricBlocks/) - Topological sorting visualization
- [Phaser Examples - Isometric Map](https://phaser.io/examples/v3.85.0/depth-sorting/view/isometric-map) - Official depth sorting example

### Secondary Sources (MEDIUM confidence)

**Architecture Patterns:**
- [Pikuma: Isometric Projection in Games](https://pikuma.com/blog/isometric-projection-in-games) - Core projection formulas and patterns
- [Creating an Isometric View in Phaser 3](https://tnodes.medium.com/creating-an-isometric-view-in-phaser-3-fada95927835) - Practical implementation
- [Rex Rainbow: Layer vs Container](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/layer/) - Performance comparison

**Feature Expectations:**
- [MMORPG.GG: Best Isometric MMOs 2025](https://mmorpg.gg/best-isometric-mmos/) - Survey of current features
- [Dreadmyst Isometric MMORPG Launch](https://massivelyop.com/2026/01/12/isometric-mmorpg-dreadmyst-reaches-over-7k-concurrency-and-mostly-positive-reviews-despite-server-issues/) - 2026 player expectations

**Pitfalls:**
- [Isometric Depth Sorting - Mazebert Forum](https://mazebert.com/forum/news/isometric-depth-sorting--id775/) - Performance considerations
- [Cheating at Z-Depth Sprite Sorting](https://blog.pocketcitygame.com/cheating-at-z-depth-sprite-sorting-in-an-isometric-game/) - Optimization techniques
- [Frustum Culling Optimization for Isometric RTS](https://80.lv/articles/optimizing-isometric-rts-performance-with-frustum-culling) - Viewport culling strategies

### Tertiary Sources (LOW confidence - needs validation)

**Plugin Comparison:**
- [phaser3-plugin-isometric GitHub](https://github.com/sebashwa/phaser3-plugin-isometric) - Unmaintained plugin for reference
- [Snyk Advisor - Plugin Status](https://snyk.io/advisor/npm-package/phaser3-plugin-isometric) - Maintenance verification

**Community Discussion:**
- [Phaser Forum: Isometric Support](https://phaser.discourse.group/t/isometric-support/558) - Community patterns
- [GameDev.net: Isometric Depth Sorting](https://www.gamedev.net/forums/topic/470599-isometric-depth-sorting/) - Y-position sorting discussions

---
*Research completed: 2026-02-16*
*Ready for roadmap: yes*
