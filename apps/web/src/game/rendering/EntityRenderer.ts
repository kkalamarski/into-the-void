import Phaser from 'phaser';
import { Entity, Creature, Mineral, Plant, Npc, CreatureBehavior, Position, ZONE_SIZE } from '@into-the-void/shared-types';
import type { NodeRarity } from '@into-the-void/shared-types';
import { IsometricTransform } from '../utils/IsometricTransform';
import { useStatsStore } from '../../store/statsStore';
import { applyRareNodeFX } from './RareNodeFX';

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

// Scale overrides for animated creatures with smaller sprite sheets (~48-120px)
const ANIMATED_CREATURE_SCALE: Record<string, number> = {
  creature_void_crawler: 3.5,      // ~200px visual size
  creature_coastal_scuttler: 3.0,  // Smaller creature
  creature_crystal_hunter: 4.0,    // Larger predator
  creature_frost_stalker: 3.5,     // Similar size to void crawler
  creature_canopy_grazer: 4.0,     // Large herbivore (48px sprite)
  creature_tide_crab: 3.5,         // Medium crustacean (48px sprite)
  creature_coastal_urchin: 3.0,    // Smaller spiny creature (64px sprite)
  creature_reef_scavenger: 3.5,    // Medium aquatic scavenger (64px sprite)
  creature_crystal_crawler: 2.5,   // Crystal bear (96px sprite)
  creature_void_horror: 2.5,       // Creepy predator maniac (96px sprite)
  creature_toxic_lurker: 2.0,      // Fern creature predator (120px sprite)
};

// Shadow size overrides for animated creatures { width, height }
const ANIMATED_CREATURE_SHADOW: Record<string, { width: number; height: number }> = {
  creature_void_crawler: { width: 80, height: 40 },
  creature_coastal_scuttler: { width: 70, height: 35 },
  creature_crystal_hunter: { width: 90, height: 45 },
  creature_frost_stalker: { width: 80, height: 40 },
  creature_canopy_grazer: { width: 90, height: 45 },
  creature_tide_crab: { width: 80, height: 40 },
  creature_coastal_urchin: { width: 70, height: 35 },
  creature_reef_scavenger: { width: 80, height: 40 },
  creature_crystal_crawler: { width: 100, height: 50 },
  creature_void_horror: { width: 100, height: 50 },
  creature_toxic_lurker: { width: 110, height: 55 },
};

// Y offset overrides for animated creatures (0 = feet at shadow level)
const ANIMATED_CREATURE_Y_OFFSET: Record<string, number> = {
  creature_void_crawler: 0,
  creature_coastal_scuttler: 0,
  creature_crystal_hunter: 0,
  creature_frost_stalker: 0,
  creature_canopy_grazer: 0,
  creature_tide_crab: 0,
  creature_coastal_urchin: 0,
  creature_reef_scavenger: 0,
  creature_crystal_crawler: 0,
  creature_void_horror: 0,
  creature_toxic_lurker: 0,
};

// Scale overrides for specific plants (speciesId -> scale multiplier)
const PLANT_SCALE_OVERRIDE: Record<string, number> = {
  plant_void_tree: 8.0,  // Large tree - towering over players
};

// Scale multipliers for rare/epic resource nodes
const RARITY_SCALE_MULTIPLIER: Record<string, number> = {
  common: 1.0,
  rare: 1.4,    // 40% larger
  epic: 1.7,    // 70% larger
};

// NPC sprite scale (48px sprites scaled to match player character)
// Player uses 6x width, 4.5x height for isometric squash
const NPC_SPRITE_SCALE_X = 6;
const NPC_SPRITE_SCALE_Y = 4.5;


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
  private questMarkers: Map<string, Phaser.GameObjects.Container> = new Map();

  constructor(scene: Phaser.Scene, tileWidth: number = 256, tileHeight: number = 128) {
    this.scene = scene;
    this.tileSize = tileWidth; // Keep for backwards compat
    this.isoTransform = new IsometricTransform(tileWidth, tileHeight);
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

    // Get scale for this entity type (with overrides for specific species)
    let scale = ENTITY_SCALE[entity.type] ?? 1.0;
    let scaleX = scale;
    let scaleY = scale;
    if (this.isCreature(entity) && entity.speciesId && ANIMATED_CREATURE_SCALE[entity.speciesId]) {
      scale = ANIMATED_CREATURE_SCALE[entity.speciesId];
      scaleX = scale;
      scaleY = scale;
    }
    if (this.isPlant(entity) && entity.speciesId && PLANT_SCALE_OVERRIDE[entity.speciesId]) {
      scale = PLANT_SCALE_OVERRIDE[entity.speciesId];
      scaleX = scale;
      scaleY = scale;
    }
    // NPCs use player character scaling (6x width, 4.5x height for isometric squash)
    if (this.isNpc(entity)) {
      scaleX = NPC_SPRITE_SCALE_X;
      scaleY = NPC_SPRITE_SCALE_Y;
      scale = scaleY; // Use Y scale for height calculations
    }
    // Apply rarity scale multiplier for minerals and plants
    if (this.isMineral(entity) || this.isPlant(entity)) {
      const rarity = (entity as { rarity?: NodeRarity }).rarity ?? 'common';
      scale *= RARITY_SCALE_MULTIPLIER[rarity] ?? 1.0;
      scaleX = scale;
      scaleY = scale;
    }
    const spriteHeight = BASE_SPRITE_HEIGHT * scaleY;

    // Blob shadow at ground level - skip for plants and minerals (performance optimization)
    if (!this.isPlant(entity) && !this.isMineral(entity)) {
      let shadowWidth = 60 * scale;
      let shadowHeight = 30 * scale;
      // Creatures get larger shadow to touch feet
      if (this.isCreature(entity)) {
        shadowWidth = 80 * (scale / 2.5); // Scale relative to default creature scale
        shadowHeight = 40 * (scale / 2.5);
        // Override shadow for specific animated creatures
        if (entity.speciesId && ANIMATED_CREATURE_SHADOW[entity.speciesId]) {
          const shadowOverride = ANIMATED_CREATURE_SHADOW[entity.speciesId];
          shadowWidth = shadowOverride.width;
          shadowHeight = shadowOverride.height;
        }
      }
      // NPCs get same shadow as player character
      if (this.isNpc(entity)) {
        shadowWidth = 120;
        shadowHeight = 60;
      }
      const shadow = this.scene.add.ellipse(0, 0, shadowWidth, shadowHeight, 0x000000, 0.3);
      shadow.setOrigin(0.5, 0.5);
      container.add(shadow);
    }

    // Entity sprite - creatures, NPCs, and plants at ground level, others elevated
    let spriteYOffset = -this.elevationOffset;
    if (this.isCreature(entity)) {
      // Creatures positioned with feet at shadow level
      spriteYOffset = 0;
      // Override Y offset for specific animated creatures if needed
      if (entity.speciesId && entity.speciesId in ANIMATED_CREATURE_Y_OFFSET) {
        spriteYOffset = ANIMATED_CREATURE_Y_OFFSET[entity.speciesId];
      }
    }
    if (this.isNpc(entity)) {
      // NPCs positioned with feet at shadow level
      spriteYOffset = 0;
    }
    if (this.isPlant(entity) || this.isMineral(entity)) {
      // Plants and minerals positioned with base at ground level
      spriteYOffset = 0;
    }
    const sprite = this.scene.add.sprite(0, spriteYOffset, this.getEntityTexture(entity));
    sprite.setOrigin(0.5, 1.0); // Bottom-center origin for ground alignment
    sprite.setScale(scaleX, scaleY);

    // Apply glow effect for rare/epic minerals and plants
    if (this.isMineral(entity) || this.isPlant(entity)) {
      const rarity = (entity as { rarity?: NodeRarity }).rarity;
      applyRareNodeFX(sprite, rarity);

      // Store rarity on container for marker creation
      if (rarity && rarity !== 'common') {
        container.setData('rarity', rarity);
      }
    }

    // Make sprites interactive - use hand cursor for clickable entities
    const isClickable = entity.type === 'creature' || entity.type === 'plant' || entity.type === 'mineral';
    sprite.setInteractive({ useHandCursor: isClickable });

    // Plants and minerals: show UI on hover for performance (UI hidden by default)
    if (this.isPlant(entity) || this.isMineral(entity)) {
      sprite.on('pointerover', () => {
        const nameplate = container.getData('nameplate') as Phaser.GameObjects.Text | undefined;
        const yieldBar = container.getData('yieldBar') as Phaser.GameObjects.Graphics | undefined;
        if (nameplate) nameplate.setVisible(true);
        if (yieldBar) yieldBar.setVisible(true);
      });
      sprite.on('pointerout', () => {
        const nameplate = container.getData('nameplate') as Phaser.GameObjects.Text | undefined;
        const yieldBar = container.getData('yieldBar') as Phaser.GameObjects.Graphics | undefined;
        if (nameplate) nameplate.setVisible(false);
        if (yieldBar) yieldBar.setVisible(false);
      });
    }

    container.add(sprite);
    container.setData('entityScale', scale); // Store for UI positioning
    container.setData('entitySprite', sprite); // Store sprite reference for animation

    // Store entity identity on container for click handling in WorldScene
    container.setData('entityId', entity.id);
    container.setData('entityType', entity.type);

    // Store speciesId for animated creatures
    if (this.isCreature(entity) && entity.speciesId && EntityRenderer.ANIMATED_CREATURES.has(entity.speciesId)) {
      container.setData('speciesId', entity.speciesId);
      container.setData('facing', 's'); // Default facing direction
    }

    // Store npcType for directional NPCs
    if (this.isNpc(entity) && entity.npcType) {
      container.setData('npcType', entity.npcType);
      container.setData('facing', 's'); // Default facing direction
    }

    // UI positioning based on sprite height
    const uiBaseY = -this.elevationOffset - spriteHeight * 0.5;
    const { name: displayName, gated } = this.applyPerceptionGate(entity);

    // Creatures get WoW-style health bar with behavior icon and name inside
    if (this.isCreature(entity)) {
      const healthBar = this.createHealthBarWithName(displayName, entity.health, entity.maxHealth, entity.behavior, gated);
      healthBar.y = uiBaseY;
      container.add(healthBar);
      // Store reference for easy cleanup on health updates
      container.setData('healthBar', healthBar);
    }

    // Minerals get nameplate + yield bar (hidden by default for performance, shown on hover)
    if (this.isMineral(entity)) {
      const rarity = (entity as { rarity?: NodeRarity }).rarity;
      const rarityPrefix = rarity === 'epic' ? '[Epic] ' : rarity === 'rare' ? '[Rare] ' : '';
      const nameplate = this.createNameplate(rarityPrefix + displayName);
      nameplate.y = uiBaseY - 20;
      nameplate.setVisible(false);
      container.add(nameplate);
      container.setData('nameplate', nameplate);

      const yieldBar = this.createHealthBar(entity.yield, entity.maxYield);
      yieldBar.y = uiBaseY;
      yieldBar.setVisible(false);
      container.add(yieldBar);
      container.setData('maxYield', entity.maxYield);
      container.setData('yieldBar', yieldBar);
    }

    // Plants get nameplate + yield bar (hidden by default for performance, shown on hover)
    if (this.isPlant(entity)) {
      const rarity = (entity as { rarity?: NodeRarity }).rarity;
      const rarityPrefix = rarity === 'epic' ? '[Epic] ' : rarity === 'rare' ? '[Rare] ' : '';
      const nameplate = this.createNameplate(rarityPrefix + displayName);
      nameplate.y = uiBaseY - 20;
      nameplate.setVisible(false);
      container.add(nameplate);
      container.setData('nameplate', nameplate);

      const yieldBar = this.createHealthBar(entity.yield, entity.maxYield);
      yieldBar.y = uiBaseY;
      yieldBar.setVisible(false);
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
    const depth = this.isoTransform.calculateDepth(worldX, worldY, elevation, 0, true);
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

  // Creatures with sprite sheets (idle + walk animations)
  private static readonly ANIMATED_CREATURES = new Set([
    'creature_void_crawler',
    'creature_coastal_scuttler',
    'creature_crystal_hunter',
    'creature_frost_stalker',
    'creature_canopy_grazer',
    'creature_tide_crab',
    'creature_coastal_urchin',
    'creature_reef_scavenger',
    'creature_crystal_crawler',
    'creature_void_horror',
    'creature_toxic_lurker',
  ]);

  // Features with sprite variants: entityId -> number of variants
  // Used for plants, minerals, and artifacts
  private static readonly FEATURE_SPRITE_VARIANTS: Record<string, number> = {
    // Plants
    plant_void_tree: 8,
    plant_void_fern: 2,
    plant_drought_cactus: 1,
    // Minerals
    mineral_void_crystal: 1,
  };

  /**
   * Simple hash function for entity ID to get deterministic variant selection.
   */
  private static hashEntityId(id: string): number {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = ((hash << 5) - hash) + id.charCodeAt(i);
      hash |= 0; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Check if a creature has animated sprites available.
   */
  hasAnimatedSprites(speciesId: string): boolean {
    return EntityRenderer.ANIMATED_CREATURES.has(speciesId);
  }

  /**
   * Maps entity to texture key.
   * Uses species-specific or resource-specific texture for enriched entities,
   * falling back to type-based texture if unavailable.
   */
  private getEntityTexture(entity: Entity): string {
    // Use species-specific texture if available (enriched entities)
    if (this.isCreature(entity) && entity.speciesId) {
      // Check if this creature has animated sprites
      if (EntityRenderer.ANIMATED_CREATURES.has(entity.speciesId)) {
        // Return idle sprite facing south (default direction)
        return `${entity.speciesId}-idle-s`;
      }
      // Try species-specific texture, fall back to generic 'creature'
      return entity.speciesId;
    }
    if (this.isMineral(entity) && entity.resourceId) {
      // Strip _rare/_epic suffix to use base texture (rare/epic rendered larger via rarity scaling)
      const baseResourceId = entity.resourceId.replace(/_rare$|_epic$/, '');
      // Check if this mineral has sprite variants
      const variantCount = EntityRenderer.FEATURE_SPRITE_VARIANTS[baseResourceId];
      if (variantCount) {
        const variant = (EntityRenderer.hashEntityId(entity.id) % variantCount) + 1;
        return `${baseResourceId}-v${variant}`;
      }
      return baseResourceId;
    }
    if (this.isPlant(entity) && entity.speciesId) {
      // Strip _rare/_epic suffix to use base texture (rare/epic rendered larger via rarity scaling)
      const baseSpeciesId = entity.speciesId.replace(/_rare$|_epic$/, '');
      // Check if this plant species has sprite variants
      const variantCount = EntityRenderer.FEATURE_SPRITE_VARIANTS[baseSpeciesId];
      if (variantCount) {
        // Deterministic variant selection based on entity ID
        const variant = (EntityRenderer.hashEntityId(entity.id) % variantCount) + 1;
        return `${baseSpeciesId}-v${variant}`;
      }
      return baseSpeciesId;
    }

    // NPC sprites based on npcType
    if (this.isNpc(entity) && entity.npcType) {
      // Convert npcType to folder name (faction_rep -> faction-rep)
      const folderName = entity.npcType.replace('_', '-');
      // Return idle sprite facing south (default direction)
      const spriteKey = `npc-${folderName}-s`;
      // Check if sprite exists, fall back to player if not
      if (this.scene.textures.exists(spriteKey)) {
        return spriteKey;
      }
      return 'player-fallback';
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
        return 'player-fallback';
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
  static createFloatingDamage(scene: Phaser.Scene, x: number, y: number, damage: number, isPlayerDamage: boolean): void {
    const color = isPlayerDamage ? '#ff4444' : '#ffff00'; // Yellow for damage dealt, red for damage taken
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

    // Get entity scale for positioning
    const scale = container.getData('entityScale') ?? 1.0;
    const spriteHeight = BASE_SPRITE_HEIGHT * scale;

    // Position above nameplate (nameplate is at uiBaseY, marker above that)
    const markerY = -this.elevationOffset - spriteHeight * 0.5 - 60;

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
