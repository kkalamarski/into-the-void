# Phase 158: Liquid Effects - Context

**Gathered:** 2026-03-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Server-side effects applied to players and creatures when standing in liquid tiles. Movement slow, periodic damage, periodic healing — tick-based. Uses existing patterns from HazardService.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
User deferred all decisions. Use existing HazardService patterns and hazard balance values as reference.

Key constraints:
- Movement slow: reduce player/creature speed while in liquid (use speedMultiplier from liquid tile definition)
- Damage: periodic tick (every 1-2s) for damaging liquids (magma, toxic, rift plasma, impact brine)
- Healing: periodic tick for healing liquids (luminous nectar)
- Effects start on entering liquid, stop within one tick of leaving
- Creatures also affected — same slow and damage/heal
- Player feedback: floating damage/heal numbers (existing system), possibly HUD indicator similar to hazard indicator
- Values derived from liquid tile definitions (damagePerTick, healPerTick, speedMultiplier set in Phase 156)
- Can extend existing HazardService or create a parallel LiquidEffectService — Claude decides based on how HazardService is structured
- Server checks player/creature tile position against liquidTiles overlay each tick

</decisions>

<specifics>
## Specific Ideas

No specific requirements — follow existing hazard system patterns for tick timing, damage numbers, and HUD feedback.

</specifics>

<deferred>
## Deferred Ideas

- Liquid resistance gear (protection from liquid effects) — future milestone
- Visual effects on player when in liquid (splash particles, wet shader) — future polish

</deferred>

---

*Phase: 158-liquid-effects*
*Context gathered: 2026-03-25*
