import type { Creature } from '@into-the-void/shared-types';
import type { EffectContext, EffectResult } from './types';
import { AbstractEffectStrategy } from './AbstractEffectStrategy';

export class DotEffectStrategy extends AbstractEffectStrategy {
  async apply(context: EffectContext): Promise<EffectResult> {
    const { effect, player, targetEntityId, services } = context;
    if (effect.type !== 'dot') return this.ok();

    // Handle DoT spread effect (ABIL-04: Electrocute chain spread)
    const dotEffect = effect as { type: 'dot'; damagePerTick: number; tickInterval: number; duration: number; spreadRadius?: number };
    if (dotEffect.spreadRadius && dotEffect.spreadRadius > 0 && targetEntityId) {
      const primaryTarget = await services.getEntity(player.position.zoneId, targetEntityId);
      if (primaryTarget && primaryTarget.type === 'creature') {
        const primary = primaryTarget as Creature;
        const nearbyCreatures = await this.getNearbyCreatures(
          services,
          player.position.zoneId,
          primary.position.x,
          primary.position.y,
          dotEffect.spreadRadius,
          targetEntityId,
        );
        for (const nearby of nearbyCreatures) {
          const spreadDamage = dotEffect.damagePerTick;
          nearby.health = Math.max(0, nearby.health - spreadDamage);
          const spreadKilled = nearby.health <= 0;
          await services.updateEntity(player.position.zoneId, nearby.id, {
            health: nearby.health,
            active: !spreadKilled,
          });
          services.emitToZone(player.position.zoneId, 'combat:damage', {
            attackerId: player.id,
            attackerName: player.name,
            defenderId: nearby.id,
            defenderName: nearby.name,
            damage: spreadDamage,
            defenderHealth: nearby.health,
            defenderMaxHealth: nearby.maxHealth,
            critical: false,
            killed: spreadKilled,
            defenderPosition: { x: nearby.position.x, y: nearby.position.y },
          });
          if (!spreadKilled) {
            if (nearby.behavior === 'omnivore') {
              await services.provokeCreature(player.position.zoneId, nearby.id);
            }
            if (nearby.behavior === 'predator' || nearby.behavior === 'maniac' || nearby.behavior === 'omnivore') {
              await services.startCreatureCombat(nearby.id, player.id, player.position.zoneId);
            }
          } else {
            services.stopCreatureCombat(nearby.id);
            const groundItems = await this.handleCreatureDeath(nearby, player.position.zoneId, player, services);
            for (const item of groundItems) {
              services.emitToZone(player.position.zoneId, 'entity:spawn', item as any);
            }
            const levelDiff = nearby.level - player.level;
            const levelBonus = levelDiff > 0 ? 1 + levelDiff * 0.1 : 1;
            const xpReward = Math.floor(10 * nearby.level * levelBonus);
            services.grantXp(player.id, xpReward);
            services.emitToZone(player.position.zoneId, 'entity:despawn', { entityId: nearby.id });
          }
        }
      }
    }

    return this.ok();
  }
}
