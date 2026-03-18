import Phaser from 'phaser';
import { ZONE_SIZE, HYSTERESIS_TILES, Position, Entity, PlayerPublic, ChunkData, BiomeType, BiomeTier, Direction, Creature, TileStructure, isHubZone, Npc, TimingChallenge, BIOME_DISPLAY_NAMES, BIOME_TIERS, getZoneSize } from '@into-the-void/shared-types';
import { TILE_SIZE_PX, MELEE_RANGE_PX, GATHER_RANGE_PX, NPC_INTERACT_RANGE_PX, pixelDistanceTo, tileToPixelCenter } from '@into-the-void/game-logic';
import { TileId, tileIdToString } from '@into-the-void/world-gen';
import { TileRegistry } from '@into-the-void/tiles';
import { ItemRegistry } from '@into-the-void/items';
import { QuestRegistry } from '@into-the-void/quests';
import { TileRenderer } from '../rendering/TileRenderer';
import { EntityRenderer } from '../rendering/EntityRenderer';
import { ChunkManager } from '../rendering/ChunkManager';
import { ViewportCuller } from '../rendering/ViewportCuller';
import { ZoneHUD } from '../ui/ZoneHUD';
import { MinimapCamera } from '../rendering/MinimapCamera';
import { PixelMovementController } from '../systems/PixelMovementController';
import { RemotePlayerInterpolator } from '../systems/RemotePlayerInterpolator';
import { IsometricTransform } from '../utils/IsometricTransform';
import { DepthSorter } from '../rendering/DepthSorter';
import { audioManager } from '../../utils/audio';
import { useGameStore } from '../../store/gameStore';
import { useEntityStore } from '../../store/entityStore';
import { useInventoryStore } from '../../store/inventoryStore';
import { useAbilityStore, getEquippedAbilities } from '../../store/abilityStore';
import { useCombatStore } from '../../store/combatStore';
import { useQuestStore } from '../../store/questStore';
import { gameSocket } from '../../network/socket';
import { TargetHighlight } from '../rendering/TargetHighlight';
import { FogManager } from '../fog/FogManager';
import { FogRenderer } from '../fog/FogRenderer';
import { PoiRenderer } from '../pois/PoiRenderer';
import { WeatherSystem } from '../systems/WeatherSystem';
import { DayNightCycle } from '../systems/DayNightCycle';
import { AtmosphereSystem } from '../systems/AtmosphereSystem';
// GatheringMiniGame removed - gathering now auto-completes on server
import { createRareNodeMarker } from '../rendering/RareNodeFX';
import type { DiscoveredResource } from '../../store/gameStore';

export const ISO_TILE_WIDTH = 256;
export const ISO_TILE_HEIGHT = 128;
// Visibility radius in tiles (~1.5 chunks allows seeing into adjacent chunks)
const VISIBILITY_RADIUS = 48;
// Pixel-space hysteresis threshold: commit zone transition once player is this many px deep
const HYSTERESIS_PX = HYSTERESIS_TILES * TILE_SIZE_PX; // 3 * 128 = 384 px

// Phase 138: Zone cinematic tier label mapping and cooldown
const TIER_LABELS: Record<BiomeTier, string> = {
  1: 'Frontier',
  2: 'Hazardous',
  3: 'Hostile',
  4: 'Extreme',
};
const ZONE_CINEMATIC_COOLDOWN_MS = 30_000; // 30 seconds per zone

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
  private entitySprites: Map<string, Phaser.GameObjects.Container> = new Map();
  private entityZoneMap: Map<string, Set<string>> = new Map(); // zoneId -> Set<entityId>
  private playerSprites: Map<string, Phaser.GameObjects.Sprite> = new Map();
  private localPlayer: Phaser.GameObjects.Sprite | null = null;
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys | null = null;
  private wasd: WASDKeys | null = null;
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
  private lastClickedEntity: string | null = null;
  private targetHighlight: TargetHighlight | null = null;
  // Phase 133: nearest NPC within NPC_INTERACT_RANGE_PX — gates npc:interact emissions
  private nearestNpcInRange: Entity | null = null;
  // Portal tile detection: track last position where portal:use was emitted to prevent duplicates
  private lastPortalEmitKey: string | null = null;
  // Local player facing direction for sprite selection
  private localPlayerFacing: Direction = 's';
  // Movement animation state tracking
  private lastMovementTime = 0;
  private static readonly IDLE_THRESHOLD_MS = 50; // Time after tween completes before stopping animation
  // Fog of war system
  private fogManager: FogManager | null = null;
  private fogRenderer: FogRenderer | null = null;
  private fogInitialized: boolean = false;
  // POI discovery system
  private poiRenderer: PoiRenderer | null = null;
  private discoveredPoiIds: Set<string> = new Set();
  // Gathering - now auto-completes on server, no mini-game needed
  // Rare node markers
  private rareNodeMarkers: Map<string, Phaser.GameObjects.Container> = new Map();
  private weatherSystem: WeatherSystem | null = null;
  private dayNightCycle: DayNightCycle | null = null;
  private atmosphereSystem: AtmosphereSystem | null = null;
  // Phase 134: pixel movement controllers
  private pixelMovement: PixelMovementController | null = null;
  private remoteInterpolator: RemotePlayerInterpolator | null = null;
  // Phase 138: cooldown tracking for zone cinematic (zoneId -> last shown timestamp)
  private zoneCinematicCooldowns: Map<string, number> = new Map();

  constructor() {
    super({ key: 'WorldScene' });
  }

  create(): void {
    // Create tile container
    this.tileLayer = this.add.container(0, 0);

    // Initialize IsometricTransform
    this.isoTransform = new IsometricTransform(ISO_TILE_WIDTH, ISO_TILE_HEIGHT);

    // Fog of war rendering disabled — RenderTexture approach doesn't track camera properly
    // this.fogRenderer = new FogRenderer(this, this.isoTransform);
    // this.fogRenderer.create();

    // Initialize POI renderer
    this.poiRenderer = new PoiRenderer(this, this.isoTransform);

    // Initialize DepthSorter
    this.depthSorter = new DepthSorter();

    // Initialize TileRenderer with isometric dimensions
    this.tileRenderer = new TileRenderer(this, ISO_TILE_WIDTH, ISO_TILE_HEIGHT);

    // Initialize EntityRenderer with isometric dimensions
    this.entityRenderer = new EntityRenderer(this, ISO_TILE_WIDTH, ISO_TILE_HEIGHT);
    this.entityRenderer.initStampedeListener(); // CRAI-06: camera shake on stampede

    // Initialize TargetHighlight for entity targeting feedback
    this.targetHighlight = new TargetHighlight(this);

    // Subscribe to combatStore target changes for auto-targeting
    useCombatStore.subscribe((state, prevState) => {
      if (state.targetEntityId !== prevState.targetEntityId) {
        if (state.targetEntityId) {
          // Auto-target: show highlight on new target (e.g., first creature to aggro player)
          const entity = useEntityStore.getState().entities.get(state.targetEntityId);
          const container = this.entitySprites.get(state.targetEntityId);
          if (entity && container) {
            const creature = entity as { behavior?: string };
            this.targetHighlight?.show(state.targetEntityId, container, creature.behavior ?? 'herbivore');
          }
        } else {
          // Target cleared (combat ended)
          this.targetHighlight?.hide();
        }
      }
    });

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

    // Initialize WeatherSystem for biome particle effects
    this.weatherSystem = new WeatherSystem(this);

    // Initialize Day/Night Cycle on main camera only (DNTC-03, DNTC-05)
    this.dayNightCycle = new DayNightCycle();
    this.dayNightCycle.create(this.cameras.main);

    // Initialize AtmosphereSystem and register with DayNightCycle (ATMO-04)
    this.atmosphereSystem = new AtmosphereSystem(this);
    this.dayNightCycle.setAtmosphereSystem(this.atmosphereSystem);

    // Phase 134: pixel movement controllers
    this.pixelMovement = new PixelMovementController();
    this.remoteInterpolator = new RemotePlayerInterpolator();

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

      // K=Abilities (skills) panel
      this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.K).on('down', () => {
        if (this.input.keyboard?.enabled) {
          useGameStore.getState().toggleAbilities();
        }
      });

      // P is alias for E (both toggle equipment+stats panel)
      this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.P).on('down', () => {
        if (this.input.keyboard?.enabled) {
          useGameStore.getState().toggleEquipment();
        }
      });

      // Recall hotkey: H teleports player to faction hub from open world
      // Server validates and rejects if player is already in hub
      this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.H).on('down', () => {
        if (this.input.keyboard?.enabled) {
          gameSocket.emit('hub:recall', {});
        }
      });
    }

    // Tiles and player will be loaded via loadZoneFromState() when zone:state event arrives

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
      // Reward is handled by existing XP/credits listeners
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

    // Sync server time for day/night cycle (DNTC-01)
    gameSocket.on('zone:state', (data: any) => {
      if (data.serverTime && this.dayNightCycle) {
        this.dayNightCycle.setServerTime(data.serverTime);
      }
    });

    // Set fixed zoom to show ~20x15 tiles viewport (for 256x256 sprites)
    this.cameras.main.setZoom(0.5);

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

    // Ground click handler: clear target highlight when clicking empty ground
    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      // Skip if we clicked an entity (handled by gameobjectdown)
      if (this.lastClickedEntity) {
        this.lastClickedEntity = null;
        return;
      }

      // Only handle left click
      if (pointer.rightButtonDown()) return;

      // Clear target highlight when clicking ground (empty tile)
      this.targetHighlight?.hide();
      useCombatStore.getState().stopAutoAttack();
      useCombatStore.getState().setInCombat(useCombatStore.getState().inCombat, null);
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

    // Entity click handler for click-to-attack (CATK-01, CATK-02, CATK-04)
    this.input.on('gameobjectdown', (pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject) => {
      console.log('[DEBUG] gameobjectdown fired', { gameObject: gameObject.constructor.name });

      // Only process left-click
      if (!pointer.leftButtonDown()) return;

      // Check if clicked object's parent container has entity data
      const container = gameObject.parentContainer;
      console.log('[DEBUG] container:', container ? 'found' : 'null');
      if (!container) return;

      const entityId = container.getData('entityId') as string | undefined;
      const entityType = container.getData('entityType') as string | undefined;
      console.log('[DEBUG] entity data:', { entityId, entityType });

      if (!entityId) return;

      // NPC interaction: emit npc:interact to server which responds with NPC definition data
      if (entityType === 'npc') {
        this.lastClickedEntity = entityId;
        gameSocket.emit('npc:interact', { entityId });
        return; // Do not proceed to combat
      }

      // Item pickup: emit inventory:pickup to server
      if (entityType === 'item') {
        this.lastClickedEntity = entityId;
        gameSocket.emit('inventory:pickup', { entityId });
        return;
      }

      // Gathering: minerals and plants trigger gathering abilities on click (INTERACT-02)
      if (entityType === 'mineral' || entityType === 'plant') {
        this.lastClickedEntity = entityId;

        // Show target highlight (use 'herbivore' style for plants, 'mineral' for minerals)
        const targetContainer = this.entitySprites.get(entityId);
        if (targetContainer) {
          this.targetHighlight?.show(entityId, targetContainer, 'herbivore');
        }

        // Set as target
        useCombatStore.getState().selectTarget(entityId);

        // Auto-trigger gathering ability (INTERACT-02)
        const abilities = getEquippedAbilities();
        let gatherAbilityId: string | undefined;
        if (entityType === 'plant') {
          gatherAbilityId = abilities.find(a => a.id === 'harvest')?.id
            ?? abilities.find(a => a.id === 'basic_harvest')?.id
            ?? abilities.find(a => a.id === 'gather')?.id;
        } else {
          gatherAbilityId = abilities.find(a => a.id === 'mine')?.id
            ?? abilities.find(a => a.id === 'basic_mine')?.id
            ?? abilities.find(a => a.id === 'gather')?.id;
        }
        if (gatherAbilityId) {
          const player = useGameStore.getState().player;
          const abilityDef = abilities.find(a => a.id === gatherAbilityId);
          const { isCasting, isOnCooldown } = useAbilityStore.getState();
          if (player && abilityDef && !isCasting() && !isOnCooldown(gatherAbilityId) && player.energy >= abilityDef.energyCost) {
            gameSocket.emit('ability:use', { abilityId: gatherAbilityId, targetEntityId: entityId });
          }
        }
        return;
      }

      // Artifacts: instant collection (no mini-game)
      if (entityType === 'artifact') {
        this.lastClickedEntity = entityId;
        gameSocket.emit('entity:tool_use', { targetEntityId: entityId });
        return;
      }

      // Creatures: combat flow (INTERACT-01)
      if (entityType === 'creature') {
        // Track that we clicked an entity to suppress ground-click handler
        this.lastClickedEntity = entityId;

        // Show target highlight and select target
        this.handleEntityClick(entityId);
        // Start auto-attack loop (INTERACT-01)
        useCombatStore.getState().startAutoAttack(entityId);
        return;
      }
    });

    // Start background music — loops gaplessly via Web Audio API (AUD-01)
    // By the time WorldScene loads, user has interacted (login flow), so AudioContext is ready
    audioManager.startMusic('/assets/music/freesound_community-ethereal-ambient-music-55115.mp3');
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
    const currentZoneSize = getZoneSize(this.currentZoneId);
    if (gridPos.x < 0 || gridPos.x >= currentZoneSize || gridPos.y < 0 || gridPos.y >= currentZoneSize) {
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

  /**
   * Handle click on entity creature — select target without auto-attacking.
   * Player will use abilities via hotkeys on the selected target.
   */
  private handleEntityClick(entityId: string): void {
    // Get entity from entityStore
    const entity = useEntityStore.getState().entities.get(entityId);
    if (!entity || entity.type !== 'creature') {
      return;
    }

    // Show highlight on target (get behavior from entity store)
    const creatureEntity = entity as { behavior?: string };
    const targetContainer = this.entitySprites.get(entityId);
    if (targetContainer) {
      this.targetHighlight?.show(entityId, targetContainer, creatureEntity.behavior ?? 'herbivore');
    }

    // Select target for ability use (does NOT auto-attack)
    useCombatStore.getState().selectTarget(entityId);
  }

  /**
   * Handle gathering:challenge event from server.
   * No longer used - gathering auto-completes on server.
   * Kept for backwards compatibility.
   */
  public handleGatheringChallenge(_challenge: TimingChallenge): void {
    // Gathering now auto-completes on server, no mini-game needed
  }

  /**
   * Complete gathering and report timing to server.
   * No longer used - gathering auto-completes on server.
   */
  private completeGathering(_challengeId: string, _clientOffset: number): void {
    // No longer used - gathering auto-completes on server
  }

  /**
   * Check if the player is standing on a portal tile (TileId = 16) and emit portal:use.
   * Called after each movement step completes (client prediction).
   * Debounced by position key: once emitted for a given tile, won't re-emit until
   * the player moves to a different tile (lastPortalEmitKey is cleared on non-portal tiles).
   */
  private checkPortalTile(position: Position): void {
    const posKey = `${position.x},${position.y},${position.zoneId}`;

    // Already emitted for this exact position — skip
    if (this.lastPortalEmitKey === posKey) return;

    // Look up tile ID at the player's position
    let tileNumericId: number | undefined;

    if (this.chunkManager) {
      // Prefer currentTiles for the current zone (fast path)
      if (position.zoneId === this.currentZoneId && this.currentTiles) {
        tileNumericId = this.currentTiles[position.y]?.[position.x];
      } else {
        const chunk = this.chunkManager.getChunk(position.zoneId);
        if (chunk?.data.tiles) {
          tileNumericId = chunk.data.tiles[position.y]?.[position.x];
        }
      }
    } else if (this.currentTiles) {
      tileNumericId = this.currentTiles[position.y]?.[position.x];
    }

    // TileId.PORTAL = 16
    if (tileNumericId === 16) {
      this.lastPortalEmitKey = posKey;
      gameSocket.emit('portal:use', {});
    } else {
      // Player moved off a portal tile — reset debounce so portal can be re-triggered
      // if the player returns to the same portal position later
      this.lastPortalEmitKey = null;
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

  private initializeFog(characterId: string): void {
    // Fog of war disabled - FogPersistence allocates too much memory (40B tiles)
    // TODO: Fix FogPersistence to use sparse data structure instead of dense bitset
    return;

    if (this.fogInitialized) return;

    this.fogManager = new FogManager(characterId);
    this.fogManager!.initialize();
    this.fogInitialized = true;

    // Redraw fog from saved state
    if (this.fogRenderer && this.fogManager) {
      this.fogRenderer!.redrawFromState(this.fogManager!);
    }
  }

  /**
   * Update local player's facing direction and sprite texture.
   * If moving, switches to the new direction's running animation.
   * If idle, switches to the new direction's idle texture.
   */
  private updateLocalPlayerDirection(direction: Direction): void {
    if (this.localPlayerFacing === direction) return;
    this.localPlayerFacing = direction;

    const sprite = this.localPlayer?.getData('characterSprite') as Phaser.GameObjects.Sprite | undefined;
    if (!sprite) return;

    const isMoving = this.localPlayer?.getData('isMoving') as boolean;
    if (isMoving) {
      // Switch to new direction's running animation
      sprite.play(`character-run-${direction}`);
    } else {
      // Switch to new direction's idle texture
      sprite.setTexture(`character-idle-${direction}`);
    }
  }

  /**
   * Start running animation for the local player.
   * Only starts if not already playing the same animation.
   */
  private startPlayerAnimation(direction: Direction): void {
    const sprite = this.localPlayer?.getData('characterSprite') as Phaser.GameObjects.Sprite | undefined;
    if (!sprite) return;

    const animKey = `character-run-${direction}`;
    // Only play if not already playing this animation (prevents jitter from restarting)
    // Check both: animation must be playing AND must be the same key
    if (!sprite.anims.isPlaying || sprite.anims.currentAnim?.key !== animKey) {
      sprite.play(animKey);
    }
    this.localPlayer?.setData('isMoving', true);
  }

  /**
   * Stop running animation and return to idle.
   */
  private stopPlayerAnimation(): void {
    const sprite = this.localPlayer?.getData('characterSprite') as Phaser.GameObjects.Sprite | undefined;
    if (!sprite) return;

    sprite.stop();
    sprite.setTexture(`character-idle-${this.localPlayerFacing}`);
    this.localPlayer?.setData('isMoving', false);
  }

  private createLocalPlayer(position: Position): void {
    if (!this.isoTransform) return;

    // Initialize fog system once we have player data
    const player = useGameStore.getState().player;
    if (player?.id) {
      this.initializeFog(player.id);
    }

    // Get elevation for the correct zone
    const elevation = this.getTileElevation(position.x, position.y, position.zoneId);
    const elevationOffset = elevation * 128; // ELEVATION_HEIGHT_STEP (1.0 × diamond height)
    // Use world coordinates for screen position so player aligns with chunk positions
    const { worldX, worldY } = this.positionToWorldCoords(position);
    const screenPos = this.isoTransform.gridToScreen(worldX, worldY);

    // Create container for player (same pattern as entities)
    const container = this.add.container(screenPos.x, screenPos.y - elevationOffset);
    container.setData('gridX', worldX);
    container.setData('gridY', worldY);
    container.setData('elevation', elevation);

    // Elliptical drop shadow at ground level (y=0 = tile surface)
    const shadow = this.add.ellipse(0, 0, 120, 60, 0x000000, 0.3);
    container.add(shadow);

    // Player sprite with directional character texture (default facing south)
    // 56px astronaut sprites scaled to ~336px visual (6x width, 4.5x height for isometric squash)
    const sprite = this.add.sprite(0, 0, `character-idle-${this.localPlayerFacing}`);
    sprite.setOrigin(0.5, 1.0);
    sprite.setScale(6, 4.5);
    container.add(sprite);
    container.setData('characterSprite', sprite); // Store reference for direction updates
    container.setData('isMoving', false); // Track animation state

    // Store reference (as container now, not sprite)
    this.localPlayer = container as unknown as Phaser.GameObjects.Sprite; // Type hack for compatibility

    // Set depth with priority boost to ensure player renders above terrain
    const depth = this.isoTransform.calculateDepth(worldX, worldY, elevation, 10, true);
    container.setDepth(depth);

    if (this.depthSorter) {
      this.depthSorter.setLocalPlayer('local');
    }
  }

  private lastCullTime = 0;
  private cullInterval = 100; // Only check viewport culling every 100ms

  update(time: number, delta: number): void {
    this.handleInput(time, delta);

    // Throttled viewport culling
    if (time - this.lastCullTime >= this.cullInterval) {
      this.lastCullTime = time;
      this.updateVisibleTiles();
    }

    // Update fog position with camera
    if (this.fogRenderer) {
      this.fogRenderer.updatePosition(this.cameras.main);
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

    // Phase 134: remote player interpolation
    this.updateRemotePlayerInterpolation();

    // Throttled occlusion check
    if (time - this.lastOcclusionTime >= this.occlusionInterval) {
      this.lastOcclusionTime = time;
      this.updateEntityOcclusion();
    }

    // Update day/night cycle visuals (DNTC-01, DNTC-02, DNTC-03)
    if (this.dayNightCycle) {
      this.dayNightCycle.update();
      // Sync current phase to HUD store (only on change to avoid re-renders)
      const phase = this.dayNightCycle.getCurrentPhase();
      const store = useGameStore.getState();
      if (store.dayNightPhase !== phase) {
        store.setDayNightPhase(phase);
      }
    }
  }

  private handleInput(time: number, delta: number): void {
    if (!this.localPlayer || !this.pixelMovement) return;

    // Can't move while dead
    const player = useGameStore.getState().player;
    if (player?.isDead) return;

    // Read WASD key state
    const keys = {
      W: this.wasd?.W.isDown ?? false,
      A: this.wasd?.A.isDown ?? false,
      S: this.wasd?.S.isDown ?? false,
      D: this.wasd?.D.isDown ?? false,
    };

    // Also support arrow keys mapped to same axes
    if (this.cursors) {
      if (this.cursors.up.isDown) keys.W = true;
      if (this.cursors.down.isDown) keys.S = true;
      if (this.cursors.left.isDown) keys.A = true;
      if (this.cursors.right.isDown) keys.D = true;
    }

    const anyKeyDown = keys.W || keys.A || keys.S || keys.D;

    // Cancel cast on movement
    if (anyKeyDown && useAbilityStore.getState().isCasting()) {
      gameSocket.emit('cast:cancel', {});
      useAbilityStore.getState().clearCast();
    }

    // dt in seconds for velocity calculation
    const dt = delta / 1000;

    // Run pixel movement update
    const result = this.pixelMovement.update(dt, keys, time);

    if (result.moved) {
      this.lastMovementTime = time;

      // Update facing direction for sprite
      if (result.direction) {
        this.localPlayerFacing = result.direction;
      }

      // Start/maintain walk animation
      const isMoving = this.localPlayer.getData('isMoving') as boolean;
      if (!isMoving) {
        this.startPlayerAnimation(this.localPlayerFacing);
      } else if (result.direction) {
        // Update animation direction if it changed
        const sprite = this.localPlayer.getData('characterSprite') as Phaser.GameObjects.Sprite | undefined;
        if (sprite) {
          const animKey = `character-run-${this.localPlayerFacing}`;
          if (sprite.anims.currentAnim?.key !== animKey) {
            sprite.play(animKey);
          }
        }
      }

      // Update sprite position from pixel coords
      this.updateLocalPlayerFromPixels(result.px, result.py);
    }

    // Handle idle detection: keys released
    if (!anyKeyDown) {
      const isMoving = this.localPlayer.getData('isMoving') as boolean;
      if (isMoving) {
        this.stopPlayerAnimation();
      }
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

    // Phase 134: initialize pixel movement controller with player's pixel position
    if (this.pixelMovement) {
      const player = useGameStore.getState().player;
      if (player) {
        const startPx = (player.position.x + 0.5) * TILE_SIZE_PX;
        const startPy = (player.position.y + 0.5) * TILE_SIZE_PX;
        this.pixelMovement.init(startPx, startPy, chunkData.zoneId);
      }
      // Set collision callback if collision map is available
      if (chunkData.collisions) {
        this.setCollisionMap(chunkData.collisions);
      }
    }

    // Phase 134: clear remote player interpolation buffers on zone transition
    if (this.remoteInterpolator) {
      this.remoteInterpolator.clear();
    }

    // Hub zones: disable day/night cycle on initial load
    if (isHubZone(chunkData.zoneId)) {
      this.dayNightCycle?.pause();
    }

    // Phase 138: show zone name cinematic on initial spawn
    if (chunkData.zoneId) {
      // Use delayedCall to let the scene fully initialize before showing
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

  /**
   * Commit a zone transition immediately: update all zone state, collision map, HUD,
   * and clean up orphaned entities. Called once the player is HYSTERESIS_TILES deep.
   */
  private commitZoneTransition(newZoneId: string, biome: BiomeType): void {
    const previousBiome = this.currentBiome;
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

        // Crossfade weather to new biome
        this.weatherSystem?.setBiome(chunk.biome, false);
        // Crossfade atmosphere to new biome (ATMO-02, ATMO-03)
        this.atmosphereSystem?.setBiome(chunk.biome, false);
        this.updateMinimapWeatherIgnore();

        // Update collision map for movement validation in new zone
        if (chunk.data.collisions) {
          this.setCollisionMap(chunk.data.collisions);
        }

        // Update HUD
        if (this.zoneHUD) {
          this.zoneHUD.updateZone(newZoneId, chunk.biome);
        }

        // Show cinematic zone name notification (Dark Souls style) — Phase 138
        this.showZoneCinematic(chunk.biome);

        // Refresh rare node markers for new zone
        this.refreshRareNodeMarkers();
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

    // Player still in pending zone - check pixel depth
    if (position.zoneId === this.pendingZoneId) {
      const { px: posPx, py: posPy } = tileToPixelCenter(position.x, position.y);
      const depth = this.getZoneBoundaryDepthPx(posPx, posPy);
      if (depth >= HYSTERESIS_PX) {
        this.commitZoneTransition(this.pendingZoneId, this.pendingBiome!);
        this.pendingZoneId = null;
        this.pendingBiome = null;
      }
    }
  }

  onPlayerZoneChanged(newZoneId: string, biome: BiomeType): void {
    console.log('[WorldScene] onPlayerZoneChanged:', { from: this.currentZoneId, to: newZoneId });

    // Detect teleportation: hub transitions require full scene reset
    const wasHub = isHubZone(this.currentZoneId);
    const isHub = isHubZone(newZoneId);
    if (wasHub !== isHub || (wasHub && isHub && this.currentZoneId !== newZoneId)) {
      // Hub <-> world or hub <-> different hub: full reset required
      console.log('[WorldScene] Teleportation detected, performing full zone reset');
      this.fullZoneReset(newZoneId, biome);
      return;
    }

    // Get current player position to determine tile depth inside new zone
    const position = useGameStore.getState().player?.position;

    // If no position available, fall back to immediate commit (defensive)
    if (!position) {
      this.commitZoneTransition(newZoneId, biome);
      return;
    }

    const { px: posPx, py: posPy } = tileToPixelCenter(position.x, position.y);
    const depth = this.getZoneBoundaryDepthPx(posPx, posPy);

    if (depth >= HYSTERESIS_PX) {
      // Deep enough - commit immediately (e.g., teleport or fast movement)
      this.commitZoneTransition(newZoneId, biome);
    } else {
      // Near boundary - store as pending and wait for player to go deeper
      // NOTE: We do NOT call updateChunks here - the 3x3 grid from the current zone
      // already includes this adjacent zone. Calling it would trigger load/unload thrashing.
      this.pendingZoneId = newZoneId;
      this.pendingBiome = biome;
      console.log('[WorldScene] Zone transition pending at depth', depth, 'px - awaiting', HYSTERESIS_PX, 'px');
    }
  }

  /**
   * Full zone reset for teleportation (hub recall, NPC portals).
   * Clears all chunk state, entity containers, and tile sprites, then re-requests
   * the new zone's chunks from scratch.
   */
  fullZoneReset(newZoneId: string, biome: BiomeType): void {
    console.log('[WorldScene] fullZoneReset:', { from: this.currentZoneId, to: newZoneId });

    // Cancel any pending zone transition
    this.pendingZoneId = null;
    this.pendingBiome = null;

    // Clear all rendered tiles
    this.chunkTiles.forEach(tiles => {
      tiles.forEach(tile => {
        const children = tile.getAll();
        children.forEach(child => child.destroy());
        tile.removeAll(true);
        tile.destroy();
      });
    });
    this.chunkTiles.clear();

    // Clear all entities
    this.clearEntities();

    // Clear all other players
    this.clearOtherPlayers();

    // Clear chunk manager state and re-request
    if (this.chunkManager) {
      this.chunkManager.clear();
    }

    // Rebuild fog from saved state for the new zone
    if (this.fogRenderer && this.fogManager) {
      this.fogRenderer.redrawFromState(this.fogManager);
    }

    // Clear rare node markers
    if (this.entityRenderer) {
      this.entityRenderer.clearAllQuestMarkers();
    }

    // Update zone state
    this.currentZoneId = newZoneId;
    this.currentBiome = biome;

    // Instant-swap weather for teleport
    this.weatherSystem?.setBiome(biome, true);
    // Instant-swap atmosphere for teleport (ATMO-03)
    this.atmosphereSystem?.setBiome(biome, true);
    this.updateMinimapWeatherIgnore();

    // Hub zones: disable day/night cycle (controlled indoor environment)
    if (isHubZone(newZoneId)) {
      this.dayNightCycle?.pause();
    } else {
      this.dayNightCycle?.resume();
    }

    // Update HUD
    if (this.zoneHUD) {
      this.zoneHUD.updateZone(newZoneId, biome);
    }

    // Show cinematic zone name notification for teleportation — Phase 138
    this.showZoneCinematic(biome);

    // The new zone data will arrive via zone:state -> loadZoneFromState
    // which will call chunkManager.receiveChunk and updateChunks
  }

  /**
   * Phase 138: Show zone name cinematic with 30-second per-zone cooldown.
   * Calls triggerZoneCinematic on gameStore to display the Dark Souls-style overlay.
   */
  private showZoneCinematic(biome: BiomeType): void {
    const zoneId = this.currentZoneId;
    const now = Date.now();
    const lastShown = this.zoneCinematicCooldowns.get(zoneId) ?? 0;

    if (now - lastShown < ZONE_CINEMATIC_COOLDOWN_MS) {
      return; // Cooldown active — suppress
    }

    this.zoneCinematicCooldowns.set(zoneId, now);

    const zoneName = BIOME_DISPLAY_NAMES[biome] ?? this.formatBiomeName(biome);
    const tier = BIOME_TIERS[biome] ?? 1;
    const tierLabel = TIER_LABELS[tier];

    useGameStore.getState().triggerZoneCinematic(zoneName, tierLabel, tier);
  }

  /**
   * Format biome type to a readable name (e.g., 'void_plains' -> 'Void Plains').
   */
  private formatBiomeName(biome: BiomeType): string {
    return biome
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Update minimap camera to ignore current weather emitters.
   * Called after each weather transition to ensure new emitters are excluded.
   */
  private updateMinimapWeatherIgnore(): void {
    if (this.minimapCamera && this.weatherSystem) {
      const emitters = this.weatherSystem.getActiveEmitters();
      if (emitters.length > 0) {
        this.minimapCamera.ignore(emitters);
      }
    }
  }

  private parseZoneCoords(zoneId: string): { x: number; y: number } {
    // Hub zones are instanced at origin (0, 0)
    if (isHubZone(zoneId)) {
      return { x: 0, y: 0 };
    }
    // Open-world zones use z_X_Y format
    const parts = zoneId.split('_');
    return {
      x: parseInt(parts[1], 10),
      y: parseInt(parts[2], 10),
    };
  }

  /**
   * Calculate how many pixels deep into a zone the pixel position is.
   * Returns 0 at zone edge, up to (ZONE_SIZE * TILE_SIZE_PX / 2) at center.
   * Used for hysteresis: commit zone transition when depth >= HYSTERESIS_PX (384px).
   */
  private getZoneBoundaryDepthPx(px: number, py: number): number {
    const zonePxSize = getZoneSize(this.currentZoneId) * TILE_SIZE_PX;
    const fromLeft = px;
    const fromRight = zonePxSize - px;
    const fromTop = py;
    const fromBottom = zonePxSize - py;
    return Math.min(fromLeft, fromRight, fromTop, fromBottom);
  }

  /**
   * Update target highlight based on pixel distance to targeted entity.
   * Called from the position update path after each player position change.
   * Phase 134 will switch from tile→pixel conversion to real-time pixel positions.
   */
  private updateRangeIndicator(playerPx: number, playerPy: number): void {
    if (!this.targetHighlight) return;
    const targetId = this.targetHighlight.getTargetEntityId();
    if (!targetId) return;

    // Find entity in entity store
    const entity = useEntityStore.getState().entities.get(targetId);
    if (!entity) return;

    const { px: ex, py: ey } = tileToPixelCenter(entity.position.x, entity.position.y);
    const dist = pixelDistanceTo(playerPx, playerPy, ex, ey);

    // Determine appropriate range based on entity type
    // Use basic_strike range (1 tile = TILE_SIZE_PX = 128px) for creatures, GATHER_RANGE_PX for resources
    const isCreature = entity.type === 'creature';
    const rangePx = isCreature ? 1 * TILE_SIZE_PX : GATHER_RANGE_PX;
    const inRange = dist <= rangePx;

    this.targetHighlight.setInRange(inRange);
  }

  /**
   * Check NPC proximity and update nearestNpcInRange field.
   * Called from the position update path.
   * Per user decision: instant appear/disappear at range boundary (no fade).
   * nearestNpcInRange gates npc:interact emissions to prevent interaction while too far.
   */
  private updateNpcProximity(playerPx: number, playerPy: number): void {
    const entities = useEntityStore.getState().entities;
    if (!entities) return;

    let closestNpcInRange: Entity | null = null;
    let closestDist = Infinity;

    for (const entity of entities.values()) {
      if (entity.type !== 'npc' || !entity.active) continue;
      const { px: ex, py: ey } = tileToPixelCenter(entity.position.x, entity.position.y);
      const dist = pixelDistanceTo(playerPx, playerPy, ex, ey);
      if (dist <= NPC_INTERACT_RANGE_PX && dist < closestDist) {
        closestDist = dist;
        closestNpcInRange = entity;
      }
    }

    this.nearestNpcInRange = closestNpcInRange;
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

    // Use actual array dimensions — hub zones may be 128x128
    const mapHeight = tiles.length;
    const mapWidth = tiles[0]?.length ?? 0;

    // Create tiles using WORLD coordinates for proper global depth sorting
    // Tiles are added directly to scene so their depth participates in global sorting
    for (let y = 0; y < mapHeight; y++) {
      for (let x = 0; x < mapWidth; x++) {
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

    // Create POI sprites for this chunk
    if (chunkData.pois && chunkData.pois.length > 0 && this.poiRenderer) {
      this.poiRenderer.createPoisForChunk(chunkData.pois, chunkX, chunkY, this.discoveredPoiIds);
    }

    this.chunkTiles.set(zoneId, chunkTileArray);

    if (zoneId === this.currentZoneId) {
      this.currentBiome = biome;
      this.currentTiles = tiles;
      this.currentHeights = heights;
      this.currentStructures = structures;
      if (this.zoneHUD) {
        this.zoneHUD.updateZone(zoneId, biome);
      }
      // Start weather on first chunk render for current zone
      if (this.weatherSystem && !this.weatherSystem.hasActiveWeather()) {
        this.weatherSystem.setBiome(biome, true);
        this.atmosphereSystem?.setBiome(biome, true);
        this.updateMinimapWeatherIgnore();
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

    // Store npcId for NPC entities (for quest marker tracking)
    if (entity.type === 'npc' && 'npcId' in entity) {
      container.setData('npcId', (entity as Npc).npcId);
    }

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
    // Clear highlight with fade if despawned entity was targeted (fade out for death animation)
    if (this.targetHighlight?.isHighlighting(entityId)) {
      this.targetHighlight.hide(true);
    }

    const container = this.entitySprites.get(entityId);
    if (container) {
      // CRAI-07: Clean up frenzy tween before destroying container
      this.entityRenderer?.cleanupFrenzyEffect(entityId);

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

    // Despawn entity if marked inactive (creature died, resource depleted, etc.)
    if ('active' in changes && changes.active === false) {
      this.despawnEntity(entityId);
      return;
    }

    // Update position with smooth movement animation
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
      // Convert to world coordinates
      const { worldX, worldY } = this.positionToWorldCoords(changes.position);
      // Calculate target screen position
      const screenPos = this.isoTransform.gridToScreen(worldX, worldY);
      const elevationOffset = elevation * 128; // ELEVATION_HEIGHT_STEP (1.0 × diamond height)
      const targetY = screenPos.y - elevationOffset;

      // Calculate movement direction for animated creatures
      const oldX = container.getData('gridX') as number;
      const oldY = container.getData('gridY') as number;
      const dx = worldX - oldX;
      const dy = worldY - oldY;
      const newFacing = this.calculateFacingDirection(dx, dy);

      // Handle animated creature sprites
      const speciesId = container.getData('speciesId') as string | undefined;
      const entitySprite = container.getData('entitySprite') as Phaser.GameObjects.Sprite | undefined;

      if (speciesId && entitySprite && newFacing) {
        const currentFacing = container.getData('facing') as Direction || 's';
        container.setData('facing', newFacing);

        // Play walk animation
        const animKey = `${speciesId}-walk-${newFacing}`;
        if (!entitySprite.anims.isPlaying || entitySprite.anims.currentAnim?.key !== animKey) {
          entitySprite.play(animKey);
        }
      }

      // Kill any existing movement tween on this container
      this.tweens.killTweensOf(container);

      // Smooth movement tween (500ms to complete before next AI tick at 1000ms)
      this.tweens.add({
        targets: container,
        x: screenPos.x,
        y: targetY,
        duration: 500,
        ease: 'Linear',
        onUpdate: () => {
          // Update depth during movement for correct sorting
          if (this.depthSorter) {
            this.depthSorter.markDirty(entityId);
          }
          // Update highlight position if this entity is highlighted
          if (this.targetHighlight?.isHighlighting(entityId)) {
            this.targetHighlight.updatePosition(container);
          }
        },
        onComplete: () => {
          // Update stored grid position and elevation after tween completes
          container.setData('gridX', worldX);
          container.setData('gridY', worldY);
          container.setData('elevation', elevation);
          const depth = this.isoTransform!.calculateDepth(worldX, worldY, elevation, 0, true);
          container.setDepth(depth);

          // Stop walk animation and return to idle for animated creatures
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
      // Find and destroy old health bar using stored reference (avoids fragile Y-position search)
      const oldHealthBar = container.getData('healthBar') as Phaser.GameObjects.Container | undefined;
      if (oldHealthBar) {
        oldHealthBar.destroy();
        container.setData('healthBar', null);
      }

      // Create new health bar if damaged (assuming we have access to entity data)
      // For now, we need the full entity to determine maxHealth
      // This is a limitation - we'll recreate health bar only if health is explicitly in changes
      // and we have both health and maxHealth in the changes
      const creatureChanges = changes as Partial<Creature>;
      if (creatureChanges.health !== undefined && creatureChanges.maxHealth !== undefined) {
        if (creatureChanges.health < creatureChanges.maxHealth) {
          // Get actual sprite height for correct UI positioning
          const actualSpriteHeight = (container.getData('actualSpriteHeight') as number) ?? 256 * ((container.getData('entityScale') as number) ?? 2.5);
          const uiBaseY = -actualSpriteHeight - 20;

          // Get entity data for creature info
          const entityId = container.getData('entityId') as string;
          const entity = entityId ? useEntityStore.getState().entities.get(entityId) : null;
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
        // Find and destroy old yield bar using stored reference (avoids fragile Y-position search)
        const oldYieldBar = container.getData('yieldBar') as Phaser.GameObjects.Graphics | undefined;
        if (oldYieldBar) {
          oldYieldBar.destroy();
        }

        // Create new yield bar with updated value
        const newYieldBar = this.entityRenderer.createHealthBar(yieldValue, maxYield);
        newYieldBar.y = -actualSpriteHeight - 20;
        container.add(newYieldBar);

        // Store new reference for next update
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
        // Predator revealed -- fade in with brief flash
        this.entityRenderer.applyStealthReveal(container);
      } else if (stealthed) {
        container.setAlpha(0);
        container.setData('stealthed', true);
      }
    }
  }

  addPlayer(player: PlayerPublic): void {
    if (this.playerSprites.has(player.id) || !this.isoTransform) return;

    // Get elevation for the correct zone
    const elevation = this.getTileElevation(player.position.x, player.position.y, player.position.zoneId);
    const elevationOffset = elevation * 128; // ELEVATION_HEIGHT_STEP (1.0 × diamond height)
    // Use world coordinates for screen position
    const { worldX, worldY } = this.positionToWorldCoords(player.position);
    const screenPos = this.isoTransform.gridToScreen(worldX, worldY);

    const container = this.add.container(screenPos.x, screenPos.y - elevationOffset);
    container.setData('gridX', worldX);
    container.setData('gridY', worldY);
    container.setData('elevation', elevation);

    // Elliptical drop shadow at ground level (y=0 = tile surface)
    const shadow = this.add.ellipse(0, 0, 120, 60, 0x000000, 0.3);
    container.add(shadow);

    // Player sprite with south-facing character texture (remote players always face south for now)
    // 56px astronaut sprites scaled to ~336px visual (6x width, 4.5x height for isometric squash)
    const sprite = this.add.sprite(0, 0, 'character-idle-s');
    sprite.setOrigin(0.5, 1.0);
    sprite.setScale(6, 4.5);
    sprite.setTint(this.getFactionColor(player.faction));
    container.add(sprite);
    container.setData('characterSprite', sprite);
    container.setData('isMoving', false);
    container.setData('facing', 's');

    const depth = this.isoTransform.calculateDepth(worldX, worldY, elevation, 0, true);
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
    if (!container || !this.isoTransform) return;

    // Get elevation for the correct zone
    const elevation = this.getTileElevation(position.x, position.y, position.zoneId);
    const elevationOffset = elevation * 128; // ELEVATION_HEIGHT_STEP (1.0 × diamond height)
    // Use world coordinates for screen position
    const { worldX, worldY } = this.positionToWorldCoords(position);
    const screenPos = this.isoTransform.gridToScreen(worldX, worldY);

    // Calculate movement direction from position delta
    const oldX = container.getData('gridX') as number;
    const oldY = container.getData('gridY') as number;
    const dx = worldX - oldX;
    const dy = worldY - oldY;
    const newFacing = this.calculateFacingDirection(dx, dy);

    // Get character sprite for animation control
    const characterSprite = container.getData('characterSprite') as Phaser.GameObjects.Sprite | undefined;
    const currentFacing = container.getData('facing') as Direction || 's';

    // Update facing and start animation
    if (characterSprite && newFacing) {
      container.setData('facing', newFacing);
      const isMoving = container.getData('isMoving') as boolean;

      if (!isMoving || newFacing !== currentFacing) {
        characterSprite.play(`character-run-${newFacing}`);
        container.setData('isMoving', true);
      }
    }

    // Mark player dirty for depth sorting
    if (this.depthSorter) {
      this.depthSorter.markDirty(playerId);
    }

    this.tweens.killTweensOf(container);
    this.tweens.add({
      targets: container,
      x: screenPos.x,
      y: screenPos.y - elevationOffset,
      duration: 100,
      ease: 'Linear',
      onComplete: () => {
        container.setData('gridX', worldX);
        container.setData('gridY', worldY);
        container.setData('elevation', elevation);
        const depth = this.isoTransform!.calculateDepth(worldX, worldY, elevation, 0, true);
        container.setDepth(depth);

        // Stop animation and return to idle
        if (characterSprite) {
          characterSprite.stop();
          const facing = container.getData('facing') as Direction || 's';
          characterSprite.setTexture(`character-idle-${facing}`);
          container.setData('isMoving', false);
        }
      }
    });
  }

  /**
   * Calculate facing direction from movement delta.
   */
  private calculateFacingDirection(dx: number, dy: number): Direction | null {
    if (dx === 0 && dy === 0) return null;

    // 8-directional mapping based on dx/dy
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

  /**
   * Snap local player sprite to a tile position (used for initial spawn and respawn).
   * Movement rendering is handled by updateLocalPlayerFromPixels via pixel movement.
   */
  updateLocalPlayerSprite(position: Position): void {
    if (!this.localPlayer || !this.isoTransform) return;

    // Get elevation for the correct zone
    const elevation = this.getTileElevation(position.x, position.y, position.zoneId);
    const elevationOffset = elevation * 128; // ELEVATION_HEIGHT_STEP (1.0 x diamond height)
    // Use world coordinates for screen position so player aligns with chunk positions
    const { worldX, worldY } = this.positionToWorldCoords(position);
    const screenPos = this.isoTransform.gridToScreen(worldX, worldY);
    const targetY = screenPos.y - elevationOffset;

    // Snap position (no tween — pixel movement handles smooth rendering)
    this.localPlayer.setPosition(screenPos.x, targetY);

    // Update grid data
    this.localPlayer.setData('gridX', worldX);
    this.localPlayer.setData('gridY', worldY);
    this.localPlayer.setData('elevation', elevation);

    // Update depth
    const depth = this.isoTransform.calculateDepth(worldX, worldY, elevation, 10, true);
    this.localPlayer.setDepth(depth);

    // Check if a pending zone transition should commit
    this.checkPendingZoneTransition(position);

    // Update range indicator and NPC proximity
    const { px: playerPx, py: playerPy } = tileToPixelCenter(position.x, position.y);
    this.updateRangeIndicator(playerPx, playerPy);
    this.updateNpcProximity(playerPx, playerPy);

    // Check if player landed on a portal tile (TileId.PORTAL = 16) — emit portal:use if so.
    // checkPortalTile is debounced by position key so duplicate calls are safe.
    this.checkPortalTile(position);

    // Reveal fog at new position
    if (this.fogManager && this.fogRenderer) {
      // Get tile ID at player position for visibility modifier
      let tileId: string | undefined;
      if (this.currentTiles && position.y < this.currentTiles.length && position.x < this.currentTiles[0]?.length) {
        const tileNumericId = this.currentTiles[position.y]?.[position.x];
        if (tileNumericId !== undefined) {
          tileId = tileIdToString(tileNumericId as TileId);
        }
      }

      // Reveal with biome and tile visibility modifiers
      const newlyRevealed = this.fogManager.revealAtPosition(worldX, worldY, this.currentBiome, tileId);
      if (newlyRevealed.size > 0) {
        this.fogRenderer.revealTiles(newlyRevealed);
      }
    }

    // Check for POI discovery
    if (this.poiRenderer && this.fogManager?.isRevealed(worldX, worldY)) {
      const poiId = this.poiRenderer.checkPlayerOnPoi(worldX, worldY);
      if (poiId && !this.discoveredPoiIds.has(poiId)) {
        // Request discovery from server
        gameSocket.emit('poi:discover', { poiId, worldX, worldY });
      }
    }
  }

  updateLocalPlayer(position: Position): void {
    // Create player sprite if it doesn't exist
    if (!this.localPlayer) {
      this.createLocalPlayer(position);
      // Set up camera to follow player
      // Phase 134: center-locked camera — no lerp delay (per CONTEXT decision)
      this.cameras.main.startFollow(this.localPlayer!, true, 1.0, 1.0);
      // Also set minimap to follow player
      if (this.minimapCamera) {
        this.minimapCamera.startFollow(this.localPlayer!);
      }
    } else {
      this.updateLocalPlayerSprite(position);
    }
  }

  // ── Phase 134: Pixel movement rendering ──────────────────────────────────

  /**
   * Update local player sprite from pixel-space position.
   * Called every frame by handleInput when the pixel movement controller reports movement.
   * Uses setPosition (no tweens) for instant, smooth rendering.
   */
  private updateLocalPlayerFromPixels(px: number, py: number): void {
    if (!this.localPlayer || !this.isoTransform) return;

    // Convert pixel position to fractional tile coordinates
    const gridX = px / TILE_SIZE_PX;
    const gridY = py / TILE_SIZE_PX;

    // Get zone offset for world coordinates
    const zoneCoords = this.parseZoneCoords(this.currentZoneId);
    const worldX = zoneCoords.x * ZONE_SIZE + gridX;
    const worldY = zoneCoords.y * ZONE_SIZE + gridY;

    // Get elevation at current tile (integer tile coords)
    const tileX = Math.floor(gridX);
    const tileY = Math.floor(gridY);
    const elevation = this.getTileElevation(tileX, tileY);
    const elevationOffset = elevation * 128;

    // Convert to isometric screen position
    const screenPos = this.isoTransform.gridToScreen(worldX, worldY);

    // Set sprite position directly (no tween — instant for pixel movement)
    this.localPlayer.setPosition(screenPos.x, screenPos.y - elevationOffset);

    // Update grid data for depth sorting
    this.localPlayer.setData('gridX', worldX);
    this.localPlayer.setData('gridY', worldY);
    this.localPlayer.setData('elevation', elevation);

    // Update depth
    const depth = this.isoTransform.calculateDepth(worldX, worldY, elevation, 10, true);
    this.localPlayer.setDepth(depth);

    // Mark dirty for depth sorter
    if (this.depthSorter) {
      this.depthSorter.markDirty('local');
    }

    // Update range indicator and NPC proximity using real pixel positions
    this.updateRangeIndicator(px, py);
    this.updateNpcProximity(px, py);

    // Check zone transition at pixel granularity
    this.checkPixelZoneTransition(px, py);

    // Fog reveal at tile position
    const intWorldX = Math.floor(worldX);
    const intWorldY = Math.floor(worldY);
    if (this.fogManager && this.fogRenderer) {
      let tileId: string | undefined;
      if (this.currentTiles && tileY < this.currentTiles.length && tileX < (this.currentTiles[0]?.length ?? 0)) {
        const tileNumericId = this.currentTiles[tileY]?.[tileX];
        if (tileNumericId !== undefined) {
          tileId = tileIdToString(tileNumericId as TileId);
        }
      }
      const newlyRevealed = this.fogManager.revealAtPosition(intWorldX, intWorldY, this.currentBiome, tileId);
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

    // Portal tile check
    this.checkPortalTileAtPixels(tileX, tileY);
  }

  /**
   * Check zone transition at pixel granularity.
   */
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
      gameSocket.emit('zone:request', { zoneId: newZoneId });
    }
  }

  /**
   * Check for portal tile at given tile coordinates (pixel-movement version).
   */
  private checkPortalTileAtPixels(tileX: number, tileY: number): void {
    if (!this.currentTiles) return;
    const tileNumericId = this.currentTiles[tileY]?.[tileX];
    if (tileNumericId === 16) { // TileId.PORTAL
      const key = `${tileX},${tileY}`;
      if (this.lastPortalEmitKey !== key) {
        this.lastPortalEmitKey = key;
        gameSocket.emit('portal:use', {});
      }
    } else {
      this.lastPortalEmitKey = null;
    }
  }

  /**
   * Handle server-authoritative position correction.
   * Called from gameStore when positionCorrection event arrives.
   */
  handlePositionCorrection(serverPx: number, serverPy: number, sequence: number): void {
    if (!this.pixelMovement) return;
    const result = this.pixelMovement.reconcile(serverPx, serverPy, sequence);
    if (result.corrected) {
      // Smooth snap-back: update sprite position to corrected position
      this.updateLocalPlayerFromPixels(result.px, result.py);
    }
  }

  /**
   * Update remote players from interpolation buffer each frame.
   */
  private updateRemotePlayerInterpolation(): void {
    if (!this.remoteInterpolator || !this.isoTransform) return;

    const now = Date.now();

    this.playerSprites.forEach((container, playerId) => {
      const interp = this.remoteInterpolator!.getInterpolatedPosition(playerId, now);
      if (!interp) return;

      // Convert pixel position to fractional tile coordinates
      const gridX = interp.px / TILE_SIZE_PX;
      const gridY = interp.py / TILE_SIZE_PX;

      // Add zone offset for world coordinates
      const zoneCoords = this.parseZoneCoords(this.currentZoneId);
      const worldX = zoneCoords.x * ZONE_SIZE + gridX;
      const worldY = zoneCoords.y * ZONE_SIZE + gridY;

      // Get elevation
      const tileX = Math.floor(gridX);
      const tileY = Math.floor(gridY);
      const elevation = this.getTileElevation(tileX, tileY);
      const elevationOffset = elevation * 128;

      const screenPos = this.isoTransform!.gridToScreen(worldX, worldY);

      // Set position directly (no tween — interpolation IS the smoothing)
      (container as unknown as Phaser.GameObjects.Container).setPosition(screenPos.x, screenPos.y - elevationOffset);

      // Update grid data for depth sorting
      container.setData('gridX', worldX);
      container.setData('gridY', worldY);
      container.setData('elevation', elevation);

      const depth = this.isoTransform!.calculateDepth(worldX, worldY, elevation, 0, true);
      (container as unknown as Phaser.GameObjects.Container).setDepth(depth);

      // Update animation based on interpolation state
      const characterSprite = container.getData('characterSprite') as Phaser.GameObjects.Sprite | undefined;
      if (characterSprite) {
        if (interp.moving && interp.direction) {
          const currentFacing = container.getData('facing') as Direction || 's';
          const isMoving = container.getData('isMoving') as boolean;
          if (!isMoving || interp.direction !== currentFacing) {
            container.setData('facing', interp.direction);
            characterSprite.play(`character-run-${interp.direction}`);
            container.setData('isMoving', true);
          }
        } else {
          const wasMoving = container.getData('isMoving') as boolean;
          if (wasMoving) {
            const facing = container.getData('facing') as Direction || 's';
            characterSprite.stop();
            characterSprite.setTexture(`character-idle-${facing}`);
            container.setData('isMoving', false);
          }
        }
      }

      // Mark dirty for depth sorter
      if (this.depthSorter) {
        this.depthSorter.markDirty(playerId);
      }
    });
  }

  /** Get the pixel movement controller (for gameStore integration). */
  getPixelMovementController(): PixelMovementController | null {
    return this.pixelMovement;
  }

  /** Get the remote player interpolator (for gameStore integration). */
  getRemoteInterpolator(): RemotePlayerInterpolator | null {
    return this.remoteInterpolator;
  }

  // ── End Phase 134 additions ─────────────────────────────────────────────

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

  /**
   * Show a floating damage number above the target entity.
   * Called by gameStore's combat:damage socket handler.
   *
   * @param defenderId - Entity or player ID that took damage
   * @param damage - Amount of damage dealt
   * @param isLocalPlayer - True if the local player took the damage (shows red)
   * @param fallbackPosition - Server-provided position for when entity has despawned
   */
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
      // Local player took damage - use local player sprite position
      targetX = this.localPlayer.x;
      targetY = this.localPlayer.y;
    } else {
      // Check entity sprites map
      const container = this.entitySprites.get(defenderId);
      if (container) {
        targetX = container.x;
        targetY = container.y;
      } else {
        // Check player sprites map (other players taking damage)
        const playerSprite = this.playerSprites.get(defenderId);
        if (playerSprite) {
          targetX = playerSprite.x;
          targetY = playerSprite.y;
        } else if (fallbackPosition && this.isoTransform) {
          // Entity despawned but we have position from server - convert to screen coords
          const player = useGameStore.getState().player;
          if (player) {
            const worldX = fallbackPosition.x - player.position.x;
            const worldY = fallbackPosition.y - player.position.y;
            const screenPos = this.isoTransform.gridToScreen(worldX, worldY);
            targetX = screenPos.x;
            targetY = screenPos.y; // Skip elevation for fallback - damage numbers just need approximate position
          } else {
            return;
          }
        } else {
          // Entity not found and no fallback position - skip
          return;
        }
      }
    }

    EntityRenderer.createFloatingDamage(this, targetX, targetY, damage, isLocalPlayer, damageType);
  }

  /**
   * Handle local player death - disable movement controls.
   */
  handlePlayerDeath(): void {
    // Pixel movement stops naturally when keys are released
    // Could add visual feedback here (grayscale, overlay, etc.) in future
  }

  /**
   * Handle local player respawn - re-enable movement and update position.
   */
  handlePlayerRespawn(position: Position): void {
    // Update local player position
    this.updateLocalPlayer(position);
    // Trigger zone load if zone changed (zone:state will follow from server)
    // The zone:state handler will load the new zone data
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
   * Reset movement input state to prevent stuck keys.
   * Called when modal opens to clear any keys that were held during the click.
   */
  resetMovementInput(): void {
    // Reset WASD keys
    if (this.wasd) {
      this.wasd.W.reset();
      this.wasd.A.reset();
      this.wasd.S.reset();
      this.wasd.D.reset();
    }
    // Reset cursor keys
    if (this.cursors) {
      this.cursors.up.reset();
      this.cursors.down.reset();
      this.cursors.left.reset();
      this.cursors.right.reset();
    }
  }

  /**
   * Check if a world coordinate tile is blocked.
   * Looks up the correct chunk from ChunkManager.
   * Returns true if blocked or if chunk not loaded (conservative).
   */
  isWorldTileBlocked(worldX: number, worldY: number): boolean {
    if (!this.chunkManager) return true; // No chunk manager = blocked

    // Hub zones: use local collision data directly (no cross-chunk reconstruction)
    if (isHubZone(this.currentZoneId)) {
      const chunk = this.chunkManager.getChunk(this.currentZoneId);
      if (!chunk?.data.collisions) return true;

      const terrainBlocked = chunk.data.collisions[worldY]?.[worldX] ?? true;
      if (terrainBlocked) return true;

      const entityAtTile = useEntityStore.getState().getEntityAtPosition(worldX, worldY, this.currentZoneId);
      if (entityAtTile) {
        const blocksMovement = entityAtTile.type === 'mineral' || entityAtTile.type === 'plant';
        if (blocksMovement) return true;
      }

      return false;
    }

    // Open-world zones: calculate which chunk this tile belongs to
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

    // 2. Entity blocking - only static gatherable entities block
    const entityAtTile = useEntityStore.getState().getEntityAtPosition(localX, localY, zoneId);
    if (entityAtTile) {
      // Only minerals and plants block movement
      const blocksMovement = entityAtTile.type === 'mineral' || entityAtTile.type === 'plant';
      if (blocksMovement) return true;
    }

    return false;
  }

  setCollisionMap(collisionMap: boolean[][]): void {
    this.collisionMap = collisionMap;
    // Set collision callback for pixel movement — uses cross-chunk lookup
    if (this.pixelMovement) {
      // Capture current zone offset for converting zone-local → world coordinates
      const zoneCoords = this.parseZoneCoords(this.currentZoneId);
      const currentSize = getZoneSize(this.currentZoneId);
      const offsetX = zoneCoords.x * currentSize;
      const offsetY = zoneCoords.y * currentSize;
      this.pixelMovement.setCollisionCallback((tx, ty) => {
        return this.isWorldTileBlocked(offsetX + tx, offsetY + ty);
      });
    }
  }

  shutdown(): void {
    // Phase 138: clear zone cinematic cooldown map
    this.zoneCinematicCooldowns.clear();

    // Unregister quest event listeners to prevent memory leaks
    gameSocket.off('quest:progress', this.handleQuestProgress);
    gameSocket.off('quest:completed', this.handleQuestCompleted);
    gameSocket.off('quest:abandoned', this.handleQuestAbandoned);

    // Clean up rare node markers
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
    this.isoTransform = null;
    if (this.entityRenderer) {
      this.entityRenderer.destroyStampedeListener(); // CRAI-06: cleanup stampede listener
      this.entityRenderer = null;
    }
    if (this.weatherSystem) {
      this.weatherSystem.destroy();
      this.weatherSystem = null;
    }
    if (this.dayNightCycle) {
      this.dayNightCycle.destroy();
      this.dayNightCycle = null;
    }
    if (this.atmosphereSystem) {
      this.atmosphereSystem.destroy();
      this.atmosphereSystem = null;
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
    this.lastCullBounds = null;

    // Cleanup fog system
    if (this.fogManager) {
      this.fogManager.flush(); // Final save on shutdown
      this.fogManager = null;
    }
    if (this.fogRenderer) {
      this.fogRenderer.destroy();
      this.fogRenderer = null;
    }
    this.fogInitialized = false;

    // Cleanup POI system
    if (this.poiRenderer) {
      this.poiRenderer.destroy();
      this.poiRenderer = null;
    }
    this.discoveredPoiIds.clear();
  }

  /**
   * Apply initial quest markers to NPCs when entering a zone.
   * Called when npc:quest-markers event is received from server.
   */
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

  /**
   * Update NPC quest marker after interaction response.
   * Called when npc:interact:response is received from server.
   */
  private updateNpcQuestMarker(data: {
    npcId: string;
    availableQuests?: Array<{ questId: string }>;
    activeQuests?: Array<{ questId: string }>;
    readyQuests?: Array<{ questId: string }>;
  }): void {
    if (!this.entityRenderer) return;

    const npcContainer = this.findNpcContainerById(data.npcId);
    if (!npcContainer) return;

    // Determine marker type based on quest state
    // Priority: ready > available > none
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

  /**
   * Find NPC container by npcId.
   * Returns the entity container if found, undefined otherwise.
   */
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

  // Quest event handlers for real-time marker updates
  private handleQuestProgress = (data: { questId: string }): void => {
    this.updateMarkerForQuestId(data.questId);
  };

  private handleQuestCompleted = (data: { questId: string }): void => {
    this.updateMarkerForQuestId(data.questId);
  };

  private handleQuestAbandoned = (data: { questId: string }): void => {
    this.updateMarkerForQuestId(data.questId);
  };

  /**
   * Update quest marker for NPC associated with questId.
   * Called when quest state changes (accept, progress, complete, abandon).
   */
  private updateMarkerForQuestId(questId: string): void {
    const questDef = QuestRegistry.get(questId);
    if (!questDef.questGiverId) return; // Auto-discover quest or unknown, no NPC marker

    const npcContainer = this.findNpcContainerById(questDef.questGiverId);
    if (!npcContainer) return; // NPC not in current zone

    const markerType = this.computeMarkerTypeForNpc(questDef.questGiverId);

    this.entityRenderer?.updateQuestMarker(
      npcContainer.getData('entityId') as string,
      markerType,
      npcContainer
    );
  }

  /**
   * Compute marker type for NPC from current quest state.
   * Priority: ready (?) > available (!) > none
   */
  private computeMarkerTypeForNpc(npcId: string): 'available' | 'ready' | 'none' {
    const questStore = useQuestStore.getState();
    const player = useGameStore.getState().player;
    if (!player) return 'none';

    // 1. Check for ready quests (highest priority) - active quests with all objectives complete
    for (const activeQuest of questStore.activeQuests) {
      const questDef = QuestRegistry.get(activeQuest.questId);
      if (questDef.questGiverId === npcId) {
        const allComplete = activeQuest.objectives.every(obj => obj.complete);
        if (allComplete) {
          return 'ready'; // Can turn in
        }
      }
    }

    // 2. Check for available quests - not active, not completed (unless repeatable), meets prerequisites
    // Neutral faction has no quests (only verdant, helix, nexus)
    if (player.faction === 'neutral') return 'none';

    const allQuests = QuestRegistry.getByFaction(player.faction);
    const hasAvailable = allQuests.some(q => {
      if (q.questGiverId !== npcId) return false;

      // Not already active
      const isActive = questStore.activeQuests.some(aq => aq.questId === q.id);
      if (isActive) return false;

      // Not completed (unless repeatable)
      const completed = questStore.completedQuests.some(cq => cq.questId === q.id);
      if (completed && !q.isRepeatable) return false;

      // Check prerequisites
      if (q.prerequisiteQuestIds && q.prerequisiteQuestIds.length > 0) {
        const metPrereqs = q.prerequisiteQuestIds.every(prereqId =>
          questStore.completedQuests.some(cq => cq.questId === prereqId)
        );
        if (!metPrereqs) return false;
      }

      return true;
    });

    if (hasAvailable) {
      return 'available'; // Can accept
    }

    return 'none'; // No quests
  }

  /**
   * Refresh all rare node markers from store state.
   * Called on initial load and zone changes.
   */
  private refreshRareNodeMarkers(): void {
    // Clear existing markers
    this.rareNodeMarkers.forEach((marker) => marker.destroy());
    this.rareNodeMarkers.clear();

    // Get current zone's discovered resources
    const discoveries = useGameStore.getState().discoveredResources;
    const currentZone = useGameStore.getState().zoneState;

    if (!currentZone) return;

    for (const resource of discoveries) {
      // Only show markers for current zone
      if (resource.zoneId !== currentZone.zoneId) continue;

      this.addRareNodeMarker(resource);
    }
  }

  /**
   * Add a single rare node marker to the scene.
   */
  private addRareNodeMarker(resource: DiscoveredResource): void {
    if (this.rareNodeMarkers.has(resource.entityId)) return;
    if (!this.isoTransform) return;

    // Convert world coords to screen position
    const screenPos = this.isoTransform.gridToScreen(
      resource.worldX,
      resource.worldY
    );

    // Position marker above entity (offset upward)
    const marker = createRareNodeMarker(
      this,
      screenPos.x,
      screenPos.y - 300, // Above entity nameplate
      resource.rarity
    );

    this.rareNodeMarkers.set(resource.entityId, marker);
  }

  /**
   * Remove marker when resource is harvested.
   */
  private removeRareNodeMarker(entityId: string): void {
    const marker = this.rareNodeMarkers.get(entityId);
    if (marker) {
      marker.destroy();
      this.rareNodeMarkers.delete(entityId);
    }
  }
}
