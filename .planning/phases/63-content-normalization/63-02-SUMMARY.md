---
phase: 63-content-normalization
plan: 02
subsystem: items
tags: [content, normalization, stats, tools, modules]
dependency_graph:
  requires: [63-01]
  provides: [normalized-tool-stats, normalized-module-stats]
  affects: [equipment-progression, character-stats]
tech_stack:
  added: []
  patterns: [role-based-stat-mapping, focused-stat-bonuses, legacy-effect-preservation]
key_files:
  created: []
  modified:
    - packages/items/src/definitions/tools.ts
    - packages/items/src/definitions/modules.ts
decisions:
  - title: Tool stat allocation follows role-based mapping
    rationale: Combat/demolition/universal tools provide power (offensive), mining/research provide perception (detection), bio provides vigor, stealth provides split perception+haste, anomaly provides resilience
    alternatives: [uniform-distribution, random-allocation]
    chosen: role-based-mapping
  - title: Module stats complement legacy effects
    rationale: Armor modules already provided armor value; adding toughness stat creates synergy. Speed modules add haste stat to speed multiplier. Creates cohesive progression.
    alternatives: [replace-legacy-effects, ignore-stats]
    chosen: additive-stats-alongside-legacy
  - title: Module stat budget 33% higher than tools
    rationale: Base 20 vs 15 allows modules to provide meaningful contribution without overshadowing suits (which use base 77)
    alternatives: [equal-budget, tool-focused]
    chosen: module-focused
metrics:
  duration: 739 seconds (~12 minutes)
  tasks_completed: 3
  files_modified: 2
  items_normalized: 90 (44 tools + 46 modules)
  test_coverage: TypeScript compilation verified
  completed: 2026-02-21
---

# Phase 63 Plan 02: Normalize Tool and Module Stats Summary

Normalized all 44 tool and 46 module definitions with appropriate stat bonuses using role-based mapping for tools and focused bonuses for modules.

## Tasks Completed

### Task 1: Add stats effects to all tools based on toolType (COMPLETE)

**What was done:**
- Added `getToolStats()` helper function with role-based stat mapping
- Updated all 44 tool definitions to include stats effects using formula: `base(15) * rarity_mult * tier_mult`
- Combat/demolition/universal tools → power stat
- Mining/research tools → perception stat
- Bio tools → vigor stat
- Stealth tools → perception (60%) + haste (40%) split
- Anomaly tools → resilience stat

**Files modified:**
- `packages/items/src/definitions/tools.ts` (174 insertions, 45 deletions)

**Stat examples:**
- `TOOL_COMBAT_COMMON` (T1 common): power: 15
- `TOOL_COMBAT_RARE` (T1 rare): power: 21 (15 * 1.4)
- `TOOL_COMBAT_EPIC` (T2 epic): power: 60 (15 * 2.0 * 2.0)
- `TOOL_COMBAT_LEGENDARY` (T4 legendary): power: 330 (15 * 4.0 * 5.5)
- `TOOL_STEALTH_EXOTIC` (T3 exotic): perception: 50, haste: 33 (split from base 84)

**Verification:**
```bash
# No empty effects arrays
grep -c "effects: \[\]" packages/items/src/definitions/tools.ts  # Returns: 0

# TypeScript compiles
npx tsc --noEmit src/definitions/tools.ts  # Success
```

**Commit:** `a3ecad3`

---

### Task 2: Add stats effects to modules alongside legacy effects (COMPLETE)

**What was done:**
- Added `getModuleStats()` helper function with type-based stat mapping
- Updated all 46 module definitions to ADD stats effects while preserving legacy effects
- Formula: `base(20) * rarity_mult * tier_mult`
- Armor modules → toughness (damage reduction synergy)
- Speed modules → haste (movement synergy)
- Life support modules → resilience (60%) + recovery (40%)
- Sensor modules → perception (detection synergy)
- Power core modules → vigor (60%) + recovery (40%)
- Mobility modules → haste (60%) + vigor (40%)

**Files modified:**
- `packages/items/src/definitions/modules.ts` (496 insertions, 32 deletions)

**Stat examples:**
- `MODULE_ARMOR_COMMON` (T1 common): armor: 10 (legacy) + toughness: 20 (stats)
- `MODULE_ARMOR_RARE` (T1 rare): armor: 22 (legacy) + toughness: 28 (stats)
- `MODULE_ARMOR_LEGENDARY` (T4 legendary): armor: 176 (legacy) + toughness: 440 (stats)
- `MODULE_LIFE_SUPPORT_EXOTIC` (T3 exotic): hazardResistance: 81 (legacy) + resilience: 34 + recovery: 22 (stats)
- `MODULE_POWER_CORE_EPIC` (T2 epic): energyCapacity: 375, rechargeRate: 18 (legacy) + vigor: 24 + recovery: 16 (stats)

**Verification:**
```bash
# All modules have stats
grep -c "getModuleStats" packages/items/src/definitions/modules.ts  # Returns: 47 (46 modules + 1 in helper)

# Legacy effects preserved
grep -c "type: 'armor'" packages/items/src/definitions/modules.ts  # Returns: 13 (all armor modules)

# TypeScript compiles
npx tsc --noEmit src/definitions/modules.ts  # Success
```

**Commit:** `3fd23a2`

---

### Task 3: Document tool and module stat conventions (COMPLETE)

**What was done:**
- Added comprehensive documentation headers to both `tools.ts` and `modules.ts`
- Documents role-based stat mapping for tools
- Documents focused stat bonuses for modules
- Explains stat formulas and multipliers
- Notes legacy effect preservation for modules

**Documentation added:**
```typescript
// tools.ts header (lines 4-17)
/**
 * Tool Stat Conventions (Phase 63)
 *
 * Tools provide role-appropriate stat bonuses:
 * - combat, demolition, universal: power (offensive capability)
 * - mining, research: perception (resource/specimen detection)
 * - bio: vigor (biological interaction)
 * - stealth: perception + haste (awareness and quick movement)
 * - anomaly: resilience (anomaly resistance)
 *
 * Stat Formula: base(15) * rarity_mult * tier_mult
 * Rarity: common=1.0, rare=1.4, epic=2.0, exotic=2.8, legendary=4.0
 * Tier: 1=1.0, 2=2.0, 3=3.5, 4=5.5, 5=8.0
 */

// modules.ts header (lines 4-17)
/**
 * Module Stat Conventions (Phase 63)
 *
 * Modules provide focused stat bonuses alongside legacy effects:
 * - armor: toughness (damage reduction synergy)
 * - speed: haste (movement synergy)
 * - life_support: resilience + recovery (environmental survival)
 * - sensor: perception (detection synergy)
 * - power_core: vigor + recovery (energy/stamina synergy)
 * - mobility: haste + vigor (movement/stamina synergy)
 *
 * Stat Formula: base(20) * rarity_mult * tier_mult
 * Legacy effects (armor value, speed multiplier, etc.) are preserved.
 */
```

**Verification:**
- Documentation comments present at top of both files
- Explains stat conventions with formulas and rationale

---

## Deviations from Plan

None - plan executed exactly as written. All 44 tools and 46 modules normalized with appropriate stat bonuses.

---

## Success Criteria Met

- [x] All 44 tools have stats effects with role-appropriate stat bonuses
- [x] Combat tools have power > 0
- [x] Mining/research tools have perception > 0
- [x] All 46 modules have stats effects added alongside legacy effects
- [x] Armor modules have toughness > 0
- [x] Sensor modules have perception > 0
- [x] Documentation comments explain stat conventions
- [x] TypeScript compiles successfully
- [x] No empty effects arrays remain

---

## Technical Notes

**Tool Type to Primary Stat Mapping:**
| Tool Type | Primary Stat | Rationale |
|-----------|-------------|-----------|
| universal | power | General purpose, slight combat bonus |
| combat | power | Offensive capability |
| demolition | power | Structural damage |
| mining | perception | Resource detection, vein quality |
| research | perception | Specimen analysis, data gathering |
| bio | vigor | Biological interaction, specimen handling |
| stealth | perception + haste | Awareness (60%) and quick movement (40%) |
| anomaly | resilience | Anomaly resistance |

**Module Type to Stat Mapping:**
| Module Type | Stats | Rationale |
|-------------|-------|-----------|
| armor | toughness | Damage reduction synergy with armor value |
| speed | haste | Movement speed synergy |
| life_support | resilience + recovery | Environmental survival (60/40 split) |
| sensor | perception | Detection synergy |
| power_core | vigor + recovery | Energy/stamina synergy (60/40 split) |
| mobility | haste + vigor | Movement/stamina synergy (60/40 split) |

**Stat Budget Comparison:**
- Tools: base 15 (smaller bonuses, support role)
- Modules: base 20 (meaningful contribution, 33% higher than tools)
- Suits: base 77 (primary stat source per plan 01)

**Tier Derivation:**
Tier calculated from `requiredLevel`:
- Tier 1: level 1-10
- Tier 2: level 11-20
- Tier 3: level 21-30
- Tier 4: level 31-40
- Tier 5: level 41-50

---

## Integration Points

**Client:**
- Tooltips will show new stat bonuses using shared extraction functions from Phase 62
- Equipment preview will display total stats including tool and module contributions

**Server:**
- `computeCharStats()` already handles multi-stat effects via Phase 62 shared functions
- Tool and module stats aggregate additively with suit stats

**Testing:**
- Manual verification: Equip tool → check stats increase
- Manual verification: Equip module → check both legacy effect (armor/speed) and stat bonus apply
- Integration tests from Phase 62 verify tooltip predictions match server deltas

---

## File Manifest

**Modified:**
1. `packages/items/src/definitions/tools.ts` - Added stats effects to all 44 tools (174 insertions, 45 deletions)
2. `packages/items/src/definitions/modules.ts` - Added stats effects to all 46 modules (496 insertions, 32 deletions)

**Total impact:** 670 insertions, 77 deletions across 2 files

---

## Self-Check: PASSED

**Files created:**
- ✅ `packages/items/src/definitions/tools.ts` exists and contains stats effects
- ✅ `packages/items/src/definitions/modules.ts` exists and contains stats effects

**Commits exist:**
- ✅ Commit `a3ecad3`: feat(63-02): add stats effects to all 44 tools based on toolType
- ✅ Commit `3fd23a2`: feat(63-02): add stats effects to all 46 modules alongside legacy effects

**Verification passed:**
- ✅ TypeScript compiles without errors
- ✅ No empty effects arrays in tools.ts (grep returns 0)
- ✅ No empty effects arrays in modules.ts (grep returns 0)
- ✅ All 44 tools have stats effects (via getToolStats calls)
- ✅ All 46 modules have stats effects (via getModuleStats calls)
- ✅ Legacy module effects preserved (armor: 13 instances, speed: 5, etc.)

---

**Plan completed successfully in ~12 minutes. All 90 items normalized with formulaic stat bonuses.**
