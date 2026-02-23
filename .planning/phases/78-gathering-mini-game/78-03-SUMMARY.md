---
phase: 78-gathering-mini-game
plan: 03
subsystem: game-server
tags: [gathering, validation, proficiency, websocket]
dependency_graph:
  requires:
    - 78-01 (types and validation logic)
    - 78-02 (database schema)
  provides:
    - gathering-service
    - gathering-websocket-events
  affects:
    - game-module
    - game-gateway
tech_stack:
  added: []
  patterns:
    - entity-locking
    - proficiency-caching
    - challenge-expiration
    - server-side-validation
key_files:
  created:
    - apps/game-server/src/game/gathering.service.ts
  modified:
    - apps/game-server/src/game/game.module.ts
    - apps/game-server/src/game/game.gateway.ts
    - apps/game-server/src/game/discovery.service.ts (bug fix)
decisions:
  - title: "Entity locking prevents race conditions"
    rationale: "Lock entities during gathering to prevent multiple players from gathering the same resource simultaneously, avoiding double-rewards and state corruption"
  - title: "Artifact instant collection (no mini-game)"
    rationale: "Per research recommendation, artifacts use instant collection via EntityService with archaeology XP reward, avoiding mini-game overhead for one-time discoveries"
  - title: "Challenge auto-expiration with timeout"
    rationale: "Challenges expire after GATHER_DURATION_MS + 1000ms to clean up abandoned gathering sessions and release entity locks"
metrics:
  duration_seconds: 534
  tasks_completed: 2
  files_created: 1
  files_modified: 3
  commits: 4
  completed_at: "2026-02-23T14:25:41Z"
---

# Phase 78 Plan 03: Server-Side Gathering Service Summary

**One-liner:** Server-side gathering challenge generation with timing validation, entity locking, proficiency caching, and atomic XP updates.

## What Was Built

### Task 1: Create GatheringService
Created `apps/game-server/src/game/gathering.service.ts` (370 lines) with:

**Core Features:**
- **startGathering()**: Generates timing challenges with:
  - Entity lock validation (prevents race conditions)
  - Tool range validation via `canInteract`
  - Proficiency-based success zone width scaling (20% to 50%)
  - Random success zone positioning (±500ms variance)
  - Auto-expiration timeout (GATHER_DURATION_MS + 1000ms)
  - Artifact instant collection (delegates to EntityService)

- **completeGathering()**: Validates timing and awards loot with:
  - Server-side timing validation via `validateGatherTiming`
  - Entity definition lookup for loot tables (miningYield/harvestYield)
  - Yield multiplier calculation (timing accuracy × proficiency bonus)
  - Loot scaling via `rollLootTable` with rounded quantities
  - Ground item spawning via EntityService
  - Proficiency XP award with atomic database update

- **loadProficiency()**: Cache-first proficiency loading with:
  - Check cache before hitting database
  - Auto-create proficiency row for new characters (DEFAULT_PROFICIENCY)
  - Cache update after database read

- **unloadProficiency()**: Cleanup on player disconnect with:
  - Cache invalidation
  - Active challenge cleanup (release entity locks)

**Commit:** `28b445b`

### Task 2: Wire GatheringService into Gateway and Module
Updated `apps/game-server/src/game/game.module.ts`:
- Added GatheringService to providers and exports arrays

Updated `apps/game-server/src/game/game.gateway.ts`:
- Injected GatheringService into constructor
- Added `gathering:start` handler:
  - Calls `startGathering()`
  - Emits `gathering:challenge` on success
  - Handles artifact instant collection edge case
  - Emits error on failure
- Added `gathering:complete` handler:
  - Calls `completeGathering()`
  - Emits `gathering:result` with success/accuracy/items/XP
- Wired proficiency loading in auth handler (after inventory load)
- Wired proficiency unload in disconnect handler (before player removal)

**Commit:** `528ec17`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Incorrect database import path in discovery.service.ts**
- **Found during:** Task 2 build verification
- **Issue:** `discovery.service.ts` used `'@into-the-void/database/schema'` import path which doesn't exist, causing build failure
- **Fix:** Changed to `'@into-the-void/database'` to match pattern used in all other services
- **Files modified:** `apps/game-server/src/game/discovery.service.ts`
- **Commit:** `9e538a0`
- **Rationale:** Build-blocking error prevented plan completion, required immediate fix per Rule 3

**2. [Rule 1 - Bug] Type compatibility issues in GatheringService**
- **Found during:** Task 2 build verification
- **Issues:**
  - Used incorrect type `{ itemId, weight, minQty, maxQty }[]` instead of `readonly HarvestYield[]`
  - Used `def.tier` instead of `def.requiredTier` for MineralDefinition
  - Called `playerService.getPlayer()` instead of `getPlayerById()`
  - Attempted to re-fetch socketId when already available as parameter
- **Fix:**
  - Import HarvestYield type from @into-the-void/entities
  - Use readonly HarvestYield[] for lootEntries
  - Use requiredTier for minerals, default to 1 for plants
  - Use getPlayerById() for player lookup
  - Use socketId parameter directly
- **Files modified:** `apps/game-server/src/game/gathering.service.ts`
- **Commit:** `d54ab71`
- **Rationale:** TypeScript compilation errors prevented build, required immediate fix per Rule 1

## Key Decisions Made

### 1. Entity Locking Strategy
**Decision:** Use entity locks (Map<entityId, playerId>) to prevent concurrent gathering on same resource.

**Rationale:** Without locking, multiple players could gather the same resource simultaneously, leading to:
- Double-reward exploits (both players get loot from same resource)
- Race conditions in entity state updates
- Inconsistent yield depletion

**Implementation:** Lock acquired in `startGathering()`, released in `completeGathering()` or challenge expiration.

**Impact:** Prevents race conditions while allowing different players to gather different resources concurrently.

### 2. Artifact Instant Collection
**Decision:** Skip mini-game for artifacts, use instant collection via EntityService with archaeology XP reward.

**Rationale:** Artifacts are one-time discoveries rather than renewable resources. Mini-game would be:
- Redundant for single-interaction entities
- Slower than instant pickup for rare discoveries
- Inconsistent with discovery gameplay feel

**Implementation:** Special case in `startGathering()` returns `ARTIFACT_COLLECTED` marker to client.

**Impact:** Streamlines artifact discovery while still awarding proficiency XP. Client can show discovery notification without mini-game UI.

### 3. Challenge Auto-Expiration
**Decision:** Use setTimeout with GATHER_DURATION_MS + 1000ms to auto-expire abandoned challenges.

**Rationale:** Players may disconnect, navigate away, or abandon gathering mid-challenge. Without expiration:
- Entity locks persist forever
- Memory leaks from abandoned challenge state
- Resources become un-gatherable by other players

**Implementation:** Timeout set in `startGathering()`, cleanup via `expireChallenge()`.

**Impact:** Automatic cleanup of abandoned state, entity locks released after ~4 seconds.

### 4. Proficiency Cache Design
**Decision:** Cache proficiency in memory (Map<characterId, ProficiencyJson>) with load/unload lifecycle.

**Rationale:** Proficiency is read frequently (every gathering action) but updated rarely (only on completion). Caching:
- Reduces database load (no query on every gathering start)
- Improves response time for challenge generation
- Still persists updates atomically to database

**Implementation:** loadProficiency() called on player auth, unloadProficiency() on disconnect, cache updated after XP awards.

**Impact:** Fast proficiency lookups during gameplay, minimal database queries.

## Technical Details

### Anti-Cheat Protection
1. **Server-side timing validation**: Uses server timestamps, not client-reported times
2. **Challenge ID verification**: Prevents replay attacks
3. **Challenge expiry check**: Prevents delayed submissions beyond timeout
4. **Entity locking**: Prevents double-gathering exploits

### Proficiency XP Award Flow
1. Read current proficiency from database (or cache miss)
2. Calculate new XP: `oldXP + calculateXPReward(accuracy, tier)`
3. Calculate new level: `calculateLevelFromXP(newXP)`
4. Update database with new proficiency JSON
5. Update cache with new values
6. Return new level to client

### Loot Calculation
1. Lookup entity definition (MineralDefinition or PlantDefinition)
2. Get loot table (miningYield or harvestYield)
3. Roll loot via `rollLootTable()` (respects chance, random quantity)
4. Calculate yield multiplier: `validation.yieldMultiplier × proficiency.baseYieldBonus`
5. Scale quantities: `Math.max(1, Math.round(quantity × totalMultiplier))`
6. Return scaled items to client

## Verification Results

- [x] `pnpm build --filter=game-server` succeeds
- [x] GatheringService exports from game.module.ts
- [x] Gateway handles gathering:start → emits gathering:challenge
- [x] Gateway handles gathering:complete → emits gathering:result
- [x] Proficiency cache populated on player join
- [x] Server compiles without errors (all type issues resolved)

## Self-Check: PASSED

**Created files:**
```bash
[ -f "apps/game-server/src/game/gathering.service.ts" ] && echo "FOUND"
# Result: FOUND
```

**Commits:**
```bash
git log --oneline | grep "78-03"
# 28b445b feat(78-03): create GatheringService
# 528ec17 feat(78-03): wire GatheringService into gateway and module
# 9e538a0 fix(78-03): correct database import path in discovery.service
# d54ab71 fix(78-03): correct type annotations in GatheringService
```

**Build verification:**
```bash
npx nx run game-server:build
# Result: Successfully ran target build for project game-server
```

All files created, commits recorded, build succeeds.

## Next Steps

This plan completes the server-side gathering infrastructure. The next plan (78-04) should implement:
1. Client-side gathering mini-game UI with timing bar
2. WebSocket event listeners for gathering:challenge and gathering:result
3. Visual feedback for accuracy (perfect/good/poor)
4. Proficiency XP display and level-up notifications
5. Integration with WorldScene for E key gathering trigger

All server-side validation, proficiency tracking, and loot calculation are now ready for client consumption.
