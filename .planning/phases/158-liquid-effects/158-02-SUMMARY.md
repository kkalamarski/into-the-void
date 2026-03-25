---
phase: 158-liquid-effects
plan: 02
subsystem: web-client
tags: [liquid, hud, floating-numbers, zustand, socket-events]

requires:
  - phase: 158
    plan: 01
    provides: "liquid:damage, liquid:heal, liquid:update socket events"
provides:
  - "liquidStore for client-side liquid effect state"
  - "Floating damage numbers for liquid damage"
  - "Floating heal numbers for liquid healing"
  - "LiquidIndicator HUD component"
affects: []

tech-stack:
  added: []
  patterns: ["Zustand store with module-level socket wiring (same as hazardStore)"]

key-files:
  created:
    - apps/web/src/store/liquidStore.ts
    - apps/web/src/ui/hud/LiquidIndicator.tsx
    - apps/web/src/ui/hud/LiquidIndicator.css
  modified:
    - packages/shared-types/src/network/events.ts
    - apps/web/src/network/socket.ts
    - apps/web/src/store/gameStore.ts
    - apps/web/src/game/rendering/EntityRenderer.ts
    - apps/web/src/game/scenes/controllers/EntityManager.ts
    - apps/web/src/game/scenes/WorldScene.ts
    - apps/web/src/ui/hud/HUD.tsx

key-decisions:
  - "Floating heal numbers use green (#00ff88) with + prefix to distinguish from damage"
  - "Liquid damage/heal handlers in gameStore (not liquidStore) because they need worldScene access"
  - "LiquidIndicator positioned at top:240px right:16px below hazard indicator"
  - "Color stored as hex number (matching TileDefinition.color) and converted to CSS in component"

patterns-established:
  - "EntityRenderer.createFloatingHeal for green heal numbers (reusable for other heal sources)"
  - "WorldScene.showHealNumber delegates to EntityManager (same pattern as showDamageNumber)"

requirements-completed: [FX-01, FX-02, FX-03]

duration: 5min
completed: 2026-03-25
---

# Phase 158-02: Client-side Liquid Feedback Summary

**liquidStore, floating damage/heal numbers, and LiquidIndicator HUD component**

## Performance

- **Duration:** 5 min
- **Tasks:** 2
- **Files modified:** 10 (3 created)

## Accomplishments
- Added liquid:update/damage/heal to ServerEvents type and socket event list
- Created liquidStore with Zustand, wired to socket events at module level
- Added liquid damage/heal handlers in gameStore that show floating numbers via worldScene
- Added EntityRenderer.createFloatingHeal() for green heal numbers
- Created LiquidIndicator HUD component with liquid name, speed %, and damage/heal info

## Task Commits

1. **Task 1+2: liquidStore + floating numbers + HUD indicator** - `b653734` (feat)
