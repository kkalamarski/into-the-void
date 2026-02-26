# Phase 97: Action Bar UX Enhancement - Research

**Researched:** 2026-02-26
**Domain:** React Drag and Drop, UX Interactions, @dnd-kit Library
**Confidence:** HIGH

## Summary

Phase 97 enhances the action bar with intuitive drag-and-drop management and click-to-trigger functionality. The codebase already uses @dnd-kit v6.3.1 extensively for inventory, equipment, and action bar dragging, providing a solid foundation.

Current implementation has drag-based ability slot swapping but lacks:
1. Click-to-trigger on action bar slots (only keyboard shortcuts work)
2. Shift+drag for relocation (currently any drag swaps)
3. Drag from abilities panel to action bar (abilities panel has draggables but no drop handling)
4. Drop-outside-to-remove pattern

The core challenge is differentiating click vs drag behavior on the same element while handling keyboard modifiers (Shift) during drag operations. @dnd-kit supports this through activation constraints and the exposed `activatorEvent` property in `DragStartEvent`.

**Primary recommendation:** Use PointerSensor with activation constraints to enable click-to-trigger, detect Shift modifier via `activatorEvent.shiftKey` in `onDragStart`, implement cross-component drag from AbilitiesPanel to ActionBar via shared DndContext, and detect drop-outside via `over === null` in `onDragEnd`.

## Standard Stack

### Core (Already Exists)
| Component | Version | Purpose | Why Standard |
|-----------|---------|---------|--------------|
| @dnd-kit/core | 6.3.1 | Drag and drop context, sensors, events | Modern, lightweight, flexible React DnD toolkit |
| @dnd-kit/sortable | 10.0.0 | Sortable list patterns with useSortable hook | Official preset for list reordering |
| @dnd-kit/utilities | 3.2.2 | CSS transform utilities | Official companion utilities |
| React synthetic events | 18.x | Keyboard event access (shiftKey, ctrlKey) | Native browser event wrapper |
| Zustand | 4.x | Action bar state management | Established state pattern in codebase |

### Supporting Libraries
| Component | Location | Purpose |
|-----------|----------|---------|
| ActionBar component | `apps/web/src/ui/hud/ActionBar.tsx` | Displays 8 ability slots with drag-to-swap |
| AbilitiesPanel | `apps/web/src/ui/panels/AbilitiesPanel.tsx` | Shows equipped abilities, has draggables but no drop handling |
| GameUI DndContext | `apps/web/src/ui/GameUI.tsx` | Top-level DndContext wraps all UI components |
| actionBarStore | `apps/web/src/store/actionBarStore.ts` | Persists ability order to localStorage |

### Already Installed
No new dependencies required. @dnd-kit packages already at appropriate versions.

## Architecture Patterns

### Recommended Component Structure
No new files needed - enhance existing components:

```
apps/web/src/ui/hud/ActionBar.tsx              # Add click handler, Shift detection
apps/web/src/ui/panels/AbilitiesPanel.tsx      # Already has draggables
apps/web/src/ui/GameUI.tsx                      # Extend handleDragEnd for ability drops
apps/web/src/store/actionBarStore.ts            # Add removeAbility, addAbility methods
```

### Pattern 1: Click vs Drag Differentiation

**What:** Enable both click (trigger ability) and drag (relocate ability) on same element.

**How:** Use PointerSensor with activation constraint to require movement before drag starts.

**Existing pattern from GameUI.tsx:**
```typescript
const sensors = useSensors(
  useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
);
```

**Why 8px threshold works:** Small clicks won't exceed 8px movement, so onClick fires without triggering drag. Intentional drags exceed 8px quickly, activating drag mode before onClick.

**Implementation in ActionBar:**
```typescript
// ActionBar already receives DndContext from parent GameUI
// No changes needed to sensor config - inherited from GameUI

// In SortableAbilitySlot component:
const handleClick = () => {
  if (isDragging) return; // Don't trigger if drag in progress
  if (!ability) return;
  if (isOnCooldown(ability.id)) return;
  if (!player || player.energy < ability.energyCost) return;

  gameSocket.emit('ability:use', {
    abilityId: ability.id,
    targetEntityId: ability.requiresTarget ? targetEntityId ?? undefined : undefined,
  });
};

// Apply to slot div:
<div onClick={handleClick} {...listeners} {...attributes}>
```

**Key insight:** onClick naturally fires after pointer up if drag threshold not exceeded. The `isDragging` check prevents double-triggering during drag release.

### Pattern 2: Keyboard Modifier Detection During Drag

**What:** Detect Shift key during drag to enable different behaviors (move vs copy, different interaction modes).

**How:** Access `activatorEvent` property in `DragStartEvent` to check `shiftKey`.

**Based on GitHub Issue #1139 (closed, merged):** activatorEvent is now exposed in DragStartEvent, providing access to original mouse/keyboard event including modifier keys.

**Implementation:**
```typescript
const handleDragStart = (event: DragStartEvent) => {
  setActiveId(event.active.id as string);

  // Check if Shift key was held during drag initiation
  const activatorEvent = event.activatorEvent as MouseEvent | TouchEvent | undefined;
  if (activatorEvent && 'shiftKey' in activatorEvent) {
    setShiftHeld(activatorEvent.shiftKey);
  }
};

const handleDragEnd = (event: DragEndEvent) => {
  const { active, over } = event;

  // Only allow relocation if Shift was held
  if (shiftHeld && over && active.id !== over.id) {
    const fromIndex = slotIds.indexOf(active.id as string);
    const toIndex = slotIds.indexOf(over.id as string);
    swapAbilitySlots(fromIndex, toIndex);
  }

  setActiveId(null);
  setShiftHeld(false);
};
```

**Important note:** According to Phase 97 requirements, SHIFT+drag allows relocation. Without Shift, drag should NOT relocate within action bar (reserved for future cross-bar drag in Phase 98).

### Pattern 3: Cross-Component Drag (Panel to Action Bar)

**What:** Drag abilities from AbilitiesPanel into ActionBar slots.

**How:** Both components share same DndContext ancestor (GameUI), use different droppable/sortable IDs, handle in parent's onDragEnd.

**Existing cross-component pattern from GameUI.tsx:**
```typescript
// GameUI handles drags between InventoryPanel and EquipmentPanel:
const handleDragEnd = (event: DragEndEvent) => {
  const { active, over } = event;
  if (!over) return;

  // Check drop target ID prefix to route behavior
  if (overId.startsWith('hotbar-')) {
    // Handle hotbar drop
  } else if (overId.startsWith('equip-')) {
    // Handle equipment drop
  }
};
```

**Implementation for abilities:**
```typescript
// In GameUI.handleDragEnd, add new case:
const dragData = active.data.current;

// Dragging ability from panel to action bar slot
if (dragData?.type === 'ability' && overId.startsWith('slot-')) {
  const abilityId = dragData.abilityId;
  const slotIndex = parseInt(overId.replace('slot-', ''), 10);

  if (!isNaN(slotIndex) && slotIndex >= 0 && slotIndex < 8) {
    useActionBarStore.getState().assignAbility(slotIndex, abilityId);
  }
  return;
}
```

**AbilitiesPanel already has draggables:**
```typescript
// In AbilitiesPanel.tsx (line 18-21):
const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
  id: `ability-${ability.id}`,
  data: { type: 'ability', abilityId: ability.id },
});
```

**ActionBar needs droppable slots:** Already uses `useSortable` which combines draggable + droppable. No changes needed to slot structure.

### Pattern 4: Drop Outside to Remove

**What:** Dragging ability outside action bar removes it from the bar.

**How:** Check `over === null` in `onDragEnd` - this indicates drop occurred outside any droppable zone.

**From dnd-kit documentation and GitHub discussions:**
> "If there are no collisions detected when the draggable item is dropped, the over property will be null."

**Implementation:**
```typescript
const handleDragEnd = (event: DragEndEvent) => {
  const { active, over } = event;

  // Dropped outside any droppable zone
  if (over === null) {
    const dragData = active.data.current;

    // If dragging from action bar, remove from bar
    if (dragData?.type === 'action-bar-ability') {
      const slotId = active.id as string;
      const slotIndex = slotIds.indexOf(slotId);
      if (slotIndex >= 0) {
        removeAbilityFromSlot(slotIndex);
      }
    }
    return;
  }

  // ... rest of drop handling
};
```

**Important distinction:** Dragging FROM action bar needs different data type than dragging FROM panel:
- Panel: `{ type: 'ability', abilityId: 'fireball' }` - can only be added
- Action bar: `{ type: 'action-bar-ability', slotIndex: 2, abilityId: 'fireball' }` - can be removed or relocated

### Pattern 5: Visual Feedback During Drag

**What:** Show ghost overlay, highlight drop zones, indicate valid/invalid drop targets.

**How:** Use DragOverlay component (already exists in ActionBar), add CSS classes for drop zone states.

**Existing implementation from ActionBar.tsx (lines 275-281):**
```typescript
<DragOverlay>
  {activeAbility && (
    <div className="ability-slot ability-slot--drag-overlay">
      <AbilitySlotContent index={activeSlotIndex} ability={activeAbility} />
    </div>
  )}
</DragOverlay>
```

**Enhancement needed:**
1. Track `isOver` state for each slot using `useDroppable` or `useSortable`'s built-in `isOver` property
2. Add CSS class when hovering: `ability-slot--drop-target`
3. Show visual indicator (border glow, background highlight)

**CSS pattern (extend ActionBar.css):**
```css
.ability-slot--drop-target {
  border-color: var(--color-accent);
  background: rgba(var(--color-accent-rgb), 0.1);
  animation: pulse-border 1s ease-in-out infinite;
}

@keyframes pulse-border {
  0%, 100% { border-color: var(--color-accent); }
  50% { border-color: rgba(var(--color-accent-rgb), 0.6); }
}

.ability-slot--invalid-drop {
  border-color: var(--color-danger, #ff4444);
  background: rgba(255, 68, 68, 0.1);
}
```

### Anti-Patterns to Avoid

- **Creating separate DndContext for ActionBar:** Would break cross-component drag from AbilitiesPanel. Use existing GameUI context.
- **Preventing onClick during drag completely:** Would break click-to-trigger. Use `isDragging` check instead of removing listener.
- **Checking modifier keys in onClick handler:** Won't work - event is from pointer up, not drag start. Must capture in `onDragStart`.
- **Removing ability on any invalid drop:** Only remove when dropped outside ALL droppables (`over === null`). Dropping on invalid slot should cancel drag.
- **Storing slot index in drag data:** Slots can be swapped during drag. Store ability ID and look up current slot when needed.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Drag and drop infrastructure | Custom drag handlers | @dnd-kit/core already integrated | Handles touch, mouse, keyboard, accessibility |
| Sortable list behavior | Manual position tracking | useSortable hook | Handles swap animations, collision detection |
| Ghost/overlay during drag | Custom follow-cursor element | DragOverlay component | Portal rendering, proper z-index, performance |
| Keyboard event detection | Custom event listeners on drag elements | activatorEvent in DragStartEvent | Consistent with library patterns, already tested |
| Drop zone highlighting | Manual hover tracking | isOver from useSortable/useDroppable | Reactive, handles edge cases |

**Key insight:** @dnd-kit provides 90% of needed functionality. Don't rebuild what exists - configure and extend appropriately.

## Common Pitfalls

### Pitfall 1: Click Fires During Drag Release

**What goes wrong:** Player drags ability to relocate, releases mouse, ability triggers unexpectedly.

**Why it happens:** onClick fires on pointer up if drag threshold exceeded but handler doesn't check drag state.

**How to avoid:** Add `isDragging` check in onClick handler:
```typescript
const handleClick = () => {
  if (isDragging) return; // CRITICAL: prevents click during drag release
  // ... rest of click logic
}
```

**Warning signs:** Abilities triggering when player intended to drag, complaints about accidental activation.

### Pitfall 2: Shift Detection Persists After Drag

**What goes wrong:** Player does Shift+drag, releases Shift during drag, drag still behaves as if Shift held.

**Why it happens:** Capturing `shiftKey` in `onDragStart` but not resetting state after drag ends.

**How to avoid:** Always reset modifier state in `onDragEnd`:
```typescript
const handleDragEnd = (event: DragEndEvent) => {
  // ... handle drop
  setShiftHeld(false); // CRITICAL: reset state
  setActiveId(null);
};
```

**Warning signs:** Drag behavior inconsistent, changes mid-drag ignored.

### Pitfall 3: Cross-Component Drag Breaks Existing Drags

**What goes wrong:** Adding ability drag logic to GameUI.handleDragEnd breaks inventory reordering.

**Why it happens:** New condition matches before checking inventory reorder case.

**How to avoid:** Order drag handling from most specific to least specific, return early:
```typescript
const handleDragEnd = (event: DragEndEvent) => {
  // Check drag source type first (most specific)
  if (dragData?.type === 'ability' && overId.startsWith('slot-')) {
    // Handle ability drop
    return; // CRITICAL: prevent fall-through
  }

  // Then check drop target patterns
  if (overId.startsWith('hotbar-')) {
    // ... existing hotbar logic
    return;
  }

  // Finally, inventory reorder (least specific)
  // ... existing inventory logic
};
```

**Warning signs:** Inventory drag stops working, equipment drag behaves strangely.

### Pitfall 4: Drop Outside Not Detected When Over Non-Droppable UI

**What goes wrong:** Player drags ability over chat panel, releases, ability doesn't remove because `over` points to chat panel container.

**Why it happens:** Parent container has pointer-events enabled, intercepting drop detection.

**How to avoid:** Apply `pointer-events: none` to non-droppable UI panels during drag:
```css
.chat-panel,
.quest-log-panel {
  pointer-events: auto; /* Normal state */
}

body:has(.ability-slot--dragging) .chat-panel,
body:has(.ability-slot--dragging) .quest-log-panel {
  pointer-events: none; /* During ability drag */
}
```

**Alternative:** Check `over.id` against known droppable IDs and treat unknown as "outside."

**Warning signs:** Abilities not removing when dropped on UI panels, inconsistent remove behavior.

### Pitfall 5: DragOverlay Shows Wrong Ability After Swap

**What goes wrong:** Player drags slot 1 to slot 3, during drag the overlay shows slot 3's ability instead.

**Why it happens:** DragOverlay reads from slots array which mutates during drag, not from captured state.

**How to avoid:** Capture dragged ability in `onDragStart`, render from captured state:
```typescript
const [draggedAbility, setDraggedAbility] = useState<AbilityDefinition | null>(null);

const handleDragStart = (event: DragStartEvent) => {
  const slotIndex = slotIds.indexOf(event.active.id as string);
  const ability = slots[slotIndex];
  setDraggedAbility(ability); // Capture at drag start
};

// In DragOverlay:
<DragOverlay>
  {draggedAbility && (
    <div className="ability-slot ability-slot--drag-overlay">
      {/* Render from draggedAbility, not activeAbility from slots */}
    </div>
  )}
</DragOverlay>
```

**Warning signs:** Overlay flickers or changes icon during drag, visual confusion.

### Pitfall 6: Abilities Panel Drag Conflicts with Panel Repositioning

**What goes wrong:** Player tries to move abilities panel by dragging header, accidentally drags ability instead.

**Why it happens:** Drag listeners on ability slots capture events that should go to panel header.

**How to avoid:** AbilitiesPanel already has `useDraggablePanel` for window movement. Ensure ability drag listeners only on ability slots, not panel container:
```typescript
// AbilitiesPanel.tsx already correct (line 84-86):
<div
  className="abilities-header"
  onMouseDown={handleMouseDown} // Panel drag - no dnd-kit listeners
>

// Ability slots have separate listeners (line 35-37):
<div
  {...attributes}
  {...listeners} // Only on ability slot, not panel
>
```

**No changes needed** - existing implementation already prevents conflict. Documenting for awareness.

## Code Examples

Verified patterns from existing codebase and official @dnd-kit documentation:

### Click-to-Trigger with Drag Support

```typescript
// apps/web/src/ui/hud/ActionBar.tsx (modified)

function SortableAbilitySlot({ index, ability, slotId }: SortableAbilitySlotProps) {
  const { isOnCooldown } = useAbilityStore();
  const player = useGameStore((state) => state.player);
  const targetEntityId = useCombatStore((state) => state.targetEntityId);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: slotId,
    data: { type: 'action-bar-ability', slotIndex: index, abilityId: ability?.id }
  });

  const handleClick = () => {
    // CRITICAL: Prevent click during drag release
    if (isDragging) return;

    if (!ability) return;
    if (isOnCooldown(ability.id)) return;
    if (!player || player.energy < ability.energyCost) return;

    gameSocket.emit('ability:use', {
      abilityId: ability.id,
      targetEntityId: ability.requiresTarget ? targetEntityId ?? undefined : undefined,
    });
  };

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`ability-slot ${!ability ? 'ability-slot--empty' : ''}`}
      onClick={handleClick}
      {...attributes}
      {...listeners}
    >
      <AbilitySlotContent index={index} ability={ability} />
    </div>
  );
}
```

### Shift Key Detection for Conditional Drag Behavior

```typescript
// apps/web/src/ui/hud/ActionBar.tsx (modified)

export const ActionBar: React.FC = () => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [shiftHeld, setShiftHeld] = useState(false);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);

    // Detect Shift modifier
    const activatorEvent = event.activatorEvent as MouseEvent | TouchEvent | undefined;
    if (activatorEvent && 'shiftKey' in activatorEvent) {
      setShiftHeld(activatorEvent.shiftKey);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    // Requirement: SHIFT+drag allows relocation within action bar
    if (shiftHeld && over && active.id !== over.id) {
      const fromIndex = slotIds.indexOf(active.id as string);
      const toIndex = slotIds.indexOf(over.id as string);

      if (fromIndex >= 0 && toIndex >= 0) {
        swapAbilitySlots(fromIndex, toIndex);
      }
    }

    // Without Shift: drag does nothing within action bar (reserved for Phase 98)

    // Reset state
    setActiveId(null);
    setShiftHeld(false);
  };

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      {/* ... slots */}
    </DndContext>
  );
};
```

### Cross-Component Drag from Panel to Action Bar

```typescript
// apps/web/src/ui/GameUI.tsx (extend existing handleDragEnd)

const handleDragEnd = (event: DragEndEvent) => {
  const { active, over } = event;
  const pendingReorder = useInventoryStore.getState().pendingReorder;
  if (pendingReorder) return;
  if (!over) return;

  const overId = String(over.id);
  const activeId = String(active.id);
  const dragData = active.data.current;

  // NEW: Ability from panel to action bar slot
  if (dragData?.type === 'ability' && overId.startsWith('slot-')) {
    const abilityId = dragData.abilityId;
    const slotIndex = parseInt(overId.replace('slot-', ''), 10);

    if (!isNaN(slotIndex) && slotIndex >= 0 && slotIndex < 8) {
      useActionBarStore.getState().assignAbility(slotIndex, abilityId);
    }
    return;
  }

  // Existing: hotbar drop (keep for inventory items)
  if (overId.startsWith('hotbar-')) {
    // ... existing logic
    return;
  }

  // ... rest of existing drop handlers
};
```

### Drop Outside to Remove Ability

```typescript
// apps/web/src/ui/hud/ActionBar.tsx (in handleDragEnd)

const handleDragEnd = (event: DragEndEvent) => {
  const { active, over } = event;

  // Dropped outside any droppable (over === null)
  if (over === null) {
    const dragData = active.data.current;

    // Remove from action bar if dragging from a slot
    if (dragData?.type === 'action-bar-ability') {
      const slotIndex = dragData.slotIndex;
      if (typeof slotIndex === 'number' && slotIndex >= 0 && slotIndex < 8) {
        removeAbilityFromSlot(slotIndex);
      }
    }

    setActiveId(null);
    setShiftHeld(false);
    return;
  }

  // ... rest of drop handling (Shift+drag relocation)
};
```

### Action Bar Store - Add/Remove Methods

```typescript
// apps/web/src/store/actionBarStore.ts (add new methods)

interface ActionBarState {
  // ... existing
  assignAbility: (slotIndex: number, abilityId: string) => void;
  removeAbilityFromSlot: (slotIndex: number) => void;
}

export const useActionBarStore = create<ActionBarState>()(
  immer((set) => ({
    // ... existing state

    assignAbility: (slotIndex: number, abilityId: string) =>
      set((state) => {
        if (slotIndex < 0 || slotIndex >= SLOT_COUNT) return;
        state.abilityOrder[slotIndex] = abilityId;
        saveAbilityOrderToStorage(state.abilityOrder as (string | null)[]);
      }),

    removeAbilityFromSlot: (slotIndex: number) =>
      set((state) => {
        if (slotIndex < 0 || slotIndex >= SLOT_COUNT) return;
        state.abilityOrder[slotIndex] = null;
        saveAbilityOrderToStorage(state.abilityOrder as (string | null)[]);
      }),

    // ... existing methods
  }))
);
```

### Visual Feedback CSS

```css
/* apps/web/src/ui/hud/ActionBar.css (additions) */

/* Drop zone highlight when dragging ability over slot */
.ability-slot--drop-target {
  border-color: var(--color-accent);
  background: rgba(68, 170, 255, 0.1); /* Adjust based on accent color */
  box-shadow: 0 0 8px rgba(68, 170, 255, 0.4);
}

/* Invalid drop target (e.g., shift not held when required) */
.ability-slot--invalid-drop {
  border-color: #ff4444;
  background: rgba(255, 68, 68, 0.1);
  cursor: not-allowed;
}

/* Enhanced drag overlay */
.ability-slot--drag-overlay {
  opacity: 0.9;
  transform: scale(1.05);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
  border-color: var(--color-accent);
  cursor: grabbing;
  animation: drag-pulse 1s ease-in-out infinite;
}

@keyframes drag-pulse {
  0%, 100% { transform: scale(1.05); }
  50% { transform: scale(1.08); }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Drag-only action bar | Drag + click support | Phase 97 (this phase) | Click to use, Shift+drag to relocate |
| Internal slot swapping only | Cross-component panel→bar drag | Phase 97 | Drag abilities from panel to bar |
| Permanent slot assignment | Drop-outside to remove | Phase 97 | Easy ability removal |
| react-beautiful-dnd | @dnd-kit | Phase 29 (v1.6) | Modern, maintained, flexible |
| Distance: 10px | Distance: 8px | Phase 29 (v1.6) | Better click vs drag detection |

**Current patterns (as of Phase 97):**
- @dnd-kit v6.3.1 with PointerSensor, 8px activation distance
- Shared DndContext in GameUI wraps all panels
- useSortable for sortable lists, useDraggable for source-only items
- DragOverlay for ghost element during drag
- Drag data typing via `data.current.type` field

**Deprecated patterns:**
- react-beautiful-dnd (removed in Phase 29)
- Custom drag handlers (replaced by @dnd-kit sensors)

## Open Questions

1. **Should click-to-trigger work during global cooldown or only per-ability cooldown?**
   - What we know: Abilities have individual cooldowns via AbilityService
   - What's unclear: Is there a global cooldown concept?
   - Recommendation: Individual cooldowns only - no evidence of GCD in codebase. Keep existing per-ability cooldown checks.

2. **Visual feedback for Shift key held state?**
   - What we know: Player must hold Shift to enable relocation drag
   - What's unclear: Should UI indicate "Shift mode" is active?
   - Recommendation: Show cursor change or slot border style when Shift held + hovering slot. Use CSS `:has()` selector or state-driven class.

3. **What happens when dragging from panel to already-occupied slot?**
   - What we know: `assignAbility()` will overwrite slot
   - What's unclear: Should we warn player? Swap? Reject?
   - Recommendation: Overwrite silently - matches inventory drag behavior. Player can Shift+drag to relocate if needed.

4. **Should drop-outside work only for action bar drags, or also for panel drags?**
   - What we know: Requirement says "dropping ability outside action bar removes it"
   - What's unclear: Does this apply to abilities dragged FROM panel?
   - Recommendation: Only remove when dragging FROM action bar. Panel drags dropped outside should cancel (no change to bar).

5. **Should DragOverlay show ability details or just icon?**
   - What we know: Current DragOverlay shows full slot with icon + key number
   - What's unclear: Is this too much information during drag?
   - Recommendation: Keep current approach - shows what player is moving. Helpful for visual tracking.

## Sources

### Primary (HIGH confidence)
- [dnd-kit Official Documentation](https://dndkit.com/) - Core concepts and patterns
- [dnd-kit GitHub Repository](https://github.com/clauderic/dnd-kit) - Source code and issues
- [dnd-kit Sensors Documentation](https://dndkit.com/api-documentation/sensors) - Sensor configuration and activation constraints
- [dnd-kit Pointer Sensor Documentation](https://dndkit.com/api-documentation/sensors/pointer) - Distance and delay constraints
- [GitHub Issue #1139: Expose activatorEvent](https://github.com/clauderic/dnd-kit/issues/1139) - Confirmed: activatorEvent available in DragStartEvent
- [GitHub Issue #591: Click vs Drag](https://github.com/clauderic/dnd-kit/issues/591) - Solution patterns for click + drag on same element
- Existing codebase:
  - `apps/web/src/ui/GameUI.tsx` - DndContext setup, cross-component drag handling
  - `apps/web/src/ui/hud/ActionBar.tsx` - Current action bar implementation
  - `apps/web/src/ui/panels/AbilitiesPanel.tsx` - Draggable abilities
  - `apps/web/src/store/actionBarStore.ts` - Action bar state management
  - `package.json` - @dnd-kit v6.3.1 confirmed installed

### Secondary (MEDIUM confidence)
- [Top 5 Drag-and-Drop Libraries for React in 2026](https://puckeditor.com/blog/top-5-drag-and-drop-libraries-for-react) - dnd-kit recommended as modern choice
- [The Ultimate Drag-and-Drop Toolkit for React](https://www.blog.brightcoding.dev/2025/08/21/the-ultimate-drag-and-drop-toolkit-for-react-a-deep-dive-into-dnd-kit/) - Deep dive into @dnd-kit patterns
- [React + dnd-kit Cross-Component Patterns](https://medium.com/@wangfupeng1988/react-dnd-kit-implement-tree-list-drag-and-drop-sortable-f54f84b1b605) - Sortable tree implementation patterns
- GitHub Discussions:
  - [#268: Access OnDrag events inside draggable](https://github.com/clauderic/dnd-kit/discussions/268)
  - [#809: Complex interactions with dnd-kit](https://github.com/clauderic/dnd-kit/discussions/809)

### Tertiary (LOW confidence - not used)
- WebSearch results on keyboard modifiers: No authoritative documentation found on direct modifier key API. Relying on GitHub issue #1139 confirmation and TypeScript event types.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - @dnd-kit already integrated, version confirmed, patterns established
- Architecture: HIGH - Existing cross-component drag in GameUI provides exact pattern needed
- Click vs Drag: HIGH - GitHub issue #591 confirms solution, activation constraint proven in codebase
- Modifier detection: HIGH - GitHub issue #1139 merged, activatorEvent.shiftKey confirmed available
- Drop-outside detection: HIGH - Official documentation confirms `over === null` pattern
- Pitfalls: MEDIUM - Based on common dnd-kit issues and React event handling patterns

**Research date:** 2026-02-26
**Valid until:** 2026-04-26 (dnd-kit stable, unlikely breaking changes in v6.x)
