---
phase: quick-10
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/web/src/game/utils/IsometricTransform.ts
autonomous: true
requirements: [QUICK-10]
must_haves:
  truths:
    - "Entities (players, NPCs, creatures) render at correct visual depth — not hidden behind tiles on their upper half"
    - "Entity depth sorting matches their visual Y position including the ENTITY_GROUND_OFFSET"
  artifacts:
    - path: "apps/web/src/game/utils/IsometricTransform.ts"
      provides: "calculateDepth with ENTITY_GROUND_OFFSET-aware depth for entities"
      contains: "ENTITY_GROUND_OFFSET"
  key_links:
    - from: "apps/web/src/game/utils/IsometricTransform.ts"
      to: "WorldScene.ts, EntityRenderer.ts, DepthSorter.ts"
      via: "calculateDepth(gridX, gridY, elevation, priorityBoost, isEntity=true)"
      pattern: "calculateDepth.*true"
---

<objective>
Fix entity depth sorting so entities are not hidden behind tiles on their upper half.

Purpose: Entities are visually shifted +64px down (ENTITY_GROUND_OFFSET) to sit on the ground plane of isometric tiles, but calculateDepth() does not account for this offset. This causes entities to sort behind tiles that are visually behind them, making the player and other entities appear to sink behind or be hidden by tiles on their upper half.

Output: A one-line fix in calculateDepth() that adds ENTITY_GROUND_OFFSET (64) to entity depth values, aligning depth sorting with visual position.
</objective>

<execution_context>
@/Users/krzysztof.kalamarski/.claude/get-shit-done/workflows/execute-plan.md
@/Users/krzysztof.kalamarski/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@apps/web/src/game/utils/IsometricTransform.ts
@apps/web/src/game/rendering/EntityRenderer.ts (reference — defines ENTITY_GROUND_OFFSET = 64)
@apps/web/src/game/scenes/WorldScene.ts (reference — also defines ENTITY_GROUND_OFFSET = 64)

<interfaces>
From apps/web/src/game/utils/IsometricTransform.ts (line 91):
```typescript
calculateDepth(gridX: number, gridY: number, elevation: number = 0, priorityBoost: number = 0, isEntity: boolean = false): number {
    const screen = this.gridToScreen(gridX, gridY);
    const entityOffset = isEntity ? 0.5 : 0;
    return screen.y + (gridX * 0.0001) + (elevation * this.elevationWeight) + priorityBoost + entityOffset;
}
```

Current entity depth model:
- screen.y = (gridX + gridY) * 64  (tileHeightHalf)
- Adjacent isometric rows differ by 64 depth units
- entityOffset = 0.5 (far too small — entities are visually 64px further south)
- ENTITY_GROUND_OFFSET = 64 (defined in EntityRenderer.ts and WorldScene.ts, used to shift entity containers +64px in Y)

Problem: Entity containers are placed at screenPos.y + ENTITY_GROUND_OFFSET (64px lower), but depth is calculated without this offset. The entity appears one full isometric row further south visually, but its depth says it's at its grid position. Result: tiles that are visually behind the entity sort in front of it.
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add ENTITY_GROUND_OFFSET to entity depth calculation</name>
  <files>apps/web/src/game/utils/IsometricTransform.ts</files>
  <action>
In `calculateDepth()` (line 91-97 of IsometricTransform.ts):

1. Add a constant at the top of the file (before the class declaration):
   ```typescript
   const ENTITY_GROUND_OFFSET = 64;
   ```

2. Change the entityOffset calculation from:
   ```typescript
   const entityOffset = isEntity ? 0.5 : 0;
   ```
   to:
   ```typescript
   const entityOffset = isEntity ? ENTITY_GROUND_OFFSET : 0;
   ```

This makes entity depth equal to `screen.y + 64 + ...` when isEntity is true, which matches the visual Y position of entity containers (which are placed at `screenPos.y + ENTITY_GROUND_OFFSET`). Entities will now sort as if they are at their visual position, not their grid position.

The value 64 is exactly one isometric row of depth (tileHeightHalf = 128/2 = 64), which matches the ENTITY_GROUND_OFFSET used in WorldScene.ts and EntityRenderer.ts to shift entity containers down by 64px.

Update the depth model comment block (lines 79-89) to reflect that entityOffset is now 64 (ENTITY_GROUND_OFFSET) rather than 0.5, and explain why: "Matches the +64px visual shift applied to entity containers so depth sorting aligns with visual position."

Do NOT change the function signature — all callers already pass `isEntity: true` for entities.
  </action>
  <verify>
    <automated>cd /Users/krzysztof.kalamarski/Projects/into-the-void && npx nx run web:build 2>&1 | tail -5</automated>
  </verify>
  <done>
    - calculateDepth() adds ENTITY_GROUND_OFFSET (64) to depth when isEntity is true
    - Build passes with no TypeScript errors
    - Comment block accurately describes the updated depth model
  </done>
</task>

</tasks>

<verification>
1. `npx nx run web:build` completes without errors
2. Visual check: entities (player, NPCs, creatures) no longer hidden behind tiles on their upper half — they render in front of tiles that are visually behind them
</verification>

<success_criteria>
- Entity depth sorting matches visual position: entities that appear further south on screen sort in front of tiles that are further north
- No regression in tile-to-tile depth sorting (tiles are unaffected — isEntity=false path unchanged)
- Build passes cleanly
</success_criteria>

<output>
After completion, create `.planning/quick/10-fix-entity-rendering-features-sinking-pl/10-SUMMARY.md`
</output>
