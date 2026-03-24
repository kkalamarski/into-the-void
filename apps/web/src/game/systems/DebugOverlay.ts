import Phaser from 'phaser';
import { TILE_SIZE_PX } from '@into-the-void/game-logic';
import { tileIdToString } from '@into-the-void/world-gen';
import { useGameStore } from '../../store/gameStore';
import { useCombatStore } from '../../store/combatStore';
import { useEntityStore } from '../../store/entityStore';
import { useDebugStore } from '../../store/debugStore';

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

const UPDATE_INTERVAL = 200; // ms between data pushes

/**
 * Collects debug data from Phaser scene and pushes to Zustand store.
 * The React DebugOverlay component renders it. F3 toggles visibility.
 * No Phaser text objects — all rendering is in React.
 */
export class DebugOverlay {
  private scene: Phaser.Scene;
  private dataSource: DebugDataSource;
  private visible = false;
  private lastUpdate = 0;
  private fpsHistory: number[] = [];

  constructor(scene: Phaser.Scene, dataSource: DebugDataSource) {
    this.scene = scene;
    this.dataSource = dataSource;
  }

  toggle(): void {
    this.visible = !this.visible;
    useDebugStore.getState().setVisible(this.visible);
  }

  isVisible(): boolean {
    return this.visible;
  }

  update(): void {
    if (!this.visible) return;

    // Track FPS
    this.fpsHistory.push(this.scene.game.loop.actualFps);
    if (this.fpsHistory.length > 30) this.fpsHistory.shift();

    const now = performance.now();
    if (now - this.lastUpdate < UPDATE_INTERVAL) return;
    this.lastUpdate = now;

    this.pushData();
  }

  private pushData(): void {
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

    const fps = this.fpsHistory.length > 0
      ? Math.round(this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length)
      : 0;
    const entityCount = useEntityStore.getState().entities.size;
    const latency = useGameStore.getState().latency;
    const chunks = this.dataSource.getChunkCounts();
    const dayPhase = this.dataSource.getDayNightPhase();
    const dayProgress = this.dataSource.getDayNightProgress();
    const combatState = useCombatStore.getState();
    const zoneId = useGameStore.getState().zoneId ?? '-';

    useDebugStore.getState().updateData({
      px, py, zoneId, tileX, tileY, elevation,
      tileType: `${tileName} (${tileType})`,
      biomeName: this.dataSource.getBiomeName(),
      fps,
      entityCount,
      ping: latency,
      chunksLoaded: chunks.loaded,
      chunksPending: chunks.pending,
      chunksFailed: chunks.failed,
      dayNightPhase: dayPhase,
      dayNightProgress: dayProgress,
      combatState: combatState.inCombat ? 'ACTIVE' : 'None',
      targetId: combatState.targetEntityId ?? 'None',
    });
  }

  destroy(): void {
    useDebugStore.getState().setVisible(false);
  }
}
