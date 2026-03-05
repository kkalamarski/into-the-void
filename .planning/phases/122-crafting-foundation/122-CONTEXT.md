# Phase 122: Crafting Foundation - Context

**Gathered:** 2026-03-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Server-side crafting service with all correctness guarantees: shared recipe types in a new package, DB schema for proficiency persistence, CraftingService with atomic ingredient consumption, server-managed timers, faction gating, one-active-craft enforcement, and recipe unlock persistence. No UI, no recipe content definitions — those are Phases 123-125.

</domain>

<decisions>
## Implementation Decisions

### Cancellation & ingredient fate
- Fire-and-forget: once a craft starts, the player cannot manually cancel it
- Disconnect = immediate cancel, no reconnect grace period
- Ingredient fate on disconnect cancel: Claude's discretion (balance fairness vs exploit prevention)
- Crafting continues in background during combat — no pause, no lockout

### Crafting timer feel
- Base timer range: 5-30 seconds (basic items ~5s, advanced ~30s)
- Timer duration is fixed per recipe (each recipe defines its own craft time)
- Proficiency reduces craft time AND improves quality (dual reward)
- Max proficiency speed bonus: up to 50% faster (a 10s craft becomes ~5s at max prof)

### Recipe data shape
- Three crafting disciplines: Equipment, Consumables, Reagents
- Recipes always produce exactly one output item (no variable quantities)
- Unlock conditions support three types: character level, quest completion, POI discovery
- Recipes defined as TypeScript objects (typed constants, compile-time validation)

### WebSocket event flow
- Start + complete events only — no periodic progress ticks from server
- Client runs its own timer for display based on duration received at craft start
- Craft completion event includes: crafted item, quality tier, and proficiency XP gained
- Crafting activity is broadcast to nearby players (social/immersive indicator)
- Error events include machine-readable error code + human-readable message

### Claude's Discretion
- Ingredient fate on disconnect cancel (refund vs consumed — balance fairness and exploit risk)
- Exact proficiency speed curve (linear vs diminishing returns within the 50% cap)
- Nearby broadcast radius and event shape
- DB schema design for proficiency tracking

</decisions>

<specifics>
## Specific Ideas

- Crafting should feel like a background activity, not a lockout — player can move, fight, do anything while a craft runs
- Timer range of 5-30s means crafting is quick but noticeable, not tedious
- "Quality + speed" dual reward makes proficiency leveling feel impactful
- Error codes follow existing game patterns (code + message format)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 122-crafting-foundation*
*Context gathered: 2026-03-05*
