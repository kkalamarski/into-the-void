---
phase: 06-movement-system
plan: 02
subsystem: game-server/movement
tags: [movement, rate-limiting, sequence-tracking, server-reconciliation]
dependency_graph:
  requires:
    - PlayerService player tracking
    - GameGateway move handler
  provides:
    - Server-side sequence number echoing
    - 140ms rate limiting on movement
  affects:
    - Client prediction reconciliation (Phase 06-03)
tech_stack:
  added: []
  patterns:
    - Rate limiting via timestamp tracking
    - Sequence number echo for client reconciliation
key_files:
  created: []
  modified:
    - apps/game-server/src/game/player.service.ts
    - apps/game-server/src/game/game.gateway.ts
decisions:
  - decision: 140ms rate limit (10ms tolerance below 150ms client delay)
    rationale: Prevents movement spam while allowing network jitter
  - decision: Echo sequence in all responses including errors
    rationale: Client needs sequence for reconciliation even when move rejected
  - decision: Use Map for rate limit tracking rather than Player object
    rationale: Keeps Player interface clean, easy cleanup on disconnect
metrics:
  duration: 88s
  tasks_completed: 2
  files_modified: 2
  commits: 2
  completed_at: 2026-02-14
---

# Phase 6 Plan 02: Server Sequence & Rate Limiting Summary

Server-side sequence number tracking and rate limiting with 140ms minimum between moves and lastProcessedInput echo for client reconciliation.

## Objectives Met

- Server tracks last move timestamp per player
- Server rejects moves faster than 140ms apart
- Server echoes sequence number in player:moved events
- Server echoes sequence number in error responses

## Tasks Completed

### Task 1: Add rate limiting tracking to PlayerService
**Commit:** 949f5ce
**Files:** apps/game-server/src/game/player.service.ts

Added rate limiting support to PlayerService:
- Added `lastMoveTimes` Map to track per-player movement timestamps
- Implemented `getLastMoveTime(playerId)` getter method
- Implemented `setLastMoveTime(playerId, timestamp)` setter method
- Added cleanup in `handleDisconnect` to remove rate limit data on player disconnect

### Task 2: Update game.gateway handleMove with sequence echo and rate limiting
**Commit:** 5e325c0
**Files:** apps/game-server/src/game/game.gateway.ts

Updated handleMove to support sequence tracking and rate limiting:
- Changed MessageBody type to `{ direction: Direction; sequence?: number }`
- Added rate limiting check before processing moves (140ms minimum)
- Server rejects rapid moves with error code E-0006 and echoes sequence
- Updated player:moved event to include `lastProcessedInput: data.sequence`
- Updated MOVEMENT_BLOCKED error to include `lastProcessedInput: data.sequence`
- Rate limit errors and movement errors both echo sequence for client reconciliation

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

1. Build passes: pnpm nx run game-server:build completed successfully
2. PlayerService has getLastMoveTime/setLastMoveTime methods
3. handleMove rejects moves faster than 140ms with E-0006 error
4. player:moved event includes lastProcessedInput field with sequence number
5. Error responses include lastProcessedInput for client reconciliation

## Technical Details

### Rate Limiting Implementation
- Minimum 140ms between moves (150ms client delay - 10ms tolerance)
- Timestamp tracking via Map<string, number> in PlayerService
- Early return with error if rate limit violated
- Rate limit cleanup on player disconnect

### Sequence Number Flow
- Client sends optional sequence number with move command
- Server echoes sequence in player:moved event as lastProcessedInput
- Server echoes sequence in error responses (rate limit and movement blocked)
- Zone transitions trigger zone:state which resets client prediction anyway

### Error Codes
- E-0006: Movement too fast (rate limit violation)
- MOVEMENT_BLOCKED: Movement rejected by game logic
- Both include lastProcessedInput for client reconciliation

## Dependencies

**Depends on:**
- PlayerService player tracking (Phase 04)
- GameGateway move handler (Phase 04)

**Enables:**
- Client-side prediction reconciliation (Phase 06-03)
- Client input buffering with sequence numbers (Phase 06-03)

## Next Steps

Phase 06-03 will implement client-side prediction with:
- Client sends sequence numbers with moves
- Client reconciles state using lastProcessedInput from server
- Client replays buffered inputs after reconciliation
- Smooth movement prediction while waiting for server confirmation

## Self-Check: PASSED

Verified created/modified files:
```
FOUND: /Users/krzysztof.kalamarski/Projects/into-the-void/apps/game-server/src/game/player.service.ts
FOUND: /Users/krzysztof.kalamarski/Projects/into-the-void/apps/game-server/src/game/game.gateway.ts
```

Verified commits:
```
FOUND: 949f5ce
FOUND: 5e325c0
```

All files and commits verified successfully.
