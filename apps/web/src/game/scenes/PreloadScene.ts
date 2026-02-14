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

    // Generate tile textures for all biomes
    this.generateTileTextures();
  }

  private generateTileTextures(): void {
    const TILE_SIZE = 32;
    const graphics = this.make.graphics({ x: 0, y: 0 });

    // Define all tile textures (16 total - 8 biomes, 2 tiles each)
    const tileTextures = [
      // Void Plains
      { key: 'tile_void_floor', color: 0x4a4a5a, border: 0x3a3a4a },
      { key: 'tile_void_wall', color: 0x1a1a2a, border: 0x0a0a1a },
      // Crystal Caves
      { key: 'tile_crystal_floor', color: 0x5b48ce, border: 0x4b38be },
      { key: 'tile_crystal_formation', color: 0x7b68ee, border: 0x6b58de },
      // Toxic Wastes
      { key: 'tile_toxic_floor', color: 0x7aad12, border: 0x6a9d02 },
      { key: 'tile_toxic_pool', color: 0x9acd32, border: 0x8abd22 },
      // Ancient Ruins
      { key: 'tile_ruins_floor', color: 0x7b6345, border: 0x6b5335 },
      { key: 'tile_ruins_wall', color: 0x8b7355, border: 0x7b6345 },
      // Frozen Expanse
      { key: 'tile_ice_floor', color: 0xa0d0d6, border: 0x90c0c6 },
      { key: 'tile_ice_wall', color: 0xb0e0e6, border: 0xa0d0d6 },
      // Volcanic Ridge
      { key: 'tile_volcanic_floor', color: 0xdf2500, border: 0xcf1500 },
      { key: 'tile_lava', color: 0xff4500, border: 0xef3500 },
      // Fungal Forest
      { key: 'tile_fungal_floor', color: 0x8360cb, border: 0x7350bb },
      { key: 'tile_fungal_growth', color: 0x9370db, border: 0x8360cb },
      // Starfall Crater
      { key: 'tile_crater_floor', color: 0x090960, border: 0x000050 },
      { key: 'tile_crater_debris', color: 0x191970, border: 0x090960 },
    ];

    // Generate each tile texture
    for (const tile of tileTextures) {
      graphics.fillStyle(tile.color);
      graphics.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
      graphics.lineStyle(1, tile.border);
      graphics.strokeRect(0, 0, TILE_SIZE, TILE_SIZE);
      graphics.generateTexture(tile.key, TILE_SIZE, TILE_SIZE);
      graphics.clear();
    }

    // Player
    graphics.fillStyle(0x7b68ee);
    graphics.fillCircle(16, 16, 12);
    graphics.generateTexture('player', TILE_SIZE, TILE_SIZE);
    graphics.clear();

    // Creature
    graphics.fillStyle(0xff4444);
    graphics.fillCircle(16, 16, 10);
    graphics.generateTexture('creature', TILE_SIZE, TILE_SIZE);
    graphics.clear();

    // Mineral
    graphics.fillStyle(0x44ffff);
    graphics.fillRect(8, 8, 16, 16);
    graphics.generateTexture('mineral', TILE_SIZE, TILE_SIZE);
    graphics.clear();

    // Item
    graphics.fillStyle(0xffff44);
    graphics.fillCircle(16, 16, 6);
    graphics.generateTexture('item', TILE_SIZE, TILE_SIZE);
    graphics.clear();

    graphics.destroy();
  }

  create(): void {
    this.scene.start('WorldScene');
  }
}
