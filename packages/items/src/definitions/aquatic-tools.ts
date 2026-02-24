import type { ItemDefinition, ItemRarity, ToolType } from '../types';
import { computeIlvl, STAT_RARITY_MULTIPLIERS, TIER_MULTIPLIERS } from '../utils';

/**
 * Aquatic Tool Definitions (Phase 87)
 *
 * Specialized tools for underwater operations in aquatic biomes:
 * - Harpoon (combat tool for underwater threats)
 * - Diving Pick (mining tool for submerged mineral deposits)
 * - Net (bio tool for aquatic specimen collection)
 *
 * Follows stat generation pattern from tools.ts with gathering bonuses.
 */

/**
 * Generate stat bonuses for aquatic tools based on toolType, rarity, and tier
 */
function getAquaticToolStats(toolType: ToolType, rarity: ItemRarity, tier: 1 | 2 | 3 | 4 | 5): { type: 'stats'; [key: string]: number | string } {
  const base = 15;
  const rarityMult = STAT_RARITY_MULTIPLIERS[rarity];
  const tierMult = TIER_MULTIPLIERS[tier];
  const value = Math.round(base * rarityMult * tierMult);

  // Gathering stat bonuses (Phase 85 pattern)
  const gatheringStats: { yieldBonus?: number; gatherSpeed?: number } = {};
  if (toolType === 'mining' || toolType === 'bio') {
    switch (tier) {
      case 1:
        gatheringStats.yieldBonus = 0.0;
        gatheringStats.gatherSpeed = 0.0;
        break;
      case 2:
        gatheringStats.yieldBonus = 0.1;
        gatheringStats.gatherSpeed = 0.1;
        break;
      case 3:
        gatheringStats.yieldBonus = 0.2;
        gatheringStats.gatherSpeed = 0.2;
        break;
      case 4:
        gatheringStats.yieldBonus = 0.3;
        gatheringStats.gatherSpeed = 0.3;
        break;
      case 5:
        gatheringStats.yieldBonus = 0.5;
        gatheringStats.gatherSpeed = 0.4;
        break;
    }
  }

  switch (toolType) {
    case 'combat':
      return { type: 'stats', power: value };
    case 'mining':
      return { type: 'stats', perception: value, ...gatheringStats };
    case 'bio':
      return { type: 'stats', vigor: value, ...gatheringStats };
    default:
      return { type: 'stats', power: value };
  }
}

// ============================================================
// AQUATIC TOOLS (3)
// ============================================================

export const TOOL_HARPOON_RARE: ItemDefinition = {
  id: 'tool_harpoon_rare',
  displayName: 'Energy Harpoon',
  description:
    'A directed-energy harpoon designed for underwater combat. Effective against aggressive aquatic fauna in Tidal Pools and Kelp Forests.',
  category: 'tool',
  rarity: 'rare',
  maxStack: 1,
  weight: 2.5,
  baseValue: 1200,
  requiredLevel: 5,
  ilvl: computeIlvl(1, 'rare'),
  textureKey: 'item_tool_harpoon',
  color: 0x2255aa,
  equipSlot: 'tool',
  toolType: 'combat',
  effects: [
    { trigger: 'on_equip', effect: getAquaticToolStats('combat', 'rare', 1) },
  ],
  range: 2,
  grantedAbilities: ['basic_strike', 'shield_bash', 'electrocute'],
};

export const TOOL_DIVING_PICK_EPIC: ItemDefinition = {
  id: 'tool_diving_pick_epic',
  displayName: 'Diving Pick',
  description:
    'A pressure-adapted sonic resonance mining pick. Designed for extracting mineral deposits from submerged rock formations in deep-water environments.',
  category: 'tool',
  rarity: 'epic',
  maxStack: 1,
  weight: 4.2,
  baseValue: 5000,
  requiredLevel: 15,
  ilvl: computeIlvl(2, 'epic'),
  textureKey: 'item_tool_diving_pick',
  color: 0x1166aa,
  equipSlot: 'tool',
  toolType: 'mining',
  effects: [
    { trigger: 'on_equip', effect: getAquaticToolStats('mining', 'epic', 2) },
  ],
  range: 3,
  grantedAbilities: ['mine', 'basic_strike', 'thermal_lance', 'plasma_burst'],
};

export const TOOL_NET_RARE: ItemDefinition = {
  id: 'tool_net_rare',
  displayName: 'Specimen Net',
  description:
    'An energy-mesh collection net for aquatic specimen harvesting. Standard equipment for Verdant Dynamics marine biology teams studying Terminus ocean life.',
  category: 'tool',
  rarity: 'rare',
  maxStack: 1,
  weight: 1.8,
  baseValue: 1200,
  requiredLevel: 5,
  ilvl: computeIlvl(1, 'rare'),
  textureKey: 'item_tool_net',
  color: 0x33aa88,
  equipSlot: 'tool',
  toolType: 'bio',
  effects: [
    { trigger: 'on_equip', effect: getAquaticToolStats('bio', 'rare', 1) },
  ],
  range: 2,
  grantedAbilities: ['harvest', 'energy_pulse', 'analyze_specimen'],
};

// ============================================================
// ALL AQUATIC TOOLS
// ============================================================

export const ALL_AQUATIC_TOOLS: readonly ItemDefinition[] = [
  TOOL_HARPOON_RARE,
  TOOL_DIVING_PICK_EPIC,
  TOOL_NET_RARE,
];
