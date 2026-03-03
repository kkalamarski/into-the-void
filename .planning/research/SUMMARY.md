# Project Research Summary

**Project:** Into the Void v1.24 — Balance & Automation
**Domain:** Sci-fi survival MMO systems expansion (combat depth, environmental hazards, creature AI, ability rebalance, stat caps, automation tech tree)
**Researched:** 2026-03-03
**Confidence:** HIGH

## Executive Summary

Into the Void v1.24 is a systems expansion milestone on top of an already-functional monorepo. The stack is entirely settled — zero new runtime dependencies are required. All 6 feature systems (damage types, biome hazards, creature AI upgrades, ability rebalance, stat caps, automation tech tree) integrate via extension points that already exist in the codebase. The primary work is threading data through established pipelines, adding two new NestJS services (HazardService, AutomationService), extending several pure-function packages in `game-logic`, and writing new DB schemas for automation deployables. This is not a build-from-scratch milestone — it is a precision extension of a working system.

The recommended build order has a hard dependency chain at the top: shared-type additions must precede everything; stat caps must precede ability rebalance tuning; damage types must precede creature resistance population and ability niche assignments. Automation is the one independent vertical — it has zero code dependency on combat systems and can be built in parallel with the AI and hazard work. The 83 existing creature definitions need a one-time resistance migration, and that migration strategy must be decided at the start of the damage types phase. Required-field-with-bulk-defaults is safer than optional-field-with-deferred-cleanup. Automation economy balance (maintenance cost vs. output rate) must be documented as a design artifact before any automation code is written — resource inflation is the highest-severity design failure mode of this milestone.

The three sharpest risks are: (1) damage type data added to the type system but never threaded into `calculateDamage()`, leaving the feature invisible at runtime; (2) biome hazard tick processing doing async per-player inventory and biome lookups inside the zone tick, blowing the 200ms tick budget; (3) automation structures with deployment costs only and no recurring maintenance, producing runaway credit inflation. All three have concrete prevention strategies: a required-field test that fails to compile without damage type wiring, a player hazard state cache that is read synchronously in the tick, and a mandatory income/sink balance sheet before automation implementation begins.

## Key Findings

### Recommended Stack

The monorepo stack is entirely fixed. Zero new npm installs are required. All dependencies are already present: Phaser 3.90.0 (client rendering), NestJS 10.3.x (game-server services), Drizzle ORM 0.30.10 (PostgreSQL persistence), TypeScript 5.4+ (type safety across packages), Vitest 4.0.18 (unit testing). The existing `@nestjs/event-emitter` (3.0.1) and `setInterval`/`setTimeout` tick patterns cover all new async requirements. No `@nestjs/schedule`, no BullMQ, no new Redis queues.

The six gaps that need new code but no new libraries: `DamageParams` lacks a `damageType` field; `CreatureDefinition` lacks a `resistances` field; `BiomeHazard` lacks `statDrain` and `gearCounterStat` fields; `AiTickResult` lacks behavior upgrade signals (stampede, packCall, ambush, frenzied); no `HazardService` exists; no `AutomationService` exists.

**Core technologies:**
- TypeScript 5.4+: discriminated unions for `DamageType` and `AbilityEffect` extensions — compile errors surface at definition sites, not at runtime; `satisfies` operator validates creature resistance shape at author time
- NestJS 10.3.x: `HazardService` and `AutomationService` as new injectable services — the pattern is proven across 19 existing services in game-server; register both in `game.module.ts`
- Drizzle ORM 0.30.10: new `deployables` table for automation persistence — existing `structures` table `properties` jsonb handles lighter extractor config; no ORM upgrade needed
- Phaser 3.90.0: `HazardOverlay` HUD element and damage type color-coded floating numbers — all via existing `this.add.text()` and `this.tweens.add()` APIs already used in `EntityRenderer.ts`
- Vitest 4.0.18: extend existing `damage.test.ts`; add `stat-caps.test.ts` and `biome-hazard.test.ts` for new pure functions in `game-logic`

**See:** `.planning/research/STACK.md`

### Expected Features

**Must have (table stakes — P1):**
- 4 named damage types (Thermal/Cryo/Bio/Kinetic) with per-creature resistance multipliers (0.5-1.5x soft bands) — players expect thematically named abilities to differ mechanically beyond raw numbers
- Plasma Burst dominance removed — current 35 baseDamage + 1.2 scaling makes all other offensive abilities irrelevant; no meaningful ability diversity exists today
- Defensive abilities with real HP shield absorb and flat damage reduction — current toughness-buff approach produces invisible ~2% effective DR at endgame stats; players never slot defensive abilities
- Stat soft cap at 200 with diminishing returns, hard cap at 400 — prevents infinite-scaling cheese builds; must apply to equipment+buff contributions only, not base level stats
- Biome HP drain and stat debuffs in Tier II+ zones — `BiomeHazard` type is defined in `biome.ts` but the tick is not implemented; hazard gear must exist in trader inventories before any biome's hazard tick is enabled
- Pack Call (omnivore), Frenzy (maniac), Ambush (predator), Stampede (herbivore) — one meaningful behavior upgrade per archetype
- Deployable extractors (T2) with passive accumulation, storage cap, and maintenance cost credit sink
- Credit sinks tied to automation deployment and recurring maintenance — economy currently has no meaningful drain mechanism

**Should have (competitive — P2):**
- Color-coded floating damage numbers per type (Thermal = orange, Cryo = cyan, Bio = green, Kinetic = white)
- Frenzy visual state change on creature color overlay — teaches the mechanic through observation rather than tooltips
- Survey beacons (T3) and planetary extractors (T4) extending the automation progression arc
- Resource refinery (T5) for raw-to-refined material conversion
- Tiered hazard severity (Tier II: stat debuff only; Tier III: HP drain + debuff; Tier IV: stacking drain)
- Hazard-specific consumables as emergency counter items

**Defer (v1.25+):**
- Dynamic hazard events (void storms, acid rain timed pulses) — after hazard tick infrastructure is proven stable
- Automation-creature interaction (Stampede damages deployed structures) — after both systems are independently stable
- Per-biome extractor efficiency modifiers — after automation usage patterns are measured

**Defer (v2+):**
- Adaptive creature learning AI — no production MMO implements ML-based per-creature learning; implementation cost too high
- Ability synergy combos (chain effects from type interactions) — after base balance is proven; requires new server-side state
- Crafting recipes using refined automation output — next systems milestone; explicitly out of scope in PROJECT.md
- Player resistance stats per damage type — WoW abandoned this; creates mandatory gear sets per encounter type
- Damage type immunity (0x multiplier) — creates hard player lock-out; cap resistance at 70% maximum instead

**Anti-features to avoid:**
- Plasma Burst nerf that distributes dominance to a different single ability — each ability needs a type-based situational niche
- Defensive ability rebalance implemented as larger numbers on existing `buff` effects (not new effect types) — invisible to players
- Front-loaded automation costs with no recurring maintenance — produces resource inflation after initial payoff period
- Ambush behavior using ray-casting for line-of-sight computation inside the FSM tick — breaks tick budget at 3+ Ambush creatures per zone
- Pack Call that spawns new creatures — only signal existing nearby creatures; never spawn

**See:** `.planning/research/FEATURES.md`

### Architecture Approach

The architecture is an extension of the existing 3-tier monorepo pattern: pure functions in `packages/game-logic` (damage, stat caps, hazard math, AI FSM), server coordination in `apps/game-server/src/game/` (HazardService, AutomationService, modified CombatService/AiService/AbilityService), persistence in `packages/database` (new deployables schema). The four key structural decisions are: (1) resistance multiplier applied inside `calculateDamage()` as a single multiplicative step — both auto-attacks and ability-triggered attacks use the same path; (2) hazard processing cached on biome entry and gear change events, read synchronously from a Map in the tick — not recomputed async per-player per-tick; (3) group AI behaviors (Stampede, Pack Call) computed in a zone-level pre-processing pass before the per-creature FSM loop — `tickCreatureAI()` remains a pure single-creature function; (4) automation state accumulated in-memory and flushed to the `deployables` DB table on collection or on a 5-minute interval — not written to DB on every 60s accumulation tick.

**Major components:**
1. `packages/game-logic/src/combat/` — extended with `stat-caps.ts` (NEW) and `biome-hazard.ts` (NEW); `damage.ts` and `creature-ai.ts` modified to accept new parameters
2. `apps/game-server/src/game/hazard.service.ts` (NEW) — biome hazard tick processor injected into AiService; reads cached `Map<playerId, HazardState>` synchronously
3. `apps/game-server/src/game/automation.service.ts` (NEW) — deployable lifecycle, 60s global tick, resource accumulation, maintenance cost deduction, processing queue management
4. `packages/database/src/schema/deployables.ts` (NEW) — automation structure persistence (ownerId, deployableType, fuelRemaining, accumulatedItems, processingQueue config)
5. `apps/web/src/game/rendering/HazardOverlay.ts` (NEW) — HUD hazard warning with counter stat progress indicator

**Internal boundaries that must not be crossed:**
- `game-logic` functions must remain pure — no NestJS imports, no DB calls
- `HazardService` calls AiService's zone data but AiService must not call HazardService (circular dependency)
- `AutomationService` has no dependency on CombatService — automation is resource management only
- `tickCreatureAI()` is single-creature and pure; AiService handles multi-creature coordination

**See:** `.planning/research/ARCHITECTURE.md`

### Critical Pitfalls

Top 5 by impact and prevention urgency (from PITFALLS.md):

1. **Damage type field added to types but never read in `calculateDamage()`** — make `damageType` required (not optional) on `DamageParams`; TypeScript will fail to compile at all call sites; write the resistance unit test first, before any creature definition changes
2. **83 existing creatures get no `resistances` field — partial migration breaks biome balance** — make `resistances` required with a neutral default profile (`{ thermal: 1.0, cryo: 1.0, bio: 1.0, kinetic: 1.0 }`) bulk-applied per biome as the base thematic assignment; never leave the field optional
3. **Biome hazard tick does async zone/inventory lookups per-player per-tick — blows 200ms budget** — cache player hazard vulnerability state on biome entry and gear change events; read synchronously from a `Map<playerId, HazardState>` in the tick; benchmark tick duration before and after adding any hazard processing
4. **Automation extractors have only deploy costs and no recurring maintenance — runaway credit inflation** — document income/sink balance sheet (maintenance cost per hour >= 60% of output value at each tier) before writing any automation code; this is the highest-severity economic failure mode
5. **Defensive ability rebalance uses larger numbers on existing `buff` effects — players still ignore defensives** — add `shield` (HP absorb pool) and `damage_reduction` (flat DR%) as new variants to the `AbilityEffect` discriminated union; toughness buffs at endgame produce ~2% effective DR and are completely invisible to players

Additional pitfalls documented: stat cap set below natural legendary gear output (invalidates existing legendaries); Pack Call / Stampede implemented inside `tickCreatureAI()` causing O(n²) per-tick (requires zone-level pre-processing architecture); Frenzy Map not cleared on creature death (state leak); Ambush using ray-casting inside FSM tick (breaks tick budget).

**See:** `.planning/research/PITFALLS.md`

## Implications for Roadmap

Based on combined research, the following 7-phase structure is recommended. Phase 7 (Automation) is fully independent and can be built in parallel with Phases 5-6 by a separate contributor after Phase 1 is complete.

### Phase 1: Shared Type Foundation

**Rationale:** Every subsequent system depends on type contracts being in place. `DamageType` union, `DamageResistances` interface, `shield`/`damage_reduction` AbilityEffect variants, `DeployableEntity` interface, and `AiTickResult` behavior signal fields are all consumed by Phases 2-7. Making fields required (not optional) is the primary prevention mechanism for the most common pitfall in this milestone.
**Delivers:** Compilable type contracts for all v1.24 features across `shared-types`, `entities`, and `game-logic` index exports; no behavioral changes yet; TypeScript compile confirms all new interfaces are wired
**Addresses:** DamageType union + DamageResistances (FEATURES.md), DeployableEntity interface (FEATURES.md), AiTickResult extensions (ARCHITECTURE.md Pattern 3)
**Avoids:** Pitfall 1 (damage type ignored) — required field is the prevention; Pitfall 2 (partial creature migration) — forces all consumers to handle new fields

### Phase 2: Stat Caps

**Rationale:** Stat caps must precede ability rebalance tuning. Current buff amounts (+8 to +12 toughness) were designed without a cap in mind. Setting the cap before tuning ability values ensures all new buff numbers are calibrated to the post-cap stat landscape. Also requires a pre-implementation audit of current gear stat distributions — set cap value at or above the 85th percentile of natural endgame stat totals, not below the median.
**Delivers:** `applyDiminishingReturns()` pure function in `packages/game-logic/src/combat/stat-caps.ts`; soft cap 200, hard cap 400 applied at end of `computeCharStats()`; stats panel soft cap indicator; gear distribution simulation documented
**Uses:** Single modification to `computeCharStats()` loop; `stat-caps.test.ts` verifying DR curve above 200 (STACK.md)
**Avoids:** Pitfall 7 (cap invalidates existing legendaries) — gear distribution simulation gates the cap value selection

### Phase 3: Damage Types and Creature Resistances

**Rationale:** Damage types must precede ability rebalance — assigning damage types to abilities is only testable after creature resistance data exists. The 83-creature resistance migration must happen atomically in this phase using the required-field strategy. The critical integration point is modifying `calculateDamage()` to accept `damageType` and `defenderResistances` and apply the multiplier.
**Delivers:** `DamageType` threaded through `calculateDamage()`; resistance data on all 83+ creatures (bulk per-biome assignment + thematic tuning); damage type label and color in combat log and floating numbers; `damage-types.test.ts` verifying half-damage on 0.5x resistance
**Implements:** Pattern 1 from ARCHITECTURE.md — DamageType as multiplicative layer on existing pipeline
**Avoids:** Pitfall 1 (type ignored) and Pitfall 2 (partial creature migration); confirms damage type system is visibly functional before ability rebalance assigns types to abilities

### Phase 4: Ability Rebalance

**Rationale:** Depends on Phase 2 (stat caps stable for buff amount calibration) and Phase 3 (damage types on creatures make ability type niche assignments testable). The shield effect type is a new `AbilityEffect` discriminant — not larger numbers on existing buff effects. Plasma Burst nerf and defensive ability overhaul are the two highest player-visibility changes of the entire milestone.
**Delivers:** `shield` and `damage_reduction` effect variants in `AbilityEffect` union; 6 ability definition changes (Plasma Burst nerf, Emergency Shield → HP absorb, Magnetic Field → flat DR, Thermal Lance → Thermal type + cooldown reduction, Cryo Blast → Cryo type + perception debuff, Fortify Systems → HP absorb); `AbilityService.shieldPools` Map; `consumeShield()` call in `CombatService.creatureAttackTick()`; shield bar in HUD
**Uses:** Pattern 4 from ARCHITECTURE.md — shield pool as new effect type; `shieldPools` and `damageReductions` Maps in AbilityService
**Avoids:** Pitfall 6 (defensive abilities still invisible after rebalance); integration gotcha (toughness buff at endgame is ~2% DR — confirmed invisible)

### Phase 5: Creature AI Upgrades

**Rationale:** Group behaviors (Stampede, Pack Call) require zone-level pre-processing architecture to be designed before any behavior code is written — the per-creature FSM must remain pure and single-creature. Frenzy requires extending the centralized `handleCreatureDeath()` before any per-behavior state Maps are created. Ambush must be implemented as a directional-bias FSM state, not as ray-casting inside the tick.
**Delivers:** 4 new `AiTickResult` fields; `detectGroupBehaviorTriggers()` zone-level pre-pass in AiService; Stampede (herbivore flee cascade), Pack Call (omnivore ally signaling, hard cap 2-3 allies), Ambush (predator directional-approach state), Frenzy (maniac speed/damage boost below 30% HP) behaviors; Frenzy creature color overlay in EntityRenderer; centralized `handleCreatureDeath()` extended for new state Maps
**Implements:** Pattern 3 from ARCHITECTURE.md — FSM branches with zone-level coordination separated from per-creature tick
**Avoids:** Pitfall 5 (O(n²) group behavior detection), Pitfall 9 (Ambush ray-casting in FSM tick), Pitfall 10 (Frenzy Map leak on creature death)

### Phase 6: Biome Hazard System

**Rationale:** Depends on Phase 3 (DamageType enum used for hazard classification) and benefits from Phase 5 (creature behaviors provide in-zone threats that make hazard zones narratively coherent). Requires caching architecture for player hazard state designed before tick code is written. Requires hazard protection gear available in faction traders before any biome's hazard tick is enabled — this is a hard design gate.
**Delivers:** `HazardService` injectable with player hazard state cache; `computeHazardDrain()` pure function in `biome-hazard.ts`; `BiomeHazard` interface extended with `gearCounterStat` and `gearCounterThreshold`; `player:hazard` socket event; HazardOverlay HUD component with counter stat progress bar; hazard protection items in faction trader inventories; `isHubZone()` guard applied to all hazard tick paths; first-tick 3-second grace period
**Implements:** Pattern 2 from ARCHITECTURE.md — HazardService as independent injectable called from AiService.runZoneTick()
**Avoids:** Pitfall 3 (tick budget overrun — synchronous Map read instead of async lookups), Pitfall 4 (instant-kill tick damage — max 8% base HP drain per tick, validated against minimum-level entrant), integration gotcha (hub zone hazard guard)

### Phase 7: Automation Tech Tree

**Rationale:** Fully independent of all combat systems — zero code dependency on Phases 1-6. Can be built in parallel with Phases 5-6. The income/sink balance sheet must be the first deliverable of this phase before any implementation begins. Sequencing it as a dedicated vertical avoids context-switching between combat balance tuning and economy design.
**Delivers:** `deployables` and `automation-jobs` DB schemas + Drizzle migration; `AutomationService` with 60s global tick, fuel/maintenance deduction, in-memory accumulation with 5-minute DB flush; T2 extractor → T3 survey beacon → T4 planetary extractor → T5 refinery progression; `deployable:place/collect/refuel` socket events in `game.gateway.ts`; automation panel in client HUD; income/sink balance sheet documented (maintenance cost >= 60% of output value per tier)
**Uses:** Drizzle `pgTable` schema patterns from `packages/database`; `setInterval` service pattern from existing AiService/ZonesService (STACK.md)
**Avoids:** Pitfall 8 (credit inflation — balance sheet gates implementation), Pitfall — DB write on every accumulation tick (in-memory flush pattern)

### Phase Ordering Rationale

- Phase 1 before all others because TypeScript contract correctness is a compile-time gating mechanism, not a feature — required fields prevent the most common silent failure mode in this milestone
- Phase 2 before Phase 4 because all ability buff amounts must be calibrated against the post-cap stat landscape; setting the cap after writing buff values means re-tuning everything
- Phase 3 before Phase 4 because ability type niche assignments (Thermal Lance = Thermal) are only testable against real creature resistance data; assigning types without resistance data means no way to verify the system has effect
- Phase 4 before Phase 5 because Frenzy and Stampede behaviors create the in-combat threats that give defensive abilities meaningful deployment context; without AI threats, players cannot experience why Emergency Shield matters
- Phase 5 before Phase 6 because dangerous creature behaviors in Tier III+ zones make biome hazard severity narratively coherent — both systems together create zone identity, individually they are partial
- Phase 7 parallel-capable with Phases 5-6 because automation has no shared code with creature AI or hazard systems; routing it as a separate track avoids single-contributor bottleneck

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 7 (Automation):** Income/sink balance sheet requires simulation against current credit economy data (credit generation rates per tier, current player credit ceilings). Refinery recipe table design (input → output raw-to-refined mappings) is not documented in research and must be validated against `lore/world-bible.md` faction material names.
- **Phase 6 (Biome Hazards):** Specific named protective gear items for cold, heat, and pressure hazard counters are not enumerated in research. The `hazmat` archetype covers toxic/void/radiation but the remaining 3 hazard types need gear item names confirmed against `lore/world-bible.md` faction gear sections before trader inventories can be populated.

Phases with standard patterns (skip research-phase):
- **Phase 1 (Shared Types):** TypeScript discriminated union extension is a zero-risk pattern established throughout this codebase
- **Phase 2 (Stat Caps):** Single pure function addition to `computeCharStats()` — one file change, pattern fully specified in ARCHITECTURE.md
- **Phase 3 (Damage Types):** Multiplicative resistance layer in `calculateDamage()` has exact code specified in STACK.md and ARCHITECTURE.md; no unknowns
- **Phase 4 (Ability Rebalance):** AbilityEffect union extension follows established shared-types pattern; AbilityService Map tracking follows existing `activeBuffs` pattern
- **Phase 5 (AI Upgrades):** Zone-level pre-processing architecture is documented in detail in PITFALLS.md; FSM extension patterns are clear

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Codebase directly inspected; all installed versions verified from pnpm-lock.yaml; zero new dependencies required; integration points identified via source file examination |
| Features | MEDIUM-HIGH | Table stakes features validated against WoW, NMS, Elden Ring, D&D 5e; anti-features have documented industry precedent with citations; automation income balancing is directional (needs credit economy simulation before Phase 7 implementation) |
| Architecture | HIGH | All referenced source files directly inspected; data flow diagrams derived from existing service wiring; specific code snippets provided for each integration point; no speculative architecture |
| Pitfalls | HIGH | Each pitfall is derived from a confirmed existing gap in the codebase (no `damageType` in `calculateDamage()`, no `shield` in `AbilityEffect`, no group behavior coordination in AiService); not speculative — direct source inspection confirmed each gap |

**Overall confidence:** HIGH

### Gaps to Address

- **Stat cap value validation:** The 200 soft cap / 400 hard cap values are reasonable defaults but must be validated against a simulation of current best-in-slot gear at each tier before Phase 2 ships. Run `computeCharStats()` for a simulated BIS loadout at level 20 Tier II, level 30 Tier III, and level 40 Tier IV. Set the soft cap at or above the 85th percentile of natural endgame totals. This is a 1-2 hour task but cannot be skipped without risking retroactive legendary gear invalidation.
- **Automation income/sink balance sheet:** Output rates and maintenance costs for T2-T5 automation tiers are directional estimates only. The per-hour income vs. maintenance balance at each tier requires simulation against real credit economy data (current credit generation rates from trading and gathering). This must be the first deliverable in Phase 7 before any implementation begins.
- **Hazard counter gear for cold, heat, and pressure biomes:** The `hazmat` archetype in `packages/items/src/utils.ts` maps to toxic/void/radiation. Named protective gear items for `frozen_expanse`/`crystalline_wastes` (cold), `volcanic_ridge` (heat), and `deep_trenches` (pressure) are not documented in research. Validate against `lore/world-bible.md` faction gear sections during Phase 6 planning.
- **Creature resistance tuning granularity:** Bulk biome-assignment (all Frozen Expanse creatures get high Cryo resistance, all Volcanic Ridge creatures get high Thermal resistance) is the recommended base migration strategy. Individual per-creature tuning for 83 creatures is a design effort not time-estimated in the research. Allocate explicit capacity in Phase 3 for the full resistance data pass — this is authoring work, not engineering work.
- **Refinery recipe table:** The T5 refinery requires a raw → refined material mapping. Research establishes the mechanic but not the specific recipes. These must align with `lore/world-bible.md` faction material identities and the automation economy balance sheet established in Phase 7 planning.

## Sources

### Primary (HIGH confidence)

- Direct codebase inspection: `packages/game-logic/src/combat/damage.ts`, `packages/game-logic/src/ai/creature-ai.ts`, `packages/game-logic/src/stats/char-stats.ts`, `packages/shared-types/src/game/combat.ts`, `packages/shared-types/src/game/biome.ts`, `packages/shared-types/src/game/ability.ts`, `packages/items/src/types.ts`, `packages/items/src/utils.ts`, `packages/entities/src/types.ts`, `packages/database/src/schema/structures.ts`, `apps/game-server/src/game/combat.service.ts`, `apps/game-server/src/game/ai.service.ts`, `apps/game-server/src/game/ability.service.ts`, `apps/game-server/src/zones/zones.service.ts`
- pnpm-lock.yaml: installed version verification for phaser@3.90.0, drizzle-orm@0.30.10, @nestjs/event-emitter@3.0.1, lru-cache@11.2.6
- `.planning/PROJECT.md`: v1.24 milestone scope and explicitly out-of-scope items
- `lore/world-bible.md`: biome hazard types and faction identity (non-negotiable per CLAUDE.md)
- [Elden Ring Stat Caps — Game Rant](https://gamerant.com/elden-ring-stat-attribute-soft-hard-caps-diminishing-returns/) — verified against shipped soft cap inflection points
- [Dark Souls Environmental Hazards — Dark Souls Wiki](https://darksouls.fandom.com/wiki/Environmental_Hazards) — official mechanics; poison swamp design documented
- [Passive Resource Systems in Idle Games — Adrian Crook](https://adriancrook.com/passive-resource-systems-in-idle-games/) — industry practitioner on automation income/sink balance

### Secondary (MEDIUM confidence)

- [WoW Resistance System — Wowpedia](https://wowpedia.fandom.com/wiki/Resistance) — community wiki; historical accuracy on mechanic removal rationale
- [D&D 5e Vulnerability Analysis — Blog of Holding](https://www.blogofholding.com/?p=8544) — quantitative analysis of why 2x vulnerability is too punishing
- [D&D 2024 Monster Manual resistance removal — D&D Beyond](https://www.dndbeyond.com/forums/dungeons-dragons-discussion/rules-game-mechanics/215361-opinions-about-removal-of-resistances-and) — community analysis of WotC design decision
- [NMS Mineral Extractor — No Man's Sky Wiki](https://nomanssky.fandom.com/wiki/Mineral_Extractor) — community wiki for shipped automation feature
- [Designing Game Economies — Medium](https://medium.com/@msahinn21/designing-game-economies-inflation-resource-management-and-balance-fa1e6c894670) — practitioner overview of inflation and credit sink design
- [Boids Algorithm — Wikipedia](https://en.wikipedia.org/wiki/Boids) — academic source for pack/herd AI framework
- [AI for Game Developers: Flocking — O'Reilly](https://www.oreilly.com/library/view/ai-for-game/0596005555/ch04.html) — group behavior architecture patterns

### Tertiary (LOW confidence)

- [ESO Damage Shields Forum Thread](https://forums.elderscrollsonline.com/en/discussion/165765/the-problem-with-damage-shields) — community analysis of shield ability underuse; confirms player-invisible toughness buffs but does not quantify
- [6 Core Systems That Make or Break Idle Games](https://subtlezungle.substack.com/p/6-core-systems-that-make-or-break) — design analysis; directional guidance on automation resource sinks; single practitioner source

---
*Research completed: 2026-03-03*
*Ready for roadmap: yes*
