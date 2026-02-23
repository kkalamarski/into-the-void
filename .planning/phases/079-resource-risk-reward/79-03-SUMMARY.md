---
phase: 79-resource-risk-reward
plan: 03
subsystem: discovery
tags: [resource-discovery, rare-nodes, database-persistence, proximity-detection]
dependency_graph:
  requires: [79-01 NodeRarity type]
  provides: [discovered_resources table, resource discovery tracking, rare node map markers]
  affects: [client map UI, gathering system, zone exploration]
tech_stack:
  added: [discoveredResources table schema, ResourceDiscoveryData interface]
  patterns: [proximity-based discovery, unique constraint for duplicates, cascade delete]
key_files:
  created:
    - packages/database/src/schema/discovered-resources.ts
  modified:
    - packages/database/src/schema/index.ts
    - apps/game-server/src/game/discovery.service.ts
    - packages/shared-types/src/network/events.ts
    - apps/game-server/src/game/game.gateway.ts
decisions:
  - title: "3-tile discovery range for rare nodes"
    rationale: "Balances exploration reward with proximity requirement. Player must actively approach rare nodes to discover them, preventing accidental discoveries from long distance."
  - title: "Unique index on (characterId, entityId) for duplicate prevention"
    rationale: "Database-level race condition handling. Prevents duplicate discovery records even with concurrent requests. Returns false on constraint violation rather than throwing error."
  - title: "Discovery check on every movement"
    rationale: "Fire-and-forget async pattern doesn't block movement. Provides immediate feedback when player enters discovery range. No performance impact on movement validation."
  - title: "Send discovered list on character join"
    rationale: "Client receives all previously discovered rare nodes immediately after authentication. Enables map marker persistence across sessions without additional client requests."
metrics:
  duration_seconds: 303
  tasks_completed: 3
  files_modified: 5
  lines_added: 245
  commits: 3
  completed_at: "2026-02-23T16:15:46Z"
---

# Phase 79 Plan 03: Rare Resource Discovery Persistence

**One-liner:** Database persistence and proximity-based server tracking for rare node discoveries with WebSocket sync for map markers.

## Summary

Implemented server-authoritative discovery system for rare/epic resource nodes with database persistence, proximity-based tracking (3-tile range), and WebSocket events for client synchronization. Players receive discovered node list on character join and real-time notifications when discovering new nodes.

**What was built:**

1. **discovered_resources Database Table**
   - Table schema with cascade delete from characters table
   - Unique index on (characterId, entityId) prevents duplicate discoveries
   - Tracks: entityId, rarity, resourceType, zoneId, worldX, worldY, resourceId, discoveredAt timestamp
   - Exported from database package schema index

2. **DiscoveryService Extensions**
   - `discoverResource(characterId, data)` - Records new discovery, returns true if new or false if duplicate
   - `getDiscoveredResources(characterId)` - Returns all discovered rare nodes for character
   - `removeResourceDiscovery(characterId, entityId)` - Optional cleanup when node depleted
   - Graceful handling of unique constraint violations (race conditions)
   - Database queries use proper Drizzle ORM patterns with `and()` and `eq()`

3. **WebSocket Events (shared-types)**
   - `rare-nodes:discovered` - Sent on character join with array of discoveries
   - `rare-node:new-discovery` - Sent when player discovers new rare node
   - Event payloads include: entityId, rarity, resourceType, zoneId, worldX, worldY, resourceId

4. **GameGateway Integration**
   - `checkRareNodeDiscovery()` private method checks proximity on player movement
   - 3-tile range threshold (RARE_DISCOVERY_RANGE constant)
   - Filters for minerals and plants with rarity !== 'common'
   - Distance calculation via `Math.hypot()` for accurate Euclidean distance
   - Async fire-and-forget pattern - doesn't block movement processing
   - Character join handler sends `rare-nodes:discovered` after auth success

**Key patterns:**

- **Proximity detection:** Iterates zone entities, filters by type and rarity, calculates distance
- **Duplicate prevention:** Database unique constraint + try/catch for error code '23505'
- **Character join flow:** loadProficiency → getDiscoveredResources → emit rare-nodes:discovered → auth:success
- **Movement flow:** movePlayer → checkRareNodeDiscovery → discoverResource → emit rare-node:new-discovery (if new)
- **Type safety:** Proper Mineral/Plant imports, ResourceDiscoveryData interface

## Verification Results

✅ **TypeScript Compilation**
- `npx nx run database:build` - Success
- `npx nx run shared-types:build` - Success
- `npx nx run game-server:build` - Success

✅ **Schema Verification**
- discovered_resources table schema created with proper types
- discoveredResourcesCharEntityIdx unique index defined
- Schema exported from database/schema/index.ts

✅ **Service Verification**
- discoverResource method exists in DiscoveryService
- getDiscoveredResources method exists in DiscoveryService
- removeResourceDiscovery method exists in DiscoveryService
- ResourceDiscoveryData interface defined

✅ **Events Verification**
- rare-nodes:discovered event in ServerEvents interface
- rare-node:new-discovery event in ServerEvents interface

✅ **Gateway Verification**
- checkRareNodeDiscovery method exists in GameGateway
- Method called after successful movement with player position
- Character join emits rare-nodes:discovered before auth:success

✅ **Success Criteria Met**
- [x] discovered_resources table schema exists with proper foreign key
- [x] Unique index prevents duplicate discoveries
- [x] DiscoveryService has discoverResource and getDiscoveredResources methods
- [x] WebSocket events defined for rare-nodes:discovered and rare-node:new-discovery
- [x] GameGateway checks for discoveries within 3-tile range on movement
- [x] Character join sends existing discoveries to client
- [x] All packages build without errors

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed TypeScript error in error handling**
- **Found during:** Task 2 (DiscoveryService extension)
- **Issue:** TypeScript error "error is of type 'unknown'" when accessing error.code
- **Fix:** Added type guard `error && typeof error === 'object' && 'code' in error` before accessing error.code
- **Files modified:** apps/game-server/src/game/discovery.service.ts
- **Commit:** 7dcb7be

**2. [Rule 1 - Bug] Missing Mineral and Plant type imports**
- **Found during:** Task 3 (GameGateway integration)
- **Issue:** TypeScript error "Cannot find name 'Mineral'" and "Cannot find name 'Plant'"
- **Fix:** Added Mineral and Plant to imports from @into-the-void/shared-types
- **Files modified:** apps/game-server/src/game/game.gateway.ts
- **Commit:** d5b376b (included in Task 3)

## Implementation Notes

**Discovery Flow:**

1. **On character join:**
   - PlayerService.authenticate() succeeds
   - GatheringService.loadProficiency() loads gathering data
   - **DiscoveryService.getDiscoveredResources()** fetches all rare node discoveries
   - Client receives `rare-nodes:discovered` event with discoveries array
   - Client can render map markers for known rare nodes

2. **On player movement:**
   - GameService.movePlayer() validates and updates position
   - Movement success triggers **checkRareNodeDiscovery()**
   - Iterates zone entities, filters minerals/plants with rarity 'rare' or 'epic'
   - Calculates distance via `Math.hypot(playerX - entityX, playerY - entityY)`
   - If distance <= 3 tiles: calls **DiscoveryService.discoverResource()**
   - If new discovery: emits `rare-node:new-discovery` to player socket
   - Discovery check runs async, doesn't block movement acknowledgment

**Database Schema Details:**

```typescript
discoveredResources {
  id: uuid (primary key, auto-generated)
  characterId: uuid (foreign key → characters.id, cascade delete)
  entityId: varchar(255) (e.g., "z_10_5_mineral_12345")
  rarity: varchar(20) ('rare' | 'epic')
  resourceType: varchar(50) ('mineral' | 'plant')
  zoneId: varchar(100) (e.g., "z_10_5")
  worldX: integer (entity world X coordinate)
  worldY: integer (entity world Y coordinate)
  resourceId: varchar(100) (definition ID like "mineral_void_crystal_rare")
  discoveredAt: timestamp with timezone (default now())
}

Unique Index: (characterId, entityId)
```

**Race Condition Handling:**

- Client A and Client B both enter 3-tile range simultaneously
- Both call `discoverResource()` concurrently
- First call succeeds, inserts row
- Second call gets unique constraint violation (error code '23505')
- Second call catches error, returns `false` (already discovered)
- Only Client A receives `rare-node:new-discovery` event
- Both clients have discovery in their `rare-nodes:discovered` list on next join

**Performance Considerations:**

- Discovery check runs on every successful movement (~450ms intervals)
- Zone entity iteration filtered early by type check (skips NPCs, creatures, items)
- Distance calculation only for minerals/plants with rare/epic rarity
- Database query uses indexed lookup on (characterId, entityId)
- Async fire-and-forget prevents movement blocking

**Integration Points:**

- **Phase 79 Plan 04 (Client UI):** Client can render map markers using worldX/worldY coords
- **Gathering system:** Discovery records can show "previously discovered" indicator
- **Zone mastery:** Rare node discoveries can count toward exploration objectives

## Next Steps

1. **Phase 79 Plan 04:** Implement client-side map marker rendering for discovered rare nodes
2. **Future enhancement:** Add discovery radius indicator on minimap
3. **Future enhancement:** Track discovery timestamps for "recently discovered" highlighting
4. **Future enhancement:** Add achievement/notification for first discovery of each rare type

## Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create discovered_resources schema | 649660d | database/schema/discovered-resources.ts, database/schema/index.ts |
| 2 | Extend DiscoveryService with resource tracking | 7dcb7be | game-server/game/discovery.service.ts, shared-types/network/events.ts |
| 3 | Wire discovery into movement handler | d5b376b | game-server/game/game.gateway.ts |

---

**Execution time:** 303 seconds (5m 3s)
**Tasks completed:** 3/3
**Build status:** ✅ All packages compile without errors

## Self-Check: PASSED

✅ All created files exist on disk:
- packages/database/src/schema/discovered-resources.ts

✅ All modified files exist on disk:
- packages/database/src/schema/index.ts
- apps/game-server/src/game/discovery.service.ts
- packages/shared-types/src/network/events.ts
- apps/game-server/src/game/game.gateway.ts

✅ All commits exist in git history:
- 649660d (Task 1: discovered_resources schema)
- 7dcb7be (Task 2: DiscoveryService extension)
- d5b376b (Task 3: GameGateway integration)

✅ Build verification passed for all packages
