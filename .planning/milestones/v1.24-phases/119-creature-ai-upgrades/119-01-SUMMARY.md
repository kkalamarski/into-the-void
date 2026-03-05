# Plan 119-01 Summary: Frenzy Type Foundations + AI FSM Detection

**Status:** Complete
**Duration:** ~5 minutes
**Commits:** 9f434bc

## What Was Built

Extended the shared-types Creature interface with `stealthed` and `frenzied` optional boolean fields. Added `creature:frenzy` and `creature:stampede` socket event types to ServerEvents. Implemented Frenzy detection in the pure AI FSM layer — maniacs below 30% HP now return `frenzied: true` from `tickCreatureAI()`. Created 20 unit tests covering all four creature behavior archetypes.

## Key Files

### Created
- `packages/game-logic/src/ai/creature-ai.test.ts` — 20 unit tests for herbivore, omnivore, predator, and maniac behaviors

### Modified
- `packages/shared-types/src/core/entity.ts` — Added `stealthed?` and `frenzied?` to Creature interface
- `packages/shared-types/src/network/events.ts` — Added `creature:frenzy` and `creature:stampede` event types with payloads
- `packages/game-logic/src/ai/creature-ai.ts` — Added `withFrenzy()` wrapper in `tickPredator()` for maniac Frenzy detection

## Decisions Made
- Frenzy threshold is strictly less than 30% (not <=) — matches CONTEXT.md specification
- Used `withFrenzy()` helper to wrap all return paths in `tickPredator()` instead of modifying each return individually — cleaner and less error-prone
- Used `|| undefined` to keep AiTickResult sparse (no `frenzied: false` noise on non-maniac results)

## Self-Check: PASSED
- [x] Creature.stealthed and Creature.frenzied fields exist
- [x] creature:frenzy and creature:stampede socket events defined
- [x] Frenzy detection at < 30% HP working
- [x] 20 unit tests passing (73 total in game-logic)
- [x] shared-types builds clean

---
*Plan: 119-01 | Phase: 119-creature-ai-upgrades*
