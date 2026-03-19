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
- ✅ **v1.29 Hub Station Interiors** - Phases 140-142 (shipped 2026-03-19)
- 🚧 **v1.30 World Rendering & Interaction Fix** - Phases 143-146 (in progress)

## Phases

<details>
<summary>✅ v1.0-v1.26 (Phases 1-130) - SHIPPED</summary>

[All milestone phases completed - see milestone archives in .planning/milestones/]

</details>

---

<details>
<summary>✅ v1.27 Pixel Movement Rewrite (Phases 131-135) - SHIPPED 2026-03-18</summary>

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
  - [x] 131-01-PLAN.md — TDD: pixel-validation module (constants, velocityFromKeys, resolvePixelCollision, validatePixelSpeed)
  - [x] 131-02-PLAN.md — PixelPosition interface, pixel-distance module, barrel exports, build verification

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
  - [x] 132-01-PLAN.md — Wire-format type contracts (PixelMovePayload, positionBatch, positionCorrection events) + bitmaskToKeyState adapter with tests
  - [x] 132-02-PLAN.md — ConnectedPlayer pixel state (px/py/lastPxInputTime), connect/disconnect lifecycle, ZonesService.getChunkSync()
  - [x] 132-03-PLAN.md — MovementService 20Hz tick loop, GameGateway handler, old rate limiter removal

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
  - [x] 133-01-PLAN.md — Shared contracts: px/py on PlayerPublic, canInteractPixel function, FLEE_RADIUS_PX constant
  - [x] 133-02-PLAN.md — Combat, gathering, NPC server migration: ability.service, combat.service, gathering.service, game.gateway pixel distance
  - [x] 133-03-PLAN.md — Creature AI pixel distance: creature-ai.ts FSM + ai.service.ts aggro delay, "!" emission, leash HP heal
  - [x] 133-04-PLAN.md — Client-side distance: zone boundary pixel granularity, target range highlights, NPC proximity

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
**Plans**: 3 plans
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
**Plans**: 2 plans
  - [x] 135-01-PLAN.md — Client-side legacy movement removal (MovementController, PathfindingController, WorldScene, gameStore, socket cleanup)
  - [x] 135-02-PLAN.md — Server-side legacy removal, shared-types cleanup, game-logic cleanup, collision audit

</details>

---

<details>
<summary>✅ v1.28 Post-Movement Polish (Phases 136-139) - SHIPPED 2026-03-18</summary>

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
  - [x] 136-01-PLAN.md — Server-side distance audit: remove stale tile-based canInteract imports, verify all range checks use pixel coordinates
  - [x] 136-02-PLAN.md — Client-side click-to-interact: auto-attack on creature click, auto-gather on resource click, fix range indicator

### Phase 137: Entity Rendering Fix
**Goal**: All entity sprites are visually grounded on their tile surfaces with hitboxes that match what the player sees
**Depends on**: Nothing (independent bug area)
**Requirements**: RENDER-01, RENDER-02, RENDER-03, RENDER-04
**Success Criteria** (what must be TRUE):
  1. Player character and creature sprites touch the tile surface — no visible gap between sprite base and tile top face
  2. Plant and mineral sprites sit at ground level — the base of the sprite touches the tile, not the vertical center
  3. Clicking a creature selects it at the position the sprite appears to occupy — the selection hitbox matches the visual sprite footprint
  4. Entity sprites have no large transparent padding regions that shift the visible art away from the anchor point
**Plans**: 2 plans
  - [x] 137-01-PLAN.md — Entity anchor point and Y-offset fix
  - [x] 137-02-PLAN.md — Sprite trim and hitbox alignment

### Phase 138: Collision Boundary Fix
**Goal**: Players can move freely across chunk and zone boundaries with no invisible walls interrupting movement
**Depends on**: Nothing (independent bug area)
**Requirements**: COLLIDE-01, COLLIDE-02
**Success Criteria** (what must be TRUE):
  1. Walking continuously in any cardinal direction across a chunk boundary produces no stutter, wall, or position correction
  2. Walking into a zone transition area triggers the zone change without the player being stopped by an invisible barrier before the boundary
**Plans**: 2 plans
  - [x] 138-01-PLAN.md — Chunk boundary collision fix
  - [x] 138-02-PLAN.md — Zone boundary collision fix

### Phase 139: Day/Night Brightness Fix
**Goal**: The day/night ColorMatrix produces a brightness curve where night is the darkest period and dusk/dawn are noticeably brighter than night
**Depends on**: Nothing (independent bug area)
**Requirements**: VISUAL-01
**Success Criteria** (what must be TRUE):
  1. At dawn (06:00) and dusk (18:00) the game world is visibly brighter than it is at midnight (00:00)
  2. The day/night brightness transitions smoothly — no abrupt jumps in brightness between cycle phases
**Plans**: 1 plan
  - [x] 139-01-PLAN.md — ColorMatrix brightness curve correction

</details>

---

<details>
<summary>✅ v1.29 Hub Station Interiors (Phases 140-142) - SHIPPED 2026-03-19</summary>

### Phase 140: Biome & Tile Foundation
**Goal**: All four hub biome types exist in the biome registry with faction-correct palettes, and all hub tile types are defined with their properties so downstream phases can reference them
**Depends on**: Nothing (first phase of milestone)
**Requirements**: BIOME-01, BIOME-02, BIOME-03, BIOME-04, TILE-01, TILE-02, TILE-03, TILE-04, TILE-05, TILE-06, TILE-07, TILE-08, SYS-02
**Success Criteria** (what must be TRUE):
  1. Four biome IDs (`canopy_station`, `ironhold_station`, `meridian_station`, `salvage_station`) exist in the biome registry with distinct faction palettes
  2. Eight tile type IDs exist per hub (main floor, wall, door, corridor floor, decoration, accent floor, window wall, hazard/special) — 32 tile definitions total
  3. The biome system correctly maps each hub biome to its tile set
  4. The TypeScript build passes with all new biome and tile definitions in place
**Plans**: 3 plans
  - [x] 140-01-PLAN.md — Register 4 hub biome types in shared-types and world-gen BiomeType records
  - [x] 140-02-PLAN.md — Define 32 hub tile types (8 per hub x 4 hubs) in tiles package
  - [x] 140-03-PLAN.md — Wire hub biomes to hub tile sets and update HUB_CONFIGS

### Phase 141: Rendering & System Upgrade
**Goal**: The procedural tile generator renders all new hub tiles with correct faction palettes and accents, hub zones support 128x128 maps, and hub biomes display their indoor ambient particle effects
**Depends on**: Phase 140
**Requirements**: SYS-01, SYS-03, BIOME-05
**Success Criteria** (what must be TRUE):
  1. All 32 new hub tile types render as procedural isometric cubes with distinguishable faction palettes
  2. Hub zones load and stream 128x128 tile maps without errors
  3. Entering any hub biome zone triggers its ambient particle effect
**Plans**: 3 plans
  - [x] 141-01-PLAN.md — Procedural tile rendering for all 32 hub tiles
  - [x] 141-02-PLAN.md — Hub zone 128x128 map support
  - [x] 141-03-PLAN.md — Indoor ambient particle effects per hub biome

### Phase 142: Hub Maps & Spawn Updates
**Goal**: All four faction hubs display their hand-designed 128x128 interiors with NPCs in lore-correct rooms and portal tiles in docking areas, and all player spawn positions reflect the new layouts
**Depends on**: Phase 141
**Requirements**: MAP-01, MAP-02, MAP-03, MAP-04, MAP-05, MAP-06
**Success Criteria** (what must be TRUE):
  1. All four hub maps load as 128x128 interiors with navigable rooms and blocking walls
  2. Each hub map has NPCs visible in lore-appropriate locations
  3. Each hub map has a portal tile in the docking/entry area that triggers zone travel
  4. Player spawn positions in all four hubs land inside the new layouts
**Plans**: 3 plans
  - [x] 142-01-PLAN.md — Canopy and Ironhold station maps
  - [x] 142-02-PLAN.md — Meridian and Salvage station maps
  - [x] 142-03-PLAN.md — Spawn position updates and portal placement

</details>

---

### 🚧 v1.30 World Rendering & Interaction Fix (In Progress)

**Milestone Goal:** Fix three critical regressions that break normal gameplay — entity sprites sink below ground level, adjacent chunks leave black void gaps, and ability targeting reads the wrong state field so abilities never fire on selected targets. Secondary fixes address portal debounce collision, NPC proximity imprecision, stale debug logs, and a misleading known-issues entry.

## Phase Details

- [ ] **Phase 143: Entity Rendering Fix** - Correct entity Y-positioning so all sprites sit on tile surfaces, not below them
- [ ] **Phase 144: Chunk Loading Fix** - Fix zone:chunk listener cleanup so adjacent chunks load seamlessly with no black void
- [ ] **Phase 145: Ability Targeting Fix** - Fix action bar to read selectedTarget so abilities fire on clicked entities
- [ ] **Phase 146: Secondary Fixes & Cleanup** - Portal debounce, NPC proximity, debug log removal, and known-issues doc correction

### Phase 143: Entity Rendering Fix
**Goal**: Entity sprites sit visually on tile ground surfaces for all entity types — player character, creatures, plants, minerals, and NPCs
**Depends on**: Nothing (independent bug area)
**Requirements**: RENDER-01, RENDER-02
**Success Criteria** (what must be TRUE):
  1. The player character sprite base touches the tile top face — no sinking below ground or floating gap above the surface
  2. Creatures, plants, and minerals all rest on the tile surface they occupy — walking past an entity does not reveal it floating above or sunk into the ground
  3. Depth sorting places the local player at the correct Z-order relative to nearby tall sprites — player does not pop in front of or behind adjacent entities incorrectly
  4. The fix is consistent across all biomes and elevation levels — entities on elevated tiles also sit correctly on the elevated surface
**Plans**: TBD

### Phase 144: Chunk Loading Fix
**Goal**: Adjacent chunks load seamlessly as the player moves through the world — no black void areas appear at chunk boundaries
**Depends on**: Nothing (independent bug area)
**Requirements**: CHUNK-01, CHUNK-02
**Success Criteria** (what must be TRUE):
  1. Walking in any direction through the world never reveals a black void — adjacent chunks load before the player reaches them
  2. After a component remount or WebSocket reconnection, chunk loading continues working — the zone:chunk listener is not silently removed by the cleanup path
  3. Returning to a previously visited area re-renders correctly — chunks are not permanently missing after the first navigation away
**Plans**: TBD

### Phase 145: Ability Targeting Fix
**Goal**: Abilities fired from the action bar hit the entity the player clicked, and gathering starts when clicking a resource node
**Depends on**: Nothing (independent bug area)
**Requirements**: TARGET-01, TARGET-02
**Success Criteria** (what must be TRUE):
  1. Clicking a creature and then pressing an ability keybind fires the ability at that creature — the ability damage event reaches the selected entity, not an empty target
  2. Clicking a resource node starts the gathering mini-game — the range check resolves correctly and the gather sequence begins
  3. Abilities cannot be fired with no target selected — the action bar correctly gates execution when selectedTarget is null
**Plans**: TBD

### Phase 146: Secondary Fixes & Cleanup
**Goal**: Portal debounce works correctly across zone boundaries, NPC proximity uses consistent pixel positioning, debug logs are removed from production code, and PROJECT.md known-issues reflects the real bug
**Depends on**: Nothing (independent bug area)
**Requirements**: MISC-01, MISC-02, MISC-03, MISC-04
**Success Criteria** (what must be TRUE):
  1. Traveling through a portal to a new zone and immediately approaching another portal does not re-trigger the first portal — the debounce key includes the destination zoneId
  2. NPC interaction prompts appear and disappear at the correct proximity — the check uses the same pixel coordinate system as all other range checks
  3. Opening browser DevTools and clicking an entity in the world produces no console.log output from WorldScene entity click handlers
  4. The PROJECT.md known-issues entry for zone:chunk accurately describes the listener cleanup bug, not the absence of zone:request handler
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
| 140. Biome & Tile Foundation | v1.29 | 3/3 | Complete | 2026-03-18 |
| 141. Rendering & System Upgrade | v1.29 | 3/3 | Complete | 2026-03-18 |
| 142. Hub Maps & Spawn Updates | v1.29 | 3/3 | Complete | 2026-03-19 |
| 143. Entity Rendering Fix | v1.30 | 0/? | Not started | - |
| 144. Chunk Loading Fix | v1.30 | 0/? | Not started | - |
| 145. Ability Targeting Fix | v1.30 | 0/? | Not started | - |
| 146. Secondary Fixes & Cleanup | v1.30 | 0/? | Not started | - |

---
*Last updated: 2026-03-19 — v1.30 roadmap created*
