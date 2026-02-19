---
phase: 40-creature-combat-ai-and-aggro
verified: 2026-02-19T12:39:08Z
status: passed
score: 14/14 must-haves verified
re_verification: false
---

# Phase 40: Creature Combat AI and Aggro Verification Report

**Phase Goal:** Creatures with aggressive behaviors (predators, maniacs) automatically attack nearby players, omnivores retaliate when attacked, and all combat creatures have a state machine for attacking, chasing, and returning to spawn
**Verified:** 2026-02-19T12:39:08Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #  | Truth                                                                            | Status     | Evidence                                                                     |
|----|---------------------------------------------------------------------------------|------------|------------------------------------------------------------------------------|
| 1  | Creature interface includes spawnPosition field for leash calculation           | VERIFIED   | entity.ts line 48: `spawnPosition?: { x: number; y: number }`               |
| 2  | Creature interface includes combatTarget and provoked fields                    | VERIFIED   | entity.ts lines 50, 52: both optional fields present                         |
| 3  | Creatures are spawned with spawnPosition set to original spawn coordinates      | VERIFIED   | zones.service.ts line 171: `spawnPosition: { x: spawn.x, y: spawn.y }`      |
| 4  | tickCreatureAI FSM includes attacking, chasing, and returning states            | VERIFIED   | creature-ai.ts: tickPredator handles all three states with shouldAttack, chasing via moveToward, shouldReturn |
| 5  | Predator and maniac creatures detect players within 5 tiles and return aggroTarget | VERIFIED | creature-ai.ts lines 7,157-172: AGGRO_RADIUS=5, scans players, returns aggroTarget |
| 6  | Omnivore creatures only return aggro when marked as provoked                    | VERIFIED   | creature-ai.ts lines 81-93: tickOmnivore delegates to tickPredator only when creature.provoked |
| 7  | Creature chases player up to 10 tiles from spawn point                          | VERIFIED   | creature-ai.ts line 8,121: LEASH_DISTANCE=10; creature chases until combatTarget+distFromSpawn >= LEASH_DISTANCE |
| 8  | Creature returns to spawn when leash distance exceeded                          | VERIFIED   | creature-ai.ts lines 120-128: both active-combat leash and post-combat return cases handled |
| 9  | Creature stops combat when returning to spawn                                   | VERIFIED   | ai.service.ts line 144-154: shouldReturn triggers stopCreatureCombat and clears combatTarget/provoked |
| 10 | Predator/maniac creatures automatically enter combat with nearby players        | VERIFIED   | ai.service.ts lines 132-141: aggroTarget triggers startCreatureCombat and sets combatTarget |
| 11 | Creatures deal damage to players via combat:damage event                        | VERIFIED   | combat.service.ts 405-482: creatureAttackTick calculates damage, updates health; ai.service.ts 209-233 emits combat:damage |
| 12 | Omnivore creatures retaliate when attacked by a player                          | VERIFIED   | combat.service.ts lines 131-133: startCombat calls provokeCreature for omnivores; provokeCreature sets provoked=true |
| 13 | Creature attack speed is based on creature Haste stat                           | VERIFIED   | combat.service.ts lines 422-424: computeCharStats(creature.level) + calculateAttackInterval(creatureStats.haste) |
| 14 | Combat ends when player leaves zone during chase                                | VERIFIED   | combat.service.ts lines 415-419: zone check in creatureAttackTick stops session on zone change |

**Score:** 14/14 truths verified

### Required Artifacts

| Artifact                                                          | Expected                              | Status     | Details                                                                                       |
|-------------------------------------------------------------------|---------------------------------------|------------|-----------------------------------------------------------------------------------------------|
| `packages/shared-types/src/core/entity.ts`                        | Creature interface with spawnPosition, combatTarget, provoked | VERIFIED | All three optional fields present, lines 48-52 |
| `packages/game-logic/src/ai/creature-ai.ts`                       | Extended FSM with combat states       | VERIFIED   | Exports tickCreatureAI and AiTickResult; tickPredator, tickOmnivore, moveToward all implemented |
| `apps/game-server/src/zones/zones.service.ts`                     | createEntityFromSpawn sets spawnPosition | VERIFIED | Line 171 confirms assignment                                                                  |
| `apps/game-server/src/game/combat.service.ts`                     | Creature->player attack logic          | VERIFIED   | startCreatureCombat, creatureAttackTick, processCreatureCombatTick, provokeCreature all present |
| `apps/game-server/src/game/ai.service.ts`                         | Wiring of FSM aggro and attack intents | VERIFIED   | aggroTarget wired to startCreatureCombat; shouldReturn wired to stopCreatureCombat; processCreatureCombatTick called |
| `apps/game-server/src/game/player.service.ts`                     | updateHealth method                   | VERIFIED   | Lines 152-156: updateHealth(playerId, health) mutates in-memory player                        |

### Key Link Verification

| From                                     | To                                      | Via                                        | Status   | Details                                                         |
|------------------------------------------|-----------------------------------------|--------------------------------------------|----------|-----------------------------------------------------------------|
| `zones.service.ts`                        | `entity.ts`                             | spawnPosition set from spawn.x/spawn.y     | WIRED    | Line 171: `spawnPosition: { x: spawn.x, y: spawn.y }`          |
| `creature-ai.ts`                          | `entity.ts`                             | creature.behavior predator/maniac switch   | WIRED    | Lines 42-44: `case 'predator': case 'maniac': return tickPredator(...)` |
| `ai.service.ts`                           | `combat.service.ts`                     | startCreatureCombat and processCreatureCombatTick calls | WIRED | Lines 133, 206: both methods called |
| `combat.service.ts`                       | `game-logic/src/combat/damage.ts`       | calculateDamage import for creature damage | WIRED    | Line 11 import, lines 279, 448: both player and creature attack paths use calculateDamage |
| `creature-ai.ts`                          | `entity.ts`                             | creature.spawnPosition for leash calculation | WIRED  | Lines 107-128: spawnPosition used in chebyshevDistance and moveToward calls |
| `ai.service.ts`                           | `combat.service.ts`                     | stopCreatureCombat on shouldReturn         | WIRED    | Line 147: stopCreatureCombat(creature.id) on result.shouldReturn |

### Requirements Coverage

All phase 40 observable truths are satisfied by the implementation. The only noted intentional deferral is player death state propagation (entity:update + respawn) when killed by a creature — this is explicitly documented as a Phase 41 concern in both the plan task description and a code comment at combat.service.ts line 466.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `apps/game-server/src/game/combat.service.ts` | 466 | Comment: "death handling in Phase 41" | Info | Intentional deferral — player death state/respawn not emitted when creature kills player. This is a planned gap for Phase 41, not a hidden stub. |

No blocker or warning anti-patterns found. All `return null` occurrences are guard clauses (early exits on invalid state), not stub implementations.

### Human Verification Required

#### 1. Predator auto-aggro in live game session

**Test:** Join a zone with predator creatures, walk within 5 tiles of one.
**Expected:** Creature starts chasing, combat:damage events fire at Haste-gated intervals, player health decreases.
**Why human:** Real-time event sequencing and tick timing cannot be verified statically.

#### 2. Omnivore retaliation flow

**Test:** Find an omnivore creature, attack it once. Stop attacking.
**Expected:** Omnivore switches to chasing and attacking the player.
**Why human:** Requires live WebSocket session to verify provoked flag triggers FSM change.

#### 3. Leash escape

**Test:** Aggro a predator, then run 10+ tiles away from its spawn point.
**Expected:** Creature abandons chase, walks back toward spawn, damage events stop.
**Why human:** Requires visual observation of creature returning and confirming combat stops.

## Commits Verified

All 8 phase commits confirmed in git history:

- `3db8547` — feat(40-01): add spawnPosition, combatTarget, provoked to Creature interface
- `f88858a` — feat(40-01): set spawnPosition in createEntityFromSpawn
- `ac82cf6` — feat(40-01): extend tickCreatureAI FSM with combat states and aggro detection
- `4b529bd` — feat(40-02): add creature combat session tracking and attack logic to CombatService
- `a7ae197` — feat(40-02): add updateHealth method to PlayerService
- `321ba52` — feat(40-02): wire AiService to handle FSM aggro and attack intents
- `f86d68e` — feat(40-03): refine tickPredator FSM to handle returning state properly
- `dcd7dc2` — feat(40-03): add zone change guard and isCreatureInCombat to CombatService

## Build and Test Results

- `pnpm build` — 10/10 projects built successfully
- `nx run game-logic:test` — 12/12 tests passed (damage.test.ts: 8 tests, char-stats.test.ts: 4 tests)

---

_Verified: 2026-02-19T12:39:08Z_
_Verifier: Claude (gsd-verifier)_
