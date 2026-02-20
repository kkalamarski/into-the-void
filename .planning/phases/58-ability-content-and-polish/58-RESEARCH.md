# Phase 58: Ability Content & Polish - Research

**Researched:** 2026-02-20
**Domain:** RPG Ability Design, React Drag-and-Drop UI, Game Content Creation
**Confidence:** HIGH

## Summary

Phase 58 expands the ability system from 3 starter abilities to 20+ diverse abilities across three categories (Offensive, Defensive, Utility), updates existing items to grant abilities, and implements drag-to-rearrange action bar slots. The phase builds on completed infrastructure from Phases 56-57 (ability system, buffs, action bar auto-population) and focuses on content creation and UX polish.

The project already has @dnd-kit (v6.3.1) installed for drag-and-drop functionality, ability definitions follow a well-established discriminated union pattern, and the action bar UI exists with keyboard shortcuts but lacks manual slot rearrangement.

**Primary recommendation:** Use @dnd-kit's sortable preset with rectSwappingStrategy for action bar slot swapping, design abilities to match sci-fi/corporate Terminus lore, and balance via energy cost + cooldown tuning to create distinct playstyles across tool/suit combinations.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @dnd-kit/core | 6.3.1 | Drag-and-drop primitives | Modern, actively maintained (react-beautiful-dnd deprecated 2022), modular design |
| @dnd-kit/sortable | 10.0.0 | Sortable list/grid preset | Built specifically for slot rearrangement, supports rectSwappingStrategy |
| @dnd-kit/utilities | 3.2.2 | Helper utilities for dnd-kit | CSS transforms, collision detection utilities |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Zustand | 4.5.0 | State management | Already used for actionBarStore, inventoryStore, abilityStore |
| Immer | 11.1.4 | Immutable state updates | Already used in actionBarStore via zustand/middleware/immer |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @dnd-kit | react-beautiful-dnd | Deprecated since 2022, no future development |
| @dnd-kit | react-dnd | More complex API, HTML5 backend limitations |
| @dnd-kit | Native HTML5 drag API | Manual implementation, browser inconsistencies, no touch support |

**Installation:**
```bash
# Already installed - no new dependencies needed
```

## Architecture Patterns

### Recommended Project Structure
```
packages/game-logic/src/ability/
├── definitions.ts           # ALL_ABILITIES array with 20+ ability definitions
├── ability-registry.ts      # Singleton registry (already exists)
└── index.ts                 # Exports

packages/items/src/definitions/
├── tools.ts                 # Update grantedAbilities arrays
├── suits.ts                 # Update grantedAbilities arrays
└── modules.ts               # (future) New items with ability grants

apps/web/src/ui/hud/
├── ActionBar.tsx            # Add dnd-kit SortableContext wrapper
├── ActionBar.css            # Add drag state styles
└── ActionBarSlot.tsx        # Extract slot as separate sortable component

apps/web/src/store/
└── actionBarStore.ts        # Add reorderSlots action for drag-end handler
```

### Pattern 1: Ability Definition Structure
**What:** Discriminated union for type-safe ability effects with readonly properties
**When to use:** All ability definitions
**Example:**
```typescript
// Source: packages/game-logic/src/ability/definitions.ts (existing)
export const ABILITY_NANO_REPAIR: AbilityDefinition = {
  id: 'nano_repair',
  displayName: 'Nano Repair',
  description: 'Deploy nano-swarm to repair exo-suit damage, healing over time.',
  category: 'defensive',
  energyCost: 25,
  cooldownMs: 12000,
  range: 0,
  requiresTarget: false,
  effects: [
    { type: 'heal', baseHeal: 40, scaling: 0.5 },
    { type: 'buff', stat: 'toughness', amount: 5, duration: 10000 }
  ],
  iconKey: 'ability_nano_repair',
  iconColor: 0x44cc44,
};
```

### Pattern 2: Item Ability Grants
**What:** Items declare abilities via grantedAbilities array (string IDs)
**When to use:** Tools, suits, modules that should provide active abilities
**Example:**
```typescript
// Source: packages/items/src/definitions/tools.ts (existing pattern)
export const TOOL_COMBAT_RARE: ItemDefinition = {
  id: 'tool_combat_rare',
  displayName: 'Pulse Pistol',
  // ... other fields
  toolType: 'combat',
  grantedAbilities: ['basic_strike', 'shield_bash', 'electrocute'], // Updated
};
```

### Pattern 3: dnd-kit Sortable Action Bar
**What:** Wrap action bar slots in SortableContext with useSortable hook per slot
**When to use:** Action bar slot rearrangement
**Example:**
```typescript
// Source: https://docs.dndkit.com/presets/sortable (official docs)
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, useSortable, rectSwappingStrategy } from '@dnd-kit/sortable';

function ActionBar() {
  const { slots, reorderSlots } = useActionBarStore();

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      reorderSlots(active.id, over.id); // Swap slot indices
    }
  };

  return (
    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={slots.map((_, i) => i)} strategy={rectSwappingStrategy}>
        {slots.map((ability, index) => (
          <SortableSlot key={index} index={index} ability={ability} />
        ))}
      </SortableContext>
    </DndContext>
  );
}

function SortableSlot({ index, ability }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: index });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {/* Existing AbilitySlot rendering */}
    </div>
  );
}
```

### Anti-Patterns to Avoid
- **Storing derived ability list in state:** Action bar abilities should be derived from equipment on every render (stale data risk). Pattern already correct in `apps/web/src/store/abilityStore.ts` line 59-97 via `getEquippedAbilities()` function.
- **Mutating slot assignments directly:** Use Immer-based Zustand actions (pattern already established in `actionBarStore.ts`).
- **Assigning nonexistent ability IDs:** Always validate via `AbilityRegistry.has()` before assignment (pattern from `ability.service.ts` line 161).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Drag-and-drop slots | Custom mouse/touch handlers | @dnd-kit/sortable | Touch support, accessibility, collision detection, browser quirks handled |
| Ability ID validation | Manual string checks | AbilityRegistry.has() | Already implemented singleton pattern (56-01) |
| Slot persistence | Custom localStorage logic | Existing actionBarStore pattern | Already handles save/load with normalization (lines 8-32) |
| Ability effect execution | If/else chains | Discriminated union pattern | Already type-safe via AbilityEffect union (shared-types/src/game/ability.ts line 9-15) |

**Key insight:** Phase 56-57 built comprehensive infrastructure. This phase is primarily content creation (ability definitions) and UX polish (drag-to-rearrange), not new systems. Leverage existing patterns.

## Common Pitfalls

### Pitfall 1: Ability Balance - Power Creep
**What goes wrong:** Later-added abilities become strictly better than starter abilities, invalidating early-game tools.
**Why it happens:** No clear design constraints; temptation to make new abilities "exciting" leads to overpowered effects.
**How to avoid:** Define power budget per category. Offensive abilities scale primarily via baseDamage+scaling, Defensive via heal amount or buff duration, Utility via range or cooldown reduction. Higher rarity items grant MORE abilities, not strictly BETTER abilities.
**Warning signs:** Rare tool ability has 2x damage of common tool ability with same cooldown/energy cost.

### Pitfall 2: Drag State - Ghost Element Positioning
**What goes wrong:** Dragged ability slot renders in wrong position or flickers during drag.
**Why it happens:** Default dnd-kit drag overlay uses fixed positioning, may clash with game canvas rendering layers.
**How to avoid:** Use `DragOverlay` component from @dnd-kit/core for custom ghost element rendering. Keep drag overlay on same z-index layer as HUD (not game canvas).
**Warning signs:** Dragged slot disappears behind Phaser canvas or jumps to (0,0) during drag.

### Pitfall 3: Ability Naming - Lore Inconsistency
**What goes wrong:** Ability names don't match Terminus's corporate/sci-fi setting (e.g., "Fireball" instead of "Plasma Burst").
**Why it happens:** Generic fantasy RPG naming conventions used without considering world-bible lore.
**How to avoid:** Reference `lore/world-bible.md` for faction tech (Verdant = bio-tech, Helix = extraction/industrial, Nexus = tactical/military, Unaffiliated = salvaged). Use tech-themed verbs: "Deploy," "Activate," "Pulse," "Surge," "Override."
**Warning signs:** User asks "Why does my mining drill cast magic spells?"

### Pitfall 4: Slot Assignment - Orphaned Ability References
**What goes wrong:** Action bar shows empty slots for abilities from unequipped items.
**Why it happens:** Slot assignments persist after item is unequipped/dropped.
**How to avoid:** Pattern already solved via `invalidateOrphans()` in `actionBarStore.ts` line 59-73, wired at module level via `useInventoryStore.subscribe()` (line 79-84). Don't break this subscription.
**Warning signs:** Slots remain populated after unequipping tool; slot shows "???" or crashes on click.

### Pitfall 5: Ability Diversity - Same Effect, Different Name
**What goes wrong:** 20 abilities created but only 3 distinct mechanical behaviors (all damage, or all buffs).
**Why it happens:** Focusing on quantity over mechanical diversity.
**How to avoid:** Design target distribution: 8-10 Offensive (damage, DoT variants), 6-8 Defensive (heal, buff, shield), 4-6 Utility (movement, resource, debuff). Each ability should have unique parameter tuning (range, cooldown, energy, scaling).
**Warning signs:** Player feedback "All combat tools feel the same."

## Code Examples

Verified patterns from official sources and existing codebase:

### Ability Definition (Offensive)
```typescript
// Pattern from packages/game-logic/src/ability/definitions.ts (existing)
export const ABILITY_ELECTROCUTE: AbilityDefinition = {
  id: 'electrocute',
  displayName: 'Electrocute',
  description: 'Discharge high-voltage current into target, dealing damage and applying shock DoT.',
  category: 'offensive',
  energyCost: 20,
  cooldownMs: 8000,
  range: 2,
  requiresTarget: true,
  effects: [
    { type: 'damage', baseDamage: 25, scaling: 0.8 },
    { type: 'dot', damagePerTick: 5, tickInterval: 1000, duration: 3000 }
  ],
  iconKey: 'ability_electrocute',
  iconColor: 0x44aaff,
};
```

### Ability Definition (Defensive)
```typescript
// Pattern from shared-types/src/game/ability.ts + 57-01 buff design
export const ABILITY_MAGNETIC_FIELD: AbilityDefinition = {
  id: 'magnetic_field',
  displayName: 'Magnetic Field',
  description: 'Generate defensive magnetic field, increasing toughness temporarily.',
  category: 'defensive',
  energyCost: 15,
  cooldownMs: 15000,
  range: 0,
  requiresTarget: false,
  effects: [
    { type: 'buff', stat: 'toughness', amount: 8, duration: 12000 }
  ],
  iconKey: 'ability_magnetic_field',
  iconColor: 0x8844ff,
};
```

### Ability Definition (Utility)
```typescript
// Pattern from ability.ts effect types
export const ABILITY_GATHER: AbilityDefinition = {
  id: 'gather',
  displayName: 'Resource Gather',
  description: 'Accelerate resource node harvest, increasing yield efficiency.',
  category: 'utility',
  energyCost: 10,
  cooldownMs: 30000,
  range: 3,
  requiresTarget: true, // Targets resource nodes
  effects: [
    { type: 'buff', stat: 'perception', amount: 5, duration: 15000 }
  ],
  iconKey: 'ability_gather',
  iconColor: 0xccaa44,
};
```

### Drag-to-Rearrange Action Bar
```typescript
// Source: https://docs.dndkit.com/presets/sortable (official docs)
import { DndContext, closestCenter, DragOverlay } from '@dnd-kit/core';
import { SortableContext, useSortable, rectSwappingStrategy, arraySwap } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export const ActionBar: React.FC = () => {
  const { slots, reorderSlots } = useActionBarStore();
  const [activeId, setActiveId] = useState<number | null>(null);

  const handleDragStart = (event) => setActiveId(event.active.id);
  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      reorderSlots(active.id, over.id);
    }
    setActiveId(null);
  };

  // Slot indices as unique IDs (0-7)
  const slotIds = Array.from({ length: 8 }, (_, i) => i);

  return (
    <DndContext
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={slotIds} strategy={rectSwappingStrategy}>
        <div className="action-bar">
          {slotIds.map((index) => (
            <SortableSlot key={index} index={index} ability={slots[index]} />
          ))}
        </div>
      </SortableContext>
      <DragOverlay>
        {activeId !== null ? (
          <div className="ability-slot ability-slot--dragging">
            {/* Render dragged slot preview */}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

function SortableSlot({ index, ability }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: index });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <AbilitySlot index={index} ability={ability} />
    </div>
  );
}
```

### actionBarStore Reorder Action
```typescript
// Add to apps/web/src/store/actionBarStore.ts
reorderSlots: (fromIndex: number, toIndex: number) =>
  set((state) => {
    if (fromIndex < 0 || fromIndex >= SLOT_COUNT) return;
    if (toIndex < 0 || toIndex >= SLOT_COUNT) return;

    // Swap slot contents
    const temp = state.slots[fromIndex];
    state.slots[fromIndex] = state.slots[toIndex];
    state.slots[toIndex] = temp;

    saveToStorage(state.slots as (string | null)[]);
  }),
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| react-beautiful-dnd | @dnd-kit | 2022 (deprecation) | Must use dnd-kit for new projects; no maintenance for rbd |
| Skill trees | Item-granted abilities | Phase 56 design | Abilities tied to equipment, not character level/class |
| Manual slot assignment | Auto-populate from equipment | Phase 56-03 | Slots populate automatically, this phase adds manual reorder |
| Global ability pool | Per-item ability grants | Phase 56-02 | No "learn abilities" system; swap items to change abilities |

**Deprecated/outdated:**
- **react-beautiful-dnd**: Deprecated since 2022, no future development planned by Atlassian
- **Manual ability unlock systems**: Phase 56 established item-based progression, not skill points
- **Fixed action bar order**: Phase 56-03 auto-populates but doesn't allow rearrangement (this phase adds)

## Open Questions

1. **Module Items - Ability Grant Priority**
   - What we know: Modules equip to suit module slots (up to 6 on legendary suits)
   - What's unclear: Should modules grant abilities, or only passive stat buffs?
   - Recommendation: CONT-06 requires "new items with unique ability combinations" - modules likely grant abilities to enable 8+ ability setups on high-tier suits. Mark modules for Phase 58 or defer to Phase 59.

2. **Action Bar Slot Count - Fixed vs Dynamic**
   - What we know: Current implementation has 8 fixed slots (SLOT_COUNT constant)
   - What's unclear: Should higher-tier suits unlock more action bar slots?
   - Recommendation: Keep 8 slots fixed for Phase 58 (scope creep risk). Evaluate player feedback post-launch. 8 slots sufficient for tool (3) + suit (2) + modules (3).

3. **Drag Interaction - Conflict with Click-to-Use**
   - What we know: Slots currently activate on click (ActionBar.tsx line 43-52)
   - What's unclear: How to distinguish drag intent from click intent?
   - Recommendation: dnd-kit handles this via pointer movement threshold (default 5px). Clicks under threshold = ability use, over threshold = drag start. Test with touch devices.

4. **Ability Icon Assets - Placeholder vs Final**
   - What we know: Abilities use iconColor fallback (hex color), iconKey references texture
   - What's unclear: Are ability icon sprites expected for Phase 58?
   - Recommendation: CLAUDE.md line 42 states "If there is no sprite, add a fallback color tile." Use iconColor placeholders for Phase 58, defer sprite creation to art pass.

## Sources

### Primary (HIGH confidence)
- @dnd-kit/core v6.3.1 - Installed in package.json line 50
- @dnd-kit/sortable v10.0.0 - Installed in package.json line 51
- [Official dnd-kit documentation](https://docs.dndkit.com/) - Sortable preset, collision detection
- Existing codebase patterns:
  - `packages/shared-types/src/game/ability.ts` - AbilityDefinition interface
  - `packages/game-logic/src/ability/definitions.ts` - Ability definition examples
  - `apps/web/src/store/actionBarStore.ts` - Slot persistence pattern
  - `packages/items/src/definitions/tools.ts` - grantedAbilities pattern

### Secondary (MEDIUM confidence)
- [dnd-kit vs react-beautiful-dnd comparison](https://github.com/clauderic/dnd-kit/discussions/481) - Migration guidance, feature parity
- [Sortable examples on CodeSandbox](https://codesandbox.io/examples/package/@dnd-kit/sortable) - Implementation patterns
- [Game Developer: Equipped Skills Trend](https://www.gamedeveloper.com/design/equipped-skills-the-growing-trend-in-rpg-game-development) - Item-based ability design rationale
- [Game balance: Cooldowns](https://game-design-snacks.fandom.com/wiki/Cooldowns_can_be_used_to_balance_games) - Energy cost + cooldown tuning

### Tertiary (LOW confidence)
- Generic MMO ability design articles (MMORPG.com forums, TV Tropes) - Useful for category patterns but not Terminus-specific
- Sci-fi naming generators - Inspiration only, must validate against lore/world-bible.md

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - @dnd-kit already installed, official docs comprehensive, deprecation status verified
- Architecture: HIGH - Existing patterns established in Phase 56-57, direct code examples from codebase
- Pitfalls: HIGH - Validated against existing actionBarStore orphan handling, lore checked in world-bible.md
- Ability design: MEDIUM - Game balance guidelines from general sources, need playtesting for Terminus-specific tuning

**Research date:** 2026-02-20
**Valid until:** 30 days (stable library, slow-moving game design patterns)
