import type { Creature } from '@into-the-void/shared-types';
import type { EffectContext, EffectResult } from './types';
import { AbstractEffectStrategy } from './AbstractEffectStrategy';

export class StunEffectStrategy extends AbstractEffectStrategy {
  async apply(context: EffectContext): Promise<EffectResult> {
    const { effect, player, targetEntityId, services } = context;
    if (effect.type !== 'stun') return this.ok();
    if (!targetEntityId) return this.ok();

    const stunEntity = await services.getEntity(player.position.zoneId, targetEntityId);
    if (stunEntity && stunEntity.type === 'creature') {
      const stunTarget = stunEntity as Creature;
      // ABIL-08: 3s vs maniacs, 1s otherwise
      let stunMs = effect.durationMs;
      if (stunTarget.behavior === 'maniac' && effect.maniacDurationMs) {
        stunMs = effect.maniacDurationMs;
      }
      services.setStunnedCreature(targetEntityId, Date.now() + stunMs);
      // Emit stun visual to zone
      services.emitToZone(player.position.zoneId, 'entity:update', {
        entityId: targetEntityId,
        changes: { stunned: true },
      });
      // Schedule stun expiry emission
      const zoneId = player.position.zoneId;
      setTimeout(() => {
        services.deleteStunnedCreature(targetEntityId);
        services.emitToZone(zoneId, 'entity:update', {
          entityId: targetEntityId,
          changes: { stunned: false },
        });
      }, stunMs);
    }

    return this.ok();
  }
}
