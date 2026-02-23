---
phase: 80-zone-mastery-lore
plan: 03
subsystem: game-server
tags: [lore, zone-mastery, event-driven, websocket]
dependency-graph:
  requires: [80-01, 80-02]
  provides: [lore-service, zone-mastery-service]
  affects: [game-gateway, gathering-service]
tech-stack:
  added: [nestjs-event-emitter-handlers]
  patterns: [event-driven-tracking, auto-initialization, reward-granting]
key-files:
  created:
    - apps/game-server/src/game/lore.service.ts
    - apps/game-server/src/game/zone-mastery.service.ts
  modified:
    - apps/game-server/src/game/gathering.service.ts
    - apps/game-server/src/game/game.gateway.ts
    - apps/game-server/src/game/game.module.ts
    - packages/database/src/queries/characters.ts
    - packages/database/src/index.ts
    - tsconfig.base.json
decisions:
  - LoreService validates fragments against LoreRegistry before collection
  - ZoneMasteryService uses @OnEvent pattern for decoupled objective tracking
  - Bronze tier mastery auto-initializes on first relevant action per biome
  - Title rewards use unique constraint for duplicate prevention
  - Event-driven architecture allows gathering/discovery/combat to track mastery without tight coupling
metrics:
  duration: 443
  tasks: 2
  files: 8
  commits: 2
  completed: 2026-02-23
---

# Phase 80 Plan 03: Server-Side Lore & Zone Mastery Services Summary

Event-driven lore collection and zone mastery tracking with auto-initialization and reward granting using NestJS EventEmitter2 pattern.

## Overview

Implemented backend services for lore fragment collection and zone mastery progress tracking. LoreService validates lore fragments, prevents duplicates, and grants XP rewards. ZoneMasteryService uses @OnEvent handlers to track POI discovery, resource gathering, and creature kills, automatically initializing Bronze tier mastery and progressing through Silver and Gold tiers with title rewards.

## Tasks Completed

### Task 1: Create LoreService and Add resource.gathered Event Emission

**Status:** ✅ Complete

**Implementation:**
- Created `apps/game-server/src/game/lore.service.ts` following DiscoveryService pattern
- Implements `attemptCollect()` with validation against LoreRegistry
- Records collection before granting XP (anti-exploit pattern)
- Emits `lore:collected` and `lore:already_collected` WebSocket events
- Added `resource.gathered` event emission in GatheringService after successful completion
- Event payload includes characterId, category, biome, entityType for mastery tracking
- Registered LoreService in GameModule providers/exports

**Commit:** `0b12ad7` - feat(80-03): create LoreService and add resource.gathered event emission

**Files Modified:**
- `apps/game-server/src/game/lore.service.ts` (created)
- `apps/game-server/src/game/gathering.service.ts` (added EventEmitter2 injection, event emission)
- `apps/game-server/src/game/game.module.ts` (added LoreService)
- `packages/database/src/queries/characters.ts` (added addXp function)
- `packages/database/src/index.ts` (exported lore/zone-mastery queries)
- `tsconfig.base.json` (added @into-the-void/lore path mapping)

### Task 2: Create ZoneMasteryService with Event-Driven Objective Tracking

**Status:** ✅ Complete

**Implementation:**
- Created `apps/game-server/src/game/zone-mastery.service.ts` with @OnEvent handlers
- Handles `poi.discovered`, `resource.gathered`, `entity.killed` events
- Auto-initializes Bronze tier mastery on first action in biome
- Updates objectives atomically with database persistence
- Emits `mastery:progress` on objective updates
- Completes tiers when all objectives met, grants title rewards
- Auto-starts next tier (Bronze→Silver→Gold) after completion
- Emits `mastery:completed` with rewards on tier completion
- Added `lore:collect` WebSocket handler in GameGateway
- Added `mastery:query` WebSocket handler for client progress requests
- Both services initialized with `setServer()` in GameGateway.afterInit()

**Commit:** `55d31cc` - feat(80-03): create ZoneMasteryService with event-driven objective tracking

**Files Modified:**
- `apps/game-server/src/game/zone-mastery.service.ts` (created)
- `apps/game-server/src/game/game.gateway.ts` (injected services, added handlers)
- `apps/game-server/src/game/game.module.ts` (added ZoneMasteryService)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical Functionality] Added addXp() function to characters.ts**
- **Found during:** Task 1 - LoreService implementation
- **Issue:** LoreService requires atomic XP grant function but only updateCharacterProgression existed
- **Fix:** Added `addXp(db, characterId, amount)` function following addCredits pattern with SQL increment
- **Files modified:** `packages/database/src/queries/characters.ts`
- **Commit:** Included in 0b12ad7

**2. [Rule 3 - Blocking Issue] Added @into-the-void/lore path to tsconfig.base.json**
- **Found during:** Task 1 - TypeScript compilation
- **Issue:** Import of @into-the-void/lore failed due to missing path mapping
- **Fix:** Added `"@into-the-void/lore": ["packages/lore/src/index.ts"]` to paths configuration
- **Files modified:** `tsconfig.base.json`
- **Commit:** Included in 0b12ad7

**3. [Rule 3 - Blocking Issue] Exported lore/zone-mastery queries from database package**
- **Found during:** Task 1 - Import verification
- **Issue:** Database query functions existed but weren't exported from package index
- **Fix:** Added `export * from './queries/lore'` and `export * from './queries/zone-mastery'` to database/index.ts
- **Files modified:** `packages/database/src/index.ts`
- **Commit:** Included in 0b12ad7

## Technical Details

### Event-Driven Architecture

ZoneMasteryService listens to three domain events:
- `poi.discovered` → increments discover_pois objective
- `resource.gathered` → increments gather_resources objective
- `entity.killed` → increments kill_creatures objective (creatures only)

This decouples mastery tracking from source services (DiscoveryService, GatheringService, CombatService).

### Auto-Initialization Pattern

When `updateObjective()` finds no active mastery for a biome:
1. Creates Bronze tier entry with default requirements (3 POIs, 10 resources, 5 kills)
2. Persists to database immediately
3. Continues with objective update

Prevents requiring explicit mastery enrollment - players start tracking on first action.

### Tier Progression Flow

1. Player performs action (discover POI, gather resource, kill creature)
2. Event emitted with characterId and biome
3. ZoneMasteryService handler updates relevant objective
4. If all objectives complete → `completeTier()`:
   - Marks current tier complete
   - Grants title reward (e.g., "Void Explorer")
   - Emits `mastery:completed` to player
   - Auto-starts next tier if not Gold

### WebSocket Event Flow

**Lore Collection:**
```
Client → lore:collect {loreId, worldX, worldY}
Server validates → records collection → grants XP
Server → lore:collected {loreId, title, category, xpReward}
OR Server → lore:already_collected {loreId}
```

**Mastery Query:**
```
Client → mastery:query {biome}
Server fetches progress from database
Server → mastery:progress {biome, progress: {tier, objectives}}
```

**Mastery Progress (automatic):**
```
Player action triggers event
Server updates objective
Server → mastery:progress {biome, progress}
```

**Mastery Completion (automatic):**
```
Player completes final objective
Server marks tier complete, grants rewards
Server → mastery:completed {biome, tier, rewards}
Server auto-starts next tier
```

## Verification

✅ `npx nx run game-server:build` passes
✅ LoreService.attemptCollect() validates fragments against LoreRegistry
✅ LoreService prevents duplicate collection via hasCollectedLore check
✅ LoreService grants XP atomically using addXp database function
✅ GatheringService emits resource.gathered event with proper payload
✅ ZoneMasteryService handles poi.discovered event with @OnEvent decorator
✅ ZoneMasteryService handles resource.gathered event
✅ ZoneMasteryService handles entity.killed event (creatures only)
✅ ZoneMasteryService auto-initializes Bronze mastery on first action
✅ Tier completion grants title rewards via grantCharacterReward
✅ Next tier auto-starts after completion (Bronze→Silver→Gold)
✅ WebSocket handlers exist for lore:collect and mastery:query
✅ Both services registered in GameModule and initialized in afterInit

## Success Criteria

- [x] LoreService validates lore fragments against LoreRegistry
- [x] LoreService grants XP and emits lore:collected events
- [x] ZoneMasteryService uses @OnEvent for objective tracking
- [x] ZoneMasteryService auto-initializes Bronze mastery on first action
- [x] Tier completion grants title rewards and starts next tier
- [x] GatheringService emits resource.gathered for mastery tracking
- [x] All services registered in GameModule
- [x] All WebSocket handlers wired in GameGateway

## Next Steps

Phase 80 Plan 04 will implement:
- Client-side lore codex UI for viewing collected fragments
- Zone mastery progress overlay showing objectives per biome
- Notification banners for lore collection and tier completion
- Integration with fog of war to spawn lore fragments in discovered areas

## Self-Check

Verifying created files and commits exist:

```bash
# Check LoreService exists
[ -f "apps/game-server/src/game/lore.service.ts" ] && echo "FOUND: lore.service.ts" || echo "MISSING: lore.service.ts"
FOUND: lore.service.ts

# Check ZoneMasteryService exists
[ -f "apps/game-server/src/game/zone-mastery.service.ts" ] && echo "FOUND: zone-mastery.service.ts" || echo "MISSING: zone-mastery.service.ts"
FOUND: zone-mastery.service.ts

# Check commits exist
git log --oneline --all | grep -q "0b12ad7" && echo "FOUND: 0b12ad7" || echo "MISSING: 0b12ad7"
FOUND: 0b12ad7

git log --oneline --all | grep -q "55d31cc" && echo "FOUND: 55d31cc" || echo "MISSING: 55d31cc"
FOUND: 55d31cc

# Verify event emission pattern
grep -q "eventEmitter.emit('resource.gathered'" apps/game-server/src/game/gathering.service.ts && echo "FOUND: resource.gathered event" || echo "MISSING: resource.gathered event"
FOUND: resource.gathered event

# Verify @OnEvent handlers
grep -q "@OnEvent('poi.discovered')" apps/game-server/src/game/zone-mastery.service.ts && echo "FOUND: @OnEvent handler" || echo "MISSING: @OnEvent handler"
FOUND: @OnEvent handler
```

## Self-Check: PASSED

All files, commits, and implementation patterns verified successfully.
