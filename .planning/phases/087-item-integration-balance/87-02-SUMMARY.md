---
phase: 87-item-integration-balance
plan: 02
subsystem: items
tags: [exotic-equipment, anomaly-zones, horizontal-progression, tier-scaling]
dependency_graph:
  requires: [packages/items/src/utils.ts, packages/items/src/types.ts]
  provides: [exotic-suits.ts, exotic-tools.ts]
  affects: []
tech_stack:
  added: []
  patterns: [archetype-based-stats, tool-stat-helpers, gathering-stats]
key_files:
  created:
    - packages/items/src/definitions/exotic-suits.ts
    - packages/items/src/definitions/exotic-tools.ts
  modified: []
decisions:
  - "Scout/recon/balanced archetypes for exotic suits create horizontal progression"
  - "Anomaly toolType added for reality distortion resistance (Reality Anchor)"
  - "Local getExoticToolStats helper mirrors tools.ts pattern for consistency"
  - "Purple color gradient (0x5500aa -> 0x8800ff) for void theme consistency"
metrics:
  duration: 111s
  tasks_completed: 2
  files_created: 2
  commits: 2
completed_date: 2026-02-24
---

# Phase 87 Plan 02: Exotic Equipment Definitions Summary

**One-liner:** Created 6 exotic equipment definitions (3 suits + 3 tools) with anomaly-resistant stats and horizontal progression via archetype diversity.

## What Was Built

### Exotic Suits (3 definitions)

**1. SUIT_VOID_TOUCHED_EXOTIC** (Tier III, exotic, Level 25)
- **Archetype:** Scout (haste/perception/vigor focus)
- **Module slots:** 5
- **Abilities:** nano_repair, magnetic_field, fortify_systems, overclock
- **Design:** Mobility-focused void exploration suit
- **Stats:** generateSuitStats('scout', 'exotic', 3) = ~753 total budget
- **Purpose:** Trades durability for mobility (horizontal sidegrade)

**2. SUIT_ANOMALY_EXOTIC** (Tier IV, exotic, Level 30)
- **Archetype:** Recon (perception/haste/vigor focus)
- **Module slots:** 5
- **Abilities:** nano_repair, energy_barrier, regeneration_protocol, power_surge
- **Design:** Perception-focused anomaly resistance
- **Stats:** generateSuitStats('recon', 'exotic', 4) = ~1187 total budget
- **Purpose:** Detection and awareness in Crystalline Wastes

**3. SUIT_NULL_LEGENDARY** (Tier IV, legendary, Level 40)
- **Archetype:** Balanced (even stat distribution)
- **Module slots:** 6
- **Abilities:** nano_repair, regeneration_protocol, energy_barrier, overclock, void_drain
- **Design:** Ultimate void survivability
- **Stats:** generateSuitStats('balanced', 'legendary', 4) = ~1694 total budget
- **Purpose:** Peak survivability for Null Pocket operations

### Exotic Tools (3 definitions)

**1. TOOL_PHASE_EXTRACTOR_EXOTIC** (Tier III, exotic, Level 25, mining)
- **ToolType:** mining (perception + yieldBonus 0.2 + gatherSpeed 0.2)
- **Range:** 4 tiles
- **Abilities:** mine, basic_strike, thermal_lance, plasma_burst, void_drain
- **Stats:** perception 147 (base 15 × 2.8 exotic × 3.5 tier3)
- **Purpose:** Void-tech extraction using spatial compression

**2. TOOL_VOID_PICK_EXOTIC** (Tier IV, exotic, Level 30, mining)
- **ToolType:** mining (perception + yieldBonus 0.3 + gatherSpeed 0.3)
- **Range:** 4 tiles
- **Abilities:** mine, basic_strike, plasma_burst, void_drain, dimensional_shift
- **Stats:** perception 231 (base 15 × 2.8 exotic × 5.5 tier4)
- **Purpose:** Advanced mining for Void Rift formations

**3. TOOL_REALITY_ANCHOR_EXOTIC** (Tier III, exotic, Level 25, anomaly)
- **ToolType:** anomaly (resilience focus for reality distortion resistance)
- **Range:** 3 tiles
- **Abilities:** stabilize_anomaly, energy_barrier, analyze_specimen, resource_scan
- **Stats:** resilience 147 (base 15 × 2.8 exotic × 3.5 tier3)
- **Purpose:** Anomaly stabilization for prolonged Void Rift operations

## Technical Implementation

### Pattern Adherence

**Suits Pattern** (from suits.ts):
```typescript
import type { ItemDefinition } from '../types';
import { computeIlvl, generateSuitStats } from '../utils';

export const SUIT_VOID_TOUCHED_EXOTIC: ItemDefinition = {
  // ... standard fields
  effects: [
    { trigger: 'on_equip', effect: { type: 'stats', ...generateSuitStats('scout', 'exotic', 3) } },
  ],
};
```

**Tools Pattern** (from tools.ts):
```typescript
// Local helper function for stat calculation
function getExoticToolStats(toolType: ToolType, rarity: ItemRarity, tier: 1 | 2 | 3 | 4 | 5) {
  const base = 15;
  const rarityMult = STAT_RARITY_MULTIPLIERS[rarity];
  const tierMult = TIER_MULTIPLIERS[tier];
  const value = Math.round(base * rarityMult * tierMult);

  // Gathering stats for mining tools (Phase 85)
  const gatheringStats: { yieldBonus?: number; gatherSpeed?: number } = {};
  if (toolType === 'mining') {
    switch (tier) {
      case 3: gatheringStats.yieldBonus = 0.2; gatheringStats.gatherSpeed = 0.2; break;
      case 4: gatheringStats.yieldBonus = 0.3; gatheringStats.gatherSpeed = 0.3; break;
    }
  }

  switch (toolType) {
    case 'anomaly': return { type: 'stats', resilience: value };
    case 'mining': return { type: 'stats', perception: value, ...gatheringStats };
    // ...
  }
}
```

### Horizontal Progression (PROG-03 Compliance)

**Archetype Diversity Creates Sidegrades:**

| Suit | Archetype | Strength | Trade-off |
|------|-----------|----------|-----------|
| Void-Touched | Scout | Mobility (haste 30%) | Lower durability (10%) |
| Anomaly | Recon | Perception (35%) | Lower resilience |
| Null | Balanced | Even distribution | No specialization |

**Comparison to Existing Exotic Suits:**
- Nexus Combat Frame (combat archetype): power/haste/toughness focus
- Helix Research Frame (recon archetype): perception/haste/vigor focus
- Terminus Adaptation (balanced archetype): even distribution

**Result:** Void-Touched (scout) trades durability for mobility compared to Combat Frame (combat). This is a sidegrade for different playstyles, not a pure upgrade.

### New ToolType: Anomaly

**Added to ToolType Union:**
```typescript
export type ToolType = 'universal' | 'mining' | 'combat' | 'research' | 'bio' | 'demolition' | 'stealth' | 'anomaly';
```

**Purpose:** Reality distortion resistance (resilience stat) for navigating anomaly zones.

**Precedent:** Follows existing pattern (stealth provides perception+haste, anomaly provides resilience).

## Deviations from Plan

None - plan executed exactly as written.

## Requirements Satisfied

**ITEM-04 (Exotic Suits):** ✅
- 3 exotic suit definitions created
- Anomaly-resistant stats via archetype selection
- Required levels 25/30/40 (progression gating)

**ITEM-05 (Exotic Tools):** ✅
- 3 exotic tool definitions created
- Anomaly toolType for reality distortion resistance
- Required levels 25/30/25 (progression gating)

**PROG-03 (Horizontal Progression):** ✅
- Different archetypes (scout/recon/balanced) create sidegrades
- Void-Touched trades durability for mobility vs. existing tank archetypes
- No pure stat upgrades between same-tier equipment

## Testing Performed

**TypeScript Compilation:**
```bash
npx tsc --noEmit packages/items/src/definitions/exotic-suits.ts
npx tsc --noEmit packages/items/src/definitions/exotic-tools.ts
# Both files compile without errors
```

**Export Verification:**
```bash
grep "export const ALL_EXOTIC" exotic-suits.ts exotic-tools.ts
# exotic-suits.ts:89:export const ALL_EXOTIC_SUITS: readonly ItemDefinition[] = [
# exotic-tools.ts:129:export const ALL_EXOTIC_TOOLS: readonly ItemDefinition[] = [
```

**Archetype Verification:**
```bash
grep "generateSuitStats" exotic-suits.ts
# 'scout', 'recon', 'balanced' archetypes confirmed
```

**ToolType Verification:**
```bash
grep "toolType:" exotic-tools.ts
# 'mining' (2x), 'anomaly' (1x) confirmed
```

## Integration Points

**Consumed By:**
- Future plan: Index file update (packages/items/src/definitions/index.ts)
- Future plan: Loot table integration for exotic biomes
- Future plan: Crafting recipes requiring exotic materials

**Dependencies:**
- packages/items/src/utils.ts (computeIlvl, generateSuitStats, STAT_RARITY_MULTIPLIERS, TIER_MULTIPLIERS)
- packages/items/src/types.ts (ItemDefinition, ItemRarity, ToolType)

## Commits

| Commit | Task | Files |
|--------|------|-------|
| 7ad1f30 | Task 1: Exotic suits | exotic-suits.ts |
| f3e52ca | Task 2: Exotic tools | exotic-tools.ts |

## Self-Check: PASSED

**Created Files Verification:**
```bash
[ -f "packages/items/src/definitions/exotic-suits.ts" ] && echo "FOUND: exotic-suits.ts"
# FOUND: exotic-suits.ts

[ -f "packages/items/src/definitions/exotic-tools.ts" ] && echo "FOUND: exotic-tools.ts"
# FOUND: exotic-tools.ts
```

**Commits Verification:**
```bash
git log --oneline --all | grep -E "(7ad1f30|f3e52ca)"
# 7ad1f30 feat(87-02): add exotic suit definitions for anomaly zones
# f3e52ca feat(87-02): add exotic tool definitions for anomaly zones
```

All files exist, all commits present, all exports verified. Self-check passed.

## Notes

**Color Scheme:** Purple gradient (0x5500aa → 0x6600cc → 0x220044 for suits, 0x7700ff → 0x5500ff → 0x8800ff for tools) creates visual void theme consistency.

**Ability Sets:** Carefully selected to match lore descriptions:
- Void-Touched: "moves before the wearer commands" → overclock (speed boost)
- Anomaly: "Ancient stabilization" → energy_barrier + regeneration_protocol
- Null: "impossibly advanced" → void_drain (ultimate ability)

**Level Gating:** requiredLevel 25+ ensures players progress through Tier I-II content first (horizontal, not vertical progression).

**Module Slots:** 5 for exotic, 6 for legendary matches existing pattern from suits.ts.
