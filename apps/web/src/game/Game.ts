import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { PreloadScene } from './scenes/PreloadScene';
import { WorldScene } from './scenes/WorldScene';

export class Game {
  private game: Phaser.Game;
  private onReadyCallback: (() => void) | null = null;

  constructor(container: HTMLElement) {
    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: container,
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: '#0a0a0f',
      pixelArt: true,
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      scene: [BootScene, PreloadScene, WorldScene],
      // Disable physics - we use tile-based movement
      physics: undefined,
      callbacks: {
        postBoot: () => {
          // Notify when Phaser is ready
          if (this.onReadyCallback) {
            this.onReadyCallback();
          }
        },
      },
    };

    this.game = new Phaser.Game(config);
  }

  /**
   * Set callback for when game is ready
   */
  onReady(callback: () => void): void {
    this.onReadyCallback = callback;
  }

  /**
   * Get scene by key (generic)
   */
  getScene(key: string): Phaser.Scene | undefined {
    return this.game.scene.getScene(key);
  }

  /**
   * Get WorldScene (typed accessor)
   */
  getWorldScene(): WorldScene | undefined {
    return this.game.scene.getScene('WorldScene') as WorldScene | undefined;
  }

  /**
   * Check if WorldScene is active
   */
  isWorldSceneActive(): boolean {
    return this.game.scene.isActive('WorldScene');
  }

  destroy(): void {
    this.game.destroy(true);
  }
}
