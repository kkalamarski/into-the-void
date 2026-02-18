---
phase: 28-equipment-system
plan: "01"
subsystem: web-ui
tags: [equipment, dnd-kit, react, zustand, ui-panel]
dependency_graph:
  requires:
    - 27-01 (inventoryStore, SortableSlot, useDroppable infrastructure)
    - 27-03 (ItemTooltip component)
    - 26-01 (InventoryEquipment shared type with exosuit/modules/tool/accessory1/accessory2)
  provides:
    - EquipmentPanel UI component with droppable equipment slots
    - DndContext lifted to GameUI (shared across InventoryPanel and EquipmentPanel)
    - showEquipment/toggleEquipment state in gameStore
    - equipment:change, inventory:unequip, equipment:tool_swap in ClientEvents type
  affects:
    - apps/web/src/ui/GameUI.tsx (DndContext owner)
    - apps/web/src/ui/panels/InventoryPanel.tsx (removed DndContext, uses parent)
tech_stack:
  added: []
  patterns:
    - useDroppable for drop targets (DnD Kit pattern for non-sortable targets)
    - DndContext lifted to common ancestor for cross-panel drag
    - Reactive moduleSlotCount via ItemRegistry.get(exosuit.itemId).moduleSlots
    - setKeyboardEnabled pattern to disable Phaser keys when panel open
key_files:
  created:
    - apps/web/src/ui/panels/EquipmentPanel.tsx
    - apps/web/src/ui/panels/EquipmentPanel.css
  modified:
    - apps/web/src/store/gameStore.ts
    - packages/shared-types/src/network/events.ts
    - apps/web/src/ui/hud/HUD.tsx
    - apps/web/src/ui/GameUI.tsx
    - apps/web/src/ui/panels/InventoryPanel.tsx
decisions:
  - DndContext lifted to GameUI.tsx so InventoryPanel and EquipmentPanel share one drag context — cross-panel drop resolves correctly
  - EquipSlot IDs prefixed with equip- so handleDragEnd can route by overId.startsWith('equip-') to emit equipment:change vs inventory:reorder
  - accessory1 labeled as Tool (Secondary) per EQUIP-09 tool swap design recommendation from RESEARCH.md
  - Module slot count derived reactively from inventory.equipment.exosuit via ItemRegistry — updates on every inventory:update roundtrip
metrics:
  duration: 159s
  completed: 2026-02-18
  tasks: 3
  files: 7
---

# Phase 28 Plan 01: EquipmentPanel UI and DnD Lift Summary

EquipmentPanel React component with exo-suit slot, dynamic module slots (derived from equipped suit rarity via ItemRegistry), and tool/accessory slots; DndContext lifted from InventoryPanel to GameUI enabling cross-panel drag-to-equip.

## Tasks Completed

| # | Name | Commit | Files |
|---|------|--------|-------|
| 1 | Add equipment toggle to gameStore, events to shared-types, Equipment button to HUD | 784f3f9 | gameStore.ts, events.ts, HUD.tsx |
| 2 | Create EquipmentPanel with exo-suit slot, dynamic module slots, tool slots | 33a0f3a | EquipmentPanel.tsx, EquipmentPanel.css |
| 3 | Lift DndContext to GameUI, wire cross-panel drag-to-equip | b342758 | GameUI.tsx, InventoryPanel.tsx |

## What Was Built

**EquipmentPanel.tsx (171 lines):**
- `EquipSlot` sub-component uses `useDroppable` from `@dnd-kit/core` with `id: equip-{slotId}` prefix for drag routing
- Sections: Exo-Suit (single slot), Modules (dynamic grid up to 6 slots for legendary suit), Tools (main + secondary), Accessories
- Module slot count derived: `ItemRegistry.get(exosuit.itemId)?.moduleSlots ?? 0`
- Right-click on filled slot emits `inventory:unequip` via gameSocket
- Disables Phaser keyboard on mount (same pattern as InventoryPanel)

**GameUI.tsx (DndContext lifted):**
- Owns `DndContext` with `closestCenter` and `PointerSensor` (distance: 8 activation)
- `handleDragEnd` routes by `over.id` prefix: `equip-*` emits `equipment:change`, otherwise routes to inventory reorder
- Reads `useInventoryStore.getState()` snapshot (intentional — avoids reactive re-renders in event handler)
- Conditionally renders `{showEquipment && <EquipmentPanel />}`

**InventoryPanel.tsx (simplified):**
- DndContext, sensors, handleDragEnd removed — panel now uses parent DndContext from GameUI
- SortableContext retained (provides item IDs to DnD Kit for sortable behavior)
- handleDragEnd for reorder now executes in GameUI.tsx

## Key Design Decisions

- **DndContext at GameUI level:** Required for cross-panel drag. Both panels must share one DndContext for `over` to resolve correctly across React tree boundaries.
- **equip- prefix routing:** Distinguishes equipment slot drops from inventory slot drops in a single `handleDragEnd` handler without type unions.
- **accessory1 as Tool (Secondary):** Per RESEARCH.md recommendation and EQUIP-09 — avoids adding a new DB field; matches tool_swap behavior in Phase 28-02.
- **No optimistic equip:** Panel waits for `inventory:update` from server before showing equipped state — consistent with Phase 27 non-optimistic reorder decision.

## Deviations from Plan

None — plan executed exactly as written.

## Verification Results

All verifications pass:
- `showEquipment` and `toggleEquipment` present in gameStore.ts
- `equipment:change`, `inventory:unequip`, `equipment:tool_swap` present in ClientEventType and ClientEvents
- `toggleEquipment` wired in HUD.tsx Equipment button
- EquipmentPanel.tsx: 171 lines (min 80), uses `useDroppable`, derives `moduleSlots`
- EquipmentPanel.css: 141 lines (min 40)
- DndContext in GameUI.tsx, DndContext removed from InventoryPanel.tsx
- `nx run web:build` passes, zero TypeScript errors

## Self-Check: PASSED

Files created:
- FOUND: apps/web/src/ui/panels/EquipmentPanel.tsx
- FOUND: apps/web/src/ui/panels/EquipmentPanel.css

Commits verified:
- FOUND: 784f3f9 (Task 1)
- FOUND: 33a0f3a (Task 2)
- FOUND: b342758 (Task 3)
