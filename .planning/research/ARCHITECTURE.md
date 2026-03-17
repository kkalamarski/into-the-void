# Architecture Research

**Domain:** Visual overhaul and atmosphere system — procedural terrain rendering, weather particles, day/night cycle, biome atmospheric effects for existing isometric 2D game
**Researched:** 2026-03-17
**Confidence:** HIGH

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         WorldScene.update()                              │
│  ┌───────────────┐  ┌───────────────┐  ┌──────────────┐  ┌───────────┐ │
│  │DayNightCycle  │  │WeatherSystem  │  │Atmosphere    │  │TileRenderer│ │
│  │.update(delta) │  │.update(time)  │  │Manager       │  │(modified) │ │
│  └──────┬────────┘  └──────┬────────┘  │.update(time) │  └───────────┘ │
│         │                  │           └──────┬───────┘                 │
│         │                  │                  │                          │
├─────────┴──────────────────┴──────────────────┴──────────────────────── ┤
│                         Data Flow Layer                                   │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │  currentBiome (BiomeType)   →   BIOME_ATMOSPHERE_CONFIG lookup     │  │
│  │  gameTime (number 0-1)      →   interpolated light/color values    │  │
│  └────────────────────────────────────────────────────────────────────┘  │
├──────────────────────────────────────────────────────────────────────────┤
│                        Phaser Render Layer                                │
│  ┌──────────────┐  ┌────────────────┐  ┌──────────────────────────────┐  │
│  │ cameras.main │  │ ParticleEmitter│  │  Tile Graphics (cube faces)  │  │
│  │  postFX      │  │ (weather zone) │  │  3-shade procedural colors   │  │
│  │  ColorMatrix │  │                │  │                              │  │
│  └──────────────┘  └────────────────┘  └──────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| `DayNightCycle` | Manages game time (0.0–1.0), emits time events, drives all time-dependent effects | Standalone class, `update(delta)` called from WorldScene |
| `WeatherSystem` | Creates and manages biome-specific ParticleEmitter instances, moves emitter with camera | Standalone class, holds emitter refs per biome |
| `AtmosphereManager` | Applies camera-level ColorMatrix and Vignette postFX for fog/glow/haze/murk per biome | Standalone class, directly mutates `cameras.main.postFX` |
| `TileRenderer` (modified) | Generates 3-shade procedural cubes (top, lit side, shadow side) using biome palette, removes PNG path | Modify `createFallbackCube()` to become primary path |
| `BIOME_ATMOSPHERE_CONFIG` | Static lookup: BiomeType → weather type, particle config, atmosphere tint, fog density, glow color | Pure data, no logic |
| `WorldScene` (modified) | Owns all new system instances, calls `.update()` and `.setBiome()` at zone transition hooks | Minimal wiring; delegates to new systems |

---

## Existing Architecture: What Changes vs. What Is New

### Components That CHANGE

**TileRenderer** (`apps/web/src/game/rendering/TileRenderer.ts`)
- `createFallbackCube()` becomes the primary rendering path (procedural, not fallback)
- Add `setBiomePalette(biome: BiomeType)` to swap the 3-shade color set per biome
- Palette: top face = base color, lit side (south) = base × 0.75, shadow side (east) = base × 0.50
- Accent details (subtle noise spots, edge highlight variants) computed per-tile via existing `seededRandom(x, y)`
- `createCubeSprite()` gets a guard: if PNG texture missing, always falls through to new procedural path (cleanup: remove dead PNG load paths after sprites confirmed gone)
- No changes to `createTileWithElevationWorld()` interface — callers unaffected

**WorldScene** (`apps/web/src/game/scenes/WorldScene.ts`)
- `create()`: instantiate `DayNightCycle`, `WeatherSystem`, `AtmosphereManager`
- `update(time)`: call `.update()` on each new system (throttled: weather 100ms, atmosphere 50ms, day/night every frame)
- `commitZoneTransition()` and `fullZoneReset()`: call `.setBiome(newBiome)` on WeatherSystem and AtmosphereManager
- `renderChunk()`: pass `biome` to `TileRenderer.setBiomePalette()` before tile generation
- `fullZoneReset()`: call `WeatherSystem.reset()` to clear prior emitters

**PreloadScene** (`apps/web/src/game/scenes/PreloadScene.ts`)
- Remove `loadFloorTileSprites()` calls for biomes fully migrated to procedural rendering
- Keep only tile PNG load paths for biomes that still have valid sprites (migration path: remove one at a time)
- Add particle texture generation in `generateTileTextures()` (small procedural circles/dots for rain, snow, ash, spores — no new PNG assets needed)

### Components That Are NEW

**DayNightCycle** (`apps/web/src/game/systems/DayNightCycle.ts`)
```typescript
export class DayNightCycle {
  private gameTime: number = 0.5; // 0.0 = midnight, 0.5 = noon, 1.0 = midnight again
  private cycleSpeedMs: number = 10 * 60 * 1000; // 10 real minutes = 1 full day

  update(deltaMs: number): void { /* advance gameTime */ }
  getTimeOfDay(): number { /* returns 0.0-1.0 */ }
  getLightColor(): { r: number; g: number; b: number; brightness: number } { /* interpolate dawn/day/dusk/night */ }
  isDaytime(): boolean { /* gameTime 0.25-0.75 */ }
  onTimeChange(callback: (time: number) => void): void { /* event hook for other systems */ }
}
```

**WeatherSystem** (`apps/web/src/game/rendering/WeatherSystem.ts`)
```typescript
export class WeatherSystem {
  private scene: Phaser.Scene;
  private emitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private currentBiome: BiomeType | null = null;
  private lastUpdateTime: number = 0;
  private updateInterval: number = 100; // 10fps updates

  setBiome(biome: BiomeType): void { /* destroy old emitter, create new */ }
  update(time: number, camera: Phaser.Cameras.Scene2D.Camera): void { /* throttled position sync */ }
  reset(): void { /* destroy emitter, clear state */ }
  destroy(): void { /* cleanup */ }
}
```

**AtmosphereManager** (`apps/web/src/game/rendering/AtmosphereManager.ts`)
```typescript
export class AtmosphereManager {
  private scene: Phaser.Scene;
  private colorMatrix: Phaser.FX.ColorMatrix | null = null;
  private vignette: Phaser.FX.Vignette | null = null;
  private currentConfig: BiomeAtmosphereConfig | null = null;
  private dayNightCycle: DayNightCycle;
  private lastUpdateTime: number = 0;
  private updateInterval: number = 50; // 20fps updates

  constructor(scene: Phaser.Scene, dayNightCycle: DayNightCycle)
  setBiome(biome: BiomeType): void { /* load config, store */ }
  update(time: number): void { /* throttled — update ColorMatrix + Vignette based on biome + dayNight */ }
  destroy(): void { /* remove postFX */ }
}
```

**BIOME_ATMOSPHERE_CONFIG** (inline constant in `AtmosphereManager.ts` or separate `biomeAtmosphere.ts`)

---

## Recommended Project Structure

```
apps/web/src/game/
├── scenes/
│   ├── WorldScene.ts          # Modified: owns DayNightCycle, WeatherSystem, AtmosphereManager
│   └── PreloadScene.ts        # Modified: generate particle textures, prune dead PNG loads
├── rendering/
│   ├── TileRenderer.ts        # Modified: 3-shade procedural cubes as primary path
│   ├── WeatherSystem.ts       # NEW: biome particle weather
│   ├── AtmosphereManager.ts   # NEW: camera ColorMatrix + Vignette per biome
│   ├── EntityRenderer.ts      # Unchanged
│   ├── DepthSorter.ts         # Unchanged
│   ├── ChunkManager.ts        # Unchanged
│   ├── ViewportCuller.ts      # Unchanged
│   ├── RareNodeFX.ts          # Unchanged
│   ├── MinimapCamera.ts       # Unchanged
│   └── TargetHighlight.ts     # Unchanged
├── systems/
│   ├── DayNightCycle.ts       # NEW: game time management, light color calculation
│   ├── MovementController.ts  # Unchanged
│   └── PathfindingController.ts # Unchanged
└── data/
    └── biomeAtmosphere.ts     # NEW (optional): static BiomeType → atmosphere config lookup
```

### Structure Rationale

- **`rendering/`**: WeatherSystem and AtmosphereManager are rendering concerns — they produce visual output, not game logic
- **`systems/`**: DayNightCycle is a game system — it tracks simulated state (time) that other rendering components consume; same category as MovementController
- **`data/`**: biomeAtmosphere config is a pure data file, no logic — separating it prevents TileRenderer or AtmosphereManager from becoming bloated with lookup tables

---

## Architectural Patterns

### Pattern 1: Camera PostFX for Global Atmospheric Tint

**What:** Apply `ColorMatrix` and `Vignette` directly to `this.cameras.main.postFX` to affect everything the main camera renders. This is the correct level for atmosphere (fog color, night tint) because it avoids touching every individual tile or entity.

**When to use:** Global effects that apply uniformly to all rendered content — day/night darkening, biome fog color, murk haze.

**Trade-offs:** WebGL only. Canvas fallback (pixelArt mode) does not support postFX. The game uses `Phaser.AUTO` which prefers WebGL; canvas fallback is acceptable with degraded atmosphere. Confirmed available in Phaser 3.80.0.

**Example:**
```typescript
// In AtmosphereManager.update()
if (!this.colorMatrix) {
  this.colorMatrix = this.scene.cameras.main.postFX.addColorMatrix();
}
// Night darkening: gameTime 0.0 = 0.4 brightness, 0.5 = 1.0 brightness
const brightness = this.dayNightCycle.getLightColor().brightness;
this.colorMatrix.brightness(brightness, false);
// Biome tint: Bioluminescent adds cyan saturation
if (this.currentConfig?.saturationBoost) {
  this.colorMatrix.saturate(this.currentConfig.saturationBoost, false);
}
```

### Pattern 2: Viewport-Anchored Particle Emitter for Weather

**What:** Create a single `ParticleEmitter` with a wide emission zone positioned at the camera's screen-center, updated each frame to follow the camera. Particles are placed in world space and emitted from a zone that tracks `camera.worldView`.

**When to use:** Weather effects (rain, snow, ash, spores) that should appear to fall uniformly across the entire viewport regardless of camera position.

**Trade-offs:** Particle world-space position must be updated every update cycle (cheap). Do NOT use RenderTexture for weather — WorldScene.ts line 142 contains an explicit warning that "RenderTexture approach doesn't track camera properly." That failure is the direct predecessor to this design choice.

**Example:**
```typescript
// In WeatherSystem, called from WorldScene.update()
update(time: number, camera: Phaser.Cameras.Scene2D.Camera): void {
  if (time - this.lastUpdateTime < this.updateInterval) return;
  this.lastUpdateTime = time;
  if (!this.emitter) return;
  // Position emission zone at top of current camera viewport
  const worldX = camera.worldView.x + camera.worldView.width / 2;
  const worldY = camera.worldView.y - 100; // Above top of viewport
  this.emitter.setPosition(worldX, worldY);
}
```

### Pattern 3: Procedural 3-Shade Cube as Primary Tile Path

**What:** Promote `createFallbackCube()` to primary path. Compute 3 shades from the biome color: top (full), lit south face (×0.75), shadow east face (×0.50). Use `seededRandom(x, y)` for per-tile accent variations (subtle color jitter ±5%).

**When to use:** All tiles, all biomes. PNG sprites remain as optional enhancement only when present.

**Trade-offs:** Fully procedural means no art pipeline dependency. The accent jitter and 3-shade lighting give more visual depth than flat colored diamonds. Elevation tinting stacks on top of biome shading (already in `applyElevationTint()`).

**Example:**
```typescript
// In TileRenderer, setBiomePalette sets current palette
private biomePalette: { top: number; litSide: number; shadowSide: number } | null = null;

setBiomePalette(biome: BiomeType): void {
  const color = BIOME_BASE_COLORS[biome]; // from TileRegistry or new lookup
  const r = (color >> 16) & 0xff;
  const g = (color >> 8) & 0xff;
  const b = color & 0xff;
  this.biomePalette = {
    top: color,
    litSide: ((Math.floor(r * 0.75)) << 16) | ((Math.floor(g * 0.75)) << 8) | Math.floor(b * 0.75),
    shadowSide: ((Math.floor(r * 0.50)) << 16) | ((Math.floor(g * 0.50)) << 8) | Math.floor(b * 0.50),
  };
}
```

---

## Data Flow

### Day/Night Lighting Flow

```
DayNightCycle.update(delta)
    ↓ gameTime advances
DayNightCycle.getLightColor()
    → { brightness: 0.4-1.0, r, g, b }
    ↓
AtmosphereManager.update(time)
    → cameras.main.postFX.ColorMatrix.brightness(brightness)
    → cameras.main.postFX.ColorMatrix.saturate(biomeConfig.saturation)
    (throttled to 20fps — brightness changes slowly)
```

### Biome Transition Flow

```
WorldScene.commitZoneTransition(newZoneId, biome)
    ↓
TileRenderer.setBiomePalette(biome)          ← synchronous, before renderChunk
    ↓
WeatherSystem.setBiome(biome)                ← destroys old emitter, creates new
    ↓
AtmosphereManager.setBiome(biome)            ← loads new fog/glow config
    ↓
WorldScene.renderChunk(chunkData, biome)     ← tiles use updated palette
```

### Weather Particle Flow

```
WorldScene.update(time)
    ↓ (every 100ms)
WeatherSystem.update(time, cameras.main)
    → emitter.setPosition(worldX, worldY)  ← follows camera viewport center
    → emitter.active = (weather enabled in settings)
```

### Tile Rendering Flow (modified)

```
WorldScene.renderChunk()
    ↓
TileRenderer.createTileWithElevationWorld(worldX, worldY, tileId, elevation, heights, localX, localY)
    ↓
  createCubeSprite(tileId, x, y)
    → if PNG texture exists AND valid 256x256: use sprite (unchanged)
    → else: createFallbackCube(tileId)  ← NOW uses biomePalette + accent jitter
    ↓
  applyElevationTint(sprite, elevation)  ← stacks on top of biome palette (unchanged)
```

---

## Key Integration Points

### 1. WorldScene: Initialization in `create()`

Add after `this.depthSorter = new DepthSorter()` (line ~149):

```typescript
this.dayNightCycle = new DayNightCycle({ cycleSpeedMs: 10 * 60 * 1000 });
this.weatherSystem = new WeatherSystem(this);
this.atmosphereManager = new AtmosphereManager(this, this.dayNightCycle);
```

### 2. WorldScene: Update loop additions in `update(time)`

Add after the existing throttled sections (line ~853):

```typescript
this.dayNightCycle.update(this.game.loop.delta);
this.weatherSystem.update(time, this.cameras.main);
this.atmosphereManager.update(time);
```

### 3. WorldScene: Biome change hooks — TWO places must both be updated

**Place 1** — `commitZoneTransition()` after `this.currentBiome = chunk.biome` (line ~1033):
```typescript
this.weatherSystem?.setBiome(chunk.biome);
this.atmosphereManager?.setBiome(chunk.biome);
this.tileRenderer?.setBiomePalette(chunk.biome);
```

**Place 2** — `fullZoneReset()` after `this.currentBiome = biome` (line ~1187):
```typescript
this.weatherSystem?.reset();
this.atmosphereManager?.setBiome(biome);
this.tileRenderer?.setBiomePalette(biome);
```

If only one of these is updated, biome atmosphere will be wrong after teleport (hub recall, portal) but correct after walking between zones. This is the most common integration mistake for this pattern.

### 4. WorldScene: Cleanup in scene shutdown

```typescript
this.weatherSystem?.destroy();
this.atmosphereManager?.destroy();
```

### 5. TileRenderer: `setBiomePalette()` called once per `renderChunk()` call

In `WorldScene.renderChunk()`, call `this.tileRenderer.setBiomePalette(biome)` before the tile loop starts (line ~1344). The palette is stored as instance state and consulted per-tile inside `createFallbackCube()`. Do NOT call it inside the loop.

---

## Biome Atmosphere Config

All 16 biomes must be covered. Config derived from `lore/world-bible.md` atmosphere descriptions:

| BiomeType | Weather Type | Particle Rate | Atmosphere | Camera Tint Direction |
|-----------|-------------|---------------|------------|----------------------|
| `void_plains` | none | 0/s | slight dust haze | desaturated grey-purple |
| `fungal_forest` | spores | 30/s slow-falling green | soft purple glow | warm green-purple |
| `tidal_pools` | mist | 15/s fine white | light sea mist | cool blue-teal |
| `ancient_ruins` | ash | 20/s grey flakes | grey dust haze | muted brown-grey |
| `toxic_wastes` | spores | 40/s yellow-green | thick green murk | sickly yellow-green |
| `miasma_marshes` | spores + mist | 50/s heavy green | dense green murk, heavy vignette | olive-green |
| `petrified_expanse` | dust | 10/s grey motes | grey stone haze | desaturated brown |
| `frozen_expanse` | snow | 60/s white flakes slow | white blizzard haze | cold blue-white |
| `volcanic_ridge` | ash | 80/s grey-orange | orange-red heat shimmer, vignette | red-orange |
| `crystal_caves` | none | 0/s | prismatic glow | cool blue shimmer |
| `crystalline_wastes` | refraction sparks | 5/s | intense cyan glow | cyan-white brightness boost |
| `starfall_crater` | ash + debris | 25/s dark grey | dark blue-purple vignette | deep indigo |
| `kelp_forests` | bubbles | 20/s slow-rising blue | deep blue-green murk | blue-green tint |
| `deep_trenches` | bubbles | 10/s rising | dense dark blue, heavy vignette | near-black |
| `void_rift` | distortion motes | 15/s purple-white | intense purple-black glow | deep purple, desaturated |
| `bioluminescent_depths` | spores | 20/s slow cyan-green | intense blue-green glow | bright cyan saturation boost |

---

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| Current (single player session) | Single emitter per biome, single ColorMatrix on camera — zero concern |
| Many players same zone | Weather is client-side only, no server state needed — scales trivially |
| 60fps target | Throttle AtmosphereManager to 20fps (50ms), WeatherSystem to 10fps (100ms), DayNightCycle every frame (cheap arithmetic only) |
| Mobile/weak hardware | Expose `enableWeather` and `enableAtmosphere` in existing uiSettingsStore; both systems check before rendering particles/postFX |

### Scaling Priorities

1. **First bottleneck:** Particle count — limit to 200 max particles per emitter via `maxParticles` config. Weather emitters calculate lifespan from emission zone height to viewport bottom in ms, so particles naturally die at screen edge.
2. **Second bottleneck:** Camera postFX — ColorMatrix on main camera is a single GPU pass, not a per-object cost. Vignette adds one more pass. At most 2 postFX passes total, well within budget.

---

## Anti-Patterns

### Anti-Pattern 1: RenderTexture for Weather

**What people do:** Create a RenderTexture overlay and draw weather particles into it, then position it over the screen.
**Why it's wrong:** WorldScene.ts line 142 contains explicit evidence this approach fails: "Fog of war rendering disabled — RenderTexture approach doesn't track camera properly." The camera offset is not automatically applied to RenderTexture, causing visual drift as the camera moves.
**Do this instead:** World-space ParticleEmitter with position updated each frame to follow `camera.worldView` center. The emitter stays in world space and renders correctly through the camera.

### Anti-Pattern 2: Per-Tile Tint for Day/Night

**What people do:** Loop through all tile sprites on every day/night update and call `sprite.setTint()` per tile.
**Why it's wrong:** A 3×3 chunk grid is 3 × 64 × 64 = 12,288 tiles. Setting tint on every tile every frame at 60fps is catastrophic (736,000 setTint calls/second). The existing codebase already marks this risk: throttled occlusion and culling exist precisely to avoid per-tile-per-frame operations.
**Do this instead:** Camera `postFX.addColorMatrix()` applies once per frame to the entire rendered output. One GPU pass affects all tiles, entities, and effects simultaneously at no per-tile cost.

### Anti-Pattern 3: Separate Scene for Atmosphere

**What people do:** Create a separate Phaser scene layered on top for weather and atmospheric effects.
**Why it's wrong:** Depth sorting is global across WorldScene — tiles and entities are sorted together. A separate scene breaks this: weather particles would render above or below the entire world with no depth integration, and the new scene would need camera synchronization logic.
**Do this instead:** All systems operate within WorldScene. Weather particles are world-space objects within WorldScene and participate in its coordinate system. Camera postFX affects WorldScene's output at render time.

### Anti-Pattern 4: WeatherSystem Listening to Socket Events

**What people do:** Subscribe weather changes to server socket events (`biome:changed`, `weather:update`).
**Why it's wrong:** Weather is a purely cosmetic client-side feature. Adding server round-trips for visual state increases server load, adds latency to zone transitions, and couples an aesthetic system to the network layer unnecessarily.
**Do this instead:** WeatherSystem receives biome type from WorldScene at zone transition time. WorldScene already knows the biome from ChunkData. No server changes needed.

### Anti-Pattern 5: Blocking renderChunk() with setBiomePalette() inside the tile loop

**What people do:** Call `setBiomePalette()` inside the tile rendering loop for each tile.
**Why it's wrong:** The palette is the same for all tiles in a chunk. Calling it per-tile is redundant and adds function call overhead for every tile (64×64 = 4,096 calls per chunk load).
**Do this instead:** Call `setBiomePalette(biome)` once before the tile loop in `renderChunk()`. The palette is stored as instance state on TileRenderer and consulted per-tile inside `createFallbackCube()`.

### Anti-Pattern 6: Missing fullZoneReset() biome hook

**What people do:** Add biome atmosphere updates only in `commitZoneTransition()` but forget `fullZoneReset()`.
**Why it's wrong:** Hub travel, portal use, and home recall all go through `fullZoneReset()`, not `commitZoneTransition()`. Players returning from a faction hub to the open world will land in incorrect biome atmosphere until they walk to the next zone boundary.
**Do this instead:** Always update biome-dependent systems in both methods. There are exactly two zone transition paths — `commitZoneTransition` (walking, hysteresis-gated) and `fullZoneReset` (teleport, immediate). Both must call `WeatherSystem.setBiome()` and `AtmosphereManager.setBiome()`.

---

## Suggested Build Order

Dependencies between the four features determine safe build order:

```
Phase 1: Procedural Terrain Cubes (TileRenderer changes)
    - No dependencies on other new features
    - Required by Phase 2-4 (provides the visual base they modify)
    - Deliverable: 3-shade cubes with biome palettes, PNG disabled/optional

Phase 2: Day/Night Cycle (DayNightCycle + AtmosphereManager skeleton)
    - Depends on Phase 1 (cube rendering must work before adding global tint on top)
    - Deliverable: Time advances, camera ColorMatrix dims at night

Phase 3: Biome Atmospheric Effects (AtmosphereManager biome configs)
    - Depends on Phase 2 (AtmosphereManager already exists, add biome-specific configs)
    - Deliverable: Each biome has distinct fog/glow/haze on camera entry

Phase 4: Particle Weather (WeatherSystem)
    - Depends on Phase 1 (visual base) but NOT on Phase 2-3
    - Can build in parallel with Phase 2 after Phase 1 complete
    - Deliverable: Rain/snow/ash/spores per biome

Phase 5: Rendering Cleanup (PreloadScene, dead code removal)
    - Depends on all previous phases being stable
    - Deliverable: Removed PNG load paths, dead code, optimized loading
```

---

## Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| WorldScene ↔ DayNightCycle | Direct instance call: `.update(delta)`, `.getLightColor()` | DayNightCycle has no Phaser dependencies — pure TypeScript class; testable in isolation |
| WorldScene ↔ WeatherSystem | Direct instance call: `.update(time, camera)`, `.setBiome()`, `.reset()` | WeatherSystem holds Phaser scene ref for emitter creation |
| WorldScene ↔ AtmosphereManager | Direct instance call: `.update(time)`, `.setBiome()` | AtmosphereManager holds scene ref for postFX access |
| AtmosphereManager ↔ DayNightCycle | Injected via constructor: `new AtmosphereManager(scene, dayNightCycle)` | AtmosphereManager reads time from DayNightCycle during each update |
| WorldScene ↔ TileRenderer | Existing: `createTileWithElevationWorld()` unchanged interface; new: `.setBiomePalette(biome)` | TileRenderer is a pure renderer — no awareness of day/night or weather |
| uiSettingsStore ↔ WeatherSystem/AtmosphereManager | WeatherSystem/AtmosphereManager read store on each update: `useUiSettingsStore.getState().enableWeather` | Follow existing pattern from EntityRenderer which checks stores during update |

---

## Performance Implications for Chunk Streaming

The chunk streaming pipeline (ChunkManager → renderChunk → tile creation) is the most CPU-intensive operation. The new systems must not touch this hot path:

1. `setBiomePalette()` is called once per `renderChunk()` call (before the tile loop), not inside it. Cost: negligible.
2. `WeatherSystem` and `AtmosphereManager` are called from `WorldScene.update()`, which runs on the game loop — completely separate from `renderChunk()`. No impact.
3. `DayNightCycle.update()` is pure arithmetic (no allocations, no Phaser calls). Runs every frame safely.
4. `ParticleEmitter` is a single persistent object repositioned per update — no allocation during streaming. Chunk loads do not create/destroy emitters.
5. Camera postFX is a fixed GPU pipeline cost per frame — completely independent of how many chunks load or unload.

The 3x3 chunk grid unload/reload cycle (triggered by `ChunkManager.updateChunks()`) is called via `requestIdleCallback()` in `commitZoneTransition()`. New systems' biome switching happens synchronously before the idle callback, so atmospheric changes appear immediately at zone boundary while heavy tile rebuild defers to idle time.

---

## Sources

- Phaser 3.80.0 Particle Emitter API: [https://newdocs.phaser.io/docs/3.80.0/Phaser.GameObjects.Particles.ParticleEmitter](https://newdocs.phaser.io/docs/3.80.0/Phaser.GameObjects.Particles.ParticleEmitter)
- Phaser 3 FX Documentation: [https://docs.phaser.io/phaser/concepts/fx](https://docs.phaser.io/phaser/concepts/fx)
- Phaser 3 ColorMatrix API: [https://docs.phaser.io/api-documentation/3.88.2/class/fx-colormatrix](https://docs.phaser.io/api-documentation/3.88.2/class/fx-colormatrix)
- Phaser 3 PostFXPipeline: [https://docs.phaser.io/api-documentation/class/renderer-webgl-pipelines-postfxpipeline](https://docs.phaser.io/api-documentation/class/renderer-webgl-pipelines-postfxpipeline)
- Biome atmospheric descriptions: `lore/world-bible.md` — source of truth for lore-accurate atmosphere assignments
- Existing codebase — RenderTexture failure note: `apps/web/src/game/scenes/WorldScene.ts` line 142
- Existing codebase — particle PostFX precedent: `apps/web/src/game/rendering/RareNodeFX.ts` (`postFX.addGlow()` on sprites)
- Existing codebase — dual zone transition paths: `WorldScene.commitZoneTransition()` (walk) and `WorldScene.fullZoneReset()` (teleport)

---
*Architecture research for: v1.26 Visual Overhaul & Atmosphere — isometric 2D game rendering*
*Researched: 2026-03-17*
