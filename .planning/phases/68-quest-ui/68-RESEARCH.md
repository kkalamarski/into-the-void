# Phase 68: Quest UI - Research

**Researched:** 2026-02-22
**Domain:** React UI with Zustand state management, real-time WebSocket updates, quest tracking HUD
**Confidence:** HIGH

## Summary

Phase 68 implements client-side quest UI components that consume quest data from the server-side quest system built in Phases 64-67. The implementation follows established codebase patterns: Zustand stores for state management, panel components with drag-and-drop support, HUD tracker overlays, and WebSocket event handlers for real-time updates.

The codebase already has all architectural patterns needed: NpcStore demonstrates quest integration (Phase 67), BuffBar shows real-time countdown tracking, CombatLogStore demonstrates event-driven updates, and NpcInteractionModal contains quest acceptance UI. The primary work is extracting quest state from NpcStore into a dedicated QuestStore and creating display components.

**Primary recommendation:** Build QuestStore as a dedicated Zustand store separate from NpcStore, follow existing panel patterns (InventoryPanel, NpcInteractionModal) for quest log, use HUD overlay pattern (BuffBar) for active quest tracker, and leverage existing modal patterns (DeathScreen, LevelUpNotification) for quest completion/acceptance modals.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| zustand | 5.0.2 (current) | State management | Already used for gameStore, npcStore, inventoryStore, statsStore, combatLogStore, buffStore, actionBarStore, alertStore - minimal boilerplate, no Provider needed |
| react | 18.3.1 (current) | UI framework | Codebase standard, functional components with hooks |
| socket.io-client | 4.8.1 (current) | WebSocket events | Real-time quest:progress, quest:completed, quest:abandoned events |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @dnd-kit/core | 6.3.1 (current) | Drag-and-drop | Already used in GameUI.tsx for inventory/equipment - NOT needed for quest panels |
| zustand/middleware/immer | 5.0.2 | Immutable updates | Optional - use for complex nested state (see statsStore.ts, actionBarStore.ts) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Zustand | React Context + useReducer | More boilerplate, codebase already standardized on Zustand |
| Separate QuestStore | Expand NpcStore | Quest state outlives NPC interactions (tracked quests persist after closing modal) |
| localStorage persistence | Server as source of truth | Server already persists quest state; client only caches for display |

**Installation:**
No new dependencies required - all libraries already in package.json.

## Architecture Patterns

### Recommended Project Structure
```
apps/web/src/
├── store/
│   └── questStore.ts          # Zustand store with activeQuests, completedQuests, trackedQuests
├── ui/
│   ├── panels/
│   │   ├── QuestLogPanel.tsx  # Tabbed panel (Active/Available/Completed)
│   │   └── QuestLogPanel.css
│   ├── hud/
│   │   ├── QuestTracker.tsx   # HUD overlay with tracked quest objectives
│   │   └── QuestTracker.css
│   └── modals/
│       ├── QuestAcceptModal.tsx  # Quest acceptance with reward preview
│       ├── QuestAcceptModal.css
│       ├── QuestCompleteModal.tsx  # Reward display on completion
│       └── QuestCompleteModal.css
└── GameUI.tsx                 # Wire QuestLogPanel, QuestTracker, modals
```

### Pattern 1: Zustand Store with WebSocket Event Handlers
**What:** Store defined with state + actions, socket event handlers registered at module level
**When to use:** Quest state needs to be accessible across multiple components, updates driven by server events
**Example:**
```typescript
// Source: apps/web/src/store/npcStore.ts (lines 57-72)
export const useQuestStore = create<QuestState>((set) => ({
  activeQuests: [],
  completedQuests: [],
  trackedQuests: new Set(),
  addActiveQuest: (quest) => set((state) => ({
    activeQuests: [...state.activeQuests, quest]
  })),
  updateQuestProgress: (questId, objectives) => set((state) => ({
    activeQuests: state.activeQuests.map(q =>
      q.questId === questId ? { ...q, objectives } : q
    )
  })),
  // ... other actions
}));

// Module-level socket event handlers (outside create())
gameSocket.on('quest:progress', (data: QuestProgressPayload) => {
  useQuestStore.getState().updateQuestProgress(data.questId, data.objectives);
});
```

### Pattern 2: Tabbed Panel with useDraggablePanel Hook
**What:** UI panel with tab navigation, draggable header, close button
**When to use:** Quest log needs Active/Available/Completed tabs
**Example:**
```typescript
// Source: apps/web/src/ui/panels/NpcInteractionModal.tsx (lines 25-269)
export const QuestLogPanel: React.FC = () => {
  const { position, isDragging, handleMouseDown } = useDraggablePanel();
  const [activeTab, setActiveTab] = useState<'active' | 'available' | 'completed'>('active');
  const { activeQuests, completedQuests, toggleQuestLog } = useQuestStore();

  return (
    <div className="quest-log-panel ui-panel"
         style={{ transform: `translate(-50%, -50%) translate(${position.x}px, ${position.y}px)` }}>
      <div className="quest-log-header"
           onMouseDown={handleMouseDown}
           style={{ cursor: isDragging ? 'grabbing' : 'grab' }}>
        <span>Quest Log</span>
        <button className="close-btn" onClick={toggleQuestLog}>&times;</button>
      </div>
      <div className="quest-tabs">
        <button className={activeTab === 'active' ? 'quest-tab--active' : ''}
                onClick={() => setActiveTab('active')}>Active</button>
        {/* ... other tabs */}
      </div>
      <div className="quest-tab-content">
        {activeTab === 'active' && renderActiveQuests(activeQuests)}
      </div>
    </div>
  );
};
```

### Pattern 3: HUD Overlay with Auto-Update
**What:** Fixed-position overlay that updates every render cycle, no manual refresh
**When to use:** Quest tracker displays live progress for tracked quests
**Example:**
```typescript
// Source: apps/web/src/ui/hud/BuffBar.tsx (lines 55-69)
export const QuestTracker: React.FC = () => {
  const trackedQuests = useQuestStore(state =>
    state.activeQuests.filter(q => state.trackedQuests.has(q.questId))
  );

  if (trackedQuests.length === 0) return null;

  return (
    <div className="quest-tracker">
      {trackedQuests.map(quest => (
        <div key={quest.questId} className="tracked-quest">
          <div className="quest-name">{quest.displayName}</div>
          {quest.objectives.map((obj, i) => (
            <div key={i} className={obj.complete ? 'objective-complete' : ''}>
              {obj.description}: {obj.current}/{obj.required}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};
```

### Pattern 4: Modal with Auto-Dismiss Timer
**What:** Overlay modal that displays temporarily, auto-removes after timeout
**When to use:** Quest completion notification with rewards display
**Example:**
```typescript
// Source: apps/web/src/components/LevelUpNotification.tsx (lines 6-33)
export const QuestCompleteModal: React.FC = () => {
  const { completedQuestReward, clearCompletedReward } = useQuestStore();

  useEffect(() => {
    if (!completedQuestReward) return;
    const timer = setTimeout(() => clearCompletedReward(), 5000);
    return () => clearTimeout(timer);
  }, [completedQuestReward, clearCompletedReward]);

  if (!completedQuestReward) return null;

  return (
    <div className="quest-complete-overlay">
      <div className="quest-complete-modal">
        <h2>Quest Complete!</h2>
        <p>{completedQuestReward.displayName}</p>
        <div className="rewards">
          {completedQuestReward.rewards.credits && <span>+{completedQuestReward.rewards.credits} credits</span>}
          {completedQuestReward.rewards.xp && <span>+{completedQuestReward.rewards.xp} XP</span>}
        </div>
      </div>
    </div>
  );
};
```

### Pattern 5: Keyboard Event Handler with Input Guard
**What:** Global keyboard listener that respects input fields
**When to use:** Toggle quest log with hotkey (e.g., 'Q' key)
**Example:**
```typescript
// Source: apps/web/src/ui/hud/HUD.tsx (lines 48-66)
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    // Don't trigger if typing in input or textarea
    if (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement
    ) {
      return;
    }

    if (e.key.toLowerCase() === 'q') {
      toggleQuestLog();
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [toggleQuestLog]);
```

### Pattern 6: Disable Phaser Input When Modal Open
**What:** Disable Phaser keyboard when UI panel is active to prevent game controls from firing
**When to use:** Quest log panel is open
**Example:**
```typescript
// Source: apps/web/src/ui/panels/InventoryPanel.tsx (lines 121-136)
useEffect(() => {
  const game = useGameStore.getState().game;
  const worldScene = game?.getWorldScene();
  if (worldScene) {
    worldScene.setKeyboardEnabled(false);
  }

  return () => {
    const game = useGameStore.getState().game;
    const worldScene = game?.getWorldScene();
    if (worldScene) {
      worldScene.setKeyboardEnabled(true);
    }
  };
}, []);
```

### Anti-Patterns to Avoid
- **Don't store server state in local storage:** Quest progress is server-authoritative; localStorage only for UI preferences (tracked quests)
- **Don't duplicate quest data in multiple stores:** NpcStore should NOT hold quest state; QuestStore is single source of truth
- **Don't poll for updates:** Use WebSocket events (quest:progress) for real-time updates, not timer-based polling
- **Don't mutate Zustand state directly:** Use set() function or immer middleware for immutable updates

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Draggable panels | Custom drag handlers with mouse events | useDraggablePanel hook (existing) | Already tested, handles edge cases (button clicks, drag offset, cleanup) |
| Auto-dismiss notifications | setTimeout + manual cleanup | Existing alertStore pattern or LevelUpNotification pattern | Handles multiple alerts, auto-cleanup, prevents memory leaks |
| Tab navigation | Custom tab state + CSS classes | Existing NpcInteractionModal tab pattern | Accessible, keyboard-friendly, consistent styling |
| Real-time UI updates | Manual store updates in components | Module-level socket event handlers | Ensures updates happen regardless of component mount state |
| Keyboard shortcuts | Component-level event listeners | Global listener with input guards (HUD.tsx pattern) | Prevents conflicts with text input, centralizes keyboard handling |

**Key insight:** Codebase already has robust patterns for every UI component type needed. Reuse existing hooks, patterns, and CSS class conventions rather than creating new abstractions.

## Common Pitfalls

### Pitfall 1: Quest State Sync Between NpcStore and QuestStore
**What goes wrong:** NpcStore already receives availableQuests/activeQuests/readyQuests in npc:interact:response. Creating a separate QuestStore can cause state duplication/desync.
**Why it happens:** Phase 67 added quest data to NPC interactions before dedicated quest UI existed.
**How to avoid:** QuestStore should be the single source of truth for quest state. NpcStore can reference quest data via questId, but full quest objects live in QuestStore. When npc:interact:response arrives, update QuestStore (if quest data changed), then NpcInteractionModal reads from QuestStore.
**Warning signs:** Quest progress updates in tracker but not in NPC modal, or vice versa.

### Pitfall 2: WebSocket Event Handler Registration Timing
**What goes wrong:** Socket event handlers registered inside components can miss early events or register multiple times.
**Why it happens:** Components mount/unmount during navigation, but socket connection persists.
**How to avoid:** Register socket event handlers at module level (outside create() call) in store files, just like npcStore.ts lines 74-77 and combatLogStore.ts lines 54-97.
**Warning signs:** Quest progress events logged in console but UI doesn't update, or duplicate event handlers firing.

### Pitfall 3: Tracked Quests Persistence
**What goes wrong:** Player tracks quest, refreshes page, tracker shows nothing.
**Why it happens:** trackedQuests Set is in-memory only, not persisted.
**How to avoid:** Store tracked quest IDs in localStorage (see actionBarStore.ts loadFromStorage/saveToStorage pattern). Load on store initialization, save on every track/untrack action.
**Warning signs:** User loses tracked quest selections on page reload.

### Pitfall 4: Quest Completion Modal Overlap with Other Modals
**What goes wrong:** Quest completion modal appears behind NPC interaction modal or death screen.
**Why it happens:** z-index conflicts between overlapping modals.
**How to avoid:** Quest completion modal should have higher z-index than panels, but lower than death screen. Use CSS z-index layering: panels (100) < quest modals (200) < death screen (1000).
**Warning signs:** Quest completion notification hidden behind other UI.

### Pitfall 5: Objective Progress Counter Race Conditions
**What goes wrong:** Player kills creature, quest tracker shows old count briefly before updating.
**Why it happens:** quest:progress event arrives after combat:damage event; UI renders before quest state updates.
**How to avoid:** Accept that quest progress is eventually consistent. Don't try to predict objective completion client-side; trust server quest:progress events.
**Warning signs:** Quest tracker flickers or shows incorrect counts temporarily.

### Pitfall 6: Memory Leaks from Uncleaned setTimeout in Modals
**What goes wrong:** Quest completion modal component unmounts but setTimeout still fires, causing setState on unmounted component warning.
**Why it happens:** useEffect cleanup not properly handling timer cancellation.
**How to avoid:** Always return cleanup function from useEffect that clears timer (see LevelUpNotification.tsx lines 9-13).
**Warning signs:** React warnings about setState on unmounted component in console.

### Pitfall 7: Quest Log Tab Not Resetting on Close
**What goes wrong:** Player opens quest log on "Completed" tab, closes it, reopens - still on "Completed" tab instead of "Active".
**Why it happens:** activeTab useState persists across component remounts if not reset.
**How to avoid:** Either reset activeTab to 'active' when toggleQuestLog is called, OR accept that tab state persists (user preference). Codebase precedent (NpcInteractionModal) does NOT reset tab state.
**Warning signs:** User complaints about unexpected default tab.

## Code Examples

Verified patterns from existing codebase:

### Quest Store with WebSocket Event Handlers
```typescript
// Adapted from apps/web/src/store/combatLogStore.ts
import { create } from 'zustand';
import { gameSocket } from '../network/socket';
import type { QuestProgressPayload } from '@into-the-void/shared-types';

interface QuestState {
  activeQuests: QuestProgressPayload[];
  completedQuests: Array<{ questId: string; displayName: string; completedAt: number }>;
  trackedQuests: Set<string>;
  completedQuestReward: { displayName: string; rewards: any } | null;

  addActiveQuest: (quest: QuestProgressPayload) => void;
  updateQuestProgress: (data: QuestProgressPayload) => void;
  removeActiveQuest: (questId: string) => void;
  addCompletedQuest: (questId: string, displayName: string) => void;
  toggleTracked: (questId: string) => void;
  setCompletedReward: (reward: any) => void;
  clearCompletedReward: () => void;
}

export const useQuestStore = create<QuestState>((set) => ({
  activeQuests: [],
  completedQuests: [],
  trackedQuests: new Set(),
  completedQuestReward: null,

  addActiveQuest: (quest) => set((state) => ({
    activeQuests: [...state.activeQuests, quest]
  })),

  updateQuestProgress: (data) => set((state) => ({
    activeQuests: state.activeQuests.map(q =>
      q.questId === data.questId ? data : q
    )
  })),

  removeActiveQuest: (questId) => set((state) => ({
    activeQuests: state.activeQuests.filter(q => q.questId !== questId)
  })),

  addCompletedQuest: (questId, displayName) => set((state) => ({
    completedQuests: [
      ...state.completedQuests,
      { questId, displayName, completedAt: Date.now() }
    ]
  })),

  toggleTracked: (questId) => set((state) => {
    const newTracked = new Set(state.trackedQuests);
    if (newTracked.has(questId)) {
      newTracked.delete(questId);
    } else {
      newTracked.add(questId);
    }
    return { trackedQuests: newTracked };
  }),

  setCompletedReward: (reward) => set({ completedQuestReward: reward }),
  clearCompletedReward: () => set({ completedQuestReward: null }),
}));

// Module-level socket event handlers
gameSocket.on('quest:progress', (data: QuestProgressPayload) => {
  const store = useQuestStore.getState();
  const exists = store.activeQuests.some(q => q.questId === data.questId);
  if (exists) {
    store.updateQuestProgress(data);
  } else {
    store.addActiveQuest(data);
  }
});

gameSocket.on('quest:completed', (data: { questId: string; displayName: string; rewards: any }) => {
  const store = useQuestStore.getState();
  store.removeActiveQuest(data.questId);
  store.addCompletedQuest(data.questId, data.displayName);
  store.setCompletedReward(data);
});

gameSocket.on('quest:abandoned', (data: { questId: string }) => {
  useQuestStore.getState().removeActiveQuest(data.questId);
});
```

### Quest Tracker HUD Overlay
```typescript
// Adapted from apps/web/src/ui/hud/BuffBar.tsx
import React from 'react';
import { useQuestStore } from '../../store/questStore';
import './QuestTracker.css';

export const QuestTracker: React.FC = () => {
  const activeQuests = useQuestStore(state => state.activeQuests);
  const trackedQuests = useQuestStore(state => state.trackedQuests);

  // Filter to only tracked quests
  const tracked = activeQuests.filter(q => trackedQuests.has(q.questId));

  if (tracked.length === 0) return null;

  return (
    <div className="quest-tracker">
      {tracked.map(quest => (
        <div key={quest.questId} className="tracked-quest">
          <div className="quest-name">{quest.displayName}</div>
          <div className="quest-objectives">
            {quest.objectives.map((obj, i) => (
              <div
                key={i}
                className={`objective ${obj.complete ? 'objective-complete' : ''}`}
              >
                {obj.description}: {obj.current}/{obj.required}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
```

### Quest Log Panel with Tabs
```typescript
// Adapted from apps/web/src/ui/panels/NpcInteractionModal.tsx
import React, { useState, useEffect } from 'react';
import { useQuestStore } from '../../store/questStore';
import { useGameStore } from '../../store/gameStore';
import { useDraggablePanel } from '../../hooks/useDraggablePanel';
import './QuestLogPanel.css';

export const QuestLogPanel: React.FC = () => {
  const { position, isDragging, handleMouseDown } = useDraggablePanel();
  const [activeTab, setActiveTab] = useState<'active' | 'available' | 'completed'>('active');
  const { activeQuests, completedQuests, trackedQuests, toggleTracked } = useQuestStore();
  const toggleQuestLog = useGameStore(state => state.toggleQuestLog);

  // Disable Phaser keyboard when panel is open
  useEffect(() => {
    const game = useGameStore.getState().game;
    const worldScene = game?.getWorldScene();
    if (worldScene) {
      worldScene.setKeyboardEnabled(false);
    }
    return () => {
      const game = useGameStore.getState().game;
      const worldScene = game?.getWorldScene();
      if (worldScene) {
        worldScene.setKeyboardEnabled(true);
      }
    };
  }, []);

  return (
    <div
      className="quest-log-panel ui-panel"
      style={{ transform: `translate(-50%, -50%) translate(${position.x}px, ${position.y}px)` }}
    >
      <div
        className="quest-log-header"
        onMouseDown={handleMouseDown}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        <span>Quest Log</span>
        <button className="close-btn" onClick={toggleQuestLog}>&times;</button>
      </div>

      <div className="quest-tabs">
        <button
          className={`quest-tab ${activeTab === 'active' ? 'quest-tab--active' : ''}`}
          onClick={() => setActiveTab('active')}
        >
          Active ({activeQuests.length})
        </button>
        <button
          className={`quest-tab ${activeTab === 'completed' ? 'quest-tab--active' : ''}`}
          onClick={() => setActiveTab('completed')}
        >
          Completed ({completedQuests.length})
        </button>
      </div>

      <div className="quest-tab-content">
        {activeTab === 'active' && (
          <div className="quest-list">
            {activeQuests.map(quest => (
              <div key={quest.questId} className="quest-item">
                <h4>{quest.displayName}</h4>
                <p>{quest.description}</p>
                <div className="quest-objectives">
                  {quest.objectives.map((obj, i) => (
                    <div key={i} className={obj.complete ? 'objective-complete' : ''}>
                      {obj.description}: {obj.current}/{obj.required}
                    </div>
                  ))}
                </div>
                <button onClick={() => toggleTracked(quest.questId)}>
                  {trackedQuests.has(quest.questId) ? 'Untrack' : 'Track'}
                </button>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'completed' && (
          <div className="quest-list">
            {completedQuests.map(quest => (
              <div key={quest.questId} className="quest-item quest-item--completed">
                <h4>{quest.displayName}</h4>
                <p className="completion-time">
                  Completed {new Date(quest.completedAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
```

### Quest Completion Modal with Auto-Dismiss
```typescript
// Adapted from apps/web/src/components/LevelUpNotification.tsx
import React, { useEffect } from 'react';
import { useQuestStore } from '../store/questStore';
import './QuestCompleteModal.css';

export const QuestCompleteModal: React.FC = () => {
  const { completedQuestReward, clearCompletedReward } = useQuestStore();

  useEffect(() => {
    if (!completedQuestReward) return;
    const timer = setTimeout(() => clearCompletedReward(), 5000);
    return () => clearTimeout(timer);
  }, [completedQuestReward, clearCompletedReward]);

  if (!completedQuestReward) return null;

  return (
    <div className="quest-complete-overlay">
      <div className="quest-complete-modal">
        <div className="quest-complete-title">Quest Complete!</div>
        <div className="quest-complete-name">{completedQuestReward.displayName}</div>
        <div className="quest-rewards">
          {completedQuestReward.rewards.credits && (
            <span className="reward">+{completedQuestReward.rewards.credits} credits</span>
          )}
          {completedQuestReward.rewards.xp && (
            <span className="reward">+{completedQuestReward.rewards.xp} XP</span>
          )}
          {completedQuestReward.rewards.items?.map((item, i) => (
            <span key={i} className="reward">
              {item.quantity}x {item.itemId}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Redux for all state | Zustand for client state | 2023-2024 | Codebase uses Zustand exclusively; no Redux patterns |
| Class components | Functional components + hooks | React 16.8+ (2019) | All components use function syntax with useState/useEffect |
| Prop drilling | Zustand global stores | Current codebase | State accessed via useStore hooks, no Provider needed |
| Inline styles | CSS modules / plain CSS | Current codebase | All components have companion .css files with CSS variables |
| setTimeout without cleanup | useEffect with cleanup | React best practices | LevelUpNotification.tsx, BuffBar.tsx show proper cleanup |

**Deprecated/outdated:**
- Redux Toolkit: Not used in codebase, all state management is Zustand
- React Context for global state: Zustand replaces Context API for global stores
- Class-based components: Entire codebase is functional components
- CSS-in-JS libraries (styled-components, emotion): Plain CSS with CSS variables used throughout

## Open Questions

1. **Should quest acceptance flow through QuestStore or NpcStore?**
   - What we know: NpcInteractionModal already has quest acceptance UI (lines 99-115), calls npcStore.acceptQuest() which emits quest:accept
   - What's unclear: Whether to keep acceptance in NpcStore (current) or move to QuestStore for consistency
   - Recommendation: Keep quest:accept in NpcStore (it's an NPC interaction), but QuestStore should listen for quest:progress to add newly accepted quest to activeQuests

2. **How to handle "Available Quests" tab when no NPC is open?**
   - What we know: npc:interact:response includes availableQuests, but this data only exists during NPC interaction
   - What's unclear: How to populate "Available Quests" tab in standalone quest log
   - Recommendation: Omit "Available Quests" tab from quest log panel; available quests only shown in NPC interaction modal (matches MMO conventions like WoW)

3. **Should quest tracker position be configurable?**
   - What we know: HUD elements are fixed-position (top-left for player info, bottom-right for minimap)
   - What's unclear: Whether quest tracker should be draggable like panels
   - Recommendation: Fixed position (top-right, below connection indicator) to match HUD convention; avoid draggable HUD elements

4. **How many quests can be tracked simultaneously?**
   - What we know: No server-side limit mentioned in Phase 67 or requirements
   - What's unclear: Should client enforce a limit (e.g., max 5 tracked quests)?
   - Recommendation: Start with no limit; add limit if tracker becomes too tall (UI concern, not server concern)

## Sources

### Primary (HIGH confidence)
- Codebase files (gameStore.ts, npcStore.ts, statsStore.ts, combatLogStore.ts, actionBarStore.ts, alertStore.ts, buffStore.ts)
- Existing UI components (HUD.tsx, GameUI.tsx, InventoryPanel.tsx, NpcInteractionModal.tsx, BuffBar.tsx, LevelUpNotification.tsx, DeathScreen.tsx)
- shared-types package (packages/shared-types/src/network/events.ts, packages/shared-types/src/game/quest.ts)
- Phase 68 requirements (.planning/milestones/v1.15/REQUIREMENTS.md - QUEST-40 through QUEST-45)

### Secondary (MEDIUM confidence)
- [Effortless Modal Management in React with Zustand](https://medium.com/@selvakumar_P/effortless-modal-management-in-react-with-zustand-2e99dc876a82) - Modal state patterns with Zustand
- [State Management in 2026: Comparing Zustand, Signals, and Redux](https://veduis.com/blog/state-management-comparing-zustand-signals-redux/) - Modern state management best practices
- [React Tabs component - Material UI](https://mui.com/material-ui/react-tabs/) - Accessible tab panel patterns
- [Implementing Quest Systems in UE5 Blueprints](https://medium.com/object-oriented-worlds/implementing-quest-systems-in-ue5-blueprints-47ea0ac00599) - Event-driven quest updates
- [AAA HUD Design Best Practices](https://www.iabdi.com/designblog/2022/6/1/nier-automata-chips) - Quest tracker positioning and information density

### Tertiary (LOW confidence)
- [React Stack Patterns](https://www.patterns.dev/react/react-2026/) - General React 2026 patterns
- [React best practices](https://reactdigest.net/newsletters/2200-react-best-practices) - Component architecture guidance

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in package.json, versions verified in codebase
- Architecture patterns: HIGH - All patterns extracted from existing codebase files, line numbers cited
- Quest state management: HIGH - NpcStore and WebSocket events from Phase 67 provide complete blueprint
- UI component patterns: HIGH - Draggable panels, HUD overlays, modals all have existing implementations to follow
- Integration points: MEDIUM - Need to verify how QuestStore and NpcStore coordinate during quest acceptance

**Research date:** 2026-02-22
**Valid until:** 30 days (stable patterns, no fast-moving dependencies)
