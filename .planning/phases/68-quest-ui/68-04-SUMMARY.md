---
phase: 68
plan: 04
subsystem: quest-ui
tags: [ui-integration, keyboard-shortcuts, quest-ui-complete]

dependency_graph:
  requires:
    - phase: 68-01
      provides: "questStore with socket handlers and state management"
    - phase: 68-02
      provides: "QuestLogPanel and QuestTracker components"
    - phase: 68-03
      provides: "QuestCompleteModal component"
  provides:
    - "Complete quest UI integration in game interface"
    - "Q hotkey for quest log toggle (QUEST-45)"
    - "Quest button in HUD action bar"
  affects:
    - GameUI.tsx (quest component rendering)
    - HUD.tsx (keyboard shortcuts and action bar)

tech_stack:
  added: []
  patterns:
    - "Side-effect import pattern for questStore socket handlers"
    - "Conditional rendering based on gameStore.isQuestLogOpen"
    - "Keyboard event handler with input guard"
    - "Action bar button following existing UI conventions"

key_files:
  created: []
  modified:
    - apps/web/src/ui/GameUI.tsx: "Integrated QuestLogPanel, QuestTracker, QuestCompleteModal with side-effect questStore import"
    - apps/web/src/ui/hud/HUD.tsx: "Added Q hotkey handler and Quest button to action bar"

decisions:
  - key: "questStore imported as side-effect in GameUI.tsx"
    why: "Ensures socket handlers register when game UI loads, following statsStore pattern"
    impact: "Quest WebSocket events handled automatically, no manual registration needed"

  - key: "QuestTracker always rendered, QuestLogPanel conditionally rendered"
    why: "Tracker self-manages visibility based on tracked quests, panel controlled by toggle state"
    impact: "Clean separation of concerns, optimal render performance"

  - key: "Quest button placed between Abilities and Chat in action bar"
    why: "Logical grouping of interface/information panels (Inventory, Equipment, Abilities, Quests, Chat)"
    impact: "Intuitive UI layout following left-to-right progression of game systems"

  - key: "Q key handler extends existing keyboard handler useEffect"
    why: "Maintains single event listener for all keyboard shortcuts, efficient pattern"
    impact: "Consistent key handling logic, easy to maintain and extend"

metrics:
  duration: 93
  tasks_completed: 2
  files_created: 0
  files_modified: 2
  commits: 2
  completed_at: 2026-02-22
---

# Phase 68 Plan 04: Quest UI Integration Summary

**Complete quest UI integration with Q hotkey toggle (QUEST-45), action bar button, and proper component rendering in game interface**

## Performance

- **Duration:** 1m 33s
- **Started:** 2026-02-22T20:59:52Z
- **Completed:** 2026-02-22T21:01:25Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Wired QuestLogPanel, QuestTracker, and QuestCompleteModal into GameUI.tsx
- Added side-effect import for questStore to register WebSocket handlers
- Implemented Q hotkey for quest log toggle (QUEST-45)
- Added Quest button to HUD action bar with proper positioning
- All keyboard shortcuts respect input guard (no firing while typing)

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire quest components into GameUI** - `78c3f0c` (feat)
2. **Task 2: Add Q hotkey for quest log in HUD** - `e5b2092` (feat)

## Files Created/Modified

**Modified:**
- `apps/web/src/ui/GameUI.tsx` - Integrated all quest UI components with side-effect questStore import
- `apps/web/src/ui/hud/HUD.tsx` - Added Q hotkey handler and Quest button to action bar

## Implementation Details

### GameUI.tsx Integration

**Side-effect Import Pattern:**
```typescript
import '../store/statsStore'; // Side-effect: registers stats:update socket handler
import '../store/questStore'; // Side-effect: registers quest socket handlers
```

Following the existing statsStore pattern, questStore is imported purely for its side-effects. The module-level socket handlers register automatically when GameUI.tsx loads, ensuring all quest:progress, quest:completed, and quest:abandoned events are handled.

**Component Rendering Order:**
```tsx
<DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
  <div className="game-ui">
    <HUD />
    <QuestTracker />                              {/* Always visible HUD overlay */}
    {showChat && <ChatPanel />}
    {showInventory && <InventoryPanel />}
    {showEquipment && <EquipmentPanel />}
    {showAbilities && <AbilitiesPanel />}
    {isQuestLogOpen && <QuestLogPanel />}         {/* Conditional on toggle state */}
    <LevelUpNotification />
    <QuestCompleteModal />                        {/* Self-conditional on reward state */}
    <AlertNotification />
    {showDeathScreen && <DeathScreen />}
    {interactingNpc && <NpcInteractionModal />}
    {showTrading && <TradingPanel />}
    <div className="minimap-border" />
  </div>
</DndContext>
```

**Positioning Logic:**
- **QuestTracker** - Always rendered after HUD (HUD overlay component, self-manages visibility)
- **QuestLogPanel** - Conditionally rendered with other panels (z-index 100)
- **QuestCompleteModal** - Always rendered after LevelUpNotification (z-index 200, self-conditional)

This ordering ensures proper z-index layering: HUD overlays < panels < modals < death screen.

### HUD.tsx Keyboard Integration

**Extended Keyboard Handler:**
```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    // Don't trigger if typing in input or textarea
    if (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement
    ) {
      return;
    }

    const key = e.key.toLowerCase();
    if (key === 'l') {
      toggleCombatLog();
    } else if (key === 'q') {
      toggleQuestLog(); // QUEST-45: Q toggles quest log
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [toggleCombatLog, toggleQuestLog]);
```

**Input Guard:** Prevents keyboard shortcuts from firing when user is typing in text inputs (chat, NPC dialogue, etc.). Critical for preventing accidental panel toggles during text entry.

**Action Bar Button:**
```tsx
<button className="action-btn" onClick={toggleQuestLog}>
  <span>Q</span>
  <label>Quests</label>
</button>
```

Positioned between Abilities (K) and Chat (C) for logical flow: Inventory → Equipment → Abilities → Quests → Chat. Follows existing action-btn styling conventions for visual consistency.

## Architecture Decisions

**Side-Effect Import vs Manual Registration:**
Chose side-effect import pattern for questStore (matching statsStore) rather than explicit handler registration in GameUI. Benefits:
- Automatic: Socket handlers register when module loads
- Consistent: Same pattern across all specialized stores
- Maintainable: Adding new quest events requires only questStore changes

**Component Rendering Strategy:**
- **QuestTracker**: Always rendered, self-manages visibility based on trackedQuests.size
- **QuestLogPanel**: Conditionally rendered based on isQuestLogOpen toggle
- **QuestCompleteModal**: Always rendered, self-manages visibility based on completedQuestReward

This mixed approach optimizes for each component's usage pattern. Tracker needs to be always present for real-time updates, while panel and modal can be conditionally rendered to reduce React component tree size.

**Keyboard Handler Integration:**
Extended existing `useEffect` keyboard handler rather than creating separate handler. Benefits:
- Single event listener for all shortcuts (performance)
- Consistent input guard logic across all keys
- Easy to add future shortcuts (M for map, etc.)

**Action Bar Positioning:**
Quest button placed between Abilities and Chat based on information hierarchy:
1. Inventory (I) - Core item management
2. Equipment (E) - Character stats/gear
3. Abilities (K) - Combat actions
4. Quests (Q) - Goals/progression **← NEW**
5. Chat (C) - Communication

This left-to-right flow matches player mental model of game systems.

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

All verification steps passed:
- ✅ TypeScript compiles without errors
- ✅ GameUI.tsx imports questStore as side-effect
- ✅ GameUI.tsx renders QuestLogPanel when isQuestLogOpen
- ✅ GameUI.tsx renders QuestTracker and QuestCompleteModal
- ✅ HUD.tsx handles Q keypress to toggle quest log
- ✅ Q key respects input guard (doesn't fire when typing)
- ✅ Quest button added to HUD action bar

**Verification Commands:**
```bash
# Verify questStore side-effect import
grep -n "import.*questStore" apps/web/src/ui/GameUI.tsx
# Output: 13:import '../store/questStore'; // Side-effect: registers quest socket handlers

# Verify conditional rendering
grep -n "isQuestLogOpen.*QuestLogPanel" apps/web/src/ui/GameUI.tsx
# Output: 110:        {isQuestLogOpen && <QuestLogPanel />}

# Verify Q key handler
grep -n "key.*===.*'q'" apps/web/src/ui/hud/HUD.tsx
# Output: 62:      } else if (key === 'q') {

# Verify input guard
grep -n "HTMLInputElement\|HTMLTextAreaElement" apps/web/src/ui/hud/HUD.tsx
# Output: 53-54: Input guard exists
```

## Self-Check: PASSED

**Modified files exist:**
- ✅ FOUND: apps/web/src/ui/GameUI.tsx
- ✅ FOUND: apps/web/src/ui/hud/HUD.tsx

**Commits exist:**
- ✅ FOUND: 78c3f0c (Task 1: Wire quest components into GameUI)
- ✅ FOUND: e5b2092 (Task 2: Add Q hotkey for quest log in HUD)

**Implementation verification:**
- ✅ questStore imported as side-effect (line 13)
- ✅ isQuestLogOpen destructured from useGameStore
- ✅ QuestTracker rendered after HUD (line 105)
- ✅ QuestLogPanel rendered conditionally (line 110)
- ✅ QuestCompleteModal rendered after LevelUpNotification (line 112)
- ✅ toggleQuestLog destructured in HUD.tsx
- ✅ Q key handler added with input guard
- ✅ Quest button added to action bar between Abilities and Chat
- ✅ TypeScript compiles without errors

## Next Steps

This plan completes Phase 68 (Quest UI). The quest system now has:

**Complete UI Integration:**
- Quest log panel (Q hotkey, action bar button)
- Quest tracker in HUD (click to open log)
- Quest completion modal (auto-dismiss celebration)
- Quest markers in NPC interaction modal (Phase 67)

**Remaining Phase 68 Work:**
None - all 4 plans complete (68-01, 68-02, 68-03, 68-04)

**Next Phase (69):**
Likely quest testing, polish, or next milestone feature. Quest system is fully functional and integrated into game UI.

## Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 | 78c3f0c | feat(68-04): wire quest components into GameUI |
| 2 | e5b2092 | feat(68-04): add Q hotkey for quest log in HUD |

---
*Generated: 2026-02-22*
*Duration: 93 seconds*
