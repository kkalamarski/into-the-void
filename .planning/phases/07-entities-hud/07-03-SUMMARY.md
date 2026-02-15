---
phase: 07-entities-hud
plan: 03
subsystem: hud, entity-system
tags: [ui, game-data, entity-config]
dependency_graph:
  requires:
    - Player interface (core/player.ts)
    - HUD component (apps/web/src/ui/hud/HUD.tsx)
    - Entity type system (core/entity.ts)
  provides:
    - Energy bar in HUD
    - Player energy tracking fields
    - EntityRegistry static data
    - CreatureConfig, MineralConfig, ItemConfig interfaces
  affects:
    - Future entity spawning systems
    - Future combat/harvesting systems
    - Future item systems
tech_stack:
  added:
    - EntityRegistry: Static game data configuration
  patterns:
    - Registry pattern for entity configurations
    - Optional chaining for backward compatibility (energy ?? 100)
    - Typed config interfaces with helper methods
key_files:
  created:
    - packages/shared-types/src/game/entity-registry.ts
  modified:
    - packages/shared-types/src/core/player.ts
    - apps/web/src/ui/hud/HUD.tsx
    - apps/web/src/ui/hud/HUD.css
    - packages/shared-types/src/index.ts
decisions:
  - "Use optional chaining (player.energy ?? 100) for backward compatibility with servers not yet providing energy"
  - "Energy bar uses cyan/blue gradient (#0088aa to #00bfff) for visual distinction from red health"
  - "Entity configs include biome associations for future procedural spawning"
  - "Creature configs include level ranges for scaling behavior"
  - "Helper methods (getCreature, getMineral, getItem) provide clean API for lookups"
metrics:
  duration: "3m 0s"
  tasks_completed: 5
  files_modified: 5
  commits: 5
  completed_at: "2026-02-15T20:42:57Z"
---

# Phase 07 Plan 03: Energy Bar & Entity Registry Summary

**One-liner:** Player energy tracking with HUD energy bar display, plus static entity registry defining 4 creatures, 4 minerals, and 4 items with typed configurations.

## What Was Built

### Player Energy System
- Added `energy` and `maxEnergy` fields to Player interface in shared-types
- Energy bar component in HUD between health and XP bars
- Cyan/blue gradient styling (#0088aa to #00bfff) for visual distinction
- Fallback values (100/100) for backward compatibility with servers not providing energy

### Entity Registry
- Created static EntityRegistry with typed configurations
- **Creatures (4):** void_crawler (passive), crystal_hound (neutral), acid_stalker (aggressive), ancient_guardian (defensive)
  - Each includes: baseHealth, levelRange, behavior, biomes, textureKey
- **Minerals (4):** void_stone, crystal_shard, volcanic_ore, ancient_fragment
  - Each includes: baseYield, requiredTier, biomes, textureKey
- **Items (4):** health_vial, energy_cell, void_essence, ancient_key
  - Each includes: maxStack, rarity, textureKey
- Helper methods for config lookups: getCreature(), getMineral(), getItem()

## Task Breakdown

| Task | Name | Commit | Files | Duration |
|------|------|--------|-------|----------|
| 1 | Add energy fields to Player interface | be6827d | player.ts | ~30s |
| 2 | Add energy bar to HUD component | 7eee341 | HUD.tsx | ~40s |
| 3 | Add energy bar styles to HUD CSS | 8aa2ff8 | HUD.css | ~30s |
| 4 | Create entity registry | 2d63c4f | entity-registry.ts | ~50s |
| 5 | Export entity registry | e64d195 | index.ts | ~30s |

**Total:** 5 tasks, 5 commits, 3m 0s

## Deviations from Plan

None - plan executed exactly as written. All tasks completed successfully with proper TypeScript compilation verification.

## Technical Implementation

### Energy Bar Architecture
```typescript
// Fallback pattern for optional energy fields
const energy = player.energy ?? 100;
const maxEnergy = player.maxEnergy ?? 100;
const energyPercent = (energy / maxEnergy) * 100;
```

This ensures HUD works even if backend hasn't been updated to provide energy values yet.

### Entity Registry Design
```typescript
// Typed registry with helper methods
export const EntityRegistry = {
  creatures: { ... } as Record<string, CreatureConfig>,
  minerals: { ... } as Record<string, MineralConfig>,
  items: { ... } as Record<string, ItemConfig>,

  getCreature(speciesId: string): CreatureConfig | undefined {
    return this.creatures[speciesId];
  },
  // ... similar for minerals and items
};
```

Registry pattern provides:
- Centralized game data configuration
- Type-safe config access
- Easy extension for new entities
- Clean API for future entity spawning systems

### Biome Associations
Each entity config includes biome arrays for future procedural spawning:
- void_crawler spawns in ['void_plains']
- crystal_shard spawns in ['crystal_caves']
- volcanic_ore spawns in ['volcanic_ridge']
- ancient_guardian spawns in ['ancient_ruins']

## Verification Results

✅ shared-types builds successfully
✅ web builds successfully
✅ Player interface includes energy/maxEnergy fields
✅ HUD renders energy bar with cyan/blue styling
✅ EntityRegistry exports all config types
✅ All 5 commits created and tracked

## Integration Points

### Frontend
- HUD displays energy bar alongside health and XP
- Energy bar visible in top-left stat panel
- Ready for server to provide energy values via Player updates

### Future Systems
- Combat system can reference CreatureConfig for damage calculations
- Harvesting system can check MineralConfig.requiredTier
- Inventory system can use ItemConfig.maxStack for stacking rules
- World generation can use biome associations for entity placement
- Creature AI can use CreatureConfig.behavior for decision-making

## Self-Check

Verifying created files exist:

```bash
# Check created files
[ -f "packages/shared-types/src/game/entity-registry.ts" ] && echo "FOUND"
```

FOUND: packages/shared-types/src/game/entity-registry.ts

Verifying commits exist:

```bash
# Check commits
git log --oneline | grep -E "be6827d|7eee341|8aa2ff8|2d63c4f|e64d195"
```

e64d195 feat(07-03): export entity registry from shared-types
2d63c4f feat(07-03): create entity registry with creature, mineral, and item configs
8aa2ff8 feat(07-03): add energy bar styles to HUD CSS
7eee341 feat(07-03): add energy bar to HUD component
be6827d feat(07-03): add energy and maxEnergy fields to Player interface

## Self-Check: PASSED

All files created, all commits verified, all builds successful.

## Next Steps

This plan completes the energy bar and entity registry foundation. Future plans can:
- Update game-server to provide energy values in player state
- Implement entity spawning system using EntityRegistry
- Create creature AI behaviors using CreatureConfig.behavior
- Build harvesting mechanics using MineralConfig.requiredTier
- Add item usage logic referencing ItemConfig
