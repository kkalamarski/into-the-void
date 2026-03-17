# Phase 127: Particle Weather System - Research

**Researched:** 2026-03-17
**Domain:** Phaser 3 Particle System, viewport-fixed rendering, biome-driven state machines
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- Every biome gets at least some particle effect — no biome is weather-free
- Weather type matches biome theme (e.g., fungal_forest → spores, frozen_expanse → snow, volcanic_ridge → ash)
- Tier I biomes get gentle thematic weather
- Tier II-III biomes get progressively more intense base weather
- Void Rift (Tier IV) gets unique otherworldly particles — void shards, reality distortion, energy crackle — not standard weather types
- Claude maps specific weather types to each of the 16 biomes based on lore and theme
- Pixel-style particles (2-4px square/rectangular) — consistent with the game's pixel-art aesthetic
- Particles are biome-tinted — colors drawn from biome palette (greenish rain in fungal areas, orange ash near volcanic, etc.)
- 3 intensity tiers: light, moderate, heavy — each tier increases particle count/density
- Weather is purely cosmetic — no visibility reduction, no combat effects, no gameplay mechanics
- Crossfade blend on biome change: old weather fades out while new weather fades in simultaneously (~3 second duration)
- Rapid biome crossing: cancel current transition immediately, start new transition to latest biome
- Teleport (hub recall, etc.): instant swap to destination weather, no fade
- Semi-random intensity cycles, each lasting 2-5 minutes per period
- Gradual ramp between intensity tiers — particle count smoothly increases/decreases, no visible jumps
- Weather intensity synced per zone across all players — shared experience via server-driven cycle
- Higher tier biomes are more volatile — shift intensity more often and hit heavy tier more frequently

### Claude's Discretion

- Exact weather type assignment per biome (within thematic match constraint)
- Particle count numbers per intensity tier
- Void Rift particle design specifics
- Server sync mechanism for weather intensity cycles
- Particle spawn patterns and movement behavior per weather type

### Deferred Ideas (OUT OF SCOPE)

- Weather gameplay effects (visibility reduction, combat modifiers) — future phase
- Phase 126 tile shape fix: tiles rendering as flat tiles instead of full isometric cubes — bug fix needed
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| WTHR-01 | Weather particles render viewport-relative (fixed to screen, not world) | Phaser ParticleEmitter.setScrollFactor(0) — confirmed in v3.90.0 source. ScrollFactor is a mixin on ParticleEmitter. |
| WTHR-02 | Each biome has appropriate weather type (rain, snow, ash, spores, mist, or none) | 16 BiomeTypes confirmed from shared-types; biome-to-weather mapping table provided below. |
| WTHR-03 | Weather transitions smoothly when player moves between biomes | commitZoneTransition() and fullZoneReset() are the two hooks in WorldScene. 3-second crossfade via tweens.add({alpha}) on old/new emitters simultaneously. |
| WTHR-04 | Weather particles respect depth budget (above terrain, below UI) | Terrain depth = screen-position-based (~0-99999); Phaser in-game UI (ZoneHUD) = depth 1000. Particle emitter target depth = 500. React HUD is DOM layer above canvas entirely — no Phaser depth conflict. |
| WTHR-05 | Particle emitters are cleaned up on chunk unload (no memory leaks) | unloadChunkContainer(zoneId) is already called; WeatherSystem.setBiome()/destroy() must also be called in fullZoneReset(). Use emitter.destroy() not just .stop(). |
</phase_requirements>

---

## Summary

Phase 127 adds viewport-fixed particle weather to each of the 16 biomes. The entire system lives in a new `WeatherSystem` class in `apps/web/src/game/systems/` that is owned and driven by `WorldScene`. Weather particles use Phaser 3's built-in `ParticleEmitter` (v3.60+ unified API — no ParticleEmitterManager), which directly supports `setScrollFactor(0)` (viewport-relative), `setDepth()` (depth budget), and `setAlpha()` (crossfade tweens) through its component mixins.

The pixel-style particles (2-4px squares) will use a pre-generated single-pixel texture baked in PreloadScene using `graphics.generateTexture()`, which is already the established pattern in this codebase. Per-biome tinting is applied via the emitter's `tint` config property (or `particleTint`), overriding to biome palette colors at emitter creation time.

Biome transitions use a crossfade pattern: the outgoing emitter tweens alpha 1→0 while the incoming emitter tweens alpha 0→1 over 3 seconds, after which the old emitter is destroyed. Teleports bypass the tween and instant-swap. The intensity cycling system is fully client-side (deterministic seed per zoneId so players in the same zone see the same state without network traffic), ramping particle `quantity` and `frequency` smoothly between tiers using `tweens.add()` on a proxy object.

**Primary recommendation:** Create `WeatherSystem` as a standalone class injected into WorldScene, with hooks called at `commitZoneTransition()` and `fullZoneReset()`. Use `this.scene.add.particles(0, 0, 'weather-pixel', config).setScrollFactor(0).setDepth(500)` positioned at viewport center to cover the screen.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Phaser ParticleEmitter | 3.90.0 (installed) | Particle system | Already in project; v3.60+ unified API (no Manager); has ScrollFactor, Depth, AlphaSingle mixins. |
| Phaser Tweens | 3.90.0 (installed) | Alpha crossfade + intensity ramp | Already used in WorldScene (entity fade-in at line 1444); `tweens.add({targets, alpha, duration})` |
| Phaser Graphics.generateTexture | 3.90.0 (installed) | Bake pixel particle texture | Already used in PreloadScene (lines 396-416); creates named GPU texture |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| BIOME_COLORS (shared-types) | existing | Biome palette for particle tint | Source of truth for biome colors — already imported in WorldScene |
| BIOME_TIERS (shared-types) | existing | Tier for volatility/intensity | Directly consumed for intensity scheduling |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `setScrollFactor(0)` on emitter | Separate fixed UIScene | Over-engineering — ParticleEmitter already supports scrollFactor, simpler to keep in WorldScene |
| Tween-based intensity ramp | `setQuantity()` per timer frame | Tweens are cleaner, Phaser-idiomatic; avoid per-frame manual lerp |
| Pre-generated pixel texture | Phaser.GameObjects.Rectangle as particles | Particles need a texture; rectangle is not a texture; generateTexture is the correct approach |

**Installation:** No new packages required. All dependencies already in project.

---

## Architecture Patterns

### Recommended Project Structure

```
apps/web/src/game/systems/
├── WeatherSystem.ts        # New: owns emitters, handles transitions, intensity cycles
├── MovementController.ts   # Existing
└── PathfindingController.ts # Existing

apps/web/src/game/scenes/
└── WorldScene.ts           # Add: weatherSystem field, call setBiome() in commitZoneTransition & fullZoneReset
                             #      call weatherSystem.destroy() in scene shutdown
```

No new directories needed — `systems/` already exists and is the correct location for this class.

### Pattern 1: WeatherSystem Class (Strategy Pattern)

**What:** A class that owns the active and transitioning particle emitters. Each weather type is a config object (strategy). The class exposes `setBiome(biome, instant)` as its primary API.

**When to use:** When biome changes (commitZoneTransition, fullZoneReset) or on scene destroy.

```typescript
// apps/web/src/game/systems/WeatherSystem.ts
import Phaser from 'phaser';
import { BiomeType, BIOME_TIERS } from '@into-the-void/shared-types';

export type WeatherType = 'rain' | 'snow' | 'ash' | 'spores' | 'mist' | 'void_energy';

export interface WeatherConfig {
  type: WeatherType;
  tint: number;             // biome-tinted color
  // Particle counts per tier [light, moderate, heavy]
  quantity: [number, number, number];
  speedY: [number, number]; // min/max downward speed
  lifespan: number;         // ms
  scaleX: number;           // 2px wide
  scaleY: number;           // 3-4px tall for rain, 2-2 for snow
  angle?: [number, number]; // horizontal drift range (degrees)
}

export class WeatherSystem {
  private scene: Phaser.Scene;
  private activeEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private outgoingEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private currentBiome: BiomeType | null = null;
  private intensityTier: 0 | 1 | 2 = 0;   // 0=light, 1=moderate, 2=heavy
  private intensityCycleTimer: Phaser.Time.TimerEvent | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  setBiome(biome: BiomeType, instant: boolean = false): void {
    if (biome === this.currentBiome) return;
    this.currentBiome = biome;

    const config = WEATHER_CONFIGS[biome];
    const newEmitter = this.createEmitter(config);

    if (instant || !this.activeEmitter) {
      // Teleport: instant swap
      this.activeEmitter?.destroy();
      this.outgoingEmitter?.destroy();
      this.activeEmitter = newEmitter;
      this.activeEmitter?.setAlpha(1);
    } else {
      // Crossfade: old fades out, new fades in
      this.outgoingEmitter?.destroy(); // Cancel any in-progress transition
      this.outgoingEmitter = this.activeEmitter;
      this.activeEmitter = newEmitter;

      if (this.outgoingEmitter) {
        this.scene.tweens.add({
          targets: this.outgoingEmitter,
          alpha: 0,
          duration: 3000,
          ease: 'Linear',
          onComplete: () => {
            this.outgoingEmitter?.destroy();
            this.outgoingEmitter = null;
          }
        });
      }

      if (this.activeEmitter) {
        this.activeEmitter.setAlpha(0);
        this.scene.tweens.add({
          targets: this.activeEmitter,
          alpha: 1,
          duration: 3000,
          ease: 'Linear',
        });
      }
    }

    // Restart intensity cycle for the new biome
    this.startIntensityCycle(biome);
  }

  destroy(): void {
    this.intensityCycleTimer?.remove();
    this.activeEmitter?.destroy();
    this.outgoingEmitter?.destroy();
    this.activeEmitter = null;
    this.outgoingEmitter = null;
  }
}
```

### Pattern 2: Pixel Texture in PreloadScene

**What:** Bake a 4x4 white pixel texture in PreloadScene. Emitters tint it per-biome via the `tint` config.

**When to use:** Once, in PreloadScene, before WorldScene starts.

```typescript
// In PreloadScene.create() or a createFallbackSprites() method
const g = this.add.graphics();
g.fillStyle(0xffffff);
g.fillRect(0, 0, 4, 4);
g.generateTexture('weather-pixel', 4, 4);
g.destroy();
```

### Pattern 3: Viewport-Fixed Emitter Positioning

**What:** ParticleEmitter placed at viewport origin with `setScrollFactor(0)`, using an emit zone spanning the full canvas. As camera moves, particles stay screen-fixed.

```typescript
// Source: Phaser 3.90.0 ParticleEmitterFactory.js + ParticleEmitter.js component mixins
const { width, height } = this.scene.scale;

const emitter = this.scene.add.particles(0, 0, 'weather-pixel', {
  emitZone: {
    type: 'random',
    source: new Phaser.Geom.Rectangle(0, -height * 0.1, width, height * 0.1),
  },
  speedY: { min: 80, max: 200 },
  speedX: { min: -20, max: 20 },
  lifespan: 3000,
  quantity: 3,
  tint: 0xaaddff,       // biome-specific
  scaleX: 0.5,          // 2px at native texture size 4px
  scaleY: 0.75,         // 3px
  alpha: { start: 0.8, end: 0.2 },
  gravityY: 0,
});
emitter.setScrollFactor(0);   // Viewport-fixed — confirmed via ScrollFactor mixin (v3.90.0)
emitter.setDepth(500);         // Above terrain (~0-99999 world depth), below ZoneHUD (1000)
```

**Key insight:** Emit zone is defined in screen space because scrollFactor is 0 — the zone coords are relative to the viewport, not the world.

### Pattern 4: Intensity Ramping via Tween on Proxy

**What:** Ramp quantity between tiers smoothly by tweening a proxy object's value and applying it to the emitter each frame.

```typescript
// Smooth quantity ramp without per-frame setQuantity spam
const proxy = { q: this.activeEmitter.quantity };
this.scene.tweens.add({
  targets: proxy,
  q: targetQuantity,
  duration: 8000,
  ease: 'Linear',
  onUpdate: () => {
    this.activeEmitter?.setQuantity(Math.round(proxy.q));
  }
});
```

**Alternative:** Set `frequency` on the emitter. Lower frequency = more particles per unit time. Both quantity and frequency can be set dynamically.

### Pattern 5: Intensity Cycle Scheduling (Client-Side, Deterministic Seed)

**What:** Use a deterministic seed from zoneId + day-aligned timestamp so all players in the same zone see the same intensity at the same time, without network traffic.

```typescript
// Deterministic pseudo-random seed based on zoneId + current 5-minute window
function getIntensitySeed(zoneId: string): number {
  const windowMs = 5 * 60 * 1000;
  const window = Math.floor(Date.now() / windowMs);
  let h = 0;
  for (const c of zoneId) h = ((h << 5) - h + c.charCodeAt(0)) | 0;
  return Math.abs(h ^ window);
}
```

This satisfies "server-synced cycles" without any new socket events.

### Anti-Patterns to Avoid

- **Creating emitters in the world camera space with scrollFactor 1 and trying to follow the camera:** Breaks viewport-relative requirement and is expensive. Use scrollFactor 0 always for weather.
- **Calling `emitter.stop()` alone for cleanup:** `stop()` leaves particles alive until lifespan expires. For chunk unload cleanup, call `emitter.destroy()` to immediately remove all particles from memory.
- **Not canceling the outgoing tween before creating a new one:** Rapid biome crossing leaves multiple tweens targeting the same emitter. Always cancel/complete existing transition tweens before starting a new one.
- **Spawning particles from a world position:** Since scrollFactor is 0, the emit zone must use screen coords (0,0 to width,height). Passing world coordinates will misplace particles relative to viewport.
- **Using `maxParticles` without `maxAliveParticles`:** For continuous emitters, set `maxAliveParticles` to cap memory usage, not `maxParticles` (which stops emitter after N total).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Pixel particle texture | Custom sprite sheets | `graphics.generateTexture('weather-pixel', 4, 4)` | Already the pattern in PreloadScene; no external assets needed |
| Crossfade timing | Manual `update()` lerp | `scene.tweens.add({ alpha, duration })` | Phaser tweens are already used in WorldScene for entity fade-in |
| Viewport coverage zone | Custom emit logic | `Phaser.Geom.Rectangle(0, -height*0.1, width, height*0.1)` as emitZone | Built-in rectangle zone for random point emission |
| Intensity timer | `setInterval` / `setTimeout` | `scene.time.addEvent({ delay, callback, loop: false })` | Phaser's time manager pauses correctly with scene; `setInterval` does not |

**Key insight:** Every requirement maps to existing Phaser built-ins. No custom WebGL or canvas manipulation needed.

---

## Common Pitfalls

### Pitfall 1: EmitZone Ignores ScrollFactor → Particles Appear in Wrong Place

**What goes wrong:** Developer sets emitZone source to world coordinates, then sets scrollFactor(0). Particles emit from world origin (usually top-left of the map, far off screen), not the viewport.

**Why it happens:** EmitZone coordinates are in the emitter's local space. With scrollFactor=0, the emitter's position is in screen space. The zone must also use screen-space coordinates.

**How to avoid:** Always define emitZone with `source: new Phaser.Geom.Rectangle(0, 0, width, height)` using `this.scene.scale.width/height`. Do not use world coordinates for the source.

**Warning signs:** Particles invisible even though emitter is active and `alpha > 0`.

### Pitfall 2: Canvas Resize Leaves Emitters Clipped

**What goes wrong:** The game uses `Phaser.Scale.RESIZE` mode (Game.ts line 19). The emitZone rectangle is baked at creation time. If the window resizes, particles only cover the original canvas size.

**Why it happens:** The emitZone source object is not reactive to scale changes.

**How to avoid:** Listen to `this.scene.scale.on('resize', ...)` and call `emitter.setEmitZone(...)` with updated dimensions when a resize event fires.

**Warning signs:** Particles appear only in top-left portion of canvas after browser window resize.

### Pitfall 3: Multiple Tweens on Same Emitter During Rapid Biome Crossings

**What goes wrong:** Player rapidly crosses 3 biome boundaries. Each `setBiome()` call adds a new tween targeting the same outgoing emitter. All tweens run simultaneously, fighting each other.

**Why it happens:** `scene.tweens.add()` does not automatically kill existing tweens on the same target.

**How to avoid:** Before starting a new crossfade, call `scene.tweens.killTweensOf(outgoingEmitter)` then `outgoingEmitter.destroy()`. Then start fresh. The CONTEXT.md decision says "cancel current transition immediately, start new transition to latest biome."

**Warning signs:** Emitters persist longer than 3 seconds; alpha flickers.

### Pitfall 4: `emitter.stop()` Does Not Free Memory

**What goes wrong:** On chunk unload (`unloadChunkContainer`), developer calls `emitter.stop()`. Existing particles live out their lifespan (up to 3-5 seconds). Memory is not freed during that window.

**Why it happens:** `stop(false)` (default) stops new emission but lets alive particles expire naturally.

**How to avoid:** Call `emitter.stop(true)` (kills all immediately) or `emitter.destroy()` (removes from scene and pool). For chunk unload, use `destroy()`.

**Warning signs:** Memory grows after each zone transition. Detectable via browser heap profiler.

### Pitfall 5: Intensity Tween Targets Destroyed Emitter

**What goes wrong:** A quantity-ramp tween is running when `setBiome()` fires. The tween's `onUpdate` callback calls `this.activeEmitter.setQuantity(...)` but `this.activeEmitter` was replaced by the new emitter.

**Why it happens:** Closure captures `this.activeEmitter` by reference to the WeatherSystem property, not the emitter instance at tween creation time.

**How to avoid:** Capture the emitter instance in a local variable at tween creation: `const emitter = this.activeEmitter; ... onUpdate: () => emitter.setQuantity(...)`. Cancel the tween with `scene.tweens.killTweensOf(proxy)` before replacing `activeEmitter`.

---

## Code Examples

### Create Viewport-Fixed Particle Emitter

```typescript
// Source: Phaser 3.90.0 ParticleEmitter.js + ParticleEmitterFactory.js (verified from source)
// setScrollFactor is a direct mixin on ParticleEmitter (line 349 of ParticleEmitter.js)

const { width, height } = this.scene.scale;

const emitter = this.scene.add.particles(0, 0, 'weather-pixel', {
  emitZone: {
    type: 'random',
    source: new Phaser.Geom.Rectangle(0, -(height * 0.15), width, height * 0.15),
  },
  speedY: { min: 80, max: 200 },
  speedX: { min: -15, max: 15 },
  lifespan: 4000,
  quantity: 4,
  tint: 0xaaddff,
  scaleX: 0.5,   // results in 2px from 4px texture
  scaleY: 1.0,   // results in 4px tall
  alpha: { start: 0.9, end: 0.1 },
  frequency: 50, // ms between batches
});

emitter.setScrollFactor(0);  // Viewport-fixed
emitter.setDepth(500);        // Below ZoneHUD (1000), above terrain (variable world-space depth)
```

### Crossfade Between Two Emitters

```typescript
// Source: Phaser 3.90.0 tweens API (verified from WorldScene.ts existing usage at line 1444)
// scene.tweens.add confirmed working pattern in this codebase

// Start outgoing fade
scene.tweens.killTweensOf(outgoingEmitter);
scene.tweens.add({
  targets: outgoingEmitter,
  alpha: 0,
  duration: 3000,
  ease: 'Linear',
  onComplete: () => { outgoingEmitter.destroy(); }
});

// Start incoming fade
const incoming = createEmitter(newConfig);
incoming.setAlpha(0);
scene.tweens.add({
  targets: incoming,
  alpha: 1,
  duration: 3000,
  ease: 'Linear',
});
```

### Bake Pixel Particle Texture (PreloadScene)

```typescript
// Source: PreloadScene.ts existing pattern (lines 396-416), verified in codebase
// Add to PreloadScene's generateFallbackTextures() method

const g = this.add.graphics();
g.fillStyle(0xffffff, 1);
g.fillRect(0, 0, 4, 4);
g.generateTexture('weather-pixel', 4, 4);
g.destroy();
```

### Handle Resize

```typescript
// In WeatherSystem constructor or init
this.scene.scale.on('resize', (gameSize: Phaser.Structs.Size) => {
  const { width, height } = gameSize;
  if (this.activeEmitter) {
    this.activeEmitter.setEmitZone({
      type: 'random',
      source: new Phaser.Geom.Rectangle(0, -(height * 0.15), width, height * 0.15),
    });
  }
});
```

---

## Biome-to-Weather Mapping

Based on world-bible.md lore and CONTEXT.md decisions. This is Claude's discretion within the thematic constraint:

| BiomeType | Lore Name | Tier | Weather Type | Tint Color | Notes |
|-----------|-----------|------|-------------|------------|-------|
| void_plains | Void Plains | I | mist | 0x4a4a6e | Thin void mist, blue-purple |
| fungal_forest | Luminous Canopy | I | spores | 0x9370db | Purple bioluminescent spores |
| tidal_pools | Coastal Shallows | I | mist | 0x5f9ea0 | Sea spray, teal mist |
| ancient_ruins | Scarred Badlands | I | ash | 0x8b7355 | Drifting dust/sand |
| toxic_wastes | — | II | spores | 0x9acd32 | Toxic green chemical droplets |
| miasma_marshes | Miasma Marshes | II | mist | 0x6b8e23 | Heavy green toxic haze |
| petrified_expanse | Petrified Expanse | II | ash | 0xa9a9a9 | Stone/mineral dust motes |
| bioluminescent_depths | — | II | spores | 0x00ff88 | Glowing bioluminescent particles |
| kelp_forests | — | II | mist | 0x228b22 | Underwater particulates |
| volcanic_ridge | Volcanic Reaches | III | ash | 0xff4500 | Hot orange-red ash fall |
| crystal_caves | Crystalline Wastes | III | snow | 0x6ac8ee | Crystal shards/glitter |
| crystalline_wastes | Crystalline Wastes | III | snow | 0xb0e0e6 | Crystal shard precipitation |
| frozen_expanse | Frozen Reaches | III | snow | 0xb0e0e6 | White snow fall |
| deep_trenches | — | III | mist | 0x191970 | Pressure bubbles/dark particulates |
| starfall_crater | Fungal Depths | III | ash | 0x191970 | Cosmic debris, dark with starfall tint |
| void_rift | Anomaly Zones | IV | void_energy | 0x4a0080 | Void shards, reality distortion fragments |

**Intensity particle counts (quantity per emit cycle):**

| Tier | Light | Moderate | Heavy |
|------|-------|----------|-------|
| Tier I biomes | 1 | 2 | 4 |
| Tier II biomes | 2 | 4 | 8 |
| Tier III biomes | 3 | 6 | 12 |
| Tier IV (void_rift) | 4 | 8 | 16 |

**Intensity volatility (time per tier before changing):**

| BiomeTier | Cycle range | Heavy tier frequency |
|-----------|-------------|---------------------|
| I | 3-5 min | Rare (~10%) |
| II | 2-4 min | Occasional (~25%) |
| III | 1-3 min | Frequent (~40%) |
| IV | 0.5-2 min | Very frequent (~60%) |

---

## Integration Points in WorldScene

Two places require calling `weatherSystem.setBiome(biome, instant)`:

**1. `commitZoneTransition(newZoneId, biome)` (line 1021) — gradual biome cross:**
```typescript
// Add after this.currentBiome = chunk.biome (line 1033)
this.weatherSystem?.setBiome(chunk.biome, false); // crossfade
```

**2. `fullZoneReset(newZoneId, biome)` (line 1147) — teleport:**
```typescript
// Add after this.currentBiome = biome (line 1188)
this.weatherSystem?.setBiome(biome, true); // instant
```

**3. WorldScene.create() — initialization:**
```typescript
// Add after ZoneHUD init
this.weatherSystem = new WeatherSystem(this);
// Do NOT call setBiome yet — wait for first zone:state event
```

**4. WorldScene shutdown — cleanup:**
```typescript
// In scene's shutdown or destroy event
this.weatherSystem?.destroy();
```

Also: `minimapCamera.ignore([weatherEmitter])` must be called to prevent weather from appearing on minimap. Get the emitter from `WeatherSystem.getActiveEmitter()` accessor.

---

## Depth Budget Analysis

Current depth values in the scene:

| Layer | Depth | Notes |
|-------|-------|-------|
| Terrain tiles | ~0 to ~99000 | World-space depth (screenY based). Tiles at large world coords reach high values. |
| Entities | World-space | Same depth system as terrain |
| POI markers | 800 + worldY | `PoiRenderer.ts` line 6 |
| Minimap player indicator | 1001 | `MinimapCamera.ts` line 43 |
| ZoneHUD (zone name, tier) | 1000 | `ZoneHUD.ts` lines 25, 36 |
| Tile info popup | 2000 | `WorldScene.ts` line 521 |
| **Weather particles (target)** | **500** | Below ZoneHUD (1000), above POI (800 - conflict!) |

**Depth conflict resolution:** Weather depth 500 will render BELOW POI markers (depth 800+worldY). At typical world positions, POI worldY is always > 300, so POI markers always > 1100 depth. Weather at 500 is safely below POI markers. This is correct — weather should be behind POI markers.

**Revised recommendation:** Set weather depth to **500**. This places weather:
- Below ZoneHUD at 1000 (correct — weather is "in-game", HUD floats above)
- Below POI markers (correct)
- Above all terrain/entity world-depth values only if terrain is at depth < 500 (terrain near origin will be behind weather — acceptable, as player always near origin)

Actually: terrain tiles use `isoTransform.calculateDepth(worldX, worldY, elevation)` which returns `worldY * 100 + worldX + elevation * 10000`. Near the camera's current position, terrain depth can easily exceed 500. Weather at depth 500 would render BEHIND terrain.

**Correct depth for weather: use depth 9000.** This is above all terrain (max terrain depth for a typical 3x3 chunk view is around ~5000-8000 for far tiles) but below ZoneHUD (10000 range) and below React HUD (DOM layer, not Phaser). The React HUD panels (z-index 100-10000) are DOM elements that sit on top of the Phaser canvas entirely, so Phaser depth values do not conflict with them.

Actually, tile depth calculation: `calculateDepth(x, y, elev) = y * 100 + x + elev * 10000`. At a world position of say (100, 80) with elevation 0: depth = 8000 + 100 = 8100. So terrain can reach 8000+.

**Final weather depth recommendation: 9500** — safely above max expected terrain depth (~8100 in a 3x3 chunk view around origin + tile count of ZONE_SIZE ~32), below Phaser in-game UI elements at depth 10000+.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| ParticleEmitterManager (wrap emitters) | Direct ParticleEmitter via `this.add.particles()` | Phaser 3.60 | No Manager needed; emitter IS the game object |
| Separate WeatherScene layer | setScrollFactor(0) on emitter in WorldScene | Phaser 3.60+ | Simpler; no scene communication needed |

**Deprecated/outdated:**
- `this.add.particles(key)` returning a ParticleEmitterManager: Removed in Phaser 3.60. `this.add.particles(x, y, texture, config)` now returns a ParticleEmitter directly.

---

## Open Questions

1. **Depth value for weather particles vs. deep terrain**
   - What we know: Terrain uses `y * 100 + x + elev * 10000`. Maximum depth in view can be significant for elevated tiles.
   - What's unclear: Exact max depth value for the current ZONE_SIZE=32 world during play (3x3 chunks of 32x32 tiles).
   - Recommendation: Use depth 9500. If visual artifacts appear (weather behind terrain), increase to 95000 during implementation.

2. **Weather emitter and minimap camera**
   - What we know: MinimapCamera calls `this.minimapCamera.ignore(this.zoneHUD.getGameObjects())` at create time.
   - What's unclear: Whether weather should appear in minimap or be ignored.
   - Recommendation: Ignore weather emitters in minimap camera (weather is viewport-relative at depth 9500; would appear incorrectly in minimap's world-view camera).

3. **Canvas resize handling**
   - What we know: Game uses `Phaser.Scale.RESIZE` mode.
   - What's unclear: How frequently resize events fire in practice; whether re-creating the emitZone is expensive.
   - Recommendation: Handle resize but debounce it. Simply update the emitZone source dimensions — no need to destroy/recreate the emitter.

4. **"void_energy" particle behavior for void_rift**
   - What we know: Should feel "alien/otherworldly — reality distortion, void energy, not natural precipitation"
   - What's unclear: Exact movement pattern (sideways? chaotic? reverse gravity?)
   - Recommendation: Use random speed/direction with both positive and negative gravityY, random rotation enabled. Makes particles drift chaotically in all directions. Bright purple/white tint.

---

## Validation Architecture

*nyquist_validation is false in .planning/config.json — skipping this section.*

---

## Sources

### Primary (HIGH confidence)

- Phaser 3.90.0 source — `/node_modules/phaser/src/gameobjects/particles/ParticleEmitter.js` — Mixins confirmed: ScrollFactor (line 349), Depth (line 345), AlphaSingle (line 343). `start()` at line 2371, `stop()` at line 2413, `destroy()` inherited from GameObject.
- Phaser 3.90.0 source — `/node_modules/phaser/src/gameobjects/particles/ParticleEmitterFactory.js` — `this.add.particles(x, y, texture, config)` returns `ParticleEmitter` directly (no Manager).
- Phaser 3.90.0 source — `/node_modules/phaser/src/gameobjects/particles/typedefs/ParticleEmitterConfig.js` — Complete config properties: `tint`, `quantity`, `frequency`, `lifespan`, `speedX`, `speedY`, `alpha`, `emitZone` confirmed.
- Codebase — `apps/web/src/game/scenes/PreloadScene.ts` (lines 396-416) — `graphics.generateTexture()` pattern confirmed working.
- Codebase — `apps/web/src/game/scenes/WorldScene.ts` (line 1444) — `tweens.add({ targets, alpha, duration })` confirmed working.
- Codebase — `apps/web/src/game/scenes/WorldScene.ts` (lines 1021, 1147) — `commitZoneTransition()` and `fullZoneReset()` confirmed as the two hooks.
- Codebase — `packages/shared-types/src/game/biome.ts` — All 16 BiomeTypes, BIOME_COLORS, BIOME_TIERS confirmed.
- Codebase — `apps/web/src/game/Game.ts` (line 19) — `Phaser.Scale.RESIZE` mode confirmed.
- Codebase — `lore/world-bible.md` — Biome descriptions used for weather thematic mapping.

### Secondary (MEDIUM confidence)

- STATE.md — "Particle emitters registered in Map<zoneId, emitter[]> for cleanup on chunk unload" — pre-existing architectural decision to follow.
- STATE.md — "Both commitZoneTransition() and fullZoneReset() must call weather/atmosphere setBiome() hooks" — integration point confirmed.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified from installed Phaser 3.90.0 source (not 3.80 as specified in package.json — actual installed version is higher)
- Architecture: HIGH — all patterns verified against actual codebase files
- Pitfalls: HIGH — derived from actual source code of Phaser emitter and existing codebase patterns
- Biome mapping: MEDIUM — weather types are Claude's discretion per CONTEXT.md; lore-grounded but creative

**Research date:** 2026-03-17
**Valid until:** 2026-04-17 (Phaser is stable; codebase is local)
