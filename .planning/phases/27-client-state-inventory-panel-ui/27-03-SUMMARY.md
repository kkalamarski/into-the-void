---
phase: 27-client-state-inventory-panel-ui
plan: "03"
subsystem: web-ui
tags: [tooltip, floating-ui, keyboard-control, inventory, phaser-integration]
dependency_graph:
  requires: ["27-01", "27-02"]
  provides: ["item-tooltip", "keyboard-disable-on-inventory"]
  affects: ["apps/web/src/components/ItemTooltip.tsx", "apps/web/src/ui/panels/InventoryPanel.tsx", "apps/web/src/game/scenes/WorldScene.ts"]
tech_stack:
  added: ["@floating-ui/react@0.27.18"]
  patterns: ["floating-ui-portal-tooltip", "phaser-keyboard-react-bridge"]
key_files:
  created:
    - apps/web/src/components/ItemTooltip.tsx
    - apps/web/src/components/ItemTooltip.css
  modified:
    - apps/web/src/game/scenes/WorldScene.ts
    - apps/web/src/ui/panels/InventoryPanel.tsx
decisions:
  - "@floating-ui/react installed at workspace root (single root package.json Nx monorepo)"
  - "ItemTooltip wraps reference div around children to preserve SortableSlot drag behavior"
  - "setKeyboardEnabled in WorldScene guards against null input.keyboard — safe for Phaser scenes pre-create"
metrics:
  duration: 115s
  completed: "2026-02-17"
  tasks: 3
  files: 4
---

# Phase 27 Plan 03: Item Tooltip and Keyboard Control Summary

**One-liner:** FloatingPortal tooltip for inventory items with rarity-color styling and Phaser keyboard disable on inventory open.

## What Was Built

This plan completes the inventory UI with two features:

1. **ItemTooltip component** — A floating tooltip using `@floating-ui/react` that renders item details (displayName, description, category, rarity, ilvl, requiredLevel) in a portal above all other elements. The item name is colored by rarity using RARITY_COLORS. The tooltip uses `flip()` and `shift()` middleware to reposition at panel edges and is disabled during drag operations.

2. **Keyboard disable bridge** — `WorldScene.setKeyboardEnabled(enabled)` public method that sets `this.input.keyboard.enabled`, and a `useEffect` in `InventoryPanel` that calls it on mount (disable) and unmount (re-enable), preventing WASD/arrow movement while inventory is open.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create ItemTooltip component with floating-ui | e38f548 | ItemTooltip.tsx, ItemTooltip.css, package.json, pnpm-lock.yaml |
| 2 | Add setKeyboardEnabled to WorldScene and wire in InventoryPanel | ba4fec4 | WorldScene.ts, InventoryPanel.tsx |
| 3 | Integrate ItemTooltip into InventoryPanel SortableSlot | 3b29c60 | InventoryPanel.tsx |

## Verification

- `nx run web:build` passes (211 modules transformed, no TypeScript errors)
- `ItemTooltip.tsx` contains `useFloating`, `FloatingPortal`, `flip()`, `shift()`
- `WorldScene.ts` line 1284 has `setKeyboardEnabled(enabled: boolean): void`
- `InventoryPanel.tsx` imports `ItemTooltip` and wraps `SortableSlot` content
- `InventoryPanel.tsx` has `useEffect` calling `setKeyboardEnabled(false/true)`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Installed @floating-ui/react dependency**
- **Found during:** Task 1
- **Issue:** `@floating-ui/react` was not installed; plan assumed it was available
- **Fix:** `pnpm add -w @floating-ui/react` (workspace root flag required for single root package.json Nx monorepo)
- **Files modified:** `package.json`, `pnpm-lock.yaml`
- **Version installed:** 0.27.18

## Self-Check: PASSED

- FOUND: apps/web/src/components/ItemTooltip.tsx
- FOUND: apps/web/src/components/ItemTooltip.css
- FOUND: apps/web/src/game/scenes/WorldScene.ts
- FOUND: apps/web/src/ui/panels/InventoryPanel.tsx
- FOUND: commit e38f548 (ItemTooltip component)
- FOUND: commit ba4fec4 (setKeyboardEnabled + InventoryPanel wire)
- FOUND: commit 3b29c60 (ItemTooltip integration)
