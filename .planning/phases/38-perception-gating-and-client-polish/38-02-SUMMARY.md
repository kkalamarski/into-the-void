---
phase: 38-perception-gating-and-client-polish
plan: 02
subsystem: game-logic, game-server, ui
tags: [perception-gating, level-gating, interaction, entity-renderer, phaser, zustand]

# Dependency graph
requires:
  - phase: 38-01
    provides: AI broadcast whitelist and entity:batch WorldScene wiring
  - phase: 35-03
    provides: EntityService.handleToolUse with type routing
provides:
  - canInteractLevel() pure function exported from @into-the-void/game-logic
  - Level gating in EntityService.handleToolUse (INTR-07)
  - Perception gating in EntityRenderer.createEntityContainer (INTR-06)
affects: [future-entity-inspection-ui, combat-system, entity-hud]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Fail-open gating: perception gate returns real name when stats not loaded, ensuring no blank nameplates on connection"
    - "Gated variable hoisting: applyPerceptionGate() returns both name and gated flag, single call drives both nameplate and behavior icon"

key-files:
  created: []
  modified:
    - packages/game-logic/src/interaction/interaction.ts
    - apps/game-server/src/game/entity.service.ts
    - apps/web/src/game/rendering/EntityRenderer.ts

key-decisions:
  - "canInteractLevel returns false if entityLevel > playerLevel + 5 — consistent with INTR-07 spec, exclusive boundary"
  - "Perception gate fails open (shows real name) when stats not loaded — avoids all-'???' state during connection establishment"
  - "gated variable hoisted from applyPerceptionGate() drives both nameplate text and behavior icon branch — single call prevents split-brain display"
  - "Creature level not displayed in client UI — level portion of INTR-06 vacuously satisfied; only name and behavior icon are gated"

patterns-established:
  - "canInteractLevel(playerLevel, entityLevel): boolean — pure numeric comparison, no entity objects needed"
  - "applyPerceptionGate(entity): {name, gated} — returns both display name and gate flag, caller handles both UI elements"

# Metrics
duration: 8min
completed: 2026-02-18
---

# Phase 38 Plan 02: Perception Gating and Level Gating Summary

**Perception gating hides creature name ('???') and behavior icon ('?') when creature.level > perception * 3; server rejects tool_use on creatures more than 5 levels above player**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-02-18T23:20:15Z
- **Completed:** 2026-02-18T23:28:00Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- `canInteractLevel(playerLevel, entityLevel)` pure function added to game-logic and auto-exported via existing `export *` in index.ts
- Server rejects `entity:tool_use` for creatures more than 5 levels above the player (INTR-07) with descriptive error message
- Client hides creature name as '???' and behavior icon as '?' for perception-gated entities (INTR-06), failing open when stats not yet loaded

## Task Commits

Each task was committed atomically:

1. **Task 1: Add canInteractLevel pure function to game-logic** - `4ec7bdb` (feat)
2. **Task 2: Add level gating check to EntityService.handleToolUse** - `a055964` (feat)
3. **Task 3: Add perception gating to EntityRenderer** - `fd01c24` (feat)

## Files Created/Modified
- `packages/game-logic/src/interaction/interaction.ts` - Added `canInteractLevel()` pure function (INTR-07 level gate)
- `apps/game-server/src/game/entity.service.ts` - Import `canInteractLevel`, added creature level gate before switch routing
- `apps/web/src/game/rendering/EntityRenderer.ts` - Import `useStatsStore`, added `applyPerceptionGate()` helper, nameplate and behavior icon gating

## Decisions Made
- `canInteractLevel` uses `entityLevel <= playerLevel + 5` — consistent with INTR-07 spec (more than 5 levels higher means blocked)
- Perception gate fails open (shows real name) when stats not yet loaded — prevents all entities showing '???' during WebSocket connection establishment
- `gated` variable hoisted from `applyPerceptionGate()` drives both the nameplate and behavior icon — single call, no split-brain state
- Creature level is not rendered in client UI, so the "level" portion of INTR-06 is vacuously satisfied

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Perception gating (INTR-06) and level gating (INTR-07) both complete
- Phase 38 all plans complete — v1.8 Entity System milestone ready for final review
- Client error message display for level-gate rejections assumed handled by existing `entity:tool_use` error event handler in client

## Self-Check

### Files Verified

- `packages/game-logic/src/interaction/interaction.ts` — FOUND: canInteractLevel function present
- `apps/game-server/src/game/entity.service.ts` — FOUND: canInteractLevel import and level gate check present
- `apps/web/src/game/rendering/EntityRenderer.ts` — FOUND: applyPerceptionGate method and gated nameplate present

### Commits Verified

- `4ec7bdb` — FOUND: feat(38-02): add canInteractLevel pure function to game-logic
- `a055964` — FOUND: feat(38-02): add level gating check to EntityService.handleToolUse
- `fd01c24` — FOUND: feat(38-02): add perception gating to EntityRenderer (INTR-06)

## Self-Check: PASSED

---
*Phase: 38-perception-gating-and-client-polish*
*Completed: 2026-02-18*
