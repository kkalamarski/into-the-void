---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: Pixel Movement Rewrite
status: unknown
last_updated: "2026-03-17T23:44:54.950Z"
progress:
  total_phases: 126
  completed_phases: 126
  total_plans: 331
  completed_plans: 331
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-17)

**Core value:** Real-time multiplayer gameplay with responsive movement and visual feedback
**Current focus:** Phase 133 — Distance System Migration

## Current Position

Phase: 133 of 135 (Distance System Migration)
Plan: 5 of 5 in current phase complete
Status: Phase 133 complete — all 5 plans done (pixel contracts, server migration, AI service, client WorldScene/TargetHighlight, gap closure for artifact/Precision Shot/Pack Call)
Last activity: 2026-03-18 — Completed 133-05 (gap closure: pixel distance for artifact collection, Precision Shot reveal, Pack Call)

Progress: [████░░░░░░] 40%

## Performance Metrics

**Velocity:**
- Total plans completed: 2
- Average duration: ~2.5 min
- Total execution time: ~5 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 131-01 | 1 | 2 min | 2 min |
| 131-02 | 2 | 3 min | 3 min |

*Updated after each plan completion*
| Phase 132 P02 | 2 | 2 tasks | 2 files |
| Phase 132-01 P01 | 9 | 2 tasks | 3 files |
| Phase 132-03 P03 | 2 | 2 tasks | 4 files |
| Phase 133 P01 | 1 | 2 tasks | 4 files |
| Phase 133 P02 | 5 | 2 tasks | 5 files |
| Phase 133 P04 | 8 | 2 tasks | 3 files |
| Phase 133 P03 | 4 | 2 tasks | 2 files |
| Phase 133 P05 | 5 | 2 tasks | 3 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- v1.27 planning: Pixel movement (free sub-tile) replaces tile-to-tile movement
- v1.27 planning: Drop click-to-move and A* pathfinding entirely (WASD only)
- v1.27 planning: Soft-authority server — speed cap + one collision sweep, not full physics simulation
- v1.27 planning: No DB schema migration — pixel-to-tile on disconnect, tile-center to pixel on connect
- v1.27 planning: Creatures stay tile-snapped in v1.27; pixel creature movement deferred to v1.28+
- 131-01: TILE_SIZE_PX=128 matches ISO_TILE_WIDTH/2 = tileWidthHalf from IsometricTransform
- 131-01: PLAYER_SPEED_PX=TILE_SIZE_PX (128 px/s) — 1.0s per tile, deliberate survival MMO pace
- 131-01: PLAYER_HITBOX 64x64 (0.5 * TILE_SIZE_PX) anchored at feet (bottom-center)
- 131-01: Wall sliding via separate X/Y collision passes (not dead-stop on diagonal)
- 131-01: validatePixelSpeed uses 10% jitter tolerance without enabling speed hacks
- [Phase 131-02]: PixelPosition uses px/py field names to prevent type confusion with tile-based Position interface
- [Phase 131-02]: tileToPixelCenter uses (tileIndex + 0.5) * TILE_SIZE_PX — tile (0,0) center at (64,64)
- [Phase 131-02]: Range constants defined as TILE_SIZE_PX multiples so they auto-scale if tile size changes
- [Phase 131-02]: NPC_INTERACT_RANGE_PX aliased to GATHER_RANGE_PX (192px) — consistent interaction distance across gathering and dialogue
- [Phase 132]: Pixel state (px/py/lastPxInputTime) stored in-memory only on ConnectedPlayer; no DB schema change needed
- [Phase 132]: handleDisconnect converts px/py via pixelToTile before updateCharacterPosition DB write
- [Phase 132]: getChunkSync returns undefined if zone not cached; callers skip validation that tick rather than blocking
- [Phase 132-01]: bitmask W=1/A=2/S=4/D=8 convention matches client-side for consistent wire format
- [Phase 132-01]: bitmaskToKeyState placed in pixel-validation.ts — bridges wire bitmask to KeyState used by velocityFromKeys
- [Phase 132-01]: Old player:move event kept alongside player:pixelMove until Phase 135 cleanup
- [Phase 132-03]: TICK_MS=50 (20Hz) for MovementService tick loop; MAX_DT=0.2s cap; BROADCAST_RADIUS_PX=1536 (12 tiles) for positionBatch
- [Phase 132-03]: queueInput overwrites previous unprocessed input — only latest key state per tick, no backlog
- [Phase 132-03]: Old 140ms rate limiter fully removed — lastMoveTimes, getLastMoveTime(), setLastMoveTime() deleted from PlayerService
- [Phase 133]: canInteractPixel does not check zone equality — callers pre-validate zone match before calling
- [Phase 133]: FLEE_RADIUS_PX = 5.0 * TILE_SIZE_PX (640px) mirrors old tile-based FLEE_RADIUS = 5
- [Phase 133]: px/py added as required fields on PlayerPublic so downstream AI/combat plans always have pixel coords
- [Phase 133]: Ability tile range converted to pixels at callsite (ability.range * TILE_SIZE_PX) to preserve AbilityDefinition schema compatibility
- [Phase 133]: cancelIfOutOfRange uses client-predicted position for immediate responsiveness in gather cancel
- [Phase 133]: getZoneBoundaryDepth (tile-based) kept alongside getZoneBoundaryDepthPx — Phase 135 cleanup will remove old method
- [Phase 133]: HYSTERESIS_PX = HYSTERESIS_TILES * TILE_SIZE_PX = 384px replaces tile integer threshold for zone transitions
- [Phase 133]: Target ring alpha-dimming (OUT_OF_RANGE_ALPHA=0.3) preserves behavior-tier color while conveying out-of-range state
- [Phase 133]: nearestNpcInRange field gates npc:interact proximity check; full prompt UI deferred to Phase 134/135
- [Phase 133]: 0.5s aggro delay with creature:aggro_detected '\!' emission; full HP heal on leash prevents kiting; pendingAggro stores zoneId for targeted cleanup; immediate aggro (zone join) bypasses delay for responsiveness
- [Phase 133]: canInteractPixel uses GATHER_RANGE_PX (192px) instead of toolRange for uniform artifact/gather interaction radius
- [Phase 133]: PACK_CALL_RANGE_PX = 10 * TILE_SIZE_PX (1280px) preserves 10-tile radius semantically in pixel space

### Pending Todos

None.

### Blockers/Concerns

- Rate limiter: RESOLVED — 140ms gate removed in Phase 132-03; MovementService 20Hz loop is live
- Coordinate unit ambiguity: RESOLVED — verified no integer-coercion of px/py floats in pixel-distance.ts (only Math.floor in pixelToTile, which is intentional)

## Session Continuity

Last session: 2026-03-18
Stopped at: Completed 133-05-PLAN.md (gap closure: pixel distance for artifact collection, Precision Shot reveal, Pack Call)
Resume file: None
Next action: Execute Phase 134 (client movement rewrite)

---
*Last updated: 2026-03-18 — Completed 133-05 gap closure (entity.service canInteractPixel, ability.service Precision Shot, combat.service Pack Call)*
