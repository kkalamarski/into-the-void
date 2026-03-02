# Phase 108: Entity Validation Infrastructure - Context

**Gathered:** 2026-03-02
**Status:** Ready for planning

<domain>
## Phase Boundary

A Vitest test suite in `packages/entities` that catches four categories of silent content failure before any new entity definition reaches main: orphaned loot tables, spawn config desync, ID constant drift, and invalid harvest yield item references. This phase also fixes any existing violations to establish a clean baseline.

</domain>

<decisions>
## Implementation Decisions

### Baseline handling
- Fix all existing violations as part of this phase — the baseline starts clean, no allowlists
- Test suite runs in CI gating PRs that touch entity/item definitions — broken content never reaches main
- Error messages are detailed with fix hints (e.g., 'Creature "sand_stalker" has no CREATURE_LOOT_TABLES entry. Add it in packages/entities/src/loot-tables.ts')
- Separate test files per validation category: loot-tables.test.ts, spawn-configs.test.ts, id-constants.test.ts, harvest-yields.test.ts

### Validation strictness
- Hard fail only — no soft warnings or informational output. The suite gates content, it doesn't lint it
- Harvest yield validation checks both existence in ItemRegistry AND item type correctness (a plant shouldn't drop a weapon)
- Spawn config validation checks both existence AND value ranges (spawnChance 0-1, maxCount > 0)
- ID constant validation is bidirectional (constant → entity, entity → constant) AND enforces snake_case naming convention

### Cross-package reach
- Tests import directly from other packages (@into-the-void/world-gen, @into-the-void/items, etc.) — no abstraction layer
- Loot table item references validated against ItemRegistry (every itemId in CREATURE_LOOT_TABLES must exist as a registered item)
- Loot tables must have at least one item with a positive drop rate (catches zero-rate tables that would make creatures drop nothing)
- Every biome in the biome registry must have at least one spawn config entry (no empty/lifeless biomes)

### Claude's Discretion
- Test helper utilities and shared assertion patterns
- Exact error message formatting and grouping
- Whether to use test.each or individual test cases per entity
- CI configuration specifics (which file paths trigger the test run)

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 108-entity-validation-infrastructure*
*Context gathered: 2026-03-02*
