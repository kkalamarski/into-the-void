---
phase: 39-combat-core-and-damage-calculation
plan: "04"
subsystem: combat
tags:
  - combat
  - damage
  - toughness
  - gap-closure
dependency_graph:
  requires:
    - 39-03-SUMMARY.md
  provides:
    - Toughness damage reduction wired to calculateDamage
  affects:
    - apps/game-server/src/game/combat.service.ts
    - packages/game-logic/src/combat/damage.test.ts
tech_stack:
  added: []
  patterns:
    - armorReduction derived from creatureStats.toughness
key_files:
  modified:
    - apps/game-server/src/game/combat.service.ts
    - packages/game-logic/src/combat/damage.test.ts
decisions:
  - "armorReduction set to creatureStats.toughness in attackTick() — Toughness now serves as the base armor value feeding into effectiveArmor quadratic scaling"
  - "Toughness test uses critChance=0 and 20-run average with 0.8x threshold — eliminates both crit randomness and ±10% variance flakiness deterministically"
metrics:
  duration: 2min
  completed: 2026-02-19
---

# Phase 39 Plan 04: Toughness Damage Reduction Gap Closure Summary

**One-liner:** Toughness now reduces damage via armorReduction=creatureStats.toughness wiring in attackTick(), with deterministic unit test using critChance=0 and 20-run average.

## What Was Done

Gap closure plan fixing COMB-03: Damage = Power vs Toughness formula was partially implemented — `calculateDamage()` had the `armorReduction` parameter and formula, but `attackTick()` hardcoded `armorReduction: 0`, making Toughness have zero effect on combat damage.

### Task 1: Fix armorReduction derivation in attackTick()

Changed `armorReduction: 0` to `armorReduction: creatureStats.toughness` in `combat.service.ts` line 263. The existing `calculateDamage()` formula `effectiveArmor = armorReduction * (1 + toughness * 0.02)` now produces meaningful reduction:
- Toughness 20: effectiveArmor = 20 * (1 + 20*0.02) = 28 — moderate mitigation
- Toughness 100: effectiveArmor = 100 * (1 + 100*0.02) = 300 — floors most attacks at 1

### Task 2: Fix Toughness unit test to be deterministic

The existing test did not pass `armorReduction`, causing both low/high toughness calls to produce identical armorReduction=0 results. The test only passed by luck from ±10% random variance.

Fixed by:
- Passing `armorReduction: 20` / `armorReduction: 100` matching toughness values
- Setting `critChance: 0` to remove crit randomness entirely
- Averaging 20 runs to smooth the remaining ±10% variance
- Asserting `avgHigh < avgLow * 0.8` (a gap large enough to be immune to all remaining noise)

## Verification Results

1. `pnpm build` — success, no TypeScript errors
2. `npx nx run game-logic:test` — 12/12 tests pass (run 3x, consistent)
3. Manual calculation confirmed:
   - Low toughness (20): effectiveArmor = 28, base damage ~35, reduced to ~7
   - High toughness (100): effectiveArmor = 300, base damage ~35, floored to 1
4. Pattern `armorReduction: creatureStats.toughness` confirmed in combat.service.ts line 263

## Deviations from Plan

None — plan executed exactly as written. Both approaches in Task 2 specification were equivalent; chose the simpler 20-run average approach as suggested.

## Commits

| Task | Hash | Message |
|------|------|---------|
| 1 | 83d520e | fix(39-04): derive armorReduction from creatureStats.toughness in attackTick() |
| 2 | 2bbe197 | fix(39-04): make Toughness unit test deterministic with explicit armorReduction |

## Self-Check

- [x] `apps/game-server/src/game/combat.service.ts` — modified, pattern verified at line 263
- [x] `packages/game-logic/src/combat/damage.test.ts` — modified, armorReduction present at lines 59, 69
- [x] Commit 83d520e exists
- [x] Commit 2bbe197 exists
- [x] All 12 tests pass (3 consecutive runs)

## Self-Check: PASSED
