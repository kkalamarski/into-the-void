# Phase 128: Day/Night Cycle - Research

**Researched:** 2026-03-17
**Domain:** Phaser 3 camera postFX, client-side time cycle, HUD integration
**Confidence:** HIGH

## Summary

Phase 128 implements a camera-level day/night cycle with four phases (Dawn, Day, Dusk, Night) over a 20-minute real-time loop. The primary technical approach is Phaser 3's `camera.postFX.addColorMatrix()` API applied to the main camera only, leaving the minimap camera unaffected. Elevation shading (per-tile `setTint`) operates independently of camera-level post-processing, so it remains unaffected by design.

The server provides a global epoch-based time reference on WebSocket connect (`auth:success`). The client derives cycle position via modular arithmetic (`Date.now() % CYCLE_DURATION_MS`) and runs the cycle locally without periodic sync broadcasts. A simple React HUD text label displays the current phase name near the minimap.

**Primary recommendation:** Use `cameras.main.postFX.addColorMatrix()` for brightness/tint changes, derive cycle position from a server-sent epoch offset, and add a `TimeIndicator` React component to the existing HUD.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Full cycle: 20 minutes real time, hardcoded constant
- Four distinct named phases: Dawn, Day, Dusk, Night
- Distribution: Day ~8min, Night ~8min, Dawn ~2min, Dusk ~2min
- Transitions between phases are smooth (eased blending), but each phase has a stable look in its middle
- Duration is a hardcoded constant -- no server config needed
- Day: Neutral -- no tint, full brightness. Biome colors show unmodified
- Dawn/Dusk: Subtle warm tint -- gentle warmth, noticeable but not overpowering. Naturalistic, not cinematic
- Night: ~40-50% brightness with desaturated blue tint -- muted, almost grey-blue. Dark and cold, not stylized
- Elevation shading must remain unaffected -- higher tiles stay relatively brighter than lower tiles at all times
- Simple text label: "Dawn", "Day", "Dusk", "Night"
- Static HUD text color -- no color-coding per phase
- Positioned near the minimap (below or beside it)
- No icons, no progress arcs -- just the phase name
- Global server clock -- one universal time for the entire game world
- Server sends current cycle position on WebSocket connect; client runs locally from there
- No periodic sync broadcasts -- accept slight drift over long sessions
- Cycle keeps running in hubs/safe zones -- time passes everywhere equally
- On login, player sees current global time (could be night)

### Claude's Discretion
- Exact easing curve for phase transitions
- ColorMatrix coefficient values (tune to match the described brightness/tint targets)
- How to derive cycle position from server epoch (modular arithmetic approach)
- Exact pixel placement of the time label relative to minimap

### Deferred Ideas (OUT OF SCOPE)
- None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DNTC-01 | Gradual brightness change over time simulating day/night progression | ColorMatrix brightness coefficient ramped via smooth interpolation in update loop |
| DNTC-02 | Color temperature shifts (warm during day, cool at night) | ColorMatrix saturate + tint adjustments; warm = slight red/orange shift, cool = blue shift |
| DNTC-03 | Day/night uses camera postFX ColorMatrix (not per-tile setTint) | `cameras.main.postFX.addColorMatrix()` applied once, updated per frame; per-tile setTint untouched |
| DNTC-04 | Time-of-day indicator visible in HUD | React `TimeIndicator` component in HUD.tsx, positioned near minimap |
| DNTC-05 | Day/night cycle does not affect minimap camera | Only `cameras.main` gets the ColorMatrix postFX; minimap camera is a separate `cameras.add()` instance |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Phaser | ^3.80.0 | Game framework -- camera postFX pipeline | Already in use, postFX.addColorMatrix() is built-in |
| React | existing | HUD time indicator component | Existing HUD is React-based (HUD.tsx) |

### Supporting
No additional libraries needed. All functionality is built into Phaser 3's camera pipeline and standard TypeScript.

## Architecture Patterns

### Recommended Project Structure
```
apps/web/src/game/systems/DayNightCycle.ts     # Core cycle logic + ColorMatrix management
apps/web/src/ui/hud/TimeIndicator.tsx           # React HUD component
apps/web/src/ui/hud/TimeIndicator.css           # Styles for time label
packages/shared-types/src/game/day-night.ts     # Shared types (DayNightPhase, cycle constants)
```

### Pattern 1: Camera PostFX ColorMatrix
**What:** Phaser 3.60+ provides `camera.postFX.addColorMatrix()` which returns a `ColorMatrix` FX controller. This is a WebGL post-processing effect applied to everything the camera renders. The `ColorMatrix` has methods like `brightness()`, `saturate()`, and direct matrix manipulation.

**When to use:** When you want a full-screen visual overlay that affects all rendered objects uniformly without modifying individual game objects.

**Key insight for this phase:** The minimap is a *separate* Phaser camera (`cameras.add()`). PostFX applied to `cameras.main` do NOT affect other cameras. This naturally satisfies DNTC-05 without any special handling.

**Example:**
```typescript
// Add ColorMatrix to main camera only
const colorMatrix = this.cameras.main.postFX.addColorMatrix();

// Day: identity (no change)
colorMatrix.reset();

// Night: reduce brightness + blue tint
colorMatrix.brightness(0.45);  // ~45% brightness
colorMatrix.saturate(-0.3);    // Desaturate slightly
// Apply blue shift via manual matrix values
```

### Pattern 2: Cycle State Machine
**What:** A time-based state machine with four phases, using normalized progress (0.0-1.0) within the full cycle.

**Phase boundaries (normalized 0-1 over 20 min):**
- Dawn: 0.0 - 0.1 (0:00 - 2:00)
- Day: 0.1 - 0.5 (2:00 - 10:00)
- Dusk: 0.5 - 0.6 (10:00 - 12:00)
- Night: 0.6 - 1.0 (12:00 - 20:00)

**Easing:** Use smooth transition zones at phase boundaries. A sine-based ease (cosine interpolation) provides natural-looking blending:
```typescript
// Smooth step for transition zones
function smoothStep(t: number): number {
  return t * t * (3 - 2 * t);
}
```

### Pattern 3: Server Time Sync
**What:** Server sends `serverTime: number` (epoch ms) in `auth:success` payload. Client calculates offset `serverOffset = serverTime - Date.now()` and uses it to derive cycle position.

**Cycle position:**
```typescript
const CYCLE_DURATION_MS = 20 * 60 * 1000; // 20 minutes
function getCycleProgress(serverOffset: number): number {
  const serverNow = Date.now() + serverOffset;
  return (serverNow % CYCLE_DURATION_MS) / CYCLE_DURATION_MS;
}
```

### Pattern 4: Elevation Shading Independence
**What:** TileRenderer applies `setTint()` per-tile based on elevation (brightness = 0.55 + elevation * 0.15). The camera postFX ColorMatrix is a multiplicative post-process applied after individual tile tints are rendered. This means elevation differences are preserved: a bright tile at high elevation and a dark tile at low elevation both get the same multiplicative night darkening, maintaining their relative brightness difference.

**No code changes needed in TileRenderer.** The architecture naturally preserves elevation shading.

### Anti-Patterns to Avoid
- **Per-tile tinting for day/night:** Would conflict with elevation shading and be extremely expensive (thousands of tiles). Use camera postFX instead.
- **Phaser scene-level pipeline:** Custom pipelines are harder to maintain and less portable than postFX.addColorMatrix().
- **Timer-based phase switching:** Don't use `setTimeout`/`setInterval` for phase transitions. Use the continuous `update()` loop with progress calculation.
- **Syncing cycle via periodic broadcasts:** Creates unnecessary network traffic. Modular arithmetic on a shared epoch is sufficient.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Color matrix transforms | Custom WebGL shader | `camera.postFX.addColorMatrix()` | Built into Phaser, handles reset/stacking, well-tested |
| Time synchronization | NTP-like protocol | Epoch offset from auth payload | Simple, sufficient for visual-only effect (no gameplay impact) |

## Common Pitfalls

### Pitfall 1: ColorMatrix Stacking
**What goes wrong:** Calling `addColorMatrix()` multiple times creates multiple effects that compound.
**Why it happens:** Each call adds a new FX to the pipeline.
**How to avoid:** Call `addColorMatrix()` once during `create()`, store the reference, then call `reset()` + re-apply values each frame.
**Warning signs:** Scene gets progressively darker/more tinted over time.

### Pitfall 2: Minimap Affected by Day/Night
**What goes wrong:** Night darkening also darkens the minimap, making it unreadable.
**Why it happens:** If postFX is applied to a camera that renders the minimap, or if the wrong camera is used.
**How to avoid:** Only apply ColorMatrix to `cameras.main`. The minimap is a separate camera from `cameras.add()` and is unaffected by default.
**Warning signs:** Minimap dims at night.

### Pitfall 3: Abrupt Phase Transitions
**What goes wrong:** Hard cuts between phases (e.g., instant jump from Day to Dusk).
**Why it happens:** Using discrete phase states without interpolation at boundaries.
**How to avoid:** Define transition zones at phase boundaries and use smoothstep interpolation to blend between phase color presets.
**Warning signs:** Sudden color/brightness jumps every few minutes.

### Pitfall 4: postFX Not Available in Canvas Mode
**What goes wrong:** `postFX` is `undefined` if Phaser runs in Canvas renderer mode.
**Why it happens:** PostFX requires WebGL. Canvas fallback doesn't support it.
**How to avoid:** Check `this.game.renderer.type === Phaser.WEBGL` or guard with `if (camera.postFX)`. In canvas fallback, skip the effect entirely (acceptable degradation).
**Warning signs:** Runtime error on `camera.postFX.addColorMatrix()`.

### Pitfall 5: Server Time Zone Mismatch
**What goes wrong:** Client and server have different system clocks, causing cycle to start at wrong phase.
**Why it happens:** Using raw `Date.now()` without server offset.
**How to avoid:** Always derive cycle position from `Date.now() + serverOffset` where serverOffset = `serverTime - clientTimeAtReceipt`.
**Warning signs:** Different players see different times of day.

## Code Examples

### DayNightCycle System Class
```typescript
// apps/web/src/game/systems/DayNightCycle.ts

export type DayNightPhase = 'Dawn' | 'Day' | 'Dusk' | 'Night';

const CYCLE_DURATION_MS = 20 * 60 * 1000; // 20 minutes

// Phase boundaries as fraction of cycle [0, 1)
const PHASES = {
  Dawn:  { start: 0.0,  end: 0.1  },
  Day:   { start: 0.1,  end: 0.5  },
  Dusk:  { start: 0.5,  end: 0.6  },
  Night: { start: 0.6,  end: 1.0  },
};

// Transition zone half-width (as fraction of cycle)
const TRANSITION_HALF = 0.02; // ~24 seconds of blending

export class DayNightCycle {
  private colorMatrix: Phaser.FX.ColorMatrix | null = null;
  private serverOffset: number = 0; // ms

  create(camera: Phaser.Cameras.Scene2D.Camera): void {
    if (camera.postFX) {
      this.colorMatrix = camera.postFX.addColorMatrix();
    }
  }

  setServerTime(serverTimeMs: number): void {
    this.serverOffset = serverTimeMs - Date.now();
  }

  update(): void {
    if (!this.colorMatrix) return;
    const progress = this.getCycleProgress();
    const phase = this.getPhase(progress);
    this.applyVisuals(progress);
    // Expose phase name for HUD
  }

  getCycleProgress(): number {
    const now = Date.now() + this.serverOffset;
    return (now % CYCLE_DURATION_MS) / CYCLE_DURATION_MS;
  }

  getPhase(progress: number): DayNightPhase {
    if (progress < PHASES.Dawn.end) return 'Dawn';
    if (progress < PHASES.Day.end) return 'Day';
    if (progress < PHASES.Dusk.end) return 'Dusk';
    return 'Night';
  }

  private applyVisuals(progress: number): void {
    if (!this.colorMatrix) return;
    this.colorMatrix.reset();
    // Interpolate brightness/saturation/tint based on progress
    // ... (detailed implementation in plan)
  }

  destroy(): void {
    // ColorMatrix is cleaned up when camera is destroyed
    this.colorMatrix = null;
  }
}
```

### HUD Time Indicator
```tsx
// apps/web/src/ui/hud/TimeIndicator.tsx
import React from 'react';
import './TimeIndicator.css';

interface TimeIndicatorProps {
  phase: string; // "Dawn" | "Day" | "Dusk" | "Night"
}

export const TimeIndicator: React.FC<TimeIndicatorProps> = ({ phase }) => (
  <div className="time-indicator">
    <span className="time-label">{phase}</span>
  </div>
);
```

### Server Time in Auth Payload
```typescript
// In game.gateway.ts handleAuth():
client.emit('auth:success', {
  player: result.player,
  serverTime: Date.now(), // Add server epoch
});
```

## Existing Codebase Integration Points

### WorldScene.ts
- **WeatherSystem** initialized at line ~197, provides pattern for system lifecycle (create → update → destroy)
- **MinimapCamera** at line ~187-193, uses `cameras.add()` -- confirms separate camera instance
- **ZoneHUD** at line ~185, fixed to camera with `setScrollFactor(0)` and depth 1000
- **update()** loop at line ~810, runs every frame -- good place to call `dayNightCycle.update()`
- Main camera zoom set at line ~343: `this.cameras.main.setZoom(0.5)`

### HUD.tsx
- Minimap div at line ~229: `<div className="hud-minimap" />` at `bottom: 20px; right: 20px; width: 180px; height: 180px`
- Biome indicator at line ~202-213: positioned `bottom: 210px; right: 20px; width: 180px` (above minimap)
- Time indicator should go between biome indicator and minimap, or below minimap

### MinimapCamera.ts
- Created via `cameras.add()` at line ~22 -- separate from `cameras.main`
- Has its own viewport and zoom settings
- Already ignores ZoneHUD elements via `ignore()` method
- No postFX applied -- will not be affected by main camera ColorMatrix

### ZoneState (shared-types)
- Currently has no `serverTime` field
- Auth success payload `{ player }` needs `serverTime` field added

### Events (shared-types)
- `auth:success` payload type needs extension for `serverTime`

### TileRenderer.ts
- Elevation tinting at line ~291-301: uses `sprite.setTint()` per tile
- This is a render-time property on individual game objects
- Camera postFX (ColorMatrix) is applied AFTER all objects render -- multiplicative on top of per-object tints
- No changes needed to TileRenderer

## Open Questions

1. **Phaser ColorMatrix blue tint method**
   - What we know: ColorMatrix has `brightness()`, `saturate()`, and raw matrix access
   - What's unclear: Best approach for blue temperature shift -- may need to use `colorMatrix.matrix` directly or chain `hue()` rotation
   - Recommendation: Start with `brightness()` + `saturate()` + direct matrix manipulation for blue channel boost; tune visually

## Sources

### Primary (HIGH confidence)
- Codebase analysis: WorldScene.ts, MinimapCamera.ts, TileRenderer.ts, HUD.tsx, ZoneHUD.ts, WeatherSystem.ts, events.ts
- Phaser 3 API: Camera.postFX, ColorMatrix FX controller (verified in codebase via existing postFX usage in RareNodeFX.ts)

### Secondary (MEDIUM confidence)
- Phaser 3.80 documentation: ColorMatrix methods (brightness, saturate, hue, reset)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all tools already in project
- Architecture: HIGH - camera postFX approach verified in codebase, minimap separation confirmed
- Pitfalls: HIGH - based on direct code analysis of existing rendering pipeline

**Research date:** 2026-03-17
**Valid until:** 2026-04-17 (stable -- Phaser API unlikely to change)
