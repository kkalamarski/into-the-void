import Phaser from 'phaser';
import type { NodeRarity } from '@into-the-void/shared-types';

/**
 * Glow effect configuration per rarity tier.
 *
 * Uses Phaser 3 PostFX pipeline for hardware-accelerated glow.
 * Color values are hex, intensity determines glow strength.
 */
export const RARITY_GLOW_CONFIG: Record<Exclude<NodeRarity, 'common'>, {
  color: number;
  outerStrength: number;
  innerStrength: number;
  quality: number;
  distance: number;
}> = {
  rare: {
    color: 0xffd700,      // Gold
    outerStrength: 4,
    innerStrength: 0,
    quality: 0.1,
    distance: 10,
  },
  epic: {
    color: 0x9400d3,      // Purple
    outerStrength: 6,
    innerStrength: 0,
    quality: 0.15,
    distance: 12,
  },
};

/**
 * Map marker icon configuration per rarity.
 */
export const RARITY_MARKER_CONFIG: Record<Exclude<NodeRarity, 'common'>, {
  color: number;
  iconScale: number;
}> = {
  rare: {
    color: 0xffd700,   // Gold
    iconScale: 0.6,
  },
  epic: {
    color: 0x9400d3,   // Purple
    iconScale: 0.7,
  },
};

/**
 * Apply glow effect to a sprite based on rarity tier.
 *
 * @param sprite - The Phaser sprite to apply effects to
 * @param rarity - Node rarity tier ('rare' or 'epic')
 * @returns true if effect was applied, false if common or no PostFX support
 */
export function applyRareNodeFX(
  sprite: Phaser.GameObjects.Sprite,
  rarity: NodeRarity | undefined
): boolean {
  if (!rarity || rarity === 'common') {
    return false;
  }

  const config = RARITY_GLOW_CONFIG[rarity];

  // Check if PostFX is available (WebGL renderer required)
  if (!sprite.postFX) {
    // Fallback: apply tint for non-WebGL renderers
    sprite.setTint(config.color);
    return true;
  }

  // Apply glow effect
  sprite.postFX.addGlow(
    config.color,
    config.outerStrength,
    config.innerStrength,
    false, // knockout
    config.quality,
    config.distance
  );

  return true;
}

/**
 * Create a map marker sprite for a discovered rare node.
 *
 * @param scene - Phaser scene to create marker in
 * @param x - Screen X position
 * @param y - Screen Y position
 * @param rarity - Node rarity tier
 * @returns Container with marker graphics and animation
 */
export function createRareNodeMarker(
  scene: Phaser.Scene,
  x: number,
  y: number,
  rarity: Exclude<NodeRarity, 'common'>
): Phaser.GameObjects.Container {
  const config = RARITY_MARKER_CONFIG[rarity];
  const container = scene.add.container(x, y);

  // Create diamond marker shape
  const graphics = scene.add.graphics();
  graphics.fillStyle(config.color, 0.8);
  graphics.lineStyle(2, 0x000000, 1);

  // Diamond shape (rotated square)
  const size = 16 * config.iconScale;
  graphics.beginPath();
  graphics.moveTo(0, -size);      // Top
  graphics.lineTo(size, 0);       // Right
  graphics.lineTo(0, size);       // Bottom
  graphics.lineTo(-size, 0);      // Left
  graphics.closePath();
  graphics.fillPath();
  graphics.strokePath();

  container.add(graphics);

  // Add subtle pulsing animation
  scene.tweens.add({
    targets: container,
    scaleX: { from: 1, to: 1.1 },
    scaleY: { from: 1, to: 1.1 },
    alpha: { from: 0.8, to: 1 },
    duration: 800,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  });

  // Set depth above fog (1000) but below UI (2000)
  container.setDepth(1500);

  return container;
}
