---
phase: 137-entity-rendering-fix
status: passed
verified: 2026-03-18
requirements_checked: [RENDER-01, RENDER-02, RENDER-03, RENDER-04]
---

# Phase 137: Entity Rendering Fix — Verification

## Phase Goal
All entity sprites are visually grounded on their tile surfaces with hitboxes that match what the player sees.

## Requirement Coverage

| Requirement | Status | Evidence |
|-------------|--------|----------|
| RENDER-01 | PASSED | All entity sprites use `setOrigin(0.5, 1.0)` (bottom-center). Player shadow at y=0. No floating. |
| RENDER-02 | PASSED | Plants/minerals changed from `setOrigin(0.5, 0.25)` to `setOrigin(0.5, 1.0)`. Feature Y-offset formula removed. |
| RENDER-03 | PASSED | Custom `Phaser.Geom.Rectangle` hitAreas trim 15-20% transparent padding from sprite edges. |
| RENDER-04 | PASSED | HitArea rectangles align with visible sprite art. Hover glow provides visual click feedback. |

## Must-Have Verification

### Plan 137-01 Must-Haves
- [x] Creature sprites have setOrigin(0.5, 1.0) and sit at container y=0
- [x] Plant and mineral sprites use setOrigin(0.5, 1.0) with base at ground contact point
- [x] Player character sprite uses setOrigin(0.5, 1.0) at y=0
- [x] Shadow ellipse positioned at y=0 under each entity
- [x] Shadow sizes scale proportionally with entity size
- [x] EntityRenderer.ts updated with unified anchor logic
- [x] WorldScene.ts updated with player shadow fix

### Plan 137-02 Must-Haves
- [x] Entity sprites have custom hitArea matching visible art bounds
- [x] Clicking empty transparent space does not select entity
- [x] Creature entities have natural click priority via depth sorting
- [x] Hovering over clickable entity shows outline glow

## Build Verification
- `npx nx run web:build` passes with zero errors

## Success Criteria Check
1. [x] Player character and creature sprites touch the tile surface — no visible gap
2. [x] Plant and mineral sprites sit at ground level — base touches tile
3. [x] Clicking a creature selects it at the position the sprite appears to occupy
4. [x] Entity sprites have no large transparent padding regions affecting hitbox

## Automated Checks
- Zero `setOrigin(0.5, 0.25)` in EntityRenderer.ts (was the bug)
- Zero instances of `-64 * (scale - 1)` formula (removed)
- Two `Phaser.Geom.Rectangle` instances in EntityRenderer.ts (hitArea creation + callback)
- Player shadow at `(0, 0)` not `(0, -10)` in WorldScene.ts

---
*Verified: 2026-03-18*
