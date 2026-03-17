# Pitfalls Research

**Domain:** Visual overhaul and atmosphere system for existing isometric 2D game
**Researched:** 2026-03-17
**Confidence:** HIGH (codebase analysis) / MEDIUM (performance estimates)

---

## Critical Pitfalls

### Pitfall 1: Procedural Cube Graphics Objects Cause Per-Frame Draw Call Explosions

**What goes wrong:**
The current `createFallbackCube()` in `TileRenderer.ts` already uses `Phaser.GameObjects.Graphics` to draw procedural cubes. If v1.26 procedural terrain rendering extends this pattern — creating Graphics objects per tile for 3-shade cubes with accent details — the result is one separate WebGL batch flush per Graphics object. At 48-tile visibility radius (roughly 7,000+ visible tiles in an isometric diamond), this creates thousands of individual draw calls per frame and drops to single-digit FPS.

**Why it happens:**
Graphics objects in Phaser's WebGL renderer cannot be batched with Image sprites. Each Graphics object causes a pipeline flush: it breaks the current sprite batch, draws the geometry, then a new batch starts. Developers transitioning from sprite-based to procedural rendering assume Graphics are "just drawing commands" with minimal overhead, not realizing each is an independent draw call.

**How to avoid:**
Do not use per-tile `Phaser.GameObjects.Graphics` for the final procedural cube rendering. Instead, bake procedural cube visuals into textures once at startup using a Graphics object drawn to a `RenderTexture`, then use that RenderTexture as a texture key for `Phaser.GameObjects.Image`. This creates one GPU texture per tile type/shade combination, which batches normally. The fallback cube logic in `createFallbackCube()` should be the reference for the baking step, not the live rendering path.

Concrete approach:
1. At scene init, iterate all `TileId` values and all three elevation tints
2. For each combination, draw the procedural cube into a 256x256 RenderTexture
3. Snapshot it to a named texture key (`tile_void_floor_e0`, `tile_void_floor_e1`, etc.)
4. `createCubeSprite()` falls through to this key if the PNG sprite is absent

**Warning signs:**
- Frame time above 16ms when all tiles are visible
- Phaser stats panel shows draw calls count equal to or near the visible tile count
- FPS drops from 60 to under 20 when entering a large open biome
- CPU profiler shows WebGL pipeline flush calls dominating render time

**Phase to address:**
Phase 1 (Procedural terrain rendering) — define the bake-to-texture pattern before writing any tile rendering code. Verify with `this.renderer.gl` draw call counting in debug mode.

---

### Pitfall 2: Day/Night Tint Applied Per-Tile via setTint Overwrites Elevation Tinting

**What goes wrong:**
The existing elevation system in `TileRenderer.ts` applies a carefully tuned brightness tint per tile via `applyElevationTint()`: brightness ranges from 0.55 at elevation 0 to 1.0 at elevation 5. If the day/night cycle is implemented by calling `setTint()` on every visible tile container each frame or each minute-tick, it overwrites the elevation tint entirely. Tiles at all elevations appear at the same brightness — the visual depth cue is lost. Additionally, `setTint()` on Image sprites within a Container requires traversing child objects, and doing this on ~7,000 tiles per tick is a significant CPU cost even if only called on time change.

**Why it happens:**
Day/night is typically the last system added and developers apply it as a "multiply everything by dark color" operation on the scene's ambient color or on each tile directly, without accounting for the compound tint state already on tiles.

**How to avoid:**
Separate the day/night ambient from per-tile tinting entirely. Use one of two approaches:

Option A (recommended): Apply a single full-screen `Rectangle` or `RenderTexture` overlay at depth ~500 (above terrain at 0–200, below entity layer at 1000) with a dark color and tweened alpha. This is one draw call regardless of tile count. The overlay does not touch tile tint, so elevation shading is preserved. Night = overlay alpha 0.6, day = alpha 0. Transition with a `Phaser.Tweens.Tween` on the overlay alpha over the cycle duration.

Option B: Use Phaser 3.60+ `scene.cameras.main` ColorMatrix post-FX to globally shift the scene color. Single pipeline operation, does not touch individual sprites.

Do not iterate tiles to call `setTint()` for ambient day/night. Reserve `setTint()` for tile-specific permanent state (elevation shading, shadow tinting).

**Warning signs:**
- After adding day/night, elevated terrain looks flat (no brightness gradient between elevations)
- `applyElevationTint` tint values are overwritten and read back as the day/night tint
- Performance spike every time the cycle phase changes

**Phase to address:**
Phase 3 (Day/night cycle) — define the overlay approach before implementation. Add a visual assertion: after night overlay is active, tiles at elevation 0 must still be visibly darker than tiles at elevation 5.

---

### Pitfall 3: Particle Emitters Assigned Flat Depth Break Isometric Sorting

**What goes wrong:**
Weather particles (rain, snow, ash, spores) are global effects that should appear "everywhere" at the correct visual layer — above terrain but below HUD elements. The naive implementation assigns a fixed depth such as `emitter.setDepth(500)`. This places all particles at a constant z-value. In the existing depth system, entity depth is `screenY + ENTITY_LAYER_OFFSET(1000)`. Terrain tiles are at `screenY + 0–0.5`. Fixed-depth particles at 500 appear behind all entities at every screen position, creating a visual where rain is behind creatures and players but in front of distant terrain — which looks wrong in isometric projection.

The opposite problem: if particles are assigned depth 1500 (above entities), all rain drops appear on top of every creature, NPC, and player regardless of elevation, killing readability.

**Why it happens:**
Flat-depth particles work in top-down or side-scroll games where sorting is single-axis. Isometric games use a compound Y+X depth formula. Weather is screen-space (it covers the viewport), so it doesn't participate in the world-space sort naturally.

**How to avoid:**
Treat weather particles as a screen-space overlay, not world-space objects. The correct approach is to render particles into a dedicated Phaser Camera or a secondary Scene that renders on top of the game world scene but below the HTML HUD. In Phaser, add a second `Scene` (e.g., `AtmosphereScene`) that runs in parallel with `WorldScene`, with a `transparent: true` background, and place all particle emitters there. This scene never participates in the world depth sort and always renders above the game world canvas layer but below the React HUD.

If a single-scene approach is required, set particle depth to a large fixed value above all entity depths (e.g., `depth = 99000`) so particles always render above everything in the game world, and accept that rain falls "in front of" entities. This is visually acceptable for weather (rain is in the air, logically in front of everything) and matches player expectation.

For biome ground-level effects (spores drifting at ground level, ash settling), these should use world-space particle positioning with a depth offset of `ENTITY_LAYER_OFFSET + small_value` so they render just above terrain but participate in basic sorting.

**Warning signs:**
- Rain particles disappear behind creatures
- Particles flicker between "in front" and "behind" states as camera moves
- Particles sort correctly in the center of screen but incorrectly at edges

**Phase to address:**
Phase 2 (Particle weather) — decide on single-scene vs multi-scene architecture before writing the first emitter. This is the highest structural risk of the milestone.

---

### Pitfall 4: Atmosphere Effects Break at Chunk Boundaries with Hard Visual Lines

**What goes wrong:**
Biome atmospheric effects (fog, glow, haze, murk) are biome-specific. In the 3x3 chunk loading system (`ChunkManager`), up to 9 different biomes can be visible simultaneously at chunk boundaries. If fog is implemented as a biome-level full-screen overlay (one RenderTexture per biome type), the edge where a fog biome meets a clear biome shows a hard visual cut. The player sees a sharp vertical line where fog starts and stops, aligned exactly with the chunk boundary. This is the atmospheric equivalent of the chunk seam problem.

**Why it happens:**
Atmospheric effects are designed assuming the player is fully inside one biome. The chunk streaming system exposes the player to multiple simultaneous biomes at borders, which single-biome effect systems do not account for.

**How to avoid:**
Design atmosphere effects as position-based density fields rather than per-biome switches. Each tile in the loaded chunks has a known biome type. The fog/glow intensity for any screen position is a blend of the nearest tiles' biome atmosphere values, weighted by distance. At chunk boundaries, the blend creates a natural transition.

Practical implementation: maintain an `AtmosphereConfig` keyed by biome type. In the atmosphere update loop, sample the biome of the tile at and around the player's world position and interpolate atmosphere parameters (fog density, glow color, haze alpha) using a 5-tile radius blend. Apply the blended result to the atmosphere overlay.

Do not use chunk-boundary detection logic directly — use player world position as the interpolation center.

**Warning signs:**
- Visible hard lines in fog/glow effects aligned with chunk grid (multiples of `ZONE_SIZE`)
- Atmosphere effect pops on/off instantly when crossing chunk boundary
- Player sees abrupt color/alpha changes when walking between biomes

**Phase to address:**
Phase 4 (Atmosphere effects) — design the density-field blending architecture from day one. Test specifically by walking from a high-fog biome to a clear biome at the chunk boundary.

---

### Pitfall 5: Fog of War RenderTexture Is Disabled — Re-enabling Conflicts with Day/Night Overlay

**What goes wrong:**
The `FogRenderer` is explicitly disabled in `WorldScene.ts` (line 142) with a comment: "RenderTexture approach doesn't track camera properly." If fog of war is re-enabled as part of this milestone or a future one, adding it back while a day/night overlay RenderTexture is also active creates depth layer conflicts. Both systems use RenderTextures at depth ~1000 with `MULTIPLY` blend mode. Stacking two MULTIPLY blend RenderTextures at similar depths produces a combined darkening that is visually too dark (0.6 x 0.6 = 0.36 of original brightness at max night + full fog unexplored areas).

**Why it happens:**
The camera tracking bug (why fog was disabled) is a known issue in the current codebase. A future developer re-enabling fog without understanding the day/night overlay depth structure will create blend mode conflicts.

**How to avoid:**
Document the depth layer structure explicitly in a comment block at the top of `WorldScene.ts`. Current established depths:

```
0–999:    Terrain tiles (isometric depth-sorted)
1000–1999: Entities + players (ENTITY_LAYER_OFFSET applied)
1500:     Rare node markers
2000:     Tile info popup
10000:    Pathfinding visualization
99999:    Floating damage text
```

Proposed additions for v1.26:
```
400 (reserved): Fog of war when re-enabled (do not use)
500 (new): Day/night overlay (full-screen Rectangle, MULTIPLY blend)
1499:     Weather particles ceiling (must not exceed)
```

For this milestone: keep fog of war disabled. Do not re-enable it as a side effect. The camera tracking bug must be fixed in a dedicated phase before fog is safe to re-enable.

**Warning signs:**
- Screen becomes unexpectedly very dark in unexplored areas when both systems active
- Fog of war boundaries appear double-darkened compared to correctly-single-fog areas
- Night overlay appears lighter than expected because fog erased both the overlay layer and the fog

**Phase to address:**
Phase 3 (Day/night cycle) — document the depth layer table in `WorldScene.ts` before adding the overlay. Do not re-enable `FogRenderer` as part of this milestone.

---

### Pitfall 6: Per-Tile setTint for Day/Night on Graphics Fallback Objects Is Silently No-Op

**What goes wrong:**
The `applyElevationTint()` method in `TileRenderer.ts` explicitly guards: `if (!(sprite instanceof Phaser.GameObjects.Image)) return;`. This means tiles rendered via `createFallbackCube()` (Graphics objects) do not receive elevation tinting today. When day/night is added, any approach that calls `setTint()` on tile containers or their children will silently skip Graphics fallback tiles. These tiles remain at full brightness during night, creating a patchwork of tinted (Image sprite) and untinted (Graphics fallback) tiles wherever PNG sprites are missing.

**Why it happens:**
The guard was added correctly to prevent calling `.setTint()` on a Graphics object (which does not support it). But it creates an invisible divergence between sprite-backed and Graphics-backed tiles for any future tinting operation.

**How to avoid:**
Before implementing any tinting overlay, audit which tile IDs currently fall through to `createFallbackCube()`. Run a startup check that logs any TileId that does not have a valid 256x256 PNG texture. For v1.26, if procedural cube rendering is the primary goal, the Graphics fallback tiles need their baked procedural cubes to be Image-backed (via the RenderTexture baking approach in Pitfall 1). This eliminates the Graphics fallback path entirely and makes all tiles tintable uniformly.

If any Graphics fallback tiles remain, the atmosphere/day-night system must use the full-screen overlay approach (Pitfall 2, Option A) exclusively — never per-tile tinting.

**Warning signs:**
- Some tiles appear brighter than their neighbors during night cycle
- The bright tiles correspond to biomes with missing PNG sprites
- Pattern matches tile types listed in `TILE_TEXTURE_MAP` that lack a corresponding `tile_*.png` in `PreloadScene`

**Phase to address:**
Phase 1 (Procedural terrain) — fix or eliminate the Graphics fallback path so all tiles are Image-backed. This is a prerequisite for correct day/night tinting.

---

### Pitfall 7: Particle Emitters Not Destroyed on Chunk Unload Cause Memory Leak

**What goes wrong:**
If biome weather particles are spawned when a chunk loads (e.g., ash particles for volcanic biome), and the particle emitters are stored with the chunk's visual data, they must be destroyed when `unloadChunk()` is called on `ChunkManager`. The current `ChunkManager` calls `onChunkUnloaded(zoneId)` which invokes `unloadChunkContainer(zoneId)` in `WorldScene`. If particle emitters are not part of the chunk container hierarchy (because they are managed separately or added directly to the scene), they will not be destroyed on chunk unload.

In Phaser 3.60+, `ParticleEmitterManager` was removed. Particle emitters are now top-level `GameObjects` that must be explicitly destroyed. Containers with nested emitters may not auto-destroy emitters if the container is destroyed (version dependent — verify per the Phaser version in use).

**Why it happens:**
Particle emitters are visually associated with a region but structurally orphaned from the container cleanup lifecycle. The chunk container stores tile GameObjects but weather particles are "ambient" and get added to the scene root, outside the container.

**How to avoid:**
Maintain a `Map<string, ParticleEmitter[]>` keyed by `zoneId` in whatever system manages weather particles. When `onChunkUnloaded(zoneId)` fires, destroy all emitters for that zone:

```typescript
weatherEmitters.get(zoneId)?.forEach(e => e.destroy());
weatherEmitters.delete(zoneId);
```

Add this cleanup to the same `unloadChunkContainer` code path in `WorldScene`. Write an integration test that loads a volcanic chunk, walks away (triggering unload), and asserts the emitter count returns to zero.

**Warning signs:**
- Memory usage grows over 10–20 minutes of play as player moves through world
- FPS gradually degrades over a long session (accumulating particle budget)
- Phaser object count in debug overlay keeps growing after chunk loads/unloads

**Phase to address:**
Phase 2 (Particle weather) — build chunk lifecycle hooks into the weather system from the start. No standalone "add particles to biome" without the corresponding cleanup hook.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Per-tile Graphics for procedural cubes | Fast to implement | ~7,000 draw calls at 48-tile visibility radius; sub-10 FPS | Never — bake to texture instead |
| Fixed depth for weather particles | Simple one-liner | Rain behind creatures or rain over UI depending on chosen value | Only if particles are in a separate screen-space scene (not WorldScene) |
| Separate day/night overlay per biome | Accurate biome color | 16 overlapping RenderTextures, blend artifacts at boundaries | Never — use one overlay + biome color interpolation |
| Disable fog of war and keep it disabled | No RenderTexture camera bug | Feature regression, harder to fix later | Acceptable for v1.26 scope; explicitly mark as known debt |
| setTint every tile on day/night transition | Simple uniform darkening | Overwrites elevation tint, 7k+ tint calls per transition | Never — use full-screen overlay |
| Inline biome atmosphere config | Fast to ship one biome | Hardcoded per-biome, no blending at chunk borders | Never — use config table from day one |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Day/night + elevation tinting | Call `setTint()` on tile containers, overwriting elevation brightness gradient | Use single-pass full-screen overlay; elevation tinting is a tile property, ambient light is a scene property |
| Particles + ChunkManager unload | Create particle emitters in the scene root without registering them per-chunk | Register emitters in a `Map<zoneId, emitter[]>` and hook into `onChunkUnloaded` |
| Atmospheric fog + multi-chunk border | Apply fog as a biome switch (on/off per chunk) | Blend fog density based on player world position and nearby biome tiles |
| Procedural cubes + RenderTexture baking | Call `snapshot()` async without awaiting before using the texture | Use synchronous baking in `preload()` before scene `create()`, or `snapshotPixel` with callback |
| Day/night overlay + Fog of War RenderTexture | Stack two MULTIPLY blend overlays at similar depths | Separate depth ranges: fog at 400, day/night at 500; only one MULTIPLY layer in v1.26 scope |
| Phaser 3.60+ particles + depth | Call `.setDepth()` on `createEmitter()` result (old API) | In Phaser 3.60+, `this.add.particles()` returns the emitter directly; call `setDepth()` on it |
| Weather particle tint | Call `setTint()` on individual live particles each frame | Set `tint` in emitter config once; day/night ambient changes the overlay, not the particles |
| Biome atmospheric glow (PostFX) | Apply Phaser Glow PostFX to individual tile sprites | PostFX causes per-sprite pipeline flush; use a single glow overlay or camera-level PostFX |
| Atmosphere overlay + minimap camera | Day/night overlay renders into minimap camera | Use `minimapCamera.ignore([overlayObject])` after creating the overlay |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Graphics objects for procedural tiles | FPS drops to under 20 in open areas | Bake to Image textures at startup | ~500 visible Graphics tiles (immediately in any open biome) |
| Full-world atmosphere RenderTexture | Memory spike on load; >4096px texture fails silently on some GPUs | Keep all RenderTextures at viewport size, reposition on camera scroll | Any world wider than ~4000px — this world is far larger |
| Particle count per biome weather | FPS degrades as player enters dense particle zone | Cap particles: rain at 500, ash at 200, spores at 300 per emitter; use lifespan-based recycling | Uncapped: 1000+ active particles visibly tanks performance on mid-range devices |
| Day/night tween targeting multiple objects | CPU spike every cycle transition | Tween one overlay GameObject alpha, not individual tiles | Any tween touching more than 50 objects simultaneously |
| PostFX Glow on tile sprites | Each glowing tile flushes WebGL batch | Use glow on RenderTexture or a camera-level PostFX, not on individual sprites | Any time a glowing tile is visible (immediate regression) |
| Depth sort triggered by particle movement | Scene triggers re-sort multiple times per frame | Weather particles are screen-space; do not add them to the world-sorted display list | Uncapped particle emitters triggering 60 sorts/sec |
| Weather particles across chunk boundary | Particle count doubles briefly at border as old emitters linger | Register emitters to chunks; destroy on unload without waiting for particles to naturally die | Any time player crosses a chunk boundary with active weather |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Atmospheric fog obscures health bars and behavior icons | Players cannot read enemy threat during fog biome combat; leads to unexpected deaths | Atmosphere effects must never affect entity HUD elements; fog overlay stays below entity layer at depth < 1000 |
| Night cycle makes color-coded entity behavior icons unreadable | Gray/dark tint merges H/O/P/M icons and entity behavior sprites into uniform darkness | Clamp night darkness to 60% max overlay alpha; do not darken canvas below 40% of original brightness. Behavior icons are in React HTML — unaffected by canvas tinting |
| Biome glow in bioluminescent_depths is too bright | Players cannot see terrain tile types through the glow wash | Parameterize glow alpha with a configurable max (suggested: 0.3 ceiling for any biome glow overlay) |
| Particle weather obscures gathering nodes | Player misses rare ore nodes because ash or spore particles cover the glow indicators | Rare node markers at depth 1500 must render above all weather particles; weather particles must stay below depth 1499 |
| Day/night cycle causes eye strain at rapid transition | Rapid luminance changes are uncomfortable at high brightness ranges | Minimum tween duration 30 seconds for day-to-night transition; no sub-5-second transitions regardless of in-game time ratio |
| BIOME_COLORS in React HUD appears inconsistent with night canvas | The biome dot color (e.g., `#00ff88` for bioluminescent) looks inconsistent with a dark canvas below | The React HUD is outside the Phaser canvas and is not affected by canvas tinting. No change needed — document this explicitly so future developers do not attempt to adjust HUD colors per cycle |
| Weather density too uniform | Ash in volcanic biome is as dense everywhere — no sense of wind or direction | Add slight random variation to particle direction and burst timing; use Phaser emitter `angle` config with range |

---

## "Looks Done But Isn't" Checklist

- [ ] **Procedural cubes:** Verify the baked-texture fallback appears visually identical to a PNG sprite under all elevation tint values — check at elevation 0, 2, and 5 with the default 3-shade lighting
- [ ] **Day/night overlay:** Confirm elevation brightness gradient is still visible at maximum night darkness — tiles at elevation 0 must still be visibly darker than tiles at elevation 5 during night
- [ ] **Weather particles:** Walk from volcanic (ash) to void_plains across chunk boundary — particles must not persist from the unloaded chunk after 2+ seconds; assert emitter count drops
- [ ] **Atmosphere blending:** Walk the boundary between a fog biome and a clear biome — no sharp line should be visible; the transition should span at least 5 tile widths
- [ ] **Depth layering:** Rare node markers (depth 1500) must remain above weather particles in all conditions; confirm with Phaser debug overlay that no marker-behind-particle cases occur
- [ ] **Memory stability:** Load 5 different biome chunks in succession, unload all, reload — verify particle emitter count in `scene.children` returns to baseline
- [ ] **Minimap unaffected:** Day/night overlay must not darken the minimap camera — verify minimap still shows full-brightness terrain during maximum night after calling `minimapCamera.ignore(overlayObject)`
- [ ] **HUD color indicators:** Biome dot color and damage type floating number colors remain legible against a night-darkened canvas background — test at max night alpha
- [ ] **FPS baseline:** Check FPS before and after v1.26 in a high-density tile zone (crystal caves at 48-tile visibility) — target no more than 5% regression from v1.25 baseline
- [ ] **Fog of war still disabled:** Confirm `FogRenderer` is not accidentally re-enabled during rendering refactor — search for `fogRenderer.create()` call

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Graphics objects used for tiles causing FPS regression | HIGH | Identify all `createFallbackCube()` call sites; implement RenderTexture baking in PreloadScene; swap texture keys at `createCubeSprite()` — 1 to 2 day rewrite |
| Per-tile setTint overwrote elevation tinting | MEDIUM | Revert day/night to overlay approach; re-apply elevation tints by destroying and re-creating tile containers from chunk data — 4 to 8 hours |
| Particle emitters not cleaned on chunk unload | MEDIUM | Add `WeatherSystem.unloadChunk(zoneId)` hook to `unloadChunkContainer`; accept brief visual pop on reload — 2 to 4 hours |
| Atmosphere hard lines at chunk boundaries | MEDIUM | Refactor from per-chunk to position-based density sampling; rewrite the atmosphere update loop — 4 to 8 hours |
| Night overlay stacks with future fog of war | LOW | Adjust depth values to separate the layers; no visual refactor needed — 1 hour |
| Particle depth conflicts (rain behind creatures) | LOW | Reassign emitter depth to 99000 as a stopgap; proper fix is atmosphere scene separation — 30 minutes |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Graphics draw call explosion | Phase 1: Procedural terrain | Measure draw calls with Phaser stats before and after; target fewer than 50 draw calls per frame for terrain layer |
| setTint overwrites elevation tinting | Phase 1 (fix fallback path) + Phase 3 (day/night) | Visual check: elevation gradient visible during night; tiles at elevation 0 darker than elevation 5 |
| Particle depth breaks isometric sorting | Phase 2: Particle weather | Walk in rain in all 8 movement directions; particles must not appear behind player at any position |
| Atmosphere chunk boundary seam | Phase 4: Atmosphere effects | Walk the border of fog biome to clear biome; no sharp line visible across 5+ tile widths |
| Fog of war and day/night layer conflict | Phase 3: Day/night | Document depth layer table in WorldScene.ts before implementing overlay; fog renderer remains disabled |
| Graphics fallback breaks uniform tinting | Phase 1: Procedural terrain | Log any tile type falling through to Graphics fallback at startup; target zero fallback tiles in v1.26 |
| Particle emitter memory leak | Phase 2: Particle weather | Load then unload 10 volcanic chunks; assert `scene.children.length` returns to pre-load baseline |

---

## Sources

- Codebase: `apps/web/src/game/rendering/TileRenderer.ts` — Graphics draw calls, elevation tinting, fallback cube logic
- Codebase: `apps/web/src/game/utils/IsometricTransform.ts` — depth formula, `ENTITY_LAYER_OFFSET = 1000`
- Codebase: `apps/web/src/game/scenes/WorldScene.ts` line 142 — fog of war disabled with camera bug comment
- Codebase: `apps/web/src/game/rendering/ChunkManager.ts` — `onChunkUnloaded` lifecycle hook
- Codebase: `apps/web/src/game/fog/FogRenderer.ts` — RenderTexture at depth 1000, MULTIPLY blend mode
- Codebase: `apps/web/src/game/rendering/RareNodeFX.ts` — depth 1500 for rare node markers
- [Phaser 3 WebGL performance — Graphics objects cause batch flushes](https://phaser.discourse.group/t/webgl-performance-issue/12500)
- [Phaser 3 FX pipeline documentation — PostFX per-object overhead](https://docs.phaser.io/phaser/concepts/fx)
- [Phaser 3 RenderTexture — keep at viewport size, not world size](https://blog.ourcade.co/posts/2020/phaser3-fog-of-war-field-of-view-roguelike/)
- [Phaser 3 Particle setDepth on emitter (v3.60+ API change from manager to direct emitter)](https://phaser.discourse.group/t/setdepth-to-particles-emitter/4232)
- [Phaser 3 particle memory management — explicit destroy required, no auto-cleanup from manager](https://github.com/photonstorm/phaser/issues/5456)
- [Phaser optimization in 2025 — per-frame expensive updates degrade mid-range devices](https://phaser.io/news/2025/03/how-i-optimized-my-phaser-3-action-game-in-2025)
- [Graphics vs Shape objects — Graphics recalculates triangles every tick; paste to RenderTexture for static content](https://docs.phaser.io/api-documentation/class/gameobjects-graphics)
- [Isometric depth sorting with elevation — z-axis offset from tile y and x coordinates](https://mazebert.com/forum/news/isometric-depth-sorting--id775/)
- [Fog effect — keep overlay viewport-sized, reposition on scroll rather than world-sized RenderTexture](https://phaser.discourse.group/t/make-rendertexture-fill-screen-regardless-of-camera-scroll-or-scale/10442)

---

*Pitfalls research for: visual overhaul and atmosphere system on existing isometric 2D game (v1.26)*
*Researched: 2026-03-17*
