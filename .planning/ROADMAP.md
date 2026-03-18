# Roadmap: Into the Void

## Milestones

- ✅ **v1.0 Auth & Character Screens** - Phases 1-3 (shipped 2026-02-14)
- ✅ **v1.1 Post-Login Game Experience** - Phases 4-7 (shipped 2026-02-16)
- ✅ **v1.2 Isometric View** - Phases 8-12 (shipped 2026-02-16)
- ✅ **v1.3 Elevation & Structures** - Phases 13-16 (shipped 2026-02-16)
- ✅ **v1.4 Infinite World & Seamless Chunks** - Phases 17-20 (shipped 2026-02-17)
- ✅ **v1.5 Movement Overhaul** - Phases 21-24 (shipped 2026-02-17)
- ✅ **v1.6 Inventory & Items** - Phases 25-29 (shipped 2026-02-18)
- ✅ **v1.7 Character Stats** - Phases 30-32 (shipped 2026-02-18)
- ✅ **v1.8 Entity System** - Phases 33-38 (shipped 2026-02-19)
- ✅ **v1.9 Combat System** - Phases 39-42 (shipped 2026-02-19)
- ✅ **v1.10 Combat UX** - Phases 43-45 (shipped 2026-02-19)
- ✅ **v1.11 NPCs & Trading** - Phases 46-50 (shipped 2026-02-20)
- ✅ **v1.12 Bug Fixes & Content Polish** - Phases 51-55 (shipped 2026-02-20)
- ✅ **v1.13 Active Combat Abilities** - Phases 56-58 (shipped 2026-02-21)
- ✅ **v1.14 Equipment Stats Overhaul** - Phases 59-63 (shipped 2026-02-21)
- ✅ **v1.15 Quest System** - Phases 64-69 (shipped 2026-02-22)
- ✅ **v1.16 UI Polish** - Phases 70-75 (shipped 2026-02-23)
- ✅ **v1.17 Core Gameplay Loop** - Phases 76-81 (shipped 2026-02-23)
- ✅ **v1.18 Content Expansion** - Phases 82-88 (shipped 2026-02-24)
- ✅ **v1.19 Deployment & CI/CD** - Phases 89-93 (shipped 2026-02-24)
- ✅ **v1.20 World Scale & Action Bar** - Phases 94-98 (shipped 2026-02-26)
- ✅ **v1.21 UI Polish & Audio** - Phases 99-102 (shipped 2026-02-26)
- ✅ **v1.22 In-Game Chat** - Phases 103-107 (shipped 2026-02-26)
- ✅ **v1.23 Content Expansion & Faction Gear** - Phases 108-114 (shipped 2026-03-03)
- ✅ **v1.24 Balance & Automation** - Phases 115-121 (shipped 2026-03-05)
- ✅ **v1.25 Crafting** - Phases 122-125 (shipped 2026-03-06)
- ✅ **v1.26 Visual Overhaul & Atmosphere** - Phases 126-130 (shipped 2026-03-17)
- ✅ **v1.27 Pixel Movement Rewrite** - Phases 131-135 (shipped 2026-03-18)
- ✅ **v1.28 Post-Movement Polish** - Phases 136-139 (shipped 2026-03-18)
- 🚧 **v1.29 Hub Station Interiors** - Phases 140-142 (in progress)

## Phases

<details>
<summary>✅ v1.0-v1.26 (Phases 1-130) - SHIPPED</summary>

[All milestone phases completed - see milestone archives in .planning/milestones/]

</details>

---

### ✅ v1.27 Pixel Movement Rewrite (Complete)

**Milestone Goal:** Replace tile-to-tile movement with free sub-tile pixel movement for a smoother, more immersive feel. Players move continuously via WASD with pixel collision, the server validates positions at 20Hz, all game systems use pixel Euclidean distance, and all legacy tile-step movement code is removed.

## Phase Details

- [x] **Phase 131: Shared Foundation** - Coordinate contract, pixel math modules, and shared constants that every downstream phase depends on (completed 2026-03-17)
- [x] **Phase 132: Server Movement Handler** - Server-authoritative position validation and 20Hz broadcast loop (completed 2026-03-17)
- [x] **Phase 133: Distance System Migration** - All six game systems migrated from tile distance to pixel Euclidean distance (completed 2026-03-17)
- [x] **Phase 134: Client Movement Rewrite** - Velocity-based WASD movement, pixel collision, client prediction, and remote player interpolation (completed 2026-03-18)
- [x] **Phase 135: Cleanup and Collision Audit** - Remove all legacy movement code and audit flat blocking tiles (completed 2026-03-18)

### Phase 131: Shared Foundation
**Goal**: The coordinate contract and pixel math infrastructure is established so all downstream phases compile against a single source of truth
**Depends on**: Nothing (first phase of milestone)
**Requirements**: MOVE-02
**Success Criteria** (what must be TRUE):
  1. A `PixelPosition` interface exists in shared-types with float `px`, `py`, and `zoneId` fields
  2. `pixel-validation.ts` exports `velocityFromKeys`, `resolvePixelCollision`, `validatePixelSpeed`, `PLAYER_SPEED_PX`, and `PLAYER_HITBOX` constants
  3. `pixel-distance.ts` exports `pixelDistanceTo`, `tileToPixelCenter`, `pixelToTile`, and all range constants (`MELEE_RANGE_PX`, `GATHER_RANGE_PX`, `AGGRO_RADIUS_PX`, etc.)
  4. Diagonal movement uses `1/sqrt(2)` normalization — the constant is defined and unit-tested in `pixel-validation.ts`
  5. The TypeScript build passes with no errors after adding the new types and modules
**Plans**: 2 plans
  - [ ] 131-01-PLAN.md — TDD: pixel-validation module (constants, velocityFromKeys, resolvePixelCollision, validatePixelSpeed)
  - [ ] 131-02-PLAN.md — PixelPosition interface, pixel-distance module, barrel exports, build verification

### Phase 132: Server Movement Handler
**Goal**: The server accepts pixel movement input at 20Hz, validates it with a speed cap and collision check, and broadcasts authoritative positions to the zone room
**Depends on**: Phase 131
**Requirements**: SYNC-01, SYNC-02
**Success Criteria** (what must be TRUE):
  1. The server accepts `PixelMovePayload` (key bitmask + predicted px/py + sequence) and rejects moves that exceed the speed cap
  2. The server's old 140ms rate limiter is replaced — positions are validated by velocity/distance, not move-count throttle
  3. The server broadcasts `{playerId, px, py, sequence}` to the zone room at approximately 20Hz (50ms tick)
  4. Player pixel position is stored in memory as floats and converted to tile integers on disconnect (no DB schema change)
**Plans**: 3 plans
  - [ ] 132-01-PLAN.md — Wire-format type contracts (PixelMovePayload, positionBatch, positionCorrection events) + bitmaskToKeyState adapter with tests
  - [ ] 132-02-PLAN.md — ConnectedPlayer pixel state (px/py/lastPxInputTime), connect/disconnect lifecycle, ZonesService.getChunkSync()
  - [ ] 132-03-PLAN.md — MovementService 20Hz tick loop, GameGateway handler, old rate limiter removal

### Phase 133: Distance System Migration
**Goal**: Every game system that performs a range check uses pixel Euclidean distance via `pixelDistanceTo()` — no tile-integer distances remain in active gameplay code
**Depends on**: Phase 131
**Requirements**: DIST-01, DIST-02, DIST-03, DIST-04, DIST-05, DIST-06
**Success Criteria** (what must be TRUE):
  1. A melee weapon can attack a creature at up to `MELEE_RANGE_PX` (144px) away and misses at 145px — verified against pixel position, not tile distance
  2. A player must be within `GATHER_RANGE_PX` (192px) of a node at both gather start and gather completion — walking away mid-gather cancels it
  3. An NPC interaction prompt appears when the player is within `NPC_INTERACT_RANGE_PX` and disappears when they walk out of range
  4. Creature aggro triggers at `AGGRO_RADIUS_PX` (480px) and the creature leashes back at `LEASH_RADIUS_PX` (960px)
  5. Fog of war tiles reveal in a circular radius around the player's pixel position
  6. Zone boundary transitions trigger at the correct pixel-granularity border, not at tile-snapped positions
**Plans**: 4 plans
  - [ ] 133-01-PLAN.md — Shared contracts: px/py on PlayerPublic, canInteractPixel function, FLEE_RADIUS_PX constant
  - [ ] 133-02-PLAN.md — Combat, gathering, NPC server migration: ability.service, combat.service, gathering.service, game.gateway pixel distance
  - [ ] 133-03-PLAN.md — Creature AI pixel distance: creature-ai.ts FSM + ai.service.ts aggro delay, "!" emission, leash HP heal
  - [ ] 133-04-PLAN.md — Client-side distance: zone boundary pixel granularity, target range highlights, NPC proximity

### Phase 134: Client Movement Rewrite
**Goal**: The player moves freely at sub-tile positions via WASD with real-time physics collision, client-side prediction, server reconciliation, and smooth remote player rendering
**Depends on**: Phase 132
**Requirements**: MOVE-01, MOVE-03, MOVE-04, MOVE-05, SYNC-03, SYNC-04
**Success Criteria** (what must be TRUE):
  1. Holding WASD moves the player continuously at pixel granularity with no tile-snap delay or step animation
  2. The player collides with solid tiles via pixel hitbox — walking into a wall stops movement, not passing through or snapping to tile boundaries
  3. The camera follows the player's pixel position smoothly every frame with no stutter or snapping
  4. The player sprite displays a walking animation while keys are held and switches to idle immediately on release, with the correct facing direction for all 8 WASD directions
  5. Local movement feels responsive with no rubber-banding from the player's own position corrections
  6. Other players in the same zone move smoothly between received positions with no teleporting snapshots
**Plans**:
  - [x] 134-01-PLAN.md — PixelMovementController + RemotePlayerInterpolator standalone classes
  - [x] 134-02-PLAN.md — WorldScene + gameStore integration (camera, input, reconciliation, interpolation)
  - [x] 134-03-PLAN.md — ConnectionQualityMonitor + ConnectionIndicator HUD enhancement

### Phase 135: Cleanup and Collision Audit
**Goal**: All tile-step movement code is removed and the collision map accurately reflects walkable tiles so no invisible walls or phantom blockers remain
**Depends on**: Phase 134
**Requirements**: CLEAN-01, CLEAN-02, CLEAN-03
**Success Criteria** (what must be TRUE):
  1. `MovementController.ts`, `PathfindingController.ts`, and the A* click-to-move handler are deleted — no dead code references remain in `WorldScene`
  2. Clicking on the game world no longer triggers pathfinding or any movement (WASD only)
  3. All tiles that appear flat and at ground level are walkable — no invisible walls from elevated-tile collision flags applied to flat decorative tiles
  4. The TypeScript build passes with no unused imports or missing module errors after the deletions
**Plans**:
  - [x] 135-01-PLAN.md -- Client-side legacy movement removal (MovementController, PathfindingController, WorldScene, gameStore, socket cleanup)
  - [x] 135-02-PLAN.md -- Server-side legacy removal, shared-types cleanup, game-logic cleanup, collision audit

---

### ✅ v1.28 Post-Movement Polish (Complete)

**Milestone Goal:** Restore combat, gathering, entity rendering, and movement to correct behavior after the v1.27 pixel movement rewrite introduced regressions. Four independent bug areas — interaction distance checks, entity anchor points, collision boundary walls, and day/night brightness — each fixed in its own phase.

- [x] **Phase 136: Combat & Gathering Fix** - Restore player ability to attack creatures and gather resources using correct pixel distance checks (completed 2026-03-18)
- [x] **Phase 137: Entity Rendering Fix** - Eliminate floating sprites and misaligned hitboxes by correcting entity anchor points and trimming sprite transparent space (completed 2026-03-18)
- [x] **Phase 138: Collision Boundary Fix** - Remove invisible collision walls at chunk and zone boundaries so movement is unobstructed across the world (completed 2026-03-18)
- [x] **Phase 139: Day/Night Brightness Fix** - Correct the ColorMatrix brightness curve so dusk and dawn are visibly brighter than night (completed 2026-03-18)

### Phase 136: Combat & Gathering Fix
**Goal**: Players can attack creatures and gather from resource nodes using pixel Euclidean distance for all range checks
**Depends on**: Nothing (independent bug area)
**Requirements**: INTERACT-01, INTERACT-02, INTERACT-03
**Success Criteria** (what must be TRUE):
  1. Player can click a creature within melee range and the auto-attack loop starts, dealing damage on each tick
  2. Player can click a resource node within gather range and the gathering mini-game starts
  3. Standing outside melee range of a creature and attacking produces no damage — no out-of-range hits land
  4. Both combat and gathering use the same pixel coordinate source for the player position that the movement system uses — no stale tile-integer fallbacks
**Plans**: 2 plans
  - [ ] 136-01-PLAN.md — Server-side distance audit: remove stale tile-based canInteract imports, verify all range checks use pixel coordinates
  - [ ] 136-02-PLAN.md — Client-side click-to-interact: auto-attack on creature click, auto-gather on resource click, fix range indicator

### Phase 137: Entity Rendering Fix
**Goal**: All entity sprites are visually grounded on their tile surfaces with hitboxes that match what the player sees
**Depends on**: Nothing (independent bug area)
**Requirements**: RENDER-01, RENDER-02, RENDER-03, RENDER-04
**Success Criteria** (what must be TRUE):
  1. Player character and creature sprites touch the tile surface — no visible gap between sprite base and tile top face
  2. Plant and mineral sprites sit at ground level — the base of the sprite touches the tile, not the vertical center
  3. Clicking a creature selects it at the position the sprite appears to occupy — the selection hitbox matches the visual sprite footprint
  4. Entity sprites have no large transparent padding regions that shift the visible art away from the anchor point
**Plans**: TBD

### Phase 138: Collision Boundary Fix
**Goal**: Players can move freely across chunk and zone boundaries with no invisible walls interrupting movement
**Depends on**: Nothing (independent bug area)
**Requirements**: COLLIDE-01, COLLIDE-02
**Success Criteria** (what must be TRUE):
  1. Walking continuously in any cardinal direction across a chunk boundary produces no stutter, wall, or position correction
  2. Walking into a zone transition area triggers the zone change without the player being stopped by an invisible barrier before the boundary
**Plans**: TBD

### Phase 139: Day/Night Brightness Fix
**Goal**: The day/night ColorMatrix produces a brightness curve where night is the darkest period and dusk/dawn are noticeably brighter than night
**Depends on**: Nothing (independent bug area)
**Requirements**: VISUAL-01
**Success Criteria** (what must be TRUE):
  1. At dawn (06:00) and dusk (18:00) the game world is visibly brighter than it is at midnight (00:00)
  2. The day/night brightness transitions smoothly — no abrupt jumps in brightness between cycle phases
**Plans**: TBD

---

### 🚧 v1.29 Hub Station Interiors (In Progress)

**Milestone Goal:** Replace plain square hubs with immersive faction-themed space station interiors — unique tiles, biomes, and hand-crafted room layouts for all 4 hubs. Each faction gets a distinct visual identity through a custom biome type, 6-8 purpose-built tiles, and a 128x128 hand-designed map with rooms, corridors, and lore-appropriate NPC placements.

- [x] **Phase 140: Biome & Tile Foundation** - Define the 4 hub biome types, register them in the biome system, and define all 8 tile types per hub in the tile registry (completed 2026-03-18)
- [x] **Phase 141: Rendering & System Upgrade** - Implement procedural tile rendering for all new hub tiles, upgrade the hub zone system to 128x128, and add indoor ambient particles (completed 2026-03-18)
- [ ] **Phase 142: Hub Maps & Spawn Updates** - Build all 4 hand-designed 128x128 hub maps with NPC placements and portal tiles, and update spawn positions

### Phase 140: Biome & Tile Foundation
**Goal**: All four hub biome types exist in the biome registry with faction-correct palettes, and all hub tile types are defined with their properties so downstream phases can reference them
**Depends on**: Nothing (first phase of milestone)
**Requirements**: BIOME-01, BIOME-02, BIOME-03, BIOME-04, TILE-01, TILE-02, TILE-03, TILE-04, TILE-05, TILE-06, TILE-07, TILE-08, SYS-02
**Success Criteria** (what must be TRUE):
  1. Four biome IDs (`canopy_station`, `ironhold_station`, `meridian_station`, `salvage_station`) exist in the biome registry with distinct faction palettes — Canopy is bioluminescent green/blue, Ironhold is industrial gray/rust/orange, Meridian is silver/white/blue, Salvage is patchwork/mixed
  2. Eight tile type IDs exist per hub (main floor, wall, door, corridor floor, decoration, accent floor, window wall, hazard/special) — all four biome sets defined, 32 tile definitions total
  3. The biome system correctly maps each hub biome to its tile set — querying a hub biome returns its specific tile types, not world biome tiles
  4. The TypeScript build passes with all new biome and tile definitions in place — no type errors or missing exports
**Plans**: 3 plans
  - [ ] 140-01-PLAN.md -- Register 4 hub biome types in shared-types and world-gen BiomeType records
  - [ ] 140-02-PLAN.md -- Define 32 hub tile types (8 per hub x 4 hubs) in tiles package
  - [ ] 140-03-PLAN.md -- Wire hub biomes to hub tile sets and update HUB_CONFIGS

### Phase 141: Rendering & System Upgrade
**Goal**: The procedural tile generator renders all new hub tiles with correct faction palettes and accents, hub zones support 128x128 maps, and hub biomes display their indoor ambient particle effects
**Depends on**: Phase 140
**Requirements**: SYS-01, SYS-03, BIOME-05
**Success Criteria** (what must be TRUE):
  1. All 32 new hub tile types render as procedural isometric cubes — each hub's tiles visually match their faction palette with distinguishable accent details between tile types within the same hub
  2. Hub zones load and stream 128x128 tile maps without errors — the system does not truncate or reject maps larger than 64x64
  3. Entering any hub biome zone triggers its ambient particle effect (Canopy: spores, Ironhold: steam, Meridian: holo-dust, Salvage: smoke wisps) — particles appear and cross-fade correctly with the weather system
**Plans**: 3 plans
  - [ ] 141-01-PLAN.md — Procedural tile rendering for all 32 hub tiles (palettes, accents, TileId enum, TILE_TEXTURE_MAP)
  - [ ] 141-02-PLAN.md — Hub zone 128x128 map support (HUB_ZONE_SIZE, dynamic renderChunk, hub generation fallback)
  - [ ] 141-03-PLAN.md — Indoor ambient particle effects per hub biome (unique particles, constant density, no day/night)

### Phase 142: Hub Maps & Spawn Updates
**Goal**: All four faction hubs display their hand-designed 128x128 interiors with NPCs in lore-correct rooms and portal tiles in docking areas, and all player spawn positions reflect the new layouts
**Depends on**: Phase 141
**Requirements**: MAP-01, MAP-02, MAP-03, MAP-04, MAP-05, MAP-06, SYS-04, SYS-05
**Success Criteria** (what must be TRUE):
  1. Entering Canopy Station loads a 128x128 map with organic room shapes, vine-themed corridors, and a central atrium area — rooms are navigable and walls block movement correctly
  2. Entering Ironhold Station loads a 128x128 map with forge halls, metal corridors, and warren-style sub-rooms — rooms are navigable and walls block movement correctly
  3. Entering Meridian Station loads a 128x128 map with a trading floor, glass-style corridors, and an archive area — rooms are navigable and walls block movement correctly
  4. Entering Salvage Station loads a 128x128 map with a cargo bay, patched corridors, and a market area — rooms are navigable and walls block movement correctly
  5. Each hub map has NPCs visible in lore-appropriate locations — traders appear in trading areas, guards at entrances, service NPCs in their designated rooms
  6. Each hub map has a portal tile in the docking/entry area — interacting with it triggers zone travel
  7. Unaffiliated players who die or recall home spawn at Salvage Station, not Meridian Station
  8. Player spawn positions in all four hubs land inside the new layouts — no spawning inside walls or outside the map boundary
**Plans**: TBD

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 131. Shared Foundation | v1.27 | 2/2 | Complete | 2026-03-17 |
| 132. Server Movement Handler | v1.27 | 3/3 | Complete | 2026-03-17 |
| 133. Distance System Migration | v1.27 | 5/5 | Complete | 2026-03-17 |
| 134. Client Movement Rewrite | v1.27 | 3/3 | Complete | 2026-03-18 |
| 135. Cleanup and Collision Audit | v1.27 | 2/2 | Complete | 2026-03-18 |
| 136. Combat & Gathering Fix | v1.28 | 2/2 | Complete | 2026-03-18 |
| 137. Entity Rendering Fix | v1.28 | 2/2 | Complete | 2026-03-18 |
| 138. Collision Boundary Fix | v1.28 | 2/2 | Complete | 2026-03-18 |
| 139. Day/Night Brightness Fix | v1.28 | 1/1 | Complete | 2026-03-18 |
| 140. Biome & Tile Foundation | v1.29 | Complete    | 2026-03-18 | - |
| 141. Rendering & System Upgrade | v1.29 | Complete    | 2026-03-18 | - |
| 142. Hub Maps & Spawn Updates | v1.29 | 0/? | Not started | - |

---
*Last updated: 2026-03-18 — v1.29 roadmap created*
