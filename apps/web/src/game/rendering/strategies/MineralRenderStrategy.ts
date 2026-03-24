import Phaser from 'phaser';
import { Entity, Mineral } from '@into-the-void/shared-types';
import type { NodeRarity } from '@into-the-void/shared-types';
import { AbstractRenderStrategy } from './AbstractRenderStrategy';
import type { ScaleConfig, ShadowDimensions, HitAreaConfig, TextureInfo, VisibleBounds } from './types';
import {
  ENTITY_SCALE,
  RARITY_SCALE_MULTIPLIER,
  FEATURE_SPRITE_VARIANTS,
  hashEntityId,
} from './creature-render-data';
import { applyRareNodeFX } from '../RareNodeFX';

/**
 * Render strategy for mineral entities.
 * Handles rarity scaling, hover-only UI, feature bounds hit areas,
 * and sprite variants.
 */
export class MineralRenderStrategy extends AbstractRenderStrategy {

  getScale(entity: Entity): ScaleConfig {
    const mineral = entity as Mineral;
    let scale = ENTITY_SCALE['mineral'] ?? 2.0;
    // Apply rarity scale multiplier
    const rarity = (mineral as { rarity?: NodeRarity }).rarity ?? 'common';
    scale *= RARITY_SCALE_MULTIPLIER[rarity] ?? 1.0;
    return { scaleX: scale, scaleY: scale, effectiveScale: scale };
  }

  getShadowDimensions(_entity: Entity, scale: number): ShadowDimensions {
    return { width: 45 * scale, height: 22 * scale };
  }

  getHitArea(_entity: Entity, texW: number, texH: number, _isAnimated: boolean, featureBounds: VisibleBounds | null): HitAreaConfig {
    if (featureBounds) {
      // Features: hit area at the BASE of the sprite (bottom 40% of visible art)
      const visibleTop = featureBounds.topFrac * texH;
      const visibleBottom = (1 - featureBounds.bottomFrac) * texH;
      const visibleHeight = visibleBottom - visibleTop;
      const baseHeight = visibleHeight * 0.4;
      return {
        rect: new Phaser.Geom.Rectangle(
          featureBounds.leftFrac * texW,
          visibleBottom - baseHeight,
          (1 - featureBounds.leftFrac - featureBounds.rightFrac) * texW,
          baseHeight
        ),
      };
    }
    return super.getHitArea(_entity, texW, texH, _isAnimated, featureBounds);
  }

  getTexture(entity: Entity, _scene: Phaser.Scene): TextureInfo {
    const mineral = entity as Mineral;
    if (mineral.resourceId) {
      // Strip _rare/_epic suffix to use base texture
      const baseResourceId = mineral.resourceId.replace(/_rare$|_epic$/, '');
      // Check if this mineral has sprite variants
      const variantCount = FEATURE_SPRITE_VARIANTS[baseResourceId];
      if (variantCount) {
        const variant = (hashEntityId(entity.id) % variantCount) + 1;
        return { key: `${baseResourceId}-v${variant}` };
      }
      return { key: baseResourceId };
    }
    return { key: 'mineral' };
  }

  setupUI(
    entity: Entity,
    container: Phaser.GameObjects.Container,
    scene: Phaser.Scene,
    displayName: string,
    _gated: boolean,
    spriteYOffset: number,
    actualSpriteHeight: number,
  ): void {
    const mineral = entity as Mineral;
    const spriteTopY = spriteYOffset - actualSpriteHeight;
    const uiBaseY = spriteTopY - 20;

    // Rarity prefix
    const rarity = (mineral as { rarity?: NodeRarity }).rarity;
    const rarityPrefix = rarity === 'epic' ? '[Epic] ' : rarity === 'rare' ? '[Rare] ' : '';

    // Nameplate (hidden by default, shown on hover)
    const nameplate = scene.add.text(0, uiBaseY - 20, rarityPrefix + displayName, {
      fontSize: '32px',
      fontStyle: 'bold',
      color: '#ffffff',
      backgroundColor: '#000000cc',
      padding: { x: 16, y: 10 },
    });
    nameplate.setOrigin(0.5, 0.5);
    nameplate.setShadow(2, 2, '#000000', 3);
    nameplate.setVisible(false);
    container.add(nameplate);
    container.setData('nameplate', nameplate);

    // Yield bar (hidden by default, shown on hover)
    const yieldBar = this.createYieldBar(scene, mineral.yield, mineral.maxYield);
    yieldBar.y = uiBaseY;
    yieldBar.setVisible(false);
    container.add(yieldBar);
    container.setData('maxYield', mineral.maxYield);
    container.setData('yieldBar', yieldBar);
  }

  getDepthBoost(_entity: Entity, tileHeight: number): number {
    return tileHeight * 2;
  }

  applySpawnEffects(entity: Entity, container: Phaser.GameObjects.Container, _scene: Phaser.Scene): void {
    const mineral = entity as Mineral;
    const rarity = (mineral as { rarity?: NodeRarity }).rarity;
    const sprite = container.getData('entitySprite') as Phaser.GameObjects.Sprite | undefined;
    if (sprite) {
      applyRareNodeFX(sprite, rarity);
    }
    // Store rarity on container for marker creation
    if (rarity && rarity !== 'common') {
      container.setData('rarity', rarity);
    }
  }

  isHoverUI(): boolean {
    return true;
  }

  /** Creates a simple yield bar without name. */
  private createYieldBar(scene: Phaser.Scene, currentYield: number, maxYield: number): Phaser.GameObjects.Graphics {
    const width = 280;
    const height = 32;
    const graphics = scene.add.graphics();

    graphics.lineStyle(4, 0x000000, 1);
    graphics.strokeRect(-width / 2, 0, width, height);

    graphics.fillStyle(0x222222, 0.95);
    graphics.fillRect(-width / 2, 0, width, height);

    const yieldPercent = currentYield / maxYield;
    let fillColor: number;
    if (yieldPercent > 0.5) {
      fillColor = 0x44cc44;
    } else if (yieldPercent >= 0.25) {
      fillColor = 0xccaa00;
    } else {
      fillColor = 0xcc4444;
    }

    const fillWidth = (width - 8) * yieldPercent;
    graphics.fillStyle(fillColor, 1);
    graphics.fillRect(-width / 2 + 4, 4, fillWidth, height - 8);

    return graphics;
  }
}
