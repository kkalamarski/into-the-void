---
phase: 07-entities-hud
plan: 01
subsystem: client-rendering
tags: [entity-rendering, health-bars, behavior-icons, phaser, lore-integration]
dependency_graph:
  requires: [05-phaser-integration-world-rendering]
  provides: [entity-containers, health-visualization, behavior-classification-ui]
  affects: [entity-spawning, world-scene-rendering]
tech_stack:
  added: [EntityRenderer-class, Phaser-Container-composition]
  patterns: [container-composition, type-guards, lore-driven-ui]
key_files:
  created:
    - apps/web/src/game/rendering/EntityRenderer.ts
  modified:
    - apps/web/src/game/scenes/WorldScene.ts
    - apps/web/src/game/scenes/PreloadScene.ts
decisions:
  - "Health bars show only when entity is damaged (health < maxHealth)"
  - "Behavior icons positioned at y=-30, health bars at y=-20 for vertical stacking"
  - "Entity depth set to 5 (below player at 10) for proper z-ordering"
  - "Lore-accurate behavior mapping: passive→H (green), neutral→O (yellow), aggressive→P (orange), defensive→M (red)"
  - "Plant texture uses upward triangle shape (green) for visual distinction from minerals"
metrics:
  duration: 3m 39s
  tasks_completed: 3
  files_created: 1
  files_modified: 2
  commits: 3
  completed_at: "2026-02-15T20:43:33Z"
---

# Phase 07 Plan 01: Entity Renderer with Health Bars and Behavior Icons Summary

**One-liner:** Entity rendering system with health bars and lore-correct threat classification icons (H/O/P/M) using Phaser Container composition.

## What Was Built

Created `EntityRenderer` utility class that transforms flat entity sprites into rich Phaser Containers with layered UI elements:

1. **EntityRenderer Class** (`apps/web/src/game/rendering/EntityRenderer.ts`)
   - `createEntityContainer(entity)` - Creates Container with sprite + optional overlays
   - `createHealthBar(current, max)` - Generates color-coded health bar Graphics (green >50%, yellow 25-50%, red <25%)
   - `createBehaviorIcon(behavior)` - Creates lore-accurate threat classification text badges
   - Type guard `isCreature()` for safe type narrowing
   - Texture mapping for creature/mineral/item/plant entity types

2. **WorldScene Integration**
   - Changed `entitySprites` Map from `Sprite` to `Container` storage
   - `spawnEntity()` uses EntityRenderer to create containers with depth=5
   - `despawnEntity()` properly destroys containers with children
   - `updateEntity()` handles health changes by recreating health bars
   - EntityRenderer initialization in `create()` method
   - Cleanup in `shutdown()` method
   - Fixed `generatePlaceholderWorld()` to work with Container-based entities

3. **Plant Texture Addition** (`PreloadScene.ts`)
   - Green upward-pointing triangle texture for plant entities
   - Enables future flora rendering (mentioned in ENT-02 scope)

## Lore Integration

**Creature Behavioral Classifications** (per world-bible.md lines 353-416):

| Behavior    | Icon | Color  | Classification | Threat Level |
|-------------|------|--------|----------------|--------------|
| `passive`   | H    | Green  | Herbivore      | Low          |
| `neutral`   | O    | Yellow | Omnivore       | Moderate     |
| `aggressive`| P    | Orange | Predator       | High         |
| `defensive` | M    | Red    | Maniac         | Extreme      |

These classifications are now visually represented in-game, teaching players threat assessment through immediate visual feedback.

## Technical Implementation

**Container Composition:**
```
Container (positioned at entity world coords)
├─ Sprite (0, 0) - base entity texture
├─ Graphics (0, -20) - health bar (if damaged)
└─ Text (0, -30) - behavior icon (if creature)
```

**Health Bar Visual States:**
- Background: dark gray (#333333)
- Fill colors based on percentage:
  - >50%: green (#44cc44) - healthy
  - 25-50%: yellow (#ffcc00) - wounded
  - <25%: red (#ff4444) - critical

**Type Safety:**
- `isCreature()` type guard prevents runtime errors when checking creature-specific properties
- Imported `Creature` type from shared-types for proper type narrowing
- Container type change required fixing `generatePlaceholderWorld()` method

## Files Changed

### Created
- `apps/web/src/game/rendering/EntityRenderer.ts` (140 lines) - Core entity container factory

### Modified
- `apps/web/src/game/scenes/WorldScene.ts` - Entity rendering integration, Container-based entity management
- `apps/web/src/game/scenes/PreloadScene.ts` - Added plant texture generation

## Deviations from Plan

None - plan executed exactly as written.

## Testing Notes

**Verification performed:**
- TypeScript compilation clean (no errors)
- Build system validated via `tsc --noEmit`
- Type safety confirmed for Container-based entity management
- Placeholder world method updated to maintain compatibility (though unused in production)

**Manual testing required (Phase 7 verification checkpoint):**
- Entity spawning with health bars visible when damaged
- Behavior icons display correct letters and colors
- Health bar color changes as health decreases
- Container positioning correct relative to tile grid
- Z-ordering (entities at depth 5, player at depth 10)

## Blockers/Issues

None encountered.

## Next Steps

Plan 07-02 will build on this foundation by:
- Implementing server-side entity spawn/despawn events
- Adding entity interaction tooltips
- Creating entity selection UI
- Testing health bar updates with real entity damage

## Commit History

1. **3345275** - `feat(07-01): create EntityRenderer with health bars and behavior icons`
   - EntityRenderer class with container factory methods
   - Health bars with percentage-based color coding
   - Lore-correct behavior icons (H/O/P/M)

2. **8ad540b** - `feat(07-01): integrate EntityRenderer into WorldScene`
   - Changed entitySprites Map to Container type
   - Updated spawn/despawn/update methods
   - Added EntityRenderer initialization and cleanup
   - Fixed generatePlaceholderWorld() compatibility

3. **0b7660b** - `feat(07-01): add plant texture to PreloadScene`
   - Green triangle texture for plant entities
   - Upward-pointing triangle shape

## Self-Check

Verifying all claims in this summary:

```bash
# Check created files exist
[ -f "apps/web/src/game/rendering/EntityRenderer.ts" ] && echo "FOUND: EntityRenderer.ts" || echo "MISSING: EntityRenderer.ts"

# Check commits exist
git log --oneline --all | grep -q "3345275" && echo "FOUND: 3345275" || echo "MISSING: 3345275"
git log --oneline --all | grep -q "8ad540b" && echo "FOUND: 8ad540b" || echo "MISSING: 8ad540b"
git log --oneline --all | grep -q "0b7660b" && echo "FOUND: 0b7660b" || echo "MISSING: 0b7660b"
```

Running verification...

**Results:**
- FOUND: EntityRenderer.ts
- FOUND: 3345275
- FOUND: 8ad540b
- FOUND: 0b7660b

## Self-Check: PASSED

All files and commits verified successfully.
