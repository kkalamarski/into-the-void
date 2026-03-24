import Phaser from 'phaser';
import type { WeatherParticleStrategy } from './types';

export class MistStrategy implements WeatherParticleStrategy {
  getEmitZone(width: number, height: number): Phaser.Geom.Rectangle {
    // Drifting: spawn across full viewport
    return new Phaser.Geom.Rectangle(0, 0, width, height);
  }
}
