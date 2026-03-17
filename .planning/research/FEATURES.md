# Feature Research

**Domain:** Visual overhaul and atmosphere system for isometric 2D MMO
**Researched:** 2026-03-17
**Confidence:** HIGH (Phaser 3 APIs verified via official docs + community; patterns drawn from codebase analysis)

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist in a polished isometric 2D game. Missing these makes the world feel flat or amateurish.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Procedural 3-face cube (top + lit side + shadow side) | Any 2D isometric game with "3D blocks" has all three faces; one-color diamond looks unfinished | MEDIUM | Codebase already has `createFallbackCube()` in TileRenderer.ts using 3-shade math (top=color, south=0.6x, east=0.4x); this is the primary work unit |
| Biome-specific accent colors (3 shades derived from base) | Biomes look identical in procedural rendering without distinct palettes | LOW | Each biome needs top, lit-side, shadow-side computed from single `BIOME_COLORS` value already in biome.ts |
| Gradual day/night transition (not instant) | Any game with a day/night cycle uses smooth transitions; instant cuts look broken | MEDIUM | Phaser 3 camera `postFX.addColorMatrix()` can tween brightness over a real-time minute scale (27.3 hr lore day = configurable acceleration) |
| Weather particles fixed to viewport (not world) | Rain/snow scrolling with the world breaks immersion; particles must appear to fall from "above the camera" | MEDIUM | Phaser 3 `emitter.setScrollFactor(0)` achieves this; depth layer above terrain, below UI |
| Weather fades in/out on biome transition | Abrupt weather on/off is jarring; particles should tween alpha over ~3 seconds | LOW | Standard Phaser tween on emitter alpha/quantity |
| Atmospheric overlay (fog, glow, haze) is screen-relative | World-relative fog crawls with camera instead of sitting over the scene | LOW | Use `setScrollFactor(0)` on overlay graphics, same as existing popup pattern in WorldScene.ts line 520 |
| Rendering cleanup (remove dead PNG paths) | Dead asset loads slow startup and produce console errors | LOW | PreloadScene.ts loads many tiles that fall back to procedural; removing or guarding missing loads is housekeeping |

### Differentiators (Competitive Advantage)

Features that set this game's atmosphere apart. Not expected in the genre but memorable.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Biome-unique weather type per biome (rain / snow / ash / spores) | Void Plains feels different from Frozen Expanse; weather is identity | MEDIUM | Four particle behaviors; ash drifts sideways, spores pulse-glow, rain falls fast, snow drifts slowly |
| Day/night cycle using Terminus lore time (27.3 hr day) | Sells the alien-world fantasy; day length is lore-accurate per world-bible.md | LOW | Time constants drawn from world-bible.md; no gameplay impact needed in v1.26 |
| Biome atmosphere tied to hazard identity | Toxic Wastes has greenish haze matching its hazard color; Void Rift has purple murk — reinforces lore | MEDIUM | Atmosphere overlay tint color sampled from `BIOME_COLORS` with low alpha (0.08–0.15) |
| Bioluminescent glow pulse on bioluminescent_depths biome | Biome has glow-appropriate identity; existing cyan `#00ff88` color is distinctive | MEDIUM | Pulsing additive-blend glow overlay; ties into existing `applyRareNodeFX` PostFX glow pattern |
| Night reduces entity visibility radius (lore-accurate hazard) | Night is dangerous on Terminus; visibility loss adds tension | HIGH | Requires fog-of-war integration; DEFER to v2 unless trivially achievable via camera tint alone |
| Terrain elevation casts longer shadows at low sun angle | Dramatic visual during dawn/dusk | HIGH | Requires recalculating shadow tints per-tile on time tick; DEFER to v2 |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| World-relative weather (particles positioned in world space) | "More realistic" particles at actual rain positions | Camera scrolling moves weather with terrain — rain appears to scroll with the map instead of falling from sky | Use `setScrollFactor(0)` on particle emitter; viewport-relative is the correct UX |
| Instant day/night transitions | Simpler code path | Looks broken; players see a hard color jump on the screen | Tween brightness via camera postFX ColorMatrix over the appropriate duration |
| Per-tile lighting recalculation on time update | "True" dynamic lighting | Requires rebuilding or re-tinting hundreds of tile objects each frame; creates GC pressure and frame drops | Apply a single scene-wide camera ColorMatrix brightness tween; individual tiles only have static 3-shade baked-in lighting |
| Separate weather audio system in this milestone | Weather should have sound | Audio already has 4 channels in audioStore.ts; new ambient audio for weather would require new audio assets not yet created | Implement weather sounds in a future audio pass; v1.26 is visual-only |
| Shader-based fog of war replacement | Fancier fog rendering | Existing `FogRenderer.ts` uses RenderTexture + MULTIPLY blend mode; replacing with shaders risks breaking existing fog-of-war persistence logic | Atmospheric fog is a separate, additive layer; do not touch the existing fog-of-war system |
| Day/night cycle affecting game balance (mob spawn rates, etc.) | More simulation depth | Server-side behavioral changes require new network events; out of scope for a rendering milestone | Visual-only day/night cycle first; gameplay consequences are a future server-side milestone |
| Weather that blocks gameplay visibility | Realism | Breaks combat readability; players get frustrated when weather hides entities during combat | Weather particles use low alpha (0.1–0.2) and render below entity layer — purely cosmetic |

---

## Feature Dependencies

```
[3-shade Cube Rendering]
    └──required-by──> [Biome accent colors] (3 shades derived from base color)
    └──required-by──> [Day/night shadow tint] (elevation tint must work before global tint modifies it)

[Day/Night Cycle Clock]
    └──drives──> [Scene-wide brightness tween] (camera postFX)
    └──enhances──> [Biome atmosphere overlay] (color temperature shift at dawn/dusk)

[Particle Emitter System]
    └──required-by──> [Biome weather particles] (rain/snow/ash/spores)
    └──depends-on──> [Biome detection] (WorldScene already tracks currentBiome)

[Rendering Cleanup]
    └──unblocks──> [All visual features] (clean loading reduces startup noise and dead paths)

[Biome Atmosphere Overlay]
    └──independent-of──> [Fog of War] (different depth layer, different blend mode, do NOT merge)
    └──enhances──> [Day/Night Cycle] (color temperature of overlay can shift with time of day)
```

### Dependency Notes

- **3-shade cube requires base color**: `createFallbackCube()` already computes 3 shades; the new feature promotes this to ALL tiles as the primary rendering path (not just fallback).
- **Day/night must not interact with fog-of-war**: FogRenderer uses `MULTIPLY` blend at depth 1000; atmosphere overlays should use `ADD` blend at depth 900 (below fog, above terrain ~200).
- **Weather depends on biome detection**: `WorldScene.currentBiome` already tracks the active biome (line 93); no new server plumbing needed.
- **Rendering cleanup unblocks others**: Dead PNG load attempts create console errors that obscure real issues during development; clean up first in the milestone.

---

## MVP Definition

### Launch With (v1.26)

Minimum viable set for the Visual Overhaul milestone.

- [ ] **3-shade procedural cube as primary renderer** — The game should use baked 3-face shading (top/lit/shadow) for all tiles as the standard render path; PNG sprites remain as override. Without this, "visual overhaul" is not delivered.
- [ ] **Biome color palettes (3-shade per biome)** — Each of the 16 biomes has a distinct 3-shade palette derived from its `BIOME_COLORS` entry. Without this, all procedural cubes look identical.
- [ ] **Biome weather particles (4 types)** — Rain in tidal/kelp/deep biomes; snow in frozen/crystalline; ash in volcanic/crater; spores in fungal/bioluminescent/toxic. Viewport-fixed, alpha 0.15–0.25, fade in/out on biome change.
- [ ] **Day/night cycle (visual-only)** — Camera-wide brightness tween over a configurable game-day length; no gameplay effect. Gradual transition using camera postFX ColorMatrix brightness.
- [ ] **Biome atmosphere overlay** — Thin tinted screen-relative layer (alpha 0.08–0.15) using biome accent color; additive/normal blend. Fog in toxic/miasma/trench, glow in bioluminescent/void_rift/crystal, haze in volcanic.
- [ ] **Rendering code cleanup** — Remove or guard dead PNG tile load paths in PreloadScene.ts; disable dead PNG paths for tiles that are fully procedural now.

### Add After Validation (v1.x)

Features to add once core visual system is stable.

- [ ] **Weather-reactive ambient audio** — Biome rain/wind sounds tied to weather particles; requires audio asset creation first.
- [ ] **Dawn/dusk color temperature shift** — Overlay tint warms (orange bias) at dawn, cools (blue bias) at dusk in addition to brightness; enhances day/night feel.
- [ ] **Night visibility reduction** — Reduce visible fog-of-war radius at night; requires fog-of-war system integration.

### Future Consideration (v2+)

Features to defer until the visual system is proven.

- [ ] **Per-tile dynamic shadow recalculation** — Elevation shadows update with sun angle; too expensive (hundreds of tiles must re-tint each update tick).
- [ ] **Weather gameplay effects** — Ash reduces visibility range, rain slows movement; server-side behavioral changes needed.
- [ ] **Animated tile textures** — Lava tiles ripple, bioluminescent tiles pulse at tile level; requires sprite animation system per tile.

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| 3-shade procedural cube rendering | HIGH | MEDIUM | P1 |
| Biome color palettes (3-shade per biome) | HIGH | LOW | P1 |
| Rendering cleanup | MEDIUM | LOW | P1 (do first — unblocks debugging) |
| Biome weather particles | HIGH | MEDIUM | P1 |
| Day/night cycle (visual only) | HIGH | MEDIUM | P1 |
| Biome atmosphere overlay | HIGH | LOW | P1 |
| Dawn/dusk color temperature shift | MEDIUM | LOW | P2 |
| Weather audio | MEDIUM | HIGH (needs assets) | P3 |
| Night fog-of-war reduction | MEDIUM | HIGH (integration) | P3 |
| Per-tile shadow recalculation | LOW | HIGH | P3 |

**Priority key:**
- P1: Must have for v1.26 launch
- P2: Should have, add when possible within milestone
- P3: Nice to have, future milestone

---

## Existing System Hooks (Codebase Integration Points)

These are direct integration anchors found in the existing code — not new patterns.

| Feature Area | Existing Hook | Location | Notes |
|--------------|--------------|----------|-------|
| Procedural cube rendering | `createFallbackCube()` | TileRenderer.ts:430 | Promotes fallback to primary; 3 shades already computed (1.0, 0.6, 0.4 factors) |
| Biome color lookup | `BIOME_COLORS` | biome.ts:107 | 16 biome hex colors; use as base for shade derivation |
| Current biome tracking | `this.currentBiome` | WorldScene.ts:93 | Already updated on zone change; weather/atmosphere reads this |
| Elevation tinting | `applyElevationTint()` | TileRenderer.ts:290 | Must remain independent of global day/night tint; do not merge |
| Camera postFX | `camera.postFX.addColorMatrix()` | Phaser 3 API | Scene-wide brightness without touching individual tiles |
| Screen-fixed object pattern | `setScrollFactor(0)` | WorldScene.ts:520 | Already used for popups; use same pattern for weather particles + atmosphere overlay |
| Depth budget | Terrain ~100-200, FogOfWar=1000, UI~2000 | WorldScene.ts, FogRenderer.ts:44 | Atmosphere overlay: depth 900; weather particles: depth 950 |
| Rare node glow (PostFX) | `applyRareNodeFX()` | RareNodeFX.ts:68 | Pattern for additive glow; bioluminescent atmosphere reuses same PostFX pipeline |
| Settings toggle infrastructure | `useUiSettingsStore` + GameMenu.tsx | uiSettingsStore.ts, GameMenu.tsx | Add "Weather Effects" and "Atmosphere" toggles following existing `showSecondaryBar` pattern |

---

## Biome-to-Weather/Atmosphere Mapping

Reference table for implementation — maps each biome to its atmospheric identity.

| Biome | Weather Type | Atmosphere | Overlay Color | Blend |
|-------|-------------|------------|---------------|-------|
| void_plains | none | subtle haze | #4a4a5a at 0.08 alpha | NORMAL |
| crystal_caves | none | purple glow | #7b68ee at 0.10 alpha | ADD |
| toxic_wastes | spores | green murk | #9acd32 at 0.12 alpha | NORMAL |
| ancient_ruins | none | dust haze | #8b7355 at 0.08 alpha | NORMAL |
| frozen_expanse | snow | icy blue haze | #b0e0e6 at 0.10 alpha | NORMAL |
| volcanic_ridge | ash | orange haze | #ff4500 at 0.12 alpha | NORMAL |
| fungal_forest | spores | purple glow | #9370db at 0.10 alpha | ADD |
| starfall_crater | none | dark haze | #191970 at 0.08 alpha | NORMAL |
| miasma_marshes | spores | green murk | #6b8e23 at 0.12 alpha | NORMAL |
| petrified_expanse | none | grey dust | #a9a9a9 at 0.08 alpha | NORMAL |
| tidal_pools | rain | seafoam haze | #5f9ea0 at 0.08 alpha | NORMAL |
| kelp_forests | rain | green murk | #228b22 at 0.10 alpha | NORMAL |
| deep_trenches | none | dark murk | #191970 at 0.15 alpha | NORMAL |
| void_rift | none | void glow | #4a0080 at 0.12 alpha | ADD |
| crystalline_wastes | snow | cyan glow | #b0e0e6 at 0.10 alpha | ADD |
| bioluminescent_depths | spores | cyan glow | #00ff88 at 0.12 alpha | ADD |

---

## UX Behavior Specifications

Critical behavioral requirements validated against genre patterns and Phaser capabilities.

### Weather System
- Particles are **viewport-fixed** (`setScrollFactor(0)`) — they fall from "sky" not from world positions
- Particles render at **depth 950** — above terrain, below fog-of-war (depth 1000), below UI (depth 2000)
- Fade in/out on biome transition: **3-second alpha tween** via Phaser tween system
- Particle count: **50–150 particles** per emitter; enough density for atmosphere, not performance-killing
- Rain: fast downward velocity, near-vertical, slight screen-space wobble
- Snow: slow drift, slight horizontal oscillation, larger particles
- Ash: drifts with lateral bias, medium fall speed, semi-transparent
- Spores: slowest movement, glow effect (additive blend), slight pulsing scale

### Day/Night Cycle
- Transition is **gradual, never instant** — minimum 60-second real-time tween between day and night extremes
- Implemented as **camera.postFX ColorMatrix brightness** — single tween affects all rendered objects without touching tile data
- Brightness range: **0.85 (full day) → 0.35 (deep night)** — dark enough to feel like night, not so dark that gameplay is blocked
- Full cycle: configurable; lore day is 27.3 hours — default acceleration should make one cycle ~20 minutes real time
- Night appearance: slight blue-shift (`ColorMatrix.night()` or manual RGB bias) in addition to brightness reduction

### Atmosphere Overlay
- Always **screen-relative** (`setScrollFactor(0)`)
- Renders at **depth 900** — above terrain, below weather particles (950), below fog-of-war (1000)
- Blend mode: `NORMAL` for fog/murk (simple color cast), `ADD` for glow effects (crystal, bioluminescent, void_rift)
- Changes with biome transition: **2-second alpha cross-fade** from old biome overlay to new
- Alpha range: **0.06–0.15** — noticeable enough to set mood, not so strong it obscures gameplay

### 3-shade Cube Rendering
- All tiles use procedural cubes unless a valid 256x256 PNG sprite is present (PNG sprites take priority)
- The 3-shade formula: top face = base color (1.0 factor), lit-side face = base × 0.65 (south face), shadow-side face = base × 0.40 (east face)
- Elevation tinting (`applyElevationTint`) applies on top of the 3-shade base — these stack multiplicatively
- No per-frame recalculation; shading is baked at tile creation time

---

## Sources

- [Phaser 3 Particles Documentation](https://docs.phaser.io/phaser/concepts/gameobjects/particles) — confirmed `setScrollFactor(0)` behavior for screen-fixed particles
- [Phaser 3 FX / ColorMatrix](https://docs.phaser.io/phaser/concepts/fx) — confirmed `camera.postFX.addColorMatrix()` for scene-wide brightness
- [How to Add Weather Effects in Phaser - Josh Morony](https://www.joshmorony.com/how-to-add-weather-effects-in-phaser-games/) — validated screen-relative weather pattern
- [How to Create a Day/Night Cycle in Phaser - Josh Morony](https://www.joshmorony.com/how-to-create-a-day-night-cycle-in-phaser/) — tween-based tinting approach
- [Phaser 3 ColorMatrix brightness](https://newdocs.phaser.io/docs/3.54.0/focus/Phaser.Display.ColorMatrix-brightness) — confirmed `brightness()` method for day/night
- [ColorMatrix FX Pipeline - Phaser Help](https://docs.phaser.io/api-documentation/3.88.2/class/renderer-webgl-pipelines-fx-colormatrixfxpipeline) — scene-wide postFX on camera
- [A Real Time Lighting Technique for Procedurally Generated 2D Isometric Game Terrains (Springer)](https://link.springer.com/chapter/10.1007/978-3-319-24589-8_3) — academic reference for isometric lighting
- [Fog for Top-Down Games](https://kvachev.com/blog/posts/fog-for-topdown-games/) — validated depth-layered fog mesh approach
- Codebase analysis: `TileRenderer.ts`, `WorldScene.ts`, `FogRenderer.ts`, `RareNodeFX.ts`, `biome.ts`, `uiSettingsStore.ts`, `GameMenu.tsx`

---

*Feature research for: Visual Overhaul & Atmosphere system (v1.26) — Into the Void*
*Researched: 2026-03-17*
