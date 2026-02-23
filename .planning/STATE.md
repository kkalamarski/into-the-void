# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-23)

**Core value:** Real-time multiplayer gameplay with responsive movement and visual feedback
**Current focus:** v1.17 Core Gameplay Loop - Phase 80: Zone Mastery & Lore

## Current Position

Phase: 80 (Zone Mastery & Lore)
Plan: 3/4 complete
Status: In Progress
Last activity: 2026-02-23 — Completed 80-03 Server-Side Lore & Zone Mastery Services

Progress: [████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░] 4.7%

## Performance Metrics

**Velocity:**
- Total plans completed: 219
- Average duration: ~3 min per plan
- Total execution time: ~11.0 hours across 17 milestones

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
| v1.9 | 39-42 | 12 | 1 day |
| v1.10 | 43-45 | 5 | 1 day |
| v1.11 | 46-50 | 18 | 2 days |
| v1.12 | 51-55 | 9 | 1 day |
| v1.13 | 56-58 | 9 | 1 day |
| v1.14 | 59-63 | 8 | 1 day |
| v1.15 | 64-69 | 16 | 1 day |
| v1.16 | 70-75 | 11 | 1 day |
| v1.17 | 76-81 | 15/? | In Progress |

**Recent Trend:**
Stable velocity. v1.16 shipped (6 phases, 11 plans). v1.17 roadmap created with 6 phases.

| Plan | Duration (s) | Tasks | Files |
|------|--------------|-------|-------|
| Phase 69 P01 | 345 | 3 tasks | 3 files |
| Phase 69 P02 | 283 | 3 tasks | 3 files |
| Phase 70 P01 | 159 | 3 tasks | 3 files |
| Phase 70 P02 | 120 | 3 tasks | 1 files |
| Phase 71 P01 | 107 | 2 tasks | 2 files |
| Phase 72 P01 | 74 | 2 tasks | 1 files |
| Phase 72 P02 | 153 | 2 tasks | 5 files |
| Phase 72 P03 | 77 | 2 tasks | 2 files |
| Phase 73 P01 | 187 | 2 tasks | 1 files |
| Phase 74 P01 | 206 | 2 tasks | 3 files |
| Phase 74 P02 | 161 | 2 tasks | 3 files |
| Phase 75 P01 | 173 | 2 tasks | 4 files |
| Phase 75 P02 | 136 | 2 tasks | 2 files |
| Phase 76 P01 | 606 | 2 tasks | 8 files |
| Phase 76 P02 | 255 | 2 tasks | 2 files |
| Phase 77 P02 | 93 | 2 tasks | 3 files |
| Phase 77 P01 | 148 | 2 tasks | 6 files |
| Phase 77 P03 | 211 | 3 tasks | 4 files |
| Phase 77 P04 | 194 | 3 tasks | 3 files |
| Phase 77 P04 | 194 | 3 tasks | 3 files |
| Phase 78 P02 | 130 | 2 tasks | 2 files |
| Phase 78 P01 | 152 | 2 tasks | 6 files |
| Phase 78 P03 | 534 | 2 tasks | 4 files |
| Phase 78 P04 | 400 | 3 tasks | 5 files |
| Phase 79 P01 | 195 | 2 tasks | 5 files |
| Phase 79 P02 | 142 | 2 tasks | 3 files |
| Phase 79 P03 | 303 | 3 tasks | 5 files |
| Phase 79 P04 | 383 | 3 tasks | 4 files |
| Phase 80 P03 | 443 | 2 tasks | 8 files |
| Phase 80 P02 | 281 | 2 tasks | 9 files |
| Phase 80 P01 | 318 | 2 tasks | 12 files |
| Phase 80 P03 | 443 | 2 tasks | 8 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Phase 69: Quest chains with prerequisite system, bounty daily reset tracking
- Phase 68: Quest log with Active/Completed tabs, Q hotkey toggle
- Phase 67: NPC quest markers (! and ?) with auto-discover on zone entry
- v1.16: Depth "quick" targets 3-5 phases but research suggests 6 phases for full coverage
- v1.16: Research identifies 7 critical pitfalls (nested modal escape, memory leaks, keyboard desync, state duplication, z-index wars, tab state loss, race conditions)
- [Phase 70]: Embedded trade UI as internal component within NpcInteractionModal to fix double-modal bug
- [Phase 70]: TradingPanel.tsx and TradingPanel.css fully removed as dead code after trade UI embedding
- [Phase 70]: GameUI now renders only NpcInteractionModal for trader interactions, not separate TradingPanel
- [Phase 71]: QuestTracker collapse state persisted via localStorage with key 'quest-tracker-collapsed'
- [Phase 72]: Design token system uses --duration-* for timing, --ease-* for curves, --transition-* for semantic usage
- [Phase 72]: GPU-accelerated button polish uses transform/filter instead of top/left/opacity for 60fps animations
- [Phase 72]: NPC modal overlay uses glassmorphism with backdrop-filter and fallback for unsupported browsers
- [Phase 72]: Modal transitions combine opacity fade with scale (0.95 → 1) for modern feel
- [Phase 72]: Overlay wrapper pattern for modal centering via flexbox (removes fixed positioning from modal content)
- [Phase 72]: Background-click-to-close uses e.target === e.currentTarget pattern (prevents closing on modal content clicks)
- [Phase 73]: Arrow function properties for event handlers enable stable on/off references
- [Phase 73]: Client-side marker computation mirrors server logic (ready > available > none)
- [Phase 74]: Quest completion rewards use array queue (max 3) with store-managed auto-dismiss timers
- [Phase 74]: Click-to-dismiss banners with stopPropagation pattern prevents canvas interaction
- [Phase 74]: Stacked banner positioning (30%, 42%, 54%) for multiple simultaneous completions
- [Phase 74]: Audio feedback uses HTML5 Audio API with autoplay policy compliance (30% volume, silent failure)
- [Phase 75]: Pending state set before socket emit to prevent race conditions
- [Phase 75]: Errors route from inline state to alertStore for unified toast notifications
- [Phase 75]: Alert duration increased to 5s (was 3s) per ERR-02 spec
- [Phase 75]: isPending computed from tradePending || questPending for unified modal close prevention
- [Phase 75]: Spinner toggle pattern: {pending ? <span className="spinner-small" /> : 'Label'}
- [v1.17 Roadmap]: Fog of war uses bitset encoding (8 tiles/byte) to prevent localStorage bloat (1MB → 12.5KB)
- [v1.17 Roadmap]: Gathering mini-game server validates timing via server-side elapsed time to prevent cheats
- [v1.17 Roadmap]: Zone mastery uses event-driven tracking (@nestjs/event-emitter) with in-memory batching
- [v1.17 Roadmap]: Combat balancing applies 15% damage multiplier per level beyond 5-level gap
- [v1.17 Roadmap]: Phase ordering: Fog → POI → Gathering → Risk/Reward → Mastery → Combat (dependency-driven)
- [Phase 76]: Coordinate hashing formula (worldX + OFFSET) * RANGE + (worldY + OFFSET) maps -100k to +100k coords to positive indices
- [Phase 76]: Brian Kernighan's algorithm (byte &= byte - 1) for efficient bit counting in getRevealedCount()
- [Phase 76]: getAllRevealedTiles() caching pattern invalidates on setRevealed() to avoid O(n) reverse hash overhead
- [Phase 76]: Throttled auto-save (5s max frequency) balances persistence reliability with localStorage write performance
- [Phase 76]: Iterative BFS with queue for reveal radius avoids stack overflow with large radii (tested up to radius=50)
- [Phase 76]: RenderTexture sized to viewport (not world) for memory efficiency (8MB vs 500MB)
- [Phase 76]: Batch Graphics drawing with single erase() call maintains 60fps with 100+ tile reveals
- [Phase 76]: 60% opacity fog overlay preserves terrain visibility while hiding unexplored areas
- [Phase 76]: Fog depth 1000 (above terrain ~100-200, below UI ~2000) for correct visual layering
- [Phase 76]: Fog reveal skipped during reconciliation to avoid double-reveal on server confirmation
- [Phase 77]: discovered_pois table uses composite primary key (characterId, poiId) to prevent re-discovery exploits
- [Phase 77]: poiId format poi_${chunkX}_${chunkY}_${index} supports procedural generation with 100 char varchar limit
- [Phase 77]: Cascade delete from characters to discovered_pois ensures automatic cleanup of orphaned discovery records
- [Phase 77]: POI density threshold 0.3 (30% of chunks) for sparse exploration-focused discovery
- [Phase 77]: Biome-specific POI type weights (ancient_ruins prefers anomalies, toxic_wastes prefers caches)
- [Phase 77]: Noise frequency 0.03 creates POI clusters rather than uniform distribution
- [Phase 77]: Discovery recorded before reward to prevent rollback exploits
- [Phase 77]: POI validation via chunk lookup ensures POI exists at claimed coordinates
- [Phase 78]: Mini-game depth 2000 places UI above world objects and fog but below HUD
- [Phase 78]: Dual click handling (container + scene listener) ensures reliable capture across browsers
- [Phase 78]: Entity routing by type: minerals/plants → gathering, artifacts → instant, creatures → combat
- [Phase 78]: isGathering flag blocks both WASD movement and pathfinding clicks during mini-game
- [Phase 78]: Entity locking prevents race conditions (Map<entityId, playerId>) during concurrent gathering attempts
- [Phase 78]: Artifact instant collection skips mini-game, awards archaeology XP via EntityService delegation
- [Phase 78]: Challenge auto-expiration (GATHER_DURATION_MS + 1000ms) cleans up abandoned sessions and releases locks
- [Phase 78]: Proficiency cache (Map<characterId, ProficiencyJson>) reduces database load with load/unload lifecycle
- [Phase 79]: NodeRarity type with three tiers (common/rare/epic) for resource node differentiation
- [Phase 79]: Rare variants use 1.5x yield multiplier and 2x respawn time vs common nodes
- [Phase 79]: Epic variants use 2x yield multiplier for endgame zones (ancient ruins, starfall crater)
- [Phase 79]: Rare nodes require +1 tool tier to prevent early-game farming exploits
- [Phase 79]: Variant naming pattern {BASE}_RARE / {BASE}_EPIC for clear code identification
- [Phase 79]: Proximity-based rare spawning uses 3x multiplier within 10 tiles of predators/maniacs with linear falloff
- [Phase 79]: Chunk caps of 3 rare + 1 epic minerals prevent resource flooding in high-danger zones
- [Phase 79]: 50% weight cap prevents guaranteed rare spawns even with maximum proximity bonuses
- [Phase 79]: Rare spawns generated after creature spawns for correct proximity dependency and determinism
- [Phase 79]: 3-tile discovery range balances exploration reward with proximity requirement
- [Phase 79]: Unique index on (characterId, entityId) prevents duplicate discoveries via database constraint
- [Phase 79]: Discovery check on every movement uses fire-and-forget async pattern without blocking
- [Phase 79]: Discovered rare nodes sent on character join for map marker persistence across sessions
- [Phase 79]: Phaser PostFX glow with fallback tint for non-WebGL ensures rare node visibility across all hardware
- [Phase 79]: Gold (0xffd700) for rare, purple (0x9400d3) for epic follows industry-standard rarity color coding
- [Phase 79]: Diamond-shaped map markers with pulsing animation (800ms cycle) provides distinct visual feedback
- [Phase 79]: Markers positioned 300px above nameplate at depth 1500 (above fog, below HUD) for optimal visibility
- [Phase 79]: Zone-scoped marker refresh on zone transition prevents rendering thousands of markers across world
- [Phase 79]: Type casting (any) for socket events avoids Socket.io function-type inference confusion
- [Phase 80]: Composite PK (characterId, loreId) prevents duplicate lore collection via database constraint
- [Phase 80]: JSONB objectives in zone_mastery for flexible mastery tracking without schema migrations
- [Phase 80]: Unique constraint (characterId, biome, tier) prevents duplicate mastery entries per tier
- [Phase 80]: Unique constraint (characterId, rewardId) prevents duplicate reward unlocks
- [Phase 80]: grantCharacterReward returns null on duplicate (23505 error) for graceful handling
- [Phase 80]: All lore/mastery/reward tables cascade delete from characters for automatic orphan cleanup
- [Phase 80-01]: Lore fragment structure: Self-contained objects with id/title/content/category/biome/xpReward for simple storage
- [Phase 80-01]: Registry indexing: Three Map-based indexes (by ID, category, biome) for O(1) lookups
- [Phase 80-01]: Mastery tier structure: Bronze/Silver/Gold with escalating requirements (3/10/5, 7/30/15, 15/75/40)
- [Phase 80-01]: Fragment content source: Extract from world-bible.md for canonical lore consistency

### Pending Todos

None.

### Blockers/Concerns

**v1.17 Milestone Active:**
- Phase 76: Fog of War Foundation (EXPL-01, EXPL-02, EXPL-03) — Complete (2/2 plans)
- Phase 77: POI Discovery System — Complete (4/4 plans)
- Phase 78: Gathering Mini-Game — Complete (4/4 plans)
- Phase 79: Resource Risk/Reward — Complete (4/4 plans)
- Phase 80: Zone Mastery & Lore — In Progress (1/? plans complete)
- Remaining phases: 81 (Combat Balancing)

**Known Issues:**
- Web app vitest tests hang when run via nx (vitest 4.0.18 vs nx expecting v1-3). TypeScript compilation verified instead.

## Session Continuity

Last session: 2026-02-23
Stopped at: Completed 80-03 Server-Side Lore & Zone Mastery Services
Resume file: None

**Next steps:**
1. Continue Phase 80 with Plan 04 (client UI for lore codex and mastery overlay)
2. Complete v1.17 milestone with Phase 81 (Combat Balancing)

---
*Last updated: 2026-02-23 - Completed Phase 80 Plan 03 Server-Side Lore & Zone Mastery Services*
