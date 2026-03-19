import Phaser from 'phaser';
import { Entity, Creature, Mineral, Plant, Npc, CreatureBehavior, Position, ZONE_SIZE } from '@into-the-void/shared-types';
import type { NodeRarity, ItemEntity, DamageType } from '@into-the-void/shared-types';
import { getItemSprite } from '../../config/itemSpriteMap';
import { IsometricTransform } from '../utils/IsometricTransform';
import { useStatsStore } from '../../store/statsStore';
import { applyRareNodeFX } from './RareNodeFX';

const ELEVATION_HEIGHT_STEP = 128; // Pixels per elevation level (1.0 × diamond height for 256x256 cubes)
const ENTITY_GROUND_OFFSET = 0; // No visual offset — depth sorting (entityOffset=65) handles south-tile wall occlusion
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
  creature_void_crawler: 1.5,      // 128px sprite - insectoid crawler
  creature_coastal_scuttler: 1.5,  // 128px sprite - crustacean
  creature_crystal_hunter: 4.0,    // Larger predator (96px sprite)
  creature_frost_stalker: 3.5,     // Fast predator (56px sprite)
  creature_canopy_grazer: 4.0,     // Large herbivore (48px sprite)
  creature_tide_crab: 3.5,         // Medium crustacean (48px sprite)
  creature_coastal_urchin: 3.0,    // Smaller spiny creature (64px sprite)
  creature_reef_scavenger: 3.5,    // Medium aquatic scavenger (64px sprite)
  creature_crystal_crawler: 2.5,   // Crystal bear (96px sprite)
  creature_void_horror: 2.5,       // Creepy predator maniac (96px sprite)
  creature_toxic_lurker: 2.0,      // Fern creature predator (120px sprite)
  creature_spore_carrier: 1.5,     // 128px sprite - fungal creature
  creature_miasma_drifter: 1.5,    // 128px sprite - toxic drifter
  creature_marsh_lurker: 1.5,      // 128px sprite - marsh predator
  // Reused sprites inherit scale from their source
  creature_dart_runner: 3.5,       // reuses frost-stalker
  creature_petrified_lurker: 2.5,  // reuses void-horror
  creature_kelp_grazer: 3.0,       // reuses neon-creature
  creature_tangle_stalker: 1.5,    // reuses marsh-lurker
  creature_current_rider: 3.5,     // reuses frost-stalker
  creature_echo_drifter: 1.5,      // reuses spore-carrier
  creature_phase_grazer: 3.0,      // reuses neon-creature
  creature_reality_scavenger: 1.5, // reuses void-crawler
  creature_magma_beast: 4.0,       // reuses crystal-hunter
  creature_ash_skimmer: 1.5,       // reuses coastal-scuttler
  creature_ice_burrower: 2.5,      // reuses crystal-crawler
  creature_null_feeder: 3.0,       // reuses neon-creature
  creature_dimensional_hunter: 2.5,// reuses void-horror
  creature_rift_hunter: 1.5,       // reuses marsh-lurker
  creature_pressure_feeder: 2.0,   // reuses toxic-lurker
  creature_trench_hunter: 2.5,     // reuses void-horror
  creature_abyssal_scavenger: 1.5, // reuses void-crawler
  creature_starfall_grazer: 3.0,   // reuses neon-creature
  creature_crater_stalker: 1.5,    // reuses marsh-lurker
  creature_guardian_construct: 2.5, // reuses crystal-crawler
  creature_ruin_seeker: 3.5,       // reuses frost-stalker
  creature_relic_beast: 4.0,       // reuses crystal-hunter
  creature_void_grazer: 1.5,       // reuses marsh-lurker
  creature_anomaly_scavenger: 1.5, // reuses void-crawler
  creature_void_stalker: 2.5,      // reuses void-horror
  creature_dimensional_aberration: 2.0, // reuses toxic-lurker
  creature_abyssal_leviathan: 2.0, // reuses toxic-lurker
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
  creature_spore_carrier: { width: 80, height: 40 },
  creature_miasma_drifter: { width: 80, height: 40 },
  creature_marsh_lurker: { width: 90, height: 45 },
  creature_dart_runner: { width: 80, height: 40 },
  creature_petrified_lurker: { width: 100, height: 50 },
  creature_kelp_grazer: { width: 90, height: 45 },
  creature_tangle_stalker: { width: 90, height: 45 },
  creature_current_rider: { width: 80, height: 40 },
  creature_echo_drifter: { width: 80, height: 40 },
  creature_phase_grazer: { width: 90, height: 45 },
  creature_reality_scavenger: { width: 80, height: 40 },
  creature_magma_beast: { width: 100, height: 50 },
  creature_ash_skimmer: { width: 70, height: 35 },
  creature_ice_burrower: { width: 100, height: 50 },
  creature_null_feeder: { width: 90, height: 45 },
  creature_dimensional_hunter: { width: 100, height: 50 },
  creature_rift_hunter: { width: 90, height: 45 },
  creature_pressure_feeder: { width: 110, height: 55 },
  creature_trench_hunter: { width: 100, height: 50 },
  creature_abyssal_scavenger: { width: 80, height: 40 },
  creature_starfall_grazer: { width: 90, height: 45 },
  creature_crater_stalker: { width: 90, height: 45 },
  creature_guardian_construct: { width: 100, height: 50 },
  creature_ruin_seeker: { width: 80, height: 40 },
  creature_relic_beast: { width: 100, height: 50 },
  creature_void_grazer: { width: 90, height: 45 },
  creature_anomaly_scavenger: { width: 80, height: 40 },
  creature_void_stalker: { width: 100, height: 50 },
  creature_dimensional_aberration: { width: 110, height: 55 },
  creature_abyssal_leviathan: { width: 110, height: 55 },
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
  creature_spore_carrier: 0,
  creature_miasma_drifter: 0,
  creature_marsh_lurker: 0,
  creature_dart_runner: 0,
  creature_petrified_lurker: 0,
  creature_kelp_grazer: 0,
  creature_tangle_stalker: 0,
  creature_current_rider: 0,
  creature_echo_drifter: 0,
  creature_phase_grazer: 0,
  creature_reality_scavenger: 0,
  creature_magma_beast: 0,
  creature_ash_skimmer: 0,
  creature_ice_burrower: 0,
  creature_null_feeder: 0,
  creature_dimensional_hunter: 0,
  creature_rift_hunter: 0,
  creature_pressure_feeder: 0,
  creature_trench_hunter: 0,
  creature_abyssal_scavenger: 0,
  creature_starfall_grazer: 0,
  creature_crater_stalker: 0,
  creature_guardian_construct: 0,
  creature_ruin_seeker: 0,
  creature_relic_beast: 0,
  creature_void_grazer: 0,
  creature_anomaly_scavenger: 0,
  creature_void_stalker: 0,
  creature_dimensional_aberration: 0,
  creature_abyssal_leviathan: 0,
};

// Scale overrides for specific plants (speciesId -> scale multiplier)
const PLANT_SCALE_OVERRIDE: Record<string, number> = {
  plant_void_tree: 3.0,  // Large tree - towering over players (256px spritesheet frame)
  plant_tendril_tree: 3.0,  // Large fungal tree (256px sprite)
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
    // Elliptical drop shadow at ground level for all entity types
    {
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
      // Plants get proportional shadow
      if (this.isPlant(entity)) {
        shadowWidth = 50 * scale;
        shadowHeight = 25 * scale;
      }
      // Minerals get proportional shadow
      if (this.isMineral(entity)) {
        shadowWidth = 45 * scale;
        shadowHeight = 22 * scale;
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

    // Entity sprite - all entity types anchor at tile ground level (y=0 in container space)
    let spriteYOffset = 0;
    // Override Y offset for specific animated creatures if needed (all currently 0, reserved for future use)
    if (this.isCreature(entity) && entity.speciesId && entity.speciesId in ANIMATED_CREATURE_Y_OFFSET) {
      spriteYOffset = ANIMATED_CREATURE_Y_OFFSET[entity.speciesId];
    }

    // Track feature entities for UI hover behavior
    const isFeature = this.isPlant(entity) || this.isMineral(entity);

    const { key: textureKey, frame: textureFrame } = this.getEntityTexture(entity);
    const sprite = this.scene.add.sprite(0, spriteYOffset, textureKey, textureFrame);

    // All entity types use bottom-center origin: sprite base sits at the tile surface
    sprite.setOrigin(0.5, 1.0);
    sprite.setScale(scaleX, scaleY);

    // For features (plants/minerals), auto-detect visible bounds for hit area and hover outline
    let featureBounds: { topFrac: number; bottomFrac: number; leftFrac: number; rightFrac: number } | null = null;
    if (isFeature) {
      featureBounds = this.getVisibleBounds(textureKey, textureFrame);
    }

    // Apply glow effect for rare/epic minerals and plants
    if (this.isMineral(entity) || this.isPlant(entity)) {
      const rarity = (entity as { rarity?: NodeRarity }).rarity;
      applyRareNodeFX(sprite, rarity);

      // Store rarity on container for marker creation
      if (rarity && rarity !== 'common') {
        container.setData('rarity', rarity);
      }
    }

    // Make sprites interactive with tight hitArea matching visible art (RENDER-04)
    const isClickable = entity.type === 'creature' || entity.type === 'plant' || entity.type === 'mineral' || entity.type === 'npc' || entity.type === 'item' || entity.type === 'artifact';
    if (isClickable) {
      const texW = sprite.width;
      const texH = sprite.height;
      const isAnimated = this.isCreature(entity) && entity.speciesId && EntityRenderer.ANIMATED_CREATURES.has(entity.speciesId);

      let hitRect: Phaser.Geom.Rectangle;
      if (featureBounds) {
        // Features: use auto-detected visible bounds for precise hit area
        hitRect = new Phaser.Geom.Rectangle(
          featureBounds.leftFrac * texW,
          featureBounds.topFrac * texH,
          (1 - featureBounds.leftFrac - featureBounds.rightFrac) * texW,
          (1 - featureBounds.topFrac - featureBounds.bottomFrac) * texH
        );
      } else {
        // Animated creatures: use fixed percentage padding (tighter sprite sheets)
        const hitPadX = texW * (isAnimated ? 0.10 : 0.15);
        const hitPadTop = texH * (isAnimated ? 0.15 : 0.2);
        hitRect = new Phaser.Geom.Rectangle(
          hitPadX,
          hitPadTop,
          texW - hitPadX * 2,
          texH - hitPadTop
        );
      }
      sprite.setInteractive(hitRect, Phaser.Geom.Rectangle.Contains);
      sprite.input!.cursor = 'pointer';

      // NPCs get a chat-bubble cursor to indicate they are interactable
      if (entity.type === 'npc') {
        const chatSvg = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'><path d='M6 4h20c1.1 0 2 .9 2 2v14c0 1.1-.9 2-2 2H14l-6 6v-6H6c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z' fill='white' stroke='%23333' stroke-width='2'/></svg>`;
        sprite.input!.cursor = `url("${chatSvg}") 16 16, pointer`;
      }

      // Store visible bounds on container for hover outline access
      if (featureBounds) {
        container.setData('visibleBounds', featureBounds);
      }

      // Hover outline glow for clickable entities (CONTEXT.md: outline glow on hover)
      const hoverGlow = this.scene.add.graphics();
      hoverGlow.setVisible(false);
      container.add(hoverGlow);
      container.setData('hoverGlow', hoverGlow);

      sprite.on('pointerover', () => {
        hoverGlow.clear();
        hoverGlow.lineStyle(3, 0xffffff, 0.6);

        const bounds = container.getData('visibleBounds') as typeof featureBounds;
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

        // Plants/minerals: also show nameplate and yield bar on hover
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

        // Plants/minerals: hide nameplate and yield bar
        if (isFeature) {
          const nameplate = container.getData('nameplate') as Phaser.GameObjects.Text | undefined;
          const yieldBar = container.getData('yieldBar') as Phaser.GameObjects.Graphics | undefined;
          if (nameplate) nameplate.setVisible(false);
          if (yieldBar) yieldBar.setVisible(false);
        }
      });
    }

    container.add(sprite);
    container.setData('entityScale', scale); // Store for UI positioning
    container.setData('entitySprite', sprite); // Store sprite reference for animation

    // Compute actual visual sprite height for UI positioning
    // For features, use visible height (excluding transparent padding) for accurate nameplate placement
    const actualSpriteHeight = featureBounds
      ? (1 - featureBounds.topFrac - featureBounds.bottomFrac) * sprite.height * scaleY
      : sprite.height * scaleY;
    container.setData('actualSpriteHeight', actualSpriteHeight);

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

    // UI positioning based on actual sprite height (not BASE_SPRITE_HEIGHT)
    // All entities: origin(0.5, 1.0) → sprite top at y = spriteYOffset - actualSpriteHeight
    const spriteTopY = spriteYOffset - actualSpriteHeight;
    const uiBaseY = spriteTopY - 20; // 20px padding above sprite top
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
    // Features need a depth boost so they render in front of tiles their sprite overlaps.
    // The boost equals the display height: each 64px of height covers ~1 isometric row south.
    // entityOffset (65) already handles the immediate south tile; this covers rows 2+.
    const featureDepthBoost = isFeature ? actualSpriteHeight : 0;
    container.setData('depthBoost', featureDepthBoost);
    const depth = this.isoTransform.calculateDepth(worldX, worldY, elevation, featureDepthBoost, true);
    container.setDepth(depth);

    // CRAI-06: Stealthed predators are invisible on spawn
    if (this.isCreature(entity) && (entity as Creature).stealthed) {
      container.setAlpha(0);
      container.setData('stealthed', true);
    }

    // CRAI-06: Frenzied maniacs get red tint + pulsing on spawn
    if (this.isCreature(entity) && (entity as Creature).frenzied) {
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
    'creature_spore_carrier',
    'creature_miasma_drifter',
    'creature_marsh_lurker',
    'creature_dart_runner',
    'creature_petrified_lurker',
    'creature_kelp_grazer',
    'creature_tangle_stalker',
    'creature_current_rider',
    'creature_echo_drifter',
    'creature_phase_grazer',
    'creature_reality_scavenger',
    'creature_magma_beast',
    'creature_ash_skimmer',
    'creature_ice_burrower',
    'creature_null_feeder',
    'creature_dimensional_hunter',
    'creature_rift_hunter',
    'creature_pressure_feeder',
    'creature_trench_hunter',
    'creature_abyssal_scavenger',
    'creature_starfall_grazer',
    'creature_crater_stalker',
    'creature_guardian_construct',
    'creature_ruin_seeker',
    'creature_relic_beast',
    'creature_void_grazer',
    'creature_anomaly_scavenger',
    'creature_void_stalker',
    'creature_dimensional_aberration',
    'creature_abyssal_leviathan',
  ]);

  // Features with sprite variants: entityId -> number of variants
  // Used for plants, minerals, and artifacts
  private static readonly FEATURE_SPRITE_VARIANTS: Record<string, number> = {
    // Plants - void plains (from void-biome-features spritesheet)
    plant_void_tree: 1,
    plant_void_fern: 1,
    plant_drought_cactus: 1,
    // Plants - other biomes
    plant_tendril_tree: 1,
    plant_rare_fungi: 4,
    plant_magma_bloom: 4,
    // Minerals - void plains (from void-biome-features spritesheet)
    mineral_void_crystal: 1,
    mineral_void_slate: 1,
    // Plants - crystal caves (from crystal-biome-features spritesheet)
    plant_lattice_moss: 1,
    plant_crystal_lichen: 1,
    plant_prism_bloom: 1,
    // Minerals - crystal caves (from crystal-biome-features spritesheet)
    mineral_cave_geode: 1,
    mineral_prismatic_crystal: 1,
    // Plants - toxic wastes (from acid-biome-features spritesheet)
    plant_acid_fern: 1,
    plant_acid_bloom: 1,
    plant_chemical_bloom: 1,
    // Minerals - toxic wastes (from acid-biome-features spritesheet)
    mineral_corrosive_deposit: 1,
    mineral_acid_stone: 1,
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
  private getEntityTexture(entity: Entity): { key: string; frame?: number } {
    // Use species-specific texture if available (enriched entities)
    if (this.isCreature(entity) && entity.speciesId) {
      // Check if this creature has animated sprites
      if (EntityRenderer.ANIMATED_CREATURES.has(entity.speciesId)) {
        // Return idle sprite facing south (default direction)
        return { key: `${entity.speciesId}-idle-s` };
      }
      // Try species-specific texture, fall back to generic 'creature'
      return { key: entity.speciesId };
    }
    if (this.isMineral(entity) && entity.resourceId) {
      // Strip _rare/_epic suffix to use base texture (rare/epic rendered larger via rarity scaling)
      const baseResourceId = entity.resourceId.replace(/_rare$|_epic$/, '');
      // Check if this mineral has sprite variants
      const variantCount = EntityRenderer.FEATURE_SPRITE_VARIANTS[baseResourceId];
      if (variantCount) {
        const variant = (EntityRenderer.hashEntityId(entity.id) % variantCount) + 1;
        return { key: `${baseResourceId}-v${variant}` };
      }
      return { key: baseResourceId };
    }
    if (this.isPlant(entity) && entity.speciesId) {
      // Strip _rare/_epic suffix to use base texture (rare/epic rendered larger via rarity scaling)
      const baseSpeciesId = entity.speciesId.replace(/_rare$|_epic$/, '');
      // Check if this plant species has sprite variants
      const variantCount = EntityRenderer.FEATURE_SPRITE_VARIANTS[baseSpeciesId];
      if (variantCount) {
        // Deterministic variant selection based on entity ID
        const variant = (EntityRenderer.hashEntityId(entity.id) % variantCount) + 1;
        return { key: `${baseSpeciesId}-v${variant}` };
      }
      return { key: baseSpeciesId };
    }

    // NPC sprites based on npcType
    if (this.isNpc(entity) && entity.npcType) {
      // Convert npcType to folder name (faction_rep -> faction-rep)
      const folderName = entity.npcType.replace('_', '-');
      // Return idle sprite facing south (default direction)
      const spriteKey = `npc-${folderName}-s`;
      // Check if sprite exists, fall back to player if not
      if (this.scene.textures.exists(spriteKey)) {
        return { key: spriteKey };
      }
      return { key: 'player-fallback' };
    }

    // Ground items: use spritesheet frame if mapping exists
    if (entity.type === 'item') {
      const itemEntity = entity as ItemEntity;
      const spriteInfo = getItemSprite(itemEntity.itemId);
      if (spriteInfo) {
        const sheetKey = `item-sheet-${spriteInfo.sheet.replace('.png', '')}`;
        if (this.scene.textures.exists(sheetKey)) {
          return { key: sheetKey, frame: spriteInfo.frame };
        }
      }
      return { key: 'item' };
    }

    // Fall back to type-based texture
    switch (entity.type) {
      case 'creature':
        return { key: 'creature' };
      case 'mineral':
        return { key: 'mineral' };
      case 'plant':
        return { key: 'plant' };
      case 'artifact':
        return { key: 'artifact' };
      case 'npc':
        return { key: 'player-fallback' };
      default:
        return { key: 'item' };
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
