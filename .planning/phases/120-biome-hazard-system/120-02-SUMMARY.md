# Plan 120-02 Summary: Hazard Protection Gear + Consumables + Trader Stocking

**Status:** Complete
**Duration:** ~10 minutes
**Commits:** 5568f2b

## What Was Built

Extended the item effect system with `hazard_protection` effect type for per-type hazard protection. Created 10 hazard protection modules (5 hazard types x 2 tiers: rare at 40%, epic at 70%) and 5 hazard protection consumables (30% for 5 minutes each). Extended ComputedStats with per-type `hazardProtection` record. Stocked all faction traders and the neutral module vendor with hazard protection items.

## Key Files

### Created
- `packages/items/src/definitions/hazard-modules.ts` -- 10 modules: Chemical Filter, Thermal Regulator, Impact Shield, Bio-Seal, Anomaly Ward (each rare + epic)
- `packages/items/src/definitions/hazard-consumables.ts` -- 5 consumables: Chemical Neutralizer, Thermal Stabilizer, Impact Absorption Gel, Bio-Inoculant, Reality Anchor

### Modified
- `packages/items/src/types.ts` -- Added `hazard_protection` to ItemEffect discriminated union
- `packages/game-logic/src/inventory/effects.ts` -- Added `hazard_protection` case to resolveEffect() using namespaced key pattern `hazardProtection_{type}`
- `packages/game-logic/src/inventory/stats.ts` -- Added `hazardProtection: Record<string, number>` to ComputedStats, detects `hazardProtection_` prefix in default case
- `packages/shared-types/src/game/inventory.ts` -- Mirrored `hazardProtection` field in shared ComputedStats
- `packages/items/src/definitions/index.ts` -- Registered hazard modules and consumables in ALL_ITEMS and ITEM_IDS
- `packages/npcs/src/definitions/verdant.ts` -- Stocked Chemical + Biological modules and consumables
- `packages/npcs/src/definitions/helix.ts` -- Stocked Thermal + Physical modules and consumables
- `packages/npcs/src/definitions/nexus.ts` -- Stocked Anomalous + Chemical modules and consumables
- `packages/npcs/src/definitions/neutral.ts` -- Stocked Thermal + Biological in general trader, ALL 10 hazard modules in module vendor

## Decisions Made
- Used inline literal union for hazardType in ItemEffect (`'chemical' | 'thermal' | ...`) to avoid circular dependency with shared-types HazardType
- Consumables use `stat_buff` with `hazardProtection_{type}` key and duration for buff system compatibility, rather than `hazard_protection` effect (which is for permanent equipment only)
- Faction-aligned trader stocking is cosmetic preference only -- all types available via neutral module vendor
- Protection values: rare module = 40%, epic module = 70%, consumable = 30% (additive: module + consumable = 70% or 100%)
- Kept existing `hazardResistance` field for backward compatibility with old `life_support` effects

## Self-Check: PASSED
- [x] hazard_protection in ItemEffect union with hazardType and protectionPercent
- [x] 10 hazard modules (5 types x rare + epic)
- [x] 5 hazard consumables (30% for 300s each)
- [x] ComputedStats.hazardProtection accumulates per-type from equipment
- [x] All 4 faction traders stocked with hazard items (HAZD-06)
- [x] Neutral module vendor stocks all 10 hazard modules
- [x] 112 tests passing
- [x] All packages compile clean

---
*Plan: 120-02 | Phase: 120-biome-hazard-system*
