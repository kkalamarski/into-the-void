import * as crypto from 'crypto';
import type { EffectContext, EffectResult } from './types';
import { AbstractEffectStrategy } from './AbstractEffectStrategy';

export class ReflectEffectStrategy extends AbstractEffectStrategy {
  async apply(context: EffectContext): Promise<EffectResult> {
    const { effect, ability, player, socketId, services } = context;
    if (effect.type !== 'reflect') return this.ok();

    services.setReflect(player.id, {
      reflectPercent: effect.reflectPercent,
      expiresAt: Date.now() + effect.durationMs,
    });
    // Emit as buff for client display
    services.emitToSocket(socketId, 'buff:apply', {
      buffId: crypto.randomUUID(),
      displayName: ability.displayName,
      stat: 'reflect',
      amount: Math.round(effect.reflectPercent * 100),
      expiresAt: Date.now() + effect.durationMs,
      iconColor: ability.iconColor,
    });

    return this.ok();
  }
}
