# Phase 98: Second Action Bar - Research

**Researched:** 2026-02-26
**Domain:** React UI Components, Keyboard Event Handling, CSS Layout
**Confidence:** HIGH

## Summary

Phase 98 adds a second action bar with 8 additional ability slots using Shift+1-8 keybindings, while reorganizing the HUD to accommodate both bars. The existing ActionBar component from Phase 97 provides all required functionality (click-to-trigger, Shift+drag relocation, cross-component drag, drop-outside removal) which can be reused via shared components or props-based configuration.

The main challenges are: (1) detecting Shift+number key combinations without conflicting with existing 1-8 shortcuts for the first bar, (2) managing two separate ability slot arrays in the store while maintaining localStorage persistence, and (3) reorganizing the HUD layout to move game shortcuts (Inventory, Equipment, Abilities, Quests, Chat buttons) to the bottom-right near the minimap.

The existing codebase already handles most complexity - the ActionBar component, actionBarStore with persistence, @dnd-kit integration, and keyboard event handling are all in place. This phase primarily involves component extraction, store extension, and CSS layout changes.

**Primary recommendation:** Extract reusable `ActionBarSlot` component from existing ActionBar, create `SecondActionBar` component using same patterns, extend `actionBarStore` with secondary slots array, add Shift+number detection to keyboard handler, and reorganize HUD with CSS Grid/Flexbox for new layout.

## Standard Stack

### Core (Already Exists)
| Component | Version | Purpose | Why Standard |
|-----------|---------|---------|--------------|
| React | 18.x | UI component framework | Established in codebase |
| Zustand | 4.x | State management with persistence | Already used for actionBarStore |
| @dnd-kit/core | 6.3.1 | Drag and drop infrastructure | Already integrated, Phase 97 patterns |
| @dnd-kit/sortable | 10.0.0 | Sortable list behavior | Used by existing ActionBar |
| CSS Variables | -- | Theming (--color-bg-*, --color-accent) | Project standard |

### Supporting (Already Exists)
| Component | Location | Purpose |
|-----------|----------|---------|
| ActionBar | `apps/web/src/ui/hud/ActionBar.tsx` | First action bar with all Phase 97 patterns |
| actionBarStore | `apps/web/src/store/actionBarStore.ts` | State management with localStorage persistence |
| HUD | `apps/web/src/ui/hud/HUD.tsx` | Parent layout component |
| GameUI | `apps/web/src/ui/GameUI.tsx` | Top-level DndContext provider |
| AbilitiesPanel | `apps/web/src/ui/panels/AbilitiesPanel.tsx` | Drag source for abilities |

### No New Dependencies Required
All functionality can be implemented with existing libraries.

## Architecture Patterns

### Recommended Component Structure

```
apps/web/src/
  ui/hud/
    ActionBar.tsx              # Modify: extract reusable slot, accept barIndex prop
    ActionBar.css              # Modify: add second bar styles
    SecondActionBar.tsx        # NEW: Second bar using shared patterns
    HUD.tsx                    # Modify: new layout with shortcuts moved
    HUD.css                    # Modify: CSS Grid layout, smaller shortcuts
    GameShortcuts.tsx          # NEW: Extracted shortcuts component
  store/
    actionBarStore.ts          # Modify: add secondaryAbilityOrder array
```

### Pattern 1: Shared ActionBar Component with Bar Index

**What:** Use single ActionBar component for both bars, differentiated by `barIndex` prop.

**Why:** Avoids code duplication, ensures both bars have identical behavior.

**Implementation:**
```typescript
// ActionBar.tsx
interface ActionBarProps {
  barIndex: 0 | 1;  // 0 = primary (1-8), 1 = secondary (Shift+1-8)
}

export const ActionBar: React.FC<ActionBarProps> = ({ barIndex }) => {
  const {
    abilityOrder,
    secondaryAbilityOrder,
    swapAbilitySlots,
    assignAbility,
    removeAbilityFromSlot
  } = useActionBarStore();

  // Select correct order array based on barIndex
  const currentOrder = barIndex === 0 ? abilityOrder : secondaryAbilityOrder;

  // Slot IDs include bar index to prevent DnD ID collisions
  const slotIds = useMemo(() =>
    Array.from({ length: 8 }, (_, i) => `bar-${barIndex}-slot-${i}`),
    [barIndex]
  );

  // ... rest of component uses currentOrder and slotIds
};
```

**Alternative considered:** Two separate components. Rejected because it would duplicate ~300 lines of code and require syncing changes.

### Pattern 2: Keyboard Shortcut with Shift Detection

**What:** First bar responds to 1-8, second bar responds to Shift+1-8.

**Why:** Standard MMO keybinding pattern, non-conflicting shortcuts.

**Implementation:**
```typescript
// In ActionBar.tsx keyboard handler
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    if (e.repeat) return;

    const slotIndex = parseInt(e.key, 10) - 1;
    if (isNaN(slotIndex) || slotIndex < 0 || slotIndex >= 8) return;

    // Determine which bar based on Shift key
    const targetBarIndex = e.shiftKey ? 1 : 0;

    // Only this bar handles if barIndex matches
    if (targetBarIndex !== barIndex) return;

    const ability = slots[slotIndex];
    if (!ability) return;
    if (isOnCooldown(ability.id)) return;
    if (!player || player.energy < ability.energyCost) return;

    gameSocket.emit('ability:use', {
      abilityId: ability.id,
      targetEntityId: ability.requiresTarget ? targetEntityId ?? undefined : undefined,
    });
  };

  document.addEventListener('keydown', handleKeyDown);
  return () => document.removeEventListener('keydown', handleKeyDown);
}, [barIndex, slots, targetEntityId, player, isOnCooldown]);
```

**Key insight:** Each ActionBar instance registers its own keydown handler, but only responds when `e.shiftKey` matches its `barIndex`. No central coordination needed.

### Pattern 3: Store Extension for Secondary Slots

**What:** Add `secondaryAbilityOrder` array to actionBarStore with same structure as primary.

**Why:** Parallel structure, same persistence pattern, minimal code changes.

**Implementation:**
```typescript
// actionBarStore.ts
const SECONDARY_ORDER_STORAGE_KEY = 'action_bar_secondary_ability_order';

interface ActionBarState {
  // Existing
  abilityOrder: (string | null)[];
  swapAbilitySlots: (fromIndex: number, toIndex: number) => void;
  assignAbility: (slotIndex: number, abilityId: string) => void;
  removeAbilityFromSlot: (slotIndex: number) => void;

  // NEW: Secondary bar
  secondaryAbilityOrder: (string | null)[];
  swapSecondaryAbilitySlots: (fromIndex: number, toIndex: number) => void;
  assignSecondaryAbility: (slotIndex: number, abilityId: string) => void;
  removeSecondaryAbilityFromSlot: (slotIndex: number) => void;
}
```

**Alternative considered:** Generalized `abilityOrders: Map<number, (string | null)[]>`. Rejected because only 2 bars needed, simpler to be explicit.

### Pattern 4: HUD Layout with CSS Grid

**What:** Use CSS Grid to position both action bars center-bottom, shortcuts bottom-right.

**Why:** Clean separation of layout concerns, responsive, easy to adjust.

**Current layout (from HUD.css):**
```css
.hud-bottom {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
```

**New layout:**
```css
/* HUD grid overlay */
.hud-bottom-area {
  position: absolute;
  bottom: 20px;
  left: 0;
  right: 0;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: end;
  padding: 0 20px;
}

/* Empty left spacer for symmetry */
.hud-bottom-area::before {
  content: '';
}

/* Action bars container - centered */
.action-bars-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

/* Game shortcuts - right aligned, near minimap */
.game-shortcuts {
  display: flex;
  gap: 6px;
  justify-self: end;
  margin-bottom: 180px; /* Align with minimap bottom (180px height + 20px gap) */
}
```

### Pattern 5: Smaller Shortcut Buttons

**What:** Reduce shortcut button size from 60x60px to 40x40px.

**Why:** Requirement HUD-01 specifies smaller shortcuts to free space for action bars.

**Implementation:**
```css
/* game-shortcut-btn replaces action-btn for menu shortcuts */
.game-shortcut-btn {
  width: 40px;
  height: 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: var(--color-bg-tertiary);
  border: 1px solid #3a3a4a;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  padding: 4px;
}

.game-shortcut-btn span {
  font-size: 14px;  /* Reduced from 20px */
  font-weight: 600;
  color: var(--color-text-primary);
}

.game-shortcut-btn label {
  font-size: 8px;   /* Reduced from 10px */
  color: var(--color-text-secondary);
  margin-top: 2px;
}
```

### Pattern 6: Key Label Display for Shift+N

**What:** Show "S1", "S2", etc. in secondary bar slot corners instead of "1", "2".

**Why:** Visual indication of Shift modifier, matches standard MMO conventions.

**Implementation:**
```typescript
// In ActionBarSlot component
const keyLabel = barIndex === 0 ? `${index + 1}` : `S${index + 1}`;

return (
  <div className="ability-slot">
    <span className="ability-key">{keyLabel}</span>
    {/* ... rest of slot */}
  </div>
);
```

### Anti-Patterns to Avoid

- **Duplicating ActionBar component:** Copy-paste creates maintenance burden. Use props to differentiate bars.
- **Single keyboard handler for both bars:** Creates tight coupling. Let each bar handle its own shortcuts.
- **Hardcoding bar positions:** Use CSS layout. Allows easy adjustment if third bar added later.
- **Separate DndContext per bar:** Would break cross-bar drag (future). Keep single GameUI DndContext.
- **Global Shift state tracking:** Unnecessary for this feature. Check `e.shiftKey` directly in handler.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Keyboard event handling | Custom key tracking system | Native `e.shiftKey` in keydown handler | Browser handles modifier key state |
| Drag and drop | Manual drag handlers | @dnd-kit (already integrated) | Handles all edge cases, accessibility |
| State persistence | Custom storage logic | Existing localStorage pattern in actionBarStore | Proven pattern, just duplicate structure |
| CSS layout | Absolute positioning math | CSS Grid | Clean, maintainable, responsive |
| Slot ID management | String concatenation | Template literals with barIndex | Prevents ID collisions between bars |

**Key insight:** This phase is mostly configuration and layout work. The hard problems (DnD, keyboard shortcuts, persistence) are already solved by Phase 97.

## Common Pitfalls

### Pitfall 1: DnD ID Collisions Between Bars

**What goes wrong:** Dragging in bar 1 affects bar 0 because slot IDs are "slot-0", "slot-1", etc. in both.

**Why it happens:** Both bars use same ID pattern without bar index prefix.

**How to avoid:** Include bar index in slot IDs:
```typescript
const slotIds = useMemo(() =>
  Array.from({ length: 8 }, (_, i) => `bar-${barIndex}-slot-${i}`),
  [barIndex]
);
```

**Warning signs:** Dragging ability in one bar causes visual glitches in other bar, wrong slots swap.

### Pitfall 2: Keyboard Handler Runs Twice

**What goes wrong:** Pressing "2" triggers ability in BOTH bars (one from bar 0, one from bar 1).

**Why it happens:** Both ActionBar instances register keydown handlers, neither checks if event applies to them.

**How to avoid:** Each handler checks `e.shiftKey` against `barIndex`:
```typescript
const targetBarIndex = e.shiftKey ? 1 : 0;
if (targetBarIndex !== barIndex) return;
```

**Warning signs:** Abilities fire twice, console shows duplicate socket emissions.

### Pitfall 3: Shift Key Conflicts with Drag Relocation

**What goes wrong:** Player presses Shift+2 to use secondary bar ability, but it initiates drag instead.

**Why it happens:** Shift+drag is already bound to slot relocation in Phase 97.

**How to avoid:** This is actually NOT a conflict:
- Shift+click (short press): Triggers keydown, fires ability
- Shift+drag (press and move 8px+): Activates drag sensor, enters drag mode

The 8px activation distance ensures keyboard and drag don't conflict. Document this behavior clearly.

### Pitfall 4: Secondary Bar Abilities Not Persisting

**What goes wrong:** Player arranges secondary bar, refreshes page, bar is empty.

**Why it happens:** Using primary bar's storage key for secondary bar, or forgetting to call save function.

**How to avoid:** Use distinct storage keys and ensure save is called:
```typescript
const SECONDARY_ORDER_STORAGE_KEY = 'action_bar_secondary_ability_order';

assignSecondaryAbility: (slotIndex: number, abilityId: string) =>
  set((state) => {
    if (slotIndex < 0 || slotIndex >= SLOT_COUNT) return;
    state.secondaryAbilityOrder[slotIndex] = abilityId;
    saveSecondaryOrderToStorage(state.secondaryAbilityOrder as (string | null)[]);
  }),
```

**Warning signs:** Primary bar persists but secondary doesn't, localStorage shows only one key.

### Pitfall 5: Cross-Component Drag Doesn't Work with Second Bar

**What goes wrong:** Dragging ability from AbilitiesPanel to second bar slot does nothing.

**Why it happens:** GameUI.handleDragEnd only checks for `slot-*` pattern, not `bar-1-slot-*`.

**How to avoid:** Update GameUI handler to parse bar index from slot ID:
```typescript
// In GameUI.handleDragEnd
if (dragData?.type === 'ability' && overId.includes('-slot-')) {
  // Parse: "bar-0-slot-3" or "bar-1-slot-5"
  const match = overId.match(/bar-(\d+)-slot-(\d+)/);
  if (match) {
    const [, barIndex, slotIndex] = match;
    const store = useActionBarStore.getState();

    if (barIndex === '0') {
      store.assignAbility(parseInt(slotIndex, 10), abilityId);
    } else {
      store.assignSecondaryAbility(parseInt(slotIndex, 10), abilityId);
    }
  }
  return;
}
```

**Warning signs:** Primary bar accepts drops, secondary bar doesn't highlight or accept.

### Pitfall 6: Layout Breaks at Narrow Viewports

**What goes wrong:** Two action bars overlap or push shortcuts off screen on smaller displays.

**Why it happens:** Fixed positioning doesn't account for combined width of bars and shortcuts.

**How to avoid:** Use CSS Grid with proper constraints, test at 1024px minimum:
```css
.hud-bottom-area {
  min-width: 1024px; /* Ensure minimum layout width */
}

@media (max-width: 1200px) {
  .game-shortcuts label {
    display: none; /* Hide labels on smaller screens */
  }
}
```

**Warning signs:** UI elements overlap, shortcuts disappear, bars stack incorrectly.

## Code Examples

### Extended Action Bar Store

```typescript
// apps/web/src/store/actionBarStore.ts (modifications)

const SECONDARY_ORDER_STORAGE_KEY = 'action_bar_secondary_ability_order';

function loadSecondaryOrderFromStorage(): (string | null)[] {
  try {
    const raw = localStorage.getItem(SECONDARY_ORDER_STORAGE_KEY);
    if (!raw) return Array(SLOT_COUNT).fill(null);
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return Array(SLOT_COUNT).fill(null);
    const normalized: (string | null)[] = Array(SLOT_COUNT).fill(null);
    for (let i = 0; i < SLOT_COUNT; i++) {
      const val = parsed[i];
      normalized[i] = typeof val === 'string' ? val : null;
    }
    return normalized;
  } catch {
    return Array(SLOT_COUNT).fill(null);
  }
}

function saveSecondaryOrderToStorage(order: (string | null)[]): void {
  try {
    localStorage.setItem(SECONDARY_ORDER_STORAGE_KEY, JSON.stringify(order));
  } catch {
    // Silently fail if localStorage is unavailable
  }
}

interface ActionBarState {
  // ... existing state ...

  // Secondary bar (NEW)
  secondaryAbilityOrder: (string | null)[];
  setSecondaryAbilityOrder: (order: (string | null)[]) => void;
  swapSecondaryAbilitySlots: (fromIndex: number, toIndex: number) => void;
  assignSecondaryAbility: (slotIndex: number, abilityId: string) => void;
  removeSecondaryAbilityFromSlot: (slotIndex: number) => void;
}

export const useActionBarStore = create<ActionBarState>()(
  immer((set) => ({
    // ... existing state ...

    // Secondary bar state and actions
    secondaryAbilityOrder: loadSecondaryOrderFromStorage(),

    setSecondaryAbilityOrder: (order: (string | null)[]) =>
      set((state) => {
        state.secondaryAbilityOrder = order;
        saveSecondaryOrderToStorage(order);
      }),

    swapSecondaryAbilitySlots: (fromIndex: number, toIndex: number) =>
      set((state) => {
        if (fromIndex < 0 || fromIndex >= SLOT_COUNT) return;
        if (toIndex < 0 || toIndex >= SLOT_COUNT) return;
        if (fromIndex === toIndex) return;

        const temp = state.secondaryAbilityOrder[fromIndex];
        state.secondaryAbilityOrder[fromIndex] = state.secondaryAbilityOrder[toIndex];
        state.secondaryAbilityOrder[toIndex] = temp;

        saveSecondaryOrderToStorage(state.secondaryAbilityOrder as (string | null)[]);
      }),

    assignSecondaryAbility: (slotIndex: number, abilityId: string) =>
      set((state) => {
        if (slotIndex < 0 || slotIndex >= SLOT_COUNT) return;
        state.secondaryAbilityOrder[slotIndex] = abilityId;
        saveSecondaryOrderToStorage(state.secondaryAbilityOrder as (string | null)[]);
      }),

    removeSecondaryAbilityFromSlot: (slotIndex: number) =>
      set((state) => {
        if (slotIndex < 0 || slotIndex >= SLOT_COUNT) return;
        state.secondaryAbilityOrder[slotIndex] = null;
        saveSecondaryOrderToStorage(state.secondaryAbilityOrder as (string | null)[]);
      }),
  }))
);
```

### ActionBar Component with barIndex Prop

```typescript
// apps/web/src/ui/hud/ActionBar.tsx (key modifications)

interface ActionBarProps {
  barIndex: 0 | 1;
}

export const ActionBar: React.FC<ActionBarProps> = ({ barIndex }) => {
  const {
    abilityOrder,
    secondaryAbilityOrder,
    swapAbilitySlots,
    swapSecondaryAbilitySlots,
    assignAbility,
    assignSecondaryAbility,
    removeAbilityFromSlot,
    removeSecondaryAbilityFromSlot,
    setAbilityOrder,
    setSecondaryAbilityOrder,
  } = useActionBarStore();

  // Select correct state based on barIndex
  const currentOrder = barIndex === 0 ? abilityOrder : secondaryAbilityOrder;
  const setCurrentOrder = barIndex === 0 ? setAbilityOrder : setSecondaryAbilityOrder;
  const swapSlots = barIndex === 0 ? swapAbilitySlots : swapSecondaryAbilitySlots;
  const removeFromSlot = barIndex === 0 ? removeAbilityFromSlot : removeSecondaryAbilityFromSlot;

  // Unique slot IDs per bar to prevent DnD collisions
  const slotIds = useMemo(() =>
    Array.from({ length: SLOT_COUNT }, (_, i) => `bar-${barIndex}-slot-${i}`),
    [barIndex]
  );

  // Keyboard shortcuts - only respond when Shift matches barIndex
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.repeat) return;

      const slotIndex = parseInt(e.key, 10) - 1;
      if (isNaN(slotIndex) || slotIndex < 0 || slotIndex >= SLOT_COUNT) return;

      // Bar 0 responds to 1-8, Bar 1 responds to Shift+1-8
      const targetBarIndex = e.shiftKey ? 1 : 0;
      if (targetBarIndex !== barIndex) return;

      // ... ability triggering logic ...
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [barIndex, slots, targetEntityId, player, isOnCooldown]);

  // ... rest of component
};
```

### Key Label for Shift+N Slots

```typescript
// In SortableAbilitySlot component
interface SortableAbilitySlotProps {
  index: number;
  ability: AbilityDefinition | null;
  slotId: string;
  shiftHeld: boolean;
  barIndex: 0 | 1;  // NEW prop
}

function SortableAbilitySlot({ index, ability, slotId, shiftHeld, barIndex }: SortableAbilitySlotProps) {
  // ...

  // Display "1-8" for primary bar, "S1-S8" for secondary
  const keyLabel = barIndex === 0 ? `${index + 1}` : `S${index + 1}`;

  return (
    <div className="ability-slot" /* ... */>
      <span className="ability-key">{keyLabel}</span>
      {/* ... */}
    </div>
  );
}
```

### Updated HUD Layout

```tsx
// apps/web/src/ui/hud/HUD.tsx (key sections)

export const HUD: React.FC = () => {
  // ... existing state ...

  return (
    <div className="hud">
      {/* Top-left player info (unchanged) */}
      <div className="hud-top-left">
        {/* ... */}
      </div>

      <CombatLog />

      {/* NEW: Bottom area with grid layout */}
      <div className="hud-bottom-area">
        {/* Action bars container - centered */}
        <div className="action-bars-container">
          <ActionBar barIndex={0} />
          <ActionBar barIndex={1} />
        </div>

        {/* Game shortcuts - right side near minimap */}
        <GameShortcuts />
      </div>

      {/* Minimap and indicators (unchanged positions) */}
      {displayedBiome && <div className="biome-indicator">...</div>}
      <TargetFrame />
      <div className="hud-minimap" aria-label="Minimap" />
    </div>
  );
};
```

### GameShortcuts Component

```tsx
// apps/web/src/ui/hud/GameShortcuts.tsx (NEW file)
import React from 'react';
import { useGameStore } from '../../store/gameStore';

export const GameShortcuts: React.FC = () => {
  const {
    toggleInventory,
    toggleEquipment,
    toggleAbilities,
    toggleQuestLog,
    toggleChat,
  } = useGameStore();

  return (
    <div className="game-shortcuts">
      <button className="game-shortcut-btn" onClick={toggleInventory}>
        <span>I</span>
        <label>Inv</label>
      </button>
      <button className="game-shortcut-btn" onClick={toggleEquipment}>
        <span>E</span>
        <label>Equip</label>
      </button>
      <button className="game-shortcut-btn" onClick={toggleAbilities}>
        <span>K</span>
        <label>Skill</label>
      </button>
      <button className="game-shortcut-btn" onClick={toggleQuestLog}>
        <span>Q</span>
        <label>Quest</label>
      </button>
      <button className="game-shortcut-btn" onClick={toggleChat}>
        <span>C</span>
        <label>Chat</label>
      </button>
    </div>
  );
};
```

### CSS Layout for New HUD Bottom

```css
/* apps/web/src/ui/hud/HUD.css (new styles) */

/* Replace .hud-bottom with .hud-bottom-area */
.hud-bottom-area {
  position: absolute;
  bottom: 20px;
  left: 0;
  right: 0;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: end;
  padding: 0 20px;
  pointer-events: none;
}

.hud-bottom-area > * {
  pointer-events: auto;
}

/* Action bars stacked vertically, centered */
.action-bars-container {
  grid-column: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

/* Game shortcuts positioned bottom-right, near minimap */
.game-shortcuts {
  grid-column: 3;
  display: flex;
  gap: 6px;
  justify-self: end;
  align-self: end;
  margin-bottom: 0; /* Aligned with action bars bottom */
}

/* Smaller shortcut buttons (40x40 instead of 60x60) */
.game-shortcut-btn {
  width: 40px;
  height: 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: var(--color-bg-tertiary);
  border: 1px solid #3a3a4a;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  padding: 2px;
}

.game-shortcut-btn:hover {
  background-color: #2a2a3a;
  border-color: var(--color-accent);
}

.game-shortcut-btn span {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.game-shortcut-btn label {
  font-size: 8px;
  color: var(--color-text-secondary);
  margin-top: 1px;
}
```

### Updated GameUI Drop Handler

```typescript
// apps/web/src/ui/GameUI.tsx (modified handleDragEnd)

const handleDragEnd = (event: DragEndEvent) => {
  const pendingReorder = useInventoryStore.getState().pendingReorder;
  if (pendingReorder) return;
  const { active, over } = event;
  if (!over) return;

  const overId = String(over.id);
  const activeId = String(active.id);
  const dragData = active.data.current;

  // Ability from panel to action bar slot (supports both bars)
  if (dragData?.type === 'ability' && overId.includes('-slot-')) {
    const match = overId.match(/bar-(\d+)-slot-(\d+)/);
    if (match) {
      const barIndex = parseInt(match[1], 10);
      const slotIndex = parseInt(match[2], 10);
      const abilityId = dragData.abilityId;

      if (!isNaN(slotIndex) && slotIndex >= 0 && slotIndex < 8) {
        const store = useActionBarStore.getState();
        if (barIndex === 0) {
          store.assignAbility(slotIndex, abilityId);
        } else {
          store.assignSecondaryAbility(slotIndex, abilityId);
        }
      }
    }
    return;
  }

  // ... rest of existing handlers unchanged ...
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single action bar | Two action bars with Shift modifier | Phase 98 (this phase) | 16 total ability slots |
| Large shortcuts (60x60) | Compact shortcuts (40x40) | Phase 98 | More HUD space for bars |
| Shortcuts in center bottom | Shortcuts bottom-right near minimap | Phase 98 | Cleaner layout |
| Separate DnD contexts | Single shared GameUI DndContext | Phase 29/97 | Cross-component drag |

**Current patterns (as of Phase 97):**
- ActionBar with 8 slots, click-to-trigger, Shift+drag relocation
- @dnd-kit with 8px activation distance
- Zustand + localStorage for persistence
- Cross-component drag from AbilitiesPanel

**This phase adds:**
- Second ActionBar instance with `barIndex` prop
- Shift+1-8 keybindings for secondary bar
- Extended store with secondary ability order
- Reorganized HUD layout with CSS Grid

## Open Questions

1. **Should abilities be allowed in both bars simultaneously?**
   - What we know: Current store allows same abilityId in multiple slots within one bar
   - What's unclear: Should same ability appear in both primary AND secondary bar?
   - Recommendation: Allow it. Players may want Quick Fireball on "2" and "S2" for different combat situations. No deduplication needed.

2. **Visual differentiation between bars?**
   - What we know: Primary bar at top, secondary below with "S1-S8" labels
   - What's unclear: Should bars have different border colors or backgrounds?
   - Recommendation: Keep identical styling except key labels. Consistent appearance reduces cognitive load. Labels provide sufficient differentiation.

3. **Should drop-outside-to-remove work for secondary bar?**
   - What we know: Phase 97 implemented this for primary bar
   - What's unclear: Should secondary bar have same behavior?
   - Recommendation: Yes, identical behavior. Users expect consistency. Implementation: check `bar-1-slot-*` pattern in addition to `bar-0-slot-*`.

4. **Minimap position relative to shortcuts?**
   - What we know: Minimap is 180x180 at bottom-right, shortcuts move to be "near" minimap
   - What's unclear: Exact positioning - above minimap? Left of minimap?
   - Recommendation: Shortcuts LEFT of minimap, vertically centered with minimap. Allows quick eye movement between map and shortcuts.

## Sources

### Primary (HIGH confidence)
- Existing codebase:
  - `apps/web/src/ui/hud/ActionBar.tsx` - Current implementation, all patterns
  - `apps/web/src/store/actionBarStore.ts` - State management, persistence pattern
  - `apps/web/src/ui/GameUI.tsx` - DndContext setup, cross-component drag
  - `apps/web/src/ui/hud/HUD.tsx` - Current layout structure
  - `apps/web/src/ui/hud/HUD.css` - Current layout CSS
- Phase 97 documentation:
  - `97-RESEARCH.md` - @dnd-kit patterns, keyboard handling
  - `97-01-SUMMARY.md` - Click-to-trigger, Shift+drag implementation
  - `97-02-SUMMARY.md` - Cross-component drag, drop-outside-to-remove
- Project requirements:
  - `.planning/REQUIREMENTS.md` - ABAR-05, ABAR-06, HUD-01, HUD-02, HUD-03

### Secondary (MEDIUM confidence)
- CSS Grid documentation - Standard web platform feature, well-documented
- React event handling - Standard React patterns for keyboard events

### Tertiary (LOW confidence)
- None - all patterns verified in existing codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already integrated, versions confirmed
- Architecture: HIGH - Direct extension of proven Phase 97 patterns
- Keyboard handling: HIGH - Standard `e.shiftKey` browser API
- Layout changes: HIGH - Standard CSS Grid, low complexity
- Store extension: HIGH - Mirror of existing pattern
- Pitfalls: MEDIUM - Based on anticipated integration issues, not observed problems

**Research date:** 2026-02-26
**Valid until:** 2026-04-26 (stable patterns, no external dependencies changing)
