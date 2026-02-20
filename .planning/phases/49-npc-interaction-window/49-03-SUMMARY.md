---
phase: 49-npc-interaction-window
plan: 03
subsystem: ui
tags: [react, zustand, npc, modal, escape-key, action-buttons]

requires:
  - phase: 49-02
    provides: NpcInteractionModal component with portrait, dialogue, close button and Phaser keyboard disable

provides:
  - Escape key handler closes NpcInteractionModal and resumes gameplay
  - Type-specific action buttons: Trade (trader), service-specific (service), Faction Quests (faction_rep), none (guard/ambient)
  - closeInteraction properly clears interactingNpc to null, unmounting modal and re-enabling Phaser keyboard

affects:
  - 50-trading-system (Trade button placeholder ready for wiring)

tech-stack:
  added: []
  patterns:
    - "Escape key modal dismissal via window addEventListener('keydown') in separate useEffect with cleanup"
    - "NPC type discriminator pattern: switch on npcType to render contextual action buttons"
    - "SERVICE_LABELS map for serviceType -> display label translation"

key-files:
  created: []
  modified:
    - apps/web/src/ui/panels/NpcInteractionModal.tsx

key-decisions:
  - "Plan 03 work (Escape key + action buttons) was pre-implemented in Plan 02 commit — both plans executed as single atomic unit"
  - "Guard and Ambient NPCs render no action buttons (interaction is dialogue-only)"
  - "Trade/service/faction_rep buttons are placeholders with console.log — wired in Phase 50"

patterns-established:
  - "Escape key handler: separate useEffect from keyboard disable, with [closeInteraction] dependency for proper closure"
  - "renderActionButtons: inner function returning JSX per NPC type, null for types with no actions"

duration: 5min
completed: 2026-02-20
---

# Phase 49 Plan 03: NPC Interaction Modal Action Buttons and Escape Key Summary

**NpcInteractionModal with type-specific action buttons (Trade/Heal/Repair/Storage/Travel/Faction Quests), Escape key dismissal, and clean state reset via closeInteraction**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-20T00:25:25Z
- **Completed:** 2026-02-20T00:30:00Z
- **Tasks:** 3
- **Files modified:** 1

## Accomplishments

- Escape key listener added via dedicated useEffect with [closeInteraction] dependency and proper cleanup
- Action buttons rendered conditionally per NPC type: Trade for traders, service-specific labels for service NPCs, Faction Quests for faction reps, no buttons for guards/ambient
- closeInteraction sets interactingNpc to null, unmounting the modal and restoring Phaser keyboard input via useEffect cleanup

## Task Commits

All three Plan 03 tasks were pre-implemented as part of Plan 02 commits:

1. **Task 1: Escape key handler** - `1b4c434` (feat: create NpcInteractionModal component)
2. **Task 2: Action buttons per NPC type** - `1b4c434` (feat: create NpcInteractionModal component)
3. **Task 3: closeInteraction clears state** - `4fa3bbd` (feat: create npcStore - already had closeInteraction)

## Files Created/Modified

- `apps/web/src/ui/panels/NpcInteractionModal.tsx` - Escape key handler (lines 45-57) and renderActionButtons() function (lines 70-125) with SERVICE_LABELS map

## Decisions Made

- Plan 03 work was already implemented as part of Plan 02 execution — both plans were combined into the same commits. No additional commits needed for Plan 03.
- Guard and Ambient NPC types return null from renderActionButtons (dialogue-only interaction)
- Escape key uses a separate useEffect from the keyboard-disable effect to have its own [closeInteraction] dependency and proper cleanup semantics

## Deviations from Plan

None — plan executed as specified. All functionality was pre-implemented in Plan 02's scope.

## Issues Encountered

None — Plan 02 already implemented all Plan 03 requirements. Verified build passes and all acceptance criteria are met in committed code.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- NPC interaction modal fully functional with Escape key and type-based action buttons
- Trade button placeholder (`console.log`) ready for Phase 50 Trading System to wire up
- Service/faction_rep buttons similarly stubbed for future phases
- closeInteraction pattern established for modal lifecycle (null state -> unmount -> keyboard re-enable)

---
*Phase: 49-npc-interaction-window*
*Completed: 2026-02-20*
