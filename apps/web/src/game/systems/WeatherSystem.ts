import Phaser from 'phaser';
import { BiomeType, BIOME_TIERS } from '@into-the-void/shared-types';
import { getWeatherStrategy, initWeatherStrategies } from './weather-strategies/index';
import type { WeatherType, WeatherConfig } from './weather-strategies/index';

export type { WeatherType } from './weather-strategies/index';

/** Hub biomes have constant indoor particles — no weather cycling */
function isHubBiome(biome: BiomeType): boolean {
  return biome === 'canopy_station' || biome === 'ironhold_station' ||
         biome === 'meridian_station' || biome === 'salvage_station';
}

// ── Weather Config Per Biome ───────────────────────────────────────────────

/**
 * Intensity quantity lookup by biome tier.
 * Rows: tier 1-4.  Columns: [light, moderate, heavy].
 */
const TIER_QUANTITIES: Record<1 | 2 | 3 | 4, [number, number, number]> = {
  1: [1, 2, 4],
  2: [2, 4, 8],
  3: [3, 6, 12],
  4: [4, 8, 16],
};

/**
 * Intensity cycle periods by tier (min-max in ms).
 * Higher tiers have more volatile / shorter cycles.
 */
const TIER_CYCLE_PERIOD: Record<1 | 2 | 3 | 4, { min: number; max: number }> = {
  1: { min: 180_000, max: 300_000 }, // 3-5 min
  2: { min: 120_000, max: 240_000 }, // 2-4 min
  3: { min: 60_000, max: 180_000 },  // 1-3 min
  4: { min: 30_000, max: 120_000 },  // 0.5-2 min
};

/**
 * Probability of heavy weather by tier.
 * [heavyWeight, moderateWeight, lightWeight]
 */
const TIER_INTENSITY_WEIGHTS: Record<1 | 2 | 3 | 4, [number, number, number]> = {
  1: [10, 40, 50],  // 10% heavy
  2: [25, 40, 35],  // 25% heavy
  3: [40, 35, 25],  // 40% heavy
  4: [60, 25, 15],  // 60% heavy
};

/**
 * Build a WeatherConfig helper — attaches tier-specific quantity.
 */
function makeConfig(
  biome: BiomeType,
  type: WeatherType,
  tint: number,
  base: Omit<WeatherConfig, 'type' | 'tint' | 'quantity'>,
): WeatherConfig {
  const tier = BIOME_TIERS[biome];
  return { type, tint, quantity: TIER_QUANTITIES[tier], ...base };
}

// Base configs per weather type (shared across biomes that use the same type)
const RAIN_BASE: Omit<WeatherConfig, 'type' | 'tint' | 'quantity'> = {
  speedY: { min: 150, max: 300 },
  speedX: { min: -20, max: 20 },
  lifespan: 2500,
  scaleX: 0.3,
  scaleY: 1.0,
  alpha: { start: 0.8, end: 0.1 },
  frequency: 40,
};

const SNOW_BASE: Omit<WeatherConfig, 'type' | 'tint' | 'quantity'> = {
  speedY: { min: 30, max: 80 },
  speedX: { min: -30, max: 30 },
  lifespan: 5000,
  scaleX: 0.5,
  scaleY: 0.5,
  alpha: { start: 0.9, end: 0.3 },
  frequency: 80,
};

const ASH_BASE: Omit<WeatherConfig, 'type' | 'tint' | 'quantity'> = {
  speedY: { min: 40, max: 120 },
  speedX: { min: -25, max: 25 },
  lifespan: 4000,
  scaleX: 0.4,
  scaleY: 0.4,
  alpha: { start: 0.7, end: 0.15 },
  frequency: 60,
};

const SPORES_BASE: Omit<WeatherConfig, 'type' | 'tint' | 'quantity'> = {
  speedY: { min: -15, max: 30 },
  speedX: { min: -20, max: 20 },
  lifespan: 6000,
  scaleX: 0.5,
  scaleY: 0.5,
  alpha: { start: 0.6, end: 0.2 },
  frequency: 100,
};

const MIST_BASE: Omit<WeatherConfig, 'type' | 'tint' | 'quantity'> = {
  speedY: { min: -5, max: 10 },
  speedX: { min: -40, max: 40 },
  lifespan: 8000,
  scaleX: 1.0,
  scaleY: 0.75,
  alpha: { start: 0.3, end: 0.05 },
  frequency: 120,
};

const VOID_ENERGY_BASE: Omit<WeatherConfig, 'type' | 'tint' | 'quantity'> = {
  speedY: { min: -100, max: 100 },
  speedX: { min: -100, max: 100 },
  lifespan: 2000,
  scaleX: 0.5,
  scaleY: 0.5,
  alpha: { start: 1.0, end: 0.0 },
  frequency: 30,
  gravityY: 0,
};

/** All 16 biomes mapped to their weather config */
const WEATHER_CONFIGS: Record<BiomeType, WeatherConfig> = {
  void_plains: makeConfig('void_plains', 'mist', 0x4a4a6e, MIST_BASE),
  fungal_forest: makeConfig('fungal_forest', 'spores', 0x9370db, SPORES_BASE),
  tidal_pools: makeConfig('tidal_pools', 'mist', 0x5f9ea0, MIST_BASE),
  ancient_ruins: makeConfig('ancient_ruins', 'ash', 0x8b7355, ASH_BASE),
  toxic_wastes: makeConfig('toxic_wastes', 'spores', 0x9acd32, SPORES_BASE),
  miasma_marshes: makeConfig('miasma_marshes', 'mist', 0x6b8e23, MIST_BASE),
  petrified_expanse: makeConfig('petrified_expanse', 'ash', 0xa9a9a9, ASH_BASE),
  bioluminescent_depths: makeConfig('bioluminescent_depths', 'spores', 0x00ff88, SPORES_BASE),
  kelp_forests: makeConfig('kelp_forests', 'mist', 0x228b22, MIST_BASE),
  volcanic_ridge: makeConfig('volcanic_ridge', 'ash', 0xff4500, ASH_BASE),
  crystal_caves: makeConfig('crystal_caves', 'snow', 0x6ac8ee, SNOW_BASE),
  crystalline_wastes: makeConfig('crystalline_wastes', 'snow', 0xb0e0e6, SNOW_BASE),
  frozen_expanse: makeConfig('frozen_expanse', 'snow', 0xb0e0e6, SNOW_BASE),
  deep_trenches: makeConfig('deep_trenches', 'mist', 0x191970, MIST_BASE),
  starfall_crater: makeConfig('starfall_crater', 'ash', 0x191970, ASH_BASE),
  void_rift: makeConfig('void_rift', 'void_energy', 0x4a0080, VOID_ENERGY_BASE),
  // Hub Station Biomes — unique indoor ambient particles (constant, no cycling)
  // Canopy: spores float lazily — very slow, meandering drift, green glow
  canopy_station: {
    type: 'spores',
    tint: 0x44ddaa,
    quantity: [2, 2, 2],    // Constant (no cycling), very sparse
    speedY: { min: -10, max: 15 },   // Lazy float upward and down
    speedX: { min: -12, max: 12 },   // Gentle lateral drift
    lifespan: 8000,                   // Long-lived, slow fade
    scaleX: 0.4,
    scaleY: 0.4,
    alpha: { start: 0.25, end: 0.05 },  // Very subtle
    frequency: 200,                   // Low spawn rate
  },
  // Ironhold: steam rises in bursts — fast upward, periodic clusters
  ironhold_station: {
    type: 'mist',
    tint: 0x8a8a8a,
    quantity: [3, 3, 3],    // Constant
    speedY: { min: -60, max: -20 },  // Rises upward (negative Y = up)
    speedX: { min: -8, max: 8 },     // Minimal lateral
    lifespan: 3000,                   // Short-lived bursts
    scaleX: 0.6,
    scaleY: 0.8,
    alpha: { start: 0.2, end: 0.02 },  // Very subtle, fades quickly
    frequency: 300,                   // Burst-like: spawn infrequently
  },
  // Meridian: holo-dust drifts linearly — consistent horizontal flow, blue shimmer
  meridian_station: {
    type: 'snow',
    tint: 0x88ccff,
    quantity: [2, 2, 2],    // Constant
    speedY: { min: 5, max: 15 },     // Very slight downward drift
    speedX: { min: 20, max: 40 },    // Consistent rightward linear drift
    lifespan: 6000,                   // Medium duration
    scaleX: 0.3,
    scaleY: 0.3,
    alpha: { start: 0.2, end: 0.05 },  // Very subtle
    frequency: 250,                   // Low, steady rate
  },
  // Salvage: smoke wisps curl — chaotic drift, warm amber
  salvage_station: {
    type: 'ash',
    tint: 0xbbaa77,
    quantity: [2, 2, 2],    // Constant
    speedY: { min: -25, max: 10 },   // Mostly rises, some curls down
    speedX: { min: -30, max: 30 },   // Wide lateral range for curling effect
    lifespan: 5000,                   // Medium duration
    scaleX: 0.5,
    scaleY: 0.5,
    alpha: { start: 0.18, end: 0.03 }, // Very subtle
    frequency: 220,                   // Sparse
  },
};

// ── Crossfade duration ─────────────────────────────────────────────────────

const CROSSFADE_MS = 3000;

// ── WeatherSystem ──────────────────────────────────────────────────────────

/**
 * Viewport-fixed particle weather system.
 *
 * Creates Phaser particle emitters that render above all game objects
 * (depth 9500) but below HUD. Particles are fixed to the viewport
 * (scrollFactor 0) so they do not drift when the camera pans.
 *
 * Supports crossfade transitions (walk-in) and instant swaps (teleport).
 * Intensity cycles deterministically so all players in the same zone see
 * matching weather without network traffic.
 */
export class WeatherSystem {
  private scene: Phaser.Scene;
  private currentBiome: BiomeType | null = null;
  private currentConfig: WeatherConfig | null = null;
  private activeEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private outgoingEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private intensityTier: 0 | 1 | 2 = 1; // 0=light, 1=moderate, 2=heavy
  private intensityCycleTimer: Phaser.Time.TimerEvent | null = null;
  private intensityProxy: { value: number } = { value: 0 };
  private resizeHandler: ((gameSize: Phaser.Structs.Size) => void) | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    initWeatherStrategies();

    // Update emitter emit zones on viewport resize
    this.resizeHandler = (gameSize: Phaser.Structs.Size) => {
      const { width, height } = gameSize;
      if (this.activeEmitter && this.currentConfig) {
        this.activeEmitter.setEmitZone(
          new Phaser.GameObjects.Particles.Zones.RandomZone(
            this.getEmitZone(this.currentConfig, width, height) as unknown as Phaser.Types.GameObjects.Particles.RandomZoneSource
          )
        );
      }
    };
    this.scene.scale.on('resize', this.resizeHandler);
  }

  // ── Public API ───────────────────────────────────────────────────────────

  /**
   * Transition weather to a new biome.
   *
   * @param biome   The target biome
   * @param instant true for teleport (immediate swap), false for walk-in (crossfade)
   */
  setBiome(biome: BiomeType, instant: boolean = false): void {
    if (biome === this.currentBiome) return;

    this.currentBiome = biome;
    const config = WEATHER_CONFIGS[biome];
    this.currentConfig = config;

    // Hub biomes: stop any existing intensity cycle (constant particles)
    if (isHubBiome(biome)) {
      if (this.intensityCycleTimer) {
        this.intensityCycleTimer.destroy();
        this.intensityCycleTimer = null;
      }
      this.scene.tweens.killTweensOf(this.intensityProxy);
    }

    if (instant) {
      this.destroyOutgoing();
      this.destroyActive();
      this.activeEmitter = this.createEmitter(config);
      this.activeEmitter.setAlpha(config.alpha.start);
      // Hub biomes: constant particles, no intensity cycling
      if (!isHubBiome(biome)) {
        this.startIntensityCycle(biome);
      }
      return;
    }

    // ── Crossfade transition ───────────────────────────────────────────
    // If a previous outgoing emitter is still fading, cancel and destroy it
    if (this.outgoingEmitter) {
      this.scene.tweens.killTweensOf(this.outgoingEmitter);
      this.outgoingEmitter.destroy();
      this.outgoingEmitter = null;
    }

    // Current active becomes outgoing
    if (this.activeEmitter) {
      this.outgoingEmitter = this.activeEmitter;
      const outgoing = this.outgoingEmitter;
      // Fade out outgoing over CROSSFADE_MS
      this.scene.tweens.add({
        targets: outgoing,
        alpha: 0,
        duration: CROSSFADE_MS,
        onComplete: () => {
          if (outgoing) {
            outgoing.destroy();
          }
          if (this.outgoingEmitter === outgoing) {
            this.outgoingEmitter = null;
          }
        },
      });
    }

    // Create new active emitter, fade in from 0
    this.activeEmitter = this.createEmitter(config);
    this.activeEmitter.setAlpha(0);
    this.scene.tweens.add({
      targets: this.activeEmitter,
      alpha: config.alpha.start,
      duration: CROSSFADE_MS,
    });

    // Hub biomes: constant particles, no intensity cycling
    if (!isHubBiome(biome)) {
      this.startIntensityCycle(biome);
    }
  }

  /**
   * Returns all active + outgoing emitters (for minimap.ignore).
   */
  getActiveEmitters(): Phaser.GameObjects.Particles.ParticleEmitter[] {
    const emitters: Phaser.GameObjects.Particles.ParticleEmitter[] = [];
    if (this.activeEmitter) emitters.push(this.activeEmitter);
    if (this.outgoingEmitter) emitters.push(this.outgoingEmitter);
    return emitters;
  }

  /**
   * Whether any weather emitter is currently active.
   */
  hasActiveWeather(): boolean {
    return this.activeEmitter !== null;
  }

  /**
   * Full cleanup — call in scene shutdown.
   */
  destroy(): void {
    if (this.intensityCycleTimer) {
      this.intensityCycleTimer.destroy();
      this.intensityCycleTimer = null;
    }

    // Kill any intensity proxy tweens
    this.scene.tweens.killTweensOf(this.intensityProxy);

    this.destroyOutgoing();
    this.destroyActive();

    if (this.resizeHandler) {
      this.scene.scale.off('resize', this.resizeHandler);
      this.resizeHandler = null;
    }

    this.currentBiome = null;
    this.currentConfig = null;
  }

  // ── Private ──────────────────────────────────────────────────────────────

  /**
   * Create a viewport-fixed particle emitter from a WeatherConfig.
   */
  private createEmitter(config: WeatherConfig): Phaser.GameObjects.Particles.ParticleEmitter {
    const { width, height } = this.scene.scale;
    const quantityIndex = this.intensityTier;

    const emitter = this.scene.add.particles(0, 0, 'weather-pixel', {
      emitZone: new Phaser.GameObjects.Particles.Zones.RandomZone(
        this.getEmitZone(config, width, height) as unknown as Phaser.Types.GameObjects.Particles.RandomZoneSource
      ),
      speedY: config.speedY,
      speedX: config.speedX,
      lifespan: config.lifespan,
      quantity: config.quantity[quantityIndex],
      tint: config.tint,
      scaleX: config.scaleX,
      scaleY: config.scaleY,
      alpha: config.alpha,
      frequency: config.frequency,
      gravityY: config.gravityY ?? 0,
    });

    emitter.setScrollFactor(0);  // VIEWPORT-FIXED (WTHR-01)
    emitter.setDepth(9500);       // Above terrain, below Phaser UI (WTHR-04)

    return emitter;
  }

  /**
   * Start (or restart) the deterministic intensity cycle for a biome.
   */
  private startIntensityCycle(biome: BiomeType): void {
    // Clear existing timer + tweens
    if (this.intensityCycleTimer) {
      this.intensityCycleTimer.destroy();
      this.intensityCycleTimer = null;
    }
    this.scene.tweens.killTweensOf(this.intensityProxy);

    const tier = BIOME_TIERS[biome];
    const period = TIER_CYCLE_PERIOD[tier];
    const weights = TIER_INTENSITY_WEIGHTS[tier];

    const scheduleCycle = () => {
      const seed = this.getIntensitySeed(biome);
      const nextTier = this.pickIntensityTier(seed, weights);
      const cycleDuration = period.min + (seed % (period.max - period.min));

      // Ramp quantity smoothly via proxy tween
      const emitter = this.activeEmitter; // capture reference
      if (!emitter) return;

      const config = WEATHER_CONFIGS[biome];
      const targetQuantity = config.quantity[nextTier];

      this.scene.tweens.killTweensOf(this.intensityProxy);
      this.intensityProxy.value = config.quantity[this.intensityTier];

      this.scene.tweens.add({
        targets: this.intensityProxy,
        value: targetQuantity,
        duration: 2000, // ramp over 2 seconds
        onUpdate: () => {
          // Only update if emitter is still the active one
          if (this.activeEmitter === emitter) {
            emitter.setQuantity(Math.round(this.intensityProxy.value));
          }
        },
      });

      this.intensityTier = nextTier as 0 | 1 | 2;

      // Schedule next cycle
      this.intensityCycleTimer = this.scene.time.addEvent({
        delay: cycleDuration,
        callback: scheduleCycle,
      });
    };

    // Kick off first cycle
    const initialSeed = this.getIntensitySeed(biome);
    const initialDelay = 5000 + (initialSeed % 10000); // 5-15s before first change
    this.intensityCycleTimer = this.scene.time.addEvent({
      delay: initialDelay,
      callback: scheduleCycle,
    });
  }

  /**
   * Deterministic seed so all players in the same zone see the same
   * intensity at the same time, without network traffic.
   */
  private getIntensitySeed(biome: BiomeType): number {
    const windowMs = 5 * 60 * 1000; // 5-minute window
    const window = Math.floor(Date.now() / windowMs);
    let h = 0;
    for (const c of biome) {
      h = ((h << 5) - h + c.charCodeAt(0)) | 0;
    }
    return Math.abs(h ^ window);
  }

  /**
   * Pick an intensity tier (0/1/2) from weighted probabilities.
   */
  private pickIntensityTier(
    seed: number,
    weights: [number, number, number],
  ): 0 | 1 | 2 {
    const total = weights[0] + weights[1] + weights[2];
    const roll = seed % total;
    // weights = [heavy, moderate, light]
    if (roll < weights[0]) return 2; // heavy
    if (roll < weights[0] + weights[1]) return 1; // moderate
    return 0; // light
  }

  /**
   * Returns the emit zone rectangle for a given weather config.
   *
   * Delegates to per-type strategy for zone placement. No per-type branching
   * in this method — each WeatherParticleStrategy defines its own zone.
   */
  private getEmitZone(config: WeatherConfig, width: number, height: number): Phaser.Geom.Rectangle {
    // Account for camera zoom — scroll-factor-0 emitters need to cover the full zoomed viewport
    const zoom = this.scene.cameras.main.zoom || 1;
    const zoomedWidth = width / zoom;
    const zoomedHeight = height / zoom;

    const strategy = getWeatherStrategy(config.type);
    if (strategy) {
      return strategy.getEmitZone(zoomedWidth, zoomedHeight);
    }
    // Fallback for unknown types: falling pattern (same as original default)
    return new Phaser.Geom.Rectangle(0, -(zoomedHeight * 0.15), zoomedWidth, zoomedHeight * 0.15);
  }

  private destroyActive(): void {
    if (this.activeEmitter) {
      this.scene.tweens.killTweensOf(this.activeEmitter);
      this.activeEmitter.destroy();
      this.activeEmitter = null;
    }
  }

  private destroyOutgoing(): void {
    if (this.outgoingEmitter) {
      this.scene.tweens.killTweensOf(this.outgoingEmitter);
      this.outgoingEmitter.destroy();
      this.outgoingEmitter = null;
    }
  }
}
