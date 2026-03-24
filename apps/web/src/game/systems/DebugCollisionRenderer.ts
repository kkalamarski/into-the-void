import Phaser from 'phaser';
import type { IsometricTransform } from '../utils/IsometricTransform';
import type { VisibleBounds } from '../rendering/strategies';
import { ELEVATION_HEIGHT_STEP } from '../constants/elevation';

/**
 * Data source interface — WorldScene provides getters so DebugCollisionRenderer
 * doesn't import scene-internal subsystems directly.
 */
export interface CollisionDataSource {
  getCollisionMap: () => boolean[][] | null;
  getHeights: () => number[][] | null;
  getStructures: () => Array<{ x: number; y: number; type: string; height?: number }>;
  getEntityContainers: () => Map<string, Phaser.GameObjects.Container>;
  getIsoTransform: () => IsometricTransform;
  getZoneWorldOffset: () => { x: number; y: number };
}

// Color scheme — distinguishable per collision type
const COLOR_BLOCKING_TILE = 0xff4444; // red
const COLOR_WALL = 0xffaa00;          // orange/yellow
const COLOR_FEATURE_HITBOX = 0x4488ff; // blue
const COLOR_ISO_EXTENSION = 0x44ff88; // green — invisible wall from isometric south-neighbor

const ALPHA_TILE = 0.4;
const ALPHA_WALL = 0.5;
const ALPHA_FEATURE = 0.4;
const ALPHA_ISO_EXTENSION = 0.35;

/**
 * Draws collision boundaries as colored wireframe outlines on the game world.
 * Only renders when the debug overlay (F3) is active.
 */
export class DebugCollisionRenderer {
  private scene: Phaser.Scene;
  private dataSource: CollisionDataSource;
  private visible = false;
  private graphics: Phaser.GameObjects.Graphics | null = null;
  private lastDrawTime = 0;
  private drawInterval = 500; // ms between redraws

  constructor(scene: Phaser.Scene, dataSource: CollisionDataSource) {
    this.scene = scene;
    this.dataSource = dataSource;
  }

  show(): void {
    this.visible = true;
    if (!this.graphics) {
      this.graphics = this.scene.add.graphics();
      this.graphics.setDepth(999998); // Just below debug overlay text
    }
    this.graphics.setVisible(true);
    this.draw(); // Immediate draw on show
  }

  hide(): void {
    this.visible = false;
    if (this.graphics) {
      this.graphics.clear();
      this.graphics.setVisible(false);
    }
  }

  /** Called every frame. Zero cost when hidden. */
  update(): void {
    if (!this.visible) return;

    const now = performance.now();
    if (now - this.lastDrawTime < this.drawInterval) return;
    this.lastDrawTime = now;

    this.draw();
  }

  destroy(): void {
    if (this.graphics) {
      this.graphics.destroy();
      this.graphics = null;
    }
  }

  // ── Private ──────────────────────────────────────────────────────────

  private draw(): void {
    if (!this.graphics) return;
    this.graphics.clear();

    const iso = this.dataSource.getIsoTransform();
    const camera = this.scene.cameras.main;

    // Camera bounds for culling — expanded 2x tile dimensions to accommodate
    // isometric diamond overflow (elevated tiles extend beyond grid-cell bounds)
    const camLeft = camera.scrollX - iso.tileWidth * 2;
    const camRight = camera.scrollX + camera.width + iso.tileWidth * 2;
    const camTop = camera.scrollY - iso.tileHeight * 2;
    const camBottom = camera.scrollY + camera.height + iso.tileHeight * 2;

    const offset = this.dataSource.getZoneWorldOffset();
    this.drawBlockingTiles(iso, camLeft, camRight, camTop, camBottom, offset);
    this.drawIsoExtensionBlocking(iso, camLeft, camRight, camTop, camBottom, offset);
    this.drawWalls(iso, camLeft, camRight, camTop, camBottom);
    this.drawFeatureHitboxes();
  }

  private drawBlockingTiles(
    iso: IsometricTransform,
    camLeft: number, camRight: number,
    camTop: number, camBottom: number,
    offset: { x: number; y: number },
  ): void {
    const collisionMap = this.dataSource.getCollisionMap();
    const heights = this.dataSource.getHeights();
    if (!collisionMap) return;

    this.graphics!.lineStyle(2, COLOR_BLOCKING_TILE, ALPHA_TILE);

    for (let y = 0; y < collisionMap.length; y++) {
      const row = collisionMap[y];
      if (!row) continue;
      for (let x = 0; x < row.length; x++) {
        if (!row[x]) continue;

        const screen = iso.gridToScreen(offset.x + x, offset.y + y);
        // Apply elevation offset so diamonds sit on top of elevated tiles
        const elevation = heights?.[y]?.[x] ?? 0;
        const elevatedY = screen.y - elevation * ELEVATION_HEIGHT_STEP;

        if (screen.x < camLeft || screen.x > camRight ||
            elevatedY < camTop || elevatedY > camBottom) continue;

        this.drawIsoDiamond(screen.x, elevatedY, iso.tileWidth, iso.tileHeight);
      }
    }
  }

  /**
   * Draws semi-transparent green diamonds on non-blocking tiles whose south
   * neighbor (y+1) IS blocking and elevated. These represent "invisible walls"
   * caused by isometric projection — the elevated wall face visually occupies
   * the tile to the north, so movement is blocked there too.
   */
  private drawIsoExtensionBlocking(
    iso: IsometricTransform,
    camLeft: number, camRight: number,
    camTop: number, camBottom: number,
    offset: { x: number; y: number },
  ): void {
    const collisionMap = this.dataSource.getCollisionMap();
    const heights = this.dataSource.getHeights();
    if (!collisionMap || !heights) return;

    this.graphics!.fillStyle(COLOR_ISO_EXTENSION, ALPHA_ISO_EXTENSION);
    this.graphics!.lineStyle(1, COLOR_ISO_EXTENSION, ALPHA_ISO_EXTENSION + 0.1);

    for (let y = 0; y < collisionMap.length; y++) {
      const row = collisionMap[y];
      if (!row) continue;
      for (let x = 0; x < row.length; x++) {
        // Current tile must be non-blocking
        if (row[x]) continue;

        // Check south neighbors up to 3 tiles away (matching collision logic)
        for (let dy = 1; dy <= 3; dy++) {
          const southBlocking = collisionMap[y + dy]?.[x] ?? false;
          const southHeight = heights[y + dy]?.[x] ?? 0;
          if (southBlocking && southHeight >= dy) {
            const screen = iso.gridToScreen(offset.x + x, offset.y + y);
            // This tile is ground-level — apply its own elevation offset
            const tileElevation = heights[y]?.[x] ?? 0;
            const elevatedY = screen.y - tileElevation * ELEVATION_HEIGHT_STEP;
            if (screen.x >= camLeft && screen.x <= camRight &&
                elevatedY >= camTop && elevatedY <= camBottom) {
              this.fillIsoDiamond(screen.x, elevatedY, iso.tileWidth, iso.tileHeight);
            }
            break;
          }
        }
      }
    }
  }

  private drawWalls(
    iso: IsometricTransform,
    camLeft: number, camRight: number,
    camTop: number, camBottom: number,
  ): void {
    const structures = this.dataSource.getStructures();

    this.graphics!.lineStyle(3, COLOR_WALL, ALPHA_WALL);

    for (const structure of structures) {
      if (!structure.type.includes('wall')) continue;

      const screen = iso.gridToScreen(structure.x, structure.y);
      const elevation = structure.height ?? 0;
      const elevatedY = screen.y - elevation * ELEVATION_HEIGHT_STEP;
      if (screen.x < camLeft || screen.x > camRight ||
          elevatedY < camTop || elevatedY > camBottom) continue;

      this.drawIsoDiamond(screen.x, elevatedY, iso.tileWidth, iso.tileHeight);
    }
  }

  private drawFeatureHitboxes(): void {
    const containers = this.dataSource.getEntityContainers();

    this.graphics!.lineStyle(2, COLOR_FEATURE_HITBOX, ALPHA_FEATURE);

    containers.forEach((container) => {
      const bounds = container.getData('visibleBounds') as VisibleBounds | null;
      if (!bounds) return; // Not a feature entity

      const sprite = container.getData('entitySprite') as Phaser.GameObjects.Sprite | undefined;
      if (!sprite) return;

      // Compute world-space collision box from visible bounds
      const fullW = sprite.width * sprite.scaleX;
      const fullH = sprite.height * sprite.scaleY;
      const visW = (1 - bounds.leftFrac - bounds.rightFrac) * fullW;
      const visH = (1 - bounds.topFrac - bounds.bottomFrac) * fullH;
      const visLeft = container.x - (fullW / 2) + bounds.leftFrac * fullW;
      const spriteYOffset = sprite.y; // Sprite Y offset within container
      const visTop = container.y + spriteYOffset - fullH + bounds.topFrac * fullH;

      this.graphics!.strokeRect(visLeft, visTop, visW, visH);
    });
  }

  /** Draw an isometric diamond outline (4 points) at the tile center. */
  private drawIsoDiamond(cx: number, cy: number, tileW: number, tileH: number): void {
    const hw = tileW / 2;
    const hh = tileH / 2;

    this.graphics!.beginPath();
    this.graphics!.moveTo(cx, cy - hh);      // top
    this.graphics!.lineTo(cx + hw, cy);       // right
    this.graphics!.lineTo(cx, cy + hh);       // bottom
    this.graphics!.lineTo(cx - hw, cy);       // left
    this.graphics!.closePath();
    this.graphics!.strokePath();
  }

  /** Fill an isometric diamond at the tile center. */
  private fillIsoDiamond(cx: number, cy: number, tileW: number, tileH: number): void {
    const hw = tileW / 2;
    const hh = tileH / 2;

    this.graphics!.beginPath();
    this.graphics!.moveTo(cx, cy - hh);      // top
    this.graphics!.lineTo(cx + hw, cy);       // right
    this.graphics!.lineTo(cx, cy + hh);       // bottom
    this.graphics!.lineTo(cx - hw, cy);       // left
    this.graphics!.closePath();
    this.graphics!.fillPath();
    this.graphics!.strokePath();
  }
}
