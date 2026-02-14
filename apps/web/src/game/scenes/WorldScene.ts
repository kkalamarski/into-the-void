import Phaser from 'phaser';
import { ZONE_SIZE, Position, Entity, PlayerPublic, ChunkData, BiomeType, Direction } from '@into-the-void/shared-types';
import { TileId } from '@into-the-void/world-gen';
import { TileRenderer } from '../rendering/TileRenderer';
import { ChunkManager } from '../rendering/ChunkManager';
import { ViewportCuller } from '../rendering/ViewportCuller';
import { ZoneHUD } from '../ui/ZoneHUD';
import { MovementController } from '../systems/MovementController';

const TILE_SIZE = 32;

export class WorldScene extends Phaser.Scene {
  private tileLayer: Phaser.GameObjects.Container | null = null;
  private tileRenderer: TileRenderer | null = null;
  private tileSprites: Phaser.GameObjects.Sprite[][] = [];
  private entitySprites: Map<string, Phaser.GameObjects.Sprite> = new Map();
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

  constructor() {
    super({ key: 'WorldScene' });
  }

  create(): void {
    // Create tile container
    this.tileLayer = this.add.container(0, 0);

    // Initialize TileRenderer
    this.tileRenderer = new TileRenderer(this, TILE_SIZE);

    // Initialize ViewportCuller
    this.viewportCuller = new ViewportCuller(TILE_SIZE, 2);

    // Initialize ZoneHUD
    this.zoneHUD = new ZoneHUD(this);

    // Initialize MovementController
    this.movementController = new MovementController();
    this.movementController.setPositionUpdateHandler((position, reconciling) => {
      this.updateLocalPlayerSprite(position, reconciling);
    });

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

    // Tiles will be loaded via loadZoneFromState() when zone:state event arrives
    // For now, keep placeholder for standalone testing
    this.generatePlaceholderWorld();

    // Create local player for testing
    this.createLocalPlayer({ x: 32, y: 32, zoneId: 'z_0_0' });

    // Center camera on player
    if (this.localPlayer) {
      this.cameras.main.startFollow(this.localPlayer, true, 0.1, 0.1);
    }

    // Setup camera zoom controls
    this.input.on('wheel', (
      _pointer: Phaser.Input.Pointer,
      _gameObjects: Phaser.GameObjects.GameObject[],
      _deltaX: number,
      deltaY: number
    ) => {
      const zoom = this.cameras.main.zoom;
      const newZoom = Phaser.Math.Clamp(zoom - deltaY * 0.001, 0.5, 2);
      this.cameras.main.setZoom(newZoom);
    });
  }

  private generatePlaceholderWorld(): void {
    if (!this.tileLayer) return;

    // Generate a simple placeholder grid
    for (let y = 0; y < ZONE_SIZE; y++) {
      for (let x = 0; x < ZONE_SIZE; x++) {
        const isWall = Math.random() > 0.85 && !(x === 32 && y === 32); // Leave spawn clear
        const texture = isWall ? 'tile_wall' : 'tile_floor';
        const tile = this.add.sprite(x * TILE_SIZE, y * TILE_SIZE, texture);
        tile.setOrigin(0, 0);
        this.tileLayer.add(tile);
      }
    }

    // Add some test entities
    for (let i = 0; i < 10; i++) {
      const x = Phaser.Math.Between(5, ZONE_SIZE - 5);
      const y = Phaser.Math.Between(5, ZONE_SIZE - 5);
      const type = Math.random() > 0.5 ? 'creature' : 'mineral';
      const sprite = this.add.sprite(
        x * TILE_SIZE + TILE_SIZE / 2,
        y * TILE_SIZE + TILE_SIZE / 2,
        type
      );
      this.entitySprites.set(`test_${type}_${i}`, sprite);
    }
  }

  private createLocalPlayer(position: Position): void {
    this.localPlayer = this.add.sprite(
      position.x * TILE_SIZE + TILE_SIZE / 2,
      position.y * TILE_SIZE + TILE_SIZE / 2,
      'player'
    );
    this.localPlayer.setDepth(10);
  }

  update(time: number): void {
    this.handleInput(time);
    this.updateVisibleTiles();
  }

  private handleInput(time: number): void {
    if (!this.localPlayer || !this.movementController || time - this.lastMoveTime < this.moveDelay) return;

    let direction: Direction | null = null;

    if (this.cursors?.up.isDown || this.wasd?.W.isDown) direction = 'n';
    else if (this.cursors?.down.isDown || this.wasd?.S.isDown) direction = 's';
    else if (this.cursors?.left.isDown || this.wasd?.A.isDown) direction = 'w';
    else if (this.cursors?.right.isDown || this.wasd?.D.isDown) direction = 'e';

    if (direction) {
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
        const tile = this.tileSprites[y][x];
        if (tile) {
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

  private renderChunk(chunkData: ChunkData, biome: BiomeType): void {
    if (!this.tileRenderer) return;

    const { zoneId, tiles } = chunkData;
    const { x: chunkX, y: chunkY } = this.parseZoneCoords(zoneId);

    // Calculate world offset for this chunk
    const offsetX = chunkX * ZONE_SIZE * TILE_SIZE;
    const offsetY = chunkY * ZONE_SIZE * TILE_SIZE;

    // Create container for this chunk
    const container = this.add.container(offsetX, offsetY);

    // Create tiles
    for (let y = 0; y < ZONE_SIZE; y++) {
      for (let x = 0; x < ZONE_SIZE; x++) {
        const tileId = tiles[y][x] as TileId;
        const tile = this.tileRenderer.createTile(x, y, tileId);
        container.add(tile);
      }
    }

    // Store container
    this.chunkContainers.set(zoneId, container);

    // Update biome and HUD for current zone
    if (zoneId === this.currentZoneId) {
      this.currentBiome = biome;
      if (this.zoneHUD) {
        this.zoneHUD.updateZone(zoneId, biome);
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
    if (this.entitySprites.has(entity.id)) return;

    const texture = this.getEntityTexture(entity.type);
    const sprite = this.add.sprite(
      entity.position.x * TILE_SIZE + TILE_SIZE / 2,
      entity.position.y * TILE_SIZE + TILE_SIZE / 2,
      texture
    );
    this.entitySprites.set(entity.id, sprite);
  }

  despawnEntity(entityId: string): void {
    const sprite = this.entitySprites.get(entityId);
    if (sprite) {
      sprite.destroy();
      this.entitySprites.delete(entityId);
    }
  }

  updateEntity(entityId: string, changes: Partial<Entity>): void {
    const sprite = this.entitySprites.get(entityId);
    if (sprite && changes.position) {
      sprite.x = changes.position.x * TILE_SIZE + TILE_SIZE / 2;
      sprite.y = changes.position.y * TILE_SIZE + TILE_SIZE / 2;
    }
  }

  addPlayer(player: PlayerPublic): void {
    if (this.playerSprites.has(player.id)) return;

    const sprite = this.add.sprite(
      player.position.x * TILE_SIZE + TILE_SIZE / 2,
      player.position.y * TILE_SIZE + TILE_SIZE / 2,
      'player'
    );
    sprite.setTint(this.getFactionColor(player.faction));
    sprite.setDepth(10);
    this.playerSprites.set(player.id, sprite);
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
    if (sprite) {
      this.tweens.add({
        targets: sprite,
        x: position.x * TILE_SIZE + TILE_SIZE / 2,
        y: position.y * TILE_SIZE + TILE_SIZE / 2,
        duration: 100,
        ease: 'Linear',
      });
    }
  }

  updateLocalPlayerSprite(position: Position, reconciling = false): void {
    if (!this.localPlayer) return;

    const targetX = position.x * TILE_SIZE + TILE_SIZE / 2;
    const targetY = position.y * TILE_SIZE + TILE_SIZE / 2;

    if (reconciling && (this.localPlayer.x !== targetX || this.localPlayer.y !== targetY)) {
      // Server correction - tween to correct position
      this.tweens.add({
        targets: this.localPlayer,
        x: targetX,
        y: targetY,
        duration: 50,
        ease: 'Cubic.easeOut',
      });
    } else {
      // Prediction - instant update for responsiveness
      this.localPlayer.x = targetX;
      this.localPlayer.y = targetY;
    }
  }

  updateLocalPlayer(position: Position): void {
    this.updateLocalPlayerSprite(position, false);
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

  setCollisionMap(collisionMap: boolean[][]): void {
    if (this.movementController) {
      this.movementController.setCollisionMap(collisionMap);
    }
  }

  shutdown(): void {
    if (this.movementController) {
      this.movementController.clearPendingInputs();
      this.movementController = null;
    }
    if (this.zoneHUD) {
      this.zoneHUD.destroy();
      this.zoneHUD = null;
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
