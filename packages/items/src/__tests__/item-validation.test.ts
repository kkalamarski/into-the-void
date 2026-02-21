import { describe, it, expect } from 'vitest';
import { ALL_SUITS } from '../definitions/suits';
import { ALL_TOOLS } from '../definitions/tools';
import { ALL_MODULES } from '../definitions/modules';
import type { ItemDefinition, ItemEffect } from '../types';

// Helper functions
function getStatFromEffects(item: ItemDefinition, stat: string): number {
  if (!item.effects) return 0;
  let total = 0;
  for (const effectDef of item.effects) {
    if (effectDef.effect.type === 'stats') {
      const statsEffect = effectDef.effect as Extract<ItemEffect, { type: 'stats' }>;
      total += (statsEffect as Record<string, unknown>)[stat] as number ?? 0;
    }
  }
  return total;
}

function getTotalStats(item: ItemDefinition): number {
  const statNames = ['durability', 'toughness', 'power', 'haste', 'vigor', 'recovery', 'perception', 'resilience'];
  return statNames.reduce((sum, stat) => sum + getStatFromEffects(item, stat), 0);
}

function hasStatsEffect(item: ItemDefinition): boolean {
  if (!item.effects || item.effects.length === 0) return false;
  return item.effects.some(e => e.effect.type === 'stats');
}

function getTier(requiredLevel: number): number {
  if (requiredLevel <= 10) return 1;
  if (requiredLevel <= 20) return 2;
  if (requiredLevel <= 30) return 3;
  if (requiredLevel <= 40) return 4;
  return 5;
}

describe('Content Validation (CONT-01 to CONT-05)', () => {

  describe('CONT-01: Suit archetype differentiation', () => {
    it('tank suits have more durability+toughness than scout suits at same rarity/tier', () => {
      // Find tank suit (reinforced) and scout suit at same rarity/tier
      const reinforced = ALL_SUITS.find(s => s.id === 'suit_reinforced_rare');
      const scout = ALL_SUITS.find(s => s.id === 'suit_scout_rare');

      expect(reinforced).toBeDefined();
      expect(scout).toBeDefined();

      if (reinforced && scout) {
        const tankDefense = getStatFromEffects(reinforced, 'durability') + getStatFromEffects(reinforced, 'toughness');
        const scoutDefense = getStatFromEffects(scout, 'durability') + getStatFromEffects(scout, 'toughness');

        expect(tankDefense).toBeGreaterThan(scoutDefense);
      }
    });

    it('scout suits have more haste+perception than tank suits at same rarity/tier', () => {
      const reinforced = ALL_SUITS.find(s => s.id === 'suit_reinforced_rare');
      const scout = ALL_SUITS.find(s => s.id === 'suit_scout_rare');

      if (reinforced && scout) {
        const scoutMobility = getStatFromEffects(scout, 'haste') + getStatFromEffects(scout, 'perception');
        const tankMobility = getStatFromEffects(reinforced, 'haste') + getStatFromEffects(reinforced, 'perception');

        expect(scoutMobility).toBeGreaterThan(tankMobility);
      }
    });
  });

  describe('CONT-02: Rarity scaling', () => {
    it('legendary suits provide approximately 4x stat bonuses vs common at same tier', () => {
      // Compare tier 4 suits: hardened common vs void walker legendary
      // Note: hardened is tier 5, void walker is tier 4, so compare appropriately
      // Find common tier 1 and legendary tier 1 if available, or use ratio check

      const commonTier1 = ALL_SUITS.find(s => s.rarity === 'common' && getTier(s.requiredLevel) === 1);

      // For each rarity at same tier, verify scaling
      const rarities = ['common', 'rare', 'epic', 'exotic', 'legendary'] as const;
      const expectedMultipliers = { common: 1.0, rare: 1.4, epic: 2.0, exotic: 2.8, legendary: 4.0 };

      if (commonTier1) {
        const commonStats = getTotalStats(commonTier1);

        for (const rarity of rarities) {
          const suitOfRarity = ALL_SUITS.find(s => s.rarity === rarity && getTier(s.requiredLevel) === 1);
          if (suitOfRarity) {
            const rarityStats = getTotalStats(suitOfRarity);
            const expectedRatio = expectedMultipliers[rarity];
            const actualRatio = rarityStats / commonStats;

            // Allow 15% tolerance for rounding
            expect(actualRatio).toBeGreaterThanOrEqual(expectedRatio * 0.85);
            expect(actualRatio).toBeLessThanOrEqual(expectedRatio * 1.15);
          }
        }
      }
    });

    it('higher tier items have more stats than lower tier items of same rarity', () => {
      const commonSuits = ALL_SUITS.filter(s => s.rarity === 'common');
      const byTier = new Map<number, ItemDefinition[]>();

      for (const suit of commonSuits) {
        const tier = getTier(suit.requiredLevel);
        if (!byTier.has(tier)) byTier.set(tier, []);
        byTier.get(tier)!.push(suit);
      }

      const tiers = Array.from(byTier.keys()).sort();
      for (let i = 1; i < tiers.length; i++) {
        const lowerTier = tiers[i - 1];
        const higherTier = tiers[i];

        const lowerSuit = byTier.get(lowerTier)?.[0];
        const higherSuit = byTier.get(higherTier)?.[0];

        if (lowerSuit && higherSuit) {
          expect(getTotalStats(higherSuit)).toBeGreaterThan(getTotalStats(lowerSuit));
        }
      }
    });
  });

  describe('CONT-03: All equippable items have stats', () => {
    it('all suits have stats effects', () => {
      const suitsWithoutStats = ALL_SUITS.filter(suit => !hasStatsEffect(suit));

      expect(suitsWithoutStats).toHaveLength(0);

      if (suitsWithoutStats.length > 0) {
        console.error('Suits missing stats:', suitsWithoutStats.map(s => s.id));
      }
    });

    it('all tools have stats effects', () => {
      const toolsWithoutStats = ALL_TOOLS.filter(tool => !hasStatsEffect(tool));

      expect(toolsWithoutStats).toHaveLength(0);

      if (toolsWithoutStats.length > 0) {
        console.error('Tools missing stats:', toolsWithoutStats.map(t => t.id));
      }
    });

    it('all modules have stats effects', () => {
      const modulesWithoutStats = ALL_MODULES.filter(mod => !hasStatsEffect(mod));

      expect(modulesWithoutStats).toHaveLength(0);

      if (modulesWithoutStats.length > 0) {
        console.error('Modules missing stats:', modulesWithoutStats.map(m => m.id));
      }
    });
  });

  describe('CONT-04: Tools have role-appropriate stats', () => {
    it('combat tools have power > 0', () => {
      const combatTools = ALL_TOOLS.filter(t => t.toolType === 'combat');

      for (const tool of combatTools) {
        const power = getStatFromEffects(tool, 'power');
        expect(power).toBeGreaterThan(0);
      }
    });

    it('mining tools have perception > 0', () => {
      const miningTools = ALL_TOOLS.filter(t => t.toolType === 'mining');

      for (const tool of miningTools) {
        const perception = getStatFromEffects(tool, 'perception');
        expect(perception).toBeGreaterThan(0);
      }
    });

    it('research tools have perception > 0', () => {
      const researchTools = ALL_TOOLS.filter(t => t.toolType === 'research');

      for (const tool of researchTools) {
        const perception = getStatFromEffects(tool, 'perception');
        expect(perception).toBeGreaterThan(0);
      }
    });

    it('demolition tools have power > 0', () => {
      const demolitionTools = ALL_TOOLS.filter(t => t.toolType === 'demolition');

      for (const tool of demolitionTools) {
        const power = getStatFromEffects(tool, 'power');
        expect(power).toBeGreaterThan(0);
      }
    });
  });

  describe('CONT-05: Modules have focused stats', () => {
    it('armor modules have toughness > 0', () => {
      const armorModules = ALL_MODULES.filter(m => m.id.includes('armor'));

      for (const mod of armorModules) {
        const toughness = getStatFromEffects(mod, 'toughness');
        expect(toughness).toBeGreaterThan(0);
      }
    });

    it('speed modules have haste > 0', () => {
      const speedModules = ALL_MODULES.filter(m => m.id.includes('speed'));

      for (const mod of speedModules) {
        const haste = getStatFromEffects(mod, 'haste');
        expect(haste).toBeGreaterThan(0);
      }
    });

    it('sensor modules have perception > 0', () => {
      const sensorModules = ALL_MODULES.filter(m => m.id.includes('sensor'));

      for (const mod of sensorModules) {
        const perception = getStatFromEffects(mod, 'perception');
        expect(perception).toBeGreaterThan(0);
      }
    });

    it('power_core modules have vigor or recovery > 0', () => {
      const powerCoreModules = ALL_MODULES.filter(m => m.id.includes('power_core'));

      for (const mod of powerCoreModules) {
        const vigor = getStatFromEffects(mod, 'vigor');
        const recovery = getStatFromEffects(mod, 'recovery');
        expect(vigor + recovery).toBeGreaterThan(0);
      }
    });

    it('mobility modules have haste or vigor > 0', () => {
      const mobilityModules = ALL_MODULES.filter(m => m.id.includes('mobility'));

      for (const mod of mobilityModules) {
        const haste = getStatFromEffects(mod, 'haste');
        const vigor = getStatFromEffects(mod, 'vigor');
        expect(haste + vigor).toBeGreaterThan(0);
      }
    });

    it('life_support modules have resilience or recovery > 0', () => {
      const lifeSupportModules = ALL_MODULES.filter(m => m.id.includes('life_support'));

      for (const mod of lifeSupportModules) {
        const resilience = getStatFromEffects(mod, 'resilience');
        const recovery = getStatFromEffects(mod, 'recovery');
        expect(resilience + recovery).toBeGreaterThan(0);
      }
    });
  });
});
