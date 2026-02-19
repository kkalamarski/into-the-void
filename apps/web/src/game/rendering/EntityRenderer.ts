import Phaser from 'phaser';
import { Entity, Creature, Mineral, Plant, Npc, CreatureBehavior, Position, ZONE_SIZE } from '@into-the-void/shared-types';
import { IsometricTransform } from '../utils/IsometricTransform';
import { useStatsStore } from '../../store/statsStore';

const ELEVATION_HEIGHT_STEP = 128; // Pixels per elevation level (1.0 × diamond height for 256x256 cubes)
const OCCLUSION_DEPTH_THRESHOLD = 10.0;  // Structures this far "in front" occlude entities
const OCCLUSION_MIN_HEIGHT = 3;          // Only structures >= 3 elevation levels occlude
const OCCLUDED_ALPHA = 0.3;              // Alpha for occluded entities (30% visible)

// Entity size scales by type - base scale multiplier for 256x256 sprites
const ENTITY_SCALE: Record<string, number> = {
  creature: 2.5,   // Large - creatures should be prominent
  mineral: 2.0,    // Medium-large - resource nodes
  plant: 1.8,      // Medium - harvestable plants
  artifact: 1.5,   // Medium-small - collectible items
  item: 1.0,       // Small - dropped items on ground
  npc: 2.2,        // NPCs slightly smaller than creatures
};

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
export class EntityRenderer {
  private scene: Phaser.Scene;
  private tileSize: number;
  private isoTransform: IsometricTransform;
  private elevationOffset = 24; // Pixels entities hover above ground (doubled for 256x256 sprites)

  constructor(scene: Phaser.Scene, tileWidth: number = 256, tileHeight: number = 128) {
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

    // Get scale for this entity type
    const scale = ENTITY_SCALE[entity.type] ?? 1.0;
    const spriteHeight = BASE_SPRITE_HEIGHT * scale;

    // Blob shadow at ground level (container origin) - sized based on entity type
    const shadowWidth = 60 * scale;
    const shadowHeight = 30 * scale;
    const shadow = this.scene.add.ellipse(0, 0, shadowWidth, shadowHeight, 0x000000, 0.3);
    shadow.setOrigin(0.5, 0.5);
    container.add(shadow);

    // Entity sprite elevated above ground (scaled based on entity type)
    const sprite = this.scene.add.sprite(0, -this.elevationOffset, this.getEntityTexture(entity));
    sprite.setOrigin(0.5, 1.0); // Bottom-center origin for ground alignment
    sprite.setScale(scale);

    // Make creature sprites interactive for click-to-attack
    if (entity.type === 'creature') {
      sprite.setInteractive({ useHandCursor: true });
    } else {
      sprite.setInteractive();
    }

    container.add(sprite);
    container.setData('entityScale', scale); // Store for UI positioning

    // Store entity identity on container for click handling in WorldScene
    container.setData('entityId', entity.id);
    container.setData('entityType', entity.type);

    // UI positioning based on sprite height
    const uiBaseY = -this.elevationOffset - spriteHeight * 0.5;
    const { name: displayName, gated } = this.applyPerceptionGate(entity);

    // Creatures get WoW-style health bar with behavior icon and name inside
    if (this.isCreature(entity)) {
      const healthBar = this.createHealthBarWithName(displayName, entity.health, entity.maxHealth, entity.behavior, gated);
      healthBar.y = uiBaseY;
      container.add(healthBar);
    }

    // Minerals get nameplate + yield bar
    if (this.isMineral(entity)) {
      const nameplate = this.createNameplate(displayName);
      nameplate.y = uiBaseY - 20;
      container.add(nameplate);

      const yieldBar = this.createHealthBar(entity.yield, entity.maxYield);
      yieldBar.y = uiBaseY;
      container.add(yieldBar);
      container.setData('maxYield', entity.maxYield);
      container.setData('yieldBar', yieldBar);
    }

    // Plants get nameplate + yield bar
    if (this.isPlant(entity)) {
      const nameplate = this.createNameplate(displayName);
      nameplate.y = uiBaseY - 20;
      container.add(nameplate);

      const yieldBar = this.createHealthBar(entity.yield, entity.maxYield);
      yieldBar.y = uiBaseY;
      container.add(yieldBar);
      container.setData('maxYield', entity.maxYield);
      container.setData('yieldBar', yieldBar);
    }

    // Artifacts and items just get nameplate
    if (entity.type === 'artifact' || entity.type === 'item') {
      const nameplate = this.createNameplate(displayName);
      nameplate.y = uiBaseY;
      container.add(nameplate);
    }

    // NPCs get nameplate with distinct styling based on NPC type
    if (this.isNpc(entity)) {
      const nameplate = this.createNpcNameplate(entity.name, entity.npcType);
      nameplate.y = uiBaseY;
      container.add(nameplate);
    }

    // Store data for update handlers (yield bar update, fade-in offset)
    container.setData('elevationOffset', this.elevationOffset);

    // Initial depth: Y-position with X-tiebreaker and elevation (use world coordinates)
    const depth = this.isoTransform.calculateDepth(worldX, worldY, elevation);
    container.setDepth(depth);

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
      fontSize: '32px',
      fontStyle: 'bold',
      color: color,
      backgroundColor: '#000000cc',
      padding: { x: 12, y: 6 },
    });
    text.setOrigin(0.5, 0.5);
    text.setShadow(2, 2, '#000000', 3);

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
      case 'npc':
        return 'player'; // Reuse player sprite as fallback for NPCs until NPC sprites are added
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
   * Type guard to check if entity is an Npc.
   */
  private isNpc(entity: Entity): entity is Npc {
    return entity.type === 'npc';
  }

  /**
   * Creates an NPC nameplate with type indicator and distinct color border.
   */
  createNpcNameplate(name: string, npcType: string): Phaser.GameObjects.Container {
    const container = this.scene.add.container(0, 0);

    // NPC type indicator colors
    const typeColors: Record<string, number> = {
      trader: 0xf0c040,      // Gold for traders
      guard: 0x8080a0,       // Steel gray for guards
      faction_rep: 0x60a0ff, // Blue for faction reps
      ambient: 0xa0a0a0,     // Gray for ambient
      service: 0x60c060,     // Green for service
    };

    const typeColor = typeColors[npcType] ?? 0xffffff;

    // Background panel
    const bg = this.scene.add.graphics();
    const width = 300;
    const height = 50;
    bg.fillStyle(0x222222, 0.9);
    bg.fillRoundedRect(-width / 2, -height / 2, width, height, 8);
    bg.lineStyle(3, typeColor, 1);
    bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 8);
    container.add(bg);

    // Name text
    const text = this.scene.add.text(0, 0, name, {
      fontSize: '30px',
      fontStyle: 'bold',
      color: '#ffffff',
    });
    text.setOrigin(0.5, 0.5);
    text.setShadow(2, 2, '#000000', 4);
    container.add(text);

    return container;
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
   * Creates an animated floating damage number above a position.
   * Text floats upward and fades out over ~1 second.
   *
   * @param scene - Phaser scene to create the text in
   * @param x - Screen X position (world coords)
   * @param y - Screen Y position (world coords)
   * @param damage - Damage amount to display
   * @param isPlayerDamage - If true, uses red color (local player took damage); otherwise white
   */
  static createFloatingDamage(scene: Phaser.Scene, x: number, y: number, damage: number, isPlayerDamage: boolean): void {
    const color = isPlayerDamage ? '#ff4444' : '#ffffff';
    const text = scene.add.text(x, y, `-${damage}`, {
      fontSize: '32px',
      fontStyle: 'bold',
      color: color,
      shadow: {
        offsetX: 2,
        offsetY: 2,
        color: '#000000',
        blur: 4,
        fill: true,
      },
    });
    text.setOrigin(0.5, 0.5);
    text.setDepth(3000);

    scene.tweens.add({
      targets: text,
      y: y - 80,
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
}
