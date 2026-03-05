# Plan 120-01 Summary: Hazard Type System + Pure Game-Logic Functions

**Status:** Complete
**Duration:** ~8 minutes
**Commits:** a361382

## What Was Built

Created the foundational hazard type system spanning shared-types and game-logic. Defined 5 hazard groups (Chemical, Thermal, Physical, Biological, Anomalous) with strategic stat debuffs, 3 severity tiers (Tier II debuff-only, Tier III HP drain + debuff, Tier IV stacking escalation), and biome-to-hazard mapping for all 12 hazardous biomes. Implemented 7 pure calculation functions for damage, debuffs, grace periods, tick timing, and Tier IV stack escalation. All 39 unit tests pass.

## Key Files

### Created
- `packages/shared-types/src/game/hazard.ts` -- HazardType, HazardGroup, HazardConfig, HazardState interfaces; HAZARD_GROUPS, BIOME_HAZARD_MAP, HAZARD_GROUP_COLORS, HAZARD_DEBUFF_STATS constants
- `packages/game-logic/src/hazard/hazard.ts` -- 7 pure functions: getHazardForBiome, isHazardousBiome, shouldApplyHazardTick, calculateHazardDamage, calculateHazardDebuff, calculateEffectiveHazard, shouldIncreaseStack
- `packages/game-logic/src/hazard/hazard.test.ts` -- 39 unit tests covering all hazard calculation scenarios

### Modified
- `packages/shared-types/src/index.ts` -- Added hazard module export
- `packages/game-logic/src/index.ts` -- Added hazard module export

## Decisions Made
- Chemical debuffs perception (toxic fumes impair sensors), Thermal debuffs haste (extreme temperature slows reaction), Physical debuffs toughness (shards bypass armor), Biological debuffs recovery (spores suppress regen), Anomalous debuffs all stats
- Tier II biomes: 0% HP drain, debuff only. Tier III: 8% max HP per tick. Tier IV: 8% + stacking debuffs every 30s
- All tiers share 3-second grace period and 3-second tick interval
- Damage uses Math.ceil for both raw and effective (always rounds up, minimum 1 damage when not immune)
- 100%+ protection = full immunity (returns 0 damage and stat 'none')

## Self-Check: PASSED
- [x] HazardType union covers all 5 groups
- [x] BIOME_HAZARD_MAP covers all 12 hazardous biomes (5 Tier II + 6 Tier III + 1 Tier IV)
- [x] Tier I biomes return null from getHazardForBiome
- [x] 8% HP drain per tick for Tier III (HAZD-02)
- [x] 100% protection = zero damage (HAZD-05)
- [x] 3-second grace period (HAZD-10)
- [x] Tier IV stacking escalation (HAZD-04)
- [x] 39 unit tests passing
- [x] shared-types and game-logic compile clean

---
*Plan: 120-01 | Phase: 120-biome-hazard-system*
