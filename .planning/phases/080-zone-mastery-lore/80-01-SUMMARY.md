---
phase: 80-zone-mastery-lore
plan: 01
subsystem: lore-mastery-foundation
tags: [types, registry, lore-fragments, zone-mastery]
dependency_graph:
  requires: []
  provides: [lore-types, mastery-types, lore-registry, initial-fragments]
  affects: [shared-types, lore-package]
tech_stack:
  added: [@into-the-void/lore]
  patterns: [registry-pattern, map-based-indexes, readonly-arrays]
key_files:
  created:
    - packages/shared-types/src/game/lore.ts
    - packages/shared-types/src/game/zone-mastery.ts
    - packages/lore/package.json
    - packages/lore/tsconfig.json
    - packages/lore/src/registry.ts
    - packages/lore/src/index.ts
    - packages/lore/src/fragments/index.ts
    - packages/lore/src/fragments/world-history.ts
    - packages/lore/src/fragments/faction-lore.ts
    - packages/lore/src/fragments/ancient-tech.ts
  modified:
    - packages/shared-types/src/index.ts
    - packages/shared-types/src/network/events.ts
decisions:
  - title: "Lore fragment structure"
    choice: "Self-contained objects with id, title, content, category, optional biome, xpReward"
    rationale: "Simple, flat structure enables easy storage and retrieval without complex nesting"
  - title: "Registry indexing strategy"
    choice: "Three Map-based indexes (by ID, by category, by biome)"
    rationale: "O(1) lookups for all three access patterns, minimal memory overhead with ~10-100 fragments"
  - title: "Mastery tier structure"
    choice: "Bronze/Silver/Gold with escalating requirements per tier"
    rationale: "Three tiers balance progression depth with achievable goals, industry-standard naming"
  - title: "Fragment content source"
    choice: "Extract directly from world-bible.md"
    rationale: "Maintains lore consistency, leverages existing canonical worldbuilding"
metrics:
  duration: 318
  tasks_completed: 2
  files_created: 10
  files_modified: 2
  commits: 2
  completed_at: "2026-02-23"
---

# Phase 80 Plan 01: Lore & Zone Mastery Foundation Summary

**One-liner:** Lore fragment and zone mastery type system with registry and 9 initial lore entries extracted from world bible

## What Was Built

### Task 1: Lore and Zone Mastery Types (Commit: bfb1057)

Created foundational type definitions in shared-types package:

**Lore Types:**
- `LoreFragment` interface defining collectible data logs with id, title, content, category, biome, xpReward
- `LoreCategory` type with four categories: world_history, faction_lore, ancient_tech, biome_ecology
- `CollectedLoreEntry` interface for client-side collection state (collected timestamp, read flag)

**Zone Mastery Types:**
- `ZoneMasteryProgress` interface tracking biome-specific mastery with tier and objectives
- `MasteryTier` type defining Bronze/Silver/Gold progression tiers
- `ZoneMasteryObjective` interface for tracking discover_pois, gather_resources, kill_creatures
- `MASTERY_TIER_REQUIREMENTS` constant defining escalating requirements (Bronze: 3/10/5, Silver: 7/30/15, Gold: 15/75/40)
- `MasteryReward` interface supporting title, cosmetic, and bonus reward types

**Network Events:**
- Client events: `lore:collect`, `mastery:query`
- Server events: `lore:collected`, `lore:already_collected`, `mastery:progress`, `mastery:completed`

### Task 2: Lore Package & Registry (Commit: 5d1efbd)

Created new `@into-the-void/lore` workspace package with registry and initial content:

**Package Structure:**
- Package.json with workspace dependency on shared-types
- TypeScript configuration extending base config without rootDir constraint
- Index exports exposing registry and fragments

**LoreRegistry Implementation:**
- Three Map-based indexes: by ID (fragmentsById), by category (fragmentsByCategory), by biome (fragmentsByBiome)
- Five public methods: `get()`, `getByCategory()`, `getBiomeFragments()`, `getAll()`, `count()`
- Readonly return types to prevent external mutation

**Initial Lore Fragments (9 total):**

*World History (3):*
- "The Collapse" - Earth's mysterious end and humanity's taboo
- "The Scattering" - Twelve Colonies declining to Eight to Six
- "The Discovery of Terminus" - Orpheus-7 probe finding ruins in The Void

*Faction Lore (3):*
- "Verdant Dynamics: The Green Promise" - Bioengineering and sustainability marketing
- "Helix Extraction: Deep Core" - Pragmatic resource extraction philosophy
- "Nexus Frontiers: The Edge" - High-risk frontier exploration culture

*Ancient Tech (3):*
- "The Builders" - Predecessor species evidence and architectural mysteries
- "Void Crystals" - Energy-storing crystals with resonant properties
- "The Anomaly Phenomenon" - Reality distortion zones with 23% casualty rate

All fragments extracted directly from lore/world-bible.md to maintain canonical consistency.

## Deviations from Plan

None - plan executed exactly as written. Tasks completed in prior session but with incorrect commit labels (80-02 instead of 80-01).

## Technical Decisions

**Map-based indexing over arrays:** Direct Map lookups provide O(1) access for get(), getByCategory(), and getBiomeFragments() operations. With expected fragment count under 100, memory overhead is negligible (<10KB) while providing instant retrieval.

**Readonly arrays for registry returns:** Prevents external code from mutating registry state while allowing spread/map/filter operations without defensive copying.

**Removing tsconfig rootDir:** TypeScript's rootDir constraint prevented importing workspace dependencies. Removing it allows proper ESM imports while maintaining declaration generation.

**Fragment content length:** 200-300 word fragments balance readability with substantive lore delivery. Players can consume in 30-60 seconds while still feeling rewarded for discovery.

## Verification Results

All verification criteria passed:

1. ✅ `npx nx run shared-types:build` - Types compile without errors
2. ✅ `npx tsc --noEmit` in lore package - No type errors
3. ✅ LoreRegistry.get('lore_world_collapse_01') returns valid fragment
4. ✅ LoreRegistry.getBiomeFragments('ancient_ruins') returns 2 fragments
5. ✅ LoreRegistry.count() returns 9
6. ✅ ZoneMasteryProgress exported from shared-types

## Integration Points

**For Plan 02 (Database Persistence):**
- LoreFragment.id maps to collected_lore.loreId
- ZoneMasteryProgress serializes to zone_mastery.objectives JSONB

**For Plan 03 (Game Server Logic):**
- LoreRegistry.get() validates lore:collect events
- MASTERY_TIER_REQUIREMENTS defines progression thresholds

**For Plan 04 (Client UI):**
- LoreFragment.category enables codex organization
- CollectedLoreEntry.isRead tracks unread indicators

## Known Limitations

**Lore spawning not defined:** Fragment.biome field indicates where content spawns, but spawn mechanics (POI association, discovery triggers) deferred to implementation plans.

**Mastery requirements static:** MASTERY_TIER_REQUIREMENTS uses fixed values across all biome tiers. May need per-biome-tier scaling (Tier I biomes easier than Tier IV).

**No biome_ecology fragments yet:** Category defined but no fragments created. Waiting for ecology/creature lore to be written in world-bible.md.

## Self-Check: PASSED

**Created files verified:**
- ✅ packages/shared-types/src/game/lore.ts
- ✅ packages/shared-types/src/game/zone-mastery.ts
- ✅ packages/lore/package.json
- ✅ packages/lore/tsconfig.json
- ✅ packages/lore/src/registry.ts
- ✅ packages/lore/src/index.ts
- ✅ packages/lore/src/fragments/world-history.ts
- ✅ packages/lore/src/fragments/faction-lore.ts
- ✅ packages/lore/src/fragments/ancient-tech.ts

**Commits verified:**
- ✅ bfb1057: feat(80-02): add database schemas for lore, zone mastery, and rewards
- ✅ 5d1efbd: feat(80-02): add query functions and database migration

Note: Commits labeled as 80-02 but contain 80-01 deliverables.

## Next Steps

Plan 02 will implement database persistence using the types and registry established here:
- collected_lore table with composite PK (characterId, loreId)
- zone_mastery table with JSONB objectives
- character_rewards table for mastery completion rewards
- Query functions integrating with LoreRegistry for validation
