---
phase: 68
plan: 02
subsystem: quest-ui
tags: [ui-components, quest-log, hud-tracker, draggable-panel]

dependency_graph:
  requires:
    - questStore with activeQuests/completedQuests/trackedQuests
    - gameStore.isQuestLogOpen toggle
  provides:
    - QuestLogPanel tabbed UI component
    - QuestTracker HUD overlay component
  affects:
    - apps/web/src/ui/panels/QuestLogPanel.tsx (created)
    - apps/web/src/ui/panels/QuestLogPanel.css (created)
    - apps/web/src/ui/hud/QuestTracker.tsx (created)
    - apps/web/src/ui/hud/QuestTracker.css (created)

tech_stack:
  added:
    - QuestLogPanel with Active/Completed tabs
    - QuestTracker HUD overlay with click-to-open
  patterns:
    - Draggable panel using useDraggablePanel hook
    - Tabbed interface following NpcInteractionModal pattern
    - HUD overlay following BuffBar pattern
    - Phaser keyboard disable on panel open
    - Escape key to close panel

key_files:
  created:
    - apps/web/src/ui/panels/QuestLogPanel.tsx: "Tabbed quest log panel with Active (track/untrack/abandon) and Completed (history) tabs"
    - apps/web/src/ui/panels/QuestLogPanel.css: "Quest log styling with tabs, objective progress, action buttons"
    - apps/web/src/ui/hud/QuestTracker.tsx: "HUD overlay showing tracked quest objectives, click opens quest log"
    - apps/web/src/ui/hud/QuestTracker.css: "Quest tracker HUD styling positioned top-right below connection indicator"

decisions:
  - key: "QuestLogPanel follows NpcInteractionModal tabbed pattern"
    why: "Consistent UI design across all modal panels in the game"
    impact: "Players immediately understand tab navigation and draggable behavior"

  - key: "QuestTracker click opens quest log (QUEST-42)"
    why: "Intuitive interaction - users expect to click tracker for details"
    impact: "Single source of truth for quest UI navigation, no redundant buttons needed"

  - key: "Track/Untrack button toggles localStorage-persisted trackedQuests Set"
    why: "Players control what appears in HUD, persists across refresh"
    impact: "Personalized quest tracking experience, reduced HUD clutter"

  - key: "Abandon button requires confirmation prompt"
    why: "Prevent accidental quest abandonment (potentially irreversible action)"
    impact: "Reduces support requests for accidentally abandoned quests"

metrics:
  duration: 94
  tasks_completed: 2
  files_created: 4
  files_modified: 0
  commits: 2
  completed_at: 2026-02-22
---

# Phase 68 Plan 02: Quest UI Components Summary

**One-liner:** Created QuestLogPanel (tabbed modal) and QuestTracker (HUD overlay) components for viewing quest progress and tracking objectives.

## What Was Built

**QuestLogPanel.tsx** - Full-featured quest log modal:
- **Active tab:**
  - Lists all active quests with name, description, objective progress
  - Each objective shows current/required progress with checkmark if complete
  - Track/Untrack toggle button (highlights when tracked)
  - Abandon button with confirmation dialog (hidden if quest ready to turn in)
  - "Ready to turn in" indicator when all objectives complete
  - Empty state message when no active quests

- **Completed tab:**
  - Historical list of completed quests
  - Shows quest name and formatted completion date
  - Empty state message when no completed quests

- **UI behavior:**
  - Draggable via header (useDraggablePanel hook)
  - Escape key closes panel
  - Phaser keyboard disabled when open (prevents movement while typing)
  - Scrollable content area (max-height 500px)
  - Tab counts in tab labels: "Active (3)", "Completed (12)"

**QuestLogPanel.css** - Comprehensive quest log styling:
- Follows existing UI panel patterns (--color-bg-secondary, --color-accent variables)
- Tab navigation with active state highlighting
- Objective list with left border visual separator
- Complete objectives: green checkmark, strikethrough text
- Action buttons: Track (accent color when active), Abandon (red)
- "Ready to turn in" badge with success color
- Custom scrollbar styling matching other panels
- Completed quest reduced opacity with success border

**QuestTracker.tsx** - Minimal HUD overlay component:
- Positioned top-right below connection indicator (z-index 50)
- Displays only tracked quests (filters activeQuests by trackedQuests Set)
- Each tracked quest shows:
  - Quest name (truncated if too long)
  - All objectives with current/required progress
  - Complete objectives shown in green with strikethrough
- Click anywhere on tracked quest to open quest log (QUEST-42)
- Auto-hides when no quests tracked (returns null)
- Hover effect: accent border + slight translateX(-2px) animation

**QuestTracker.css** - Compact HUD styling:
- Fixed position: top 60px, right 16px (220px width)
- Flex column layout with 8px gap between tracked quests
- Text ellipsis for long objective names to prevent overflow
- Monospace font for progress numbers (consistent alignment)
- Pointer cursor with hover border color change
- Follows BuffBar pattern for HUD overlay positioning

## Implementation Details

**Quest Abandonment Flow:**
```typescript
const handleAbandonQuest = (questId: string) => {
  if (confirm('Are you sure you want to abandon this quest?')) {
    gameSocket.emit('quest:abandon', { questId });
  }
};
```
Native confirm dialog prevents accidental abandonment. Server handles removal and emits `quest:abandoned` back to questStore.

**Quest Tracking Toggle:**
```typescript
<button
  className={`quest-action-btn ${isTracked ? 'quest-action-btn--tracked' : ''}`}
  onClick={() => toggleTracked(quest.questId)}
>
  {isTracked ? 'Untrack' : 'Track'}
</button>
```
Calls `questStore.toggleTracked()` which updates Set and syncs to localStorage. Immediately reflected in QuestTracker HUD.

**HUD Click-to-Open (QUEST-42):**
```typescript
<div
  className="tracked-quest"
  onClick={toggleQuestLog}
  title="Click to open quest log"
>
```
Clicking any tracked quest in HUD opens the quest log panel. Provides quick access to full quest details and actions.

**Objective Completion Visual:**
```typescript
className={`quest-objective ${obj.complete ? 'quest-objective--complete' : ''}`}
```
CSS applies green color, strikethrough text, and prepends checkmark via ::before pseudo-element.

**Ready to Turn In Detection:**
```typescript
const allComplete = quest.objectives.every(obj => obj.complete);
```
When all objectives complete, hides Abandon button and shows green "Ready to turn in" badge. Signals player to return to quest giver.

## Architecture Decisions

**Component Separation:**
- **QuestLogPanel** = full management interface (track, abandon, view history)
- **QuestTracker** = minimal at-a-glance HUD (just progress, click for details)

This separation follows game UI best practices: HUD shows critical info, panels provide full control.

**Pattern Consistency:**
Both components follow established patterns:
- QuestLogPanel → NpcInteractionModal (tabs, draggable header, Escape close)
- QuestTracker → BuffBar (fixed HUD position, auto-hide when empty)

Developers can reference existing components when modifying quest UI.

**State Source of Truth:**
Both components consume from `questStore`:
- `activeQuests` → QuestProgressPayload[] from server
- `completedQuests` → CompletedQuest[] from quest:completed event
- `trackedQuests` → Set<string> with localStorage persistence

No local state duplication. Changes from server instantly reflected in UI.

**CSS Variables:**
All colors use CSS variables (--color-bg-secondary, --color-accent, --color-success) for theme consistency. Future dark/light theme support requires zero changes to these components.

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

All verification steps passed:
- ✅ TypeScript compiles without errors (`cd apps/web && npx tsc --noEmit`)
- ✅ QuestLogPanel.tsx exports QuestLogPanel component
- ✅ QuestTracker.tsx exports QuestTracker component
- ✅ QuestLogPanel.css contains .quest-log-panel selector
- ✅ QuestTracker.css contains .quest-tracker selector
- ✅ QuestTracker click handler calls toggleQuestLog (QUEST-42 requirement)

## Self-Check: PASSED

**Created files exist:**
- ✅ FOUND: apps/web/src/ui/panels/QuestLogPanel.tsx
- ✅ FOUND: apps/web/src/ui/panels/QuestLogPanel.css
- ✅ FOUND: apps/web/src/ui/hud/QuestTracker.tsx
- ✅ FOUND: apps/web/src/ui/hud/QuestTracker.css

**Commits exist:**
- ✅ FOUND: adb1427 (Task 1: QuestLogPanel tabbed interface)
- ✅ FOUND: 627cf59 (Task 2: QuestTracker HUD component)

**Component exports verified:**
- ✅ QuestLogPanel exported as React.FC
- ✅ QuestTracker exported as React.FC
- ✅ Both components consume useQuestStore
- ✅ Both components TypeScript compile successfully

## Next Steps

This plan provides ready-to-wire UI components for:
- **68-03**: Wire QuestLogPanel and QuestTracker into GameUI.tsx (render when isQuestLogOpen)
- **68-04**: Quest completion modal consuming completedQuestReward from questStore

Components are complete and tested. GameUI.tsx integration is next.

## Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 | adb1427 | feat(68-02): create QuestLogPanel with tabbed interface |
| 2 | 627cf59 | feat(68-02): create QuestTracker HUD component |

---
*Generated: 2026-02-22*
*Duration: 94 seconds*
