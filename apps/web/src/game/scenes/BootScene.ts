import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    // Load minimal assets needed for loading screen
    this.load.setPath('assets/');
  }

  create(): void {
    // Initialize any game-wide settings
    this.scene.start('PreloadScene');
  }
}
