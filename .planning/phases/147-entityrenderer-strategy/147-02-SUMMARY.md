---
phase: 147-entityrenderer-strategy
plan: 02
status: complete
started: 2026-03-24
completed: 2026-03-24
---

## Summary

Implemented all 6 strategy classes and refactored EntityRenderer to delegate per-type rendering logic. EntityRenderer.createEntityContainer() is now a clean orchestrator with zero type-branching. EntityRenderer went from 1509 to 896 lines (-613 lines).

## Key Files

### Created
- `apps/web/src/game/rendering/strategies/CreatureRenderStrategy.ts` — Handles animated sprites, species scale/shadow, frenzy/stealth, health bars
- `apps/web/src/game/rendering/strategies/PlantRenderStrategy.ts` — Plant scale overrides, rarity, hover-only UI, feature bounds
- `apps/web/src/game/rendering/strategies/MineralRenderStrategy.ts` — Rarity scaling, hover-only UI, feature bounds
- `apps/web/src/game/rendering/strategies/NpcRenderStrategy.ts` — Asymmetric scale (6x/4.5x), chat cursor, type-color nameplate
- `apps/web/src/game/rendering/strategies/ArtifactRenderStrategy.ts` — Basic nameplate rendering
- `apps/web/src/game/rendering/strategies/ItemRenderStrategy.ts` — Item spritesheet lookup

### Modified
- `apps/web/src/game/rendering/strategies/index.ts` — Registers all 6 strategies
- `apps/web/src/game/rendering/EntityRenderer.ts` — Refactored to delegate via strategy registry

## Decisions
- Kept `createHealthBarWithName` and `createHealthBar` on EntityRenderer (WorldScene calls them directly for live updates)
- Kept `hasAnimatedSprites` on EntityRenderer (public utility, delegates to imported ANIMATED_CREATURES set)
- Kept `isCreature` type guard on EntityRenderer (used by applyPerceptionGate and applyFrenzyEffect)
- CreatureRenderStrategy determines animated status internally in getHitArea — EntityRenderer passes false
- Frenzy tween management stays on EntityRenderer (called externally); strategy sets 'spawnFrenzied' container data

## Self-Check: PASSED

- [x] TypeScript compilation passes with zero errors
- [x] createEntityContainer has zero if-chains branching on entity.type
- [x] Zero switch statements on entity type in EntityRenderer
- [x] All 6 strategy classes extend AbstractRenderStrategy
- [x] initStrategies() registers all 6 types
- [x] Data constants removed from EntityRenderer (now in creature-render-data.ts)
