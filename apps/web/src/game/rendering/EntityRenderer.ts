import Phaser from 'phaser';
import { Entity, Creature, CreatureBehavior, EntityType } from '@into-the-void/shared-types';

/**
 * EntityRenderer creates Phaser containers with health bars and behavior icons for entities.
 *
 * Health bars appear above damaged entities, color-coded by health percentage.
 * Behavior icons show creature threat level using lore-correct classifications (H/O/P/M).
 */
export class EntityRenderer {
  private scene: Phaser.Scene;
  private tileSize: number;

  constructor(scene: Phaser.Scene, tileSize: number) {
    this.scene = scene;
    this.tileSize = tileSize;
  }

  /**
   * Creates a container with entity sprite, optional health bar, and optional behavior icon.
   */
  createEntityContainer(entity: Entity): Phaser.GameObjects.Container {
    const container = this.scene.add.container(
      entity.position.x * this.tileSize + this.tileSize / 2,
      entity.position.y * this.tileSize + this.tileSize / 2
    );

    // Add entity sprite at (0, 0) relative to container
    const sprite = this.scene.add.sprite(0, 0, this.getEntityTexture(entity.type));
    container.add(sprite);

    // Add health bar for damaged creatures
    if (this.isCreature(entity) && entity.health < entity.maxHealth) {
      const healthBar = this.createHealthBar(entity.health, entity.maxHealth);
      healthBar.y = -20;
      container.add(healthBar);
    }

    // Add behavior icon for all creatures
    if (this.isCreature(entity)) {
      const behaviorIcon = this.createBehaviorIcon(entity.behavior);
      behaviorIcon.y = -30;
      container.add(behaviorIcon);
    }

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
}
