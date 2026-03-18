import Phaser from 'phaser';
import { BiomeType } from '@into-the-void/shared-types';

// ── Atmosphere Types ───────────────────────────────────────────────────────

export type AtmosphereEffectType = 'fog' | 'glow' | 'haze' | 'murk' | 'shimmer' | 'clear';

interface BiomeAtmosphereConfig {
  effectType: AtmosphereEffectType;
  rOffset: number;    // Red channel additive offset (getData scale: 0.0-1.0)
  gOffset: number;    // Green channel additive offset
  bOffset: number;    // Blue channel additive offset
  brightnessBoost: number; // Additive diagonal modifier (positive=lighter, negative=darker)
}

interface AtmosphereParams {
  rOffset: number;
  gOffset: number;
  bOffset: number;
  brightnessBoost: number;
}

// ── Transition Constants ───────────────────────────────────────────────────

/** Walk transition cross-fade duration in ms (matches Phase 127 weather) */
const CROSSFADE_MS = 3000;

/** Teleport transition fade-in duration in ms */
const TELEPORT_FADE_MS = 750;

// ── Atmosphere Config Table ────────────────────────────────────────────────

/**
 * Per-biome atmospheric effect configuration.
 *
 * Color offsets are in getData() post-division scale (0.0-1.0 range).
 * Values are starting estimates — exact visual tuning deferred to Plan 02.
 *
 * Biome-to-effect-type mapping (locked per CONTEXT.md):
 *   FOG:     frozen_expanse, deep_trenches, tidal_pools
 *   GLOW:    fungal_forest, bioluminescent_depths, kelp_forests
 *   HAZE:    volcanic_ridge, miasma_marshes, toxic_wastes
 *   MURK:    crystal_caves, petrified_expanse, ancient_ruins
 *   SHIMMER: void_rift, starfall_crater, crystalline_wastes
 *   CLEAR:   void_plains
 */
const ATMOSPHERE_CONFIGS: Record<BiomeType, BiomeAtmosphereConfig> = {
  // CLEAR — very faint grey-blue wash so transitioning away creates a "clearing" moment
  void_plains: {
    effectType: 'clear',
    rOffset: 0.004,
    gOffset: 0.004,
    bOffset: 0.008,
    brightnessBoost: 0,
  },

  // FOG — thick mist that thickens at night/dawn
  frozen_expanse: {
    effectType: 'fog',
    rOffset: 0.01,
    gOffset: 0.025,
    bOffset: 0.04,
    brightnessBoost: -0.02,
  },
  deep_trenches: {
    effectType: 'fog',
    rOffset: 0.005,
    gOffset: 0.005,
    bOffset: 0.04,
    brightnessBoost: -0.04,
  },
  tidal_pools: {
    effectType: 'fog',
    rOffset: 0.008,
    gOffset: 0.018,
    bOffset: 0.02,
    brightnessBoost: -0.01,
  },

  // GLOW — bioluminescent radiance that brightens at night
  fungal_forest: {
    effectType: 'glow',
    rOffset: 0.01,
    gOffset: 0.005,
    bOffset: 0.02,
    brightnessBoost: 0,
  },
  bioluminescent_depths: {
    effectType: 'glow',
    rOffset: 0.0,
    gOffset: 0.03,
    bOffset: 0.02,
    brightnessBoost: 0,
  },
  kelp_forests: {
    effectType: 'glow',
    rOffset: 0.005,
    gOffset: 0.02,
    bOffset: 0.005,
    brightnessBoost: 0,
  },

  // HAZE — heat and chemical haze strongest at noon
  volcanic_ridge: {
    effectType: 'haze',
    rOffset: 0.04,
    gOffset: 0.01,
    bOffset: 0.0,
    brightnessBoost: 0.02,
  },
  miasma_marshes: {
    effectType: 'haze',
    rOffset: 0.01,
    gOffset: 0.025,
    bOffset: 0.0,
    brightnessBoost: 0.01,
  },
  toxic_wastes: {
    effectType: 'haze',
    rOffset: 0.015,
    gOffset: 0.03,
    bOffset: 0.0,
    brightnessBoost: 0.01,
  },

  // MURK — oppressive darkness, thickens at night
  crystal_caves: {
    effectType: 'murk',
    rOffset: 0.005,
    gOffset: 0.003,
    bOffset: 0.02,
    brightnessBoost: -0.02,
  },
  petrified_expanse: {
    effectType: 'murk',
    rOffset: 0.008,
    gOffset: 0.008,
    bOffset: 0.008,
    brightnessBoost: -0.02,
  },
  ancient_ruins: {
    effectType: 'murk',
    rOffset: 0.01,
    gOffset: 0.007,
    bOffset: 0.003,
    brightnessBoost: -0.01,
  },

  // SHIMMER — shifting hue at dusk/dawn, otherworldly iridescence
  void_rift: {
    effectType: 'shimmer',
    rOffset: 0.015,
    gOffset: 0.0,
    bOffset: 0.04,
    brightnessBoost: 0,
  },
  starfall_crater: {
    effectType: 'shimmer',
    rOffset: 0.005,
    gOffset: 0.0,
    bOffset: 0.03,
    brightnessBoost: 0,
  },
  crystalline_wastes: {
    effectType: 'shimmer',
    rOffset: 0.01,
    gOffset: 0.025,
    bOffset: 0.025,
    brightnessBoost: 0,
  },

  // Hub Station Biomes — indoor, clean atmosphere (clear)
  canopy_station: {
    effectType: 'glow',
    rOffset: 0.0,
    gOffset: 0.015,
    bOffset: 0.01,
    brightnessBoost: 0,
  },
  ironhold_station: {
    effectType: 'haze',
    rOffset: 0.01,
    gOffset: 0.005,
    bOffset: 0.0,
    brightnessBoost: 0,
  },
  meridian_station: {
    effectType: 'clear',
    rOffset: 0.002,
    gOffset: 0.003,
    bOffset: 0.005,
    brightnessBoost: 0,
  },
  salvage_station: {
    effectType: 'haze',
    rOffset: 0.008,
    gOffset: 0.006,
    bOffset: 0.003,
    brightnessBoost: 0,
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────

/**
 * Hermite smoothstep — copied from DayNightCycle for consistent easing.
 */
function smoothStep(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
}

// ── AtmosphereSystem ──────────────────────────────────────────────────────

/**
 * Per-biome atmospheric overlay via cooperative ColorMatrix sharing.
 *
 * Receives the camera's postFX ColorMatrix from DayNightCycle (via applyToMatrix())
 * and additively writes color channel offsets on top of day/night values.
 *
 * CRITICAL CONSTRAINTS (from RESEARCH.md):
 * - NEVER call camera.postFX.clear() — destroys DayNightCycle's ColorMatrix.
 * - NEVER call camera.postFX.addColorMatrix() — receives existing matrix via applyToMatrix().
 * - NEVER queue transitions — always cancel in-progress and start new one.
 * - getData() mutations are additive on top of DayNightCycle's writes.
 */
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

  // ── Public API ─────────────────────────────────────────────────────────

  /**
   * Transition atmosphere to a new biome.
   *
   * Walk transitions (instant=false): 3000ms cross-fade.
   * Teleport transitions (instant=true): 750ms fade-in from black.
   *
   * Rapid biome crossings always cancel and restart — no queuing.
   */
  setBiome(biome: BiomeType, instant: boolean = false): void {
    if (biome === this.currentBiome) return;

    this.currentBiome = biome;
    const newConfig = ATMOSPHERE_CONFIGS[biome];

    // Always cancel any in-progress tween first (rapid crossing support)
    if (this.transitionTween) {
      this.transitionTween.destroy();
      this.transitionTween = null;
    }

    if (instant) {
      // Teleport: fade-in from 0 → 1 over TELEPORT_FADE_MS
      this.outgoingConfig = null;
      this.outgoingAlpha = 0;
      this.currentConfig = newConfig;
      this.atmosphereAlpha = 0;
      this.alphaProxy.value = 0;

      this.transitionTween = this.scene.tweens.add({
        targets: this.alphaProxy,
        value: 1,
        duration: TELEPORT_FADE_MS,
        ease: 'Sine.easeOut',
        onUpdate: () => {
          this.atmosphereAlpha = this.alphaProxy.value;
        },
        onComplete: () => {
          this.transitionTween = null;
        },
      });
    } else {
      // Walk: cross-fade from outgoing → incoming over CROSSFADE_MS
      const prevConfig = this.currentConfig;
      const prevAlpha = this.atmosphereAlpha;

      this.outgoingConfig = prevConfig;
      this.outgoingAlpha = prevAlpha;
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
  }

  /**
   * Apply atmospheric color offsets to the shared ColorMatrix.
   *
   * Called by DayNightCycle as the LAST step of applyVisuals(), AFTER all
   * day/night writes. Additively mutates getData() — does NOT call reset()
   * or any named ColorMatrix methods.
   *
   * @param colorMatrix The camera postFX ColorMatrix instance
   * @param cycleProgress Normalized day/night progress [0, 1)
   */
  applyToMatrix(colorMatrix: Phaser.FX.ColorMatrix, cycleProgress: number): void {
    const m = colorMatrix.getData();

    // Blend outgoing atmosphere out
    if (this.outgoingConfig && this.outgoingAlpha > 0) {
      this.writeAtmosphere(m, this.outgoingConfig, cycleProgress, this.outgoingAlpha);
    }

    // Blend current atmosphere in
    if (this.currentConfig && this.atmosphereAlpha > 0) {
      this.writeAtmosphere(m, this.currentConfig, cycleProgress, this.atmosphereAlpha);
    }
  }

  /**
   * Cleanup — cancel active tweens and null all references.
   */
  destroy(): void {
    if (this.transitionTween) {
      this.transitionTween.destroy();
      this.transitionTween = null;
    }
    this.currentBiome = null;
    this.currentConfig = null;
    this.outgoingConfig = null;
    this.scene = null!;
  }

  // ── Private ────────────────────────────────────────────────────────────

  /**
   * Write atmosphere contribution to the ColorMatrix getData() array.
   *
   * ColorMatrix getData() indices (Phaser 3 source):
   *   m[0] = R×R diagonal (brightness red)
   *   m[6] = G×G diagonal (brightness green)
   *   m[12] = B×B diagonal (brightness blue)
   *   m[4] = R offset (additive, already divided by 255 after first getData)
   *   m[9] = G offset
   *   m[14] = B offset
   */
  private writeAtmosphere(
    m: Float32Array,
    config: BiomeAtmosphereConfig,
    cycleProgress: number,
    alpha: number,
  ): void {
    const params = this.getModulatedParams(config, cycleProgress);

    // Add channel offsets
    m[4] += params.rOffset * alpha;
    m[9] += params.gOffset * alpha;
    m[14] += params.bOffset * alpha;

    // Add brightness modifier to all diagonal channels
    if (params.brightnessBoost !== 0) {
      m[0] += params.brightnessBoost * alpha;
      m[6] += params.brightnessBoost * alpha;
      m[12] += params.brightnessBoost * alpha;
    }
  }

  /**
   * Compute day/night-modulated atmosphere parameters per effect type.
   *
   * Cycle progress phase boundaries (from PHASE_BOUNDARIES):
   *   Dawn  = 0.0 - 0.1
   *   Day   = 0.1 - 0.5
   *   Dusk  = 0.5 - 0.6
   *   Night = 0.6 - 1.0
   *
   * Modulation directions (lore-driven per CONTEXT.md):
   *   FOG:     thicker at night/dawn
   *   GLOW:    brighter at night (bioluminescence partially compensates)
   *   HAZE:    strongest at noon/day
   *   MURK:    darker at night
   *   SHIMMER: hue-shifts at dusk/dawn
   *   CLEAR:   unchanged
   */
  private getModulatedParams(
    config: BiomeAtmosphereConfig,
    cycleProgress: number,
  ): AtmosphereParams {
    // Derive phase factors from cycle progress

    // nightFactor: 0 at day, smoothly 1 deep in night (0.6-1.0)
    const nightFactor = cycleProgress >= 0.7
      ? smoothStep((cycleProgress - 0.7) / 0.3)
      : cycleProgress <= 0.05
        ? smoothStep(1 - cycleProgress / 0.05)  // approaching midnight wraparound
        : 0;

    // dayFactor: 1 at midday (~0.3), fading to 0 at dawn/dusk
    const dayMid = 0.3;
    const dayFactor = cycleProgress >= 0.1 && cycleProgress <= 0.5
      ? smoothStep(1 - Math.abs(cycleProgress - dayMid) / 0.2)
      : 0;

    // dawnDuskFactor: 1 at peak dawn (0.05) and peak dusk (0.55), 0 otherwise
    const dawnFactor = cycleProgress < 0.1
      ? smoothStep(1 - Math.abs(cycleProgress - 0.05) / 0.05)
      : 0;
    const duskFactor = cycleProgress >= 0.5 && cycleProgress < 0.6
      ? smoothStep(1 - Math.abs(cycleProgress - 0.55) / 0.05)
      : 0;
    const dawnDuskFactor = Math.max(dawnFactor, duskFactor);

    let { rOffset, gOffset, bOffset, brightnessBoost } = config;

    switch (config.effectType) {
      case 'fog':
        // Thicker at night/dawn: amplify blue channel more than red/green
        rOffset *= (1 + nightFactor * 0.3);
        gOffset *= (1 + nightFactor * 0.3);
        bOffset *= (1 + nightFactor * 0.5);
        brightnessBoost -= nightFactor * 0.05;
        break;

      case 'glow':
        // Brighter at night — bioluminescence partially counters night dimming
        // Only add boost during night half; preserve config value during day
        if (cycleProgress >= 0.5) {
          gOffset *= (1 + nightFactor * 0.4);
          bOffset *= (1 + nightFactor * 0.4);
          brightnessBoost += nightFactor * 0.1;
        }
        // During day half (cycleProgress < 0.5): return config values unchanged
        break;

      case 'haze':
        // Strongest at noon — heat shimmer peaks at midday
        rOffset *= (1 + dayFactor * 0.4);
        gOffset *= (1 + dayFactor * 0.2);
        brightnessBoost += dayFactor * 0.05;
        break;

      case 'murk':
        // Darker at night — oppressive underground darkness intensifies
        brightnessBoost -= nightFactor * 0.08;
        break;

      case 'shimmer':
        // Hue shifts at dusk/dawn — otherworldly iridescence peaks at transitions
        rOffset *= (1 + dawnDuskFactor * 0.3);
        bOffset *= (1 - dawnDuskFactor * 0.2);
        break;

      case 'clear':
      default:
        // Unchanged — void_plains provides a faint neutral baseline
        break;
    }

    return { rOffset, gOffset, bOffset, brightnessBoost };
  }
}
