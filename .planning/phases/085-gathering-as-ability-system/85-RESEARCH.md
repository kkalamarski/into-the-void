# Phase 85 Research: Gathering as Ability System

## Problem Statement

1. **Broken Gathering**: The mini-game system (Phase 78) has UI visibility issues that make it unusable. Rather than fix the mini-game, redesign gathering to use the ability system.

2. **Entity Collisions**: Entity collision detection on the client may have issues - player can potentially walk through minerals/plants when they should be blocked.

## Current State Analysis

### Gathering System (Broken)

**Server-side (game.gateway.ts:424-452)**:
- `gathering:start` handler exists but was simplified to skip mini-game
- Calls `handleToolUse` directly but doesn't properly broadcast results
- Socket events `gathering:challenge` and `gathering:result` are registered but not working

**Client-side (WorldScene.ts:449-454)**:
- Click on mineral/plant emits `gathering:start`
- GatheringMiniGame component removed (broken UI with Phaser containers/scrollFactor)
- No ability-based gathering exists

**Desired Flow**:
1. Player equips tool (botany/extraction)
2. Tool grants gathering ability (Harvest/Mine)
3. Player targets entity, uses ability via action bar
4. Ability has cooldown, affected by tool stats
5. Server handles gather effect, returns items/XP

### Ability System Architecture

**Ability Definitions (definitions.ts)**:
```typescript
export interface AbilityDefinition {
  id: string;
  displayName: string;
  description: string;
  category: 'offensive' | 'defensive' | 'utility';
  energyCost: number;
  cooldownMs: number;
  range: number;
  requiresTarget: boolean;
  effects: AbilityEffect[];
  iconKey: string;
  iconColor: number;
}
```

**Current Effect Types**:
- `damage` - Deal damage to target
- `heal` - Heal self
- `hot` - Heal over time
- `dot` - Damage over time
- `buff` - Stat buff

**Missing for Gathering**:
- `gather` effect type - Harvest from targeted entity
- Gathering abilities (Harvest, Mine)
- Tool stats for yield/speed bonuses

### Tool Stat System

**Current Tool Stats** (tools.ts in items package):
```typescript
stats: {
  durability: 5,
  power: 8,
  haste: 3,
}
```

**Needed Stats**:
- `yieldBonus` - % increase to gathered amount
- `gatherSpeed` - Reduces ability cooldown

### Entity Collision Issue

**Location**: WorldScene.ts:2089-2091
```typescript
// 2. Entity blocking (EBLK-02)
const entityAtTile = useEntityStore.getState().getEntityAtPosition(localX, localY, zoneId);
if (entityAtTile) return true;
```

**Investigation**:
- `isTileBlocked` converts world coords to local zone coords (localX, localY)
- Calls `getEntityAtPosition(localX, localY, zoneId)` to check for blocking entities
- entityStore `getEntityAtPosition` iterates all entities checking:
  ```typescript
  if (e.active && e.position.x === x && e.position.y === y && e.position.zoneId === zoneId)
  ```

**Potential Issues**:
1. Entity positions may be world coordinates, not local zone coordinates
2. The check may not account for creatures vs static entities differently
3. Not all entity types should block (items shouldn't, creatures might flee)

## Design Decisions

### D1: Gather Effect Type
Add `gather` effect to ability system:
```typescript
type: 'gather'
gatherType: 'harvest' | 'mine'
baseYield: number // Base amount gathered per use
```

### D2: Gathering Abilities
Two abilities granted by tools:
- **Harvest** (botany tools): category='utility', energyCost=5, cooldownMs=3000, range=1
- **Mine** (extraction tools): category='utility', energyCost=8, cooldownMs=4000, range=1

### D3: Tool Stats
Add optional stats to tool definitions:
```typescript
yieldBonus?: number; // 0.0-1.0 multiplier (0.2 = +20% yield)
gatherSpeed?: number; // 0.0-1.0 multiplier (0.25 = 25% faster cooldown)
```

### D4: AbilityService Gather Handling
When `gather` effect is processed:
1. Validate target is gatherable (mineral/plant)
2. Check tool tier requirements
3. Calculate yield: baseYield * (1 + yieldBonus)
4. Apply gather cooldown reduction from gatherSpeed
5. Call existing EntityService.handleToolUse (modified)
6. Return items to inventory, XP to player

### D5: Entity Collision Fix
- Verify entity positions use correct coordinate system
- Only blocking entities should block: minerals, plants, structures
- Creatures, items, NPCs should NOT block player movement
- Add `blocksMovement` check based on entity type

## Implementation Plan

### Plan 85-01: Gather Ability Types and Definitions
1. Add `GatherEffect` type to shared-types
2. Create Harvest ability definition
3. Create Mine ability definition
4. Update tool definitions with grantedAbilities

### Plan 85-02: AbilityService Gather Effect
1. Add gather effect handler to AbilityService
2. Integrate with EntityService for yield calculation
3. Send inventory:update and entity:update events
4. Apply tool stat modifiers

### Plan 85-03: Entity Collision Fix
1. Investigate coordinate system mismatch
2. Add entity type check (only minerals/plants/structures block)
3. Update isTileBlocked in WorldScene.ts and PathfindingController
4. Test collision detection end-to-end

## Files to Modify

**shared-types**:
- `src/game/ability.ts` - Add GatherEffect type

**game-logic**:
- `src/ability/definitions.ts` - Add Harvest/Mine abilities
- `src/ability/registry.ts` - Register new abilities

**items**:
- `src/definitions/tools.ts` - Add yieldBonus/gatherSpeed stats, grantedAbilities

**game-server**:
- `src/game/ability.service.ts` - Handle gather effect
- `src/game/game.gateway.ts` - Remove/simplify gathering:start handler

**web**:
- `src/game/scenes/WorldScene.ts` - Fix entity collision, remove gathering click handler
- `src/game/systems/PathfindingController.ts` - Fix entity collision check

## Risk Assessment

**Low Risk**:
- Adding new ability types follows established patterns
- Tool stat additions are additive
- Entity collision fix is localized

**Medium Risk**:
- Removing old gathering system may break quests that reference gathering
- Need to ensure Harvest/Mine abilities appear in action bar correctly

## Success Metrics

1. Player can harvest plants using Harvest ability from action bar
2. Player can mine minerals using Mine ability from action bar
3. Tool stats affect yield and cooldown
4. Minerals and plants block player movement
5. Items and NPCs do NOT block player movement
