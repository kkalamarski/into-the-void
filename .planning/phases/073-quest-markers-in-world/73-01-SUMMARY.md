---
phase: 73-quest-markers-in-world
plan: 01
subsystem: quest-markers
tags:
  - quests
  - real-time-updates
  - event-handlers
  - memory-management
dependency_graph:
  requires:
    - phase-67-quest-markers (quest marker infrastructure)
    - phase-68-quest-log (quest state tracking)
    - phase-69-quest-chains (quest registry)
  provides:
    - real-time-quest-marker-updates
    - quest-event-hooks
  affects:
    - apps/web/src/game/scenes/WorldScene.ts (quest event handlers)
tech_stack:
  added:
    - QuestRegistry for quest-to-NPC lookup
    - useQuestStore for client-side quest state
  patterns:
    - Arrow function event handlers for stable references
    - Client-side marker computation (mirrors server logic)
    - Event listener cleanup on scene shutdown
key_files:
  created: []
  modified:
    - apps/web/src/game/scenes/WorldScene.ts: Quest event handlers and marker computation
decisions:
  - Use arrow function properties for event handlers (enables stable on/off pairing)
  - Client-side marker computation mirrors server logic (ready > available > none priority)
  - Neutral faction returns 'none' marker type (no quests available for neutral)
  - Handle repeatable quests in marker computation (completed repeatable quests still show as available)
metrics:
  duration: 187
  completed: 2026-02-23
---

# Phase 73 Plan 01: Quest Markers Real-Time Updates Summary

**One-liner:** Quest markers update immediately via quest:progress/completed/abandoned event hooks with client-side marker computation.

## What Was Built

Added real-time quest marker updates to WorldScene so NPC markers reflect quest state changes (accept, complete, abandon) immediately without requiring NPC interaction.

### Implementation Details

**1. Quest Event Handlers (Task 1)**
- Added `handleQuestProgress`, `handleQuestCompleted`, `handleQuestAbandoned` as arrow function properties
- Registered `quest:progress`, `quest:completed`, `quest:abandoned` event listeners in `create()`
- Implemented `updateMarkerForQuestId()` to update NPC markers when quest state changes
- Implemented `computeMarkerTypeForNpc()` for client-side marker computation

**2. Event Listener Cleanup (Task 2)**
- Added quest event listener cleanup in `shutdown()` to prevent memory leaks
- Uses arrow function properties for stable references (same function instance for on/off)

**3. Client-Side Marker Computation**
- Priority: ready (?) > available (!) > none
- Ready: Active quest with all objectives complete
- Available: Not active, not completed (unless repeatable), meets prerequisites
- None: No quests or neutral faction
- Mirrors server-side logic from Phase 67

### Technical Decisions

**Arrow Function Properties**
Used arrow function properties instead of method declarations for event handlers to ensure stable references:
```typescript
private handleQuestProgress = (data: { questId: string }): void => {
  this.updateMarkerForQuestId(data.questId);
};
```
This ensures `gameSocket.off()` can correctly unregister the same function instance that was registered with `gameSocket.on()`.

**Client-Side vs Server-Side Computation**
- Server sends initial markers on zone entry (Phase 67)
- Client computes marker updates on quest state changes (this phase)
- Reduces server load (no marker update events for every quest state change)
- Ensures consistency by using same priority logic (ready > available > none)

**Neutral Faction Handling**
Neutral faction has no quests in the current implementation (only verdant, helix, nexus have quests). Return 'none' marker type early to avoid TypeScript errors with `QuestRegistry.getByFaction()`.

**Repeatable Quest Logic**
Completed repeatable quests (`isRepeatable: true`) still show as available markers, allowing players to re-accept them (e.g., daily bounties).

## Deviations from Plan

None - plan executed exactly as written.

## Files Changed

**Modified:**
- `apps/web/src/game/scenes/WorldScene.ts` (+99 lines)
  - Imported `QuestRegistry` and `useQuestStore`
  - Added 3 quest event handlers (handleQuestProgress, handleQuestCompleted, handleQuestAbandoned)
  - Added `updateMarkerForQuestId()` helper method
  - Added `computeMarkerTypeForNpc()` client-side marker computation
  - Added quest event cleanup in `shutdown()`

## Testing Notes

**Manual Testing Required:**
1. Accept quest from NPC → marker should change from ! to none (if no other quests)
2. Complete quest objectives → marker should change to ? (ready for turn-in)
3. Complete/turn-in quest → marker should change to none (if no other quests)
4. Abandon quest → marker should revert to ! (if quest still available)
5. Zone transition → no memory leaks (event listeners cleaned up)

**Automated Testing:**
No unit tests added (Phaser scene testing requires complex mocking). Integration testing via manual QA recommended.

## Integration Points

**Depends On:**
- Phase 67: `EntityRenderer.updateQuestMarker()` for marker rendering
- Phase 68: `useQuestStore` for quest state access
- Phase 69: `QuestRegistry` for quest definition lookups

**Consumed By:**
- Future phases: Quest marker updates work automatically for any quest state changes

## Known Issues

None.

## Next Steps

1. Phase 74: Quest completion feedback (animations, rewards modal)
2. Consider adding quest marker fade transitions for smoother UX
3. Consider adding sound effects for quest state changes

---

**Commits:**
- `5fae144`: feat(73-01): add quest event handlers for real-time marker updates
- `f9dff08`: feat(73-01): add event listener cleanup in shutdown

**Duration:** 187 seconds (3.1 minutes)
**Completed:** 2026-02-23

## Self-Check: PASSED

All claims verified:
- ✓ Modified file exists: apps/web/src/game/scenes/WorldScene.ts
- ✓ Commits exist: 5fae144, f9dff08
- ✓ Methods implemented: handleQuestProgress, handleQuestCompleted, handleQuestAbandoned, updateMarkerForQuestId, computeMarkerTypeForNpc (15 occurrences found)
- ✓ Event cleanup in shutdown() verified
