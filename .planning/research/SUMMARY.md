# Project Research Summary

**Project:** Into the Void — v1.26 Visual Overhaul & Atmosphere
**Domain:** Phaser 3 isometric 2D game rendering — procedural terrain, particle weather, day/night cycle, biome atmospheric effects
**Researched:** 2026-03-17
**Confidence:** HIGH

## Executive Summary

v1.26 is a pure rendering milestone requiring zero new npm packages and zero server-side changes. Every required capability — procedural cube textures, particle weather, day/night ColorMatrix tinting, and biome atmosphere effects — is built into the already-installed Phaser 3.90.0. The entire milestone is four new system classes (`ProceduralTileRenderer`, `WeatherSystem`, `DayNightSystem`, `AtmosphereSystem`) plus targeted modifications to `TileRenderer`, `WorldScene`, and `PreloadScene`. The work is additive and self-contained within the client game layer.

The recommended approach is to build in strict dependency order: procedural cube rendering as the foundation, then day/night cycle, then biome atmosphere (which reuses the day/night ColorMatrix infrastructure), then particle weather (which is independent of the other two but needs the visual base in place). The highest-value, lowest-risk path is to bake all procedural cube geometry into named GPU textures once at scene init using `graphics.generateTexture()`, then render tiles as `Image` objects — this preserves the existing elevation tinting, batching, and depth-sort pipeline with no structural changes to callers.

The critical risk cluster is around Phaser object lifecycle and depth layering. Three patterns have been confirmed to cause hard regressions in this specific codebase: per-tile `Graphics` objects (draw call explosion to sub-10 FPS), per-tile `setTint()` for day/night (overwrites elevation shading), and missing biome hook in `fullZoneReset()` (atmosphere breaks on teleport). All three are preventable with upfront design decisions before any implementation begins.

---

## Key Findings

### Recommended Stack

No dependency changes are required. All APIs are native to Phaser 3.90.0 (installed; semver `^3.80.0`). PostFX pipelines, the v3.60+ `ParticleEmitter` API, `graphics.generateTexture()`, and `camera.postFX.addColorMatrix()` are all built-in and verified against official docs and the installed package.

The old `ParticleEmitterManager` API was removed in Phaser v3.60 and must not be used. All particle creation goes through `scene.add.particles(x, y, key, config)` which returns a `ParticleEmitter` directly. All camera postFX are WebGL-only; a Canvas fallback (full-screen `Rectangle` overlay) is required but straightforward.

**See:** `.planning/research/STACK.md`

**Core technologies:**
- **Phaser 3.90.0**: All rendering, FX pipelines, particles — no capability gaps; all required features present
- **TypeScript 5.4**: Four new typed system classes following existing conventions in `TileRenderer.ts`, `FogManager`, `RareNodeFX`
- **`graphics.generateTexture()`**: Bakes procedural cube geometry to named GPU textures at scene init; ~14ms one-time cost enables hardware-accelerated `Image` rendering for all tiles
- **`camera.postFX.addColorMatrix()`**: Single GPU pass for day/night brightness and biome color grading — O(1) cost, not O(tiles)
- **`scene.add.particles()`**: v3.60+ direct emitter API for screen-space weather particles with `setScrollFactor(0)` viewport anchoring

### Expected Features

**See:** `.planning/research/FEATURES.md`

**Must have (table stakes — v1.26 launch):**
- 3-shade procedural cube rendering (top + lit south face + shadow east face) as primary tile renderer
- Per-biome 3-shade color palettes derived from existing `BIOME_COLORS` entries in `biome.ts`
- Biome weather particles: rain (tidal/kelp/shore), snow (ice/frozen expanse), ash (volcanic/crater), spores (fungal/bioluminescent/toxic)
- Gradual day/night cycle (visual-only, no gameplay effect) using camera postFX ColorMatrix brightness tween
- Biome atmosphere overlay: vignette for deep/trench biomes, bloom for void_rift/bioluminescent/crystal, color grading for ice/volcanic/toxic
- Rendering code cleanup: remove or guard dead PNG load paths in `PreloadScene.ts`

**Should have (add within milestone if time allows):**
- Dawn/dusk color temperature shift (warm orange bias at dawn, cool blue at dusk)
- Configurable weather and atmosphere toggles in existing `uiSettingsStore` settings menu

**Defer (v2+):**
- Night visibility reduction via fog-of-war integration (requires fixing the disabled `FogRenderer`)
- Per-tile dynamic shadow recalculation at sun angle (too expensive: 7,000+ re-tint calls per update)
- Weather gameplay effects (requires server-side behavioral changes)
- Weather-reactive ambient audio (no audio assets exist yet)

**Anti-features confirmed — never implement:**
- World-relative weather particles (appear to scroll with terrain; use `setScrollFactor(0)` instead)
- Instant day/night transitions (jarring; minimum 60-second real-time tween)
- Per-tile `setTint()` for ambient day/night (overwrites elevation shading; use camera ColorMatrix)
- Shader-based fog-of-war replacement (risks breaking existing `FogRenderer` persistence logic)

### Architecture Approach

All four new systems operate entirely within `WorldScene` as standalone classes with single-responsibility interfaces. `DayNightSystem` lives in `apps/web/src/game/systems/` (simulated state, not rendering). `WeatherSystem` and `AtmosphereSystem` live in `apps/web/src/game/rendering/`. The data layer is a static `BIOME_ATMOSPHERE_CONFIG` lookup (BiomeType → weather type + atmosphere FX params) derived from `lore/world-bible.md`. `WorldScene` owns instantiation, drives `.update()` calls, and fires `.setBiome()` at both zone transition paths.

**See:** `.planning/research/ARCHITECTURE.md`

**Major components:**
1. **`ProceduralTileRenderer`** — bakes 3-shade cube geometry to GPU textures once at scene init; `TileRenderer.createCubeSprite()` uses these textures as primary path; PNG sprites remain as optional override
2. **`DayNightSystem`** — advances `dayProgress` float (0–1) each frame via `Math.sin`; exposes `getBrightness()` consumed by `AtmosphereSystem`; drives ColorMatrix (WebGL) or Canvas Rectangle overlay fallback
3. **`WeatherSystem`** — one active `ParticleEmitter` at a time; destroy + recreate on biome change; `setScrollFactor(0)` for viewport-fixed weather; emitters registered per `zoneId` for cleanup on chunk unload
4. **`AtmosphereSystem`** — calls `cameras.main.postFX.clear()` on every biome transition, then re-adds DayNight ColorMatrix, then applies fresh vignette/bloom/color-matrix per `BIOME_ATMOSPHERE_CONFIG`

**Key integration points (both must be updated — confirmed from codebase):**
- `WorldScene.commitZoneTransition()` — walking between zones
- `WorldScene.fullZoneReset()` — teleport, hub recall, portal use

### Critical Pitfalls

**See:** `.planning/research/PITFALLS.md`

1. **Per-tile `Graphics` objects cause draw call explosion** — at 7,000+ visible tiles each Graphics object is a separate WebGL batch flush; sub-10 FPS in open biomes. Prevention: bake all cube geometry to named textures via `graphics.generateTexture()` at scene init, render as `Image` objects. Must be addressed in Phase 1 before any day/night or atmosphere system is built on top.

2. **Per-tile `setTint()` for day/night overwrites elevation tinting** — `applyElevationTint()` already sets per-tile tint state; any day/night system that calls `setTint()` per tile destroys the elevation depth cue and costs ~7,000 calls per transition. Prevention: use `camera.postFX.addColorMatrix()` (single GPU pass) — confirmed correct approach in both STACK.md and PITFALLS.md.

3. **Missing `fullZoneReset()` biome hook breaks atmosphere on teleport** — systems updated only in `commitZoneTransition()` will be correct when walking but wrong after portal/hub recall. Prevention: always call `setBiome()` and `setWeather()` in both transition methods. Exact line numbers confirmed in codebase (commit ~1033, fullReset ~1187).

4. **`cameras.main.postFX.clear()` not called on biome transition causes FX stacking** — each `add*()` call stacks a new effect; after 3 biome transitions you have 3 conflicting ColorMatrix effects. Prevention: `AtmosphereSystem.setAtmosphere()` always calls `postFX.clear()` first, then re-adds DayNight ColorMatrix reference, then adds biome FX.

5. **Particle emitters not destroyed on chunk unload cause memory leak and FPS degradation** — emitters are top-level `GameObjects` not part of the chunk container; they do not auto-destroy on `unloadChunkContainer()`. Prevention: register all emitters in a `Map<zoneId, ParticleEmitter[]>` and hook into `onChunkUnloaded()`.

---

## Implications for Roadmap

All four research files independently converged on the same 5-phase dependency order. The phase sequence is determined by hard compile-time and render-time dependencies.

### Phase 1: Procedural Terrain Cubes
**Rationale:** Foundation for everything else. Day/night and atmosphere both rely on all tiles being `Image` objects (not `Graphics`) so that camera-level postFX applies uniformly. The Graphics fallback path in `createFallbackCube()` silently defeats both systems. This phase eliminates the fallback path and makes procedural cubes the permanent primary renderer.
**Delivers:** `ProceduralTileRenderer` class; all tiles baked to named GPU textures at scene init; `TileRenderer.createCubeSprite()` returns `Image` objects using procedural textures; PNG sprites remain as optional per-tile override; dead PNG load paths cleaned from `PreloadScene.ts`
**Addresses:** 3-shade procedural cube rendering (P1), biome color palettes (P1), rendering cleanup (P1)
**Avoids:** Draw call explosion (Pitfall 1), Graphics fallback breaking uniform tinting (Pitfall 6)

### Phase 2: Particle Weather System
**Rationale:** Independent of day/night and atmosphere after Phase 1 — can be built in parallel once tile rendering is stable. Establishing the weather particle depth budget (depth 950) before atmosphere claims depth 900 and day/night overlay claims depth 500 prevents depth conflicts at design time. Chunk lifecycle hooks are simpler to design before the other two systems add more scene objects.
**Delivers:** `WeatherSystem` class; 4 weather types (rain/snow/ash/spores); viewport-fixed emitters via `setScrollFactor(0)`; fade in/out alpha tween on biome transition (3 seconds); `Map<zoneId, emitter[]>` cleanup on chunk unload; weather textures generated via `generateTexture` (no external assets)
**Addresses:** Biome weather particles (P1 feature)
**Avoids:** Particle emitter memory leak (Pitfall 7), particle depth breaks isometric sorting (Pitfall 3)

### Phase 3: Day/Night Cycle
**Rationale:** Requires Phase 1 (all tiles Image-backed for uniform camera postFX). Provides `DayNightSystem` that `AtmosphereSystem` (Phase 4) receives via constructor injection. WebGL `ColorMatrix` approach is confirmed; Canvas `Rectangle` fallback is documented and simple. Documents the depth layer table in `WorldScene.ts` before Phase 4 adds more layers.
**Delivers:** `DayNightSystem` class; camera brightness tween (0.55–1.0 range); blue-shift night tone via `colorMatrix.night()`; configurable game-day duration (default 20 minutes real-time); Canvas fallback `Rectangle` overlay at depth 500; `getDayBrightness()` accessor for `AtmosphereSystem`
**Addresses:** Day/night cycle (P1 feature)
**Avoids:** Per-tile setTint overwriting elevation tinting (Pitfall 2), fog-of-war + overlay depth conflict (Pitfall 5)

### Phase 4: Biome Atmospheric Effects
**Rationale:** Depends on Phase 3 — `AtmosphereSystem` shares the camera postFX channel with `DayNightSystem` and must re-add the DayNight ColorMatrix instance after each `postFX.clear()`. The `BIOME_ATMOSPHERE_CONFIG` covers all 16 biomes from `lore/world-bible.md`. Position-based density blending prevents hard seams at chunk boundaries.
**Delivers:** `AtmosphereSystem` class; `BIOME_ATMOSPHERE_CONFIG` covering all 16 biomes; vignette (deep/trench/void), bloom (bioluminescent/void_rift/crystal), color grading (ice/volcanic/toxic); 2-second cross-fade on biome transition; biome hook wired in both `commitZoneTransition()` and `fullZoneReset()`
**Addresses:** Biome atmosphere overlay (P1 feature), biome visual identity reinforcement
**Avoids:** FX stacking on biome transition (Pitfall 4), atmosphere hard lines at chunk boundaries (Pitfall 4 corollary), missing fullZoneReset hook (Pitfall — confirmed integration gotcha)

### Phase 5: Rendering Cleanup and Verification
**Rationale:** Deferred until all systems are stable. Removing dead PNG load paths early risks breaking PNG sprite overrides for biomes that still have valid sprites. Cleanup is only safe when Phases 1–4 are verified working. Performance baseline comparison requires a stable build.
**Delivers:** All dead PNG tile load paths removed from `PreloadScene.ts`; depth layer table documented as a comment block in `WorldScene.ts`; `FogRenderer` confirmed disabled (not accidentally re-enabled during refactor); FPS baseline check in high-density tile zone (target: 5% or less regression vs v1.25)
**Addresses:** Rendering cleanup (P1 feature), technical debt documentation, performance gate
**Avoids:** Accidental `FogRenderer` re-enable (Pitfall 5), accumulated stale load paths

### Phase Ordering Rationale

- Phase 1 must come first: `Image`-backed tiles are a prerequisite for correct camera-level tinting; any remaining `Graphics` objects silently defeat both day/night (Pitfall 2) and atmosphere systems
- Phase 2 is independent of Phases 3 and 4 after Phase 1 — weather and atmosphere have no shared state; building them in parallel is possible; weather comes second to establish depth budget first
- Phase 3 before Phase 4: `AtmosphereSystem` constructor receives `DayNightSystem` reference; the clear/restore cycle for camera postFX requires the DayNight ColorMatrix instance to exist first
- Phase 5 last: cleanup is safest when the visual baseline is locked and no system is still in flux

### Research Flags

Phases with well-documented patterns (skip `/gsd:research-phase`):
- **Phase 1** — `graphics.generateTexture()` pattern fully documented in Phaser official docs; integration points confirmed by direct code inspection of `TileRenderer.ts` at exact line numbers; no unknowns remain
- **Phase 2** — Phaser v3.60+ `ParticleEmitter` API fully documented; `setScrollFactor(0)` viewport-anchor pattern confirmed; chunk lifecycle hook (`onChunkUnloaded`) identified in `ChunkManager.ts`
- **Phase 5** — pure cleanup; no new APIs; verification checklist is in PITFALLS.md

Phases that may benefit from targeted investigation during planning:
- **Phase 3** — confirm `this.renderer.type === Phaser.WEBGL` detection works as expected in the production Vite build (minification may affect Phaser constant access); verify Canvas fallback path in a non-WebGL browser before committing to the architecture
- **Phase 4** — the position-based density field for atmosphere blending at chunk boundaries is the highest architectural complexity in this milestone; the 5-tile interpolation radius suggestion is unvalidated against actual chunk grid dimensions; confirm the blend produces smooth transitions before implementation

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All Phaser APIs verified against 3.90.0 installed; official docs cited for every method signature; no new packages required; direct `node_modules` inspection |
| Features | HIGH | Feature landscape drawn from codebase analysis + official Phaser docs + industry tutorials; biome mapping from `lore/world-bible.md` (authoritative per CLAUDE.md) |
| Architecture | HIGH | Integration points confirmed by direct code inspection of `TileRenderer.ts`, `WorldScene.ts`, `RareNodeFX.ts`; exact line numbers cited for zone transition hooks |
| Pitfalls | HIGH (analysis) / MEDIUM (performance estimates) | Draw call explosion and setTint override confirmed via Phaser source and codebase; particle count thresholds (200 max, 7,000 tile count) are estimates from community benchmarks |

**Overall confidence:** HIGH

### Gaps to Address

- **Atmosphere chunk-boundary blending radius**: The 5-tile blend radius is a design suggestion, not a measured value. Validate during Phase 4 planning by mapping actual chunk grid dimensions (3×3 grid at ZONE_SIZE tiles) against tile screen size to confirm the radius produces visually smooth transitions.

- **ColorMatrix + Bloom render order**: When `DayNightSystem` and `AtmosphereSystem` both write to the camera's postFX chain after `clear()`, the order of ColorMatrix (brightness) vs Bloom may affect the final output. Verify the combined visual result during Phase 4 — brightness before bloom is the expected order.

- **Canvas fallback coverage**: The game uses `Phaser.AUTO` which prefers WebGL. The Canvas fallback path for day/night (Rectangle overlay) is architecturally defined but untested. Verify in a Canvas-forced browser environment before marking Phase 3 complete.

- **`FogRenderer` re-enable path**: The fog-of-war RenderTexture is disabled with a known camera-tracking bug (`WorldScene.ts` line 142). v1.26 must not re-enable it. The camera-tracking bug is not scoped to this milestone but should be tracked as follow-on work separate from the visual overhaul.

---

## Sources

### Primary (HIGH confidence)
- Phaser 3 official docs — `https://docs.phaser.io/api-documentation/class/gameobjects-particles-particleemitter` — ParticleEmitter v3.60+ API, `setScrollFactor()`, `ParticleEmitterManager` removal confirmed
- Phaser 3 official docs — `https://docs.phaser.io/phaser/concepts/fx` — camera postFX: ColorMatrix, Bloom, Vignette, Glow
- Phaser 3 official docs — `https://photonstorm.github.io/phaser3-docs/Phaser.Display.ColorMatrix.html` — `brightness()`, `night()`, `contrast()`, `hue()` method signatures
- Phaser 3 official docs — `https://newdocs.phaser.io/docs/3.80.0/focus/Phaser.GameObjects.Graphics-generateTexture` — generateTexture caching pattern; performance advice
- `node_modules/phaser/package.json` — confirmed Phaser 3.90.0 installed
- `apps/web/src/game/rendering/TileRenderer.ts` — `createFallbackCube()`, `applyElevationTint()`, integration hooks
- `apps/web/src/game/rendering/RareNodeFX.ts` — `postFX.addGlow()` pattern working in this codebase
- `apps/web/src/game/scenes/WorldScene.ts` — `commitZoneTransition()`, `fullZoneReset()`, `currentBiome`, line 142 fog-of-war disabled comment
- `lore/world-bible.md` — biome atmosphere descriptions (source of truth per CLAUDE.md)

### Secondary (MEDIUM confidence)
- Josh Morony — `https://www.joshmorony.com/how-to-add-weather-effects-in-phaser-games/` — screen-relative weather particle pattern
- Josh Morony — `https://www.joshmorony.com/how-to-create-a-day-night-cycle-in-phaser/` — tween-based tinting for day/night
- Phaser discourse — `https://phaser.discourse.group/t/webgl-performance-issue/12500` — Graphics objects cause WebGL batch flushes
- Phaser discourse — `https://phaser.discourse.group/t/setdepth-to-particles-emitter/4232` — v3.60+ emitter depth API change
- Phaser GitHub issue #5456 — particle memory management; explicit `destroy()` required; no auto-cleanup from manager

### Tertiary (context and validation)
- Springer — isometric lighting for procedurally generated 2D terrain — academic reference for 3-shade face lighting model
- Kvachev blog — depth-layered fog mesh for top-down games — validated depth-layer separation approach
- Mazebert forum — isometric depth sorting with elevation z-axis offset — depth formula context

---
*Research completed: 2026-03-17*
*Ready for roadmap: yes*
