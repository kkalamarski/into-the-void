import Phaser from 'phaser';
import { Entity, Plant } from '@into-the-void/shared-types';
import type { NodeRarity } from '@into-the-void/shared-types';
import { AbstractRenderStrategy } from './AbstractRenderStrategy';
import type { ScaleConfig, ShadowDimensions, HitAreaConfig, TextureInfo, VisibleBounds } from './types';
import {
  ENTITY_SCALE,
  PLANT_SCALE_OVERRIDE,
  RARITY_SCALE_MULTIPLIER,
  FEATURE_SPRITE_VARIANTS,
  hashEntityId,
} from './creature-render-data';
import { applyRareNodeFX } from '../RareNodeFX';

/**
 * Render strategy for plant entities.
 * Handles plant scale overrides, rarity scaling, hover-only UI,
 * feature bounds hit areas, and sprite variants.
 */
export class PlantRenderStrategy extends AbstractRenderStrategy {

  getScale(entity: Entity): ScaleConfig {
    const plant = entity as Plant;
    let scale = ENTITY_SCALE['plant'] ?? 1.8;
    if (plant.speciesId && PLANT_SCALE_OVERRIDE[plant.speciesId]) {
      scale = PLANT_SCALE_OVERRIDE[plant.speciesId];
    }
    // Apply rarity scale multiplier
    const rarity = (plant as { rarity?: NodeRarity }).rarity ?? 'common';
    scale *= RARITY_SCALE_MULTIPLIER[rarity] ?? 1.0;
    return { scaleX: scale, scaleY: scale, effectiveScale: scale };
  }

  getShadowDimensions(_entity: Entity, scale: number): ShadowDimensions {
    return { width: 50 * scale, height: 25 * scale };
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
    // Fallback to default
    return super.getHitArea(_entity, texW, texH, _isAnimated, featureBounds);
  }

  getTexture(entity: Entity, _scene: Phaser.Scene): TextureInfo {
    const plant = entity as Plant;
    if (plant.speciesId) {
      // Strip _rare/_epic suffix to use base texture
      const baseSpeciesId = plant.speciesId.replace(/_rare$|_epic$/, '');
      // Check if this plant species has sprite variants
      const variantCount = FEATURE_SPRITE_VARIANTS[baseSpeciesId];
      if (variantCount) {
        const variant = (hashEntityId(entity.id) % variantCount) + 1;
        return { key: `${baseSpeciesId}-v${variant}` };
      }
      return { key: baseSpeciesId };
    }
    return { key: 'plant' };
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
    const plant = entity as Plant;
    const spriteTopY = spriteYOffset - actualSpriteHeight;
    const uiBaseY = spriteTopY - 20;

    // Rarity prefix
    const rarity = (plant as { rarity?: NodeRarity }).rarity;
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
    const yieldBar = this.createYieldBar(scene, plant.yield, plant.maxYield);
    yieldBar.y = uiBaseY;
    yieldBar.setVisible(false);
    container.add(yieldBar);
    container.setData('maxYield', plant.maxYield);
    container.setData('yieldBar', yieldBar);
  }

  getDepthBoost(_entity: Entity, tileHeight: number): number {
    return tileHeight * 2;
  }

  applySpawnEffects(entity: Entity, container: Phaser.GameObjects.Container, _scene: Phaser.Scene): void {
    const plant = entity as Plant;
    const rarity = (plant as { rarity?: NodeRarity }).rarity;
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

  /** Creates a simple health/yield bar without name (for minerals/plants). */
  private createYieldBar(scene: Phaser.Scene, currentYield: number, maxYield: number): Phaser.GameObjects.Graphics {
    const width = 280;
    const height = 32;
    const graphics = scene.add.graphics();

    // Border
    graphics.lineStyle(4, 0x000000, 1);
    graphics.strokeRect(-width / 2, 0, width, height);

    // Background
    graphics.fillStyle(0x222222, 0.95);
    graphics.fillRect(-width / 2, 0, width, height);

    // Yield fill color based on percentage
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
