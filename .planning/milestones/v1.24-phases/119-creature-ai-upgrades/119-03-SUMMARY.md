# Plan 119-03 Summary: Client Visual Rendering

**Status:** Complete
**Duration:** ~8 minutes
**Commits:** 123fddf

## What Was Built

Rendered all four creature AI behaviors visually on the game client:

1. **Frenzy Red Tint (CRAI-06):** Added `applyFrenzyEffect()` method to EntityRenderer that applies `setTint(0xff4444)` with a pulsing alpha tween (400ms period, 1.0 to 0.6) on frenzied creatures. Effect is applied on initial spawn if creature is already frenzied, and dynamically when `creature:frenzy` events arrive.

2. **Stealth Invisibility:** Stealthed predators spawn with `alpha=0` and `stealthed=true` data flag. When `stealthed` changes to `false` via entity:update, a 300ms Power2 ease fade-in reveals the creature.

3. **Stampede Camera Shake:** EntityRenderer initializes a DOM event listener for `creature:stampede` custom events (dispatched by entityStore). Triggers a 300ms camera shake with 0.01 intensity. Listener is cleaned up on scene shutdown.

4. **Socket Event Wiring:** Added `creature:frenzy` and `creature:stampede` to the socket.ts serverEvents array. Added handlers in entityStore.ts for React state and in gameStore.ts for Phaser rendering.

## Key Files

### Modified
- `apps/web/src/game/rendering/EntityRenderer.ts` — Added `frenzyTweens` map, `applyFrenzyEffect()`, `cleanupFrenzyEffect()`, `applyStealthReveal()`, `initStampedeListener()`, `destroyStampedeListener()`, stealth/frenzy on spawn
- `apps/web/src/game/scenes/WorldScene.ts` — Added frenzy/stealth handling in `updateEntity()`, frenzy cleanup in `despawnEntity()`, stampede listener init/destroy
- `apps/web/src/network/socket.ts` — Added `creature:frenzy` and `creature:stampede` to serverEvents array
- `apps/web/src/store/entityStore.ts` — Added socket listeners for creature:frenzy (entity store) and creature:stampede (DOM event)
- `apps/web/src/store/gameStore.ts` — Added creature:frenzy handler forwarding to WorldScene

## Decisions Made
- Frenzy tweens tracked in a Map on EntityRenderer (not container data) for reliable cleanup (CRAI-07)
- Stampede uses DOM CustomEvent bridge between React/Zustand store and Phaser scene (avoids tight coupling)
- Stealth reveal uses Power2 ease for a quick snap-in appearance (feels like a sudden detection)
- Frenzy pulsing period of 400ms chosen to match the feel of doubled attack speed

## Self-Check: PASSED
- [x] Frenzied creatures display red tint (0xff4444) with pulsing alpha tween
- [x] Frenzy applied on spawn if creature already frenzied
- [x] Frenzy tint removed when frenzied=false
- [x] Stealthed predators invisible (alpha=0) on spawn
- [x] Stealth reveal has 300ms fade-in animation
- [x] Stampede triggers 300ms camera shake
- [x] Frenzy tweens destroyed on entity despawn (CRAI-07)
- [x] Stampede listener cleaned up on scene shutdown
- [x] Web client builds without errors

---
*Plan: 119-03 | Phase: 119-creature-ai-upgrades*
