import Phaser from 'phaser';
import { ZONE_SIZE, MOVE_DELAY_MS, HYSTERESIS_TILES, Position, Entity, PlayerPublic, ChunkData, BiomeType, Direction, Creature, TileStructure } from '@into-the-void/shared-types';
import { TileId, tileIdToString } from '@into-the-void/world-gen';
import { TileRegistry } from '@into-the-void/tiles';
import { TileRenderer } from '../rendering/TileRenderer';
import { EntityRenderer } from '../rendering/EntityRenderer';
import { ChunkManager } from '../rendering/ChunkManager';
import { ViewportCuller } from '../rendering/ViewportCuller';
import { ZoneHUD } from '../ui/ZoneHUD';
import { MinimapCamera } from '../rendering/MinimapCamera';
import { MovementController } from '../systems/MovementController';
import { PathfindingController } from '../systems/PathfindingController';
import { IsometricTransform } from '../utils/IsometricTransform';
import { DepthSorter } from '../rendering/DepthSorter';
import { useGameStore } from '../../store/gameStore';
import { useEntityStore } from '../../store/entityStore';
import { gameSocket } from '../../network/socket';

export const ISO_TILE_WIDTH = 128;
export const ISO_TILE_HEIGHT = 64;
// Visibility radius in tiles (~1.5 chunks allows seeing into adjacent chunks)
const VISIBILITY_RADIUS = 48;

type WASDKeys = { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };

/**
 * Resolve 8-directional movement from simultaneous WASD key states.
 * Uses screen-relative mapping: W=up, S=down, A=left, D=right on screen.
 * Dual-key combos produce grid cardinals (screen diagonals).
 */
function resolveDirection(keys: WASDKeys): Direction | null {
  const w = keys.W.isDown;
  const a = keys.A.isDown;
  const s = keys.S.isDown;
  const d = keys.D.isDown;

  // Dual-key combos = grid cardinals (appear as screen diagonals)
  if (w && d) return 'n';  // screen top-right diagonal
  if (w && a) return 'w';  // screen top-left diagonal
  if (s && d) return 'e';  // screen bottom-right diagonal
  if (s && a) return 's';  // screen bottom-left diagonal

  // Single key = screen-relative (grid diagonals)
  if (w) return 'nw';  // screen up
  if (s) return 'se';  // screen down
  if (a) return 'sw';  // screen left
  if (d) return 'ne';  // screen right

  return null;
}

export class WorldScene extends Phaser.Scene {
  private tileLayer: Phaser.GameObjects.Container | null = null;
  private tileRenderer: TileRenderer | null = null;
  private entityRenderer: EntityRenderer | null = null;
  private tileSprites: Phaser.GameObjects.GameObject[][] = [];
  private entitySprites: Map<string, Phaser.GameObjects.Container> = new Map();
  private entityZoneMap: Map<string, Set<string>> = new Map(); // zoneId -> Set<entityId>
  private playerSprites: Map<string, Phaser.GameObjects.Sprite> = new Map();
  private localPlayer: Phaser.GameObjects.Sprite | null = null;
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys | null = null;
  private wasd: WASDKeys | null = null;
  private moveDelay = MOVE_DELAY_MS; // ms between moves
  private lastMoveTime = 0;
  private chordStartTime = 0; // When first movement key was pressed
  private static readonly CHORD_WINDOW_MS = 2; // Time to wait for additional keys
  private chunkManager: ChunkManager | null = null;
  // Store tile arrays for cleanup (not containers - tiles need global depth sorting)
  private chunkTiles: Map<string, Phaser.GameObjects.Container[]> = new Map();
  private currentZoneId: string = 'z_0_0';
  private pendingZoneId: string | null = null;
  private pendingBiome: BiomeType | null = null;
  private lastPendingZoneCheck = 0;
  private static readonly PENDING_ZONE_CHECK_INTERVAL = 100; // ms between checks
  private onChunkRequest: ((zoneId: string) => void) | null = null;
  private viewportCuller: ViewportCuller | null = null;
  private zoneHUD: ZoneHUD | null = null;
  private currentBiome: BiomeType = 'void_plains';
  private lastCullBounds: { minTileX: number; maxTileX: number; minTileY: number; maxTileY: number } | null = null;
  private movementController: MovementController | null = null;
  private pathfindingController: PathfindingController | null = null;
  private collisionMap: boolean[][] | null = null;
  private minimapCamera: MinimapCamera | null = null;
  private isoTransform: IsometricTransform | null = null;
  private depthSorter: DepthSorter | null = null;
  private currentHeights: number[][] | null = null;
  private currentStructures: TileStructure[] = [];
  private lastOcclusionTime = 0;
  private occlusionInterval = 100; // Only check occlusion every 100ms
  private currentTiles: number[][] | null = null;
  private tileInfoPopup: Phaser.GameObjects.Container | null = null;
  private leftMouseDown = false;
  private rightMouseDown = false;

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

    // Initialize ChunkManager
    this.chunkManager = new ChunkManager(
      // onChunkNeeded
      (zoneId: string) => {
        console.log('[ChunkManager] onChunkNeeded:', zoneId, 'handler exists:', !!this.onChunkRequest);
        if (this.onChunkRequest) {
          this.onChunkRequest(zoneId);
        } else {
          console.warn('[ChunkManager] No chunk request handler set!');
        }
      },
      // onChunkLoaded
      (chunkData: ChunkData, biome: BiomeType) => {
        this.renderChunk(chunkData, biome);
      },
      // onChunkUnloaded
      (zoneId: string) => {
        this.unloadChunkContainer(zoneId);
      },
      // onLoadingStateChange
      (loadingCount: number) => {
        useGameStore.getState().setChunksLoading(loadingCount);
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

      // Tool swap hotkey: Q swaps main and secondary tool slots
      this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q).on('down', () => {
        if (this.input.keyboard?.enabled) {
          gameSocket.emit('equipment:tool_swap', {});
        }
      });

      // UI toggle hotkeys: I=Inventory, E=Equipment, Tab=Storage, C=Chat
      this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.I).on('down', () => {
        if (this.input.keyboard?.enabled) {
          useGameStore.getState().toggleInventory();
        }
      });

      this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E).on('down', () => {
        if (this.input.keyboard?.enabled) {
          useGameStore.getState().toggleEquipment();
        }
      });

      this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.C).on('down', () => {
        if (this.input.keyboard?.enabled) {
          useGameStore.getState().toggleChat();
        }
      });

      // P is alias for E (both toggle equipment+stats panel)
      this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.P).on('down', () => {
        if (this.input.keyboard?.enabled) {
          useGameStore.getState().toggleEquipment();
        }
      });
    }

    // Tiles and player will be loaded via loadZoneFromState() when zone:state event arrives

    // Cancel pathfinding when game loses focus (prevents timer issues)
    this.game.events.on('blur', () => {
      if (this.pathfindingController?.isPathActive()) {
        this.pathfindingController.cancelPath();
      }
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
        (x, y) => this.getWorldTileElevation(x, y)
      );

      // Start pathfinding with world-coordinate collision and elevation accessors
      if (this.pathfindingController && this.chunkManager) {
        this.pathfindingController.startPath(
          gridPos.x,
          gridPos.y,
          (x, y) => this.isWorldTileBlocked(x, y),
          (x, y) => this.getWorldTileElevation(x, y)
        );
      }
    });

    // Track mouse buttons for tile inspection (both buttons = look at tile, like Tibia)
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.leftButtonDown()) this.leftMouseDown = true;
      if (pointer.rightButtonDown()) this.rightMouseDown = true;

      // Both buttons pressed - show tile info
      if (this.leftMouseDown && this.rightMouseDown) {
        this.showTileInfo(pointer);
      }
    });

    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (!pointer.leftButtonDown()) this.leftMouseDown = false;
      if (!pointer.rightButtonDown()) this.rightMouseDown = false;

      // Hide tile info when any button released
      this.hideTileInfo();
    });

    // Prevent context menu on right click
    this.input.mouse?.disableContextMenu();
  }

  /**
   * Show tile information popup (triggered by both mouse buttons)
   */
  private showTileInfo(pointer: Phaser.Input.Pointer): void {
    if (!this.isoTransform || !this.currentTiles) return;

    // Convert screen position to world position
    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);

    // Convert to tile coordinates
    const gridPos = this.isoTransform.screenToTileWithElevation(
      worldPoint.x,
      worldPoint.y,
      (x, y) => this.getTileElevation(x, y)
    );

    // Check bounds
    if (gridPos.x < 0 || gridPos.x >= ZONE_SIZE || gridPos.y < 0 || gridPos.y >= ZONE_SIZE) {
      return;
    }

    // Get tile info from registry
    const tileNumericId = this.currentTiles[gridPos.y]?.[gridPos.x];
    if (tileNumericId === undefined) return;

    const tileId = tileIdToString(tileNumericId as TileId);
    const tileDef = TileRegistry.get(tileId);
    const elevation = this.currentHeights?.[gridPos.y]?.[gridPos.x] ?? 0;
    const isBlocked = this.collisionMap?.[gridPos.y]?.[gridPos.x] ?? false;

    // Hide any existing popup
    this.hideTileInfo();

    // Create info popup
    const popup = this.add.container(pointer.x, pointer.y - 100);
    popup.setScrollFactor(0);
    popup.setDepth(2000);

    // Background
    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.85);
    bg.fillRoundedRect(-120, -60, 240, 120, 8);
    bg.lineStyle(2, isBlocked ? 0xff4444 : 0x44ff44, 1);
    bg.strokeRoundedRect(-120, -60, 240, 120, 8);
    popup.add(bg);

    // Title
    const title = this.add.text(0, -45, tileDef.displayName, {
      fontSize: '16px',
      fontFamily: 'monospace',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0);
    popup.add(title);

    // Properties
    const props = [
      `Position: (${gridPos.x}, ${gridPos.y})`,
      `Elevation: ${elevation}`,
      `Blocking: ${isBlocked ? 'Yes' : 'No'}`,
      `Speed: ${tileDef.movementSpeed}x`,
    ];

    const propsText = this.add.text(0, -20, props.join('\n'), {
      fontSize: '12px',
      fontFamily: 'monospace',
      color: '#cccccc',
      lineSpacing: 4,
    }).setOrigin(0.5, 0);
    popup.add(propsText);

    // Description (if available)
    if (tileDef.description) {
      const desc = this.add.text(0, 35, tileDef.description, {
        fontSize: '10px',
        fontFamily: 'monospace',
        color: '#aaaaaa',
        wordWrap: { width: 220 },
        align: 'center',
      }).setOrigin(0.5, 0);
      popup.add(desc);
    }

    this.tileInfoPopup = popup;
  }

  /**
   * Hide tile information popup
   */
  private hideTileInfo(): void {
    if (this.tileInfoPopup) {
      this.tileInfoPopup.destroy();
      this.tileInfoPopup = null;
    }
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

    // Get elevation for the correct zone
    const elevation = this.getTileElevation(position.x, position.y, position.zoneId);
    const elevationOffset = elevation * 16; // ELEVATION_HEIGHT_STEP
    // Use world coordinates for screen position so player aligns with chunk positions
    const { worldX, worldY } = this.positionToWorldCoords(position);
    const screenPos = this.isoTransform.gridToScreen(worldX, worldY);

    // Create container for player (same pattern as entities)
    const container = this.add.container(screenPos.x, screenPos.y - elevationOffset);
    container.setData('gridX', worldX);
    container.setData('gridY', worldY);
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

    // Set depth with priority boost to ensure player renders above terrain
    const depth = this.isoTransform.calculateDepth(worldX, worldY, elevation, 10);
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

    // Throttled occlusion check
    if (time - this.lastOcclusionTime >= this.occlusionInterval) {
      this.lastOcclusionTime = time;
      this.updateEntityOcclusion();
    }
  }

  private handleInput(time: number): void {
    if (!this.localPlayer || !this.movementController || time - this.lastMoveTime < this.moveDelay) return;

    // Check if any movement key is pressed
    const anyWasdDown = this.wasd && (
      this.wasd.W.isDown || this.wasd.A.isDown || this.wasd.S.isDown || this.wasd.D.isDown
    );
    const anyCursorDown = this.cursors && (
      this.cursors.up.isDown || this.cursors.right.isDown ||
      this.cursors.down.isDown || this.cursors.left.isDown
    );

    // Reset chord when no keys are pressed
    if (!anyWasdDown && !anyCursorDown) {
      this.chordStartTime = 0;
      return;
    }

    // Start chord window on first key press
    if (this.chordStartTime === 0) {
      this.chordStartTime = time;
    }

    // Wait for chord window to allow additional keys to be pressed
    // This prevents W+A being interpreted as just W if A is pressed slightly later
    if (time - this.chordStartTime < WorldScene.CHORD_WINDOW_MS) {
      return;
    }

    let direction: Direction | null = null;

    // WASD: 8-directional with dual-key detection
    if (this.wasd) {
      direction = resolveDirection(this.wasd);
    }

    // Arrow keys: 4-directional fallback using isometric visual mapping (only if no WASD direction)
    if (!direction && this.cursors) {
      if (this.cursors.up.isDown) direction = 'nw';
      else if (this.cursors.right.isDown) direction = 'ne';
      else if (this.cursors.down.isDown) direction = 'se';
      else if (this.cursors.left.isDown) direction = 'sw';
    }

    if (direction) {
      // Cancel any active pathfinding when keyboard is used
      if (this.pathfindingController?.isPathActive()) {
        this.pathfindingController.cancelPath();
      }

      this.lastMoveTime = time;
      // Reset chord for next input sequence
      this.chordStartTime = 0;
      // processInput triggers updateLocalPlayerSprite which handles moveDelay update
      this.movementController.processInput(direction);
    }
  }

  private updateVisibleTiles(): void {
    if (!this.viewportCuller) return;

    // Skip if no chunks loaded
    if (this.chunkTiles.size === 0) return;

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

    // Update chunk tile visibility using world coordinates stored in container data
    this.chunkTiles.forEach(tiles => {
      for (const tile of tiles) {
        const gridX = tile.getData('gridX') as number;
        const gridY = tile.getData('gridY') as number;
        const isVisible = this.viewportCuller!.isTileVisible(gridX, gridY, bounds);
        if (tile.visible !== isVisible) {
          tile.setVisible(isVisible);
        }
      }
    });
  }

  /**
   * Update entity visibility based on occlusion by tall structures.
   */
  private updateEntityOcclusion(): void {
    if (!this.entityRenderer) return;

    // Get current zone's chunk tiles
    const chunkTiles = this.chunkTiles.get(this.currentZoneId) ?? null;

    // Apply occlusion to entities
    this.entityRenderer.applyOcclusion(this.entitySprites, chunkTiles);

    // Also apply to remote players (convert Map<string, Sprite> to Map<string, Container>)
    const playerContainers = new Map<string, Phaser.GameObjects.Container>();
    this.playerSprites.forEach((sprite, id) => {
      // playerSprites actually contain Containers cast as Sprites (from addPlayer)
      playerContainers.set(id, sprite as unknown as Phaser.GameObjects.Container);
    });
    this.entityRenderer.applyOcclusion(playerContainers, chunkTiles);
  }

  // Methods to be called from network layer
  setChunkRequestHandler(handler: (zoneId: string) => void): void {
    console.log('[WorldScene] setChunkRequestHandler called');
    this.onChunkRequest = handler;
  }

  loadZoneFromState(chunkData: ChunkData, biome: BiomeType): void {
    console.log('[WorldScene] loadZoneFromState called for', chunkData.zoneId, 'handler exists:', !!this.onChunkRequest);
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

  /**
   * Commit a zone transition immediately: update all zone state, collision map, HUD,
   * and clean up orphaned entities. Called once the player is HYSTERESIS_TILES deep.
   */
  private commitZoneTransition(newZoneId: string, biome: BiomeType): void {
    console.log('[WorldScene] commitZoneTransition:', { from: this.currentZoneId, to: newZoneId });
    this.currentZoneId = newZoneId;

    // Update current zone data from already-loaded chunk (fast, sync)
    if (this.chunkManager) {
      const chunk = this.chunkManager.getChunk(newZoneId);
      if (chunk) {
        this.currentHeights = chunk.data.heights;
        this.currentTiles = chunk.data.tiles;
        this.currentStructures = chunk.data.structures;
        this.currentBiome = chunk.biome;

        // Update collision map for movement validation in new zone
        if (chunk.data.collisions) {
          this.setCollisionMap(chunk.data.collisions);
        }

        // Update HUD
        if (this.zoneHUD) {
          this.zoneHUD.updateZone(newZoneId, chunk.biome);
        }
      }
    }

    // Defer heavy operations to next idle frame to avoid blocking main thread
    // This prevents ping spikes by allowing network I/O to proceed
    requestIdleCallback(() => {
      // Update ChunkManager's center zone - recalculates 3x3 grid, may trigger network
      if (this.chunkManager) {
        this.chunkManager.updateChunks(newZoneId);
      }

      // Clean up orphaned entities that are now out of range
      this.cleanupOrphanedEntities();
    }, { timeout: 100 });
  }

  /**
   * Check if a pending zone transition should now be committed based on tile depth.
   * Called each time the local player's position updates.
   */
  private checkPendingZoneTransition(position: Position): void {
    if (!this.pendingZoneId) return;

    // Throttle checks to avoid running every frame
    const now = performance.now();
    if (now - this.lastPendingZoneCheck < WorldScene.PENDING_ZONE_CHECK_INTERVAL) {
      return;
    }
    this.lastPendingZoneCheck = now;

    // Player returned to committed zone - cancel pending transition
    if (position.zoneId === this.currentZoneId) {
      console.log('[WorldScene] Pending zone transition cancelled - player returned to committed zone');
      this.pendingZoneId = null;
      this.pendingBiome = null;
      return;
    }

    // Player still in pending zone - check tile depth
    if (position.zoneId === this.pendingZoneId) {
      const depth = this.getZoneBoundaryDepth(position);
      if (depth >= HYSTERESIS_TILES) {
        this.commitZoneTransition(this.pendingZoneId, this.pendingBiome!);
        this.pendingZoneId = null;
        this.pendingBiome = null;
      }
    }
  }

  onPlayerZoneChanged(newZoneId: string, biome: BiomeType): void {
    console.log('[WorldScene] onPlayerZoneChanged:', { from: this.currentZoneId, to: newZoneId });

    // Get current player position to determine tile depth inside new zone
    const position = useGameStore.getState().player?.position;

    // If no position available, fall back to immediate commit (defensive)
    if (!position) {
      this.commitZoneTransition(newZoneId, biome);
      return;
    }

    const depth = this.getZoneBoundaryDepth(position);

    if (depth >= HYSTERESIS_TILES) {
      // Deep enough - commit immediately (e.g., teleport or fast movement)
      this.commitZoneTransition(newZoneId, biome);
    } else {
      // Near boundary - store as pending and wait for player to go deeper
      // NOTE: We do NOT call updateChunks here - the 3x3 grid from the current zone
      // already includes this adjacent zone. Calling it would trigger load/unload thrashing.
      this.pendingZoneId = newZoneId;
      this.pendingBiome = biome;
      console.log('[WorldScene] Zone transition pending at depth', depth, '- awaiting', HYSTERESIS_TILES, 'tiles');
    }
  }

  private parseZoneCoords(zoneId: string): { x: number; y: number } {
    const parts = zoneId.split('_');
    return {
      x: parseInt(parts[1], 10),
      y: parseInt(parts[2], 10),
    };
  }

  /**
   * Calculate how many tiles deep into a zone the position is.
   * Returns 0 when on the zone edge, up to (ZONE_SIZE/2 - 1) at the center.
   * Used for hysteresis: only commit zone transition when depth >= HYSTERESIS_TILES.
   */
  private getZoneBoundaryDepth(position: Position): number {
    const fromLeft = position.x;
    const fromRight = ZONE_SIZE - 1 - position.x;
    const fromTop = position.y;
    const fromBottom = ZONE_SIZE - 1 - position.y;
    return Math.min(fromLeft, fromRight, fromTop, fromBottom);
  }

  /**
   * Convert a Position (local coords + zoneId) to world coordinates.
   * World coords = zoneCoords * ZONE_SIZE + localCoords
   */
  private positionToWorldCoords(position: Position): { worldX: number; worldY: number } {
    const zoneCoords = this.parseZoneCoords(position.zoneId);
    return {
      worldX: zoneCoords.x * ZONE_SIZE + position.x,
      worldY: zoneCoords.y * ZONE_SIZE + position.y,
    };
  }

  /**
   * Calculate Euclidean distance between two positions using world coordinates.
   * Used for visibility checks that span chunk boundaries.
   */
  private calculateWorldDistance(a: Position, b: Position): number {
    const worldA = this.positionToWorldCoords(a);
    const worldB = this.positionToWorldCoords(b);

    const dx = worldA.worldX - worldB.worldX;
    const dy = worldA.worldY - worldB.worldY;

    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Check if an entity is visible to the local player based on world coordinate distance.
   * Returns true if entity is within VISIBILITY_RADIUS tiles.
   */
  private isEntityVisible(entityPosition: Position): boolean {
    const player = useGameStore.getState().player;
    if (!player) return false;

    const distance = this.calculateWorldDistance(player.position, entityPosition);
    return distance <= VISIBILITY_RADIUS;
  }

  private getTileElevation(gridX: number, gridY: number, zoneId?: string): number {
    // If a specific zone is requested and it differs from current zone,
    // try to get heights from the chunk manager
    if (zoneId && zoneId !== this.currentZoneId && this.chunkManager) {
      const chunk = this.chunkManager.getChunk(zoneId);
      if (chunk?.data.heights) {
        return chunk.data.heights[gridY]?.[gridX] ?? 0;
      }
    }
    // Default to current zone's heights
    return this.currentHeights?.[gridY]?.[gridX] ?? 0;
  }

  /**
   * Get tile elevation using world coordinates.
   * Looks up the correct chunk from ChunkManager.
   */
  getWorldTileElevation(worldX: number, worldY: number): number {
    if (!this.chunkManager) return 0;

    // Calculate which chunk this tile belongs to
    const chunkX = Math.floor(worldX / ZONE_SIZE);
    const chunkY = Math.floor(worldY / ZONE_SIZE);
    const zoneId = `z_${chunkX}_${chunkY}`;

    // Get chunk data
    const chunk = this.chunkManager.getChunk(zoneId);
    if (!chunk?.data.heights) return 0;

    // Convert to chunk-local coordinates
    const localX = ((worldX % ZONE_SIZE) + ZONE_SIZE) % ZONE_SIZE;
    const localY = ((worldY % ZONE_SIZE) + ZONE_SIZE) % ZONE_SIZE;

    return chunk.data.heights[localY]?.[localX] ?? 0;
  }

  private renderChunk(chunkData: ChunkData, biome: BiomeType): void {
    if (!this.tileRenderer || !this.isoTransform) return;

    const { zoneId, tiles, heights, structures } = chunkData;

    // Guard: Don't recreate tiles if already exists (prevents memory leak)
    if (this.chunkTiles.has(zoneId)) {
      console.log(`[WorldScene] Chunk ${zoneId} already rendered, skipping`);
      // Still update currentTiles for the look feature
      if (zoneId === this.currentZoneId) {
        this.currentTiles = tiles;
        this.currentHeights = heights;
        this.currentStructures = structures;
        this.currentBiome = biome;
      }
      return;
    }

    console.log(`[WorldScene] Rendering chunk ${zoneId}, total chunks: ${this.chunkTiles.size + 1}`);

    const { x: chunkX, y: chunkY } = this.parseZoneCoords(zoneId);

    // Calculate world grid offset for this chunk
    const chunkGridX = chunkX * ZONE_SIZE;
    const chunkGridY = chunkY * ZONE_SIZE;

    // Store tiles in array for cleanup (NOT in container - need global depth sorting)
    const chunkTileArray: Phaser.GameObjects.Container[] = [];

    // Create tiles using WORLD coordinates for proper global depth sorting
    // Tiles are added directly to scene so their depth participates in global sorting
    for (let y = 0; y < ZONE_SIZE; y++) {
      for (let x = 0; x < ZONE_SIZE; x++) {
        const tileId = tiles[y][x] as TileId;
        const elevation = heights[y][x];
        // Use world coordinates (chunk offset + local position)
        const worldX = chunkGridX + x;
        const worldY = chunkGridY + y;
        const tile = this.tileRenderer.createTileWithElevationWorld(worldX, worldY, tileId, elevation, heights, x, y);
        // Tile is already added to scene by tileRenderer, just track for cleanup
        chunkTileArray.push(tile);
      }
    }

    // Structures are now rendered via tiles[][] with distinct colors
    // No separate cube rendering needed

    this.chunkTiles.set(zoneId, chunkTileArray);

    if (zoneId === this.currentZoneId) {
      this.currentBiome = biome;
      this.currentTiles = tiles;
      this.currentHeights = heights;
      this.currentStructures = structures;
      if (this.zoneHUD) {
        this.zoneHUD.updateZone(zoneId, biome);
      }
    }
  }

  private unloadChunkContainer(zoneId: string): void {
    const tiles = this.chunkTiles.get(zoneId);
    if (tiles) {
      console.log(`[WorldScene] Unloading chunk ${zoneId} with ${tiles.length} tiles`);
      tiles.forEach(tile => {
        // Get all children as array first (avoid modifying while iterating)
        const children = tile.getAll();
        children.forEach(child => child.destroy());
        tile.removeAll(true);
        tile.destroy();
      });
      this.chunkTiles.delete(zoneId);
    }

    // Despawn entities belonging to this zone to prevent memory leaks
    this.despawnEntitiesForZone(zoneId);
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

  spawnEntity(entity: Entity, zoneId?: string): void {
    if (this.entitySprites.has(entity.id) || !this.entityRenderer) return;

    // Check visibility using world coordinate distance
    if (!this.isEntityVisible(entity.position)) {
      return; // Skip spawning - entity out of range
    }

    // Get elevation for the correct zone
    const elevation = this.getTileElevation(entity.position.x, entity.position.y, entity.position.zoneId);
    const container = this.entityRenderer.createEntityContainer(entity, elevation);

    // Store position for visibility checks during despawn
    container.setData('position', { ...entity.position });

    this.entitySprites.set(entity.id, container);

    // Fade-in animation for entity:spawn events only (not initial zone load)
    // Convention: zoneId is passed for zone:state entities (initial load),
    // undefined for entity:spawn events (respawns/new spawns).
    // This convention distinguishes initial zone population from runtime spawns.
    const isRespawnEvent = !zoneId;
    if (isRespawnEvent) {
      container.setAlpha(0);
      this.tweens.add({
        targets: container,
        alpha: 1,
        duration: 400,
        ease: 'Linear',
      });
    }

    // Track zone ownership for cleanup on chunk unload
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
    const container = this.entitySprites.get(entityId);
    if (container) {
      // Explicitly destroy all children first
      container.each((child: Phaser.GameObjects.GameObject) => {
        child.destroy();
      });
      container.removeAll(true);
      container.destroy();
      this.entitySprites.delete(entityId);

      // Remove from orphaned tracking if present
      const orphaned = this.entityZoneMap.get('_orphaned');
      if (orphaned) {
        orphaned.delete(entityId);
      }
    }
  }

  /**
   * Clean up orphaned entities that are now out of visibility range.
   * Called periodically (e.g., on player zone change).
   */
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

  /**
   * Despawn entities belonging to a zone (called on chunk unload).
   * Entities still within visibility range are kept but moved to 'orphaned' tracking.
   */
  despawnEntitiesForZone(zoneId: string): void {
    const entityIds = this.entityZoneMap.get(zoneId);
    if (entityIds) {
      entityIds.forEach(entityId => {
        const container = this.entitySprites.get(entityId);
        if (!container) {
          return;
        }

        // Check if entity is still visible
        const position = container.getData('position') as { x: number; y: number; zoneId: string } | undefined;
        if (position && this.isEntityVisible(position)) {
          // Entity still visible - keep it but track as orphaned (no zone updates)
          // It will be despawned when player moves away or on next visibility check
          if (!this.entityZoneMap.has('_orphaned')) {
            this.entityZoneMap.set('_orphaned', new Set());
          }
          this.entityZoneMap.get('_orphaned')!.add(entityId);
        } else {
          // Entity out of range - despawn immediately
          this.despawnEntity(entityId);
        }
      });
      this.entityZoneMap.delete(zoneId);
    }
  }

  /**
   * Clear all entities (for zone transitions)
   */
  clearEntities(): void {
    this.entitySprites.forEach((container) => {
      container.each((child: Phaser.GameObjects.GameObject) => {
        child.destroy();
      });
      container.removeAll(true);
      container.destroy();
    });
    this.entitySprites.clear();
    this.entityZoneMap.clear(); // Also clear zone tracking
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
      // Check if entity moved out of visibility range
      if (!this.isEntityVisible(changes.position)) {
        this.despawnEntity(entityId);
        return;
      }

      // Update stored position for future visibility checks
      container.setData('position', { ...changes.position });

      // Get elevation for the correct zone
      const elevation = this.getTileElevation(changes.position.x, changes.position.y, changes.position.zoneId);
      // Convert to world coordinates for EntityRenderer
      const { worldX, worldY } = this.positionToWorldCoords(changes.position);
      this.entityRenderer.updateEntityPosition(container, worldX, worldY, elevation);

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

    // Get elevation for the correct zone
    const elevation = this.getTileElevation(player.position.x, player.position.y, player.position.zoneId);
    const elevationOffset = elevation * 16; // ELEVATION_HEIGHT_STEP
    // Use world coordinates for screen position
    const { worldX, worldY } = this.positionToWorldCoords(player.position);
    const screenPos = this.isoTransform.gridToScreen(worldX, worldY);

    const container = this.add.container(screenPos.x, screenPos.y - elevationOffset);
    container.setData('gridX', worldX);
    container.setData('gridY', worldY);
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

    const depth = this.isoTransform.calculateDepth(worldX, worldY, elevation);
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

    // Get elevation for the correct zone
    const elevation = this.getTileElevation(position.x, position.y, position.zoneId);
    const elevationOffset = elevation * 16; // ELEVATION_HEIGHT_STEP
    // Use world coordinates for screen position
    const { worldX, worldY } = this.positionToWorldCoords(position);
    const screenPos = this.isoTransform.gridToScreen(worldX, worldY);

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
        sprite.setData('gridX', worldX);
        sprite.setData('gridY', worldY);
        sprite.setData('elevation', elevation);
        const depth = this.isoTransform!.calculateDepth(worldX, worldY, elevation);
        sprite.setDepth(depth);
      }
    });
  }

  updateLocalPlayerSprite(position: Position, reconciling = false): void {
    if (!this.localPlayer || !this.isoTransform) return;

    // Get elevation for the correct zone (handles race condition when zone:state arrives after position update)
    const elevation = this.getTileElevation(position.x, position.y, position.zoneId);
    const elevationOffset = elevation * 16; // ELEVATION_HEIGHT_STEP
    // Use world coordinates for screen position so player aligns with chunk positions
    const { worldX, worldY } = this.positionToWorldCoords(position);
    const screenPos = this.isoTransform.gridToScreen(worldX, worldY);
    const targetY = screenPos.y - elevationOffset;

    // Depth calculation closure: use current sprite Y during animation for correct sorting
    // sprite.y is visual position (elevated up by elevationOffset). Add it back to get
    // logical screen Y matching gridToScreen output for proper depth sorting.
    const updateDepthFromSpriteY = () => {
      const depthY = this.localPlayer!.y + elevationOffset;
      const depth = depthY + (worldX * 0.0001) + (elevation * 0.1) + 10;
      this.localPlayer!.setDepth(depth);
    };

    // Calculate tween duration and moveDelay based on destination tile's movementSpeed
    // This is the single source of truth - both keyboard and pathfinding use this
    let tweenDuration = MOVE_DELAY_MS - 20;
    let effectiveMoveDelay = MOVE_DELAY_MS;
    if (this.chunkManager) {
      const chunkX = Math.floor(worldX / ZONE_SIZE);
      const chunkY = Math.floor(worldY / ZONE_SIZE);
      const zoneId = `z_${chunkX}_${chunkY}`;
      const chunk = this.chunkManager.getChunk(zoneId);
      if (chunk?.data.tiles) {
        const localX = ((worldX % ZONE_SIZE) + ZONE_SIZE) % ZONE_SIZE;
        const localY = ((worldY % ZONE_SIZE) + ZONE_SIZE) % ZONE_SIZE;
        const tileNumericId = chunk.data.tiles[localY]?.[localX];
        if (tileNumericId !== undefined) {
          const tileId = tileIdToString(tileNumericId as TileId);
          const tileDef = TileRegistry.get(tileId);
          if (tileDef.movementSpeed > 0) {
            // Both tween and delay scale with tile speed
            effectiveMoveDelay = Math.round(MOVE_DELAY_MS / tileDef.movementSpeed);
            tweenDuration = effectiveMoveDelay - 20;
          }
        }
      }
    }
    // Update moveDelay for rate limiting (keyboard) and pathfinding timer
    this.moveDelay = effectiveMoveDelay;
    this.pathfindingController?.setMoveDelay(effectiveMoveDelay);

    if (reconciling) {
      // Reconciliation: only tween if server position differs from current visual position
      // If positions match, let the existing prediction tween continue uninterrupted
      if (this.localPlayer.x !== screenPos.x || this.localPlayer.y !== targetY) {
        this.tweens.killTweensOf(this.localPlayer);
        this.tweens.add({
          targets: this.localPlayer,
          x: screenPos.x,
          y: targetY,
          duration: 80,
          ease: 'Cubic.easeOut',
          onUpdate: updateDepthFromSpriteY,
        });
      }
      // If positions match, do nothing - prediction was correct
    } else {
      // Prediction: start tween to new position
      this.tweens.killTweensOf(this.localPlayer);
      this.tweens.add({
        targets: this.localPlayer,
        x: screenPos.x,
        y: targetY,
        duration: tweenDuration,
        ease: 'Linear',
        onUpdate: updateDepthFromSpriteY,
      });
    }

    // Update grid data (immediate - these are logical position, not visual)
    this.localPlayer.setData('gridX', worldX);
    this.localPlayer.setData('gridY', worldY);
    this.localPlayer.setData('elevation', elevation);
    // Set initial depth based on current visual position (onUpdate handles animation)
    updateDepthFromSpriteY();

    // Check if a pending zone transition should commit now that position has updated
    this.checkPendingZoneTransition(position);
  }

  updateLocalPlayer(position: Position): void {
    // Create player sprite if it doesn't exist
    if (!this.localPlayer) {
      this.createLocalPlayer(position);
      // Set up camera to follow player
      // Camera smoothly follows player with lerp (0.1, 0.1), creating a polished glide effect
      this.cameras.main.startFollow(this.localPlayer!, true, 0.1, 0.1);
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

  getChunkManager(): ChunkManager | null {
    return this.chunkManager;
  }

  /**
   * Enable or disable keyboard input.
   * Called by React UI panels to prevent movement while typing or browsing.
   */
  setKeyboardEnabled(enabled: boolean): void {
    if (this.input?.keyboard) {
      this.input.keyboard.enabled = enabled;
    }
  }

  /**
   * Check if a world coordinate tile is blocked.
   * Looks up the correct chunk from ChunkManager.
   * Returns true if blocked or if chunk not loaded (conservative).
   */
  isWorldTileBlocked(worldX: number, worldY: number): boolean {
    if (!this.chunkManager) return true; // No chunk manager = blocked

    // Calculate which chunk this tile belongs to
    const chunkX = Math.floor(worldX / ZONE_SIZE);
    const chunkY = Math.floor(worldY / ZONE_SIZE);
    const zoneId = `z_${chunkX}_${chunkY}`;

    // Get chunk data
    const chunk = this.chunkManager.getChunk(zoneId);
    if (!chunk?.data.collisions) return true; // Chunk not loaded = blocked (conservative)

    // Convert to chunk-local coordinates
    const localX = ((worldX % ZONE_SIZE) + ZONE_SIZE) % ZONE_SIZE;
    const localY = ((worldY % ZONE_SIZE) + ZONE_SIZE) % ZONE_SIZE;

    // 1. Terrain collision (existing logic)
    const terrainBlocked = chunk.data.collisions[localY]?.[localX] ?? true;
    if (terrainBlocked) return true;

    // 2. Entity blocking (EBLK-02)
    const entityAtTile = useEntityStore.getState().getEntityAtPosition(localX, localY, zoneId);
    if (entityAtTile) return true;

    return false;
  }

  setCollisionMap(collisionMap: boolean[][]): void {
    this.collisionMap = collisionMap;
    if (this.movementController) {
      this.movementController.setCollisionMap(collisionMap);
    }
  }

  shutdown(): void {
    if (this.pathfindingController) {
      this.pathfindingController.destroy();
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
    this.chunkTiles.forEach(tiles => tiles.forEach(tile => tile.destroy(true)));
    this.chunkTiles.clear();
    this.tileSprites = [];
    this.lastCullBounds = null;
  }
}
