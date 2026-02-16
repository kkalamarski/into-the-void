import Phaser from 'phaser';
import { Entity, Creature, CreatureBehavior, EntityType } from '@into-the-void/shared-types';
import { IsometricTransform } from '../utils/IsometricTransform';

/**
 * EntityRenderer creates Phaser containers with health bars and behavior icons for entities.
 *
 * Health bars appear above damaged entities, color-coded by health percentage.
 * Behavior icons show creature threat level using lore-correct classifications (H/O/P/M).
 */
export class EntityRenderer {
  private scene: Phaser.Scene;
  private tileSize: number;
  private isoTransform: IsometricTransform;
  private elevationOffset = 12; // Pixels entities hover above ground

  constructor(scene: Phaser.Scene, tileWidth: number = 128, tileHeight: number = 64) {
    this.scene = scene;
    this.tileSize = tileWidth; // Keep for backwards compat
    this.isoTransform = new IsometricTransform(tileWidth, tileHeight);
  }

  /**
   * Creates a container with entity sprite, optional health bar, and optional behavior icon.
   */
  createEntityContainer(entity: Entity): Phaser.GameObjects.Container {
    const screenPos = this.isoTransform.gridToScreen(
      entity.position.x,
      entity.position.y
    );

    const container = this.scene.add.container(screenPos.x, screenPos.y);

    // Store grid position for depth sorting
    container.setData('gridX', entity.position.x);
    container.setData('gridY', entity.position.y);

    // Blob shadow at ground level (container origin)
    const shadow = this.scene.add.ellipse(0, 0, 40, 20, 0x000000, 0.3);
    shadow.setOrigin(0.5, 0.5);
    container.add(shadow);

    // Entity sprite elevated above ground
    const sprite = this.scene.add.sprite(0, -this.elevationOffset, this.getEntityTexture(entity.type));
    sprite.setOrigin(0.5, 1.0); // Bottom-center origin for ground alignment
    container.add(sprite);

    // Health bar for damaged creatures (positioned above elevated sprite)
    if (this.isCreature(entity) && entity.health < entity.maxHealth) {
      const healthBar = this.createHealthBar(entity.health, entity.maxHealth);
      healthBar.y = -this.elevationOffset - 24; // Above sprite
      container.add(healthBar);
    }

    // Behavior icon for creatures (above health bar)
    if (this.isCreature(entity)) {
      const behaviorIcon = this.createBehaviorIcon(entity.behavior);
      behaviorIcon.y = -this.elevationOffset - 34; // Above health bar
      container.add(behaviorIcon);
    }

    // Initial depth: Y-position with X-tiebreaker
    const depth = this.isoTransform.calculateDepth(entity.position.x, entity.position.y);
    container.setDepth(depth);

    return container;
  }

  /**
   * Creates a health bar graphic with color-coded fill.
   */
  createHealthBar(currentHealth: number, maxHealth: number): Phaser.GameObjects.Graphics {
    const width = 30;
    const height = 4;
    const graphics = this.scene.add.graphics();

    // Background
    graphics.fillStyle(0x333333);
    graphics.fillRect(-width / 2, 0, width, height);

    // Health fill color based on percentage
    const healthPercent = currentHealth / maxHealth;
    let fillColor: number;
    if (healthPercent > 0.5) {
      fillColor = 0x44cc44; // green
    } else if (healthPercent >= 0.25) {
      fillColor = 0xffcc00; // yellow
    } else {
      fillColor = 0xff4444; // red
    }

    // Fill bar
    const fillWidth = width * healthPercent;
    graphics.fillStyle(fillColor);
    graphics.fillRect(-width / 2, 0, fillWidth, height);

    return graphics;
  }

  /**
   * Creates a behavior icon text with letter and background color per lore classifications.
   */
  createBehaviorIcon(behavior: CreatureBehavior): Phaser.GameObjects.Text {
    // Map behavior to lore-correct letter and color
    let letter: string;
    let color: string;

    switch (behavior) {
      case 'passive':
        letter = 'H'; // Herbivore
        color = '#44cc44'; // green
        break;
      case 'neutral':
        letter = 'O'; // Omnivore
        color = '#ffcc00'; // yellow
        break;
      case 'aggressive':
        letter = 'P'; // Predator
        color = '#ff6b35'; // orange
        break;
      case 'defensive':
        letter = 'M'; // Maniac
        color = '#ff4444'; // red
        break;
    }

    const text = this.scene.add.text(0, 0, letter, {
      fontSize: '12px',
      color: color,
      backgroundColor: '#000000',
      padding: { x: 4, y: 2 },
    });
    text.setOrigin(0.5, 0.5);

    return text;
  }

  /**
   * Maps entity type to texture key.
   */
  private getEntityTexture(type: EntityType): string {
    switch (type) {
      case 'creature':
        return 'creature';
      case 'mineral':
        return 'mineral';
      case 'item':
        return 'item';
      default:
        return 'item';
    }
  }

  /**
   * Type guard to check if entity is a Creature.
   */
  private isCreature(entity: Entity): entity is Creature {
    return entity.type === 'creature';
  }

  /**
   * Update entity position for movement.
   */
  updateEntityPosition(
    container: Phaser.GameObjects.Container,
    gridX: number,
    gridY: number
  ): void {
    const screenPos = this.isoTransform.gridToScreen(gridX, gridY);
    container.setPosition(screenPos.x, screenPos.y);

    // Update stored grid position
    container.setData('gridX', gridX);
    container.setData('gridY', gridY);

    // Update depth
    const depth = this.isoTransform.calculateDepth(gridX, gridY);
    container.setDepth(depth);
  }

  /**
   * Get the isometric transform instance.
   */
  getTransform(): IsometricTransform {
    return this.isoTransform;
  }
}
