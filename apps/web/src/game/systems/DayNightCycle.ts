import Phaser from 'phaser';
import { DayNightPhase, CYCLE_DURATION_MS, PHASE_BOUNDARIES } from '@into-the-void/shared-types';
import type { AtmosphereSystem } from './AtmosphereSystem';

// ── Visual Presets ───────────────────────────────────────────────────────────

/**
 * Per-phase visual parameters.
 * brightness: 0-1 multiplier (1 = identity)
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
  Dawn:  { brightness: 0.85, saturation: -0.05, blueShift: 0.0,  warmShift: 0.12 },
  Day:   { brightness: 1.0,  saturation: 0.0,   blueShift: 0.0,  warmShift: 0.0  },
  Dusk:  { brightness: 0.80, saturation: -0.05, blueShift: 0.0,  warmShift: 0.15 },
  Night: { brightness: 0.45, saturation: -0.25, blueShift: 0.15, warmShift: 0.0  },
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
  private serverOffset: number = 0;
  private currentPhase: DayNightPhase = 'Day';
  private atmosphereSystem: AtmosphereSystem | null = null;

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
   * Update visuals. Call every frame from WorldScene.update().
   */
  update(): void {
    if (!this.colorMatrix) return;

    const progress = this.getCycleProgress();
    this.currentPhase = this.getPhase(progress);
    this.applyVisuals(progress);
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
   * Uses interpolation at phase boundaries for smooth transitions.
   */
  private applyVisuals(progress: number): void {
    if (!this.colorMatrix) return;

    const visuals = this.getBlendedVisuals(progress);

    // Reset matrix to identity before applying new values
    this.colorMatrix.reset();

    // Apply brightness (DNTC-01)
    this.colorMatrix.brightness(visuals.brightness, false);

    // Apply saturation adjustment
    if (visuals.saturation !== 0) {
      this.colorMatrix.saturate(visuals.saturation, true);
    }

    // Apply blue shift for night — cool temperature (DNTC-02)
    if (visuals.blueShift > 0) {
      const m = this.colorMatrix.getData();
      // Reduce red channel
      m[0] -= visuals.blueShift * 0.3;
      // Reduce green channel slightly less
      m[6] -= visuals.blueShift * 0.1;
      // Boost blue channel
      m[12] += visuals.blueShift * 0.15;
    }

    // Apply warm shift for dawn/dusk — warm temperature (DNTC-02)
    if (visuals.warmShift > 0) {
      const m = this.colorMatrix.getData();
      // Boost red
      m[0] += visuals.warmShift * 0.15;
      // Boost green slightly (warm amber, not pure red)
      m[6] += visuals.warmShift * 0.05;
      // Reduce blue
      m[12] -= visuals.warmShift * 0.1;
    }

    // Step 2: Atmosphere writes color offsets on top of day/night (ATMO-04)
    if (this.atmosphereSystem) {
      this.atmosphereSystem.applyToMatrix(this.colorMatrix, progress);
    }
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
  }
}
