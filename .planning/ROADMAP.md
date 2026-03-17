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
- 🚧 **v1.27 Pixel Movement Rewrite** - Phases 131-135 (in progress)

## Phases

<details>
<summary>✅ v1.0-v1.26 (Phases 1-130) - SHIPPED</summary>

[All milestone phases completed - see milestone archives in .planning/milestones/]

</details>

---

### 🚧 v1.27 Pixel Movement Rewrite (In Progress)

**Milestone Goal:** Replace tile-to-tile movement with free sub-tile pixel movement for a smoother, more immersive feel. Players move continuously via WASD with pixel collision, the server validates positions at 20Hz, all game systems use pixel Euclidean distance, and all legacy tile-step movement code is removed.

## Phase Details

- [x] **Phase 131: Shared Foundation** - Coordinate contract, pixel math modules, and shared constants that every downstream phase depends on (completed 2026-03-17)
- [x] **Phase 132: Server Movement Handler** - Server-authoritative position validation and 20Hz broadcast loop (completed 2026-03-17)
- [ ] **Phase 133: Distance System Migration** - All six game systems migrated from tile distance to pixel Euclidean distance
- [ ] **Phase 134: Client Movement Rewrite** - Velocity-based WASD movement, pixel collision, client prediction, and remote player interpolation
- [ ] **Phase 135: Cleanup and Collision Audit** - Remove all legacy movement code and audit flat blocking tiles

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
**Plans**: TBD

### Phase 135: Cleanup and Collision Audit
**Goal**: All tile-step movement code is removed and the collision map accurately reflects walkable tiles so no invisible walls or phantom blockers remain
**Depends on**: Phase 134
**Requirements**: CLEAN-01, CLEAN-02, CLEAN-03
**Success Criteria** (what must be TRUE):
  1. `MovementController.ts`, `PathfindingController.ts`, and the A* click-to-move handler are deleted — no dead code references remain in `WorldScene`
  2. Clicking on the game world no longer triggers pathfinding or any movement (WASD only)
  3. All tiles that appear flat and at ground level are walkable — no invisible walls from elevated-tile collision flags applied to flat decorative tiles
  4. The TypeScript build passes with no unused imports or missing module errors after the deletions
**Plans**: TBD

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 131. Shared Foundation | 2/2 | Complete    | 2026-03-17 | - |
| 132. Server Movement Handler | 3/3 | Complete    | 2026-03-17 | - |
| 133. Distance System Migration | 1/4 | In Progress|  | - |
| 134. Client Movement Rewrite | v1.27 | 0/TBD | Not started | - |
| 135. Cleanup and Collision Audit | v1.27 | 0/TBD | Not started | - |

---
*Last updated: 2026-03-17 — v1.27 roadmap created*
