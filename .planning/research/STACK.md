# Stack Research: Active Combat Abilities System

**Domain:** Multiplayer 2D sci-fi survival MMO — Active combat abilities with energy costs, cooldowns, buff/debuff effects, radial cooldown UI
**Researched:** 2026-02-20
**Confidence:** HIGH

## Executive Summary

The active abilities milestone requires **zero new npm packages**. Every capability — cooldown tracking, radial cooldown visualization, buff duration management, energy cost validation, ability definitions tied to items — can be implemented using the existing stack: Phaser 3.80 (graphics API), Zustand 4.5 (state management), NestJS 10.3 (service layer), Socket.IO 4.7 (real-time events), and TypeScript 5.4 (discriminated unions).

The existing codebase already has:
- **Action bar with hotkeys** — `apps/web/src/ui/hud/ActionBar.tsx` binds keys 1-8 to item slots
- **Item effect system** — `packages/items/src/types.ts` defines `ItemEffect` discriminated union with `heal`, `stat_buff`, `energy_restore` effects
- **Energy tracking** — `Player` interface has `energy` and `maxEnergy` fields; HUD displays energy bar
- **Combat damage calculation** — `combat.service.ts` validates range, computes damage, broadcasts results
- **Real-time event broadcasting** — Socket.IO emits `combat:damage`, `player:health`, `stats:update`
- **Timer infrastructure** — Phaser `Phaser.Time.TimerEvent` for client-side durations, NestJS `@Interval()` for server-side ticks

What is genuinely new:
1. **Cooldown state tracking** — Extend `actionBarStore` (Zustand) with `Map<abilityId, { endsAt, duration }>` for cooldown expiration timestamps
2. **Radial cooldown overlay** — New Phaser `Graphics` component drawing a pie-slice mask on action bar slots
3. **Buff tracking service** — New `BuffService` in game-server using `Map<playerId, ActiveBuff[]>` with tick-based expiration (same pattern as `AiService`)
4. **Ability effect types** — Extend existing `ItemEffect` union with `deal_damage`, `apply_buff`, `energy_cost` variants
5. **Energy deduction** — Add `consumeEnergy(playerId, amount)` method to existing `PlayerService`

No external libraries. No version upgrades. Pure feature extension.

---

## Recommended Stack

### Core Technologies (Already Installed)

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| TypeScript | ^5.4.0 | Ability definitions, cooldown state types, buff state types | Discriminated unions for `ItemEffect` variants (e.g., `{ type: 'deal_damage', baseDamage: number }`). Same pattern as existing `ItemEffect` types (heal, stat_buff). Zero API changes. |
| Phaser 3 | ^3.80.0 | Radial cooldown overlay graphics, timer events for buff durations | `Phaser.GameObjects.Graphics.slice()` draws pie slices natively (perfect for radial cooldown sweeps). `Phaser.Time.TimerEvent` for client-side buff expiration reminders. Both APIs stable since Phaser 3.0. |
| Zustand | ^4.5.0 | Cooldown state management in action bar | Extend existing `actionBarStore` with cooldown map. Zustand handles time-based state efficiently — derived state from timestamps avoids re-render storms (confirmed in Zustand discussions). |
| NestJS | ^10.3.0 | `BuffService` for duration tracking, `AbilityService` for validation | Service layer mirrors `CombatService` pattern. `@Interval(100)` for 10Hz buff tick (same as `AiService` pattern). NestJS lifecycle (`OnModuleInit`, `OnModuleDestroy`) manages interval cleanup. |
| Socket.IO | ^4.7.0 | Broadcast `ability:cast`, `buff:apply`, `buff:remove` events | New events follow existing `combat:damage`, `player:health` pattern. Client receives `ability:cast` with cooldown duration, starts cooldown overlay. No protocol changes. |
| `@into-the-void/items` | workspace | Extend `ItemEffect` type with ability-specific effects | Items with `toolType: 'combat'` gain `effects: [{ type: 'deal_damage', ... }, { type: 'energy_cost', ... }]`. Same multi-effect pattern as stims (stat_buff effects). |
| `@into-the-void/game-logic` | workspace | `calculateAbilityDamage()`, `applyBuff()` pure functions | Follows existing `calculateDamage()`, `computeCharStats()` patterns. Ability damage scales with Power stat (same as melee). Buffs modify stats temporarily. |

### Supporting Libraries (Already Installed)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `immer` | ^11.1.4 | Nested state updates in `buffStore` | Already used by `statsStore` (see line 2: `immer` middleware). Use for buff state with nested arrays: `state.buffs[playerId].push(newBuff)`. Avoids immutability boilerplate. |
| `lru-cache` | ^11.2.6 | Zone-scoped buff cache (optional optimization) | If buff tracking becomes per-zone (buffs only active in player's current zone), cache `Map<zoneId, Map<playerId, Buff[]>>`. For MVP, in-memory `Map<playerId, Buff[]>` in `BuffService` is sufficient. |

### Development Tools (No Change)

| Tool | Purpose | Notes |
|------|---------|-------|
| NX | Monorepo task runner | No new packages to build. Abilities are extensions to existing `items`, `game-logic` packages. |
| Vite | Client dev server | Phaser graphics code runs in existing `WorldScene`. No build config changes. |

---

## Installation

**No installation commands required.** All dependencies already in `package.json`.

For reference (DO NOT RUN — already installed):
```bash
# Already installed
pnpm add phaser@3.80.0           # Graphics API for cooldown overlay
pnpm add zustand@4.5.0           # State management for cooldowns
pnpm add @nestjs/common@10.3.0   # Service layer for buffs
pnpm add socket.io@4.7.0         # Real-time events
pnpm add immer@11.1.4            # Nested state updates
```

---

## Alternatives Considered

| Recommended | Alternative | Why Not Alternative |
|-------------|-------------|---------------------|
| Phaser `Graphics.slice()` for cooldown overlay | CSS `conic-gradient()` for radial wipe on React action bar | Cooldowns update every frame (60fps). React re-renders are expensive. Phaser graphics run in game loop, zero React dependency. CSS animations can't sync precisely with server-sent cooldown duration. |
| Zustand `Map<abilityId, Cooldown>` | Separate `useCooldownStore` hook | Action bar already uses `actionBarStore`. Adding cooldown state to same store maintains single source of truth. Separate store creates synchronization risk (what if item removed from slot while cooling down?). |
| NestJS `@Interval(100)` for buff tick | Client-side buff expiration with setTimeout | Buffs affect server-side stat calculations (damage, defense). Server must track buff state for validation. Client timers are informational only (UI countdown). Server tick is source of truth. |
| Extend `ItemEffect` union | New `AbilityDefinition` type separate from items | Abilities are granted by items (tools, modules). A combat tool's `effects` array defines its ability. Separating ability definitions from items duplicates data (every ability needs an associated item anyway). |
| `Map<playerId, Buff[]>` in `BuffService` | Database table for active buffs | Buffs are ephemeral combat state (duration 5-60 seconds). They do not survive logout or server restart. Persisting to PostgreSQL creates write amplification (10 buffs/sec across 100 players = 1000 writes/sec for temporary data). In-memory state is correct. |
| Pure TypeScript cooldown math | External cooldown library (e.g., `cooldown-manager`) | Cooldown logic is `remainingMs = Math.max(0, endsAt - Date.now())`. No library adds value for 1 line of math. External libs bring 5KB+ bundle for a subtraction operation. |

---

## What NOT to Add

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Animation libraries (Framer Motion, GSAP, React Spring) | Phaser tween system (`scene.tweens.add()`) already handles all animation needs: damage number floats, cooldown sweep animations, buff icon pulses. React components in HUD are static (no complex transitions). Adding React animation lib creates dual animation systems. | Phaser `scene.tweens.add()` for game canvas animations; plain CSS transitions for HUD (e.g., button press feedback) |
| State management libraries (Redux, Jotai, Valtio) | Zustand 4.5 handles all state needs. Cooldowns are simple key-value pairs (`Map<string, Cooldown>`), not complex normalized data. Adding Redux for one Map introduces 20KB bundle + boilerplate (actions, reducers, selectors). | Extend existing Zustand stores (`actionBarStore`, `gameStore`) |
| Timer libraries (use-interval, react-use-timer) | Phaser `Phaser.Time.TimerEvent` provides game-loop-synchronized timers. Server uses native `setInterval` wrapped in `@Interval()`. External timer lib risks frame drift (e.g., `setTimeout` drifts under load; Phaser timers sync to `requestAnimationFrame`). | Phaser `this.time.addEvent()` for client timers; NestJS `@Interval()` for server ticks |
| Validation libraries (Zod, Yup) beyond existing class-validator | `class-validator` already validates DTO inputs (e.g., `CreateCharacterDto`). Ability validation is runtime business logic ("does player have enough energy?"), not schema validation. Zod adds 50KB for type-checking already covered by TypeScript at compile time. | TypeScript types + runtime checks in service methods |
| WebGL shader libraries for cooldown effect | Phaser `Graphics.slice()` is hardware-accelerated Canvas2D. Radial wipe is a 5-line draw call. Custom shaders add complexity (GLSL code, fallback paths, mobile compatibility) for zero visual improvement. | Phaser `Graphics` with `slice()` method |
| Behavior tree library (e.g., `behaviortree.js`) for ability AI | Abilities are player-activated, not AI-driven. No decision tree needed. Cooldown check is `if (remainingMs === 0)`, not complex preconditions. | Plain TypeScript conditionals in ability validation |

---

## Implementation Patterns

### 1. Cooldown State (Client)

**Technology:** Zustand (extend `actionBarStore`)

```typescript
// apps/web/src/store/actionBarStore.ts (EXTEND)
interface ActionBarState {
  slots: (string | null)[];

  // NEW: cooldown tracking
  cooldowns: Map<string, CooldownState>;

  setCooldown(abilityId: string, durationMs: number): void;
  getCooldownProgress(abilityId: string): number; // 0.0 to 1.0
  clearCooldown(abilityId: string): void;
}

interface CooldownState {
  startedAt: number;   // Date.now() when cooldown started
  durationMs: number;  // total cooldown duration
}

// Derived state (avoids re-renders)
const getCooldownProgress = (abilityId: string): number => {
  const cd = store.cooldowns.get(abilityId);
  if (!cd) return 1.0; // fully ready

  const elapsed = Date.now() - cd.startedAt;
  return Math.min(1.0, elapsed / cd.durationMs);
};
```

**Rationale:** Action bar already uses `actionBarStore`. Adding cooldown map to same store prevents state fragmentation. Timestamp-based calculation (not interval-based counters) avoids re-render storms when multiple cooldowns tick simultaneously.

**Reference:** [Zustand time-based state discussion](https://github.com/pmndrs/zustand/discussions/2150) — recommends derived state from timestamps for performance.

### 2. Radial Cooldown Overlay (Client)

**Technology:** Phaser `Graphics.slice()`

```typescript
// apps/web/src/game/ui/CooldownOverlay.ts (NEW)
export class CooldownOverlay extends Phaser.GameObjects.Graphics {
  constructor(scene: Phaser.Scene, x: number, y: number, radius: number) {
    super(scene);
    this.setPosition(x, y);
  }

  updateCooldown(progress: number) {
    this.clear();

    if (progress >= 1.0) return; // fully ready, no overlay

    // Draw pie slice from top (270°) clockwise to current progress
    const startAngle = Phaser.Math.DegToRad(270); // top
    const endAngle = startAngle + (progress * Math.PI * 2);

    this.fillStyle(0x000000, 0.6); // semi-transparent black
    this.slice(0, 0, radius, startAngle, endAngle, false);
    this.fillPath();
  }
}
```

**Integration:** Action bar scene creates one `CooldownOverlay` per slot. On frame update, calls `overlay.updateCooldown(actionBarStore.getCooldownProgress(abilityId))`.

**Rationale:** Phaser `Graphics.slice()` draws pie slices natively. No external library needed. Similar to health bar rendering pattern in existing `HealthBarRenderer`.

**Reference:** [Phaser pie timer example](https://gist.github.com/chewax/08b155da67e0cc497e15) demonstrates slice-based cooldown UI.

### 3. Buff Tracking (Server)

**Technology:** NestJS service with `@Interval(100)` tick

```typescript
// apps/game-server/src/game/buff.service.ts (NEW)
@Injectable()
export class BuffService implements OnModuleInit, OnModuleDestroy {
  private activeBuffs: Map<string, ActiveBuff[]> = new Map();
  private tickInterval: NodeJS.Timeout;

  onModuleInit() {
    this.tickInterval = setInterval(() => this.tickBuffs(), 100); // 10Hz
  }

  onModuleDestroy() {
    clearInterval(this.tickInterval);
  }

  applyBuff(playerId: string, buff: Buff) {
    const buffs = this.activeBuffs.get(playerId) ?? [];
    buffs.push({ ...buff, appliedAt: Date.now(), expiresAt: Date.now() + buff.durationMs });
    this.activeBuffs.set(playerId, buffs);

    // Broadcast to client
    this.server.to(playerSocketId).emit('buff:apply', { buffId: buff.id, duration: buff.durationMs });
  }

  private tickBuffs() {
    const now = Date.now();
    for (const [playerId, buffs] of this.activeBuffs) {
      const stillActive = buffs.filter(b => b.expiresAt > now);

      // Emit buff:remove for expired buffs
      const expired = buffs.filter(b => b.expiresAt <= now);
      for (const buff of expired) {
        this.server.to(playerSocketId).emit('buff:remove', { buffId: buff.id });
      }

      if (stillActive.length > 0) {
        this.activeBuffs.set(playerId, stillActive);
      } else {
        this.activeBuffs.delete(playerId);
      }
    }
  }

  getActiveBuffs(playerId: string): ActiveBuff[] {
    return this.activeBuffs.get(playerId) ?? [];
  }
}
```

**Rationale:** Mirrors `AiService` pattern (`ai.service.ts` uses `@Interval(1000)` for creature AI). Buffs expire on server tick, broadcast to client. No database persistence (buffs are ephemeral combat state).

**Reference:** [NestJS task scheduling docs](https://docs.nestjs.com/techniques/task-scheduling) — `@Interval()` for periodic tasks.

### 4. Energy Cost Validation (Server)

**Technology:** Extend `PlayerService`

```typescript
// apps/game-server/src/game/player.service.ts (EXTEND)
export class PlayerService {
  // NEW: energy management
  consumeEnergy(playerId: string, amount: number): boolean {
    const player = this.getPlayerById(playerId);
    if (!player || player.energy < amount) return false;

    player.energy -= amount;

    // Broadcast energy update to client
    const socketId = this.getSocketByPlayerId(playerId);
    this.server.to(socketId).emit('player:energy', {
      playerId,
      energy: player.energy,
      maxEnergy: player.maxEnergy,
    });

    return true;
  }

  // Energy regeneration already handled by existing player:regen event
}
```

**Rationale:** `PlayerService` already manages `health`, `position`, `inCombat` state. Energy field exists in `Player` interface (`maxEnergy`, `energy`). Adding `consumeEnergy()` follows `updateHealth()` pattern (lines 500-502 in `combat.service.ts`).

### 5. Ability Definitions (Shared)

**Technology:** Extend `ItemEffect` discriminated union

```typescript
// packages/items/src/types.ts (EXTEND)
export type ItemEffect =
  // Existing effects
  | { readonly type: 'heal'; readonly amount: number }
  | { readonly type: 'energy_restore'; readonly amount: number }
  | { readonly type: 'stat_buff'; readonly stat: string; readonly amount: number; readonly duration: number }

  // NEW: ability-specific effects
  | { readonly type: 'deal_damage'; readonly baseDamage: number; readonly scaling: 'power' | 'haste' }
  | { readonly type: 'apply_buff'; readonly buffId: string; readonly durationMs: number }
  | { readonly type: 'energy_cost'; readonly amount: number }
  | { readonly type: 'cooldown'; readonly durationMs: number };
```

**Example ability item:**
```typescript
export const PULSE_RIFLE: ItemDefinition = {
  id: 'pulse_rifle_combat',
  displayName: 'Pulse Rifle',
  category: 'tool',
  toolType: 'combat',
  rarity: 'rare',
  effects: [
    { trigger: 'on_use', effect: { type: 'energy_cost', amount: 20 } },
    { trigger: 'on_use', effect: { type: 'deal_damage', baseDamage: 50, scaling: 'power' } },
    { trigger: 'on_use', effect: { type: 'cooldown', durationMs: 3000 } },
  ],
  // ... other fields
};
```

**Rationale:** `ItemEffect` already uses discriminated unions (lines 34-45 in `types.ts`). Adding ability effects maintains type safety. Items can have multiple effects (energy_cost + deal_damage + cooldown), same as stims (stat_buff effects in `consumables.ts`).

---

## Ability Cast Flow (Client → Server → Client)

**Client (Action Bar):**
1. User presses hotkey (1-8) → `ActionBar.tsx` `handleKeyDown`
2. Get `instanceId` from slot → lookup item in inventory
3. Check cooldown: `actionBarStore.getCooldownProgress(instanceId) === 1.0` (fully ready)
4. Check energy: `gameStore.player.energy >= getEnergyCost(item)`
5. Emit: `gameSocket.emit('ability:use', { instanceId, targetId? })`
6. **Optimistic cooldown:** `actionBarStore.setCooldown(instanceId, cooldownDuration)` — start overlay immediately

**Server (GameGateway → AbilityService):**
7. Receive `'ability:use'` event in `GameGateway`
8. Validate: item exists, equipped in tool slot, player has energy
9. Validate: ability not on cooldown (server-side cooldown map)
10. Deduct energy: `playerService.consumeEnergy(playerId, energyCost)`
11. Execute ability: calculate damage (if `deal_damage` effect), apply buffs (if `apply_buff` effect)
12. Record cooldown: `cooldownService.setCooldown(playerId, abilityId, durationMs)`
13. Broadcast damage: `server.to(zoneId).emit('combat:damage', { ... })` if damage dealt
14. Broadcast buff: `server.to(playerId).emit('buff:apply', { ... })` if buff applied
15. Broadcast cooldown: `server.to(playerId).emit('ability:cast', { abilityId, cooldownMs })` (authoritative cooldown)

**Client (Result Handlers):**
16. Receive `'ability:cast'` → reconcile cooldown if server duration differs from optimistic prediction
17. Receive `'combat:damage'` → show damage number (existing `WorldScene.showDamageNumber()`)
18. Receive `'buff:apply'` → add buff icon to HUD buff bar (new UI component)

**Cooldown Reconciliation:**
If server cooldown differs (e.g., player equipped Haste buff between client prediction and server response):
```typescript
gameSocket.on('ability:cast', (data) => {
  const predicted = actionBarStore.cooldowns.get(data.abilityId);
  const serverDuration = data.cooldownMs;

  if (predicted && Math.abs(predicted.durationMs - serverDuration) > 100) {
    // Server authority: replace optimistic cooldown with server cooldown
    actionBarStore.setCooldown(data.abilityId, serverDuration);
  }
});
```

**Precedent:** Movement system uses same optimistic prediction + server reconciliation pattern (`MovementController.reconcile()` in `PathfindingController.ts`).

---

## Data Flow Architecture

```
┌─────────────────┐
│  Action Bar UI  │  User presses hotkey (1-8)
└────────┬────────┘
         ↓
┌─────────────────┐
│ ActionBarStore  │  Check: cooldown ready? energy sufficient?
└────────┬────────┘
         ↓ Valid
┌─────────────────┐
│ Socket.IO Client│  emit 'ability:use' { instanceId, targetId }
└────────┬────────┘
         ↓
┌─────────────────┐
│   GameGateway   │  Validate request (item exists, energy check)
└────────┬────────┘
         ↓
┌─────────────────┐
│ AbilityService  │  Execute ability (damage calc, buff application)
└────────┬────────┘
         ↓
┌─────────────────┐
│  PlayerService  │  consumeEnergy(playerId, cost)
│   BuffService   │  applyBuff(playerId, buff) if applicable
└────────┬────────┘
         ↓
┌─────────────────┐
│ Socket.IO Server│  Broadcast 'combat:damage', 'buff:apply', 'ability:cast'
└────────┬────────┘
         ↓
┌─────────────────┐
│ CombatStore     │  Update damage numbers
│ BuffStore       │  Track active buffs (client-side UI)
│ ActionBarStore  │  Reconcile cooldown with server authority
└────────┬────────┘
         ↓
┌─────────────────┐
│ Phaser Scene    │  Render: damage floats, buff icons, cooldown overlay
└─────────────────┘
```

---

## Version Compatibility

All patterns use existing stable APIs:

| Package | Version | API Used | Stable Since |
|---------|---------|----------|--------------|
| Phaser | 3.80.0 | `Graphics.slice()` | 3.0.0 (2018) |
| Zustand | 4.5.0 | `Map` support in state | 4.0.0 (2022) |
| NestJS | 10.3.0 | `@Interval()` decorator | 6.0.0 (2019) |
| Socket.IO | 4.7.0 | `server.to(room).emit()` | 2.0.0 (2016) |
| TypeScript | 5.4.0 | Discriminated unions | 2.0.0 (2016) |

**No breaking changes. No version upgrades required.**

---

## Integration Points

### New Files

| File | Package/App | What It Adds |
|------|-------------|--------------|
| `src/game/ui/CooldownOverlay.ts` | `apps/web` | Phaser Graphics component for radial cooldown sweep |
| `src/game/buff.service.ts` | `apps/game-server` | Buff duration tracking with 10Hz tick |
| `src/game/ability.service.ts` | `apps/game-server` | Ability validation and execution |
| `src/game/cooldown.service.ts` | `apps/game-server` | Server-side cooldown tracking (anti-cheat) |
| `src/store/buffStore.ts` | `apps/web` | Client-side buff state for HUD display |
| `src/ui/BuffBar.tsx` | `apps/web` | Buff icon display component |
| `src/abilities/calculate-ability-damage.ts` | `packages/game-logic` | Ability damage calculation (similar to `calculateDamage`) |
| `src/abilities/apply-buff.ts` | `packages/game-logic` | Buff application logic (stat modifiers) |

### Modified Files

| File | Change |
|------|--------|
| `apps/web/src/store/actionBarStore.ts` | Add `cooldowns: Map<string, CooldownState>` and cooldown methods |
| `apps/web/src/ui/hud/ActionBar.tsx` | Add cooldown check before emitting `ability:use` |
| `apps/game-server/src/game/player.service.ts` | Add `consumeEnergy()` method |
| `apps/game-server/src/game/game.module.ts` | Register `BuffService`, `AbilityService`, `CooldownService` |
| `packages/items/src/types.ts` | Extend `ItemEffect` union with `deal_damage`, `apply_buff`, `energy_cost`, `cooldown` |
| `packages/shared-types/src/network/events.ts` | Add `ability:use`, `ability:cast`, `buff:apply`, `buff:remove`, `player:energy` events |
| `packages/game-logic/src/stats/char-stats.ts` | Add buff stat modifier application in `computeCharStats()` |

---

## Sources

### Cooldown Visuals (HIGH Confidence)
- [Phaser 3 radial button cooldown discussion](https://phaser.discourse.group/t/how-to-create-a-radial-button-cooldown-effect/2280) — Community consensus on `Graphics.slice()` for radial cooldowns
- [Pie Timer Phaser example](https://gist.github.com/chewax/08b155da67e0cc497e15) — Working code for pie-slice cooldown
- [Phaser Timer Events](https://phaser.io/examples/v3/view/time/timer-event) — Official docs for `Phaser.Time.TimerEvent`

### State Management (HIGH Confidence)
- [Zustand time-based state discussion](https://github.com/pmndrs/zustand/discussions/2150) — Performance pattern for timestamp-based cooldowns
- [Zustand official repository](https://github.com/pmndrs/zustand) — v4.5.0 stable API
- [React state management 2026](https://www.syncfusion.com/blogs/post/react-state-management-libraries) — Zustand usage trends

### Server Architecture (MEDIUM Confidence)
- [NestJS WebSocket 2026 guide](https://oneuptime.com/blog/post/2026-02-02-nestjs-websockets/view) — Best practices for Socket.IO in NestJS
- [NestJS WebSocket gateways](https://docs.nestjs.com/websockets/gateways) — Official docs
- [NestJS task scheduling](https://docs.nestjs.com/techniques/task-scheduling) — `@Interval()` decorator usage

### Game Design Patterns (MEDIUM Confidence)
- [Gameplay Ability System documentation](https://github.com/tranek/GASDocumentation) — Unreal Engine GAS architecture reference (cooldown best practices)
- [Cooldown tracking adjustments](https://www.thegames.dev/?p=131) — Dynamic cooldown implementation patterns
- [WoW Cooldown Manager](https://blizzardwatch.com/2026/01/16/wow-cooldown-manager-how-to-use/) — Player-facing cooldown UI design

### CSS Radial Wipe (LOW Confidence — Background Research Only)
- [CSS mask animations](https://expensive.toys/blog/fancy-css-reveal-effects) — Radial wipe with CSS (not used — Phaser preferred)
- [Smashing Magazine CSS masks](https://www.smashingmagazine.com/2023/09/revealing-images-css-mask-animations/) — Educational reference

---

*Stack research for: Active Combat Abilities System — Into the Void*
*Researched: 2026-02-20*
*Confidence: HIGH — All existing capabilities verified via codebase audit. Zero new npm packages required. All integration points traced to specific source files.*
