import type { Creature } from '@into-the-void/shared-types';
import type { EffectStrategy, EffectContext, EffectResult, PlayerRef } from './types';
import type { EquipmentJson } from '@into-the-void/database';
import { computeCharStats } from '../stats/char-stats';
import { tileToPixelCenter, pixelDistanceTo, TILE_SIZE_PX } from '../movement/pixel-distance';
import { EntityRegistry } from '@into-the-void/entities';
import type { CreatureDefinition } from '@into-the-void/entities';
import { getCreatureLoot } from '../loot/creature-loot';
import { rollLootTable } from '../loot/loot-table';

export abstract class AbstractEffectStrategy implements EffectStrategy {
  abstract apply(context: EffectContext): Promise<EffectResult>;

  /**
   * Compute player stats from equipment + buffs.
   * Shared by damage, heal, gather, and other strategies.
   */
  protected computePlayerStats(player: PlayerRef, services: EffectContext['services']) {
    const inv = services.getInventory(player.id);
    const playerEquipment = (inv?.equipment as EquipmentJson) ?? { modules: [] };
    const playerBuffs = services.getActiveBuffs(player.id);
    return computeCharStats(player.level, playerEquipment, 'player', playerBuffs);
  }

  /**
   * Find active creatures within pixel radius of a tile position.
   * Used by damage (AoE) and dot (spread) strategies.
   */
  protected async getNearbyCreatures(
    services: EffectContext['services'],
    zoneId: string,
    centerX: number,
    centerY: number,
    radiusTiles: number,
    excludeId?: string,
  ): Promise<Creature[]> {
    const entities = await services.getZoneEntities(zoneId);
    const { px: cPx, py: cPy } = tileToPixelCenter(centerX, centerY);
    const radiusPx = radiusTiles * TILE_SIZE_PX;
    return entities.filter(
      (e: any): e is Creature => {
        if (
          e.type !== 'creature' ||
          !e.active ||
          e.health <= 0 ||
          e.id === excludeId
        ) {
          return false;
        }
        const { px: ePx, py: ePy } = tileToPixelCenter(e.position.x, e.position.y);
        return pixelDistanceTo(cPx, cPy, ePx, ePy) <= radiusPx;
      },
    );
  }

  /**
   * Handle creature death: roll loot, spawn ground items, schedule respawn, emit events.
   * Used by damage and dot strategies.
   */
  protected async handleCreatureDeath(
    creature: Creature,
    zoneId: string,
    player: PlayerRef,
    services: EffectContext['services'],
  ): Promise<any[]> {
    const def = EntityRegistry.get(creature.speciesId) as CreatureDefinition | undefined;
    if (!def) return [];

    const lootEntries = getCreatureLoot(def.lootTableId);
    const loot = rollLootTable(lootEntries);

    const groundItems = await services.spawnGroundItemsForCombat(
      loot,
      creature.position.x,
      creature.position.y,
      creature.position.zoneId,
    );

    // Schedule respawn with +/-25% variance (RESP-02)
    const variance = def.respawnSeconds * 0.25;
    const offset = (Math.random() * 2 - 1) * variance;
    const respawnSeconds = Math.round(def.respawnSeconds + offset);
    await services.recordEntityKill(creature.id, zoneId, respawnSeconds);

    return groundItems;
  }

  /**
   * Handle creature retaliation after being hit (not killed).
   * Used by damage and dot strategies.
   */
  protected async handleCreatureRetaliation(
    creature: Creature,
    targetEntityId: string,
    playerId: string,
    zoneId: string,
    services: EffectContext['services'],
  ): Promise<void> {
    if (creature.behavior === 'omnivore') {
      await services.provokeCreature(zoneId, targetEntityId);
    }
    await services.updateEntity(zoneId, targetEntityId, { combatTarget: playerId });
    if (creature.behavior === 'predator' || creature.behavior === 'maniac' || creature.behavior === 'omnivore') {
      await services.startCreatureCombat(targetEntityId, playerId, zoneId);
    }
  }

  /** Default success result */
  protected ok(extra?: Partial<EffectResult>): EffectResult {
    return { success: true, ...extra };
  }

  /** Default failure result */
  protected fail(error: string): EffectResult {
    return { success: false, error };
  }
}
