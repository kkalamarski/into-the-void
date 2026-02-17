---
phase: 23-movement-animation-camera-polish
verified: 2026-02-17T13:11:15Z
status: human_needed
score: 4/4 must-haves verified
human_verification:
  - test: "Player sprite glide (WASD)"
    expected: "Pressing WASD causes the player sprite to visibly slide from one tile to the next over ~130ms, not teleport"
    why_human: "Visual tween animation cannot be verified programmatically — requires running the game and pressing movement keys"
  - test: "Server reconciliation smoothness"
    expected: "When the server corrects player position, the sprite smoothly corrects over ~80ms with an easing-out feel, not a jarring snap"
    why_human: "Requires live server connection, induced position desync, and visual observation"
  - test: "Camera smooth follow"
    expected: "Main camera glides after the player with a slight lag (lerp 0.1), not instant snap. Minimap camera follows instantly without lag."
    why_human: "Camera interpolation behavior is a visual/feel concern not verifiable by static code analysis"
  - test: "Tile movement speed variation"
    expected: "Walking onto a toxic_pool tile produces a noticeably longer delay between steps compared to normal tiles. Walking on ice_floor is faster."
    why_human: "Requires in-game observation on different tile types to confirm timing differences are perceptible"
---

# Phase 23: Movement Animation & Camera Polish Verification Report

**Phase Goal:** Movement looks and feels fluid — sprite glides between tiles, camera follows smoothly, hover artifact removed
**Verified:** 2026-02-17T13:11:15Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Player sprite visibly slides between tiles (not teleporting) during WASD and click-to-move | VERIFIED (code) / ? (visual) | `updateLocalPlayerSprite()` prediction branch: `killTweensOf` + `tweens.add({duration: 130, ease: 'Linear'})` at WorldScene.ts:1068-1075 |
| 2 | Main camera glides after the player with smooth interpolation instead of instant snap | VERIFIED (code) / ? (visual) | `cameras.main.startFollow(this.localPlayer!, true, 0.1, 0.1)` at WorldScene.ts:1093 |
| 3 | Moving onto a slow tile produces noticeable delay; fast tile feels faster | VERIFIED (code) / ? (visual) | `MOVE_DELAY_MS / tileDef.movementSpeed` formula in `handleInput()` at WorldScene.ts:491; propagated to PathfindingController via `setMoveDelay` at line 496 |
| 4 | Tile hover highlight is absent from the screen (not present, not broken) | VERIFIED | `HoverController.ts` deleted (FILE_NOT_FOUND confirmed); zero imports of HoverController anywhere in `apps/web/src/` |

**Score:** 4/4 truths verified at code level; visual behaviors require human confirmation

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `apps/web/src/game/scenes/WorldScene.ts` | Prediction tween 130ms Linear + reconciliation 80ms Cubic.easeOut + camera lerp 0.1 + tile moveDelay + setMoveDelay call | VERIFIED | All patterns confirmed: duration 130 at line 1073, duration 80 at line 1064, lerp 0.1,0.1 at line 1093, tileDef.movementSpeed at line 490, setMoveDelay at line 496 |
| `apps/web/src/game/systems/PathfindingController.ts` | Public `setMoveDelay(delay: number)` method | VERIFIED | Method exists at line 347, sets `this.moveDelay = delay` |
| `apps/web/src/game/systems/HoverController.ts` | Must NOT exist (deleted) | VERIFIED | File absent; `ls` returns FILE_NOT_FOUND; no imports remaining |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `updateLocalPlayerSprite` (prediction branch) | `this.tweens.add` | `killTweensOf` guard before 130ms Linear tween | WIRED | WorldScene.ts line 1068-1075: `killTweensOf` then `tweens.add({duration:130, ease:'Linear'})` |
| `updateLocalPlayerSprite` (reconciliation branch) | `this.tweens.add` | `killTweensOf` guard before 80ms Cubic.easeOut tween | WIRED | WorldScene.ts line 1059-1066: `killTweensOf` then `tweens.add({duration:80, ease:'Cubic.easeOut'})` |
| `updateLocalPlayer` | `cameras.main.startFollow` | lerp values 0.1, 0.1 | WIRED | WorldScene.ts line 1093: `startFollow(this.localPlayer!, true, 0.1, 0.1)` |
| `handleInput` | `TileRegistry.get` | reads `movementSpeed` from destination tile | WIRED | WorldScene.ts lines 487-491: `TileRegistry.get(tileId)`, then `MOVE_DELAY_MS / tileDef.movementSpeed` |
| `WorldScene` | `PathfindingController.setMoveDelay` | propagates new moveDelay after tile lookup | WIRED | WorldScene.ts line 496: `this.pathfindingController?.setMoveDelay(this.moveDelay)` |
| `minimapCamera.startFollow` | Phaser internal | no lerp args (instant follow) | WIRED | MinimapCamera.ts line 55: `this.minimapCam.startFollow(target, true)` — no lerp args confirmed |

### Requirements Coverage

| Requirement | Status | Notes |
|-------------|--------|-------|
| MOVE-03 (sprite glide between tiles) | SATISFIED | 130ms Linear tween on prediction path |
| CAM-01 (camera smooth follow) | SATISFIED | lerp 0.1,0.1 on main camera; minimap remains instant |
| CAM-02 (tile speed variation) | SATISFIED | moveDelay calculated from movementSpeed; propagated to PathfindingController |
| CAM-03 (hover artifact removed) | SATISFIED | HoverController.ts deleted, no remaining references |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `apps/web/src/game/scenes/WorldScene.ts` | 344 | `generatePlaceholderWorld()` comment "no longer used — kept for compatibility" | Info | Pre-existing dead code, not introduced in Phase 23, does not affect movement/camera goal |

No blockers or warnings introduced by Phase 23 changes.

### Human Verification Required

#### 1. Player Sprite Tile-to-Tile Glide (WASD)

**Test:** Launch the game, connect with a character, and press WASD keys to move.
**Expected:** The player sprite visibly slides from one tile to the next over approximately 130ms. There should be no teleporting/popping between positions.
**Why human:** Phaser tween visual behavior cannot be confirmed by static code analysis. The code is wired correctly but the rendered result must be observed.

#### 2. Server Reconciliation Smoothness

**Test:** With an active game session, observe the player sprite when the server corrects a mispredicted position.
**Expected:** Any position correction appears as a brief, smooth slide (80ms Cubic.easeOut) rather than an instantaneous snap.
**Why human:** Requires a live server with active reconciliation events and visual observation.

#### 3. Camera Smooth Follow

**Test:** Move the player in any direction (WASD or click-to-move).
**Expected:** The main camera follows with a slight lag (glide), not snapping instantly to the player. The minimap should update without lag.
**Why human:** Camera lerp interpolation creates a feel effect that must be visually confirmed in-game.

#### 4. Tile Movement Speed Variation

**Test:** Move the player onto different tile types (if accessible in the current world state): normal tiles, then tiles with different movementSpeed values.
**Expected:** A noticeable timing difference in how quickly moves are accepted — slow tiles (movementSpeed < 1.0) have a perceptible extra delay before the next move registers; fast tiles (movementSpeed > 1.0) accept moves faster.
**Why human:** Timing differences are perceptible only in real play. The formula is correct in code but the subjective experience needs to be felt.

### Gaps Summary

No gaps found. All four success criteria from the ROADMAP are implemented and wired correctly at the code level:

1. Sprite glide — prediction branch tween (130ms Linear) replaces direct position assignment; wired via `killTweensOf` guard pattern
2. Camera smooth follow — `startFollow` lerp changed from (1,1) to (0.1,0.1) for main camera; minimap unchanged at (true) — no lerp args = instant
3. Tile speed variation — `tileDef.movementSpeed` drives `moveDelay` calculation; propagated to `PathfindingController.setMoveDelay` for click-to-move
4. Hover artifact removed — `HoverController.ts` deleted; no imports remain

The status is `human_needed` (not `passed`) because three of the four truths concern visual/feel behavior that can only be confirmed by running the game and observing the rendered output.

---

_Verified: 2026-02-17T13:11:15Z_
_Verifier: Claude (gsd-verifier)_
