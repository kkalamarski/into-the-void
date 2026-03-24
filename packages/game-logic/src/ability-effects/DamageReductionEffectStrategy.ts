import * as crypto from 'crypto';
import type { EffectContext, EffectResult } from './types';
import { AbstractEffectStrategy } from './AbstractEffectStrategy';

export class DamageReductionEffectStrategy extends AbstractEffectStrategy {
  async apply(context: EffectContext): Promise<EffectResult> {
    const { effect, ability, player, socketId, services } = context;
    if (effect.type !== 'damage_reduction') return this.ok();

    services.setDamageReduction(player.id, {
      reductionPercent: effect.reductionPercent,
      expiresAt: Date.now() + effect.durationMs,
    });
    // Emit as a buff-like event so client can show buff icon
    services.emitToSocket(socketId, 'buff:apply', {
      buffId: crypto.randomUUID(),
      displayName: ability.displayName,
      stat: 'damage_reduction',
      amount: Math.round(effect.reductionPercent * 100),
      expiresAt: Date.now() + effect.durationMs,
      iconColor: ability.iconColor,
    });

    return this.ok();
  }
}
