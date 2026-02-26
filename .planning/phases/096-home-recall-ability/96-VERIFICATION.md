---
phase: 96-home-recall-ability
verified: 2026-02-26T08:56:35Z
status: human_needed
score: 5/5
re_verification: false
human_verification:
  - test: "Home recall appears in abilities panel"
    expected: "home_recall ability visible regardless of equipped items"
    why_human: "Visual UI verification required"
  - test: "Home recall teleports to faction hub"
    expected: "Player teleports to correct faction hub on activation"
    why_human: "Real-time teleport behavior and zone transition"
  - test: "Cooldown persists across sessions"
    expected: "After disconnect/reconnect, 5-minute cooldown still displays"
    why_human: "Session restoration behavior verification"
  - test: "Home recall blocked in hub"
    expected: "Error message 'Already in hub' when used in faction hub"
    why_human: "Edge case behavior verification"
---

# Phase 96: Home Recall Ability Verification Report

**Phase Goal:** All players have universal ability to return to their faction hub
**Verified:** 2026-02-26T08:56:35Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Home recall ability appears in every player's abilities list regardless of equipment | ✓ VERIFIED | `abilityIds.add('home_recall')` in both server (line 108) and client (line 91) getPlayerAbilities() functions |
| 2 | Player can trigger home recall from abilities panel or action bar | ✓ VERIFIED | Universal ability injection ensures home_recall in ability list; existing UI handles display |
| 3 | Home recall teleports player to their faction hub | ✓ VERIFIED | `teleportToHub(player.id)` called at line 303, zone transition events emitted (lines 314-321) |
| 4 | Home recall has 5 minute cooldown visible in UI | ✓ VERIFIED | `cooldownMs: 300000` (5 minutes) in definition (line 319), cooldown set and emitted to client (line 309) |
| 5 | Cooldown persists across sessions and zone changes | ✓ VERIFIED | `saveCooldown()` called for cooldowns >= 60s (line 151), `restoreCooldowns()` called on auth (line 204) |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `packages/database/src/schema/ability-cooldowns.ts` | Cooldown persistence schema | ✓ VERIFIED | Table with composite PK (characterId, abilityId), expiresAt timestamp, index on expiresAt |
| `packages/database/src/queries/ability-cooldowns.ts` | CRUD queries for cooldowns | ✓ VERIFIED | saveCooldown, loadCooldowns, deleteCooldown, cleanupExpiredCooldowns implemented |
| `packages/game-logic/src/ability/definitions.ts` | Home recall ability definition | ✓ VERIFIED | ABILITY_HOME_RECALL defined (line 313), added to ALL_ABILITIES (line 495) |
| `apps/game-server/src/game/ability.service.ts` | Universal ability injection and cooldown persistence | ✓ VERIFIED | home_recall injected (line 108), persistence for long cooldowns (line 149-154), restoreCooldowns (line 189-199) |
| `apps/web/src/store/abilityStore.ts` | Client-side universal ability injection | ✓ VERIFIED | home_recall injected (line 91), ability:cooldown event handler (line 110-112) |
| `packages/database/drizzle/0008_loose_gateway.sql` | Database migration | ✓ VERIFIED | Migration file exists, creates ability_cooldowns table with composite PK and index |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `apps/game-server/src/game/ability.service.ts` | `packages/database/src/queries/ability-cooldowns.ts` | cooldown persistence on long abilities | ✓ WIRED | Import at line 15, saveCooldown called at line 151, loadCooldowns called at line 172 |
| `apps/game-server/src/game/ability.service.ts` | `apps/game-server/src/game/player.service.ts` | teleportToHub for home_recall effect | ✓ WIRED | teleportToHub called at line 303, result handling at lines 304-326 |
| `apps/web/src/store/abilityStore.ts` | `ABILITY_HOME_RECALL` | universal ability injection | ✓ WIRED | home_recall added to abilityIds at line 91, resolved via AbilityRegistry.get() at line 96 |
| `apps/game-server/src/game/game.gateway.ts` | `apps/game-server/src/game/ability.service.ts` | restoreCooldowns on auth | ✓ WIRED | restoreCooldowns called at line 204 in handleAuth after successful authentication |

### Requirements Coverage

| Requirement | Status | Blocking Issue |
|-------------|--------|----------------|
| TRAV-04: Universal home recall ability available to all players | ✓ SATISFIED | None — universal injection verified in both client and server |
| TRAV-05: Home recall has 5 minute cooldown | ✓ SATISFIED | None — 300000ms cooldown verified in definition and persistence |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None | - | - | - | No anti-patterns detected |

No TODO, FIXME, HACK, PLACEHOLDER comments found in new files. No empty implementations or stub patterns detected.

### Human Verification Required

#### 1. Home recall appears in abilities panel

**Test:** Login with any character, open abilities panel
**Expected:** home_recall ability visible in the list regardless of equipped items (tool, exosuit, modules)
**Why human:** Visual UI verification — need to confirm UI correctly renders abilities from getEquippedAbilities()

#### 2. Home recall teleports to faction hub

**Test:** 
1. Travel to open world (exit faction hub)
2. Assign home_recall to action bar
3. Trigger home_recall ability

**Expected:** 
- Player teleports to their faction hub
- Zone transition occurs smoothly
- Player position updates correctly

**Why human:** Real-time teleport behavior and zone transition — need to verify zone state refresh, entity despawn/spawn, and visual smoothness

#### 3. Cooldown persists across sessions

**Test:**
1. Trigger home_recall (5 minute cooldown starts)
2. Disconnect from game
3. Reconnect within 5 minutes

**Expected:** 
- Cooldown still displays with remaining time
- Cannot use home_recall until cooldown expires

**Why human:** Session restoration behavior — need to verify database persistence and restoreCooldowns() works correctly on reconnect

#### 4. Home recall blocked in hub

**Test:** While in faction hub, try to use home_recall

**Expected:** Error message "Already in hub" displayed, no teleport occurs

**Why human:** Edge case behavior — need to verify isHubZone guard works and error message displays correctly in UI

#### 5. Cooldown visible in UI

**Test:** After using home_recall, check abilities panel and action bar

**Expected:** 5-minute cooldown timer visible on home_recall ability in both locations

**Why human:** Visual UI verification — need to confirm cooldown display updates correctly in real-time

---

## Summary

All automated checks passed. Phase 96 goal achieved at the code level:

**Verified artifacts:**
- ability_cooldowns database schema with composite PK and index
- CRUD queries for cooldown persistence
- ABILITY_HOME_RECALL definition with 5-minute cooldown
- Universal ability injection in both server and client
- Cooldown persistence for abilities >= 1 minute
- Session restoration via restoreCooldowns on auth
- Home recall effect via teleportToHub with zone transition events

**Verified wiring:**
- home_recall injected in getPlayerAbilities() (server + client)
- saveCooldown/loadCooldowns wired to AbilityService
- teleportToHub called for home_recall effect
- restoreCooldowns called on player authentication
- ability:cooldown event handler exists on client

**Requirements satisfied:**
- TRAV-04: Universal home recall (not gear-dependent)
- TRAV-05: 5-minute cooldown

**No gaps found.** All observable truths verified, all artifacts substantive and wired, all key links connected.

**Human verification needed** for visual UI, real-time teleport behavior, session restoration, and edge case handling.

---

_Verified: 2026-02-26T08:56:35Z_
_Verifier: Claude (gsd-verifier)_
