import * as crypto from 'crypto';
import type { Buff } from '@into-the-void/shared-types';
import type { EffectContext, EffectResult } from './types';
import { AbstractEffectStrategy } from './AbstractEffectStrategy';

export class BuffEffectStrategy extends AbstractEffectStrategy {
  async apply(context: EffectContext): Promise<EffectResult> {
    const { effect, ability, player, services } = context;
    if (effect.type !== 'buff') return this.ok();

    const buff: Buff = {
      id: crypto.randomUUID(),
      abilityId: ability.id,
      stat: effect.stat,
      amount: effect.amount,
      expiresAt: Date.now() + effect.duration,
      displayName: ability.displayName,
      iconColor: ability.iconColor,
    };
    services.applyBuff(player.id, buff);

    return this.ok();
  }
}
