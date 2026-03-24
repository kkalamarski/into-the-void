import Phaser from 'phaser';
import { TileId, tileIdToString } from '@into-the-void/world-gen';
import { TileRegistry, ALL_TILES } from '@into-the-void/tiles';
import { useMapStore, EMPTY_TILE } from '../store/mapStore';
import { useEditorStore } from '../store/editorStore';

// Constants matching the game renderer
const ISO_TILE_WIDTH = 256;
const ISO_TILE_HEIGHT = 128;
const ELEVATION_HEIGHT_STEP = 64;
const SPRITE_SIZE = 256;
const SPRITE_ORIGIN_X = 0.5;
const SPRITE_ORIGIN_Y = 0.25;

// Elevation tinting
const ELEVATION_TINT_BASE = 0.55;
const ELEVATION_TINT_STEP = 0.15;

// Grid overlay
const GRID_COLOR = 0x444466;
const GRID_ALPHA = 0.3;
const HOVER_COLOR = 0x4ecdc4;

/**
 * Texture mapping from TileId to texture key
 */
const TILE_TEXTURE_MAP: Record<TileId, string> = {
  [TileId.VOID_FLOOR]: 'tile_void_floor',
  [TileId.VOID_WALL]: 'tile_void_wall',
  [TileId.CRYSTAL_FLOOR]: 'tile_crystal_floor',
  [TileId.CRYSTAL_FORMATION]: 'tile_crystal_formation',
  [TileId.TOXIC_FLOOR]: 'tile_toxic_floor',
  [TileId.TOXIC_POOL]: 'tile_toxic_pool',
  [TileId.RUINS_FLOOR]: 'tile_ruins_floor',
  [TileId.RUINS_WALL]: 'tile_ruins_wall',
  [TileId.ICE_FLOOR]: 'tile_ice_floor',
  [TileId.ICE_WALL]: 'tile_ice_wall',
  [TileId.VOLCANIC_FLOOR]: 'tile_volcanic_floor',
  [TileId.LAVA]: 'tile_lava',
  [TileId.FUNGAL_FLOOR]: 'tile_fungal_floor',
  [TileId.FUNGAL_GROWTH]: 'tile_fungal_growth',
  [TileId.CRATER_FLOOR]: 'tile_crater_floor',
  [TileId.CRATER_DEBRIS]: 'tile_crater_debris',
  [TileId.PORTAL]: 'tile_portal',
  [TileId.TIDAL_FLOOR]: 'tile_tidal_floor',
  [TileId.TIDAL_SHALLOW]: 'tile_tidal_shallow',
  [TileId.KELP_FLOOR]: 'tile_kelp_floor',
  [TileId.KELP_WALL]: 'tile_kelp_wall',
  [TileId.TRENCH_FLOOR]: 'tile_trench_floor',
  [TileId.TRENCH_DEEP]: 'tile_trench_deep',
  [TileId.SHORE_TRANSITION]: 'tile_shore',
  // Exotic biomes (Phase 141)
  [TileId.VOID_RIFT_FLOOR]: 'tile_void_rift_floor',
  [TileId.VOID_RIFT_DISTORTION]: 'tile_void_rift_distortion',
  [TileId.CRYSTALLINE_FLOOR]: 'tile_crystalline_floor',
  [TileId.CRYSTAL_FORMATION_LARGE]: 'tile_crystal_formation_large',
  [TileId.BIOLUMINESCENT_FLOOR]: 'tile_bioluminescent_floor',
  [TileId.BIOLUMINESCENT_FLORA]: 'tile_bioluminescent_flora',
  // Hub Stations — Canopy (Verdant)
  [TileId.CANOPY_FLOOR]: 'tile_canopy_floor',
  [TileId.CANOPY_WALL]: 'tile_canopy_wall',
  [TileId.CANOPY_DOOR]: 'tile_canopy_door',
  [TileId.CANOPY_CORRIDOR]: 'tile_canopy_corridor',
  [TileId.CANOPY_DECORATION]: 'tile_canopy_decoration',
  [TileId.CANOPY_ACCENT]: 'tile_canopy_accent',
  [TileId.CANOPY_WINDOW]: 'tile_canopy_window',
  [TileId.CANOPY_HAZARD]: 'tile_canopy_hazard',
  // Hub Stations — Ironhold (Helix)
  [TileId.IRONHOLD_FLOOR]: 'tile_ironhold_floor',
  [TileId.IRONHOLD_WALL]: 'tile_ironhold_wall',
  [TileId.IRONHOLD_DOOR]: 'tile_ironhold_door',
  [TileId.IRONHOLD_CORRIDOR]: 'tile_ironhold_corridor',
  [TileId.IRONHOLD_DECORATION]: 'tile_ironhold_decoration',
  [TileId.IRONHOLD_ACCENT]: 'tile_ironhold_accent',
  [TileId.IRONHOLD_WINDOW]: 'tile_ironhold_window',
  [TileId.IRONHOLD_HAZARD]: 'tile_ironhold_hazard',
  // Hub Stations — Meridian (Nexus)
  [TileId.MERIDIAN_FLOOR]: 'tile_meridian_floor',
  [TileId.MERIDIAN_WALL]: 'tile_meridian_wall',
  [TileId.MERIDIAN_DOOR]: 'tile_meridian_door',
  [TileId.MERIDIAN_CORRIDOR]: 'tile_meridian_corridor',
  [TileId.MERIDIAN_DECORATION]: 'tile_meridian_decoration',
  [TileId.MERIDIAN_ACCENT]: 'tile_meridian_accent',
  [TileId.MERIDIAN_WINDOW]: 'tile_meridian_window',
  [TileId.MERIDIAN_HAZARD]: 'tile_meridian_hazard',
  // Hub Stations — Salvage (Unaffiliated)
  [TileId.SALVAGE_FLOOR]: 'tile_salvage_floor',
  [TileId.SALVAGE_WALL]: 'tile_salvage_wall',
  [TileId.SALVAGE_DOOR]: 'tile_salvage_door',
  [TileId.SALVAGE_CORRIDOR]: 'tile_salvage_corridor',
  [TileId.SALVAGE_DECORATION]: 'tile_salvage_decoration',
  [TileId.SALVAGE_ACCENT]: 'tile_salvage_accent',
  [TileId.SALVAGE_WINDOW]: 'tile_salvage_window',
  [TileId.SALVAGE_HAZARD]: 'tile_salvage_hazard',
};

export class EditorScene extends Phaser.Scene {
  private tileContainer!: Phaser.GameObjects.Container;
  private gridOverlay!: Phaser.GameObjects.Graphics;
  private hoverHighlight!: Phaser.GameObjects.Graphics;
  private spawnPointsContainer!: Phaser.GameObjects.Container;
  private collisionOverlay!: Phaser.GameObjects.Container;

  // Track tile objects by position for efficient updates
  private tileObjects: Map<string, Phaser.GameObjects.GameObject> = new Map();

  private isDragging = false;
  private isPanning = false;
  private lastPanPosition = { x: 0, y: 0 };
  private hoveredTile: { x: number; y: number } | null = null;

  constructor() {
    super({ key: 'EditorScene' });
  }

  preload(): void {
    // Load all tile textures from the game assets
    for (const tile of ALL_TILES) {
      const key = tile.textureKey;
      this.load.image(key, `/assets/sprites/${key}.png`);
      // Also load variants for floor tiles
      if (key.endsWith('_floor')) {
        this.load.image(`${key}_v2`, `/assets/sprites/${key}_v2.png`);
        this.load.image(`${key}_v3`, `/assets/sprites/${key}_v3.png`);
      }
    }
  }

  create(): void {
    // Container for tile sprites
    this.tileContainer = this.add.container(0, 0);

    // Grid overlay
    this.gridOverlay = this.add.graphics();
    this.gridOverlay.setDepth(10000);

    // Hover highlight
    this.hoverHighlight = this.add.graphics();
    this.hoverHighlight.setDepth(10001);

    // Spawn points container
    this.spawnPointsContainer = this.add.container(0, 0);
    this.spawnPointsContainer.setDepth(10002);

    // Collision overlay container
    this.collisionOverlay = this.add.container(0, 0);
    this.collisionOverlay.setDepth(10003);

    // Initial camera position (center of 64x64 map)
    const centerScreen = this.gridToScreen(32, 32);
    this.cameras.main.centerOn(centerScreen.x, centerScreen.y);
    this.cameras.main.setZoom(0.5);

    // Input handling
    this.setupInput();

    // Initial render
    this.refreshMap();

    // Subscribe to store changes
    useEditorStore.subscribe((state, prevState) => {
      if (state.showGrid !== prevState.showGrid) {
        this.drawGrid();
      }
      if (state.showSpawnPoints !== prevState.showSpawnPoints) {
        this.drawSpawnPoints();
      }
      if (state.showCollisions !== prevState.showCollisions) {
        this.drawCollisions();
      }
      if (state.flatMode !== prevState.flatMode) {
        this.refreshMap();
      }
    });
  }

  private setupInput(): void {
    // Mouse move for hover
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.isPanning) {
        const dx = pointer.x - this.lastPanPosition.x;
        const dy = pointer.y - this.lastPanPosition.y;
        this.cameras.main.scrollX -= dx / this.cameras.main.zoom;
        this.cameras.main.scrollY -= dy / this.cameras.main.zoom;
        this.lastPanPosition = { x: pointer.x, y: pointer.y };
        return;
      }

      const worldPos = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      const tile = this.screenToTile(worldPos.x, worldPos.y);

      const mapStore = useMapStore.getState();
      if (tile.x >= 0 && tile.x < mapStore.width && tile.y >= 0 && tile.y < mapStore.height) {
        this.hoveredTile = tile;
        this.drawHoverHighlight(tile.x, tile.y);
        this.game.events.emit('tileHover', tile);

        // Paint while dragging
        if (this.isDragging) {
          this.handleTileAction(tile.x, tile.y);
        }
      } else {
        this.hoveredTile = null;
        this.hoverHighlight.clear();
        this.game.events.emit('tileHover', null);
      }
    });

    // Mouse down
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      // Middle mouse or right mouse for panning
      if (pointer.middleButtonDown() || pointer.rightButtonDown()) {
        this.isPanning = true;
        this.lastPanPosition = { x: pointer.x, y: pointer.y };
        return;
      }

      // Left click for tool action
      if (pointer.leftButtonDown() && this.hoveredTile) {
        this.isDragging = true;
        this.handleTileAction(this.hoveredTile.x, this.hoveredTile.y);
      }
    });

    // Mouse up
    this.input.on('pointerup', () => {
      this.isDragging = false;
      this.isPanning = false;
    });

    // Mouse wheel: zoom (normal), horizontal scroll (shift), vertical scroll (cmd/ctrl)
    this.input.on('wheel', (pointer: Phaser.Input.Pointer, _gameObjects: unknown[], _dx: number, dy: number) => {
      const shiftDown = this.input.keyboard?.checkDown(this.input.keyboard.addKey('SHIFT'));
      const cmdDown = pointer.event.metaKey || pointer.event.ctrlKey;

      if (shiftDown) {
        // Horizontal scroll with shift+wheel
        this.cameras.main.scrollX += dy * 0.5;
      } else if (cmdDown) {
        // Vertical scroll with cmd/ctrl+wheel
        this.cameras.main.scrollY += dy * 0.5;
      } else {
        // Normal zoom
        const currentZoom = this.cameras.main.zoom;
        const newZoom = Phaser.Math.Clamp(currentZoom - dy * 0.001, 0.1, 2);
        this.cameras.main.setZoom(newZoom);
      }
    });

    // Keyboard shortcuts for tools
    this.input.keyboard?.on('keydown-P', () => useEditorStore.getState().setTool('paint'));
    this.input.keyboard?.on('keydown-F', () => useEditorStore.getState().setTool('fill'));
    this.input.keyboard?.on('keydown-I', () => useEditorStore.getState().setTool('eyedropper'));
    this.input.keyboard?.on('keydown-E', () => useEditorStore.getState().setTool('eraser'));
    this.input.keyboard?.on('keydown-H', () => useEditorStore.getState().setTool('elevation'));
    this.input.keyboard?.on('keydown-C', () => useEditorStore.getState().setTool('collision'));
    this.input.keyboard?.on('keydown-S', () => useEditorStore.getState().setTool('stack'));
    this.input.keyboard?.on('keydown-G', () => useEditorStore.getState().toggleGrid());
  }

  private handleTileAction(x: number, y: number): void {
    const editorStore = useEditorStore.getState();
    const mapStore = useMapStore.getState();
    const tool = editorStore.tool;

    switch (tool) {
      case 'paint':
        this.paintTile(x, y, editorStore.selectedTileId, editorStore.paintElevation);
        break;
      case 'fill':
        mapStore.floodFill(x, y, editorStore.selectedTileId);
        this.refreshMap();
        break;
      case 'eyedropper': {
        const tileId = mapStore.getTile(x, y);
        const height = mapStore.getHeight(x, y);
        if (tileId !== null) {
          editorStore.setSelectedTileId(tileId);
        }
        if (height !== null) {
          editorStore.setPaintElevation(height);
        }
        break;
      }
      case 'eraser':
        this.eraseTile(x, y);
        break;
      case 'elevation': {
        const currentHeight = mapStore.getHeight(x, y) ?? 0;
        const delta = this.input.keyboard?.checkDown(this.input.keyboard.addKey('SHIFT')) ? -1 : 1;
        mapStore.setHeight(x, y, currentHeight + delta);
        this.refreshMap();
        break;
      }
      case 'collision': {
        // Toggle collision at this position
        const currentCollision = mapStore.collisions[y]?.[x] ?? false;
        mapStore.setCollision(x, y, !currentCollision);
        this.drawCollisions();
        break;
      }
      case 'stack': {
        // Stack a tile on top of existing tiles at this position
        const tileId = editorStore.selectedTileId;
        const elevation = editorStore.paintElevation;
        const stringId = tileIdToString(tileId);

        console.log('[Stack] Adding tile:', { x, y, stringId, elevation, tileId });

        // Shift-click to remove stacked tile at current elevation
        if (this.input.keyboard?.checkDown(this.input.keyboard.addKey('SHIFT'))) {
          mapStore.removeStackedTile(x, y, elevation);
        } else {
          mapStore.addStackedTile(x, y, stringId, elevation);
        }

        const updatedStructures = useMapStore.getState().structures;
        console.log('[Stack] Structures after add:', updatedStructures.length, updatedStructures);
        this.refreshMap();
        console.log('[Stack] After refreshMap, structures:', useMapStore.getState().structures.length);
        break;
      }
    }
  }

  private paintTile(x: number, y: number, tileId: TileId, elevation: number): void {
    const mapStore = useMapStore.getState();

    // Check if anything actually changes
    const currentTile = mapStore.getTile(x, y);
    const currentHeight = mapStore.getHeight(x, y);

    if (currentTile === tileId && currentHeight === elevation) {
      return; // No change needed
    }

    // Update tile and/or height
    if (currentTile !== tileId) {
      mapStore.setTile(x, y, tileId);
    }
    if (currentHeight !== elevation) {
      mapStore.setHeight(x, y, elevation);
    }

    // Refresh only the affected tile
    this.renderTile(x, y);
  }

  private eraseTile(x: number, y: number): void {
    const mapStore = useMapStore.getState();
    const currentTile = mapStore.getTile(x, y);

    if (currentTile === EMPTY_TILE) {
      return; // Already empty
    }

    mapStore.setTile(x, y, EMPTY_TILE);
    mapStore.setHeight(x, y, 0);

    // Refresh to show transparency
    this.renderTile(x, y);
  }

  refreshMap(): void {
    this.tileContainer.removeAll(true);
    this.tileObjects.clear();

    const mapStore = useMapStore.getState();
    const { width, height } = mapStore;

    // Render all base tiles
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        this.renderTile(x, y);
      }
    }

    // Render stacked tiles from structures
    this.renderStackedTiles();

    // Draw overlays
    this.drawGrid();
    this.drawSpawnPoints();
    this.drawCollisions();
  }

  private renderTile(x: number, y: number): void {
    const mapStore = useMapStore.getState();
    const tileId = mapStore.tiles[y]?.[x];
    const elevation = mapStore.heights[y]?.[x] ?? 0;

    if (tileId === undefined) return;

    // Remove existing tile at this position
    const key = `${x},${y}`;
    const existingTile = this.tileObjects.get(key);
    if (existingTile) {
      existingTile.destroy();
      this.tileObjects.delete(key);
    }

    const screenPos = this.gridToScreen(x, y);
    const elevationOffset = elevation * ELEVATION_HEIGHT_STEP;

    // Handle empty/deleted tiles with checkerboard pattern
    if (tileId === EMPTY_TILE) {
      const checker = this.createCheckerboardTile(x, y);
      checker.setDepth(screenPos.y + (x * 0.0001));
      this.tileContainer.add(checker);
      this.tileObjects.set(key, checker);
      return;
    }

    // Check if flat mode is enabled
    const flatMode = useEditorStore.getState().flatMode;
    let sprite: Phaser.GameObjects.Image | Phaser.GameObjects.Graphics;

    if (flatMode) {
      // Flat mode: render only top diamond face
      sprite = this.createFlatTile(x, y, tileId as TileId, elevation);
    } else {
      // 3D mode: render full cube sprite
      const textureKey = TILE_TEXTURE_MAP[tileId as TileId] ?? 'tile_void_floor';

      if (this.textures.exists(textureKey)) {
        sprite = this.add.image(screenPos.x, screenPos.y - elevationOffset, textureKey);
        sprite.setOrigin(SPRITE_ORIGIN_X, SPRITE_ORIGIN_Y);
        sprite.setDisplaySize(SPRITE_SIZE, SPRITE_SIZE);

        // Apply elevation tint
        const brightness = Math.min(1.0, ELEVATION_TINT_BASE + elevation * ELEVATION_TINT_STEP);
        const tintValue = Math.floor(brightness * 255);
        const tint = (tintValue << 16) | (tintValue << 8) | tintValue;
        sprite.setTint(tint);
      } else {
        // Fallback colored cube
        sprite = this.createFallbackCube(x, y, tileId as TileId, elevation);
      }
    }

    // Calculate depth for proper sorting
    const depth = screenPos.y + (x * 0.0001) + (elevation * 0.1);
    sprite.setDepth(depth);

    // Track the tile object
    this.tileObjects.set(key, sprite);

    this.tileContainer.add(sprite);
  }

  private renderStackedTiles(): void {
    const mapStore = useMapStore.getState();
    const flatMode = useEditorStore.getState().flatMode;

    console.log('[renderStackedTiles] Rendering', mapStore.structures.length, 'structures');

    // Iterate through all structures and render their tiles
    for (const structure of mapStore.structures) {
      console.log('[renderStackedTiles] Structure:', structure);
      for (const tile of structure.tiles) {
        const { x, y, tileId, height } = tile;
        const screenPos = this.gridToScreen(x, y);
        const elevationOffset = height * ELEVATION_HEIGHT_STEP;

        // Generate unique key for stacked tile (includes height to differentiate from base)
        const key = `stack_${x},${y},${height}`;

        // Look up tile definition
        const tileDef = TileRegistry.get(tileId);
        console.log('[renderStackedTiles] TileDef for', tileId, ':', tileDef.id, tileDef.textureKey);
        // TileRegistry.get always returns a tile (unknown fallback if not found)
        // Skip if it's the unknown fallback
        if (tileDef.id === 'unknown') {
          console.warn('[renderStackedTiles] Unknown tile ID:', tileId);
          continue;
        }

        let sprite: Phaser.GameObjects.Image | Phaser.GameObjects.Graphics;

        if (flatMode) {
          // Flat mode: render only top diamond face
          sprite = this.createFlatTileByStringId(x, y, tileId, height);
        } else {
          // 3D mode: render full cube sprite
          const textureKey = tileDef.textureKey;

          if (this.textures.exists(textureKey)) {
            sprite = this.add.image(screenPos.x, screenPos.y - elevationOffset, textureKey);
            sprite.setOrigin(SPRITE_ORIGIN_X, SPRITE_ORIGIN_Y);
            sprite.setDisplaySize(SPRITE_SIZE, SPRITE_SIZE);

            // Apply elevation tint
            const brightness = Math.min(1.0, ELEVATION_TINT_BASE + height * ELEVATION_TINT_STEP);
            const tintValue = Math.floor(brightness * 255);
            const tint = (tintValue << 16) | (tintValue << 8) | tintValue;
            sprite.setTint(tint);
          } else {
            // Fallback colored cube
            sprite = this.createFallbackCubeByStringId(x, y, tileId, height);
          }
        }

        // Calculate depth - stacked tiles should be on top
        const depth = screenPos.y + (x * 0.0001) + (height * 0.1) + 0.01;
        sprite.setDepth(depth);

        console.log('[renderStackedTiles] Created sprite at', { x, y, height, depth, screenPos });

        // Track the stacked tile object
        this.tileObjects.set(key, sprite);
        this.tileContainer.add(sprite);
      }
    }
  }

  private createFlatTileByStringId(x: number, y: number, tileId: string, elevation: number): Phaser.GameObjects.Graphics {
    const screenPos = this.gridToScreen(x, y);
    const elevationOffset = elevation * ELEVATION_HEIGHT_STEP;
    const halfWidth = ISO_TILE_WIDTH / 2;
    const halfHeight = ISO_TILE_HEIGHT / 2;

    const tileDef = TileRegistry.get(tileId);
    const color = tileDef?.color ?? 0x888888;

    const graphics = this.add.graphics();

    // Apply elevation tint
    const brightness = Math.min(1.0, ELEVATION_TINT_BASE + elevation * ELEVATION_TINT_STEP);
    const r = ((color >> 16) & 0xff) * brightness;
    const g = ((color >> 8) & 0xff) * brightness;
    const b = (color & 0xff) * brightness;
    const tintedColor = (Math.floor(r) << 16) | (Math.floor(g) << 8) | Math.floor(b);

    // Draw only the top diamond face
    graphics.fillStyle(tintedColor, 1);
    graphics.beginPath();
    graphics.moveTo(screenPos.x, screenPos.y - elevationOffset - halfHeight);
    graphics.lineTo(screenPos.x + halfWidth, screenPos.y - elevationOffset);
    graphics.lineTo(screenPos.x, screenPos.y - elevationOffset + halfHeight);
    graphics.lineTo(screenPos.x - halfWidth, screenPos.y - elevationOffset);
    graphics.closePath();
    graphics.fillPath();

    // Add subtle border for tile edges
    graphics.lineStyle(1, 0x000000, 0.15);
    graphics.beginPath();
    graphics.moveTo(screenPos.x, screenPos.y - elevationOffset - halfHeight);
    graphics.lineTo(screenPos.x + halfWidth, screenPos.y - elevationOffset);
    graphics.lineTo(screenPos.x, screenPos.y - elevationOffset + halfHeight);
    graphics.lineTo(screenPos.x - halfWidth, screenPos.y - elevationOffset);
    graphics.closePath();
    graphics.strokePath();

    // Draw elevation guidelines if elevated
    if (elevation > 0) {
      graphics.lineStyle(1, 0x666688, 0.4);

      // Vertical lines from each corner of elevated tile to ground level
      graphics.beginPath();
      graphics.moveTo(screenPos.x - halfWidth, screenPos.y - elevationOffset);
      graphics.lineTo(screenPos.x - halfWidth, screenPos.y);
      graphics.strokePath();

      graphics.beginPath();
      graphics.moveTo(screenPos.x, screenPos.y - elevationOffset + halfHeight);
      graphics.lineTo(screenPos.x, screenPos.y + halfHeight);
      graphics.strokePath();

      graphics.beginPath();
      graphics.moveTo(screenPos.x + halfWidth, screenPos.y - elevationOffset);
      graphics.lineTo(screenPos.x + halfWidth, screenPos.y);
      graphics.strokePath();

      // Draw ground-level diamond outline
      graphics.lineStyle(1, 0x444466, 0.3);
      graphics.beginPath();
      graphics.moveTo(screenPos.x, screenPos.y - halfHeight);
      graphics.lineTo(screenPos.x + halfWidth, screenPos.y);
      graphics.lineTo(screenPos.x, screenPos.y + halfHeight);
      graphics.lineTo(screenPos.x - halfWidth, screenPos.y);
      graphics.closePath();
      graphics.strokePath();
    }

    return graphics;
  }

  private createFallbackCubeByStringId(x: number, y: number, tileId: string, elevation: number): Phaser.GameObjects.Graphics {
    const screenPos = this.gridToScreen(x, y);
    const elevationOffset = elevation * ELEVATION_HEIGHT_STEP;

    const halfWidth = ISO_TILE_WIDTH / 2;
    const halfHeight = ISO_TILE_HEIGHT / 2;
    const sideHeight = halfHeight;

    const tileDef = TileRegistry.get(tileId);
    const color = tileDef?.color ?? 0x888888;

    const graphics = this.add.graphics();
    graphics.setPosition(screenPos.x, screenPos.y - elevationOffset);

    // Calculate darker shades for sides
    const r = (color >> 16) & 0xff;
    const g = (color >> 8) & 0xff;
    const b = color & 0xff;
    const southColor = ((r * 0.6) << 16) | ((g * 0.6) << 8) | (b * 0.6);
    const eastColor = ((r * 0.4) << 16) | ((g * 0.4) << 8) | (b * 0.4);

    // South face (left side)
    graphics.fillStyle(southColor, 1);
    graphics.beginPath();
    graphics.moveTo(0, halfHeight);
    graphics.lineTo(-halfWidth, 0);
    graphics.lineTo(-halfWidth, sideHeight);
    graphics.lineTo(0, halfHeight + sideHeight);
    graphics.closePath();
    graphics.fillPath();

    // East face (right side)
    graphics.fillStyle(eastColor, 1);
    graphics.beginPath();
    graphics.moveTo(0, halfHeight);
    graphics.lineTo(halfWidth, 0);
    graphics.lineTo(halfWidth, sideHeight);
    graphics.lineTo(0, halfHeight + sideHeight);
    graphics.closePath();
    graphics.fillPath();

    // Top face (diamond)
    graphics.fillStyle(color, 1);
    graphics.beginPath();
    graphics.moveTo(0, -halfHeight);
    graphics.lineTo(halfWidth, 0);
    graphics.lineTo(0, halfHeight);
    graphics.lineTo(-halfWidth, 0);
    graphics.closePath();
    graphics.fillPath();

    return graphics;
  }

  private createFlatTile(x: number, y: number, tileId: TileId, elevation: number): Phaser.GameObjects.Graphics {
    const screenPos = this.gridToScreen(x, y);
    const elevationOffset = elevation * ELEVATION_HEIGHT_STEP;
    const halfWidth = ISO_TILE_WIDTH / 2;
    const halfHeight = ISO_TILE_HEIGHT / 2;

    const stringId = tileIdToString(tileId);
    const tileDef = TileRegistry.get(stringId);
    const color = tileDef.color;

    const graphics = this.add.graphics();

    // Apply elevation tint
    const brightness = Math.min(1.0, ELEVATION_TINT_BASE + elevation * ELEVATION_TINT_STEP);
    const r = ((color >> 16) & 0xff) * brightness;
    const g = ((color >> 8) & 0xff) * brightness;
    const b = (color & 0xff) * brightness;
    const tintedColor = (Math.floor(r) << 16) | (Math.floor(g) << 8) | Math.floor(b);

    // Draw only the top diamond face
    graphics.fillStyle(tintedColor, 1);
    graphics.beginPath();
    graphics.moveTo(screenPos.x, screenPos.y - elevationOffset - halfHeight);
    graphics.lineTo(screenPos.x + halfWidth, screenPos.y - elevationOffset);
    graphics.lineTo(screenPos.x, screenPos.y - elevationOffset + halfHeight);
    graphics.lineTo(screenPos.x - halfWidth, screenPos.y - elevationOffset);
    graphics.closePath();
    graphics.fillPath();

    // Add subtle border for tile edges
    graphics.lineStyle(1, 0x000000, 0.15);
    graphics.beginPath();
    graphics.moveTo(screenPos.x, screenPos.y - elevationOffset - halfHeight);
    graphics.lineTo(screenPos.x + halfWidth, screenPos.y - elevationOffset);
    graphics.lineTo(screenPos.x, screenPos.y - elevationOffset + halfHeight);
    graphics.lineTo(screenPos.x - halfWidth, screenPos.y - elevationOffset);
    graphics.closePath();
    graphics.strokePath();

    // Draw elevation guidelines if elevated
    if (elevation > 0) {
      graphics.lineStyle(1, 0x666688, 0.4);

      // Vertical lines from each corner of elevated tile to ground level
      // Left corner
      graphics.beginPath();
      graphics.moveTo(screenPos.x - halfWidth, screenPos.y - elevationOffset);
      graphics.lineTo(screenPos.x - halfWidth, screenPos.y);
      graphics.strokePath();

      // Bottom corner
      graphics.beginPath();
      graphics.moveTo(screenPos.x, screenPos.y - elevationOffset + halfHeight);
      graphics.lineTo(screenPos.x, screenPos.y + halfHeight);
      graphics.strokePath();

      // Right corner
      graphics.beginPath();
      graphics.moveTo(screenPos.x + halfWidth, screenPos.y - elevationOffset);
      graphics.lineTo(screenPos.x + halfWidth, screenPos.y);
      graphics.strokePath();

      // Draw ground-level diamond outline (dashed effect with alpha)
      graphics.lineStyle(1, 0x444466, 0.3);
      graphics.beginPath();
      graphics.moveTo(screenPos.x, screenPos.y - halfHeight);
      graphics.lineTo(screenPos.x + halfWidth, screenPos.y);
      graphics.lineTo(screenPos.x, screenPos.y + halfHeight);
      graphics.lineTo(screenPos.x - halfWidth, screenPos.y);
      graphics.closePath();
      graphics.strokePath();
    }

    return graphics;
  }

  private createCheckerboardTile(x: number, y: number): Phaser.GameObjects.Graphics {
    const screenPos = this.gridToScreen(x, y);
    const halfWidth = ISO_TILE_WIDTH / 2;
    const halfHeight = ISO_TILE_HEIGHT / 2;

    const graphics = this.add.graphics();

    // Checkerboard pattern colors (dark gray / slightly lighter gray)
    const color1 = 0x1a1a1a;
    const color2 = 0x2a2a2a;
    const isEvenTile = (x + y) % 2 === 0;
    const color = isEvenTile ? color1 : color2;

    // Draw diamond shape
    graphics.fillStyle(color, 0.5); // 50% alpha for transparency effect
    graphics.beginPath();
    graphics.moveTo(screenPos.x, screenPos.y - halfHeight);
    graphics.lineTo(screenPos.x + halfWidth, screenPos.y);
    graphics.lineTo(screenPos.x, screenPos.y + halfHeight);
    graphics.lineTo(screenPos.x - halfWidth, screenPos.y);
    graphics.closePath();
    graphics.fillPath();

    // Add dashed border to indicate "empty"
    graphics.lineStyle(1, 0x666666, 0.5);
    graphics.beginPath();
    graphics.moveTo(screenPos.x, screenPos.y - halfHeight);
    graphics.lineTo(screenPos.x + halfWidth, screenPos.y);
    graphics.lineTo(screenPos.x, screenPos.y + halfHeight);
    graphics.lineTo(screenPos.x - halfWidth, screenPos.y);
    graphics.closePath();
    graphics.strokePath();

    return graphics;
  }

  private createFallbackCube(x: number, y: number, tileId: TileId, elevation: number): Phaser.GameObjects.Graphics {
    const screenPos = this.gridToScreen(x, y);
    const elevationOffset = elevation * ELEVATION_HEIGHT_STEP;

    const halfWidth = ISO_TILE_WIDTH / 2;
    const halfHeight = ISO_TILE_HEIGHT / 2;
    const sideHeight = halfHeight;

    const stringId = tileIdToString(tileId);
    const tileDef = TileRegistry.get(stringId);
    const color = tileDef.color;

    const graphics = this.add.graphics();
    graphics.setPosition(screenPos.x, screenPos.y - elevationOffset);

    // Calculate darker shades for sides
    const r = (color >> 16) & 0xff;
    const g = (color >> 8) & 0xff;
    const b = color & 0xff;
    const southColor = ((r * 0.6) << 16) | ((g * 0.6) << 8) | (b * 0.6);
    const eastColor = ((r * 0.4) << 16) | ((g * 0.4) << 8) | (b * 0.4);

    // South face (left side)
    graphics.fillStyle(southColor, 1);
    graphics.beginPath();
    graphics.moveTo(0, halfHeight);
    graphics.lineTo(-halfWidth, 0);
    graphics.lineTo(-halfWidth, sideHeight);
    graphics.lineTo(0, halfHeight + sideHeight);
    graphics.closePath();
    graphics.fillPath();

    // East face (right side)
    graphics.fillStyle(eastColor, 1);
    graphics.beginPath();
    graphics.moveTo(0, halfHeight);
    graphics.lineTo(halfWidth, 0);
    graphics.lineTo(halfWidth, sideHeight);
    graphics.lineTo(0, halfHeight + sideHeight);
    graphics.closePath();
    graphics.fillPath();

    // Top face (diamond)
    graphics.fillStyle(color, 1);
    graphics.beginPath();
    graphics.moveTo(0, -halfHeight);
    graphics.lineTo(halfWidth, 0);
    graphics.lineTo(0, halfHeight);
    graphics.lineTo(-halfWidth, 0);
    graphics.closePath();
    graphics.fillPath();

    return graphics;
  }

  private drawGrid(): void {
    this.gridOverlay.clear();

    if (!useEditorStore.getState().showGrid) return;

    const mapStore = useMapStore.getState();
    const { width, height } = mapStore;

    this.gridOverlay.lineStyle(1, GRID_COLOR, GRID_ALPHA);

    // Draw diamond grid
    for (let y = 0; y <= height; y++) {
      for (let x = 0; x <= width; x++) {
        const pos = this.gridToScreen(x, y);

        // Draw lines to adjacent tiles
        if (x < width) {
          const nextX = this.gridToScreen(x + 1, y);
          this.gridOverlay.lineBetween(pos.x, pos.y, nextX.x, nextX.y);
        }
        if (y < height) {
          const nextY = this.gridToScreen(x, y + 1);
          this.gridOverlay.lineBetween(pos.x, pos.y, nextY.x, nextY.y);
        }
      }
    }
  }

  private drawHoverHighlight(x: number, y: number): void {
    this.hoverHighlight.clear();

    const pos = this.gridToScreen(x, y);
    const halfWidth = ISO_TILE_WIDTH / 2;
    const halfHeight = ISO_TILE_HEIGHT / 2;

    this.hoverHighlight.lineStyle(2, HOVER_COLOR, 0.8);
    this.hoverHighlight.beginPath();
    this.hoverHighlight.moveTo(pos.x, pos.y - halfHeight);
    this.hoverHighlight.lineTo(pos.x + halfWidth, pos.y);
    this.hoverHighlight.lineTo(pos.x, pos.y + halfHeight);
    this.hoverHighlight.lineTo(pos.x - halfWidth, pos.y);
    this.hoverHighlight.closePath();
    this.hoverHighlight.strokePath();
  }

  private drawSpawnPoints(): void {
    this.spawnPointsContainer.removeAll(true);

    if (!useEditorStore.getState().showSpawnPoints) return;

    const mapStore = useMapStore.getState();
    const spawnPoints = mapStore.spawnPoints;

    for (const spawn of spawnPoints) {
      const pos = this.gridToScreen(spawn.x, spawn.y);
      const elevation = mapStore.heights[spawn.y]?.[spawn.x] ?? 0;
      const elevationOffset = elevation * ELEVATION_HEIGHT_STEP;

      // Draw spawn point marker
      const graphics = this.add.graphics();
      graphics.setPosition(pos.x, pos.y - elevationOffset - 32);

      // Circle with icon
      const color = spawn.entityType === 'creature' ? 0xe94560 : 0x4ecdc4;
      graphics.fillStyle(color, 0.8);
      graphics.fillCircle(0, 0, 16);

      // Add text label
      const label = this.add.text(pos.x, pos.y - elevationOffset - 48, spawn.spawnId.slice(0, 3).toUpperCase(), {
        fontSize: '10px',
        color: '#fff',
        align: 'center',
      });
      label.setOrigin(0.5, 0.5);

      this.spawnPointsContainer.add(graphics);
      this.spawnPointsContainer.add(label);
    }
  }

  private drawCollisions(): void {
    this.collisionOverlay.removeAll(true);

    if (!useEditorStore.getState().showCollisions) return;

    const mapStore = useMapStore.getState();
    const { collisions, width, height } = mapStore;

    const halfWidth = ISO_TILE_WIDTH / 2;
    const halfHeight = ISO_TILE_HEIGHT / 2;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (!collisions[y]?.[x]) continue;

        const pos = this.gridToScreen(x, y);
        const graphics = this.add.graphics();

        // Draw red X pattern over blocking tiles
        graphics.lineStyle(2, 0xff0000, 0.6);
        graphics.beginPath();
        // Diagonal from top-left to bottom-right of diamond
        graphics.moveTo(pos.x - halfWidth * 0.5, pos.y - halfHeight * 0.5);
        graphics.lineTo(pos.x + halfWidth * 0.5, pos.y + halfHeight * 0.5);
        graphics.strokePath();

        graphics.beginPath();
        // Diagonal from top-right to bottom-left of diamond
        graphics.moveTo(pos.x + halfWidth * 0.5, pos.y - halfHeight * 0.5);
        graphics.lineTo(pos.x - halfWidth * 0.5, pos.y + halfHeight * 0.5);
        graphics.strokePath();

        this.collisionOverlay.add(graphics);
      }
    }
  }

  // Coordinate conversion (isometric)
  private gridToScreen(gridX: number, gridY: number): { x: number; y: number } {
    return {
      x: (gridX - gridY) * (ISO_TILE_WIDTH / 2),
      y: (gridX + gridY) * (ISO_TILE_HEIGHT / 2),
    };
  }

  private screenToTile(screenX: number, screenY: number): { x: number; y: number } {
    const tileWidth = ISO_TILE_WIDTH;
    const tileHeight = ISO_TILE_HEIGHT;
    return {
      x: Math.floor(screenX / tileWidth + screenY / tileHeight),
      y: Math.floor(screenY / tileHeight - screenX / tileWidth),
    };
  }
}
