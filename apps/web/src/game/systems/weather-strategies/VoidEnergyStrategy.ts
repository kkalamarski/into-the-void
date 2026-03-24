import Phaser from 'phaser';
import type { WeatherParticleStrategy } from './types';

export class VoidEnergyStrategy implements WeatherParticleStrategy {
  getEmitZone(width: number, height: number): Phaser.Geom.Rectangle {
    // Chaotic: spawn across full viewport
    return new Phaser.Geom.Rectangle(0, 0, width, height);
  }
}
