# Phase 150: Creature AI Strategy - Context

**Gathered:** 2026-03-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Formalize the existing creature behavior functions in creature-ai.ts (304 LOC) into named strategy classes. The file already has per-behavior functions (tickHerbivore, tickOmnivore, tickPredator) dispatched via a switch statement. This phase wraps them in formal strategy classes with a shared interface. AI behavior must be identical.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
User deferred all implementation decisions to Claude. This is a small, well-structured file (304 LOC) where the existing code already follows a partial strategy pattern. Claude has full discretion on:

- Whether ManiacBehavior gets its own class or shares with PredatorBehavior (currently both use tickPredator)
- Strategy interface shape (tick method signature, FSM state handling)
- File organization within packages/game-logic/src/ai/
- Whether to use base class or just interface (given the small code size)
- Registry vs direct Map dispatch
- How to handle the shared FSM state transitions across behaviors

General guidance: Follow the established patterns from Phases 147-149 (registry, interface, one file per strategy) but adapt for the small scope — don't over-engineer a 304-line file.

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. Follow project conventions established in prior strategy phases.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 150-creature-ai-strategy*
*Context gathered: 2026-03-24*
