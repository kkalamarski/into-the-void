import * as crypto from 'crypto';
import type { EffectContext, EffectResult } from './types';
import { AbstractEffectStrategy } from './AbstractEffectStrategy';

export class HazardImmunityEffectStrategy extends AbstractEffectStrategy {
  async apply(context: EffectContext): Promise<EffectResult> {
    const { effect, ability, player, socketId, services } = context;
    if (effect.type !== 'hazard_immunity') return this.ok();

    services.setHazardImmunity(player.id, Date.now() + effect.durationMs);
    // Emit as a buff-like event for client display
    services.emitToSocket(socketId, 'buff:apply', {
      buffId: crypto.randomUUID(),
      displayName: ability.displayName,
      stat: 'hazard_immunity',
      amount: 1,
      expiresAt: Date.now() + effect.durationMs,
      iconColor: ability.iconColor,
    });

    return this.ok();
  }
}
