import Phaser from 'phaser';
import { ZONE_SIZE, Position, Entity, PlayerPublic, ChunkData, BiomeType, Direction, Creature, TileStructure } from '@into-the-void/shared-types';
import { TileId } from '@into-the-void/world-gen';
import { TileRenderer } from '../rendering/TileRenderer';
import { EntityRenderer } from '../rendering/EntityRenderer';
import { ChunkManager } from '../rendering/ChunkManager';
import { ViewportCuller } from '../rendering/ViewportCuller';
import { ZoneHUD } from '../ui/ZoneHUD';
import { MinimapCamera } from '../rendering/MinimapCamera';
import { MovementController } from '../systems/MovementController';
import { PathfindingController } from '../systems/PathfindingController';
import { HoverController } from '../systems/HoverController';
import { IsometricTransform } from '../utils/IsometricTransform';
import { DepthSorter } from '../rendering/DepthSorter';

export const ISO_TILE_WIDTH = 128;
export const ISO_TILE_HEIGHT = 64;

export class WorldScene extends Phaser.Scene {
  private tileLayer: Phaser.GameObjects.Container | null = null;
  private tileRenderer: TileRenderer | null = null;
  private entityRenderer: EntityRenderer | null = null;
  private tileSprites: Phaser.GameObjects.GameObject[][] = [];
  private entitySprites: Map<string, Phaser.GameObjects.Container> = new Map();
  private playerSprites: Map<string, Phaser.GameObjects.Sprite> = new Map();
  private localPlayer: Phaser.GameObjects.Sprite | null = null;
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys | null = null;
  private wasd: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key } | null = null;
  private moveDelay = 150; // ms between moves
  private lastMoveTime = 0;
  private chunkManager: ChunkManager | null = null;
  private chunkContainers: Map<string, Phaser.GameObjects.Container> = new Map();
  private currentZoneId: string = 'z_0_0';
  private onChunkRequest: ((zoneId: string) => void) | null = null;
  private viewportCuller: ViewportCuller | null = null;
  private zoneHUD: ZoneHUD | null = null;
  private currentBiome: BiomeType = 'void_plains';
  private lastCullBounds: { minTileX: number; maxTileX: number; minTileY: number; maxTileY: number } | null = null;
  private movementController: MovementController | null = null;
  private pathfindingController: PathfindingController | null = null;
  private hoverController: HoverController | null = null;
  private collisionMap: boolean[][] | null = null;
  private minimapCamera: MinimapCamera | null = null;
  private isoTransform: IsometricTransform | null = null;
  private depthSorter: DepthSorter | null = null;
  private currentHeights: number[][] | null = null;
  private currentStructures: TileStructure[] = [];

  constructor() {
    super({ key: 'WorldScene' });
  }

  create(): void {
    // Create tile container
    this.tileLayer = this.add.container(0, 0);

    // Initialize IsometricTransform
    this.isoTransform = new IsometricTransform(ISO_TILE_WIDTH, ISO_TILE_HEIGHT);

    // Initialize DepthSorter
    this.depthSorter = new DepthSorter();

    // Initialize TileRenderer with isometric dimensions
    this.tileRenderer = new TileRenderer(this, ISO_TILE_WIDTH, ISO_TILE_HEIGHT);

    // Initialize EntityRenderer with isometric dimensions
    this.entityRenderer = new EntityRenderer(this, ISO_TILE_WIDTH, ISO_TILE_HEIGHT);

    // Initialize ViewportCuller with isometric dimensions and expanded padding
    this.viewportCuller = new ViewportCuller(ISO_TILE_WIDTH, ISO_TILE_HEIGHT, 4);

    // Initialize ZoneHUD
    this.zoneHUD = new ZoneHUD(this);

    // Initialize MinimapCamera
    this.minimapCamera = new MinimapCamera(this);
    this.minimapCamera.create();

    // Make minimap camera ignore ZoneHUD elements (they have scrollFactor 0)
    if (this.zoneHUD) {
      this.minimapCamera.ignore(this.zoneHUD.getGameObjects());
    }

    // Initialize MovementController
    this.movementController = new MovementController();
    this.movementController.setPositionUpdateHandler((position, reconciling) => {
      this.updateLocalPlayerSprite(position, reconciling);
    });

    // Initialize PathfindingController with scene and isoTransform for path visualization
    this.pathfindingController = new PathfindingController(
      this.movementController,
      this.moveDelay,
      this,
      this.isoTransform!
    );

    // Initialize HoverController for visual polish
    this.hoverController = new HoverController(this, this.isoTransform!, this.entitySprites);
    this.hoverController.setPathfindingActiveCallback(() => this.pathfindingController?.isPathActive() ?? false);

    // Initialize ChunkManager
    this.chunkManager = new ChunkManager(
      // onChunkNeeded
      (zoneId: string) => {
        if (this.onChunkRequest) {
          this.onChunkRequest(zoneId);
        }
      },
      // onChunkLoaded
      (chunkData: ChunkData, biome: BiomeType) => {
        this.renderChunk(chunkData, biome);
      },
      // onChunkUnloaded
      (zoneId: string) => {
        this.unloadChunkContainer(zoneId);
      }
    );

    // Setup input
    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.wasd = {
        W: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        A: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        S: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
        D: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      };
    }

    // Tiles and player will be loaded via loadZoneFromState() when zone:state event arrives

    // Cancel pathfinding when game loses focus (prevents timer issues)
    this.game.events.on('blur', () => {
      if (this.pathfindingController?.isPathActive()) {
        this.pathfindingController.cancelPath();
      }
      this.hoverController?.clearHighlights();
    });

    // Set fixed zoom to show ~15x11 tiles viewport
    this.cameras.main.setZoom(1.5);

    // Disable scroll zoom to maintain fixed viewport
    // (uncomment below to allow limited zoom adjustment)
    // this.input.on('wheel', (
    //   _pointer: Phaser.Input.Pointer,
    //   _gameObjects: Phaser.GameObjects.GameObject[],
    //   _deltaX: number,
    //   deltaY: number
    // ) => {
    //   const zoom = this.cameras.main.zoom;
    //   const newZoom = Phaser.Math.Clamp(zoom - deltaY * 0.001, 1.0, 2.0);
    //   this.cameras.main.setZoom(newZoom);
    // });

    // Click-to-move handler
    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      // Only handle left click for movement
      if (pointer.rightButtonDown()) return;

      if (!this.isoTransform) return;

      // Convert screen position to world position
      const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);

      // Convert to tile coordinates using elevation-aware transform
      const gridPos = this.isoTransform.screenToTileWithElevation(
        worldPoint.x,
        worldPoint.y,
        (x, y) => this.getTileElevation(x, y)
      );

      // Show click marker for visual feedback
      if (this.hoverController) {
        this.hoverController.showClickMarker(gridPos.x, gridPos.y);
      }

      // Start pathfinding if we have collision map
      if (this.pathfindingController && this.collisionMap) {
        this.pathfindingController.startPath(gridPos.x, gridPos.y, this.collisionMap);
      }
    });
  }

  private generatePlaceholderWorld(): void {
    if (!this.tileLayer || !this.entityRenderer || !this.isoTransform) return;

    // Generate a simple placeholder grid (no longer used - kept for compatibility)
    // Tiles are now rendered via TileRenderer in renderChunk()

    // Add some test entities using EntityRenderer
    for (let i = 0; i < 10; i++) {
      const x = Phaser.Math.Between(5, ZONE_SIZE - 5);
      const y = Phaser.Math.Between(5, ZONE_SIZE - 5);
      const type = Math.random() > 0.5 ? 'creature' : 'mineral';
      const testEntity: Entity = {
        id: `test_${type}_${i}`,
        type: type as 'creature' | 'mineral',
        position: { x, y, zoneId: this.currentZoneId },
        name: `Test ${type}`,
        active: true
      };
      const container = this.entityRenderer.createEntityContainer(testEntity);
      this.entitySprites.set(testEntity.id, container);

      if (this.depthSorter) {
        this.depthSorter.markDirty(testEntity.id);
      }
    }
  }

  private createLocalPlayer(position: Position): void {
    if (!this.isoTransform) return;

    const elevation = this.getTileElevation(position.x, position.y);
    const elevationOffset = elevation * 16; // ELEVATION_HEIGHT_STEP
    const screenPos = this.isoTransform.gridToScreen(position.x, position.y);

    // Create container for player (same pattern as entities)
    const container = this.add.container(screenPos.x, screenPos.y - elevationOffset);
    container.setData('gridX', position.x);
    container.setData('gridY', position.y);
    container.setData('elevation', elevation);

    // Blob shadow
    const shadow = this.add.ellipse(0, 0, 40, 20, 0x000000, 0.3);
    container.add(shadow);

    // Player sprite elevated (texture is 2x resolution, scale down for crispness)
    const sprite = this.add.sprite(0, -12, 'player');
    sprite.setOrigin(0.5, 1.0);
    sprite.setScale(0.5);
    container.add(sprite);

    // Store reference (as container now, not sprite)
    this.localPlayer = container as unknown as Phaser.GameObjects.Sprite; // Type hack for compatibility

    // Set depth with local player priority
    const depth = this.isoTransform.calculateDepth(position.x, position.y, elevation + 0.001);
    container.setDepth(depth);

    if (this.depthSorter) {
      this.depthSorter.setLocalPlayer('local');
    }
  }

  private lastCullTime = 0;
  private cullInterval = 100; // Only check viewport culling every 100ms

  update(time: number): void {
    this.handleInput(time);

    // Throttled viewport culling
    if (time - this.lastCullTime >= this.cullInterval) {
      this.lastCullTime = time;
      this.updateVisibleTiles();
    }

    // Throttled depth sorting - include entities AND remote players
    if (this.depthSorter && this.isoTransform) {
      // Create combined map of all depth-sortable objects
      const allContainers = new Map<string, Phaser.GameObjects.Container>();

      // Add entities
      this.entitySprites.forEach((container, id) => {
        allContainers.set(id, container);
      });

      // Add remote players (use plain ID - matches markDirty call)
      this.playerSprites.forEach((sprite, id) => {
        allContainers.set(id, sprite as unknown as Phaser.GameObjects.Container);
      });

      this.depthSorter.update(time, allContainers, this.isoTransform);
    }

    // Update hover detection
    if (this.hoverController) {
      this.hoverController.update();
    }
  }

  private handleInput(time: number): void {
    if (!this.localPlayer || !this.movementController || time - this.lastMoveTime < this.moveDelay) return;

    let direction: Direction | null = null;

    // Screen-relative mapping for isometric view:
    // Visual "up" (W) = Northwest in grid
    // Visual "right" (D) = Northeast in grid
    // Visual "down" (S) = Southeast in grid
    // Visual "left" (A) = Southwest in grid
    if (this.cursors?.up.isDown || this.wasd?.W.isDown) direction = 'nw';
    else if (this.cursors?.right.isDown || this.wasd?.D.isDown) direction = 'ne';
    else if (this.cursors?.down.isDown || this.wasd?.S.isDown) direction = 'se';
    else if (this.cursors?.left.isDown || this.wasd?.A.isDown) direction = 'sw';

    if (direction) {
      // Cancel any active pathfinding when WASD is used
      if (this.pathfindingController?.isPathActive()) {
        this.pathfindingController.cancelPath();
      }

      this.lastMoveTime = time;
      this.movementController.processInput(direction);
    }
  }

  private updateVisibleTiles(): void {
    if (!this.viewportCuller || this.tileSprites.length === 0) return;

    const bounds = this.viewportCuller.getCullBounds(this.cameras.main);

    // Skip if bounds haven't changed (optimization)
    if (this.lastCullBounds &&
        this.lastCullBounds.minTileX === bounds.minTileX &&
        this.lastCullBounds.maxTileX === bounds.maxTileX &&
        this.lastCullBounds.minTileY === bounds.minTileY &&
        this.lastCullBounds.maxTileY === bounds.maxTileY) {
      return;
    }

    this.lastCullBounds = bounds;

    // Update tile visibility
    for (let y = 0; y < this.tileSprites.length; y++) {
      for (let x = 0; x < this.tileSprites[y].length; x++) {
        const tile = this.tileSprites[y][x] as Phaser.GameObjects.GameObject & { visible: boolean; setVisible: (value: boolean) => void };
        if (tile && 'visible' in tile && 'setVisible' in tile) {
          const isVisible = this.viewportCuller.isTileVisible(x, y, bounds);
          if (tile.visible !== isVisible) {
            tile.setVisible(isVisible);
          }
        }
      }
    }
  }

  // Methods to be called from network layer
  setChunkRequestHandler(handler: (zoneId: string) => void): void {
    this.onChunkRequest = handler;
  }

  loadZoneFromState(chunkData: ChunkData, biome: BiomeType): void {
    this.currentZoneId = chunkData.zoneId;

    // Receive initial chunk
    if (this.chunkManager) {
      this.chunkManager.receiveChunk(chunkData, biome);
      // Load adjacent chunks
      this.chunkManager.updateChunks(this.currentZoneId);
    }
  }

  receiveChunkData(chunkData: ChunkData, biome: BiomeType): void {
    if (this.chunkManager) {
      this.chunkManager.receiveChunk(chunkData, biome);
    }
  }

  onPlayerZoneChanged(newZoneId: string, biome: BiomeType): void {
    this.currentZoneId = newZoneId;

    if (this.chunkManager) {
      this.chunkManager.updateChunks(newZoneId);
    }
  }

  private parseZoneCoords(zoneId: string): { x: number; y: number } {
    const parts = zoneId.split('_');
    return {
      x: parseInt(parts[1], 10),
      y: parseInt(parts[2], 10),
    };
  }

  private getTileElevation(gridX: number, gridY: number): number {
    // Look up elevation from current zone's heights data
    // Default to 0 if heights not available or coordinates out of bounds
    return this.currentHeights?.[gridY]?.[gridX] ?? 0;
  }

  private renderChunk(chunkData: ChunkData, biome: BiomeType): void {
    if (!this.tileRenderer || !this.isoTransform) return;

    const { zoneId, tiles, heights, structures } = chunkData;

    // Guard: Don't recreate container if it already exists (prevents memory leak)
    if (this.chunkContainers.has(zoneId)) {
      return;
    }
    const { x: chunkX, y: chunkY } = this.parseZoneCoords(zoneId);

    // Calculate isometric world offset for this chunk
    // Chunk (0,0) starts at origin, chunk (1,0) offsets by ZONE_SIZE tiles in X
    const chunkGridX = chunkX * ZONE_SIZE;
    const chunkGridY = chunkY * ZONE_SIZE;
    const chunkOffset = this.isoTransform.gridToScreen(chunkGridX, chunkGridY);

    // Create container at chunk offset
    const container = this.add.container(chunkOffset.x, chunkOffset.y);

    // Create tiles relative to chunk origin (0,0 to ZONE_SIZE-1)
    for (let y = 0; y < ZONE_SIZE; y++) {
      for (let x = 0; x < ZONE_SIZE; x++) {
        const tileId = tiles[y][x] as TileId;
        const elevation = heights[y][x];
        const tile = this.tileRenderer.createTileWithElevation(x, y, tileId, elevation, heights);
        container.add(tile);
      }
    }

    // Render structure walls (uses same side-face rendering as terrain)
    for (const structure of structures) {
      if (structure.type === 'wall') {
        for (const wallTile of structure.tiles) {
          // Create a modified heights array for structure rendering
          // Structure height already includes base elevation, use as-is
          // Parse tileId string back to number (TileId enum is numeric)
          const tileId = parseInt(wallTile.tileId, 10) as TileId;
          const tile = this.tileRenderer.createTileWithElevation(
            wallTile.x,
            wallTile.y,
            tileId,
            wallTile.height,
            heights
          );
          tile.setData('isStructure', true);
          tile.setData('structureHeight', wallTile.height);
          container.add(tile);
        }
      }
    }

    this.chunkContainers.set(zoneId, container);

    if (zoneId === this.currentZoneId) {
      this.currentBiome = biome;
      this.currentHeights = heights;
      this.currentStructures = structures;
      if (this.zoneHUD) {
        this.zoneHUD.updateZone(zoneId, biome);
      }
      // Update minimap with structure markers
      if (this.minimapCamera && structures.length > 0) {
        this.minimapCamera.updateStructureMarkers(structures);
      }
    }
  }

  private unloadChunkContainer(zoneId: string): void {
    const container = this.chunkContainers.get(zoneId);
    if (container) {
      container.destroy(true);
      this.chunkContainers.delete(zoneId);
    }
  }

  loadZone(tiles: number[][], collisions: boolean[][]): void {
    if (!this.tileLayer || !this.tileRenderer) return;

    // Clear existing tiles
    this.tileLayer.removeAll(true);
    this.tileSprites = [];

    // Create new tiles
    for (let y = 0; y < tiles.length; y++) {
      this.tileSprites[y] = [];
      for (let x = 0; x < tiles[y].length; x++) {
        const tileId = tiles[y][x] as TileId;
        const tile = this.tileRenderer.createTile(x, y, tileId);
        this.tileLayer.add(tile);
        this.tileSprites[y][x] = tile;
      }
    }
  }

  spawnEntity(entity: Entity): void {
    if (this.entitySprites.has(entity.id) || !this.entityRenderer) return;

    const elevation = this.getTileElevation(entity.position.x, entity.position.y);
    const container = this.entityRenderer.createEntityContainer(entity, elevation);
    this.entitySprites.set(entity.id, container);

    if (this.depthSorter) {
      this.depthSorter.markDirty(entity.id);
    }
  }

  despawnEntity(entityId: string): void {
    const container = this.entitySprites.get(entityId);
    if (container) {
      container.destroy(true); // Destroy children too
      this.entitySprites.delete(entityId);
    }
  }

  /**
   * Clear all entities (for zone transitions)
   */
  clearEntities(): void {
    this.entitySprites.forEach((container) => container.destroy(true));
    this.entitySprites.clear();
  }

  /**
   * Clear all other players (for zone transitions)
   */
  clearOtherPlayers(): void {
    this.playerSprites.forEach((sprite) => sprite.destroy());
    this.playerSprites.clear();
  }

  updateEntity(entityId: string, changes: Partial<Entity>): void {
    const container = this.entitySprites.get(entityId);
    if (!container || !this.isoTransform || !this.entityRenderer) return;

    // Update position
    if (changes.position) {
      const elevation = this.getTileElevation(changes.position.x, changes.position.y);
      this.entityRenderer.updateEntityPosition(container, changes.position.x, changes.position.y, elevation);

      if (this.depthSorter) {
        this.depthSorter.markDirty(entityId);
      }
    }

    // Update health bar if health changed for creatures
    if ('health' in changes && this.entityRenderer) {
      // Find and destroy old health bar (Graphics object at y = -20)
      const oldHealthBar = container.list.find(
        (child) => child instanceof Phaser.GameObjects.Graphics && child.y === -20
      );
      if (oldHealthBar) {
        oldHealthBar.destroy();
      }

      // Create new health bar if damaged (assuming we have access to entity data)
      // For now, we need the full entity to determine maxHealth
      // This is a limitation - we'll recreate health bar only if health is explicitly in changes
      // and we have both health and maxHealth in the changes
      const creatureChanges = changes as Partial<Creature>;
      if (creatureChanges.health !== undefined && creatureChanges.maxHealth !== undefined) {
        if (creatureChanges.health < creatureChanges.maxHealth) {
          const healthBar = this.entityRenderer.createHealthBar(
            creatureChanges.health,
            creatureChanges.maxHealth
          );
          healthBar.y = -20;
          container.add(healthBar);
        }
      }
    }
  }

  addPlayer(player: PlayerPublic): void {
    if (this.playerSprites.has(player.id) || !this.isoTransform) return;

    const elevation = this.getTileElevation(player.position.x, player.position.y);
    const elevationOffset = elevation * 16; // ELEVATION_HEIGHT_STEP
    const screenPos = this.isoTransform.gridToScreen(player.position.x, player.position.y);

    const container = this.add.container(screenPos.x, screenPos.y - elevationOffset);
    container.setData('gridX', player.position.x);
    container.setData('gridY', player.position.y);
    container.setData('elevation', elevation);

    // Shadow
    const shadow = this.add.ellipse(0, 0, 40, 20, 0x000000, 0.3);
    container.add(shadow);

    // Player sprite (texture is 2x resolution, scale down for crispness)
    const sprite = this.add.sprite(0, -12, 'player');
    sprite.setOrigin(0.5, 1.0);
    sprite.setScale(0.5);
    sprite.setTint(this.getFactionColor(player.faction));
    container.add(sprite);

    const depth = this.isoTransform.calculateDepth(player.position.x, player.position.y, elevation);
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
    const sprite = this.playerSprites.get(playerId);
    if (!sprite || !this.isoTransform) return;

    const elevation = this.getTileElevation(position.x, position.y);
    const elevationOffset = elevation * 16; // ELEVATION_HEIGHT_STEP
    const screenPos = this.isoTransform.gridToScreen(position.x, position.y);

    // Mark player dirty for depth sorting
    if (this.depthSorter) {
      this.depthSorter.markDirty(playerId);
    }

    this.tweens.killTweensOf(sprite);
    this.tweens.add({
      targets: sprite,
      x: screenPos.x,
      y: screenPos.y - elevationOffset,
      duration: 100,
      ease: 'Linear',
      onComplete: () => {
        sprite.setData('gridX', position.x);
        sprite.setData('gridY', position.y);
        sprite.setData('elevation', elevation);
        const depth = this.isoTransform!.calculateDepth(position.x, position.y, elevation);
        sprite.setDepth(depth);
      }
    });
  }

  updateLocalPlayerSprite(position: Position, reconciling = false): void {
    if (!this.localPlayer || !this.isoTransform) return;

    const elevation = this.getTileElevation(position.x, position.y);
    const elevationOffset = elevation * 16; // ELEVATION_HEIGHT_STEP
    const screenPos = this.isoTransform.gridToScreen(position.x, position.y);
    const targetY = screenPos.y - elevationOffset;

    if (reconciling && (this.localPlayer.x !== screenPos.x || this.localPlayer.y !== targetY)) {
      this.tweens.killTweensOf(this.localPlayer);
      this.tweens.add({
        targets: this.localPlayer,
        x: screenPos.x,
        y: targetY,
        duration: 50,
        ease: 'Cubic.easeOut',
      });
    } else {
      this.localPlayer.x = screenPos.x;
      this.localPlayer.y = targetY;
    }

    // Update grid data and depth
    this.localPlayer.setData('gridX', position.x);
    this.localPlayer.setData('gridY', position.y);
    this.localPlayer.setData('elevation', elevation);
    const depth = this.isoTransform.calculateDepth(position.x, position.y, elevation + 0.001);
    this.localPlayer.setDepth(depth);
  }

  updateLocalPlayer(position: Position): void {
    // Create player sprite if it doesn't exist
    if (!this.localPlayer) {
      this.createLocalPlayer(position);
      // Set up camera to follow player
      // Camera instantly follows player (1, 1 = no lerp), keeping player centered
      this.cameras.main.startFollow(this.localPlayer!, true, 1, 1);
      // Also set minimap to follow player
      if (this.minimapCamera) {
        this.minimapCamera.startFollow(this.localPlayer!);
      }
    } else {
      this.updateLocalPlayerSprite(position, false);
    }
  }

  private getEntityTexture(type: string): string {
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

  private getFactionColor(faction: string): number {
    switch (faction) {
      case 'verdant':
        return 0x44cc44; // Verdant Dynamics - green
      case 'helix':
        return 0xff6b35; // Helix Extraction - orange
      case 'nexus':
        return 0x00bfff; // Nexus Frontiers - blue
      case 'neutral':
        return 0xa0a0a0; // Unaffiliated - gray
      default:
        return 0x7b68ee;
    }
  }

  getMovementController(): MovementController | null {
    return this.movementController;
  }

  getPathfindingController(): PathfindingController | null {
    return this.pathfindingController;
  }

  setCollisionMap(collisionMap: boolean[][]): void {
    this.collisionMap = collisionMap;
    if (this.movementController) {
      this.movementController.setCollisionMap(collisionMap);
    }
  }

  shutdown(): void {
    if (this.hoverController) {
      this.hoverController.destroy();
      this.hoverController = null;
    }
    if (this.pathfindingController) {
      this.pathfindingController.cancelPath();
      this.pathfindingController = null;
    }
    if (this.movementController) {
      this.movementController.clearPendingInputs();
      this.movementController = null;
    }
    if (this.depthSorter) {
      this.depthSorter.clear();
      this.depthSorter = null;
    }
    this.isoTransform = null;
    if (this.entityRenderer) {
      this.entityRenderer = null;
    }
    if (this.zoneHUD) {
      this.zoneHUD.destroy();
      this.zoneHUD = null;
    }
    if (this.minimapCamera) {
      this.minimapCamera.destroy();
      this.minimapCamera = null;
    }
    if (this.chunkManager) {
      this.chunkManager.clear();
      this.chunkManager = null;
    }
    this.chunkContainers.forEach(container => container.destroy(true));
    this.chunkContainers.clear();
    this.tileSprites = [];
    this.lastCullBounds = null;
  }
}
