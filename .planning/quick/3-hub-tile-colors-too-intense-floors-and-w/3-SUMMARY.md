---
phase: quick-3
plan: 01
subsystem: rendering/tiles
tags: [hub-tiles, colors, metallic, faction-identity, ProceduralTileGenerator]
dependency_graph:
  requires: []
  provides: [metallic-hub-tile-colors]
  affects: [hub-canopy-tiles, hub-ironhold-tiles, hub-meridian-tiles, hub-salvage-tiles, ProceduralTileGenerator]
tech_stack:
  added: []
  patterns: [metallic-base-with-faction-accent]
key_files:
  created: []
  modified:
    - packages/tiles/src/definitions/hub-canopy-tiles.ts
    - packages/tiles/src/definitions/hub-ironhold-tiles.ts
    - packages/tiles/src/definitions/hub-meridian-tiles.ts
    - packages/tiles/src/definitions/hub-salvage-tiles.ts
    - apps/web/src/game/rendering/ProceduralTileGenerator.ts
decisions:
  - "Structural tiles use near-neutral steel-gray base (close R/G/B channels) with a barely-perceptible faction hue shift"
  - "Faction identity expressed through accent colors on detail patterns (panel lines, rivets, light strips), not the base cube face"
  - "Decoration, accent, and hazard tiles retain more faction color but are muted/desaturated vs the original saturated versions"
  - "Canopy (Verdant) is the largest change: from pure-green cubes (0x1a5a3a) to steel-gray cubes (0x484e4a) with green accents"
metrics:
  duration: ~5 min
  completed: "2026-03-19"
  tasks: 2
  files: 5
---

# Quick Task 3: Hub Tile Colors Too Intense - Summary

**One-liner:** Metallic space-station base palette with muted faction-colored accents replaces fully-saturated faction-colored hub tiles across all 4 hubs.

## What Was Done

Reworked all 4 hub tile sets so structural tiles (floor, wall, corridor, door, window) use a shared metallic/industrial space-station palette with subtle faction tinting. Faction identity is now expressed through the `accent` color field in `buildPalette()`, which drives the detail patterns drawn on cube faces — not the base cube color itself.

### Task 1: Hub tile definition `color` fields updated

| Hub | Floor (before) | Floor (after) | Change |
|-----|---------------|---------------|--------|
| Canopy | 0x1a3a2a (dark green) | 0x484e4a (steel-gray green) | Dramatically desaturated |
| Ironhold | 0x3a3a3a (pure gray) | 0x4e4c48 (warm steel) | Slight warm shift for identity |
| Meridian | 0xb0b8c0 (blue-gray) | 0xb0b4ba (steel blue-gray) | Minor adjustment |
| Salvage | 0x5a5040 (warm brown) | 0x504e4a (neutral warm steel) | Slightly more neutral |

### Task 2: TILE_PALETTES in ProceduralTileGenerator updated

The `top` field (cube top face — most visible) changed to match the metallic base palette. The `accent` field keeps faction-appropriate colors so detail lines and panel patterns still identify each faction clearly:

- Canopy: green accents (0x3a9966) on steel-gray tops (0x484e4a)
- Ironhold: rust/amber accents (0x996633) on warm-steel tops (0x4e4c48)
- Meridian: blue accents (0x4488cc) on polished-steel tops (0xb0b4ba)
- Salvage: warm-scrap accents (0x997744) on neutral-steel tops (0x504e4a)

## Commits

| Task | Hash | Message |
|------|------|---------|
| 1 | 0792827 | feat(quick-3-01): update hub tile definition colors to metallic base palette |
| 2 | 90e83b9 | feat(quick-3-02): update TILE_PALETTES to metallic base + faction accent rendering |

## Deviations from Plan

None - plan executed exactly as written. All color values from the plan specification were applied verbatim.

## Verification

- `npx nx run tiles:build` — passed
- `npx nx run web:build` — passed

## Self-Check: PASSED

- packages/tiles/src/definitions/hub-canopy-tiles.ts — modified (0x484e4a floor)
- packages/tiles/src/definitions/hub-ironhold-tiles.ts — modified (0x4e4c48 floor)
- packages/tiles/src/definitions/hub-meridian-tiles.ts — modified (0xb0b4ba floor)
- packages/tiles/src/definitions/hub-salvage-tiles.ts — modified (0x504e4a floor)
- apps/web/src/game/rendering/ProceduralTileGenerator.ts — modified (metallic TILE_PALETTES)
- Commit 0792827 — exists
- Commit 90e83b9 — exists
