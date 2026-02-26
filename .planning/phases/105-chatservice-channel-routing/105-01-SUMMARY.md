---
phase: 105-chatservice-channel-routing
plan: 01
subsystem: api
tags: [nestjs, socket.io, chat, websocket, faction, proximity, whisper, block]

# Dependency graph
requires:
  - phase: 104-moderation-persistence
    provides: isBlocked() DB query function for whisper block enforcement
  - phase: 103-chat-foundation
    provides: ChatChannel type, ChatMessage/ChatMessageRequest interfaces, chat:send event handling
provides:
  - ChatService injectable with handleMessage routing across five channel types
  - ChatChannel type extended with 'local' channel
  - Zone routing via Socket.IO zone rooms
  - Global broadcast via server.emit()
  - Faction routing via faction:<factionId> Socket.IO rooms
  - Local proximity routing with isPositionVisible (15 tile range)
  - Whisper routing with isBlocked DB check and offline/blocked system notices
affects:
  - 105-02 (gateway integration, setServer call, faction room join/preserve)

# Tech tracking
tech-stack:
  added: []
  patterns: [strategy pattern for channel routing in ChatService]

key-files:
  created:
    - apps/game-server/src/game/chat.service.ts
  modified:
    - packages/shared-types/src/network/events.ts

key-decisions:
  - "FactionId type uses 'neutral' (not 'unaffiliated') - neutral faction excluded from faction chat"
  - "sendLocal uses getPlayersInZone + isPositionVisible loop; sender fallback guard if not in zone list"
  - "Whisper block check: isBlocked(db, senderId, targetId) returns true if targetId has blocked senderId"

patterns-established:
  - "ChatService follows setServer() lifecycle pattern matching PlayerService, CombatService, AiService"
  - "Each channel type is a private method — strategy pattern for easy future channel additions"

requirements-completed: [CHAN-01, CHAN-02, CHAN-03, CHAN-04, CHAN-05]

# Metrics
duration: 8min
completed: 2026-02-26
---

# Phase 105 Plan 01: ChatService Channel Routing Summary

**NestJS ChatService with five-channel routing (zone/global/faction/local/whisper) using Socket.IO rooms, proximity filtering via isPositionVisible, and block enforcement via isBlocked DB query**

## Performance

- **Duration:** 8 min
- **Started:** 2026-02-26T20:28:30Z
- **Completed:** 2026-02-26T20:36:30Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Extended `ChatChannel` type with `'local'` channel for proximity-based chat
- Created `ChatService` with `handleMessage()` dispatching to five private routing methods following strategy pattern
- Whisper routing enforces block status via DB check (`isBlocked`) and sends system notices for offline/blocked targets
- Local chat filters recipients within 15 tiles using `isPositionVisible` from game-logic package

## Task Commits

Each task was committed atomically:

1. **Task 1: Add 'local' to ChatChannel type** - `c55d806` (feat)
2. **Task 2: Create ChatService with five-channel routing** - `436e0f5` (feat)

## Files Created/Modified

- `packages/shared-types/src/network/events.ts` - Added `'local'` to `ChatChannel` union type
- `apps/game-server/src/game/chat.service.ts` - New injectable ChatService with handleMessage and five channel routing strategies

## Decisions Made

- Used `FactionId = 'neutral'` (not `'unaffiliated'`) for the neutral faction guard — the plan mentioned both but the actual type only has `'neutral'`
- `sendLocal` method iterates `getPlayersInZone()` and applies `isPositionVisible` per player; includes sender fallback guard if `getPlayersInZone` omits the sender
- `sendZone` and `sendFaction` methods do not receive `client: Socket` parameter since they use Socket.IO rooms, not the client socket directly

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Corrected faction comparison type error**
- **Found during:** Task 2 (ChatService creation)
- **Issue:** Plan specified `player.faction === 'unaffiliated'` but `FactionId` type only includes `'verdant' | 'helix' | 'nexus' | 'neutral'` — TypeScript reported TS2367 comparison error
- **Fix:** Removed `'unaffiliated'` check; only `'neutral'` is used for the neutral faction guard
- **Files modified:** apps/game-server/src/game/chat.service.ts
- **Verification:** `npx tsc --noEmit -p apps/game-server/tsconfig.app.json` passes cleanly
- **Committed in:** `436e0f5` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 — type mismatch bug)
**Impact on plan:** The fix aligns with the actual type system; no behaviour change since 'neutral' is the correct faction for the Unaffiliated faction per the lore/types.

## Issues Encountered

- TypeScript TS2367 error on `player.faction === 'unaffiliated'` — the `FactionId` union does not include this value. Fixed inline by removing the redundant check.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- ChatService is ready for wiring into GameGateway in Plan 02
- Plan 02 must: import and inject ChatService into GameGateway, call `chatService.setServer(server)` in `afterInit()`, join faction Socket.IO rooms on auth, preserve faction rooms across zone transitions (`updatePlayerRooms()`), and delegate `handleChat` to `chatService.handleMessage()`

---
*Phase: 105-chatservice-channel-routing*
*Completed: 2026-02-26*
