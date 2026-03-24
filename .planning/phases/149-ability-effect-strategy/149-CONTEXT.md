# Phase 149: Ability Effect Strategy - Context

**Gathered:** 2026-03-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace the effect-type dispatch block in ability.service.ts (1420 LOC) with per-effect-type strategy classes for all 11 effect types. Gameplay behavior must be identical. This is a backend refactor — server-side NestJS code.

</domain>

<decisions>
## Implementation Decisions

### Effect type grouping
- One strategy per effect type: 11 classes (DamageEffectStrategy, HealEffectStrategy, BuffEffectStrategy, ShieldEffectStrategy, StunEffectStrategy, ReflectEffectStrategy, DotEffectStrategy, GatherEffectStrategy, RevealEffectStrategy, HazardImmunityEffectStrategy, DamageReductionEffectStrategy)
- No grouping of related effects — each type is self-contained

### Strategy interface design
- Broad shared EffectContext with target, caster, ability, zone, entities — each strategy picks what it needs. Single apply() signature.
- apply() returns an EffectResult object with { success, changes, events } — ability.service aggregates results. Easier to test and log.

### NestJS integration
- Plain TypeScript classes, not @Injectable() services — effect strategies are pure game logic with no database/socket/service dependencies
- Registry Map<EffectType, EffectStrategy> instantiated by ability.service at init

### Location & pattern consistency
- Strategies live in packages/game-logic/ (not apps/game-server/) since effects are game logic, not server-specific — enables shared testing
- Path: packages/game-logic/src/effects/ or packages/game-logic/src/ability-effects/
- Follow registry + base class pattern from Phases 147-148: AbstractEffectStrategy base class, Map registry, one file per strategy

</decisions>

<specifics>
## Specific Ideas

- ability.service.ts should become a thin orchestrator that: validates ability use → resolves target → iterates effects → delegates each to strategy → aggregates EffectResults → emits events
- The existing effect application logic (10-30 lines per type) moves verbatim into strategy apply() methods initially — optimize later if desired

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 149-ability-effect-strategy*
*Context gathered: 2026-03-24*
