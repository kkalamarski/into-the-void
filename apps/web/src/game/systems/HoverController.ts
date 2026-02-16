import Phaser from 'phaser';
import { IsometricTransform } from '../utils/IsometricTransform';

export class HoverController {
  private scene: Phaser.Scene;
  private isoTransform: IsometricTransform;
  private entitySprites: Map<string, Phaser.GameObjects.Container>;
  private highlightGraphics: Phaser.GameObjects.Graphics;
  private lastHoveredTile: { x: number; y: number } | null = null;
  private hoveredEntityId: string | null = null;
  private pathfindingActiveCallback: (() => boolean) | null = null;

  constructor(
    scene: Phaser.Scene,
    isoTransform: IsometricTransform,
    entitySprites: Map<string, Phaser.GameObjects.Container>
  ) {
    this.scene = scene;
    this.isoTransform = isoTransform;
    this.entitySprites = entitySprites;

    // Create graphics for tile hover highlight
    this.highlightGraphics = scene.add.graphics();
    this.highlightGraphics.setDepth(10000); // Above tiles, below path
  }

  /**
   * Update hover detection and highlights (called from scene update loop)
   */
  update(): void {
    const pointer = this.scene.input.activePointer;

    // Convert pointer to world coordinates
    const worldPoint = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y);

    // Convert to grid coordinates
    const gridPos = this.isoTransform.screenToTile(worldPoint.x, worldPoint.y);

    // Check if tile changed
    const tileChanged = !this.lastHoveredTile ||
      this.lastHoveredTile.x !== gridPos.x ||
      this.lastHoveredTile.y !== gridPos.y;

    if (tileChanged) {
      this.lastHoveredTile = { x: gridPos.x, y: gridPos.y };

      // Skip tile highlight if pathfinding is active (avoid visual clutter)
      if (this.pathfindingActiveCallback && this.pathfindingActiveCallback()) {
        this.highlightGraphics.clear();
      } else {
        this.drawTileHighlight(gridPos.x, gridPos.y);
      }
    }

    // Check for entity at hovered position
    let foundEntityId: string | null = null;
    for (const [id, container] of this.entitySprites) {
      const entityGridX = container.getData('gridX');
      const entityGridY = container.getData('gridY');

      if (entityGridX === gridPos.x && entityGridY === gridPos.y) {
        foundEntityId = id;
        break;
      }
    }

    // Update entity highlight if changed
    if (foundEntityId !== this.hoveredEntityId) {
      // Clear previous highlight
      if (this.hoveredEntityId) {
        this.clearEntityHighlight();
      }

      // Set new highlight
      if (foundEntityId) {
        this.highlightEntity(foundEntityId);
      }

      this.hoveredEntityId = foundEntityId;
    }
  }

  /**
   * Draw isometric diamond highlight for hovered tile
   */
  private drawTileHighlight(gridX: number, gridY: number): void {
    this.highlightGraphics.clear();

    const screenPos = this.isoTransform.gridToScreen(gridX, gridY);

    // Isometric diamond dimensions (same as PathfindingController)
    const hw = 64; // Half width (128/2)
    const hh = 32; // Half height (64/2)

    // Draw outline
    this.highlightGraphics.lineStyle(2, 0xffffff, 0.6);
    this.highlightGraphics.beginPath();
    this.highlightGraphics.moveTo(screenPos.x, screenPos.y - hh); // Top
    this.highlightGraphics.lineTo(screenPos.x + hw, screenPos.y); // Right
    this.highlightGraphics.lineTo(screenPos.x, screenPos.y + hh); // Bottom
    this.highlightGraphics.lineTo(screenPos.x - hw, screenPos.y); // Left
    this.highlightGraphics.closePath();
    this.highlightGraphics.strokePath();

    // Fill with semi-transparent white
    this.highlightGraphics.fillStyle(0xffffff, 0.1);
    this.highlightGraphics.fillPath();
  }

  /**
   * Show click marker with pulse animation
   */
  showClickMarker(gridX: number, gridY: number): void {
    const screenPos = this.isoTransform.gridToScreen(gridX, gridY);

    // Create temporary graphics for click marker
    const marker = this.scene.add.graphics();
    marker.fillStyle(0x00ff00, 0.8);
    marker.fillCircle(screenPos.x, screenPos.y, 8);
    marker.setDepth(10001); // Above path visualization

    // Pulse animation: fade out and scale up
    this.scene.tweens.add({
      targets: marker,
      alpha: 0,
      scale: 2,
      duration: 300,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        marker.destroy();
      }
    });
  }

  /**
   * Highlight entity with subtle glow
   */
  private highlightEntity(entityId: string): void {
    const container = this.entitySprites.get(entityId);
    if (!container) return;

    // Create overlay graphics
    const overlay = this.scene.add.graphics();
    overlay.fillStyle(0xffffff, 0.15);
    overlay.fillEllipse(0, -12, 50, 30);

    // Add overlay to container at index 2 (after shadow and sprite, before nameplate)
    // Container structure: [0: shadow, 1: sprite, 2: overlay (hover), 3: nameplate, 4+: health bar/behavior icon]
    container.addAt(overlay, 2);

    // Store overlay reference
    container.setData('hoverOverlay', overlay);
  }

  /**
   * Clear entity highlight
   */
  private clearEntityHighlight(): void {
    if (!this.hoveredEntityId) return;

    const container = this.entitySprites.get(this.hoveredEntityId);
    if (!container) return;

    const overlay = container.getData('hoverOverlay');
    if (overlay) {
      overlay.destroy();
      container.setData('hoverOverlay', null);
    }
  }

  /**
   * Clear all highlights
   */
  clearHighlights(): void {
    this.highlightGraphics.clear();
    this.clearEntityHighlight();
    this.lastHoveredTile = null;
    this.hoveredEntityId = null;
  }

  /**
   * Set callback to check if pathfinding is active
   */
  setPathfindingActiveCallback(fn: () => boolean): void {
    this.pathfindingActiveCallback = fn;
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.clearHighlights();
    this.highlightGraphics.destroy();
    this.pathfindingActiveCallback = null;
  }
}
