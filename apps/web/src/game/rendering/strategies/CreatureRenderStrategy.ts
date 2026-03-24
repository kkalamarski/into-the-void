import Phaser from 'phaser';
import { Entity, Creature, CreatureBehavior } from '@into-the-void/shared-types';
import { AbstractRenderStrategy } from './AbstractRenderStrategy';
import type { ScaleConfig, ShadowDimensions, HitAreaConfig, TextureInfo, VisibleBounds } from './types';
import {
  ENTITY_SCALE,
  ANIMATED_CREATURE_SCALE,
  ANIMATED_CREATURE_SHADOW,
  ANIMATED_CREATURE_Y_OFFSET,
  ANIMATED_CREATURES,
} from './creature-render-data';

/**
 * Render strategy for creature entities.
 * Handles animated sprites, species-specific scale/shadow overrides,
 * frenzy/stealth spawn effects, and WoW-style health bars.
 */
export class CreatureRenderStrategy extends AbstractRenderStrategy {

  getScale(entity: Entity): ScaleConfig {
    const creature = entity as Creature;
    let scale = ENTITY_SCALE['creature'] ?? 2.5;
    if (creature.speciesId && ANIMATED_CREATURE_SCALE[creature.speciesId]) {
      scale = ANIMATED_CREATURE_SCALE[creature.speciesId];
    }
    return { scaleX: scale, scaleY: scale, effectiveScale: scale };
  }

  getShadowDimensions(entity: Entity, scale: number): ShadowDimensions {
    const creature = entity as Creature;
    // Override shadow for specific animated creatures
    if (creature.speciesId && ANIMATED_CREATURE_SHADOW[creature.speciesId]) {
      const override = ANIMATED_CREATURE_SHADOW[creature.speciesId];
      return { width: override.width, height: override.height };
    }
    // Default creature shadow scaled relative to default creature scale (2.5)
    return { width: 80 * (scale / 2.5), height: 40 * (scale / 2.5) };
  }

  getHitArea(entity: Entity, texW: number, texH: number, _isAnimated: boolean, _featureBounds: VisibleBounds | null): HitAreaConfig {
    // Determine animated status internally — no need for caller to know
    const creature = entity as Creature;
    const animated = !!(creature.speciesId && ANIMATED_CREATURES.has(creature.speciesId));
    // Animated creatures: tighter padding (10% horizontal, 15% top)
    // Non-animated: standard padding (15% horizontal, 20% top)
    const hitPadX = texW * (animated ? 0.10 : 0.15);
    const hitPadTop = texH * (animated ? 0.15 : 0.2);
    return {
      rect: new Phaser.Geom.Rectangle(hitPadX, hitPadTop, texW - hitPadX * 2, texH - hitPadTop),
    };
  }

  getSpriteYOffset(entity: Entity): number {
    const creature = entity as Creature;
    if (creature.speciesId && creature.speciesId in ANIMATED_CREATURE_Y_OFFSET) {
      return ANIMATED_CREATURE_Y_OFFSET[creature.speciesId];
    }
    return 0;
  }

  getTexture(entity: Entity, _scene: Phaser.Scene): TextureInfo {
    const creature = entity as Creature;
    if (creature.speciesId) {
      // Check if this creature has animated sprites
      if (ANIMATED_CREATURES.has(creature.speciesId)) {
        // Return idle sprite facing south (default direction)
        return { key: `${creature.speciesId}-idle-s` };
      }
      // Try species-specific texture, fall back to generic 'creature'
      return { key: creature.speciesId };
    }
    return { key: 'creature' };
  }

  setupUI(
    entity: Entity,
    container: Phaser.GameObjects.Container,
    scene: Phaser.Scene,
    displayName: string,
    gated: boolean,
    spriteYOffset: number,
    actualSpriteHeight: number,
  ): void {
    const creature = entity as Creature;

    // UI positioning based on actual sprite height
    const spriteTopY = spriteYOffset - actualSpriteHeight;
    const uiBaseY = spriteTopY - 20; // 20px padding above sprite top

    // WoW-style health bar with behavior icon and name inside
    const healthBar = this.createHealthBarWithName(
      scene, displayName, creature.health, creature.maxHealth, creature.behavior, gated
    );
    healthBar.y = uiBaseY;
    container.add(healthBar);
    container.setData('healthBar', healthBar);

    // Store speciesId for animated creatures
    if (creature.speciesId && ANIMATED_CREATURES.has(creature.speciesId)) {
      container.setData('speciesId', creature.speciesId);
      container.setData('facing', 's'); // Default facing direction
    }
  }

  applySpawnEffects(entity: Entity, container: Phaser.GameObjects.Container, _scene: Phaser.Scene): void {
    const creature = entity as Creature;

    // CRAI-06: Stealthed predators are invisible on spawn
    if (creature.stealthed) {
      container.setAlpha(0);
      container.setData('stealthed', true);
    }

    // CRAI-06: Frenzied maniacs — flag for EntityRenderer to apply frenzy tween
    // (EntityRenderer owns frenzy tween management since it's called externally by WorldScene)
    if (creature.frenzied) {
      container.setData('spawnFrenzied', true);
    }
  }

  /**
   * Creates a WoW-style health bar with behavior icon and name inside.
   */
  private createHealthBarWithName(
    scene: Phaser.Scene,
    name: string,
    currentHealth: number,
    maxHealth: number,
    behavior?: CreatureBehavior,
    gated?: boolean,
  ): Phaser.GameObjects.Container {
    const width = 360;
    const height = 56;
    const barContainer = scene.add.container(0, 0);

    const graphics = scene.add.graphics();

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

    barContainer.add(graphics);

    // Behavior icon on left side
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

      const icon = scene.add.text(-width / 2 + 32, 0, `[${letter}]`, {
        fontSize: '32px',
        fontStyle: 'bold',
        color: color,
      });
      icon.setOrigin(0.5, 0.5);
      icon.setShadow(2, 2, '#000000', 4);
      barContainer.add(icon);
    }

    // Name text (offset right if behavior icon present)
    const textX = (behavior || gated) ? 20 : 0;
    const text = scene.add.text(textX, 0, name, {
      fontSize: '34px',
      fontStyle: 'bold',
      color: '#ffffff',
    });
    text.setOrigin(0.5, 0.5);
    text.setShadow(2, 2, '#000000', 4);
    barContainer.add(text);

    return barContainer;
  }
}
