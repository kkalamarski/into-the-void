# Project Research Summary

**Project:** Into the Void v1.23 — Content Expansion & Faction Gear
**Domain:** MMO content expansion — entity definitions, biome population, faction-specific equipment
**Researched:** 2026-02-27
**Confidence:** HIGH

## Executive Summary

Into the Void v1.23 is a content expansion milestone, not a system milestone. All implementation infrastructure — registries, stat utilities, trader systems, world generation — already exists and has been proven across prior phases. The work is entirely definitional: writing TypeScript object literals that extend an established flat-registry architecture from 92 entities and 122 items to approximately 180+ entities and 150+ items. The critical design decision that gates all faction gear work is establishing faction identity pillars — the stat archetype and ability assignment matrix per faction — before a single item definition is written. Lore-sourced faction identities (Verdant=biotech resilience, Helix=industrial brutalism, Nexus=surveillance agility) map directly to the seven available stat archetypes (`hazmat`, `scout`, `tank`, `assault`, `recon`, `combat`, `balanced`).

The recommended approach is a two-track parallel execution: biome entity population (creatures, plants, minerals, artifacts) runs independently of faction gear development. Both tracks are definitional and have zero runtime system dependencies, but each track has its own ordering constraint. Entity track: write creature definitions and loot tables in the same commit, then wire spawn configs. Faction gear track: design identity pillars first, then write Tier I–II suits to establish patterns, then Tier III–IV endgame gear, then modules and tools, then NPC trader inventory. The single most urgent content gap is `toxic_wastes`, which has only one creature against a lore description of a rich chemical ecosystem — it is the most conspicuous hole a player would encounter on day one.

The primary risk is silent failures. The content pipeline has three integration points that must all be updated for an entity to appear in the world: the definition file, the `ENTITY_IDS` constants, and `BIOME_SPAWN_CONFIGS`. Missing any one produces no error — the entity simply never spawns. The same pattern applies to loot tables (missing entry = silent empty drops), harvest yield item IDs (typo = magenta Unknown Item in inventory), and faction gear ability grants (wrong ability ID = silently ignored). The primary mitigation is establishing validation tests in `packages/entities` before writing any definitions — the `packages/items` test suite (`item-validation.test.ts`, CONT-01 through CONT-05) provides the exact pattern to replicate. This test infrastructure must be the first task of the milestone.

## Key Findings

### Recommended Stack

No new dependencies are required. TypeScript 5.9.3, Vitest 4.0.18, NX 20.8.4, and ESLint 8.57.0 with existing custom rules cover all validation needs for the entire milestone. The only tooling gap is that `packages/entities` has zero tests — no `vitest.config.ts` and no `__tests__/` directory — despite `packages/items` having five proven test suites (CONT-01 through CONT-05). Adding 60–70 new entity definitions without the parallel validation infrastructure is the primary regression risk.

**Core technologies:**
- TypeScript 5.9.3 — all definition files are pure TS object literals; compile-time type checking catches shape errors with zero JSON/YAML overhead
- Vitest 4.0.18 — already proven in `packages/items`; identical setup must be added to `packages/entities` before any entity work begins
- ESLint + custom rules (`eslint-rules/no-legacy-stat-buff.ts`) — existing rule enforces correct `stats` effect type; extensible for additional faction naming enforcement via `@typescript-eslint/utils@8.56.0`
- NX 20.8.4 — `test` target caches by input hash; entity tests run only when definition files change
- `generateSuitStats(archetype, rarity, tier)` and `computeIlvl()` from `packages/items/src/utils.ts` — mandatory for all new suit definitions; never hand-code stat numbers (caused Phase 59/60 migration)

**See:** `.planning/research/STACK.md`

### Expected Features

Research from FEATURES.md confirms a clear priority hierarchy derived from lore authority and direct biome audit.

**Must have (table stakes — P1):**
- Every biome reaches 4–6 creatures — most biomes have 1–3; `toxic_wastes` has 1 (critical gap requiring 4–5 new creatures)
- Every biome has 2–3 plants and 2–3 minerals with common/rare/epic rarity variants
- Every biome has 1–2 artifacts — most underserved entity category; many biomes have zero
- Faction identity pillars documented before any gear is written (stat archetype + ability matrix + color palette + naming convention per faction) — design gate for all subsequent phases
- Verdant, Helix, and Nexus faction suits: full Tier I–IV ladders at minimum common + epic + exotic rarities
- Endgame (Tier III–IV) exotic/legendary faction suits as the headline deliverable
- All new entities lore-compatible with `world-bible.md` (CLAUDE.md non-negotiable requirement)

**Should have (P2):**
- Faction modules: 1–2 per faction spanning rarities
- Faction tools: 1–2 per faction with faction-appropriate stat emphasis
- Apex predator designation per biome (maniac behavior, distinct naming)
- Ecological food chain logic in creature descriptions (zero implementation cost, high world-building value)

**Defer (v1.x / P3):**
- Unaffiliated gear line — trigger: player feedback that Unaffiliated operatives feel identity-less
- Creature lore fragments as rare drops

**Defer (v2+):**
- Faction reputation gating of gear (requires a new progression system)
- Status effects on creatures (explicitly out of scope per PROJECT.md)
- Surface faction headquarters (explicitly out of scope per PROJECT.md)
- Crafting from creature materials (new system)

**Anti-features to avoid:**
- Faction gear locked exclusively to faction members without a reputation system (kills economy, breaks player experimentation)
- Procedurally generated faction gear (breaks careful tier/rarity math in `generateSuitStats`)
- Faction-unique abilities that don't exist in the current 21-ability pool (requires new ability design + balance testing scope)

**See:** `.planning/research/FEATURES.md`

### Architecture Approach

The content system is a layered definition pipeline: static TypeScript definition files flow into singleton registries (`EntityRegistry`, `ItemRegistry`), which feed into the world generator's spawn system (`BIOME_SPAWN_CONFIGS` in `spawn.ts`) and game-server services. The `biomes` field on `EntityDefinition` is informational for registry queries only — the `BIOME_SPAWN_CONFIGS` object in `packages/world-gen` is the sole authoritative source for what spawns in the world. This is the most critical architectural fact for content authors: failing to update `BIOME_SPAWN_CONFIGS` means the entity never spawns, with no error.

**Major components and their roles for v1.23:**
1. `packages/entities/src/definitions/` — all new creature, plant, mineral, and artifact definitions; follow per-biome-group file convention (`toxic-wastes-creatures.ts`, etc.)
2. `packages/items/src/definitions/faction-suits-[faction].ts` (NEW FILES) — one file per faction per item type; follows existing `aquatic-suits.ts` / `exotic-suits.ts` pattern; keeps files under 400 lines
3. `packages/game-logic/src/loot/creature-loot.ts` — `CREATURE_LOOT_TABLES` Map; one entry per new creature is mandatory; plants/minerals use inline yield arrays instead
4. `packages/world-gen/src/generation/spawn.ts` — `BIOME_SPAWN_CONFIGS`; must be updated for every new spawnable entity
5. `packages/world-gen/src/generation/rarity.ts` — `getRareBiomeMinerals` / `getEpicBiomeMinerals`; must be updated for rare/epic mineral variants (not auto-populated from spawn configs)
6. `packages/npcs/src/definitions/[faction].ts` — faction trader inventories; faction gear must be added here to be purchasable (otherwise unobtainable through normal play)

**Dependency-safe build order per entity batch:**
Entity definitions → item definitions for loot targets → creature loot tables → spawn config → rare mineral registry

**Dependency-safe build order for faction gear:**
Faction identity pillars (design) → faction suits Tier I–II → faction suits Tier III–IV → modules and tools → NPC trader inventories

**See:** `.planning/research/ARCHITECTURE.md`

### Critical Pitfalls

Research from PITFALLS.md identified 7 pitfalls. Top 5 by impact and silent-failure risk:

1. **BIOME_SPAWN_CONFIGS / ENTITY_IDS desync** — entity defined but not wired to spawn config; entity never appears in world with no error. Three separate locations must be updated atomically: definition file, `ENTITY_IDS` constants, and `BIOME_SPAWN_CONFIGS` in `spawn.ts`. Prevent with a CI validation test before writing any entities.

2. **Loot table orphaning** — creature spawns correctly but drops nothing because `lootTableId` has no matching key in `CREATURE_LOOT_TABLES`. Silent failure (no crash, no warning). Prevent with `entity-loot-validation.test.ts` asserting every creature's `lootTableId` resolves in the loot table map.

3. **Faction gear identity collapse** — all factions receive identical `grantedAbilities` arrays copied from nearest generic suit. Faction choice becomes cosmetic only. Prevent by establishing the per-faction ability assignment matrix before writing any item definitions. Highest recovery cost of any pitfall — requires post-ship definition updates and player communication.

4. **Stat budget inflation at Tier III–IV** — `generateSuitStats()` math is internally consistent but doesn't validate against combat TTK. New exotic/legendary suits can trivialize existing Tier III content. Prevent with a TTK audit against current best-in-slot before writing any endgame item definitions.

5. **Harvest yield references non-existent item IDs** — plant/mineral `harvestYield` entries typed from memory produce typos; `rollLootTable()` returns the magenta Unknown Item fallback silently. Prevent with a validation test asserting all `harvestYield` and `miningYield` item IDs resolve in `ItemRegistry.has()`.

**See:** `.planning/research/PITFALLS.md`

## Implications for Roadmap

Based on combined research, the following 7-phase structure is recommended. Phases 3 and 4 (biome entity population) are independent of phases 5–7 (faction gear) and can be executed in parallel by separate contributors.

### Phase 1: Test Infrastructure and Entity Validation Foundation

**Rationale:** `packages/entities` has zero tests. Every subsequent content phase has silent-failure pitfalls that are only catchable with validation tests in place. All four research documents independently flag this as the prerequisite for safe content expansion. Establishing CI validation before any definitions are written means every subsequent phase is regression-safe.

**Delivers:** `packages/entities/vitest.config.ts` (copied from `packages/items` pattern), `packages/entities/src/__tests__/entity-validation.test.ts` asserting all 16 biomes meet minimum entity counts, `ENTITY_IDS` sync with `ALL_ENTITIES`, and a CI assertion that every spawnable entity appears in `BIOME_SPAWN_CONFIGS`. Also adds loot coverage test and harvest yield ID resolution test.

**Avoids:** All silent-failure pitfalls (Pitfalls 1, 2, 6, 7) — none can ship undetected once tests are in place.

**Research flag:** Standard patterns — identical to proven `packages/items` Vitest setup. Skip `/gsd:research-phase`.

### Phase 2: Faction Identity Pillars (Design Gate)

**Rationale:** Zero code output, but gates all faction gear phases. FEATURES.md documents it as the hard dependency for all gear. PITFALLS.md calls out Pitfall 3 (identity collapse) as the highest recovery cost pitfall. Without the ability assignment matrix locked in writing, definition authors default to copy-paste patterns under time pressure.

**Delivers:** A committed design artifact containing: stat archetype per faction per tier; ability assignment matrix per faction (which of the 21 existing abilities are in-faction vs. prohibited); color palette anchors per faction (from `world-bible.md`); naming convention per faction; and module/tool character descriptions. Verdant = hazmat/scout archetypes, `regeneration_protocol` + `energy_barrier`; Helix = tank/assault archetypes, `fortify_systems` + `power_surge`; Nexus = recon/combat archetypes, `overclock` + `resource_scan`.

**Avoids:** Pitfall 3 (faction gear identity collapse), which has HIGH recovery cost if reached post-ship.

**Research flag:** Lore-derived design; `world-bible.md` is HIGH confidence authority. Skip `/gsd:research-phase`.

### Phase 3: Biome Entity Population — Creatures

**Rationale:** Highest user impact at lowest implementation cost. Biomes with 1–2 creatures fail the "populated world" test immediately. `toxic_wastes` with one creature is the most critical single gap — the world-bible describes a full ecosystem there. Fully independent of faction gear; can begin alongside Phase 2.

**Delivers:** 60–70 new creature definitions across all biomes; each biome at 4–6 creatures; one apex predator (maniac behavior) per biome; loot tables for every new creature; `ENTITY_IDS` and `BIOME_SPAWN_CONFIGS` updated; biome behavioral matrix enforced (herbivore + omnivore + predator minimum per biome, no 3+ creatures sharing same behavior at same level range).

**Priority ordering within phase:** toxic_wastes (1 → 5 creatures, critical) > void_plains, fungal_forest, miasma_marshes, petrified_expanse, crystal_caves (2 → 4) > remaining biomes.

**Avoids:** Pitfall 1 (spawn config desync) and Pitfall 2 (loot table orphaning) — caught by Phase 1 tests. Pitfall 5 (biome identity dilution from behavior-identical creatures) — enforced by behavioral matrix planning before definitions are written.

**Research flag:** Standard patterns established by Phase 87/88. Skip `/gsd:research-phase`.

### Phase 4: Biome Entity Population — Plants, Minerals, Artifacts

**Rationale:** Fully parallel to Phase 3 from a codebase perspective but separated because artifacts have a distinct integration path (`respawns: false`, no separate loot table entry, `handleCollect()` path) and rare/epic mineral variants require updating `rarity.ts` functions that are not auto-populated from spawn configs.

**Delivers:** 2–3 plants per biome with common/rare/epic rarity variants; 2–3 minerals per biome with rarity variants plus updates to `getRareBiomeMinerals` / `getEpicBiomeMinerals` in `rarity.ts`; 1–2 artifacts per biome following the tier-appropriate mystery scale (Tier I: weathered/unclear → Tier IV: operational/disturbing).

**Avoids:** Pitfall 7 (harvest yield typos) — caught by Phase 1 validation test. The technical debt shortcut of omitting artifacts "until later" is explicitly flagged as never acceptable in PITFALLS.md.

**Research flag:** Standard patterns for plants/minerals. Artifact tier-escalation design is lore-derived (`world-bible.md` HIGH confidence). Skip `/gsd:research-phase`.

### Phase 5: Faction Suits — Tier I–II Ladders

**Rationale:** Writing lower-tier suits first establishes naming patterns, color language, and ability selection per faction before endgame gear is authored. FEATURES.md explicitly recommends this ordering. Phase 2 identity pillars design is a hard prerequisite.

**Delivers:** Common and Rare faction suits for Verdant, Helix, and Nexus; three new files (`faction-suits-verdant.ts`, `faction-suits-helix.ts`, `faction-suits-nexus.ts`); `ALL_ITEMS` and `ITEM_IDS` updated; distinct `textureKey` per faction (placeholder if art not ready); entries in faction trader `inventory[]` arrays in `packages/npcs/src/definitions/`.

**Uses:** `generateSuitStats(archetype, rarity, tier)` and `computeIlvl(tier, rarity)` — mandatory, hand-coded stats are prohibited by ESLint rule.

**Avoids:** Pitfall 3 (identity collapse — gated by Phase 2 matrix); Pitfall 4 (stat inflation — Tier I–II budgets are well within safe range); Pitfall 6 (stale ITEM_IDS — enforced by Phase 1 test).

**Research flag:** Standard pattern — two existing exotic faction suits provide direct precedents in `suits.ts`. Skip `/gsd:research-phase`.

### Phase 6: Faction Suits — Tier III–IV Endgame (Milestone Headline)

**Rationale:** Endgame exotic and legendary faction suits are the stated headline of v1.23. They require Phase 5 to exist first (naming/pattern coherence) and require a TTK audit before authoring (Pitfall 4). This phase delivers the content players will cite the expansion for.

**Delivers:** Epic and Exotic faction suits for all three factions; Legendary faction suits (player-acquired only, not sold by traders, consistent with existing pattern); stat budget TTK audit documented before any definitions are written; all `grantedAbilities` cross-referenced against the 21 existing ability IDs.

**Avoids:** Pitfall 4 (stat budget inflation — TTK audit gates this phase); Pitfall 6 (stale ITEM_IDS — enforced by Phase 1 test); the anti-feature of endgame content exclusively locked behind Tier IV zones (at least one exotic item should be obtainable via hard Tier III mechanism).

**Research flag:** Stat budget audit requires examining current best-in-slot stat envelope against `game-logic` combat damage constants. If phase planner cannot determine the safe budget ceiling from existing ARCHITECTURE.md documentation, flag for targeted `/gsd:research-phase` on combat system TTK before scoping task list.

### Phase 7: Faction Modules and Tools

**Rationale:** Modules and tools complete the faction gear set. They follow identical definitional patterns (definitions → `ALL_ITEMS` → `ITEM_IDS` → trader inventory) with lower complexity than suits. Placed after suits so faction mechanical identity is established before modules reinforce it.

**Delivers:** 1–2 modules per faction (biosupport arrays for Verdant, heavy plating for Helix, sensor arrays for Nexus); 1–2 tools per faction (bio-extractors/scanners for Verdant, heavy drills/cutters for Helix, data recorders/stealth tools for Nexus); all added to faction trader inventories.

**Avoids:** The anti-feature of faction modules being purely cosmetically renamed generics — mechanical identity from Phase 2 design gate carries through.

**Research flag:** Standard item definitional pattern. Skip `/gsd:research-phase`.

### Phase Ordering Rationale

- Test infrastructure must come first because every phase's silent-failure pitfalls are only catchable by those tests; building without them first means discovering failures after content is partially shipped.
- Faction identity pillars (design) must precede all gear phases — this is a hard dependency. Post-ship identity collapse has HIGH recovery cost and cannot be silently patched.
- Biome creatures and faction gear are independent tracks and can run in parallel (Phases 3–4 vs. Phases 5–7) — the roadmap should reflect this parallelism to avoid bottleneck on a single contributor.
- Plants/minerals/artifacts are separated from creatures not due to ordering constraints but because the `rarity.ts` integration point for mineral variants is distinct from the main entity pipeline.
- Lower-tier faction suits before endgame suits is a design coherence dependency: naming patterns and stat ladders must be established at Tier I–II before exotic/legendary definitions are consistent with them.
- Modules and tools are last because they have the lowest individual user impact and cleanest scope once suit identity is established.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 6 (Endgame Faction Suits):** Stat budget audit requires examining combat system TTK constants against `generateSuitStats()` output at Tier IV Legendary (~1,694 total stats from suit alone). If phase planner cannot determine the safe envelope from ARCHITECTURE.md, run `/gsd:research-phase` focused on `game-logic` combat constants before scoping.

Phases with standard patterns (skip research-phase):
- **Phase 1 (Test Infrastructure):** Direct copy of `packages/items` Vitest pattern; no unknowns.
- **Phase 2 (Faction Identity):** Lore-derived design; `world-bible.md` is HIGH confidence authority.
- **Phase 3 (Biome Creatures):** Phase 87/88 established the exact pattern; PITFALLS.md documents the three-location atomic update rule.
- **Phase 4 (Plants/Minerals/Artifacts):** Same definitional pattern; `rarity.ts` integration documented in ARCHITECTURE.md.
- **Phase 5 (Faction Suits Tier I–II):** Two existing exotic faction suits provide direct precedents.
- **Phase 7 (Modules/Tools):** Standard item definitional pattern; no novel integration points.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All packages directly inspected; versions verified at install time; no new dependencies required; zero ambiguity |
| Features | HIGH | Primary sources are live codebase + `world-bible.md` (non-negotiable per CLAUDE.md); faction identity pillars derived exclusively from lore authority; biome creature counts verified by direct definition file inspection |
| Architecture | HIGH | All integration points identified via direct source examination of all relevant packages; data flow traced end-to-end from definition through world-gen to game-server; no inference required |
| Pitfalls | HIGH | Based on direct codebase analysis and documented prior-phase friction (Phase 87/88 history comments, Phase 59/60 migration that required rollback procedure in CLAUDE.md) |

**Overall confidence:** HIGH

### Gaps to Address

- **Stat budget safe envelope for Tier III–IV (Phase 6):** Research documents the `generateSuitStats()` formula output (~1,694 total stats at Tier IV Legendary) but does not specify what the combat system's TTK ceiling is. This must be resolved before Phase 6 is scoped — either by examining `game-logic` combat damage formulas directly or by running a test session with current best-in-slot gear.

- **Biome behavioral matrix per biome (Phase 3 scoping):** The per-biome creature roster (which behaviors, which level ranges, how many of each) is specified as a design gate for Phase 3 but is not yet written. This is an expected output of Phase 3 scoping, not a gap in research — `world-bible.md` provides sufficient ecological grounding for each biome.

- **Texture key strategy for faction gear:** PITFALLS.md flags that using the same `textureKey` for different faction suits causes visual identity collapse in player-facing equipment panels. Whether v1.23 has art budget for faction-distinct sprites is not resolvable from code research alone. The mitigation (use distinct `textureKey` values even if pointing to a placeholder sprite) is the correct approach regardless of art pipeline state.

## Sources

### Primary (HIGH confidence)
- Live codebase direct inspection — `packages/entities`, `packages/items`, `packages/game-logic`, `packages/world-gen`, `packages/npcs`, `eslint-rules/` — all architecture, stack, and pitfall findings
- `lore/world-bible.md` — faction identity profiles, biome ecological descriptions, Terminus history; authoritative and non-negotiable per CLAUDE.md
- `.planning/PROJECT.md` — v1.23 milestone goals, confirmed 16 biomes, 122 items, 92 entities baseline
- Installed package version verification (`vitest@4.0.18`, `typescript@5.9.3`, `nx@20.8.4`, `@typescript-eslint/utils@8.56.0`) — confirmed at time of research
- Phase 87/88 codebase history (comments in `packages/entities/src/definitions/creatures.ts`) — documented prior-phase friction with three-location atomic update requirement
- Phase 59/60 migration and rollback procedure (`CLAUDE.md`) — confirmed stat schema evolution as a real historical pitfall requiring ESLint tooling

### Secondary (MEDIUM confidence)
- EVE Online faction ship design (EVE University Wiki) — gold standard for faction mechanical differentiation; four factions with distinct weapon type + tank type combinations; cited as design reference for faction identity pillars
- The Witcher 3 creature placement philosophy (game design literature) — "environment explains creature presence"; applied to biome ecological identity guidelines
- Nerdlab Games faction design principles — "Flavor dictates function — thematic identity should constrain mechanical capabilities logically"

### Tertiary (LOW confidence)
- Destiny 2 original faction rally gear analysis (community sources) — cautionary tale for cosmetic-only faction differentiation; informs anti-feature list

---
*Research completed: 2026-02-27*
*Ready for roadmap: yes*
