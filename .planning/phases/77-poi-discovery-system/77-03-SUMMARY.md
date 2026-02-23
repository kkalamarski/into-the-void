---
phase: 77-poi-discovery-system
plan: 03
subsystem: game-server
tags: [websocket, discovery, server-validation]
completed: 2026-02-23

# Dependency graph
requires:
  - 77-01 (POI type definitions and generation)
  - 77-02 (discovered_pois database schema)
  - shared-types (DiscoveryReward, PoiType, POI_BASE_REWARDS, BIOME_TIER_MULTIPLIERS)
  - database (discoveredPois, characters schemas)
provides:
  - Server-side POI discovery validation
  - DiscoveryService with reward calculation
  - WebSocket event handlers for poi:discover
affects:
  - All POI discovery interactions (server-authoritative validation)
  - Character XP and credits updates via discovery rewards

# Tech stack
added:
  - DiscoveryService with DatabaseService injection
  - poi:discover WebSocket handler in GameGateway
  - poi:discovered and poi:already_discovered server events
patterns:
  - Discovery recorded BEFORE reward granted (anti-exploit)
  - Biome tier multiplier applied to base rewards (1.0-4.0x)
  - POI existence validation against chunk data
  - Server-authoritative discovery preventing client-side exploits

# Key files
created:
  - apps/game-server/src/game/discovery.service.ts (DiscoveryService implementation)
modified:
  - packages/shared-types/src/network/events.ts (discovery event types)
  - apps/game-server/src/game/game.module.ts (DiscoveryService registration)
  - apps/game-server/src/game/game.gateway.ts (poi:discover handler)

# Key decisions
decisions:
  - DatabaseService injection pattern (follows existing service architecture)
  - Discovery recorded before reward to prevent rollback exploits
  - POI validation via chunk lookup (ensures POI exists at claimed coordinates)
  - Emit player:xp and credits:update after discovery for immediate UI feedback
  - Console.warn for invalid POI attempts (non-critical validation failures)

# Metrics
duration: 211
tasks_completed: 3
files_created: 1
files_modified: 3
---

# Phase 77 Plan 03: Server Discovery Service and WebSocket Integration Summary

**One-liner:** Server-authoritative POI discovery with validation, biome-multiplied rewards, and WebSocket event integration

## Implementation Overview

Created the server-side discovery validation system with DiscoveryService for database persistence and reward calculation, plus WebSocket handlers for real-time client communication.

### What Was Built

**1. Discovery WebSocket Events (packages/shared-types/src/network/events.ts):**
- Client event: `poi:discover` with poiId and world coordinates
- Server events: `poi:discovered` (success with reward) and `poi:already_discovered` (duplicate attempt)
- DiscoveryReward includes xp, credits, and optional items

**2. DiscoveryService (apps/game-server/src/game/discovery.service.ts):**
- `attemptDiscovery()`: Main entry point for discovery validation and reward flow
- `calculateReward()`: Applies biome tier multiplier to POI base rewards
- `grantReward()`: Updates character XP and credits in database
- `getDiscoveredPoiIds()`: Retrieves all discovered POI IDs for a character
- `isPoiDiscovered()`: Checks if specific POI has been discovered
- Anti-exploit pattern: Discovery recorded BEFORE reward granted (prevents rollback exploits)

**3. GameGateway Integration (apps/game-server/src/game/game.gateway.ts):**
- `@SubscribeMessage('poi:discover')` handler
- POI existence validation via chunk lookup
- Parses poiId to extract chunk coordinates
- Emits discovery events and reward updates to client
- Returns early for invalid POIs (warns but doesn't error)

**4. Module Registration:**
- DiscoveryService registered in GameModule providers and exports
- Follows existing service injection pattern (DatabaseService)

### Technical Approach

**Server-Authoritative Validation:**
1. Client sends poi:discover with poiId and coordinates
2. Server parses chunk coordinates from deterministic poiId format
3. Server fetches chunk data via getZoneState()
4. Server validates POI exists in chunk.pois array
5. Server checks database for prior discovery (composite key lookup)
6. Server records discovery (insert into discovered_pois)
7. Server calculates and grants reward
8. Server emits success events with reward data

**Anti-Exploit Design:**
- Discovery recorded BEFORE reward granted (if reward fails, discovery still recorded to prevent retries)
- Composite primary key (characterId, poiId) prevents duplicate discoveries at database level
- Server validates POI existence against procedurally generated chunk data
- No client-side trust: all discovery logic runs server-side

**Reward Calculation:**
```typescript
reward.xp = floor(POI_BASE_REWARDS[type].xp * BIOME_TIER_MULTIPLIERS[biome])
reward.credits = floor(POI_BASE_REWARDS[type].credits * BIOME_TIER_MULTIPLIERS[biome])
```

Cache POIs get bonus credits (placeholder for future loot table integration in Phase 80).

### Verification Results

**TypeScript Compilation:**
- packages/shared-types/tsconfig.json: PASS
- apps/game-server/tsconfig.json: PASS

**Integration Checks:**
- ✓ DiscoveryService registered in GameModule
- ✓ poi:discover handler exists in GameGateway
- ✓ Discovery events (poi:discovered, poi:already_discovered) defined in events.ts
- ✓ Biome tier multiplier applied in calculateReward()

## Deviations from Plan

None - plan executed exactly as written.

## Task Breakdown

| Task | Name | Status | Commit | Files Modified |
|------|------|--------|--------|----------------|
| 1 | Add discovery WebSocket events | ✓ Complete | 0d6842e | events.ts |
| 2 | Create DiscoveryService | ✓ Complete | 4592811 | discovery.service.ts, game.module.ts |
| 3 | Wire discovery handler in GameGateway | ✓ Complete | e82dfe6 | game.gateway.ts |

## Next Steps

Plan 04 will implement:
- Client-side POI discovery UI (markers on minimap)
- Discovery notification banners with reward display
- Client POI discovery trigger (proximity detection)
- Integration with fog-of-war system (reveal radius around POIs)

## Self-Check: PASSED

**Files Created:**
- FOUND: apps/game-server/src/game/discovery.service.ts

**Files Modified:**
- FOUND: packages/shared-types/src/network/events.ts
- FOUND: apps/game-server/src/game/game.module.ts
- FOUND: apps/game-server/src/game/game.gateway.ts

**Commits Exist:**
- FOUND: 0d6842e (Task 1: Discovery WebSocket events)
- FOUND: 4592811 (Task 2: DiscoveryService creation)
- FOUND: e82dfe6 (Task 3: WebSocket handler wiring)

**Integration Points:**
- FOUND: DiscoveryService in GameModule providers
- FOUND: DiscoveryService in GameModule exports
- FOUND: poi:discover handler in GameGateway
- FOUND: discoveryService injection in GameGateway constructor
