# Phase 119: Creature AI Upgrades - Research

**Completed:** 2026-03-04
**Status:** Ready for planning

## Current Architecture

### Creature AI Pipeline

**Pure FSM layer** (`packages/game-logic/src/ai/creature-ai.ts`):
- `tickCreatureAI()` — pure function, no side effects, returns `AiTickResult`
- Four behavior branches: herbivore (flee/wander), omnivore (wander, retaliates when provoked), predator/maniac (aggro/chase/attack)
- Already has Phase 119 signal fields on `AiTickResult`: `stampede`, `packCall`, `ambush`, `frenzied` (added in FNDN-05)

**Server orchestrator** (`apps/game-server/src/game/ai.service.ts`):
- `AiService` runs 1-second tick per active zone via `runZoneTick()`
- Per-creature loop: calls `tickCreatureAI()` per creature, processes results (aggro, return, movement)
- Batches position updates into single `entity:batch` event
- No zone-level pre-processing pass yet (needed for CRAI-05: group behaviors)

**Combat layer** (`apps/game-server/src/game/combat.service.ts`):
- `CombatService` tracks `CreatureCombatSession` per creature (Map<creatureId, session>)
- `creatureAttackTick()` handles damage, uses `calculateAttackInterval(haste)` for timing
- `provokeCreature()` sets omnivore `provoked` flag
- `handleCreatureDeath()` spawns loot, schedules respawn

**Client rendering** (`apps/web/src/game/rendering/EntityRenderer.ts`):
- Entity updates arrive via `entity:update` and `entity:batch` socket events
- Health bars with behavior icons for creatures
- No tint/color overlay system exists yet — must be added for Frenzy visual

### Data Model

**Creature interface** (`packages/shared-types/src/core/entity.ts`):
- Fields: `speciesId`, `health`, `maxHealth`, `level`, `behavior`, `spawnPosition`, `combatTarget`, `provoked`
- No `stealthed`, `frenzied`, or `stampeding` fields yet — need to be added

**CharacterStats** (`packages/shared-types/src/core/player.ts`):
- Has `perception` field (affects detection range)
- `calculatePerceptionRange()` in visibility/range.ts gives bonus tiles per perception point

**CreatureBehavior type**: `'herbivore' | 'omnivore' | 'predator' | 'maniac'`

### Socket Events

**Existing relevant events:**
- `entity:update` — generic entity field updates (used for health, position, active)
- `entity:batch` — batched position updates
- `combat:start` — combat initiation
- `combat:damage` — damage dealt with damageType, critical, killed flags

**New events needed:**
- `creature:stampede` — stampede path and affected players
- `creature:frenzy` — frenzy state change for visual overlay
- `creature:ambush` — ambush reveal for visual flash
- `creature:pack-call` — pack call notification for combat log

## Implementation Analysis

### CRAI-01: Stampede (Herbivores)

**Trigger:** 3+ herbivores fleeing simultaneously in same zone tick
**Detection point:** Zone-level pre-processing pass in `runZoneTick()` BEFORE per-creature FSM loop
**Algorithm:**
1. Count fleeing herbivores (those with `combatTarget` or near players)
2. If count >= 3, compute stampede corridor (direction = average flee direction)
3. Apply kinetic damage to players in corridor path
4. Set `stampede: true` on those creatures' AiTickResult

**Key decision:** Stampede is a zone-level behavior, not per-creature. The FSM function `tickCreatureAI()` operates on single creatures. Options:
- **Option A:** Add zone-level pass in `AiService.runZoneTick()` before FSM loop (CRAI-05 requirement)
- **Option B:** Modify `tickCreatureAI()` to accept additional context

Recommendation: Option A — matches CRAI-05's explicit requirement for "zone-level pre-processing pass"

**Damage:** 2x creature level as kinetic damage per CONTEXT.md

### CRAI-02: Pack Call (Omnivores)

**Trigger:** Omnivore provoked → 30% random chance → summon 1-2 nearby omnivores (10-tile range)
**Detection point:** In provoke flow — when `provokeCreature()` is called
**Algorithm:**
1. On provoke, roll 30% chance
2. If triggered, find omnivores within 10 tiles not already in combat
3. Cap at 2 reinforcements
4. Instantly set their `combatTarget` and `provoked`, start combat sessions

**Key note:** "additional creatures join the fight without being newly spawned" — use existing zone entities only

### CRAI-03: Ambush (Predators)

**Trigger:** Predator aggro from stealth → first attack deals 2x damage
**New field on Creature:** `stealthed?: boolean` — set true on spawn for predators
**Detection flow:**
1. Predators spawn with `stealthed: true`
2. Client hides stealthed predators (or shows them only to high-Perception players)
3. On aggro, first attack gets 2x multiplier
4. `stealthed` cleared after first attack

**Perception check:** Player perception > 150 → predator revealed before aggro → no 2x bonus
- Check in `AiService` during aggro scan: if closest player has perception > 150, clear stealth first
- Need access to player stats in AI tick — currently only have `PlayerPublic` (no stats)
- Solution: extend aggro logic to check perception via `InventoryService`/`computeCharStats()`

### CRAI-04: Frenzy (Maniacs)

**Trigger:** Maniac health drops below 30% of maxHealth
**Effects:**
- Attack speed doubles (halve attack interval in `creatureAttackTick()`)
- Takes 25% more damage (applied in damage calculation)
- Visual: red tint overlay + pulsing glow on client

**State tracking:**
- Add `frenzied?: boolean` to Creature interface
- Set in combat damage processing when health < 30% maxHealth
- Frenzy Map in `CombatService` or on creature entity itself

### CRAI-05: Zone-Level Pre-Processing

**Requirement:** Pre-processing pass before per-creature FSM loop for group behaviors
**Implementation:** New method `preProcessGroupBehaviors()` in `AiService`
- Called at start of `runZoneTick()` before the creature loop
- Handles: Stampede detection (3+ fleeing herbivores), Pack Call coordination
- Returns zone-level decisions that individual creature ticks can reference

### CRAI-06: Frenzy Visual (EntityRenderer)

**Requirement:** Color overlay visible to players
**Implementation:**
- New `creature:frenzy` socket event with `{ entityId, frenzied: boolean }`
- EntityRenderer applies red tint via Phaser `setTint(0xff4444)` when frenzied
- Pulsing glow via Phaser tween on alpha/tint

### CRAI-07: Frenzy State Cleanup

**Requirement:** No state leak on death
**Implementation:**
- Clear `frenzied` field when creature dies (in `handleCreatureDeath()`)
- If using separate Frenzy Map: delete entry on death
- Add to zone deactivation cleanup

## File Impact Map

### Shared Types (`packages/shared-types`)
- `src/core/entity.ts` — Add `stealthed?`, `frenzied?` fields to Creature interface
- `src/network/events.ts` — Add new ServerEventType entries and ServerEvents payload types

### Game Logic (`packages/game-logic`)
- `src/ai/creature-ai.ts` — Stampede/packCall signal logic in per-creature FSM, Frenzy detection
- `src/ai/creature-ai.test.ts` — NEW: unit tests for all four behaviors
- `src/combat/damage.ts` — Ambush 2x multiplier, Frenzy 25% vulnerability multiplier
- `src/index.ts` — Export any new functions

### Game Server (`apps/game-server`)
- `src/game/ai.service.ts` — Zone-level pre-processing, stampede damage, pack call coordination, ambush stealth/perception
- `src/game/combat.service.ts` — Frenzy attack speed doubling, frenzy state tracking, ambush first-strike, cleanup on death

### Client (`apps/web`)
- `src/game/rendering/EntityRenderer.ts` — Frenzy red tint overlay, stealth visibility, stampede visual
- `src/store/entityStore.ts` — Handle new creature state fields
- `src/network/socket.ts` — Listen for new creature events

## Risks and Mitigations

1. **Performance:** Zone-level pre-processing adds overhead to every tick. Mitigation: Only iterate herbivores for stampede check, early-exit if < 3 herbivores in zone.

2. **State leak (CRAI-07):** Frenzy Map entries not cleaned up. Mitigation: Use creature entity field (`frenzied`) instead of separate Map — entity cleanup on death handles it automatically.

3. **Perception stat access in AI tick:** Currently `PlayerPublic` doesn't include stats. Mitigation: Compute stats in AiService for perception check only when predator is about to aggro (not every tick).

4. **Stampede damage timing:** Damage must happen in same tick as stampede visual. Mitigation: Pre-processing pass computes damage and emits events before FSM loop processes individual movements.

## Requirement Coverage

| Requirement | Approach | Files |
|-------------|----------|-------|
| CRAI-01 | Zone-level stampede detection + kinetic damage corridor | ai.service.ts, creature-ai.ts, events.ts |
| CRAI-02 | Provoke-triggered 30% pack call in combat flow | combat.service.ts, ai.service.ts |
| CRAI-03 | Stealthed field + perception check + 2x first strike | entity.ts, ai.service.ts, combat.service.ts, EntityRenderer.ts |
| CRAI-04 | Frenzied field + 2x attack speed + 25% vulnerability | entity.ts, combat.service.ts, creature-ai.ts |
| CRAI-05 | preProcessGroupBehaviors() in AiService.runZoneTick() | ai.service.ts |
| CRAI-06 | Red tint + pulsing glow via Phaser tween | EntityRenderer.ts, events.ts |
| CRAI-07 | Clear frenzied on entity death/zone cleanup | combat.service.ts, ai.service.ts |

## RESEARCH COMPLETE
