import { BiomeType } from '@into-the-void/shared-types';
import { getBiomeDangerLevel } from '@into-the-void/world-gen';

/**
 * HUD element displaying zone name and survival tier.
 * Fixed to camera (doesn't scroll with world).
 */
export class ZoneHUD {
  private scene: Phaser.Scene;
  private zoneNameText: Phaser.GameObjects.Text;
  private tierText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    // Zone name (top-left corner, below connection indicator)
    this.zoneNameText = scene.add.text(16, 50, '', {
      fontSize: '18px',
      color: '#e0e0e0',
      fontFamily: 'monospace',
      stroke: '#000000',
      strokeThickness: 3,
    });
    this.zoneNameText.setScrollFactor(0); // Fixed to camera
    this.zoneNameText.setDepth(1000); // Above world

    // Tier indicator (below zone name)
    this.tierText = scene.add.text(16, 74, '', {
      fontSize: '14px',
      color: '#ffffff',
      fontFamily: 'monospace',
      stroke: '#000000',
      strokeThickness: 2,
    });
    this.tierText.setScrollFactor(0);
    this.tierText.setDepth(1000);
  }

  /**
   * Update zone display with biome info
   */
  updateZone(zoneId: string, biome: BiomeType): void {
    // Format biome name (e.g., void_plains -> Void Plains)
    const biomeName = this.formatBiomeName(biome);
    this.zoneNameText.setText(`${biomeName}`);

    // Calculate tier from danger level (1-10 -> 1-4)
    const dangerLevel = getBiomeDangerLevel(biome);
    const tier = Math.ceil(dangerLevel / 2.5);
    const tierColor = this.getTierColor(tier);
    const tierLabel = this.getTierLabel(tier);

    this.tierText.setText(`Tier ${tier}: ${tierLabel}`);
    this.tierText.setColor(tierColor);
  }

  /**
   * Format biome type to display name
   */
  private formatBiomeName(biome: BiomeType): string {
    return biome
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Get tier color (Tier I=green, IV=red per lore)
   */
  private getTierColor(tier: number): string {
    switch (tier) {
      case 1: return '#44cc44'; // Green - Frontier
      case 2: return '#ffcc00'; // Yellow - Hazardous
      case 3: return '#ff6b35'; // Orange - Hostile
      case 4: return '#ff4444'; // Red - Extreme
      default: return '#ffffff';
    }
  }

  /**
   * Get tier label
   */
  private getTierLabel(tier: number): string {
    switch (tier) {
      case 1: return 'Frontier';
      case 2: return 'Hazardous';
      case 3: return 'Hostile';
      case 4: return 'Extreme';
      default: return 'Unknown';
    }
  }

  /**
   * Get game objects for camera ignore lists
   */
  getGameObjects(): Phaser.GameObjects.GameObject[] {
    return [this.zoneNameText, this.tierText];
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.zoneNameText.destroy();
    this.tierText.destroy();
  }
}
