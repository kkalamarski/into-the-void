---
phase: 96-home-recall-ability
plan: 01
subsystem: abilities
tags: [universal-ability, cooldown-persistence, teleport, home-recall]

dependency_graph:
  requires:
    - "95-02 (expedition interaction - teleportToHub function)"
    - "Existing ability system (AbilityService, AbilityRegistry)"
    - "Database persistence infrastructure"
  provides:
    - "ability_cooldowns table for persistent cooldowns"
    - "home_recall universal ability with 5-minute cooldown"
    - "Cooldown persistence for abilities >= 1 minute"
  affects:
    - "All players gain home_recall ability regardless of equipment"
    - "Abilities panel and action bar show universal abilities"

tech_stack:
  added:
    - "Database: ability_cooldowns table with composite PK"
    - "Database: saveCooldown/loadCooldowns queries"
    - "Game Logic: ABILITY_HOME_RECALL definition"
  patterns:
    - "Universal ability injection in getPlayerAbilities()"
    - "Cooldown persistence for long-duration abilities"
    - "Session restoration via restoreCooldowns()"

key_files:
  created:
    - packages/database/src/schema/ability-cooldowns.ts
    - packages/database/src/queries/ability-cooldowns.ts
    - packages/database/drizzle/0008_loose_gateway.sql
  modified:
    - packages/game-logic/src/ability/definitions.ts
    - apps/game-server/src/game/ability.service.ts
    - apps/game-server/src/game/game.gateway.ts
    - apps/web/src/store/abilityStore.ts

decisions:
  - decision: "Cooldown persistence threshold set to 1 minute"
    rationale: "Short cooldowns (<1 min) don't need persistence; reduces DB writes"
    alternatives: ["Persist all cooldowns", "Make threshold configurable"]
  - decision: "home_recall has no energy cost"
    rationale: "Emergency escape shouldn't be blocked by low energy"
    alternatives: ["Small energy cost", "Percentage of max energy"]
  - decision: "Universal abilities injected in getPlayerAbilities()"
    rationale: "Consistent with equipment-based ability pattern; simple to extend"
    alternatives: ["Separate universal abilities list", "Hard-coded in UI"]

metrics:
  duration_seconds: 402
  tasks_completed: 3
  files_created: 3
  files_modified: 5
  completed_at: "2026-02-26"
---

# Phase 96 Plan 01: Home Recall Ability Summary

Universal home recall ability with 5-minute persistent cooldown enabling safe return to faction hub.

## One-Liner

Implemented home_recall universal ability with database-persisted 5-minute cooldown, enabling all players to teleport to faction hub regardless of equipment.

## What Was Built

**Database Schema (ability_cooldowns):**
- Table with composite primary key (characterId, abilityId)
- Timestamp column (expiresAt) with index for efficient queries
- CRUD queries: saveCooldown, loadCooldowns, deleteCooldown, cleanupExpiredCooldowns

**Ability Definition (ABILITY_HOME_RECALL):**
- ID: home_recall
- Category: utility
- Cooldown: 300000ms (5 minutes)
- Energy cost: 0 (emergency escape)
- Effects: [] (special handling via teleportToHub)

**Server-Side Logic:**
- Universal ability injection: getPlayerAbilities() adds home_recall for all players
- Cooldown persistence: cooldowns >= 1 minute saved to database
- Session restoration: restoreCooldowns() loads and emits cooldowns on auth
- Teleport effect: useAbility() handles home_recall via teleportToHub()

**Client-Side Logic:**
- Universal ability injection: getEquippedAbilities() adds home_recall
- Existing cooldown event handler supports persistent cooldowns
- Abilities panel and action bar automatically display home_recall

## Technical Implementation

**Cooldown Persistence Pattern:**
```typescript
// Only persist long cooldowns (>= 1 minute)
const PERSISTENCE_THRESHOLD_MS = 60000;

setCooldown(playerId, abilityId, cooldownMs) {
  const endsAt = Date.now() + cooldownMs;
  this.cooldowns.set(key, endsAt);

  if (cooldownMs >= PERSISTENCE_THRESHOLD_MS) {
    saveCooldown(db, playerId, abilityId, new Date(endsAt));
  }
  return endsAt;
}
```

**Session Restoration Flow:**
1. Player authenticates via handleAuth()
2. restoreCooldowns() loads active cooldowns from DB
3. Each cooldown emitted via 'ability:cooldown' event
4. Client abilityStore receives and displays cooldowns

**Home Recall Effect:**
1. Check not already in hub (isHubZone guard)
2. Call teleportToHub() to update position and save lastWorldPosition
3. Set 5-minute cooldown (persisted to DB)
4. Emit zone transition events (player:left, player:teleported)

## Deviations from Plan

None - plan executed exactly as written.

## Testing Notes

**Manual Testing Required:**
1. Login with any character
2. Verify home_recall appears in abilities panel (regardless of equipment)
3. Assign home_recall to action bar slot
4. Travel to open world (exit hub)
5. Trigger home_recall → verify teleport to faction hub
6. Verify 5-minute cooldown displayed in UI
7. Disconnect and reconnect → verify cooldown persists
8. Try using home_recall while in hub → verify "Already in hub" error

**Database Verification:**
```sql
-- Check cooldown persistence
SELECT * FROM ability_cooldowns WHERE character_id = '<uuid>';

-- Verify expiration index exists
\d ability_cooldowns
```

## Commits

- `50795ff` feat(96-01): add ability cooldown schema and home_recall definition
- `5f65795` feat(96-01): add universal abilities and cooldown persistence
- `541a616` feat(96-01): inject home_recall in client ability list

## Self-Check

Verifying plan artifacts:

### Schema and Queries
- [x] ability_cooldowns table exists
- [x] saveCooldown query exists
- [x] loadCooldowns query exists
- [x] Exports added to schema/index.ts and database/index.ts

### Ability Definition
- [x] ABILITY_HOME_RECALL defined in definitions.ts
- [x] Added to ALL_ABILITIES array
- [x] AbilityRegistry auto-registers

### Server Implementation
- [x] getPlayerAbilities() injects home_recall
- [x] setCooldown() persists long cooldowns
- [x] loadCooldownsFromDb() restores from database
- [x] restoreCooldowns() emits to client
- [x] home_recall effect calls teleportToHub()
- [x] handleAuth() calls restoreCooldowns()

### Client Implementation
- [x] getEquippedAbilities() injects home_recall
- [x] ability:cooldown event handler exists

### Build Verification
- [x] packages/database builds successfully
- [x] packages/game-logic builds successfully
- [x] apps/game-server builds successfully
- [x] apps/web builds successfully

### Commits
- [x] Commit 50795ff exists: schema and definition
- [x] Commit 5f65795 exists: server persistence
- [x] Commit 541a616 exists: client injection

## Self-Check: PASSED

All artifacts verified. Plan execution complete.
