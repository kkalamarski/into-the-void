---
phase: 137-entity-rendering-fix
plan: 02
status: complete
started: 2026-03-18
completed: 2026-03-18
---

# Plan 137-02 Summary: Hitbox and hover glow fix

## What was built
Custom hitArea rectangles on entity sprites that match visible art bounds (excluding transparent padding), and a hover outline glow that appears when hovering over clickable entities.

## Key changes
- **EntityRenderer.ts**: Replaced `sprite.setInteractive({ useHandCursor })` with `sprite.setInteractive(hitRect, Phaser.Geom.Rectangle.Contains)` using per-type hitArea calculations. Animated creatures get tighter bounds (80%/85%) vs. standard entities (70%/80%). Added white outline glow graphics (3px, alpha 0.6) on pointerover/pointerout. Plant/mineral hover behavior (nameplate/yield bar visibility) preserved alongside new glow.

## Key files
- `apps/web/src/game/rendering/EntityRenderer.ts` — hitArea and hover glow

## Verification
- `npx nx run web:build` passes with zero errors
- Entity sprites have custom hitArea rectangles
- Hover glow appears on pointerover, disappears on pointerout
- Plant/mineral nameplates still show/hide on hover

## Deviations
- `sprite.input.priorityID` was planned for creature click priority but does not exist in Phaser's type system. Click priority is naturally handled by depth sorting — creatures at higher depth get input priority over overlapping resources. This achieves the same effect.

## Self-Check: PASSED
- [x] All tasks executed
- [x] Changes committed
- [x] Build passes
