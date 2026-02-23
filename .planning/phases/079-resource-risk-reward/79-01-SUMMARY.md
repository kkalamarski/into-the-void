---
phase: 79-resource-risk-reward
plan: 01
subsystem: entities
tags: [resource-nodes, rarity-system, yield-balancing]
dependency_graph:
  requires: []
  provides: [NodeRarity type, rare mineral variants, rare plant variants]
  affects: [spawn system, gathering rewards, zone difficulty progression]
tech_stack:
  added: [NodeRarity type]
  patterns: [variant definition pattern, yield multipliers, rarity-based respawn]
key_files:
  created: []
  modified:
    - packages/shared-types/src/core/entity.ts
    - packages/entities/src/types.ts
    - packages/entities/src/definitions/minerals.ts
    - packages/entities/src/definitions/plants.ts
    - packages/entities/src/definitions/index.ts
decisions:
  - title: "Three-tier rarity system (common/rare/epic)"
    rationale: "Provides clear progression without overwhelming complexity. Common is default (backward compatible), rare offers risk/reward balance, epic for endgame zones."
  - title: "Rare variants use 1.5x yield, epic uses 2x yield"
    rationale: "Balanced multipliers that make rare nodes worthwhile without trivializing gathering progression. 50% boost for rare, 100% for epic."
  - title: "Rare nodes require +1 tool tier and 2x respawn time"
    rationale: "Creates gear progression gate and prevents farming exploits via slower respawn. Higher yield balanced by accessibility constraints."
  - title: "Rare variants keep same biome as base node"
    rationale: "Spawn system can use biome-based logic. Players find rare variants in familiar locations, creating 'jackpot' discovery moments."
metrics:
  duration_seconds: 195
  tasks_completed: 2
  files_modified: 5
  lines_added: 193
  commits: 2
  completed_at: "2026-02-23T16:07:22Z"
---

# Phase 79 Plan 01: Resource Node Rarity System

**One-liner:** NodeRarity type with rare/epic mineral and plant variants featuring 1.5-2x yield multipliers for risk/reward progression.

## Summary

Added rarity tier support to resource node entities (minerals and plants) to enable the spawn system to differentiate between common and rare variants. Created 4 rare minerals, 1 epic mineral, and 3 rare plants with increased yield amounts, slower respawn times, and higher tool tier requirements.

**What was built:**

1. **NodeRarity Type System**
   - Exported `NodeRarity = 'common' | 'rare' | 'epic'` from shared-types
   - Added optional `rarity?: NodeRarity` field to Mineral and Plant entity interfaces
   - Added optional `rarity?: NodeRarity` field to MineralDefinition and PlantDefinition
   - Defaults to 'common' if undefined (backward compatible)

2. **Rare Mineral Variants (4)**
   - `MINERAL_VOID_CRYSTAL_RARE` (void_plains) - 2-4 yield vs 1-3, bonus void essence
   - `MINERAL_PRISMATIC_CRYSTAL_RARE` (crystal_caves) - 3-6 yield vs 2-4, increased crystalline dust
   - `MINERAL_VOLCANIC_ORE_RARE` (volcanic_ridge) - 3-6 yield vs 2-4, double bonus drops
   - `MINERAL_COSMIC_FRAGMENT_RARE` (starfall_crater) - 3-5 yield vs 2-3, quantum residue bonus

3. **Epic Mineral Variant (1)**
   - `MINERAL_ANOMALY_CRYSTAL_EPIC` (ancient_ruins) - 2-4 quantum residue (2x base), triple bonus drops, 1800s respawn

4. **Rare Plant Variants (3)**
   - `PLANT_LUMINOUS_VINE_RARE` (fungal_forest) - 2-4 yield vs 1-3, increased biogenic catalyst
   - `PLANT_LATTICE_MOSS_RARE` (crystal_caves) - 2-3 yield vs 1-2, increased crystalline dust
   - `PLANT_PHASE_BLOOM_RARE` (ancient_ruins) - guaranteed 2 quantum residue, increased void essence

**Key patterns:**
- **Rare variants:** 1.5x yield multiplier, 2x respawn time, +1 tool tier requirement
- **Epic variants:** 2x yield multiplier, 2x respawn time, already max tier (4)
- **Bonus drops:** Rare nodes have increased chance and quantity of reagent bonuses
- **Naming convention:** `{BASE}_RARE` or `{BASE}_EPIC` suffix pattern
- **Same biomes:** Variants spawn in same biomes as base nodes (spawn system differentiation)

## Verification Results

✅ **TypeScript Compilation**
- `npx nx run shared-types:build` - Success
- `npx nx run entities:build` - Success

✅ **Type Exports**
- NodeRarity type defined in shared-types/core/entity.ts
- NodeRarity imported and used in entities/types.ts
- Rarity fields present on Mineral and Plant interfaces
- Rarity fields present on MineralDefinition and PlantDefinition

✅ **Rare Definitions**
- 4 rare mineral definitions with 1.5x yields
- 1 epic mineral definition with 2x yields
- 3 rare plant definitions with increased yields
- All rare/epic variants have `rarity` field set
- All new IDs exported in ENTITY_IDS constant

✅ **Success Criteria Met**
- [x] NodeRarity type ('common' | 'rare' | 'epic') exists in shared-types
- [x] Mineral and Plant entity interfaces have optional rarity field
- [x] MineralDefinition and PlantDefinition have optional rarity field
- [x] 5+ rare/epic mineral definitions exist with higher yields (5 total: 4 rare + 1 epic)
- [x] 2+ rare plant definitions exist with higher yields (3 total)
- [x] All packages build without TypeScript errors

## Deviations from Plan

None - plan executed exactly as written. All specifications met or exceeded (3 rare plants vs 2+ required).

## Implementation Notes

**Yield Multiplier Calculations:**
- Rare minerals: 1.5x applied to both minAmount and maxAmount
- Epic minerals: 2x applied to both minAmount and maxAmount
- Bonus drops: Increased chance by 0.1-0.3 and added extra bonus items for rare/epic tiers

**Tool Tier Progression:**
- Base tier 1 → Rare tier 2 (e.g., void crystal)
- Base tier 3 → Rare tier 4 (e.g., prismatic crystal, volcanic ore)
- Base tier 4 → Rare tier 4 (already max, e.g., cosmic fragment, anomaly crystal)

**Respawn Balancing:**
- Common: 240-900s depending on biome danger
- Rare: 2x common (480-1800s)
- Epic: 1800s (30 minutes for ancient ruins high-tier)

**Color Coding:**
- Rare variants use brighter/deeper versions of base color
- Example: void crystal 0x4a4a6a → rare 0x6a4a8a (deeper purple)
- Visual distinction for player recognition before interaction

## Integration Points

**Ready for Phase 79 Plans 02-04:**
- Plan 02: Spawn system can read `rarity` field to apply spawn rate modifiers
- Plan 03: Danger zones can use rare variants for high-risk/high-reward gameplay
- Plan 04: Zone mastery can track rare node discoveries as bonus objectives

**Backward Compatibility:**
- Existing entities without `rarity` field default to 'common' (implicit)
- No migration needed for existing spawned entities
- New variants are additive, not replacing base definitions

## Next Steps

1. **Phase 79 Plan 02:** Implement spawn system logic to apply rarity-based spawn rates (common 80%, rare 18%, epic 2%)
2. **Phase 79 Plan 03:** Configure high-danger zones to prefer rare variants in spawn tables
3. **Phase 79 Plan 04:** Add rarity tracking to zone mastery system for discovery achievements

## Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add NodeRarity type and extend entity interfaces | 3f7f50a | shared-types/core/entity.ts, entities/types.ts |
| 2 | Define rare and epic mineral/plant variants | bff765b | entities/definitions/{minerals,plants,index}.ts |

---

**Execution time:** 195 seconds (3m 15s)
**Tasks completed:** 2/2
**Build status:** ✅ All packages compile without errors

## Self-Check: PASSED

✅ All modified files exist on disk
✅ All commits exist in git history (3f7f50a, bff765b)
✅ TypeScript compilation succeeds for both packages
✅ Rare definitions verified via grep pattern matching
