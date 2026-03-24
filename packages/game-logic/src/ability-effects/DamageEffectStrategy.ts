import type { Creature, ItemEntity } from '@into-the-void/shared-types';
import type { DamageType } from '@into-the-void/shared-types';
import type { EffectContext, EffectResult } from './types';
import type { EquipmentJson } from '@into-the-void/database';
import { AbstractEffectStrategy } from './AbstractEffectStrategy';
import { calculateDamage } from '../combat/damage';
import { computeCharStats } from '../stats/char-stats';
import { EntityRegistry } from '@into-the-void/entities';
import type { CreatureDefinition } from '@into-the-void/entities';
import { ItemRegistry } from '@into-the-void/items';

export class DamageEffectStrategy extends AbstractEffectStrategy {
  async apply(context: EffectContext): Promise<EffectResult> {
    const { effect, ability, player, targetEntityId, services } = context;
    if (effect.type !== 'damage') return this.ok();

    // Read ability damage type
    const abilityDamageType = (effect as { type: 'damage'; baseDamage: number; scaling: number; damageType?: DamageType }).damageType;

    let totalDamage = 0;
    let resultTargetHealth: number | undefined;
    let resultTargetMaxHealth: number | undefined;

    if (!ability.requiresTarget) {
      // AoE damage: hit all creatures in range of the player (ABIL-05: Overload Pulse)
      const nearbyCreatures = await this.getNearbyCreatures(
        services,
        player.position.zoneId,
        player.position.x,
        player.position.y,
        ability.range,
      );
      for (const aoeTarget of nearbyCreatures) {
        const creatureDef = EntityRegistry.get(aoeTarget.speciesId) as CreatureDefinition | undefined;
        const defenderResistances = creatureDef?.resistances;
        const playerStats = this.computePlayerStats(player, services);
        const emptyEquipment: EquipmentJson = { modules: [] };
        const creatureStats = computeCharStats(aoeTarget.level, emptyEquipment, 'creature');

        const aoeDamageResult = calculateDamage({
          baseDamage: effect.baseDamage,
          attackerLevel: player.level,
          defenderLevel: aoeTarget.level,
          attackerStats: playerStats,
          defenderStats: creatureStats,
          weaponDamage: effect.baseDamage * effect.scaling,
          armorReduction: creatureStats.toughness * 0.1,
          damageType: abilityDamageType,
          defenderResistances,
        });

        const aoeDamage = aoeDamageResult.damage;
        totalDamage += aoeDamage;
        aoeTarget.health = Math.max(0, aoeTarget.health - aoeDamage);
        const aoeKilled = aoeTarget.health <= 0;

        await services.updateEntity(player.position.zoneId, aoeTarget.id, {
          health: aoeTarget.health,
          active: !aoeKilled,
        });

        services.emitToZone(player.position.zoneId, 'entity:update', {
          entityId: aoeTarget.id,
          changes: { health: aoeTarget.health, maxHealth: aoeTarget.maxHealth, active: !aoeKilled },
        });

        if (!aoeKilled) {
          await this.handleCreatureRetaliation(aoeTarget, aoeTarget.id, player.id, player.position.zoneId, services);
        } else {
          services.stopCreatureCombat(aoeTarget.id);
          const groundItems = await this.handleCreatureDeath(aoeTarget, player.position.zoneId, player, services);
          for (const item of groundItems) {
            services.emitToZone(player.position.zoneId, 'entity:spawn', item as any);
          }
          const levelDiff = aoeTarget.level - player.level;
          const levelBonus = levelDiff > 0 ? 1 + levelDiff * 0.1 : 1;
          const xpReward = Math.floor(10 * aoeTarget.level * levelBonus);
          services.grantXp(player.id, xpReward);
          services.emitEvent('entity.killed', {
            characterId: player.id,
            entityId: aoeTarget.speciesId,
            entityType: 'creature',
            creatureLevel: aoeTarget.level,
            zoneId: player.position.zoneId,
          });
          services.emitToZone(player.position.zoneId, 'entity:despawn', { entityId: aoeTarget.id });
        }

        services.emitToZone(player.position.zoneId, 'combat:damage', {
          attackerId: player.id,
          attackerName: player.name,
          defenderId: aoeTarget.id,
          defenderName: aoeTarget.name,
          damage: aoeDamage,
          defenderHealth: aoeTarget.health,
          defenderMaxHealth: aoeTarget.maxHealth,
          critical: aoeDamageResult.critical,
          killed: aoeKilled,
          damageType: abilityDamageType,
          defenderPosition: { x: aoeTarget.position.x, y: aoeTarget.position.y },
        });
      }
    } else {
      // Single-target damage
      if (!targetEntityId) return this.ok();
      const entity = await services.getEntity(player.position.zoneId, targetEntityId);
      if (!entity || entity.type !== 'creature') return this.ok();
      const target = entity as Creature;

      // Look up creature definition for resistances
      const creatureDef = EntityRegistry.get(target.speciesId) as CreatureDefinition | undefined;
      const defenderResistances = creatureDef?.resistances;

      // ABIL-01: Conditional damage bonus (e.g., Plasma Burst +50% above 80% HP)
      let conditionMultiplier = 1.0;
      const damageEffect = effect as { type: 'damage'; baseDamage: number; scaling: number; damageType?: DamageType; conditionBonus?: { hpThresholdAbove: number; multiplier: number } };
      if (damageEffect.conditionBonus && target.health / target.maxHealth > damageEffect.conditionBonus.hpThresholdAbove) {
        conditionMultiplier = damageEffect.conditionBonus.multiplier;
      }

      // Calculate damage
      const inv = services.getInventory(player.id);
      const playerEquipment = (inv?.equipment as EquipmentJson) ?? { modules: [] };
      const playerBuffs = services.getActiveBuffs(player.id);
      const playerStats = computeCharStats(player.level, playerEquipment, 'player', playerBuffs);

      const emptyEquipment: EquipmentJson = { modules: [] };
      const creatureStats = computeCharStats(target.level, emptyEquipment, 'creature');

      // Read damage_type_bonus from equipped gear for this damage type
      let damageBonusMultiplier = 1.0;
      if (abilityDamageType) {
        const equippedSlots = [
          inv?.equipment?.exosuit,
          inv?.equipment?.tool,
          ...(inv?.equipment?.modules ?? []),
        ].filter(Boolean);
        for (const equipped of equippedSlots) {
          const itemDef = ItemRegistry.get(equipped!.itemId);
          for (const effectDef of itemDef?.effects ?? []) {
            if (effectDef.effect.type === 'damage_type_bonus' && effectDef.effect.damageType === abilityDamageType) {
              damageBonusMultiplier += effectDef.effect.bonusPercent / 100;
            }
          }
        }
      }

      const damageResult = calculateDamage({
        baseDamage: Math.round(effect.baseDamage * conditionMultiplier),
        attackerLevel: player.level,
        defenderLevel: target.level,
        attackerStats: playerStats,
        defenderStats: creatureStats,
        weaponDamage: Math.round(effect.baseDamage * effect.scaling * conditionMultiplier),
        armorReduction: creatureStats.toughness * 0.1,
        damageType: abilityDamageType,
        defenderResistances,
        damageBonusMultiplier: damageBonusMultiplier > 1.0 ? damageBonusMultiplier : undefined,
      });

      totalDamage = damageResult.damage;
      target.health = Math.max(0, target.health - totalDamage);
      resultTargetHealth = target.health;
      resultTargetMaxHealth = target.maxHealth;

      const killed = target.health <= 0;
      let groundItems: ItemEntity[] = [];

      // Update entity in zone
      await services.updateEntity(player.position.zoneId, targetEntityId, {
        health: target.health,
        active: !killed,
      });

      // Trigger creature retaliation if not killed
      if (!killed) {
        await this.handleCreatureRetaliation(target, targetEntityId, player.id, player.position.zoneId, services);
      }

      // Emit entity:update so entityStore syncs for UI (TargetFrame, etc.)
      services.emitToZone(player.position.zoneId, 'entity:update', {
        entityId: targetEntityId,
        changes: { health: target.health, maxHealth: target.maxHealth, active: !killed },
      });

      // Handle creature death: spawn loot and schedule respawn
      if (killed) {
        services.stopCreatureCombat(targetEntityId);
        groundItems = await this.handleCreatureDeath(target, player.position.zoneId, player, services) as ItemEntity[];
        for (const item of groundItems) {
          services.emitToZone(player.position.zoneId, 'entity:spawn', item as any);
        }
        const levelDiff = target.level - player.level;
        const levelBonus = levelDiff > 0 ? 1 + levelDiff * 0.1 : 1;
        const xpReward = Math.floor(10 * target.level * levelBonus);
        services.grantXp(player.id, xpReward);
        services.emitEvent('entity.killed', {
          characterId: player.id,
          entityId: target.speciesId,
          entityType: 'creature',
          creatureLevel: target.level,
          zoneId: player.position.zoneId,
        });
        services.emitToZone(player.position.zoneId, 'entity:despawn', { entityId: targetEntityId });
      }

      // Broadcast damage to zone
      services.emitToZone(player.position.zoneId, 'combat:damage', {
        attackerId: player.id,
        attackerName: player.name,
        defenderId: targetEntityId,
        defenderName: target.name,
        damage: totalDamage,
        defenderHealth: target.health,
        defenderMaxHealth: target.maxHealth,
        critical: damageResult.critical,
        killed,
        damageType: abilityDamageType,
        groundItems: groundItems.length > 0 ? groundItems : undefined,
        defenderPosition: { x: target.position.x, y: target.position.y },
      });
    }

    return this.ok({
      damage: totalDamage > 0 ? totalDamage : undefined,
      targetHealth: resultTargetHealth,
      targetMaxHealth: resultTargetMaxHealth,
    });
  }
}
