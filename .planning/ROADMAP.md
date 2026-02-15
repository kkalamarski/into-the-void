# Roadmap: Into the Void

## Milestones

- v1.0 Auth & Character Screens - Phases 1-3 (shipped 2026-02-14)
- v1.1 Post-Login Game Experience - Phases 4-7 (in progress)

## Phases

<details>
<summary>v1.0 Auth & Character Screens (Phases 1-3) - SHIPPED 2026-02-14</summary>

### Phase 1: Authentication & Navigation
**Goal**: Players can register, log in, and authenticate with JWT tokens
**Plans**: 3 plans

Plans:
- [x] 01-01: Authentication infrastructure (Zustand + localStorage)
- [x] 01-02: Login & Registration screens
- [x] 01-03: Protected routing with React Router v7

### Phase 2: Character Selection
**Goal**: Players can view and select existing characters
**Plans**: 2 plans

Plans:
- [x] 02-01: Character selection screen with visual cards
- [x] 02-02: Integration with game transition

### Phase 3: Character Creation
**Goal**: Players can create new characters with faction selection
**Plans**: 2 plans

Plans:
- [x] 03-01: Character creation screen with faction selection
- [x] 03-02: Full flow testing and lore alignment

</details>

### v1.1 Post-Login Game Experience (In Progress)

**Milestone Goal:** After selecting a character, the player appears in the game world and can play.

#### Phase 4: WebSocket Connection & Auth Handshake
**Goal**: Secure WebSocket connection with authenticated character in game world
**Depends on**: Phase 3 (auth flow)
**Requirements**: NET-01 (connect), NET-02 (receive initial state), NET-05 (disconnect handling)
**Scope**: Connection infrastructure, auth handshake, initial state loading only. NET-03 (send actions), NET-04 (real-time updates), NET-06 (position reconciliation) deferred to Phase 6 (Movement System).
**Success Criteria** (what must be TRUE):
  1. Player connects to WebSocket with JWT token and characterId after character selection
  2. Player receives initial game state (position, zone data, entities) from server via zone:state event
  3. Connection shows "reconnecting" UI on disconnect and restores state on reconnect
  4. Server validates auth and returns player data including spawn position (last saved position)
**Plans**: 5 plans
**Completed**: 2026-02-14

Plans:
- [x] 04-01-PLAN.md — Server-side auth timeout, error codes, ping handler
- [x] 04-02-PLAN.md — Client socket auth timeout, latency tracking
- [x] 04-03-PLAN.md — LoadingScreen and ConnectionIndicator components
- [x] 04-04-PLAN.md — ErrorModal and ReconnectOverlay components
- [x] 04-05-PLAN.md — GameScreen connection flow integration + zone:state listener

#### Phase 5: Phaser Integration & World Rendering
**Goal**: Game world renders with color-coded tiles and smooth camera
**Depends on**: Phase 4
**Requirements**: REND-01, REND-02, REND-03, REND-04, REND-05
**Success Criteria** (what must be TRUE):
  1. World renders as color-coded tiles (walkable, blocking, water, acid, lava biomes)
  2. Only visible tiles render (viewport culling works, performance smooth)
  3. Zone name displays with tier indicator and color (Tier I=green, IV=red)
  4. Chunks load as player approaches zone boundaries and unload when distant
  5. Camera follows player smoothly without jarring jumps
**Plans**: 5 plans
**Completed**: 2026-02-14

Plans:
- [x] 05-01-PLAN.md — Biome tile textures and TileRenderer utility
- [x] 05-02-PLAN.md — Viewport culling and ZoneHUD display
- [x] 05-03-PLAN.md — ChunkManager for chunk loading/unloading
- [x] 05-04-PLAN.md — React-Phaser integration and zone:state wiring
- [x] 05-05-PLAN.md — Human verification checkpoint

#### Phase 6: Movement System
**Goal**: Player moves responsively with keyboard and click-to-move
**Depends on**: Phase 5
**Requirements**: MOV-01, MOV-02, MOV-03, MOV-04, NET-03 (send actions), NET-04 (receive updates), NET-06 (position reconciliation)
**Success Criteria** (what must be TRUE):
  1. Player moves with WASD or arrow keys with immediate visual feedback
  2. Player moves to clicked location using pathfinding
  3. Movement feels instant (client-side prediction works)
  4. Player cannot walk through walls or into invalid tiles (server validation corrects if needed)
  5. Client sends movement actions to server (NET-03)
  6. Client receives real-time position updates from server (NET-04)
  7. Client reconciles position mismatches with server authority (NET-06)
**Plans**: 5 plans
**Completed**: 2026-02-15

Plans:
- [x] 06-01-PLAN.md — MovementController with client-side prediction
- [x] 06-02-PLAN.md — Server-side sequence tracking and rate limiting
- [x] 06-03-PLAN.md — PathfindingController for click-to-move
- [x] 06-04-PLAN.md — Server reconciliation and collision map sync
- [x] 06-05-PLAN.md — Human verification checkpoint

#### Phase 7: Entities & HUD
**Goal**: Players see other entities and have HUD with health/energy/zone info
**Depends on**: Phase 6
**Requirements**: ENT-01, ENT-02, ENT-03, ENT-04, ENT-05, HUD-01, HUD-02, HUD-03, HUD-04
**Success Criteria** (what must be TRUE):
  1. Other players appear in world as colored tiles and move smoothly
  2. Entities (creatures, items, plants) appear as colored tiles by type
  3. Damaged entities show health bars above them
  4. Creatures display behavioral icons (Herbivore/Omnivore/Predator/Maniac)
  5. HUD displays player health bar, energy bar, zone name with tier, and minimap
**Plans**: 5 plans

Plans:
- [ ] 07-01-PLAN.md — EntityRenderer with health bars and behavior icons
- [ ] 07-02-PLAN.md — Entity and player socket event handlers
- [ ] 07-03-PLAN.md — HUD energy bar and entity registry
- [ ] 07-04-PLAN.md — Minimap with player position and biome colors
- [ ] 07-05-PLAN.md — Human verification checkpoint

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Authentication & Navigation | v1.0 | 3/3 | Complete | 2026-02-13 |
| 2. Character Selection | v1.0 | 2/2 | Complete | 2026-02-14 |
| 3. Character Creation | v1.0 | 2/2 | Complete | 2026-02-14 |
| 4. WebSocket Connection & Auth Handshake | v1.1 | 5/5 | Complete | 2026-02-14 |
| 5. Phaser Integration & World Rendering | v1.1 | 5/5 | Complete | 2026-02-14 |
| 6. Movement System | v1.1 | 5/5 | Complete | 2026-02-15 |
| 7. Entities & HUD | v1.1 | 0/5 | Not started | - |
