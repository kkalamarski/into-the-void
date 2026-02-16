import Phaser from 'phaser';
import { ZONE_SIZE, TileStructure } from '@into-the-void/shared-types';
import { ISO_TILE_WIDTH, ISO_TILE_HEIGHT } from '../scenes/WorldScene';
import { IsometricTransform } from '../utils/IsometricTransform';

const MINIMAP_SIZE = 180;
const MINIMAP_PADDING = 20;
const MINIMAP_ZOOM = 0.1;

export class MinimapCamera {
  private scene: Phaser.Scene;
  private minimapCam: Phaser.Cameras.Scene2D.Camera | null = null;
  private playerIndicator: Phaser.GameObjects.Graphics | null = null;
  private structureMarkers: Phaser.GameObjects.Graphics | null = null;
  private isoTransform: IsometricTransform | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    // Create local transform for coordinate conversion
    this.isoTransform = new IsometricTransform(ISO_TILE_WIDTH, ISO_TILE_HEIGHT);
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

    // Isometric world is diamond-shaped in screen coordinates:
    // Grid (0,0) → screen (0, 0), Grid (127,0) → screen (+8128, 4064)
    // Grid (0,127) → screen (-8128, 4064), Grid (127,127) → screen (0, 8128)
    // Bounds must encompass the entire diamond from -worldWidth/2 to +worldWidth/2
    const worldWidth = ZONE_SIZE * ISO_TILE_WIDTH;
    const worldHeight = ZONE_SIZE * ISO_TILE_HEIGHT;
    this.minimapCam.setBounds(-worldWidth / 2, 0, worldWidth, worldHeight);

    // Give minimap camera a name for identification
    this.minimapCam.setName('minimap');

    // Create player indicator (rendered on main camera, fixed position)
    this.playerIndicator = this.scene.add.graphics();
    this.playerIndicator.setScrollFactor(0);
    this.playerIndicator.setDepth(1001);
    this.updatePlayerIndicator();

    // Create graphics for structure markers (rendered on main camera)
    this.structureMarkers = this.scene.add.graphics();
    this.structureMarkers.setScrollFactor(1); // Moves with world
    this.structureMarkers.setDepth(999); // Above terrain, below HUD

    // Make minimap camera ignore player indicator and structure markers (only render on main camera)
    this.minimapCam.ignore([this.playerIndicator, this.structureMarkers]);

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
      const toIgnore = [...gameObjects];
      if (this.structureMarkers) {
        toIgnore.push(this.structureMarkers);
      }
      this.minimapCam.ignore(toIgnore);
    }
  }

  /**
   * Update structure markers for minimap display.
   * Renders wall positions as orange rectangles on the minimap.
   */
  updateStructureMarkers(structures: TileStructure[]): void {
    if (!this.structureMarkers || !this.isoTransform) return;

    this.structureMarkers.clear();

    // Wall markers: orange fill with white border
    this.structureMarkers.fillStyle(0xff6b35, 0.9);
    this.structureMarkers.lineStyle(1, 0xffffff, 0.5);

    // Scale marker size for minimap zoom (MINIMAP_ZOOM = 0.1)
    // At zoom 0.1, we need markers ~40px to be visible as ~4px
    const markerSize = 32; // World units, appears as ~3.2px at zoom 0.1

    for (const structure of structures) {
      if (structure.type === 'wall') {
        for (const tile of structure.tiles) {
          const screenPos = this.isoTransform.gridToScreen(tile.x, tile.y);

          // Draw small rectangle at tile position
          this.structureMarkers.fillRect(
            screenPos.x - markerSize / 2,
            screenPos.y - markerSize / 2,
            markerSize,
            markerSize
          );
          this.structureMarkers.strokeRect(
            screenPos.x - markerSize / 2,
            screenPos.y - markerSize / 2,
            markerSize,
            markerSize
          );
        }
      }
    }
  }

  private handleResize(gameSize: Phaser.Structs.Size): void {
    if (!this.minimapCam) return;

    const newX = gameSize.width - MINIMAP_SIZE - MINIMAP_PADDING;
    const newY = gameSize.height - MINIMAP_SIZE - MINIMAP_PADDING;

    // Update minimap camera position
    this.minimapCam.setViewport(newX, newY, MINIMAP_SIZE, MINIMAP_SIZE);

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
    if (this.playerIndicator) {
      this.playerIndicator.destroy();
      this.playerIndicator = null;
    }
    if (this.structureMarkers) {
      this.structureMarkers.destroy();
      this.structureMarkers = null;
    }
  }
}
