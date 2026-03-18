# Plan 135-01 Summary: Client-side legacy movement removal

## What was done

Removed the entire legacy tile-step movement system from the web client, leaving only the Phase 134 pixel movement system (PixelMovementController + RemotePlayerInterpolator).

### Files deleted (2)
- `apps/web/src/game/systems/MovementController.ts` — tile-step client-side prediction controller
- `apps/web/src/game/systems/PathfindingController.ts` — A* click-to-move with path visualization

### Files modified (6)
- **WorldScene.ts** — Removed imports, member fields (movementController, pathfindingController, moveDelay, movementTweenEndTime), legacy controller initialization in create(), blur event pathfinding cancel, click-to-move handler (replaced with simplified ground-click handler that only clears target highlight), keyboard cancel-pathfinding, pathfinding idle check, tile-based getZoneBoundaryDepth, tween-based updateLocalPlayerSprite (replaced with snap-position version), handlePlayerDeath pathfinding cancel, getMovementController/getPathfindingController accessors, updateEntityCollisionPositions method, and legacy cleanup in shutdown().
- **gameStore.ts** — Removed zone transition legacy calls (getMovementController/getPathfindingController), all updateEntityCollisionPositions() calls (5 occurrences), and the entire player:moved event handler (~30 lines).
- **GameUI.tsx** — Removed pathfinding cancel from Escape key handler.
- **GameContainer.tsx** — Updated comments to reference pixel movement instead of tile-step movement.
- **entityStore.ts** — Updated comment from "pathfinding queries" to "UI queries".
- **socket.ts** — Removed `player:moved` from server event whitelist.

## Net result
- **807 lines deleted**, 36 lines added
- No import or code reference to MovementController or PathfindingController remains in apps/web/
- `player:moved` socket event fully removed from client
- Clicking game world clears target highlight only (no pathfinding, no movement)
- WASD pixel movement via PixelMovementController unaffected
- Web build passes cleanly with zero TypeScript errors
