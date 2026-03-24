import Phaser from 'phaser';
import type { WeatherParticleStrategy } from './types';

export class SnowStrategy implements WeatherParticleStrategy {
  getEmitZone(width: number, height: number): Phaser.Geom.Rectangle {
    // Falling: spawn strip above viewport, particles fall through
    return new Phaser.Geom.Rectangle(0, -(height * 0.15), width, height * 0.15);
  }
}
