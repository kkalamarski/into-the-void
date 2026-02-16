# Phase 13: Tile Definition Architecture - Research

**Researched:** 2026-02-16
**Domain:** TypeScript tile registry system with elevation metadata and hook extensibility
**Confidence:** HIGH

## Summary

Phase 13 establishes a scalable tile definition system to replace the current hardcoded TileId enum with a flexible registry pattern. The existing codebase uses 16 tile types (enum values 0-15) scattered across world-gen generation and client rendering. This phase introduces a dedicated `@into-the-void/tiles` package with TileDefinition interface, string-based tile IDs, registry lookups, and a hook system for future gameplay mechanics. ChunkData will be extended with `heights[][]` (elevation data) and `structures[]` (wall segments) to support the upcoming elevation rendering work.

The architecture follows the existing project patterns: NX monorepo package structure, static TypeScript registries (like EntityRegistry), and separation of data generation (server) from rendering (client). This is NOT a new project—it's integrating new capabilities into an established system with minimal disruption.

**Primary recommendation:** Use TypeScript const assertion pattern for type-safe tile definitions with string IDs, Map-based registry for O(1) lookups with graceful fallback, and synchronous hook effects pattern that returns change descriptors rather than mutating directly.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Tile Definition Schema:**
- Elevation range: 0-5 levels (simple integer heights)
- Include texture hint field (textureKey) — renderer decides final visuals, can fall back to procedural colors
- Single definition per tile type — visual variants handled by renderer using position-seeded selection (hash(x,y) % variants.length for consistency)

**Registry Pattern:**
- String IDs for tile identification ('grass', 'metal_floor') — readable and extensible
- New dedicated tiles package (@into-the-void/tiles) — separate from shared-types and game-logic
- Static registration only — all tiles defined at build time
- Unknown tile IDs return fallback 'unknown' tile with warning (not throw)

**Height Data Format:**
- heights[][] structure: Claude's discretion based on existing ChunkData patterns
- Whole tile height only — each tile has one height level (no corner heights or smooth slopes)
- Height data transmitted inline with ChunkData on chunk load
- Raw heights only — pathfinding calculates walkability on demand (no pre-computed flags)

**Hook System Design:**
- Phase 13 implements interface + onStep hook working (triggers when player steps on tile)
- Minimal context: hook receives player entity and tile position only
- Sync only — hooks must return immediately, no async/await
- Return effects pattern — hooks return what should happen, caller applies changes

### Claude's Discretion

- Exact TileDefinition interface field names
- Whether heights use flat array or 2D array (choose based on existing patterns)
- Internal registry data structure (Map, object, etc.)
- Hook effect type design

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope

</user_constraints>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | 5.4+ | Type system foundation | Already project dependency; const assertions require 3.4+ |
| NX | 20.0.0 | Monorepo package management | Project uses NX for all package organization |
| pnpm workspaces | 9.0.0 | Dependency resolution | Project package manager; handles `workspace:*` references |

### Supporting

No external libraries needed. This phase uses only TypeScript language features and existing project infrastructure.

### Pattern Libraries (Reference Only)

These are NOT dependencies, but patterns to reference:

| Pattern Source | Relevance | When to Reference |
|----------------|-----------|-------------------|
| Game Programming Patterns (Event Queue) | Hook system design | Implementing effect return pattern |
| TypeScript Handbook (Discriminated Unions) | Hook effect types | Designing TileEffect union type |
| MDN Tilemaps Guide | Data structure patterns | Understanding heights[][] layout |

**Installation:**

No new dependencies. Package creation uses existing NX generators:

```bash
# Create new package (manual - NX will detect it)
mkdir -p packages/tiles/src
# Add package.json, project.json, tsconfig.json following existing patterns
```

## Architecture Patterns

### Recommended Project Structure

Based on existing package patterns (shared-types, world-gen, game-logic):

```
packages/tiles/
├── src/
│   ├── index.ts                 # Public exports
│   ├── definitions/
│   │   ├── void-tiles.ts        # Void Plains biome tiles
│   │   ├── crystal-tiles.ts     # Crystal Caves biome tiles
│   │   ├── toxic-tiles.ts       # Toxic Wastes biome tiles
│   │   └── ...                  # Other biomes
│   ├── registry/
│   │   ├── TileRegistry.ts      # Main registry class
│   │   └── types.ts             # TileDefinition interface
│   └── hooks/
│       ├── types.ts             # Hook function signatures
│       └── effects.ts           # TileEffect union types
├── package.json                 # Package metadata
├── project.json                 # NX build config
└── tsconfig.lib.json            # TypeScript config
```

### Pattern 1: Type-Safe String ID Registry with Const Assertion

**What:** Use TypeScript const assertion to create compile-time type-safe tile IDs while maintaining string flexibility at runtime.

**When to use:** When you need extensible string IDs with autocomplete and type checking.

**Why this works:**
- String IDs enable future mod support and dynamic content
- Const assertion provides compile-time type narrowing without runtime overhead
- Fallback pattern allows graceful degradation for unknown IDs

**Implementation:**

```typescript
// packages/tiles/src/registry/types.ts
export interface TileDefinition {
  readonly id: string;
  readonly displayName: string;
  readonly isBlocking: boolean;
  readonly movementSpeed: number;      // Multiplier: 1.0 normal, 0.5 slow, 0 impassable
  readonly textureKey: string;
  readonly defaultElevation: number;   // 0-5 range
  readonly hooks?: TileHooks;
}

export interface TileHooks {
  onStep?: (context: TileHookContext) => TileEffect | null;
  // Future: onClick, onEnter, onExit, onTick
}

export interface TileHookContext {
  readonly entity: Entity;
  readonly position: { x: number; y: number };
}

// Effect union - hooks return these, caller applies
export type TileEffect =
  | { type: 'damage'; amount: number }
  | { type: 'slow'; duration: number; multiplier: number }
  | { type: 'heal'; amount: number };
```

**Registry with const assertion:**

```typescript
// packages/tiles/src/definitions/void-tiles.ts
import { TileDefinition } from '../registry/types';

export const VOID_FLOOR = {
  id: 'void_floor',
  displayName: 'Void Floor',
  isBlocking: false,
  movementSpeed: 1.0,
  textureKey: 'tile_void_floor',
  defaultElevation: 0,
} as const satisfies TileDefinition;

export const VOID_WALL = {
  id: 'void_wall',
  displayName: 'Void Wall',
  isBlocking: true,
  movementSpeed: 0,
  textureKey: 'tile_void_wall',
  defaultElevation: 2,
} as const satisfies TileDefinition;

// packages/tiles/src/registry/TileRegistry.ts
import { TileDefinition } from './types';
import { VOID_FLOOR, VOID_WALL } from '../definitions/void-tiles';
import { CRYSTAL_FLOOR, CRYSTAL_FORMATION } from '../definitions/crystal-tiles';
// ... other imports

const ALL_TILES = [
  VOID_FLOOR,
  VOID_WALL,
  CRYSTAL_FLOOR,
  CRYSTAL_FORMATION,
  // ... all 16 tiles
] as const;

// Fallback tile for unknown IDs
const UNKNOWN_TILE: TileDefinition = {
  id: 'unknown',
  displayName: 'Unknown Tile',
  isBlocking: false,
  movementSpeed: 1.0,
  textureKey: 'tile_void_floor',  // Fallback to basic floor
  defaultElevation: 0,
};

class TileRegistryImpl {
  private readonly tileMap: Map<string, TileDefinition>;

  constructor(tiles: readonly TileDefinition[]) {
    this.tileMap = new Map(tiles.map(t => [t.id, t]));
  }

  /**
   * Get tile definition by ID
   * Returns fallback 'unknown' tile with console warning if not found
   */
  get(id: string): TileDefinition {
    const tile = this.tileMap.get(id);
    if (!tile) {
      console.warn(`Unknown tile ID: "${id}", using fallback`);
      return UNKNOWN_TILE;
    }
    return tile;
  }

  /**
   * Check if tile ID exists without triggering fallback
   */
  has(id: string): boolean {
    return this.tileMap.has(id);
  }

  /**
   * Get all registered tile IDs
   */
  getAllIds(): string[] {
    return Array.from(this.tileMap.keys());
  }

  /**
   * Get all blocking tiles
   */
  getBlocking(): TileDefinition[] {
    return Array.from(this.tileMap.values()).filter(t => t.isBlocking);
  }
}

// Singleton export
export const TileRegistry = new TileRegistryImpl(ALL_TILES);
```

**Sources:**
- [A complete guide to const assertions in TypeScript - LogRocket](https://blog.logrocket.com/complete-guide-const-assertions-typescript/)
- [How to Create Const Assertions in TypeScript - OneUpTime](https://oneuptime.com/blog/post/2026-01-30-typescript-const-assertions/view)
- [Scaling 1M lines of TypeScript: Registries - Slash Engineering](https://puzzles.slash.com/blog/scaling-1m-lines-of-typescript-registries)

### Pattern 2: ChunkData Extension with Parallel Arrays

**What:** Extend ChunkData interface to include heights[][] as parallel 2D array to tiles[][], following existing collisions[][] pattern.

**When to use:** When new data dimensions need to be synchronized with existing grid data.

**Why this works:**
- Matches existing pattern: tiles[][] and collisions[][] are already parallel arrays
- Independent storage allows same tile at different heights
- Efficient serialization: numbers compress better than objects
- Server generates once, client uses directly without transformation

**Implementation:**

```typescript
// packages/shared-types/src/core/zone.ts (MODIFIED)
export interface ChunkData {
  /** Zone ID this chunk belongs to */
  zoneId: string;

  /** Tile data (2D array of tile IDs) - NOW STRINGS */
  tiles: string[][];  // Changed from number[][] to string[][]

  /** Height data (2D array of elevation levels 0-5) - NEW */
  heights: number[][];

  /** Structure data (walls, buildings) - NEW */
  structures: Structure[];

  /** Collision map (true = blocked) */
  collisions: boolean[][];

  /** Spawn points for entities */
  spawnPoints: SpawnPoint[];
}

export interface Structure {
  /** Structure type */
  type: 'wall' | 'building';

  /** Tiles comprising this structure */
  tiles: Array<{
    x: number;
    y: number;
    tileId: string;
    height: number;
  }>;
}
```

**Migration from enum to strings:**

```typescript
// packages/world-gen/src/generation/terrain.ts (MIGRATION)
// OLD: enum TileId with numeric values
// NEW: String constants matching registry IDs

export const TILE_IDS = {
  VOID_FLOOR: 'void_floor',
  VOID_WALL: 'void_wall',
  CRYSTAL_FLOOR: 'crystal_floor',
  CRYSTAL_FORMATION: 'crystal_formation',
  TOXIC_FLOOR: 'toxic_floor',
  TOXIC_POOL: 'toxic_pool',
  RUINS_FLOOR: 'ruins_floor',
  RUINS_WALL: 'ruins_wall',
  ICE_FLOOR: 'ice_floor',
  ICE_WALL: 'ice_wall',
  VOLCANIC_FLOOR: 'volcanic_floor',
  LAVA: 'lava',
  FUNGAL_FLOOR: 'fungal_floor',
  FUNGAL_GROWTH: 'fungal_growth',
  CRATER_FLOOR: 'crater_floor',
  CRATER_DEBRIS: 'crater_debris',
} as const;

// Biome mapping updated to use string IDs
const BIOME_TILES: Record<BiomeType, { floor: string; wall: string; feature: string }> = {
  void_plains: {
    floor: TILE_IDS.VOID_FLOOR,
    wall: TILE_IDS.VOID_WALL,
    feature: TILE_IDS.VOID_WALL
  },
  // ... other biomes
};

// generateTerrain() updated to return string[][] for tiles
export function generateTerrain(
  worldSeed: string,
  chunkX: number,
  chunkY: number,
  biome: BiomeType
): { tiles: string[][]; heights: number[][]; collisions: boolean[][] } {
  const tiles: string[][] = [];
  const heights: number[][] = [];  // NEW
  const collisions: boolean[][] = [];

  // Generate base terrain
  for (let y = 0; y < ZONE_SIZE; y++) {
    tiles[y] = [];
    heights[y] = [];  // NEW
    collisions[y] = [];

    for (let x = 0; x < ZONE_SIZE; x++) {
      // Existing terrain logic, now using string IDs
      tiles[y][x] = /* ... */;
      heights[y][x] = 0;  // Placeholder - Phase 14 will generate real heights
      collisions[y][x] = /* ... */;
    }
  }

  return { tiles, heights, collisions };
}
```

**Sources:**
- [Tiles and tilemaps overview - MDN](https://developer.mozilla.org/en-US/docs/Games/Techniques/Tilemaps)
- Project codebase: packages/shared-types/src/core/zone.ts (existing pattern)

### Pattern 3: Synchronous Hook Effects Pattern

**What:** Hooks return effect descriptors (plain objects) rather than mutating state directly. Caller applies effects after validation.

**When to use:** Game event systems where effects need to be validated, queued, or broadcast before application.

**Why this works:**
- Decouples request (effect) from execution (applying effect)
- Enables effect validation before application
- Allows server to broadcast effects to clients
- Synchronous execution prevents timing bugs
- Type-safe discriminated unions for effect types

**Implementation:**

```typescript
// packages/tiles/src/hooks/types.ts
import { Entity } from '@into-the-void/shared-types';

export interface TileHookContext {
  readonly entity: Entity;
  readonly position: { x: number; y: number };
}

export type TileHookFn = (context: TileHookContext) => TileEffect | null;

// packages/tiles/src/hooks/effects.ts
export type TileEffect =
  | { type: 'damage'; amount: number }
  | { type: 'slow'; duration: number; multiplier: number }
  | { type: 'heal'; amount: number };

// Example: Toxic Pool tile damages on step
// packages/tiles/src/definitions/toxic-tiles.ts
export const TOXIC_POOL = {
  id: 'toxic_pool',
  displayName: 'Toxic Pool',
  isBlocking: false,
  movementSpeed: 0.5,
  textureKey: 'tile_toxic_pool',
  defaultElevation: 0,
  hooks: {
    onStep: (context) => {
      // Hook just returns effect descriptor
      return { type: 'damage', amount: 5 };
    },
  },
} as const satisfies TileDefinition;

// Usage in game-server (Phase 14+)
// apps/game-server/src/zone/movement.service.ts
function handlePlayerMove(playerId: string, newX: number, newY: number): void {
  const player = getPlayer(playerId);
  const tileId = chunkData.tiles[newY][newX];
  const tileDef = TileRegistry.get(tileId);

  // Execute hook if present
  if (tileDef.hooks?.onStep) {
    const effect = tileDef.hooks.onStep({
      entity: player,
      position: { x: newX, y: newY },
    });

    // Caller validates and applies effect
    if (effect) {
      applyTileEffect(player, effect);
    }
  }
}

function applyTileEffect(player: Entity, effect: TileEffect): void {
  // Exhaustive type checking with discriminated union
  switch (effect.type) {
    case 'damage':
      player.health = Math.max(0, player.health - effect.amount);
      break;
    case 'slow':
      applyStatusEffect(player, 'slow', effect.duration, effect.multiplier);
      break;
    case 'heal':
      player.health = Math.min(player.maxHealth, player.health + effect.amount);
      break;
    default:
      // TypeScript ensures exhaustive checking
      const _exhaustive: never = effect;
      throw new Error(`Unhandled effect type: ${JSON.stringify(_exhaustive)}`);
  }
}
```

**Sources:**
- [Event Queue · Game Programming Patterns](https://gameprogrammingpatterns.com/event-queue.html)
- [TypeScript: Documentation - Narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html)
- [Discriminated Unions | TypeScript Deep Dive](https://basarat.gitbook.io/typescript/type-system/discriminated-unions)

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Tile registry lookup | Custom caching, lazy loading | TypeScript Map with const assertions | Map is O(1) lookup, const assertions provide type safety at zero runtime cost |
| Unknown tile handling | throw Error | Return fallback tile + console.warn | Graceful degradation prevents cascading failures; warnings help debug without breaking game |
| Hook execution ordering | Priority queues, async handlers | Synchronous single-hook execution | Game tick already handles ordering; hooks are per-tile reactions, not event bus |
| Tile variant selection | Random selection, time-based seeds | Position-seeded hash: `(x * 73856093 ^ y * 19349663) % variants.length` | Deterministic per-position means same tile always looks same without storing variant data |

**Key insight:** Tile system is data-driven architecture, not behavior-driven. The complexity is in organizing metadata (TileDefinition), not executing logic. Use language-native structures (Map, discriminated unions) rather than building custom frameworks.

## Common Pitfalls

### Pitfall 1: Enum Dependence (Current Codebase Issue)

**What goes wrong:** Using numeric enum TileId couples generation, rendering, and collision logic. Adding a new tile requires changes in 5+ files (terrain.ts, TileRenderer.ts, biome definitions, collision checks).

**Why it happens:** Enums feel natural for fixed sets, but tiles need to be extensible. Numeric IDs are opaque and require lookup tables everywhere.

**How to avoid:**
- Use string IDs with registry pattern
- Single source of truth: TileDefinition in registry
- Lookups via TileRegistry.get(id) abstract implementation

**Warning signs:**
- Multiple switch statements on tile IDs
- Hard to add new tile without touching 3+ files
- Tile properties scattered across codebase

**Migration strategy:**
```typescript
// Phase 13: Keep enum for backward compatibility
export enum TileId { /* existing */ }

// Add string ID mapping
export const TILE_ID_STRINGS: Record<TileId, string> = {
  [TileId.VOID_FLOOR]: 'void_floor',
  // ...
};

// Phase 14+: Replace enum usage with strings gradually
```

### Pitfall 2: Tile Heights in Definition Instead of Data

**What goes wrong:** Making height part of tile identity (e.g., "void_floor_h0", "void_floor_h1") creates combinatorial explosion: 16 tiles × 6 heights = 96 definitions.

**Why it happens:** Confusion between tile TYPE (what it is) and tile STATE (how it's configured). Height is a property of the terrain, not the tile definition.

**How to avoid:**
- TileDefinition stores defaultElevation (hint for generation)
- ChunkData.heights[][] stores actual elevation per-tile
- Same tile can appear at any height

**Warning signs:**
- Tile IDs include height: "floor_height_2"
- Can't change tile height without changing tile ID
- Need separate definitions for same visual tile at different elevations

**Correct pattern:**
```typescript
// Good: tile type separate from height
const tileId = 'void_floor';
const height = chunkData.heights[y][x];
TileRegistry.get(tileId);  // Same tile, different heights
```

### Pitfall 3: Async Hooks

**What goes wrong:** Making hooks async (Promise-returning) introduces timing issues: hook executes after player has moved, effects apply out of order, server and client desync.

**Why it happens:** Real-world I/O is async, so developers default to async. But tile hooks are synchronous game events—they happen instantly in game time.

**How to avoid:**
- Hooks return effect descriptor synchronously
- Caller queues effects for next tick if needed
- Database writes happen outside hook execution
- Use discriminated union for effect types, not callbacks

**Warning signs:**
```typescript
// BAD: Async hook
onStep: async (ctx) => {
  await database.logStepEvent(ctx.entity.id);  // NO!
  return { type: 'damage', amount: 5 };
};

// GOOD: Synchronous effect return
onStep: (ctx) => {
  // Hook just returns what should happen
  return { type: 'damage', amount: 5 };
};
// Caller handles logging separately
```

### Pitfall 4: Over-Engineering Hook System

**What goes wrong:** Implementing priority ordering, event bubbling, cancellation, multi-listener pub/sub for tile hooks when the requirement is "player steps on tile, take damage."

**Why it happens:** Pattern matching from DOM events or enterprise event buses. Tiles are simple per-position behaviors, not complex event hierarchies.

**How to avoid:**
- One hook per event type per tile (onStep, onClick, etc.)
- No priorities—execution order is deterministic
- No cancellation—hooks return effects or null
- No listeners—hook is defined in TileDefinition

**Warning signs:**
- Hook system has addEventListener/removeEventListener
- Priority/ordering configuration
- Event propagation or bubbling logic
- More than 50 lines of hook infrastructure code

**Right scope for Phase 13:**
```typescript
interface TileHooks {
  onStep?: (context: TileHookContext) => TileEffect | null;
  // Future phases add onClick, onEnter, onExit, onTick as needed
}
```

## Code Examples

Verified patterns from codebase and official sources.

### Example 1: Migration from Enum to String IDs

```typescript
// Before (current): packages/world-gen/src/generation/terrain.ts
export enum TileId {
  VOID_FLOOR = 0,
  VOID_WALL = 1,
  // ... numeric enum
}

const tiles: number[][] = [];
tiles[y][x] = TileId.VOID_FLOOR;

// After (Phase 13): packages/world-gen/src/generation/terrain.ts
import { TILE_IDS } from '@into-the-void/tiles';

const tiles: string[][] = [];
tiles[y][x] = TILE_IDS.VOID_FLOOR;  // Now string: 'void_floor'

// Backward compatibility shim during migration
export enum TileId { /* keep for now */ }
export function tileIdToString(id: TileId): string {
  return TILE_ID_STRINGS[id];
}
```

### Example 2: NX Package Setup

```json
// packages/tiles/package.json
{
  "name": "@into-the-void/tiles",
  "version": "0.0.1",
  "type": "commonjs",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "dependencies": {
    "@into-the-void/shared-types": "workspace:*"
  }
}

// packages/tiles/project.json
{
  "name": "tiles",
  "$schema": "../../node_modules/nx/schemas/project-schema.json",
  "sourceRoot": "packages/tiles/src",
  "projectType": "library",
  "tags": ["scope:shared"],
  "targets": {
    "build": {
      "executor": "@nx/esbuild:esbuild",
      "outputs": ["{options.outputPath}"],
      "options": {
        "outputPath": "dist/packages/tiles",
        "main": "packages/tiles/src/index.ts",
        "tsConfig": "packages/tiles/tsconfig.lib.json",
        "assets": [],
        "generatePackageJson": true,
        "format": ["cjs", "esm"]
      }
    },
    "lint": {
      "executor": "@nx/eslint:lint",
      "options": {
        "lintFilePatterns": ["packages/tiles/**/*.ts"]
      }
    }
  }
}
```

### Example 3: Position-Seeded Variant Selection (Client Renderer)

```typescript
// apps/web/src/game/rendering/TileRenderer.ts (FUTURE)
import { TileRegistry } from '@into-the-void/tiles';

class TileRenderer {
  /**
   * Get consistent variant index for a tile position
   * Same position always returns same variant
   */
  private getVariantIndex(x: number, y: number, variantCount: number): number {
    // FNV-1a-like hash for good distribution
    let hash = 2166136261;
    hash ^= x;
    hash *= 16777619;
    hash ^= y;
    hash *= 16777619;
    return Math.abs(hash) % variantCount;
  }

  createTile(x: number, y: number, tileId: string): Phaser.GameObjects.GameObject {
    const tileDef = TileRegistry.get(tileId);
    const textureKey = tileDef.textureKey;

    // If multiple variants exist (future feature)
    const variantCount = this.getTextureVariantCount(textureKey);
    const variantIndex = this.getVariantIndex(x, y, variantCount);
    const finalTexture = `${textureKey}_${variantIndex}`;

    // ... existing rendering logic
  }
}
```

### Example 4: Height Data Generation (Placeholder for Phase 14)

```typescript
// packages/world-gen/src/generation/terrain.ts (Phase 13 version)
export function generateTerrain(
  worldSeed: string,
  chunkX: number,
  chunkY: number,
  biome: BiomeType
): { tiles: string[][]; heights: number[][]; collisions: boolean[][] } {
  const tiles: string[][] = [];
  const heights: number[][] = [];
  const collisions: boolean[][] = [];

  for (let y = 0; y < ZONE_SIZE; y++) {
    tiles[y] = [];
    heights[y] = [];
    collisions[y] = [];

    for (let x = 0; x < ZONE_SIZE; x++) {
      // Existing tile generation
      tiles[y][x] = /* ... existing logic ... */;

      // Phase 13: Placeholder heights (all zeros)
      // Phase 14 will implement elevation noise generation
      heights[y][x] = 0;

      // Existing collision logic
      collisions[y][x] = /* ... existing logic ... */;
    }
  }

  return { tiles, heights, collisions };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Numeric enum IDs | String-based registry IDs | Phase 13 | Enables extensibility, human-readable serialization, mod support |
| Tile properties in enum | Properties in TileDefinition | Phase 13 | Single source of truth, properties co-located with behavior |
| Binary collision (blocked/not) | Movement speed modifiers | Phase 13 | Enables slow terrain, speed boosts, nuanced movement |
| Flat tile rendering | Elevation-aware rendering | Phase 14 (next) | Visual depth, platforming mechanics, strategic gameplay |
| No tile interactions | Hook system for behaviors | Phase 13 interface, Phase 14+ usage | Damage tiles, triggers, environmental effects |

**Deprecated/outdated:**
- **TileId numeric enum:** Will remain for backward compatibility through Phase 13, deprecated in Phase 14
- **Hardcoded BIOME_TILES mapping:** Phase 13 moves to registry lookups by string ID
- **getTileSpeedModifier() helper function:** Phase 13 replaces with TileRegistry.get(id).movementSpeed
- **isWalkable() helper function:** Phase 13 replaces with TileRegistry.get(id).isBlocking

## Open Questions

1. **Tile texture variants storage strategy**
   - What we know: Position-seeded selection (hash(x,y) % count) provides determinism
   - What's unclear: How to store variant count per tile? In textureKey suffix? Separate field?
   - Recommendation: Defer to renderer implementation (Phase 15+ asset loading). TileDefinition.textureKey is hint, renderer can have internal variant map.

2. **Structure collision interaction**
   - What we know: structures[] array stores walls, collisions[][] is computed from tiles + structures
   - What's unclear: Rebuild collisions[][] client-side or transmit pre-computed?
   - Recommendation: Transmit pre-computed from server. ChunkData.collisions already serialized, client doesn't need generation logic.

3. **Hook execution in multiplayer**
   - What we know: Server authoritative, effects must be validated
   - What's unclear: Client prediction for tile effects (immediate visual feedback)?
   - Recommendation: Phase 13 implements server-side hooks only. Phase 16+ (multiplayer polish) adds client prediction if needed.

## Sources

### Primary (HIGH confidence)

**TypeScript patterns:**
- [A complete guide to const assertions in TypeScript - LogRocket](https://blog.logrocket.com/complete-guide-const-assertions-typescript/)
- [How to Create Const Assertions in TypeScript - OneUpTime](https://oneuptime.com/blog/post/2026-01-30-typescript-const-assertions/view)
- [TypeScript: Documentation - Narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html)
- [Discriminated Unions | TypeScript Deep Dive](https://basarat.gitbook.io/typescript/type-system/discriminated-unions)

**Registry patterns:**
- [Scaling 1M lines of TypeScript: Registries - Slash Engineering](https://puzzles.slash.com/blog/scaling-1m-lines-of-typescript-registries)
- [Type-Safe User Interfaces & the Manifest Pattern - Andrew Hathaway](https://andrewhathaway.net/blog/manifest-pattern/)

**Game architecture:**
- [Event Queue · Game Programming Patterns](https://gameprogrammingpatterns.com/event-queue.html)
- [Tiles and tilemaps overview - MDN](https://developer.mozilla.org/en-US/docs/Games/Techniques/Tilemaps)

**Codebase analysis:**
- `/packages/shared-types/src/core/zone.ts` - ChunkData structure
- `/packages/world-gen/src/generation/terrain.ts` - Current tile generation
- `/apps/web/src/game/rendering/TileRenderer.ts` - Current rendering
- `/.planning/research/ARCHITECTURE.md` - Existing elevation integration research

### Secondary (MEDIUM confidence)

- [Building and Testing TypeScript Packages in Nx](https://nx.dev/docs/getting-started/tutorials/typescript-packages-tutorial)
- [TypeScript Map: Get or Default](https://www.xjavascript.com/blog/typescript-map-get-or-default/)
- [Entity Component System libraries](https://github.com/topics/entity-component-system?l=typescript) - Hook pattern reference

### Tertiary (LOW confidence - architectural inspiration only)

- [Function Registry Pattern Explained - JavaScript in Plain English](https://javascript.plainenglish.io/function-registry-pattern-explained-clean-scalable-composable-code-e483bb7f2444)
- [Miski - TypeScript Entity Component System](https://phughesmcr.github.io/Miski/) - Hook pattern reference

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Uses existing project infrastructure (TypeScript 5.4, NX 20, pnpm workspaces)
- Architecture: HIGH - Based on direct codebase analysis and verified TypeScript patterns
- Hook system: HIGH - Game Programming Patterns is authoritative source, pattern well-established
- Migration strategy: MEDIUM - Requires careful testing of enum→string conversion across 3 packages

**Research date:** 2026-02-16
**Valid until:** 2026-03-16 (30 days - stable domain, TypeScript features mature)

**Assumptions:**
- Existing pathfinding system (A*) can be extended to use tile properties
- Client renderer can look up TileDefinition properties in render loop without performance issues
- JSON serialization overhead for string IDs vs numeric IDs is negligible (<1% of chunk data)
- Phase 14 (elevation generation) will implement actual height noise; Phase 13 provides data structure only
