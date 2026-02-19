# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-19)

**Core value:** Real-time multiplayer gameplay with responsive movement and visual feedback
**Current focus:** v1.9 Combat System — Phase 42 in progress, combat feedback (floating numbers + HUD indicator) nearly complete

## Current Position

Phase: 42 - Combat Feedback and HUD
Plan: 02 complete
Status: In Progress
Last activity: 2026-02-19 — Phase 42 Plan 02 complete (In Combat HUD indicator)

Progress: [████████░░] 80% (v1.9 milestone — Phase 42 in progress)

## Performance Metrics

**Velocity:**
- Total plans completed: 136 (Phases 1-41 complete)
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
| v1.9 | 39-42 | TBD | (in progress) |

**Recent Trend:** Stable, averaging 2-4 plans per phase

| Phase | Plan | Duration | Tasks | Files |
|-------|------|----------|-------|-------|
| 39 | 01 | 3min | 3 | 4 |
| 39 | 02 | 4min | 3 | 5 |
| 39 | 03 | 4min | 3 | 3 |
| 39 | 04 | 2min | 2 | 2 |
| 40 | 01 | 2.5min | 3 | 3 |
| 40 | 02 | 2.5min | 3 | 3 |
| 40 | 03 | 3.3min | 3 | 2 |
| 41 | 01 | 5min | 3 | 6 |
| 41 | 02 | 6min | 3 | 5 |
| 41 | 03 | 4min | 1 | 2 |
| 42 | 01 | 2min | 3 | 3 |
| 42 | 02 | 3min | 3 | 5 |

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
- [39-01]: CombatSession stored in-memory Map (not DB) — sessions do not survive server restart; acceptable for real-time combat loop where reconnect starts fresh
- [39-01]: combat:start emit uses CombatState shape with empty participants[] — participants populated in Plan 02 when auto-attack loop runs
- [39-01]: stopCombat() calls setInCombat(false) — single source of truth for inCombat flag; gateway disconnect path calls combatService first
- [39-02]: attackTick() re-validates canInteract() on every tick — combat stops automatically if player moves out of range without explicit stop-combat event
- [39-02]: combatResults emitted inline in runZoneTick() after creature AI batch — no separate combat emit loop or additional tick timer
- [39-02]: CombatService.setServer() wired in GameGateway.afterInit() alongside AiService and ZonesService — consistent server-reference injection pattern
- [39-03]: calculateAttackInterval uses linear scaling (interval = 1000 * 50 / haste): doubling haste halves interval, consistent with haste stat semantics
- [39-03]: Timing gate placed before creature lookup in attackTick(): avoids zone/DB access on skipped ticks — performance optimization
- [39-03]: lastAttackAt initialized to 0: ensures first attack fires immediately on combat start regardless of Haste value
- [Phase 39]: armorReduction set to creatureStats.toughness — Toughness now serves as base armor value feeding into effectiveArmor quadratic scaling
- [Phase 39]: Toughness test uses critChance=0 and 20-run average with 0.8x threshold — eliminates crit randomness and ±10% variance flakiness deterministically
- [40-01]: AGGRO_RADIUS=5 and LEASH_DISTANCE=10 as top-level constants in creature-ai.ts — matches plan spec, consistent with FLEE_RADIUS=5 for herbivores
- [40-01]: tickOmnivore() delegates entirely to tickPredator() when provoked — avoids duplicating predator logic, single code path for aggro behavior
- [40-01]: moveToward() uses 3-attempt fallback (diagonal, x-only, y-only) — chasing does not need backtrack fallback unlike flee()
- [Phase 40]: creatureAttackTick skips when player out of range (returns null) rather than stopping combat — creature chases via FSM
- [Phase 40]: processCreatureCombatTick emits combat:damage to both player socket and zone — direct player notification plus zone broadcast
- [Phase 40]: Returning state split into two sub-cases: active-combat leash exceeded and post-combat return — distinct handling for each
- [Phase 40]: Zone change guard in creatureAttackTick stops creature combat sessions when player leaves zone
- [41-01]: isDead stored as optional field on Player interface — falsy by default, no schema migration needed
- [41-01]: player:death emitted to both player socket AND zone room — player notification plus zone broadcast
- [41-01]: stopCombat() called on dead player's own session at death — prevents dead player from dealing damage
- [41-01]: Faction respawn coords: verdant=zone_-2_0 (Canopy), helix=zone_2_0 (Ironhold), nexus+neutral=zone_0_2 (Meridian)
- [41-02]: scheduleRespawn clears existing timer before setting new one — prevents double-respawn if called twice for same player
- [41-02]: handleDisconnect clears pending respawn timer — dead-while-disconnecting players don't respawn into void
- [41-02]: respawnPlayer emits player:left to old zone only when zone differs — avoids spurious left event on same-zone respawn
- [41-02]: handlePlayerRespawn calls updateLocalPlayer() which handles missing-sprite edge case (re-creates if destroyed)
- [41-03]: zoneStateProvider injected via setter callback rather than direct GameService dependency — avoids circular injection, follows existing setServer() pattern
- [41-03]: zone:state emitted before player:left to old zone — client receives zone data first, ordering matches handleAuth pattern
- [41-03]: respawnPlayer made async to await zoneStateProvider; scheduleRespawn setTimeout callback does not await (unawaited promise acceptable in setTimeout)
- [42-01]: createFloatingDamage is a static method on EntityRenderer — no instance state needed, callable from WorldScene directly
- [42-01]: combat:damage updateEntity cast to Partial<Entity> — health/maxHealth are on Creature subtype, cast is safe since server only emits for creatures
- [42-02]: combat:start listener uses participants[] array to find player involvement and opponent — aligns with actual CombatState shape from shared-types
- [42-02]: combat:damage and player:death added to socket.ts forwarded event list — were missing, blocking combatStore listeners from firing
- [42-02]: Creature import + explicit Partial<Creature> variable fixes pre-existing type error in gameStore.ts combat:damage handler

### v1.9 Combat System Context

Key existing code to build on:
- **CombatService** (`apps/game-server/src/game/combat.service.ts`): Full creature and player combat — session tracking, aggro, attack ticks, damage calculation
- **AiService** (`apps/game-server/src/game/ai.service.ts`): 1-second tick loop with creature AI and combat tick integration
- **tickCreatureAI** (`packages/game-logic/src/ai/creature-ai.ts`): Complete FSM — predator/maniac aggro, chase, attack, leash; omnivore provoked-retaliation; herbivore flee
- **EntityService** (`apps/game-server/src/game/entity.service.ts`): Handles tool interaction, loot drops, entity death
- **CharacterStats**: Power, Toughness, Haste wired for both player and creature damage

Design notes for remaining phase:
- Player death + 3-second respawn at faction hub is complete (Phase 41)
- Phase 42 Plan 01 DONE: Floating damage numbers wired — EntityRenderer.createFloatingDamage (static), WorldScene.showDamageNumber, gameStore combat:damage handler
- Phase 42 Plan 02 DONE: "In Combat" HUD indicator — useCombatStore tracks inCombat via combat:start/player:death/entity:update/combat:damage events; HUD shows red pulsing badge with crossed swords icon

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
Stopped at: Completed Phase 42 Plan 02 (In Combat HUD indicator)
Resume file: None

**Next action:** Execute Phase 42 Plan 03 (if any remaining plans) or complete Phase 42

---
*Last updated: 2026-02-19 after Phase 42 Plan 02 complete*
