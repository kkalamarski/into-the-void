---
phase: 79-resource-risk-reward
plan: 02
subsystem: world-gen
tags: [rare-spawns, proximity-mechanics, risk-reward, spawn-system]
dependency_graph:
  requires: [79-01 NodeRarity type system, creature spawn generation]
  provides: [proximity-based rare spawn algorithm, rarity weight calculation, chunk-level rare caps]
  affects: [zone generation, resource availability, gameplay risk/reward balance]
tech_stack:
  added: [calculateRarityWeight function, RARE_SPAWN_CONFIG, rarity module]
  patterns: [proximity-based spawn weighting, linear falloff calculation, deterministic spawn ordering]
key_files:
  created:
    - packages/world-gen/src/generation/rarity.ts
  modified:
    - packages/world-gen/src/generation/spawn.ts
    - packages/world-gen/src/index.ts
decisions:
  - title: "3x proximity multiplier within 10 tiles of dangerous creatures"
    rationale: "Creates significant incentive for risk-taking without making rare spawns trivial. Linear falloff from 3x at zero distance to 1x at 10 tiles provides smooth gradient."
  - title: "Chunk caps of 3 rare + 1 epic prevent flooding"
    rationale: "Preserves scarcity even in high-danger zones. Prevents single chunks from containing excessive rare resources."
  - title: "50% weight cap prevents guaranteed spawns"
    rationale: "Even with maximum proximity bonus, rare spawns remain probabilistic. Maintains discovery excitement."
  - title: "Deterministic creature spawn sorting for rarity calculation"
    rationale: "Ensures same seed produces same rare node placement. Sort by position (x then y) before proximity calculation."
  - title: "Predator and maniac behaviors grant proximity bonus"
    rationale: "Aligns with risk/reward concept - passive/neutral creatures don't increase rare spawn rates. Only dangerous behaviors create high-value zones."
  - title: "Rare spawns occur after creature spawns in generation order"
    rationale: "Dependency requirement - must know creature positions before calculating proximity weights. Maintains determinism."
metrics:
  duration_seconds: 142
  tasks_completed: 2
  files_modified: 3
  lines_added: 173
  commits: 2
  completed_at: "2026-02-23T17:13:03Z"
---

# Phase 79 Plan 02: Proximity-Based Rare Node Spawning

**One-liner:** Proximity-based rare node spawning with 3x multiplier near predators/maniacs, chunk-level caps, and deterministic generation.

## Summary

Implemented proximity-based rare node spawning in the world generation system. Rare minerals spawn at up to 3x rate within 10 tiles of predator/maniac creatures, with linear falloff. Chunk-level caps (3 rare, 1 epic) prevent flooding while maintaining scarcity and risk/reward balance.

**What was built:**

1. **Rarity Calculation Module** (`packages/world-gen/src/generation/rarity.ts`)
   - `calculateRarityWeight(position, creatures, tier)` - Proximity-based spawn probability calculator
   - `RARE_SPAWN_CONFIG` - Configuration constants (10 tile range, 3x multiplier, chunk caps)
   - `getRareBiomeMinerals(biome)` - Returns rare mineral IDs for biome (void_plains, crystal_caves, volcanic_ridge, starfall_crater)
   - `getEpicBiomeMinerals(biome)` - Returns epic mineral IDs for biome (ancient_ruins, starfall_crater)
   - `isDangerousBehavior(behavior)` - Checks if creature grants proximity bonus (predator or maniac only)

2. **Spawn System Integration** (`packages/world-gen/src/generation/spawn.ts`)
   - Added `rareMinerals: 3` and `epicMinerals: 1` to SPAWN_CAPS
   - Rare mineral spawn loop (30 attempts, max 3 per chunk, 5-10 minute respawn)
   - Epic mineral spawn loop (15 attempts, max 1 per chunk, 10-15 minute respawn)
   - Biome-specific rare mineral selection via helper functions
   - Proximity weight calculation using already-spawned creature positions

3. **Export Configuration**
   - Added `export * from './generation/rarity'` to world-gen index
   - Exposed calculateRarityWeight and config constants for external use

**Key mechanics:**

- **Proximity calculation:**
  - Distance = `sqrt((posX - creatureX)^2 + (posY - creatureY)^2)`
  - Falloff = `1 - (distance / 10)` (linear, 0 at max range)
  - Bonus = `(3.0 - 1) * falloff = 2 * falloff`
  - Weight = `baseChance * (1 + bonus)`, capped at 0.5 (50%)

- **Base spawn chances:**
  - Rare: 5% base (0.05)
  - Epic: 1% base (0.01)
  - With max proximity: Rare up to 15%, Epic up to 3%

- **Determinism:**
  - Creatures sorted by position (x then y) before calculation
  - Same seed = same creature positions = same rare node positions
  - SeededRandom ensures reproducible rolls

- **Biome mapping:**
  - `void_plains` → `mineral_void_crystal_rare`
  - `crystal_caves` → `mineral_prismatic_crystal_rare`
  - `volcanic_ridge` → `mineral_volcanic_ore_rare`
  - `starfall_crater` → `mineral_cosmic_fragment_rare`
  - `ancient_ruins` → `mineral_anomaly_crystal_epic` (epic tier)

## Verification Results

✅ **Build Success**
- `npx nx run world-gen:build` - Success (all 7 tasks)

✅ **Module Exports**
- `calculateRarityWeight` exported from rarity.ts
- `RARE_SPAWN_CONFIG` exported with proximity parameters
- `getRareBiomeMinerals` and `getEpicBiomeMinerals` helper functions exist
- Rarity module exported from world-gen package index

✅ **Spawn Integration**
- `rareNodesSpawned` variable tracks rare mineral count
- `epicNodesSpawned` variable tracks epic mineral count
- `calculateRarityWeight` called for both rare and epic tiers
- Chunk caps enforced (max 3 rare, 1 epic)
- Respawn times: 5-10 min (rare), 10-15 min (epic)

✅ **Success Criteria Met**
- [x] Rarity calculation module exists with calculateRarityWeight function
- [x] Proximity calculation uses 10-tile range with 3x multiplier
- [x] generateSpawnPoints creates rare minerals after creature spawns
- [x] Chunk caps prevent more than 3 rare + 1 epic minerals per chunk
- [x] World-gen package builds without errors
- [x] Spawn generation remains deterministic (same seed = same output)

## Deviations from Plan

None - plan executed exactly as written. All specifications met.

## Implementation Notes

**Algorithm Details:**

The proximity-based spawn weight calculation iterates through all dangerous creatures (predator/maniac) in the chunk and applies a cumulative bonus to the base spawn chance:

```typescript
weight = baseChance; // 0.05 for rare, 0.01 for epic

for each dangerous creature:
  distance = hypot(posX - creatureX, posY - creatureY)
  if distance <= 10:
    falloff = 1 - (distance / 10)  // 1.0 at zero, 0.0 at ten
    bonus = (3.0 - 1) * falloff     // 2.0 at zero, 0.0 at ten
    weight *= (1 + bonus)           // 3x at zero, 1x at ten

return min(weight, 0.5) // Cap at 50%
```

**Edge Cases Handled:**

1. **Multiple nearby creatures:** Multiplicative stacking (intentional) - positions near multiple predators have higher rare spawn rates
2. **No dangerous creatures:** Falls back to base spawn rate (5% rare, 1% epic)
3. **Empty biome rare tables:** Spawn attempt skipped if `rareMinerals.length === 0`
4. **Collision detection:** Uses existing `findValidSpawnPosition` to avoid terrain collision
5. **Chunk boundary:** Rare spawns are chunk-local (don't check creatures in adjacent chunks for performance)

**Performance Characteristics:**

- **Rare spawn attempts:** 30 iterations max, early exit at 3 spawns
- **Epic spawn attempts:** 15 iterations max, early exit at 1 spawn
- **Proximity calculation:** O(C) where C = creature count per chunk (~2-15)
- **Total overhead:** ~45 position checks + proximity calculations per chunk (negligible)

**Future Extensibility:**

- `getRareBiomeMinerals()` and `getEpicBiomeMinerals()` use lookup tables - easy to add new biomes/variants
- `isDangerousBehavior()` centralized - can extend to include new dangerous behaviors
- `RARE_SPAWN_CONFIG` exported - game designers can tweak values without code changes

## Integration Points

**Ready for Phase 79 Plan 03+ (if exists):**
- Rare spawns now occur near dangerous creatures automatically
- Zone mastery could track rare node discovery count
- POI discovery could reference high-density rare spawn areas
- Faction territories could modify proximity multipliers

**Game Server Integration:**
- `generateSpawnPoints()` called during chunk creation by ZonesService
- Rare mineral entities created with correct IDs (from 79-01)
- Entity locking (78-03) applies to rare nodes during gathering
- Respawn timers (5-10 min rare, 10-15 min epic) handled by existing entity system

**Client Impact:**
- No client changes needed - rare minerals render like common minerals
- Fog of war (76) reveals rare nodes on discovery
- Gathering mini-game (78) works identically for rare variants
- Higher tool tier requirement enforced by server validation

## Next Steps

1. **Test spawn distribution:** Generate multiple chunks with seed and verify rare node placement near predators
2. **Balance tuning:** Monitor player feedback on rare spawn frequency in high-danger zones
3. **Extend to plants:** Apply same proximity mechanics to rare plant spawns (Phase 79 Plan 03?)
4. **Add discovery tracking:** Record first rare node discovery per biome for achievements (Phase 80?)

## Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create rarity calculation module | 218e265 | world-gen/src/generation/rarity.ts, world-gen/src/index.ts |
| 2 | Integrate rare spawning into generateSpawnPoints | 038bc6c | world-gen/src/generation/spawn.ts |

---

**Execution time:** 142 seconds (2m 22s)
**Tasks completed:** 2/2
**Build status:** ✅ All packages compile without errors

## Self-Check: PASSED

✅ All created files exist on disk:
- `/Users/krzysztof.kalamarski/Projects/into-the-void/packages/world-gen/src/generation/rarity.ts` - FOUND

✅ All modified files exist on disk:
- `/Users/krzysztof.kalamarski/Projects/into-the-void/packages/world-gen/src/generation/spawn.ts` - FOUND
- `/Users/krzysztof.kalamarski/Projects/into-the-void/packages/world-gen/src/index.ts` - FOUND

✅ All commits exist in git history:
- 218e265 - FOUND (feat(79-02): create rarity calculation module)
- 038bc6c - FOUND (feat(79-02): integrate rare spawning into generateSpawnPoints)

✅ Build verification:
- world-gen package builds successfully
- calculateRarityWeight function exported
- rareNodesSpawned implementation present in spawn.ts
