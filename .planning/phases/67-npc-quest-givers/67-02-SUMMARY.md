---
phase: 67-npc-quest-givers
plan: 02
subsystem: quest-system
tags: [npc-ui, quest-acceptance, quest-tracking]
dependency-graph:
  requires: [phase-67-npc-quest-integration, phase-49-npc-interaction-window]
  provides: [quest-ui-in-npc-modal, quest-accept-button, quest-turn-in-button]
  affects: [npc-store, npc-interaction-modal]
tech-stack:
  added: []
  patterns: [tab-navigation, quest-categorization-ui, conditional-rendering]
key-files:
  created: []
  modified:
    - apps/web/src/store/npcStore.ts
    - apps/web/src/ui/panels/NpcInteractionModal.tsx
    - apps/web/src/ui/panels/NpcInteractionModal.css
    - apps/web/src/game/scenes/WorldScene.ts
decisions: []
metrics:
  duration: 213s
  completed: 2026-02-22
---

# Phase 67 Plan 02: Quest UI in NPC Interaction Modal Summary

**One-liner:** NPC interaction modal now displays quests in dedicated tab with accept/turn-in buttons and objective progress tracking

## What Was Built

Extended the NPC interaction modal to include a Quests tab that displays available, active, and ready-to-turn-in quests from the NPC.

### Quest Data Types in npcStore

Added three quest-related interfaces to npcStore:

- **QuestPreview**: Available quests with description, objectives summary, rewards (credits/xp/items), and optional minLevel
- **ActiveQuestInfo**: In-progress quests with objectives showing current/required progress and completion status
- **ReadyQuestInfo**: Completed quests ready for turn-in (just questId and displayName)

Extended `NpcInteraction` interface with optional arrays:
- `availableQuests?: QuestPreview[]`
- `activeQuests?: ActiveQuestInfo[]`
- `readyQuests?: ReadyQuestInfo[]`

These fields are automatically populated by the server's `getQuestsForNpc` method (from Phase 67 Plan 01) when responding to `npc:interact` events.

### Quest Actions in npcStore

Added two action methods to `NpcState`:

- **acceptQuest(questId: string)**: Emits `quest:accept` WebSocket event to server
- **completeQuestAtNpc(questId: string)**: Emits `quest:complete` WebSocket event to server

Both methods are simple wrappers around `gameSocket.emit()` calls, following the same pattern as trade actions.

### Tab Navigation System

Implemented conditional tab bar that appears when NPC is a trader or has quests:

- **Dialogue tab**: Default tab, shows NPC greeting and type-specific action buttons
- **Trade tab**: Shows TradingPanel component (traders only)
- **Quests tab**: Shows quest list (NPCs with quests only)

Tab state managed via `useState<'dialogue' | 'trade' | 'quests'>('dialogue')`. Each tab button has active state styling with accent color border.

Quest tab button shows badge with available quest count: `Quests (2)`.

### Quests Tab UI

Created `renderQuestsTab()` function that categorizes and displays quests in priority order:

**1. Ready Quests (highest priority)**
- Display: Blue "?" marker in circular badge
- Content: Quest name + "Turn In" button
- Action: Calls `completeQuestAtNpc(questId)` on click
- Visual: Blue accent color (`#00ccff`) indicates completion readiness

**2. Available Quests**
- Display: Yellow "!" marker in circular badge
- Content: Quest name, description, rewards (credits/XP badges), "Accept Quest" button
- Action: Calls `acceptQuest(questId)` on click
- Visual: Yellow marker (`#ffcc00`) follows MMO convention for new quests
- Rewards shown as small badges with accent background

**3. Active Quests (lowest priority)**
- Display: No marker, left border accent
- Content: Quest name, description, objective list with progress bars
- Objectives: Show "description: current/required" format
- Completed objectives: Green color + strikethrough styling
- No action button (already accepted, not yet complete)

Empty state: "No quests available." message if NPC has no quests.

### CSS Styling

Added comprehensive quest UI styles:

- **Tab navigation**: `.npc-tabs`, `.npc-tab`, `.npc-tab--active`
- **Quest containers**: `.npc-quest`, `.npc-quest--available`, `.npc-quest--ready`, `.npc-quest--active`
- **Quest markers**: `.npc-quest-marker` with circular badge background
- **Quest content**: `.npc-quest-info`, `.npc-quest-name`, `.npc-quest-desc`
- **Rewards**: `.npc-quest-rewards`, `.npc-quest-reward` (badge styling)
- **Objectives**: `.npc-quest-objectives`, `.npc-quest-objective`, `.npc-quest-objective--complete`

Scrollable quest list with `max-height: 300px` and `overflow-y: auto` to handle NPCs with many quests.

### Trader Integration

Updated the "Trade" action button to switch to the trade tab when clicked:
```typescript
onClick={() => {
  setActiveTab('trade');
  openTrading();
}}
```

Trade tab conditionally renders `<TradingPanel />` when `activeTab === 'trade' && showTrading`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Missing Npc type import in WorldScene.ts**
- **Found during:** Task 2 verification build
- **Issue:** WorldScene.ts line 1116 used `(entity as Npc).npcId` but Npc type was not imported, causing TypeScript error: "Cannot find name 'Npc'"
- **Fix:** Added `Npc` to imports from `@into-the-void/shared-types` in WorldScene.ts
- **Files modified:** apps/web/src/game/scenes/WorldScene.ts
- **Commit:** feacbf5 (included in Task 2 commit)

This was a pre-existing bug that blocked the build. The code was already using the Npc type cast but the import was missing. Fixed by adding Npc to the existing shared-types import statement.

## Technical Details

### Quest Data Flow

1. **Server-side**: When player interacts with NPC, server calls `questService.getQuestsForNpc()` and includes quest arrays in `npc:interact:response` event
2. **Client-side**: `npcStore` listener receives response and calls `setInteractingNpc(data)`
3. **UI rendering**: `NpcInteractionModal` reads `interactingNpc` from store, checks `hasQuests` flag, conditionally shows Quests tab
4. **User action**: Clicking "Accept Quest" calls `acceptQuest(questId)` → emits `quest:accept` event to server
5. **Server response**: Server validates, creates quest_progress, emits `quest:progress` event back to client (handled by quest store)

### Conditional Rendering Logic

Tabs only appear when necessary:
```typescript
const hasQuests = interactingNpc.availableQuests?.length ||
                  interactingNpc.activeQuests?.length ||
                  interactingNpc.readyQuests?.length;

{(interactingNpc.npcType === 'trader' || hasQuests) && (
  <div className="npc-tabs">...</div>
)}
```

Simple NPCs (guards, ambient citizens) without quests show only dialogue section with no tab bar.

### Quest Priority Display Order

Quests rendered in intentional order:
1. **Ready quests first**: Players came to turn in, make it easy
2. **Available quests second**: New content to accept
3. **Active quests last**: Already accepted, just progress tracking

This matches player intent flow: turn in completed quests → accept new quests → check progress.

## Files Modified

### apps/web/src/store/npcStore.ts (+33 lines)

- Added QuestPreview, ActiveQuestInfo, ReadyQuestInfo interfaces
- Extended NpcInteraction with optional quest arrays
- Added acceptQuest and completeQuestAtNpc actions to NpcState
- Implemented actions using gameSocket.emit

### apps/web/src/ui/panels/NpcInteractionModal.tsx (+68 lines, -26 lines)

- Added useState for activeTab management
- Imported TradingPanel component
- Added hasQuests check
- Created renderQuestsTab function with ready/available/active quest rendering
- Added tab navigation bar with conditional rendering
- Updated Trade button to switch to trade tab
- Converted dialogue section to conditional tab content

### apps/web/src/ui/panels/NpcInteractionModal.css (+126 lines)

- Added tab navigation styles (.npc-tabs, .npc-tab, .npc-tab--active)
- Added quest container styles (.npc-quest, variant modifiers)
- Added quest marker styles (circular badges with color coding)
- Added quest content styles (name, description, rewards, objectives)
- Added scrollable container styles (max-height with overflow)
- Added empty state styles (.npc-empty-message)

### apps/web/src/game/scenes/WorldScene.ts (+1 line)

- Added Npc import from @into-the-void/shared-types (bug fix)

## Validation

Build completed successfully with no TypeScript errors:

```bash
pnpm build
# NX Successfully ran target build for 12 projects
```

All quest UI components are correctly typed and integrated with existing NPC interaction flow.

## Self-Check

Verifying plan must-haves against implementation:

**Truths:**

- ✅ Player sees available quests in NPC interaction modal with Accept button
- ✅ Player can accept quest through NPC modal button (calls acceptQuest action)
- ✅ Player sees active/ready quests in NPC modal with appropriate UI

**Artifacts:**

- ✅ `apps/web/src/store/npcStore.ts` provides quest data types and acceptQuest action, contains "availableQuests"
- ✅ `apps/web/src/ui/panels/NpcInteractionModal.tsx` provides Quests tab with accept/turn-in UI, contains "renderQuestsTab"

**Key Links:**

- ✅ NpcInteractionModal uses useNpcStore hook for quest data (line 25: destructures acceptQuest, completeQuestAtNpc)
- ✅ npcStore actions emit quest:accept and quest:complete events (lines 42-47)

## Self-Check: PASSED

All required files exist and contain expected patterns. Commits verified:

- 9cf2969: feat(67-02): add quest data types and actions to npcStore
- feacbf5: feat(67-02): add Quests tab to NPC interaction modal
