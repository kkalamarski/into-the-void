import Phaser from 'phaser';
import { ZONE_SIZE } from '@into-the-void/shared-types';

const TILE_SIZE = 96;
const MINIMAP_SIZE = 180;
const MINIMAP_PADDING = 20;
const MINIMAP_ZOOM = 0.15; // Zoomed out to show more area

export class MinimapCamera {
  private scene: Phaser.Scene;
  private minimapCam: Phaser.Cameras.Scene2D.Camera | null = null;
  private border: Phaser.GameObjects.Graphics | null = null;
  private playerIndicator: Phaser.GameObjects.Graphics | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  create(): void {
    const mainCam = this.scene.cameras.main;

    // Create minimap camera in bottom-right corner
    this.minimapCam = this.scene.cameras.add(
      mainCam.width - MINIMAP_SIZE - MINIMAP_PADDING,
      mainCam.height - MINIMAP_SIZE - MINIMAP_PADDING,
      MINIMAP_SIZE,
      MINIMAP_SIZE
    );

    // Configure minimap camera
    this.minimapCam.setZoom(MINIMAP_ZOOM);
    this.minimapCam.setBackgroundColor(0x111122);
    this.minimapCam.setBounds(0, 0, ZONE_SIZE * TILE_SIZE, ZONE_SIZE * TILE_SIZE);

    // Give minimap camera a name for identification
    this.minimapCam.setName('minimap');

    // Create border (fixed to screen, not world)
    this.border = this.scene.add.graphics();
    this.border.lineStyle(2, 0x666688, 1);
    this.border.strokeRect(
      mainCam.width - MINIMAP_SIZE - MINIMAP_PADDING,
      mainCam.height - MINIMAP_SIZE - MINIMAP_PADDING,
      MINIMAP_SIZE,
      MINIMAP_SIZE
    );
    this.border.setScrollFactor(0);
    this.border.setDepth(1000);

    // Create player indicator (rendered on main camera, fixed position)
    this.playerIndicator = this.scene.add.graphics();
    this.playerIndicator.setScrollFactor(0);
    this.playerIndicator.setDepth(1001);
    this.updatePlayerIndicator();

    // Make minimap camera ignore UI elements (border and player indicator)
    // They should only render on main camera
    this.minimapCam.ignore([this.border, this.playerIndicator]);

    // Handle window resize
    this.scene.scale.on('resize', this.handleResize, this);
  }

  startFollow(target: Phaser.GameObjects.Sprite): void {
    if (this.minimapCam) {
      this.minimapCam.startFollow(target, true);
    }
  }

  /**
   * Make minimap camera ignore additional game objects (e.g., ZoneHUD elements)
   */
  ignore(gameObjects: Phaser.GameObjects.GameObject[]): void {
    if (this.minimapCam) {
      this.minimapCam.ignore(gameObjects);
    }
  }

  private handleResize(gameSize: Phaser.Structs.Size): void {
    if (!this.minimapCam || !this.border) return;

    const newX = gameSize.width - MINIMAP_SIZE - MINIMAP_PADDING;
    const newY = gameSize.height - MINIMAP_SIZE - MINIMAP_PADDING;

    // Update minimap camera position
    this.minimapCam.setViewport(newX, newY, MINIMAP_SIZE, MINIMAP_SIZE);

    // Update border position
    this.border.clear();
    this.border.lineStyle(2, 0x666688, 1);
    this.border.strokeRect(newX, newY, MINIMAP_SIZE, MINIMAP_SIZE);

    // Update player indicator position
    this.updatePlayerIndicator();
  }

  private updatePlayerIndicator(): void {
    if (!this.playerIndicator) return;

    const mainCam = this.scene.cameras.main;
    const indicatorX = mainCam.width - MINIMAP_SIZE / 2 - MINIMAP_PADDING;
    const indicatorY = mainCam.height - MINIMAP_SIZE / 2 - MINIMAP_PADDING;

    this.playerIndicator.clear();
    // White dot for player position (center of minimap since camera follows player)
    this.playerIndicator.fillStyle(0xffffff, 1);
    this.playerIndicator.fillCircle(indicatorX, indicatorY, 4);
    // Yellow border for visibility
    this.playerIndicator.lineStyle(1, 0xffff00, 1);
    this.playerIndicator.strokeCircle(indicatorX, indicatorY, 4);
  }

  destroy(): void {
    this.scene.scale.off('resize', this.handleResize, this);

    if (this.minimapCam) {
      this.scene.cameras.remove(this.minimapCam);
      this.minimapCam = null;
    }
    if (this.border) {
      this.border.destroy();
      this.border = null;
    }
    if (this.playerIndicator) {
      this.playerIndicator.destroy();
      this.playerIndicator = null;
    }
  }
}
