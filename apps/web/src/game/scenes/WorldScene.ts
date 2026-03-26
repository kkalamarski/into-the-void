import Phaser from 'phaser';
import { ZONE_SIZE, HYSTERESIS_TILES, Position, Entity, PlayerPublic, ChunkData, BiomeType, BiomeTier, TileStructure, isHubZone, TimingChallenge, BIOME_DISPLAY_NAMES, BIOME_TIERS, getZoneSize } from '@into-the-void/shared-types';
import { TILE_SIZE_PX, tileToPixelCenter } from '@into-the-void/game-logic';
import type { TileId } from '@into-the-void/world-gen';
import { TileRegistry } from '@into-the-void/tiles';
import { ELEVATION_HEIGHT_STEP } from '../constants/elevation';
import { TileRenderer } from '../rendering/TileRenderer';
import { ChunkManager } from '../rendering/ChunkManager';
import { ViewportCuller } from '../rendering/ViewportCuller';
import { CameraController, InputController, EntityManager, InteractionController } from './controllers';
import type { WorldSceneAccessor } from './controllers';
import { PixelMovementController } from '../systems/PixelMovementController';
import type { RemotePlayerInterpolator } from '../systems/RemotePlayerInterpolator';
import { IsometricTransform } from '../utils/IsometricTransform';
import { audioManager } from '../../utils/audio';
import { useGameStore } from '../../store/gameStore';
import { useEntityStore } from '../../store/entityStore';
import { useAbilityStore } from '../../store/abilityStore';
import type { FogManager } from '../fog/FogManager';
import type { FogRenderer } from '../fog/FogRenderer';
import type { PoiRenderer } from '../pois/PoiRenderer';
import { WeatherSystem } from '../systems/WeatherSystem';
import { DayNightCycle } from '../systems/DayNightCycle';
import { AtmosphereSystem } from '../systems/AtmosphereSystem';
import { DebugOverlay } from '../systems/DebugOverlay';
import { DebugCollisionRenderer } from '../systems/DebugCollisionRenderer';
import { gameSocket } from '../../network/socket';

export const ISO_TILE_WIDTH = 256;
export const ISO_TILE_HEIGHT = 128;
const HYSTERESIS_PX = HYSTERESIS_TILES * TILE_SIZE_PX;
const ENTITY_GROUND_OFFSET = 0;

const TIER_LABELS: Record<BiomeTier, string> = {
  1: 'Frontier',
  2: 'Hazardous',
  3: 'Hostile',
  4: 'Extreme',
};
const ZONE_CINEMATIC_COOLDOWN_MS = 30_000;

/**
 * WorldScene orchestrator — coordinates subsystem controllers.
 * Phase 152: decomposed from 2926-line god object into 4 controllers
 * (CameraController, InputController, EntityManager, InteractionController).
 */
export class WorldScene extends Phaser.Scene implements WorldSceneAccessor {
  // ── Subsystem controllers ─────────────────────────────────────────────
  private cameraController: CameraController | null = null;
  private inputController: InputController | null = null;
  private entityManager: EntityManager | null = null;
  private interactionController: InteractionController | null = null;

  // ── Tile rendering ────────────────────────────────────────────────────
  private tileLayer: Phaser.GameObjects.Container | null = null;
  private tileRenderer: TileRenderer | null = null;
  private chunkManager: ChunkManager | null = null;
  private chunkTiles: Map<string, Phaser.GameObjects.Container[]> = new Map();
  private viewportCuller: ViewportCuller | null = null;
  private lastCullBounds: { minTileX: number; maxTileX: number; minTileY: number; maxTileY: number } | null = null;
  private lastCullTime = 0;
  private cullInterval = 100;

  // ── Zone state ────────────────────────────────────────────────────────
  private currentZoneId: string = 'z_0_0';
  private lastRequestedZoneId: string | null = null;
  private pendingZoneId: string | null = null;
  private pendingBiome: BiomeType | null = null;
  private lastPendingZoneCheck = 0;
  private static readonly PENDING_ZONE_CHECK_INTERVAL = 100;
  private onChunkRequest: ((zoneId: string) => void) | null = null;
  private currentBiome: BiomeType = 'void_plains';
  private currentTiles: number[][] | null = null;
  private currentHeights: number[][] | null = null;
  private currentStructures: TileStructure[] = [];
  private collisionMap: boolean[][] | null = null;
  private zoneCinematicCooldowns: Map<string, number> = new Map();

  // ── Scene-owned systems ───────────────────────────────────────────────
  private isoTransform: IsometricTransform | null = null;
  // ZoneHUD removed — biome info shown via notification overlay and F3 debug
  private weatherSystem: WeatherSystem | null = null;
  private dayNightCycle: DayNightCycle | null = null;
  private atmosphereSystem: AtmosphereSystem | null = null;
  private pixelMovement: PixelMovementController | null = null;
  private debugOverlay: DebugOverlay | null = null;
  private debugCollisionRenderer: DebugCollisionRenderer | null = null;

  constructor() {
    super({ key: 'WorldScene' });
  }

  // ── Scene Lifecycle ───────────────────────────────────────────────────

  create(): void {
    this.tileLayer = this.add.container(0, 0);
    this.isoTransform = new IsometricTransform(ISO_TILE_WIDTH, ISO_TILE_HEIGHT);
    this.tileRenderer = new TileRenderer(this, ISO_TILE_WIDTH, ISO_TILE_HEIGHT);
    this.viewportCuller = new ViewportCuller(ISO_TILE_WIDTH, ISO_TILE_HEIGHT, 4);
    // Subsystem controllers
    this.cameraController = new CameraController(this);
    this.cameraController.create();

    this.entityManager = new EntityManager(this, this);
    this.entityManager.create(ISO_TILE_WIDTH, ISO_TILE_HEIGHT);

    this.inputController = new InputController(this);
    this.inputController.create();

    this.interactionController = new InteractionController(this, this.entityManager, this);
    this.interactionController.create();

    // Wire input events from InputController
    this.events.on('input:both-buttons', (pointer: Phaser.Input.Pointer) => {
      this.interactionController?.showTileInfo(pointer);
    });
    this.events.on('input:button-released', () => {
      this.interactionController?.hideTileInfo();
    });

    // Weather, day/night, atmosphere
    this.weatherSystem = new WeatherSystem(this);
    this.dayNightCycle = new DayNightCycle();
    this.dayNightCycle.create(this.cameras.main);
    this.atmosphereSystem = new AtmosphereSystem(this);
    this.dayNightCycle.setAtmosphereSystem(this.atmosphereSystem);

    // Pixel movement
    this.pixelMovement = new PixelMovementController();

    // Chunk manager
    this.chunkManager = new ChunkManager(
      (zoneId: string) => {
        if (this.onChunkRequest) {
          this.onChunkRequest(zoneId);
        } else {
          console.warn('[ChunkManager] No chunk request handler set!');
        }
      },
      (chunkData: ChunkData, biome: BiomeType) => {
        this.renderChunk(chunkData, biome);
      },
      (zoneId: string) => {
        this.unloadChunkContainer(zoneId);
      },
      (loadingCount: number) => {
        useGameStore.getState().setChunksLoading(loadingCount);
      }
    );

    // Sync server time for day/night cycle (DNTC-01)
    gameSocket.on('zone:state', (data: any) => {
      if (data.serverTime && this.dayNightCycle) {
        this.dayNightCycle.setServerTime(data.serverTime);
      }
    });

    // Debug overlay (F3 toggle) — position, performance, game state
    this.debugOverlay = new DebugOverlay(this, {
      getElevation: (tx, ty) => {
        // Use world-aware lookup for cross-chunk safety and correct coordinate mapping
        if (isHubZone(this.currentZoneId)) {
          return this.currentHeights?.[ty]?.[tx] ?? 0;
        }
        const zoneCoords = this.parseZoneCoords(this.currentZoneId);
        const currentSize = getZoneSize(this.currentZoneId);
        return this.getWorldTileHeight(zoneCoords.x * currentSize + tx, zoneCoords.y * currentSize + ty);
      },
      getTileType: (tx, ty) => {
        // Use world-aware lookup for cross-chunk safety and correct coordinate mapping
        if (isHubZone(this.currentZoneId)) {
          return this.currentTiles?.[ty]?.[tx] ?? 0;
        }
        const zoneCoords = this.parseZoneCoords(this.currentZoneId);
        const currentSize = getZoneSize(this.currentZoneId);
        const r = this.resolveWorldToChunkLocal(zoneCoords.x * currentSize + tx, zoneCoords.y * currentSize + ty);
        return r?.chunk?.tiles?.[r.localY]?.[r.localX] ?? 0;
      },
      getDayNightPhase: () => this.dayNightCycle?.getCurrentPhase() ?? 'Day',
      getDayNightProgress: () => this.dayNightCycle ? Math.round(this.dayNightCycle.getCycleProgress() * 100) : 0,
      getChunkCounts: () => this.chunkManager?.getChunkStats() ?? { loaded: 0, pending: 0, failed: 0 },
      getBiomeName: () => BIOME_DISPLAY_NAMES[this.currentBiome] ?? this.currentBiome,
      getPlayerPixelPos: () => this.pixelMovement?.getPosition() ?? null,
    });

    // Debug collision renderer — blocking tiles, walls, feature hitboxes
    this.debugCollisionRenderer = new DebugCollisionRenderer(this, {
      getCollisionMap: () => this.collisionMap,
      getHeights: () => this.currentHeights,
      getStructures: () => this.currentStructures.flatMap(s =>
        s.tiles.map(t => ({ x: t.x, y: t.y, type: s.type, height: t.height }))
      ),
      getEntityContainers: () => this.entityManager?.getEntitySprites() ?? new Map(),
      getIsoTransform: () => this.isoTransform!,
      getZoneWorldOffset: () => {
        const coords = this.parseZoneCoords(this.currentZoneId);
        return { x: coords.x * ZONE_SIZE, y: coords.y * ZONE_SIZE };
      },
    });

    // Wire F3 toggle to both debug systems
    this.events.on('input:toggle-debug', () => {
      this.debugOverlay?.toggle();
      if (this.debugOverlay?.isVisible()) {
        this.debugCollisionRenderer?.show();
      } else {
        this.debugCollisionRenderer?.hide();
      }
    });

    // Start background music
    audioManager.startMusic('/assets/music/freesound_community-ethereal-ambient-music-55115.mp3');
  }

  update(time: number, delta: number): void {
    this.handleInput(time, delta);

    // Throttled viewport culling
    if (time - this.lastCullTime >= this.cullInterval) {
      this.lastCullTime = time;
      this.updateVisibleTiles();
    }

    // Entity depth sorting + remote player interpolation
    this.entityManager?.update(time, delta);

    // Day/night cycle
    if (this.dayNightCycle) {
      this.dayNightCycle.update();
      const phase = this.dayNightCycle.getCurrentPhase();
      const store = useGameStore.getState();
      if (store.dayNightPhase !== phase) {
        store.setDayNightPhase(phase);
      }
    }

    // Animate liquid tiles — wind-driven directional waves
    this.updateLiquidWaves(time, delta);

    // Debug overlay + collision visualization (zero cost when hidden)
    this.debugOverlay?.update();
    this.debugCollisionRenderer?.update();
  }

  // ── Input Handling ────────────────────────────────────────────────────

  private handleInput(time: number, delta: number): void {
    const localPlayer = this.entityManager?.getLocalPlayer();
    if (!localPlayer || !this.pixelMovement || !this.inputController) return;

    const player = useGameStore.getState().player;
    if (player?.isDead) return;

    const keys = this.inputController.getMovementKeys();
    const anyKeyDown = keys.W || keys.A || keys.S || keys.D;

    // Cancel cast on movement
    if (anyKeyDown && useAbilityStore.getState().isCasting()) {
      gameSocket.emit('cast:cancel', {});
      useAbilityStore.getState().clearCast();
    }

    const dt = delta / 1000;
    const result = this.pixelMovement.update(dt, keys, time);

    if (result.moved) {
      this.entityManager!.setLastMovementTime(time);

      if (result.direction) {
        this.entityManager!.setLocalPlayerFacing(result.direction);
      }

      const isMoving = localPlayer.getData('isMoving') as boolean;
      if (!isMoving) {
        this.entityManager!.startPlayerAnimation(this.entityManager!.getLocalPlayerFacing());
      } else if (result.direction) {
        const sprite = localPlayer.getData('characterSprite') as Phaser.GameObjects.Sprite | undefined;
        if (sprite) {
          const animKey = `character-run-${this.entityManager!.getLocalPlayerFacing()}`;
          if (sprite.anims.currentAnim?.key !== animKey) {
            sprite.play(animKey);
          }
        }
      }

      this.entityManager!.updateLocalPlayerFromPixels(result.px, result.py);

      // Update interaction state (range indicator, NPC proximity)
      this.interactionController?.update(result.px, result.py);

      // Check zone transition at pixel granularity
      this.checkPixelZoneTransition(result.px, result.py);

      // Check portal tile
      const tileX = Math.floor(result.px / TILE_SIZE_PX);
      const tileY = Math.floor(result.py / TILE_SIZE_PX);
      this.interactionController?.checkPortalTileAtPixels(tileX, tileY);
    }

    if (!anyKeyDown) {
      const isMoving = localPlayer.getData('isMoving') as boolean;
      if (isMoving) {
        this.entityManager!.stopPlayerAnimation();
      }
    }
  }

  // ── Zone Management ───────────────────────────────────────────────────

  setChunkRequestHandler(handler: (zoneId: string) => void): void {
    this.onChunkRequest = handler;
  }

  loadZoneFromState(chunkData: ChunkData, biome: BiomeType): void {
    this.currentZoneId = chunkData.zoneId;
    this.currentHeights = chunkData.heights;
    this.currentTiles = chunkData.tiles;
    this.currentStructures = chunkData.structures;
    this.currentBiome = biome;

    if (this.chunkManager) {
      this.chunkManager.receiveChunk(chunkData, biome);
      this.chunkManager.updateChunks(this.currentZoneId);
    }

    if (this.pixelMovement) {
      const player = useGameStore.getState().player;
      if (player) {
        const zoneSize = getZoneSize(chunkData.zoneId);
        // Clamp tile coords to zone bounds — prevents negative/out-of-bounds from bad saves
        const clampedX = Math.max(0, Math.min(zoneSize - 1, player.position.x));
        const clampedY = Math.max(0, Math.min(zoneSize - 1, player.position.y));
        const startPx = (clampedX + 0.5) * TILE_SIZE_PX;
        const startPy = (clampedY + 0.5) * TILE_SIZE_PX;
        this.pixelMovement.init(startPx, startPy, chunkData.zoneId);
      }
      if (chunkData.collisions) {
        this.setCollisionMap(chunkData.collisions);
      }
    }

    // Clear remote player interpolation on zone transition
    this.entityManager?.getRemoteInterpolator()?.clear();

    if (isHubZone(chunkData.zoneId)) {
      this.dayNightCycle?.pause();
    }

    if (chunkData.zoneId) {
      this.time.delayedCall(500, () => {
        this.showZoneCinematic(biome);
      });
    }
  }

  receiveChunkData(chunkData: ChunkData, biome: BiomeType): void {
    if (this.chunkManager) {
      this.chunkManager.receiveChunk(chunkData, biome);
    }
  }

  private commitZoneTransition(newZoneId: string, biome: BiomeType): void {
    // Remap player px/py from old zone's local coords to new zone's local coords
    if (this.pixelMovement && this.currentZoneId !== newZoneId) {
      const oldCoords = this.parseZoneCoords(this.currentZoneId);
      const newCoords = this.parseZoneCoords(newZoneId);
      const zoneSizePx = ZONE_SIZE * TILE_SIZE_PX;
      const pos = this.pixelMovement.getPosition();
      const remappedPx = pos.px + (oldCoords.x - newCoords.x) * zoneSizePx;
      const remappedPy = pos.py + (oldCoords.y - newCoords.y) * zoneSizePx;
      this.pixelMovement.init(remappedPx, remappedPy, newZoneId);
    }

    this.currentZoneId = newZoneId;
    this.lastRequestedZoneId = null;
    this.interactionController?.clearLastPortalEmitKey();

    if (this.chunkManager) {
      const chunk = this.chunkManager.getChunk(newZoneId);
      if (chunk) {
        this.currentHeights = chunk.data.heights;
        this.currentTiles = chunk.data.tiles;
        this.currentStructures = chunk.data.structures;
        this.currentBiome = chunk.biome;

        this.weatherSystem?.setBiome(chunk.biome, false);
        this.atmosphereSystem?.setBiome(chunk.biome, false);
        if (this.cameraController && this.weatherSystem) {
          this.cameraController.updateMinimapWeatherIgnore(this.weatherSystem);
        }

        if (chunk.data.collisions) {
          this.setCollisionMap(chunk.data.collisions);
        }

        this.showZoneCinematic(chunk.biome);
        this.entityManager?.refreshRareNodeMarkers();
      }
    }

    requestIdleCallback(() => {
      if (this.chunkManager) {
        this.chunkManager.updateChunks(newZoneId);
      }
      this.entityManager?.cleanupOrphanedEntities();
    }, { timeout: 100 });
  }

  private checkPendingZoneTransition(position: Position): void {
    if (!this.pendingZoneId) return;

    const now = performance.now();
    if (now - this.lastPendingZoneCheck < WorldScene.PENDING_ZONE_CHECK_INTERVAL) return;
    this.lastPendingZoneCheck = now;

    if (position.zoneId === this.currentZoneId) {
      this.pendingZoneId = null;
      this.pendingBiome = null;
      return;
    }

    const { px: posPx, py: posPy } = tileToPixelCenter(position.x, position.y);
    const depth = this.getZoneBoundaryDepthPx(posPx, posPy);

    if (depth >= HYSTERESIS_PX) {
      const zoneId = this.pendingZoneId;
      const biome = this.pendingBiome!;
      this.pendingZoneId = null;
      this.pendingBiome = null;
      this.commitZoneTransition(zoneId, biome);
    }
  }

  onPlayerZoneChanged(newZoneId: string, biome: BiomeType): void {
    const wasHub = isHubZone(this.currentZoneId);
    const isHub = isHubZone(newZoneId);
    if (wasHub !== isHub || (wasHub && isHub && this.currentZoneId !== newZoneId)) {
      this.fullZoneReset(newZoneId, biome);
      return;
    }

    const position = useGameStore.getState().player?.position;
    if (!position) {
      this.commitZoneTransition(newZoneId, biome);
      return;
    }

    const { px: posPx, py: posPy } = tileToPixelCenter(position.x, position.y);
    const depth = this.getZoneBoundaryDepthPx(posPx, posPy);

    if (depth >= HYSTERESIS_PX) {
      this.commitZoneTransition(newZoneId, biome);
    } else {
      this.pendingZoneId = newZoneId;
      this.pendingBiome = biome;
    }
  }

  fullZoneReset(newZoneId: string, biome: BiomeType): void {
    this.pendingZoneId = null;
    this.pendingBiome = null;
    this.lastRequestedZoneId = null;
    this.interactionController?.clearLastPortalEmitKey();
    this.chunkTiles.forEach(tiles => tiles.forEach(tile => {
      tile.getAll().forEach(child => child.destroy());
      tile.removeAll(true);
      tile.destroy();
    }));
    this.chunkTiles.clear();
    this.entityManager?.clearEntities();
    this.entityManager?.clearOtherPlayers();
    this.chunkManager?.clear();
    const fm = this.entityManager?.getFogManager(), fr = this.entityManager?.getFogRenderer();
    if (fr && fm) fr.redrawFromState(fm);
    this.entityManager?.getEntityRenderer()?.clearAllQuestMarkers();
    this.currentZoneId = newZoneId;
    this.currentBiome = biome;
    this.weatherSystem?.setBiome(biome, true);
    this.atmosphereSystem?.setBiome(biome, true);
    if (this.cameraController && this.weatherSystem) this.cameraController.updateMinimapWeatherIgnore(this.weatherSystem);
    if (isHubZone(newZoneId)) this.dayNightCycle?.pause(); else this.dayNightCycle?.resume();
    this.showZoneCinematic(biome);
  }

  private showZoneCinematic(biome: BiomeType): void {
    const zoneId = this.currentZoneId;
    const now = Date.now();
    const lastShown = this.zoneCinematicCooldowns.get(zoneId) ?? 0;
    if (now - lastShown < ZONE_CINEMATIC_COOLDOWN_MS) return;

    this.zoneCinematicCooldowns.set(zoneId, now);
    const zoneName = BIOME_DISPLAY_NAMES[biome] ?? this.formatBiomeName(biome);
    const tier = BIOME_TIERS[biome] ?? 1;
    const tierLabel = TIER_LABELS[tier];
    useGameStore.getState().triggerZoneCinematic(zoneName, tierLabel, tier);
  }

  private formatBiomeName(biome: BiomeType): string {
    return biome.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  }

  private checkPixelZoneTransition(px: number, py: number): void {
    const zoneSizePx = getZoneSize(this.currentZoneId) * TILE_SIZE_PX;
    let newZoneOffsetX = 0;
    let newZoneOffsetY = 0;
    if (px < -HYSTERESIS_PX) newZoneOffsetX = -1;
    if (px >= zoneSizePx + HYSTERESIS_PX) newZoneOffsetX = 1;
    if (py < -HYSTERESIS_PX) newZoneOffsetY = -1;
    if (py >= zoneSizePx + HYSTERESIS_PX) newZoneOffsetY = 1;

    if (newZoneOffsetX !== 0 || newZoneOffsetY !== 0) {
      const zoneCoords = this.parseZoneCoords(this.currentZoneId);
      const newZoneId = `z_${zoneCoords.x + newZoneOffsetX}_${zoneCoords.y + newZoneOffsetY}`;
      if (newZoneId !== this.lastRequestedZoneId) {
        this.lastRequestedZoneId = newZoneId;
        gameSocket.emit('zone:request', { zoneId: newZoneId });
      }
    }
  }

  // ── Chunk Rendering ───────────────────────────────────────────────────

  private renderChunk(chunkData: ChunkData, biome: BiomeType): void {
    if (!this.tileRenderer || !this.isoTransform) return;

    const { zoneId, tiles, heights, structures, collisions } = chunkData;

    if (this.chunkTiles.has(zoneId)) {
      if (zoneId === this.currentZoneId) {
        this.currentTiles = tiles;
        this.currentHeights = heights;
        this.currentStructures = structures;
        this.currentBiome = biome;
      }
      return;
    }

    const { x: chunkX, y: chunkY } = this.parseZoneCoords(zoneId);
    const chunkGridX = chunkX * ZONE_SIZE;
    const chunkGridY = chunkY * ZONE_SIZE;
    const chunkTileArray: Phaser.GameObjects.Container[] = [];

    const mapHeight = tiles.length;
    const mapWidth = tiles[0]?.length ?? 0;

    for (let y = 0; y < mapHeight; y++) {
      for (let x = 0; x < mapWidth; x++) {
        const tileId = tiles[y][x] as TileId;
        const elevation = heights[y][x];
        const worldX = chunkGridX + x;
        const worldY = chunkGridY + y;
        const tile = this.tileRenderer.createTileWithElevationWorld(worldX, worldY, tileId, elevation, heights, x, y);
        chunkTileArray.push(tile);
      }
    }

    // Render liquid overlay tiles above terrain (elevation 1)
    // Render liquid overlay — top-face diamond only, skip blocking tiles
    if (chunkData.liquidTiles && this.isoTransform) {
      const hw = this.isoTransform.tileWidth / 2;
      const hh = this.isoTransform.tileHeight / 2;
      let drawnCount = 0;
      for (let y = 0; y < mapHeight; y++) {
        for (let x = 0; x < mapWidth; x++) {
          const liquidTileId = chunkData.liquidTiles[y]?.[x];
          if (!liquidTileId) continue;

          // Skip blocking tiles (walls) — liquid doesn't cover them
          if (collisions[y]?.[x]) continue;

          const worldX = chunkGridX + x;
          const worldY = chunkGridY + y;
          const screenPos = this.isoTransform.gridToScreen(worldX, worldY);

          // Draw top-face diamond only (no cube sides)
          const liquidDef = TileRegistry.get(liquidTileId);
          const alpha = liquidDef.liquidOpacity === 'opaque' ? 0.85
            : liquidDef.liquidOpacity === 'semi-opaque' ? 0.65 : 0.45;

          const gfx = this.add.graphics();
          gfx.fillStyle(liquidDef.color, alpha);
          gfx.beginPath();
          gfx.moveTo(0, -hh);
          gfx.lineTo(hw, 0);
          gfx.lineTo(0, hh);
          gfx.lineTo(-hw, 0);
          gfx.closePath();
          gfx.fillPath();

          // Position at sea level + half step up to sit on surface
          gfx.setPosition(screenPos.x, screenPos.y - ELEVATION_HEIGHT_STEP / 2);

          // Terrain-level depth — liquid renders above ground but behind elevated tiles/entities
          const depth = this.isoTransform.calculateDepth(worldX, worldY, 0) + 0.05;
          gfx.setDepth(depth);

          // Set grid data for viewport culling (without this, culling hides liquid tiles)
          gfx.setData('gridX', worldX);
          gfx.setData('gridY', worldY);
          gfx.setData('baseY', screenPos.y - ELEVATION_HEIGHT_STEP / 2);
          gfx.setData('liquid', true);

          chunkTileArray.push(gfx as unknown as Phaser.GameObjects.Container);
          drawnCount++;
        }
      }
    }

    // Create POI sprites for this chunk
    const poiRenderer = this.entityManager?.getPoiRenderer();
    if (chunkData.pois && chunkData.pois.length > 0 && poiRenderer) {
      poiRenderer.createPoisForChunk(chunkData.pois, chunkX, chunkY, this.entityManager?.getDiscoveredPoiIds() ?? new Set());
    }

    this.chunkTiles.set(zoneId, chunkTileArray);

    if (zoneId === this.currentZoneId) {
      this.currentBiome = biome;
      this.currentTiles = tiles;
      this.currentHeights = heights;
      this.currentStructures = structures;
      if (this.weatherSystem && !this.weatherSystem.hasActiveWeather()) {
        this.weatherSystem.setBiome(biome, true);
        this.atmosphereSystem?.setBiome(biome, true);
        if (this.cameraController && this.weatherSystem) {
          this.cameraController.updateMinimapWeatherIgnore(this.weatherSystem);
        }
      }
    }
  }

  private unloadChunkContainer(zoneId: string): void {
    const tiles = this.chunkTiles.get(zoneId);
    if (tiles) {
      tiles.forEach(tile => {
        const children = tile.getAll();
        children.forEach(child => child.destroy());
        tile.removeAll(true);
        tile.destroy();
      });
      this.chunkTiles.delete(zoneId);
    }
    this.entityManager?.despawnEntitiesForZone(zoneId);
  }

  // ── Tile State / Collision ────────────────────────────────────────────

  setCollisionMap(collisionMap: boolean[][]): void {
    this.collisionMap = collisionMap;
    if (this.pixelMovement) {
      const zoneCoords = this.parseZoneCoords(this.currentZoneId);
      const currentSize = getZoneSize(this.currentZoneId);
      const offsetX = zoneCoords.x * currentSize;
      const offsetY = zoneCoords.y * currentSize;
      const baseSolid = (tx: number, ty: number) =>
        this.isTerrainBlocked(offsetX + tx, offsetY + ty) ||
        this.isEntityBlocked(offsetX + tx, offsetY + ty);
      const getHeight = (tx: number, ty: number) =>
        this.getWorldTileHeight(offsetX + tx, offsetY + ty);

      this.pixelMovement.setCollisionCallback(baseSolid);
      this.pixelMovement.setHeightCallback(getHeight);
    }
  }

  isWorldTileBlocked(worldX: number, worldY: number): boolean {
    return this.isTerrainBlocked(worldX, worldY) || this.isEntityBlocked(worldX, worldY);
  }

  /** Resolve world coords to (chunk, localX, localY) for cross-chunk lookups. */
  private resolveWorldToChunkLocal(worldX: number, worldY: number): { chunk: ChunkData | null; localX: number; localY: number; zoneId: string } | null {
    if (!this.chunkManager) return null;
    if (isHubZone(this.currentZoneId)) {
      const c = this.chunkManager.getChunk(this.currentZoneId);
      return c ? { chunk: c.data, localX: worldX, localY: worldY, zoneId: this.currentZoneId } : null;
    }
    const zoneId = `z_${Math.floor(worldX / ZONE_SIZE)}_${Math.floor(worldY / ZONE_SIZE)}`;
    const c = this.chunkManager.getChunk(zoneId);
    if (!c) return null;
    return { chunk: c.data, localX: ((worldX % ZONE_SIZE) + ZONE_SIZE) % ZONE_SIZE, localY: ((worldY % ZONE_SIZE) + ZONE_SIZE) % ZONE_SIZE, zoneId };
  }

  private isTerrainBlocked(worldX: number, worldY: number): boolean {
    const r = this.resolveWorldToChunkLocal(worldX, worldY);
    if (!r || !r.chunk || !r.chunk.collisions) return true;
    return r.chunk.collisions[r.localY]?.[r.localX] ?? true;
  }

  private isEntityBlocked(worldX: number, worldY: number): boolean {
    const r = this.resolveWorldToChunkLocal(worldX, worldY);
    if (!r) return false;
    const entityAtTile = useEntityStore.getState().getEntityAtPosition(r.localX, r.localY, r.zoneId);
    return entityAtTile ? (entityAtTile.type === 'mineral' || entityAtTile.type === 'plant') : false;
  }

  private getWorldTileHeight(worldX: number, worldY: number): number {
    const r = this.resolveWorldToChunkLocal(worldX, worldY);
    if (!r || !r.chunk || !r.chunk.heights) return 0;
    return r.chunk.heights[r.localY]?.[r.localX] ?? 0;
  }

  getTileElevation(gridX: number, gridY: number, zoneId?: string): number {
    const targetZone = zoneId ?? this.currentZoneId;
    // For open-world zones, use world-aware lookup for correct coordinate mapping
    if (!isHubZone(targetZone)) {
      const zoneCoords = this.parseZoneCoords(targetZone);
      const currentSize = getZoneSize(targetZone);
      return this.getWorldTileHeight(zoneCoords.x * currentSize + gridX, zoneCoords.y * currentSize + gridY);
    }
    // Hub zones: direct array access (zone-local coordinates, no cross-chunk)
    if (targetZone === this.currentZoneId && this.currentHeights) {
      return this.currentHeights[gridY]?.[gridX] ?? 0;
    }
    if (this.chunkManager) {
      const chunk = this.chunkManager.getChunk(targetZone);
      if (chunk?.data.heights) {
        return chunk.data.heights[gridY]?.[gridX] ?? 0;
      }
    }
    return 0;
  }

  getInterpolatedElevation(gridX: number, gridY: number, _zoneId?: string): number {
    const floorX = Math.floor(gridX);
    const floorY = Math.floor(gridY);
    const fracX = gridX - floorX;
    const fracY = gridY - floorY;

    // Use world-aware height lookup for open-world zones to handle cross-chunk and
    // stale-data scenarios correctly. Hub zones use direct array access.
    let e00: number, e10: number, e01: number, e11: number;
    if (isHubZone(this.currentZoneId)) {
      const heights = this.currentHeights;
      if (!heights) return 0;
      e00 = heights[floorY]?.[floorX] ?? 0;
      e10 = heights[floorY]?.[floorX + 1] ?? e00;
      e01 = heights[floorY + 1]?.[floorX] ?? e00;
      e11 = heights[floorY + 1]?.[floorX + 1] ?? e00;
    } else {
      const zoneCoords = this.parseZoneCoords(this.currentZoneId);
      const currentSize = getZoneSize(this.currentZoneId);
      const baseX = zoneCoords.x * currentSize;
      const baseY = zoneCoords.y * currentSize;
      e00 = this.getWorldTileHeight(baseX + floorX, baseY + floorY);
      e10 = this.getWorldTileHeight(baseX + floorX + 1, baseY + floorY);
      e01 = this.getWorldTileHeight(baseX + floorX, baseY + floorY + 1);
      e11 = this.getWorldTileHeight(baseX + floorX + 1, baseY + floorY + 1);
    }

    return e00 * (1 - fracX) * (1 - fracY)
         + e10 * fracX       * (1 - fracY)
         + e01 * (1 - fracX) * fracY
         + e11 * fracX       * fracY;
  }

  getWorldTileElevation(worldX: number, worldY: number): number {
    const r = this.resolveWorldToChunkLocal(worldX, worldY);
    if (!r || !r.chunk || !r.chunk.heights) return 0;
    return r.chunk.heights[r.localY]?.[r.localX] ?? 0;
  }

  // ── Liquid Wave Animation ────────────────────────────────────────────

  private liquidWaveTime = 0;

  private updateLiquidWaves(_time: number, delta: number): void {
    if (this.chunkTiles.size === 0) return;
    this.liquidWaveTime += delta * 0.00001;
    const t = this.liquidWaveTime;

    // Fixed wind direction (NE) — use zone-local coords to avoid huge phase values
    const windX = 0.7;
    const windY = 0.7;

    this.chunkTiles.forEach(tiles => {
      for (const tile of tiles) {
        if (!tile.getData('liquid')) continue;
        if (!tile.visible) continue;

        const gx = tile.getData('gridX') as number;
        const gy = tile.getData('gridY') as number;
        const baseY = tile.getData('baseY') as number;

        // Use modulo to keep phase small — only local position matters for wave pattern
        const localX = ((gx % 64) + 64) % 64;
        const localY = ((gy % 64) + 64) % 64;
        const phase = (localX * windX + localY * windY) * 0.1;
        const offset = Math.sin(t + phase) * 2;
        tile.y = baseY + offset;
      }
    });
  }

  // ── Viewport / Tile Transparency ──────────────────────────────────────

  private updateVisibleTiles(): void {
    if (!this.viewportCuller) return;
    if (this.chunkTiles.size === 0) return;

    const bounds = this.viewportCuller.getCullBounds(this.cameras.main);
    if (this.lastCullBounds &&
        this.lastCullBounds.minTileX === bounds.minTileX &&
        this.lastCullBounds.maxTileX === bounds.maxTileX &&
        this.lastCullBounds.minTileY === bounds.minTileY &&
        this.lastCullBounds.maxTileY === bounds.maxTileY) {
      return;
    }
    this.lastCullBounds = bounds;

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

  // ── Utility ───────────────────────────────────────────────────────────

  parseZoneCoords(zoneId: string): { x: number; y: number } {
    if (isHubZone(zoneId)) return { x: 0, y: 0 };
    const parts = zoneId.split('_');
    return { x: parseInt(parts[1], 10), y: parseInt(parts[2], 10) };
  }

  private getZoneBoundaryDepthPx(px: number, py: number): number {
    const zonePxSize = getZoneSize(this.currentZoneId) * TILE_SIZE_PX;
    const fromLeft = px;
    const fromRight = zonePxSize - px;
    const fromTop = py;
    const fromBottom = zonePxSize - py;
    return Math.min(fromLeft, fromRight, fromTop, fromBottom);
  }

  // ── WorldSceneAccessor + Public API ────────────────────────────────────

  getCurrentZoneId(): string { return this.currentZoneId; }
  getCurrentTiles(): number[][] | null { return this.currentTiles; }
  getCurrentHeights(): number[][] | null { return this.currentHeights; }
  getCurrentBiome(): BiomeType { return this.currentBiome; }
  getChunkManager(): ChunkManager | null { return this.chunkManager; }
  getIsoTransform(): IsometricTransform | null { return this.isoTransform; }
  getFogManager(): FogManager | null { return this.entityManager?.getFogManager() ?? null; }
  getFogRenderer(): FogRenderer | null { return this.entityManager?.getFogRenderer() ?? null; }
  getPoiRenderer(): PoiRenderer | null { return this.entityManager?.getPoiRenderer() ?? null; }
  getDiscoveredPoiIds(): Set<string> { return this.entityManager?.getDiscoveredPoiIds() ?? new Set(); }
  getPixelMovement(): PixelMovementController | null { return this.pixelMovement; }
  getChunkTiles(): Map<string, Phaser.GameObjects.Container[]> { return this.chunkTiles; }

  spawnEntity(entity: Entity, zoneId?: string): void { this.entityManager?.spawnEntity(entity, zoneId); }
  despawnEntity(entityId: string): void { this.entityManager?.despawnEntity(entityId); }
  clearEntities(): void { this.entityManager?.clearEntities(); }
  clearOtherPlayers(): void { this.entityManager?.clearOtherPlayers(); }
  updateEntity(entityId: string, changes: Partial<Entity>): void { this.entityManager?.updateEntity(entityId, changes); }
  addPlayer(player: PlayerPublic): void { this.entityManager?.addPlayer(player); }
  removePlayer(playerId: string): void { this.entityManager?.removePlayer(playerId); }
  movePlayer(playerId: string, position: Position): void { this.entityManager?.movePlayer(playerId, position); }

  updateLocalPlayer(position: Position): void {
    if (!this.entityManager?.getLocalPlayer()) {
      this.entityManager?.updateLocalPlayer(position);
      // Set up camera to follow the newly created local player
      const localPlayer = this.entityManager?.getLocalPlayer();
      if (localPlayer) {
        this.cameraController?.startFollowPlayer(localPlayer);
      }
    } else {
      this.entityManager?.updateLocalPlayer(position);
    }
  }

  updateLocalPlayerSprite(position: Position): void {
    this.entityManager?.updateLocalPlayerSprite(position);
    // Also update interaction state
    const pixelPos = this.pixelMovement?.getPosition();
    const playerPx = pixelPos?.px ?? tileToPixelCenter(position.x, position.y).px;
    const playerPy = pixelPos?.py ?? tileToPixelCenter(position.x, position.y).py;
    this.interactionController?.update(playerPx, playerPy);
    this.interactionController?.checkPortalTile(position);
    this.checkPendingZoneTransition(position);
  }

  showDamageNumber(defenderId: string, damage: number, isLocalPlayer: boolean, fallbackPosition?: { x: number; y: number }, damageType?: import('@into-the-void/shared-types').DamageType): void {
    this.entityManager?.showDamageNumber(defenderId, damage, isLocalPlayer, fallbackPosition, damageType);
  }

  showHealNumber(entityId: string, amount: number): void {
    this.entityManager?.showHealNumber(entityId, amount);
  }

  handlePlayerDeath(): void { this.entityManager?.handlePlayerDeath(); }
  handlePlayerRespawn(position: Position): void { this.entityManager?.handlePlayerRespawn(position); }
  handlePositionCorrection(serverPx: number, serverPy: number, sequence: number): void { this.entityManager?.handlePositionCorrection(serverPx, serverPy, sequence); }
  handleGatheringChallenge(_challenge: TimingChallenge): void { /* No-op: gathering auto-completes on server */ }

  getPixelMovementController(): PixelMovementController | null { return this.pixelMovement; }
  getRemoteInterpolator(): RemotePlayerInterpolator | null { return this.entityManager?.getRemoteInterpolator() ?? null; }

  setKeyboardEnabled(enabled: boolean): void { this.inputController?.setKeyboardEnabled(enabled); }
  resetMovementInput(): void { this.inputController?.resetMovementInput(); }

  shutdown(): void {
    this.zoneCinematicCooldowns.clear();
    this.interactionController?.destroy(); this.interactionController = null;
    this.entityManager?.destroy(); this.entityManager = null;
    this.cameraController?.destroy(); this.cameraController = null;
    this.inputController?.destroy(); this.inputController = null;
    this.isoTransform = null;
    this.weatherSystem?.destroy(); this.weatherSystem = null;
    this.dayNightCycle?.destroy(); this.dayNightCycle = null;
    this.atmosphereSystem?.destroy(); this.atmosphereSystem = null;
    this.debugOverlay?.destroy(); this.debugOverlay = null;
    this.debugCollisionRenderer?.destroy(); this.debugCollisionRenderer = null;
    this.chunkManager?.clear(); this.chunkManager = null;
    this.chunkTiles.forEach(tiles => tiles.forEach(tile => tile.destroy(true)));
    this.chunkTiles.clear();
    this.lastCullBounds = null;
  }
}
