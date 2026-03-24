import Phaser from 'phaser';
import { ZONE_SIZE, Position, Entity, PlayerPublic, BiomeType, Direction, Creature, Npc, isHubZone, getZoneSize } from '@into-the-void/shared-types';
import { TILE_SIZE_PX, tileToPixelCenter } from '@into-the-void/game-logic';
import { TileId, tileIdToString } from '@into-the-void/world-gen';
import { QuestRegistry } from '@into-the-void/quests';
import { EntityRenderer } from '../../rendering/EntityRenderer';
import { DepthSorter } from '../../rendering/DepthSorter';
import { RemotePlayerInterpolator } from '../../systems/RemotePlayerInterpolator';
import { TargetHighlight } from '../../rendering/TargetHighlight';
import { IsometricTransform } from '../../utils/IsometricTransform';
import { PixelMovementController } from '../../systems/PixelMovementController';
import { createRareNodeMarker } from '../../rendering/RareNodeFX';
import { useGameStore } from '../../../store/gameStore';
import { useEntityStore } from '../../../store/entityStore';
import { useCombatStore } from '../../../store/combatStore';
import { useQuestStore } from '../../../store/questStore';
import { gameSocket } from '../../../network/socket';
import { FogManager } from '../../fog/FogManager';
import { FogRenderer } from '../../fog/FogRenderer';
import { PoiRenderer } from '../../pois/PoiRenderer';
import { ChunkManager } from '../../rendering/ChunkManager';
import type { DiscoveredResource } from '../../../store/gameStore';

const ENTITY_GROUND_OFFSET = 0;
const VISIBILITY_RADIUS = 48;

/**
 * Interface for accessing shared WorldScene state without tight coupling.
 * WorldScene implements this and passes itself to EntityManager/InteractionController.
 */
export interface WorldSceneAccessor {
  getCurrentZoneId(): string;
  getCurrentTiles(): number[][] | null;
  getCurrentHeights(): number[][] | null;
  getCurrentBiome(): BiomeType;
  getChunkManager(): ChunkManager | null;
  getIsoTransform(): IsometricTransform | null;
  getFogManager(): FogManager | null;
  getFogRenderer(): FogRenderer | null;
  getPoiRenderer(): PoiRenderer | null;
  getDiscoveredPoiIds(): Set<string>;
  getPixelMovement(): PixelMovementController | null;
  parseZoneCoords(zoneId: string): { x: number; y: number };
  getTileElevation(gridX: number, gridY: number, zoneId?: string): number;
  getInterpolatedElevation(gridX: number, gridY: number, zoneId?: string): number;
  getChunkTiles(): Map<string, Phaser.GameObjects.Container[]>;
}

/**
 * Manages entity lifecycle (create/update/destroy), player sprites,
 * depth sorting, damage numbers, quest markers, and rare node markers.
 * Extracted from WorldScene (Phase 152).
 */
export class EntityManager {
  private entityRenderer: EntityRenderer | null = null;
  private entitySprites: Map<string, Phaser.GameObjects.Container> = new Map();
  private entityZoneMap: Map<string, Set<string>> = new Map();
  private playerSprites: Map<string, Phaser.GameObjects.Sprite> = new Map();
  private localPlayer: Phaser.GameObjects.Sprite | null = null;
  private localPlayerFacing: Direction = 's';
  private lastMovementTime = 0;
  private depthSorter: DepthSorter | null = null;
  private remoteInterpolator: RemotePlayerInterpolator | null = null;
  private targetHighlight: TargetHighlight | null = null;
  private rareNodeMarkers: Map<string, Phaser.GameObjects.Container> = new Map();
  // Fog of war system
  private fogManager: FogManager | null = null;
  private fogRenderer: FogRenderer | null = null;
  private fogInitialized: boolean = false;
  // POI discovery system
  private poiRenderer: PoiRenderer | null = null;
  private discoveredPoiIds: Set<string> = new Set();

  constructor(
    private scene: Phaser.Scene,
    private worldAccessor: WorldSceneAccessor,
  ) {}

  /**
   * Initialize entity rendering systems and subscribe to store events.
   */
  create(isoTileWidth: number, isoTileHeight: number): void {
    // Initialize EntityRenderer with isometric dimensions
    this.entityRenderer = new EntityRenderer(this.scene, isoTileWidth, isoTileHeight);
    this.entityRenderer.initStampedeListener();

    // Initialize TargetHighlight for entity targeting feedback
    this.targetHighlight = new TargetHighlight(this.scene);

    // Subscribe to combatStore target changes for auto-targeting
    useCombatStore.subscribe((state, prevState) => {
      if (state.targetEntityId !== prevState.targetEntityId) {
        if (state.targetEntityId) {
          const entity = useEntityStore.getState().entities.get(state.targetEntityId);
          const container = this.entitySprites.get(state.targetEntityId);
          if (entity && container) {
            const creature = entity as { behavior?: string };
            this.targetHighlight?.show(state.targetEntityId, container, creature.behavior ?? 'herbivore');
          }
        } else {
          this.targetHighlight?.hide();
        }
      }
    });

    // Initialize DepthSorter
    this.depthSorter = new DepthSorter();

    // Initialize RemotePlayerInterpolator
    this.remoteInterpolator = new RemotePlayerInterpolator();

    // Initialize POI renderer
    const isoTransform = this.worldAccessor.getIsoTransform();
    if (isoTransform) {
      this.poiRenderer = new PoiRenderer(this.scene, isoTransform);
    }

    // Register socket event listeners for entity-related events
    this.registerSocketListeners();
  }

  private registerSocketListeners(): void {
    // Listen for npc:interact:response to update quest markers after interaction
    gameSocket.on('npc:interact:response', (data) => {
      this.updateNpcQuestMarker(data);
    });

    // Listen for npc:quest-markers to show quest markers on zone entry
    gameSocket.on('npc:quest-markers', (data) => {
      this.applyInitialQuestMarkers(data.markers);
    });

    // Hook quest state changes for real-time marker updates
    gameSocket.on('quest:progress', this.handleQuestProgress);
    gameSocket.on('quest:completed', this.handleQuestCompleted);
    gameSocket.on('quest:abandoned', this.handleQuestAbandoned);

    // POI discovery system listeners
    gameSocket.on('poi:discovered_ids', (data: { poiIds: string[] }) => {
      this.discoveredPoiIds = new Set(data.poiIds);
    });

    gameSocket.on('poi:discovered', (data: { poiId: string; poiType: string; reward: any }) => {
      this.discoveredPoiIds.add(data.poiId);
      this.poiRenderer?.markDiscovered(data.poiId);
    });

    gameSocket.on('poi:already_discovered', (data: { poiId: string }) => {
      this.discoveredPoiIds.add(data.poiId);
      this.poiRenderer?.markDiscovered(data.poiId);
    });

    // Rare node discovery system listeners
    gameSocket.on('rare-nodes:discovered', (data: any) => {
      useGameStore.getState().setDiscoveredResources(data.discoveries);
      this.refreshRareNodeMarkers();
    });

    gameSocket.on('rare-node:new-discovery', (data: any) => {
      useGameStore.getState().addDiscoveredResource(data);
      this.addRareNodeMarker(data);
    });
  }

  /**
   * Per-frame update: depth sorting and remote player interpolation.
   */
  update(time: number, _delta: number): void {
    const isoTransform = this.worldAccessor.getIsoTransform();

    // Throttled depth sorting - include entities AND remote players
    if (this.depthSorter && isoTransform) {
      const allContainers = new Map<string, Phaser.GameObjects.Container>();
      this.entitySprites.forEach((container, id) => {
        allContainers.set(id, container);
      });
      this.playerSprites.forEach((sprite, id) => {
        allContainers.set(id, sprite as unknown as Phaser.GameObjects.Container);
      });
      this.depthSorter.update(time, allContainers, isoTransform);
    }

    // Remote player interpolation
    this.updateRemotePlayerInterpolation();
  }

  /**
   * Update entity visibility based on occlusion by tall structures.
   */
  updateEntityOcclusion(): void {
    if (!this.entityRenderer) return;

    const chunkTiles = this.worldAccessor.getChunkTiles().get(this.worldAccessor.getCurrentZoneId()) ?? null;
    this.entityRenderer.applyOcclusion(this.entitySprites, chunkTiles);

    const playerContainers = new Map<string, Phaser.GameObjects.Container>();
    this.playerSprites.forEach((sprite, id) => {
      playerContainers.set(id, sprite as unknown as Phaser.GameObjects.Container);
    });
    this.entityRenderer.applyOcclusion(playerContainers, chunkTiles);
  }

  // ── Entity Lifecycle ──────────────────────────────────────────────────

  spawnEntity(entity: Entity, zoneId?: string): void {
    if (this.entitySprites.has(entity.id) || !this.entityRenderer) return;

    if (!this.isEntityVisible(entity.position)) {
      return;
    }

    const elevation = this.worldAccessor.getTileElevation(entity.position.x, entity.position.y, entity.position.zoneId);
    const container = this.entityRenderer.createEntityContainer(entity, elevation);

    container.setData('position', { ...entity.position });

    if (entity.type === 'npc' && 'npcId' in entity) {
      container.setData('npcId', (entity as Npc).npcId);
    }

    this.entitySprites.set(entity.id, container);

    const isRespawnEvent = !zoneId;
    if (isRespawnEvent) {
      container.setAlpha(0);
      this.scene.tweens.add({
        targets: container,
        alpha: 1,
        duration: 400,
        ease: 'Linear',
      });
    }

    if (zoneId) {
      if (!this.entityZoneMap.has(zoneId)) {
        this.entityZoneMap.set(zoneId, new Set());
      }
      this.entityZoneMap.get(zoneId)!.add(entity.id);
    }

    if (this.depthSorter) {
      this.depthSorter.markDirty(entity.id);
    }
  }

  despawnEntity(entityId: string): void {
    if (this.targetHighlight?.isHighlighting(entityId)) {
      this.targetHighlight.hide(true);
    }

    const container = this.entitySprites.get(entityId);
    if (container) {
      this.entityRenderer?.cleanupFrenzyEffect(entityId);

      container.each((child: Phaser.GameObjects.GameObject) => {
        child.destroy();
      });
      container.removeAll(true);
      container.destroy();
      this.entitySprites.delete(entityId);

      const orphaned = this.entityZoneMap.get('_orphaned');
      if (orphaned) {
        orphaned.delete(entityId);
      }
    }
  }

  cleanupOrphanedEntities(): void {
    const orphaned = this.entityZoneMap.get('_orphaned');
    if (!orphaned || orphaned.size === 0) return;

    const toRemove: string[] = [];
    orphaned.forEach(entityId => {
      const container = this.entitySprites.get(entityId);
      if (!container) {
        toRemove.push(entityId);
        return;
      }

      const position = container.getData('position') as { x: number; y: number; zoneId: string } | undefined;
      if (!position || !this.isEntityVisible(position)) {
        this.despawnEntity(entityId);
        toRemove.push(entityId);
      }
    });

    toRemove.forEach(id => orphaned.delete(id));
  }

  despawnEntitiesForZone(zoneId: string): void {
    const entityIds = this.entityZoneMap.get(zoneId);
    if (entityIds) {
      entityIds.forEach(entityId => {
        const container = this.entitySprites.get(entityId);
        if (!container) {
          return;
        }

        const position = container.getData('position') as { x: number; y: number; zoneId: string } | undefined;
        if (position && this.isEntityVisible(position)) {
          if (!this.entityZoneMap.has('_orphaned')) {
            this.entityZoneMap.set('_orphaned', new Set());
          }
          this.entityZoneMap.get('_orphaned')!.add(entityId);
        } else {
          this.despawnEntity(entityId);
        }
      });
      this.entityZoneMap.delete(zoneId);
    }
  }

  clearEntities(): void {
    this.entitySprites.forEach((container) => {
      container.each((child: Phaser.GameObjects.GameObject) => {
        child.destroy();
      });
      container.removeAll(true);
      container.destroy();
    });
    this.entitySprites.clear();
    this.entityZoneMap.clear();
  }

  clearOtherPlayers(): void {
    this.playerSprites.forEach((sprite) => sprite.destroy());
    this.playerSprites.clear();
  }

  updateEntity(entityId: string, changes: Partial<Entity>): void {
    const container = this.entitySprites.get(entityId);
    const isoTransform = this.worldAccessor.getIsoTransform();
    if (!container || !isoTransform || !this.entityRenderer) return;

    if ('active' in changes && changes.active === false) {
      this.despawnEntity(entityId);
      return;
    }

    if (changes.position) {
      if (!this.isEntityVisible(changes.position)) {
        this.despawnEntity(entityId);
        return;
      }

      container.setData('position', { ...changes.position });

      const elevation = this.worldAccessor.getTileElevation(changes.position.x, changes.position.y, changes.position.zoneId);
      const elevationOffset = elevation * 128;
      const { worldX, worldY } = this.positionToWorldCoords(changes.position);
      const screenPos = isoTransform.gridToScreen(worldX, worldY);

      // Calculate movement direction for facing
      const oldX = container.getData('gridX') as number;
      const oldY = container.getData('gridY') as number;
      const dx = worldX - oldX;
      const dy = worldY - oldY;
      const newFacing = this.calculateFacingDirection(dx, dy);

      // Get entity sprite for animation
      const entitySprite = container.getData('entitySprite') as Phaser.GameObjects.Sprite | undefined;
      const speciesId = container.getData('speciesId') as string | undefined;
      const currentFacing = container.getData('facing') as Direction || 's';

      // Update facing and start animation (creatures only)
      if (entitySprite && speciesId && newFacing) {
        container.setData('facing', newFacing);
        const isMoving = container.getData('isMoving') as boolean;

        if (!isMoving || newFacing !== currentFacing) {
          const animKey = `${speciesId}-run-${newFacing}`;
          if (entitySprite.anims.exists(animKey)) {
            entitySprite.play(animKey);
          }
          container.setData('isMoving', true);
        }
      }

      if (this.depthSorter) {
        this.depthSorter.markDirty(entityId);
      }

      this.scene.tweens.killTweensOf(container);
      this.scene.tweens.add({
        targets: container,
        x: screenPos.x,
        y: screenPos.y - elevationOffset + ENTITY_GROUND_OFFSET,
        duration: 200,
        ease: 'Linear',
        onComplete: () => {
          container.setData('gridX', worldX);
          container.setData('gridY', worldY);
          container.setData('elevation', elevation);

          const depth = isoTransform.calculateDepth(worldX, worldY, elevation, 0, false);
          container.setDepth(depth);

          // Stop walk animation for creatures
          if (speciesId && entitySprite) {
            const facing = container.getData('facing') as Direction || 's';
            entitySprite.stop();
            entitySprite.setTexture(`${speciesId}-idle-${facing}`);
          }
        },
      });
    }

    // Update health bar if health changed for creatures
    if ('health' in changes && this.entityRenderer) {
      const oldHealthBar = container.getData('healthBar') as Phaser.GameObjects.Container | undefined;
      if (oldHealthBar) {
        oldHealthBar.destroy();
        container.setData('healthBar', null);
      }

      const creatureChanges = changes as Partial<Creature>;
      if (creatureChanges.health !== undefined && creatureChanges.maxHealth !== undefined) {
        if (creatureChanges.health < creatureChanges.maxHealth) {
          const actualSpriteHeight = (container.getData('actualSpriteHeight') as number) ?? 256 * ((container.getData('entityScale') as number) ?? 2.5);
          const uiBaseY = -actualSpriteHeight - 20;

          const eId = container.getData('entityId') as string;
          const entity = eId ? useEntityStore.getState().entities.get(eId) : null;
          const creature = entity as Creature | null;

          const healthBar = this.entityRenderer.createHealthBarWithName(
            creature?.name ?? '???',
            creatureChanges.health,
            creatureChanges.maxHealth,
            creature?.behavior,
            false
          );
          healthBar.y = uiBaseY;
          container.add(healthBar);
          container.setData('healthBar', healthBar);
        }
      }
    }

    // Update yield bar if yield changed for minerals/plants (UIHD-03)
    if ('yield' in changes && this.entityRenderer) {
      const yieldValue = (changes as { yield: number }).yield;
      const maxYield = container.getData('maxYield') as number | undefined;
      const actualSpriteHeight = (container.getData('actualSpriteHeight') as number) ?? 256 * ((container.getData('entityScale') as number) ?? 2.5);

      if (maxYield !== undefined) {
        const oldYieldBar = container.getData('yieldBar') as Phaser.GameObjects.Graphics | undefined;
        if (oldYieldBar) {
          oldYieldBar.destroy();
        }

        const newYieldBar = this.entityRenderer.createHealthBar(yieldValue, maxYield);
        newYieldBar.y = -actualSpriteHeight - 20;
        container.add(newYieldBar);
        container.setData('yieldBar', newYieldBar);
      }
    }

    // CRAI-06: Update frenzy visual state on creatures
    if ('frenzied' in changes && this.entityRenderer) {
      this.entityRenderer.applyFrenzyEffect(container, entityId, !!(changes as Partial<Creature>).frenzied);
    }

    // CRAI-06: Update stealth visibility on creatures
    if ('stealthed' in changes && this.entityRenderer) {
      const stealthed = (changes as Partial<Creature>).stealthed;
      if (stealthed === false && container.getData('stealthed')) {
        this.entityRenderer.applyStealthReveal(container);
      } else if (stealthed) {
        container.setAlpha(0);
        container.setData('stealthed', true);
      }
    }
  }

  // ── Player Lifecycle ──────────────────────────────────────────────────

  addPlayer(player: PlayerPublic): void {
    const isoTransform = this.worldAccessor.getIsoTransform();
    if (this.playerSprites.has(player.id) || !isoTransform) return;

    const elevation = this.worldAccessor.getTileElevation(player.position.x, player.position.y, player.position.zoneId);
    const elevationOffset = elevation * 128;
    const { worldX, worldY } = this.positionToWorldCoords(player.position);
    const screenPos = isoTransform.gridToScreen(worldX, worldY);

    const container = this.scene.add.container(screenPos.x, screenPos.y - elevationOffset + ENTITY_GROUND_OFFSET);
    container.setData('gridX', worldX);
    container.setData('gridY', worldY);
    container.setData('elevation', elevation);

    const tileHH = isoTransform.tileHeight / 2;
    const shadow = this.scene.add.ellipse(0, tileHH, 120, 60, 0x000000, 0.3);
    container.add(shadow);

    const sprite = this.scene.add.sprite(0, tileHH, 'character-idle-s');
    sprite.setOrigin(0.5, 1.0);
    sprite.setScale(6, 4.5);
    sprite.setTint(this.getFactionColor(player.faction));
    container.add(sprite);
    container.setData('characterSprite', sprite);
    container.setData('isMoving', false);
    container.setData('facing', 's');

    const depth = isoTransform.calculateDepth(worldX, worldY, elevation, 0, true);
    container.setDepth(depth);

    this.playerSprites.set(player.id, container as unknown as Phaser.GameObjects.Sprite);
  }

  removePlayer(playerId: string): void {
    const sprite = this.playerSprites.get(playerId);
    if (sprite) {
      sprite.destroy();
      this.playerSprites.delete(playerId);
    }
  }

  movePlayer(playerId: string, position: Position): void {
    const container = this.playerSprites.get(playerId);
    const isoTransform = this.worldAccessor.getIsoTransform();
    if (!container || !isoTransform) return;

    const elevation = this.worldAccessor.getTileElevation(position.x, position.y, position.zoneId);
    const elevationOffset = elevation * 128;
    const { worldX, worldY } = this.positionToWorldCoords(position);
    const screenPos = isoTransform.gridToScreen(worldX, worldY);

    const oldX = container.getData('gridX') as number;
    const oldY = container.getData('gridY') as number;
    const dx = worldX - oldX;
    const dy = worldY - oldY;
    const newFacing = this.calculateFacingDirection(dx, dy);

    const characterSprite = container.getData('characterSprite') as Phaser.GameObjects.Sprite | undefined;
    const currentFacing = container.getData('facing') as Direction || 's';

    if (characterSprite && newFacing) {
      container.setData('facing', newFacing);
      const isMoving = container.getData('isMoving') as boolean;

      if (!isMoving || newFacing !== currentFacing) {
        characterSprite.play(`character-run-${newFacing}`);
        container.setData('isMoving', true);
      }
    }

    if (this.depthSorter) {
      this.depthSorter.markDirty(playerId);
    }

    this.scene.tweens.killTweensOf(container);
    this.scene.tweens.add({
      targets: container,
      x: screenPos.x,
      y: screenPos.y - elevationOffset + ENTITY_GROUND_OFFSET,
      duration: 100,
      ease: 'Linear',
      onComplete: () => {
        container.setData('gridX', worldX);
        container.setData('gridY', worldY);
        container.setData('elevation', elevation);
        const depth = isoTransform.calculateDepth(worldX, worldY, elevation, 0, true);
        container.setDepth(depth);

        if (characterSprite) {
          characterSprite.stop();
          const facing = container.getData('facing') as Direction || 's';
          characterSprite.setTexture(`character-idle-${facing}`);
          container.setData('isMoving', false);
        }
      }
    });
  }

  // ── Local Player ──────────────────────────────────────────────────────

  createLocalPlayer(position: Position): void {
    const isoTransform = this.worldAccessor.getIsoTransform();
    if (!isoTransform) return;

    // Initialize fog system once we have player data
    const player = useGameStore.getState().player;
    if (player?.id) {
      this.initializeFog(player.id);
    }

    const elevation = this.worldAccessor.getTileElevation(position.x, position.y, position.zoneId);
    const elevationOffset = elevation * 128;
    const { worldX, worldY } = this.positionToWorldCoords(position);
    const screenPos = isoTransform.gridToScreen(worldX, worldY);

    const container = this.scene.add.container(screenPos.x, screenPos.y - elevationOffset + ENTITY_GROUND_OFFSET);
    container.setData('gridX', worldX);
    container.setData('gridY', worldY);
    container.setData('elevation', elevation);

    const tileHH = isoTransform.tileHeight / 2;
    const shadow = this.scene.add.ellipse(0, tileHH, 120, 60, 0x000000, 0.3);
    container.add(shadow);

    const sprite = this.scene.add.sprite(0, tileHH, `character-idle-${this.localPlayerFacing}`);
    sprite.setOrigin(0.5, 1.0);
    sprite.setScale(6, 4.5);
    container.add(sprite);
    container.setData('characterSprite', sprite);
    container.setData('isMoving', false);

    this.localPlayer = container as unknown as Phaser.GameObjects.Sprite;

    const depth = isoTransform.calculateDepth(worldX, worldY, elevation, 0.1, true);
    container.setDepth(depth);

    if (this.depthSorter) {
      this.depthSorter.setLocalPlayer('local');
    }
  }

  updateLocalPlayerSprite(position: Position): void {
    const isoTransform = this.worldAccessor.getIsoTransform();
    if (!this.localPlayer || !isoTransform) return;

    const elevation = this.worldAccessor.getTileElevation(position.x, position.y, position.zoneId);
    const elevationOffset = elevation * 128;
    const { worldX, worldY } = this.positionToWorldCoords(position);
    const screenPos = isoTransform.gridToScreen(worldX, worldY);
    const targetY = screenPos.y - elevationOffset + ENTITY_GROUND_OFFSET;

    this.localPlayer.setPosition(screenPos.x, targetY);

    this.localPlayer.setData('gridX', worldX);
    this.localPlayer.setData('gridY', worldY);
    this.localPlayer.setData('elevation', elevation);

    const depth = isoTransform.calculateDepth(worldX, worldY, elevation, 0.1, true);
    this.localPlayer.setDepth(depth);

    // Reveal fog at new position
    if (this.fogManager && this.fogRenderer) {
      let tileId: string | undefined;
      const currentTiles = this.worldAccessor.getCurrentTiles();
      if (currentTiles && position.y < currentTiles.length && position.x < currentTiles[0]?.length) {
        const tileNumericId = currentTiles[position.y]?.[position.x];
        if (tileNumericId !== undefined) {
          tileId = tileIdToString(tileNumericId as TileId);
        }
      }
      const intWorldX = Math.floor(worldX);
      const intWorldY = Math.floor(worldY);
      const newlyRevealed = this.fogManager.revealAtPosition(intWorldX, intWorldY, this.worldAccessor.getCurrentBiome(), tileId);
      if (newlyRevealed.size > 0) {
        this.fogRenderer.revealTiles(newlyRevealed);
      }
    }

    // Check for POI discovery
    const intWorldX = Math.floor(worldX);
    const intWorldY = Math.floor(worldY);
    if (this.poiRenderer && this.fogManager?.isRevealed(intWorldX, intWorldY)) {
      const poiId = this.poiRenderer.checkPlayerOnPoi(intWorldX, intWorldY);
      if (poiId && !this.discoveredPoiIds.has(poiId)) {
        gameSocket.emit('poi:discover', { poiId, worldX: intWorldX, worldY: intWorldY });
      }
    }
  }

  updateLocalPlayerFromPixels(px: number, py: number): void {
    const isoTransform = this.worldAccessor.getIsoTransform();
    if (!this.localPlayer || !isoTransform) return;

    const gridX = px / TILE_SIZE_PX;
    const gridY = py / TILE_SIZE_PX;

    const zoneCoords = this.worldAccessor.parseZoneCoords(this.worldAccessor.getCurrentZoneId());
    const worldX = zoneCoords.x * ZONE_SIZE + gridX;
    const worldY = zoneCoords.y * ZONE_SIZE + gridY;

    const tileX = Math.floor(gridX);
    const tileY = Math.floor(gridY);

    const elevation = this.worldAccessor.getInterpolatedElevation(gridX, gridY);
    const elevationOffset = elevation * 128;

    const screenPos = isoTransform.gridToScreen(worldX, worldY);

    this.localPlayer.setPosition(screenPos.x, screenPos.y - elevationOffset + ENTITY_GROUND_OFFSET);

    const elevationRounded = Math.round(elevation);
    this.localPlayer.setData('gridX', worldX);
    this.localPlayer.setData('gridY', worldY);
    this.localPlayer.setData('elevation', elevationRounded);

    const depth = isoTransform.calculateDepth(worldX, worldY, elevationRounded, 0.1, true);
    this.localPlayer.setDepth(depth);

    if (this.depthSorter) {
      this.depthSorter.markDirty('local');
    }

    // Fog reveal at tile position
    const intWorldX = Math.floor(worldX);
    const intWorldY = Math.floor(worldY);
    if (this.fogManager && this.fogRenderer) {
      let tileId: string | undefined;
      const currentTiles = this.worldAccessor.getCurrentTiles();
      if (currentTiles && tileY < currentTiles.length && tileX < (currentTiles[0]?.length ?? 0)) {
        const tileNumericId = currentTiles[tileY]?.[tileX];
        if (tileNumericId !== undefined) {
          tileId = tileIdToString(tileNumericId as TileId);
        }
      }
      const newlyRevealed = this.fogManager.revealAtPosition(intWorldX, intWorldY, this.worldAccessor.getCurrentBiome(), tileId);
      if (newlyRevealed.size > 0) {
        this.fogRenderer.revealTiles(newlyRevealed);
      }
    }

    // POI discovery
    if (this.poiRenderer && this.fogManager?.isRevealed(intWorldX, intWorldY)) {
      const poiId = this.poiRenderer.checkPlayerOnPoi(intWorldX, intWorldY);
      if (poiId && !this.discoveredPoiIds.has(poiId)) {
        gameSocket.emit('poi:discover', { poiId, worldX: intWorldX, worldY: intWorldY });
      }
    }
  }

  updateLocalPlayerDirection(direction: Direction): void {
    if (this.localPlayerFacing === direction) return;
    this.localPlayerFacing = direction;

    const sprite = this.localPlayer?.getData('characterSprite') as Phaser.GameObjects.Sprite | undefined;
    if (!sprite) return;

    const isMoving = this.localPlayer?.getData('isMoving') as boolean;
    if (isMoving) {
      sprite.play(`character-run-${direction}`);
    } else {
      sprite.setTexture(`character-idle-${direction}`);
    }
  }

  startPlayerAnimation(direction: Direction): void {
    const sprite = this.localPlayer?.getData('characterSprite') as Phaser.GameObjects.Sprite | undefined;
    if (!sprite) return;

    const animKey = `character-run-${direction}`;
    if (!sprite.anims.isPlaying || sprite.anims.currentAnim?.key !== animKey) {
      sprite.play(animKey);
    }
    this.localPlayer?.setData('isMoving', true);
  }

  stopPlayerAnimation(): void {
    const sprite = this.localPlayer?.getData('characterSprite') as Phaser.GameObjects.Sprite | undefined;
    if (!sprite) return;

    sprite.stop();
    sprite.setTexture(`character-idle-${this.localPlayerFacing}`);
    this.localPlayer?.setData('isMoving', false);
  }

  // ── Damage / Death / Respawn ──────────────────────────────────────────

  showDamageNumber(
    defenderId: string,
    damage: number,
    isLocalPlayer: boolean,
    fallbackPosition?: { x: number; y: number },
    damageType?: import('@into-the-void/shared-types').DamageType,
  ): void {
    let targetX: number;
    let targetY: number;

    if (isLocalPlayer && this.localPlayer) {
      targetX = this.localPlayer.x;
      targetY = this.localPlayer.y;
    } else {
      const container = this.entitySprites.get(defenderId);
      if (container) {
        targetX = container.x;
        targetY = container.y;
      } else {
        const playerSprite = this.playerSprites.get(defenderId);
        if (playerSprite) {
          targetX = playerSprite.x;
          targetY = playerSprite.y;
        } else if (fallbackPosition && this.worldAccessor.getIsoTransform()) {
          const player = useGameStore.getState().player;
          if (player) {
            const worldX = fallbackPosition.x - player.position.x;
            const worldY = fallbackPosition.y - player.position.y;
            const screenPos = this.worldAccessor.getIsoTransform()!.gridToScreen(worldX, worldY);
            targetX = screenPos.x;
            targetY = screenPos.y;
          } else {
            return;
          }
        } else {
          return;
        }
      }
    }

    EntityRenderer.createFloatingDamage(this.scene, targetX, targetY, damage, isLocalPlayer, damageType);
  }

  handlePlayerDeath(): void {
    // Pixel movement stops naturally when keys are released
  }

  handlePlayerRespawn(position: Position): void {
    this.updateLocalPlayer(position);
  }

  updateLocalPlayer(position: Position): void {
    if (!this.localPlayer) {
      this.createLocalPlayer(position);
      return; // WorldScene handles camera follow after this returns
    }
    this.updateLocalPlayerSprite(position);
  }

  handlePositionCorrection(serverPx: number, serverPy: number, sequence: number): void {
    const pixelMovement = this.worldAccessor.getPixelMovement();
    if (!pixelMovement) return;
    const result = pixelMovement.reconcile(serverPx, serverPy, sequence);
    if (result.corrected) {
      this.updateLocalPlayerFromPixels(result.px, result.py);
    }
  }

  // ── Remote Player Interpolation ───────────────────────────────────────

  private updateRemotePlayerInterpolation(): void {
    const isoTransform = this.worldAccessor.getIsoTransform();
    if (!this.remoteInterpolator || !isoTransform) return;

    const now = Date.now();

    this.playerSprites.forEach((container, playerId) => {
      const interp = this.remoteInterpolator!.getInterpolatedPosition(playerId, now);
      if (!interp) return;

      const gridX = interp.px / TILE_SIZE_PX;
      const gridY = interp.py / TILE_SIZE_PX;

      const zoneCoords = this.worldAccessor.parseZoneCoords(this.worldAccessor.getCurrentZoneId());
      const worldX = zoneCoords.x * ZONE_SIZE + gridX;
      const worldY = zoneCoords.y * ZONE_SIZE + gridY;

      const elevation = this.worldAccessor.getInterpolatedElevation(gridX, gridY);
      const elevationOffset = elevation * 128;

      const screenPos = isoTransform.gridToScreen(worldX, worldY);
      container.setPosition(screenPos.x, screenPos.y - elevationOffset + ENTITY_GROUND_OFFSET);

      const elevationRounded = Math.round(elevation);
      container.setData('gridX', worldX);
      container.setData('gridY', worldY);
      container.setData('elevation', elevationRounded);

      const depth = isoTransform.calculateDepth(worldX, worldY, elevationRounded, 0, true);
      container.setDepth(depth);

      if (this.depthSorter) {
        this.depthSorter.markDirty(playerId);
      }

      // Update animation based on movement
      const characterSprite = container.getData('characterSprite') as Phaser.GameObjects.Sprite | undefined;
      if (characterSprite && interp.direction) {
        const currentFacing = container.getData('facing') as Direction || 's';
        if (interp.direction !== currentFacing) {
          container.setData('facing', interp.direction);
        }
        const isMoving = container.getData('isMoving') as boolean;
        if (!isMoving) {
          characterSprite.play(`character-run-${interp.direction}`);
          container.setData('isMoving', true);
        }
      }

      // Check if interpolation stopped (idle)
      if (!interp.direction) {
        const isMoving = container.getData('isMoving') as boolean;
        if (isMoving) {
          const facing = container.getData('facing') as Direction || 's';
          if (characterSprite) {
            characterSprite.stop();
            characterSprite.setTexture(`character-idle-${facing}`);
          }
          container.setData('isMoving', false);
        }
      }
    });
  }

  // ── Utilities ─────────────────────────────────────────────────────────

  private positionToWorldCoords(position: Position): { worldX: number; worldY: number } {
    const zoneCoords = this.worldAccessor.parseZoneCoords(position.zoneId);
    return {
      worldX: zoneCoords.x * ZONE_SIZE + position.x,
      worldY: zoneCoords.y * ZONE_SIZE + position.y,
    };
  }

  private calculateWorldDistance(a: Position, b: Position): number {
    const worldA = this.positionToWorldCoords(a);
    const worldB = this.positionToWorldCoords(b);
    const dx = worldA.worldX - worldB.worldX;
    const dy = worldA.worldY - worldB.worldY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private isEntityVisible(entityPosition: Position): boolean {
    const player = useGameStore.getState().player;
    if (!player) return false;

    const distance = this.calculateWorldDistance(entityPosition, player.position);
    return distance <= VISIBILITY_RADIUS;
  }

  private calculateFacingDirection(dx: number, dy: number): Direction | null {
    if (dx === 0 && dy === 0) return null;
    if (dx > 0 && dy === 0) return 'e';
    if (dx < 0 && dy === 0) return 'w';
    if (dx === 0 && dy > 0) return 's';
    if (dx === 0 && dy < 0) return 'n';
    if (dx > 0 && dy > 0) return 'se';
    if (dx > 0 && dy < 0) return 'ne';
    if (dx < 0 && dy > 0) return 'sw';
    if (dx < 0 && dy < 0) return 'nw';
    return null;
  }

  private getFactionColor(faction: string): number {
    switch (faction) {
      case 'verdant': return 0x44cc44;
      case 'helix': return 0xff6b35;
      case 'nexus': return 0x00bfff;
      case 'neutral': return 0xa0a0a0;
      default: return 0x7b68ee;
    }
  }

  private getEntityTexture(type: string): string {
    switch (type) {
      case 'creature': return 'creature';
      case 'mineral': return 'mineral';
      case 'item': return 'item';
      default: return 'item';
    }
  }

  // ── Fog / POI ─────────────────────────────────────────────────────────

  private initializeFog(characterId: string): void {
    // Fog of war disabled - FogPersistence allocates too much memory (40B tiles)
    return;

    if (this.fogInitialized) return;
    this.fogManager = new FogManager(characterId);
    this.fogManager!.initialize();
    this.fogInitialized = true;

    if (this.fogRenderer && this.fogManager) {
      this.fogRenderer!.redrawFromState(this.fogManager!);
    }
  }

  // ── Quest Markers ─────────────────────────────────────────────────────

  private applyInitialQuestMarkers(
    markers: Array<{ npcId: string; markerType: 'available' | 'ready' | 'none' }>
  ): void {
    if (!this.entityRenderer) return;
    for (const marker of markers) {
      const npcContainer = this.findNpcContainerById(marker.npcId);
      if (npcContainer) {
        this.entityRenderer.updateQuestMarker(
          npcContainer.getData('entityId') as string,
          marker.markerType,
          npcContainer
        );
      }
    }
  }

  private updateNpcQuestMarker(data: {
    npcId: string;
    availableQuests?: Array<{ questId: string }>;
    activeQuests?: Array<{ questId: string }>;
    readyQuests?: Array<{ questId: string }>;
  }): void {
    if (!this.entityRenderer) return;
    const npcContainer = this.findNpcContainerById(data.npcId);
    if (!npcContainer) return;

    let markerType: 'available' | 'ready' | 'none' = 'none';
    if (data.readyQuests && data.readyQuests.length > 0) {
      markerType = 'ready';
    } else if (data.availableQuests && data.availableQuests.length > 0) {
      markerType = 'available';
    }

    this.entityRenderer.updateQuestMarker(
      npcContainer.getData('entityId') as string,
      markerType,
      npcContainer
    );
  }

  private findNpcContainerById(npcId: string): Phaser.GameObjects.Container | undefined {
    for (const [_entityId, container] of this.entitySprites) {
      if (container.getData('entityType') === 'npc') {
        const storedNpcId = container.getData('npcId');
        if (storedNpcId === npcId) {
          return container;
        }
      }
    }
    return undefined;
  }

  private handleQuestProgress = (data: { questId: string }): void => {
    this.updateMarkerForQuestId(data.questId);
  };

  private handleQuestCompleted = (data: { questId: string }): void => {
    this.updateMarkerForQuestId(data.questId);
  };

  private handleQuestAbandoned = (data: { questId: string }): void => {
    this.updateMarkerForQuestId(data.questId);
  };

  private updateMarkerForQuestId(questId: string): void {
    const questDef = QuestRegistry.get(questId);
    if (!questDef.questGiverId) return;
    const npcContainer = this.findNpcContainerById(questDef.questGiverId);
    if (!npcContainer) return;
    const markerType = this.computeMarkerTypeForNpc(questDef.questGiverId);
    this.entityRenderer?.updateQuestMarker(
      npcContainer.getData('entityId') as string,
      markerType,
      npcContainer
    );
  }

  private computeMarkerTypeForNpc(npcId: string): 'available' | 'ready' | 'none' {
    const questStore = useQuestStore.getState();
    const player = useGameStore.getState().player;
    if (!player) return 'none';

    for (const activeQuest of questStore.activeQuests) {
      const questDef = QuestRegistry.get(activeQuest.questId);
      if (questDef.questGiverId === npcId) {
        const allComplete = activeQuest.objectives.every(obj => obj.complete);
        if (allComplete) return 'ready';
      }
    }

    if (player.faction === 'neutral') return 'none';

    const allQuests = QuestRegistry.getByFaction(player.faction);
    const hasAvailable = allQuests.some(q => {
      if (q.questGiverId !== npcId) return false;
      const isActive = questStore.activeQuests.some(aq => aq.questId === q.id);
      if (isActive) return false;
      const completed = questStore.completedQuests.some(cq => cq.questId === q.id);
      if (completed && !q.isRepeatable) return false;
      if (q.prerequisiteQuestIds && q.prerequisiteQuestIds.length > 0) {
        const metPrereqs = q.prerequisiteQuestIds.every(prereqId =>
          questStore.completedQuests.some(cq => cq.questId === prereqId)
        );
        if (!metPrereqs) return false;
      }
      return true;
    });

    if (hasAvailable) return 'available';
    return 'none';
  }

  // ── Rare Node Markers ─────────────────────────────────────────────────

  refreshRareNodeMarkers(): void {
    this.rareNodeMarkers.forEach((marker) => marker.destroy());
    this.rareNodeMarkers.clear();

    const discoveries = useGameStore.getState().discoveredResources;
    const currentZone = useGameStore.getState().zoneState;
    if (!currentZone) return;

    for (const resource of discoveries) {
      if (resource.zoneId !== currentZone.zoneId) continue;
      this.addRareNodeMarker(resource);
    }
  }

  private addRareNodeMarker(resource: DiscoveredResource): void {
    if (this.rareNodeMarkers.has(resource.entityId)) return;
    const isoTransform = this.worldAccessor.getIsoTransform();
    if (!isoTransform) return;

    const screenPos = isoTransform.gridToScreen(resource.worldX, resource.worldY);
    const marker = createRareNodeMarker(this.scene, screenPos.x, screenPos.y - 300, resource.rarity);
    this.rareNodeMarkers.set(resource.entityId, marker);
  }

  private removeRareNodeMarker(entityId: string): void {
    const marker = this.rareNodeMarkers.get(entityId);
    if (marker) {
      marker.destroy();
      this.rareNodeMarkers.delete(entityId);
    }
  }

  // ── Getters ───────────────────────────────────────────────────────────

  getLocalPlayer(): Phaser.GameObjects.Sprite | null { return this.localPlayer; }
  getLocalPlayerFacing(): Direction { return this.localPlayerFacing; }
  setLocalPlayerFacing(dir: Direction): void { this.localPlayerFacing = dir; }
  getLastMovementTime(): number { return this.lastMovementTime; }
  setLastMovementTime(time: number): void { this.lastMovementTime = time; }
  getEntitySprites(): Map<string, Phaser.GameObjects.Container> { return this.entitySprites; }
  getTargetHighlight(): TargetHighlight | null { return this.targetHighlight; }
  getRemoteInterpolator(): RemotePlayerInterpolator | null { return this.remoteInterpolator; }
  getEntityRenderer(): EntityRenderer | null { return this.entityRenderer; }
  getDepthSorter(): DepthSorter | null { return this.depthSorter; }
  getFogManager(): FogManager | null { return this.fogManager; }
  getFogRenderer(): FogRenderer | null { return this.fogRenderer; }
  getPoiRenderer(): PoiRenderer | null { return this.poiRenderer; }
  getDiscoveredPoiIds(): Set<string> { return this.discoveredPoiIds; }

  /**
   * Gathering challenge stub (backwards compatibility).
   */
  handleGatheringChallenge(_challenge: any): void {
    // Gathering now auto-completes on server, no mini-game needed
  }

  // ── Cleanup ───────────────────────────────────────────────────────────

  destroy(): void {
    gameSocket.off('quest:progress', this.handleQuestProgress);
    gameSocket.off('quest:completed', this.handleQuestCompleted);
    gameSocket.off('quest:abandoned', this.handleQuestAbandoned);

    this.rareNodeMarkers.forEach((marker) => marker.destroy());
    this.rareNodeMarkers.clear();

    if (this.targetHighlight) {
      this.targetHighlight.destroy();
      this.targetHighlight = null;
    }
    if (this.depthSorter) {
      this.depthSorter.clear();
      this.depthSorter = null;
    }
    if (this.entityRenderer) {
      this.entityRenderer.destroyStampedeListener();
      this.entityRenderer = null;
    }

    if (this.fogManager) {
      this.fogManager.flush();
      this.fogManager = null;
    }
    if (this.fogRenderer) {
      this.fogRenderer.destroy();
      this.fogRenderer = null;
    }
    this.fogInitialized = false;

    if (this.poiRenderer) {
      this.poiRenderer.destroy();
      this.poiRenderer = null;
    }
    this.discoveredPoiIds.clear();
  }
}
