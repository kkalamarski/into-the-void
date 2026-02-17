---
phase: 25-item-data-model-foundation
plan: "01"
subsystem: items
tags: [items, registry, typescript, package]
dependency_graph:
  requires: []
  provides: ["@into-the-void/items", "ItemRegistry", "ItemDefinition", "computeIlvl"]
  affects: ["packages/items", "tsconfig.base.json"]
tech_stack:
  added: ["@into-the-void/items workspace package"]
  patterns: ["Singleton registry (mirrors TileRegistry pattern)", "Discriminated union for ItemEffect"]
key_files:
  created:
    - packages/items/package.json
    - packages/items/project.json
    - packages/items/tsconfig.lib.json
    - packages/items/src/index.ts
    - packages/items/src/types.ts
    - packages/items/src/registry.ts
    - packages/items/src/utils.ts
  modified:
    - tsconfig.base.json
decisions:
  - "ItemCategory uses 6 lore-mandated types (suit|module|tool|consumable|world-item|reagent) — differs from shared-types which has 7"
  - "ItemRarity uses 5 tiers (common|rare|epic|exotic|legendary) — no 'uncommon' per lore"
  - "computeIlvl uses multipliers 1.0/1.2/1.5/1.8/2.2 matching proposed ilvl formula from STATE.md"
metrics:
  duration: "2m 23s"
  completed: "2026-02-17"
  tasks_completed: 2
  files_created: 7
  files_modified: 1
---

# Phase 25 Plan 01: Create packages/items Workspace Package Summary

**One-liner:** NX workspace package `@into-the-void/items` with `ItemRegistry` singleton, `ItemDefinition` typed interface, and `computeIlvl(tier, rarity)` helper — mirroring tiles package structure.

## What Was Built

A new NX workspace package `packages/items` providing the shared item data layer for all subsequent inventory phases. The package mirrors the `packages/tiles` structure exactly, using the same singleton registry pattern.

### Key Components

**`packages/items/src/types.ts`**
- `ItemCategory` — 6 lore-mandated categories: `suit | module | tool | consumable | world-item | reagent`
- `ItemRarity` — 5 tiers: `common | rare | epic | exotic | legendary` (no `uncommon`)
- `ItemDefinition` — complete interface with all required fields: id, displayName, description, category, rarity, maxStack, weight, baseValue, requiredLevel, ilvl, textureKey, color, equipSlot?, moduleSlots?, toolType?, effects?
- `ItemEffect` — discriminated union with 10 effect types (heal, energy_restore, stat_buff, suit_repair, armor, speed, life_support, sensor, power_core, mobility)
- Supporting types: `EquipSlot`, `EffectTrigger`, `ItemEffectDef`, `ToolType`

**`packages/items/src/registry.ts`**
- `ItemRegistry` singleton with `get(id)`, `has(id)`, `registerAll()`, `register()`, `getByCategory()`, `getByRarity()`, `getAllIds()`, `size`
- `get()` returns fallback `UNKNOWN_ITEM` (magenta color, 0xff00ff) for unknown IDs — no crashes

**`packages/items/src/utils.ts`**
- `computeIlvl(tier, rarity)` — computes ilvl from tier (1-4) and rarity using multipliers
- Tier 1 Common = 10, Tier 1 Legendary = 22, Tier 4 Legendary = 88

**`packages/items/src/index.ts`**
- Package entry point exporting all public API
- Placeholder comment for auto-registration (to be added in Plan 25-02)

### NX Configuration
- `project.json` — esbuild executor, lint target, test target with `passWithNoTests: true`
- `package.json` — `@into-the-void/items` with `@into-the-void/shared-types` dependency
- `tsconfig.lib.json` — extends workspace base config
- `tsconfig.base.json` — path alias `@into-the-void/items` added

## Verification Results

1. `nx run items:build` — **PASSED** (TypeScript compiles successfully, output at `dist/packages/items/`)
2. `grep "@into-the-void/items" tsconfig.base.json` — **PASSED** (path alias present)
3. `ls packages/items/src/` — **PASSED** (index.ts, types.ts, registry.ts, utils.ts all present)
4. `nx run items:lint` — Note: Pre-existing workspace-wide ESLint config absence (tiles:lint fails identically); not introduced by this plan

## Deviations from Plan

### Auto-fixed Issues

None — plan executed as written.

### Notes on Lint

The `nx run items:lint` verification step produces the same "No ESLint configuration found" error as `nx run tiles:lint` — this is a pre-existing workspace-wide issue, not introduced by this plan. The build target (`nx run items:build`) which verifies TypeScript correctness passes successfully.

## Commits

| Hash | Message |
|------|---------|
| c5609f3 | chore(25-01): create packages/items workspace package structure |
| 2296aa3 | feat(25-01): implement ItemDefinition types, ItemRegistry singleton, and computeIlvl |

## Self-Check

**Files:**
- [x] `packages/items/package.json` — exists
- [x] `packages/items/project.json` — exists
- [x] `packages/items/tsconfig.lib.json` — exists
- [x] `packages/items/src/index.ts` — exists (10+ lines)
- [x] `packages/items/src/types.ts` — exists
- [x] `packages/items/src/registry.ts` — exists
- [x] `packages/items/src/utils.ts` — exists
- [x] `tsconfig.base.json` — contains `@into-the-void/items`

**Commits:**
- [x] c5609f3 — exists
- [x] 2296aa3 — exists

## Self-Check: PASSED
