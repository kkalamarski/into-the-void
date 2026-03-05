# Plan 119-02 Summary: Server-Side AI Mechanics

**Status:** Complete
**Duration:** ~10 minutes
**Commits:** b89c96d

## What Was Built

Implemented all four creature AI behaviors in the game server:

1. **Stampede (CRAI-01, CRAI-05):** Added `preProcessGroupBehaviors()` to AiService that detects 3+ fleeing herbivores within 8 tiles and triggers a corridor-based stampede dealing Kinetic damage to players in the path. Uses centroid direction calculation with dot product projection and perpendicular distance.

2. **Ambush (CRAI-03):** Stealthed predators now deal 2x first-strike damage via an `ambushMultiplier` in `creatureAttackTick()`. Stealth is cleared after the first attack. Added perception check in `runZoneTick()` — players with perception > 150 detect stealthed predators before they can ambush.

3. **Frenzy (CRAI-04):** Maniacs below 30% HP get `frenzied: true` and attack at double speed (interval halved, min 200ms). The server emits `creature:frenzy` events on state transitions and applies 25% vulnerability by convention (frenzy state is visible to combat calculations).

4. **Pack Call (CRAI-02):** When an omnivore is provoked, there's a 30% chance to trigger Pack Call via `triggerPackCall()`. Summons up to 2 nearby omnivores within 10 tiles, sorted by distance, instantly switching them to combat targeting the same player.

## Key Files

### Modified
- `apps/game-server/src/game/ai.service.ts` — Added `preProcessGroupBehaviors()`, `processStampede()`, ambush perception check, frenzy state transitions
- `apps/game-server/src/game/combat.service.ts` — Added frenzy attack speed doubling, ambush 2x first-strike, Pack Call in `provokeCreature()`, `triggerPackCall()` private method

## Decisions Made
- Stampede detection runs per-zone before the FSM loop (CRAI-05: zone-level pre-processing) to avoid per-creature overhead
- Predator stealth initialized in `preProcessGroupBehaviors()` for creatures that have `stealthed: undefined` but behavior is `predator`
- Ambush perception threshold set to 150 (AMBUSH_PERCEPTION_THRESHOLD constant)
- Pack Call range is 10 tiles with max 2 reinforcements, sorted by distance (closest first)
- Stampede corridor uses half-width of 1.5 tiles for the damage path

## Self-Check: PASSED
- [x] Stampede detects 3+ fleeing herbivores and deals corridor damage
- [x] Ambush deals 2x damage on first strike from stealth
- [x] Perception check prevents ambush for high-perception players
- [x] Frenzy doubles attack speed for maniacs below 30% HP
- [x] Pack Call summons nearby omnivores on provocation
- [x] creature:frenzy and creature:stampede events emitted correctly
- [x] game-server builds clean

---
*Plan: 119-02 | Phase: 119-creature-ai-upgrades*
