---
phase: 56-core-ability-system
plan: "03"
subsystem: web/ability-ui
tags: [abilities, ui, action-bar, cooldowns, client-state]

# Dependency graph
requires:
  - phase: 56-01
    provides: AbilityDefinition, AbilityRegistry, grantedAbilities on items
  - phase: 56-02
    provides: ability:use, ability:result, ability:cooldown socket events
  - phase: 06
    provides: ItemRegistry and equipment system
provides:
  - abilityStore for client-side cooldown tracking
  - getEquippedAbilities() derivation function
  - ActionBar showing abilities with radial cooldown overlays
  - Target selection without auto-attack
affects: [action-bar-ui, combat-flow, target-selection]

# Tech tracking
tech-stack:
  added: [abilityStore]
  patterns:
    - Derived state from equipment for ability display
    - Radial cooldown overlay using conic-gradient
    - Decoupled target selection from combat initiation
    - Module-level socket event wiring

key-files:
  created:
    - apps/web/src/store/abilityStore.ts
  modified:
    - apps/web/src/network/socket.ts
    - apps/web/src/ui/hud/ActionBar.tsx
    - apps/web/src/ui/hud/ActionBar.css
    - apps/web/src/store/combatStore.ts
    - apps/web/src/game/scenes/WorldScene.ts

key-decisions:
  - "Abilities replace items in action bar (consumables will get separate UI later)"
  - "getEquippedAbilities() is pure function, not stored in state to avoid staleness"
  - "Cooldown progress updates at 50ms interval for smooth radial animation"
  - "Target selection no longer triggers auto-attack; player uses abilities via hotkeys"
  - "Creature aggro still triggers combat:start for defensive combat"

patterns-established:
  - "Module-level socket event listeners for store updates"
  - "Derived state functions (getEquippedAbilities) prevent sync issues"
  - "Conic-gradient for radial cooldown overlays (360deg sweep)"
  - "selectedTarget separate from inCombat for ability targeting"

# Metrics
duration: 273s
completed: 2026-02-20
---

# Phase 56 Plan 03: Client Ability UI Summary

**Client-side ability state management with action bar showing abilities, cooldown overlays, and decoupled target selection**

## Performance

- **Duration:** 4min 33s
- **Started:** 2026-02-20T18:28:51Z
- **Completed:** 2026-02-20T18:33:24Z
- **Tasks:** 3
- **Files created:** 1
- **Files modified:** 5
- **Commits:** 3

## Accomplishments

- Created abilityStore with cooldown tracking (setCooldown, isOnCooldown, getRemainingCooldown, clearExpiredCooldowns)
- Built getEquippedAbilities() pure function to derive abilities from equipped tool/suit/modules
- Replaced item-based ActionBar with ability-based ActionBar showing abilities from equipment
- Implemented radial cooldown overlay using conic-gradient (360deg sweep based on remaining time)
- Added energy insufficiency visual state (blue overlay when player lacks energy)
- Decoupled target selection from combat initiation (click to select, hotkey to use ability)
- Wired ability:result and ability:cooldown socket events for server-authoritative cooldown updates
- Registered ability socket events in gameSocket serverEvents array
- Updated combatStore with selectedTarget field for ability targeting

## What Was Built

### abilityStore (115 lines)

**State management:**
- `cooldowns` Map<string, number> - abilityId -> endsAt timestamp
- `setCooldown(abilityId, endsAt)` - Set cooldown from server events
- `isOnCooldown(abilityId)` - Check if ability is currently on cooldown
- `getRemainingCooldown(abilityId)` - Get remaining cooldown in ms (0 if not on cooldown)
- `clearExpiredCooldowns()` - Periodic cleanup of expired cooldowns (runs every 1 second)

**Derived state:**
- `getEquippedAbilities()` - Pure function that resolves abilities from equipped items (tool, exosuit, modules)

**Socket event wiring (module level):**
- `ability:result` - Set cooldown when ability use succeeds
- `ability:cooldown` - Update cooldown from server

### ActionBar (136 lines)

**Components:**
- `AbilitySlot` - Displays single ability with icon, cooldown overlay, energy state, hotkey label
- `ActionBar` - 8-slot bar showing abilities from getEquippedAbilities(), handles hotkeys 1-8

**Features:**
- Radial cooldown overlay using conic-gradient (360deg * progress for smooth sweep animation)
- Energy insufficiency overlay (blue tint when player.energy < ability.energyCost)
- Tooltip with ability name, description, energy cost, cooldown duration
- Click or hotkey to emit ability:use with selected target
- Cooldown progress updates at 50ms interval for smooth animation

### Target Selection (combatStore)

**New fields:**
- `selectedTarget` - Entity selected for ability use (separate from inCombat)
- `selectTarget(entityId)` - Select target without starting combat

**Behavior changes:**
- Clicking creature selects it (shows highlight) but does NOT emit combat:start
- Creature aggro (when creature attacks player first) still sets selectedTarget automatically
- selectedTarget cleared when target becomes inactive (killed/despawned)

## Deviations from Plan

None - plan executed exactly as written.

## Integration Points

**Depends On:**
- AbilityDefinition, AbilityRegistry from @into-the-void/game-logic (phase 56-01)
- ability:use, ability:result, ability:cooldown events from shared-types (phase 56-02)
- ItemRegistry, equipment system from @into-the-void/items (phase 06)
- Energy stat from player state (phase 07)

**Provides For:**
- Future: Ability tooltips with more details (range, cooldown, effects)
- Future: Consumable bar separate from ability bar
- Future: Ability queueing/combo system

**Affects:**
- Action bar now shows abilities instead of items (items will need separate consumable bar)
- Combat flow: player clicks to select, uses abilities via hotkeys (no auto-attack on click)
- Target highlighting: still works but doesn't trigger combat

## Task Commits

1. **ac0b27c** - `feat(56-03): create abilityStore with cooldown tracking`
2. **2a47c84** - `feat(56-03): update ActionBar to show abilities with radial cooldown`
3. **fa85ab9** - `feat(56-03): decouple target selection from auto-attack`

## Files Created

### `/apps/web/src/store/abilityStore.ts` (115 lines)

Client-side ability state management with cooldown tracking and equipment derivation.

**Key exports:**
- `useAbilityStore` - Zustand store with cooldown map and methods
- `getEquippedAbilities()` - Pure function to derive abilities from current equipment

**Socket event listeners:**
- `ability:result` - Update cooldown when ability succeeds
- `ability:cooldown` - Update cooldown from server-pushed events

**Cleanup:**
- setInterval every 1 second to remove expired cooldowns from map

## Files Modified

### `/apps/web/src/network/socket.ts`

Added `ability:result` and `ability:cooldown` to serverEvents array for event registration.

### `/apps/web/src/ui/hud/ActionBar.tsx`

Complete rewrite from item-based to ability-based action bar:
- Shows abilities from getEquippedAbilities() instead of inventory items
- AbilitySlot component with cooldown progress state (updates every 50ms)
- Radial cooldown overlay using conic-gradient CSS
- Energy insufficiency visual state (blue overlay)
- Hotkey handler (1-8) emits ability:use with selectedTarget
- Tooltip shows ability name, description, energy cost, cooldown

### `/apps/web/src/ui/hud/ActionBar.css`

Updated class names and styles for ability-based UI:
- `.action-bar` container (8px padding, border)
- `.ability-slot` (48x48px, cursor pointer)
- `.ability-key` (hotkey label, top-left)
- `.ability-icon` (colored background from ability.iconColor)
- `.ability-cooldown-overlay` (conic-gradient radial sweep)
- `.ability-no-energy` (blue overlay for insufficient energy)

### `/apps/web/src/store/combatStore.ts`

Added selectedTarget field and selectTarget method:
- `selectedTarget` field for ability targeting (separate from inCombat)
- `selectTarget(entityId)` method to select target without auto-attacking
- Updated combat:start listener to set selectedTarget when entering combat
- Updated entity:update listener to clear selectedTarget when target becomes inactive

### `/apps/web/src/game/scenes/WorldScene.ts`

Changed handleEntityClick to select target without auto-attacking:
- Removed combat:start emit
- Removed range/weapon checks (abilities have their own range validation)
- Calls useCombatStore.getState().selectTarget(entityId)
- Keeps target highlight behavior
- Creature aggro still works via server-side combat:start events

## Technical Decisions

**Ability bar replaces item bar:** Items (consumables, tools) will need separate UI in future phases. Abilities are the primary action bar content for combat-focused gameplay.

**Pure derivation function:** getEquippedAbilities() is NOT stored in state to avoid staleness. It derives abilities from inventoryStore.inventory.equipment on every render. This ensures UI always reflects current equipment.

**50ms cooldown update interval:** Balances smooth animation with performance. 360deg radial sweep provides clear visual feedback.

**selectedTarget vs targetEntityId:** selectedTarget is for ability targeting (manual selection). targetEntityId is for combat state (when in active combat). They sync when combat starts, but selectedTarget can exist without inCombat.

**Module-level socket listeners:** abilityStore wires socket events at module level (not in component) to ensure cooldown updates happen regardless of component mount state.

## Verification

All success criteria met:

1. `pnpm exec nx run web:build` succeeds - PASSED
2. ActionBar shows abilities from equipped items (not inventory items) - IMPLEMENTED (getEquippedAbilities derives from equipment)
3. Clicking a creature selects it (visible in TargetFrame) but does NOT start auto-attack - IMPLEMENTED (selectTarget called, no combat:start emit)
4. Pressing 1-8 uses abilities on selected target - IMPLEMENTED (hotkey handler emits ability:use with targetEntityId)
5. Cooldown shows as radial sweep overlay on ability icon - IMPLEMENTED (conic-gradient with 360deg * progress)
6. Abilities with insufficient energy show disabled visual state - IMPLEMENTED (blue overlay when player.energy < ability.energyCost)

## Self-Check: PASSED

**Files Created:**
- FOUND: `/apps/web/src/store/abilityStore.ts` (115 lines, exports useAbilityStore and getEquippedAbilities)

**Files Modified:**
- FOUND: `apps/web/src/network/socket.ts` (ability:result, ability:cooldown in serverEvents)
- FOUND: `apps/web/src/ui/hud/ActionBar.tsx` (ability-based UI with cooldown overlays)
- FOUND: `apps/web/src/ui/hud/ActionBar.css` (ability slot styles with radial overlay)
- FOUND: `apps/web/src/store/combatStore.ts` (selectedTarget field and selectTarget method)
- FOUND: `apps/web/src/game/scenes/WorldScene.ts` (handleEntityClick uses selectTarget, no combat:start)

**Commits:**
- FOUND: ac0b27c (abilityStore)
- FOUND: 2a47c84 (ActionBar with radial cooldown)
- FOUND: fa85ab9 (decouple target selection)

**Build Verification:**
- `pnpm exec nx run web:build` - PASSED (all 3 task commits built successfully)

All claimed files exist, all commits present in git history, builds passing. Ready for testing and next phase.

---
*Phase: 56-core-ability-system*
*Completed: 2026-02-20*
