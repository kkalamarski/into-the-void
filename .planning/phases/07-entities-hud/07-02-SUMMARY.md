---
phase: 07-entities-hud
plan: 02
subsystem: client-networking
tags: [socket-events, entity-lifecycle, multiplayer, worldscene]
dependency-graph:
  requires: [07-01]
  provides: [entity-event-handling, player-event-handling, initial-spawn-system]
  affects: [gameStore, WorldScene]
tech-stack:
  added: []
  patterns: [event-driven-rendering, dual-state-sync]
key-files:
  created: []
  modified:
    - path: apps/web/src/store/gameStore.ts
      changes: Added entity and player socket event handlers
decisions: []
metrics:
  duration: 275s
  tasks-completed: 3
  commits: 3
  deviations: 0
completed: 2026-02-15T20:44:29Z
---

# Phase 07 Plan 02: Entity and Player Event Handlers Summary

**One-liner:** Socket event handlers wire entity and player lifecycle events to WorldScene sprite management for multiplayer rendering.

## What Was Built

Implemented complete socket event handling for entity and player lifecycle:

1. **Entity Event Handlers** (Task 1):
   - `entity:spawn`: Creates entity sprites via WorldScene.spawnEntity() and adds to store
   - `entity:despawn`: Removes entity sprites and updates store
   - `entity:update`: Syncs entity changes to both WorldScene and store state

2. **Player Event Handlers** (Task 2):
   - `player:joined`: Spawns other player sprites in WorldScene (skips local player)
   - `player:left`: Removes player sprites from WorldScene
   - Complements existing `player:moved` handler for movement updates

3. **Initial Spawn System** (Task 3):
   - Updated `zone:state` handler to spawn all initial entities
   - Spawns all other players (excluding local player to prevent duplicates)
   - Ensures complete world state is rendered on zone load and zone transitions

## Architecture

**Event Flow:**
```
Server Event → gameSocket.on() → WorldScene Method + Store Update
                                      ↓                ↓
                                 Phaser Sprites    React State
```

**Dual State Sync Pattern:**
- All handlers update both WorldScene (Phaser sprites) and gameStore (Zustand state)
- Ensures visual rendering stays in sync with application state
- Store state serves as source of truth for React components

**Local Player Filtering:**
- `player:joined` checks `player.id !== currentPlayer.id` to prevent duplicate local player
- Local player managed separately via MovementController prediction system
- Only other players added to `playerSprites` map

## Key Implementation Details

**Entity Handlers:**
- Check WorldScene availability before sprite operations
- Update store entities array (add/remove/map) alongside sprite changes
- Entity changes merged via spread operator for partial updates

**Player Handlers:**
- Use existing WorldScene methods: `addPlayer()`, `removePlayer()`, `movePlayer()`
- `player:joined` early returns if player is local (prevents conflict with MovementController)
- `player:left` only needs playerId for cleanup

**Zone State Integration:**
- Spawning happens after collision map setup and prediction state reset
- Spawning happens after local player position update
- Spawning happens before loading progress update (maintains loading stage flow)
- All entities and players spawned in single loop for efficiency

## Deviations from Plan

None - plan executed exactly as written.

## Testing Notes

**Build Verification:**
- TypeScript compilation succeeds with no type errors
- All event handlers properly typed with ServerEvents interface
- PlayerPublic import added successfully

**Pre-existing Issue Fixed:**
- WorldScene had type error in dead `generatePlaceholderWorld()` method
- Error already resolved (entitySprites type changed from Sprite to Container)
- EntityRenderer integration already in place

## Files Modified

### apps/web/src/store/gameStore.ts
- Added PlayerPublic to imports from shared-types
- Added entity:spawn handler (lines ~200-211)
- Added entity:despawn handler (lines ~212-223)
- Added entity:update handler (lines ~224-237)
- Added player:joined handler (lines ~238-251)
- Added player:left handler (lines ~252-258)
- Updated zone:state handler to spawn initial entities and players (lines ~147-166)

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | ddbf115 | feat(07-02): add entity socket event handlers to gameStore |
| 2 | 9c70e1f | feat(07-02): add player socket event handlers to gameStore |
| 3 | 41f4e80 | feat(07-02): spawn initial entities and players from zone:state |

## Success Criteria Met

- [x] Entity lifecycle events (spawn/despawn/update) trigger WorldScene methods
- [x] Player lifecycle events (joined/left) trigger WorldScene methods
- [x] Initial zone:state entities and players are spawned
- [x] Local player is never added to playerSprites (only other players)
- [x] Entity store state stays in sync with WorldScene sprites

## Next Steps

Phase 07 Plan 03 will likely implement entity health bars and behavior icons (EntityRenderer integration with update handlers).

## Self-Check: PASSED

**Created files verified:**
- No new files created (event handlers only)

**Modified files verified:**
```bash
FOUND: apps/web/src/store/gameStore.ts
```

**Commits verified:**
```bash
FOUND: ddbf115
FOUND: 9c70e1f
FOUND: 41f4e80
```

All task commits exist in git history and gameStore.ts contains all expected handlers.
