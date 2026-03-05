# Plan 121-04 Summary: Client Automation Panel, Loot Window, and Stores

## Status: COMPLETE

## What was built

### automationStore.ts (new)
- Zustand store with `structures`, `lootWindow`, `activeTab` state
- Side-effect socket handlers for: `automation:panel_state`, `automation:loot_window`, `automation:collected`, `automation:refueled`, `automation:status_update`, `automation:dismantled`
- `requestPanelUpdate()` emits `automation:panel_request` to server

### AutomationPanel.tsx + AutomationPanel.css (new)
- Tabbed panel with 4 tabs: Extractors, Beacons, Planetary, Refineries
- Structure list rows with status dot, name, location, fuel bar, accumulated count badge, durability
- Deploy button (disabled at max, emits `automation:deploy` at player position)
- Uses `useDraggablePanel` and `useModalStack` hooks

### LootWindow.tsx + LootWindow.css (new)
- Overlay modal triggered by `automation:loot_window` server event
- Accumulated resources list with item icons and quantities
- Collect/Loot button (any player can loot - PvP mechanic)
- Fuel gauge with refuel button (owner only)
- Recipe progress bar (refinery only)
- Durability bar
- Dismantle with two-step confirmation (owner only)

### GameUI.tsx (modified)
- Added side-effect import for automationStore
- Added AutomationPanel and LootWindow conditional renders
- Destructured `showAutomation` from gameStore, `lootWindow` from automationStore

### HUD.tsx (modified)
- Added J keyboard shortcut for automation panel toggle
- Uses modal stack guard pattern (same as L for combat log, Q for quest log)

### gameStore.ts (modified)
- Added `showAutomation: boolean` and `toggleAutomation: () => void`

### socket.ts (modified)
- Added 7 automation events to serverEvents array

### effects.ts (fixed)
- Added `deploy` case to exhaustive switch in `resolveEffect()` (returns empty applied object)

### automation.service.ts (fixed)
- Replaced `uuid` package import with `crypto.randomUUID()` (project convention)
- Fixed DeployableEntity construction to use `position: { x, y, zoneId }` instead of flat `x`/`y`

## Verification
- `npx tsc --noEmit -p apps/web/tsconfig.app.json` — clean
- `npx tsc --noEmit -p apps/game-server/tsconfig.app.json` — clean
- `npx tsc --noEmit -p packages/game-logic/tsconfig.json` — clean
