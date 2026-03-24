import type { Creature } from '@into-the-void/shared-types';
import type { EffectContext, EffectResult } from './types';
import { AbstractEffectStrategy } from './AbstractEffectStrategy';
import { tileToPixelCenter, pixelDistanceTo } from '../movement/pixel-distance';
import { TILE_SIZE_PX } from '../movement/pixel-validation';

export class RevealEffectStrategy extends AbstractEffectStrategy {
  async apply(context: EffectContext): Promise<EffectResult> {
    const { effect, player, services } = context;
    if (effect.type !== 'reveal') return this.ok();

    // Handle reveal effect (ABIL-06: Precision Shot predator reveal)
    const entities = await services.getZoneEntities(player.position.zoneId);
    const predatorsInRange = entities.filter(
      (e: any): e is Creature =>
        e.type === 'creature' &&
        (e as Creature).active &&
        (e as Creature).behavior === 'predator' &&
        (() => {
          const { px: ePx, py: ePy } = tileToPixelCenter(e.position.x, e.position.y);
          return pixelDistanceTo(ePx, ePy, player.px, player.py) <= effect.radiusTiles * TILE_SIZE_PX;
        })(),
    );
    for (const pred of predatorsInRange) {
      await services.updateEntity(player.position.zoneId, pred.id, {
        revealed: true,
      });
      services.emitToZone(player.position.zoneId, 'entity:update', {
        entityId: pred.id,
        changes: { revealed: true },
      });
      // Schedule reveal expiry
      const revealZoneId = player.position.zoneId;
      const revealEntityId = pred.id;
      setTimeout(async () => {
        await services.updateEntity(revealZoneId, revealEntityId, {
          revealed: false,
        });
        services.emitToZone(revealZoneId, 'entity:update', {
          entityId: revealEntityId,
          changes: { revealed: false },
        });
      }, effect.durationMs);
    }

    return this.ok();
  }
}
