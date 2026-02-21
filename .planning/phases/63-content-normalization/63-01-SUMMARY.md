---
phase: 63-content-normalization
plan: 01
subsystem: items
tags: [equipment, stats, content-normalization, archetype-system]
dependency_graph:
  requires: [phase-62-calculation-parity]
  provides: [archetype-based-suit-stats, rarity-scaling-system]
  affects: [suit-definitions, stat-generation]
tech_stack:
  added: [generateSuitStats, ARCHETYPE_PROFILES, STAT_RARITY_MULTIPLIERS, TIER_MULTIPLIERS]
  patterns: [archetype-classification, procedural-stat-generation]
key_files:
  created: []
  modified:
    - packages/items/src/utils.ts
    - packages/items/src/definitions/suits.ts
decisions:
  - Archetype-based stat generation using percentage distribution
  - 7 archetypes: tank, scout, combat, balanced, hazmat, assault, recon
  - Rarity multipliers separate from ilvl multipliers (1.0x-4.0x)
  - Tier multipliers for level ranges (1.0x-8.0x)
  - Base budget of 77 stats for tier 1 common suits
metrics:
  duration_seconds: 379
  tasks_completed: 3
  files_modified: 2
  commits: 2
  completed_date: 2026-02-21
---

# Phase 63 Plan 01: Suit Stats Normalization Summary

**One-liner:** Normalized all 22 suit definitions with archetype-based stat profiles (tank/scout/combat/balanced/hazmat/assault/recon) and predictable rarity scaling (1.0x-4.0x).

## What Was Built

Implemented a content normalization system for suit equipment that ensures:
- **Distinct build identities**: 7 archetypes with unique stat distributions
- **Predictable progression**: Clear rarity scaling (common 1.0x → legendary 4.0x)
- **Complete coverage**: All 22 suits now have stats effects (no gaps)
- **Tier-based scaling**: Stats scale with level tiers (1.0x tier 1 → 8.0x tier 5)

## Implementation Details

### Task 1: Stat Generation Helpers (Commit: 8f6d9b0)

**Added to `packages/items/src/utils.ts`:**

1. **ARCHETYPE_PROFILES** - Stat distribution percentages for each archetype:
   - `tank`: Durability 35%, toughness 30%, resilience 15%, recovery 10%, vigor 10%
   - `scout`: Haste 30%, perception 25%, vigor 25%, recovery 10%, durability 10%
   - `combat`: Power 30%, haste 20%, toughness 20%, durability 15%, vigor 15%
   - `balanced`: Even 8-stat distribution
   - `hazmat`: Resilience 30%, recovery 25%, durability 25%, vigor 20%
   - `assault`: Power 35%, durability 25%, haste 25%, toughness 15%
   - `recon`: Perception 35%, haste 30%, vigor 25%, recovery 10%

2. **STAT_RARITY_MULTIPLIERS** - Budget multipliers by rarity:
   - Common: 1.0x, Rare: 1.4x, Epic: 2.0x, Exotic: 2.8x, Legendary: 4.0x

3. **TIER_MULTIPLIERS** - Budget multipliers by level tier:
   - Tier 1 (L1-10): 1.0x, Tier 2 (L11-20): 2.0x, Tier 3 (L21-30): 3.5x
   - Tier 4 (L31-40): 5.5x, Tier 5 (L41-50): 8.0x

4. **generateSuitStats()** - Procedural stat generator:
   ```typescript
   generateSuitStats(archetype, rarity, tier, baseBudget = 77)
   ```
   - Multiplies base budget by rarity and tier multipliers
   - Distributes total according to archetype percentages
   - Returns only non-zero stats

### Task 2: Suit Normalization (Commit: 751c748)

**Updated `packages/items/src/definitions/suits.ts`:**

Replaced all hardcoded stat values with `generateSuitStats()` calls:

**Common Suits (6):**
- suit_basic_common - balanced, tier 1
- suit_salvaged_common - balanced, tier 1
- suit_worker_common - balanced, tier 1 (L10 still tier 1)
- suit_industrial_common - tank, tier 2 (L20, heavy-duty)
- suit_veteran_common - balanced, tier 3 (L30)
- suit_hardened_common - tank, tier 4 (L40, pinnacle protection)

**Rare Suits (7):**
- suit_reinforced_rare - tank, tier 1 (heavy plating)
- suit_scout_rare - scout, tier 1 (mobility/stealth)
- suit_hazmat_rare - hazmat, tier 1 (toxic zones)
- suit_field_operative_rare - balanced, tier 2 (L15)
- suit_expedition_rare - tank, tier 3 (L25, extended ops)
- suit_elite_field_rare - combat, tier 4 (L35)
- suit_master_rare - combat, tier 5 (L45)

**Epic Suits (4):**
- suit_tactical_epic - combat, tier 2 (L15, military-grade)
- suit_environmental_epic - hazmat, tier 2 (L15, biome filtration)
- suit_assault_frame_epic - assault, tier 2 (L18, offensive)
- suit_stalker_recon_epic - recon, tier 2 (L20, reconnaissance)

**Exotic Suits (3):**
- suit_nexus_combat_frame_exotic - combat, tier 3 (L25, adaptive plating)
- suit_helix_research_frame_exotic - recon, tier 3 (L25, ruin exploration)
- suit_terminus_adaptation_exotic - balanced, tier 3 (L28, anomaly resistance)

**Legendary Suits (2):**
- suit_void_walker_legendary - scout, tier 4 (L35, temporal distortion resistance)
- suit_ancient_prototype_legendary - balanced, tier 4 (L40, Prior Inhabitant tech)

### Task 3: Verification

**Archetype Differentiation Verified:**
- Tank vs Scout (both tier 1 rare): Tank defense (durability+toughness) = 70, Scout = 11
- Tank provides 6.4x more defense than scout at same rarity/tier ✓

**Rarity Scaling Verified:**
- Common tier 1: 79 total stats
- Legendary tier 4: 1694 total stats (exactly 77 * 4.0 * 5.5)
- Ratio: 21.44x (accounts for both rarity 4.0x and tier 5.5x multipliers) ✓

**Coverage Verified:**
- 22/22 suits have stats effects (no empty effects arrays) ✓
- All suits use `generateSuitStats()` for consistency ✓

## Deviations from Plan

None - plan executed exactly as written.

## Testing & Verification

**Build Verification:**
```bash
npx tsc --noEmit -p packages/items/tsconfig.lib.json
# Passed: No TypeScript errors
```

**Content Verification:**
```bash
grep -c "effects: \[\]" packages/items/src/definitions/suits.ts
# Output: 0 (no empty effects arrays)

grep -c "type: 'stats'" packages/items/src/definitions/suits.ts
# Output: 22 (all suits have stats)
```

**Runtime Verification:**
- Tank archetype has 6.4x more defense than scout archetype (same rarity/tier)
- Legendary tier 4 provides exactly expected stats (1694 = 77 * 4.0 * 5.5)
- All stat distributions match archetype profiles

## Key Decisions

1. **Separate rarity and ilvl multipliers**: Stat rarity multipliers (1.0x-4.0x) are distinct from ilvl rarity multipliers (1.0x-2.2x), allowing independent tuning of power vs item level.

2. **Tier determined by level ranges**: Derived tier from requiredLevel (1-10=tier1, etc.) rather than explicit tier field, keeping data normalized.

3. **Base budget of 77**: Chose 77 as tier 1 common base to ensure all tier/rarity combinations produce meaningful non-zero stats when distributed by percentages.

4. **Archetype documentation in code**: Added header comment documenting all archetypes directly in suits.ts for developer reference.

## Impact

**Content Consistency:**
- Eliminates ad-hoc stat values in suit definitions
- Ensures all suits follow same scaling formula
- Makes it trivial to add new suits (just classify archetype and call generateSuitStats)

**Build Diversity:**
- 7 distinct archetypes provide clear build identities
- Tank builds get 6-7x more defense, scout builds get mobility/perception focus
- Combat/assault builds balance offense and defense differently

**Progression Clarity:**
- Players can predict stat gains when upgrading rarity (1.4x rare, 2.0x epic, etc.)
- Tier progression (2.0x tier 2, 3.5x tier 3, etc.) rewards level advancement

**Future Expansion:**
- Adding archetype variants (e.g., "medic" with recovery 40%, vigor 30%, resilience 30%) is trivial
- Tuning multipliers (if legendary 4.0x feels too strong, adjust to 3.5x globally)
- Can apply same pattern to modules/tools for consistency

## Self-Check: PASSED

**Created files:** None (expected)

**Modified files:**
- `/Users/krzysztof.kalamarski/Projects/into-the-void/packages/items/src/utils.ts` ✓
- `/Users/krzysztof.kalamarski/Projects/into-the-void/packages/items/src/definitions/suits.ts` ✓

**Commits:**
- `8f6d9b0`: feat(63-01): add stat generation helpers for suit normalization ✓
- `751c748`: feat(63-01): normalize all 22 suit stats with archetype profiles ✓

**Verification:**
- TypeScript compilation: PASSED ✓
- No empty effects arrays: PASSED (0 found) ✓
- All suits have stats: PASSED (22/22) ✓
- Tank > Scout defense: PASSED (70 > 11) ✓
- Legendary scaling: PASSED (1694 = 77 * 4.0 * 5.5) ✓

All files exist, all commits present, all verifications passed.
