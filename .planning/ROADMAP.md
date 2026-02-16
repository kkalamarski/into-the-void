# Roadmap: Into the Void

## Milestones

- ✅ **v1.0 Auth & Character Screens** — Phases 1-3 (shipped 2026-02-14)
- ✅ **v1.1 Post-Login Game Experience** — Phases 4-7 (shipped 2026-02-16)
- ✅ **v1.2 Isometric View** — Phases 8-12 (shipped 2026-02-16)
- 🚧 **v1.3 Elevation & Structures** — Phases 13-16 (in progress)

## Phases

<details>
<summary>✅ v1.0 Auth & Character Screens (Phases 1-3) — SHIPPED 2026-02-14</summary>

- [x] Phase 1: Authentication & Navigation (3/3 plans) — completed 2026-02-13
- [x] Phase 2: Character Selection (2/2 plans) — completed 2026-02-14
- [x] Phase 3: Character Creation (2/2 plans) — completed 2026-02-14

See: `.planning/milestones/v1.0-ROADMAP.md`

</details>

<details>
<summary>✅ v1.1 Post-Login Game Experience (Phases 4-7) — SHIPPED 2026-02-16</summary>

- [x] Phase 4: WebSocket Connection & Auth Handshake (5/5 plans) — completed 2026-02-14
- [x] Phase 5: Phaser Integration & World Rendering (5/5 plans) — completed 2026-02-14
- [x] Phase 6: Movement System (5/5 plans) — completed 2026-02-15
- [x] Phase 7: Entities & HUD (5/5 plans) — completed 2026-02-16

See: `.planning/milestones/v1.1-ROADMAP.md`

</details>

<details>
<summary>✅ v1.2 Isometric View (Phases 8-12) — SHIPPED 2026-02-16</summary>

#### Phase 8: Core Isometric Transformation
**Goal**: Game renders in isometric diamond view with proper depth sorting
**Depends on**: Phase 7
**Requirements**: CORE-01, CORE-02, CORE-03, CORE-04, CORE-05, CORE-06, REND-01, REND-04
**Success Criteria** (what must be TRUE):
  1. Tiles render as isometric diamonds with 2:1 aspect ratio (128x64 per user decision)
  2. Player sprite positions correctly on tile center without offset drift
  3. Entities sort by depth with no visible z-fighting or flickering
  4. Adjacent chunk tiles align seamlessly at boundaries
**Plans**: 3 plans

Plans:
- [x] 08-01-PLAN.md — Create IsometricTransform utility and update TileRenderer
- [x] 08-02-PLAN.md — Update EntityRenderer with shadows and create DepthSorter
- [x] 08-03-PLAN.md — Integrate isometric rendering in WorldScene with viewport culling

#### Phase 9: Rendering Optimization & Interaction
**Goal**: WASD controls feel natural in isometric space and pathfinding shows visual feedback
**Depends on**: Phase 8
**Requirements**: MOVE-01, MOVE-02, MOVE-03, MOVE-04, REND-02, REND-03
**Success Criteria** (what must be TRUE):
  1. WASD controls use screen-relative directions (W moves NW, S moves SE)
  2. Click-to-move detects correct tile under mouse cursor
  3. Pathfinding visual path displays correctly on isometric grid
  4. Camera follows player with correct isometric centering
**Plans**: 2 plans

Plans:
- [x] 09-01-PLAN.md — Remap WASD to screen-relative diagonal directions
- [x] 09-02-PLAN.md — Add pathfinding path visualization using Graphics API

#### Phase 10: Multiplayer Integration
**Goal**: Remote players and entities render correctly with position sync
**Depends on**: Phase 9
**Requirements**: MULT-01, MULT-02, MULT-03, MULT-04
**Success Criteria** (what must be TRUE):
  1. Remote players appear at correct isometric positions matching local client
  2. Remote player movement animates smoothly without rubber-banding
  3. Position sync maintains accuracy with network latency (100ms+)
  4. All clients show entities in same relative positions
**Plans**: 1 plan

Plans:
- [x] 10-01-PLAN.md — Integrate remote players into depth sorting system

#### Phase 11: UI Integration
**Goal**: HUD elements adapt to isometric view without breaking
**Depends on**: Phase 10
**Requirements**: UI-01, UI-02, UI-03, UI-04, UI-05
**Success Criteria** (what must be TRUE):
  1. Minimap displays player position correctly (orthogonal view)
  2. Health bars position above entities at correct Y-offset for isometric height
  3. Behavior icons (H/O/P/M) position correctly above health bars
  4. Zone HUD displays unchanged from v1.1
**Plans**: 1 plan

Plans:
- [x] 11-01-PLAN.md — Fix MinimapCamera coordinates and verify UI integration

#### Phase 12: Polish
**Goal**: Visual feedback and hover interactions enhance isometric experience
**Depends on**: Phase 11
**Requirements**: PLSH-01, PLSH-02, PLSH-03
**Success Criteria** (what must be TRUE):
  1. Tiles highlight on mouse hover showing selectable area
  2. Click target shows visual feedback before pathfinding starts
  3. Entities highlight on hover for selection feedback
**Plans**: 1 plan

Plans:
- [x] 12-01-PLAN.md — Add HoverController with tile hover, click markers, and entity hover feedback

</details>

### 🚧 v1.3 Elevation & Structures (In Progress)

**Milestone Goal:** Add vertical dimension to the world with terrain elevation, structure walls, and a scalable tile definition system.

- [x] **Phase 13: Tile Definition Architecture** — Foundation for elevation system (completed 2026-02-16)
- [x] **Phase 14: Elevation System Core** — Data generation and depth sorting (completed 2026-02-16)
- [x] **Phase 15: Elevation Rendering** — Side-faces and visual appearance (completed 2026-02-16)
- [ ] **Phase 16: Structure Walls & Pathfinding** — Gameplay integration

## Phase Details

### Phase 13: Tile Definition Architecture
**Goal**: Establish scalable tile system with elevation metadata
**Depends on**: Phase 12 (depth sorting foundation exists)
**Requirements**: TILE-01, TILE-02, TILE-03, TILE-04, TILE-05, TILE-06
**Success Criteria** (what must be TRUE):
  1. TileDefinition interface exists with id, displayName, movementSpeed, isBlocking, elevation properties
  2. All 16 existing tile types migrated to TileDefinition registry with type-safe lookups
  3. ChunkData schema extended with heights[][] and structures[] arrays
  4. Server generates and serializes new chunk fields without breaking existing clients
  5. Tile hooks system supports onStep, onClick, onEnter, onExit, onTick for future extensibility
**Plans**: 3 plans

Plans:
- [x] 13-01-PLAN.md — Create @into-the-void/tiles package with TileDefinition interface and TileRegistry
- [x] 13-02-PLAN.md — Define all 16 tile types and extend ChunkData with heights/structures
- [x] 13-03-PLAN.md — Integrate tiles package into world-gen with heights generation

### Phase 14: Elevation System Core
**Goal**: Generate and flow elevation data through the system with composite depth sorting
**Depends on**: Phase 13 (TileDefinition registry and ChunkData schema exist)
**Requirements**: ELEV-01, ELEV-02, ELEV-05, RENDER-01
**Success Criteria** (what must be TRUE):
  1. Tiles have height levels 0-5 generated via noise in world-gen
  2. Biome-specific elevation ranges enforced (e.g., craters 0-2, ruins 0-5)
  3. Depth sorting includes elevation in composite calculation (screenY + elevation × weight)
  4. Elevation data flows from server world-gen through ChunkData to client without errors
**Plans**: 2 plans

Plans:
- [x] 14-01-PLAN.md — Add noise-based height generation with biome-specific ranges
- [x] 14-02-PLAN.md — Update depth sorting to include elevation component

### Phase 15: Elevation Rendering
**Goal**: Terrain elevation appears visually with side-face rendering
**Depends on**: Phase 14 (elevation data flowing, depth calculation correct)
**Requirements**: ELEV-03, ELEV-04, RENDER-02, RENDER-05
**Success Criteria** (what must be TRUE):
  1. Side faces render for elevation differences with classic isometric look
  2. Side-face visibility culling implemented (only render south/east faces, check neighbor occlusion)
  3. Entities on elevated terrain render at correct depth above tiles
  4. Viewport culling accounts for tall structures with expanded bounds
  5. Visual elevation differences are clear and performance is maintained
**Plans**: 2 plans

Plans:
- [x] 15-01-PLAN.md — Add side-face rendering to TileRenderer with neighbor-based culling
- [x] 15-02-PLAN.md — Wire entity elevation offset and expand viewport culling bounds

### Phase 16: Structure Walls & Pathfinding
**Goal**: Elevation affects player movement and pathfinding
**Depends on**: Phase 15 (elevation rendering works, elevation visible)
**Requirements**: STRUCT-01, STRUCT-02, STRUCT-03, STRUCT-04, MOVE-01, MOVE-02, MOVE-03, MOVE-04, MOVE-05, RENDER-03, RENDER-04
**Success Criteria** (what must be TRUE):
  1. Wall tiles defined with variable height by type and all walls block movement
  2. 1-level elevation difference is walkable, 2+ level difference blocks movement
  3. A* pathfinding includes elevation cost penalty and prefers flat routes over climbing
  4. Click detection accounts for elevation offset (clicks on elevated terrain work correctly)
  5. Structure walls render with side faces and appear on minimap as distinct markers
  6. Tall objects hide entities behind them (full occlusion)
**Plans**: 5 plans

Plans:
- [ ] 16-01-PLAN.md — Add elevation-based movement validation and pathfinding costs
- [ ] 16-02-PLAN.md — Implement elevation-aware click detection
- [ ] 16-03-PLAN.md — Create procedural wall generation in world-gen
- [ ] 16-04-PLAN.md — Render structure walls and add minimap markers
- [ ] 16-05-PLAN.md — Implement depth-based entity occlusion

## Progress

**Execution Order:**
Phases execute in numeric order: 13 → 14 → 15 → 16

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
| 16. Structure Walls & Pathfinding | v1.3 | 0/5 | Planned | - |

**Total:** 16 phases (15 complete, 1 planned)

---
*Last updated: 2026-02-16 after Phase 16 planning complete*
