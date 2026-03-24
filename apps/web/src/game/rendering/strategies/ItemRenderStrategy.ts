import Phaser from 'phaser';
import { Entity } from '@into-the-void/shared-types';
import type { ItemEntity } from '@into-the-void/shared-types';
import { AbstractRenderStrategy } from './AbstractRenderStrategy';
import type { TextureInfo } from './types';
import { getItemSprite } from '../../../config/itemSpriteMap';

/**
 * Render strategy for ground item entities.
 * Handles item spritesheet lookups with frame selection.
 */
export class ItemRenderStrategy extends AbstractRenderStrategy {

  getTexture(entity: Entity, scene: Phaser.Scene): TextureInfo {
    const itemEntity = entity as ItemEntity;
    const spriteInfo = getItemSprite(itemEntity.itemId);
    if (spriteInfo) {
      const sheetKey = `item-sheet-${spriteInfo.sheet.replace('.png', '')}`;
      if (scene.textures.exists(sheetKey)) {
        return { key: sheetKey, frame: spriteInfo.frame };
      }
    }
    return { key: 'item' };
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
