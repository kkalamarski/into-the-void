import Phaser from 'phaser';
import { SHEET_DIMENSIONS } from '../../config/itemSpriteMap';
import { ProceduralTileGenerator } from '../rendering/ProceduralTileGenerator';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' });
  }

  preload(): void {
    // Create loading bar
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const progressBar = this.add.graphics();
    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x1e1e2e, 0.8);
    progressBox.fillRect(width / 2 - 160, height / 2 - 25, 320, 50);

    const loadingText = this.add.text(width / 2, height / 2 - 50, 'Loading...', {
      fontSize: '20px',
      color: '#e0e0e0',
    });
    loadingText.setOrigin(0.5, 0.5);

    const percentText = this.add.text(width / 2, height / 2, '0%', {
      fontSize: '18px',
      color: '#e0e0e0',
    });
    percentText.setOrigin(0.5, 0.5);

    // Update progress bar
    this.load.on('progress', (value: number) => {
      percentText.setText(`${Math.round(value * 100)}%`);
      progressBar.clear();
      progressBar.fillStyle(0x7b68ee, 1);
      progressBar.fillRect(width / 2 - 150, height / 2 - 15, 300 * value, 30);
    });

    this.load.on('complete', () => {
      progressBar.destroy();
      progressBox.destroy();
      loadingText.destroy();
      percentText.destroy();
    });

    // Load game assets
    this.loadAssets();
  }

  private loadAssets(): void {
    this.load.setPath('assets/');

    // Dev-mode guard: warn if any code path tries to load tile PNGs at runtime
    if (import.meta.env.DEV) {
      const originalLoadImage = this.load.image.bind(this.load);
      const originalLoadSpritesheet = this.load.spritesheet.bind(this.load);
      const tilePattern = /^tile_|^sprites\/tile_|void-tiles|crystal-tiles/;

      this.load.image = ((...args: Parameters<typeof this.load.image>) => {
        const key = typeof args[0] === 'string' ? args[0] : '';
        const url = typeof args[1] === 'string' ? args[1] : '';
        if (tilePattern.test(key) || tilePattern.test(url)) {
          console.warn(`[PreloadScene] Unexpected tile PNG load detected: key="${key}" url="${url}"`);
        }
        return originalLoadImage(...args);
      }) as typeof this.load.image;

      this.load.spritesheet = ((...args: Parameters<typeof this.load.spritesheet>) => {
        const key = typeof args[0] === 'string' ? args[0] : '';
        const url = typeof args[1] === 'string' ? args[1] : '';
        if (tilePattern.test(key) || tilePattern.test(url)) {
          console.warn(`[PreloadScene] Unexpected tile PNG spritesheet load detected: key="${key}" url="${url}"`);
        }
        return originalLoadSpritesheet(...args);
      }) as typeof this.load.spritesheet;
    }

    // Tile textures baked procedurally in create() via ProceduralTileGenerator

    // Load directional character sprites
    this.loadCharacterSprites();

    // Load creature sprites (Void Crawler, etc.)
    this.loadCreatureSprites();

    // Load NPC directional sprites
    this.loadNpcSprites();

    // Load feature sprites (plants, minerals, artifacts)
    this.loadFeatureSprites();

    // Load item spritesheets (for ground items in game world)
    this.loadItemSpritesheets();

    // Quest marker sprites (UI elements, not tile PNGs)
    this.load.image('ui_quest_marker_available', 'sprites/ui_quest_marker_available.png');
    this.load.image('ui_quest_marker_ready', 'sprites/ui_quest_marker_ready.png');

    // Generate procedural textures for entities and fallbacks
    this.generateTileTextures();
  }

  private loadCreatureSprites(): void {
    // Direction mapping: grid directions to sprite files (same 45° rotation as character)
    const directionMap: Record<string, string> = {
      'n': 'north-east',
      'ne': 'east',
      'e': 'south-east',
      'se': 'south',
      's': 'south-west',
      'sw': 'west',
      'w': 'north-west',
      'nw': 'north',
    };

    const directions = Object.keys(directionMap);

    // Creature sprite definitions: speciesId -> folder name
    // Multiple creatures can share the same sprite folder (reuse)
    const creatureSprites: Record<string, string> = {
      // --- Sprites with unique assets ---
      'creature_void_crawler': 'void-crawler',
      'creature_coastal_scuttler': 'coastal-scuttler',
      'creature_crystal_hunter': 'crystal-hunter',
      'creature_frost_stalker': 'frost-stalker',
      'creature_canopy_grazer': 'canopy-grazer',
      'creature_tide_crab': 'tide-crab',
      'creature_coastal_urchin': 'coastal-urchin',
      'creature_reef_scavenger': 'reef-scavenger',
      'creature_crystal_crawler': 'crystal-crawler',
      'creature_void_horror': 'void-horror',
      'creature_toxic_lurker': 'toxic-lurker',
      'creature_spore_carrier': 'spore-carrier',
      'creature_miasma_drifter': 'miasma-drifter',
      'creature_marsh_lurker': 'marsh-lurker',
      // --- Reused sprites (Tier II) ---
      'creature_dart_runner': 'frost-stalker',
      'creature_petrified_lurker': 'void-horror',
      'creature_kelp_grazer': 'neon-creature',
      'creature_tangle_stalker': 'marsh-lurker',
      'creature_current_rider': 'frost-stalker',
      'creature_echo_drifter': 'spore-carrier',
      'creature_phase_grazer': 'neon-creature',
      'creature_reality_scavenger': 'void-crawler',
      // --- Reused sprites (Tier III) ---
      'creature_magma_beast': 'crystal-hunter',
      'creature_ash_skimmer': 'coastal-scuttler',
      'creature_ice_burrower': 'crystal-crawler',
      'creature_null_feeder': 'neon-creature',
      'creature_dimensional_hunter': 'void-horror',
      'creature_rift_hunter': 'marsh-lurker',
      'creature_pressure_feeder': 'toxic-lurker',
      'creature_trench_hunter': 'void-horror',
      'creature_abyssal_scavenger': 'void-crawler',
      // --- Reused sprites (Tier IV) ---
      'creature_starfall_grazer': 'neon-creature',
      'creature_crater_stalker': 'marsh-lurker',
      'creature_guardian_construct': 'crystal-crawler',
      'creature_ruin_seeker': 'frost-stalker',
      'creature_relic_beast': 'crystal-hunter',
      'creature_void_grazer': 'marsh-lurker',
      'creature_anomaly_scavenger': 'void-crawler',
      'creature_void_stalker': 'void-horror',
      'creature_dimensional_aberration': 'toxic-lurker',
      'creature_abyssal_leviathan': 'toxic-lurker',
    };

    for (const [speciesId, folder] of Object.entries(creatureSprites)) {
      for (const dir of directions) {
        const filename = directionMap[dir];

        // Load idle frames from rotations/ directory
        this.load.image(
          `${speciesId}-idle-${dir}`,
          `sprites/creatures/${folder}/rotations/${filename}.png`
        );

        // Load walk animation frames (8 per direction)
        for (let frame = 0; frame < 8; frame++) {
          const frameStr = frame.toString().padStart(3, '0');
          this.load.image(
            `${speciesId}-walk-${dir}-${frame}`,
            `sprites/creatures/${folder}/animations/walk-8-frames/${filename}/frame_${frameStr}.png`
          );
        }
      }
    }
  }

  private loadNpcSprites(): void {
    // Direction mapping: grid directions to sprite files (same 45° rotation as character)
    const directionMap: Record<string, string> = {
      'n': 'north-east',
      'ne': 'east',
      'e': 'south-east',
      'se': 'south',
      's': 'south-west',
      'sw': 'west',
      'w': 'north-west',
      'nw': 'north',
    };

    // NPC sprite folders
    const npcSprites = ['npc-1', 'trader-npc', 'guard-npc', 'trader', 'guard', 'faction-rep', 'ambient', 'service'];

    for (const npcFolder of npcSprites) {
      for (const [dir, filename] of Object.entries(directionMap)) {
        this.load.image(
          `npc-${npcFolder}-${dir}`,
          `sprites/npc/${npcFolder}/rotations/${filename}.png`
        );
      }
    }
  }

  private loadFeatureSprites(): void {
    // Void biome features loaded from spritesheet (5 frames at 256x256):
    // 0: void tree, 1: void fern, 2: void crystal, 3: void slate, 4: void moss
    this.load.spritesheet('void-biome-features-sheet', 'sprites/features/void-biome-features.png', {
      frameWidth: 256,
      frameHeight: 256,
    });

    // Crystal biome features loaded from spritesheet (5 frames at 256x256):
    // 0: lattice moss, 1: crystal lichen, 2: prism bloom, 3: cave geode, 4: prismatic crystal
    this.load.spritesheet('crystal-biome-features-sheet', 'sprites/features/crystal-biome-features.png', {
      frameWidth: 256,
      frameHeight: 256,
    });

    // Acid/toxic biome features loaded from spritesheet (5 frames at 256x256):
    // 0: acid fern, 1: acid bloom, 2: chemical bloom, 3: corrosive deposit, 4: acid stone
    this.load.spritesheet('acid-biome-features-sheet', 'sprites/features/acid-biome-features.png', {
      frameWidth: 256,
      frameHeight: 256,
    });

    // Remaining feature sprites loaded from individual variant files
    const featureSprites: Array<{ entityId: string; folder: string; variants: number }> = [
      // Plants - fungal forest
      { entityId: 'plant_tendril_tree', folder: 'tendril-tree', variants: 1 },
      { entityId: 'plant_rare_fungi', folder: 'rare-fungi', variants: 4 },
      // Plants - volcanic ridge
      { entityId: 'plant_magma_bloom', folder: 'magma-bloom', variants: 4 },
    ];

    for (const { entityId, folder, variants } of featureSprites) {
      for (let v = 1; v <= variants; v++) {
        this.load.image(
          `${entityId}-v${v}`,
          `sprites/features/${folder}/variant_${v}.png`
        );
      }
    }
  }

  private loadItemSpritesheets(): void {
    // Load each item spritesheet so Phaser can render ground items with the correct frame.
    // The sheet key is the filename without extension (e.g., 'exo-suits').
    for (const [filename, dims] of Object.entries(SHEET_DIMENSIONS)) {
      const key = `item-sheet-${filename.replace('.png', '')}`;
      this.load.spritesheet(key, `sprites/items/${filename}`, {
        frameWidth: 128,
        frameHeight: 128,
        endFrame: dims.cols * dims.rows - 1,
      });
    }
  }

  private loadCharacterSprites(): void {
    // Direction mapping: grid directions to sprite files
    // Grid directions are rotated 45° from screen directions in isometric view:
    // - Grid 'n' (going -Y) appears as screen top-right → sprite faces 'north-east'
    // - Grid 'ne' (going +X,-Y) appears as screen right → sprite faces 'east'
    // - Grid 'e' (going +X) appears as screen bottom-right → sprite faces 'south-east'
    // - Grid 'se' (going +X,+Y) appears as screen down → sprite faces 'south'
    // - Grid 's' (going +Y) appears as screen bottom-left → sprite faces 'south-west'
    // - Grid 'sw' (going -X,+Y) appears as screen left → sprite faces 'west'
    // - Grid 'w' (going -X) appears as screen top-left → sprite faces 'north-west'
    // - Grid 'nw' (going -X,-Y) appears as screen up → sprite faces 'north'
    const directionMap: Record<string, string> = {
      'n': 'north-east',
      'ne': 'east',
      'e': 'south-east',
      'se': 'south',
      's': 'south-west',
      'sw': 'west',
      'w': 'north-west',
      'nw': 'north',
    };

    const directions = Object.keys(directionMap);

    for (const dir of directions) {
      const filename = directionMap[dir];

      // Load idle frames from rotations/ directory
      this.load.image(
        `character-idle-${dir}`,
        `sprites/character-sprite/rotations/${filename}.png`
      );

      // Load running animation frames (6 per direction)
      for (let frame = 0; frame < 6; frame++) {
        const frameStr = frame.toString().padStart(3, '0');
        this.load.image(
          `character-run-${dir}-${frame}`,
          `sprites/character-sprite/animations/running-6-frames/${filename}/frame_${frameStr}.png`
        );
      }
    }
  }

  private createCharacterAnimations(): void {
    const directions = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'];

    for (const dir of directions) {
      // Create running animation with 6 frames
      this.anims.create({
        key: `character-run-${dir}`,
        frames: [
          { key: `character-run-${dir}-0` },
          { key: `character-run-${dir}-1` },
          { key: `character-run-${dir}-2` },
          { key: `character-run-${dir}-3` },
          { key: `character-run-${dir}-4` },
          { key: `character-run-${dir}-5` },
        ],
        frameRate: 12.5, // 6 frames over ~480ms (matches move delay)
        repeat: -1, // Loop continuously
      });
    }
  }

  private generateTileTextures(): void {
    const ENTITY_SIZE = 256; // Entity sprite size (matches 256x256 tiles)
    const graphics = this.make.graphics({ x: 0, y: 0 });

    // Procedural tile textures baked in create() — this generates entity fallback textures

    // Player sphere fallback - used if character sprites fail to load
    const PLAYER_SIZE = 256;
    const center = PLAYER_SIZE / 2;
    const radius = 100;

    // Base sphere color
    graphics.fillStyle(0x7b68ee);
    graphics.fillCircle(center, center, radius);

    // Highlight (top-left) for 3D sphere effect
    graphics.fillStyle(0x9f8fff, 0.6);
    graphics.fillCircle(center - radius * 0.3, center - radius * 0.3, radius * 0.5);

    // Smaller bright highlight
    graphics.fillStyle(0xffffff, 0.4);
    graphics.fillCircle(center - radius * 0.4, center - radius * 0.4, radius * 0.2);

    // Dark edge (bottom-right) for depth
    graphics.lineStyle(4, 0x5040a0, 0.5);
    graphics.beginPath();
    graphics.arc(center, center, radius - 1, Math.PI * 0.1, Math.PI * 0.9);
    graphics.strokePath();

    // Outer ring for definition
    graphics.lineStyle(3, 0x3a2a7a, 0.8);
    graphics.strokeCircle(center, center, radius);

    graphics.generateTexture('player-fallback', PLAYER_SIZE, PLAYER_SIZE);
    graphics.clear();

    // Creature (centered for 256px sprite)
    const ec = ENTITY_SIZE / 2; // entity center = 128
    graphics.fillStyle(0xff4444);
    graphics.fillCircle(ec, ec, 80);
    graphics.generateTexture('creature', ENTITY_SIZE, ENTITY_SIZE);
    graphics.clear();

    // Mineral (centered square for 256px sprite)
    graphics.fillStyle(0x44ffff);
    graphics.fillRect(64, 64, 128, 128);
    graphics.generateTexture('mineral', ENTITY_SIZE, ENTITY_SIZE);
    graphics.clear();

    // Item (smaller circle centered for 256px sprite)
    graphics.fillStyle(0xffff44);
    graphics.fillCircle(ec, ec, 48);
    graphics.generateTexture('item', ENTITY_SIZE, ENTITY_SIZE);
    graphics.clear();

    // Plant (triangle centered for 256px sprite)
    graphics.fillStyle(0x44cc44); // green
    graphics.fillTriangle(
      ec, 32,     // top
      64, 224,    // bottom left
      192, 224    // bottom right
    );
    graphics.generateTexture('plant', ENTITY_SIZE, ENTITY_SIZE);
    graphics.clear();

    // Weather particle texture (4x4 white pixel, tinted per-biome at emitter level)
    graphics.fillStyle(0xffffff, 1);
    graphics.fillRect(0, 0, 4, 4);
    graphics.generateTexture('weather-pixel', 4, 4);
    graphics.clear();

    // Quest markers (fallback if PNG files don't exist)
    // These will be used if sprite loading fails
    const MARKER_SIZE = 64;
    const mc = MARKER_SIZE / 2; // marker center = 32

    // Available quest marker (yellow ! on transparent background)
    graphics.fillStyle(0xffcc00, 1);
    graphics.fillCircle(mc, mc, 28);
    graphics.lineStyle(3, 0x000000);
    graphics.strokeCircle(mc, mc, 28);
    const availableText = this.make.text({
      x: mc,
      y: mc,
      text: '!',
      style: {
        fontSize: '48px',
        fontStyle: 'bold',
        color: '#000000',
      },
    });
    availableText.setOrigin(0.5, 0.5);
    graphics.generateTexture('ui_quest_marker_available_fallback', MARKER_SIZE, MARKER_SIZE);
    availableText.destroy();
    graphics.clear();

    // Ready quest marker (cyan ? on transparent background)
    graphics.fillStyle(0x00ccff, 1);
    graphics.fillCircle(mc, mc, 28);
    graphics.lineStyle(3, 0x000000);
    graphics.strokeCircle(mc, mc, 28);
    const readyText = this.make.text({
      x: mc,
      y: mc,
      text: '?',
      style: {
        fontSize: '48px',
        fontStyle: 'bold',
        color: '#000000',
      },
    });
    readyText.setOrigin(0.5, 0.5);
    graphics.generateTexture('ui_quest_marker_ready_fallback', MARKER_SIZE, MARKER_SIZE);
    readyText.destroy();
    graphics.clear();

    // POI fallback textures (procedural icons)
    this.createPoiFallbackTextures();

    graphics.destroy();
  }

  private createPoiFallbackTextures(): void {
    const iconSize = 64;
    const ic = iconSize / 2; // icon center = 32

    // Anomaly - purple circle with star
    const anomalyGraphics = this.add.graphics();
    anomalyGraphics.fillStyle(0x9966ff, 1);
    anomalyGraphics.fillCircle(ic, ic, ic - 4);
    anomalyGraphics.lineStyle(3, 0xcc99ff, 1);
    anomalyGraphics.strokeCircle(ic, ic, ic - 4);
    // Inner star pattern (5-pointed star)
    anomalyGraphics.fillStyle(0xffffff, 0.8);
    const starRadius = iconSize / 4;
    const starPoints = 5;
    const starPath: number[] = [];
    for (let i = 0; i < starPoints * 2; i++) {
      const angle = (i * Math.PI) / starPoints - Math.PI / 2;
      const radius = i % 2 === 0 ? starRadius : starRadius / 2;
      starPath.push(ic + Math.cos(angle) * radius);
      starPath.push(ic + Math.sin(angle) * radius);
    }
    anomalyGraphics.fillPoints(starPath, true);
    anomalyGraphics.generateTexture('poi_anomaly_fallback', iconSize, iconSize);
    anomalyGraphics.destroy();

    // Cache - gold container/chest
    const cacheGraphics = this.add.graphics();
    cacheGraphics.fillStyle(0xd4a017, 1);
    cacheGraphics.fillRect(8, 20, iconSize - 16, iconSize - 28);
    cacheGraphics.fillStyle(0xffd700, 1);
    cacheGraphics.fillRect(12, 16, iconSize - 24, 8);
    cacheGraphics.lineStyle(3, 0x8b6914, 1);
    cacheGraphics.strokeRect(8, 20, iconSize - 16, iconSize - 28);
    cacheGraphics.generateTexture('poi_cache_fallback', iconSize, iconSize);
    cacheGraphics.destroy();

    // Landmark - blue beacon/pillar (triangle)
    const landmarkGraphics = this.add.graphics();
    landmarkGraphics.fillStyle(0x4488ff, 1);
    landmarkGraphics.fillTriangle(ic, 4, 12, iconSize - 8, iconSize - 12, iconSize - 8);
    landmarkGraphics.lineStyle(3, 0x66aaff, 1);
    landmarkGraphics.strokeTriangle(ic, 4, 12, iconSize - 8, iconSize - 12, iconSize - 8);
    landmarkGraphics.fillStyle(0xffffff, 0.7);
    landmarkGraphics.fillCircle(ic, iconSize / 3, 8);
    landmarkGraphics.generateTexture('poi_landmark_fallback', iconSize, iconSize);
    landmarkGraphics.destroy();
  }

  create(): void {
    // Bake all procedural tile textures (replaces PNG tile sprites)
    const tileGen = new ProceduralTileGenerator(this);
    tileGen.bakeAllTextures();

    // Extract named textures from spritesheets (with vertical trim for features)
    this.extractSpritesheetFrames();

    // Trim individually-loaded feature variant images
    this.trimLoadedFeatureSprites();

    // Create animations after all sprites are loaded
    this.createCharacterAnimations();
    this.createCreatureAnimations();
    this.scene.start('WorldScene');
  }

  /**
   * Extract individual named textures from loaded spritesheets.
   * Renders each frame to a canvas and registers it as a standalone texture.
   */
  private extractSpritesheetFrames(): void {
    // Void biome features spritesheet: 5 frames
    const voidFeatureMap: Array<{ frame: number; key: string }> = [
      { frame: 0, key: 'plant_void_tree-v1' },
      { frame: 1, key: 'plant_void_fern-v1' },
      { frame: 2, key: 'plant_drought_cactus-v1' },
      { frame: 3, key: 'mineral_void_crystal-v1' },
      { frame: 4, key: 'mineral_void_slate-v1' },
    ];
    this.extractFrames('void-biome-features-sheet', voidFeatureMap, 256, 256, true);

    // Crystal biome features spritesheet: 5 frames
    const crystalFeatureMap: Array<{ frame: number; key: string }> = [
      { frame: 0, key: 'plant_lattice_moss-v1' },
      { frame: 1, key: 'plant_crystal_lichen-v1' },
      { frame: 2, key: 'plant_prism_bloom-v1' },
      { frame: 3, key: 'mineral_cave_geode-v1' },
      { frame: 4, key: 'mineral_prismatic_crystal-v1' },
    ];
    this.extractFrames('crystal-biome-features-sheet', crystalFeatureMap, 256, 256, true);

    // Acid/toxic biome features spritesheet: 5 frames
    const acidFeatureMap: Array<{ frame: number; key: string }> = [
      { frame: 0, key: 'plant_acid_fern-v1' },
      { frame: 1, key: 'plant_acid_bloom-v1' },
      { frame: 2, key: 'plant_chemical_bloom-v1' },
      { frame: 3, key: 'mineral_corrosive_deposit-v1' },
      { frame: 4, key: 'mineral_acid_stone-v1' },
    ];
    this.extractFrames('acid-biome-features-sheet', acidFeatureMap, 256, 256, true);
  }

  /**
   * Vertically trim individually-loaded feature variant images.
   * These are loaded via this.load.image() and need post-load trimming.
   */
  private trimLoadedFeatureSprites(): void {
    const featureKeys = [
      'plant_tendril_tree-v1',
      'plant_rare_fungi-v1', 'plant_rare_fungi-v2', 'plant_rare_fungi-v3', 'plant_rare_fungi-v4',
      'plant_magma_bloom-v1', 'plant_magma_bloom-v2', 'plant_magma_bloom-v3', 'plant_magma_bloom-v4',
    ];

    for (const key of featureKeys) {
      const tex = this.textures.get(key);
      if (!tex || tex.key === '__MISSING') continue;

      const source = tex.getSourceImage() as HTMLImageElement;
      if (!source || !source.width) continue;

      // Draw source image to a temp canvas for pixel scanning
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = source.width;
      tempCanvas.height = source.height;
      const tempCtx = tempCanvas.getContext('2d')!;
      tempCtx.drawImage(source, 0, 0);

      const trimmed = PreloadScene.verticalTrimCanvas(tempCanvas);
      if (trimmed.height < source.height) {
        // Remove old texture and re-register trimmed version
        this.textures.remove(key);
        this.textures.addCanvas(key, trimmed);
      }
    }
  }

  /**
   * Extract frames from a spritesheet into individual named textures.
   * When trim=true, vertically trims transparent padding (keeps full width for centering).
   */
  private extractFrames(
    sheetKey: string,
    frameMap: Array<{ frame: number; key: string }>,
    frameWidth: number,
    frameHeight: number,
    trim: boolean = false,
  ): void {
    const sheet = this.textures.get(sheetKey);
    if (!sheet || sheet.key === '__MISSING') return;

    const source = sheet.getSourceImage() as HTMLImageElement;

    for (const { frame, key } of frameMap) {
      const canvas = document.createElement('canvas');
      canvas.width = frameWidth;
      canvas.height = frameHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(
        source,
        frame * frameWidth, 0, frameWidth, frameHeight,
        0, 0, frameWidth, frameHeight,
      );

      if (trim) {
        const trimmed = PreloadScene.verticalTrimCanvas(canvas);
        this.textures.addCanvas(key, trimmed);
      } else {
        this.textures.addCanvas(key, canvas);
      }
    }
  }

  /**
   * Vertically trim transparent padding from a canvas.
   * Scans rows top-down and bottom-up for first row with alpha > 10.
   * Returns a new canvas: same width, height = (lastVisibleRow - firstVisibleRow + 1).
   */
  private static verticalTrimCanvas(source: HTMLCanvasElement): HTMLCanvasElement {
    const w = source.width;
    const h = source.height;
    const ctx = source.getContext('2d')!;
    const imageData = ctx.getImageData(0, 0, w, h);
    const data = imageData.data;
    const ALPHA_THRESHOLD = 10;

    // Scan top-down for first visible row
    let firstRow = 0;
    for (let y = 0; y < h; y++) {
      let hasVisible = false;
      for (let x = 0; x < w; x++) {
        if (data[(y * w + x) * 4 + 3] > ALPHA_THRESHOLD) {
          hasVisible = true;
          break;
        }
      }
      if (hasVisible) {
        firstRow = y;
        break;
      }
    }

    // Scan bottom-up for last visible row
    let lastRow = h - 1;
    for (let y = h - 1; y >= firstRow; y--) {
      let hasVisible = false;
      for (let x = 0; x < w; x++) {
        if (data[(y * w + x) * 4 + 3] > ALPHA_THRESHOLD) {
          hasVisible = true;
          break;
        }
      }
      if (hasVisible) {
        lastRow = y;
        break;
      }
    }

    const trimmedHeight = lastRow - firstRow + 1;
    if (trimmedHeight >= h) return source; // No trimming needed

    const trimmed = document.createElement('canvas');
    trimmed.width = w;
    trimmed.height = trimmedHeight;
    const tctx = trimmed.getContext('2d')!;
    tctx.drawImage(source, 0, firstRow, w, trimmedHeight, 0, 0, w, trimmedHeight);
    return trimmed;
  }

  private createCreatureAnimations(): void {
    const directions = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'];
    const animatedCreatures = [
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
    ];

    // Walk animations (8 frames per direction) for each animated creature
    for (const speciesId of animatedCreatures) {
      for (const dir of directions) {
        this.anims.create({
          key: `${speciesId}-walk-${dir}`,
          frames: [
            { key: `${speciesId}-walk-${dir}-0` },
            { key: `${speciesId}-walk-${dir}-1` },
            { key: `${speciesId}-walk-${dir}-2` },
            { key: `${speciesId}-walk-${dir}-3` },
            { key: `${speciesId}-walk-${dir}-4` },
            { key: `${speciesId}-walk-${dir}-5` },
            { key: `${speciesId}-walk-${dir}-6` },
            { key: `${speciesId}-walk-${dir}-7` },
          ],
          frameRate: 16, // 8 frames over 500ms (creature movement duration)
          repeat: -1,
        });
      }
    }
  }
}
