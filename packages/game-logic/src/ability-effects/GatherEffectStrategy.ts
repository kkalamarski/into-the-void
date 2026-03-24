import type { EffectContext, EffectResult } from './types';
import type { EquipmentJson } from '@into-the-void/database';
import { AbstractEffectStrategy } from './AbstractEffectStrategy';
import { computeCharStats } from '../stats/char-stats';

export class GatherEffectStrategy extends AbstractEffectStrategy {
  async apply(context: EffectContext): Promise<EffectResult> {
    const { effect, player, socketId, targetEntityId, toolStats, services } = context;
    if (effect.type !== 'gather') return this.ok();
    if (!targetEntityId) return this.fail('No target');

    // 1. Get target entity
    const entity = await services.getEntity(player.position.zoneId, targetEntityId);
    if (!entity) {
      return { success: false, error: 'Target not found', earlyReturn: true };
    }

    // 2. Resolve gather type for universal
    let resolvedType = effect.gatherType;
    if (resolvedType === 'universal') {
      if (entity.type === 'plant') {
        resolvedType = 'harvest';
      } else if (entity.type === 'mineral') {
        resolvedType = 'mine';
      } else if (entity.type === 'artifact') {
        // Artifacts use handleToolUse directly — no special resolution needed
        resolvedType = 'harvest'; // Placeholder; artifact path below
      } else {
        return { success: false, error: 'Cannot gather from this target', earlyReturn: true };
      }
    }

    // 3. Validate entity type matches resolved gather type (non-universal)
    if (effect.gatherType !== 'universal') {
      if (resolvedType === 'harvest' && entity.type !== 'plant') {
        return { success: false, error: 'Cannot harvest this target', earlyReturn: true };
      }
      if (resolvedType === 'mine' && entity.type !== 'mineral') {
        return { success: false, error: 'Cannot mine this target', earlyReturn: true };
      }
    }

    // 4. Calculate yield with tool bonus + perception bonus for universal gather
    let yieldMultiplier = 1 + toolStats.yieldBonus;
    if (effect.gatherType === 'universal') {
      // Perception bonus: 1% per point, cap 50%
      const inv = services.getInventory(player.id);
      const playerEquipment = (inv?.equipment as EquipmentJson) ?? { modules: [] };
      const playerBuffs = services.getActiveBuffs(player.id);
      const playerStats = computeCharStats(player.level, playerEquipment, 'player', playerBuffs);
      const perceptionBonus = Math.min(0.5, playerStats.perception * 0.01);
      yieldMultiplier += perceptionBonus;
    }
    const finalYield = Math.max(1, Math.floor(effect.baseYield * yieldMultiplier));

    // 5. Call EntityService to process gathering
    console.log(`[ABILITY] handleGatherEffect: target=${targetEntityId} yield=${finalYield} resolvedType=${resolvedType}`);
    const result = await services.handleToolUse(
      socketId,
      targetEntityId,
      finalYield
    );
    console.log(`[ABILITY] handleGatherEffect result: success=${result.success} error=${result.error ?? 'none'}`);

    if (!result.success) {
      return { success: false, error: result.error, earlyReturn: true };
    }

    // 6. Emit events for entity update and loot
    if (result.entityChanges) {
      services.emitToZone(player.position.zoneId, 'entity:update', {
        entityId: targetEntityId,
        changes: result.entityChanges,
      });
    }

    if (result.groundItems && result.groundItems.length > 0) {
      for (const item of result.groundItems) {
        services.emitToZone(player.position.zoneId, 'entity:spawn', item as any);
      }
    }

    return this.ok();
  }
}
