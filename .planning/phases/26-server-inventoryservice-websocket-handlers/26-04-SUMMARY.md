---
phase: 26-server-inventoryservice-websocket-handlers
plan: "04"
subsystem: game-logic
tags: [inventory, stats, equipment, pure-function, server-authoritative]

dependency_graph:
  requires:
    - packages/game-logic/src/inventory/effects.ts
    - packages/items/src/registry.ts
    - packages/database/src/schema/inventories.ts
  provides:
    - effectiveStats pure function
    - ComputedStats interface
  affects:
    - Combat damage reduction (server uses effectiveStats for authoritative armor)
    - Speed validation (server uses effectiveStats for authoritative speedMultiplier)
    - Hazard zone damage (server uses effectiveStats for hazardResistance)

tech_stack:
  added: []
  patterns:
    - Pure function stat derivation from equipment JSONB
    - Multiplicative stat stacking (speedMultiplier) vs additive (armor, hazardResistance)
    - Unknown stats fallback to bonuses Record for forward compatibility

key_files:
  created:
    - packages/game-logic/src/inventory/stats.ts
  modified:
    - packages/game-logic/src/index.ts

decisions:
  - speedMultiplier stacks multiplicatively (value *= multiplier) so multiple speed modules compound correctly; all other stats are additive
  - Timed stat_buff effects from consumables are intentionally excluded — those are tracked in player state, not derived from equipment
  - Unknown stat names accumulate in bonuses Record for forward compatibility with future stat system phases

metrics:
  duration: 77s
  completed: 2026-02-17
  tasks_completed: 2
  files_modified: 2
---

# Phase 26 Plan 04: effectiveStats Pure Function Summary

**One-liner:** Pure `effectiveStats(equipment)` function derives armor, speedMultiplier, hazardResistance, energyCapacity and other bonuses from equipped items via ItemRegistry and resolveEffectsForTrigger — no DB calls, fully server-authoritative.

## What Was Built

`effectiveStats` is a pure function in `packages/game-logic/src/inventory/stats.ts` that accepts an `EquipmentJson` (server-authoritative equipment state) and returns a `ComputedStats` object containing all derived stat values from equipped items.

The function:
1. Collects all equipped items from `exosuit`, `modules[]`, `tool`, `accessory1`, `accessory2`
2. For each item, looks up the item definition via `ItemRegistry.get(itemId)`
3. Resolves `on_equip` and `passive` effects via `resolveEffectsForTrigger`
4. Accumulates stat changes into the `ComputedStats` result:
   - `armor` — additive
   - `speedMultiplier` — multiplicative (compound speed modules)
   - `hazardResistance` — additive
   - `detectionRange` — additive
   - `energyCapacity` — additive (base: 100)
   - `rechargeRate` — additive (base: 1.0)
   - `jumpHeight` — additive (base: 1.0)
   - unknown stats — accumulated in `bonuses` Record

Both `effectiveStats` and `ComputedStats` are exported from the `@into-the-void/game-logic` public API.

## Tasks Completed

| Task | Description | Commit |
|------|-------------|--------|
| 1 | Create effectiveStats pure function in stats.ts | 05ac6f6 |
| 2 | Export stats module from game-logic index.ts | fedee58 |

## Verification Results

All 5 verification checks passed:
1. `packages/game-logic/src/inventory/stats.ts` exists
2. `effectiveStats` function present in stats.ts
3. `ComputedStats` interface present in stats.ts
4. `export * from './inventory/stats'` in index.ts
5. `effectiveStats` exported in dist/packages/game-logic/index.js

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- `/Users/krzysztof.kalamarski/Projects/into-the-void/packages/game-logic/src/inventory/stats.ts` — FOUND
- `/Users/krzysztof.kalamarski/Projects/into-the-void/packages/game-logic/src/index.ts` — FOUND (contains stats export)
- Commit 05ac6f6 — FOUND
- Commit fedee58 — FOUND
- `effectiveStats` in dist output — FOUND
