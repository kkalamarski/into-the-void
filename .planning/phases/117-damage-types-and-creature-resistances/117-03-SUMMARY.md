---
phase: 117-damage-types-and-creature-resistances
plan: "03"
subsystem: combat
tags: [damage-types, resistances, floating-numbers, combat-log, modules, items]
dependency-graph:
  requires: ["117-01", "117-02"]
  provides: [end-to-end-damage-types, damage-amplifier-modules, color-coded-floating-numbers]
  affects: [ability.service, ai.service, combat.service, EntityRenderer, WorldScene, combatLogStore, gameStore, items]
tech-stack:
  added: []
  patterns: [damage-type-threading, color-coded-feedback, module-effect-layering]
key-files:
  created:
    - packages/items/src/definitions/modules.ts (extended with 4 amplifier modules)
  modified:
    - packages/shared-types/src/network/events.ts
    - apps/game-server/src/game/ability.service.ts
    - apps/game-server/src/game/ai.service.ts
    - apps/game-server/src/game/combat.service.ts
    - apps/web/src/store/combatLogStore.ts
    - apps/web/src/store/gameStore.ts
    - apps/web/src/game/rendering/EntityRenderer.ts
    - apps/web/src/game/scenes/WorldScene.ts
    - apps/web/src/ui/hud/CombatLog.tsx
    - packages/items/src/definitions/index.ts
    - packages/game-logic/src/ability/definitions.ts
decisions:
  - "Damage amplifier modules include power: 56 stats effect alongside damage_type_bonus to satisfy item-validation test CONT-03 (all modules require a stats effect)"
  - "basic_strike assigned damageType: 'Kinetic' so player melee shows white floating numbers"
  - "DAMAGE_TYPE_COLORS placed as module-level const before EntityRenderer class for clean access"
metrics:
  duration: "~10 minutes"
  completed: "2026-03-03"
  tasks: 2
  files: 11
---

# Phase 117 Plan 03: Wire Damage Types End-to-End and Create Amplifier Modules Summary

Complete end-to-end damage type pipeline from ability execution through floating number color-coding, with combat log type labels and 4 new rare damage amplifier module items.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Wire damage types through server services and socket payload | e775870 | events.ts, ability.service.ts, ai.service.ts, combat.service.ts |
| 2 | Wire damage types through client rendering and create amplifier modules | c16b561 | combatLogStore.ts, gameStore.ts, EntityRenderer.ts, WorldScene.ts, CombatLog.tsx, modules.ts, index.ts, definitions.ts |

## What Was Built

### Task 1: Server-Side Damage Type Threading

**packages/shared-types/src/network/events.ts**
- Added `damageType?: DamageType` to the `combat:damage` ServerEvent payload type

**apps/game-server/src/game/ability.service.ts**
- Looks up `CreatureDefinition` via `EntityRegistry` to get `defenderResistances`
- Reads `damageType` from the ability effect (`abilityDamageType`)
- Loops through equipped gear (exosuit, tool, modules) for `damage_type_bonus` effects matching `abilityDamageType` to compute `damageBonusMultiplier`
- Passes `damageType`, `defenderResistances`, and `damageBonusMultiplier` to `calculateDamage()`
- Includes `damageType: abilityDamageType` in the `combat:damage` emit payload

**apps/game-server/src/game/combat.service.ts**
- Added `damageType?: DamageType` to `CombatDamageResult` interface
- Added `damageType: 'Kinetic' as const` to creature auto-attack `calculateDamage()` call
- Included `damageType: 'Kinetic' as const` in the returned `CombatDamageResult`

**apps/game-server/src/game/ai.service.ts**
- Added `damageType: result.damageType` to both `combat:damage` emit sites (direct player socket + zone broadcast)

### Task 2: Client Rendering and Module Items

**apps/web/src/store/combatLogStore.ts**
- Added `damageType?: DamageType` to `CombatLogEntry` interface
- Forwarded `data.damageType` in both `addEntry()` calls (dealt + received)

**apps/web/src/ui/hud/CombatLog.tsx**
- Updated damage display to show `[Type] damage` format when `entry.damageType` is present

**apps/web/src/game/rendering/EntityRenderer.ts**
- Added `DAMAGE_TYPE_COLORS` constant map: `Thermal=#ff8800, Cryo=#00ccff, Bio=#44ff44, Kinetic=#ffffff`
- Updated `createFloatingDamage()` signature to accept optional `damageType?: DamageType`
- Color logic: player-received = always red; outgoing with type = type color; outgoing without type = yellow (legacy)

**apps/web/src/game/scenes/WorldScene.ts**
- Updated `showDamageNumber()` signature to accept optional `damageType` parameter
- Passed `damageType` through to `EntityRenderer.createFloatingDamage()`

**apps/web/src/store/gameStore.ts**
- Added `damageType?` field to the `combat:damage` socket listener data type
- Passed `data.damageType` to `worldScene.showDamageNumber()`

**packages/items/src/definitions/modules.ts**
- Added 4 damage amplifier modules: `MODULE_THERMAL_AMP`, `MODULE_CRYO_AMP`, `MODULE_BIO_AMP`, `MODULE_KINETIC_AMP`
- All rare, level 15, +20% damage type bonus, registered in `ALL_MODULES`

**packages/items/src/definitions/index.ts**
- Added `MODULE_THERMAL_AMP_RARE`, `MODULE_CRYO_AMP_RARE`, `MODULE_BIO_AMP_RARE`, `MODULE_KINETIC_AMP_RARE` to `ITEM_IDS`
- Updated total item count comment to 234

**packages/game-logic/src/ability/definitions.ts**
- Assigned `damageType: 'Kinetic'` to `basic_strike` damage effect

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical functionality] Added stats effect to damage amplifier modules**
- **Found during:** Task 2, item-validation test run
- **Issue:** `item-validation.test.ts` test `all modules have stats effects` requires every module in `ALL_MODULES` to have a `{ type: 'stats' }` effect. The new damage amplifier modules only had `damage_type_bonus` effects and failed the test.
- **Fix:** Added `{ trigger: 'on_equip', effect: { type: 'stats', power: 56 } }` to each amplifier module. Power was chosen as the semantically correct stat for damage-focused modules. Value 56 = `20 * 1.4 (rare) * 2.0 (tier 2)` following the existing `getModuleStats` formula.
- **Files modified:** `packages/items/src/definitions/modules.ts`
- **Commit:** c16b561

## Verification Results

- `npx tsc --noEmit -p packages/shared-types/tsconfig.json` — PASSED
- `npx tsc --noEmit -p apps/game-server/tsconfig.json` — PASSED
- `npx tsc --noEmit -p apps/web/tsconfig.json` — PASSED
- `npx nx run items:test` — 1314 tests PASSED
- `npx nx run game-logic:test` — 53 tests PASSED
- All 3 emit sites include damageType (ability.service.ts + 2x ai.service.ts) — CONFIRMED
- DAMAGE_TYPE_COLORS map exists in EntityRenderer — CONFIRMED

## Self-Check: PASSED

All key files verified present. Both task commits (e775870, c16b561) verified in git history.
