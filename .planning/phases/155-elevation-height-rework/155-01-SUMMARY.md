---
phase: 155
plan: 1
title: "Centralize elevation constant and update rendering to 64px step"
status: complete
started: "2026-03-24"
completed: "2026-03-24"
---

# Summary: 155-01 — Centralize elevation constant and update rendering

## What was built

Created a shared elevation constants file (`apps/web/src/game/constants/elevation.ts`) as the single source of truth for `ELEVATION_HEIGHT_STEP` (64px), `WALL_RENDER_HEIGHT` (256px), and `MAX_ELEVATION` (6). Updated all rendering files to import from it, eliminating 4 duplicate constant declarations.

Changed `SH` (side height) in ProceduralTileGenerator and AbstractTileRenderStrategy from 128 to 64, making terrain tiles render as thin slabs instead of full cubes.

Added wall height boost in world-gen terrain.ts — wall tiles get `Math.max(4, height * 2)` ensuring they render at minimum 256px (4 x 64px step), visibly towering over ground terrain.

## Key decisions

- **Wall height via world-gen boost, not rendering multiplier**: Rather than adding rendering complexity, wall tiles get their height boosted during terrain generation. This keeps the rendering pipeline simple (all tiles use the same ELEVATION_HEIGHT_STEP).
- **MAX_ELEVATION raised to 6**: Accommodates wall heights up to 6 (from doubled terrain noise values).
- **256x256 canvas retained**: Even though terrain slabs only use 192px of vertical space, keeping the 256x256 canvas avoids sprite dimension changes and origin recalculations.

## Deviations from plan

- Plan suggested handling wall height in ProceduralTileGenerator by baking taller textures for wall tiles. Instead, wall height is handled at the world-gen level by boosting the logical elevation of wall tiles, which is simpler and more consistent.
- IsometricTransform default parameter changed inline to `64` rather than importing the constant, to avoid a circular dependency concern (utility file importing from constants). The constant is used at call sites instead.

## Key files

- `apps/web/src/game/constants/elevation.ts` — NEW, single source of truth
- `apps/web/src/game/rendering/TileRenderer.ts` — imports shared constant
- `apps/web/src/game/rendering/ProceduralTileGenerator.ts` — SH = 64
- `apps/web/src/game/rendering/tile-strategies/AbstractTileRenderStrategy.ts` — SH = 64
- `apps/web/src/game/rendering/EntityRenderer.ts` — imports shared constant
- `apps/web/src/game/rendering/ViewportCuller.ts` — imports shared constants
- `apps/web/src/game/utils/IsometricTransform.ts` — default param = 64
- `packages/world-gen/src/generation/terrain.ts` — wall height boost

## Self-Check: PASSED
- [x] ELEVATION_HEIGHT_STEP is 64 everywhere
- [x] SH is 64 in tile generation
- [x] Wall tiles get height boost to minimum 4
- [x] No duplicate constant declarations remain
- [x] Build compiles (pre-existing errors only, unrelated to elevation)
