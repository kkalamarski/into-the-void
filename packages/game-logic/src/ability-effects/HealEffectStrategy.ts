import type { EffectContext, EffectResult } from './types';
import { AbstractEffectStrategy } from './AbstractEffectStrategy';

export class HealEffectStrategy extends AbstractEffectStrategy {
  async apply(context: EffectContext): Promise<EffectResult> {
    const { effect, player, services } = context;
    if (effect.type !== 'heal') return this.ok();

    const playerStats = this.computePlayerStats(player, services);

    const healAmount = Math.floor(effect.baseHeal + (effect.scaling * playerStats.power));
    const newHealth = Math.min(player.maxHealth, player.health + healAmount);

    services.updateHealth(player.id, newHealth);

    services.emitToZone(player.position.zoneId, 'player:health', {
      playerId: player.id,
      health: newHealth,
      maxHealth: player.maxHealth,
    });

    return this.ok();
  }
}
