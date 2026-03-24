import Phaser from 'phaser';
import { Entity, Npc } from '@into-the-void/shared-types';
import { AbstractRenderStrategy } from './AbstractRenderStrategy';
import type { ScaleConfig, ShadowDimensions, TextureInfo } from './types';
import { NPC_SPRITE_SCALE_X, NPC_SPRITE_SCALE_Y } from './creature-render-data';

/**
 * Render strategy for NPC entities.
 * Handles asymmetric scaleX/scaleY (6x/4.5x), chat-bubble cursor,
 * NPC nameplate with type-color border, and directional sprites.
 */
export class NpcRenderStrategy extends AbstractRenderStrategy {

  getScale(_entity: Entity): ScaleConfig {
    return {
      scaleX: NPC_SPRITE_SCALE_X,
      scaleY: NPC_SPRITE_SCALE_Y,
      effectiveScale: NPC_SPRITE_SCALE_Y, // Use Y scale for height calculations
    };
  }

  getShadowDimensions(_entity: Entity, _scale: number): ShadowDimensions {
    // NPCs get same shadow as player character — fixed size
    return { width: 120, height: 60 };
  }

  getCursor(_entity: Entity): string {
    // Chat-bubble cursor to indicate NPCs are interactable
    const chatSvg = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'><path d='M6 4h20c1.1 0 2 .9 2 2v14c0 1.1-.9 2-2 2H14l-6 6v-6H6c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z' fill='white' stroke='%23333' stroke-width='2'/></svg>`;
    return `url("${chatSvg}") 16 16, pointer`;
  }

  getTexture(entity: Entity, scene: Phaser.Scene): TextureInfo {
    const npc = entity as Npc;
    if (npc.npcType) {
      // Convert npcType to folder name (faction_rep -> faction-rep)
      const folderName = npc.npcType.replace('_', '-');
      // Return idle sprite facing south (default direction)
      const spriteKey = `npc-${folderName}-s`;
      // Check if sprite exists, fall back to player if not
      if (scene.textures.exists(spriteKey)) {
        return { key: spriteKey };
      }
    }
    return { key: 'player-fallback' };
  }

  setupUI(
    entity: Entity,
    container: Phaser.GameObjects.Container,
    scene: Phaser.Scene,
    displayName: string,
    _gated: boolean,
    spriteYOffset: number,
    actualSpriteHeight: number,
  ): void {
    const npc = entity as Npc;
    const spriteTopY = spriteYOffset - actualSpriteHeight;
    const uiBaseY = spriteTopY - 20;

    // NPC nameplate with type-color border
    const nameplate = this.createNpcNameplate(scene, displayName, npc.npcType);
    nameplate.y = uiBaseY;
    container.add(nameplate);

    // Store npcType for directional NPCs
    if (npc.npcType) {
      container.setData('npcType', npc.npcType);
      container.setData('facing', 's'); // Default facing direction
    }
  }

  /**
   * Creates an NPC nameplate with type indicator and distinct color border.
   */
  private createNpcNameplate(scene: Phaser.Scene, name: string, npcType: string): Phaser.GameObjects.Container {
    const npContainer = scene.add.container(0, 0);

    // NPC type indicator colors
    const typeColors: Record<string, number> = {
      trader: 0xf0c040,      // Gold for traders
      guard: 0x8080a0,       // Steel gray for guards
      faction_rep: 0x60a0ff, // Blue for faction reps
      ambient: 0xa0a0a0,     // Gray for ambient
      service: 0x60c060,     // Green for service
    };

    const typeColor = typeColors[npcType] ?? 0xffffff;

    // Background panel
    const bg = scene.add.graphics();
    const width = 300;
    const height = 50;
    bg.fillStyle(0x222222, 0.9);
    bg.fillRoundedRect(-width / 2, -height / 2, width, height, 8);
    bg.lineStyle(3, typeColor, 1);
    bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 8);
    npContainer.add(bg);

    // Name text
    const text = scene.add.text(0, 0, name, {
      fontSize: '30px',
      fontStyle: 'bold',
      color: '#ffffff',
    });
    text.setOrigin(0.5, 0.5);
    text.setShadow(2, 2, '#000000', 4);
    npContainer.add(text);

    return npContainer;
  }
}
