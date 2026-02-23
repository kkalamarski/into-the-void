# Project Research Summary

**Project:** Into the Void - Aquatic & Exotic Biomes Content Expansion
**Domain:** Multiplayer 2D Isometric Survival MMO - Large Content Expansion
**Researched:** 2026-02-23
**Confidence:** HIGH

## Executive Summary

This content expansion adds 5-6 new biomes (aquatic and exotic/anomaly variants) with approximately 70 new content pieces (30 entities, 20 creatures, 40 items) to an existing system with 10 biomes, 42 entities, and 100+ items. The research reveals a strong foundation: **zero new core dependencies are required**. The existing stack (Phaser 3.80, custom SimplexNoise, Drizzle ORM, NestJS) already supports all required capabilities including water tile animation via TileSprite scrolling, biome-based entity spawning, and the registry-pattern content system.

The recommended approach is **additive content expansion** following established patterns. The codebase uses strategy pattern for entities and registry pattern for static data, both designed for extensibility. Adding new biomes requires extending union types and registries, not architectural changes. The data flow is fully compatible with content expansion - ChunkData structure, Entity interface, WebSocket contracts, and database schema all remain unchanged.

The primary risks are technical edge cases at integration boundaries rather than greenfield challenges. The five critical pitfalls are: (1) aquatic movement breaking the 2D isometric collision model, (2) biome transition artifacts at water/exotic borders producing isolated tiles, (3) spawn configuration lookup scaling O(n^2) with 100+ entities, (4) power creep making existing Tier I-II biomes obsolete, and (5) rare spawn discovery patterns disrupting veteran player knowledge. All are preventable with phase-specific mitigations detailed in PITFALLS.md.

## Key Findings

### Recommended Stack

**No changes required.** The current stack handles this expansion without modification. See STACK.md for detailed analysis.

**Core technologies (unchanged):**
- **Phaser 3.80**: TileSprite scrolling provides water animation without shader plugins. Native isometric support. No performance concerns at 50+ entities.
- **Custom SimplexNoise**: Purpose-built for seeded world generation. Reuse existing BiomeGenerator with new elevation/moisture thresholds for aquatic zones.
- **Drizzle ORM + PostgreSQL**: Entity tables scale trivially from 42 to 100+ rows. Existing migration workflow applies.
- **Strategy Pattern (entities)**: Discriminated unions scale to 100+ definitions at zero runtime cost.

**What NOT to add:** Water shader plugins, external noise libraries, enum migrations, tilemap animation plugins. All capabilities exist natively.

### Expected Features

**Must have (table stakes):** See FEATURES.md for full analysis.
- Biome-specific visibility rules (reduced vision in water/anomalies)
- Unique resource nodes per biome (~30 new entities with distinct loot tables)
- Biome-appropriate creature behaviors (aquatic movement patterns)
- Environmental hazards per biome tier (pressure, reality distortion)
- Integration with existing gathering mini-game and fog of war systems
- Creature spawn distribution (~20 creatures across new biomes)
- ~40 new items integrated with equipment/consumable/material systems

**Should have (differentiators):**
- Aquatic-specific movement speed modifiers (tile-based, already supported)
- Ancient artifact concentration in Anomaly zones (lore-accurate)
- Anomaly exposure effects (status effects for prolonged exposure)
- Biome-specific discovery achievements (extends zone mastery system)

**Defer (v2+):**
- Depth-based mechanics (multiple vertical layers) - 2D view doesn't convey depth naturally
- Tidal cycle mechanics - high complexity, requires world time system
- Dynamic Anomaly instability - multiplayer sync nightmare
- Temporal resource mechanics - extreme complexity
- Custom shaders for water/anomaly - TileSprite sufficient for MVP

### Architecture Approach

The architecture is designed for exactly this use case. See ARCHITECTURE-BIOME-EXPANSION.md for patterns and integration points.

**Major components (no changes to core logic):**
1. **BiomeGenerator** - Add new biome types to `getBiome()` decision tree (elevation < 0.15 + moisture > 0.8 = aquatic)
2. **EntityRegistry** - Add new entity definitions with `biomes: ['tidal_pools', 'deep_trenches']` arrays
3. **SpawnGenerator** - Add entries to `BIOME_SPAWN_CONFIGS` for each new biome
4. **TileRegistry** - Add aquatic/exotic tile definitions with speed modifiers
5. **TerrainGenerator** - Add entries to `BIOME_TILES` and `BIOME_TILE_IDS`
6. **PreloadScene** - Load new texture assets (fallback colors work until sprites exist)

**Build order (dependency-aware):**
1. Type system foundation (BiomeType union extensions)
2. Static content definitions (tiles, entities)
3. World generation logic (biome conditions, spawn configs)
4. Server integration (no changes needed)
5. Client rendering (texture loading, optional effects)

### Critical Pitfalls

From PITFALLS.md - top 5 requiring mitigation:

1. **Aquatic Movement Breaks Collision Model** - Extend `TileState` from boolean to support `'shallow_water' | 'deep_water'`. Address in Phase 1 before adding water tiles.

2. **Biome Transition Artifacts** - Post-process biome map to enforce minimum contiguous area (no 1-tile puddles). Generate shore transition tiles explicitly. Gate spawn tables by region size.

3. **Spawn Lookup Scales O(n^2)** - Pre-compute spawn tables with cumulative weights for O(log n) binary search. Add spatial indexing for rare spawn proximity checks. Address before bulk content addition.

4. **Power Creep from High-Tier Biomes** - Use horizontal progression (unique resources per tier, not strictly better). Require Tier I materials in high-tier crafting recipes. Soft-gate new content with equipment requirements.

5. **Rare Spawn Discovery Disruption** - Implement biome-specific rarity strategies (depth-based for aquatic, anomaly-center for exotic). Add visual discovery hints (bubbles, audio distortion). Ramp spawn rates gradually post-launch.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Aquatic Biome Foundation
**Rationale:** Must extend collision system before water tiles exist. Establishes patterns for all subsequent aquatic content.
**Delivers:** TileState extension, 2-3 aquatic biome types (tidal_pools, deep_trenches), shore transition generation, fog of war visibility modifiers.
**Addresses:** Biome-specific visibility, environmental hazard framework.
**Avoids:** Pitfall 1 (collision model) and Pitfall 2 (transition artifacts).

### Phase 2: Aquatic Entity Population
**Rationale:** Content definitions are independent and can proceed once biome infrastructure exists.
**Delivers:** 15 aquatic entities (5 creatures, 5 plants, 5 minerals/artifacts), loot tables, spawn configurations.
**Uses:** Existing entity registry pattern, spawn system.
**Implements:** Strategy pattern extensions for aquatic creature behaviors.

### Phase 3: Exotic Biome Foundation
**Rationale:** Builds on aquatic patterns, applies to Anomaly Zone variants (Void Rift, Dimensional Anomaly).
**Delivers:** 2-3 exotic biome types (void_rift, anomaly_zone), exotic tile definitions, unique visual identity (palette swap, no shaders for MVP).
**Addresses:** Anomaly visual distinctiveness requirement.
**Avoids:** Pitfall 10 (visual clarity vs lore ambiguity).

### Phase 4: Exotic Entity Population
**Rationale:** Same pattern as Phase 2, applied to exotic content.
**Delivers:** 15 exotic entities (5 creatures, 5 anomaly plants, 5 anomaly artifacts), loot tables, spawn configurations.
**Uses:** Entity registry, spawn system.
**Avoids:** Pitfall 3 (if spawn optimization done first).

### Phase 5: Item Integration & Crafting
**Rationale:** Items depend on entity yields being defined. Requires careful balance against power creep.
**Delivers:** 40 new items (aquatic suit variants, underwater tools, anomaly-forged gear), crafting dependencies on Tier I-II materials.
**Addresses:** Equipment progression, loot quality scaling.
**Avoids:** Pitfall 4 (power creep) via horizontal progression.

### Phase 6: Spawn System Optimization
**Rationale:** With ~70 new entities, performance optimization becomes necessary. Can be done in parallel with content phases if needed.
**Delivers:** Pre-computed spawn tables (O(log n) lookup), spatial indexing for rare spawns, batch spawn generation.
**Addresses:** Performance at scale.
**Avoids:** Pitfall 3 (O(n^2) scaling).

### Phase 7: Discovery & Rare Spawn Integration
**Rationale:** Requires content to exist for tuning. Needs player feedback to validate spawn patterns.
**Delivers:** Biome-specific rarity strategies, visual discovery hints (bubbles for underwater, audio for anomalies), spawn rate ramping.
**Addresses:** Rare spawn meta disruption.
**Avoids:** Pitfall 5 (discovery integration).

### Phase 8: Visual Polish & Effects (Optional)
**Rationale:** Polish layer after core mechanics work. Not required for MVP.
**Delivers:** Water shader effects (if performance allows), particle systems (bubbles, anomaly distortions), ambient audio per biome.
**Addresses:** Differentiator features from FEATURES.md.
**Avoids:** Pitfall 6 (rendering performance) via performance budgeting.

### Phase Ordering Rationale

- **Infrastructure before content:** Phases 1 and 3 establish biome foundations before populating with entities (Phases 2 and 4). Prevents collision bugs and transition artifacts.
- **Aquatic before exotic:** Aquatic biomes are mechanically simpler (slower movement, reduced visibility). Exotic biomes build on patterns established.
- **Content before optimization:** Spawn optimization (Phase 6) benefits from knowing final entity count. Can be pulled forward if performance degrades during testing.
- **Balance before discovery:** Item integration (Phase 5) must be balanced before rare spawn tuning (Phase 7), otherwise power creep compounds discovery issues.
- **Polish last:** Visual effects (Phase 8) are optional and must not block content release.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 1 (Aquatic Foundation):** TileState extension impact on existing movement validation. Verify PathfindingController compatibility.
- **Phase 5 (Item Integration):** Crafting recipe balance requires tech tree validation. Check for tier-skipping opportunities.
- **Phase 7 (Discovery Integration):** Rare spawn visual hint effectiveness unknown. Needs playtest validation.

Phases with standard patterns (skip research-phase):
- **Phase 2, 4 (Entity Population):** Entity registry pattern is well-established. Just follow existing creature/plant/mineral definitions.
- **Phase 6 (Spawn Optimization):** Binary search and spatial indexing are standard algorithms. Implementation is straightforward.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Existing stack validated via codebase analysis. Phaser TileSprite documented in official examples and community implementations (Feudal Wars). |
| Features | MEDIUM | Genre patterns adapted from 3D survival games to 2D perspective. Aquatic mechanics well-documented. Anomaly mechanics less standardized. |
| Architecture | HIGH | Direct analysis of existing codebase. Patterns already proven in prior biome additions (miasma_marshes, petrified_expanse). |
| Pitfalls | HIGH | Critical pitfalls identified via codebase analysis + industry research. Prevention strategies are concrete and implementable. |

**Overall confidence:** HIGH

### Gaps to Address

- **Multiplayer sync for aquatic depth states:** Existing movement validation is tile-based. Underwater depth is continuous (0.0-1.0). Decision needed: discrete depth zones vs continuous tracking.
- **Exotic biome shader performance:** No benchmarks for WebGL distortion on low-end devices. May need device profiling during Phase 8.
- **Loot table contextual filtering:** Aggressive filtering may cause "I'm not getting X anymore" complaints. Needs A/B testing during Phase 5.
- **Oxygen depletion curves:** How fast should oxygen drain? Requires balancing during Phase 1 implementation.
- **Lore consistency:** Aquatic biomes must fit "Coastal Shallows" description (world-bible.md). No "deep ocean" biome unless lore expanded.

## Sources

### Primary (HIGH confidence)
- Codebase analysis: `/packages/world-gen/`, `/packages/entities/`, `/apps/game-server/src/zones/`
- [Phaser 3 TileSprite Documentation](https://phaser.io/examples/v3/category/tilemap/isometric)
- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [Feudal Wars - Animated Isometric Water Tiles](https://feudalwars.net/devblog/new-animated-isometric-water-tiles)

### Secondary (MEDIUM confidence)
- [TypeScript Enum vs Union Type Performance](https://medium.com/suyeonme/ts-enum-vs-union-type-in-performance-3971825ea65a) - Bundle size and runtime analysis
- [Plarium Power Creep Guide](https://plarium.com/en/glossary/power-creep/) - Prevention strategies
- [Hytale World Generation](https://hytale.com/news/2026/1/the-future-of-world-generation) - Biome transitions
- [MDN 2D Collision Detection](https://developer.mozilla.org/en-US/docs/Games/Techniques/2D_collision_detection) - Hitbox algorithms

### Tertiary (LOW confidence)
- [Subnautica](https://store.steampowered.com/app/264710/Subnautica/) - Aquatic biome design reference (3D, not directly applicable)
- [S.T.A.L.K.E.R. Anomaly mechanics](https://kotaku.com/most-survival-games-have-problems-that-s-t-a-l-k-e-r-s-1683484728) - Anomaly zone patterns (needs adaptation)
- [WoW Dragonflight Rare Spawn Schedule](https://www.mmo-champion.com/content/11200-Dragonflight-Rare-Spawn-Schedule-Spreadsheet-and-Weak-Aura) - Spawn cadence patterns

---
*Research completed: 2026-02-23*
*Ready for roadmap: yes*
