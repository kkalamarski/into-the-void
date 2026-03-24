import Phaser from 'phaser';
import { TILE_SIZE_PX } from '@into-the-void/game-logic';
import { BIOME_DISPLAY_NAMES } from '@into-the-void/shared-types';
import { tileIdToString } from '@into-the-void/world-gen';
import { useGameStore } from '../../store/gameStore';
import { useCombatStore } from '../../store/combatStore';
import { useEntityStore } from '../../store/entityStore';

/**
 * Data source interface — WorldScene provides getters so DebugOverlay
 * doesn't import scene-internal subsystems directly.
 */
export interface DebugDataSource {
  getElevation: (tileX: number, tileY: number) => number;
  getTileType: (tileX: number, tileY: number) => number;
  getDayNightPhase: () => string;
  getDayNightProgress: () => number;
  getChunkCounts: () => { loaded: number; pending: number; failed: number };
  getBiomeName: () => string;
  getPlayerPixelPos: () => { px: number; py: number } | null;
}

const LINE_HEIGHT = 18;
const FONT_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  fontFamily: 'monospace',
  fontSize: '13px',
  color: '#00ff00',
};

const BLANK_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  ...FONT_STYLE,
  fontSize: '6px',
};

/**
 * Minecraft-style F3 debug overlay.
 * Shows player position, world state, performance metrics, and game state.
 * Zero cost when hidden — update() returns immediately.
 */
export class DebugOverlay {
  private scene: Phaser.Scene;
  private dataSource: DebugDataSource;
  private visible = false;
  private container: Phaser.GameObjects.Container | null = null;
  private bgGraphics: Phaser.GameObjects.Graphics | null = null;
  private textObjects: Phaser.GameObjects.Text[] = [];
  private fpsHistory: number[] = [];
  private lastUpdateTime = 0;
  private updateInterval = 200; // ms between text refreshes
  private created = false;

  constructor(scene: Phaser.Scene, dataSource: DebugDataSource) {
    this.scene = scene;
    this.dataSource = dataSource;
  }

  /** Toggle overlay visibility. Lazy-creates on first show. */
  toggle(): void {
    this.visible = !this.visible;
    if (this.visible && !this.created) {
      this.createOverlay();
    }
    if (this.container) {
      this.container.setVisible(this.visible);
    }
  }

  isVisible(): boolean {
    return this.visible;
  }

  /** Called every frame from WorldScene.update(). Zero cost when hidden. */
  update(delta: number): void {
    if (!this.visible) return;

    // Track FPS from delta
    if (delta > 0) {
      this.fpsHistory.push(1000 / delta);
      if (this.fpsHistory.length > 30) this.fpsHistory.shift();
    }

    // Throttle text updates
    const now = performance.now();
    if (now - this.lastUpdateTime < this.updateInterval) return;
    this.lastUpdateTime = now;

    this.refreshText();
  }

  destroy(): void {
    if (this.container) {
      this.container.destroy(true);
      this.container = null;
    }
    this.textObjects = [];
    this.bgGraphics = null;
    this.created = false;
  }

  // ── Private ──────────────────────────────────────────────────────────

  private createOverlay(): void {
    this.container = this.scene.add.container(12, 12);
    this.container.setDepth(999999);
    this.container.setScrollFactor(0);

    // Semi-transparent background
    this.bgGraphics = this.scene.add.graphics();
    this.bgGraphics.setScrollFactor(0);
    this.container.add(this.bgGraphics);

    // Create text lines — we use a fixed set and update their content
    const lines = this.getLineTemplates();
    for (let i = 0; i < lines.length; i++) {
      const isBlank = lines[i] === '';
      const text = this.scene.add.text(8, 8 + i * LINE_HEIGHT, lines[i], isBlank ? BLANK_STYLE : FONT_STYLE);
      text.setScrollFactor(0);
      this.textObjects.push(text);
      this.container.add(text);
    }

    this.drawBackground();
    this.created = true;
  }

  private getLineTemplates(): string[] {
    // Template structure — populated by refreshText()
    return [
      'Into the Void — Debug (F3)',
      '', // blank separator
      'XY: -, -',
      'Zone: -',
      'Tile: -, -',
      'Elevation: -',
      'Tile Type: -',
      'Biome: -',
      '', // blank separator
      'FPS: -',
      'Entities: -',
      'Ping: -ms',
      'Chunks: -',
      '', // blank separator
      'Day/Night: -',
      'Combat: None',
      'Target: None',
    ];
  }

  private refreshText(): void {
    if (this.textObjects.length === 0) return;

    // Position data
    const pixelPos = this.dataSource.getPlayerPixelPos();
    const px = pixelPos?.px ?? 0;
    const py = pixelPos?.py ?? 0;
    const tileX = Math.floor(px / TILE_SIZE_PX);
    const tileY = Math.floor(py / TILE_SIZE_PX);
    const elevation = this.dataSource.getElevation(tileX, tileY);
    const tileType = this.dataSource.getTileType(tileX, tileY);
    let tileName: string;
    try {
      tileName = tileIdToString(tileType);
    } catch {
      tileName = `id:${tileType}`;
    }

    // Performance data
    const fps = this.fpsHistory.length > 0
      ? this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length
      : 0;
    const fpsMin = this.fpsHistory.length > 0 ? Math.min(...this.fpsHistory) : 0;
    const fpsMax = this.fpsHistory.length > 0 ? Math.max(...this.fpsHistory) : 0;
    const entityCount = useEntityStore.getState().entities.size;
    const latency = useGameStore.getState().latency;
    const chunks = this.dataSource.getChunkCounts();

    // Game state
    const dayPhase = this.dataSource.getDayNightPhase();
    const dayProgress = this.dataSource.getDayNightProgress();
    const combatState = useCombatStore.getState();
    const zoneId = useGameStore.getState().zoneId ?? '-';

    // Update text content (indices match getLineTemplates)
    const lines = [
      'Into the Void — Debug (F3)',
      '', // separator
      `XY: ${px.toFixed(1)}, ${py.toFixed(1)}`,
      `Zone: ${zoneId}`,
      `Tile: ${tileX}, ${tileY}`,
      `Elevation: ${elevation.toFixed(1)}`,
      `Tile Type: ${tileName} (${tileType})`,
      `Biome: ${this.dataSource.getBiomeName()}`,
      '', // separator
      `FPS: ${Math.round(fps)} (${Math.round(fpsMin)}-${Math.round(fpsMax)})`,
      `Entities: ${entityCount}`,
      `Ping: ${latency}ms`,
      `Chunks: ${chunks.loaded} loaded, ${chunks.pending} pending, ${chunks.failed} failed`,
      '', // separator
      `Day/Night: ${dayPhase} (${dayProgress}%)`,
      `Combat: ${combatState.inCombat ? 'ACTIVE' : 'None'}`,
      `Target: ${combatState.targetEntityId ?? 'None'}`,
    ];

    for (let i = 0; i < Math.min(lines.length, this.textObjects.length); i++) {
      this.textObjects[i].setText(lines[i]);
    }

    this.drawBackground();
  }

  private drawBackground(): void {
    if (!this.bgGraphics) return;

    // Find widest text line
    let maxWidth = 0;
    for (const text of this.textObjects) {
      if (text.width > maxWidth) maxWidth = text.width;
    }

    const totalHeight = 8 + this.textObjects.length * LINE_HEIGHT + 8;
    const totalWidth = 8 + maxWidth + 16;

    this.bgGraphics.clear();
    this.bgGraphics.fillStyle(0x000000, 0.65);
    this.bgGraphics.fillRoundedRect(0, 0, totalWidth, totalHeight, 6);
  }
}
