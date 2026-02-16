# Architecture Research: Elevation & Tile Definition Integration

**Domain:** Isometric terrain elevation and tile definition systems for existing game
**Researched:** 2026-02-16
**Confidence:** HIGH

## Integration Context

This is NOT a new project - it's integrating new features (elevation system, tile definition registry, structure walls) into an existing isometric 2D multiplayer game with:

- Established rendering pipeline: TileRenderer → Phaser Graphics → IsometricTransform → DepthSorter
- Procedural generation: WorldGenerator → BiomeGenerator → terrain.ts (SimplexNoise) → ChunkData
- Movement system: PathfindingController → A* pathfinding → collision map
- Network architecture: game-server generates chunks → client ChunkManager → WorldScene renders

**Critical constraint:** Minimize disruption to existing systems while adding elevation and tile definition capabilities.

## Current Architecture (As-Is)

### Data Flow

```
Server-Side Generation:
WorldGenerator → generateTerrain()
    ↓
SimplexNoise (fbm) → TileId enum (0-15)
    ↓
ChunkData { tiles[][], collisions[][], spawnPoints[] }
    ↓
WebSocket → Client

Client-Side Rendering:
ChunkData → ChunkManager
    ↓
TileRenderer.createTile(x, y, TileId)
    ↓
Graphics diamond (placeholder) OR future sprite
    ↓
IsometricTransform.gridToScreen(x, y)
    ↓
Phaser Container at calculated position
    ↓
DepthSorter (Y-based + X tiebreaker)
```

### Key Components

| Component | Current Responsibility | Location |
|-----------|----------------------|----------|
| TileId enum | 16 hardcoded tile types | packages/world-gen/src/generation/terrain.ts |
| generateTerrain() | noise → tiles + collisions | packages/world-gen/src/generation/terrain.ts |
| ChunkData | Serialized zone data | packages/shared-types/src/core/zone.ts |
| TileRenderer | Graphics diamond rendering | apps/web/src/game/rendering/TileRenderer.ts |
| IsometricTransform | Grid↔Screen conversion | apps/web/src/game/utils/IsometricTransform.ts |
| A* pathfinding | Collision-based movement | packages/game-logic/src/movement/pathfinding.ts |

### Current Limitations

1. **No tile metadata:** TileId is just a number, no properties attached
2. **No elevation:** All tiles rendered at same Z-level
3. **Binary collision:** true/false, no movement cost variations
4. **Hardcoded tiles:** Adding new tiles requires modifying enum + multiple functions
5. **No side walls:** Elevated tiles have no visual height representation

## Target Architecture (To-Be)

### System Overview with Elevation

```
┌─────────────────────────────────────────────────────────────┐
│                    SHARED-TYPES LAYER                        │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌──────────────────────────────────┐  │
│  │ TileDefinition  │  │      ChunkData (MODIFIED)        │  │
│  │   Registry      │  │  - tiles[][]                     │  │
│  │                 │  │  - heights[][] (NEW)             │  │
│  │ - id            │  │  - structures[] (NEW)            │  │
│  │ - displayName   │  │  - collisions[][]                │  │
│  │ - isBlocking    │  │  - spawnPoints[]                 │  │
│  │ - speedModifier │  │                                  │  │
│  │ - texture       │  └──────────────────────────────────┘  │
│  │ - elevation     │                                         │
│  │ - hooks         │                                         │
│  └─────────────────┘                                         │
└─────────────────────────────────────────────────────────────┘
                               ↓
┌─────────────────────────────────────────────────────────────┐
│                    WORLD-GEN LAYER                           │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐    │
│  │  TerrainGenerator (MODIFIED)                        │    │
│  │  - Generate tiles[][] using noise                   │    │
│  │  - Generate heights[][] using elevation noise       │    │
│  │  - Generate structures using structural noise       │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  StructureGenerator (NEW)                           │    │
│  │  - Place walls based on noise patterns              │    │
│  │  - Set height data for wall tiles                   │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                               ↓
┌─────────────────────────────────────────────────────────────┐
│                    GAME-LOGIC LAYER                          │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Pathfinding (MODIFIED)                             │    │
│  │  - A* with elevation cost calculation               │    │
│  │  - Movement cost = base + elevationDelta * penalty  │    │
│  │  - Line of sight elevation blocking                 │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                               ↓
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT RENDERING LAYER                    │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐    │
│  │  TileRenderer (MODIFIED)                            │    │
│  │  - Render tile top face at grid position           │    │
│  │  - Render side faces based on height difference    │    │
│  │  - Use TileDefinition for texture lookup           │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  ElevationRenderer (NEW)                            │    │
│  │  - Draw vertical side walls for elevated tiles     │    │
│  │  - Calculate screen offset based on height levels  │    │
│  │  - Adjust depth for proper layering                │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  IsometricTransform (MODIFIED)                      │    │
│  │  - Add heightToScreenY(height) method              │    │
│  │  - Modify calculateDepth() for elevation           │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## Component Integration Strategy

### NEW Components

| Component | Purpose | Location | Creates |
|-----------|---------|----------|---------|
| TileRegistry | Static tile definitions | packages/shared-types/src/game/tile-registry.ts | Registry pattern like EntityRegistry |
| StructureGenerator | Wall/structure placement | packages/world-gen/src/generation/structure.ts | Wall tiles with heights |
| ElevationRenderer | Side wall rendering | apps/web/src/game/rendering/ElevationRenderer.ts | Graphics for tile sides |

### MODIFIED Components

| Component | What Changes | Why | Complexity |
|-----------|--------------|-----|------------|
| ChunkData | Add heights[][], structures[] | Serialize elevation data | LOW - extends interface |
| generateTerrain() | Add elevation noise layer | Generate height variation | MEDIUM - new noise octave |
| TileRenderer | Lookup TileDefinition, call ElevationRenderer | Use registry for properties | LOW - method delegation |
| IsometricTransform | Add heightToScreenY() method | Convert elevation to screen offset | LOW - math formula |
| pathfinding.ts | Add elevation cost in g-score | Prefer flat terrain | MEDIUM - modify A* cost |
| DepthSorter | Include elevation in depth calc | Elevated tiles render in front | LOW - add height offset |

## Architectural Patterns

### Pattern 1: Registry with Static Data

**What:** TileRegistry as static object with type-safe lookups, following EntityRegistry pattern

**When to use:** When you have game data that is:
- Known at compile time
- Shared between client and server
- Referenced by ID frequently

**Trade-offs:**
- Pros: Type-safe, no runtime loading, can't get out of sync
- Cons: Adding tiles requires code changes (acceptable for game data)

**Example:**
```typescript
// packages/shared-types/src/game/tile-registry.ts
export interface TileDefinition {
  id: string;
  displayName: string;
  isBlocking: boolean;
  speedModifier: number;  // 1.0 = normal, 0.5 = slow, 1.2 = fast
  textureKey: string;
  defaultElevation: number; // 0-5 levels
  hooks?: {
    onStep?: (player: Entity) => void;  // For damage tiles, etc.
  };
}

export const TileRegistry = {
  definitions: {
    'void_floor': {
      id: 'void_floor',
      displayName: 'Void Floor',
      isBlocking: false,
      speedModifier: 1.0,
      textureKey: 'tile_void_floor',
      defaultElevation: 0,
    },
    'void_wall': {
      id: 'void_wall',
      displayName: 'Void Wall',
      isBlocking: true,
      speedModifier: 0,
      textureKey: 'tile_void_wall',
      defaultElevation: 2, // Walls are elevated
    },
    // ... other tiles
  } as Record<string, TileDefinition>,

  get(id: string): TileDefinition | undefined {
    return this.definitions[id];
  },

  getBlocking(): string[] {
    return Object.values(this.definitions)
      .filter(d => d.isBlocking)
      .map(d => d.id);
  },
};
```

### Pattern 2: Elevation as Separate Data Layer

**What:** Store height as separate 2D array parallel to tiles[][], not embedded in tile definition

**When to use:** When tile type and height are independent variables (same tile can be at different heights)

**Trade-offs:**
- Pros: Flexible - any tile at any height, smaller data (uint8 vs object)
- Cons: Two arrays to manage, potential desync bugs

**Example:**
```typescript
// packages/shared-types/src/core/zone.ts
export interface ChunkData {
  zoneId: string;
  tiles: string[][];      // Tile IDs (string refs to TileRegistry)
  heights: number[][];    // 0-5 elevation levels (uint8)
  structures: Structure[]; // Wall segments (NEW)
  collisions: boolean[][]; // Derived from tiles + structures
  spawnPoints: SpawnPoint[];
}

export interface Structure {
  type: 'wall' | 'building';
  tiles: { x: number; y: number; tileId: string; height: number }[];
}
```

### Pattern 3: Side Wall Rendering with Screen Offset

**What:** Render tile faces at different Y positions based on elevation, using depth for layering

**When to use:** Isometric games where elevation is visualized as stacked tiles

**Trade-offs:**
- Pros: Clear visual hierarchy, works with existing depth sorting
- Cons: More draw calls, requires careful depth calculation

**Example:**
```typescript
// apps/web/src/game/rendering/ElevationRenderer.ts
export class ElevationRenderer {
  private PIXELS_PER_LEVEL = 16; // Screen pixels per elevation level

  renderTileWithElevation(
    x: number,
    y: number,
    tileId: string,
    height: number
  ): Phaser.GameObjects.Container {
    const container = this.scene.add.container(0, 0);
    const tileDef = TileRegistry.get(tileId);

    // Base screen position
    const screenPos = this.isoTransform.gridToScreen(x, y);

    // Elevation offset (higher tiles render higher on screen)
    const elevationOffset = height * this.PIXELS_PER_LEVEL;

    // Top face at elevated position
    const topFace = this.createTileFace(tileId);
    topFace.setPosition(screenPos.x, screenPos.y - elevationOffset);
    container.add(topFace);

    // Side walls (only if elevated)
    if (height > 0) {
      const sideFaces = this.createSideWalls(tileId, height);
      sideFaces.forEach(face => {
        face.setPosition(screenPos.x, screenPos.y - elevationOffset);
        container.add(face);
      });
    }

    // Depth includes elevation (higher = rendered in front)
    const depth = this.isoTransform.calculateDepth(x, y) + elevationOffset;
    container.setDepth(depth);

    return container;
  }

  private createSideWalls(tileId: string, height: number): Phaser.GameObjects.Graphics[] {
    // South and east faces visible in isometric view
    const southWall = this.createWallFace('south', height);
    const eastWall = this.createWallFace('east', height);
    return [southWall, eastWall];
  }
}
```

### Pattern 4: Elevation-Aware Pathfinding Cost

**What:** Modify A* g-score to penalize elevation changes, preferring flat routes

**When to use:** When movement over terrain should consider height differences

**Trade-offs:**
- Pros: Realistic pathfinding, avoids unnecessary climbing
- Cons: More complex than pure distance, needs tuning

**Example:**
```typescript
// packages/game-logic/src/movement/pathfinding.ts (MODIFIED)
export function findPath(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  collisionMap: boolean[][],
  heightMap: number[][], // NEW parameter
  maxIterations = 1000
): Array<{ x: number; y: number }> | null {
  // ... existing setup ...

  // Modified neighbor processing
  for (const dir of directions) {
    const nx = current.x + dir.dx;
    const ny = current.y + dir.dy;

    // ... existing bounds/collision checks ...

    // Calculate movement cost with elevation penalty
    const currentHeight = heightMap[current.y]?.[current.x] ?? 0;
    const nextHeight = heightMap[ny]?.[nx] ?? 0;
    const elevationDelta = Math.abs(nextHeight - currentHeight);

    // Base cost 1.0, +0.5 per elevation level difference
    const movementCost = 1.0 + (elevationDelta * 0.5);
    const g = current.g + movementCost;

    // ... rest of A* logic ...
  }
}
```

## Data Flow with Elevation

### Generation Flow (Server-Side)

```
WorldGenerator.generateChunk(chunkX, chunkY)
    ↓
1. BiomeGenerator determines biome
    ↓
2. TerrainGenerator:
   - Base noise → tile IDs
   - Elevation noise → heights[][]
   - Edge connectivity (unchanged)
    ↓
3. StructureGenerator (NEW):
   - Structural noise → wall placement
   - Set wall heights based on biome
    ↓
4. Collision map generation:
   - Check TileRegistry.isBlocking
   - Include structure walls
    ↓
ChunkData { tiles[][], heights[][], structures[], collisions[][], spawnPoints[] }
```

### Rendering Flow (Client-Side)

```
ChunkManager.receiveChunk(chunkData, biome)
    ↓
WorldScene.renderChunk(chunkData, biome)
    ↓
For each tile (x, y):
  1. TileRenderer.createTileWithElevation(x, y, tileId, height)
       ↓
  2. TileRegistry.get(tileId) → TileDefinition
       ↓
  3. ElevationRenderer.renderTileWithElevation():
       - Calculate screenPos from IsometricTransform
       - Apply elevation offset: screenY -= (height * PIXELS_PER_LEVEL)
       - Render top face at elevated position
       - IF height > adjacent tiles: render side walls
       - Calculate depth including elevation
       ↓
  4. Add to chunk container at calculated position
```

### Pathfinding Flow (Client-Side)

```
PathfindingController.startPath(targetX, targetY, collisionMap)
    ↓
Pass heightMap (extracted from ChunkData.heights)
    ↓
findPath() A* algorithm:
  - Standard distance heuristic (Manhattan)
  - Modified g-score: base cost + elevation penalty
  - Prefer routes with minimal elevation change
    ↓
Return path array { x, y }[]
    ↓
PathfindingController moves player along path
```

## Integration Points

### NEW Interfaces to Existing Systems

| Interface | Connects | How |
|-----------|----------|-----|
| ChunkData.heights | generateTerrain() → TileRenderer | Parallel array to tiles[][] |
| ChunkData.structures | StructureGenerator → collision generation | Array of wall segments |
| TileRegistry | TileRenderer + pathfinding | Lookup tile properties by ID |
| heightMap | pathfinding A* cost | Passed as parameter, optional (defaults to flat) |
| ElevationRenderer | TileRenderer | Composition - TileRenderer calls ElevationRenderer |

### Existing Systems NOT Modified

| System | Why Unchanged | Integration Method |
|--------|---------------|-------------------|
| BiomeGenerator | Height is orthogonal to biome | Heights generated per-biome rules |
| EntityRenderer | Entities float above terrain | Already uses elevation offset |
| ChunkManager | Just passes data | ChunkData extended, manager agnostic |
| NetworkLayer | Serialization unchanged | ChunkData JSON compatible |
| ViewportCuller | Culls by grid position | Elevation irrelevant to culling |

## Scaling Considerations

| Scale | Performance Impact | Mitigation |
|-------|-------------------|------------|
| 64x64 zone | 4096 tiles, ~8k-12k draw calls with elevation | Acceptable - current placeholder uses Graphics per tile anyway |
| Multiple chunks loaded | 9 chunks = 36k tiles | Already mitigated by ViewportCuller (only renders visible) |
| Complex structures | Walls add ~5-10% more tiles | StructureGenerator limits wall density |

### Performance Strategy

1. **Immediate (MVP):** Graphics-based rendering (current system) extended with side walls
2. **Phase 2 (if needed):** Sprite-based tilemap using Phaser Tilemap API with elevation layers
3. **Phase 3 (optimization):** GPU instancing for repeated tile sprites

**Recommendation:** Start with Graphics extension. Current codebase already uses Graphics per tile, adding side walls is incremental. Only migrate to Tilemap if profiling shows bottleneck.

## Anti-Patterns to Avoid

### Anti-Pattern 1: Embedding Height in Tile Definition

**What people do:** Make height part of TileDefinition (e.g., "void_floor_height_2")

**Why it's wrong:**
- Combinatorial explosion: 16 tiles × 6 heights = 96 definitions
- Loses semantic meaning (tile type vs terrain topology)
- Can't dynamically adjust height (structures, terrain deformation)

**Do this instead:**
- Tile ID references type (floor, wall, etc.)
- Height stored separately in heights[][]
- TileDefinition has defaultElevation as hint, not absolute

### Anti-Pattern 2: Calculating Depth Without Elevation

**What people do:** Keep Y-based depth sorting, ignore height

**Why it's wrong:**
- Elevated tiles render behind ground tiles in front of them
- Breaks visual hierarchy (player walks "over" elevated walls)

**Do this instead:**
```typescript
// IsometricTransform.calculateDepth() - MODIFIED
calculateDepth(gridX: number, gridY: number, height: number = 0): number {
  const screen = this.gridToScreen(gridX, gridY);
  const elevationOffset = height * PIXELS_PER_LEVEL;
  // Higher elevation = larger depth value = renders in front
  return screen.y - elevationOffset + gridX * 0.0001;
}
```

### Anti-Pattern 3: Generating Structures Post-Terrain

**What people do:** Generate terrain first, then try to place structures

**Why it's wrong:**
- Structures may conflict with terrain (walls on non-walkable tiles)
- No way to ensure connectivity (walls block all paths)
- Height data inconsistent with structure placement

**Do this instead:**
- Generate base terrain (floor types)
- Generate structures using SAME noise seed + different octave
- Update tile IDs where structures placed
- Generate collision map AFTER structures finalized

### Anti-Pattern 4: Per-Tile Collision Detection

**What people do:** Check TileRegistry.isBlocking on every movement validation

**Why it's wrong:**
- Already have collisions[][] in ChunkData
- Redundant lookups hurt performance
- Collision map is SOURCE OF TRUTH (includes structures)

**Do this instead:**
- Generate collisions[][] on server from tiles + structures
- Send in ChunkData (already serialized)
- Client uses boolean array directly (O(1) lookup)
- TileRegistry only used for rendering/display properties

## Build Order Recommendations

### Phase 1: Foundation (No Visual Changes)
1. TileRegistry interface + basic definitions (migrate existing 16 tiles)
2. ChunkData extended with heights[][], structures[]
3. generateTerrain() modified to output new fields (all zeros for now)
4. Network layer verification (serialize/deserialize new fields)

**Checkpoint:** Existing game still renders, no visual changes, types compile

### Phase 2: Elevation Generation
1. Add elevation noise layer to terrain generation
2. StructureGenerator for simple walls
3. Update collision map generation to include structures
4. Server sends real height data

**Checkpoint:** Data flows through system, client receives heights (not yet rendered)

### Phase 3: Elevation Rendering
1. IsometricTransform.heightToScreenY() method
2. ElevationRenderer with side wall rendering
3. TileRenderer integration (call ElevationRenderer for elevated tiles)
4. DepthSorter modified for elevation

**Checkpoint:** Visual elevation appears, tiles at different heights visible

### Phase 4: Movement Integration
1. PathfindingController passes heightMap to findPath()
2. A* modified for elevation cost
3. MovementController validation checks height (prevent climbing 3+ levels)

**Checkpoint:** Pathfinding respects terrain elevation, player movement feels natural

### Dependencies

```
TileRegistry → ChunkData types
    ↓
generateTerrain() modifications
    ↓
ChunkData serialization
    ↓
(CHECKPOINT: Data layer complete)
    ↓
ElevationRenderer → IsometricTransform
    ↓
TileRenderer integration
    ↓
(CHECKPOINT: Rendering complete)
    ↓
Pathfinding elevation cost
    ↓
(COMPLETE: All systems integrated)
```

## Sources

Isometric elevation rendering:
- [Handling Height in Isometric Tile Maps](https://erikonarheim.com/posts/handling-height-in-isometric/)
- [Isometric Tiles Math](https://clintbellanger.net/articles/isometric_math/)
- [Phaser Isometric Examples](https://phaser.io/examples/v3.85.0/depth-sorting/view/isometric-map)

Tile systems and tilemaps:
- [Tiles and tilemaps overview - MDN](https://developer.mozilla.org/en-US/docs/Games/Techniques/Tilemaps)
- [Creating a Dynamic Tile System](https://www.gamedeveloper.com/programming/creating-a-dynamic-tile-system)

Pathfinding with terrain cost:
- [Movement costs for pathfinders](http://theory.stanford.edu/~amitp/GameProgramming/MovementCosts.html)
- [Creating natural paths on terrains](https://www.gamedeveloper.com/programming/creating-natural-paths-on-terrains-using-pathfinding)

Procedural generation:
- [Red Blob Games: Making maps with noise](https://www.redblobgames.com/maps/terrain-from-noise/)
- [Understanding procedural terrain generation](https://medium.com/@ashleythedev/understanding-procedural-terrain-generation-in-games-07ac63fca626)

Depth sorting:
- [Isometric Depth Sorting for Moving Platforms](https://gamedevelopment.tutsplus.com/tutorials/isometric-depth-sorting-for-moving-platforms--cms-30226)
- [Drawing isometric boxes in the correct order](https://shaunlebron.github.io/IsometricBlocks/)

---
*Architecture research for: Elevation & Tile Definition Integration*
*Researched: 2026-02-16*
*Confidence: HIGH - Direct codebase analysis + verified isometric rendering patterns*
