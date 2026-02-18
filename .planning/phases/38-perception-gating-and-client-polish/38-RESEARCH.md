# Phase 38: Perception Gating and Client Polish - Research

**Researched:** 2026-02-18
**Domain:** Game security (AI state stripping), entity visibility gating (perception/level), Phaser animation (tween fade-in), Phaser rendering (yield bar update)
**Confidence:** HIGH

---

## Summary

Phase 38 has three distinct concerns: (1) server-side security — strip AI internal state from `entity:batch` broadcasts before emission, (2) game rules — enforce perception and level gating in both the renderer (client-side visual suppression) and `EntityService` (server-side interaction rejection), and (3) client polish — add fade-in tween on entity spawn and update the yield bar on minerals/plants as they deplete.

All three concerns touch existing, well-understood code. The AI state strip is a one-line filter in `AiService.runZoneTick()` — the batch already only carries `{ entityId, changes: { position } }` from the current code, so there is effectively no secret state leaking today. The concern for the plan is making this explicit and durable against future additions. The perception gating needs the player's computed `perception` stat (available from `statsStore` on the client, or `CharacterStats` on the server) and the creature's `level` field (already on the `Creature` interface). The level gating needs a `canInteract` extension in `game-logic` (add a level-delta check) and an `error` event reply to the client. The fade-in is a Phaser tween on container `alpha` (0 → 1 over ~400ms). The yield bar update is already drawn by `EntityRenderer.createHealthBar()` but `WorldScene.updateEntity()` does not yet redraw it when a `yield` change arrives.

**Primary recommendation:** Implement all three plans in the order given: 38-01 (AI strip, lowest risk), 38-02 (perception + level gating, logic-heavy), 38-03 (animations and visual refresh, purely additive).

---

## Standard Stack

No new external libraries are required. All work is within the existing stack.

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Phaser | 3.x (project) | `scene.tweens.add()` for fade-in | Already used for all animation in WorldScene |
| Socket.IO (server) | 4.x (project) | `server.to(zoneId).emit()` for entity:batch | Established event bus |
| NestJS | 10.x (project) | `@SubscribeMessage`, `@Injectable` service pattern | Established backend framework |
| Zustand | 4.x (project) | `useStatsStore`, `useGameStore` for reading player stats | Established client state |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@into-the-void/game-logic` | workspace | Pure functions for game rules | New level-gate check goes here |
| `@into-the-void/shared-types` | workspace | `Creature`, `Mineral`, `Plant`, `Entity` types | Type-safe changes throughout |

**Installation:** None required.

---

## Architecture Patterns

### Recommended Project Structure

No new files required. All changes are in-place modifications to existing files:

```
apps/game-server/src/game/
  ai.service.ts           # 38-01: strip AI state before batch emit
  entity.service.ts       # 38-02: add level-gate check in handleToolUse()

packages/game-logic/src/interaction/
  interaction.ts          # 38-02: add canInteractLevel() or extend canInteract()

apps/web/src/game/
  rendering/EntityRenderer.ts   # 38-02: perception gate in createEntityContainer()
                                # 38-03: fade-in tween helper; yield bar update
  scenes/WorldScene.ts          # 38-03: call fade-in on spawnEntity(); update yield bar in updateEntity()

packages/shared-types/src/network/
  events.ts               # 38-02: add 'entity:gated' or use existing 'error' event for level-gate message
```

### Pattern 1: AI State Stripping (38-01)

**What:** The `entity:batch` emit in `AiService.runZoneTick()` currently sends `{ entityId, changes: { position } }`. This is safe today, but the architectural pattern must explicitly allow only whitelisted fields, not pass through whatever `changes` happens to contain.

**When to use:** Any time server data is broadcast to a room (zone-wide) rather than a private socket.

**Current code (ai.service.ts lines 115-133):**
```typescript
// Source: apps/game-server/src/game/ai.service.ts
const movedCreatures: Array<{ entityId: string; changes: { position: { x: number; y: number; zoneId: string } } }> = [];

// ...
movedCreatures.push({
  entityId: creature.id,
  changes: { position: result.newPosition },
});

// Emit
this.server?.to(zoneId).emit('entity:batch', { updates: movedCreatures });
```

**Pattern to enforce (explicit whitelist):**
```typescript
// Strip: build broadcast payload with only public fields
const publicChanges: { position: Position } = {
  position: result.newPosition,
};
movedCreatures.push({ entityId: creature.id, changes: publicChanges });
```

This is already the case today — the fix is to document the contract explicitly and add a type alias `PublicEntityChanges` so future additions don't accidentally leak internal state.

**What AI internal state would be secret if ever added to Creature:**
- FSM state enum (e.g., `aiState: 'wander' | 'flee' | 'aggro'`)
- Wander target tile (`wanderTarget: Position`)
- Aggro flag (`isAggroed: boolean`)
- Flee cooldown (`fleeCooldownMs: number`)

None of these are currently on the `Creature` interface or broadcast. The plan should add a `PublicEntityChanges` type and use it at the emit site to make the contract explicit.

### Pattern 2: Perception Gating in EntityRenderer (38-02)

**What:** When `EntityRenderer.createEntityContainer()` renders a creature, compare `entity.level` to `playerPerception * 3`. If the entity's level exceeds the threshold, display `???` instead of the real name and level.

**Access to player perception:** The client needs `CharStatsPayload.total.perception`. This lives in `useStatsStore.getState().stats?.total.perception`. The renderer is a Phaser class, not a React component, so it reads from the Zustand store imperatively.

**Key insight about the architecture:** The requirement says "real values are in the payload but the renderer suppresses them." This means the server still sends the real name and level (no per-client filtering), and only the client display changes. This is a deliberate design choice (relaxed zone-room broadcast model from v1.8 research). The renderer is the gating point, not the network.

**Pattern:**
```typescript
// Source: codebase analysis — EntityRenderer.createEntityContainer()
private applyPerceptionGate(entity: Entity, displayName: string): string {
  if (!this.isCreature(entity)) return displayName;
  const creature = entity as Creature;
  const stats = useStatsStore.getState().stats;
  if (!stats) return displayName;
  const perceptionThreshold = stats.total.perception * 3;
  if (creature.level > perceptionThreshold) {
    return '???';
  }
  return displayName;
}
```

The nameplate text is created in `createNameplate(entity.name)` — the gate should be applied before passing the name to `createNameplate()`.

**Level display:** The phase requirement also says level shows `???`. The current nameplate only shows the entity name, not the level. For creatures, the level could be appended to the name display (e.g., `"Crawler Lv.3"` or gated to `"??? Lv.??"`). The plan should decide whether to add level to the nameplate or keep it separate — based on existing pattern, the nameplate is name-only, so gating the name to `???` is sufficient to satisfy INTR-06.

### Pattern 3: Level Gating Server-Side Check (38-02)

**What:** Before allowing `entity:tool_use` to proceed, check if the entity's level exceeds `player.level + 5`. If so, reject with a descriptive error. This is a server-side authoritative check.

**Where to add:** `EntityService.handleToolUse()` is the entry point after auth/range check. The level check should happen after `canInteract()` (range check) but before routing to `handleMine/handleHarvest/handleAttack`.

**Player level source:** `this.playerService.getPlayerBySocket(socketId)` returns `Player` which has `player.level` (integer, already in the interface).

**Entity level source:** Only `Creature` has `level`. Minerals, plants, and artifacts do not have a level field. The requirement says "entity whose level exceeds player.level + 5" — this applies only to creature interactions.

**Pattern:**
```typescript
// In EntityService.handleToolUse() — after range check, before switch(entity.type)
if (entity.type === 'creature') {
  const creature = entity as Creature;
  if (creature.level > player.level + 5) {
    return { success: false, error: 'Entity level too high — requires higher level to interact' };
  }
}
```

**Client-side gating message:** The error flows through `GameGateway.handleToolUse()` which emits `client.emit('error', { code: 'TOOL_USE_FAILED', message: result.error })`. The existing error event infrastructure handles this. The client should display this message visually — currently errors go to console. A simple HUD notification (text in WorldScene or a React toast) needs to be added for INTR-07.

**Game-logic pure function:** Add `canInteractLevel(playerLevel: number, entityLevel: number): boolean` to `packages/game-logic/src/interaction/interaction.ts`. The server calls this pure function. This keeps the game rule testable.

### Pattern 4: Entity Fade-In Animation (38-03)

**What:** When `WorldScene.spawnEntity()` creates a new container via `EntityRenderer.createEntityContainer()`, the container should start at `alpha = 0` and tween to `alpha = 1` over ~400ms. This makes the world feel alive on respawn.

**Phaser tween pattern (verified from codebase):**
```typescript
// Source: WorldScene.ts — established tween usage for player movement (lines 1155-1168)
this.tweens.add({
  targets: container,
  alpha: 1,
  duration: 400,
  ease: 'Linear',
});
```

**Where to call:** Inside `WorldScene.spawnEntity()`, after the `container` is created and added to `entitySprites`, start the fade tween. Container starts invisible, tween completes in 400ms.

```typescript
// Source: apps/web/src/game/scenes/WorldScene.ts spawnEntity()
spawnEntity(entity: Entity, zoneId?: string): void {
  if (this.entitySprites.has(entity.id) || !this.entityRenderer) return;
  if (!this.isEntityVisible(entity.position)) return;

  const elevation = this.getTileElevation(...);
  const container = this.entityRenderer.createEntityContainer(entity, elevation);

  // NEW: fade-in animation
  container.setAlpha(0);
  this.tweens.add({
    targets: container,
    alpha: 1,
    duration: 400,
    ease: 'Linear',
  });

  // ... rest of existing code
}
```

**Interaction with occlusion:** The occlusion system sets `container.alpha` to `OCCLUDED_ALPHA (0.3)` or `1.0`. If a tween is in progress when occlusion checks run (every 100ms), the tween and the `setAlpha()` call will conflict. The safest resolution: let the tween complete (400ms), then let occlusion take over. The tween duration (400ms) is short enough that the conflict window is negligible.

### Pattern 5: Yield Bar Update on Depletion (38-03)

**What:** When a `yield` change arrives via `entity:update`, the mineral/plant yield bar (rendered by `createHealthBar()`) should be redrawn proportionally. Currently `WorldScene.updateEntity()` handles health changes for creatures but does NOT handle yield changes for minerals/plants.

**Current gap (WorldScene.ts lines 1072-1096):**
```typescript
// Only creatures are handled:
if ('health' in changes && this.entityRenderer) {
  // ... recreates creature health bar
}
// No yield handling exists
```

**Pattern to add:**
```typescript
// In WorldScene.updateEntity() — mirror the health bar update pattern
if ('yield' in changes && this.entityRenderer) {
  const oldYieldBar = container.list.find(
    (child) => child instanceof Phaser.GameObjects.Graphics && child.y === -this.elevationOffset - 24
  ) as Phaser.GameObjects.Graphics | undefined;
  if (oldYieldBar) {
    oldYieldBar.destroy();
  }

  // Recreate from changes — need both yield and maxYield
  const resourceChanges = changes as Partial<Mineral> | Partial<Plant>;
  if (resourceChanges.yield !== undefined && resourceChanges.maxYield !== undefined) {
    const yieldBar = this.entityRenderer.createHealthBar(
      resourceChanges.yield,
      resourceChanges.maxYield,
    );
    yieldBar.y = -this.elevationOffset - 24;
    container.add(yieldBar);
  }
}
```

**Critical constraint:** The `entity:update` from `EntityService.handleMine/handleHarvest` currently sends only `{ yield: mineral.yield }` — no `maxYield`. The server must be updated to also include `maxYield` in the changes payload so the client can compute the ratio. Alternatively, store `maxYield` on the container as data when the entity is first spawned, and read it back from `container.getData('maxYield')`.

**Recommended approach:** Store `maxYield` in container data on spawn, retrieve on update. This avoids changing the network payload.

```typescript
// In WorldScene.spawnEntity() — after container created:
if (entity.type === 'mineral') {
  container.setData('maxYield', (entity as Mineral).maxYield);
}
if (entity.type === 'plant') {
  container.setData('maxYield', (entity as Plant).maxYield);
}

// In WorldScene.updateEntity() — when yield changes:
if ('yield' in changes) {
  const maxYield = container.getData('maxYield') as number;
  if (maxYield !== undefined) {
    // ... redraw bar
  }
}
```

### Anti-Patterns to Avoid

- **Anti-pattern: Per-player entity filtering at broadcast time.** The v1.8 research decision locked in relaxed zone-room broadcast (one event per zone per tick). Do NOT filter what the server sends per socket. All gating is client-side display only (except level-gate rejection of the `entity:tool_use` event).
- **Anti-pattern: Reading player perception from gameStore.player in Phaser renderer.** `gameStore.player` does not have the computed `CharacterStats.perception` — it has base `Player` which doesn't include stats. Use `useStatsStore.getState().stats?.total.perception` instead.
- **Anti-pattern: Animating alpha while occlusion is actively writing alpha.** The 100ms occlusion interval and 400ms fade tween overlap briefly. Set container alpha to 0 on spawn, start the tween, and do not start the tween for entities that were loaded from `zone:state` (initial load) — only entities that arrive via `entity:spawn` (respawn events).
- **Anti-pattern: Destroying and re-adding the entire entity container on yield update.** Only find and replace the specific Graphics child (yield bar). The nameplate and sprite must not be touched.
- **Anti-pattern: Adding level-gate check only on client.** The client-side gating is presentational. The server must also reject the `entity:tool_use` event — security requirement (INTR-07).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Entity fade animation | Custom requestAnimationFrame loop | `scene.tweens.add({ alpha: 1, duration: 400 })` | Phaser's tween manager handles pause/resume, scene lifecycle, and frame budget |
| Yield bar proportional rendering | Custom canvas drawing | `EntityRenderer.createHealthBar(currentYield, maxYield)` | Already works correctly for 0-to-full ratios — parameter semantics are identical |
| Error message display | Custom error panel | Existing `error` socket event + client toast/HUD text | Error event infra already exists; consistent UX |
| Stat-based threshold computation | Inline math everywhere | `stats.total.perception * 3` from `useStatsStore` | Stat computation already centralized in `computeCharStats()` in game-logic |

**Key insight:** The entire visual toolkit already exists — `createHealthBar()`, `tweens.add()`, and `createNameplate()` are proven primitives. Phase 38 is about wiring rules to these primitives, not building new ones.

---

## Common Pitfalls

### Pitfall 1: Yield Bar Position Constant vs Stored Elevation
**What goes wrong:** The yield bar `y` offset is `-this.elevationOffset - 24` in `EntityRenderer`, but `WorldScene.updateEntity()` doesn't have access to `this.elevationOffset` because it references the scene, not the renderer directly.
**Why it happens:** `elevationOffset` is a private field on `EntityRenderer`, not stored on the container.
**How to avoid:** Store `elevationOffset` in container data at create time: `container.setData('elevationOffset', this.elevationOffset)`. Then in `updateEntity()`, read `container.getData('elevationOffset') as number`.
**Warning signs:** Yield bar appears at wrong Y position after update — offset by 12px (the default `elevationOffset` value).

### Pitfall 2: Tween Conflict with Occlusion setAlpha
**What goes wrong:** Occlusion check runs every 100ms and calls `container.setAlpha(OCCLUDED_ALPHA)`. If a 400ms fade-in tween is also running on the same container, the tween overrides the occlusion alpha on the next frame, making occluded entities suddenly fully visible.
**Why it happens:** Phaser tweens write to the target property every frame via `onUpdate`.
**How to avoid:** Use Phaser's tween completion callback to let occlusion take over: the tween runs for 400ms then stops. The next occlusion check (100ms after the tween ends at most) sets the correct alpha.
**Warning signs:** Newly spawned entities appear through walls briefly.

### Pitfall 3: maxYield Not in entity:update Payload
**What goes wrong:** `EntityService.handleMine()` sends `{ yield: mineral.yield }` but not `maxYield`. Client cannot compute fill ratio for yield bar without `maxYield`.
**Why it happens:** The server tracks depletion by decrementing `yield` and doesn't retransmit the static `maxYield` since it never changes.
**How to avoid:** Store `maxYield` on the Phaser container's data dict when the entity is first spawned, and retrieve it in `updateEntity()`. This is zero network overhead.
**Warning signs:** Yield bar always shows as 100% or 0% regardless of depletion state.

### Pitfall 4: Perception Check Runs Before Stats Load
**What goes wrong:** `useStatsStore.getState().stats` is null until the first `stats:update` event fires (after auth completes). If an entity is rendered before stats arrive, the perception check returns null and defaults to showing the real name — which is fine — but if it defaults to hiding (showing `???`), it's a UX bug.
**Why it happens:** Stats are loaded after zone:state, so entities spawn before stats arrive on initial load.
**How to avoid:** When `stats` is null, show the real entity name (fail open). Only apply the `???` gate when stats are loaded. This is the correct security posture because gating is a presentational concern, not a security one (the server sends all data regardless).
**Warning signs:** All creatures show `???` on initial zone load until stats update arrives.

### Pitfall 5: Level Gate Applies to Non-Creature Entities
**What goes wrong:** The level gate check (entity.level > player.level + 5) is applied to minerals or plants, which don't have a `level` field.
**Why it happens:** `Entity` base interface has no `level` field — only `Creature` has it. TypeScript guards prevent this at compile time if typed correctly.
**How to avoid:** In `EntityService.handleToolUse()`, the level gate check goes after the type switch routing, specifically inside `handleAttack()` (or before the switch, only when `entity.type === 'creature'`). The INTR-07 requirement says "interaction blocked when entity level > player level + 5" — from context, this applies to creature attacks.
**Warning signs:** Mining a mineral returns `TOOL_USE_FAILED` even though no level gate should apply.

### Pitfall 6: `entity:batch` Handler Missing in WorldScene (not just entityStore)
**What goes wrong:** `entity:batch` is handled in `entityStore.ts` to update the Zustand entity map, but `WorldScene` has no direct batch handler. Creature position updates from the batch do not update the Phaser container positions.
**Why it happens:** Looking at the code — `entityStore` wires `entity:batch` but `gameStore` only wires `entity:update`. The batch updates entity store (React/pathfinding) but WorldScene uses `updateEntity()` called from `gameStore`'s `entity:update` handler. `entity:batch` does NOT call `worldScene.updateEntity()`.
**How to avoid:** Add a `gameSocket.on('entity:batch', ...)` handler in `gameStore.ts` (mirroring the `entity:update` handler) to forward batch updates to `worldScene.updateEntity()`. This is a pre-existing gap that Phase 38's planning should flag. The 38-01 plan should verify this wiring exists or add it.
**Warning signs:** Creature positions don't update visually even though `entityStore` has the correct positions (pathfinding works but creatures appear frozen on screen).

---

## Code Examples

### Stripping AI state — explicit type at emit site
```typescript
// Source: apps/game-server/src/game/ai.service.ts (pattern to enforce)
// Add near top of file:
interface PublicCreatureUpdate {
  entityId: string;
  changes: { position: { x: number; y: number; zoneId: string } };
}

// In runZoneTick():
const movedCreatures: PublicCreatureUpdate[] = [];

// When building batch entry — only position is in PublicCreatureUpdate,
// TypeScript enforces the whitelist at compile time:
movedCreatures.push({
  entityId: creature.id,
  changes: { position: result.newPosition },
});

this.server?.to(zoneId).emit('entity:batch', { updates: movedCreatures });
```

### Perception gate in EntityRenderer
```typescript
// Source: apps/web/src/game/rendering/EntityRenderer.ts (pattern to add)
import { useStatsStore } from '../../store/statsStore';

// In createEntityContainer():
const displayName = this.applyPerceptionGate(entity);
const nameplate = this.createNameplate(displayName);

// New helper method:
private applyPerceptionGate(entity: Entity): string {
  if (!this.isCreature(entity)) return entity.name;
  const creature = entity as Creature;
  const stats = useStatsStore.getState().stats;
  if (!stats) return entity.name; // fail open — stats not yet loaded
  const threshold = stats.total.perception * 3;
  if (creature.level > threshold) return '???';
  return entity.name;
}
```

### Level gate in EntityService
```typescript
// Source: apps/game-server/src/game/entity.service.ts (pattern to add)
// In handleToolUse(), after canInteract() check, before switch(entity.type):
if (entity.type === 'creature') {
  const creature = entity as Creature;
  if (creature.level > player.level + 5) {
    return {
      success: false,
      error: `Cannot interact — entity level ${creature.level} exceeds your level by more than 5`,
    };
  }
}
```

### Pure function in game-logic
```typescript
// Source: packages/game-logic/src/interaction/interaction.ts (new export)
/**
 * INTR-07: Level gating check.
 * Returns false if entity level exceeds player level by more than 5.
 */
export function canInteractLevel(playerLevel: number, entityLevel: number): boolean {
  return entityLevel <= playerLevel + 5;
}
```

### Fade-in tween on spawnEntity
```typescript
// Source: apps/web/src/game/scenes/WorldScene.ts spawnEntity() (pattern to add)
spawnEntity(entity: Entity, zoneId?: string): void {
  if (this.entitySprites.has(entity.id) || !this.entityRenderer) return;
  if (!this.isEntityVisible(entity.position)) return;

  const elevation = this.getTileElevation(entity.position.x, entity.position.y, entity.position.zoneId);
  const container = this.entityRenderer.createEntityContainer(entity, elevation);

  // Store data for update handlers
  container.setData('position', { ...entity.position });
  container.setData('elevationOffset', 12); // matches EntityRenderer.elevationOffset
  if (entity.type === 'mineral') container.setData('maxYield', (entity as Mineral).maxYield);
  if (entity.type === 'plant') container.setData('maxYield', (entity as Plant).maxYield);

  // Fade-in animation (only for entity:spawn events — not initial zone load)
  container.setAlpha(0);
  this.tweens.add({
    targets: container,
    alpha: 1,
    duration: 400,
    ease: 'Linear',
  });

  this.entitySprites.set(entity.id, container);
  if (zoneId) {
    if (!this.entityZoneMap.has(zoneId)) this.entityZoneMap.set(zoneId, new Set());
    this.entityZoneMap.get(zoneId)!.add(entity.id);
  }
  if (this.depthSorter) this.depthSorter.markDirty(entity.id);
}
```

### entity:batch wiring in gameStore (pre-existing gap — must fix in 38-01 or 38-03)
```typescript
// Source: apps/web/src/store/gameStore.ts (pattern to add — mirrors entity:update handler)
gameSocket.on('entity:batch', ({ updates }: { updates: Array<{ entityId: string; changes: Partial<Entity> }> }) => {
  const game = useGameStore.getState().game;
  const worldScene = game?.getWorldScene();
  if (worldScene) {
    for (const { entityId, changes } of updates) {
      worldScene.updateEntity(entityId, changes);
    }
  }
  // entityStore already handles entity:batch — no need to duplicate here
});
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Individual `entity:update` per creature per tick | Single `entity:batch` per zone per tick (Phase 36-03) | Phase 36 | Batch already in place; Phase 38 just adds type enforcement on what fields are in the batch |
| No perception gating | Client-side `???` display when `level > perception * 3` | Phase 38 (new) | Renderer becomes the gating point; no server changes required for perception |
| No level gating | Server rejects `entity:tool_use` when `level > player.level + 5` | Phase 38 (new) | Authoritative rejection in EntityService |
| Entities appear instantly on respawn | Fade-in tween on `entity:spawn` events | Phase 38 (new) | Purely additive — only `entity:spawn` events trigger the tween, not initial zone load |
| Yield bar static after depletion | Yield bar redrawn on each `entity:update` with yield change | Phase 38 (new) | Requires storing `maxYield` on container data at spawn time |

**Deprecated/outdated:**
- Nothing deprecated in this phase.

---

## Open Questions

1. **Does perception gating apply to the behavior icon (H/O/P/M) for gated creatures?**
   - What we know: INTR-06 says name and level display as `???`. The behavior icon is separate.
   - What's unclear: Should the behavior icon also be hidden for `???` creatures? Hiding it reduces information and is consistent with full gating.
   - Recommendation: Hide the behavior icon (replace with `?` or remove) for gated creatures to be consistent with the `???` theme.

2. **Should level-gated creatures show `???` for level too, or just the name?**
   - What we know: The nameplate in `EntityRenderer` currently shows only the name, not the level. The behavior icon shows the behavior letter.
   - What's unclear: INTR-06 says "name and level" — but level is not currently rendered in the nameplate.
   - Recommendation: During 38-02 plan, display level as part of the creature nameplate (e.g., `"Crawler [Lv.3]"`) and gate both to `???` and `[Lv.??]`. This fulfills INTR-06 exactly and is additive.

3. **Should the fade-in tween apply to entities from initial zone:state load or only entity:spawn events?**
   - What we know: The requirement says "spawn event triggers a client-side fade-in animation." `entity:spawn` is the respawn broadcast from ZonesService. `zone:state` sends all entities at once on join.
   - What's unclear: Does fading in 50+ entities on zone load create a jarring effect?
   - Recommendation: Only apply fade-in to `entity:spawn` events (line in `gameStore.ts` that calls `worldScene.spawnEntity(entity)` without a `zoneId` argument from initial load). The `spawnEntity()` function with a `zoneId` argument comes from `zone:state` loading — pass a flag or use a separate path. Simplest: check if this is an initial load vs respawn by checking a flag, or have `spawnEntity` accept an `animate: boolean` parameter.

4. **Is entity:batch already being forwarded to WorldScene for creature position updates?**
   - What we know: `entityStore.ts` handles `entity:batch` to update the Zustand entity map. `gameStore.ts` does NOT wire `entity:batch` to `worldScene.updateEntity()`. Creatures move in AI tick (positions sent via `entity:batch`) but Phaser containers may not update.
   - What's unclear: Was this gap intentional (creatures only tracked in entityStore, not rendered dynamically)?
   - Recommendation: This is a pre-existing rendering gap. Plan 38-01 should verify by checking if creature sprites move in-game. If they don't, add the `entity:batch` wiring to `gameStore.ts` as part of 38-01 or add it as a 38-00 fix.

---

## Sources

### Primary (HIGH confidence)
- Direct codebase reading — `apps/game-server/src/game/ai.service.ts` — AiService.runZoneTick() and entity:batch emit pattern
- Direct codebase reading — `apps/web/src/game/rendering/EntityRenderer.ts` — createEntityContainer(), createHealthBar(), createNameplate() implementations
- Direct codebase reading — `apps/web/src/game/scenes/WorldScene.ts` — spawnEntity(), updateEntity(), tween usage pattern
- Direct codebase reading — `apps/game-server/src/game/entity.service.ts` — handleToolUse() flow
- Direct codebase reading — `packages/game-logic/src/interaction/interaction.ts` — canInteract() function, extension point
- Direct codebase reading — `packages/shared-types/src/core/entity.ts` — Creature.level, Mineral.yield/maxYield, Plant.yield/maxYield
- Direct codebase reading — `packages/shared-types/src/core/player.ts` — Player.level, CharacterStats.perception
- Direct codebase reading — `apps/web/src/store/statsStore.ts` — CharStatsPayload access pattern
- Direct codebase reading — `apps/web/src/store/entityStore.ts` — entity:batch handler (not forwarded to WorldScene)
- Direct codebase reading — `apps/web/src/store/gameStore.ts` — entity:spawn/update/despawn wiring to WorldScene; entity:batch NOT wired to WorldScene

### Secondary (MEDIUM confidence)
- Phaser 3 tween API: `scene.tweens.add({ targets, alpha, duration, ease })` — consistent with usage pattern already in WorldScene.ts (movePlayer tween at line 1156)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all existing libraries, no new dependencies
- Architecture: HIGH — all patterns derived directly from codebase code reading
- Pitfalls: HIGH — gaps (entity:batch not wired to WorldScene, maxYield not in update payload) confirmed by reading actual source files

**Research date:** 2026-02-18
**Valid until:** 2026-03-20 (30 days — stable codebase, no fast-moving external dependencies)
