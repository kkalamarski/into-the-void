---
phase: quick-6
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/game-server/src/game/movement.service.ts
  - apps/web/src/game/systems/PixelMovementController.ts
autonomous: true
requirements: [QUICK-6]

must_haves:
  truths:
    - "Player does not visually walk into walls — client prediction blocks at the same tiles the server blocks"
    - "No rubber-banding when walking near walls — server-resolved position matches client prediction"
    - "Position corrections are sent when collision resolution causes server/client position divergence, not only on speed-check failure"
  artifacts:
    - path: "apps/game-server/src/game/movement.service.ts"
      provides: "Collision-based position correction emission"
      contains: "positionCorrection"
    - path: "apps/web/src/game/systems/PixelMovementController.ts"
      provides: "Client-side prediction with collision callback"
  key_links:
    - from: "apps/game-server/src/game/movement.service.ts"
      to: "positionCorrection event"
      via: "server emits correction after collision resolution diverges from client prediction"
      pattern: "positionCorrection"
---

<objective>
Fix client-server collision desync that causes rubber-banding near walls. The server only sends
positionCorrection on speed-validation failure, so when collision resolution produces a different
result on client vs server, the positions silently drift until the speed check eventually fires,
causing a visible teleport-back. The fix adds a collision-divergence correction: after the server
resolves collisions, it compares its result against the client's predicted position and sends a
positionCorrection if they differ.

Purpose: Eliminate wall rubber-banding so movement near walls feels smooth and deterministic.
Output: Updated movement.service.ts with collision-divergence correction path.
</objective>

<execution_context>
@/Users/krzysztof.kalamarski/.claude/get-shit-done/workflows/execute-plan.md
@/Users/krzysztof.kalamarski/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@packages/game-logic/src/movement/pixel-validation.ts
@apps/game-server/src/game/movement.service.ts
@apps/web/src/game/systems/PixelMovementController.ts
@apps/web/src/game/scenes/WorldScene.ts (setCollisionMap method, lines 2556-2576)

Root cause analysis:

1. **Missing collision-divergence correction path.** The server recomputes velocity from keys
   using its own `dt` (time since last input), resolves collisions with `resolvePixelCollision`,
   and updates `player.px/py`. But it NEVER compares this result against the client's
   `predictedPx/predictedPy` to detect collision divergence. The only correction path is
   `validatePixelSpeed` which only catches teleportation/cheating, not collision mismatches.

2. **Timing desync amplifies the problem.** Server `dt = (now - lastPxInputTime) / 1000` differs
   from the client's Phaser frame `dt`, so even without collision differences, the velocity
   magnitudes differ slightly. Combined with wall-sliding (X/Y independent passes in
   `resolvePixelCollision`), a small velocity difference can cause the server to resolve one axis
   differently from the client. This accumulates silently until the speed check catches it.

3. **Entity blocking asymmetry (minor).** Client's `isWorldTileBlocked` also checks for mineral/plant
   entities at a tile (lines 2519-2523 in WorldScene.ts), but the server's hub-zone collision
   callback does not. This can cause the client to block where the server allows (or vice versa
   if entities despawn server-side first). This is a secondary concern — the primary fix (collision
   divergence correction) will handle the symptom regardless of cause.

The fix is surgical: after the server resolves collision and updates `player.px/py`, compare against
`input.predictedPx/input.predictedPy`. If they differ by more than a small threshold, emit
`positionCorrection` so the client snaps to the server's authoritative position immediately.
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add collision-divergence correction to server movement tick</name>
  <files>apps/game-server/src/game/movement.service.ts</files>
  <action>
In the `tick()` method of MovementService, after the collision resolution block (line 178:
`const resolved = resolvePixelCollision(...)`) and the authoritative position update (lines
181-182: `player.px = resolved.px; player.py = resolved.py`), add a collision-divergence
check BEFORE pushing to the dirty list:

1. Compare the server-resolved position (`resolved.px`, `resolved.py`) against the client's
   predicted position (`input.predictedPx`, `input.predictedPy`).

2. If the distance exceeds a threshold (use 2.0 pixels — tight enough to catch wall mismatches
   but loose enough to tolerate floating-point drift), emit `positionCorrection` to the player:
   ```typescript
   const dxPred = resolved.px - input.predictedPx;
   const dyPred = resolved.py - input.predictedPy;
   const predDist = Math.sqrt(dxPred * dxPred + dyPred * dyPred);

   if (predDist > 2.0) {
     this.server?.to(player.socketId).emit('positionCorrection', {
       px: resolved.px,
       py: resolved.py,
       sequence: input.sequence,
     });
   }
   ```

3. This check goes AFTER the existing speed validation block (which `continue`s on failure),
   so it only runs for speed-valid moves. The player still gets pushed to `dirty` for broadcast
   to other players — the correction is an additional emit to the originating player only.

4. Keep the existing speed-validation `positionCorrection` path unchanged — it handles the
   teleport/cheat case. The new check handles the collision-divergence case.

Do NOT move or modify the existing `validatePixelSpeed` block — add the new check after
collision resolution, around line 184 (after `dirty.push`).

The threshold constant should be defined near the top of the file:
```typescript
/** Collision divergence threshold — correct client if server position differs by more than this. */
const COLLISION_CORRECTION_THRESHOLD_PX = 2.0;
```
  </action>
  <verify>
    <automated>cd /Users/krzysztof.kalamarski/Projects/into-the-void && npx nx run game-server:build 2>&1 | tail -5</automated>
  </verify>
  <done>
Server emits positionCorrection when collision-resolved position differs from client prediction
by more than 2px. Speed-validation correction path remains unchanged. Game server builds cleanly.
  </done>
</task>

<task type="auto">
  <name>Task 2: Verify build integrity and test reconciliation path</name>
  <files>apps/web/src/game/systems/PixelMovementController.ts</files>
  <action>
1. Verify that the client's `PixelMovementController.reconcile()` method correctly handles
   the new collision-divergence corrections. Read through the reconcile method to confirm:
   - It discards acknowledged inputs (sequence <= server sequence) -- confirmed correct.
   - It replays remaining inputs from server position using the same collision callback -- confirmed correct.
   - It snaps to replayed position if distance exceeds RECONCILIATION_THRESHOLD_PX (3px) -- confirmed correct.

   The existing reconcile logic is correct and will handle the new corrections properly.
   No changes needed to the client code.

2. Run a full build of both game-server and web to confirm nothing is broken:
   ```bash
   npx nx run game-server:build
   npx nx run web:build
   ```

3. Run any existing game-logic tests to verify pixel-validation functions still pass:
   ```bash
   npx nx run game-logic:test
   ```

4. If any build or test errors occur, fix them.
  </action>
  <verify>
    <automated>cd /Users/krzysztof.kalamarski/Projects/into-the-void && npx nx run game-server:build 2>&1 | tail -3 && npx nx run web:build 2>&1 | tail -3 && npx nx run game-logic:test 2>&1 | tail -5</automated>
  </verify>
  <done>
Both game-server and web build successfully. Game-logic tests pass. The reconcile path on
the client correctly handles the new collision-divergence corrections without modification.
  </done>
</task>

</tasks>

<verification>
1. `npx nx run game-server:build` succeeds
2. `npx nx run web:build` succeeds
3. `npx nx run game-logic:test` passes
4. In movement.service.ts, `positionCorrection` is emitted in TWO places:
   - Speed validation failure (existing, line ~136)
   - Collision divergence (new, after collision resolution)
5. The collision divergence check uses a threshold constant (COLLISION_CORRECTION_THRESHOLD_PX = 2.0)
</verification>

<success_criteria>
- Server detects when its collision-resolved position differs from client prediction and sends correction
- Existing speed-validation correction path remains unchanged
- Client reconciliation handles both correction types identically (no client changes needed)
- All builds pass, all tests pass
</success_criteria>

<output>
After completion, create `.planning/quick/6-client-server-collision-desync-client-pe/6-SUMMARY.md`
</output>
