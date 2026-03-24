import Phaser from 'phaser';
import { MinimapCamera } from '../../rendering/MinimapCamera';
import { WeatherSystem } from '../../systems/WeatherSystem';
import type { ZoneHUD } from '../../ui/ZoneHUD';

/**
 * Manages camera follow, zoom, and minimap.
 * Extracted from WorldScene (Phase 152).
 */
export class CameraController {
  private minimapCamera: MinimapCamera | null = null;

  constructor(private scene: Phaser.Scene) {}

  /**
   * Initialize camera zoom and minimap.
   * Called from WorldScene.create() after tileLayer and zoneHUD are ready.
   */
  create(zoneHUD: ZoneHUD | null): void {
    // Set fixed zoom to show ~20x15 tiles viewport (for 256x256 sprites)
    this.scene.cameras.main.setZoom(0.5);

    // Initialize MinimapCamera
    this.minimapCamera = new MinimapCamera(this.scene);
    this.minimapCamera.create();

    // Make minimap camera ignore ZoneHUD elements (they have scrollFactor 0)
    if (zoneHUD) {
      this.minimapCamera.ignore(zoneHUD.getGameObjects());
    }
  }

  /**
   * Set camera to follow the local player sprite.
   * Phase 134: center-locked camera — no lerp delay.
   */
  startFollowPlayer(sprite: Phaser.GameObjects.Sprite): void {
    this.scene.cameras.main.startFollow(sprite, true, 1.0, 1.0);
    if (this.minimapCamera) {
      this.minimapCamera.startFollow(sprite);
    }
  }

  /**
   * Update minimap camera to ignore current weather emitters.
   * Called after each weather transition to ensure new emitters are excluded.
   */
  updateMinimapWeatherIgnore(weatherSystem: WeatherSystem): void {
    if (this.minimapCamera && weatherSystem) {
      const emitters = weatherSystem.getActiveEmitters();
      if (emitters.length > 0) {
        this.minimapCamera.ignore(emitters);
      }
    }
  }

  /**
   * Proxy to MinimapCamera.ignore() for any future ignore needs.
   */
  ignore(gameObjects: Phaser.GameObjects.GameObject[]): void {
    if (this.minimapCamera) {
      this.minimapCamera.ignore(gameObjects);
    }
  }

  /**
   * Get the MinimapCamera instance (for edge cases where direct access is needed).
   */
  getMinimapCamera(): MinimapCamera | null {
    return this.minimapCamera;
  }

  /**
   * Clean up camera resources.
   */
  destroy(): void {
    if (this.minimapCamera) {
      this.minimapCamera.destroy();
      this.minimapCamera = null;
    }
  }
}
