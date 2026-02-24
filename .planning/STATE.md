# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-23)

**Core value:** Real-time multiplayer gameplay with responsive movement and visual feedback
**Current focus:** Phase 87 - Item Integration & Balance

## Current Position

Phase: 87 of 88 (Item Integration & Balance)
Plan: 1 of 3 in current phase
Status: Phase 87 in progress - Aquatic equipment definitions complete
Last activity: 2026-02-24 - Completed 87-01 (Aquatic Equipment Definitions)

Progress: [####################] 100% v1.17 | [############...] 79% v1.18

## Performance Metrics

**Velocity:**
- Total plans completed: 233 (v1.0-v1.17: 222, v1.18: 11)
- Average duration: ~3 min per plan
- Total execution time: ~11.7 hours across 17 milestones

**By Milestone:**

| Milestone | Phases | Plans | Timeline |
|-----------|--------|-------|----------|
| v1.0-v1.17 | 1-81 | 222 | 10 days |
| v1.18 | 82-88 | 15/18 | In Progress |

**v1.18 Phase Estimates:**

| Phase | Est. Plans | Requirements |
|-------|------------|--------------|
| 82. Aquatic Foundation | 3 | BIOME-01-03, BIOME-07-09 |
| 83. Aquatic Entities | 3 | ENT-01-03, CREA-01-04, gap-closure |
| 84. Exotic Foundation | 2 | BIOME-04-06 |
| 85. Gathering as Ability | 3 | Bugfix gathering, entity collisions |
| 86. Exotic Entities | 2 | ENT-04-06, CREA-05-08 |
| 87. Items & Balance | 3 | ITEM-01-10, PROG-01-03 |
| 88. Gaps & Discovery | 2 | ENT-07-09, CREA-09-10, PROG-04-06 |
| Phase 82 P01 | 176s | 3 tasks | 5 files |
| Phase 82 P02 | 363s | 3 tasks | 10 files |
| Phase 82 P03 | 380s | 3 tasks | 8 files |
| Phase 83 P01 | 211 | 4 tasks | 5 files |
| Phase 83 P02 | 327 | 4 tasks | 2 files |
| Phase 83 P03 | 239 | 3 tasks | 3 files |
| Phase 84 P01 | 143s | 3 tasks | 3 files |
| Phase 84 P02 | 247s | 3 tasks | 7 files |
| Phase 85 P02 | 268s | 5 tasks | 2 files |
| Phase 85 P03 | 234s | 5 tasks | 3 files |
| Phase 85 P01 | 430 | 3 tasks | 4 files |
| Phase 85 P04 | 206s | 3 tasks | 2 files |
| Phase 86 P01 | 252s | 3 tasks | 5 files |
| Phase 86 P02 | 311 | 4 tasks | 2 files |
| Phase 87 P01 | 128s | 2 tasks | 2 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [v1.18 Research]: Aquatic biomes before exotic (simpler mechanics establish patterns)
- [v1.18 Research]: Infrastructure before content (prevents collision/transition bugs)
- [v1.18 Research]: TileState extension needed for water movement validation
- [v1.18 Research]: Balance before discovery (prevents power creep compounding)
- [Phase 82]: TileState enum for extensible water classification instead of boolean flags
- [Phase 82]: Optional tileState/visibilityModifier properties for backward compatibility
- [Phase 82-02]: Aquatic biomes trigger at elevation < 0.15 before other biome checks
- [Phase 82-02]: Asymmetric shore transition thresholds (2 for land->shore, 3 for water->shore)
- [Phase 82-02]: Kelp corridors use noise contours (fbm 0.08, < 0.15 threshold) for organic paths
- [Phase 82-02]: Post-processing order: terrain -> shore -> kelp -> structures -> spawns
- [Phase 82-03]: Movement speed modifiers stack multiplicatively (tile * biome)
- [Phase 82-03]: Dynamic movement rate limiting based on destination tile
- [Phase 82-03]: Fog reveal radius minimum of 3 tiles for playability
- [Phase 83-01]: Use existing items for aquatic harvest yields (aquatic-specific items in Phase 86)
- [Phase 83-01]: Apply Phase 81 health balance targets to aquatic creatures
- [Phase 83-01]: Abyssal Leviathan as maniac-tier endgame threat in deep trenches
- [Phase 83-02]: 1.5x aquatic density multiplier for ocean population (void_plains baseline 4 -> 6)
- [Phase 83-02]: Maniac spawn weight of 1 for Abyssal Leviathan (matches Void Horror rarity)
- [Phase 83-02]: Use existing items for aquatic loot tables (aquatic-specific items in Phase 86)
- [Phase 83-03]: Artifact spawn rate 5% per attempt (extremely rare one-time discoveries)
- [Phase 83-03]: Plant respawn timing 5-10 minutes matches mineral pattern
- [Phase 83-03]: Artifact respawnTime -1 for no respawn (ZonesService handles removal)
- [Phase 84-01]: Crystalline biome uses visibilityModifier 1.2 (unique increased visibility)
- [Phase 84-01]: Void rift has reduced visibility (0.7) due to reality distortion
- [Phase 84-01]: Bioluminescent flora is traversable but slow (0.7 speed, 0.6 visibility)
- [Phase 84-02]: Void rift requires BOTH temp < 0.15 AND moisture < 0.2 (rarest biome)
- [Phase 84-02]: Crystalline wastes triggers at elevation > 0.75 (high altitude)
- [Phase 84-02]: Bioluminescent depths positioned at elevation 0.2-0.4 (above aquatic)
- [Phase 85-02]: Tool stats extracted once per ability use for gather abilities
- [Phase 85-02]: GatherSpeed reduces cooldown multiplicatively (1 - speed)
- [Phase 85-02]: EntityService.handleToolUse handles inventory updates and entity changes
- [Phase 85-02]: Gathering:start handler redirects to ability:use for backward compatibility
- [Phase 85-03]: Only static gatherable entities (minerals, plants) block movement
- [Phase 85-03]: Items, NPCs, and creatures do not block pathfinding
- [Phase 85-03]: Minerals/plants use target selection instead of auto-start gathering
- [Phase 85-04]: Optional yieldMultiplier parameter for backward compatibility in EntityService.handleToolUse
- [Phase 85-04]: Tool yield multiplier affects both loot drop chance (capped 1.0) and quantity (min 1)
- [Phase 86-01]: Changed MINERAL_VOID_CRYSTAL_NODE rarity from 'exotic' to 'epic' (NodeRarity constraint)
- [Phase 86-02]: Bioluminescent depths flora-focused with plantDensity 8 (highest in exotic biomes)
- [Phase 86-02]: Crystalline wastes mineral-focused with mineralDensity 10 (highest in game)
- [Phase 86-02]: Void rift danger-focused with low creatureDensity 2 but includes maniac
- [Phase 86-02]: Dimensional Aberration weight 1 matches Abyssal Leviathan and Void Horror rarity

### Pending Todos

None.

### Blockers/Concerns

**Research Flags from SUMMARY.md:**
- Phase 82-01: TileState extension impact on PathfindingController compatibility
- Phase 82-02: Kelp corridor cross-chunk alignment needs testing at boundaries
- Phase 86: Crafting recipe balance needs tier-skipping validation

**Known Issues:**
- Web app vitest tests hang when run via nx (vitest 4.0.18 vs nx expecting v1-3)

## Session Continuity

Last session: 2026-02-24
Stopped at: Completed 87-01-PLAN.md (Aquatic Equipment Definitions)
Resume file: None

**Next steps:**
1. Continue Phase 87 (Items & Balance)
2. Balance crafting recipes for exotic materials
3. Complete v1.18 milestone with Phase 88 (Gaps & Discovery)

---
*Last updated: 2026-02-24 - Phase 87-01 complete (aquatic equipment definitions)*
