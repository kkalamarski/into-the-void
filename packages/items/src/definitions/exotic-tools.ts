import type { ItemDefinition, ItemRarity, ToolType } from '../types';
import { computeIlvl, STAT_RARITY_MULTIPLIERS, TIER_MULTIPLIERS } from '../utils';

/**
 * Exotic Tool Definitions (Phase 87)
 *
 * Purpose: Specialized equipment for exotic biome operations (Phases 84-86).
 * - Phase Extractor: Void-tech mining device for spatial compression extraction
 * - Void Pick: Advanced mining tool incorporating dimensional instability
 * - Reality Anchor: Anomaly stabilization device for navigating reality distortions
 *
 * New toolType: 'anomaly' for reality distortion resistance.
 */

/**
 * Generate stat bonuses for exotic tools based on toolType, rarity, and tier
 * Follows the same pattern as getToolStats in tools.ts
 */
function getExoticToolStats(toolType: ToolType, rarity: ItemRarity, tier: 1 | 2 | 3 | 4 | 5) {
  const base = 15;
  const rarityMult = STAT_RARITY_MULTIPLIERS[rarity];
  const tierMult = TIER_MULTIPLIERS[tier];
  const value = Math.round(base * rarityMult * tierMult);

  // Gathering stat bonuses (Phase 85)
  const gatheringStats: { yieldBonus?: number; gatherSpeed?: number } = {};
  if (toolType === 'mining' || toolType === 'bio') {
    switch (tier) {
      case 3:
        gatheringStats.yieldBonus = 0.2;
        gatheringStats.gatherSpeed = 0.2;
        break;
      case 4:
        gatheringStats.yieldBonus = 0.3;
        gatheringStats.gatherSpeed = 0.3;
        break;
    }
  }

  switch (toolType) {
    case 'anomaly':
      return { type: 'stats' as const, resilience: value };
    case 'mining':
      return { type: 'stats' as const, perception: value, ...gatheringStats };
    case 'research':
      return { type: 'stats' as const, perception: value };
    default:
      return { type: 'stats' as const, power: value };
  }
}

// ============================================================
// EXOTIC TOOLS (3) — anomaly zone specialization
// ============================================================

export const TOOL_PHASE_EXTRACTOR_EXOTIC: ItemDefinition = {
  id: 'tool_phase_extractor_exotic',
  displayName: 'Phase Extractor',
  description:
    'Void-tech extraction device using spatial compression. "How it works is proprietary. That it works is undeniable."',
  category: 'tool',
  rarity: 'exotic',
  maxStack: 1,
  weight: 2.8,
  baseValue: 25000,
  requiredLevel: 25,
  ilvl: computeIlvl(3, 'exotic'),
  textureKey: 'item_tool_phase_extractor',
  color: 0x7700ff,
  equipSlot: 'tool',
  toolType: 'mining',
  effects: [
    { trigger: 'on_equip', effect: getExoticToolStats('mining', 'exotic', 3) },
  ],
  range: 4,
  grantedAbilities: ['mine', 'basic_strike', 'thermal_lance', 'plasma_burst', 'void_drain'],
};

export const TOOL_VOID_PICK_EXOTIC: ItemDefinition = {
  id: 'tool_void_pick_exotic',
  displayName: 'Void Pick',
  description:
    'Advanced mining tool incorporating dimensional instability. Extracts materials from Void Rift formations.',
  category: 'tool',
  rarity: 'exotic',
  maxStack: 1,
  weight: 3.0,
  baseValue: 30000,
  requiredLevel: 30,
  ilvl: computeIlvl(4, 'exotic'),
  textureKey: 'item_tool_void_pick',
  color: 0x5500ff,
  equipSlot: 'tool',
  toolType: 'mining',
  effects: [
    { trigger: 'on_equip', effect: getExoticToolStats('mining', 'exotic', 4) },
  ],
  range: 4,
  grantedAbilities: ['mine', 'basic_strike', 'plasma_burst', 'void_drain', 'dimensional_shift'],
};

export const TOOL_REALITY_ANCHOR_EXOTIC: ItemDefinition = {
  id: 'tool_reality_anchor_exotic',
  displayName: 'Reality Anchor',
  description:
    'Nexus device for navigating reality distortions. "Essential for prolonged Void Rift operations. Side effects are... being studied."',
  category: 'tool',
  rarity: 'exotic',
  maxStack: 1,
  weight: 2.5,
  baseValue: 28000,
  requiredLevel: 25,
  ilvl: computeIlvl(3, 'exotic'),
  textureKey: 'item_tool_reality_anchor',
  color: 0x8800ff,
  equipSlot: 'tool',
  toolType: 'anomaly',
  effects: [
    { trigger: 'on_equip', effect: getExoticToolStats('anomaly', 'exotic', 3) },
  ],
  range: 3,
  grantedAbilities: ['stabilize_anomaly', 'energy_barrier', 'analyze_specimen', 'resource_scan'],
};

// ============================================================
// ALL EXOTIC TOOLS
// ============================================================

export const ALL_EXOTIC_TOOLS: readonly ItemDefinition[] = [
  TOOL_PHASE_EXTRACTOR_EXOTIC,
  TOOL_VOID_PICK_EXOTIC,
  TOOL_REALITY_ANCHOR_EXOTIC,
];
