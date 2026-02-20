---
phase: 56-core-ability-system
plan: "02"
subsystem: game-server/abilities
tags: [abilities, websocket, validation, combat]
dependency_graph:
  requires: [ability-types, ability-registry, item-granted-abilities]
  provides: [ability-execution, ability-validation, ability-cooldowns]
  affects: [combat-system, energy-system, socket-events]
tech_stack:
  added: [AbilityService]
  patterns: [server-authoritative-validation, cooldown-tracking, gcd-enforcement]
key_files:
  created:
    - apps/game-server/src/game/ability.service.ts
  modified:
    - packages/shared-types/src/network/events.ts
    - apps/game-server/src/game/game.module.ts
    - apps/game-server/src/game/game.gateway.ts
decisions:
  - decision: 500ms global cooldown (GCD) prevents ability spam
    rationale: Standard MMO pattern; prevents network flooding and enforces deliberate combat
  - decision: Abilities granted by equipped items (tool/suit/modules)
    rationale: Reinforces item-based progression; no skill trees needed
  - decision: Server-authoritative validation chain
    rationale: Prevents cheating; client can predict but server validates all rules
  - decision: Cooldowns tracked per-player, cleaned on disconnect
    rationale: Memory-efficient; no persistent cooldown storage needed
metrics:
  duration_seconds: 321
  tasks_completed: 3
  files_created: 1
  files_modified: 3
  commits: 3
  lines_added: 385
  completed_date: 2026-02-20
---

# Phase 56 Plan 02: Ability Execution Service Summary

Server-side ability validation and execution with WebSocket events, cooldowns, and damage application.

## What Was Built

**AbilityService (279 lines)** - Server-authoritative ability execution engine:
- `useAbility()` - Full validation chain: GCD check → ability ownership → cooldown → energy → target validation → range check → effect application
- `getPlayerAbilities()` - Resolves abilities from equipped items (tool + exosuit + modules)
- Cooldown tracking: per-ability cooldowns + 500ms global cooldown (GCD)
- Damage calculation integration with existing combat system
- Zone-wide damage event broadcasting
- Disconnect cleanup for all player cooldowns

**Socket Events** - Client/server ability communication:
- `ability:use` (client → server): `{ abilityId, targetEntityId? }`
- `ability:result` (server → client): `{ success, error?, damage?, targetHealth?, energyRemaining?, cooldownEndsAt? }`
- `ability:cooldown` (server → client): `{ abilityId, cooldownEndsAt }`

**GameGateway Integration** - WebSocket handler wiring:
- `@SubscribeMessage('ability:use')` handler with result emission
- AbilityService server reference and disconnect cleanup

## Validation Chain

1. **Global Cooldown (GCD)**: 500ms between ANY ability use (prevents spam)
2. **Ability Ownership**: Player must have ability from equipped item (tool/suit/module)
3. **Ability Cooldown**: Specific cooldown per ability (from definition)
4. **Energy Check**: Player must have sufficient energy (consumes on use)
5. **Target Validation**: If ability requires target, validate existence/type/alive status
6. **Range Check**: Use `canInteract()` from game-logic to validate distance
7. **Effect Application**: Apply damage, emit combat:damage to zone

## Technical Decisions

**GCD Implementation**: Separate map from ability cooldowns; applies to ALL abilities
**Cooldown Storage**: In-memory maps (`${playerId}:${abilityId}` keys); no DB persistence
**Energy Consumption**: Uses existing `PlayerService.updateEnergy()` method
**Damage Integration**: Reuses `calculateDamage()` and combat stat computation from combat.service
**Hub Zone Safety**: Offensive abilities disabled in hub zones (existing pattern)

## Deviations from Plan

None - plan executed exactly as written.

## Integration Points

**Depends On:**
- `AbilityRegistry` and `AbilityDefinition` from @into-the-void/game-logic (phase 56-01)
- `grantedAbilities` field on ItemDefinition from @into-the-void/items (phase 56-01)
- `updateEnergy()` method on PlayerService (already existed)
- `canInteract()` range validation from @into-the-void/game-logic (existing)
- `calculateDamage()` and `computeCharStats()` from combat system (existing)

**Provides For:**
- Phase 56-03: Client-side ability UI and prediction
- Future: Healing abilities, buff/debuff effects, DoT/HoT ticks

**Affects:**
- Energy system: abilities consume energy on use
- Combat system: abilities emit combat:damage events to zone
- Inventory system: abilities sourced from equipped items

## Files Created

### `/apps/game-server/src/game/ability.service.ts` (279 lines)
Server-authoritative ability execution service with validation chain.

**Key Methods:**
- `useAbility(socketId, abilityId, targetEntityId?)` - Main validation + execution
- `getPlayerAbilities(playerId)` - Get abilities from equipped items
- `isOnCooldown(playerId, abilityId)` - Check ability cooldown
- `isOnGcd(playerId)` - Check global cooldown
- `setCooldown(playerId, abilityId, ms)` - Set ability cooldown
- `setGcd(playerId)` - Set 500ms global cooldown
- `handleDisconnect(playerId)` - Clean up all player cooldowns

**Validation Order:**
1. Player exists and in valid zone (not hub)
2. GCD not active (500ms)
3. Player has ability from equipped items
4. Ability not on cooldown
5. Player has sufficient energy
6. Target valid (if required): exists, is creature, alive, in range
7. Energy consumed, cooldowns set
8. Effects applied (damage calculated, health updated, events emitted)

**Effect Handling:**
- Damage effects: calculate damage with player/creature stats, update target health, emit combat:damage
- Future-ready: heal, buff, debuff, DoT, HoT (effect loop structure in place)

## Files Modified

### `/packages/shared-types/src/network/events.ts`
Added ability socket event types to ClientEventType and ServerEventType unions, plus event payload interfaces.

### `/apps/game-server/src/game/game.module.ts`
Registered AbilityService in providers and exports arrays.

### `/apps/game-server/src/game/game.gateway.ts`
- Imported AbilityService
- Injected in constructor
- Called `setServer()` in afterInit()
- Added `handleDisconnect()` cleanup
- Added `@SubscribeMessage('ability:use')` handler

## Commits

1. **d042268** - `feat(56-02): add ability:use and ability:result socket events`
2. **74a7949** - `feat(56-02): create AbilityService with validation chain`
3. **7979b0c** - `feat(56-02): wire ability:use handler in GameGateway`

## Self-Check: PASSED

**Files Created:**
- FOUND: `/apps/game-server/src/game/ability.service.ts` (279 lines)

**Files Modified:**
- FOUND: `packages/shared-types/src/network/events.ts` (ability:use, ability:result events)
- FOUND: `apps/game-server/src/game/game.module.ts` (AbilityService registered)
- FOUND: `apps/game-server/src/game/game.gateway.ts` (@SubscribeMessage handler)

**Commits:**
- FOUND: d042268 (socket events)
- FOUND: 74a7949 (AbilityService)
- FOUND: 7979b0c (GameGateway handler)

**Build Verification:**
- `pnpm exec nx run-many -t build -p shared-types,game-server` - PASSED

All success criteria met. Ready for phase 56-03 (client-side ability UI).
