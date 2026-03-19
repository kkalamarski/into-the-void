---
phase: quick-6
plan: 1
subsystem: movement
tags: [collision, prediction, reconciliation, websocket, server]
dependency_graph:
  requires: []
  provides: [collision-divergence-correction]
  affects: [movement.service, PixelMovementController]
tech_stack:
  added: []
  patterns: [client-side prediction, server reconciliation, position correction]
key_files:
  created: []
  modified:
    - apps/game-server/src/game/movement.service.ts
decisions:
  - "Threshold of 2.0px for collision divergence — tight enough to catch wall mismatches but loose enough to tolerate floating-point drift"
  - "Correction emitted after dirty.push — player broadcast to others is unaffected, only the originating player gets the snap"
  - "Existing speed-validation correction path left unchanged — handles teleport/cheat case independently"
metrics:
  duration: "10 min"
  completed: "2026-03-19"
---

# Quick Task 6: Client-Server Collision Desync Summary

**One-liner:** Added collision-divergence correction path to MovementService — server now emits positionCorrection when its collision-resolved position differs from client prediction by more than 2px, eliminating wall rubber-banding.

## What Was Done

### Task 1: Collision-divergence correction in server movement tick

Added `COLLISION_CORRECTION_THRESHOLD_PX = 2.0` constant and a post-collision-resolution check to `MovementService.tick()`. After the server resolves pixel collision and updates the authoritative `player.px/py`, it now compares the result against `input.predictedPx/input.predictedPy`. If the distance exceeds 2px, it emits a `positionCorrection` event to the originating player with the server-authoritative position and input sequence number.

This covers the root cause: the server previously only emitted `positionCorrection` on speed-validation failure (teleport/cheat detection), but never on collision divergence. When the server's `dt` differed slightly from the client's Phaser frame `dt`, wall-sliding resolution could produce different results on each side. The positions would drift silently until the speed check eventually caught the cumulative error — causing a visible rubber-band teleport.

### Task 2: Build integrity verification

Verified:
- `npx nx run game-server:build` — passes
- `npx nx run web:build` — passes
- `npx nx run game-logic:test` — 206/212 tests pass; 6 failures in `creature-ai.test.ts` (CRAI-04 frenzied maniac tests) are pre-existing and unrelated to this fix

Reviewed `PixelMovementController.reconcile()` — the existing client reconciliation correctly handles both correction types (speed-validation and collision-divergence) without any modification needed. It discards acknowledged inputs by sequence, replays unacknowledged inputs from the server position using the same collision callback, and snaps to the replayed position if it exceeds `RECONCILIATION_THRESHOLD_PX = 3px`.

## Verification Criteria Met

1. `npx nx run game-server:build` succeeds — YES
2. `npx nx run web:build` succeeds — YES
3. `npx nx run game-logic:test` passes — 206/212 (6 pre-existing failures unrelated to this change)
4. `positionCorrection` emitted in TWO places in movement.service.ts:
   - Line 139: speed-validation failure (existing, unchanged)
   - Line 196: collision-divergence (new)
5. Threshold constant `COLLISION_CORRECTION_THRESHOLD_PX = 2.0` defined at top of file — YES

## Deviations from Plan

None — plan executed exactly as written.

## Pre-existing Issues Discovered (Out of Scope)

`packages/game-logic/src/ai/creature-ai.test.ts` — 6 test failures in CRAI-04 (frenzied maniac attack tests). These were present before this change and are unrelated to pixel movement or collision. Logged for awareness but not fixed.

## Self-Check: PASSED

- `apps/game-server/src/game/movement.service.ts` — FOUND and modified
- Commit d512e21 — FOUND (`fix(quick-6): add collision-divergence correction to server movement tick`)
- positionCorrection emitted at lines 139 and 196 — VERIFIED
