import Phaser from 'phaser';
import { Entity } from '@into-the-void/shared-types';
import type { RenderStrategy, ScaleConfig, ShadowDimensions, HitAreaConfig, TextureInfo, VisibleBounds } from './types';
import { ENTITY_SCALE } from './creature-render-data';

/**
 * Base class for entity render strategies.
 * Provides sensible defaults that match EntityRenderer's original behavior.
 * Subclasses override methods to provide type-specific rendering logic.
 */
export abstract class AbstractRenderStrategy implements RenderStrategy {
  /** Default scale: look up entity.type in ENTITY_SCALE */
  getScale(entity: Entity): ScaleConfig {
    const s = ENTITY_SCALE[entity.type] ?? 1.0;
    return { scaleX: s, scaleY: s, effectiveScale: s };
  }

  /** Default shadow: 60*scale width, 30*scale height */
  getShadowDimensions(_entity: Entity, scale: number): ShadowDimensions {
    return { width: 60 * scale, height: 30 * scale };
  }

  /** Default hit area: padded rectangle (15% horizontal, 20% top) */
  getHitArea(_entity: Entity, texW: number, texH: number, _isAnimated: boolean, _featureBounds: VisibleBounds | null): HitAreaConfig {
    const hitPadX = texW * 0.15;
    const hitPadTop = texH * 0.2;
    return {
      rect: new Phaser.Geom.Rectangle(hitPadX, hitPadTop, texW - hitPadX * 2, texH - hitPadTop),
    };
  }

  /** Default cursor: pointer */
  getCursor(_entity: Entity): string {
    return 'pointer';
  }

  /** Default: no extra Y offset */
  getSpriteYOffset(_entity: Entity): number {
    return 0;
  }

  /** Subclasses must implement texture lookup */
  abstract getTexture(entity: Entity, scene: Phaser.Scene): TextureInfo;

  /** Default: no UI setup (subclasses override for health bars, nameplates, etc.) */
  setupUI(
    _entity: Entity,
    _container: Phaser.GameObjects.Container,
    _scene: Phaser.Scene,
    _displayName: string,
    _gated: boolean,
    _spriteYOffset: number,
    _actualSpriteHeight: number,
  ): void {
    // No-op default
  }

  /** Default: no depth boost */
  getDepthBoost(_entity: Entity, _tileHeight: number): number {
    return 0;
  }

  /** Default: no spawn effects */
  applySpawnEffects(_entity: Entity, _container: Phaser.GameObjects.Container, _scene: Phaser.Scene): void {
    // No-op default
  }

  /** Default: show UI always (not hover-only) */
  isHoverUI(): boolean {
    return false;
  }
}
