import { Entity } from '@into-the-void/shared-types';
import { AbstractRenderStrategy } from './AbstractRenderStrategy';
import type { TextureInfo } from './types';
import Phaser from 'phaser';

/**
 * Render strategy for artifact entities.
 * Simple rendering with nameplate (always visible).
 */
export class ArtifactRenderStrategy extends AbstractRenderStrategy {

  getTexture(_entity: Entity, _scene: Phaser.Scene): TextureInfo {
    return { key: 'artifact' };
  }

  setupUI(
    _entity: Entity,
    container: Phaser.GameObjects.Container,
    scene: Phaser.Scene,
    displayName: string,
    _gated: boolean,
    spriteYOffset: number,
    actualSpriteHeight: number,
  ): void {
    const spriteTopY = spriteYOffset - actualSpriteHeight;
    const uiBaseY = spriteTopY - 20;

    const nameplate = scene.add.text(0, uiBaseY, displayName, {
      fontSize: '32px',
      fontStyle: 'bold',
      color: '#ffffff',
      backgroundColor: '#000000cc',
      padding: { x: 16, y: 10 },
    });
    nameplate.setOrigin(0.5, 0.5);
    nameplate.setShadow(2, 2, '#000000', 3);
    container.add(nameplate);
  }
}
