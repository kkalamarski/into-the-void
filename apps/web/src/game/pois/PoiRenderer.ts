import Phaser from 'phaser';
import { PoiSpawn, ZONE_SIZE } from '@into-the-void/shared-types';
import { IsometricTransform } from '../utils/IsometricTransform';

// Depth values: above terrain (~100-200), below fog (~1000)
const POI_DEPTH_BASE = 800;

interface PoiSpriteData {
  sprite: Phaser.GameObjects.Sprite;
  tween: Phaser.Tweens.Tween;
  worldX: number;
  worldY: number;
  discovered: boolean;
}

/**
 * Renders POI icons in the world with pulsing animation.
 * Discovered POIs fade and stop pulsing.
 */
export class PoiRenderer {
  private scene: Phaser.Scene;
  private isoTransform: IsometricTransform;
  private poiSprites: Map<string, PoiSpriteData> = new Map();

  constructor(scene: Phaser.Scene, isoTransform: IsometricTransform) {
    this.scene = scene;
    this.isoTransform = isoTransform;
  }

  /**
   * Create POI icons for a chunk's POIs.
   * @param pois - POI spawns from chunk data
   * @param chunkX - Chunk X coordinate
   * @param chunkY - Chunk Y coordinate
   * @param discoveredPoiIds - Set of already discovered POI IDs
   */
  createPoisForChunk(
    pois: PoiSpawn[],
    chunkX: number,
    chunkY: number,
    discoveredPoiIds: Set<string>
  ): void {
    for (const poi of pois) {
      if (this.poiSprites.has(poi.poiId)) continue; // Already rendered

      // Convert local coords to world coords
      const worldX = chunkX * ZONE_SIZE + poi.x;
      const worldY = chunkY * ZONE_SIZE + poi.y;

      const isDiscovered = discoveredPoiIds.has(poi.poiId);
      this.createPoiSprite(poi.poiId, poi.type, worldX, worldY, isDiscovered);
    }
  }

  /**
   * Create a single POI sprite with pulsing animation.
   */
  private createPoiSprite(
    poiId: string,
    poiType: string,
    worldX: number,
    worldY: number,
    discovered: boolean
  ): void {
    const screenPos = this.isoTransform.gridToScreen(worldX, worldY);
    const texture = this.getPoiTexture(poiType);

    const sprite = this.scene.add.sprite(screenPos.x, screenPos.y, texture);
    sprite.setOrigin(0.5, 1.0); // Bottom-center for ground alignment
    sprite.setScale(1.5);
    sprite.setDepth(POI_DEPTH_BASE + worldY);
    sprite.setData('poiId', poiId);
    sprite.setData('poiType', poiType);

    // Interactive for click detection
    sprite.setInteractive({ useHandCursor: true });

    // Initial state based on discovery
    if (discovered) {
      sprite.setAlpha(0.5);
    }

    // Pulsing glow effect (only for undiscovered)
    let tween: Phaser.Tweens.Tween;
    if (!discovered) {
      tween = this.scene.tweens.add({
        targets: sprite,
        alpha: { from: 1.0, to: 0.6 },
        scale: { from: 1.5, to: 1.7 },
        duration: 1200,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    } else {
      // Static tween placeholder for discovered POIs
      tween = this.scene.tweens.create({ targets: sprite });
    }

    this.poiSprites.set(poiId, {
      sprite,
      tween,
      worldX,
      worldY,
      discovered,
    });
  }

  /**
   * Get texture key for POI type, with fallback.
   */
  private getPoiTexture(poiType: string): string {
    const primaryKey = `poi_${poiType}`;
    const fallbackKey = `poi_${poiType}_fallback`;

    if (this.scene.textures.exists(primaryKey)) {
      return primaryKey;
    }
    if (this.scene.textures.exists(fallbackKey)) {
      return fallbackKey;
    }
    // Ultimate fallback
    return 'poi_cache_fallback';
  }

  /**
   * Mark a POI as discovered - fade and stop pulsing.
   */
  markDiscovered(poiId: string): void {
    const poiData = this.poiSprites.get(poiId);
    if (!poiData || poiData.discovered) return;

    poiData.discovered = true;

    // Stop pulsing
    if (poiData.tween && poiData.tween.isPlaying()) {
      poiData.tween.stop();
    }

    // Fade to discovered state
    this.scene.tweens.add({
      targets: poiData.sprite,
      alpha: 0.5,
      scale: 1.5,
      duration: 500,
      ease: 'Power2',
    });
  }

  /**
   * Remove POI sprites for a chunk (when chunk unloads).
   */
  removePoisForChunk(chunkX: number, chunkY: number): void {
    const prefix = `poi_${chunkX}_${chunkY}_`;
    for (const [poiId, poiData] of this.poiSprites) {
      if (poiId.startsWith(prefix)) {
        poiData.tween?.stop();
        poiData.sprite.destroy();
        this.poiSprites.delete(poiId);
      }
    }
  }

  /**
   * Check if player position is on a POI tile.
   * Returns the POI ID if on an undiscovered POI, null otherwise.
   */
  checkPlayerOnPoi(worldX: number, worldY: number): string | null {
    for (const [poiId, poiData] of this.poiSprites) {
      if (poiData.discovered) continue;
      if (poiData.worldX === worldX && poiData.worldY === worldY) {
        return poiId;
      }
    }
    return null;
  }

  /**
   * Get POI type for a given POI ID.
   */
  getPoiType(poiId: string): string | null {
    const poiData = this.poiSprites.get(poiId);
    return poiData ? (poiData.sprite.getData('poiType') as string) : null;
  }

  /**
   * Update POI visibility based on fog state.
   * POIs should only be visible if their tile is revealed.
   */
  updateVisibility(revealedTiles: Set<string>): void {
    for (const [, poiData] of this.poiSprites) {
      const tileKey = `${poiData.worldX},${poiData.worldY}`;
      const isRevealed = revealedTiles.has(tileKey);
      poiData.sprite.setVisible(isRevealed);
    }
  }

  /**
   * Destroy all POI sprites.
   */
  destroy(): void {
    for (const [, poiData] of this.poiSprites) {
      poiData.tween?.stop();
      poiData.sprite.destroy();
    }
    this.poiSprites.clear();
  }
}
