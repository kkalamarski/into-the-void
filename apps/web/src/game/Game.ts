import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { PreloadScene } from './scenes/PreloadScene';
import { WorldScene } from './scenes/WorldScene';

export class Game {
  private game: Phaser.Game;

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
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { x: 0, y: 0 },
          debug: false,
        },
      },
    };

    this.game = new Phaser.Game(config);
  }

  getScene(key: string): Phaser.Scene | undefined {
    return this.game.scene.getScene(key);
  }

  destroy(): void {
    this.game.destroy(true);
  }
}
