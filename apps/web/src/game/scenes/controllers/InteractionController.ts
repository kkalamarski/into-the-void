import Phaser from 'phaser';
import { Position, Entity, BiomeType, getZoneSize } from '@into-the-void/shared-types';
import { TILE_SIZE_PX, GATHER_RANGE_PX, NPC_INTERACT_RANGE_PX, pixelDistanceTo, tileToPixelCenter } from '@into-the-void/game-logic';
import { TileId, tileIdToString } from '@into-the-void/world-gen';
import { TileRegistry } from '@into-the-void/tiles';
import { useEntityStore } from '../../../store/entityStore';
import { useCombatStore } from '../../../store/combatStore';
import { gameSocket } from '../../../network/socket';
import type { EntityManager } from './EntityManager';
import type { WorldSceneAccessor } from './EntityManager';
import type { ChunkManager } from '../../rendering/ChunkManager';

/**
 * Manages cross-cutting interaction logic: entity clicks, portal checks,
 * NPC proximity, tile info popup, and range indicator.
 * Extracted from WorldScene (Phase 152).
 */
export class InteractionController {
  private lastClickedEntity: string | null = null;
  private nearestNpcInRange: Entity | null = null;
  private lastPortalEmitKey: string | null = null;
  private tileInfoPopup: Phaser.GameObjects.Container | null = null;

  constructor(
    private scene: Phaser.Scene,
    private entityManager: EntityManager,
    private worldAccessor: WorldSceneAccessor,
  ) {}

  /**
   * Set up all interaction event listeners.
   */
  create(): void {
    // Ground click handler: clear target highlight when clicking empty ground
    this.scene.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (this.lastClickedEntity) {
        this.lastClickedEntity = null;
        return;
      }
      if (pointer.rightButtonDown()) return;

      this.entityManager.getTargetHighlight()?.hide();
      useCombatStore.getState().stopAutoAttack();
      useCombatStore.getState().setInCombat(useCombatStore.getState().inCombat, null);
    });

    // Entity click handler for click-to-attack (CATK-01, CATK-02, CATK-04)
    this.scene.input.on('gameobjectdown', (pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject) => {
      if (!pointer.leftButtonDown()) return;

      const container = gameObject.parentContainer;
      if (!container) return;

      const entityId = container.getData('entityId') as string | undefined;
      const entityType = container.getData('entityType') as string | undefined;

      if (!entityId) return;

      // NPC interaction
      if (entityType === 'npc') {
        this.lastClickedEntity = entityId;
        gameSocket.emit('npc:interact', { entityId });
        return;
      }

      // Item pickup
      if (entityType === 'item') {
        this.lastClickedEntity = entityId;
        gameSocket.emit('inventory:pickup', { entityId });
        return;
      }

      // Resources: click selects target, user fires gather from action bar
      if (entityType === 'mineral' || entityType === 'plant') {
        this.lastClickedEntity = entityId;
        const targetContainer = this.entityManager.getEntitySprites().get(entityId);
        if (targetContainer) {
          this.entityManager.getTargetHighlight()?.show(entityId, targetContainer, 'herbivore');
        }
        useCombatStore.getState().selectTarget(entityId);
        return;
      }

      // Artifacts: instant collection
      if (entityType === 'artifact') {
        this.lastClickedEntity = entityId;
        gameSocket.emit('entity:tool_use', { targetEntityId: entityId });
        return;
      }

      // Creatures: combat flow (INTERACT-01)
      if (entityType === 'creature') {
        this.lastClickedEntity = entityId;
        this.handleEntityClick(entityId);
        useCombatStore.getState().startAutoAttack(entityId);
        return;
      }
    });
  }

  /**
   * Per-frame update: range indicator and NPC proximity.
   * Called from WorldScene.handleInput() with player pixel position.
   */
  update(playerPx: number, playerPy: number): void {
    this.updateRangeIndicator(playerPx, playerPy);
    this.updateNpcProximity(playerPx, playerPy);
  }

  /**
   * Handle click on entity creature — select target.
   */
  private handleEntityClick(entityId: string): void {
    const entity = useEntityStore.getState().entities.get(entityId);
    if (!entity || entity.type !== 'creature') return;

    const creatureEntity = entity as { behavior?: string };
    const targetContainer = this.entityManager.getEntitySprites().get(entityId);
    if (targetContainer) {
      this.entityManager.getTargetHighlight()?.show(entityId, targetContainer, creatureEntity.behavior ?? 'herbivore');
    }
    useCombatStore.getState().selectTarget(entityId);
  }

  /**
   * Show tile information popup (triggered by both mouse buttons).
   */
  showTileInfo(pointer: Phaser.Input.Pointer): void {
    const isoTransform = this.worldAccessor.getIsoTransform();
    const currentTiles = this.worldAccessor.getCurrentTiles();
    if (!isoTransform || !currentTiles) return;

    const worldPoint = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y);

    const gridPos = isoTransform.screenToTileWithElevation(
      worldPoint.x,
      worldPoint.y,
      (x, y) => this.worldAccessor.getTileElevation(x, y)
    );

    const currentZoneSize = getZoneSize(this.worldAccessor.getCurrentZoneId());
    if (gridPos.x < 0 || gridPos.x >= currentZoneSize || gridPos.y < 0 || gridPos.y >= currentZoneSize) {
      return;
    }

    const tileNumericId = currentTiles[gridPos.y]?.[gridPos.x];
    if (tileNumericId === undefined) return;

    const tileId = tileIdToString(tileNumericId as TileId);
    const tileDef = TileRegistry.get(tileId);
    const elevation = this.worldAccessor.getCurrentHeights()?.[gridPos.y]?.[gridPos.x] ?? 0;
    const isBlocked = false; // Simplified — collision map not easily accessible here

    this.hideTileInfo();

    const popup = this.scene.add.container(pointer.x, pointer.y - 100);
    popup.setScrollFactor(0);
    popup.setDepth(2000);

    const bg = this.scene.add.graphics();
    bg.fillStyle(0x000000, 0.85);
    bg.fillRoundedRect(-120, -60, 240, 120, 8);
    bg.lineStyle(2, isBlocked ? 0xff4444 : 0x44ff44, 1);
    bg.strokeRoundedRect(-120, -60, 240, 120, 8);
    popup.add(bg);

    const title = this.scene.add.text(0, -45, tileDef.displayName, {
      fontSize: '16px',
      fontFamily: 'monospace',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0);
    popup.add(title);

    const props = [
      `Position: (${gridPos.x}, ${gridPos.y})`,
      `Elevation: ${elevation}`,
      `Blocking: ${isBlocked ? 'Yes' : 'No'}`,
      `Speed: ${tileDef.movementSpeed}x`,
    ];

    const propsText = this.scene.add.text(0, -20, props.join('\n'), {
      fontSize: '12px',
      fontFamily: 'monospace',
      color: '#cccccc',
      lineSpacing: 4,
    }).setOrigin(0.5, 0);
    popup.add(propsText);

    if (tileDef.description) {
      const desc = this.scene.add.text(0, 35, tileDef.description, {
        fontSize: '10px',
        fontFamily: 'monospace',
        color: '#aaaaaa',
        wordWrap: { width: 220 },
        align: 'center',
      }).setOrigin(0.5, 0);
      popup.add(desc);
    }

    this.tileInfoPopup = popup;
  }

  hideTileInfo(): void {
    if (this.tileInfoPopup) {
      this.tileInfoPopup.destroy();
      this.tileInfoPopup = null;
    }
  }

  // ── Portal Detection ──────────────────────────────────────────────────

  checkPortalTile(position: Position): void {
    const posKey = `${position.x},${position.y},${position.zoneId}`;
    if (this.lastPortalEmitKey === posKey) return;

    let tileNumericId: number | undefined;
    const chunkManager = this.worldAccessor.getChunkManager();
    const currentTiles = this.worldAccessor.getCurrentTiles();

    if (chunkManager) {
      if (position.zoneId === this.worldAccessor.getCurrentZoneId() && currentTiles) {
        tileNumericId = currentTiles[position.y]?.[position.x];
      } else {
        const chunk = chunkManager.getChunk(position.zoneId);
        if (chunk?.data.tiles) {
          tileNumericId = chunk.data.tiles[position.y]?.[position.x];
        }
      }
    } else if (currentTiles) {
      tileNumericId = currentTiles[position.y]?.[position.x];
    }

    if (tileNumericId === 16) {
      this.lastPortalEmitKey = posKey;
      gameSocket.emit('portal:use', {});
    } else {
      this.lastPortalEmitKey = null;
    }
  }

  checkPortalTileAtPixels(tileX: number, tileY: number): void {
    const currentTiles = this.worldAccessor.getCurrentTiles();
    if (!currentTiles) return;
    const tileNumericId = currentTiles[tileY]?.[tileX];
    if (tileNumericId === 16) {
      const key = `${this.worldAccessor.getCurrentZoneId()}:${tileX},${tileY}`;
      if (this.lastPortalEmitKey !== key) {
        this.lastPortalEmitKey = key;
        gameSocket.emit('portal:use', {});
      }
    } else {
      this.lastPortalEmitKey = null;
    }
  }

  clearLastPortalEmitKey(): void {
    this.lastPortalEmitKey = null;
  }

  // ── Range Indicator ───────────────────────────────────────────────────

  private updateRangeIndicator(playerPx: number, playerPy: number): void {
    const targetHighlight = this.entityManager.getTargetHighlight();
    if (!targetHighlight) return;
    const targetId = targetHighlight.getTargetEntityId();
    if (!targetId) return;

    const entity = useEntityStore.getState().entities.get(targetId);
    if (!entity) return;

    const { px: ex, py: ey } = tileToPixelCenter(entity.position.x, entity.position.y);
    const dist = pixelDistanceTo(playerPx, playerPy, ex, ey);

    const isCreature = entity.type === 'creature';
    const rangePx = isCreature ? 1 * TILE_SIZE_PX : GATHER_RANGE_PX;
    const inRange = dist <= rangePx;

    targetHighlight.setInRange(inRange);
  }

  // ── NPC Proximity ─────────────────────────────────────────────────────

  private updateNpcProximity(playerPx: number, playerPy: number): void {
    const entities = useEntityStore.getState().entities;
    if (!entities) return;

    let closestNpcInRange: Entity | null = null;
    let closestDist = Infinity;

    for (const entity of entities.values()) {
      if (entity.type !== 'npc' || !entity.active) continue;
      const { px: ex, py: ey } = tileToPixelCenter(entity.position.x, entity.position.y);
      const dist = pixelDistanceTo(playerPx, playerPy, ex, ey);
      if (dist <= NPC_INTERACT_RANGE_PX && dist < closestDist) {
        closestDist = dist;
        closestNpcInRange = entity;
      }
    }

    this.nearestNpcInRange = closestNpcInRange;
  }

  getNearestNpcInRange(): Entity | null {
    return this.nearestNpcInRange;
  }

  destroy(): void {
    this.hideTileInfo();
  }
}
