---
phase: 27-client-state-inventory-panel-ui
plan: 02
subsystem: ui
tags: [react, dnd-kit, zustand, inventory, drag-drop, context-menu]

# Dependency graph
requires:
  - phase: 27-01
    provides: inventoryStore with Inventory state, pendingReorder flag, setPendingReorder

provides:
  - InventoryPanel component with 20-slot dnd-kit drag-drop grid
  - RARITY_COLORS constant mapping 5 rarity tiers to hex colors
  - Context menu with Use and Drop actions wired to socket events
  - GameUI conditional render when showInventory is true

affects: [27-03, phase-28]

# Tech tracking
tech-stack:
  added:
    - "@dnd-kit/core 6.3.1"
    - "@dnd-kit/sortable 10.0.0"
    - "@dnd-kit/utilities 3.2.2"
    - "immer 11.1.4 (peer dep for zustand/middleware/immer)"
  patterns:
    - "SortableSlot internal component pattern: useSortable hook with CSS.Transform.toString for drag styles"
    - "Non-optimistic reorder: set pendingReorder=true, disable grid pointer events until inventory:update clears it"
    - "useEffect click-outside pattern for dismissing context menus"

key-files:
  created:
    - apps/web/src/ui/constants.ts
    - apps/web/src/ui/panels/InventoryPanel.tsx
    - apps/web/src/ui/panels/InventoryPanel.css
  modified:
    - apps/web/src/ui/GameUI.tsx
    - package.json
    - pnpm-lock.yaml

key-decisions:
  - "InventoryPanel uses non-optimistic reorder: pendingReorder blocks UI until server inventory:update clears it via setInventory which resets pendingReorder"
  - "RARITY_COLORS imported from @into-the-void/shared-types ItemRarity (not items package) for UI layer consistency"
  - "Slot array built from maxSlots count with slot-index lookup — empty slots render as null entries in fixed-size grid"

patterns-established:
  - "SortableSlot: internal sub-component pattern for items that need both dnd-kit hooks and event handlers"
  - "Context menu position stored as {x, y, instanceId} — dismissed by window click-outside listener"

# Metrics
duration: 13min
completed: 2026-02-17
---

# Phase 27 Plan 02: Inventory Panel UI Summary

**20-slot dnd-kit drag-drop inventory grid with rarity-colored item borders, right-click context menu (Use/Drop), and conditional GameUI render**

## Performance

- **Duration:** ~13 min
- **Started:** 2026-02-17T22:27:41Z
- **Completed:** 2026-02-17T22:40:21Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments
- Created InventoryPanel.tsx with dnd-kit SortableContext, SortableSlot sub-component, and non-optimistic reorder flow
- Added RARITY_COLORS constant mapping (common/rare/epic/exotic/legendary) for rarity-colored slot borders
- Wired context menu (Use/Drop) emitting inventory:use and inventory:drop socket events
- Integrated InventoryPanel into GameUI with showInventory conditional render

## Task Commits

Each task was committed atomically:

1. **Task 1: Create rarity colors constant and InventoryPanel component** - `bdd408d` (feat)
2. **Task 2: Create InventoryPanel.css styles** - `ca76216` (feat)
3. **Task 3: Wire InventoryPanel into GameUI** - `fef8404` (feat)

## Files Created/Modified
- `apps/web/src/ui/constants.ts` - RARITY_COLORS Record<ItemRarity, string> mapping
- `apps/web/src/ui/panels/InventoryPanel.tsx` - 20-slot sortable grid, SortableSlot, context menu
- `apps/web/src/ui/panels/InventoryPanel.css` - Grid layout, rarity border, slot, context menu styles
- `apps/web/src/ui/GameUI.tsx` - Added InventoryPanel import and showInventory conditional render
- `package.json` - Added @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities, immer
- `pnpm-lock.yaml` - Updated lockfile

## Decisions Made
- Non-optimistic reorder: pendingReorder blocks grid pointer events until server confirms via inventory:update which calls setInventory (resets pendingReorder to false)
- Slot array uses fixed-size Array.from({length: maxSlots}) with slot-index lookup, giving correct empty slots without relying on sparse array quirks

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Installed missing @dnd-kit dependencies**
- **Found during:** Task 1 (InventoryPanel component creation)
- **Issue:** @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities not in package.json; build would fail
- **Fix:** Ran `pnpm add -w @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities`
- **Files modified:** package.json, pnpm-lock.yaml
- **Verification:** Build passes after install
- **Committed in:** bdd408d (Task 1 commit)

**2. [Rule 3 - Blocking] Installed missing immer peer dependency**
- **Found during:** Task 3 verification build
- **Issue:** zustand/middleware/immer requires immer as peer dep; build failed with "produce is not exported by vite-optional-peer-dep:immer:zustand"
- **Fix:** Ran `pnpm add -w immer`
- **Files modified:** package.json, pnpm-lock.yaml
- **Verification:** Build passes (✓ built in 2.79s)
- **Committed in:** bdd408d (Task 1 commit, included with dnd-kit install)

---

**Total deviations:** 2 auto-fixed (both Rule 3 - Blocking missing dependencies)
**Impact on plan:** Both installs essential for functionality. No scope creep.

## Issues Encountered
- Build cache from prior plan masked the immer peer dependency error; only surfaced on fresh build after adding InventoryPanel and inventoryStore to the bundle

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- InventoryPanel renders in GameUI when showInventory toggles
- All socket emits (inventory:reorder, inventory:use, inventory:drop) wired to gameSocket
- Ready for Phase 27 Plan 03 (action bar / hotbar UI)

---
*Phase: 27-client-state-inventory-panel-ui*
*Completed: 2026-02-17*
