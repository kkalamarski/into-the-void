# Phase 152: WorldScene Decomposition - Context

**Gathered:** 2026-03-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Extract input handling, camera management, entity lifecycle, and cross-cutting interactions from WorldScene.ts (2926 LOC) into dedicated controller classes. WorldScene becomes an orchestrator under 800 lines. This is component decomposition of a god object — not Strategy Pattern. Behavior must be identical.

</domain>

<decisions>
## Implementation Decisions

### Subsystem boundaries
- Four subsystems extracted:
  1. **CameraController** — camera follow, zoom, minimap management
  2. **InputController** — WASD key state capture, mouse click events, keyboard shortcuts. Passes key state to existing PixelMovementController (stays independent).
  3. **EntityManager** — entity create/update/destroy lifecycle AND rendering dispatch to EntityRenderer strategies. Single point of truth for all entity visuals.
  4. **InteractionController** — portal checks, NPC proximity, combat click interactions. Cross-cutting logic that spans input + entity concerns.
- PixelMovementController stays independent — InputController captures key state and passes to it
- WorldScene remains as orchestrator coordinating subsystems

### Communication pattern
- Subsystems communicate via Phaser scene events (scene.events.emit/on) — decoupled, Phaser-native pattern
  - e.g., InputController emits 'entity-clicked', InteractionController listens
  - e.g., EntityManager emits 'entity-created', others can react
- Subsystems access Zustand gameStore directly (existing pattern) — no WorldScene mediation needed

### File organization
- Controllers live in: apps/web/src/game/scenes/controllers/
  - CameraController.ts
  - InputController.ts
  - EntityManager.ts
  - InteractionController.ts
  - index.ts (barrel export)

### Extraction ordering
- Extract in this order: Camera → Input → Entity → Interaction
- CameraController first (most self-contained, fewest dependencies)
- InteractionController last (depends on entities and input events being wired)

</decisions>

<specifics>
## Specific Ideas

- Each controller receives the Phaser scene reference in constructor — accesses scene.events, scene.cameras, scene.add etc.
- WorldScene.create() instantiates all controllers, WorldScene.update() calls controller update methods in order
- The 800-line target for WorldScene means it handles: scene lifecycle (create/update/destroy), zone transitions, chunk management, and subsystem orchestration

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 152-worldscene-decomposition*
*Context gathered: 2026-03-24*
