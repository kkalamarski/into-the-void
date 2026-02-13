import Phaser from 'phaser';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' });
  }

  preload(): void {
    // Create loading bar
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const progressBar = this.add.graphics();
    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x1e1e2e, 0.8);
    progressBox.fillRect(width / 2 - 160, height / 2 - 25, 320, 50);

    const loadingText = this.add.text(width / 2, height / 2 - 50, 'Loading...', {
      fontSize: '20px',
      color: '#e0e0e0',
    });
    loadingText.setOrigin(0.5, 0.5);

    const percentText = this.add.text(width / 2, height / 2, '0%', {
      fontSize: '18px',
      color: '#e0e0e0',
    });
    percentText.setOrigin(0.5, 0.5);

    // Update progress bar
    this.load.on('progress', (value: number) => {
      percentText.setText(`${Math.round(value * 100)}%`);
      progressBar.clear();
      progressBar.fillStyle(0x7b68ee, 1);
      progressBar.fillRect(width / 2 - 150, height / 2 - 15, 300 * value, 30);
    });

    this.load.on('complete', () => {
      progressBar.destroy();
      progressBox.destroy();
      loadingText.destroy();
      percentText.destroy();
    });

    // Load game assets
    this.loadAssets();
  }

  private loadAssets(): void {
    this.load.setPath('assets/');

    // Generate placeholder textures for now
    this.generatePlaceholderTextures();
  }

  private generatePlaceholderTextures(): void {
    // Generate placeholder tile textures
    const graphics = this.make.graphics({ x: 0, y: 0 });

    // Floor tile
    graphics.fillStyle(0x3a3a4a);
    graphics.fillRect(0, 0, 32, 32);
    graphics.lineStyle(1, 0x2a2a3a);
    graphics.strokeRect(0, 0, 32, 32);
    graphics.generateTexture('tile_floor', 32, 32);
    graphics.clear();

    // Wall tile
    graphics.fillStyle(0x1a1a2a);
    graphics.fillRect(0, 0, 32, 32);
    graphics.generateTexture('tile_wall', 32, 32);
    graphics.clear();

    // Player
    graphics.fillStyle(0x7b68ee);
    graphics.fillCircle(16, 16, 12);
    graphics.generateTexture('player', 32, 32);
    graphics.clear();

    // Creature
    graphics.fillStyle(0xff4444);
    graphics.fillCircle(16, 16, 10);
    graphics.generateTexture('creature', 32, 32);
    graphics.clear();

    // Mineral
    graphics.fillStyle(0x44ffff);
    graphics.fillRect(8, 8, 16, 16);
    graphics.generateTexture('mineral', 32, 32);
    graphics.clear();

    // Item
    graphics.fillStyle(0xffff44);
    graphics.fillCircle(16, 16, 6);
    graphics.generateTexture('item', 32, 32);
    graphics.clear();

    graphics.destroy();
  }

  create(): void {
    this.scene.start('WorldScene');
  }
}
