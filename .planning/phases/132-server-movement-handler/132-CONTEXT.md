# Phase 132: Server Movement Handler - Context

**Gathered:** 2026-03-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Server-authoritative pixel movement handler: accept client input (key bitmask + predicted position), validate with speed cap and collision, broadcast positions at 20Hz to nearby players. Replace the old 140ms rate limiter with velocity/distance validation. No DB schema changes — pixel positions are in-memory only.

</domain>

<decisions>
## Implementation Decisions

### Rejection behavior
- On invalid move (speed cap exceeded or collision): snap player back to last valid position — do not clamp to max valid
- Send explicit `positionCorrection` event back to the offending client with sequence number for clean reconciliation
- 10% speed tolerance before rejecting (matches validatePixelSpeed from Phase 131)
- No escalation on repeated violations — just keep correcting. Anti-cheat escalation is a future concern

### Tick rate & broadcast
- Proximity-based broadcasting — only send position updates to players within a certain range (not all players in zone)
- Batched per tick — one `positionBatch` event per 50ms tick containing all nearby player positions that changed
- Only include players whose position changed since last tick — skip stationary players
- Accept client input at any rate, process the latest key state each server tick — no enforcement of 1-input-per-tick

### Position storage
- DB tile only on disconnect — floor px/py to tile ints, store in DB. On reconnect, spawn at tile center. No Redis for position
- New player joins appear in the next broadcast tick (at most 50ms delay), no dedicated `playerJoined` position event
- Zone transfers snap to tile center in the new zone — no pixel offset preservation across zones
- No last-updated timestamp on in-memory position — keep storage minimal (px, py, zoneId)

### Input format
- Client sends key bitmask (which WASD keys are held), not direction vector — server computes velocity via velocityFromKeys
- Payload: `{ keys: number, predictedPx: number, predictedPy: number, sequence: number }` — server compares its calculation to client prediction
- Sequence number is a simple auto-incrementing counter per client — no timestamp
- Server echoes sequence number only in `positionCorrection` events, not in regular broadcasts

### Claude's Discretion
- Proximity radius for broadcasting (how far away players need to be to receive updates)
- Spatial partitioning strategy for proximity checks (grid cells, quadtree, etc.)
- Exact tick loop implementation (setInterval, NestJS scheduler, etc.)
- How to integrate with existing zone/room Socket.IO structure
- Speed multiplier passing through from equipment stats to server validation

</decisions>

<specifics>
## Specific Ideas

- Key bitmask + predicted position payload enables both server-authoritative validation and early desync detection
- Batched broadcasting with only-moved-players filter keeps bandwidth efficient for future scale
- The old 140ms rate limiter must be fully replaced — velocity-based validation is the new anti-cheat

</specifics>

<deferred>
## Deferred Ideas

- Anti-cheat escalation (kick/warn after N violations) — future phase
- Redis-cached pixel positions for fast reconnection — evaluate if needed later
- Lag compensation for combat hit detection — separate from movement validation

</deferred>

---

*Phase: 132-server-movement-handler*
*Context gathered: 2026-03-17*
