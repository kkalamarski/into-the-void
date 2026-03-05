# Phase 125: Crafting Panel UI - Research

**Researched:** 2026-03-05
**Domain:** React UI panel, Zustand state management, WebSocket event wiring
**Confidence:** HIGH

## Summary

Phase 125 adds a client-side crafting panel to the HUD. All backend infrastructure is already in place from Phases 122-124: the CraftingService handles start/collect/recipes, WebSocket events are defined in shared-types, and 39+ recipes exist across 4 disciplines. The work is purely client-side: a new Zustand store, a new React panel component with CSS, keybinding registration, and socket event wiring.

The codebase has a well-established panel pattern (AutomationPanel, EquipmentPanel, InventoryPanel) with consistent patterns: `useDraggablePanel` hook for positioning, `useModalStack` for Escape key handling, `toggleX` state in gameStore, side-effect socket imports in stores, and the `.ui-panel` CSS base class.

**Primary recommendation:** Follow the AutomationPanel pattern exactly — it is the closest analog (tabbed panel with server data fetching). Create `craftingStore.ts` for state, `CraftingPanel.tsx` + `CraftingPanel.css` for UI, wire into `GameUI.tsx` and `gameStore.ts` for toggle/keybind.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Three-column layout: vertical discipline tabs (left) | recipe list (middle) | recipe detail pane (right)
- Discipline tabs are a vertical sidebar on the far left of the panel
- Panel uses the same HUD panel slot as Inventory, Equipment, Abilities, etc. — opening Crafting closes other panels
- Keybind: C opens the crafting panel (or clicking HUD shortcut)
- When a craft is in progress and the panel is closed, a small HUD indicator (mini progress bar/timer) shows near the HUD area — no need to keep the panel open to track progress
- Recipe list (middle column): compact rows with small output item icon + recipe name + craftable/locked status indicator
- Detail pane (right column): full recipe info with ingredient list showing icon + name + "have/need" count (e.g., "x2/3"), green when sufficient, red when insufficient
- Locked recipes appear greyed out in their normal list position with a small lock icon; clicking shows unlock requirement in the detail pane
- Each discipline tab shows the discipline name + current proficiency level; selecting a discipline reveals an XP progress bar below the tabs or at top of recipe list
- No confirmation dialog — clicking Craft starts immediately (button already gated by ingredient checks)
- During an active craft: progress bar overlay appears in the detail pane, but the recipe list remains browsable (can view other recipes, just can't start another craft)
- On craft completion: toast notification showing crafted item and quality result; panel returns to normal state
- On craft failure (server rejection): red toast notification explaining the error reason; no ingredients consumed
- On proficiency level-up: special toast notification ("Equipment Crafting Level 5!") with any newly unlocked recipes mentioned
- Proficiency level shown directly on each discipline tab
- XP progress bar visible when a discipline is selected
- Smooth fill animation on XP bar when craft awards XP
- If XP gain triggers a level-up, glow/highlight effect on the discipline tab + toast notification
- Per-discipline proficiency only — no aggregate "overall crafter level"

### Claude's Discretion
- Quality range display format in the detail pane (badges with probability, simple range text, or other)
- Exact spacing, typography, and visual styling (follow existing panel CSS patterns)
- Loading/skeleton states while fetching recipe data
- Error state handling for network issues
- Mini HUD indicator design (bar, circular, icon-based)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CRFT-01 | Player can craft an item by selecting a recipe and confirming, consuming required ingredients | CraftingPanel detail pane Craft button + `crafting:start` socket emit |
| CRFT-02 | Crafting shows a progress timer (few seconds) before producing the output item | `crafting:started` event provides durationMs; client-side countdown timer in store |
| CRUI-01 | Player can open a crafting panel from the HUD at any location | `toggleCrafting` in gameStore + C keybind + GameShortcuts button |
| CRUI-02 | Crafting panel shows discipline tabs to switch between recipe categories | Vertical discipline tabs (left column) filtering recipe list |
| CRUI-03 | Each recipe shows name, ingredients (with inventory counts), output item, and quality chance | Detail pane with ingredient have/need display + quality thresholds from game-logic |
| CRUI-04 | Craft button is enabled only when player has all ingredients and recipe is unlocked | Client-side ingredient check against inventory + recipe unlock status |
| CRUI-05 | Active craft shows a progress bar with remaining time | Progress bar in detail pane driven by craftingStore timer state |
| CRUI-06 | Locked recipes appear greyed out with unlock requirement tooltip | Greyed row with lock icon; detail pane shows unlockReasons |
| CRUI-07 | Crafting panel shows current proficiency level and XP progress per discipline | Discipline tab displays level; XP bar on selected discipline |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | existing | Component rendering | Project standard |
| Zustand | existing | State management | All stores use zustand/create pattern |
| Socket.IO client | existing | WebSocket events | gameSocket singleton already wired |
| react-icons/gi | existing | Icon library | Used in all panels (GiShield, GiMining, etc.) |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @into-the-void/shared-types | existing | Type-safe event contracts | Import CraftingDiscipline, QualityTier, RecipeDefinition |
| @into-the-void/items | existing | ItemRegistry for item display | Get item icons, names, colors |
| @into-the-void/game-logic | existing | Quality thresholds | getQualityThresholds() for quality display |

No new packages needed. Everything is already in the project.

## Architecture Patterns

### Panel Pattern (established)
Every panel follows this structure:
1. **Store**: `apps/web/src/store/{name}Store.ts` — Zustand store with state + actions + socket listeners at module level
2. **Toggle**: `gameStore.ts` — boolean `showX` + `toggleX()` method
3. **Component**: `apps/web/src/ui/panels/{Name}Panel.tsx` + `.css`
4. **Registration**: `GameUI.tsx` — conditional render `{showX && <XPanel />}`
5. **Keybind**: `HUD.tsx` — keyboard listener in useEffect
6. **Shortcut**: `GameShortcuts.tsx` — button with onClick={toggleX}
7. **Modal stack**: `useModalStack('{id}', toggleX)` inside panel component
8. **Draggable**: `useDraggablePanel()` for header drag-to-move

### Socket Event Pattern
```typescript
// In store file (side-effect import)
gameSocket.on('crafting:recipe-list', (data) => {
  useCraftingStore.getState().setRecipes(data.recipes);
});
```

### Recipe Data Flow
1. Panel opens → emit `crafting:recipes` (empty payload)
2. Server responds with `crafting:recipe-list` containing all recipes + unlock status
3. Store saves recipes array
4. Panel renders filtered by active discipline tab

### Craft Flow
1. User clicks Craft → emit `crafting:start` { recipeId }
2. Server: validates, consumes ingredients, responds `crafting:started` { durationMs, startedAt }
3. Client: starts local countdown timer, shows progress bar
4. Timer completes → emit `crafting:collect` {}
5. Server: rolls quality, adds item, responds `crafting:completed` { qualityTier, proficiencyXP, discipline }
6. Client: clears timer state, shows toast, refreshes inventory (auto via `inventory:update`)

### Ingredient Availability Check (client-side)
```typescript
// Compare recipe.ingredients against inventoryStore items
function hasIngredients(recipe: RecipeDefinition, items: InventoryItem[]): boolean {
  return recipe.ingredients.every(ing => {
    const owned = items
      .filter(i => i.itemId === ing.itemId)
      .reduce((sum, i) => sum + i.quantity, 0);
    return owned >= ing.quantity;
  });
}
```

### Quality Display
`getQualityThresholds(proficiencyLevel, recipeTier)` from `@into-the-void/game-logic` returns `{ masterworkChance, refinedChance, standardChance }`. Display as percentage badges in the detail pane.

### Anti-Patterns to Avoid
- **Don't block panel browsing during active craft** — recipe list must remain interactive
- **Don't auto-collect** — player must trigger collection (matches server design)
- **Don't store recipes in gameStore** — create separate craftingStore following automationStore pattern
- **Don't use inline styles for layout** — follow existing CSS pattern with dedicated CSS file

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Panel drag | Custom mouse tracking | `useDraggablePanel()` hook | Already handles edge cases |
| Modal escape | Custom keydown | `useModalStack()` hook | Integrates with modal priority system |
| Toast notifications | Custom notification system | `useAlertStore().addAlert()` | Already has auto-dismiss, stacking |
| Item icons | Custom icon rendering | `<ItemIcon>` component | Handles sprite loading, fallback colors |
| Item tooltips | Custom tooltip | `<ItemTooltip>` component | Already styled with rarity, stats |
| Quality thresholds | Manual calculation | `getQualityThresholds()` | Exact same formula server uses |

## Common Pitfalls

### Pitfall 1: Keyboard Events in Text Inputs
**What goes wrong:** C key opens crafting panel while typing in chat
**Why it happens:** Global keydown listener doesn't check input focus
**How to avoid:** Guard with `if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;` — same pattern as HUD.tsx line 59-64
**Warning signs:** Panel opens while typing in chat

### Pitfall 2: Stale Inventory Data for Ingredient Checks
**What goes wrong:** Ingredient counts are wrong after consuming items
**Why it happens:** Using stale inventory snapshot instead of subscribing to inventoryStore
**How to avoid:** Use `useInventoryStore()` reactive subscription in component
**Warning signs:** "Have" counts don't update after crafting

### Pitfall 3: Timer Drift
**What goes wrong:** Progress bar finishes before server allows collection
**Why it happens:** Using setInterval with accumulated drift
**How to avoid:** Store `startedAt` + `durationMs`, calculate remaining from `Date.now()` on each render via requestAnimationFrame or 100ms setInterval
**Warning signs:** "Craft not ready" error when clicking collect at 0%

### Pitfall 4: Phaser Keyboard Conflict
**What goes wrong:** WASD movement happens while panel is open
**Why it happens:** Phaser captures keyboard input independently
**How to avoid:** Disable Phaser keyboard in useEffect — same pattern as EquipmentPanel line 171-185: `worldScene.setKeyboardEnabled(false)` on mount, `true` on unmount
**Warning signs:** Character moves while crafting panel is open

### Pitfall 5: Missing Proficiency Data
**What goes wrong:** XP bar and level display show nothing
**Why it happens:** Proficiency data isn't sent in initial recipe-list event
**How to avoid:** Server needs to include proficiency data alongside recipes, OR client requests it separately. Check if `crafting:recipe-list` event includes proficiency. **Answer: it does NOT.** Will need either: (a) add proficiency to the response, or (b) separate `crafting:proficiency` event. Recommendation: extend the `crafting:recipe-list` server response to include proficiency data — small server-side change.

## Code Examples

### Store Pattern (from automationStore)
```typescript
// craftingStore.ts
import { create } from 'zustand';
import { gameSocket } from '../network/socket';
import type { RecipeDefinition, CraftingDiscipline, CraftingProficiencyData } from '@into-the-void/shared-types';

interface CraftingState {
  recipes: Array<{ recipe: RecipeDefinition; unlocked: boolean; unlockReasons: string[] }>;
  activeDiscipline: CraftingDiscipline;
  selectedRecipeId: string | null;
  activeCraft: { recipeId: string; startedAt: number; durationMs: number } | null;
  proficiency: CraftingProficiencyData | null;
  // ... actions
}
```

### Panel Component Structure
```tsx
export const CraftingPanel: React.FC = () => {
  const { toggleCrafting } = useGameStore();
  const { position, handleMouseDown } = useDraggablePanel();
  useModalStack('crafting-panel', toggleCrafting);

  // Disable Phaser keyboard
  useEffect(() => { /* same pattern as EquipmentPanel */ }, []);

  // Request recipes on mount
  useEffect(() => {
    gameSocket.emit('crafting:recipes', {});
  }, []);

  return (
    <div className="crafting-panel ui-panel" style={{ transform: `translate(${position.x}px, ${position.y}px)` }}>
      {/* header with drag + close */}
      {/* three-column layout: tabs | list | detail */}
    </div>
  );
};
```

### Keybind Registration (from HUD.tsx)
```typescript
// Add 'c' case to existing handleKeyDown in HUD.tsx
} else if (key === 'c') {
  const craftingOpen = useGameStore.getState().showCrafting;
  if (craftingOpen && top?.id === 'crafting-panel') {
    toggleCrafting();
  } else if (!craftingOpen) {
    toggleCrafting();
  }
}
```

## Open Questions

1. **Proficiency data delivery**
   - What we know: `crafting:recipe-list` returns recipes + unlock status but NOT proficiency data
   - What's unclear: Best way to deliver proficiency to client
   - Recommendation: Extend the `crafting:recipe-list` server response to include a `proficiency` field with the CraftingProficiencyData. Minimal server change (add one field to the gateway handler response). Alternatively, emit separately on panel open.

2. **Auto-collect on timer completion**
   - What we know: Server requires explicit `crafting:collect` emit
   - What's unclear: Should client auto-emit when timer reaches 0, or require manual button click?
   - Recommendation: Auto-emit `crafting:collect` when client timer reaches 0 — the server already validates timing independently (CRFT-05). This is the smoothest UX and matches the "no extra clicks" design intent.

## Sources

### Primary (HIGH confidence)
- Codebase analysis: `apps/web/src/ui/panels/AutomationPanel.tsx` — tabbed panel pattern
- Codebase analysis: `apps/web/src/store/automationStore.ts` — store + socket pattern
- Codebase analysis: `apps/web/src/store/gameStore.ts` — toggle state pattern
- Codebase analysis: `apps/game-server/src/game/crafting.service.ts` — server API
- Codebase analysis: `packages/shared-types/src/network/events.ts` — event contracts
- Codebase analysis: `packages/game-logic/src/crafting/quality.ts` — quality thresholds

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all libraries already in project
- Architecture: HIGH - clear established patterns to follow
- Pitfalls: HIGH - identified from actual codebase analysis

**Research date:** 2026-03-05
**Valid until:** 2026-04-05 (stable project patterns)
