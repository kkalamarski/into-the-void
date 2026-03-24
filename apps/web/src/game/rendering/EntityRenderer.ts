import Phaser from 'phaser';
import { Entity, Creature, Position, ZONE_SIZE } from '@into-the-void/shared-types';
import type { CreatureBehavior, DamageType } from '@into-the-void/shared-types';
import { IsometricTransform } from '../utils/IsometricTransform';
import { useStatsStore } from '../../store/statsStore';
import { getStrategyForType, initStrategies } from './strategies';
import type { VisibleBounds } from './strategies';
import { ANIMATED_CREATURES } from './strategies/creature-render-data';

const ELEVATION_HEIGHT_STEP = 128; // Pixels per elevation level (1.0 × diamond height for 256x256 cubes)
const ENTITY_GROUND_OFFSET = 0; // No visual offset — depth sorting (entityOffset=65) handles south-tile wall occlusion
const OCCLUSION_DEPTH_THRESHOLD = 10.0;  // Structures this far "in front" occlude entities
const OCCLUSION_MIN_HEIGHT = 3;          // Only structures >= 3 elevation levels occlude
const OCCLUDED_ALPHA = 0.3;              // Alpha for occluded entities (30% visible)

// Base sprite height for UI positioning (256px texture)
const BASE_SPRITE_HEIGHT = 256;

interface Occluder {
  depth: number;
  height: number;
}

/**
 * EntityRenderer creates Phaser containers with nameplates, health bars and behavior icons for entities.
 *
 * Nameplates display entity names above all entities for identification.
 * Health bars appear above damaged creatures, color-coded by health percentage.
 * Behavior icons show creature threat level using lore-correct classifications (H/O/P/M).
 */

/**
 * Color codes for damage type floating numbers.
 * Player-received damage always uses red (#ff4444) regardless of type.
 */
const DAMAGE_TYPE_COLORS: Record<DamageType, string> = {
  Thermal: '#ff8800',  // orange
  Cryo:    '#00ccff',  // cyan
  Bio:     '#44ff44',  // green
  Kinetic: '#ffffff',  // white
};

export class EntityRenderer {
  private scene: Phaser.Scene;
  private tileSize: number;
  private isoTransform: IsometricTransform;
  private elevationOffset = 0; // Pixels entities hover above ground (set to 0: sprites anchor at tile surface)
  private questMarkers: Map<string, Phaser.GameObjects.Container> = new Map();

  /** Cache of visible (non-transparent) bounds per texture key+frame, as fractions of texture dimensions */
  private static visibleBoundsCache: Map<string, { topFrac: number; bottomFrac: number; leftFrac: number; rightFrac: number }> = new Map();

  constructor(scene: Phaser.Scene, tileWidth: number = 256, tileHeight: number = 128) {
    this.scene = scene;
    this.tileSize = tileWidth; // Keep for backwards compat
    this.isoTransform = new IsometricTransform(tileWidth, tileHeight);
    initStrategies();
  }

  /**
   * Compute the fractional padding (transparent border) of a texture by scanning its alpha channel.
   * Results are cached per texture key+frame combo.
   * Handles both canvas-based textures (from spritesheet extraction) and image-based textures.
   */
  private getVisibleBounds(textureKey: string, frame?: string | number): { topFrac: number; bottomFrac: number; leftFrac: number; rightFrac: number } {
    const cacheKey = frame != null ? `${textureKey}:${frame}` : textureKey;
    const cached = EntityRenderer.visibleBoundsCache.get(cacheKey);
    if (cached) return cached;

    // Default: no padding (full texture is visible)
    const defaultBounds = { topFrac: 0, bottomFrac: 0, leftFrac: 0, rightFrac: 0 };

    try {
      const texture = this.scene.textures.get(textureKey);
      if (!texture || texture.key === '__MISSING') {
        EntityRenderer.visibleBoundsCache.set(cacheKey, defaultBounds);
        return defaultBounds;
      }

      const phaserFrame = frame != null ? texture.get(frame) : texture.get();
      if (!phaserFrame) {
        EntityRenderer.visibleBoundsCache.set(cacheKey, defaultBounds);
        return defaultBounds;
      }

      const fw = phaserFrame.cutWidth;
      const fh = phaserFrame.cutHeight;
      if (fw <= 0 || fh <= 0) {
        EntityRenderer.visibleBoundsCache.set(cacheKey, defaultBounds);
        return defaultBounds;
      }

      // Get pixel data — handle canvas textures (from spritesheet extraction) and image textures
      let imageData: ImageData | null = null;

      // Canvas textures: read pixels directly from the canvas source
      const sourceCanvas = phaserFrame.source?.image;
      if (sourceCanvas instanceof HTMLCanvasElement) {
        const srcCtx = sourceCanvas.getContext('2d');
        if (srcCtx) {
          imageData = srcCtx.getImageData(phaserFrame.cutX, phaserFrame.cutY, fw, fh);
        }
      }

      // Image textures: draw to temp canvas then read pixels
      if (!imageData && sourceCanvas instanceof HTMLImageElement) {
        const tmpCanvas = document.createElement('canvas');
        tmpCanvas.width = fw;
        tmpCanvas.height = fh;
        const tmpCtx = tmpCanvas.getContext('2d');
        if (tmpCtx) {
          tmpCtx.drawImage(sourceCanvas, phaserFrame.cutX, phaserFrame.cutY, fw, fh, 0, 0, fw, fh);
          imageData = tmpCtx.getImageData(0, 0, fw, fh);
        }
      }

      if (!imageData) {
        EntityRenderer.visibleBoundsCache.set(cacheKey, defaultBounds);
        return defaultBounds;
      }

      const data = imageData.data;
      let topRow = fh;
      let bottomRow = -1;
      let leftCol = fw;
      let rightCol = -1;

      for (let y = 0; y < fh; y++) {
        for (let x = 0; x < fw; x++) {
          const alpha = data[(y * fw + x) * 4 + 3];
          if (alpha > 10) { // threshold to ignore near-invisible pixels
            if (y < topRow) topRow = y;
            if (y > bottomRow) bottomRow = y;
            if (x < leftCol) leftCol = x;
            if (x > rightCol) rightCol = x;
          }
        }
      }

      if (bottomRow < 0) {
        // Fully transparent texture
        EntityRenderer.visibleBoundsCache.set(cacheKey, defaultBounds);
        return defaultBounds;
      }

      const bounds = {
        topFrac: topRow / fh,
        bottomFrac: (fh - 1 - bottomRow) / fh,
        leftFrac: leftCol / fw,
        rightFrac: (fw - 1 - rightCol) / fw,
      };

      EntityRenderer.visibleBoundsCache.set(cacheKey, bounds);
      return bounds;
    } catch {
      EntityRenderer.visibleBoundsCache.set(cacheKey, defaultBounds);
      return defaultBounds;
    }
  }

  /**
   * Convert Position (local coords + zoneId) to world coordinates.
   * World coords = zoneCoords * ZONE_SIZE + localCoords
   * Hub zones are treated as being at origin (0, 0).
   */
  private positionToWorldCoords(position: Position): { worldX: number; worldY: number } {
    // Hub zones (hub_*) are instanced at origin
    if (position.zoneId.startsWith('hub_')) {
      return {
        worldX: position.x,
        worldY: position.y,
      };
    }
    // Open-world zones use z_X_Y format
    const parts = position.zoneId.split('_');
    const zoneX = parseInt(parts[1], 10);
    const zoneY = parseInt(parts[2], 10);
    return {
      worldX: zoneX * ZONE_SIZE + position.x,
      worldY: zoneY * ZONE_SIZE + position.y,
    };
  }

  /** Active frenzy tweens indexed by entityId for cleanup (CRAI-07) */
  private frenzyTweens: Map<string, Phaser.Tweens.Tween> = new Map();

  /** Stampede event listener reference for cleanup */
  private stampedeListener: EventListener | null = null;

  /**
   * Initialize stampede camera shake listener.
   * Call once after scene is ready.
   */
  initStampedeListener(): void {
    if (this.stampedeListener) return;
    this.stampedeListener = ((_event: CustomEvent) => {
      // Brief camera shake for stampede impact (CRAI-06)
      this.scene.cameras.main.shake(300, 0.01);
    }) as EventListener;
    window.addEventListener('creature:stampede', this.stampedeListener);
  }

  /**
   * Clean up stampede listener. Call on scene shutdown.
   */
  destroyStampedeListener(): void {
    if (this.stampedeListener) {
      window.removeEventListener('creature:stampede', this.stampedeListener);
      this.stampedeListener = null;
    }
  }

  /**
   * CRAI-06: Apply or remove frenzy red tint overlay on a creature.
   * Red tint (0xff4444) with pulsing alpha that syncs with faster attack speed.
   */
  applyFrenzyEffect(container: Phaser.GameObjects.Container, entityId: string, frenzied: boolean): void {
    const sprite = container.getData('entitySprite') as Phaser.GameObjects.Sprite | undefined;
    if (!sprite) return;

    if (frenzied) {
      // Apply red tint
      sprite.setTint(0xff4444);

      // Add pulsing alpha tween (syncs with 2x attack speed feel)
      if (!this.frenzyTweens.has(entityId)) {
        const tween = this.scene.tweens.add({
          targets: sprite,
          alpha: { from: 1.0, to: 0.6 },
          duration: 400,  // Fast pulse matching doubled attack speed
          yoyo: true,
          repeat: -1,     // Infinite loop
          ease: 'Sine.easeInOut',
        });
        this.frenzyTweens.set(entityId, tween);
      }
    } else {
      // Remove frenzy effects
      sprite.clearTint();
      sprite.setAlpha(1.0);

      const tween = this.frenzyTweens.get(entityId);
      if (tween) {
        tween.destroy();
        this.frenzyTweens.delete(entityId);
      }
    }
  }

  /**
   * Clean up frenzy tween for a despawned entity (CRAI-07).
   */
  cleanupFrenzyEffect(entityId: string): void {
    const tween = this.frenzyTweens.get(entityId);
    if (tween) {
      tween.destroy();
      this.frenzyTweens.delete(entityId);
    }
  }

  /**
   * CRAI-06: Apply stealth invisibility to a creature container.
   * Stealthed predators are invisible (alpha=0). When revealed, fade in over 300ms.
   */
  applyStealthReveal(container: Phaser.GameObjects.Container): void {
    container.setAlpha(0);
    container.setData('stealthed', false);
    this.scene.tweens.add({
      targets: container,
      alpha: 1,
      duration: 300,
      ease: 'Power2',
    });
  }

  /**
   * Creates a container with entity sprite, nameplate, optional health bar, and optional behavior icon.
   * Delegates per-type rendering logic to strategy classes via the strategy registry.
   */
  createEntityContainer(entity: Entity, elevation: number = 0): Phaser.GameObjects.Container {
    // Convert to world coordinates for depth sorting
    const { worldX, worldY } = this.positionToWorldCoords(entity.position);
    const screenPos = this.isoTransform.gridToScreen(worldX, worldY);

    const elevationOffset = elevation * ELEVATION_HEIGHT_STEP;
    const container = this.scene.add.container(screenPos.x, screenPos.y - elevationOffset + ENTITY_GROUND_OFFSET);

    // Store world coordinates for depth sorting
    container.setData('gridX', worldX);
    container.setData('gridY', worldY);
    container.setData('elevation', elevation);

    // Look up render strategy for this entity type
    const strategy = getStrategyForType(entity.type);
    if (!strategy) {
      // Fallback: minimal rendering for unknown entity types
      return container;
    }

    // 1. Scale — strategy handles per-type overrides (species, rarity, NPC squash)
    const { scaleX, scaleY, effectiveScale } = strategy.getScale(entity);

    // 2. Shadow — strategy provides type-specific dimensions
    const { width: shadowWidth, height: shadowHeight } = strategy.getShadowDimensions(entity, effectiveScale);
    const shadow = this.scene.add.ellipse(0, this.isoTransform.tileHeight / 2, shadowWidth, shadowHeight, 0x000000, 0.3);
    shadow.setOrigin(0.5, 0.5);
    container.add(shadow);

    // 3. Sprite Y offset — strategy provides additional offset (e.g., animated creature species)
    let spriteYOffset = this.isoTransform.tileHeight / 2;
    spriteYOffset += strategy.getSpriteYOffset(entity);

    // 4. Feature detection and texture — strategy determines hover-only behavior and texture
    const isFeature = strategy.isHoverUI();
    const { key: textureKey, frame: textureFrame } = strategy.getTexture(entity, this.scene);
    const sprite = this.scene.add.sprite(0, spriteYOffset, textureKey, textureFrame);

    // All entity types use bottom-center origin: sprite base sits at the tile surface
    sprite.setOrigin(0.5, 1.0);
    sprite.setScale(scaleX, scaleY);

    // For features (plants/minerals), auto-detect visible bounds for hit area and hover outline
    let featureBounds: VisibleBounds | null = null;
    if (isFeature) {
      featureBounds = this.getVisibleBounds(textureKey, textureFrame);
    }

    container.add(sprite);
    container.setData('entityScale', effectiveScale);
    container.setData('entitySprite', sprite);

    // 5. Spawn effects — strategy sets container data (rarity glow, stealth, frenzy flag)
    strategy.applySpawnEffects(entity, container, this.scene);

    // 6. Hit area and cursor — strategy provides type-specific hit rectangle and cursor
    const texW = sprite.width;
    const texH = sprite.height;
    const { rect: hitRect } = strategy.getHitArea(entity, texW, texH, false, featureBounds);
    sprite.setInteractive(hitRect, Phaser.Geom.Rectangle.Contains);
    sprite.input!.cursor = strategy.getCursor(entity);

    // Store visible bounds on container for hover outline access
    if (featureBounds) {
      container.setData('visibleBounds', featureBounds);
    }

    // Hover outline glow for clickable entities
    const hoverGlow = this.scene.add.graphics();
    hoverGlow.setVisible(false);
    container.add(hoverGlow);
    container.setData('hoverGlow', hoverGlow);

    sprite.on('pointerover', () => {
      hoverGlow.clear();
      hoverGlow.lineStyle(3, 0xffffff, 0.6);

      const bounds = container.getData('visibleBounds') as VisibleBounds | null;
      if (bounds) {
        // Features: outline around visible art only, not transparent padding
        const fullW = sprite.width * sprite.scaleX;
        const fullH = sprite.height * sprite.scaleY;
        const visW = (1 - bounds.leftFrac - bounds.rightFrac) * fullW;
        const visH = (1 - bounds.topFrac - bounds.bottomFrac) * fullH;
        const visLeft = -(fullW / 2) + bounds.leftFrac * fullW;
        const visTop = spriteYOffset - fullH + bounds.topFrac * fullH;
        hoverGlow.strokeRoundedRect(visLeft, visTop, visW, visH, 4);
      } else {
        // Creatures/other: outline around full sprite bounds
        const halfW = (sprite.width * sprite.scaleX) / 2;
        const h = sprite.height * sprite.scaleY;
        const yOff = spriteYOffset;
        hoverGlow.strokeRoundedRect(-halfW, yOff - h, halfW * 2, h, 4);
      }
      hoverGlow.setVisible(true);

      // Features: also show nameplate and yield bar on hover
      if (isFeature) {
        const nameplate = container.getData('nameplate') as Phaser.GameObjects.Text | undefined;
        const yieldBar = container.getData('yieldBar') as Phaser.GameObjects.Graphics | undefined;
        if (nameplate) nameplate.setVisible(true);
        if (yieldBar) yieldBar.setVisible(true);
      }
    });

    sprite.on('pointerout', () => {
      hoverGlow.setVisible(false);
      hoverGlow.clear();

      // Features: hide nameplate and yield bar
      if (isFeature) {
        const nameplate = container.getData('nameplate') as Phaser.GameObjects.Text | undefined;
        const yieldBar = container.getData('yieldBar') as Phaser.GameObjects.Graphics | undefined;
        if (nameplate) nameplate.setVisible(false);
        if (yieldBar) yieldBar.setVisible(false);
      }
    });

    // Compute actual visual sprite height for UI positioning
    const actualSpriteHeight = featureBounds
      ? (1 - featureBounds.topFrac - featureBounds.bottomFrac) * sprite.height * scaleY
      : sprite.height * scaleY;
    container.setData('actualSpriteHeight', actualSpriteHeight);

    // Store entity identity on container for click handling in WorldScene
    container.setData('entityId', entity.id);
    container.setData('entityType', entity.type);

    // 7. UI setup — strategy creates type-specific UI elements (health bars, nameplates, yield bars)
    const { name: displayName, gated } = this.applyPerceptionGate(entity);
    strategy.setupUI(entity, container, this.scene, displayName, gated, spriteYOffset, actualSpriteHeight);

    // Store data for update handlers (yield bar update, fade-in offset)
    container.setData('elevationOffset', this.elevationOffset);

    // 8. Depth — strategy provides depth boost (features get extra depth for proper occlusion)
    const depthBoost = strategy.getDepthBoost(entity, this.isoTransform.tileHeight);
    container.setData('depthBoost', depthBoost);
    const depth = this.isoTransform.calculateDepth(worldX, worldY, elevation, depthBoost, true);
    container.setDepth(depth);

    // 9. Post-strategy spawn effects — frenzy tweens managed by EntityRenderer (called externally)
    if (container.getData('spawnFrenzied')) {
      this.applyFrenzyEffect(container, entity.id, true);
    }

    return container;
  }

  /**
   * Creates a simple nameplate text (for entities without health bars).
   */
  createNameplate(name: string): Phaser.GameObjects.Text {
    const text = this.scene.add.text(0, 0, name, {
      fontSize: '32px',
      fontStyle: 'bold',
      color: '#ffffff',
      backgroundColor: '#000000cc',
      padding: { x: 16, y: 10 },
    });
    text.setOrigin(0.5, 0.5);
    text.setShadow(2, 2, '#000000', 3);

    return text;
  }

  /**
   * Creates a WoW-style health bar with behavior icon and name inside.
   * Returns a container with background, health fill, behavior icon, and name text.
   */
  createHealthBarWithName(name: string, currentHealth: number, maxHealth: number, behavior?: CreatureBehavior, gated?: boolean): Phaser.GameObjects.Container {
    const width = 360;
    const height = 56;
    const container = this.scene.add.container(0, 0);

    const graphics = this.scene.add.graphics();

    // Border
    graphics.lineStyle(4, 0x000000, 1);
    graphics.strokeRect(-width / 2, -height / 2, width, height);

    // Background
    graphics.fillStyle(0x222222, 0.95);
    graphics.fillRect(-width / 2, -height / 2, width, height);

    // Health fill color based on percentage
    const healthPercent = currentHealth / maxHealth;
    let fillColor: number;
    if (healthPercent > 0.5) {
      fillColor = 0x44cc44; // green
    } else if (healthPercent >= 0.25) {
      fillColor = 0xccaa00; // yellow-orange
    } else {
      fillColor = 0xcc4444; // red
    }

    // Fill bar (inset by 4px for border)
    const fillWidth = (width - 8) * healthPercent;
    graphics.fillStyle(fillColor, 1);
    graphics.fillRect(-width / 2 + 4, -height / 2 + 4, fillWidth, height - 8);

    container.add(graphics);

    // Behavior icon on left side (if creature)
    if (behavior || gated) {
      let letter: string;
      let color: string;

      if (gated) {
        letter = '?';
        color = '#888888';
      } else {
        switch (behavior) {
          case 'herbivore':
            letter = 'H';
            color = '#44ff44';
            break;
          case 'omnivore':
            letter = 'O';
            color = '#ffdd00';
            break;
          case 'predator':
            letter = 'P';
            color = '#ff8844';
            break;
          case 'maniac':
            letter = 'M';
            color = '#ff4444';
            break;
          default:
            letter = '?';
            color = '#888888';
        }
      }

      const icon = this.scene.add.text(-width / 2 + 32, 0, `[${letter}]`, {
        fontSize: '32px',
        fontStyle: 'bold',
        color: color,
      });
      icon.setOrigin(0.5, 0.5);
      icon.setShadow(2, 2, '#000000', 4);
      container.add(icon);
    }

    // Name text (offset right if behavior icon present)
    const textX = (behavior || gated) ? 20 : 0;
    const text = this.scene.add.text(textX, 0, name, {
      fontSize: '34px',
      fontStyle: 'bold',
      color: '#ffffff',
    });
    text.setOrigin(0.5, 0.5);
    text.setShadow(2, 2, '#000000', 4);
    container.add(text);

    return container;
  }

  /**
   * Creates a simple health/yield bar without name (for minerals/plants).
   */
  createHealthBar(currentHealth: number, maxHealth: number): Phaser.GameObjects.Graphics {
    const width = 280;
    const height = 32;
    const graphics = this.scene.add.graphics();

    // Border
    graphics.lineStyle(4, 0x000000, 1);
    graphics.strokeRect(-width / 2, 0, width, height);

    // Background
    graphics.fillStyle(0x222222, 0.95);
    graphics.fillRect(-width / 2, 0, width, height);

    // Health fill color based on percentage
    const healthPercent = currentHealth / maxHealth;
    let fillColor: number;
    if (healthPercent > 0.5) {
      fillColor = 0x44cc44; // green
    } else if (healthPercent >= 0.25) {
      fillColor = 0xccaa00; // yellow-orange
    } else {
      fillColor = 0xcc4444; // red
    }

    // Fill bar (inset by 4px for border)
    const fillWidth = (width - 8) * healthPercent;
    graphics.fillStyle(fillColor, 1);
    graphics.fillRect(-width / 2 + 4, 4, fillWidth, height - 8);

    return graphics;
  }

  /**
   * Check if a creature has animated sprites available.
   */
  hasAnimatedSprites(speciesId: string): boolean {
    return ANIMATED_CREATURES.has(speciesId);
  }

  /**
   * Type guard to check if entity is a Creature.
   */
  private isCreature(entity: Entity): entity is Creature {
    return entity.type === 'creature';
  }

  /**
   * INTR-06: Perception gating — hide entity info if level exceeds perception * 3.
   * Returns '???' if gated, otherwise the original name.
   * Fails open (shows real name) if stats not yet loaded.
   *
   * NOTE: The "name and level" criterion in INTR-06 references perception gating.
   * Creature level is NOT displayed in the client UI — only name and behavior icon.
   * Therefore the level portion of INTR-06 is vacuously satisfied (nothing to hide).
   * INTR-07 is the level-based interaction gating (server-side, handled in Task 2).
   * If level display is added in the future, extend this to also return a gated level.
   */
  private applyPerceptionGate(entity: Entity): { name: string; gated: boolean } {
    if (!this.isCreature(entity)) {
      return { name: entity.name, gated: false };
    }
    const creature = entity as Creature;
    const stats = useStatsStore.getState().stats;
    if (!stats) {
      // Fail open — stats not loaded yet, show real name
      return { name: entity.name, gated: false };
    }
    const threshold = stats.total.perception * 3;
    if (creature.level > threshold) {
      return { name: '???', gated: true };
    }
    return { name: entity.name, gated: false };
  }

  /**
   * Update entity position for movement.
   * @param gridX World grid X coordinate (not local)
   * @param gridY World grid Y coordinate (not local)
   * @param elevation Tile elevation
   */
  updateEntityPosition(
    container: Phaser.GameObjects.Container,
    gridX: number,
    gridY: number,
    elevation: number = 0
  ): void {
    const elevationOffset = elevation * ELEVATION_HEIGHT_STEP;
    const screenPos = this.isoTransform.gridToScreen(gridX, gridY);
    container.setPosition(screenPos.x, screenPos.y - elevationOffset + ENTITY_GROUND_OFFSET);

    // Update stored grid position and elevation
    container.setData('gridX', gridX);
    container.setData('gridY', gridY);
    container.setData('elevation', elevation);

    // Update depth
    const depth = this.isoTransform.calculateDepth(gridX, gridY, elevation, 0, true);
    container.setDepth(depth);
  }

  /**
   * Get the isometric transform instance.
   */
  getTransform(): IsometricTransform {
    return this.isoTransform;
  }

  /**
   * Creates an animated floating damage number above a position.
   * Text floats upward and fades out over ~1 second.
   *
   * @param scene - Phaser scene to create the text in
   * @param x - Screen X position (world coords)
   * @param y - Screen Y position (world coords)
   * @param damage - Damage amount to display
   * @param isPlayerDamage - If true, uses red color (local player took damage); otherwise white
   */
  static createFloatingDamage(scene: Phaser.Scene, x: number, y: number, damage: number, isPlayerDamage: boolean, damageType?: DamageType): void {
    let color: string;
    if (isPlayerDamage) {
      color = '#ff4444'; // Player took damage — always red
    } else if (damageType) {
      color = DAMAGE_TYPE_COLORS[damageType]; // Type-specific color for outgoing damage
    } else {
      color = '#ffff00'; // Legacy fallback — yellow
    }
    // Start one tile higher (128px = one elevation step in isometric)
    const startY = y - 128;
    const text = scene.add.text(x, startY, `-${damage}`, {
      fontSize: '64px',
      fontStyle: 'bold',
      color: color,
      stroke: '#000000',
      strokeThickness: 4,
      shadow: {
        offsetX: 3,
        offsetY: 3,
        color: '#000000',
        blur: 6,
        fill: true,
      },
    });
    text.setOrigin(0.5, 0.5);
    text.setDepth(99999); // Above everything including path graphics

    scene.tweens.add({
      targets: text,
      y: startY - 100, // Float up 100px from starting position
      alpha: 0,
      duration: 1000,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        text.destroy();
      },
    });
  }

  /**
   * Apply depth-based occlusion to entities.
   * Entities behind tall structures fade to indicate they're obscured.
   *
   * @param entityContainers - Map of entity containers to check
   * @param chunkTiles - Array of tile containers for occlusion checking
   */
  applyOcclusion(
    entityContainers: Map<string, Phaser.GameObjects.Container>,
    chunkTiles: Phaser.GameObjects.Container[] | null
  ): void {
    if (!chunkTiles || chunkTiles.length === 0) return;

    // Collect occluders from chunk (structure tiles with height >= 3)
    const occluders: Occluder[] = [];

    chunkTiles.forEach((tile) => {
      const isStructure = tile.getData('isStructure') as boolean;
      const height = tile.getData('structureHeight') as number ?? tile.getData('elevation') as number ?? 0;

      if (isStructure && height >= OCCLUSION_MIN_HEIGHT) {
        occluders.push({
          depth: tile.depth,
          height
        });
      }
    });

    // Early exit if no occluders
    if (occluders.length === 0) {
      // Reset all entities to full alpha
      entityContainers.forEach((container) => {
        if (container.alpha !== 1.0) {
          container.setAlpha(1.0);
        }
      });
      return;
    }

    // Check each entity against occluders
    entityContainers.forEach((container) => {
      const entityDepth = container.depth;
      let isOccluded = false;

      for (const occluder of occluders) {
        const depthDiff = occluder.depth - entityDepth;

        // Occluder is "in front" if depth greater, and close enough
        if (depthDiff > 0 && depthDiff < OCCLUSION_DEPTH_THRESHOLD) {
          isOccluded = true;
          break;
        }
      }

      // Update alpha based on occlusion
      const targetAlpha = isOccluded ? OCCLUDED_ALPHA : 1.0;
      if (container.alpha !== targetAlpha) {
        container.setAlpha(targetAlpha);
      }
    });
  }

  /**
   * Creates a quest marker sprite positioned above an NPC.
   * @param npcEntityId - The NPC entity ID for tracking
   * @param markerType - 'available' (!) or 'ready' (?)
   * @param container - The NPC's container to position relative to
   */
  createQuestMarker(
    npcEntityId: string,
    markerType: 'available' | 'ready',
    container: Phaser.GameObjects.Container
  ): Phaser.GameObjects.Container {
    // Clean up existing marker if any
    this.removeQuestMarker(npcEntityId);

    const markerContainer = this.scene.add.container(0, 0);

    // Get actual sprite height for positioning (falls back to BASE_SPRITE_HEIGHT * scale)
    const scale = container.getData('entityScale') ?? 1.0;
    const actualHeight = (container.getData('actualSpriteHeight') as number) ?? BASE_SPRITE_HEIGHT * scale;

    // Position above nameplate (sprite top is at -actualHeight, marker goes 40px above that)
    const markerY = -actualHeight - 40;

    // Try to use sprite, fall back to procedural graphics
    const textureKey = markerType === 'available'
      ? 'ui_quest_marker_available'
      : 'ui_quest_marker_ready';

    const fallbackKey = markerType === 'available'
      ? 'ui_quest_marker_available_fallback'
      : 'ui_quest_marker_ready_fallback';

    if (this.scene.textures.exists(textureKey)) {
      const sprite = this.scene.add.sprite(0, markerY, textureKey);
      sprite.setScale(0.8);
      sprite.setOrigin(0.5, 1.0);
      markerContainer.add(sprite);
    } else if (this.scene.textures.exists(fallbackKey)) {
      // Use fallback procedural texture
      const sprite = this.scene.add.sprite(0, markerY, fallbackKey);
      sprite.setScale(0.8);
      sprite.setOrigin(0.5, 1.0);
      markerContainer.add(sprite);
    } else {
      // Last resort: inline procedural marker
      const graphics = this.scene.add.graphics();
      const color = markerType === 'available' ? 0xffcc00 : 0x00ccff;
      graphics.fillStyle(color, 1);
      graphics.fillCircle(0, markerY - 20, 20);
      graphics.lineStyle(3, 0x000000);
      graphics.strokeCircle(0, markerY - 20, 20);
      markerContainer.add(graphics);

      const symbol = markerType === 'available' ? '!' : '?';
      const text = this.scene.add.text(0, markerY - 20, symbol, {
        fontSize: '28px',
        fontStyle: 'bold',
        color: '#000000',
      });
      text.setOrigin(0.5, 0.5);
      markerContainer.add(text);
    }

    // Add floating animation
    this.scene.tweens.add({
      targets: markerContainer,
      y: -8,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Add to NPC container
    container.add(markerContainer);

    // Track for cleanup
    this.questMarkers.set(npcEntityId, markerContainer);

    return markerContainer;
  }

  /**
   * Remove quest marker from NPC.
   */
  removeQuestMarker(npcEntityId: string): void {
    const marker = this.questMarkers.get(npcEntityId);
    if (marker) {
      marker.destroy();
      this.questMarkers.delete(npcEntityId);
    }
  }

  /**
   * Update quest marker for NPC (change type or remove).
   */
  updateQuestMarker(
    npcEntityId: string,
    markerType: 'available' | 'ready' | 'none',
    container: Phaser.GameObjects.Container
  ): void {
    if (markerType === 'none') {
      this.removeQuestMarker(npcEntityId);
    } else {
      this.createQuestMarker(npcEntityId, markerType, container);
    }
  }

  /**
   * Clean up all quest markers.
   */
  clearAllQuestMarkers(): void {
    this.questMarkers.forEach((marker) => marker.destroy());
    this.questMarkers.clear();
  }

  /**
   * Show plant UI (nameplate + yield bar) - call when player hovers/targets a plant.
   */
  showPlantUI(container: Phaser.GameObjects.Container): void {
    const nameplate = container.getData('nameplate') as Phaser.GameObjects.Text | undefined;
    const yieldBar = container.getData('yieldBar') as Phaser.GameObjects.Graphics | undefined;
    if (nameplate) nameplate.setVisible(true);
    if (yieldBar) yieldBar.setVisible(true);
  }

  /**
   * Hide plant UI (nameplate + yield bar) - call when player stops hovering/targeting.
   */
  hidePlantUI(container: Phaser.GameObjects.Container): void {
    const nameplate = container.getData('nameplate') as Phaser.GameObjects.Text | undefined;
    const yieldBar = container.getData('yieldBar') as Phaser.GameObjects.Graphics | undefined;
    if (nameplate) nameplate.setVisible(false);
    if (yieldBar) yieldBar.setVisible(false);
  }
}
