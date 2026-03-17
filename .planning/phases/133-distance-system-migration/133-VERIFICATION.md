---
phase: 133-distance-system-migration
verified: 2026-03-18T00:10:00Z
status: passed
score: 17/17 must-haves verified
re_verification:
  previous_status: gaps_found
  previous_score: 14/17
  gaps_closed:
    - "Artifact collection in entity.service.ts now uses canInteractPixel(player.px, player.py, entity, GATHER_RANGE_PX)"
    - "Precision Shot predator reveal in ability.service.ts now uses pixelDistanceTo + tileToPixelCenter against effect.radiusTiles * TILE_SIZE_PX"
    - "Pack Call range filter and sort in combat.service.ts now use pixelDistanceTo + tileToPixelCenter with PACK_CALL_RANGE_PX"
  gaps_remaining: []
  regressions: []
---

# Phase 133: Distance System Migration Verification Report

**Phase Goal:** Every game system that performs a range check uses pixel Euclidean distance via `pixelDistanceTo()` — no tile-integer distances remain in active gameplay code
**Verified:** 2026-03-18T00:10:00Z
**Status:** PASSED
**Re-verification:** Yes — after gap closure (plan 133-05)

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | PlayerPublic carries px/py fields populated from ConnectedPlayer | VERIFIED | `packages/shared-types/src/core/player.ts` lines 56/58: `px: number; py: number`. `player.service.ts` lines 396-397 populate both fields. |
| 2 | canInteractPixel returns false with 'Out of range' when entity is beyond rangePx | VERIFIED | `packages/game-logic/src/interaction/interaction.ts` line 84+: returns `{ canInteract: false, reason: 'Out of range' }` when dist > rangePx |
| 3 | canInteractPixel returns true when entity is within rangePx | VERIFIED | Same function — returns `{ canInteract: true }` when dist <= rangePx |
| 4 | FLEE_RADIUS_PX constant exists and equals 5 * TILE_SIZE_PX (640) | VERIFIED | `packages/game-logic/src/movement/pixel-distance.ts` line 54: `export const FLEE_RADIUS_PX = 5.0 * TILE_SIZE_PX; // 640 px` |
| 5 | Combat ability range checks use canInteractPixel with player px/py, not tile manhattanDistance | VERIFIED | `ability.service.ts` lines 341, 357: `canInteractPixel(player.px, player.py, ...)` |
| 6 | Creature combat adjacency check uses pixel distance against MELEE_RANGE_PX | VERIFIED | `combat.service.ts` lines 223-224: `pixelDistanceTo(cpx, cpy, player.px, player.py)` <= `MELEE_RANGE_PX` |
| 7 | getNearbyCreatures uses pixelDistanceTo with tileToPixelCenter, not Chebyshev | VERIFIED | `ability.service.ts` line 1294: `pixelDistanceTo(cPx, cPy, ePx, ePy) <= radiusPx` |
| 8 | Gathering start uses canInteractPixel for range validation (minerals/plants) | VERIFIED | `gathering.service.ts` line 177: `canInteractPixel(player.px, player.py, entity, GATHER_RANGE_PX)` |
| 9 | Artifact collection in entity.service.ts uses canInteractPixel — no legacy canInteract remains | VERIFIED | `entity.service.ts` line 79 (comment: "Validate range (pixel distance, DIST-02)"): `canInteractPixel(player.px, player.py, entity, GATHER_RANGE_PX)`. Zero legacy `canInteract(` calls remain in entity.service.ts outside imports. |
| 10 | Moving out of GATHER_RANGE_PX during active gather cancels the challenge | VERIFIED | `gathering.service.ts` lines 372-384: `cancelIfOutOfRange` method. `game.gateway.ts` line 292: wired in `handlePixelMove` path |
| 11 | NPC interact handler rejects requests when player is beyond NPC_INTERACT_RANGE_PX | VERIFIED | `game.gateway.ts` lines 1173-1174: `pixelDistanceTo(player.px, player.py, npcPx, npcPy) > NPC_INTERACT_RANGE_PX` |
| 12 | Failed attack due to range returns 'Out of range' error message | VERIFIED | `packages/game-logic/src/interaction/interaction.ts` line 96: reason string is `'Out of range'` |
| 13 | Creature aggro detection uses pixelDistanceTo against AGGRO_RADIUS_PX | VERIFIED | `creature-ai.ts` and `ai.service.ts` (lines 152-154, 203-205, 242-244): all aggro scans use `pixelDistanceTo` against `AGGRO_RADIUS_PX` |
| 14 | Creature leash check uses pixelDistanceTo against LEASH_RADIUS_PX | VERIFIED | `creature-ai.ts` line 151: `distFromSpawn >= LEASH_RADIUS_PX`. `ai.service.ts`: LEASH_RADIUS_PX imported and used |
| 15 | Herbivore flee detection uses pixelDistanceTo against FLEE_RADIUS_PX | VERIFIED | `creature-ai.ts` line 85: `.filter(({ dist }) => dist <= FLEE_RADIUS_PX)` |
| 16 | No tile-integer distances remain in active combat paths — Precision Shot reveal uses pixel distance (DIST-01) | VERIFIED | `ability.service.ts` lines 973-976: IIFE uses `tileToPixelCenter(e.position.x, e.position.y)` then `pixelDistanceTo(ePx, ePy, player.px, player.py) <= effect.radiusTiles * TILE_SIZE_PX`. No `Math.max(Math.abs(...))` pattern remains. |
| 17 | No tile-integer distances remain in AI/creature range checks — Pack Call uses pixel distance (DIST-04) | VERIFIED | `combat.service.ts` lines 422-448: `PACK_CALL_RANGE_PX = 10 * TILE_SIZE_PX`, provoker pixel center pre-computed at line 426, filter at line 439 uses `pixelDistanceTo(ePx, ePy, provPx, provPy) <= PACK_CALL_RANGE_PX`, sort at lines 446-448 uses `pixelDistanceTo` consistently. No `Math.max(Math.abs(...))` pattern remains. |

**Score: 17/17 truths verified**

---

## Gap Closure Verification (Plan 133-05)

Three gaps identified in initial verification were all addressed in commits `224241c` and `17c73dc`:

### Gap 1: Artifact collection (DIST-02) — CLOSED

**Before:** `entity.service.ts` line 77 used `canInteract(player, entity, toolRange)` — tile Manhattan distance.

**After:** `entity.service.ts` line 79 uses `canInteractPixel(player.px, player.py, entity, GATHER_RANGE_PX)`. Both `canInteractPixel` and `GATHER_RANGE_PX` added to the import from `@into-the-void/game-logic` at lines 15-22. No legacy `canInteract(` call remains in the file (excluding imports and the pixel variant).

### Gap 2: Precision Shot predator reveal (DIST-01) — CLOSED

**Before:** `ability.service.ts` lines 973-976 used `Math.max(Math.abs(e.position.x - player.position.x), Math.abs(e.position.y - player.position.y)) <= effect.radiusTiles`.

**After:** IIFE at lines 973-976 computes `tileToPixelCenter(e.position.x, e.position.y)` and tests `pixelDistanceTo(ePx, ePy, player.px, player.py) <= effect.radiusTiles * TILE_SIZE_PX`. Uses `player.px`/`player.py` directly (real-time ConnectedPlayer position). No Chebyshev pattern remains in ability.service.ts.

### Gap 3: Pack Call range filter and sort (DIST-04) — CLOSED

**Before:** `combat.service.ts` used `const PACK_CALL_RANGE = 10` with `Math.max(Math.abs(...))` Chebyshev for both filter (lines 432-436) and sort (lines 442-443).

**After:**
- `PACK_CALL_RANGE_PX = 10 * TILE_SIZE_PX` (1280px) at line 422
- Provoker pixel center pre-computed once at line 426: `tileToPixelCenter(provoker.position.x, provoker.position.y)`
- Filter IIFE at lines 437-440 uses `pixelDistanceTo(ePx, ePy, provPx, provPy) <= PACK_CALL_RANGE_PX`
- Sort at lines 445-449 uses `pixelDistanceTo(aPx, aPy, provPx, provPy) - pixelDistanceTo(bPx, bPy, provPx, provPy)`
- No Chebyshev pattern remains in combat.service.ts.

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `packages/shared-types/src/core/player.ts` | px/py fields on PlayerPublic | VERIFIED | Lines 56/58: `px: number; py: number` |
| `packages/game-logic/src/movement/pixel-distance.ts` | FLEE_RADIUS_PX constant | VERIFIED | Line 54: `export const FLEE_RADIUS_PX = 5.0 * TILE_SIZE_PX` |
| `packages/game-logic/src/interaction/interaction.ts` | canInteractPixel function | VERIFIED | Line 84+: fully implemented with active/range checks |
| `apps/game-server/src/game/player.service.ts` | px/py populated in getPlayersInZone | VERIFIED | Lines 396-397: `px: player.px, py: player.py` |
| `apps/game-server/src/game/entity.service.ts` | Pixel-distance artifact collection range check | VERIFIED | Line 79: `canInteractPixel(player.px, player.py, entity, GATHER_RANGE_PX)`. No legacy `canInteract(` in active paths. |
| `apps/game-server/src/game/ability.service.ts` | Pixel-distance combat and AoE range checks including Precision Shot reveal | VERIFIED | Lines 341, 357: `canInteractPixel`. Line 975: `pixelDistanceTo(ePx, ePy, player.px, player.py) <= effect.radiusTiles * TILE_SIZE_PX`. Line 1294: `pixelDistanceTo`. No Chebyshev patterns remain. |
| `apps/game-server/src/game/combat.service.ts` | Pixel-distance creature attack adjacency and pack call | VERIFIED | Line 224: `pixelDistanceTo` + `MELEE_RANGE_PX`. Lines 422-449: `PACK_CALL_RANGE_PX`, filter and sort both use `pixelDistanceTo`. No Chebyshev patterns remain. |
| `apps/game-server/src/game/gathering.service.ts` | Pixel-distance gather start + continuous cancel | VERIFIED | Line 177: `canInteractPixel` for minerals/plants/artifacts. Lines 372-384: `cancelIfOutOfRange`. Artifact path now also protected by `canInteractPixel` in entity.service.ts before delegation. |
| `apps/game-server/src/game/game.gateway.ts` | NPC range guard + gather cancel wiring | VERIFIED | Line 1174: NPC range guard. Line 292: `cancelIfOutOfRange` wired in `handlePixelMove` |
| `packages/game-logic/src/ai/creature-ai.ts` | Pure FSM with pixel distance calculations | VERIFIED | `pixelDistanceTo` used throughout; old tile constants removed |
| `apps/game-server/src/game/ai.service.ts` | Aggro delay, '!' emission, leash HP heal, pixel distance | VERIFIED | pendingAggro map, AGGRO_DELAY_MS=500, `creature:aggro_detected` emission, leash health reset |
| `apps/web/src/game/scenes/WorldScene.ts` | Pixel-granularity zone boundary detection and range indicators | VERIFIED | `HYSTERESIS_PX=384px` (line 43), `getZoneBoundaryDepthPx` (line 1142/1174) |
| `apps/web/src/game/rendering/TargetHighlight.ts` | setInRange method for range-based color change | VERIFIED | Line 133: `setInRange(inRange: boolean)` |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `packages/shared-types/src/core/player.ts` | `apps/game-server/src/game/player.service.ts` | PlayerPublic px/py populated from ConnectedPlayer | WIRED | player.service.ts lines 396-397 |
| `packages/game-logic/src/interaction/interaction.ts` | `packages/game-logic/src/movement/pixel-distance.ts` | canInteractPixel imports pixelDistanceTo + tileToPixelCenter | WIRED | interaction.ts line 11 |
| `apps/game-server/src/game/entity.service.ts` | `@into-the-void/game-logic` | imports canInteractPixel, GATHER_RANGE_PX | WIRED | entity.service.ts lines 15-22: both imported. Line 79: `canInteractPixel(player.px, ...)` used. |
| `apps/game-server/src/game/ability.service.ts` | `@into-the-void/game-logic` | pixelDistanceTo + tileToPixelCenter for reveal effect | WIRED | ability.service.ts line 13: both imported. Lines 974-975: `tileToPixelCenter` then `pixelDistanceTo(ePx, ePy, player.px, player.py)` |
| `apps/game-server/src/game/combat.service.ts` | `@into-the-void/game-logic` | pixelDistanceTo + tileToPixelCenter for pack call | WIRED | combat.service.ts lines 17-18: imported. Lines 426, 438-439, 446-448: used with `PACK_CALL_RANGE_PX` |
| `apps/game-server/src/game/gathering.service.ts` | `apps/game-server/src/game/movement.service.ts` | cancelIfOutOfRange called from movement tick path | WIRED | game.gateway.ts line 292: `this.gatheringService.cancelIfOutOfRange(...)` in `handlePixelMove` |
| `apps/game-server/src/game/game.gateway.ts` | `packages/game-logic/src/movement/pixel-distance.ts` | NPC_INTERACT_RANGE_PX constant import | WIRED | game.gateway.ts line 47: imported; used at line 1174 |
| `packages/game-logic/src/ai/creature-ai.ts` | `packages/game-logic/src/movement/pixel-distance.ts` | imports pixelDistanceTo, tileToPixelCenter, range constants | WIRED | creature-ai.ts line 4: all constants imported and used throughout FSM |
| `apps/game-server/src/game/ai.service.ts` | `packages/game-logic/src/movement/pixel-distance.ts` | imports AGGRO_RADIUS_PX, LEASH_RADIUS_PX, FLEE_RADIUS_PX | WIRED | ai.service.ts line 7+: imported; used at lines 154, 205, 244, 328 |
| `apps/web/src/game/scenes/WorldScene.ts` | `packages/game-logic/src/movement/pixel-distance.ts` | TILE_SIZE_PX, pixelDistanceTo, tileToPixelCenter, range constants | WIRED | WorldScene.ts line 43: HYSTERESIS_PX derived from TILE_SIZE_PX |
| `apps/web/src/game/rendering/TargetHighlight.ts` | `apps/web/src/game/scenes/WorldScene.ts` | WorldScene calls setInRange during update | WIRED | WorldScene.ts line 1342: `this.targetHighlight.setInRange(inRange)` |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| DIST-01 | 133-02, 133-04, 133-05 | Combat range checks use pixel Euclidean distance instead of tile distance | SATISFIED | `canInteractPixel` used for melee/gather range in ability.service.ts. Creature melee adjacency in combat.service.ts uses `pixelDistanceTo` + `MELEE_RANGE_PX`. Precision Shot reveal (ability.service.ts:974-975) now uses `pixelDistanceTo(ePx, ePy, player.px, player.py) <= effect.radiusTiles * TILE_SIZE_PX`. No Chebyshev patterns remain. |
| DIST-02 | 133-02, 133-04, 133-05 | Gathering interaction range uses pixel distance | SATISFIED | Mineral/plant gathering: `gathering.service.ts:177` uses `canInteractPixel`. Artifact collection: `entity.service.ts:79` uses `canInteractPixel(player.px, player.py, entity, GATHER_RANGE_PX)`. `cancelIfOutOfRange` wired in movement path. All gather paths use pixel distance. |
| DIST-03 | 133-02, 133-04 | NPC interaction range uses pixel distance | SATISFIED | `game.gateway.ts:1174`: `pixelDistanceTo` against `NPC_INTERACT_RANGE_PX`. NPC proximity tracking in WorldScene via `updateNpcProximity`. |
| DIST-04 | 133-03, 133-05 | Creature AI aggro and leash ranges use pixel distance | SATISFIED | `creature-ai.ts` and `ai.service.ts` fully migrated with pixel constants. Melee adjacency in `combat.service.ts` uses `pixelDistanceTo`. Pack Call filter and sort in `combat.service.ts:422-449` use `PACK_CALL_RANGE_PX` and `pixelDistanceTo`. No Chebyshev patterns remain. |
| DIST-05 | N/A | Fog of war reveal radius uses pixel distance | SKIPPED — NOT APPLICABLE | Explicitly skipped per user decision. Fog of war system is being deleted. No implementation written or required. |
| DIST-06 | 133-04 | Zone boundary detection works at pixel granularity | SATISFIED | `WorldScene.ts`: `getZoneBoundaryDepthPx` (line 1142/1174), `HYSTERESIS_PX=384px` (line 43), both zone callers updated. |

---

## Anti-Patterns Found

No blockers or warnings in gap-closure files. Post-closure scan:

| File | Pattern | Status |
|------|---------|--------|
| `apps/game-server/src/game/entity.service.ts` | `Math.max(Math.abs(...position...))` Chebyshev | NOT FOUND — clean |
| `apps/game-server/src/game/ability.service.ts` | `Math.max(Math.abs(...position...))` Chebyshev | NOT FOUND — clean |
| `apps/game-server/src/game/combat.service.ts` | `Math.max(Math.abs(...position...))` Chebyshev | NOT FOUND — clean |
| `apps/game-server/src/game/gathering.service.ts` | `Math.max(Math.abs(...position...))` Chebyshev | NOT FOUND — clean |
| `apps/game-server/src/game/ai.service.ts` | `Math.max(Math.abs(...position...))` Chebyshev | NOT FOUND — clean |
| All game-server `src/game/` | Legacy `canInteract(` (non-pixel) in active paths | NOT FOUND — clean |

---

## Human Verification Required

The following items still require human observation in a running game session. They were not blocking phase goal verification and carry over from initial verification.

### 1. 0.5s Aggro Delay Visual Feedback

**Test:** Walk player character into AGGRO_RADIUS_PX (512px = 4 tiles) of a predator creature and observe.
**Expected:** "!" icon appears above creature; approximately 0.5s later combat begins (not instant).
**Why human:** Event emission timing and visual feedback require a running game session; code logic is correct but visual timing confirmation is not automatable.

### 2. Leash HP Heal Visual Feedback

**Test:** Engage a creature in combat, then run it to its leash boundary (LEASH_RADIUS_PX = 8 tiles from spawn).
**Expected:** Creature stops pursuing, health bar refills to 100% instantly.
**Why human:** Visual confirmation of health bar animation and broadcast timing requires running game.

### 3. Target Highlight Range Dimming

**Test:** Target a creature or mineral node and observe the highlight ring as player approaches from out of range to in range.
**Expected:** Ring should be dim (30% alpha) when out of MELEE/GATHER range; full brightness when within range.
**Why human:** Visual rendering confirmation requires running game.

### 4. NPC Interaction Prompt Boundary

**Test:** Walk toward an NPC; observe when interaction prompt appears/disappears.
**Expected:** Prompt appears at NPC_INTERACT_RANGE_PX (192px = 1.5 tiles); disappears when exceeding that range.
**Why human:** Sub-tile pixel boundary behavior must be confirmed in-game.

---

## Summary

Phase 133 goal achieved. All 17 observable truths are verified.

Plan 133-05 (gap closure) successfully eliminated all three surviving tile-integer distance checks:
- `entity.service.ts` artifact collection — replaced `canInteract()` with `canInteractPixel(player.px, player.py, entity, GATHER_RANGE_PX)` (commit `224241c`)
- `ability.service.ts` Precision Shot reveal — replaced Chebyshev with `pixelDistanceTo(ePx, ePy, player.px, player.py) <= effect.radiusTiles * TILE_SIZE_PX` (commit `224241c`)
- `combat.service.ts` Pack Call filter and sort — replaced `PACK_CALL_RANGE` Chebyshev with `PACK_CALL_RANGE_PX = 10 * TILE_SIZE_PX` and `pixelDistanceTo` throughout (commit `17c73dc`)

A broad scan of all active gameplay service files confirms zero `Math.max(Math.abs(...position...))` Chebyshev patterns and zero non-pixel `canInteract(` calls remain in game-server. All six DIST requirements are accounted for (DIST-05 skipped per explicit user decision — fog of war deletion).

---

_Verified: 2026-03-18T00:10:00Z_
_Verifier: Claude (gsd-verifier)_
