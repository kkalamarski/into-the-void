# Technology Stack: Active Combat Abilities

**Project:** Into the Void - Active Ability System
**Researched:** 2026-02-20

## Recommended Stack

All recommendations leverage existing stack - no new external dependencies needed.

### Core Framework (Already In Place)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| NestJS | 10.x | Backend ability execution, validation, cooldown tracking | Already used for game-server, proven Socket.IO integration |
| Socket.IO | 4.x | Real-time ability use events, server-to-client cooldown sync | Existing event infrastructure in place |
| Phaser 3 | 3.80+ | Client-side ability animations, visual feedback, UI rendering | Already rendering combat, particles, sprites |
| Zustand | 4.x | Client state for ability cooldowns, energy tracking | Existing stores for inventory, combat, stats |
| TypeScript | 5.x | Shared ability type definitions, event contracts | Type safety across client/server boundary |

### Data Layer (Already In Place)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Drizzle ORM | Latest | Persist character ability unlocks, usage stats (future) | Already used for all database operations |
| PostgreSQL | 15+ | Store character state, buff durations (if persisted) | Existing database infrastructure |
| In-memory Maps | Native | Active cooldown tracking, buff timers (server RAM) | High-performance, no persistence needed for transient state |

### Supporting Libraries (Existing)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `class-validator` | Current | Validate ability use DTOs (range, target, cost) | Request validation in game-server |
| `@into-the-void/shared-types` | Monorepo | Ability definitions, buff interfaces, event types | All ability-related type definitions |
| `@into-the-void/game-logic` | Monorepo | Ability damage calculations, buff application logic | Server-side ability resolution |
| `@into-the-void/items` | Monorepo | Item-to-ability mappings, ability metadata | Source of truth for which items grant which abilities |

## No New Dependencies Required

The active ability system builds entirely on existing infrastructure:

**Server-side:**
- NestJS services already handle combat logic
- Socket.IO already handles real-time events
- Existing services (CombatService, InventoryService, PlayerService) extend to handle abilities

**Client-side:**
- Phaser scenes already render combat effects
- Zustand stores already track combat state
- Action bar UI already exists with hotkey bindings

**Shared:**
- Type definitions already shared via `@into-the-void/shared-types`
- Game logic calculations already in `@into-the-void/game-logic`
- Item system already robust with metadata support

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Buff tracking | In-memory Map (server) | Redis for distributed buffs | Single-server architecture, no need for distributed state |
| Cooldown sync | Socket.IO events | HTTP polling | Real-time already established, polling adds latency |
| Ability definitions | JSON in item metadata | Separate ability database table | Abilities tied to items, not standalone entities |
| Visual effects | Phaser particles/sprites | Canvas 2D custom rendering | Phaser already integrated, particles performant |
| State management | Zustand stores | Redux/MobX | Zustand already used, lower boilerplate |

## Implementation Patterns

### Server-Side: Ability Execution Service

```typescript
// apps/game-server/src/game/ability.service.ts
@Injectable()
export class AbilityService {
  // In-memory cooldown tracking per player
  private cooldowns: Map<string, Map<string, number>> = new Map();

  // In-memory active buffs per player
  private activeBuffs: Map<string, Buff[]> = new Map();

  async useAbility(
    playerId: string,
    abilityId: string,
    targetId?: string
  ): Promise<AbilityResult> {
    // Validate: cooldown, energy cost, range, target
    // Execute: apply damage/buff, start cooldown, deduct energy
    // Broadcast: ability:result event to zone
  }
}
```

### Client-Side: Cooldown Visualization

```typescript
// apps/web/src/store/abilityStore.ts
interface AbilityState {
  cooldowns: Map<string, { endsAt: number; duration: number }>;
  activeBuffs: Buff[];
  useAbility: (slotIndex: number) => Promise<void>;
}

// apps/web/src/ui/ActionBar.tsx
// Render cooldown sweep using CSS mask or canvas arc
// Update every frame based on endsAt timestamp
```

### Shared Types: Ability Definition

```typescript
// packages/shared-types/src/game/ability.ts
export interface AbilityDefinition {
  id: string;
  name: string;
  description: string;
  category: 'offensive' | 'defensive' | 'utility';
  energyCost: number;
  cooldown: number; // milliseconds
  range: number; // tiles
  targetType: 'enemy' | 'self' | 'ally' | 'ground';
  effects: AbilityEffect[];
}

export interface AbilityEffect {
  type: 'damage' | 'heal' | 'buff' | 'debuff';
  value: number;
  duration?: number; // for buffs/debuffs
  stat?: keyof CharacterStats; // for stat modifiers
}
```

## Performance Considerations

### Server-Side

**Cooldown Tracking:**
- In-memory Map: O(1) lookup, no database queries
- Cleanup on player disconnect prevents memory leaks
- Expected max: 1000 concurrent players × 8 abilities = 8000 cooldown entries (negligible)

**Buff Tick System:**
- Tick every 100ms to update buff durations
- Only process players with active buffs (sparse iteration)
- Remove expired buffs immediately to keep Map small

**Ability Validation:**
- Range checks reuse existing `canInteract` function
- Energy checks against in-memory player state
- No database hits on ability use (all in RAM)

### Client-Side

**Cooldown Animation:**
- Use CSS transforms for radial sweep (GPU-accelerated)
- Update only visible action bar slots (8 max)
- RequestAnimationFrame for smooth 60fps

**Buff Icons:**
- Render as Phaser sprites or DOM elements
- Maximum 10 active buffs displayed at once
- Fade out expiring buffs (1s warning)

## Database Schema Extensions

Only needed if persisting ability usage stats for progression (deferred to post-MVP):

```sql
-- Future: track ability usage for "ability upgrade system" differentiator
CREATE TABLE ability_usage (
  character_id UUID REFERENCES characters(id),
  ability_id VARCHAR(50),
  use_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMP,
  PRIMARY KEY (character_id, ability_id)
);
```

**Not needed for MVP:** Cooldowns and buffs are transient state, not persisted.

## Installation

No new packages required. Ability system uses existing dependencies.

## Sources

- Existing codebase: `apps/game-server/src/game/combat.service.ts`, `apps/web/src/store/actionBarStore.ts`, `packages/shared-types/src/network/events.ts`
- NestJS Socket.IO documentation (real-time events): https://docs.nestjs.com/websockets/gateways
- Phaser 3 Particles documentation (visual effects): https://newdocs.phaser.io/docs/3.80.0/Phaser.GameObjects.Particles
- Zustand best practices (state management): https://docs.pmnd.rs/zustand/getting-started/introduction
- TypeScript shared types pattern (monorepo): https://turbo.build/repo/docs/handbook/sharing-code
