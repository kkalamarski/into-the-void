---
phase: 32-client-display
plan: 03
subsystem: web-ui
tags: [tooltip, inventory, stat-comparison, equipment, game-logic]
dependency_graph:
  requires:
    - 31-03  # statsStore wiring (game-logic package available)
    - 28-xx  # items package with ItemDefinition.equipSlot
  provides:
    - ItemTooltip stat comparison UI (green/red deltas)
  affects:
    - apps/web/src/components/ItemTooltip.tsx
    - apps/web/src/components/ItemTooltip.css
    - apps/web/src/ui/panels/InventoryPanel.tsx
tech_stack:
  added:
    - resolveEffectsForTrigger from game-logic (first use in web client)
  patterns:
    - Helper function pattern for stat extraction and delta computation
    - Prop threading pattern for passing equipment context down to slot components
key_files:
  created: []
  modified:
    - apps/web/src/components/ItemTooltip.tsx
    - apps/web/src/components/ItemTooltip.css
    - apps/web/src/ui/panels/InventoryPanel.tsx
decisions:
  - equippedItem prop is optional — tooltip degrades gracefully when no item is equipped in slot
  - Module comparison uses modules[0]; accessory comparison uses accessory1 (v1 limitation, documented)
  - stat names shown are legacy ComputedStats keys (armor, speedMultiplier, etc.) — auto-upgrades when CharacterStats effects added
  - equipment prop threaded through SortableSlotProps rather than using additional useInventoryStore call inside slot (avoids duplicate subscriptions)
metrics:
  duration: 3m
  completed: 2026-02-18
  tasks: 2
  files: 3
---

# Phase 32 Plan 03: Stat Comparison Tooltip Summary

ItemTooltip extended with green/red stat delta comparison using resolveEffectsForTrigger from game-logic, wired into InventoryPanel SortableSlot with equipment context.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Extend ItemTooltip with stat comparison display | 9aacbb7 | ItemTooltip.tsx, ItemTooltip.css |
| 2 | Wire equippedItem prop in InventoryPanel SortableSlot | e3d8516 | InventoryPanel.tsx |

## What Was Built

**ItemTooltip.tsx changes:**
- Added `equippedItem?: ItemDefinition` prop to `ItemTooltipProps`
- Imported `resolveEffectsForTrigger` from `@into-the-void/game-logic`
- Added `extractStatBonuses(item)` helper: resolves `on_equip` and `passive` triggers, accumulates numeric values into a keyed record
- Added `computeStatDeltas(hoveredItem, equippedItem)` helper: unions stat keys from both items, returns signed deltas where delta != 0
- Renders `tooltip-comparison` section only when `item.equipSlot` exists and deltas are non-empty
- Shows "vs Equipped" header with green (+) or red (-) delta lines per stat

**ItemTooltip.css additions:**
- `.tooltip-comparison` — bordered top separator section
- `.tooltip-comparison-header` — small caps "vs Equipped" label
- `.tooltip-delta` — base delta line style
- `.tooltip-delta--positive` — #4aff4a green for beneficial stats
- `.tooltip-delta--negative` — #ff4a4a red for worse stats

**InventoryPanel.tsx changes:**
- Added `InventoryEquipment` type import from `@into-the-void/shared-types`
- Added `equipment: InventoryEquipment | undefined` prop to `SortableSlotProps`
- Extracted `getEquippedForSlot(slot, eq)` helper with slot-to-equipment mapping:
  - `exosuit` → `eq.exosuit`
  - `tool` → `eq.tool`
  - `accessory` → `eq.accessory1` (first slot)
  - `module` → `eq.modules[0]` (first module)
- Resolves `equippedItemDef` via `ItemRegistry.get()` and passes to `<ItemTooltip equippedItem={equippedItemDef}>`
- `InventoryPanel` passes `inventory.equipment` to each `SortableSlot`

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

- [x] `apps/web/src/components/ItemTooltip.tsx` — exists, contains `equippedItem`
- [x] `apps/web/src/components/ItemTooltip.css` — exists, contains `tooltip-delta--positive`
- [x] `apps/web/src/ui/panels/InventoryPanel.tsx` — exists, contains `getEquippedForSlot` and `equippedItem=`
- [x] Commit 9aacbb7 — Task 1
- [x] Commit e3d8516 — Task 2
- [x] Full monorepo build passes (`pnpm nx run web:build --skip-nx-cache`)

## Self-Check: PASSED
