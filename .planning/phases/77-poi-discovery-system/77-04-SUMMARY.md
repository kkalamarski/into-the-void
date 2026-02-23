---
phase: 77-poi-discovery-system
plan: 04
subsystem: web-client
tags: [rendering, poi, discovery, fog-integration]
completed: 2026-02-23

# Dependency graph
requires:
  - 77-03 (Server Discovery Service and WebSocket Integration)
  - fog-renderer (FogRenderer for visibility sync)
  - isometric-transform (IsometricTransform for coordinate conversion)
provides:
  - Client-side POI icon rendering
  - POI discovery detection on player movement
  - POI visibility sync with fog of war
affects:
  - All chunks with POIs (visual rendering)
  - Player movement (discovery detection)

# Tech stack
added:
  - PoiRenderer class with pulsing animation system
  - POI fallback textures (anomaly, cache, landmark)
  - WebSocket event handlers (poi:discovered, poi:already_discovered)
patterns:
  - Pulsing animation for undiscovered POIs (alpha 1.0-0.6, scale 1.5-1.7)
  - Fade-to-discovered transition (500ms to 50% alpha)
  - Fog-aware visibility (POIs only visible if tile revealed)
  - Discovery detection in movement prediction path (non-reconciling)

# Key files
created:
  - apps/web/src/game/pois/PoiRenderer.ts (POI rendering and animation)
modified:
  - apps/web/src/game/scenes/PreloadScene.ts (POI fallback textures)
  - apps/web/src/game/scenes/WorldScene.ts (PoiRenderer integration)

# Key decisions
decisions:
  - POI depth 800-900 (above terrain ~100-200, below fog ~1000)
  - Pulsing only for undiscovered POIs (discovered are static at 50% alpha)
  - Discovery emitted only during prediction (not reconciliation) to avoid duplicates
  - Texture fallback chain: primary -> type_fallback -> cache_fallback (defensive)
  - POI visibility synced with fog state (hidden in unexplored areas)
  - Star pattern for anomaly uses fillPoints with calculated polygon (5-pointed)

# Metrics
duration: 194
tasks_completed: 3
files_created: 1
files_modified: 2
---

# Phase 77 Plan 04: Client POI Rendering and Discovery Detection Summary

**One-liner:** Client-side POI icon rendering with pulsing animations, fog-aware visibility, and discovery detection on player movement

## Implementation Overview

Created the client-side visualization layer for the POI discovery system, including procedural fallback textures, animated POI icons, and discovery detection integrated with player movement.

### What Was Built

**1. POI Fallback Textures (PreloadScene.ts):**
- Anomaly: Purple circle with 5-pointed white star (procedural polygon)
- Cache: Gold chest with darker outline and lid accent
- Landmark: Blue triangle beacon with white highlight circle
- All textures 64x64 for consistent scaling
- Created in createPoiFallbackTextures() method

**2. PoiRenderer Class (apps/web/src/game/pois/PoiRenderer.ts):**
- `createPoisForChunk()`: Render POI icons for chunk with discovery state
- Pulsing animation system:
  - Alpha transition: 1.0 -> 0.6 (yoyo, infinite repeat)
  - Scale transition: 1.5 -> 1.7 (yoyo, infinite repeat)
  - Duration: 1200ms with Sine.easeInOut
- `markDiscovered()`: Stop pulsing, fade to 50% alpha over 500ms
- `checkPlayerOnPoi()`: Detect player position on undiscovered POI tile
- `updateVisibility()`: Sync POI visibility with fog revealed tiles
- `removePoisForChunk()`: Cleanup on chunk unload
- POI sprites positioned at world coordinates with depth 800 + worldY

**3. WorldScene Integration:**
- Initialize PoiRenderer after fog renderer in create()
- Socket listeners:
  - `poi:discovered_ids`: Load initial discovered set from server
  - `poi:discovered`: Mark POI as discovered and show reward
  - `poi:already_discovered`: Handle duplicate discovery attempts
- Chunk rendering: Call `createPoisForChunk()` when POIs present
- Discovery detection in `updateLocalPlayerSprite()`:
  - Only during prediction (not reconciliation) to avoid duplicates
  - Only if tile is revealed (fog check)
  - Emit `poi:discover` with poiId and world coordinates
- Cleanup in shutdown(): Destroy renderer and clear discovered set

### Technical Approach

**POI Rendering Pipeline:**
1. Server sends chunk data with pois[] array
2. WorldScene renders chunk tiles
3. PoiRenderer creates sprites for each POI with discovery state
4. Undiscovered POIs pulse with animation
5. Discovered POIs render at 50% alpha (static)

**Discovery Detection Flow:**
1. Player moves to new tile (prediction path)
2. Fog revealed at new position
3. Check if POI exists at world coordinates
4. If undiscovered POI found, emit poi:discover to server
5. Server validates and responds with poi:discovered
6. PoiRenderer fades POI to discovered state

**Fog Integration:**
- POIs only visible if their tile is revealed in fog
- Uses `fogManager.getAllRevealedTiles()` for visibility set
- POIs hidden in unexplored areas (fog intact)
- Visibility updated via `updateVisibility()` method

**Texture Fallback Chain:**
1. Primary: `poi_${type}` (e.g., poi_anomaly from sprite file)
2. Fallback: `poi_${type}_fallback` (procedural texture)
3. Ultimate fallback: `poi_cache_fallback` (defensive, always exists)

### Verification Results

**TypeScript Compilation:**
- apps/web/tsconfig.json: PASS (all 3 tasks)

**Integration Checks:**
- PoiRenderer import and initialization: VERIFIED
- Socket listeners (poi:discovered_ids, poi:discovered, poi:already_discovered): VERIFIED
- Discovery emit (poi:discover): VERIFIED
- Chunk rendering integration: VERIFIED
- Shutdown cleanup: VERIFIED

## Deviations from Plan

**Minor adjustment:** Plan suggested using Phaser's `fillStar()` method, but this doesn't exist in Phaser 3 API. Used `fillPoints()` with calculated 5-pointed star polygon instead (same visual result, different implementation).

## Task Breakdown

| Task | Name | Status | Commit | Files Modified |
|------|------|--------|--------|----------------|
| 1 | Create POI fallback textures | Complete | 195bf02 | PreloadScene.ts |
| 2 | Create PoiRenderer class | Complete | 1ae64fc | PoiRenderer.ts (new) |
| 3 | Integrate PoiRenderer into WorldScene | Complete | 15c082f | WorldScene.ts |

## Next Steps

Phase 77 complete (4/4 plans done). POI discovery system fully functional:
- Phase 77-01: POI type definitions and procedural generation
- Phase 77-02: Database schema for discovery tracking
- Phase 77-03: Server discovery service and WebSocket handlers
- Phase 77-04: Client rendering and discovery detection (this plan)

System is now end-to-end functional:
1. POIs generated procedurally in chunks (30% density)
2. Server tracks discovery per character in database
3. Client renders POIs with pulsing animations
4. Player movement triggers discovery validation
5. Discovery rewards granted and POIs marked as discovered

Next phase (Phase 78) will implement gathering mini-game for resource collection.

## Self-Check: PASSED

**Files Created:**
- FOUND: /Users/krzysztof.kalamarski/Projects/into-the-void/apps/web/src/game/pois/PoiRenderer.ts

**Files Modified:**
- FOUND: /Users/krzysztof.kalamarski/Projects/into-the-void/apps/web/src/game/scenes/PreloadScene.ts
- FOUND: /Users/krzysztof.kalamarski/Projects/into-the-void/apps/web/src/game/scenes/WorldScene.ts

**Commits Exist:**
- FOUND: 195bf02 (Task 1: POI fallback textures)
- FOUND: 1ae64fc (Task 2: PoiRenderer class)
- FOUND: 15c082f (Task 3: WorldScene integration)

**Integration Points:**
- FOUND: PoiRenderer import in WorldScene
- FOUND: poiRenderer initialization in create()
- FOUND: poi:discover emit in updateLocalPlayerSprite()
- FOUND: createPoisForChunk call in renderChunk()
- FOUND: Socket listeners for discovery events
