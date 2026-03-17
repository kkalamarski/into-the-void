# Stack Research

**Domain:** Phaser 3 visual overhaul — procedural light-aware terrain cubes, particle weather, day/night cycle, biome atmospheric effects (v1.26)
**Researched:** 2026-03-17
**Confidence:** HIGH (all Phaser APIs verified against 3.90.0 installed in node_modules; official docs consulted; integration points confirmed by direct code inspection of TileRenderer.ts, WorldScene.ts, RareNodeFX.ts)

---

## Summary

No new npm packages are required for v1.26. Every feature — procedural cube rendering, particle weather, day/night cycle, and biome atmosphere — is covered by APIs already present in Phaser 3.90.0 (installed; package.json semver `^3.80.0`). PostFX pipelines (v3.60+), the redesigned ParticleEmitter (v3.60+), Graphics.generateTexture(), and ColorMatrix on cameras are all built-in and confirmed in official docs. The work is entirely additive: four new renderer/system classes that slot into the existing `WorldScene` → `TileRenderer` / `EntityRenderer` architecture.

---

## Recommended Stack

### Core Technologies (no changes, no new packages)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Phaser 3 | 3.90.0 (installed) | All rendering, particles, FX pipeline, tween animation | PostFX pipelines, ParticleEmitter, ColorMatrix, Graphics.generateTexture() — all built-in since v3.60; current install is v3.90.0, fully compatible |
| TypeScript | 5.4.x (installed) | Type-safe system classes | Existing pattern; four new classes follow same typing conventions as TileRenderer, EntityRenderer, FogManager |

---

## Phaser 3 Built-in APIs Required

These are not new dependencies — they are APIs already available in the installed Phaser version. Listed explicitly so implementors know exactly which namespaces to use.

### Procedural Tile Rendering

| API | Phaser Namespace | Purpose | Notes |
|-----|-----------------|---------|-------|
| `scene.add.graphics()` | `Phaser.GameObjects.Graphics` | Draw procedural isometric cube faces (top diamond, south face, east face) with per-face color shading | Already used in `TileRenderer.createFallbackCube()` — this becomes the primary path, not the fallback |
| `graphics.generateTexture(key, width, height)` | `Phaser.GameObjects.Graphics` | Bake procedural cube geometry into a named texture cached in `scene.textures` | Call once per tile type at scene init. Returns texture added to TextureManager. Then use `scene.add.image(0, 0, key)` for fast GPU-accelerated rendering. Do NOT redraw Graphics objects per frame — that is prohibitively expensive for hundreds of visible tiles. |
| `scene.add.image(0, 0, key)` | `Phaser.GameObjects.Image` | Render cached procedural cube textures | Image supports `setTint()`, unlike Graphics. After generating textures, use Image for all tile rendering. Same interface as current PNG sprite path — zero change to callers. |
| `image.setTint(value)` | `Phaser.GameObjects.Components.Tint` | Per-tile tint for elevation darkening and shadow effects | ONLY available on Image/Sprite, NOT on Graphics. The existing `applyElevationTint()` in TileRenderer already uses this correctly for the Image path. |

**Critical: Graphics does not expose `setTint()`** — confirmed via Phaser docs. Color math (face brightness calculation) must be done before `graphics.fillStyle()` calls during texture generation, not after.

### Particle Weather System

| API | Phaser Namespace | Purpose | Notes |
|-----|-----------------|---------|-------|
| `scene.add.particles(x, y, textureKey, config)` | `Phaser.GameObjects.Particles.ParticleEmitter` | Create weather particle emitter | v3.60+ API: returns `ParticleEmitter` directly (no Manager needed). `ParticleEmitterManager` was removed in v3.60. |
| `emitter.setScrollFactor(0)` | `Phaser.GameObjects.Particles.ParticleEmitter` | Fix weather to screen coordinates regardless of camera pan/zoom | ParticleEmitter extends GameObject and inherits `ScrollFactor` component. Confirmed in official API docs. Essential for screen-space weather. |
| `emitter.stop()` / `emitter.destroy()` | `Phaser.GameObjects.Particles.ParticleEmitter` | Stop and remove weather on biome change | Call `destroy()` on zone transition; create a fresh emitter for new biome |
| Emitter config: `gravityY`, `speedY`, `angle`, `scaleX`, `scaleY`, `lifespan`, `quantity`, `alpha`, `tint` | `Phaser.Types.GameObjects.Particles.ParticleEmitterConfig` | Configure particle behavior per weather type | All are standard config properties on the emitter config object |
| Emitter config: `emitZone` with `type: 'random'` | `Phaser.Types.GameObjects.Particles.EmitZoneData` | Emit particles from a rectangle zone covering viewport top | `source: new Phaser.Geom.Rectangle(0, 0, viewportWidth, 1)` for top-of-screen emission |

**Texture for particles:** Use `graphics.generateTexture('weather_rain', 2, 8)` (2px wide, 8px tall white rectangle) and `graphics.generateTexture('weather_dot', 4, 4)` (4×4 white circle) generated at boot. No external image assets needed.

### Day/Night Cycle

| API | Phaser Namespace | Purpose | Notes |
|-----|-----------------|---------|-------|
| `camera.postFX.addColorMatrix()` | `Phaser.FX.ColorMatrix` | Apply brightness and blue-shift to entire rendered scene | WebGL only. Applied to `cameras.main`. Affects everything the camera renders in one GPU pass — zero per-tile CPU cost. |
| `colorMatrix.brightness(value)` | `Phaser.Display.ColorMatrix` | Set scene brightness (0.0 = black, 1.0 = full). Drive day/night | Confirmed method signature: `brightness(value: number, multiply?: boolean)`. Default `multiply = false` (replace, not blend). |
| `colorMatrix.night(intensity)` | `Phaser.Display.ColorMatrix` | Apply night vision / blue shift tone | Confirmed method signature: `night(intensity?: number, multiply?: boolean)`. Default `intensity = 0.1`. At `intensity = 0.3-0.5` produces convincing blue night tone. |
| `scene.tweens.add({ targets: colorMatrix, ... })` | `Phaser.Tweens.TweenManager` | Animate ColorMatrix numeric properties over time | Tween any numeric property exposed on the ColorMatrix FX instance for smooth transitions. Official docs confirm "it is up to you to set the progress value via a Tween." |
| `scene.add.rectangle(0, 0, w, h, 0x000033, 0)` | `Phaser.GameObjects.Rectangle` | Full-screen night overlay for Canvas mode fallback | Set `setScrollFactor(0)`, high depth, tween alpha from 0→0.5 as night falls. Only used when `this.renderer.type !== Phaser.WEBGL`. |

**WebGL detection:** `if (this.renderer.type === Phaser.WEBGL)` — use ColorMatrix. Otherwise fall back to Rectangle overlay.

### Biome Atmospheric Effects

| API | Phaser Namespace | Purpose | Notes |
|-----|-----------------|---------|-------|
| `camera.postFX.addVignette(x, y, radius, strength)` | `Phaser.FX.Vignette` | Darken viewport edges for underground, void, trench biomes | Applied to `cameras.main`. WebGL only. Parameters: x/y = center (0-1 normalized), radius (0-1), strength (0-1). |
| `camera.postFX.addBloom(color, offsetX, offsetY, blurStrength, strength, steps)` | `Phaser.FX.Bloom` | Glow/bloom for bioluminescent, void_rift, crystalline biomes | Applied to `cameras.main` for whole-scene bloom. WebGL only. Cheaper than per-sprite glow at scale. |
| `camera.postFX.addColorMatrix()` (second use) | `Phaser.FX.ColorMatrix` | Biome-specific color grading: desaturate (ice), contrast boost (volcanic), hue shift (toxic) | Same API as day/night ColorMatrix. Note: each `addColorMatrix()` call adds a new FX instance — stack carefully or use a single shared instance. |
| `cameras.main.postFX.clear()` | `Phaser.FX.Controller` | Remove ALL postFX from camera before applying new biome effects | MANDATORY on biome transition. Phaser does NOT auto-clear effects on zone change. Missing this causes FX stacking and corrupted appearance. |
| `sprite.postFX.addGlow(color, outerStrength, innerStrength, knockout, quality, distance)` | `Phaser.FX.Glow` | Per-entity glow for rare nodes (already in use) | Already implemented in `RareNodeFX.ts`. Same API available for selected atmospheric entities. |

---

## New System Classes (no packages, just new files)

Four new files in `apps/web/src/game/rendering/`:

### 1. `ProceduralTileRenderer.ts`

Replaces both the PNG-load path and the `createFallbackCube()` fallback in `TileRenderer.createCubeSprite()`. Makes procedural cubes the permanent primary path.

**How it works:**
- `initTextures(scene)`: called once in `WorldScene.create()`. For each of the 28 TileIds, creates a Graphics object, draws top diamond + south face + east face with biome color, calls `generateTexture(key, 256, 256)`, destroys Graphics. Result: ~28 named textures in `scene.textures`.
- `getTextureKey(tileId): string`: returns the cached texture key. Falls back to existing color-only diamond if generation failed.
- Day/night shading is NOT baked into textures. Textures use full daytime colors. DayNightSystem handles brightness via `camera.postFX.addColorMatrix()` globally — zero per-tile redraw.
- Accent details: small pixel-dot patterns can be added during `generateTexture` for biome texture variation (optional for v1.26 MVP).

**Integration into TileRenderer:** Replace `createCubeSprite()` body. Return `scene.add.image(0, 0, proceduralTextureKey)` with correct origin. The container structure, elevation logic, depth sorting, and tint-based shadow system all remain unchanged.

### 2. `WeatherSystem.ts`

Manages per-biome particle weather. One active emitter at a time.

**How it works:**
- `setWeather(biome: BiomeType | null)`: destroys current emitter; creates new one from `WEATHER_CONFIG[biome]` if biome has weather.
- All emitters: `setScrollFactor(0)`, depth above tiles but below React HUD (e.g., depth 5000).
- Emitter position: fixed to `(0, 0)` in screen space with `scrollFactor = 0`. No update() tracking needed.
- `setIntensity(0-1)`: for gradual start/stop on zone entry, tween `emitter.quantity` between 0 and max.

**WEATHER_CONFIG per biome (no weather = omit from map):**

| Biome | Type | speedY | angle | scaleX | scaleY | quantity | alpha | tint |
|-------|------|--------|-------|--------|--------|----------|-------|------|
| tidal, kelp, shore | rain | 700-950 | 85-95° | 0.25 | 1.0 | 14 | 0.5 | 0xaaddff |
| ice | snow | 90-130 | 78-102° | 1.0 | 1.0 | 7 | 0.8 | 0xffffff |
| volcanic, crater | ash | 50-90 | 65-115° | 0.8 | 0.8 | 5 | 0.55 | 0x888888 |
| fungal, bioluminescent | spores | 25-50 | 60-120° | 1.0 | 1.0 | 4 | 0.6 | 0x88ff44 |

**Texture:** `'weather_rain'` (2×8 white rect), `'weather_dot'` (4×4 white circle). Generated in `WeatherSystem.init()` via `generateTexture`. Rain/ash use rain texture; snow/spores use dot texture.

**Integration:** `WorldScene.commitZoneTransition()` and `WorldScene.fullZoneReset()` — both already track `currentBiome`. Add `this.weatherSystem.setWeather(biome)` at those call sites.

### 3. `DayNightSystem.ts`

Manages continuous time-of-day cycle.

**How it works:**
- `dayProgress` float, 0.0 = midnight → 0.5 = noon → 1.0 = midnight again. Advances via `scene.time.now`.
- Configurable `dayDurationMs` (e.g., 20 minutes = 1,200,000ms per full day).
- `update(time: number)`: advances `dayProgress = (time % dayDurationMs) / dayDurationMs`.
- `brightness = 0.55 + Math.sin(dayProgress * Math.PI) * 0.45` → range 0.55 (midnight) to 1.0 (noon).
- WebGL path: `camera.postFX.addColorMatrix()` at scene init, store reference. Each update: `colorMatrix.brightness(brightness)`. At brightness < 0.75: also call `colorMatrix.night((1 - (brightness - 0.55) / 0.2) * 0.35)` for blue shift.
- Canvas fallback: `scene.add.rectangle(0, 0, w, h, 0x000033, 0)`, `setScrollFactor(0)`, depth 9998. Each update: `rect.setAlpha(1 - brightness)`.
- Exposes `getDayBrightness(): number` for use by `WeatherSystem` (modulate particle alpha at night).
- Exposes `getDayProgress(): number` (0-1) for HUD display if needed.

**Integration:** Instantiated in `WorldScene.create()`, updated in `WorldScene.update(time, delta)`.

### 4. `AtmosphereSystem.ts`

Manages per-biome camera post-processing. Pure WebGL effects, no-op on Canvas.

**How it works:**
- `setAtmosphere(biome: BiomeType)`: clears ALL camera postFX, then applies effects from `ATMOSPHERE_CONFIG[biome]`.
- `ATMOSPHERE_CONFIG` (selected biomes; others = no atmosphere effects):

| Biome | Effects |
|-------|---------|
| `void_plains` | `addVignette(0.5, 0.5, 0.9, 0.4)` |
| `void_rift` | `addVignette(0.5, 0.5, 0.7, 0.6)` + `addBloom(0x6600ff, 0, 0, 1.2, 0.8, 1)` |
| `bioluminescent_depths` | `addBloom(0x00ff88, 0, 0, 1.0, 1.0, 1)` |
| `crystalline_wastes` | `addBloom(0x88ffff, 0, 0, 0.5, 0.6, 1)` + `addVignette(0.5, 0.5, 0.85, 0.3)` |
| `volcanic` / `crater` | `addColorMatrix().contrast(0.2)` |
| `abyssal_trench` | `addVignette(0.5, 0.5, 0.55, 0.85)` |
| `ice` | `addColorMatrix().saturate(-0.3)` |
| `toxic` | `addColorMatrix().hue(20)` |
| `fungal` | no camera FX (spore particles handle atmosphere) |
| Hub zones, ruins, all others | no atmosphere FX |

- **Always call `cameras.main.postFX.clear()` before applying new effects.** Missing this causes atmospheric FX to stack across zones.
- DayNight ColorMatrix is on a separate FX channel. After `clear()`, re-add it before atmosphere FX.

**Integration:** Same call sites as `WeatherSystem` — `commitZoneTransition()` and `fullZoneReset()`.

---

## Supporting Libraries

No new npm packages needed. All capabilities are built into Phaser 3.90.0.

| Why Not Add | Reason |
|-------------|--------|
| Custom GLSL PostFXPipeline subclass | Requires raw GLSL, fragile against Phaser internal changes, unnecessary when built-in ColorMatrix + Bloom + Vignette cover all required effects |
| Three.js or PixiJS | Entirely separate renderers — would conflict with Phaser's WebGL context |
| phaser3-rex-notes plugins | Third-party; Phaser built-ins are sufficient and avoid external dependency drift |
| External particle libraries (PixiParticles, etc.) | Phaser's ParticleEmitter handles the required weather effects at the required particle counts |

---

## Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| `console.log(this.renderer.type)` in Phaser | Detect WebGL vs Canvas at runtime | `0 = Canvas`, `1 = WebGL`. Add WebGL guard before all `postFX` calls. |
| Phaser Debug Mode | Verify FX pipeline is active | If PostFX effects aren't visible, confirm `renderer.type === 1` and that `cameras.main.postFX` is not undefined |
| Chrome Performance tab | Profile particle count vs frame time | Target < 1ms particle overhead. If over budget, reduce `quantity` per emitter. |

---

## Installation

No package changes required.

```bash
# No new dependencies — Phaser 3.90.0 already installed.
# Verify:
node -e "console.log(require('./node_modules/phaser/package.json').version)"
# Expected output: 3.90.0
```

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| `camera.postFX.addColorMatrix().brightness()` for day/night | `setTint()` on every tile container each frame | Per-tile tinting is O(n) where n = visible tiles (~500-2000 at any time). Camera ColorMatrix is O(1) GPU-side. Use per-tile tinting only if you need individual tile lighting rather than global time-of-day. |
| `graphics.generateTexture()` once at init, then `Image` objects | Redraw `Graphics` objects per frame | Redrawing Graphics for hundreds of tiles per frame collapses framerate. generateTexture bakes to GPU memory; Image rendering is hardware-accelerated. Only redraw if tile appearance changes dynamically (it doesn't in this design). |
| Screen-space particles with `setScrollFactor(0)` | World-space particles that follow camera | World-space weather requires spawning/despawning particles at world-coords as camera moves, adding complexity. Screen-space with scrollFactor=0 is simpler and produces correct "weather falls on everything" effect. |
| Destroy + recreate emitter on biome change | Single emitter with config hot-swap | Phaser's ParticleEmitter does not support full config replacement without restart. Clean destroy + create is the documented approach and eliminates stale particle state. |
| `cameras.main.postFX.clear()` then re-add all effects on biome change | Individually remove specific effects | Phaser has no "remove specific FX by type" API. `clear()` is the correct and documented way to reset camera effects. Always clear before applying new atmosphere. |
| Four separate system classes (Procedural, Weather, DayNight, Atmosphere) | Monolithic `VisualSystem` class | Single responsibility makes each system independently testable and replaceable. WorldScene already organizes systems this way (FogManager, PoiRenderer, TargetHighlight are all separate). |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `ParticleEmitterManager` (old API) | Removed in Phaser v3.60. Would throw `undefined is not a function` at runtime on v3.90.0 | `scene.add.particles(x, y, key, config)` — direct ParticleEmitter creation (v3.60+ API) |
| `setTint()` on `Phaser.GameObjects.Graphics` | Graphics does NOT expose the Tint mixin. Confirmed in Phaser docs — `setTint` is only available on Image, Sprite, TileSprite, and similar texture-based objects. | Bake color into `fillStyle()` during texture generation. For runtime tinting, generate texture first, then use `scene.add.image()` which supports `setTint()`. |
| Per-frame `graphics.clear()` + redraw for tile rendering | O(tiles × faces) per frame — would drop framerate to < 10 FPS for a viewport of 500+ tiles | `generateTexture()` at scene init, then render as `Image` objects |
| Custom WebGL shader pipeline (`PostFXPipeline` subclass) | Requires writing GLSL shader code, deep Phaser internals knowledge, and breaks with renderer changes. Completely unnecessary: ColorMatrix handles brightness/night, Bloom handles glow, Vignette handles dark edges. | `camera.postFX.addColorMatrix()`, `addBloom()`, `addVignette()` |
| Stacking `camera.postFX.addColorMatrix()` calls without `clear()` | Each `add*()` call stacks a NEW effect — on the third biome transition you have 3 ColorMatrix effects fighting each other, producing unpredictable colors | Always `cameras.main.postFX.clear()` on biome transition before adding new effects |
| `Phaser.Tilemaps` API for tile tinting | Project does not use Phaser Tilemaps — it uses custom isometric Graphics/Image tiles. Tilemap tinting APIs (`DynamicTilemapLayer.setTint()`) are irrelevant and would require migrating the entire tile architecture. | Camera ColorMatrix for global tinting; `image.setTint()` for per-tile tinting |

---

## Stack Patterns by Variant

**If WebGL is available (expected case — all modern browsers):**
- Use `camera.postFX.addColorMatrix()` for day/night brightness + night blue shift
- Use `camera.postFX.addBloom()` / `addVignette()` for atmosphere
- Detect: `this.renderer.type === Phaser.WEBGL`

**If Canvas fallback (old device, no WebGL):**
- Use `scene.add.rectangle(0, 0, w, h, 0x000033, 0).setScrollFactor(0)` at depth 9998 for night overlay
- Skip all `camera.postFX.*` calls entirely — they silently fail on Canvas but waste CPU checking
- ParticleEmitter still works on Canvas — weather effects are available
- AtmosphereSystem becomes a no-op on Canvas

**If biome has no weather:**
- Call `weatherSystem.setWeather(null)` — destroys active emitter, no particles
- Biomes without weather: void_plains, void_rift, crystalline_wastes, ruins, all hub zones, toxic, crystal

**If biome has no atmosphere:**
- `AtmosphereSystem` still calls `cameras.main.postFX.clear()` to remove previous biome's effects
- Then adds nothing. This is correct behavior — clear is always called.

**If DayNightSystem and AtmosphereSystem both use ColorMatrix:**
- DayNight adds its ColorMatrix first (in `create()`), stores reference
- AtmosphereSystem `clear()` removes ALL effects including DayNight's ColorMatrix
- After `clear()`, AtmosphereSystem must re-add the DayNight ColorMatrix from the stored reference
- OR: DayNight and Atmosphere share a single ColorMatrix instance on the camera, and both write to it. Simpler — recommended for v1.26.

---

## Integration Points in Existing Code

| Existing Code | How New Code Hooks In |
|---------------|----------------------|
| `TileRenderer.createCubeSprite()` | Replace the PNG-load path AND the `createFallbackCube()` fallback with `ProceduralTileRenderer.getTextureKey(tileId)`. Return `scene.add.image(0, 0, key)`. Same return type. Zero change to `createTileWithElevationWorld()` callers. |
| `TileRenderer.isValidCubeTexture()` | Remove — no longer needed once procedural textures are always present |
| `WorldScene.create()` | Add: `this.proceduralTileRenderer = new ProceduralTileRenderer(); this.proceduralTileRenderer.initTextures(this)`. Add `DayNightSystem`, `WeatherSystem`, `AtmosphereSystem` instantiation. |
| `WorldScene.update(time, delta)` | Add: `this.dayNightSystem.update(time)` |
| `WorldScene.commitZoneTransition()` | Add: `this.weatherSystem.setWeather(biome)` and `this.atmosphereSystem.setAtmosphere(biome)` |
| `WorldScene.fullZoneReset()` | Add same weather + atmosphere calls as `commitZoneTransition()` |
| `PreloadScene.ts` | No changes needed — procedural textures are generated at `WorldScene.create()` time, not during preload |
| `RareNodeFX.ts` | No changes — already uses `postFX.addGlow()`. Compatible with new camera FX stacked on top. |
| `TILE_TEXTURE_MAP` in `TileRenderer.ts` | Becomes unused once PNG path is removed. Keep as reference map for the `textureKey` property in TileDefinition, but stop using it for actual rendering. |

---

## Performance Notes

| Concern | Impact | Mitigation |
|---------|--------|------------|
| `generateTexture()` at scene init | ~28 calls × ~0.5ms each = ~14ms one-time cost at WorldScene boot | Acceptable; boot already loads many assets. No ongoing cost. |
| ParticleEmitter (screen-space weather) | 50-100 active particles per emitter, ~0.3-0.5ms per frame | Single emitter at a time. Stay under 200 max particles total. |
| Camera `postFX.addColorMatrix()` per frame | GPU-side shader pass — negligible CPU cost | No per-frame allocation; update only the float value on the stored ColorMatrix reference |
| `cameras.main.postFX.clear()` on zone transition | One-time operation, infrequent | Acceptable; zone transitions are already expensive (chunk load/unload) |
| `DayNightSystem.update()` | One trig function (Math.sin) + two float assignments per frame | Effectively zero overhead |

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| phaser@3.90.0 | All PostFX, ColorMatrix, ParticleEmitter APIs described above | PostFX added in v3.60; project has 3.90 — fully forward-compatible |
| phaser semver `^3.80.0` | Safe lower bound for all described APIs | All APIs stable since 3.60; no breakage risk within ^3.80 range |
| TypeScript@5.4 | No issues | Phaser ships its own type declarations; no @types/phaser needed |

---

## Sources

- Phaser 3 official docs — `https://docs.phaser.io/api-documentation/class/gameobjects-particles-particleemitter` — ParticleEmitter v3.60+ API: `setScrollFactor()`, emitZone config, confirmed `ParticleEmitterManager` removed at v3.60 (HIGH confidence — official docs)
- Phaser 3 official docs — `https://docs.phaser.io/phaser/concepts/fx` — Built-in FX: ColorMatrix, Bloom, Vignette, Glow, camera.postFX support confirmed (HIGH confidence — official docs)
- Phaser 3 official docs — `https://photonstorm.github.io/phaser3-docs/Phaser.Display.ColorMatrix.html` — Method signatures: `brightness(value, multiply?)`, `night(intensity?, multiply?)`, `contrast(value, multiply?)`, `hue(rotation, multiply?)` all confirmed (HIGH confidence — official API reference)
- Phaser 3 official docs — `https://newdocs.phaser.io/docs/3.80.0/focus/Phaser.GameObjects.Graphics-generateTexture` — generateTexture caching pattern confirmed; performance advice ("use for static shapes") confirmed (HIGH confidence — official docs)
- Phaser 3 official docs — `https://docs.phaser.io/api-documentation/class/gameobjects-graphics#fillStyle` — Graphics postFX support confirmed (inherits PostPipeline); setTint NOT available on Graphics confirmed (HIGH confidence — official docs)
- Installed package — `node_modules/phaser/package.json` — Confirmed version 3.90.0 (HIGH confidence — direct file inspection)
- `apps/web/src/game/rendering/TileRenderer.ts` — Confirmed: `createFallbackCube()` exists and draws procedural cubes; `applyElevationTint()` correctly guards `instanceof Phaser.GameObjects.Image` before calling `setTint()`; integration points identified (HIGH confidence — direct code inspection)
- `apps/web/src/game/rendering/RareNodeFX.ts` — Confirmed: `postFX.addGlow()` pattern works in this codebase on WebGL; Canvas fallback `setTint()` also used (HIGH confidence — existing working code)
- `apps/web/src/game/scenes/WorldScene.ts` — Confirmed: `commitZoneTransition()` and `fullZoneReset()` are correct integration hooks; `currentBiome` tracked; `create()` and `update()` structure confirmed (HIGH confidence — direct code inspection)
- `package.json` (root) — Confirmed phaser `^3.80.0` semver and all installed dependencies (HIGH confidence — direct file inspection)

---

*Stack research for: Phaser 3 visual overhaul — procedural light-aware terrain cubes, particle weather, day/night cycle, biome atmospheric effects (v1.26)*
*Researched: 2026-03-17*
