---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: World Rendering & Interaction Fix
status: unknown
last_updated: "2026-03-24T09:52:51.978Z"
progress:
  total_phases: 139
  completed_phases: 139
  total_plans: 357
  completed_plans: 357
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-24)

**Core value:** Real-time multiplayer gameplay with responsive movement and visual feedback
**Current focus:** Planning next milestone

## Current Position

Milestone v1.30 completed and archived on 2026-03-24.
Last activity: 2026-03-24 - Completed v1.30 milestone (entity rendering, chunk loading, ability targeting, secondary fixes)

Progress: Milestone complete — ready for next

## Performance Metrics

**Velocity:**
- Total plans completed: 343
- Average duration: — min
- Total execution time: — hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 143 | 1 | 8min | 8min |

*Updated after each plan completion*
| Phase 142-hub-maps-spawn-updates P02 | 0 | 3 tasks | 6 files |
| Phase 142-hub-maps-spawn-updates P01 | 30 | 2 tasks | 5 files |
| Phase 142-hub-maps-spawn-updates P03 | 15 | 3 tasks | 0 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- v1.27: Pixel movement (free sub-tile) replaces tile-to-tile movement
- v1.28: Four independent bug areas fixed (combat, rendering, collision, day/night)
- v1.29: Hub maps expand from 64x64 to 128x128; hand-designed JSON maps for all 4 hubs
- v1.30: Entity Y-fix via +64px offset to container placement (EntityRenderer.ts + WorldScene.ts)
- v1.30: Chunk listener cleanup fix — pass handler reference to gameSocket.off() (GameContainer.tsx)
- v1.30: Ability targeting fix — ActionBar reads selectedTarget not targetEntityId (ActionBar.tsx)
- [Phase 142-hub-maps-spawn-updates]: HUB_CONFIGS use faction-specific tile IDs (CANOPY 30/31, IRONHOLD 38/39, MERIDIAN 46/47, SALVAGE 54/55) not generic world tile IDs
- [Phase 142-hub-maps-spawn-updates]: Neutral faction respawns at hub_neutral (Salvage Station) not hub_nexus (Meridian)
- [Phase 142-hub-maps-spawn-updates]: 128x128 hub maps with faction tile IDs 30-61, portal tile 16 in south docking bay, static JSON from programmatic generator script
- [Phase 142-hub-maps-spawn-updates]: Plans 01 and 02 already correctly integrated the 128x128 hub maps — no additional server changes required for plan 03

### Pending Todos

None.

### Blockers/Concerns

None.

### Quick Tasks Completed

| # | Description | Date | Commit | Status | Directory |
|---|-------------|------|--------|--------|-----------|
| 2 | in new hubs there is no corridor between all rooms, making them not reachable | 2026-03-19 | 21349c0 | | [2-in-new-hubs-there-is-no-corridor-between](./quick/2-in-new-hubs-there-is-no-corridor-between/) |
| 3 | hub tile colors too intense — floors and walls rebalanced to metallic space-station palette | 2026-03-19 | 90e83b9 | | [3-hub-tile-colors-too-intense-floors-and-w](./quick/3-hub-tile-colors-too-intense-floors-and-w/) |
| 4 | player renders on top of wall tiles — removed ENTITY_LAYER_OFFSET, entities now share depth space with tiles | 2026-03-19 | f5b4ab7 | | [4-player-renders-on-top-of-wall-tiles-dept](./quick/4-player-renders-on-top-of-wall-tiles-dept/) |
| 5 | wall collision boxes too small — added createIsometricCollisionCheck wrapping isSolid with south-neighbor elevated-tile check on both client and server | 2026-03-19 | ee264e1 | | [5-wall-collision-boxes-too-small-player-ca](./quick/5-wall-collision-boxes-too-small-player-ca/) |
| 6 | collision-divergence correction — server emits positionCorrection when collision-resolved position differs from client prediction by more than 2px | 2026-03-19 | d512e21 | | [6-client-server-collision-desync-client-pe](./quick/6-client-server-collision-desync-client-pe/) |
| 7 | atmospheric effects not visible — added per-weather-type emit zones so spores/mist/void_energy spawn across full viewport instead of top strip | 2026-03-19 | 9789192 | | [7-atmospheric-effects-are-not-visible-on-t](./quick/7-atmospheric-effects-are-not-visible-on-t/) |
| 8 | fix three bugs: tile transparency at same elevation, NPC click interaction with chat-bubble cursor, isometric collision Y-extension reduced to 1.5x | 2026-03-19 | 4f2d747 | | [8-fix-three-bugs-1-tiles-incorrectly-trans](./quick/8-fix-three-bugs-1-tiles-incorrectly-trans/) |
| 9 | configure Sentry error tracking for api and game-server — @sentry/nestjs with instrument.ts init, SentryModule.forRoot(), SentryGlobalFilter as APP_FILTER | 2026-03-19 | 09cb5b7 | | [9-configure-sentry-error-tracking-for-api-](./quick/9-configure-sentry-error-tracking-for-api-/) |
| 10 | fix entity depth sorting — add ENTITY_GROUND_OFFSET (64) to calculateDepth() so entities sort at visual Y position | 2026-03-19 | ee183c6 | | [10-fix-entity-rendering-features-sinking-pl](./quick/10-fix-entity-rendering-features-sinking-pl/) |
| 11 | fix feature collision position — pixelY threshold filter on entitySolid so collision triggers at visual base (feet-level) not trunk middle (head-level) | 2026-03-20 | e2adfe1 | Needs Review | [11-fix-feature-collision-position-offset-co](./quick/11-fix-feature-collision-position-offset-co/) |
| 12 | fix player sinking — bilinear elevation interpolation in updateLocalPlayerFromPixels and updateRemotePlayerInterpolation eliminates 128 px snap at tile boundaries | 2026-03-20 | b190848 | Verified | [12-fix-player-sinking-issue-mismatch-betwee](./quick/12-fix-player-sinking-issue-mismatch-betwee/) |
| 13 | fix expedition NPC interaction — modal closes immediately on tier select; 4 tier buttons replace 16 biome buttons; server picks random biome from chosen tier | 2026-03-20 | 12c250d | Verified | [13-fix-expedition-npc-close-interaction-win](./quick/13-fix-expedition-npc-close-interaction-win/) |
| 15 | fix 7 bugs — px/py sync in updatePosition fixes NPC/combat/harvest, biome retry loop fixes expedition no destinations, docking bay vendors + hitbox height=16px | 2026-03-20 | 1069bfb | Verified | [15-fix-7-bugs-expedition-no-destinations-np](./quick/15-fix-7-bugs-expedition-no-destinations-np/) |

## Session Continuity

Last session: 2026-03-20
Stopped at: Quick task 15 complete — 7 gameplay bugs fixed (expedition px/py desync, no destinations, merchants near spawn, hitbox height)
Resume file: None
Next action: Plan and execute Phase 145

---
*Last updated: 2026-03-20 — Quick task 15 expedition 7 bugs fix complete*
