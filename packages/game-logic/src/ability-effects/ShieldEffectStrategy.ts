import type { EffectContext, EffectResult } from './types';
import { AbstractEffectStrategy } from './AbstractEffectStrategy';

export class ShieldEffectStrategy extends AbstractEffectStrategy {
  async apply(context: EffectContext): Promise<EffectResult> {
    const { effect, player, socketId, services } = context;
    if (effect.type !== 'shield') return this.ok();

    services.setShield(player.id, {
      absorbRemaining: effect.absorbAmount,
      maxAbsorb: effect.absorbAmount,
      expiresAt: Date.now() + effect.durationMs,
    });
    // Emit shield:apply to player's socket for HUD shield bar
    services.emitToSocket(socketId, 'shield:apply', {
      absorbAmount: effect.absorbAmount,
      durationMs: effect.durationMs,
      expiresAt: Date.now() + effect.durationMs,
    });

    return this.ok();
  }
}
