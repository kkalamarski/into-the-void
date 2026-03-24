import Phaser from 'phaser';
import type { WeatherParticleStrategy } from './types';

export class SporesStrategy implements WeatherParticleStrategy {
  getEmitZone(width: number, height: number): Phaser.Geom.Rectangle {
    // Floating/drifting: spawn across full viewport
    return new Phaser.Geom.Rectangle(0, 0, width, height);
  }
}
