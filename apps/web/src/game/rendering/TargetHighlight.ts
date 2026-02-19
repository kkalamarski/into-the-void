import Phaser from 'phaser';
import { RARITY_COLORS } from '../../ui/constants';

// Map creature behavior to rarity-like tier for coloring
// Per user decision: highlight color matches rarity tier
const CREATURE_TIER_COLORS: Record<string, string> = {
  herbivore: RARITY_COLORS.common,    // gray
  omnivore: RARITY_COLORS.rare,       // blue
  predator: RARITY_COLORS.epic,       // purple
  maniac: RARITY_COLORS.legendary,    // gold
};

export class TargetHighlight {
  private scene: Phaser.Scene;
  private graphics: Phaser.GameObjects.Graphics | null = null;
  private tween: Phaser.Tweens.Tween | null = null;
  private targetEntityId: string | null = null;
  private currentColor: number = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Show highlight on target entity.
   * @param entityId - Entity to highlight
   * @param container - Entity's Phaser container
   * @param behavior - Creature behavior for color selection (or rarity string)
   */
  show(entityId: string, container: Phaser.GameObjects.Container, behavior: string): void {
    this.hide();
    this.targetEntityId = entityId;

    // Get color from behavior -> rarity tier mapping
    const colorHex = CREATURE_TIER_COLORS[behavior] ?? RARITY_COLORS.common;
    this.currentColor = parseInt(colorHex.replace('#', ''), 16);

    // Create graphics for ring
    this.graphics = this.scene.add.graphics();
    this.drawRing(this.currentColor, 1.0);

    // Position at entity ground level
    this.updatePosition(container);

    // Pulse animation per user decision: slow pulse to keep attention
    const colorRef = this.currentColor;
    this.tween = this.scene.tweens.add({
      targets: { t: 0 },
      t: 1,
      ease: 'Sine.easeInOut',
      duration: 800,
      yoyo: true,
      repeat: -1,
      onUpdate: (tween) => {
        const progress = tween.getValue() ?? 0;
        // Pulse scale: 1.0 to 1.2
        const scale = 1.0 + (progress * 0.2);
        // Pulse alpha: 0.8 to 0.4
        const alpha = 0.8 - (progress * 0.4);
        if (this.graphics) {
          this.graphics.clear();
          this.drawRing(colorRef, alpha, scale);
        }
      },
    });
  }

  /**
   * Update highlight position to follow entity.
   */
  updatePosition(container: Phaser.GameObjects.Container): void {
    if (this.graphics) {
      this.graphics.setPosition(container.x, container.y);
      this.graphics.setDepth(container.depth - 0.1);
    }
  }

  /**
   * Hide and destroy highlight.
   * @param fadeOut - If true, fade out over ~0.5s (for death animation per user decision)
   */
  hide(fadeOut = false): void {
    if (this.tween) {
      this.tween.destroy();
      this.tween = null;
    }

    if (this.graphics) {
      if (fadeOut) {
        const gfx = this.graphics;
        this.graphics = null;
        this.scene.tweens.add({
          targets: gfx,
          alpha: 0,
          duration: 500,
          onComplete: () => {
            gfx.destroy();
          },
        });
      } else {
        this.graphics.destroy();
        this.graphics = null;
      }
    }

    this.targetEntityId = null;
  }

  /**
   * Check if a specific entity is currently highlighted.
   */
  isHighlighting(entityId: string): boolean {
    return this.targetEntityId === entityId;
  }

  /**
   * Get current target entity ID.
   */
  getTargetEntityId(): string | null {
    return this.targetEntityId;
  }

  /**
   * Draw isometric ellipse ring at current graphics position.
   */
  private drawRing(color: number, alpha: number, scale = 1.0): void {
    if (!this.graphics) return;

    // Isometric ring dimensions (squashed for top-down iso view)
    const radiusX = 50 * scale;
    const radiusY = 25 * scale;

    this.graphics.lineStyle(4, color, alpha);
    this.graphics.strokeEllipse(0, 0, radiusX * 2, radiusY * 2);
  }

  /**
   * Destroy the highlight system.
   */
  destroy(): void {
    this.hide();
  }
}
