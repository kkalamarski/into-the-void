# Phase 129: Biome Atmospheric Effects - Research

**Researched:** 2026-03-17
**Domain:** Phaser 3.90 postFX ColorMatrix coordination — biome atmospheric overlays
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Biome-to-atmosphere mapping:**
- 6 shared effect types, each biome assigned one with unique color/intensity:
  - FOG: frozen_expanse, deep_trenches, tidal_pools
  - GLOW: fungal_forest, bioluminescent_depths, kelp_forests
  - HAZE: volcanic_ridge, miasma_marshes, toxic_wastes
  - MURK: crystal_caves, petrified_expanse, ancient_ruins
  - SHIMMER: void_rift, starfall_crater, crystalline_wastes
  - CLEAR: void_plains
- Atmosphere color derived from existing `BIOME_COLORS` hex values in `shared-types/src/game/biome.ts`

**Effect intensity & visibility:**
- Subtle mood layer — noticeable when crossing biomes but not dominating the view
- Intensity scales with biome tier: Tier I lightest, Tier IV most dramatic
- Purely cosmetic — no gameplay impact on visibility of terrain or entities
- void_plains (CLEAR) gets a very faint neutral grey-blue wash — just enough that transitioning FROM another biome creates a visible "clearing" moment

**Day/night interaction:**
- Atmospheres are modulated by the day/night cycle, not constant
- Per-effect-type modulation direction (lore-driven):
  - FOG: thicker at night/dawn
  - GLOW: brighter at night (partially counters night dimming)
  - HAZE: strongest at day/noon
  - MURK: darker at night
  - SHIMMER: shifts hue at dusk/dawn
  - CLEAR: unchanged
- Glow biomes at night are relatively brighter than non-glow biomes but still visibly darker than day

**Transition behavior:**
- Walk transitions: ~3 second cross-fade (matches Phase 127 weather transition duration)
- Teleport transitions: brief ~0.5-1s fade from old atmosphere to new (no bleed-through)
- Atmosphere snaps to player's current biome tile — no blend zone at boundaries
- Rapid biome crossings: always cancel in-progress transition and start new one to current biome (no queuing)

### Claude's Discretion
- Technical approach for coordinating atmosphere and day/night ColorMatrix (shared instance vs. separate postFX stages)
- Exact intensity values per biome tier
- Easing curves for cross-fade transitions
- How to detect current biome from player position for atmosphere changes

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ATMO-01 | Each biome has a distinct atmospheric visual effect (fog, glow, haze, murk, etc.) | BiomeAtmosphereConfig table (16 biomes × 6 effect types) using BIOME_COLORS; ColorMatrix manipulation strategies per effect type documented below |
| ATMO-02 | Atmosphere transitions smoothly between biomes (no hard seams) | Cross-fade tween pattern mirrors WeatherSystem.setBiome() crossfade — store `currentAtmosphere`, tween `atmosphereAlpha` 0→1 over 3000ms via `scene.tweens.add()` |
| ATMO-03 | Atmosphere effects apply to both zone-walk and teleport transitions | Walk = crossfade (instant:false), Teleport = instant swap (instant:true) matching WeatherSystem pattern; both commitZoneTransition() and fullZoneReset() hook sites already established |
| ATMO-04 | Atmosphere uses camera postFX shared with day/night (coordinated, not conflicting) | Single ColorMatrix shared instance; DayNightCycle.update() calls AtmosphereSystem.applyToMatrix(colorMatrix, dayProgress) as post-step — atmosphere modifies the same matrix AFTER day/night writes via multiply:true |
</phase_requirements>

---

## Summary

Phase 129 adds biome-specific atmospheric color overlays (fog, glow, haze, murk, shimmer, clear) that modulate with the day/night cycle and cross-fade smoothly on biome transitions. The core technical challenge is coordinating two systems — `DayNightCycle` and a new `AtmosphereSystem` — that both need to write to the same `Phaser.FX.ColorMatrix` on `cameras.main.postFX` without conflicting.

The existing `DayNightCycle` already owns the single `camera.postFX.addColorMatrix()` instance and resets it every frame before writing brightness and color temperature. The cleanest coordination approach is to have `DayNightCycle` call into `AtmosphereSystem.applyToMatrix(colorMatrix, cycleProgress)` as the last step of its per-frame update, letting the atmosphere system apply its color channel offsets using the `multiply: true` parameter on the existing matrix. This avoids FX stacking (ATMO-04), prevents `clear()` from breaking either system, and keeps the single-matrix pipeline intact.

Transition logic mirrors the established `WeatherSystem` pattern exactly: store active and outgoing atmosphere configs, tween an `atmosphereAlpha` proxy value (0–1) between them over 3000ms for walk transitions, or 750ms for teleport. Integration hooks are already present in `commitZoneTransition()` (walk) and `fullZoneReset()` (teleport) in `WorldScene.ts`.

**Primary recommendation:** Implement `AtmosphereSystem` as a self-contained class that holds atmosphere state and exposes `applyToMatrix(colorMatrix, cycleProgress)`. Modify `DayNightCycle` to accept and call this method at the end of `applyVisuals()`. Wire `AtmosphereSystem.setBiome()` into `WorldScene` at the same two call sites as `WeatherSystem.setBiome()`.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Phaser 3 | 3.90.0 | Game engine — postFX ColorMatrix, tweens | Already in use; camera.postFX.addColorMatrix() is the only camera-level color pipeline |
| TypeScript | project config | Type safety for AtmosphereConfig | Consistent with all other systems |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@into-the-void/shared-types` | workspace | BiomeType, BIOME_COLORS, BIOME_TIERS | Source of truth for biome color values and tier classification |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Single shared ColorMatrix (recommended) | Two separate ColorMatrix effects stacked | Stacking causes multiplicative doubling of brightness; reset ordering is fragile |
| Single shared ColorMatrix (recommended) | Full-screen Graphics overlay with alpha/tint | No postFX dependency; simpler but adds a draw call and doesn't interact with the day/night matrix |
| Tween on atmosphereAlpha proxy object | Direct tween on ColorMatrix properties | ColorMatrix has no single `alpha` property to tween; proxy pattern matches WeatherSystem |

**Installation:** No new packages required.

---

## Architecture Patterns

### Recommended Project Structure

```
apps/web/src/game/systems/
├── DayNightCycle.ts        # Phase 128 — already exists, needs minor modification
├── WeatherSystem.ts        # Phase 127 — reference pattern for transitions
└── AtmosphereSystem.ts     # Phase 129 — new file
```

### Pattern 1: Shared ColorMatrix Coordination

**What:** `DayNightCycle` owns the single `Phaser.FX.ColorMatrix` instance. After writing day/night values (brightness, saturation, channel shifts), it calls `atmosphereSystem.applyToMatrix(colorMatrix, cycleProgress)` which appends atmosphere color offsets using `multiply: true`.

**When to use:** Exactly one ColorMatrix instance exists on `cameras.main.postFX`. Any approach that calls `addColorMatrix()` twice produces two independent pipeline stages that execute sequentially — the second overwrites the first for brightness but compounds saturation effects unpredictably.

**How Phaser FX stacking works (verified from source):**
```
// From FX.js line 380:
// "adding an FX Controller does not remove any existing FX. They all stack-up
//  on-top of each other."
//
// camera.postFX.clear() → destroys ALL effects including DayNightCycle's ColorMatrix
// camera.postFX.remove(fx) → removes one specific controller
```

**Recommended approach — single ColorMatrix, cooperative write:**

```typescript
// In DayNightCycle.ts — modified applyVisuals()
private applyVisuals(progress: number): void {
  if (!this.colorMatrix) return;

  // Reset to identity every frame
  this.colorMatrix.reset();

  // Step 1: Day/night writes brightness + temperature (existing code)
  const visuals = this.getBlendedVisuals(progress);
  this.colorMatrix.brightness(visuals.brightness, false);
  if (visuals.saturation !== 0) {
    this.colorMatrix.saturate(visuals.saturation, true);
  }
  if (visuals.blueShift > 0) {
    const m = this.colorMatrix.getData();
    m[0] -= visuals.blueShift * 0.3;
    m[6] -= visuals.blueShift * 0.1;
    m[12] += visuals.blueShift * 0.15;
  }
  if (visuals.warmShift > 0) {
    const m = this.colorMatrix.getData();
    m[0] += visuals.warmShift * 0.15;
    m[6] += visuals.warmShift * 0.05;
    m[12] -= visuals.warmShift * 0.1;
  }

  // Step 2: Atmosphere writes color offsets on top (new code)
  if (this.atmosphereSystem) {
    this.atmosphereSystem.applyToMatrix(this.colorMatrix, progress);
  }
}

// DayNightCycle.setAtmosphereSystem(system: AtmosphereSystem): void
```

**Why matrix offsets for atmosphere color:**
The ColorMatrix 5×4 layout has an "offset" column (indices 4, 9, 14) that adds constant values to output R, G, B channels. This is the cleanest way to apply a color tint without altering the relative brightness already set by day/night. A fog blue tint → `m[14] += blueOffset * alpha`; a glow green tint → `m[9] += greenOffset * alpha`. These are additive, scale with atmosphere alpha, and don't undo the day/night multiply.

```typescript
// In AtmosphereSystem — applyToMatrix()
applyToMatrix(colorMatrix: Phaser.FX.ColorMatrix, cycleProgress: number): void {
  if (!this.currentConfig) return;

  const alpha = this.atmosphereAlpha; // 0-1 (tweened during transition)
  if (alpha <= 0) return;

  const modulated = this.getModulatedParams(this.currentConfig, cycleProgress);

  // Apply color channel offsets (additive, post day/night)
  // Note: getData() returns the live _data Float32Array — mutations persist
  // until next reset(). Indices 4, 9, 14 are the R/G/B offset columns.
  const m = colorMatrix.getData();
  m[4]  += modulated.rOffset * alpha;   // Red offset
  m[9]  += modulated.gOffset * alpha;   // Green offset
  m[14] += modulated.bOffset * alpha;   // Blue offset

  // Optional: additional brightness modulation for GLOW/MURK effects
  // Applied multiplicatively via the diagonal (indices 0, 6, 12)
  if (modulated.brightnessBoost !== 0) {
    m[0]  += modulated.brightnessBoost * alpha;
    m[6]  += modulated.brightnessBoost * alpha;
    m[12] += modulated.brightnessBoost * alpha;
  }
}
```

**IMPORTANT: `getData()` returns `_data` (a Float32Array copy of `_matrix`).**

From `ColorMatrix.js`:
```javascript
getData: function () {
    var data = this._data;
    if (this._dirty) {
        data.set(this._matrix);
        data[4] /= 255;   // offsets are /255 in getData output!
        data[9] /= 255;
        data[14] /= 255;
        data[19] /= 255;
        this._dirty = false;
    }
    return data;
}
```

The internal `_matrix` stores offsets in 0–255 range. `getData()` divides them by 255 before returning. `DayNightCycle.ts` currently modifies `getData()` output directly (e.g., `m[0] -= blueShift * 0.3`), which works because the renderer uses `_data`. For atmosphere offsets applied to the SAME `getData()` array, values should be in the same post-division scale (0.0–1.0 range). A faint fog tint might add `0.02` to the blue offset column.

### Pattern 2: Atmosphere Cross-Fade Tween

**What:** Mirrors `WeatherSystem.setBiome()` exactly. Store `currentConfig` and `outgoingConfig`. Tween an `atmosphereAlpha` proxy from 0 to 1 for walk transitions, snap for teleport.

```typescript
// AtmosphereSystem.setBiome()
setBiome(biome: BiomeType, instant: boolean = false): void {
  if (biome === this.currentBiome) return;

  const newConfig = ATMOSPHERE_CONFIGS[biome];
  this.currentBiome = biome;

  if (instant) {
    // Cancel outgoing tween
    if (this.transitionTween) {
      this.transitionTween.destroy();
      this.transitionTween = null;
    }
    this.outgoingConfig = null;
    this.outgoingAlpha = 0;
    this.currentConfig = newConfig;
    this.atmosphereAlpha = 1;
    return;
  }

  // Cross-fade: outgoing fades out while incoming fades in
  this.outgoingConfig = this.currentConfig;
  this.outgoingAlpha = this.atmosphereAlpha; // capture current alpha
  this.currentConfig = newConfig;

  // Cancel any in-progress tween (rapid crossing support)
  if (this.transitionTween) {
    this.transitionTween.destroy();
    this.transitionTween = null;
  }
  this.atmosphereAlpha = 0;

  this.transitionTween = this.scene.tweens.add({
    targets: this.alphaProxy,
    value: 1,
    duration: CROSSFADE_MS, // 3000
    ease: 'Sine.easeInOut',
    onUpdate: () => {
      this.atmosphereAlpha = this.alphaProxy.value;
      this.outgoingAlpha = 1 - this.alphaProxy.value;
    },
    onComplete: () => {
      this.outgoingConfig = null;
      this.outgoingAlpha = 0;
      this.transitionTween = null;
    },
  });
}
```

**applyToMatrix handles both current and outgoing configs:**

```typescript
applyToMatrix(colorMatrix: Phaser.FX.ColorMatrix, cycleProgress: number): void {
  const m = colorMatrix.getData();

  // Outgoing atmosphere fading out
  if (this.outgoingConfig && this.outgoingAlpha > 0) {
    const out = this.getModulatedParams(this.outgoingConfig, cycleProgress);
    m[4]  += out.rOffset * this.outgoingAlpha;
    m[9]  += out.gOffset * this.outgoingAlpha;
    m[14] += out.bOffset * this.outgoingAlpha;
    if (out.brightnessBoost !== 0) {
      m[0]  += out.brightnessBoost * this.outgoingAlpha;
      m[6]  += out.brightnessBoost * this.outgoingAlpha;
      m[12] += out.brightnessBoost * this.outgoingAlpha;
    }
  }

  // Incoming atmosphere fading in
  if (this.currentConfig && this.atmosphereAlpha > 0) {
    const cur = this.getModulatedParams(this.currentConfig, cycleProgress);
    m[4]  += cur.rOffset * this.atmosphereAlpha;
    m[9]  += cur.gOffset * this.atmosphereAlpha;
    m[14] += cur.bOffset * this.atmosphereAlpha;
    if (cur.brightnessBoost !== 0) {
      m[0]  += cur.brightnessBoost * this.atmosphereAlpha;
      m[6]  += cur.brightnessBoost * this.atmosphereAlpha;
      m[12] += cur.brightnessBoost * this.atmosphereAlpha;
    }
  }
}
```

### Pattern 3: Day/Night Modulation of Atmosphere

**What:** Each effect type responds differently to the day/night cycle. `getModulatedParams()` takes the current `cycleProgress` (0–1, the same value DayNightCycle uses internally) and returns per-type adjusted params.

```typescript
interface AtmosphereParams {
  rOffset: number;
  gOffset: number;
  bOffset: number;
  brightnessBoost: number; // positive = lighter, negative = darker
}

function getModulatedParams(config: BiomeAtmosphereConfig, cycleProgress: number): AtmosphereParams {
  // cycleProgress 0.0=Dawn, 0.1-0.5=Day, 0.5-0.6=Dusk, 0.6-1.0=Night
  const isNight   = cycleProgress >= 0.6;
  const isDawn    = cycleProgress < 0.1;
  const isDusk    = cycleProgress >= 0.5 && cycleProgress < 0.6;
  const isDayPeak = cycleProgress >= 0.25 && cycleProgress < 0.45; // mid-day

  // nightFactor: 0 at Day peak, 1 at Night peak (smooth)
  const nightFactor = smoothStep(isNight ? (cycleProgress - 0.6) / 0.4 : isDawn ? (0.1 - cycleProgress) / 0.1 : 0);
  const dayFactor   = smoothStep(isDayPeak ? (cycleProgress - 0.25) / 0.2 : 0);
  const dawnDuskFactor = smoothStep(isDawn ? 1 : isDusk ? 1 : 0);

  switch (config.effectType) {
    case 'fog':
      // Fog thickens at night/dawn — boost blue and reduce all channels slightly
      return {
        rOffset: config.rOffset * (1 + nightFactor * 0.3),
        gOffset: config.gOffset * (1 + nightFactor * 0.3),
        bOffset: config.bOffset * (1 + nightFactor * 0.5),
        brightnessBoost: config.brightnessBoost - nightFactor * 0.05,
      };
    case 'glow':
      // Glow brightens at night (partial bioluminescence compensation)
      return {
        rOffset: config.rOffset,
        gOffset: config.gOffset * (1 + nightFactor * 0.4),
        bOffset: config.bOffset * (1 + nightFactor * 0.4),
        brightnessBoost: config.brightnessBoost + nightFactor * 0.1,
      };
    case 'haze':
      // Haze strongest at noon
      return {
        rOffset: config.rOffset * (1 + dayFactor * 0.4),
        gOffset: config.gOffset * (1 + dayFactor * 0.2),
        bOffset: config.bOffset,
        brightnessBoost: config.brightnessBoost + dayFactor * 0.05,
      };
    case 'murk':
      // Murk darkens at night
      return {
        rOffset: config.rOffset,
        gOffset: config.gOffset,
        bOffset: config.bOffset,
        brightnessBoost: config.brightnessBoost - nightFactor * 0.08,
      };
    case 'shimmer':
      // Shimmer shifts hue at dusk/dawn — redistribute offsets
      return {
        rOffset: config.rOffset * (1 + dawnDuskFactor * 0.3),
        gOffset: config.gOffset,
        bOffset: config.bOffset * (1 - dawnDuskFactor * 0.2),
        brightnessBoost: config.brightnessBoost,
      };
    case 'clear':
      // Clear unchanged
      return { ...config, brightnessBoost: config.brightnessBoost };
  }
}
```

### Pattern 4: BiomeAtmosphereConfig Table

**What:** Static config per biome. Colors derived from `BIOME_COLORS` (hex strings from shared-types). Offsets are in getData()-scale (0.0–1.0 range after /255 normalization).

```typescript
export type AtmosphereEffectType = 'fog' | 'glow' | 'haze' | 'murk' | 'shimmer' | 'clear';

export interface BiomeAtmosphereConfig {
  effectType: AtmosphereEffectType;
  rOffset: number;     // Red channel additive offset (getData scale: 0.0-1.0)
  gOffset: number;     // Green channel additive offset
  bOffset: number;     // Blue channel additive offset
  brightnessBoost: number; // Additive diagonal modifier (positive=lighter, negative=darker)
}

// Tier intensity multipliers (Tier I = lightest, Tier IV = strongest)
const TIER_INTENSITY: Record<1|2|3|4, number> = {
  1: 0.04,
  2: 0.07,
  3: 0.10,
  4: 0.15,
};
```

**Biome → Config mapping (values are planning estimates — exact tuning in implementation):**

| Biome | Effect | Primary Color (from BIOME_COLORS) | Tier | Base Intensity |
|-------|--------|-----------------------------------|------|----------------|
| void_plains | clear | #4a4a5a → faint grey-blue | 1 | 0.02 (nearly invisible) |
| frozen_expanse | fog | #b0e0e6 → pale cyan-blue fog | 3 | 0.10 |
| deep_trenches | fog | #191970 → midnight blue fog | 3 | 0.10 |
| tidal_pools | fog | #5f9ea0 → cadet blue mist | 1 | 0.04 |
| fungal_forest | glow | #9370db → soft purple glow | 1 | 0.04 |
| bioluminescent_depths | glow | #00ff88 → bright cyan-green glow | 2 | 0.07 |
| kelp_forests | glow | #228b22 → forest green glow | 2 | 0.07 |
| volcanic_ridge | haze | #ff4500 → orange-red haze | 3 | 0.10 |
| miasma_marshes | haze | #6b8e23 → olive-green haze | 2 | 0.07 |
| toxic_wastes | haze | #9acd32 → yellow-green haze | 2 | 0.07 |
| crystal_caves | murk | #7b68ee → medium-slate murk | 3 | 0.10 |
| petrified_expanse | murk | #a9a9a9 → dark grey murk | 2 | 0.07 |
| ancient_ruins | murk | #8b7355 → brown-grey murk | 1 | 0.04 |
| void_rift | shimmer | #4a0080 → deep purple shimmer | 4 | 0.15 |
| starfall_crater | shimmer | #191970 → midnight blue shimmer | 3 | 0.10 |
| crystalline_wastes | shimmer | #b0e0e6 → pale cyan shimmer | 3 | 0.10 |

### Pattern 5: WorldScene Integration

**What:** Wire `AtmosphereSystem.setBiome()` at the same call sites as `WeatherSystem.setBiome()`.

```typescript
// In WorldScene — commitZoneTransition() (walk-in)
// After: this.weatherSystem?.setBiome(chunk.biome, false);
this.atmosphereSystem?.setBiome(chunk.biome, false);

// In WorldScene — fullZoneReset() (teleport)
// After: this.weatherSystem?.setBiome(biome, true);
this.atmosphereSystem?.setBiome(biome, true);

// In WorldScene — renderChunk() first-chunk initialization
// After: this.weatherSystem.setBiome(biome, true);
this.atmosphereSystem?.setBiome(biome, true);
```

`AtmosphereSystem` does NOT need a `destroy()` hook for minimap camera management (unlike `WeatherSystem`) because it operates purely on the ColorMatrix, not on scene game objects.

`AtmosphereSystem.destroy()` should cancel any active tween and null its references.

### Anti-Patterns to Avoid

- **Calling `camera.postFX.clear()` to reset atmosphere:** This destroys DayNightCycle's ColorMatrix. Never call `clear()` — the single ColorMatrix is reset via `colorMatrix.reset()` every frame by DayNightCycle.
- **Adding a second `addColorMatrix()` call for atmosphere:** Creates two pipeline stages that both execute per-frame; the second can't read what the first wrote because each pipeline has its own matrix.
- **Using `camera.setTint()` for atmosphere:** `setTint()` operates on the Camera's own tint property, not postFX. It does not interact with the ColorMatrix at all, so effects don't combine naturally.
- **Queuing atmosphere transitions:** The CONTEXT.md decision is "cancel in-progress transition, start new one to current biome." Never queue; always cancel first.
- **Applying atmosphere brightness in isolation from day/night brightness:** Both write to the same matrix's diagonal. Atmosphere should add `brightnessBoost` to the value DayNightCycle already set (additive on the post-getData array), not multiply again.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cross-fade animation | Manual alpha update in update() loop | `scene.tweens.add({ targets: proxy, value, duration })` | Phaser tween system handles frame-rate independence, easing, and cancellation cleanly |
| Color math for tints | Custom hex-to-rgb parser | Parse BIOME_COLORS hex string with `parseInt(hex.slice(1), 16)` and bitshift | One-liner; already working in WeatherSystem for tint values |
| Smooth step function | Custom curve | Copy DayNightCycle's `smoothStep()` function (Hermite) | Already tested in-project |

**Key insight:** The `scene.tweens.killTweensOf(proxy)` + `scene.tweens.add(...)` pattern for cancelling and restarting transitions is the established pattern in WeatherSystem; reuse it verbatim in AtmosphereSystem.

---

## Common Pitfalls

### Pitfall 1: getData() Mutation Order

**What goes wrong:** `DayNightCycle.applyVisuals()` calls `getData()` to mutate the array directly (for blue/warm shifts). If `AtmosphereSystem.applyToMatrix()` is also called before the next `reset()`, both accumulate on the same `_data` array. This is correct behavior by design — BUT the mutation must happen AFTER `DayNightCycle` writes, not before. If called in reverse order, atmosphere offsets are wiped by `reset()`.

**Why it happens:** `reset()` only resets `_matrix`, then `getData()` re-copies from `_matrix` to `_data`. Any mutations made to `_data` directly survive until the NEXT call to `getData()` after a `reset()`. The sequence must be:
1. `colorMatrix.reset()` (clears `_matrix`, marks dirty)
2. DayNightCycle brightness/saturation calls (writes to `_matrix` via `multiply()`)
3. DayNightCycle blueShift/warmShift calls `getData()` and mutates `_data`
4. AtmosphereSystem calls `getData()` and appends offsets to already-mutated `_data`

**How to avoid:** Always call `atmosphereSystem.applyToMatrix()` as the LAST step inside `DayNightCycle.applyVisuals()`, after all day/night mutations.

**Warning signs:** Atmosphere colors appear 2x stronger than intended (if applied twice per frame) or disappear completely (if applied before `reset()`).

### Pitfall 2: Outgoing Alpha Not Cancelling Properly

**What goes wrong:** Player crosses Biome A → B → A rapidly. The `outgoingConfig` from the first transition (A) is still fading when the second transition back to A starts. The current A becomes the new `currentConfig`, and the outgoing B starts fading. But without explicit cancellation of the first outgoing tween, both tweens update `outgoingAlpha`, causing a conflict.

**Why it happens:** The proxy object pattern requires destroying the tween before assigning new targets.

**How to avoid:**
```typescript
// Always cancel before starting new transition
if (this.transitionTween) {
  this.transitionTween.destroy();
  this.transitionTween = null;
}
```
This matches WeatherSystem's `scene.tweens.killTweensOf(outgoing)` pattern.

### Pitfall 3: Atmosphere Applied to Minimap Camera

**What goes wrong:** If `AtmosphereSystem` were to add a postFX directly to the camera, it might accidentally apply to the minimap camera too.

**Why it happens:** The postFX is on `cameras.main` only (enforced by DayNightCycle). Since AtmosphereSystem operates on the ColorMatrix already attached to `cameras.main`, there's no risk — the minimap camera has no ColorMatrix and receives no atmospheric effect.

**How to avoid:** AtmosphereSystem must never call `camera.postFX.addColorMatrix()` itself. It only receives the ColorMatrix reference passed in from DayNightCycle. This is the key architectural constraint.

### Pitfall 4: Bright Haze at Night + Glow Over-brightening

**What goes wrong:** GLOW effect adds positive brightness to an already-bright day matrix, making biomes like `bioluminescent_depths` look blown out at noon.

**Why it happens:** The day/night matrix sets brightness to 1.0 at noon, then GLOW adds another +0.1 from `brightnessBoost`, exceeding the 1.0 cap on some channels.

**How to avoid:** Cap the `brightnessBoost` for GLOW effect at day — GLOW's brightness boost should only activate at night (when base brightness is 0.45). The `getModulatedParams` function should return `brightnessBoost = 0` for GLOW during Day phase, scaling up only as nightFactor increases.

### Pitfall 5: Teleport Bleed-Through

**What goes wrong:** Player teleports from `volcanic_ridge` (HAZE, strong orange tint) to `void_plains` (CLEAR). A 3-second crossfade means the CLEAR biome starts with visible orange haze for 3 seconds.

**Why it happens:** Using the walk-transition 3000ms crossfade for teleports.

**How to avoid:** The `instant` parameter (750ms vs 3000ms) is already in the API signature. For teleport (`fullZoneReset`), pass `instant: true` which snaps to new atmosphere immediately. The 0.5-1s "brief fade" from CONTEXT.md would be a SHORT tween on the incoming side only (alpha 0→1 over 750ms), not a crossfade of old + new.

---

## Code Examples

### Complete AtmosphereSystem Skeleton

```typescript
// Source: derived from WeatherSystem.ts pattern + ColorMatrix API analysis
import Phaser from 'phaser';
import { BiomeType, BIOME_TIERS } from '@into-the-void/shared-types';
import type { DayNightPhase } from '@into-the-void/shared-types';

export type AtmosphereEffectType = 'fog' | 'glow' | 'haze' | 'murk' | 'shimmer' | 'clear';

interface BiomeAtmosphereConfig {
  effectType: AtmosphereEffectType;
  rOffset: number;
  gOffset: number;
  bOffset: number;
  brightnessBoost: number;
}

const CROSSFADE_MS = 3000;   // walk transition (matches WeatherSystem)
const TELEPORT_FADE_MS = 750; // teleport fade-in

const ATMOSPHERE_CONFIGS: Record<BiomeType, BiomeAtmosphereConfig> = {
  // Planner fills exact values — these are illustrative
  void_plains:            { effectType: 'clear',   rOffset: 0.004, gOffset: 0.004, bOffset: 0.008, brightnessBoost: 0 },
  frozen_expanse:         { effectType: 'fog',      rOffset: 0.01,  gOffset: 0.025, bOffset: 0.04,  brightnessBoost: -0.02 },
  deep_trenches:          { effectType: 'fog',      rOffset: 0.005, gOffset: 0.005, bOffset: 0.04,  brightnessBoost: -0.04 },
  tidal_pools:            { effectType: 'fog',      rOffset: 0.008, gOffset: 0.018, bOffset: 0.02,  brightnessBoost: -0.01 },
  fungal_forest:          { effectType: 'glow',     rOffset: 0.01,  gOffset: 0.005, bOffset: 0.02,  brightnessBoost: 0 },
  bioluminescent_depths:  { effectType: 'glow',     rOffset: 0,     gOffset: 0.03,  bOffset: 0.02,  brightnessBoost: 0 },
  kelp_forests:           { effectType: 'glow',     rOffset: 0.005, gOffset: 0.02,  bOffset: 0.005, brightnessBoost: 0 },
  volcanic_ridge:         { effectType: 'haze',     rOffset: 0.04,  gOffset: 0.01,  bOffset: 0,     brightnessBoost: 0.02 },
  miasma_marshes:         { effectType: 'haze',     rOffset: 0.01,  gOffset: 0.025, bOffset: 0,     brightnessBoost: 0.01 },
  toxic_wastes:           { effectType: 'haze',     rOffset: 0.015, gOffset: 0.03,  bOffset: 0,     brightnessBoost: 0.01 },
  crystal_caves:          { effectType: 'murk',     rOffset: 0.005, gOffset: 0.003, bOffset: 0.02,  brightnessBoost: -0.02 },
  petrified_expanse:      { effectType: 'murk',     rOffset: 0.008, gOffset: 0.008, bOffset: 0.008, brightnessBoost: -0.02 },
  ancient_ruins:          { effectType: 'murk',     rOffset: 0.01,  gOffset: 0.007, bOffset: 0.003, brightnessBoost: -0.01 },
  void_rift:              { effectType: 'shimmer',  rOffset: 0.015, gOffset: 0,     bOffset: 0.04,  brightnessBoost: 0 },
  starfall_crater:        { effectType: 'shimmer',  rOffset: 0.005, gOffset: 0,     bOffset: 0.03,  brightnessBoost: 0 },
  crystalline_wastes:     { effectType: 'shimmer',  rOffset: 0.01,  gOffset: 0.025, bOffset: 0.025, brightnessBoost: 0 },
};

export class AtmosphereSystem {
  private scene: Phaser.Scene;
  private currentBiome: BiomeType | null = null;
  private currentConfig: BiomeAtmosphereConfig | null = null;
  private outgoingConfig: BiomeAtmosphereConfig | null = null;
  private atmosphereAlpha: number = 1;
  private outgoingAlpha: number = 0;
  private alphaProxy: { value: number } = { value: 1 };
  private transitionTween: Phaser.Tweens.Tween | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  setBiome(biome: BiomeType, instant: boolean = false): void {
    if (biome === this.currentBiome) return;
    this.currentBiome = biome;
    const newConfig = ATMOSPHERE_CONFIGS[biome];

    if (this.transitionTween) {
      this.transitionTween.destroy();
      this.transitionTween = null;
    }

    if (instant) {
      this.outgoingConfig = null;
      this.outgoingAlpha = 0;
      this.currentConfig = newConfig;
      this.atmosphereAlpha = 0;
      this.alphaProxy.value = 0;
      // Brief fade-in from 0 for teleport (not a crossfade)
      this.transitionTween = this.scene.tweens.add({
        targets: this.alphaProxy,
        value: 1,
        duration: TELEPORT_FADE_MS,
        ease: 'Sine.easeOut',
        onUpdate: () => { this.atmosphereAlpha = this.alphaProxy.value; },
        onComplete: () => { this.transitionTween = null; },
      });
      return;
    }

    // Walk cross-fade
    this.outgoingConfig = this.currentConfig;
    this.outgoingAlpha = this.atmosphereAlpha;
    this.currentConfig = newConfig;
    this.atmosphereAlpha = 0;
    this.alphaProxy.value = 0;

    this.transitionTween = this.scene.tweens.add({
      targets: this.alphaProxy,
      value: 1,
      duration: CROSSFADE_MS,
      ease: 'Sine.easeInOut',
      onUpdate: () => {
        this.atmosphereAlpha = this.alphaProxy.value;
        this.outgoingAlpha = 1 - this.alphaProxy.value;
      },
      onComplete: () => {
        this.outgoingConfig = null;
        this.outgoingAlpha = 0;
        this.transitionTween = null;
      },
    });
  }

  /**
   * Called by DayNightCycle.applyVisuals() AFTER all day/night writes.
   * Appends atmosphere color offsets to the already-modified getData() array.
   */
  applyToMatrix(colorMatrix: Phaser.FX.ColorMatrix, cycleProgress: number): void {
    // getData() returns _data — mutations accumulate until next reset()
    const m = colorMatrix.getData();

    if (this.outgoingConfig && this.outgoingAlpha > 0) {
      this.writeAtmosphere(m, this.outgoingConfig, cycleProgress, this.outgoingAlpha);
    }
    if (this.currentConfig && this.atmosphereAlpha > 0) {
      this.writeAtmosphere(m, this.currentConfig, cycleProgress, this.atmosphereAlpha);
    }
  }

  private writeAtmosphere(
    m: Float32Array,
    config: BiomeAtmosphereConfig,
    cycleProgress: number,
    alpha: number
  ): void {
    const params = this.getModulatedParams(config, cycleProgress);
    m[4]  += params.rOffset * alpha;
    m[9]  += params.gOffset * alpha;
    m[14] += params.bOffset * alpha;
    if (params.brightnessBoost !== 0) {
      m[0]  += params.brightnessBoost * alpha;
      m[6]  += params.brightnessBoost * alpha;
      m[12] += params.brightnessBoost * alpha;
    }
  }

  private getModulatedParams(
    config: BiomeAtmosphereConfig,
    cycleProgress: number
  ): BiomeAtmosphereConfig {
    // See Pattern 3 above for full implementation
    // Planner fills the switch-case per-type modulation
    return config; // placeholder
  }

  destroy(): void {
    if (this.transitionTween) {
      this.transitionTween.destroy();
      this.transitionTween = null;
    }
    this.currentConfig = null;
    this.outgoingConfig = null;
    this.currentBiome = null;
  }
}
```

### DayNightCycle Modification

```typescript
// In DayNightCycle.ts — add atmosphere support
private atmosphereSystem: AtmosphereSystem | null = null;

setAtmosphereSystem(system: AtmosphereSystem): void {
  this.atmosphereSystem = system;
}

// In applyVisuals() — add as LAST line, after all other mutations:
if (this.atmosphereSystem) {
  this.atmosphereSystem.applyToMatrix(this.colorMatrix, progress);
}
```

### WorldScene.ts Wiring Pattern

```typescript
// In create() — after dayNightCycle.create():
this.atmosphereSystem = new AtmosphereSystem(this);
this.dayNightCycle.setAtmosphereSystem(this.atmosphereSystem);

// In commitZoneTransition() — after weatherSystem setBiome:
this.atmosphereSystem?.setBiome(chunk.biome, false);

// In fullZoneReset() — after weatherSystem setBiome:
this.atmosphereSystem?.setBiome(biome, true);

// In renderChunk() first-chunk init — after weatherSystem setBiome:
this.atmosphereSystem?.setBiome(biome, true);

// In shutdown/destroy():
this.atmosphereSystem?.destroy();
this.atmosphereSystem = null;
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Per-tile tint for atmosphere | Camera postFX ColorMatrix | Phase 128 decision | Atmosphere affects entire scene uniformly without per-tile overhead |
| Separate overlay Graphics object | ColorMatrix channel offsets | Phase 129 decision | No extra draw call; integrates with day/night naturally |

**Deprecated/outdated:**
- `camera.setTint()` for full-screen color: Works but bypasses postFX pipeline entirely; cannot combine with ColorMatrix effects. Not used in this project.

---

## Open Questions

1. **getData() mutation side effects across frames**
   - What we know: `getData()` copies `_matrix` → `_data` only when `_dirty` is true. After mutation of `_data` directly, `_dirty` remains false until the next `reset()` or matrix operation. So mutations persist in `_data` across the frame but are wiped by `reset()` at the start of next frame.
   - What's unclear: Does Phaser's WebGL pipeline use `_data` or `_matrix` as the shader uniform source? If it copies from `_matrix` before rendering, direct `_data` mutations would have no effect.
   - Recommendation: Verify by testing DayNightCycle's existing blueShift code (which currently mutates `getData()` output). If it works (and Phase 128 passed), the approach is confirmed valid. Flag for quick smoke test on first implementation task.

2. **SHIMMER hue-shift implementation**
   - What we know: SHIMMER biomes (void_rift, starfall_crater, crystalline_wastes) should "shift hue at dusk/dawn." True hue rotation requires the full Hermite-matrix `hue(rotation, multiply)` method.
   - What's unclear: Whether a simple red-channel boost + blue-channel reduction at dusk/dawn achieves the desired "shimmer" without calling `colorMatrix.hue()` which would conflict with the day/night matrix state (since `hue()` calls `multiply()` which writes to `_matrix`, not `_data`).
   - Recommendation: Start with offset-only implementation (simpler, consistent). Add `hue()` only if the visual result is unsatisfactory. If using `hue()`, it must be called before DayNightCycle writes and use `multiply: true` — or refactored into the day/night reset-and-write sequence.

3. **Exact intensity tuning**
   - What we know: Marked as Claude's Discretion. Tier multipliers (Tier I = 0.04, Tier IV = 0.15) are starting estimates.
   - What's unclear: Whether these values produce "noticeable but not dominating" effects across all biomes — especially for CLEAR/void_plains which needs just enough to be visible on transition.
   - Recommendation: Planner should define a single tuning task in implementation that runs the game and adjusts the `BiomeAtmosphereConfig` table values iteratively. No unit test needed — this is visual calibration.

---

## Sources

### Primary (HIGH confidence)
- Phaser 3.90.0 source — `/node_modules/.pnpm/phaser@3.90.0/node_modules/phaser/src/display/ColorMatrix.js` — `getData()`, `reset()`, `multiply()`, `brightness()`, `saturate()`, index layout
- Phaser 3.90.0 source — `/node_modules/.pnpm/phaser@3.90.0/node_modules/phaser/src/gameobjects/components/FX.js` — `addColorMatrix()`, `clear()`, `remove()`, stacking behavior
- Phaser 3.90.0 source — `/node_modules/.pnpm/phaser@3.90.0/node_modules/phaser/src/fx/ColorMatrix.js` — FX controller structure, `active` flag
- Project source — `apps/web/src/game/systems/DayNightCycle.ts` — existing ColorMatrix usage, reset/write pattern
- Project source — `apps/web/src/game/systems/WeatherSystem.ts` — transition pattern, crossfade tween, proxy object
- Project source — `apps/web/src/game/scenes/WorldScene.ts` — integration call sites, `commitZoneTransition()`, `fullZoneReset()`
- Project source — `packages/shared-types/src/game/biome.ts` — `BIOME_COLORS`, `BIOME_TIERS`, all 16 `BiomeType` values
- Project source — `lore/world-bible.md` — atmospheric descriptions for each biome confirming effect type choices
- Project source — `.planning/STATE.md` — "AtmosphereSystem always calls postFX.clear() before re-adding effects" (decision from earlier planning; research OVERRIDES this — do NOT use clear(), use the shared-matrix approach instead)

### Secondary (MEDIUM confidence)
- `.planning/phases/129-biome-atmospheric-effects/129-CONTEXT.md` — user decisions; all locked choices verified against codebase

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Phaser 3.90.0 source verified directly in node_modules; no external dependencies needed
- Architecture: HIGH — ColorMatrix API fully read from source; getData() mutation sequence verified; WeatherSystem pattern is in-project reference
- Pitfalls: HIGH — getData()/reset() ordering verified from source code; stacking behavior from FX.js comment confirmed
- Intensity values: LOW — These are planning estimates; visual tuning required during implementation

**Research date:** 2026-03-17
**Valid until:** 2026-04-17 (Phaser API is stable; color matrix math is fundamental)

---

## STATE.md Decision Correction

The STATE.md entry states: `"AtmosphereSystem always calls postFX.clear() before re-adding effects (prevents FX stacking)"` — this is an **incorrect approach** that would destroy DayNightCycle's ColorMatrix. The correct approach is the shared-matrix pattern described in this research. The planner should note this correction and NOT use `postFX.clear()` in the implementation.
