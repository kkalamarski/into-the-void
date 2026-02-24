---
phase: 87-item-integration-balance
plan: 01
subsystem: items
tags: [aquatic-equipment, item-definitions, tier-scaling]
dependency_graph:
  requires: [phases/082-083-aquatic-biomes, packages/items/utils.ts]
  provides: [aquatic-suits, aquatic-tools]
  affects: [loot-tables, crafting-recipes]
tech_stack:
  added: []
  patterns: [archetype-stats, gathering-bonuses, tier-multipliers]
key_files:
  created:
    - packages/items/src/definitions/aquatic-suits.ts
    - packages/items/src/definitions/aquatic-tools.ts
  modified: []
decisions: []
metrics:
  duration_seconds: 128
  tasks_completed: 2
  files_created: 2
  completed_date: 2026-02-24
---

# Phase 87 Plan 01: Aquatic Equipment Definitions Summary

Aquatic equipment definitions (3 suits + 3 tools) created for underwater exploration in Phases 82-83 aquatic biomes.

## Objective

Create aquatic equipment definitions (3 suits + 3 tools) for Phases 82-83 aquatic biomes, satisfying ITEM-01 (aquatic suits) and ITEM-02 (aquatic tools) requirements.

## What Was Built

### Aquatic Suits (packages/items/src/definitions/aquatic-suits.ts)

**1. SUIT_DIVING_RARE** (Tier I, rare, level 5)
- Archetype: balanced — entry-level Tidal Pools suit
- ilvl: 12 (computeIlvl(1, 'rare'))
- moduleSlots: 4
- Abilities: nano_repair, energy_barrier
- Description: Helix Extraction shallow water suit for basic underwater operations

**2. SUIT_PRESSURE_EPIC** (Tier II, epic, level 15)
- Archetype: tank — deep-water Kelp Forest suit
- ilvl: 30 (computeIlvl(2, 'epic'))
- moduleSlots: 4
- Abilities: nano_repair, magnetic_field, fortify_systems
- Description: Military-grade pressure suit for contested underwater territory

**3. SUIT_ABYSSAL_EXOTIC** (Tier III, exotic, level 25)
- Archetype: hazmat — extreme pressure Deep Trench suit
- ilvl: 54 (computeIlvl(3, 'exotic'))
- moduleSlots: 5
- Abilities: nano_repair, energy_barrier, regeneration_protocol, resource_scan
- Description: Experimental Helix prototype with PI material shielding for abyssal zones

**Export:** ALL_AQUATIC_SUITS array containing all 3 suits

### Aquatic Tools (packages/items/src/definitions/aquatic-tools.ts)

**Helper Function:** getAquaticToolStats() — follows exact pattern from tools.ts with gathering bonuses for mining/bio tools

**1. TOOL_HARPOON_RARE** (Tier I, rare, combat, level 5)
- toolType: combat
- range: 2
- Stats: power: 21 (15 * 1.4 * 1.0)
- Abilities: basic_strike, shield_bash, electrocute
- Description: Directed-energy harpoon for underwater combat

**2. TOOL_DIVING_PICK_EPIC** (Tier II, epic, mining, level 15)
- toolType: mining
- range: 3
- Stats: perception: 60, yieldBonus: 0.1, gatherSpeed: 0.1 (15 * 2.0 * 2.0)
- Abilities: mine, basic_strike, thermal_lance, plasma_burst
- Description: Pressure-adapted sonic resonance mining pick

**3. TOOL_NET_RARE** (Tier I, rare, bio, level 5)
- toolType: bio
- range: 2
- Stats: vigor: 21, yieldBonus: 0.0, gatherSpeed: 0.0 (15 * 1.4 * 1.0)
- Abilities: harvest, energy_pulse, analyze_specimen
- Description: Energy-mesh specimen collection net

**Export:** ALL_AQUATIC_TOOLS array containing all 3 tools

## Deviations from Plan

None — plan executed exactly as written.

## Success Criteria Met

- [x] packages/items/src/definitions/aquatic-suits.ts exists with 3 suits
- [x] packages/items/src/definitions/aquatic-tools.ts exists with 3 tools
- [x] All 6 items follow existing patterns (suits.ts, tools.ts)
- [x] TypeScript compilation succeeds
- [x] ITEM-01 (aquatic suits) and ITEM-02 (aquatic tools) requirements satisfied
- [x] Tier I items (diving suit, harpoon, net) have requiredLevel 5 — accessible without high-tier content
- [x] Tier II/III items have appropriate requiredLevel progression (15, 25)
- [x] Suit definitions use generateSuitStats() from utils.ts
- [x] Tool definitions use local getAquaticToolStats() following getToolStats() pattern

## Technical Implementation

**Pattern Adherence:**
- Suits use archetype system (balanced/tank/hazmat) from suits.ts
- Tools use stat formula: base(15) * rarity_mult * tier_mult from tools.ts
- Gathering bonuses (yieldBonus/gatherSpeed) follow Phase 85 pattern
- All imports from shared utils.ts (computeIlvl, generateSuitStats, STAT_RARITY_MULTIPLIERS, TIER_MULTIPLIERS)

**Tier Scaling:**
- Tier I (level 5): 2 items (diving suit, harpoon, net) — early access
- Tier II (level 15): 1 item (pressure suit) — mid-tier progression
- Tier III (level 25): 1 item (abyssal suit) — endgame aquatic zones

**Color Theming:**
- Suits: Blue gradient (0x2266aa → 0x1144aa → 0x003366) for water depth progression
- Tools: Aquatic blues/greens (0x2255aa, 0x1166aa, 0x33aa88)

## Integration Points

**Ready for:**
- Phase 87-02: Loot table integration (add aquatic items to creature/node drops)
- Phase 87-03: Crafting recipe integration (exotic material requirements)
- Export from packages/items/src/index.ts for game-server access

**Dependencies satisfied:**
- Phases 82-83: Aquatic biomes exist (Tidal Pools, Kelp Forests, Deep Trenches)
- packages/items/utils.ts: Stat generation helpers available
- packages/items/types.ts: Type definitions compatible

## Commits

- cdf4249: feat(87-01): create aquatic suit definitions
- 7573852: feat(87-01): create aquatic tool definitions

## Self-Check: PASSED

**Files created:**
- packages/items/src/definitions/aquatic-suits.ts ✓ EXISTS
- packages/items/src/definitions/aquatic-tools.ts ✓ EXISTS

**Commits verified:**
- cdf4249 ✓ FOUND
- 7573852 ✓ FOUND

**TypeScript compilation:**
- aquatic-suits.ts ✓ COMPILES
- aquatic-tools.ts ✓ COMPILES

**Exports verified:**
- ALL_AQUATIC_SUITS array ✓ PRESENT (3 items)
- ALL_AQUATIC_TOOLS array ✓ PRESENT (3 items)

**Pattern conformance:**
- Suit archetypes ✓ CORRECT (balanced/tank/hazmat)
- Tool stats ✓ CORRECT (combat/mining/bio with gathering bonuses)
- ilvl calculations ✓ CORRECT (computeIlvl usage)
- Required levels ✓ CORRECT (5, 15, 25 progression)
