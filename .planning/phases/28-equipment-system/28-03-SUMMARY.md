---
phase: 28-equipment-system
plan: "03"
subsystem: ui
tags: [react, phaser, zustand, hud, inventory, equipment, socket-io]

# Dependency graph
requires:
  - phase: 28-01
    provides: EquipmentPanel UI with DndContext, cross-panel drag-to-equip
  - phase: 28-02
    provides: ComputedStats in shared-types, effectiveStats in equip/unequip responses, tool_swap handler
  - phase: 27-01
    provides: inventoryStore (separate from gameStore) with inventory:update socket wiring

provides:
  - HUD stats section displaying armor, speedMultiplier (as %), hazardResistance from inventory.stats
  - Level-gated inventory slots with grayscale+opacity visual feedback
  - Level-gated equipment slots with locked CSS class
  - Q key emits equipment:tool_swap respecting setKeyboardEnabled gate

affects: [future HUD panels, gameplay UX, tool swap workflow]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - HUD subscribes to inventoryStore (not gameStore) for equipment stats — avoids Phaser re-renders
    - Level-lock uses ItemDefinition.requiredLevel vs player.level from gameStore selector
    - Q key handler registered inside if (this.input.keyboard) block; respects keyboard.enabled gate

key-files:
  created: []
  modified:
    - apps/web/src/ui/hud/HUD.tsx
    - apps/web/src/ui/hud/HUD.css
    - apps/web/src/ui/panels/InventoryPanel.tsx
    - apps/web/src/ui/panels/InventoryPanel.css
    - apps/web/src/ui/panels/EquipmentPanel.tsx
    - apps/web/src/ui/panels/EquipmentPanel.css
    - apps/web/src/game/scenes/WorldScene.ts

key-decisions:
  - "HUD reads inventory.stats via useInventoryStore — consistent with separation of inventoryStore from gameStore per 27-01 decision"
  - "stats defaults (armor:0, speedMultiplier:1.0) ensure HUD renders correctly before any equip operation populates stats"
  - "Q key handler placed inside if (this.input.keyboard) guard matching existing WASD setup pattern"
  - "isLevelLocked uses ItemRegistry.get(itemId).requiredLevel — client-side display only; server enforces on equip"

patterns-established:
  - "HUD stat display uses HTML entity codes for emoji icons (&#x1F6E1; etc.) to avoid JSX emoji encoding issues"

# Metrics
duration: 3min
completed: 2026-02-18
---

# Phase 28 Plan 03: Equipment UI Polish Summary

**HUD stats section (armor/speed/hazard), level-locked item greying in InventoryPanel and EquipmentPanel, Q hotkey emitting equipment:tool_swap via Phaser keyboard gate**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-02-18T10:05:43Z
- **Completed:** 2026-02-18T10:09:04Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments
- HUD now displays computed equipment stats (armor, speed as %, hazard resistance) from `inventory.stats` with safe defaults when no equipment is worn
- Inventory items with `requiredLevel > playerLevel` render with `inventory-slot--locked` class (grayscale 50%, opacity 0.5, cursor not-allowed, dark overlay)
- Equipment panel slots similarly get `equip-slot--locked` class for items equipped above player level (edge case display)
- Q key in WorldScene emits `equipment:tool_swap` only when `this.input.keyboard.enabled` is true — won't fire when inventory/equipment panels are open

## Task Commits

Each task was committed atomically:

1. **Task 1: Add stats display section to HUD** - `99ab13d` (feat)
2. **Task 2: Add level-gating visual feedback to InventoryPanel and EquipmentPanel** - `a586986` (feat)
3. **Task 3: Add Q hotkey for tool swap in WorldScene** - `ea74b0c` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `apps/web/src/ui/hud/HUD.tsx` - Added useInventoryStore import, stats extraction with defaults, stats-section JSX
- `apps/web/src/ui/hud/HUD.css` - Added .stats-section, .stat-row, .stat-icon, .stat-value styles
- `apps/web/src/ui/panels/InventoryPanel.tsx` - SortableSlot reads playerLevel, computes isLevelLocked, applies locked class and opacity
- `apps/web/src/ui/panels/InventoryPanel.css` - Added .inventory-slot--locked with grayscale filter and pseudo-element overlay
- `apps/web/src/ui/panels/EquipmentPanel.tsx` - EquipSlot reads playerLevel, computes isLevelLocked, adds equip-slot--locked class
- `apps/web/src/ui/panels/EquipmentPanel.css` - Added .equip-slot--locked with grayscale and reduced opacity
- `apps/web/src/game/scenes/WorldScene.ts` - Imported gameSocket, registered Q key handler for equipment:tool_swap

## Decisions Made
- HUD reads `inventory.stats` via `useInventoryStore` — consistent with Phase 27 decision to keep inventoryStore separate from gameStore to avoid Phaser canvas re-renders
- `stats` defaults (armor: 0, speedMultiplier: 1.0) ensure HUD shows sensible values before any equip operation populates `inventory.stats`
- Q key handler placed inside `if (this.input.keyboard)` guard, identical pattern to existing WASD key setup
- Level-lock is display-only on client; server enforces `validateEquip` with `requiredLevel` check — no client-side equip prevention needed

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 28 is now complete (all 3 plans executed)
- Equipment system fully wired: DB schema, server handlers, computed stats, inventory UI, equipment UI, drag-to-equip, tool swap hotkey, HUD stat display
- Phase 29 (final phase) is ready to begin

---
*Phase: 28-equipment-system*
*Completed: 2026-02-18*

## Self-Check: PASSED

- FOUND: apps/web/src/ui/hud/HUD.tsx
- FOUND: apps/web/src/ui/hud/HUD.css
- FOUND: apps/web/src/ui/panels/InventoryPanel.tsx
- FOUND: apps/web/src/ui/panels/InventoryPanel.css
- FOUND: apps/web/src/ui/panels/EquipmentPanel.tsx
- FOUND: apps/web/src/ui/panels/EquipmentPanel.css
- FOUND: apps/web/src/game/scenes/WorldScene.ts
- FOUND: .planning/phases/28-equipment-system/28-03-SUMMARY.md
- FOUND: commit 99ab13d (Task 1)
- FOUND: commit a586986 (Task 2)
- FOUND: commit ea74b0c (Task 3)
