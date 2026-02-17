# Roadmap: Into the Void

## Milestones

- ✅ **v1.0 Auth & Character Screens** - Phases 1-3 (shipped 2026-02-14)
- ✅ **v1.1 Post-Login Game Experience** - Phases 4-7 (shipped 2026-02-16)
- ✅ **v1.2 Isometric View** - Phases 8-12 (shipped 2026-02-16)
- ✅ **v1.3 Elevation & Structures** - Phases 13-16 (shipped 2026-02-16)
- ✅ **v1.4 Infinite World & Seamless Chunks** - Phases 17-20 (shipped 2026-02-17)
- 🚧 **v1.5 Movement Overhaul** - Phases 21-24 (in progress)

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

<details>
<summary>✅ v1.4 Infinite World & Seamless Chunks (Phases 17-20) - SHIPPED 2026-02-17</summary>

**Milestone Goal:** Transform the world from chunk-locked biomes to a truly infinite, seamlessly streaming world where biomes flow naturally across boundaries.

- [x] Phase 17: World Coordinate Foundation (2/2 plans) - completed 2026-02-16
- [x] Phase 18: Multi-Chunk Streaming (5/5 plans) - completed 2026-02-16
- [x] Phase 19: Biome Integration (2/2 plans) - completed 2026-02-17
- [x] Phase 20: Testing & Polish (2/2 plans) - completed 2026-02-17

See: `.planning/milestones/v1.4-ROADMAP.md`

</details>

### 🚧 v1.5 Movement Overhaul (In Progress)

**Milestone Goal:** Fix movement accessibility (all tiles reachable via keyboard), unify keyboard and click-to-move speed, and polish movement feel with tile-to-tile animation and smooth camera follow.

**Phases:** 4 (21-24)
**Depth:** Quick (from config)
**Coverage:** 8/8 requirements mapped

#### Phase 21: Server Rate Limit & Speed Unification ✓
**Goal**: Server accepts 150ms movement cadence and both input modes run at identical speed
**Depends on**: Phase 20 (v1.4 complete)
**Requirements**: MOVE-02, MOVE-01
**Status**: Complete (2026-02-17)
**Plans**: 2/2 complete

Plans:
- [x] 21-01-PLAN.md — Reduce server rate limit from 140ms to 125ms
- [x] 21-02-PLAN.md — Extract MOVE_DELAY_MS constant for unified movement timing

#### Phase 22: 8-Directional Input & Pathfinding ✓
**Goal**: All 8 grid directions are reachable by keyboard and click-to-move paths use diagonal steps
**Depends on**: Phase 21 (unified timing established)
**Requirements**: INPUT-01, PATH-01
**Status**: Complete (2026-02-17)
**Plans**: 2/2 complete

Plans:
- [x] 22-01-PLAN.md — Replace else-if input chain with resolveDirection() for 8-directional WASD detection
- [x] 22-02-PLAN.md — Add diagonal neighbors to A* pathfinding with corner-cutting prevention

#### Phase 23: Movement Animation & Camera Polish ✓
**Goal**: Movement looks and feels fluid — sprite glides between tiles, camera follows smoothly, hover artifact removed
**Depends on**: Phase 22 (all 8 directions animate correctly from the start)
**Requirements**: MOVE-03, CAM-02, CAM-01, CAM-03
**Status**: Complete (2026-02-17)
**Plans**: 4/4 complete

Plans:
- [x] 23-01-PLAN.md — Add tile-to-tile tween on prediction path (130ms Linear) and increase reconciliation tween (50ms to 80ms)
- [x] 23-02-PLAN.md — Change camera startFollow lerp from (1, 1) to (0.1, 0.1) — main camera only
- [x] 23-03-PLAN.md — Apply tile movementSpeed property to compute effective moveDelay on client
- [x] 23-04-PLAN.md — Delete HoverController.ts dead code file

#### Phase 24: Zone Boundary Hysteresis
**Goal**: Eliminate chunk loading thrashing when player walks along zone boundaries
**Depends on**: Phase 23 (movement polish complete)
**Requirements**: None (discovered during Phase 23 verification)
**Success Criteria** (what must be TRUE):
  1. Walking back and forth across a zone boundary (e.g., y=63 to y=64) does not trigger constant chunk loading/unloading
  2. "Loading terrain..." indicator does not flash repeatedly at zone boundaries
  3. Movement remains smooth at zone boundaries without jitter
**Plans**: TBD

Plans:
- [ ] 24-01-PLAN.md — Add hysteresis to zone transitions (only transition after N tiles into new zone)

## Progress

**Execution Order:**
Phases execute in numeric order: 21 → 22 → 23 → 24

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
| 19. Biome Integration | v1.4 | 2/2 | Complete | 2026-02-17 |
| 20. Testing & Polish | v1.4 | 2/2 | Complete | 2026-02-17 |
| 21. Server Rate Limit & Speed Unification | v1.5 | 2/2 | Complete | 2026-02-17 |
| 22. 8-Directional Input & Pathfinding | v1.5 | 2/2 | Complete | 2026-02-17 |
| 23. Movement Animation & Camera Polish | v1.5 | 4/4 | Complete | 2026-02-17 |
| 24. Zone Boundary Hysteresis | v1.5 | 0/1 | Planned | - |

**Total:** 24 phases (23 complete, 1 planned)

---
*Last updated: 2026-02-17 after Phase 23 completion and Phase 24 creation*
