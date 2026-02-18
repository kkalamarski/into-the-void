---
phase: 36-creature-ai-wander-behavior-tick
verified: 2026-02-18T20:31:50Z
status: passed
score: 10/10 must-haves verified
re_verification: false
---

# Phase 36: Creature AI Wander and Behavior Tick Verification Report

**Phase Goal:** Creatures move autonomously through the world based on their behavior type — herbivores flee nearby players while all types wander idly — with AI updates broadcast efficiently per zone and never stalling the server event loop
**Verified:** 2026-02-18T20:31:50Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #  | Truth | Status | Evidence |
|----|-------|--------|---------|
| 1  | Zones with no active players have no AI tick running | VERIFIED | `activeZones: Set<string>` initialized empty; `activateZone` called only on player join; `onModuleInit` starts no timers |
| 2  | A zone becomes active when its first player joins | VERIFIED | `game.gateway.ts:116` calls `this.aiService.activateZone(result.player.position.zoneId)` in `handleAuth` |
| 3  | A zone deactivates when its last player leaves | VERIFIED | `game.gateway.ts:88-90` checks `getPlayersInZone(zoneId).length === 0` then calls `deactivateZone` in both `handleDisconnect` and `handleMove` zone-transition |
| 4  | Creatures wander idly with 25% chance per tick | VERIFIED | `creature-ai.ts:6` `WANDER_CHANCE = 0.25`; `tickWander` returns null if `Math.random() > 0.25` |
| 5  | Herbivore creatures flee when a player is within 5 tiles | VERIFIED | `creature-ai.ts:5` `FLEE_RADIUS = 5`; `tickHerbivore` filters `chebyshevDistance <= FLEE_RADIUS` then calls `flee()` |
| 6  | Creatures do not move through walls or out of zone bounds | VERIFIED | Both `flee` and `tickWander` check `nx >= 0 && nx < ZONE_SIZE && ny >= 0 && ny < ZONE_SIZE && !collisionMap[ny]?.[nx]` before returning a position |
| 7  | Movement updates arrive via single entity:batch socket event per tick | VERIFIED | `ai.service.ts:136-138` collects `movedCreatures` array; emits one `entity:batch` event after processing all creatures |
| 8  | AI tick duration logged with warning when exceeding threshold | VERIFIED | `ai.service.ts:78-80` `if (elapsed > AI_TICK_WARN_MS)` logs `console.warn` with elapsed time and threshold |
| 9  | If a creature moves into a player's click-to-move path, the path stops | VERIFIED | `PathfindingController.ts:296-300` EBLK-03 check calls `this.isBlocked(next.x, next.y)` before each step; `cancelPath()` on block |
| 10 | Player does not walk through creatures that moved into their path mid-execution | VERIFIED | `isWorldTileBlocked` in WorldScene queries `entityStore.getEntityAtPosition` which is kept current by `entity:batch` handler in `entityStore.ts:71-75` |

**Score:** 10/10 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `apps/game-server/src/game/ai.service.ts` | Zone-scoped AI tick loop with setTimeout self-rescheduling | VERIFIED | 141 lines; full runZoneTick with FSM, batched broadcasts; activateZone/deactivateZone/setServer present |
| `apps/game-server/src/game/game.module.ts` | AiService registration | VERIFIED | AiService in both `providers` and `exports` arrays |
| `packages/game-logic/src/ai/creature-ai.ts` | Pure FSM function for creature AI behavior | VERIFIED | 123 lines; exports `tickCreatureAI` and `AiTickResult`; pure functions with no side effects |
| `packages/game-logic/src/index.ts` | Re-export of creature-ai module | VERIFIED | Line 33: `export * from './ai/creature-ai'` |
| `apps/game-server/src/game/game.gateway.ts` | AiService wiring on connect/disconnect and zone transitions | VERIFIED | AiService injected in constructor; wired in `afterInit`, `handleAuth`, `handleDisconnect`, `handleMove` zone-transition block |
| `packages/shared-types/src/network/events.ts` | entity:batch event type definition | VERIFIED | Line 45: `'entity:batch'` in ServerEventType union; Line 90: full interface entry with updates array type |
| `apps/web/src/store/entityStore.ts` | entity:batch socket handler | VERIFIED | Lines 71-75: handler loops over updates calling `store.updateEntity(entityId, changes)` |
| `apps/web/src/game/systems/PathfindingController.ts` | Mid-execution entity blocking check | VERIFIED | Line 164: `private isBlocked: CollisionAccessor | null = null`; line 193: stored in `startPath`; lines 296-300: EBLK-03 check in `executeNextStep`; line 329: cleared in `cancelPath` |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `ai.service.ts` | `zones.service.ts` | DI injection | WIRED | Constructor injects `ZonesService`; calls `getZoneEntities`, `getChunk`, `updateEntity` — all three methods exist in ZonesService |
| `ai.service.ts` | `creature-ai.ts` | `tickCreatureAI` import | WIRED | `ai.service.ts:3` `import { tickCreatureAI } from '@into-the-void/game-logic'`; called at line 119 in per-creature loop |
| `game.gateway.ts` | `ai.service.ts` | DI injection and method calls | WIRED | `aiService` in constructor (line 51); `setServer` in `afterInit` (line 56); `activateZone` called twice (lines 116, 204); `deactivateZone` called twice (lines 89, 201) |
| `entityStore.ts` | `entity:batch event` | socket handler | WIRED | `gameSocket.on('entity:batch', ...)` at line 71; processes all updates via `updateEntity` |
| `PathfindingController.ts` | `WorldScene.isWorldTileBlocked` | isBlocked accessor passed to startPath | WIRED | WorldScene line 257-262: `startPath(gridPos.x, gridPos.y, (x, y) => this.isWorldTileBlocked(x, y), ...)`; `isWorldTileBlocked` queries `entityStore.getEntityAtPosition` at line 1351 |
| `creature-ai.ts` | `movement/validation.ts` | DIRECTION_VECTORS import | WIRED | `creature-ai.ts:2` `import { DIRECTION_VECTORS } from '../movement/validation'`; used at line 110 |

### Requirements Coverage

No separate requirements file entries checked for this phase — all requirements expressed through plan must-haves above.

### Anti-Patterns Found

None detected. Scanned:
- `ai.service.ts` — no TODOs, no stubs, `runZoneTick` is fully implemented
- `creature-ai.ts` — no TODOs, no placeholders
- `game.gateway.ts` — no TODOs, no return stubs
- `PathfindingController.ts` — no TODOs, EBLK-03 check is real code

### Human Verification Required

The following behaviors require runtime observation to fully confirm:

#### 1. Herbivore flee animation

**Test:** Spawn a herbivore creature in a zone, connect a player, and walk within 5 tiles of it.
**Expected:** Creature sprite moves away from the player each tick (approximately 1 second interval).
**Why human:** Rendering of creature movement (sprite animation, position interpolation) cannot be verified from static code.

#### 2. Batched broadcast efficiency

**Test:** Enter a zone with 10+ creatures and observe network traffic (browser DevTools WebSocket).
**Expected:** One `entity:batch` event per second (not 10+ individual `entity:update` events).
**Why human:** Socket.IO event rate can only be confirmed in a live connection.

#### 3. Path interruption on creature movement

**Test:** Click-to-move toward a creature that is wandering. Observe that the path stops when the creature walks into the next tile in the player's path.
**Expected:** Player stops immediately rather than walking through the creature.
**Why human:** Timing interaction between AI tick and path step execution is real-time behavior.

#### 4. Zone deactivation when last player leaves

**Test:** Have a single player in a zone, observe server logs showing AI tick warnings, then disconnect the player.
**Expected:** AI tick logs stop for that zone; no further `entity:batch` events emitted.
**Why human:** Server-side timer lifecycle is observable only through logs at runtime.

### Gaps Summary

No gaps. All 10 observable truths are verified against actual codebase. The implementation is complete, substantive, and fully wired end-to-end:

1. `AiService` — self-rescheduling setTimeout, zone activation guards, performance threshold logging
2. `tickCreatureAI` — pure FSM with herbivore flee (5-tile Chebyshev), 25% wander for all types, wall/bounds checks
3. Integration — `entity:batch` broadcast, GameGateway lifecycle wiring (connect/disconnect/zone-transition)
4. Client — `entity:batch` handler in entityStore; PathfindingController EBLK-03 pre-step blocking check

All 8 commits from summaries exist and map to their expected changes. No stub code or placeholder implementations found.

---

_Verified: 2026-02-18T20:31:50Z_
_Verifier: Claude (gsd-verifier)_
