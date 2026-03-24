---
phase: 155
plan: 2
title: "Fix hardcoded elevation values in EntityManager and map-editor"
status: complete
started: "2026-03-24"
completed: "2026-03-24"
---

# Summary: 155-02 — Fix hardcoded elevation values in EntityManager and map-editor

## What was built

Replaced all 7 hardcoded `elevation * 128` calculations in EntityManager.ts with `elevation * ELEVATION_HEIGHT_STEP` using the shared constant. Updated map-editor's EditorScene.ts from 128 to 64px step.

## Key decisions

- **WorldScene.ts unchanged**: The only `128` in WorldScene.ts is `ISO_TILE_HEIGHT = 128` which is a tile dimension constant (half of 256px tile width), not an elevation step. No change needed.
- **Map-editor uses local constant**: The map-editor is a separate app that can't easily import from the web app's constants. Changed the local declaration to 64.

## Deviations from plan

None — executed as planned.

## Key files

- `apps/web/src/game/scenes/controllers/EntityManager.ts` — 7 hardcoded values replaced
- `apps/map-editor/src/game/EditorScene.ts` — local constant updated to 64

## Self-Check: PASSED
- [x] Zero hardcoded `* 128` elevation calculations in EntityManager
- [x] EntityManager imports ELEVATION_HEIGHT_STEP from shared constants
- [x] Map-editor uses 64px step
- [x] No remaining hardcoded elevation * 128 in apps/ directory
