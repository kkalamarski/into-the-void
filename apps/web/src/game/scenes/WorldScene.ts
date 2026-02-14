import Phaser from 'phaser';
import { ZONE_SIZE, Position, Entity, PlayerPublic, ChunkData } from '@into-the-void/shared-types';
import { TileId } from '@into-the-void/world-gen';
import { TileRenderer } from '../rendering/TileRenderer';

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

  constructor() {
    super({ key: 'WorldScene' });
  }

  create(): void {
    // Create tile container
    this.tileLayer = this.add.container(0, 0);

    // Initialize TileRenderer
    this.tileRenderer = new TileRenderer(this, TILE_SIZE);

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
  }

  private handleInput(time: number): void {
    if (!this.localPlayer || time - this.lastMoveTime < this.moveDelay) return;

    let dx = 0;
    let dy = 0;

    if (this.cursors?.up.isDown || this.wasd?.W.isDown) dy = -1;
    else if (this.cursors?.down.isDown || this.wasd?.S.isDown) dy = 1;
    else if (this.cursors?.left.isDown || this.wasd?.A.isDown) dx = -1;
    else if (this.cursors?.right.isDown || this.wasd?.D.isDown) dx = 1;

    if (dx !== 0 || dy !== 0) {
      // Move locally for responsiveness
      this.localPlayer.x += dx * TILE_SIZE;
      this.localPlayer.y += dy * TILE_SIZE;
      this.lastMoveTime = time;

      // In a real implementation, we'd send this to the server
      // and validate the movement
    }
  }

  // Methods to be called from network layer
  loadZoneFromState(chunkData: ChunkData): void {
    if (!this.tileLayer || !this.tileRenderer) return;

    // Clear existing tiles
    this.tileLayer.removeAll(true);
    this.tileSprites = [];

    const { tiles } = chunkData;

    // Create new tiles from zone data
    for (let y = 0; y < ZONE_SIZE; y++) {
      this.tileSprites[y] = [];
      for (let x = 0; x < ZONE_SIZE; x++) {
        const tileId = tiles[y][x] as TileId;
        const tile = this.tileRenderer.createTile(x, y, tileId);
        this.tileLayer.add(tile);
        this.tileSprites[y][x] = tile;
      }
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

  updateLocalPlayer(position: Position): void {
    if (this.localPlayer) {
      this.localPlayer.x = position.x * TILE_SIZE + TILE_SIZE / 2;
      this.localPlayer.y = position.y * TILE_SIZE + TILE_SIZE / 2;
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
}
