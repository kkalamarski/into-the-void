# Phase 71: Quest Objective Tracker HUD - Research

**Researched:** 2026-02-23
**Domain:** React HUD components, Zustand state management
**Confidence:** HIGH

## Summary

Phase 71 requires enhancing the existing QuestTracker HUD component to meet additional requirements: collapse/expand functionality, 3-quest display limit with visual hierarchy, and ensuring live progress updates work correctly.

**Key finding:** A basic QuestTracker component already exists at `apps/web/src/ui/hud/QuestTracker.tsx`. It renders tracked quests from questStore in the top-right corner. However, it lacks: (1) collapse/expand toggle, (2) quest limit with visual hierarchy for primary quest, and (3) positioning relative to minimap to avoid overlap.

**Primary recommendation:** Enhance the existing QuestTracker component rather than building from scratch. Add collapse state (persisted to localStorage), limit display to 3 quests with primary quest styling, and reposition below the connection indicator / safe-zone area.

## State Shape Analysis

### QuestStore (`apps/web/src/store/questStore.ts`)

```typescript
interface QuestState {
  // Active quests being tracked (from server events)
  activeQuests: QuestProgressPayload[];

  // Completed quests history
  completedQuests: CompletedQuest[];

  // Quest IDs being tracked in HUD (persisted to localStorage)
  trackedQuests: Set<string>;

  // Completion reward for modal display
  completedQuestReward: QuestReward | null;

  // Actions
  addActiveQuest: (quest: QuestProgressPayload) => void;
  updateQuestProgress: (data: QuestProgressPayload) => void;
  removeActiveQuest: (questId: string) => void;
  toggleTracked: (questId: string) => void;
  // ...
}
```

### QuestProgressPayload (`packages/shared-types/src/game/quest.ts`)

```typescript
interface QuestProgressPayload {
  questId: string;
  displayName: string;
  description: string;
  state: 'available' | 'active' | 'completed' | 'failed';
  objectives: ObjectiveProgress[];
  rewards: {
    credits?: number;
    xp?: number;
    items?: { itemId: string; quantity: number }[];
  };
}

interface ObjectiveProgress {
  objectiveType: 'kill' | 'gather' | 'explore';
  description: string;
  current: number;
  required: number;
  targetId?: string;
  complete: boolean;
}
```

### Real-time Updates
- Socket events `quest:progress`, `quest:completed`, `quest:abandoned` are wired at module level
- Store updates automatically when server pushes progress changes
- **Live progress updates already work** via `updateQuestProgress` action

## HUD Layout Analysis

### Current Layout (Right Side)
| Element | Position | Z-Index |
|---------|----------|---------|
| Connection Indicator | `top: 10px; right: 10px` | 999 |
| Safe Zone / Combat Indicator | `top: 56px; right: 16px` | 100 |
| Quest Tracker (current) | `top: 60px; right: 16px` | 50 |
| Biome Indicator | `bottom: 210px; right: 20px` | (default) |
| Minimap Border | `bottom: 16px; right: 16px; 188x188px` | (default) |

### Current QuestTracker Position Issue
- Current position at `top: 60px` overlaps with Safe Zone / Combat indicator at `top: 56px`
- No collision avoidance logic exists

### Recommended Position
- Position below Safe Zone / Combat indicator area: `top: ~110px; right: 16px`
- Alternatively, stack above biome indicator: `bottom: 250px; right: 16px` (but this conflicts with chunk loading indicator)
- **Best option:** Dynamic positioning relative to connection indicator, with fixed offset

## Existing QuestTracker Component

```typescript
// apps/web/src/ui/hud/QuestTracker.tsx
export const QuestTracker: React.FC = () => {
  const activeQuests = useQuestStore(state => state.activeQuests);
  const trackedQuests = useQuestStore(state => state.trackedQuests);
  const toggleQuestLog = useGameStore(state => state.toggleQuestLog);

  // Filter to only tracked quests
  const tracked = activeQuests.filter(q => trackedQuests.has(q.questId));

  if (tracked.length === 0) return null;

  return (
    <div className="quest-tracker">
      {tracked.map(quest => (
        <div key={quest.questId} className="tracked-quest" onClick={toggleQuestLog}>
          <div className="tracked-quest-name">{quest.displayName}</div>
          <div className="tracked-quest-objectives">
            {quest.objectives.map((obj, i) => (
              <div key={i} className={`tracked-objective ${obj.complete ? 'tracked-objective--complete' : ''}`}>
                <span className="objective-text">{obj.description}</span>
                <span className="objective-progress">{obj.current}/{obj.required}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
```

### Current CSS (`apps/web/src/ui/hud/QuestTracker.css`)
- Width: 220px
- Background: `--color-bg-secondary`
- Border: 1px solid `--color-border`
- Font sizes: Quest name 13px, objectives 11px
- Hover effect: border accent color, translateX(-2px)

## Architecture Patterns

### Recommended Component Structure

```
apps/web/src/ui/hud/
├── QuestTracker.tsx       # Enhanced (add collapse, limit, hierarchy)
├── QuestTracker.css       # Enhanced styles
```

### State Management Pattern

```typescript
// Local state for collapse (persisted)
const [isCollapsed, setIsCollapsed] = useState(() => {
  return localStorage.getItem('quest-tracker-collapsed') === 'true';
});

// Toggle with persistence
const toggleCollapse = () => {
  setIsCollapsed(prev => {
    localStorage.setItem('quest-tracker-collapsed', (!prev).toString());
    return !prev;
  });
};
```

### Primary Quest Determination
Options for determining "primary" quest:
1. **First tracked quest** (simplest - order matters)
2. **Most recently accepted quest** (needs timestamp in QuestProgressPayload)
3. **Explicit primary flag** (needs questStore extension)

**Recommendation:** Use first tracked quest as primary. The trackedQuests Set maintains insertion order in modern JS.

### Visual Hierarchy Pattern
```css
.tracked-quest--primary {
  border-left: 3px solid var(--color-accent);
  background: rgba(123, 104, 238, 0.1);
}

.tracked-quest--secondary {
  opacity: 0.85;
  font-size: smaller;
}
```

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| State persistence | Custom localStorage wrapper | Direct localStorage with try/catch | Already used in questStore |
| Drag/drop reordering | Custom drag handlers | @dnd-kit/core | Already integrated in codebase |
| Collapse animation | Manual height animation | CSS transition on max-height | Browser-optimized |

## Common Pitfalls

### Pitfall 1: trackedQuests is a Set, not Array
**What goes wrong:** Trying to use `.slice()` or array indexing on Set
**Why it happens:** Set preserves insertion order but has different API
**How to avoid:** Convert to array first: `[...trackedQuests].slice(0, 3)`
**Warning signs:** "trackedQuests.slice is not a function"

### Pitfall 2: Stale closure in localStorage persistence
**What goes wrong:** Toggle function captures stale state value
**Why it happens:** Closure over initial state value
**How to avoid:** Use functional update pattern: `setIsCollapsed(prev => !prev)`
**Warning signs:** Collapse state toggles but localStorage doesn't update correctly

### Pitfall 3: Z-index stacking context
**What goes wrong:** Quest tracker appears behind other HUD elements
**Why it happens:** Parent element creates new stacking context
**How to avoid:** Quest tracker is rendered inside GameUI which has z-index: 100. Keep tracker z-index below 100 but above game canvas
**Warning signs:** Tracker invisible or clickthrough fails

### Pitfall 4: Overlapping with Combat/Safe Zone indicators
**What goes wrong:** Quest tracker overlaps with dynamic indicators
**Why it happens:** Fixed positioning without accounting for other elements
**How to avoid:** Position quest tracker at `top: 110px` or dynamically based on indicator visibility
**Warning signs:** Visual overlap in specific game states

## Code Examples

### Collapse Toggle Header Pattern
```tsx
// Source: Existing codebase patterns (CombatLog, QuestLogPanel)
<div className="quest-tracker-header" onClick={toggleCollapse}>
  <span className="quest-tracker-title">Quests</span>
  <span className="quest-tracker-toggle">
    {isCollapsed ? '>' : 'v'}
  </span>
</div>
{!isCollapsed && (
  <div className="quest-tracker-content">
    {/* Quest items */}
  </div>
)}
```

### Primary Quest Styling
```tsx
// Source: Pattern derived from QuestLogPanel objective styling
const displayQuests = tracked.slice(0, 3);
const primaryQuestId = displayQuests[0]?.questId;

{displayQuests.map((quest, index) => (
  <div
    key={quest.questId}
    className={`tracked-quest ${
      quest.questId === primaryQuestId ? 'tracked-quest--primary' : 'tracked-quest--secondary'
    }`}
  >
    {/* ... */}
  </div>
))}
```

### Objective Progress Display (existing pattern)
```tsx
// Source: apps/web/src/ui/hud/QuestTracker.tsx (current implementation)
<div className={`tracked-objective ${obj.complete ? 'tracked-objective--complete' : ''}`}>
  <span className="objective-text">{obj.description}</span>
  <span className="objective-progress">{obj.current}/{obj.required}</span>
</div>
```

## CSS Variables Reference

```css
/* From apps/web/src/styles/global.css */
--color-bg-primary: #0a0a0f;
--color-bg-secondary: #14141f;
--color-bg-tertiary: #1e1e2e;
--color-text-primary: #e0e0e0;
--color-text-secondary: #a0a0a0;
--color-accent: #7b68ee;
--color-accent-hover: #9370db;
--color-danger: #ff4444;
--color-success: #44ff44;
--color-warning: #ffaa44;
```

## Implementation Checklist

1. **Collapse/Expand functionality**
   - Add local state for collapsed (boolean)
   - Persist to localStorage
   - Add header with toggle icon
   - Animate content visibility with CSS

2. **3-Quest limit with visual hierarchy**
   - Slice tracked quests array to first 3
   - Style first quest as primary (accent border, subtle background)
   - Style remaining quests as secondary (reduced opacity/size)
   - Show count if more than 3 tracked

3. **Position adjustment**
   - Move from `top: 60px` to `top: 110px` to clear safe-zone indicator
   - Keep `right: 16px` alignment with other right-side HUD elements

4. **Live progress updates**
   - Already working via socket event wiring in questStore
   - Zustand selectors ensure reactive updates

## Open Questions

1. **How to determine primary quest?**
   - Recommendation: First in trackedQuests Set (insertion order)
   - Alternative: Add explicit primaryQuestId to questStore
   - **Impact:** Affects visual hierarchy implementation

2. **Should collapsed state persist across sessions?**
   - Recommendation: Yes, localStorage (matches trackedQuests pattern)
   - Current implementation proposal includes this

## Sources

### Primary (HIGH confidence)
- `/apps/web/src/store/questStore.ts` - Quest state shape, socket event handling
- `/apps/web/src/ui/hud/QuestTracker.tsx` - Existing component implementation
- `/apps/web/src/ui/hud/QuestTracker.css` - Current styling
- `/apps/web/src/ui/hud/HUD.css` - HUD layout positioning
- `/apps/web/src/styles/loading.css` - Connection indicator positioning
- `/packages/shared-types/src/game/quest.ts` - QuestProgressPayload type

### Secondary (MEDIUM confidence)
- `/apps/web/src/ui/panels/QuestLogPanel.tsx` - Quest display patterns
- `/apps/web/src/ui/GameUI.tsx` - Component hierarchy and rendering order

## Metadata

**Confidence breakdown:**
- Quest state shape: HIGH - Direct code inspection
- HUD layout: HIGH - Direct CSS inspection
- Positioning conflicts: HIGH - Measured from CSS values
- Primary quest determination: MEDIUM - Implementation choice, not verified

**Research date:** 2026-02-23
**Valid until:** 2026-03-25 (30 days - stable domain)
