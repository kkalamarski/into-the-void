---
phase: quick-7
plan: 01
subsystem: weather-particles
tags: [weather, particles, phaser, viewport, emit-zone]
dependency_graph:
  requires: []
  provides: [per-weather-type emit zones for WeatherSystem]
  affects: [apps/web/src/game/systems/WeatherSystem.ts]
tech_stack:
  added: []
  patterns: [strategy-switch on weather type for emit zone selection]
key_files:
  created: []
  modified:
    - apps/web/src/game/systems/WeatherSystem.ts
decisions:
  - "Falling types (rain/snow/ash) keep the top-strip zone so particles enter from above and travel through the viewport"
  - "Floating/drifting/chaotic types (spores/mist/void_energy) use full-viewport zone since they have no dominant downward direction"
  - "currentConfig stored as private field so the resize handler can access the active weather type without extra lookup"
metrics:
  duration: "< 5 min"
  completed: "2026-03-19"
  tasks_completed: 1
  files_modified: 1
---

# Phase quick-7 Plan 01: Atmospheric Effects Viewport Fix Summary

Per-weather-type emit zone dispatch added to WeatherSystem so spores, mist, and void_energy particles spawn across the full viewport instead of clustering at the top strip.

## What Was Built

A private `getEmitZone(config, width, height)` helper method was added to `WeatherSystem`. It dispatches on `config.type` via a switch statement:

- `rain`, `snow`, `ash` — top-strip spawn zone: `Rectangle(0, -(height * 0.15), width, height * 0.15)`. Particles spawn just above the viewport and fall through it.
- `spores`, `mist`, `void_energy` — full-viewport spawn zone: `Rectangle(0, 0, width, height)`. Particles appear throughout the visible area.

Three locations in `WeatherSystem` were updated:

1. `createEmitter` — replaces the hardcoded `Rectangle(0, -(height*0.15), ...)` with `this.getEmitZone(config, width, height)`.
2. The resize handler in the constructor — replaces the hardcoded strip with `this.getEmitZone(this.currentConfig, width, height)`.
3. A `private currentConfig: WeatherConfig | null = null` field was added and set in `setBiome` (right after `const config = WEATHER_CONFIGS[biome]`), cleared in `destroy()`.

## Commits

| Task | Description | Commit |
|------|-------------|--------|
| 1 | Add per-weather-type emit zone calculation | 9789192 |

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- `apps/web/src/game/systems/WeatherSystem.ts` — FOUND
- `getEmitZone` method — FOUND in file
- Commit 9789192 — FOUND
- `npx nx run web:build` — PASSED (no TypeScript errors)
