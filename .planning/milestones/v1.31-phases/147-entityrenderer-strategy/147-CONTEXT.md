# Phase 147: EntityRenderer Strategy - Context

**Gathered:** 2026-03-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace per-type branching (switch/if-chains on entity type) in EntityRenderer.ts with dedicated strategy classes per entity type. Behavior must be visually identical before and after. No new rendering features.

</domain>

<decisions>
## Implementation Decisions

### Strategy interface design
- One strategy class per entity type: CreatureRenderStrategy, PlantRenderStrategy, MineralRenderStrategy, NpcRenderStrategy, ArtifactRenderStrategy (5 classes)
- Strategy dispatch via Map<EntityType, RenderStrategy> registry populated at init — O(1) lookup, strategies are singletons
- Strategies receive the full Entity object — strategies pull what they need
- Interface uses separate fine-grained methods: getScale(), getShadowDimensions(), getHitArea(), getCursor(), getSpriteYOffset() — EntityRenderer calls each at the right time

### File organization
- Strategies live in subdirectory: apps/web/src/game/rendering/strategies/
- One file per strategy: CreatureRenderStrategy.ts, PlantRenderStrategy.ts, etc.
- Interface/types in strategies/types.ts
- Registry setup in strategies/index.ts

### Shared vs per-type logic
- Use AbstractRenderStrategy base class with default implementations for shared concerns (health bars, selection indicators, nameplate labels) — strategies can override if needed
- Creature animations (sprites, behavior icons) fully owned by CreatureRenderStrategy — strategy handles Phaser animation setup/playback directly
- EntityRenderer becomes an orchestrator that delegates to strategies for type-specific logic

### Override tables
- Creature-specific scale/shadow override tables (40+ species entries) move to separate data file: creature-render-data.ts
- CreatureRenderStrategy imports from data file — keeps strategy logic clean, data separate

</decisions>

<specifics>
## Specific Ideas

- Strategy pattern per CLAUDE.md project instructions: "Whenever it makes sense, use strategy pattern, to easily add variant implementation"
- The existing type guards (isCreature(), isMineral(), isPlant(), isNpc()) can drive the registry lookup key

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 147-entityrenderer-strategy*
*Context gathered: 2026-03-24*
