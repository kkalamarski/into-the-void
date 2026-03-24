# Phase 151: Atmosphere & Weather Strategy - Context

**Gathered:** 2026-03-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace per-type branching in AtmosphereSystem.ts (477 LOC, 6 atmosphere effect types: fog, glow, haze, murk, shimmer, clear) and WeatherSystem.ts (540 LOC, 6 particle types: rain, snow, ash, spores, mist, void_energy) with strategy classes. Two systems refactored in one phase. Visual output must be identical.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
User deferred all implementation decisions to Claude. Both systems are small (477 + 540 LOC) with well-scoped type switches. Claude has full discretion on:

- Whether atmosphere and weather strategies share an interface or have separate ones (atmosphere = color/brightness math, weather = particle spawn/movement — likely different interfaces)
- Strategy file organization (alongside each system file, or consolidated directory)
- Whether to use base class or just interface for each system
- Registry pattern vs direct map dispatch
- Granularity: one strategy per effect/particle type, or group related types

General guidance: Follow established patterns from Phases 147-150 (registry, interface, one file per strategy) but keep proportional to the small scope. Don't over-engineer two ~500-line files.

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

*Phase: 151-atmosphere-weather-strategy*
*Context gathered: 2026-03-24*
