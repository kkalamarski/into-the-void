# Equipment Stat Aggregation System Research Summary

**Project:** Equipment Stat Bonuses via Stats Effect
**Domain:** RPG Equipment Stats (TypeScript/Game Development)
**Researched:** 2026-02-21
**Confidence:** HIGH

## Executive Summary

Into the Void needs to consolidate equipment stat bonuses into a unified system. The codebase already has 90% of the foundation: discriminated union effects, pure aggregation functions, and server-authoritative computation. The missing piece is extending the existing `stats` effect type (already defined but not implemented) to replace the temporary workaround of using `stat_buff` with `duration: 0` for permanent equipment bonuses.

The recommended approach is a surgical refactor: add a single switch case to the effect resolver, migrate 43+ item definitions from the legacy pattern to the clean pattern, and validate that the existing aggregation logic (which is already generic) handles multi-stat effects correctly. The primary risk is migration drift — forgetting to update items or creating client/server calculation divergence — which is mitigated through shared calculation code, schema validation, and comprehensive testing.

This is a low-risk, high-value refactor that unblocks proper rarity scaling, archetype-based stat profiles, and clear equipment progression. The core systems are sound; the work is primarily cleanup and content normalization.

## Key Findings

### Recommended Stack

**Current implementation is nearly complete — extend, don't replace.**

Into the Void already uses the right patterns:
- TypeScript discriminated unions for type-safe effect definitions
- Pure functions (Array.reduce pattern) for stat aggregation
- Server-authoritative computation via GameGateway.emitStats()
- Shared game-logic package for cross-boundary calculations

**Core technologies (already in use):**
- **TypeScript Partial<CharacterStats>** for optional stat properties — allows items to define only relevant stats without requiring all 8
- **Discriminated unions (ItemEffect)** for type-safe effect resolution — compiler enforces exhaustive handling
- **Array.reduce() aggregation** in computeCharStats() — generic loop works for single-stat AND multi-stat effects without modification

**Critical gap to fill:**
- Add `case 'stats':` to resolveEffect() switch statement (5 lines of code)
- The `stats` effect type already exists in types.ts but has no resolver implementation

### Expected Features

**Must have (table stakes):**
- Additive stat stacking — +10 toughness + +15 toughness = +25 toughness (already implemented)
- Rarity-based stat scaling — higher rarity = bigger bonuses (needs normalization, multipliers defined)
- Equipment slot stat display — show stats before equipping (UI work, backend ready)
- Stat total breakdown — base/equipment/total in UI (CharStatsPayload already emits this)
- Suit archetype identity — tank suits feel tanky, scouts feel mobile (needs stat profile templates)
- Level-appropriate scaling — tier-based multipliers for progression (formulas defined, needs implementation)

**Should have (competitive advantage):**
- Granted abilities tied to suits — suits grant 2-5 abilities, not just stat sticks (already implemented)
- Specialized suit archetypes — hazmat/assault/recon with unique ability combos (4 new suits added in Phase 58)
- Stat profile coherence — stats tell a story (e.g., Assault Frame = power+haste, not random stats) (needs design audit)
- Eight-stat system depth — durability/toughness/power/haste/vigor/recovery/perception/resilience vs. standard 4-6 stats (already differentiated)

**Defer (v2+):**
- Set bonuses (2-piece, 4-piece) — conflicts with granted abilities system, restricts build diversity
- Randomized stat ranges on drop — frustrating loot treadmill, use fixed stats per rarity instead
- Percentage-based bonuses — early game bonuses feel terrible, stick to flat scaling
- Diminishing returns — opaque math players hate, use archetype design to distribute stats naturally

### Architecture Approach

**The architecture is server-authoritative and separation-of-concerns is clean.**

Data flows: Client action → GameGateway → InventoryService (DB write + state mutation) → computeCharStats(level, equipment) → stats:update event → Client UI. The server owns inventory state (in-memory cache + DB persistence), computes stats from item definitions (ItemRegistry), and emits results. The client is a pure view layer that never computes stats locally (preventing cheating).

**Major components:**
1. **ItemDefinition (source of truth)** — effects array defines stat bonuses, stored in packages/items/src/definitions/*.ts
2. **resolveEffect() (effect → applied stats)** — pure function in game-logic package, needs stats case added
3. **computeCharStats() (aggregator)** — iterates equipped items, resolves effects, aggregates into CharacterStats object
4. **GameGateway.emitStats() (server authority)** — triggers computation on equip/unequip, emits to client, updates maxHealth
5. **Client UI (view layer)** — receives stats:update events, displays stat breakdown, no computation

**Key architectural win:** The aggregation loop in computeCharStats() is already generic — it iterates `Object.entries(effect.applied)` and guards with `if (stat in stats)`. This means single-stat effects (armor, stat_buff) and multi-stat effects (stats) use the same aggregation logic without code changes.

### Critical Pitfalls

1. **Duration zero workaround becoming technical debt** — 43+ items use `stat_buff` with `duration: 0` as a permanent stat hack. When migrating to the new `stats` effect, forgetting to update all items creates a mixed system. Prevention: exhaustive migration script with grep audit, schema validation flagging `duration: 0`, CI lint preventing regression.

2. **Two stat systems running in parallel** — Both CharacterStats (8 canonical stats) and ComputedStats (7 legacy stats) exist. Combat uses CharacterStats.toughness, but some code may reference ComputedStats.armor, causing inconsistent calculations. Prevention: audit all combat code, map legacy effects to CharacterStats, deprecate ComputedStats redundant fields, establish single source of truth.

3. **Effect resolution order creating non-deterministic values** — Multiplicative effects (speedMultiplier *= value) vs additive (stats[key] += value) applied inconsistently. Equipping items in different orders could produce different results. Prevention: define aggregation rules (flat stats additive, multipliers additive percentages then multiply), implement two-pass aggregation, add test suite with known combinations.

4. **Client-side stat calculation diverging from server** — ItemTooltip.tsx calculates deltas client-side, computeCharStats() runs server-side. If implementations drift, tooltips show wrong values. Prevention: move stat calculation to shared game-logic package, export pure functions, both import from same source, add parity integration test.

5. **Missing items with no stats creating silent failures** — 52 items have `effects: []`. After stat refactor, these items should have stats based on rarity/tier but pass validation because empty arrays are technically valid. Prevention: schema validation enforcing equippable items must have stats, backfill script suggesting bonuses based on ilvl, unit test asserting all equippable items have effects.

## Implications for Roadmap

Based on research, this refactor is best approached as a 5-phase surgical migration:

### Phase 1: Type Foundation (Stats Effect Resolver)
**Rationale:** Unblock new item definitions from using the clean stats effect pattern. Add the missing resolver case without touching existing items — proves the system works before migration.

**Delivers:**
- `stats` effect type has resolver implementation in resolveEffect()
- Unit tests verify multi-stat resolution (toughness + durability in one effect)
- Documentation clarifies when to use `stats` vs legacy `stat_buff`

**Addresses:**
- Effect type explosion (PITFALLS #6) — document that stats effect is canonical for all CharacterStats bonuses
- Duration zero workaround (PITFALLS #1) — mark stat_buff with duration=0 as deprecated pattern

**Avoids:**
- Breaking existing items — no item definitions changed yet
- Effect type explosion — consolidate future stat effects into stats type

**Research flag:** Standard pattern (discriminated union switch case) — skip research-phase

### Phase 2: Item Migration (Legacy to Stats Effect)
**Rationale:** Replace all 43+ instances of `stat_buff` with `duration: 0` with clean `stats` effects. Must happen atomically with rollback strategy because it touches 100+ files.

**Delivers:**
- Migration script that converts old pattern to new pattern
- Tested on staging environment first
- Rollback script capturing pre-migration state
- Schema validation preventing `stat_buff` with `duration: 0` in new items
- Git diff review of all item changes

**Addresses:**
- Duration zero workaround (PITFALLS #1) — removes all legacy usages
- Migration without rollback (PITFALLS #8) — practice run + rollback plan

**Avoids:**
- Data corruption via bulk migration — idempotent script, staging test, validation
- Two stat systems (PITFALLS #2) — opportunity to audit ComputedStats usage during migration

**Research flag:** Needs migration planning research — data migration best practices, rollback strategies, idempotency patterns

### Phase 3: Stat Aggregation Rules (Deterministic Calculation)
**Rationale:** Define and enforce how stats aggregate (additive vs multiplicative, equipment vs buffs). Currently implicit; needs explicit rules and tests to prevent order-dependency bugs.

**Delivers:**
- Documented aggregation order: base → equipment flat → equipment % → buffs flat → buffs %
- Two-pass aggregation implementation in computeCharStats()
- Test suite with known equipment combinations and expected totals
- Validates same result regardless of equip order

**Addresses:**
- Effect resolution order (PITFALLS #3) — deterministic aggregation
- Buffs + equipment interaction (PITFALLS #7) — defines how they combine

**Avoids:**
- Non-deterministic stat values from order-dependency
- Future bugs when buff system expands

**Research flag:** Standard pattern (additive/multiplicative is well-documented) — skip research-phase

### Phase 4: Shared Calculation Code (Client/Server Parity)
**Rationale:** Client tooltips must show accurate deltas. Currently client has separate stat calculation logic that can drift from server. Move to shared code.

**Delivers:**
- Stat calculation functions moved to @into-the-void/game-logic
- Server and client both import shared functions
- Integration test asserting serverStats(eq) === clientStats(eq)
- CI fails if parity breaks

**Addresses:**
- Client/server divergence (PITFALLS #4) — shared code prevents drift
- Tooltip accuracy (UX PITFALLS) — deltas match actual stat changes

**Avoids:**
- "Tooltip said +15 Power but I only got +12" bug reports
- Duplicated stat logic maintenance

**Research flag:** Standard pattern (isomorphic code) — skip research-phase

### Phase 5: Content Audit & Normalization (Stat Profiles + Scaling)
**Rationale:** Apply rarity multipliers and archetype stat profiles to all items. Ensures progression curve and archetype identity are consistent across 100+ items.

**Delivers:**
- Stat profile templates for tank/scout/combat/hybrid archetypes
- Rarity multipliers (1.0x common / 1.4x rare / 2.0x epic / 2.8x exotic / 4.0x legendary)
- Level tier scaling (1.0x tier1 to 8.0x tier5)
- Audit of all 21 suits applying formulas
- Schema validation rejecting equippable items with effects: []
- Backfill of 52 items missing stats

**Addresses:**
- Missing item stats (PITFALLS #5) — validation + backfill
- Suit archetype identity (FEATURES table stakes) — stat profiles enforce archetypes
- Rarity scaling (FEATURES table stakes) — consistent multipliers

**Avoids:**
- Incomplete items shipped to production
- Inconsistent progression (some items overpowered, others useless)

**Research flag:** Needs game design research — stat budgets, progression curves, archetype balance

### Phase Ordering Rationale

- **Phase 1 before 2:** Can't migrate items to stats effect until resolver exists
- **Phase 2 before 3:** Need clean stat effects before defining aggregation rules (otherwise testing legacy pattern)
- **Phase 3 before 4:** Must have deterministic server calculation before expecting client parity
- **Phase 4 before 5:** Shared calculation code must exist before content audit (tooltips need to be accurate)
- **Phase 5 last:** Content normalization applies formulas across all items — requires all foundation work complete

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 2:** Migration best practices — idempotent scripts, staging workflow, rollback strategies (GameChanger case study covered this but needs detailed runbook)
- **Phase 5:** Game design patterns — stat budgets, archetype balance, progression curves (need RPG balancing research)

Phases with standard patterns (skip research-phase):
- **Phase 1:** Discriminated union switch case — well-documented TypeScript pattern
- **Phase 3:** Additive/multiplicative aggregation — covered in existing STACK.md research
- **Phase 4:** Isomorphic calculation code — standard shared package pattern

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Existing codebase uses recommended patterns, only 1 switch case missing |
| Features | HIGH | Web research + competitor analysis + existing codebase confirms table stakes |
| Architecture | HIGH | Existing architecture is server-authoritative and extensible, no refactor needed |
| Pitfalls | HIGH | 8 critical pitfalls identified with prevention strategies from case studies |

**Overall confidence:** HIGH

The research is based on:
- Deep codebase analysis (all relevant files read and pattern-matched)
- Official TypeScript documentation (Partial<T>, discriminated unions)
- RPG development best practices (refreshertowelgames.wordpress.com, randompotion.com)
- Migration case studies (GameChanger refactor post-mortem)
- Competitor analysis (WoW, Path of Exile stat systems)

### Gaps to Address

- **Stat profile templates need playtesting:** Tank/Scout/Combat ratios are based on genre conventions, but Into the Void's 8-stat system is custom. May need tuning after player feedback. Handle during Phase 5 with design iteration.

- **Rarity multiplier curve needs validation:** Proposed 1.4x/2.0x/2.8x/4.0x scaling feels right based on research, but needs in-game testing to verify progression feel. Handle during Phase 5 with playtesting.

- **ComputedStats deprecation scope unclear:** PITFALLS #2 identifies two parallel stat systems, but research didn't map all ComputedStats usage. Need comprehensive audit during Phase 2 to identify all references and create full migration plan.

- **Buff system interaction design incomplete:** Phase 3 addresses equipment + buffs aggregation order, but buff system implementation details are sparse in codebase. May need additional design work when buff features expand beyond current consumable system.

## Sources

### Primary (HIGH confidence)
- **Codebase analysis** — packages/game-logic/src/stats/char-stats.ts, packages/game-logic/src/inventory/effects.ts, packages/items/src/types.ts, apps/game-server/src/game/game.gateway.ts (existing patterns and gaps identified)
- **TypeScript Handbook: Utility Types** — https://www.typescriptlang.org/docs/handbook/utility-types.html (Partial<T> pattern for optional stats)
- **TypeScript Handbook: Narrowing** — https://www.typescriptlang.org/docs/handbook/2/narrowing.html (discriminated unions for ItemEffect)
- **How to Deal with Modifiable Stats in RPGs** — https://refreshertowelgames.wordpress.com/2024/02/17/how-to-comfortably-deal-with-modifiable-stats/ (additive vs multiplicative patterns, modifier application order)
- **RPG Programming Pitfalls: Stat System** — https://randompotion.com/2023/08/14/rpg-programming-pitfalls-1-stat-system/ (dictionary vs individual properties, common mistakes)

### Secondary (MEDIUM confidence)
- **GameChanger Big Refactor** — https://tech.gc.com/how-we-improved-user-experience-by-doing-the-big-refactor/ (data model migration strategy, practice runs, rollback planning)
- **Composite Design Pattern for RPG Attributes** — https://code.tutsplus.com/using-the-composite-design-pattern-for-an-rpg-attributes-system--gamedev-243t (modifier aggregation patterns, calculation order)
- **How to Make an RPG: Stats** — https://howtomakeanrpg.com/r/a/how-to-make-an-rpg-stats.html (stat modifier aggregation, RPG stat system design)
- **Stat Budget - Wowpedia** — https://wowpedia.fandom.com/wiki/Stat_budget (ilvl-based stat allocation formulas for rarity scaling reference)

### Tertiary (LOW confidence)
- **Data Aggregation Techniques in TypeScript** — https://codesignal.com/learn/courses/projection-filtering-and-aggregation-of-data-streams-in-ts/lessons/data-aggregation-techniques-in-typescript (Array.reduce patterns, generic aggregation)
- **Color-Coded Item Tiers - TV Tropes** — https://tvtropes.org/pmwiki/pmwiki.php/Main/ColorCodedItemTiers (rarity tier conventions, player expectations)

---
*Research completed: 2026-02-21*
*Ready for roadmap: yes*
