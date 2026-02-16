import Phaser from 'phaser';
import { Entity, Creature, CreatureBehavior, EntityType } from '@into-the-void/shared-types';
import { IsometricTransform } from '../utils/IsometricTransform';

const ELEVATION_HEIGHT_STEP = 16; // Pixels per elevation level

/**
 * EntityRenderer creates Phaser containers with nameplates, health bars and behavior icons for entities.
 *
 * Nameplates display entity names above all entities for identification.
 * Health bars appear above damaged creatures, color-coded by health percentage.
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
   * Creates a container with entity sprite, nameplate, optional health bar, and optional behavior icon.
   */
  createEntityContainer(entity: Entity, elevation: number = 0): Phaser.GameObjects.Container {
    const screenPos = this.isoTransform.gridToScreen(
      entity.position.x,
      entity.position.y
    );

    const elevationOffset = elevation * ELEVATION_HEIGHT_STEP;
    const container = this.scene.add.container(screenPos.x, screenPos.y - elevationOffset);

    // Store grid position and elevation for depth sorting
    container.setData('gridX', entity.position.x);
    container.setData('gridY', entity.position.y);
    container.setData('elevation', elevation);

    // Blob shadow at ground level (container origin)
    const shadow = this.scene.add.ellipse(0, 0, 40, 20, 0x000000, 0.3);
    shadow.setOrigin(0.5, 0.5);
    container.add(shadow);

    // Entity sprite elevated above ground
    const sprite = this.scene.add.sprite(0, -this.elevationOffset, this.getEntityTexture(entity.type));
    sprite.setOrigin(0.5, 1.0); // Bottom-center origin for ground alignment
    container.add(sprite);

    // Nameplate above sprite (always visible for entity identification)
    const nameplate = this.createNameplate(entity.name);
    nameplate.y = -this.elevationOffset - 60; // Above sprite, health bar, and behavior icon
    container.add(nameplate);

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

    // Initial depth: Y-position with X-tiebreaker and elevation
    const depth = this.isoTransform.calculateDepth(entity.position.x, entity.position.y, elevation);
    container.setDepth(depth);

    return container;
  }

  /**
   * Creates a nameplate text showing entity name.
   */
  createNameplate(name: string): Phaser.GameObjects.Text {
    const text = this.scene.add.text(0, 0, name, {
      fontSize: '11px',
      color: '#ffffff',
      backgroundColor: '#000000aa',
      padding: { x: 4, y: 2 },
    });
    text.setOrigin(0.5, 0.5);

    return text;
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
    gridY: number,
    elevation: number = 0
  ): void {
    const elevationOffset = elevation * ELEVATION_HEIGHT_STEP;
    const screenPos = this.isoTransform.gridToScreen(gridX, gridY);
    container.setPosition(screenPos.x, screenPos.y - elevationOffset);

    // Update stored grid position and elevation
    container.setData('gridX', gridX);
    container.setData('gridY', gridY);
    container.setData('elevation', elevation);

    // Update depth
    const depth = this.isoTransform.calculateDepth(gridX, gridY, elevation);
    container.setDepth(depth);
  }

  /**
   * Get the isometric transform instance.
   */
  getTransform(): IsometricTransform {
    return this.isoTransform;
  }
}
