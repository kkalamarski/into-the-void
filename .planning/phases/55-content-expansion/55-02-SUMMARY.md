---
phase: 55-content-expansion
plan: 02
subsystem: items
tags: [content, items, consumables, world-items, reagents]
dependency_graph:
  requires: []
  provides:
    - 15 new item definitions across 3 categories
    - antitoxin consumable category
    - expanded world-item variety
  affects:
    - packages/items/src/definitions/world-items.ts
    - packages/items/src/definitions/reagents.ts
    - packages/items/src/definitions/consumables.ts
    - packages/items/src/definitions/index.ts
tech_stack:
  added: []
  patterns:
    - ItemDefinition with computeIlvl pattern
    - stat_buff effects for antitoxins
key_files:
  created: []
  modified:
    - packages/items/src/definitions/world-items.ts
    - packages/items/src/definitions/reagents.ts
    - packages/items/src/definitions/consumables.ts
    - packages/items/src/definitions/index.ts
decisions: []
metrics:
  duration: 248s
  tasks_completed: 2
  files_modified: 4
  completed_at: 2026-02-20T11:02:20Z
---

# Phase 55 Plan 02: Item Definitions Expansion Summary

**One-liner:** Added 15 new lore-appropriate items spanning world-items (5), reagents (5), and antitoxins (5) with balanced rarity distribution for enhanced progression and crafting depth.

## What Was Built

Expanded the item system with 15 new definitions across three categories, filling gaps in the current item catalog and providing more variety for creature drops, crafting, and gameplay progression.

### World Items (5 new)
- **WORLD_COASTAL_SHELL** (common) - Shell fragments from marine-analog creatures for suit reinforcement
- **WORLD_LUMINOUS_EXTRACT** (rare) - Bioluminescent compound from Luminous Canopy for living architecture
- **WORLD_TEMPORAL_SHARD** (epic) - Out-of-phase crystalline fragment from Anomaly Zones
- **WORLD_SPORE_SACK** (rare) - Intact spore reproduction structure from Fungal Depths
- **WORLD_METEOR_FRAGMENT** (exotic) - Extra-Terminus material from Starfall Crater

### Reagents (5 new)
- **REAGENT_BIOLUMINESCENT_COMPOUND** (common) - Processed bioluminescent material for sensors
- **REAGENT_FROST_ESSENCE** (rare) - Cryogenic compound from Frozen Reaches organisms
- **REAGENT_PETRIFICATION_ENZYME** (epic) - Calcification agent from Petrified Expanse
- **REAGENT_ANOMALY_CATALYST** (exotic) - Reality distortion trigger for exotic equipment
- **REAGENT_ANCIENT_STABILIZER** (legendary) - Prior Inhabitant spacetime anchor component

### Consumables - Antitoxins (5 new)
New consumable category providing hazard_resistance stat buffs:
- **ANTITOXIN_COMMON** (common) - 30s, +20 hazard resistance
- **ANTITOXIN_RARE** (rare) - 60s, +35 hazard resistance
- **ANTITOXIN_EPIC** (epic) - 90s, +50 hazard resistance
- **ANTITOXIN_EXOTIC** (exotic) - 120s, +75 hazard resistance
- **ANTITOXIN_LEGENDARY** (legendary) - 180s, +100 hazard resistance

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical Functionality] Fixed missing EMERGENCY_REBOOT_KIT constants in ITEM_IDS**
- **Found during:** Task 2
- **Issue:** EMERGENCY_REBOOT_KIT_* items existed in consumables.ts but were not registered in ITEM_IDS constant object in index.ts, preventing type-safe access to these item IDs
- **Fix:** Added EMERGENCY_REBOOT_KIT section to ITEM_IDS with all 5 variants (common through legendary)
- **Files modified:** packages/items/src/definitions/index.ts
- **Commit:** 50b5090

This was critical functionality missing from the item registry - these items exist in the consumables array but could not be referenced safely without the ITEM_IDS constants.

## Implementation Details

### Task 1: World-items and Reagents
- Added 5 world-items following existing biome patterns (Coastal Shallows, Luminous Canopy, Anomaly Zones, Deep Fungal, Starfall Crater)
- Added 5 reagents spanning all rarities for crafting system depth
- Updated ALL_WORLD_ITEMS and ALL_REAGENTS arrays
- Added all 10 constants to ITEM_IDS

### Task 2: Antitoxins
- Created new antitoxin consumable category using stat_buff effect pattern
- Implemented hazard_resistance buff with scaling amount (20-100) and duration (30s-180s)
- Follows existing consumable pattern (health vials, energy cells, suit repair kits, stims)
- Updated ALL_CONSUMABLES array
- Added all 5 constants to ITEM_IDS
- Fixed missing EMERGENCY_REBOOT_KIT constants (deviation)

## Verification Results

All verification criteria passed:

1. **TypeScript compilation:** `pnpm exec tsc --noEmit -p packages/items/tsconfig.lib.json` - PASSED
2. **Item counts:**
   - ALL_WORLD_ITEMS: 20 items (15 original + 5 new) ✓
   - ALL_REAGENTS: 15 items (10 original + 5 new) ✓
   - ALL_CONSUMABLES: 30 items (25 original + 5 new) ✓
3. **ITEM_IDS:** Contains all 15 new constants + 5 emergency reboot kit constants ✓
4. **Rarity distribution:** 3 common, 4 rare, 3 epic, 3 exotic, 2 legendary (balanced) ✓
5. **Lore consistency:** All items reference established biomes, factions, and Terminus lore ✓
6. **Pattern compliance:** All items use computeIlvl(tier, rarity) and follow ItemDefinition structure ✓

## Next Steps

Future work to leverage these new items:
- Add new items to creature drop tables (Phase 55 Plan 03)
- Integrate antitoxins into hazard zone gameplay
- Create crafting recipes using new reagents
- Design quests around rare/exotic item acquisition
- Add texture assets for new items (currently using fallback textureKey references)

## Files Modified

| File | Changes |
|------|---------|
| packages/items/src/definitions/world-items.ts | +105 lines (5 new world-items + ALL_WORLD_ITEMS update) |
| packages/items/src/definitions/reagents.ts | +109 lines (5 new reagents + ALL_REAGENTS update) |
| packages/items/src/definitions/consumables.ts | +103 lines (5 new antitoxins + ALL_CONSUMABLES update) |
| packages/items/src/definitions/index.ts | +15 lines (20 new ITEM_IDS constants including emergency reboot kits) |

## Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 | 007545f | feat(55-02): add 5 new world-items and 5 new reagents |
| 2 | 50b5090 | feat(55-02): add 5 new antitoxin consumables and fix missing ITEM_IDS |

## Self-Check: PASSED

**Created files verification:**
- No new files created (only modified existing definition files) ✓

**Modified files verification:**
```bash
[ -f "packages/items/src/definitions/world-items.ts" ] && echo "FOUND" || echo "MISSING"
FOUND ✓

[ -f "packages/items/src/definitions/reagents.ts" ] && echo "FOUND" || echo "MISSING"
FOUND ✓

[ -f "packages/items/src/definitions/consumables.ts" ] && echo "FOUND" || echo "MISSING"
FOUND ✓

[ -f "packages/items/src/definitions/index.ts" ] && echo "FOUND" || echo "MISSING"
FOUND ✓
```

**Commits verification:**
```bash
git log --oneline --all | grep -q "007545f" && echo "FOUND: 007545f" || echo "MISSING: 007545f"
FOUND: 007545f ✓

git log --oneline --all | grep -q "50b5090" && echo "FOUND: 50b5090" || echo "MISSING: 50b5090"
FOUND: 50b5090 ✓
```

**Item definition verification:**
```bash
grep -c "WORLD_COASTAL_SHELL\|WORLD_LUMINOUS_EXTRACT\|WORLD_TEMPORAL_SHARD\|WORLD_SPORE_SACK\|WORLD_METEOR_FRAGMENT" packages/items/src/definitions/world-items.ts
5 ✓

grep -c "REAGENT_BIOLUMINESCENT_COMPOUND\|REAGENT_FROST_ESSENCE\|REAGENT_PETRIFICATION_ENZYME\|REAGENT_ANOMALY_CATALYST\|REAGENT_ANCIENT_STABILIZER" packages/items/src/definitions/reagents.ts
5 ✓

grep -c "ANTITOXIN_COMMON\|ANTITOXIN_RARE\|ANTITOXIN_EPIC\|ANTITOXIN_EXOTIC\|ANTITOXIN_LEGENDARY" packages/items/src/definitions/consumables.ts
5 ✓
```

All verification checks passed successfully.
