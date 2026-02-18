import Phaser from 'phaser';
import { Entity, Creature, Mineral, Plant, CreatureBehavior, Position, ZONE_SIZE } from '@into-the-void/shared-types';
import { IsometricTransform } from '../utils/IsometricTransform';

const ELEVATION_HEIGHT_STEP = 16; // Pixels per elevation level
const OCCLUSION_DEPTH_THRESHOLD = 10.0;  // Structures this far "in front" occlude entities
const OCCLUSION_MIN_HEIGHT = 3;          // Only structures >= 3 elevation levels occlude
const OCCLUDED_ALPHA = 0.3;              // Alpha for occluded entities (30% visible)

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
   * Convert Position (local coords + zoneId) to world coordinates.
   * World coords = zoneCoords * ZONE_SIZE + localCoords
   */
  private positionToWorldCoords(position: Position): { worldX: number; worldY: number } {
    const parts = position.zoneId.split('_');
    const zoneX = parseInt(parts[1], 10);
    const zoneY = parseInt(parts[2], 10);
    return {
      worldX: zoneX * ZONE_SIZE + position.x,
      worldY: zoneY * ZONE_SIZE + position.y,
    };
  }

  /**
   * Creates a container with entity sprite, nameplate, optional health bar, and optional behavior icon.
   */
  createEntityContainer(entity: Entity, elevation: number = 0): Phaser.GameObjects.Container {
    // Convert to world coordinates for depth sorting
    const { worldX, worldY } = this.positionToWorldCoords(entity.position);
    const screenPos = this.isoTransform.gridToScreen(worldX, worldY);

    const elevationOffset = elevation * ELEVATION_HEIGHT_STEP;
    const container = this.scene.add.container(screenPos.x, screenPos.y - elevationOffset);

    // Store world coordinates for depth sorting
    container.setData('gridX', worldX);
    container.setData('gridY', worldY);
    container.setData('elevation', elevation);

    // Blob shadow at ground level (container origin)
    const shadow = this.scene.add.ellipse(0, 0, 40, 20, 0x000000, 0.3);
    shadow.setOrigin(0.5, 0.5);
    container.add(shadow);

    // Entity sprite elevated above ground
    const sprite = this.scene.add.sprite(0, -this.elevationOffset, this.getEntityTexture(entity));
    sprite.setOrigin(0.5, 1.0); // Bottom-center origin for ground alignment
    container.add(sprite);

    // Nameplate above sprite (always visible for entity identification)
    const nameplate = this.createNameplate(entity.name);
    nameplate.y = -this.elevationOffset - 60; // Above sprite, health bar, and behavior icon
    container.add(nameplate);

    // Health bar for creatures (always visible per INTR-08)
    if (this.isCreature(entity)) {
      const healthBar = this.createHealthBar(entity.health, entity.maxHealth);
      healthBar.y = -this.elevationOffset - 24; // Above sprite
      container.add(healthBar);
    }

    // Yield bar for minerals (same visual as health bar)
    if (this.isMineral(entity)) {
      const yieldBar = this.createHealthBar(entity.yield, entity.maxYield);
      yieldBar.y = -this.elevationOffset - 24;
      container.add(yieldBar);
    }

    // Yield bar for plants (same visual as health bar)
    if (this.isPlant(entity)) {
      const yieldBar = this.createHealthBar(entity.yield, entity.maxYield);
      yieldBar.y = -this.elevationOffset - 24;
      container.add(yieldBar);
    }

    // Behavior icon for creatures (above health bar)
    if (this.isCreature(entity)) {
      const behaviorIcon = this.createBehaviorIcon(entity.behavior);
      behaviorIcon.y = -this.elevationOffset - 34; // Above health bar
      container.add(behaviorIcon);
    }

    // Initial depth: Y-position with X-tiebreaker and elevation (use world coordinates)
    const depth = this.isoTransform.calculateDepth(worldX, worldY, elevation);
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
      case 'herbivore':
        letter = 'H';
        color = '#44cc44'; // green
        break;
      case 'omnivore':
        letter = 'O';
        color = '#ffcc00'; // yellow
        break;
      case 'predator':
        letter = 'P';
        color = '#ff6b35'; // orange
        break;
      case 'maniac':
        letter = 'M';
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
   * Maps entity to texture key.
   * Uses species-specific or resource-specific texture for enriched entities,
   * falling back to type-based texture if unavailable.
   */
  private getEntityTexture(entity: Entity): string {
    // Use species-specific texture if available (enriched entities)
    if (this.isCreature(entity) && entity.speciesId) {
      // Try species-specific texture, fall back to generic 'creature'
      return entity.speciesId;
    }
    if (this.isMineral(entity) && entity.resourceId) {
      return entity.resourceId;
    }
    if (this.isPlant(entity) && entity.speciesId) {
      return entity.speciesId;
    }

    // Fall back to type-based texture
    switch (entity.type) {
      case 'creature':
        return 'creature';
      case 'mineral':
        return 'mineral';
      case 'plant':
        return 'plant';
      case 'artifact':
        return 'artifact';
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
   * Type guard to check if entity is a Mineral.
   */
  private isMineral(entity: Entity): entity is Mineral {
    return entity.type === 'mineral';
  }

  /**
   * Type guard to check if entity is a Plant.
   */
  private isPlant(entity: Entity): entity is Plant {
    return entity.type === 'plant';
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
}
