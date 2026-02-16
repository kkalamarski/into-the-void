# Feature Landscape: Isometric View Implementation

**Domain:** Isometric rendering for multiplayer 2D MMO
**Researched:** 2026-02-16
**Context:** Adding isometric transformation to existing top-down game with WASD/click-to-move, viewport culling, entity rendering with health bars, minimap, and HUD

## Table Stakes

Features players expect. Missing = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Correct depth sorting (z-index) | Core to isometric visual coherence — entities must layer properly based on position | Medium | Y-position based sorting is minimum. Higher Y = render last. Need to handle overlapping sprites and multi-tile objects |
| Diamond tile coordinate transformation | Players expect isometric diamond grid, not rectangular | Low | Math conversion: screen ↔ tile coords. 2:1 pixel ratio standard. Already have 32px tiles, need to map to 64x32 diamonds |
| Accurate mouse/click detection | Click-to-move must work on diamond tiles, not just rectangles | Medium | Mouse coords → tile coords math. Adjacent tile disambiguation (diamond shape means overlap). Current click-to-move will break without this |
| Proper tile rendering order | Tiles must draw back-to-front (row-by-row) to avoid visual glitches | Low | Draw row 0, then row 1, etc. Already have ChunkManager, extend for isometric ordering |
| Entity positioning on tiles | Entities must align to isometric grid, not float incorrectly | Low | Convert entity world coords to isometric screen coords. Already have EntityRenderer, add transform |
| Health bars above entities | Already implemented, must stay aligned in isometric space | Low | Current health bars are relative to container. Offset Y to account for sprite height |
| Minimap representation | Players need to understand minimap perspective (orthogonal vs isometric) | Medium | Current minimap uses 0.15x zoom camera. Either keep orthogonal (easier to read) or match isometric view. Recommend orthogonal for clarity |

## Differentiators

Features that set product apart. Not expected, but valued.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Dynamic shadows | Adds depth perception and visual polish that matches modern isometric games | High | Pre-rendered shadows on tiles are table stakes for static objects. Dynamic shadows for moving entities differentiate quality. Could use simple circular shadow sprites offset by Y position |
| Highlight/outline on hover | Improves UX for tile/entity selection in dense isometric scenes | Medium | Screen-space outlines (constant width) preferred over world-space. Can use Phaser post-processing or manual outline rendering. Critical for click-to-move clarity |
| Smooth camera panning | Expected in modern isometric MMOs for exploration | Low | Already have viewport culling. Extend to support smooth camera drag (mouse edge pan or middle-click drag). WASD camera movement also expected |
| Zoom levels (2-3 discrete) | Allows tactical overview vs detail view | Medium | 1.0x (default), 0.75x (zoomed out), 1.5x (zoomed in). Must recalculate viewport culling per zoom. Mouse wheel zoom standard |
| Visual depth cues (elevation) | Enhances 3D feeling in 2.5D space | High | Stacked tiles for height variation. Not critical for initial implementation. Placeholder colored tiles sufficient first |
| Tile edge anti-aliasing | Prevents jagged diamond edges with colored tiles | Low | Phaser antialiasing enabled by default. May need texture filter adjustments for crisp pixel art vs smooth gradients |
| Behavior icons with isometric offset | Icons must not overlap sprites in dense scenes | Low | Current behavior icons at Y=-30. May need adjustment based on sprite height in isometric space |

## Anti-Features

Features to explicitly NOT build.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Camera rotation (4 or 8 directions) | Massively increases asset requirements (4x-8x sprites). Causes player disorientation. "Camera should never distract from gameplay" — design principle | Lock camera to single isometric angle (industry standard: 30-45 degrees from horizontal). Keep consistent viewpoint |
| Free-form (non-grid) movement | Breaks depth sorting, complicates collision, loses tactical clarity expected in isometric MMOs | Keep existing grid-based movement. Smooth animation between grid positions acceptable, but logical position must snap to grid |
| Pixel-perfect isometric (strict 2:1 ratio) | Constraint limits sprite design flexibility and is unnecessary for 96x96 sprites | Use approximate isometric (2:1 ratio for tiles, flexible sprite dimensions). Visual coherence matters more than mathematical purity |
| Full 3D lighting system | Performance cost too high for 2D game. Pre-baked lighting simpler and more controllable | Pre-render tile shading/highlights. Use simple sprite-based shadows for entities. Artists control aesthetic directly |
| Separate isometric tilemap system | Overkill for placeholder colored tiles. Adds complexity before value is proven | Transform coordinates in rendering layer only. Keep world data in rectangular grid. Isometric is purely presentational |
| Occlusion culling for multi-level buildings | No buildings in current scope. Over-engineering | Defer until architecture/building systems are designed. Viewport culling sufficient for open world |

## Feature Dependencies

```
Coordinate transformation → Mouse click detection
Coordinate transformation → Tile rendering order
Coordinate transformation → Entity positioning

Depth sorting → Entity rendering
Depth sorting → Health bar positioning
Depth sorting → Hover highlighting

Mouse click detection → Click-to-move
Mouse click detection → Entity selection
Mouse click detection → Hover highlighting

Camera panning → Zoom levels
Viewport culling → Camera panning
Viewport culling → Zoom levels

Minimap representation → Camera panning (must update minimap camera)
```

## MVP Recommendation

Prioritize (Phase 1):
1. **Coordinate transformation** — Core math for isometric rendering
2. **Diamond tile rendering** — Visual proof-of-concept with colored tiles
3. **Depth sorting** — Y-position based z-index for entities and tiles
4. **Mouse click detection** — Restore click-to-move functionality
5. **Entity positioning** — Align existing entities to isometric grid
6. **Health bar adjustment** — Keep health bars aligned above entities

Prioritize (Phase 2):
1. **Hover highlighting** — Visual feedback for selection
2. **Camera panning** — Edge pan or middle-click drag
3. **Minimap adjustment** — Keep orthogonal or transform to match view

Defer:
- **Zoom levels** — Not critical until camera panning proven
- **Dynamic shadows** — Polish feature after core mechanics work
- **Elevation/height** — Requires design decisions about world structure
- **Behavior icon refinement** — Current system likely works, adjust if overlap occurs

## MVP Feature Details

### Coordinate Transformation (Critical)

**What:** Convert between rectangular world coordinates and isometric screen coordinates

**Implementation approach:**
- World uses existing grid (x, y in tiles)
- Screen coordinates calculated as:
  - `screenX = (worldX - worldY) * (tileWidth / 2)`
  - `screenY = (worldX + worldY) * (tileHeight / 2)`
- Inverse for mouse → world:
  - `worldX = (screenX / (tileWidth / 2) + screenY / (tileHeight / 2)) / 2`
  - `worldY = (screenY / (tileHeight / 2) - screenX / (tileWidth / 2)) / 2`

**Testing:** Click same tile positions in orthogonal vs isometric, verify world coordinates match

### Diamond Tile Rendering (Critical)

**What:** Render 64x32 diamond shapes for existing 32x32 square tiles

**Implementation approach:**
- Use Phaser Graphics to draw colored diamonds (no sprites yet)
- Colors match existing biome palette
- Render in row-order (y=0, then y=1, etc) for correct layering
- Origin at diamond center for easier positioning

**Testing:** Verify no gaps between tiles, colors match biomes, no z-fighting

### Depth Sorting (Critical)

**What:** Render entities/tiles back-to-front based on Y position

**Implementation approach:**
- Set sprite depth = `(worldY * 1000) + worldX`
- Higher Y positions render last (appear in front)
- Tiles share same depth calculation
- Phaser depth sorting handles rendering order automatically

**Testing:** Move entity from low Y to high Y, verify it appears in front of tiles

### Mouse Click Detection (Critical)

**What:** Convert mouse clicks to correct tile coordinates on diamond grid

**Implementation approach:**
- Transform screen click to world coordinates using inverse formulas
- Round to nearest integer tile position
- Verify clicked tile is walkable before pathfinding
- Add visual highlight at calculated position for debugging

**Testing:** Click tile edges, verify correct tile selected. Click diamond corners, verify correct disambiguation

### Hover Highlighting (Phase 2)

**What:** Visual outline/highlight on hovered tile or entity

**Implementation approach:**
- Draw highlight diamond using Graphics.strokeRect with transform
- Color: white or accent color (match HUD theme)
- Update on pointermove event
- Clear on pointerout

**Testing:** Hover tiles, verify highlight appears at cursor position. Hover entities, verify entity highlight not tile

## Current System Integration

**Existing features that continue to work:**
- WASD movement (world coords unchanged)
- Server-side movement validation (world coords unchanged)
- Viewport culling (may need bounds adjustment for diamond rendering area)
- HUD health/energy/XP bars (unaffected by world rendering)
- WebSocket communication (unaffected)
- Pathfinding A* (world grid unchanged)

**Existing features requiring adjustment:**
- TileRenderer.createTile() — Add coordinate transform
- EntityRenderer.createEntityContainer() — Add coordinate transform, verify health bar Y offset
- ViewportCuller — Expand culling bounds to account for diamond shape extending beyond rectangular bounds
- ChunkManager — Render tiles in Y-order, not arbitrary order
- Click-to-move handler — Add inverse coordinate transform
- Minimap camera — Decide orthogonal (no change) vs isometric (add transform)

**Known edge cases:**
- Entities at same Y position (e.g. Y=10) need secondary sort by X for deterministic ordering
- Multi-tile entities (if added later) need special depth calculation based on base tile
- Viewport edges in isometric space are rotated 45° — culling rectangle must expand to diamond bounding box

## Performance Considerations

| Concern | At Current Scale | Mitigation |
|---------|------------------|------------|
| Coordinate transformation overhead | Low — simple math per tile/entity | Cache transformed positions when possible. Only recalculate on position change |
| Depth sorting cost | Low — Phaser depth sorting is O(n log n) | Already sorting entities. Adding tiles to sort increases n, but still performant for visible entities (< 200) |
| Diamond rendering | Low — Graphics.fillPath faster than sprites for solid colors | Use Graphics for MVP. If performance issues, pre-render diamond sprites and use sprite batching |
| Viewport culling accuracy | Medium — diamond bounds exceed rectangular tiles | Calculate diamond bounding box (rotated 45°), cull against that. ~1.4x rectangular area |
| Mouse picking per frame | Low — only on pointermove, not render loop | Acceptable. If lag occurs, throttle to 60fps max |

## Confidence Assessment

| Area | Confidence | Source Basis |
|------|------------|--------------|
| Core isometric math | HIGH | Multiple authoritative sources (Phaser docs, Clint Bellanger isometric math, game dev forums) |
| Depth sorting approach | HIGH | Standard Y-position sorting verified across Unity/Godot/Phaser implementations |
| Mouse picking complexity | MEDIUM | Math is well-documented, but diamond shape disambiguation requires careful implementation |
| Minimap representation | MEDIUM | No clear consensus — some games keep orthogonal, others transform. Player preference varies |
| Performance of colored tiles | HIGH | Graphics.fillPath well-optimized in Phaser. Multiple examples of simple isometric tile engines |
| Shadow implementation | LOW | Many approaches exist (sprite-based, shader-based, pre-baked). Need to test what works best for this game |

## Sources

### High Confidence (Official/Authoritative)
- [Phaser 3 Isometric Examples](https://phaser.io/examples/v3.85.0/depth-sorting/view/isometric-map) — Official Phaser isometric tilemap examples with depth sorting
- [Phaser 3 Isometric Plugin](https://github.com/sebashwa/phaser3-plugin-isometric) — Community plugin showing isometric implementation patterns
- [Clint Bellanger: Isometric Tiles Math](https://clintbellanger.net/articles/isometric_math/) — Authoritative coordinate transformation formulas
- [2D Engine: Isometric Graphics Tutorial](https://2dengine.com/doc/isometric.html) — Comprehensive isometric rendering techniques
- [Drawing Isometric Boxes in Correct Order](https://shaunlebron.github.io/IsometricBlocks/) — Topological sorting for depth ordering

### Medium Confidence (Verified Community Sources)
- [GameDev.net: Isometric Depth Sorting](https://www.gamedev.net/forums/topic/470599-isometric-depth-sorting/) — Y-position sorting discussions
- [Red Blob Games: Isometric Outline Rendering](https://www.redblobgames.com/x/1942-isometric/) — Visual techniques for outlines/highlighting
- [Studica: Isometric Camera Unity](https://www.studica.com/blog/isometric-camera-unity/) — Camera control patterns transferable to Phaser
- [80.lv: Frustum Culling Optimization for Isometric RTS](https://80.lv/articles/optimizing-isometric-rts-performance-with-frustum-culling) — Viewport culling for isometric maps

### Medium Confidence (Recent Isometric MMO Examples)
- [Massively Overpowered: Dreadmyst Isometric MMORPG](https://massivelyop.com/2026/01/12/isometric-mmorpg-dreadmyst-reaches-over-7k-concurrency-and-mostly-positive-reviews-despite-server-issues/) — 2026 isometric MMO launch, player expectations
- [MMORPG.com: Isometric MMO Discussion](https://forums.mmorpg.com/discussion/423774/what-would-it-take-to-get-you-interested-in-playing-a-isometric-mmo) — Player preferences for isometric MMOs
- [MMORPG.GG: Best Isometric MMOs 2025](https://mmorpg.gg/best-isometric-mmos/) — Survey of current isometric MMO features

### Low Confidence (Implementation Details Requiring Validation)
- [Pikuma: Isometric Projection](https://pikuma.com/blog/isometric-projection-in-games) — General overview, math needs verification against Phaser specifics
- [Screaming Brain: Isometric Shadows Tutorial](https://screamingbrainstudios.com/isometric-shadows/) — Shadow techniques, but for static pre-rendered assets
- [Minimaps Research](https://alejandro61299.github.io/Minimaps_Personal_Research/) — Minimap positioning statistics, limited sample size
- [Unity Isometric Movement Discussions](https://forum.unity.com/threads/most-natural-isometric-character-movement.531173/) — Movement feel discussions, but Unity-specific

## Research Methodology Notes

**Verification approach:**
- Core math (coordinate transformation, depth sorting) verified across 3+ authoritative sources
- Visual polish features (shadows, highlights) have multiple implementation approaches — flagged as needing prototyping
- Player expectations drawn from 2026 isometric MMO launch (Dreadmyst) and community forums
- Performance claims based on Phaser-specific documentation where available, extrapolated from Unity/Godot where not

**Gaps identified:**
- No Phaser-specific benchmark data for isometric performance at scale (100+ entities)
- Minimap representation has no clear best practice — orthogonal vs isometric is aesthetic choice
- Shadow implementation approach needs prototyping to determine performance/visual tradeoff
- Zoom level implementation details light on Phaser specifics (viewport culling recalculation)

**Confidence in recommendations:**
- MVP features (coordinate transformation, depth sorting, mouse picking) — HIGH confidence, well-documented
- Phase 2 features (hover highlight, camera pan) — MEDIUM confidence, standard patterns but need adaptation
- Deferred features (zoom, shadows, elevation) — LOW confidence, multiple valid approaches, needs design exploration
