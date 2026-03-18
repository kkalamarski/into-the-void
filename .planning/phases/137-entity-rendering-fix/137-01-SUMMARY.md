---
phase: 137-entity-rendering-fix
plan: 01
status: complete
started: 2026-03-18
completed: 2026-03-18
---

# Plan 137-01 Summary: Fix entity sprite anchoring

## What was built
Unified all entity types (player, creature, plant, mineral, NPC) to use bottom-center sprite origin `setOrigin(0.5, 1.0)`, eliminating the floating sprite bug. Added elliptical drop shadows for plants and minerals (previously skipped). Fixed player shadow position from y=-10 to y=0.

## Key changes
- **EntityRenderer.ts**: Plants/minerals now use `setOrigin(0.5, 1.0)` instead of `setOrigin(0.5, 0.25)`. Removed the feature Y-offset formula `spriteYOffset = -64 * (scale - 1)`. Shadows now render for ALL entity types with per-type sizing (plants: 50*scale/25*scale, minerals: 45*scale/22*scale). UI positioning uses unified formula for all types.
- **WorldScene.ts**: Player shadow (local and remote) moved from y=-10 to y=0 for proper ground contact.

## Key files
- `apps/web/src/game/rendering/EntityRenderer.ts` — anchor and shadow fixes
- `apps/web/src/game/scenes/WorldScene.ts` — player shadow position fix

## Verification
- `npx nx run web:build` passes with zero errors
- All entity types use `setOrigin(0.5, 1.0)`
- No `.25` origins remain in EntityRenderer
- Shadows created for all entity types

## Deviations
None — implemented as planned.

## Self-Check: PASSED
- [x] All tasks executed
- [x] Changes committed
- [x] Build passes
