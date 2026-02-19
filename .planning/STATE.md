# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-19)

**Core value:** Real-time multiplayer gameplay with responsive movement and visual feedback
**Current focus:** v1.9 Combat System — Phase 39 ready for planning

## Current Position

Phase: 39 - Combat Core and Damage Calculation
Plan: —
Status: Ready for planning
Last activity: 2026-02-19 — v1.9 roadmap created

Progress: [░░░░░░░░░░] 0% (v1.9 milestone — 0/4 phases complete)

## Performance Metrics

**Velocity:**
- Total plans completed: 126 (Phases 1-38 complete)
- Average duration: ~3m per plan
- Total execution time: ~5 hours

**By Milestone:**

| Milestone | Phases | Plans | Timeline |
|-----------|--------|-------|----------|
| v1.0 | 1-3 | 7 | 2 days |
| v1.1 | 4-7 | 20 | 3 days |
| v1.2 | 8-12 | 8 | 1 day |
| v1.3 | 13-16 | 13 | 1 day |
| v1.4 | 17-20 | 13 | 2 days |
| v1.5 | 21-24 | 9 | 1 day |
| v1.6 | 25-29 | 16 | 2 days |
| v1.7 | 30-32 | 9 | 1 day |
| v1.8 | 33-38 | 22 | 2 days |
| v1.9 | 39-42 | TBD | (starting) |

**Recent Trend:** Stable, averaging 2-4 plans per phase

| Phase | Plan | Duration | Tasks | Files |
|-------|------|----------|-------|-------|
| 38 | 03 | 2min | 3 | 2 |
| 38 | 04 | 2min | 1 | 1 |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [v1.8 research]: Build order is non-negotiable: types -> enriched spawning + lifecycle DB -> loot + interaction + respawn -> AI tick -> fertility -> client polish
- [v1.8 research]: `CreatureBehavior` type correction (`herbivore|omnivore|predator|maniac`) is a breaking change — must happen in Phase 33 before any entity definitions are written
- [v1.8 research]: `entity_lifecycle` DB table must be built in Phase 34 alongside `createEntityFromSpawn()` enrichment — retrofitting persistence later is high recovery cost
- [v1.8 research]: AI tick scoped to `activePlayerZones` only with self-rescheduling setTimeout — setInterval is explicitly rejected; global tick stalls event loop
- [v1.8 research]: `ground_items` DB table in Phase 35 — loot in memory only is never acceptable; items must survive zone eviction
- [v1.8 research]: Fertility model is static (baked at world-gen time, deterministic per seed) — dynamic fertility deferred; decision is irreversible without data migration
- [v1.8 research]: Perception gating model: relaxed zone-room broadcast with field stripping (simpler) rather than strict per-player filtering — finalize before Phase 36 AI broadcast implementation
- [38-01]: PublicCreatureUpdate interface at module level enforces CRAI-09 — named type on movedCreatures[] array makes TypeScript reject AI internal state fields at compile time
- [38-01]: entity:batch handler in gameStore.ts does not update Zustand entities array — entityStore already handles React/pathfinding; gameStore handler is Phaser-rendering-only, matching the dual-handler pattern from Phase 34-02
- [38-02]: canInteractLevel uses entityLevel <= playerLevel + 5 — exclusive boundary, consistent with INTR-07 "more than 5 levels higher" spec
- [38-02]: Perception gate fails open (shows real name) when stats not yet loaded — prevents all-'???' state during WebSocket connection establishment
- [38-02]: gated variable hoisted from applyPerceptionGate() drives both nameplate and behavior icon — single call prevents split-brain display state
- [38-02]: Creature level is not rendered in client UI — level portion of INTR-06 vacuously satisfied; only name and behavior icon are gated
- [38-03]: container.setData('yieldBar') stores Graphics reference directly — avoids fragile Y-position instanceof search that could fail on floating-point or layout changes
- [38-03]: zoneId presence on spawnEntity() distinguishes zone:state (initial load, no fade) from entity:spawn (runtime respawn, 400ms Linear fade)
- [38-03]: this.elevationOffset (12px hover constant) stored as 'elevationOffset' data key — yield bar Y uses hover offset, not terrain height offset
- [38-04]: gameSocket.on('error') uses channel: 'system' — consistent with existing system message convention; single catch-all for all server-emitted errors

### v1.9 Combat System Context

Key existing code to build on:
- **AiService** (`apps/game-server/src/game/ai.service.ts`): 1-second tick loop with self-rescheduling setTimeout, scoped to active zones
- **tickCreatureAI** (`packages/game-logic/src/ai/creature-ai.ts`): Pure FSM with herbivore/omnivore/predator/maniac branches — currently predator/maniac just wander
- **EntityService** (`apps/game-server/src/game/entity.service.ts`): Handles tool interaction, loot drops, entity death
- **CharacterStats**: Power, Toughness, Haste already defined and computed server-side
- **calculateDamage** exists in game-logic but needs Power/Toughness formula wiring

Design notes for v1.9:
- Combat uses same tick interval as AI wander (~1 second base, modified by Haste)
- Creature aggro extends existing FSM states — add `attacking`, `chasing`, `returning`
- Leash distance (~10 tiles) tracked per creature from spawn point
- Player death respawn uses faction hub coordinates (need to define per faction)
- Damage numbers are client-side floating text — server emits `combat:damage` event

### Pending Todos

None.

### Blockers/Concerns

**Carried from Phase 28 planning (deferred):**
- Module type compatibility rules (whether module types are mutually exclusive) — not specified in lore; deferred to future design decision
- ilvl formula lore validation still pending

**Carried from v1.3:**
- Server-side elevation validation not wired (client-side complete, server uses old validation)
- Low priority — only relevant if elevation interacts with item pickup range

## Session Continuity

Last session: 2026-02-19
Stopped at: v1.9 roadmap created
Resume file: None

**Next action:** Plan Phase 39 with `/gsd:plan-phase 39`

---
*Last updated: 2026-02-19 after v1.9 roadmap created*
