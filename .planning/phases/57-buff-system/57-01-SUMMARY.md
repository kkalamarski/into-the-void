---
phase: 57-buff-system
plan: "01"
subsystem: abilities
tags: [server-infrastructure, socket-events, buff-system, state-management]
dependency_graph:
  requires: [ability-system, websocket-events]
  provides: [buff-state, buff-lifecycle-events]
  affects: [ability-effects, player-stats]
tech_stack:
  added: [buff-expiration-tick]
  patterns: [refresh-strategy, max-capacity-eviction]
key_files:
  created:
    - packages/shared-types/src/game/buff.ts
  modified:
    - packages/shared-types/src/index.ts
    - packages/shared-types/src/network/events.ts
    - apps/game-server/src/game/ability.service.ts
decisions:
  - title: "Buff refresh strategy"
    choice: "Same abilityId+stat refreshes duration instead of stacking"
    rationale: "Prevents buff spam, simplifies buff management, matches common game mechanics"
  - title: "Max buffs per player"
    choice: "15 buff limit with oldest-removed eviction"
    rationale: "Prevents unbounded memory growth, encourages strategic buff usage"
  - title: "Tick interval"
    choice: "500ms for buff expiration checks"
    rationale: "Balances responsiveness with server performance"
metrics:
  duration: 180s
  tasks_completed: 3
  files_modified: 4
  commits: 3
  completed: 2026-02-20
---

# Phase 57 Plan 01: Server-Side Buff State Management

Server-side buff state management with socket event definitions for buff apply/expire synchronization.

## One-liner

Established buff state infrastructure with Map-based storage, 500ms tick-based expiration, refresh strategy for same abilityId+stat buffs, and socket events for client synchronization.

## What Changed

### Task 1: Create Buff type in shared-types

**Commit:** d949919

Created `packages/shared-types/src/game/buff.ts` with the Buff interface containing:
- `id: string` - Unique instance ID
- `abilityId: string` - Source ability
- `stat: string` - CharacterStats key to modify
- `amount: number` - Amount to add (positive/negative)
- `expiresAt: number` - Expiration timestamp
- `displayName: string` - UI display name
- `iconColor: number` - Hex color for icon background

Exported Buff type from `packages/shared-types/src/index.ts`.

**Files modified:**
- `packages/shared-types/src/game/buff.ts` (created)
- `packages/shared-types/src/index.ts`

### Task 2: Add buff socket events to shared-types

**Commit:** 2fc8bba

Added buff lifecycle events to `packages/shared-types/src/network/events.ts`:

1. Added to `ServerEventType` union:
   - `'buff:apply'`
   - `'buff:expire'`

2. Added to `ServerEvents` interface:
   - `buff:apply` with `buffId`, `displayName`, `stat`, `amount`, `expiresAt`, `iconColor`
   - `buff:expire` with `buffId`

**Files modified:**
- `packages/shared-types/src/network/events.ts`

### Task 3: Add buff state management to AbilityService

**Commit:** c038cf7

Extended `apps/game-server/src/game/ability.service.ts` with comprehensive buff management:

**State storage:**
- `activeBuffs: Map<string, Buff[]>` - Buffs indexed by playerId
- `buffTickInterval: NodeJS.Timeout` - Tick loop handle

**Core methods:**
- `getActiveBuffs(playerId)` - Retrieve all active buffs
- `applyBuff(playerId, buff)` - Apply buff with refresh strategy
- `removeBuff(playerId, buffId)` - Remove specific buff
- `clearBuffs(playerId)` - Remove all buffs (disconnect/death)

**Lifecycle management:**
- `startBuffTick()` - Start 500ms expiration tick loop
- `stopBuffTick()` - Stop tick loop
- `tickBuffExpiration()` - Check and remove expired buffs
- `emitBuffExpire(playerId, buffId)` - Emit buff:expire to zone

**Integration:**
- Updated `setServer()` to call `startBuffTick()`
- Updated `handleDisconnect()` to call `clearBuffs()`

**Refresh strategy:**
If a buff with the same `abilityId + stat` exists, refresh its `expiresAt` instead of adding duplicate.

**Capacity management:**
Max 15 buffs per player. If exceeded, oldest buff is removed and `buff:expire` is emitted.

**Files modified:**
- `apps/game-server/src/game/ability.service.ts`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed getPlayer method name**
- **Found during:** Task 3 implementation
- **Issue:** Plan referenced `playerService.getPlayer()` but actual method is `getPlayerById()`
- **Fix:** Changed both `applyBuff()` and `emitBuffExpire()` to use `getPlayerById()`
- **Files modified:** `apps/game-server/src/game/ability.service.ts`
- **Commit:** c038cf7 (included in Task 3 commit)

## Verification Results

All verification steps passed:

1. **Build verification:**
   - `pnpm exec nx run shared-types:build` - SUCCESS
   - `pnpm exec nx run game-server:build` - SUCCESS
   - `pnpm exec nx run-many -t build -p shared-types,game-server` - SUCCESS

2. **Buff type export verified:**
   ```
   packages/shared-types/src/game/buff.ts:5:export interface Buff {
   ```

3. **Socket events verified:**
   ```
   packages/shared-types/src/network/events.ts:75:  | 'buff:apply'
   packages/shared-types/src/network/events.ts:76:  | 'buff:expire'
   packages/shared-types/src/network/events.ts:214:  'buff:apply': {
   packages/shared-types/src/network/events.ts:222:  'buff:expire': {
   ```

4. **AbilityService buff management verified:**
   - `activeBuffs` map present
   - `applyBuff()`, `removeBuff()`, `tickBuffExpiration()` methods present
   - Buff lifecycle integration complete

## Success Criteria Met

- [x] Buff interface exists with all required fields (id, abilityId, stat, amount, expiresAt, displayName, iconColor)
- [x] Buff type exported from @into-the-void/shared-types
- [x] buff:apply and buff:expire events defined in ServerEvents
- [x] AbilityService stores activeBuffs Map per player
- [x] applyBuff() method applies buff and emits buff:apply
- [x] Buff refresh strategy: same abilityId+stat refreshes duration instead of stacking
- [x] Max 15 buffs per player (oldest removed if exceeded)
- [x] Tick loop (500ms) checks for expired buffs
- [x] Expired buffs removed and buff:expire emitted
- [x] handleDisconnect() clears all player buffs
- [x] All builds pass

## Technical Notes

**Refresh strategy rationale:**
The refresh-on-reapply strategy prevents buff spam and simplifies UI (single buff entry updates instead of duplicate entries). This matches common game mechanics where buffs extend rather than stack.

**Max capacity rationale:**
15 buffs per player is generous for normal gameplay while preventing unbounded memory growth. FIFO eviction (oldest removed) ensures buffs naturally expire if player accumulates too many.

**Tick interval rationale:**
500ms strikes a balance between responsiveness (buffs expire within half a second of expiration time) and server performance (not checking every tick/frame).

**Socket event design:**
`buff:apply` emits to player's zone (not just player) so other clients can see buffs on players. This enables future features like buff icons over player heads.

## Self-Check: PASSED

Created files exist:
```
FOUND: packages/shared-types/src/game/buff.ts
```

Commits exist:
```
FOUND: d949919
FOUND: 2fc8bba
FOUND: c038cf7
```

Modified files verified:
```
FOUND: packages/shared-types/src/index.ts
FOUND: packages/shared-types/src/network/events.ts
FOUND: apps/game-server/src/game/ability.service.ts
```

## Next Steps

Plan 57-02: Apply buff effects to character stats in computeCharStats
