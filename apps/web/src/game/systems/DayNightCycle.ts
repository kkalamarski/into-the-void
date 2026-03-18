import Phaser from 'phaser';
import { DayNightPhase, CYCLE_DURATION_MS, PHASE_BOUNDARIES } from '@into-the-void/shared-types';
import type { AtmosphereSystem } from './AtmosphereSystem';

// ── Visual Presets ───────────────────────────────────────────────────────────

/**
 * Per-phase visual parameters.
 * brightness: 0-1 diagonal multiplier applied directly to getData() (1 = full brightness)
 * saturation: -1 to 1 (negative = desaturate)
 * blueShift: 0-1 (blue channel boost for cool night)
 * warmShift: 0-1 (red/amber boost for dawn/dusk)
 */
interface PhaseVisuals {
  brightness: number;
  saturation: number;
  blueShift: number;
  warmShift: number;
}

const PHASE_VISUALS: Record<DayNightPhase, PhaseVisuals> = {
  Dawn:  { brightness: 0.72, saturation: -0.05, blueShift: 0.0,  warmShift: 0.08 },
  Day:   { brightness: 1.0,  saturation: 0.0,   blueShift: 0.0,  warmShift: 0.0  },
  Dusk:  { brightness: 0.70, saturation: -0.05, blueShift: 0.0,  warmShift: 0.10 },
  Night: { brightness: 0.42, saturation: -0.20, blueShift: 0.12, warmShift: 0.0  },
};

// Transition zone: first/last 20% of each phase blends with neighbor
const TRANSITION_FRACTION = 0.2;

// Phase order for wraparound interpolation
const PHASE_ORDER: DayNightPhase[] = ['Dawn', 'Day', 'Dusk', 'Night'];
const PHASE_BOUNDS = [PHASE_BOUNDARIES.Dawn, PHASE_BOUNDARIES.Day, PHASE_BOUNDARIES.Dusk, PHASE_BOUNDARIES.Night];

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Hermite smoothstep for natural phase transitions.
 */
function smoothStep(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
}

/**
 * Linear interpolation between two visual presets.
 */
function lerpVisuals(a: PhaseVisuals, b: PhaseVisuals, t: number): PhaseVisuals {
  return {
    brightness: a.brightness + (b.brightness - a.brightness) * t,
    saturation: a.saturation + (b.saturation - a.saturation) * t,
    blueShift:  a.blueShift  + (b.blueShift  - a.blueShift)  * t,
    warmShift:  a.warmShift  + (b.warmShift  - a.warmShift)  * t,
  };
}

// ── DayNightCycle ────────────────────────────────────────────────────────────

/**
 * Camera-level day/night cycle using Phaser postFX ColorMatrix.
 *
 * Applies brightness and color-temperature shifts to a single camera
 * (main camera only — never the minimap camera). The cycle runs on a
 * 20-minute real-time loop synchronized to a global server clock.
 *
 * Elevation shading (per-tile setTint) is unaffected because the
 * ColorMatrix is a post-processing effect applied AFTER individual
 * tile tints are rendered. Relative brightness differences are preserved.
 */
export class DayNightCycle {
  private colorMatrix: Phaser.FX.ColorMatrix | null = null;
  private vignette: Phaser.FX.Vignette | null = null;
  private serverOffset: number = 0;
  private currentPhase: DayNightPhase = 'Day';
  private atmosphereSystem: AtmosphereSystem | null = null;
  /** When true, cycle is paused at full brightness (hub zones) */
  private paused: boolean = false;

  /**
   * Register the AtmosphereSystem for cooperative ColorMatrix sharing.
   * Called once during WorldScene.create() after both systems are instantiated.
   */
  setAtmosphereSystem(system: AtmosphereSystem): void {
    this.atmosphereSystem = system;
  }

  /**
   * Attach ColorMatrix postFX to the given camera.
   * IMPORTANT: Only pass cameras.main — never the minimap camera.
   */
  create(camera: Phaser.Cameras.Scene2D.Camera): void {
    if (camera.postFX) {
      this.colorMatrix = camera.postFX.addColorMatrix();
      // Vignette for night atmosphere — starts fully transparent (strength 0)
      this.vignette = camera.postFX.addVignette(0.5, 0.5, 0.85, 0.0);
    }
  }

  /**
   * Set server time offset for cycle synchronization.
   * Call with serverTime from auth:success or zone:state payloads.
   */
  setServerTime(serverTimeMs: number): void {
    this.serverOffset = serverTimeMs - Date.now();
  }

  /**
   * Pause the cycle — locks to full-brightness Day visuals.
   * Used for hub zones (controlled indoor environment).
   */
  pause(): void {
    this.paused = true;
    this.currentPhase = 'Day';
    // Apply full brightness immediately
    if (this.colorMatrix) {
      this.colorMatrix.reset();
      // Identity = full brightness (Day)
    }
    if (this.vignette) {
      this.vignette.strength = 0;
    }
  }

  /**
   * Resume the cycle from current server time.
   * Called when leaving a hub zone.
   */
  resume(): void {
    this.paused = false;
  }

  /**
   * Update visuals. Call every frame from WorldScene.update().
   */
  update(): void {
    if (!this.colorMatrix) return;
    // Hub zones: paused at full brightness, skip cycle processing
    if (this.paused) return;

    const progress = this.getCycleProgress();
    this.currentPhase = this.getPhase(progress);
    this.applyVisuals(progress);

    // Update night vignette
    this.updateVignette(progress);
  }

  /**
   * Get the current phase name (for HUD display).
   */
  getCurrentPhase(): DayNightPhase {
    return this.currentPhase;
  }

  /**
   * Get normalized cycle progress [0, 1).
   */
  getCycleProgress(): number {
    const now = Date.now() + this.serverOffset;
    return (((now % CYCLE_DURATION_MS) + CYCLE_DURATION_MS) % CYCLE_DURATION_MS) / CYCLE_DURATION_MS;
  }

  /**
   * Determine current phase from progress.
   */
  getPhase(progress: number): DayNightPhase {
    if (progress < PHASE_BOUNDARIES.Dawn.end) return 'Dawn';
    if (progress < PHASE_BOUNDARIES.Day.end) return 'Day';
    if (progress < PHASE_BOUNDARIES.Dusk.end) return 'Dusk';
    return 'Night';
  }

  /**
   * Apply brightness + color temperature to the ColorMatrix.
   * Uses direct getData() diagonal manipulation instead of the brightness() method
   * to avoid additive quirks that caused the inverted brightness curve.
   * Uses interpolation at phase boundaries for smooth transitions.
   */
  private applyVisuals(progress: number): void {
    if (!this.colorMatrix) return;

    const visuals = this.getBlendedVisuals(progress);

    // Reset matrix to identity before applying new values
    this.colorMatrix.reset();

    // Get raw matrix data for direct manipulation
    const m = this.colorMatrix.getData();

    // Step 1: Apply base brightness as diagonal multiplier
    // After reset(), m[0]=1, m[6]=1, m[12]=1 (identity)
    // Multiply each channel by the brightness factor
    m[0] = visuals.brightness;   // Red brightness
    m[6] = visuals.brightness;   // Green brightness
    m[12] = visuals.brightness;  // Blue brightness

    // Step 2: Apply color temperature shifts RELATIVE to brightness
    // Blue shift (night): reduce red+green more, keep blue closer to base brightness
    if (visuals.blueShift > 0) {
      m[0] -= visuals.blueShift * 0.25;   // Darken red more (cool tone)
      m[6] -= visuals.blueShift * 0.12;   // Darken green slightly
      m[12] += visuals.blueShift * 0.08;  // Brighten blue slightly (moonlight)
    }

    // Warm shift (dawn/dusk): boost red+green slightly, reduce blue
    if (visuals.warmShift > 0) {
      m[0] += visuals.warmShift * 0.12;   // Warmer red (amber)
      m[6] += visuals.warmShift * 0.06;   // Slight green warmth
      m[12] -= visuals.warmShift * 0.08;  // Reduce blue (warm feel)
    }

    // Step 3: Apply saturation adjustment via the named method
    // saturate() multiplies onto existing matrix values when second arg is true
    if (visuals.saturation !== 0) {
      this.colorMatrix.saturate(visuals.saturation, true);
    }

    // Step 4: Atmosphere writes color offsets on top of day/night (ATMO-04)
    if (this.atmosphereSystem) {
      this.atmosphereSystem.applyToMatrix(this.colorMatrix, progress);
    }
  }

  /**
   * Animate vignette intensity based on day/night cycle.
   * Vignette is only visible during night phase, fading in/out smoothly.
   * Max strength is subtle (~0.3) — just enough to darken screen edges.
   */
  private updateVignette(progress: number): void {
    if (!this.vignette) return;

    // Calculate night intensity: 0 during day/dawn/dusk, ramps to 1 deep in night
    // Night phase is 0.6 - 1.0. Fade in during first 20% of night (0.6-0.68),
    // full during middle, fade out during last 20% approaching dawn (0.92-1.0).
    let nightIntensity = 0;

    if (progress >= 0.6 && progress < 0.68) {
      // Fade in at start of night
      nightIntensity = smoothStep((progress - 0.6) / 0.08);
    } else if (progress >= 0.68 && progress < 0.92) {
      // Full night
      nightIntensity = 1;
    } else if (progress >= 0.92) {
      // Fade out approaching dawn
      nightIntensity = smoothStep(1 - (progress - 0.92) / 0.08);
    }

    // Max vignette strength 0.3 — subtle edge darkening
    this.vignette.strength = nightIntensity * 0.3;
  }

  /**
   * Get blended visual parameters, smoothly transitioning at phase boundaries.
   *
   * Transition zones are the first/last 20% of each phase duration.
   * Within a transition zone, values interpolate between the leaving and entering phase.
   */
  private getBlendedVisuals(progress: number): PhaseVisuals {
    // Find current phase index
    let phaseIdx = 3; // Night by default
    for (let i = 0; i < PHASE_BOUNDS.length; i++) {
      if (progress < PHASE_BOUNDS[i].end) {
        phaseIdx = i;
        break;
      }
    }

    const currentBounds = PHASE_BOUNDS[phaseIdx];
    const currentVisuals = PHASE_VISUALS[PHASE_ORDER[phaseIdx]];
    const phaseDuration = currentBounds.end - currentBounds.start;
    const progressInPhase = (progress - currentBounds.start) / phaseDuration;

    if (progressInPhase < TRANSITION_FRACTION) {
      // Entering this phase — blend from previous phase
      const prevIdx = (phaseIdx + PHASE_ORDER.length - 1) % PHASE_ORDER.length;
      const prevVisuals = PHASE_VISUALS[PHASE_ORDER[prevIdx]];
      const t = smoothStep(progressInPhase / TRANSITION_FRACTION);
      return lerpVisuals(prevVisuals, currentVisuals, t);
    }

    if (progressInPhase > (1 - TRANSITION_FRACTION)) {
      // Leaving this phase — blend toward next phase
      const nextIdx = (phaseIdx + 1) % PHASE_ORDER.length;
      const nextVisuals = PHASE_VISUALS[PHASE_ORDER[nextIdx]];
      const t = smoothStep((progressInPhase - (1 - TRANSITION_FRACTION)) / TRANSITION_FRACTION);
      return lerpVisuals(currentVisuals, nextVisuals, t);
    }

    // In the stable middle of the phase
    return currentVisuals;
  }

  /**
   * Cleanup — ColorMatrix is cleaned up when camera is destroyed.
   */
  destroy(): void {
    this.atmosphereSystem = null;
    this.colorMatrix = null;
    this.vignette = null;
  }
}
