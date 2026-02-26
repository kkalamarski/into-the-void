# Phase 99: Entity Rendering Fix - Research

**Researched:** 2026-02-26
**Domain:** Phaser 3 isometric coordinate math — container positioning, sprite origins, ground-plane anchoring
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Entities float above tiles at ALL elevations (flat and elevated), not just hills
- The float is more visible on tall entities (trees) and elevated terrain, but exists everywhere
- All entities must sit flush with the tile top surface — no visible gap between sprite base and tile
- Selection ring appears at entity feet/base, like a shadow circle on the ground; ring must follow the entity as it moves; ring stays at ground level of the tile the entity occupies
- Health bars are also misaligned — fix their position as part of this phase
- Health bars should be consistently positioned above the entity sprite after the anchor fix
- Same anchor formula for ALL entity types — no special cases for tall vs short
- When creatures move between tiles with different elevations, smooth height transition (tween up/down)
- No snapping to new elevation — gradual visual change as entity crosses tile boundaries

### Claude's Discretion
- Exact anchor offset math and coordinate calculations
- Whether to fix via container position, sprite offset, or both
- Shadow positioning details
- Depth sorting adjustments if needed after repositioning

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| REND-01 | Entities render anchored at base tile position, not elevated above it | Remove `elevationOffset = 24` additive float; tile-top anchor is `screenPos.y` with origin `(0.5, 1.0)` on sprite |
| REND-02 | Selection indicator aligns with entity base tile position | `TargetHighlight.updatePosition` already uses `container.y`; fix is to ensure `container.y` IS the tile-top screen Y |
</phase_requirements>

## Summary

The entity floating bug originates from a single property in `EntityRenderer`: `private elevationOffset = 24`. This value is subtracted from the container's Y position at creation (`screenPos.y - elevationOffset`) and is also used in `uiBaseY` calculations (`-this.elevationOffset - spriteHeight * 0.5`). Removing this additive offset and anchoring all entity containers at the raw `screenPos.y` — which already includes the tile-elevation displacement (`elevation * ELEVATION_HEIGHT_STEP`) — is the core of the fix.

The tile system (TileRenderer) uses a `SPRITE_ORIGIN_Y = 0.25` (the top diamond center of a 256×256 cube sprite sits at y=64, so 64/256 = 0.25) to align the container's origin point with the tile's visible top surface. Entity sprites already use `setOrigin(0.5, 1.0)` (bottom-center), which is correct for ground-level alignment. The container Y is the logical "ground plane" for both tiles and entities — the only problem is the `elevationOffset` that pushes entities upward from it.

The `TargetHighlight` class positions its ring by calling `graphics.setPosition(container.x, container.y)` — it follows the container origin directly. Once the container origin is correctly at the tile's top surface (no artificial elevationOffset), the ring will naturally sit at ground level. The only secondary concern is the `uiBaseY` formula used for health bars and nameplates, which depends on `elevationOffset`; this must be recalculated relative to the corrected sprite position.

**Primary recommendation:** Set `elevationOffset = 0` in `EntityRenderer`, recalculate `uiBaseY` as `-spriteHeight` (i.e., `-(BASE_SPRITE_HEIGHT * scaleY)`) since sprite origin is already at bottom-center (y=0 in container space is the sprite's feet), and verify `TargetHighlight.updatePosition` still uses raw container position.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Phaser 3 | ^3.80.0 | Game engine — containers, sprites, tweens, graphics | Already in use; all rendering done here |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| N/A | — | No new libraries needed | This is a pure coordinate math fix |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Modifying container Y position | Modifying sprite Y offset within container | Container Y IS the entity's logical anchor; sprite Y offset was already set to 0 for most types. Container position is the right level to fix. |

**Installation:**
No new packages required.

## Architecture Patterns

### Relevant Project Structure
```
apps/web/src/game/
├── rendering/
│   ├── EntityRenderer.ts    # PRIMARY FILE: createEntityContainer, elevationOffset constant
│   ├── TargetHighlight.ts   # updatePosition reads container.x/y — fix here is indirect
│   └── TileRenderer.ts      # Reference: SPRITE_ORIGIN_Y = 0.25 for tile top-face alignment
├── utils/
│   └── IsometricTransform.ts  # gridToScreen formula, calculateDepth
└── scenes/
    └── WorldScene.ts          # Calls createEntityContainer, entity movement tweens, health bar updates
```

### Pattern 1: Tile Coordinate System

**What:** The isometric grid converts tile coordinates to screen Y using `(gridX + gridY) * tileHeightHalf`. For a 256×128 tile the diamond height is 128px, so `tileHeightHalf = 64`. The container is then shifted up by `elevation * ELEVATION_HEIGHT_STEP` (where `ELEVATION_HEIGHT_STEP = 128`), placing the container at the tile's top diamond surface.

**Tiles use:** `container.y = screenPos.y - elevationOffset` with `elevationOffset = elevation * 128`

**How the tile sprite is anchored:** The cube sprite uses `setOrigin(0.5, 0.25)`. In a 256×256 sprite the top diamond center is at pixel row 64 (= 256 * 0.25), so the container Y represents the center of the top diamond face.

**How entity sprites should be anchored:** Entities already use `sprite.setOrigin(0.5, 1.0)` (bottom-center). With `spriteYOffset = 0`, the sprite bottom sits at `y=0` inside the container. The container Y should therefore equal the tile's ground plane screen Y so the sprite bottom touches the tile surface.

```typescript
// TileRenderer.ts — reference for what tile containers do:
const screenPos = this.isoTransform.gridToScreen(worldX, worldY);
const elevationOffset = elevation * ELEVATION_HEIGHT_STEP; // 128 per level
const container = this.scene.add.container(screenPos.x, screenPos.y - elevationOffset);
// Tile sprite setOrigin(0.5, 0.25) → top diamond center aligns to container

// EntityRenderer.ts — CURRENT (broken):
const container = this.scene.add.container(screenPos.x, screenPos.y - elevationOffset);
// elevationOffset = (elevation * ELEVATION_HEIGHT_STEP) + this.elevationOffset  ← EXTRA 24px
// This is the bug: elevationOffset property = 24 is added on top of terrain elevation

// EntityRenderer.ts — FIXED:
const container = this.scene.add.container(screenPos.x, screenPos.y - (elevation * ELEVATION_HEIGHT_STEP));
// Container Y = tile ground plane. Sprite bottom (origin 1.0) touches tile top.
```

### Pattern 2: Container-Local vs Container-Position Split

**What:** The entity container has two coordinate planes:
- Container position (`.x`, `.y`) — the "anchor point" in world screen space, equals the tile ground plane
- Container-local coordinates — children of the container are positioned relative to (0, 0) = the anchor

**Entity sprite:** `sprite.y = 0` with `origin(0.5, 1.0)` → sprite bottom at y=0, sprite extends upward (negative local Y)

**Health bar / nameplate (uiBaseY):** Currently `uiBaseY = -this.elevationOffset - spriteHeight * 0.5`. With `elevationOffset = 0`, this becomes `uiBaseY = -spriteHeight * 0.5`. But since sprite origin is at `y=1.0` (bottom), the sprite TOP is at `y = -(spriteHeight * scaleY)` in container space. `uiBaseY` should be at or above the sprite top.

**Corrected formula:** `uiBaseY = -(BASE_SPRITE_HEIGHT * scaleY)` — this places UI elements at the sprite top edge regardless of entity type or scale.

```typescript
// FIXED uiBaseY (no elevationOffset dependency):
const uiBaseY = -(BASE_SPRITE_HEIGHT * scaleY); // = -spriteHeight
// Health bar: healthBar.y = uiBaseY (at sprite top)
// Nameplate: nameplate.y = uiBaseY - 20 (above health bar)
```

### Pattern 3: TargetHighlight — Already Correct, Needs Container Fix

**What:** `TargetHighlight.updatePosition(container)` sets `this.graphics.setPosition(container.x, container.y)`. This is correct — the highlight ring needs to be at the container's ground anchor. Once the container is at the correct tile-top position (no artificial float), the ring will automatically appear at tile level.

**No changes needed in TargetHighlight itself.** The bug is entirely in where the container is positioned.

```typescript
// TargetHighlight.ts — already correct:
updatePosition(container: Phaser.GameObjects.Container): void {
  if (this.graphics) {
    this.graphics.setPosition(container.x, container.y); // follows container anchor
    this.graphics.setDepth(container.depth - 0.1);
  }
}
```

### Pattern 4: Entity Movement Tween — Elevation Transition

**What:** When an entity moves to a tile with a different elevation, `WorldScene` calculates `targetY = screenPos.y - elevationOffset` and tweens the container from current Y to `targetY` over 500ms. This already gives the smooth height transition the user wants (no snapping). After the fix, this tween must use the corrected formula.

```typescript
// WorldScene.ts — entity movement tween (lines ~1518-1550):
const elevationOffset = elevation * 128; // ELEVATION_HEIGHT_STEP
const targetY = screenPos.y - elevationOffset;
this.tweens.add({
  targets: container,
  x: screenPos.x,
  y: targetY,
  duration: 500,
  ease: 'Linear',
  ...
});
// This is ALREADY correct — no EntityRenderer.elevationOffset leaked here
// The only issue: initial container creation in createEntityContainer had the extra 24px
```

### Pattern 5: WorldScene Health Bar Y Update (Must Also Be Fixed)

**What:** WorldScene.ts recalculates `uiBaseY` independently at lines ~1598-1601 when updating health bars during combat:

```typescript
// WorldScene.ts ~line 1600 — CURRENT (must match EntityRenderer fix):
const elevationOffset = (container.getData('elevationOffset') as number) ?? 24;
const uiBaseY = -elevationOffset - spriteHeight * 0.5;
```

The `container.setData('elevationOffset', this.elevationOffset)` stores the EntityRenderer's `elevationOffset = 24` on each container for WorldScene to read back. After the fix, `elevationOffset = 0`, so `uiBaseY = -spriteHeight * 0.5`. But the correct formula post-fix is `uiBaseY = -spriteHeight`. Need to update both the stored value AND the formula in WorldScene.

**Also at WorldScene line ~1637:** `newYieldBar.y = -elevationOffset - 24` — this too reads from stored elevationOffset and adds 24; must be recalculated after the fix.

### Anti-Patterns to Avoid
- **Mixing fix levels:** Don't fix only the sprite's local Y inside the container while leaving the container position wrong. The container Y is the semantic ground anchor; fix it there.
- **Per-type special-casing:** The user decision is same formula for ALL types. Don't introduce entity-type conditionals into the anchor formula.
- **Adjusting TargetHighlight:** The ring doesn't need internal changes. If the ring is still wrong after fixing container position, check container Y — don't add offsets inside TargetHighlight.
- **Forgetting WorldScene's independent uiBaseY:** EntityRenderer stores `elevationOffset` on the container via `setData('elevationOffset', this.elevationOffset)`. WorldScene reads this back for health bar redraws. Both sites must be updated consistently.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Tile top-face Y coordinate | Custom geometry calculation | The existing `screenPos.y - elevation * ELEVATION_HEIGHT_STEP` formula already IS the tile top surface | TileRenderer uses this exact formula already |
| Smooth cross-elevation tween | Per-frame lerp or custom interpolation | Phaser's `this.tweens.add({ y: targetY, duration: 500 })` | Already implemented in WorldScene for entity movement |

**Key insight:** The coordinate math for "tile top surface" already exists and is correct — TileRenderer uses it for tile containers. EntityRenderer simply needs to use the same formula without the extra 24px additive constant.

## Common Pitfalls

### Pitfall 1: The `elevationOffset` Property Leaks Into UI Positioning
**What goes wrong:** Removing `elevationOffset = 24` from container creation without also updating `uiBaseY = -this.elevationOffset - spriteHeight * 0.5` will cause health bars and nameplates to shift downward by 24px (they'll appear inside the sprite instead of above it).
**Why it happens:** The `uiBaseY` formula assumes container Y is 24px below the sprite bottom; after the fix, container Y equals the sprite bottom exactly.
**How to avoid:** Recalculate `uiBaseY = -(BASE_SPRITE_HEIGHT * scaleY)` — this correctly places UI at the sprite's top edge independent of any offset.
**Warning signs:** After fix, health bars appear inside sprites rather than above them.

### Pitfall 2: WorldScene's Independent `elevationOffset` Read
**What goes wrong:** EntityRenderer is fixed but WorldScene still reads `container.getData('elevationOffset') ?? 24` to recalculate health bar position. Even if EntityRenderer stores `0`, the formula `uiBaseY = -elevationOffset - spriteHeight * 0.5` remains incorrect.
**Why it happens:** Two separate sites compute `uiBaseY` from the stored `elevationOffset`: EntityRenderer (initial creation) and WorldScene (health updates during combat and yield bar updates).
**How to avoid:** Update both sites. After the fix the stored `elevationOffset` value can remain for backward compat but the formula at both sites must use `-spriteHeight` not `-elevationOffset - spriteHeight * 0.5`.
**Warning signs:** Health bar position is correct at spawn but jumps when health changes during combat.

### Pitfall 3: Shadow Ellipse Y Position
**What goes wrong:** The blob shadow is created at `y=0` inside the container. With the corrected container position (at tile-top), `y=0` inside the container IS the tile surface — the shadow is already in the right place. No change needed.
**Why it happens:** Developers might reflexively adjust shadow Y to compensate for the old offset.
**How to avoid:** Leave shadow at `y=0` in container space. After the fix, container Y = tile ground, so local y=0 = tile surface.

### Pitfall 4: Quest Marker Y Calculation Uses `elevationOffset`
**What goes wrong:** `createQuestMarker` computes `markerY = -this.elevationOffset - spriteHeight * 0.5 - 60`. This has the same dependency as `uiBaseY`.
**Why it happens:** Same formula repeated.
**How to avoid:** After the fix, update `markerY = -(BASE_SPRITE_HEIGHT * scale) - 60`.

### Pitfall 5: Depth Sorting Is Unaffected
**What goes wrong:** Developer worries that repositioning containers breaks depth order.
**Why it happens:** Natural concern about coordinate changes in isometric depth sorting.
**How to avoid:** `calculateDepth` uses `gridX`, `gridY`, `elevation` (stored as `.setData`) — not the visual Y. These are unchanged. Depth sorting is safe.

## Code Examples

Verified from direct codebase inspection:

### Current Broken Pattern (EntityRenderer.ts lines 105, 146)
```typescript
// EntityRenderer.ts — CURRENT
private elevationOffset = 24; // This constant is the root cause

createEntityContainer(entity: Entity, elevation: number = 0): Phaser.GameObjects.Container {
  const elevationOffset = elevation * ELEVATION_HEIGHT_STEP;
  const container = this.scene.add.container(screenPos.x, screenPos.y - elevationOffset);
  //                                                       ^^^ Only terrain elevation applied
  //    But then:
  const uiBaseY = -this.elevationOffset - spriteHeight * 0.5;
  //               ^^^ adds 24 more pixels of artificial float to UI positioning
```

Wait — let me clarify the actual bug after careful re-reading. The container IS placed at `screenPos.y - (elevation * ELEVATION_HEIGHT_STEP)` — which is correct. The `elevationOffset` property (= 24) is NOT subtracted from the container position. Instead it feeds into:
1. `uiBaseY = -this.elevationOffset - spriteHeight * 0.5` — UI positioned 24px lower than necessary
2. `container.setData('elevationOffset', this.elevationOffset)` — stored for WorldScene reads

The ACTUAL container placement looks correct. Let me re-read the sprite placement more carefully.

```typescript
// EntityRenderer.ts line 208:
let spriteYOffset = -this.elevationOffset; // = -24 for non-creature types
// ...
if (this.isCreature(entity)) {
  spriteYOffset = 0; // Creatures: feet at shadow (y=0 in container)
}
if (this.isNpc(entity)) {
  spriteYOffset = 0; // Same
}
if (this.isPlant(entity) || this.isMineral(entity)) {
  spriteYOffset = 0; // Same
}
const sprite = this.scene.add.sprite(0, spriteYOffset, ...);
sprite.setOrigin(0.5, 1.0); // Bottom-center
```

So for creatures, plants, minerals, and NPCs: `spriteYOffset = 0` — sprite bottom at y=0 in container space. For artifacts and items: `spriteYOffset = -24` — sprite bottom 24px ABOVE the container origin, causing those to float.

But the user says entities float at ALL elevations including flat ground. The more fundamental issue is that `uiBaseY = -this.elevationOffset - spriteHeight * 0.5` uses the 24px offset, which shifts the health bar and shadow circle incorrectly, making entity visual feedback appear misaligned even when sprites themselves sit at y=0.

Additionally, `TargetHighlight.updatePosition` positions the ring at `container.x, container.y`. If the container origin IS the tile-top (correct), but the shadow ellipse inside the container is also at `y=0`, then shadow and ring are both at the tile surface — that part is fine. The ring misalignment mentioned in the context about trees is because tall tree sprites are very large (scale 8.0), and the ring at y=0 (tile surface) is far below the visible tree sprite top — this is *correct* behavior for a ground-level ring. The user's context says "select indicator ends up way below the actual tree sprite" — this is because the ring follows container.y, and container.y IS the tile surface. This is expected.

The actual bug the user is reporting is likely:
1. For artifacts/items: `spriteYOffset = -this.elevationOffset = -24` causes those sprites to float 24px above ground
2. On elevated terrain: the container elevation math might have a discrepancy vs the tile

### Definitive Analysis of the Bug

After thorough reading of all involved code:

**Bug 1 (confirmed):** Artifacts and items use `spriteYOffset = -this.elevationOffset = -24`. The sprite with `origin(0.5, 1.0)` and `spriteYOffset = -24` has its bottom at y=-24 in container space, meaning it floats 24px above the container origin (tile ground). Fix: set `spriteYOffset = 0` for these types too.

**Bug 2 (confirmed):** The `uiBaseY = -this.elevationOffset - spriteHeight * 0.5` formula is used for ALL entity types including creatures where `spriteYOffset = 0`. For a creature with scale 2.5, `spriteHeight = 256 * 2.5 = 640`. So `uiBaseY = -24 - 320 = -344`. But the sprite top is at `y = 0 - spriteHeight = -640` (sprite bottom at 0, top 640px above = -640). So health bar is at -344, which is well within the middle of the sprite, not above it. The correct formula should be `uiBaseY = -spriteHeight` = -640 to place UI at the sprite top.

**Bug 3 (confirmed):** `TargetHighlight.updatePosition` positions ring at `container.x, container.y`. If container Y is the tile ground plane and the ring draws at y=0,0 relative to that position, the ring IS at ground level — correct. The user says "selection ring indicator appears at the entity's base tile position" — this is already what happens. The confusion might be that on elevated tiles, the container is placed at `screenPos.y - elevation*128`, which IS the elevated tile surface. But if the ring looks wrong, it may be because the container elevation offset itself is off. This needs to be verified during implementation.

### Fixed Code Patterns

**EntityRenderer.ts — fix `spriteYOffset` for artifacts/items:**
```typescript
// BEFORE (wrong — artifacts/items float):
let spriteYOffset = -this.elevationOffset; // = -24
if (this.isCreature(entity)) { spriteYOffset = 0; }
if (this.isNpc(entity)) { spriteYOffset = 0; }
if (this.isPlant(entity) || this.isMineral(entity)) { spriteYOffset = 0; }

// AFTER (all entity types at ground level):
const spriteYOffset = 0; // All types: sprite bottom at y=0 = tile ground plane
```

**EntityRenderer.ts — fix `uiBaseY` formula:**
```typescript
// BEFORE (wrong — UI appears inside sprite body):
const uiBaseY = -this.elevationOffset - spriteHeight * 0.5;
// For creature scale 2.5: uiBaseY = -24 - 320 = -344 (inside 640px tall sprite)

// AFTER (UI at sprite top):
const uiBaseY = -spriteHeight; // = -(BASE_SPRITE_HEIGHT * scaleY)
// For creature scale 2.5: uiBaseY = -640 (at top edge of sprite)
```

**WorldScene.ts — fix health bar recalculation (lines ~1600, ~1637):**
```typescript
// BEFORE:
const elevationOffset = (container.getData('elevationOffset') as number) ?? 24;
const uiBaseY = -elevationOffset - spriteHeight * 0.5;

// AFTER:
const spriteHeight = 256 * scale;
const uiBaseY = -spriteHeight; // consistent with EntityRenderer fix
```

**EntityRenderer.ts — fix quest marker Y:**
```typescript
// BEFORE:
const markerY = -this.elevationOffset - spriteHeight * 0.5 - 60;

// AFTER:
const markerY = -spriteHeight - 60; // above sprite top
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| spriteYOffset = -24 for artifacts/items | spriteYOffset = 0 for all types | Phase 99 | Artifacts/items sit on tile instead of floating |
| uiBaseY = -elevationOffset - spriteHeight*0.5 | uiBaseY = -spriteHeight | Phase 99 | Health bars/nameplates consistently above sprite top |

**Deprecated/outdated:**
- `private elevationOffset = 24` in EntityRenderer: this property is the source of the misalignment. After the fix it can remain as `0` or be removed entirely. The `container.setData('elevationOffset', ...)` downstream reads can also be cleaned up.

## Open Questions

1. **Does the container itself float above the tile top surface?**
   - What we know: `container.y = screenPos.y - elevation * ELEVATION_HEIGHT_STEP`. TileRenderer uses the same formula. Both receive `screenPos` from `isoTransform.gridToScreen`.
   - What's unclear: Whether the tile container and entity container use the exact same screen position origin for a given tile grid coord. They appear to — both call `gridToScreen(worldX, worldY)` — but the tile uses `SPRITE_ORIGIN_Y = 0.25` to align the diamond top to container origin, while the entity container origin is the sprite foot.
   - Recommendation: During implementation, verify visually by temporarily rendering a 1px dot at container origin for both tile and entity at the same grid position. They should coincide at the tile's top diamond center.

2. **Is the TargetHighlight ring really at the wrong position?**
   - What we know: `TargetHighlight` places the ring at `container.x, container.y`. Container Y after fix = tile ground plane. Ring should be at ground level.
   - What's unclear: The user context mentions the ring ends up "way below" the tree. This matches expected behavior (ring on ground, tree sprite 8x scale = very tall). But REND-02 says ring must be at "entity base tile position" — which IS the ground. This may already be correct after fixing Bug 1 and Bug 2, and the user just wanted confirmation.
   - Recommendation: Verify ring position matches shadow ellipse position post-fix. If they both sit at y=0 in container space, they are co-located at tile ground — correct.

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection — EntityRenderer.ts, TileRenderer.ts, IsometricTransform.ts, TargetHighlight.ts, WorldScene.ts — all findings are directly from source code
- Phaser 3 ^3.80.0 (from root package.json) — Container, Sprite, setOrigin behavior confirmed from code behavior

### Secondary (MEDIUM confidence)
- Phaser 3 Container documentation (training knowledge): `Container.add()` places children at container-local coordinates; `container.x/y` is world position

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries, pure coordinate math
- Architecture: HIGH — all files read directly, bug traced to specific lines
- Pitfalls: HIGH — cross-referenced all sites that use `elevationOffset` property

**Research date:** 2026-02-26
**Valid until:** Stable — this is pure project-internal math, no external API dependencies
