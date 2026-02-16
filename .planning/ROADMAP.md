# Roadmap: Into the Void

## Milestones

- ✅ **v1.0 Auth & Character Screens** - Phases 1-3 (shipped 2026-02-14)
- ✅ **v1.1 Post-Login Game Experience** - Phases 4-7 (shipped 2026-02-16)
- ✅ **v1.2 Isometric View** - Phases 8-12 (shipped 2026-02-16)
- ✅ **v1.3 Elevation & Structures** - Phases 13-16 (shipped 2026-02-16)
- 🚧 **v1.4 Infinite World & Seamless Chunks** - Phases 17-20 (in progress)

## Phases

<details>
<summary>✅ v1.0 Auth & Character Screens (Phases 1-3) - SHIPPED 2026-02-14</summary>

- [x] Phase 1: Authentication & Navigation (3/3 plans) - completed 2026-02-13
- [x] Phase 2: Character Selection (2/2 plans) - completed 2026-02-14
- [x] Phase 3: Character Creation (2/2 plans) - completed 2026-02-14

See: `.planning/milestones/v1.0-ROADMAP.md`

</details>

<details>
<summary>✅ v1.1 Post-Login Game Experience (Phases 4-7) - SHIPPED 2026-02-16</summary>

- [x] Phase 4: WebSocket Connection & Auth Handshake (5/5 plans) - completed 2026-02-14
- [x] Phase 5: Phaser Integration & World Rendering (5/5 plans) - completed 2026-02-14
- [x] Phase 6: Movement System (5/5 plans) - completed 2026-02-15
- [x] Phase 7: Entities & HUD (5/5 plans) - completed 2026-02-16

See: `.planning/milestones/v1.1-ROADMAP.md`

</details>

<details>
<summary>✅ v1.2 Isometric View (Phases 8-12) - SHIPPED 2026-02-16</summary>

- [x] Phase 8: Core Isometric Transformation (3/3 plans) - completed 2026-02-16
- [x] Phase 9: Rendering Optimization & Interaction (2/2 plans) - completed 2026-02-16
- [x] Phase 10: Multiplayer Integration (1/1 plans) - completed 2026-02-16
- [x] Phase 11: UI Integration (1/1 plans) - completed 2026-02-16
- [x] Phase 12: Polish (1/1 plans) - completed 2026-02-16

See: `.planning/milestones/v1.2-ROADMAP.md`

</details>

<details>
<summary>✅ v1.3 Elevation & Structures (Phases 13-16) - SHIPPED 2026-02-16</summary>

**Milestone Goal:** Add vertical dimension to the world with terrain elevation, structure walls, and a scalable tile definition system.

- [x] Phase 13: Tile Definition Architecture (3/3 plans) - completed 2026-02-16
- [x] Phase 14: Elevation System Core (2/2 plans) - completed 2026-02-16
- [x] Phase 15: Elevation Rendering (2/2 plans) - completed 2026-02-16
- [x] Phase 16: Structure Walls & Pathfinding (5/5 plans) - completed 2026-02-16

See: `.planning/milestones/v1.3-ROADMAP.md`

</details>

### 🚧 v1.4 Infinite World & Seamless Chunks (In Progress)

**Milestone Goal:** Transform the world from chunk-locked biomes to a truly infinite, seamlessly streaming world where biomes flow naturally across boundaries.

**Phases:** 4 (17-20)
**Depth:** Quick (from config)
**Coverage:** 18/18 requirements mapped

#### Phase 17: World Coordinate Foundation
**Goal**: Coordinate system uses world coordinates for seamless cross-chunk rendering
**Depends on**: Phase 16 (v1.3 elevation and structures complete)
**Requirements**: COORD-01, COORD-02, COORD-03
**Success Criteria** (what must be TRUE):
  1. Depth sorting uses world coordinates (worldX = chunkX * 32 + localX) for correct z-order across chunks
  2. Entity visibility uses world coordinate distance instead of zone ID matching
  3. Tile rendering calculates depth from world position enabling seamless chunk boundaries
**Plans**: 2 plans

Plans:
- [x] 17-01-PLAN.md — World coordinate consistency for depth sorting
- [x] 17-02-PLAN.md — Distance-based entity visibility

#### Phase 18: Multi-Chunk Streaming
**Goal**: Players can seamlessly explore infinite world with viewport-based chunk streaming
**Depends on**: Phase 17 (world coordinate system established)
**Requirements**: CHUNK-01, CHUNK-02, CHUNK-03, CHUNK-04, CHUNK-05, CHUNK-06, CHUNK-07, MEM-01, MEM-02, MEM-03, MEM-04
**Success Criteria** (what must be TRUE):
  1. Client loads 3x3 grid of chunks around player position with no visual breaks
  2. Client requests chunks via WebSocket when approaching boundaries and displays loading indicator
  3. Server generates chunks on demand with deterministic seed and caches with LRU cleanup (max 500 chunks)
  4. Player can move seamlessly across chunk boundaries without pop-in or collision issues
  5. Phaser containers destroyed when chunks unload and WebSocket room subscriptions cleaned up (no memory leaks)
**Plans**: 5 plans in 2 waves

Plans:
- [x] 18-01-PLAN.md — Server-side LRU cache for chunk storage (Wave 1)
- [x] 18-02-PLAN.md — WebSocket 3x3 room subscription management (Wave 1)
- [x] 18-03-PLAN.md — Client-side priority queue for chunk requests (Wave 1)
- [x] 18-04-PLAN.md — Chunk loading indicator UI (Wave 2)
- [x] 18-05-PLAN.md — Entity streaming for cross-chunk visibility (Wave 2)

#### Phase 19: Biome Integration
**Goal**: Biomes flow naturally across chunk boundaries with seamless transitions
**Depends on**: Phase 18 (multi-chunk streaming active)
**Requirements**: BIOME-01, BIOME-02, BIOME-03, BIOME-04
**Success Criteria** (what must be TRUE):
  1. Biome determined per-tile using world coordinates (not per-chunk assignment)
  2. Biome transitions are seamless using noise layers with no hard edges at chunk boundaries
  3. HUD displays current biome name based on player world position
  4. Temperature/moisture/elevation noise creates natural climate zones across multiple chunks
**Plans**: 2 plans in 1 wave

Plans:
- [ ] 19-01-PLAN.md — Per-tile biome sampling in terrain generation
- [ ] 19-02-PLAN.md — HUD biome display component

#### Phase 20: Testing & Polish
**Goal**: Cross-chunk gameplay validated with edge cases resolved and UX polished
**Depends on**: Phase 19 (biome integration complete)
**Requirements**: (Validation of all v1.4 requirements)
**Success Criteria** (what must be TRUE):
  1. Player can move across multiple chunk boundaries without collision, pathfinding, or visibility issues
  2. Memory profiling confirms no leaks after 30+ chunk transitions
  3. Loading indicators display during chunk requests with smooth fade-in on chunk arrival
  4. Chunk request patterns optimized with debouncing and priority queue (visible chunks first)
**Plans**: TBD

Plans:
- [ ] 20-01: [TBD during planning]

## Progress

**Execution Order:**
Phases execute in numeric order: 17 → 18 → 19 → 20

| Phase | Milestone | Plans | Status | Completed |
|-------|-----------|-------|--------|-----------|
| 1. Authentication & Navigation | v1.0 | 3/3 | Complete | 2026-02-13 |
| 2. Character Selection | v1.0 | 2/2 | Complete | 2026-02-14 |
| 3. Character Creation | v1.0 | 2/2 | Complete | 2026-02-14 |
| 4. WebSocket Connection | v1.1 | 5/5 | Complete | 2026-02-14 |
| 5. World Rendering | v1.1 | 5/5 | Complete | 2026-02-14 |
| 6. Movement System | v1.1 | 5/5 | Complete | 2026-02-15 |
| 7. Entities & HUD | v1.1 | 5/5 | Complete | 2026-02-16 |
| 8. Core Isometric Transformation | v1.2 | 3/3 | Complete | 2026-02-16 |
| 9. Rendering Optimization & Interaction | v1.2 | 2/2 | Complete | 2026-02-16 |
| 10. Multiplayer Integration | v1.2 | 1/1 | Complete | 2026-02-16 |
| 11. UI Integration | v1.2 | 1/1 | Complete | 2026-02-16 |
| 12. Polish | v1.2 | 1/1 | Complete | 2026-02-16 |
| 13. Tile Definition Architecture | v1.3 | 3/3 | Complete | 2026-02-16 |
| 14. Elevation System Core | v1.3 | 2/2 | Complete | 2026-02-16 |
| 15. Elevation Rendering | v1.3 | 2/2 | Complete | 2026-02-16 |
| 16. Structure Walls & Pathfinding | v1.3 | 5/5 | Complete | 2026-02-16 |
| 17. World Coordinate Foundation | v1.4 | 2/2 | Complete | 2026-02-16 |
| 18. Multi-Chunk Streaming | v1.4 | 5/5 | Complete | 2026-02-16 |
| 19. Biome Integration | v1.4 | 0/2 | Not started | - |
| 20. Testing & Polish | v1.4 | 0/TBD | Not started | - |

**Total:** 20 phases (18 complete, 2 pending)

---
*Last updated: 2026-02-17 after Phase 19 planning*
