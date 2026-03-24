import Phaser from 'phaser';

export type WeatherType = 'rain' | 'snow' | 'ash' | 'spores' | 'mist' | 'void_energy';

export interface WeatherConfig {
  type: WeatherType;
  tint: number;
  /** Per-tier quantity [light, moderate, heavy] */
  quantity: [number, number, number];
  speedY: { min: number; max: number };
  speedX: { min: number; max: number };
  lifespan: number;
  scaleX: number;
  scaleY: number;
  alpha: { start: number; end: number };
  /** Milliseconds between emission batches */
  frequency: number;
  gravityY?: number;
}

/**
 * Strategy interface for weather particle emit zone placement.
 * Each weather type implements this to define where particles spawn
 * relative to the viewport.
 */
export interface WeatherParticleStrategy {
  getEmitZone(width: number, height: number): Phaser.Geom.Rectangle;
}
