# Phase 153: Gateway Decomposition - Context

**Gathered:** 2026-03-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Extract domain event handlers from game.gateway.ts (2092 LOC) into handler classes. Gateway becomes a pure event router under 500 lines. WebSocket event behavior must be identical — no client-visible changes.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
User deferred all implementation decisions to Claude. This follows the same decomposition pattern as Phase 152 (WorldScene) but for the NestJS backend. Claude has full discretion on:

- Handler domain grouping: which @SubscribeMessage handlers go into CombatHandler, MovementHandler, InventoryHandler, SocialHandler, ZoneHandler (or different grouping if analysis shows better boundaries)
- How to handle cross-domain events (e.g., ability use touches combat + inventory)
- Whether handlers are @Injectable() NestJS services or plain classes (handlers likely need injected services like AbilityService, CombatService — @Injectable may be necessary unlike the frontend controllers)
- File organization within apps/game-server/src/game/ (handlers/ subdirectory or similar)
- Delegation pattern: gateway calls handler methods directly, or uses NestJS event emitter

General guidance: Follow the decomposition pattern from Phase 152 adapted for NestJS. The gateway should become a thin router that: receives WebSocket event → identifies domain → delegates to handler → returns response. Keep the 500-line target.

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. The gateway already has clear @SubscribeMessage boundaries that map naturally to domain handlers.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 153-gateway-decomposition*
*Context gathered: 2026-03-24*
