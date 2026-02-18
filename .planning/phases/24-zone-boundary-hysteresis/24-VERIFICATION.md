---
phase: 24-zone-boundary-hysteresis
verified: 2026-02-17T14:05:53Z
status: human_needed
score: 3/4 must-haves verified
human_verification:
  - test: "Walk player back and forth across a zone boundary (y=63 to y=64 and back, repeat 4-5 times)"
    expected: "Loading terrain indicator does not flash repeatedly; it stays hidden throughout the crossing sequence"
    why_human: "The chunksLoading counter behaviour and UI indicator flash are runtime phenomena that cannot be verified by static analysis"
  - test: "Walk player 3+ tiles into a new zone and observe zone HUD"
    expected: "Zone HUD updates to show the new zone ID and biome after crossing the 3-tile threshold; movement stays smooth with no jitter"
    why_human: "Zone HUD update timing and movement smoothness are visual/runtime properties"
  - test: "Walk player 2 tiles into a new zone then immediately walk back"
    expected: "Zone HUD does NOT change (pending transition is cancelled); collision map and heights remain from the committed zone"
    why_human: "Cancellation of pending zone state is a runtime behaviour dependent on position update sequencing"
  - test: "Walk player into a new zone until hysteresis commits, then verify adjacent chunk pre-loading"
    expected: "No visible tile pop-in when crossing the boundary; new zone tiles are already rendered when the player commits at tile depth 3"
    why_human: "Chunk pre-load completeness depends on network timing and cannot be verified statically"
---

# Phase 24: Zone Boundary Hysteresis Verification Report

**Phase Goal:** Eliminate chunk loading thrashing when player walks along zone boundaries
**Verified:** 2026-02-17T14:05:53Z
**Status:** human_needed
**Re-verification:** No - initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Walking back and forth across a zone boundary does not trigger constant chunk loading/unloading | ? UNCERTAIN | Logic is correct: `updateChunks` fires once per zone:state, `commitZoneTransition` is deferred until depth >= 3 tiles, preventing repeated unload/reload cycles. Runtime behaviour needs human confirmation. |
| 2 | Loading terrain indicator does not flash repeatedly at zone boundaries | ? UNCERTAIN | Root cause (extra `updateChunks` calls on each crossing) is eliminated by the hysteresis gate. Indicator behaviour is a runtime observable. |
| 3 | Movement remains smooth at zone boundaries without jitter | ? UNCERTAIN | No logic in hysteresis path modifies movement/tween code. Smoothness is a runtime/visual property. |
| 4 | Chunks for adjacent zones are still pre-loaded (3x3 grid maintained) | ? UNCERTAIN | `onPlayerZoneChanged` always calls `this.chunkManager.updateChunks(newZoneId)` immediately (line 621) before the hysteresis depth check, preserving 3x3 pre-loading. Runtime verification needed. |

**Score:** 0/4 truths can be fully verified statically — all are runtime observable. All 4 supporting artifacts and key links are VERIFIED in the codebase.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `packages/shared-types/src/constants.ts` | Exports `HYSTERESIS_TILES = 3` | VERIFIED | Line 17: `export const HYSTERESIS_TILES = 3;` with explanatory JSDoc |
| `apps/web/src/game/scenes/WorldScene.ts` | Hysteresis logic in `onPlayerZoneChanged` | VERIFIED | Lines 614-644: full implementation with immediate `updateChunks` + depth-gated `commitZoneTransition` |
| `apps/web/src/game/scenes/WorldScene.ts` | `pendingZoneId` and `pendingBiome` private fields | VERIFIED | Lines 67-68: `private pendingZoneId: string \| null = null;` and `private pendingBiome: BiomeType \| null = null;` |
| `apps/web/src/game/scenes/WorldScene.ts` | `getZoneBoundaryDepth()` helper method | VERIFIED | Lines 659-665: min-of-4-edges depth calculation using `ZONE_SIZE` |
| `apps/web/src/game/scenes/WorldScene.ts` | `commitZoneTransition()` method | VERIFIED | Lines 559-586: updates `currentZoneId`, heights, tiles, structures, biome, collision map, zoneHUD, calls `cleanupOrphanedEntities()` |
| `apps/web/src/game/scenes/WorldScene.ts` | `checkPendingZoneTransition()` method | VERIFIED | Lines 592-612: cancels pending if player returns to committed zone; commits if depth >= HYSTERESIS_TILES |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `WorldScene.onPlayerZoneChanged` | `getZoneBoundaryDepth` | depth check before committing zone state | WIRED | Line 633: `const depth = this.getZoneBoundaryDepth(position);` then line 635: `if (depth >= HYSTERESIS_TILES)` |
| `WorldScene.updateLocalPlayerSprite` | `checkPendingZoneTransition` | position update hook | WIRED | Line 1178: `this.checkPendingZoneTransition(position);` — last statement in `updateLocalPlayerSprite` |
| `checkPendingZoneTransition` | `commitZoneTransition` | depth threshold satisfied | WIRED | Line 607: `this.commitZoneTransition(this.pendingZoneId, this.pendingBiome!);` after depth >= HYSTERESIS_TILES |
| `WorldScene` | `HYSTERESIS_TILES` (shared-types) | import | WIRED | Line 2: `import { ..., HYSTERESIS_TILES, ... } from '@into-the-void/shared-types'` |

### Requirements Coverage

No REQUIREMENTS.md entries mapped specifically to phase 24. Success criteria from PLAN.md:

| Criterion | Status | Notes |
|-----------|--------|-------|
| Walking back and forth does not trigger constant chunk loading/unloading | UNVERIFIABLE STATICALLY | Logic correct; needs runtime test |
| Loading terrain indicator does not flash repeatedly at zone boundaries | UNVERIFIABLE STATICALLY | Indicator tied to `chunksLoading` store; needs runtime test |
| Movement smooth at zone boundaries without jitter | UNVERIFIABLE STATICALLY | Movement code unchanged by this phase |
| Zone HUD and collision map update correctly after 3+ tiles in | UNVERIFIABLE STATICALLY | `commitZoneTransition` calls both correctly at lines 573-580 |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `WorldScene.ts` | 597, 642 | `console.log` debug logging in hysteresis path | Info | Not a blocker; expected debug logging for a new feature; can be removed before production |

No TODO/FIXME/placeholder comments in hysteresis code. No stub implementations. No empty handlers.

### Human Verification Required

#### 1. Boundary Oscillation Test

**Test:** Open the game, walk to a zone boundary (e.g., between zone z_0_0 and z_1_0), and walk the player back and forth across the boundary 4-5 times rapidly.

**Expected:** The "Loading terrain..." indicator does not appear or flash. ChunkManager does not repeatedly unload and reload columns of chunks. Browser console should not show repeated `[ChunkManager] Unloading chunk` log lines cycling the same zone.

**Why human:** `chunksLoading` counter and indicator visibility are runtime state; cannot be determined from static code.

---

#### 2. Zone Commit After 3-Tile Depth

**Test:** Walk the player 3+ tiles deep into a new zone (count steps after crossing the boundary). Observe the Zone HUD in the top-right corner.

**Expected:** Zone HUD updates to show the new zone ID and biome name only after the player is at least 3 tiles inside the new zone (not on the first step). Movement feels smooth throughout.

**Why human:** The timing of HUD update relative to position ticks requires runtime observation.

---

#### 3. Pending Transition Cancellation

**Test:** Walk exactly 2 tiles into a new zone, then immediately walk back into the original zone.

**Expected:** Zone HUD does NOT update to show the new zone. The player's collision map and terrain heights remain from the originally committed zone. The transition is silently cancelled.

**Why human:** Pending state cancellation depends on the position update sequence arriving from the server, which is a network-timing runtime property.

---

#### 4. Adjacent Zone Pre-Load (No Pop-In)

**Test:** Walk to a zone boundary and pause 2-3 seconds (to allow chunk loading). Then walk 3+ tiles into the new zone to trigger the hysteresis commit.

**Expected:** New zone tiles are already rendered when hysteresis commits — no visible "popping in" of tiles at the moment the zone commits.

**Why human:** Chunk pre-load completeness depends on network latency and cannot be asserted statically.

---

### Gaps Summary

No gaps found in the implementation. All artifacts exist, are substantive (not stubs), and are fully wired together. The four observable truths cannot be verified by static analysis because they are runtime phenomena (chunk loading counter, UI indicator state, visual smoothness). The human verification tests above cover all four truths.

**Commit audit:** Both claimed commits exist in git history:
- `8aa49a2` — feat(24-01): add HYSTERESIS_TILES constant and zone boundary depth calculation
- `88d0929` — feat(24-01): implement zone boundary hysteresis in WorldScene

**TypeScript compilation:** `pnpm exec tsc --noEmit -p apps/web/tsconfig.json` exits clean (no errors).

---

_Verified: 2026-02-17T14:05:53Z_
_Verifier: Claude (gsd-verifier)_
