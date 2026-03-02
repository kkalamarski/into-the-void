# Project Research Summary

**Project:** Into the Void — v1.23 Content Expansion & Faction Gear
**Domain:** MMO content scaling — entity definitions, biome population, faction-specific equipment
**Researched:** 2026-03-02
**Confidence:** HIGH

## Executive Summary

v1.23 is a pure content milestone, not a system milestone. All required infrastructure already exists: TypeScript definition files, singleton registries, `generateSuitStats()` and `computeIlvl()` utilities, biome spawn configs, loot tables, and NPC trader systems. The work is authoring 100+ new definitions that fill documented gaps — thin biome creature rosters, missing artifact categories, and zero faction-exclusive gear across three named factions. Nothing new needs to be built. The risk is not capability; it is execution discipline across a high-volume authoring task.

The recommended approach is a sequential three-phase structure: (1) all entity content (creatures, plants, minerals, artifacts across all 16 biomes), (2) all faction gear (suits, modules, tools for Verdant, Helix, and Nexus), (3) NPC trader inventory wiring. Entity content should precede faction gear because biome completeness is table stakes — players encounter the world before they encounter faction vendors. Within faction gear, a design gate must be established first: the per-faction ability assignment matrix and stat archetype identity must be agreed upon before any item definition is written, or faction gear collapses to cosmetically-different generics. The most urgent single gap is `toxic_wastes` with one creature where the world-bible documents a complete four-tier food chain ready to be authored.

The two highest risks are both silent failures with no runtime errors: loot table orphaning (creature kills drop nothing because `CREATURE_LOOT_TABLES` entry was not written alongside the definition) and spawn config desync (entity exists in registry but was never added to `BIOME_SPAWN_CONFIGS` so it never appears in the world). Both risks are preventable with validation tests that do not yet exist in `packages/entities` — the package currently has zero tests. Establishing entity validation infrastructure before any new definitions are authored is the single highest-priority setup task for this milestone.

## Key Findings

### Recommended Stack

No new dependencies are required. TypeScript 5.9.3, Vitest 4.0.18, NX 20.8.4, and ESLint 8.57.0 with existing custom rules cover all validation needs for the entire milestone. The only tooling gap is that `packages/entities` has zero tests — no `vitest.config.ts` and no `__tests__/` directory — despite `packages/items` having five proven test suites (CONT-01 through CONT-05). Adding 60-70 new entity definitions without parallel validation infrastructure is the primary regression risk.

**Core technologies:**
- TypeScript 5.9.3 — all definition files are pure TS object literals; compile-time shape checking via `satisfies CreatureDefinition` catches errors at the definition site, not downstream
- Vitest 4.0.18 — already proven in `packages/items`; identical setup must be added to `packages/entities` before any entity work begins
- ESLint 8.57.0 + custom rules (`no-legacy-stat-buff`) — existing rule rejects the old `stat_buff` pattern; extensible for faction naming enforcement via `@typescript-eslint/utils@8.56.0`
- NX 20.8.4 — `test` target caches by input hash; entity tests run only when definition files change, keeping CI fast
- `generateSuitStats(archetype, rarity, tier)` and `computeIlvl()` — mandatory for all new suits; hand-coded stat numbers caused the Phase 59/60 migration that required a documented rollback procedure in CLAUDE.md

**See:** `.planning/research/STACK.md`

### Expected Features

Research from FEATURES.md confirms a clear priority hierarchy derived from lore authority and direct biome audit.

**Must have (table stakes — P1):**
- Every biome reaches 4-6 creatures — most biomes have 1-3; `toxic_wastes` has 1 creature (critical: world-bible documents a full food chain there)
- Every biome has 3-4 plants and 2-3 minerals with common/rare/epic rarity variants — gathering variety, crafting material ecosystem
- Every biome has 1-2 artifacts — most underserved category; 9+ biomes have zero; `crystalline_wastes` explicitly called an "artifact hotspot" by world-bible but has zero artifacts
- Faction identity pillars documented before any gear is written (stat archetype + ability matrix + color palette + naming convention per faction) — design gate for all subsequent gear phases
- Verdant, Helix, and Nexus faction suits: full Tier I-IV ladders; Verdant is the most underrepresented with one suit entry today
- Endgame (Tier III-IV) exotic and legendary faction suits as the headline deliverable
- All new entities lore-compatible with `lore/world-bible.md` — CLAUDE.md non-negotiable requirement

**Should have (P2):**
- Faction modules: 1-2 per faction spanning rarities (biosupport arrays for Verdant, heavy plating for Helix, sensor arrays for Nexus)
- Faction tools: 1-2 per faction with faction-appropriate stat emphasis and tool type
- Apex predator designation per biome (maniac behavior) — creates milestone moments, makes biomes memorable
- Ecological food chain logic in creature descriptions — zero implementation cost, high world-building value

**Defer (v1.x / P3):**
- Unaffiliated gear line — trigger: player feedback that Unaffiliated operatives feel identity-less
- Creature lore fragments as rare apex predator drops

**Defer (v2+):**
- Faction reputation gating of gear (requires a new progression system — explicit out-of-scope per PROJECT.md)
- Status effects on creatures (explicitly out of scope per PROJECT.md)
- Surface faction HQs (explicitly out of scope per PROJECT.md)
- Crafting from creature materials, creature ability systems, biome ecosystem AI

**Anti-features to avoid:**
- Faction gear locked exclusively to faction members without a reputation system — kills player economy, requires an out-of-scope system
- Cosmetic-only faction differentiation (Destiny 2 faction rally is the cautionary tale) — identical stats with different colors; players see through it immediately
- Faction-unique abilities not in the existing 21-ability pool — requires new ability design scope beyond this milestone

**See:** `.planning/research/FEATURES.md`

### Architecture Approach

All content flows through a proven three-layer pattern: static TypeScript definition files -> singleton registries (`EntityRegistry`, `ItemRegistry`) -> runtime consumers (world-gen spawn system, game-server services). The `biomes` field on `EntityDefinition` is informational for registry queries only — `BIOME_SPAWN_CONFIGS` in `packages/world-gen/src/generation/spawn.ts` is the sole authoritative source for what spawns in the world. This is the most critical architectural fact: failing to update `BIOME_SPAWN_CONFIGS` means an entity never spawns, with no error thrown anywhere.

**Major components for v1.23:**
1. `packages/entities/src/definitions/` (MODIFY existing files) — add new entities to existing biome-group files (`creatures.ts`, `aquatic-creatures.ts`, `exotic-creatures.ts`, etc.); do not create per-biome files
2. `packages/items/src/definitions/faction-verdant.ts`, `faction-helix.ts`, `faction-nexus.ts` (CREATE new files) — one file per faction containing suits, modules, and tools; organized by faction not item type, following the NPC definition precedent
3. `packages/world-gen/src/generation/spawn.ts` — `BIOME_SPAWN_CONFIGS`; single file that wires entities to world generation; updated for every new spawnable entity; will reach ~600+ lines by end of milestone
4. `packages/game-logic/src/loot/creature-loot.ts` — `CREATURE_LOOT_TABLES`; one entry per new creature is mandatory; plants/minerals/artifacts do not use this file
5. `packages/world-gen/src/generation/rarity.ts` — `getRareBiomeMinerals()` / `getEpicBiomeMinerals()`; rare/epic mineral variants go here, not in the normal spawn config
6. `packages/npcs/src/definitions/verdant.ts`, `helix.ts`, `nexus.ts` — faction trader inventories; faction gear must be stocked here or it is unreachable without loot table drops

**Four-file atomicity rule for creatures:** definition file + `ENTITY_IDS` constant + `BIOME_SPAWN_CONFIGS` entry + `CREATURE_LOOT_TABLES` entry — all four must be updated in the same unit of work or the entity is partially broken.

**See:** `.planning/research/ARCHITECTURE.md`

### Critical Pitfalls

Top 5 by impact and silent-failure risk (from PITFALLS.md):

1. **BIOME_SPAWN_CONFIGS / ENTITY_IDS desync** — entity defined but not wired to spawn config; entity never appears in world with no runtime error; three separate locations must be updated atomically; prevent with a CI validation test before writing any entities

2. **Loot table orphaning** — creature spawns and is killable but drops nothing because `lootTableId` has no matching key in `CREATURE_LOOT_TABLES`; silent failure; prevent with `entity-loot-validation.test.ts` asserting every creature's lootTableId resolves in the loot table map

3. **Faction gear identity collapse** — all factions receive identical `grantedAbilities` arrays copied from nearest generic suit; faction choice becomes cosmetic; prevent by establishing per-faction ability assignment matrix before writing any item definitions; highest recovery cost of any pitfall

4. **Stat budget inflation at Tier III-IV** — `generateSuitStats()` compounds multiplicatively; Tier IV Legendary yields ~1,694 total stats from suit alone; combined with module loadouts, players trivialize existing Tier III content; prevent with a TTK audit before writing any endgame definitions

5. **Harvest yield references non-existent item IDs** — plant/mineral `harvestYield` entries with typos resolve to the magenta `UNKNOWN_ITEM` fallback silently; prevent with a validation test asserting all yield `itemId` values resolve via `ItemRegistry.has()`

Additional pitfalls documented: biome identity dilution from behavior-identical creatures (pitfall 5), stale `ITEM_IDS` constants after faction gear addition (pitfall 6), lore incompatibility in entity descriptions (pitfall 8).

**See:** `.planning/research/PITFALLS.md`

## Implications for Roadmap

Based on combined research, the following 8-phase structure is recommended. Phases 2-4 (biome entity population) are logically independent of Phases 5-7 (faction gear) and can run in parallel by separate contributors once Phase 1 infrastructure is in place.

### Phase 1: Validation Infrastructure and Content Authoring Guide

**Rationale:** `packages/entities` has zero tests. Every subsequent content phase has silent-failure pitfalls that are only catchable with validation tests in place. All four research documents independently flag this as the prerequisite for safe content expansion. The lore authoring guide must also exist before the first entity description is written. Both are zero-code-cost setup that gates quality of all subsequent work.

**Delivers:** `packages/entities/vitest.config.ts` (copied from `packages/items` pattern); `entity-validation.test.ts` asserting all 16 biomes meet minimum entity counts, `ENTITY_IDS` sync with `ALL_ENTITIES`, every spawnable entity in `BIOME_SPAWN_CONFIGS`, every creature's lootTableId resolves, all harvest yield itemIds resolve; condensed content authoring guide from `lore/world-bible.md` (per-faction language registers, per-biome atmosphere); per-biome behavioral matrix planning artifact

**Avoids:** Pitfalls 1, 2, 6, 7 — none can ship undetected once tests exist

**Research flag:** Standard patterns — direct copy of `packages/items` Vitest setup; no research needed

---

### Phase 2: Faction Identity Pillars (Design Gate)

**Rationale:** Zero code output, but gates all faction gear phases. PITFALLS.md identifies faction gear identity collapse as the highest recovery cost pitfall. Without the ability assignment matrix locked in writing, definition authors default to copy-paste patterns under delivery pressure. This must be established before any item definition is written.

**Delivers:** A committed design artifact: stat archetype per faction per tier; ability assignment matrix per faction (which of the 21 existing abilities are in-faction vs. prohibited); color palette anchors (lore-derived); naming conventions per faction; module/tool character descriptions. Verdant = hazmat/scout archetypes, `regeneration_protocol` + `energy_barrier` + `nano_repair`; Helix = tank/assault archetypes, `fortify_systems` + `power_surge` + `magnetic_field`; Nexus = recon archetypes, `overclock` + `resource_scan` + `analyze_specimen`

**Avoids:** Pitfall 3 (faction gear identity collapse) which has HIGH recovery cost if reached post-ship

**Research flag:** Lore-derived design; `world-bible.md` is HIGH confidence authority; no research needed

---

### Phase 3: Biome Creature Population

**Rationale:** Highest user impact at lowest implementation cost. Biomes with 1-2 creatures fail the "populated world" test within minutes. `toxic_wastes` with one creature is the most critical single gap. Fully independent of faction gear. Creatures have the highest per-entity coordination cost (four-file atomicity), so they come before plants/artifacts to batch the complex work together.

**Delivers:** ~30-35 new `CreatureDefinition` objects across all biomes reaching the 4-6 creature target; per-biome behavioral variety (herbivore + omnivore + predator minimum, one maniac apex threat); loot tables for every new creature; `ENTITY_IDS` and `BIOME_SPAWN_CONFIGS` updated; `toxic_wastes` brought from 1 to 4-5 creatures (most urgent gap)

**Priority within phase:** `toxic_wastes` first (1 creature → 5 needed); then `void_plains`, `fungal_forest`, `miasma_marshes`, `petrified_expanse`, `crystal_caves` (2 creatures each → 4 needed); then remaining biomes with 3 creatures

**Avoids:** Pitfalls 1, 2 caught by Phase 1 tests; Pitfall 5 (biome identity dilution) prevented by behavioral matrix from Phase 1

**Research flag:** Standard patterns established by Phase 87/88 expansion; no research needed

---

### Phase 4: Biome Plant, Mineral, and Artifact Population

**Rationale:** Independent of creatures (can run in parallel) but separated from Phase 3 because rare/epic mineral variants require updating `rarity.ts` functions rather than the normal spawn config — a distinct integration path that benefits from isolated focus. Artifacts are separated to emphasize they must not be deferred: the "Looks Done But Isn't" checklist in PITFALLS.md flags deferred artifacts as a common technical debt shortcut.

**Delivers:** ~20-25 new `PlantDefinition` objects (3-4 per biome with rarity variants); ~15-20 new `MineralDefinition` objects including rare/epic variants registered in `getRareBiomeMinerals()` / `getEpicBiomeMinerals()`; ~12-15 new `ArtifactDefinition` objects targeting the 9+ biomes with zero artifacts; `crystalline_wastes` artifact hotspot gap resolved (2 new artifacts); artifact tier escalation applied (Tier I: weathered/unclear → Tier IV: operational/disturbing)

**Avoids:** Pitfall 7 (harvest yield typos) caught by Phase 1 tests; rare mineral added to wrong spawn system (architecture pattern documented in ARCHITECTURE.md)

**Research flag:** Standard patterns; `rarity.ts` integration documented in ARCHITECTURE.md; no research needed

---

### Phase 5: Faction Suits — Tier I-II

**Rationale:** Lower-tier suits establish naming patterns, color language, and ability selection before endgame gear is authored. Writing common and rare suits first is cheaper to iterate on if calibration is needed. Phase 2 identity pillars are a hard prerequisite.

**Delivers:** Common and Rare faction suits for Verdant, Helix, and Nexus (3 factions × 2 rarities = ~6 suit definitions); three new files (`faction-verdant.ts`, `faction-helix.ts`, `faction-nexus.ts`) with named export arrays; `ALL_ITEMS` and `ITEM_IDS` updated; distinct `textureKey` per faction (placeholder color tile acceptable if art not ready); entries wired to faction trader inventories

**Uses:** `generateSuitStats(archetype, rarity, tier)` and `computeIlvl(tier, rarity)` — mandatory; no hand-coded stats

**Avoids:** Pitfall 3 (identity collapse — gated by Phase 2 matrix); Pitfall 6 (stale ITEM_IDS — caught by Phase 1 test); Anti-pattern 4 from ARCHITECTURE.md (faction item IDs without faction prefix)

**Research flag:** Standard pattern; two existing exotic faction suits in `suits.ts` provide direct precedents; no research needed

---

### Phase 6: Faction Suits — Tier III-IV Endgame (Milestone Headline)

**Rationale:** Exotic and legendary faction suits are the stated headline of v1.23 per PROJECT.md. They require Phase 5 for naming/progression coherence and require a TTK stat budget audit before authoring (Pitfall 4 is the most technically complex silent failure). This phase delivers the content players will cite the expansion for.

**Delivers:** Epic, Exotic, and Legendary faction suits for all three factions; stat budget TTK audit documented before any definitions are written; all `grantedAbilities` cross-referenced against the 21 existing ability IDs; Legendary suits priced as rare acquisitions (not sold at traders, consistent with existing legendary pattern)

**Avoids:** Pitfall 4 (stat budget inflation — TTK audit gates this phase); the endgame accessibility anti-pattern (at least one exotic item reachable via hard Tier III mechanism, not exclusively Tier IV)

**Research flag:** Stat budget audit requires examining `game-logic` combat damage constants against `generateSuitStats()` output at Tier IV Legendary (~1,694 total stats from suit alone). If phase planner cannot determine the safe envelope from ARCHITECTURE.md data, flag for targeted research on combat system TTK before scoping the task list.

---

### Phase 7: Faction Modules and Tools

**Rationale:** Completes the faction gear set. A player wearing a Verdant suit with generic modules and tools gets half the faction identity. Modules and tools follow identical definitional patterns with lower complexity than suits (fewer fields, no `grantedAbilities` for modules). Placed after suits so faction mechanical identity is established before modules reinforce it.

**Delivers:** 1-2 modules per faction (~9 module definitions); 1-2 tools per faction (~6-9 tool definitions); `toolType` values matching faction identity (Helix: `mining`/`demolition`, Verdant: `bio`/`research`, Nexus: `research`/`stealth`); all added to faction trader inventories with appropriate level gates

**Avoids:** Faction modules being purely cosmetically renamed generics — mechanical identity from Phase 2 carries through

**Research flag:** Standard item definitional pattern; no research needed

---

### Phase 8: NPC Trader Inventory Integration Pass

**Rationale:** Faction gear added to the registry but not stocked anywhere is unreachable without loot table drops. This integration step is required for the expansion's primary feature to be accessible to players. It comes last because it depends on all ITEM_IDS constants being finalized across Phases 5-7. This is a focused review pass rather than a separate authoring effort — individual phases add their items to traders as they go, but a final verification pass ensures nothing was missed.

**Delivers:** All faction suits, modules, and tools verified in `packages/npcs/src/definitions/verdant.ts`, `helix.ts`, `nexus.ts`; trader inventories tiered by item level; endgame exotic items priced significantly above Tier I equivalents; no reputation gating (explicitly out of scope per PROJECT.md — level gates only)

**Avoids:** Anti-feature of faction gear inaccessible to players without a rep system; confirms items are stocked before marking milestone complete

**Research flag:** No research needed — existing trader definition pattern is the reference

---

### Phase Ordering Rationale

- Validation infrastructure precedes all content authoring because silent failures are indistinguishable from absent content without CI tests; building without tests first means discovering failures during gameplay
- Faction identity pillars must precede all gear phases — post-ship identity collapse has HIGH recovery cost and cannot be silently patched
- Biome entities and faction gear are independent tracks and can run in parallel (Phases 3-4 vs. Phases 5-7) — the roadmap should reflect this parallelism to avoid single-contributor bottleneck
- Plants/minerals/artifacts are separated from creatures because the `rarity.ts` mineral integration point is distinct from the main entity pipeline
- Lower-tier faction suits before endgame suits is a design coherence dependency: naming patterns must be established at Tier I-II before exotic/legendary definitions are consistent with them
- Modules and tools are after suits because suits establish the faction identity that modules reinforce

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 6 (Endgame Faction Suits):** Stat budget audit requires examining `game-logic` combat damage constants against `generateSuitStats()` output at Tier IV Legendary. If phase planner cannot determine the safe TTK envelope from ARCHITECTURE.md, run focused research on combat system damage constants before scoping.

Phases with standard patterns (skip research-phase):
- **Phase 1:** Direct copy of `packages/items` Vitest pattern; no unknowns
- **Phase 2:** Lore-derived design; `world-bible.md` is HIGH confidence authority
- **Phase 3:** Phase 87/88 established the exact four-file atomicity pattern
- **Phase 4:** Same definitional pattern; `rarity.ts` integration documented in ARCHITECTURE.md
- **Phase 5:** Two existing exotic faction suits in `suits.ts` are direct precedents
- **Phase 7:** Standard item definitional pattern; no novel integration points
- **Phase 8:** Existing NPC trader definition pattern is the reference

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All packages directly inspected; versions verified from installed packages; no new dependencies; zero ambiguity |
| Features | HIGH | Primary sources are live codebase + `lore/world-bible.md` (non-negotiable per CLAUDE.md); biome creature counts verified by direct definition file inspection; faction identity derived exclusively from lore authority |
| Architecture | HIGH | All integration points identified via direct source examination of all 12 entity and 12 item definition files, registry source, spawn.ts, creature-loot.ts, rarity.ts; data flow traced end-to-end |
| Pitfalls | HIGH | Based on direct codebase analysis, Phase 87/88 history comments documenting the three-location friction, and Phase 59/60 migration requiring a documented rollback procedure in CLAUDE.md |

**Overall confidence:** HIGH

### Gaps to Address

- **Stat budget safe envelope for Tier III-IV (Phase 6):** Research documents the formula output (~1,694 total stats at Tier IV Legendary from suit alone) but does not specify the combat system's TTK ceiling. This must be resolved before Phase 6 is scoped — either by examining `game-logic` combat damage formulas directly or by running a test session with current best-in-slot gear and measuring time-to-kill on Tier IV creatures.

- **Biome behavioral matrix (Phase 3 scoping):** The per-biome creature roster (which behaviors, which level ranges) is a required planning artifact for Phase 3 but is not yet written. `lore/world-bible.md` provides sufficient ecological grounding for each biome to derive it. This is an expected output of Phase 3 planning, not a research gap.

- **Texture key strategy for faction gear:** PITFALLS.md flags that identical `textureKey` values across faction suits cause visual identity collapse in equipment panels. Whether v1.23 has art budget for distinct faction sprites is not determinable from code research. The mitigation (use distinct `textureKey` values per faction even pointing to a placeholder color tile) is correct regardless of art pipeline state and should be established as a naming convention constraint.

- **`packages/entities` test infrastructure bootstrap:** The entity validation tests described in PITFALLS.md must be written from scratch. The pattern from `packages/items/src/__tests__/item-validation.test.ts` (CONT-01 through CONT-05) is the reference — copy and adapt for entity-specific assertions (biome coverage, ID sync, loot table coverage, harvest yield validity).

## Sources

### Primary (HIGH confidence)
- `packages/entities/src/` (types.ts, registry.ts, definitions/\*.ts x12 files) — entity system patterns, current creature inventory, behavioral enum values
- `packages/items/src/` (types.ts, registry.ts, utils.ts, definitions/\*.ts x12 files, `__tests__/item-validation.test.ts`) — item system, `generateSuitStats()` math, existing validation pattern
- `packages/world-gen/src/generation/spawn.ts` and `rarity.ts` — biome spawn config structure, rare/epic mineral spawn pattern
- `packages/game-logic/src/loot/creature-loot.ts` — loot table structure and `CREATURE_LOOT_TABLES` Map
- `packages/npcs/src/definitions/` (verdant.ts, helix.ts, nexus.ts) — faction NPC split precedent for faction item file organization
- `lore/world-bible.md` — faction identity (non-negotiable per CLAUDE.md), biome fauna descriptions, artifact distribution, Terminus history
- `.planning/REQUIREMENTS.md` — v1.23 milestone targets (4-6 creatures, 3-4 plants, 2-3 minerals, 1-2 artifacts per biome)
- `packages/shared-types/src/game/biome.ts` — all 16 BiomeType values, BIOME_TIERS level requirements
- `eslint-rules/no-legacy-stat-buff.ts` — confirms stat schema evolution is a real historical pitfall requiring automated tooling

### Secondary (MEDIUM confidence)
- EVE Online faction ship design (EVE University Wiki) — gold standard for faction mechanical differentiation; four factions with distinct weapon type + tank type combinations; informs faction identity pillar design
- The Witcher 3 creature placement philosophy (game design literature) — "environment explains creature presence"; applied to biome ecological identity guidelines per biome
- MMO power creep industry patterns (Massively Overpowered, MMORPG.com) — confirms stat budget inflation is a recurring expansion failure mode; informs Pitfall 4 framing

### Tertiary (LOW confidence)
- Destiny 2 original faction rally gear (community sources) — cautionary tale for cosmetic-only faction differentiation; informs anti-feature list; MEDIUM confidence for the design principle, LOW for the specific implementation details

---
*Research completed: 2026-03-02*
*Ready for roadmap: yes*
