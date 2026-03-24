import Phaser from 'phaser';
import { Entity } from '@into-the-void/shared-types';

export interface ShadowDimensions {
  width: number;
  height: number;
}

export interface HitAreaConfig {
  rect: Phaser.Geom.Rectangle;
}

export interface TextureInfo {
  key: string;
  frame?: number;
}

export interface ScaleConfig {
  scaleX: number;
  scaleY: number;
  /** Effective scale for height calculations (usually scaleY) */
  effectiveScale: number;
}

export interface VisibleBounds {
  topFrac: number;
  bottomFrac: number;
  leftFrac: number;
  rightFrac: number;
}

export interface RenderStrategy {
  /** Get scale multipliers for this entity */
  getScale(entity: Entity): ScaleConfig;

  /** Get shadow ellipse dimensions (pre-scaled) */
  getShadowDimensions(entity: Entity, scale: number): ShadowDimensions;

  /** Get hit area rectangle for click detection (in texture space) */
  getHitArea(entity: Entity, texW: number, texH: number, isAnimated: boolean, featureBounds: VisibleBounds | null): HitAreaConfig;

  /** Get cursor style for this entity type */
  getCursor(entity: Entity): string;

  /** Get additional Y offset for sprite positioning */
  getSpriteYOffset(entity: Entity): number;

  /** Get texture key and optional frame for this entity */
  getTexture(entity: Entity, scene: Phaser.Scene): TextureInfo;

  /** Set up type-specific UI elements (health bars, nameplates, yield bars) on the container */
  setupUI(
    entity: Entity,
    container: Phaser.GameObjects.Container,
    scene: Phaser.Scene,
    displayName: string,
    gated: boolean,
    spriteYOffset: number,
    actualSpriteHeight: number,
  ): void;

  /** Get depth boost for this entity type (e.g., features get extra depth) */
  getDepthBoost(entity: Entity, tileHeight: number): number;

  /** Apply spawn-time effects (stealth, frenzy, rarity glow, etc.) — sets container data for EntityRenderer to act on */
  applySpawnEffects(entity: Entity, container: Phaser.GameObjects.Container, scene: Phaser.Scene): void;

  /** Whether this entity type shows nameplate/yield on hover only */
  isHoverUI(): boolean;
}
