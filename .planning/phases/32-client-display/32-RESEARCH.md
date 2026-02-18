# Phase 32: Client Display - Research

**Researched:** 2026-02-18
**Domain:** React UI, Zustand state, CSS animations, floating-ui tooltips, Phaser keyboard integration
**Confidence:** HIGH

## Summary

Phase 32 is a pure client-side rendering phase. The server-side infrastructure (CharStatsPayload, stats:update socket event, statsStore.ts) was built in Phases 30-31 and is fully operational. This phase adds three UI surfaces that consume `useStatsStore`: (1) a draggable StatsPanel showing all 8 stats with base+equipment breakdown, (2) a 3-second level-up notification overlay showing stat deltas, and (3) an enhanced ItemTooltip that compares an unequipped item's stat bonuses against the currently equipped item in the same slot.

The codebase has strong established patterns for each surface. The StatsPanel follows EquipmentPanel.tsx and InventoryPanel.tsx exactly — draggable panel, `ui-panel` class, `close-btn`, keyboard toggle via Phaser WorldScene, `setKeyboardEnabled(false)` on mount. The level-up notification follows the ReconnectOverlay.tsx pattern — conditional render, `useEffect` with `setTimeout` for auto-dismiss. The tooltip enhancement extends the existing ItemTooltip.tsx which already uses `@floating-ui/react`, adding a comparison prop powered by inventoryStore equipment state.

A critical finding: current item definitions use legacy effect types (`armor`, `speed`, `life_support`, `power_core`, etc.) that do NOT map to the 8 CharacterStats fields (durability, toughness, power, haste, vigor, recovery, perception, resilience). This means `CharStatsPayload.equipment` is all-zeros for any current item. For STAT-16, the breakdown will correctly show "100 base + 0 from modules" — truthful but not visually interesting until items gain CharacterStats effects. For STAT-18, the tooltip stat comparison should use `resolveEffectsForTrigger()` on both items' legacy effects and compare the resulting `ComputedStats`-style keys (armor, speedMultiplier, etc.), not CharacterStats fields.

Level-up detection for STAT-17 also requires careful design: the server has no `player:levelup` event and player.level never changes during a session (level-up system not yet implemented). The level-up notification must be designed to detect and display changes when `stats:update` arrives with different base stats compared to the previous payload — a pattern that will work correctly once the server emits `stats:update` after level-up logic is added.

**Primary recommendation:** Build StatsPanel as a draggable `ui-panel` following EquipmentPanel pattern, detect level-up by comparing `CharStatsPayload.base` between consecutive `stats:update` payloads in statsStore, and for tooltip comparison use `resolveEffectsForTrigger` to extract ComputedStats-style bonuses from both hovered and equipped items rather than the CharStatsPayload.equipment field.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React + TypeScript | 18.2.x (project) | Component rendering | Entire client is React |
| Zustand + immer | 4.5.x + 11.1.x (project) | Read statsStore, inventoryStore | Both stores already live; no new state management needed |
| @floating-ui/react | ^0.27.18 (project) | Tooltip positioning for ItemTooltip | Already in use for existing ItemTooltip.tsx |
| react-icons | ^5.5.0 (project) | Stat icons in panel | Already used in EquipmentPanel, HUD |
| CSS custom properties | (project) | Theming (--color-bg-*, --color-accent) | All panels use CSS vars |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @into-the-void/items (ItemRegistry) | (project) | Get item definition for tooltip comparison | Already imported in InventoryPanel, EquipmentPanel |
| @into-the-void/game-logic (resolveEffectsForTrigger) | (project) | Extract stat bonuses from item effects | Use for tooltip comparison to get legacy ComputedStats keys |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Document-level `keydown` for stats toggle | Phaser WorldScene keyboard | Phaser keyboard (used for I, E, C) is the correct pattern — prevents Phaser input stealing; use `S` or `P` key via WorldScene |
| setTimeout in statsStore for level-up detection | External notification system | Store-level detection is simplest — statsStore already receives every payload; compare previous.base vs current.base |
| Extending ItemTooltip with comparison prop | New tooltip component | Extending existing component is less duplication — the floating behavior, portal, and CSS are already correct |

**Installation:** No new packages needed. All dependencies are in the workspace.

## Architecture Patterns

### Recommended Project Structure
```
apps/web/src/
├── store/
│   └── statsStore.ts         # Add: prevBase tracking + levelUpDeltas state + 3s timer
├── ui/
│   ├── GameUI.tsx             # Add: showStats toggle + StatsPanel conditional render
│   ├── GameUI.css             # No change needed
│   ├── hud/
│   │   └── HUD.tsx            # Add: Stats button (keyboard label "S") to action-bar
│   └── panels/
│       ├── StatsPanel.tsx     # NEW: draggable panel, 8 stat rows, base+equip breakdown
│       └── StatsPanel.css     # NEW: panel styles, stat-row layout
├── components/
│   ├── ItemTooltip.tsx        # Extend: add optional equipped item prop for comparison
│   ├── ItemTooltip.css        # Extend: .tooltip-delta-positive, .tooltip-delta-negative
│   └── LevelUpNotification.tsx # NEW: 3-second overlay showing stat deltas
└── game/
    └── scenes/
        └── WorldScene.ts      # Add: S key → useGameStore.getState().toggleStats()
```

### Pattern 1: StatsPanel Component
**What:** Draggable panel following EquipmentPanel.tsx pattern exactly. Reads `useStatsStore` for CharStatsPayload, shows 8 stat rows with breakdown text.
**When to use:** Rendered in GameUI.tsx when `showStats` is true (new boolean in gameStore).
**Example:**
```tsx
// Source: EquipmentPanel.tsx pattern (verified)
export const StatsPanel: React.FC = () => {
  const { stats } = useStatsStore();
  const { toggleStats } = useGameStore();
  const { position, isDragging, handleMouseDown } = useDraggablePanel();

  // Disable Phaser keyboard when panel is open
  useEffect(() => {
    const game = useGameStore.getState().game;
    const worldScene = game?.getWorldScene();
    if (worldScene) worldScene.setKeyboardEnabled(false);
    return () => {
      const game = useGameStore.getState().game;
      const worldScene = game?.getWorldScene();
      if (worldScene) worldScene.setKeyboardEnabled(true);
    };
  }, []);

  if (!stats) return null;

  return (
    <div
      className="stats-panel ui-panel"
      style={{ transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px))` }}
    >
      <div
        className="stats-panel-header"
        onMouseDown={handleMouseDown}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        <span>Character Stats</span>
        <button className="close-btn" onClick={toggleStats}>&times;</button>
      </div>
      {STAT_DISPLAY_ORDER.map(({ key, label }) => (
        <StatRow
          key={key}
          label={label}
          base={stats.base[key]}
          equipment={stats.equipment[key]}
          total={stats.total[key]}
        />
      ))}
    </div>
  );
};
```

### Pattern 2: Stat Display Order and Lore Names
**What:** Mapping from CharacterStats keys to lore-mandated display names. ORDER MATTERS — must match lore documentation.
**When to use:** Used in StatsPanel and LevelUpNotification both.
**Example:**
```typescript
// Source: packages/shared-types/src/core/player.ts (CharacterStats field order)
// Source: lore/world-bible.md (lore names are the field names capitalized)
export const STAT_DISPLAY_ORDER: Array<{ key: keyof CharacterStats; label: string }> = [
  { key: 'durability', label: 'Durability' },
  { key: 'toughness',  label: 'Toughness' },
  { key: 'power',      label: 'Power' },
  { key: 'haste',      label: 'Haste' },
  { key: 'vigor',      label: 'Vigor' },
  { key: 'recovery',   label: 'Recovery' },
  { key: 'perception', label: 'Perception' },
  { key: 'resilience', label: 'Resilience' },
];
```

### Pattern 3: Keyboard Toggle for Stats Panel
**What:** Add `S` key via Phaser WorldScene keyboard, same as I/E/C hotkeys. Store toggle via gameStore.
**When to use:** WorldScene.ts `create()` method, alongside the existing I/E/C handlers.
**Example:**
```typescript
// Source: WorldScene.ts lines 186-202 (existing pattern)
this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S).on('down', () => {
  if (this.input.keyboard?.enabled) {
    useGameStore.getState().toggleStats();
  }
});
```
Note: `S` conflicts with WASD movement (S = move down). Check whether WASD uses `addKey` or cursor keys. Verified: WASD uses separate `this.wasd = { W, A, S, D }` objects. Phaser allows the same key to have multiple listeners — the movement handler checks a different code path. However, to avoid ambiguity, `P` (for "Profile") is the safer choice if `S` creates conflict.

### Pattern 4: Level-Up Detection in statsStore
**What:** Compare incoming `CharStatsPayload.base` against previous base in the `setStats` action. If any base stat increased, compute deltas and store them in `levelUpDeltas`. A `useEffect` in a notification component reads `levelUpDeltas` and auto-dismisses after 3 seconds.
**When to use:** statsStore.ts `setStats` action; LevelUpNotification component.
**Example:**
```typescript
// Source: statsStore.ts pattern (existing store structure)
interface StatsState {
  stats: CharStatsPayload | null;
  levelUpDeltas: Partial<CharacterStats> | null; // non-zero deltas only
  setStats: (payload: CharStatsPayload) => void;
  clearStats: () => void;
  clearLevelUpDeltas: () => void;
}

// In setStats:
setStats: (payload: CharStatsPayload) =>
  set((state) => {
    const prev = state.stats;
    if (prev) {
      const deltas: Partial<CharacterStats> = {};
      for (const key of CHAR_STAT_KEYS) {
        const delta = payload.base[key] - prev.base[key];
        if (delta > 0) deltas[key] = delta;
      }
      if (Object.keys(deltas).length > 0) {
        state.levelUpDeltas = deltas;
      }
    }
    state.stats = payload;
  }),
```

### Pattern 5: LevelUpNotification Auto-Dismiss
**What:** Component reads `levelUpDeltas` from statsStore, renders an overlay when non-null, starts a 3-second timer via `useEffect` that calls `clearLevelUpDeltas`. Follows ReconnectOverlay.tsx structure.
**When to use:** Mounted unconditionally inside `<GameUI>` (no `showX` guard needed — it self-manages visibility).
**Example:**
```tsx
// Source: ReconnectOverlay.tsx pattern (verified)
export const LevelUpNotification: React.FC = () => {
  const { levelUpDeltas, clearLevelUpDeltas } = useStatsStore();

  useEffect(() => {
    if (!levelUpDeltas) return;
    const timer = setTimeout(() => clearLevelUpDeltas(), 3000);
    return () => clearTimeout(timer);
  }, [levelUpDeltas, clearLevelUpDeltas]);

  if (!levelUpDeltas) return null;

  return (
    <div className="levelup-overlay">
      <div className="levelup-notification">
        <div className="levelup-title">Level Up!</div>
        <div className="levelup-deltas">
          {STAT_DISPLAY_ORDER
            .filter(({ key }) => levelUpDeltas[key] !== undefined)
            .map(({ key, label }) => (
              <span key={key} className="levelup-delta">
                +{levelUpDeltas[key]} {label}
              </span>
            ))}
        </div>
      </div>
    </div>
  );
};
```

### Pattern 6: ItemTooltip Stat Comparison (STAT-18)
**What:** Extend existing `ItemTooltip.tsx` with an optional `equippedItem?: ItemDefinition` prop. When present, compute stat bonuses for both items using `resolveEffectsForTrigger` and show per-key deltas with green (+) or red (-) color. Uses `ComputedStats`-style keys from legacy effects, not CharacterStats fields.
**When to use:** In InventoryPanel's `SortableSlot`, pass the equipped item in the same slot. In EquipmentPanel's `EquipSlot`, no comparison needed (already equipped).

**Critical: stat bonus extraction uses legacy ComputedStats keys, not CharacterStats fields:**
```typescript
// Source: packages/game-logic/src/inventory/effects.ts (resolveEffect output)
// Source: packages/game-logic/src/inventory/stats.ts (effectiveStats logic)
function extractStatBonuses(item: ItemDefinition): Record<string, number> {
  const effects = [
    ...resolveEffectsForTrigger(item.effects, 'on_equip'),
    ...resolveEffectsForTrigger(item.effects, 'passive'),
  ];
  const bonuses: Record<string, number> = {};
  for (const result of effects) {
    for (const [key, value] of Object.entries(result.applied)) {
      bonuses[key] = (bonuses[key] ?? 0) + value;
    }
  }
  return bonuses;
}
```

**Slot mapping for InventoryPanel:**
The slot comparison requires knowing which equipment slot an item occupies (`itemDef.equipSlot`) and what is currently equipped in that slot. InventoryStore has `inventory.equipment` with named slots: `exosuit`, `tool`, `accessory1`, `accessory2`, `modules[]`. The `SortableSlot` component must read both `inventoryStore` and `ItemRegistry` to get the equipped item in the same slot.

### Anti-Patterns to Avoid
- **Reading `CharStatsPayload.equipment` for tooltip comparison:** Those values are all-zeros for current items because no item's `on_equip` effect maps to CharacterStats keys. Use `resolveEffectsForTrigger` instead.
- **Using `document.addEventListener('keydown')` for the stats toggle key:** Existing panels use Phaser WorldScene keyboard. ActionBar uses `document.addEventListener` only because it needs numeric keys 1-8. Panel toggles must use the Phaser path to respect `setKeyboardEnabled`.
- **Putting level-up deltas in gameStore:** gameStore is not immer-based and is shared with Phaser. The level-up deltas belong in statsStore alongside the stats payload they came from.
- **Mounting LevelUpNotification inside StatsPanel:** The notification must be visible even when the StatsPanel is closed. Mount it directly in GameUI.tsx.
- **Forgetting `pointer-events: auto` on notification overlay:** `game-ui` has `pointer-events: none` by default. The notification needs to opt in.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Tooltip positioning | Manual absolute positioning | `@floating-ui/react` (already in ItemTooltip.tsx) | Handles viewport flip, portal, z-index |
| Drag behavior for panel | Custom mousedown handler | `useDraggablePanel` hook (already exists) | Handles mouse capture, offset calculation |
| Immer mutation | Spread operators in Zustand | immer middleware (matches inventoryStore) | Prevents accidental mutation bugs |
| Stat key iteration | Hardcoded `if` chains per stat | `STAT_DISPLAY_ORDER` constant array | Maintainable when new stats added |
| Auto-dismiss timer | Custom animation library | `setTimeout` + `clearTimeout` in useEffect | Sufficient for 3-second dismiss; matches project simplicity |

**Key insight:** Every UI primitive needed — draggable panels, floating tooltips, timed overlays, Phaser keyboard integration — already exists in the codebase. Phase 32 assembles these parts, it does not build new infrastructure.

## Common Pitfalls

### Pitfall 1: S Key Conflicts with WASD Movement
**What goes wrong:** Adding Phaser listener for `S` key causes both movement (down) and stats toggle to fire on the same keypress.
**Why it happens:** Phaser adds two listeners to the same key code — both fire on 'down'.
**How to avoid:** Use `P` (for Profile/Panel) as the stats toggle key instead. Verify by checking `this.wasd` in WorldScene.ts — WASD uses `addKey()` for W/A/S/D, which means S is already registered. The `if (this.input.keyboard?.enabled)` guard does NOT prevent both listeners from firing.
**Warning signs:** Player moves down AND stats panel toggles simultaneously on S press.

### Pitfall 2: Level-Up Delta False Positives on Initial Load
**What goes wrong:** When stats are first received (prev === null), no comparison happens. But if `setStats` is called twice in rapid succession (e.g., auth emit + equip emit on same connection), the second call may detect a delta even though no level-up occurred.
**Why it happens:** Equipment changes also cause `stats:update`, and the total stat changes. Base stats should NOT change when only equipment changes — only when level changes.
**How to avoid:** Compare `payload.base` vs `prev.base`, NOT `payload.total` vs `prev.total`. Base stats only change on level-up. Equipment affects total and equipment fields, never base.
**Warning signs:** Level-up notification appears after equipping an item.

### Pitfall 3: Tooltip Comparison Shows Wrong Equipped Item for Modules
**What goes wrong:** Modules occupy `equipSlot: 'module'` but there are multiple module slots. The tooltip comparison should compare against the weakest or first equipped module, but the logic must handle multiple modules.
**Why it happens:** `inventory.equipment.modules` is an array, not a single item. The `equipSlot: 'module'` on `ItemDefinition` does not indicate which index.
**How to avoid:** For module items in the tooltip, compare against the first equipped module (`inventory.equipment.modules[0]`) or show a simple "total equipped module bonus" rather than per-slot comparison. Document this limitation clearly.
**Warning signs:** TypeScript errors accessing `inventory.equipment.module` (singular) when modules is always an array.

### Pitfall 4: StatsPanel Missing null Guard
**What goes wrong:** `useStatsStore()` returns `{ stats: null }` before the first `stats:update` event arrives. Accessing `stats.total.durability` without null guard causes TypeError.
**Why it happens:** statsStore initializes to `null`; first emit arrives asynchronously after auth.
**How to avoid:** Add `if (!stats) return null;` at top of StatsPanel, same pattern as `if (!inventory) return null` in InventoryPanel.tsx.
**Warning signs:** "Cannot read properties of null (reading 'total')" at runtime.

### Pitfall 5: LevelUpNotification z-index Below Other Panels
**What goes wrong:** Notification renders behind inventory/equipment panels.
**Why it happens:** `ui-panel` has no z-index; notification overlay needs explicit z-index above panels.
**How to avoid:** Give `.levelup-overlay` a z-index of 500 (between `game-ui` at 100 and `item-tooltip` at 2000). Use `position: fixed`, centered.
**Warning signs:** Notification appears behind open panels.

### Pitfall 6: STAT_DISPLAY_ORDER / CHAR_STAT_KEYS Duplication
**What goes wrong:** `STAT_DISPLAY_ORDER` defined in StatsPanel, `CHAR_STAT_KEYS` defined in statsStore, both iterate CharacterStats keys — easy to have them diverge.
**Why it happens:** Two files need the same key list.
**How to avoid:** Define `STAT_DISPLAY_ORDER` as a const in a shared location (e.g., `apps/web/src/ui/constants.ts` which already has `RARITY_COLORS`). Import from both statsStore and StatsPanel.
**Warning signs:** LevelUpNotification shows different stat names than StatsPanel.

## Code Examples

Verified patterns from official sources:

### 1. Reading statsStore in React component
```tsx
// Source: statsStore.ts (Phase 31 output, verified)
import { useStatsStore } from '../../store/statsStore';

const { stats } = useStatsStore();
if (!stats) return null;

// stats.total.durability — total effective value
// stats.base.durability — level-scaled base
// stats.equipment.durability — equipment bonus delta (currently 0 for all items)
```

### 2. Stat row breakdown display (STAT-16)
```tsx
// Pattern: "Durability 115 (100 base + 15 from modules)"
function StatRow({ label, base, equipment, total }: StatRowProps) {
  return (
    <div className="stat-row">
      <span className="stat-label">{label}</span>
      <span className="stat-total">{total}</span>
      {equipment !== 0 && (
        <span className="stat-breakdown">
          ({base} base + {equipment} from modules)
        </span>
      )}
      {equipment === 0 && (
        <span className="stat-breakdown">({base} base)</span>
      )}
    </div>
  );
}
```

### 3. Phaser keyboard integration (verified from WorldScene.ts lines 186-202)
```typescript
// In WorldScene.ts create() — add alongside existing I/E/C handlers
this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.P).on('down', () => {
  if (this.input.keyboard?.enabled) {
    useGameStore.getState().toggleStats();
  }
});
```

### 4. gameStore extension for stats toggle
```typescript
// Source: gameStore.ts (existing toggleInventory pattern)
// Add to GameState interface:
showStats: boolean;
toggleStats: () => void;

// Add to create():
showStats: false,
toggleStats: () => set((state) => ({ showStats: !state.showStats })),
```

### 5. ItemTooltip stat comparison extraction
```typescript
// Source: packages/game-logic/src/inventory/effects.ts (resolveEffectsForTrigger)
// Source: packages/items/src/types.ts (ItemDefinition.effects)
import { resolveEffectsForTrigger } from '@into-the-void/game-logic';

function extractEquipBonuses(item: ItemDefinition): Record<string, number> {
  const results = [
    ...resolveEffectsForTrigger(item.effects, 'on_equip'),
    ...resolveEffectsForTrigger(item.effects, 'passive'),
  ];
  const bonuses: Record<string, number> = {};
  for (const r of results) {
    for (const [key, value] of Object.entries(r.applied)) {
      bonuses[key] = (bonuses[key] ?? 0) + value;
    }
  }
  return bonuses;
}
```

### 6. ItemTooltip comparison delta rendering (STAT-18)
```tsx
// Delta indicators: green for positive, red for negative
{Object.entries(deltaMap).map(([stat, delta]) => (
  delta !== 0 && (
    <div
      key={stat}
      className={`tooltip-delta ${delta > 0 ? 'tooltip-delta--positive' : 'tooltip-delta--negative'}`}
    >
      {delta > 0 ? '+' : ''}{delta} {stat}
    </div>
  )
))}
```

### 7. LevelUpNotification CSS positioning
```css
/* Source: global.css loading-overlay pattern */
.levelup-overlay {
  position: fixed;
  top: 20%;
  left: 50%;
  transform: translateX(-50%);
  z-index: 500;
  pointer-events: none;
  animation: levelup-fade 3s ease-in-out forwards;
}

@keyframes levelup-fade {
  0% { opacity: 0; transform: translateX(-50%) translateY(-10px); }
  15% { opacity: 1; transform: translateX(-50%) translateY(0); }
  75% { opacity: 1; }
  100% { opacity: 0; }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Legacy `ComputedStats` in `inventory.stats` | `CharStatsPayload` with 8-stat CharacterStats | Phase 30-31 | Two stat systems coexist; items still use legacy effects |
| ItemTooltip shows only ilvl and requiredLevel | ItemTooltip shows stat delta comparison | Phase 32 | Requires `resolveEffectsForTrigger` on client (game-logic import) |
| No stats panel | StatsPanel with breakdown | Phase 32 | Replaces EquipmentPanel's ComputedStats display for character stats |

**Deprecated/outdated:**
- `inventory.stats` (ComputedStats) as the sole stats source — this is still used by HUD.tsx and EquipmentPanel.tsx. Phase 32 does NOT remove it. Both stats systems coexist.
- Item effects currently produce only `armor`, `speedMultiplier`, `hazardResistance`, etc. — not CharacterStats keys. The `CharStatsPayload.equipment` field will show all zeros until items are updated with CharacterStats-mapped effects in a future phase.

## Open Questions

1. **S key vs P key for stats toggle**
   - What we know: `S` is used for WASD movement (move-down). Phaser `addKey()` + `.on('down')` allows multiple listeners, both fire.
   - What's unclear: Whether Phaser prevents the existing `this.wasd.S` movement key from also triggering a new stats listener on the same code.
   - Recommendation: Use `P` (Phaser.Input.Keyboard.KeyCodes.P) to avoid any ambiguity. Update HUD button label to show "P" instead of "S".

2. **Module slot tooltip comparison**
   - What we know: `ItemDefinition.equipSlot === 'module'` but `inventory.equipment.modules` is an array of 0-N items.
   - What's unclear: Which equipped module to compare against when player has multiple modules.
   - Recommendation: Compare the hovered module against the first equipped module (`modules[0]`). If no modules are equipped, show "New bonus" for all stats. Document this limitation in code comments.

3. **LevelUpNotification with CSS animation vs setTimeout**
   - What we know: The `levelUpDeltas` cleared by `clearLevelUpDeltas()` after 3 seconds unmounts the component, cutting the animation.
   - What's unclear: Whether to manage the 3-second timer in the component (setTimeout) or via CSS animation.
   - Recommendation: Use CSS animation for the fade effect (handles enter/exit visually), and `setTimeout` in `useEffect` to call `clearLevelUpDeltas()` after the animation completes. The component visibility is managed by `levelUpDeltas !== null`.

4. **Whether `@into-the-void/game-logic` is importable in the web client**
   - What we know: `ItemRegistry` from `@into-the-void/items` is already imported in InventoryPanel.tsx, ActionBar.tsx, EquipmentPanel.tsx. game-logic is a separate package.
   - What's unclear: Whether game-logic is configured for client import in the Vite build.
   - Recommendation: Check tsconfig paths. If game-logic is not allowed client-side, extract `resolveEffectsForTrigger` to a utility in `apps/web/src/utils/` or use a different comparison approach based on raw effects array iteration.

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection: `apps/web/src/store/statsStore.ts` — CharStatsPayload state structure
- Direct codebase inspection: `apps/web/src/store/gameStore.ts` — toggleInventory/Equipment pattern
- Direct codebase inspection: `apps/web/src/ui/panels/EquipmentPanel.tsx` — draggable panel pattern
- Direct codebase inspection: `apps/web/src/ui/panels/InventoryPanel.tsx` — null guard, keyboard disable pattern
- Direct codebase inspection: `apps/web/src/components/ItemTooltip.tsx` — @floating-ui/react usage
- Direct codebase inspection: `apps/web/src/components/ReconnectOverlay.tsx` — auto-dismiss pattern
- Direct codebase inspection: `apps/web/src/ui/hud/HUD.tsx` — action-bar button pattern
- Direct codebase inspection: `apps/web/src/game/scenes/WorldScene.ts` — Phaser keyboard toggle pattern
- Direct codebase inspection: `apps/web/src/hooks/useDraggablePanel.ts` — drag hook
- Direct codebase inspection: `packages/shared-types/src/core/player.ts` — CharacterStats 8 fields
- Direct codebase inspection: `packages/shared-types/src/game/stats.ts` — CharStatsPayload shape
- Direct codebase inspection: `packages/game-logic/src/stats/char-stats.ts` — computeCharStats, SCALE_CONSTANTS
- Direct codebase inspection: `packages/game-logic/src/inventory/effects.ts` — resolveEffectsForTrigger, legacy effect keys
- Direct codebase inspection: `packages/items/src/definitions/modules.ts` — all current items use legacy effect types
- Direct codebase inspection: `apps/web/src/styles/global.css` — CSS variables, .ui-panel class
- Phase 31 RESEARCH.md — confirms statsStore.ts architecture and socket wiring

### Secondary (MEDIUM confidence)
- Root workspace `package.json` — library versions confirmed (@floating-ui/react ^0.27.18, zustand ^4.5.0, react-icons ^5.5.0, immer ^11.1.4)

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already in project, versions confirmed
- Architecture: HIGH — all patterns verified from existing EquipmentPanel, InventoryPanel, ItemTooltip, ReconnectOverlay
- Pitfalls: HIGH — S key conflict verified by reading WorldScene.ts WASD setup; equipment delta zero confirmed by reading item definitions and resolveEffect() output keys
- Open questions: MEDIUM — S vs P key, game-logic import scope, module slot ambiguity need planner attention

**Research date:** 2026-02-18
**Valid until:** 2026-03-18 (stable codebase; no external dependencies changing)
