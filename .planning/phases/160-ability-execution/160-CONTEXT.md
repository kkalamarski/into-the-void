# Phase 160: Ability Execution - Context

**Gathered:** 2026-03-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix ability firing so attack and gather abilities work on selected targets, with visible error feedback on failure. Abilities currently fail with "Target not found" (cross-zone entity lookup) and "Item not found in inventory" (tool validation). This phase fixes the full pipeline: target resolution, ability validation, execution, and error display.

</domain>

<decisions>
## Implementation Decisions

### Error feedback
- Floating red text above the player (same style as damage numbers) for all ability failures
- Specific reason messages: "No target", "Out of range", "On cooldown", "No energy", "Wrong target type", "Can't attack that"
- No sound effects on failure — visual only to avoid audio spam
- Client-side pre-validation for cooldown and energy (instant feedback), server validates the real execution

### Targeting behavior
- No target selected + attack ability → auto-target nearest hostile/aggressive creature in range
- No target selected + gather ability → auto-target nearest resource node in range
- Out of range → show "Out of range" floating text, no auto-walk
- Wrong target type (e.g., attack on resource) → show "Can't attack that" specific error
- All auto-targeting uses pixel distance to find nearest valid target

### Cross-zone entity resolution
- Server must look up target entity in player's zone AND 8 adjacent zones — if the entity is visible on screen, it should be targetable
- Creature aggro should also work cross-zone — creatures near zone borders can detect and chase players in adjacent zones (consistent with ability targeting)
- Damage feedback (floating numbers) works normally on cross-zone entities — seamless visual experience

### Claude's Discretion
- Implementation of cross-zone entity lookup (iterate adjacent zone entity maps, or use a spatial index)
- Auto-target search radius (should match ability range or use a sensible default)
- Exact floating text style, duration, animation for error messages

</decisions>

<specifics>
## Specific Ideas

- The "Target not found" bug is because ability.service only looks in the player's zone — creatures near zone edges are in adjacent zone entity maps
- "Item not found in inventory" suggests equipped tool validation is checking the wrong slot or the tool reference is stale
- Zone walk transitions were just fixed (v1.34.35) — the server now tracks which zone the player is in correctly, which should help cross-zone targeting

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 160-ability-execution*
*Context gathered: 2026-03-26*
