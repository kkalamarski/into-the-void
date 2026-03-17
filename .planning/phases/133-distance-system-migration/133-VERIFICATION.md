---
phase: 133-distance-system-migration
verified: 2026-03-17T23:31:47Z
status: gaps_found
score: 14/17 must-haves verified
gaps:
  - truth: "Gathering interaction range uses pixel distance for artifacts (DIST-02)"
    status: failed
    reason: "entity.service.ts::handleToolUse uses legacy canInteract() (tile Manhattan distance) as its only range check. Artifacts routed via the gathering:start path skip the canInteractPixel pre-check, and the entity:tool_use gateway path has no pre-check at all — both paths fall through to the tile-based check."
    artifacts:
      - path: "apps/game-server/src/game/entity.service.ts"
        issue: "Line 77: const check = canInteract(player, entity, toolRange) — tile manhattanDistance, not pixel Euclidean. This is the sole range check for artifact collection via entity:tool_use and the fallback check within gathering:start for artifacts."
    missing:
      - "Replace canInteract(player, entity, toolRange) with canInteractPixel(player.px, player.py, entity, GATHER_RANGE_PX) in entity.service.ts::handleToolUse"
      - "Import canInteractPixel and GATHER_RANGE_PX from @into-the-void/game-logic in entity.service.ts"
  - truth: "Combat range checks use pixel Euclidean distance — no tile-integer distances remain in active combat paths (DIST-01)"
    status: partial
    reason: "ability.service.ts line 974: Precision Shot predator reveal uses Chebyshev tile distance (Math.max(Math.abs(e.position.x - player.position.x), ...)) <= effect.radiusTiles. This is an active combat effect range check still using tile coordinates."
    artifacts:
      - path: "apps/game-server/src/game/ability.service.ts"
        issue: "Line 973-976: Precision Shot reveal effect uses Chebyshev tile distance against effect.radiusTiles — not pixel Euclidean distance."
    missing:
      - "Replace the Chebyshev predator reveal filter with pixelDistanceTo(tileToPixelCenter(e.position), tileToPixelCenter(player.position)) <= effect.radiusTiles * TILE_SIZE_PX"
  - truth: "Creature AI aggro and leash ranges use pixel distance — no tile-integer distances remain (DIST-04)"
    status: partial
    reason: "combat.service.ts triggerPackCall uses Chebyshev tile distance (Math.max(Math.abs(...)) <= PACK_CALL_RANGE=10) to find omnivore pack reinforcements. The research doc explicitly listed combat.service.ts as in scope for DIST-04."
    artifacts:
      - path: "apps/game-server/src/game/combat.service.ts"
        issue: "Lines 433-436: triggerPackCall filters nearby omnivores with Chebyshev tile distance <= 10. Also lines 442-443 use Chebyshev to sort the reinforcements by proximity."
    missing:
      - "Replace PACK_CALL_RANGE Chebyshev filter with pixelDistanceTo using tileToPixelCenter on both creature positions, against PACK_CALL_RANGE * TILE_SIZE_PX"
      - "Replace sort comparator (lines 442-443) with pixel distance sort for consistency"
---

# Phase 133: Distance System Migration Verification Report

**Phase Goal:** Every game system that performs a range check uses pixel Euclidean distance via `pixelDistanceTo()` — no tile-integer distances remain in active gameplay code
**Verified:** 2026-03-17T23:31:47Z
**Status:** GAPS FOUND
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | PlayerPublic carries px/py fields populated from ConnectedPlayer | VERIFIED | `packages/shared-types/src/core/player.ts` lines 56-58 — `px: number; py: number` with Phase 133 comment. `apps/game-server/src/game/player.service.ts` lines 396-397 populates `px: player.px, py: player.py` |
| 2 | canInteractPixel returns false with 'Out of range' when entity is beyond rangePx | VERIFIED | `packages/game-logic/src/interaction/interaction.ts` lines 84-99 — returns `{ canInteract: false, reason: 'Out of range' }` when dist > rangePx |
| 3 | canInteractPixel returns true when entity is within rangePx | VERIFIED | Same function — returns `{ canInteract: true }` when dist <= rangePx |
| 4 | FLEE_RADIUS_PX constant exists and equals 5 * TILE_SIZE_PX (640) | VERIFIED | `packages/game-logic/src/movement/pixel-distance.ts` line 54: `export const FLEE_RADIUS_PX = 5.0 * TILE_SIZE_PX; // 640 px` |
| 5 | Combat ability range checks use canInteractPixel with player px/py, not tile manhattanDistance | VERIFIED | `apps/game-server/src/game/ability.service.ts` lines 341, 357: `canInteractPixel(player.px, player.py, entity/target, ...)` |
| 6 | Creature combat adjacency check uses pixel distance against MELEE_RANGE_PX | VERIFIED | `apps/game-server/src/game/combat.service.ts` lines 221-224: `pixelDistanceTo(cpx, cpy, player.px, player.py)` checked against `MELEE_RANGE_PX` |
| 7 | getNearbyCreatures uses pixelDistanceTo with tileToPixelCenter, not Chebyshev | VERIFIED | `apps/game-server/src/game/ability.service.ts` line 1294: `pixelDistanceTo(cPx, cPy, ePx, ePy) <= radiusPx` |
| 8 | Gathering start uses canInteractPixel for range validation (minerals/plants) | VERIFIED | `apps/game-server/src/game/gathering.service.ts` line 177: `canInteractPixel(player.px, player.py, entity, GATHER_RANGE_PX)` |
| 9 | Gathering start uses pixel range for artifact collection | FAILED | `apps/game-server/src/game/gathering.service.ts` line 160-162: artifacts skip `canInteractPixel` and delegate to `entity.service.ts::handleToolUse` which still uses `canInteract()` (tile manhattanDistance) at line 77 |
| 10 | Moving out of GATHER_RANGE_PX during active gather cancels the challenge immediately | VERIFIED | `apps/game-server/src/game/gathering.service.ts` lines 368-384: `cancelIfOutOfRange` method exists and deletes activeChallenges when dist > GATHER_RANGE_PX. Wired in `game.gateway.ts` line 292 |
| 11 | NPC interact handler rejects requests when player is beyond NPC_INTERACT_RANGE_PX | VERIFIED | `apps/game-server/src/game/game.gateway.ts` lines 1173-1174: `pixelDistanceTo(player.px, player.py, npcPx, npcPy)` checked against `NPC_INTERACT_RANGE_PX` |
| 12 | Failed attack due to range returns 'Out of range' error message | VERIFIED | `packages/game-logic/src/interaction/interaction.ts` line 96: reason string is `'Out of range'` |
| 13 | Creature aggro detection uses pixelDistanceTo against AGGRO_RADIUS_PX | VERIFIED | `packages/game-logic/src/ai/creature-ai.ts`: all aggro scans use `creatureToPlayerDist()` helper (pixelDistanceTo) against `AGGRO_RADIUS_PX`. `apps/game-server/src/game/ai.service.ts` lines 152-154, 203-205, 242-244: same pattern |
| 14 | Creature leash check uses pixelDistanceTo against LEASH_RADIUS_PX | VERIFIED | `packages/game-logic/src/ai/creature-ai.ts` line 151: `distFromSpawn >= LEASH_RADIUS_PX`. `apps/game-server/src/game/ai.service.ts`: LEASH_RADIUS_PX imported and used |
| 15 | Herbivore flee detection uses pixelDistanceTo against FLEE_RADIUS_PX | VERIFIED | `packages/game-logic/src/ai/creature-ai.ts` line 85: `.filter(({ dist }) => dist <= FLEE_RADIUS_PX)`. `apps/game-server/src/game/ai.service.ts` line 328: same pattern |
| 16 | No tile-integer distances remain in active combat paths (DIST-01) | FAILED | `apps/game-server/src/game/ability.service.ts` lines 973-976: Precision Shot predator reveal uses Chebyshev tile distance `Math.max(Math.abs(e.position.x - player.position.x), ...) <= effect.radiusTiles` |
| 17 | No tile-integer distances remain in AI/creature range checks (DIST-04) | FAILED | `apps/game-server/src/game/combat.service.ts` lines 433-436: `triggerPackCall` uses Chebyshev tile distance `Math.max(Math.abs(e.position.x - provoker.position.x), ...) <= PACK_CALL_RANGE` |

**Score: 14/17 truths verified**

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `packages/shared-types/src/core/player.ts` | px/py fields on PlayerPublic | VERIFIED | Lines 55-58: `px: number; py: number` with doc comments |
| `packages/game-logic/src/movement/pixel-distance.ts` | FLEE_RADIUS_PX constant | VERIFIED | Line 54: `export const FLEE_RADIUS_PX = 5.0 * TILE_SIZE_PX; // 640 px` |
| `packages/game-logic/src/interaction/interaction.ts` | canInteractPixel function | VERIFIED | Lines 84-99: fully implemented with active/range checks |
| `apps/game-server/src/game/player.service.ts` | px/py populated in getPlayersInZone | VERIFIED | Lines 396-397: `px: player.px, py: player.py` in push |
| `apps/game-server/src/game/ability.service.ts` | Pixel-distance combat and AoE range checks | PARTIAL | Lines 341, 357 use canInteractPixel. Line 1294 uses pixelDistanceTo. But lines 973-976 still use Chebyshev for Precision Shot reveal |
| `apps/game-server/src/game/combat.service.ts` | Pixel-distance creature attack adjacency | PARTIAL | Line 223: pixelDistanceTo + MELEE_RANGE_PX. But lines 433-436: PACK_CALL_RANGE uses Chebyshev |
| `apps/game-server/src/game/gathering.service.ts` | Pixel-distance gather start + continuous cancel | PARTIAL | Line 177: canInteractPixel for minerals/plants. Lines 372-384: cancelIfOutOfRange. But artifact path (line 162) bypasses pixel check |
| `apps/game-server/src/game/game.gateway.ts` | NPC range guard + gather cancel wiring | VERIFIED | Line 1173-1174: NPC range guard. Line 292: cancelIfOutOfRange wired |
| `packages/game-logic/src/ai/creature-ai.ts` | Pure FSM with pixel distance calculations | VERIFIED | pixelDistanceTo used throughout; old tile constants removed |
| `apps/game-server/src/game/ai.service.ts` | Aggro delay, '!' emission, leash HP heal, pixel distance | VERIFIED | pendingAggro map (line 55), AGGRO_DELAY_MS=500 (line 40), creature:aggro_detected emission (line 508), health=creature.maxHealth (line 561) |
| `apps/web/src/game/scenes/WorldScene.ts` | Pixel-granularity zone boundary detection and range indicators | VERIFIED | Line 1310: getZoneBoundaryDepthPx. Line 43: HYSTERESIS_PX=384px. Lines 1324, 1350: updateRangeIndicator, updateNpcProximity |
| `apps/web/src/game/rendering/TargetHighlight.ts` | setInRange method for range-based color change | VERIFIED | Lines 133-134: setInRange method. Lines 19, 22: inRange field, OUT_OF_RANGE_ALPHA. Line 148: effectiveAlpha dimming |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `packages/shared-types/src/core/player.ts` | `apps/game-server/src/game/player.service.ts` | PlayerPublic interface consumed by getPlayersInZone | WIRED | player.service.ts line 396-397 maps px/py from ConnectedPlayer |
| `packages/game-logic/src/interaction/interaction.ts` | `packages/game-logic/src/movement/pixel-distance.ts` | canInteractPixel imports pixelDistanceTo and tileToPixelCenter | WIRED | interaction.ts line 11: `import { pixelDistanceTo, tileToPixelCenter }` |
| `apps/game-server/src/game/ability.service.ts` | `packages/game-logic/src/interaction/interaction.ts` | import canInteractPixel | WIRED | ability.service.ts line 13: `canInteractPixel` in import; used at lines 341, 357 |
| `apps/game-server/src/game/gathering.service.ts` | `apps/game-server/src/game/movement.service.ts` | cancelIfOutOfRange called from movement tick path | WIRED | game.gateway.ts line 292: `this.gatheringService.cancelIfOutOfRange(...)` in handlePixelMove |
| `apps/game-server/src/game/game.gateway.ts` | `packages/game-logic/src/movement/pixel-distance.ts` | NPC_INTERACT_RANGE_PX constant import | WIRED | game.gateway.ts line 47: NPC_INTERACT_RANGE_PX in import; used at line 1174 |
| `packages/game-logic/src/ai/creature-ai.ts` | `packages/game-logic/src/movement/pixel-distance.ts` | imports pixelDistanceTo, tileToPixelCenter, range constants | WIRED | creature-ai.ts line 4: `import { pixelDistanceTo, tileToPixelCenter, AGGRO_RADIUS_PX, LEASH_RADIUS_PX, FLEE_RADIUS_PX, MELEE_RANGE_PX }` |
| `apps/game-server/src/game/ai.service.ts` | `packages/game-logic/src/movement/pixel-distance.ts` | imports AGGRO_RADIUS_PX, LEASH_RADIUS_PX, FLEE_RADIUS_PX for inline checks | WIRED | ai.service.ts line 7: AGGRO_RADIUS_PX imported; used at lines 154, 205, 244 |
| `apps/web/src/game/scenes/WorldScene.ts` | `packages/game-logic/src/movement/pixel-distance.ts` | imports TILE_SIZE_PX, pixelDistanceTo, tileToPixelCenter, range constants | WIRED | WorldScene.ts line 43: `const HYSTERESIS_PX = HYSTERESIS_TILES * TILE_SIZE_PX` |
| `apps/web/src/game/rendering/TargetHighlight.ts` | `apps/web/src/game/scenes/WorldScene.ts` | WorldScene calls setInRange on target highlight during update | WIRED | WorldScene.ts line 1342: `this.targetHighlight.setInRange(inRange)` |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| DIST-01 | 133-02, 133-04 | Combat range checks use pixel Euclidean distance instead of tile distance | PARTIAL | canInteractPixel used for melee/gather range checks in ability.service.ts. Creature melee adjacency migrated in combat.service.ts. BUT: Precision Shot predator reveal (ability.service.ts:973-976) still uses Chebyshev tile distance |
| DIST-02 | 133-02, 133-04 | Gathering interaction range uses pixel distance | PARTIAL | Mineral/plant gathering uses canInteractPixel (gathering.service.ts:177). cancelIfOutOfRange wired. BUT: artifact collection in entity.service.ts:77 still uses tile-based canInteract |
| DIST-03 | 133-02, 133-04 | NPC interaction range uses pixel distance | SATISFIED | game.gateway.ts lines 1173-1174: pixelDistanceTo against NPC_INTERACT_RANGE_PX. NPC proximity tracking in WorldScene via updateNpcProximity |
| DIST-04 | 133-03 | Creature AI aggro and leash ranges use pixel distance | PARTIAL | creature-ai.ts and ai.service.ts fully migrated. Melee adjacency in combat.service.ts migrated. BUT: triggerPackCall in combat.service.ts:433-436 still uses Chebyshev tile distance for pack reinforcement range |
| DIST-05 | 133-03 | Fog of war reveal radius uses pixel distance | SKIPPED | Explicitly skipped per user decision — fog of war system is being deleted. No code written. |
| DIST-06 | 133-04 | Zone boundary detection works at pixel granularity | SATISFIED | WorldScene.ts getZoneBoundaryDepthPx (line 1310), HYSTERESIS_PX=384px (line 43), both zone callers updated (lines 1142-1143, 1174-1176) |

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `apps/game-server/src/game/entity.service.ts` | 77 | `canInteract(player, entity, toolRange)` — tile Manhattan distance as sole range check | Blocker | Artifact collection bypasses pixel distance migration. Players can interact with artifacts from tile-adjacent distances even if sub-tile pixel position is out of range |
| `apps/game-server/src/game/ability.service.ts` | 973-976 | `Math.max(Math.abs(e.position.x - player.position.x), ...) <= effect.radiusTiles` — Chebyshev tile distance for Precision Shot reveal | Blocker | Active combat effect still uses tile-integer range check, violating the phase goal |
| `apps/game-server/src/game/combat.service.ts` | 433-436 | `Math.max(Math.abs(e.position.x - provoker.position.x), ...) <= PACK_CALL_RANGE` — Chebyshev tile distance for pack reinforcement range | Blocker | Creature pack call summon radius uses tile distance, violating phase goal for DIST-04 (combat.service.ts explicitly in scope per research) |
| `apps/game-server/src/game/combat.service.ts` | 442-443 | Chebyshev tile distance used in sort comparator for pack reinforcements | Warning | Sorting is less critical than range gating, but inconsistent with pixel distance migration |

---

## Human Verification Required

### 1. Artifact Collection Visual Range Feedback

**Test:** Position player character just outside 192px of an artifact and attempt to click it (artifact collection via entity:tool_use)
**Expected:** Collection should fail with a range error because tile-based canInteract may still allow interaction within 1 tile even if pixel distance > GATHER_RANGE_PX
**Why human:** The exact interaction requires running the game with a pixel ruler to confirm the boundary difference between tile-based (~128-180px depending on diagonal) and pixel-based (192px) range

### 2. 0.5s Aggro Delay Visual Feedback

**Test:** Walk a player character into AGGRO_RADIUS_PX (512px = 4 tiles) of a predator creature and observe
**Expected:** "!" icon appears above creature; ~0.5s later combat begins (not instant aggro)
**Why human:** Event emission and timing can only be verified in the running game; the code logic is correct but visual timing confirmation requires observation

### 3. Leash HP Heal Visual Feedback

**Test:** Engage a creature in combat, then run it to its leash boundary (LEASH_RADIUS_PX = 8 tiles from spawn)
**Expected:** Creature stops pursuing, health bar refills to 100% instantly, entity:update broadcast causes client health bar refresh
**Why human:** Visual confirmation of health bar animation and timing requires running game

### 4. Target Highlight Range Dimming

**Test:** Target a creature or mineral node and observe the highlight ring as player approaches from out of range to in range
**Expected:** Ring should be dim (30% alpha) when out of MELEE/GATHER range; pulses at full brightness when within range
**Why human:** Visual rendering confirmation requires a running game

### 5. NPC Interaction Prompt Boundary

**Test:** Walk toward an NPC; observe when interaction prompt appears/disappears
**Expected:** Prompt appears instantly at NPC_INTERACT_RANGE_PX (192px = 1.5 tiles); disappears instantly when exceeding that range
**Why human:** Client-side proximity update uses tileToPixelCenter stopgap until Phase 134 — confirm boundary feels correct at sub-tile positions

---

## Gaps Summary

Three gaps block full goal achievement:

**Gap 1: Artifact collection (DIST-02 partial)** — `entity.service.ts::handleToolUse` is the sole range check for artifact collection (via both `entity:tool_use` event and the artifact branch in `gathering:start`). It uses the legacy tile-based `canInteract()`. The fix is straightforward: replace `canInteract(player, entity, toolRange)` with `canInteractPixel(player.px, player.py, entity, GATHER_RANGE_PX)` in entity.service.ts.

**Gap 2: Precision Shot predator reveal (DIST-01 partial)** — `ability.service.ts` line 973-976 uses `Math.max(Math.abs(e.position.x - player.position.x), Math.abs(e.position.y - player.position.y)) <= effect.radiusTiles` for the Precision Shot ability's reveal effect. This Chebyshev check should use pixel distance with `effect.radiusTiles * TILE_SIZE_PX`.

**Gap 3: Pack Call range (DIST-04 partial)** — `combat.service.ts::triggerPackCall` uses Chebyshev tile distance (`PACK_CALL_RANGE = 10` tiles) to find omnivore reinforcements. The research document explicitly included `combat.service.ts` in the DIST-04 scope. The fix requires using `pixelDistanceTo` with `tileToPixelCenter` for both creature and provoker positions.

All three are in active gameplay paths. The sort comparator in `combat.service.ts` lines 442-443 is lower severity (sorting, not gating) but should be fixed alongside Gap 3 for consistency.

---

_Verified: 2026-03-17T23:31:47Z_
_Verifier: Claude (gsd-verifier)_
