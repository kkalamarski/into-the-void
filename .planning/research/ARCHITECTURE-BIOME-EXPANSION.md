# Architecture Patterns: Content Expansion with Aquatic & Exotic Biomes

**Domain:** Procedurally generated MMO with biome-based content
**Researched:** 2026-02-23
**Confidence:** HIGH (existing codebase analysis)

## Recommended Architecture

The existing architecture is well-suited for biome expansion. The system uses a **strategy pattern for entities**, **registry pattern for static data**, and **noise-based procedural generation**. Adding aquatic/exotic biomes requires extending enums and registries, not architectural changes.

### Integration Strategy

**Add New, Don't Modify Core**
- Biome addition is additive (enum extension, new registry entries)
- No refactoring of BiomeGenerator or spawn logic needed
- Existing systems are designed for extensibility

### Component Boundaries

| Component | Responsibility | Integration Point |
|-----------|---------------|-------------------|
| **BiomeGenerator** | Determines biome at world coordinates via noise | Add new biome types to `getBiome()` decision tree |
| **EntityRegistry** | Stores entity definitions with biome filters | Add new entity definitions with aquatic biome tags |
| **SpawnGenerator** | Creates spawn points per biome via `BIOME_SPAWN_CONFIGS` | Add new config entries for aquatic biomes |
| **TileRegistry** | Stores tile definitions (floor/wall/feature per biome) | Add new tile definitions for aquatic visuals |
| **TerrainGenerator** | Assigns tiles based on noise + biome via `BIOME_TILES` | Add new tile mappings for aquatic biomes |
| **ZonesService** | Loads chunks on-demand, materializes entities from spawns | No changes needed (uses EntityRegistry) |
| **EntityRenderer** | Renders entities as Phaser sprites | Add new texture keys for aquatic creatures/plants |
| **TileRenderer** | Renders tiles with elevation and color fallbacks | Add new texture keys or shader effects for water |

## Data Flow

### Current Flow (Unchanged)
```
1. Client requests zone → ZonesService
2. ZonesService calls generateChunk(worldSeed, x, y)
3. WorldGenerator:
   a. BiomeGenerator.getBiome(worldX, worldY) → BiomeType (per tile)
   b. TerrainGenerator uses BIOME_TILES[biome] → tile IDs
   c. SpawnGenerator uses BIOME_SPAWN_CONFIGS[biome] → spawn points
4. ZonesService.createEntityFromSpawn() uses EntityRegistry → Entity instances
5. Client receives ChunkData + entities
6. WorldScene renders:
   - TileRenderer renders tiles
   - EntityRenderer renders entities
```

### New Flow for Aquatic Biomes
```
1-3. Same as current (add aquatic BiomeTypes to decision tree)
4. EntityRegistry returns aquatic creature/plant definitions
5. Same (ChunkData structure unchanged)
6. Rendering:
   - TileRenderer: Add shader/tint for water tiles (optional)
   - EntityRenderer: Same (just new texture keys)
   - Optional: Add particle effects for bubbles/currents
```

## Patterns to Follow

### Pattern 1: Biome Type Extension
**What:** Add new BiomeType literals to existing union type
**When:** Adding any new biome
**Example:**
```typescript
// packages/shared-types/src/game/biome.ts
export type BiomeType =
  | 'void_plains'
  | 'crystal_caves'
  // ... existing
  | 'tidal_pools'      // NEW: aquatic shallow
  | 'deep_trenches'    // NEW: aquatic deep
  | 'biolum_reef'      // NEW: aquatic bioluminescent
  | 'fungal_abyss'     // NEW: exotic underwater fungal
  | 'crystalline_sea'  // NEW: exotic liquid crystal
  | 'void_ocean';      // NEW: exotic void-touched water
```

### Pattern 2: Entity Definition with Biome Tags
**What:** Register entities with biome array filters
**When:** Adding creatures, plants, or minerals
**Example:**
```typescript
// packages/entities/src/definitions/creatures.ts
export const CREATURE_BRINE_SERPENT: CreatureDefinition = {
  id: 'creature_brine_serpent',
  displayName: 'Brine Serpent',
  description: 'Ambush predator of tidal pools.',
  entityClass: 'creature',
  biomes: ['tidal_pools', 'deep_trenches'], // Multi-biome support
  textureKey: 'creature_brine_serpent',
  color: 0x2e8b57,
  lootTableId: 'loot_creature_brine_serpent',
  behavior: 'predator',
  baseHealth: 180,
  levelRange: [10, 20],
  baseXp: 50,
  respawnSeconds: 360,
};
```

### Pattern 3: Spawn Configuration per Biome
**What:** Define spawn weights and densities in `BIOME_SPAWN_CONFIGS`
**When:** Defining what spawns in new biomes
**Example:**
```typescript
// packages/world-gen/src/generation/spawn.ts
const BIOME_SPAWN_CONFIGS: Record<BiomeType, BiomeSpawnConfig> = {
  // ... existing
  tidal_pools: {
    creatures: [
      { id: ENTITY_IDS.CREATURE_BRINE_SERPENT, weight: 8, minLevel: 10, maxLevel: 20 },
      { id: ENTITY_IDS.CREATURE_TIDE_SCUTTLER, weight: 10, minLevel: 8, maxLevel: 15 },
    ],
    minerals: [
      { id: ENTITY_IDS.MINERAL_TIDAL_SALT, weight: 10, rarity: 1 },
      { id: ENTITY_IDS.MINERAL_CORAL_DEPOSIT, weight: 6, rarity: 2 },
    ],
    creatureDensity: 5,  // Higher density for aquatic life
    mineralDensity: 4,
  },
};
```

### Pattern 4: Tile Definitions with Hooks
**What:** Define tiles with blocking/speed modifiers and optional hooks
**When:** Creating new tile types (water, deep water, coral)
**Example:**
```typescript
// packages/tiles/src/definitions/aquatic-tiles.ts
import { TileDefinition } from '../types';

export const TILE_SHALLOW_WATER: TileDefinition = {
  id: 'tidal_shallow_water',
  displayName: 'Shallow Water',
  isBlocking: false,
  movementSpeed: 0.7, // Slower movement in water
  textureKey: 'tile_tidal_shallow',
  defaultElevation: 0,
  color: 0x4682b4, // Steel blue
  description: 'Ankle-deep tidal pool water.',
  hooks: {
    onStep: (ctx) => {
      // Optional: Apply environmental effect
      // return { type: 'slow', duration: 1000, multiplier: 0.7 };
      return null; // No damage, just speed modifier
    },
  },
};

export const TILE_DEEP_WATER: TileDefinition = {
  id: 'tidal_deep_water',
  displayName: 'Deep Water',
  isBlocking: true, // Cannot traverse without special equipment
  movementSpeed: 0,
  textureKey: 'tile_tidal_deep',
  defaultElevation: 0,
  color: 0x191970, // Midnight blue
  description: 'Deep water requiring diving equipment.',
};
```

### Pattern 5: Biome Decision Tree Extension
**What:** Add noise-based conditions to `BiomeGenerator.getBiome()`
**When:** Defining where aquatic biomes spawn
**Example:**
```typescript
// packages/world-gen/src/generation/biome.ts
getBiome(worldX: number, worldY: number): BiomeType {
  const temp = this.getTemperature(worldX, worldY);
  const moisture = this.getMoisture(worldX, worldY);
  const elevation = this.getElevation(worldX, worldY);

  // NEW: Very low elevation + high moisture = aquatic biomes
  if (elevation < 0.15) {
    if (moisture > 0.8 && temp > 0.6) return 'tidal_pools'; // Warm shallow
    if (moisture > 0.9 && temp < 0.3) return 'deep_trenches'; // Cold deep
    if (moisture > 0.85 && temp > 0.4 && temp < 0.7) return 'biolum_reef'; // Temperate bioluminescent
  }

  // Existing biome logic...
}
```

### Pattern 6: Renderer Extensibility
**What:** Renderers use texture keys from definitions, falling back to color
**When:** Adding visual content for new biomes
**Example:**
```typescript
// No code changes needed in EntityRenderer or TileRenderer
// Just add texture assets to Phaser asset loader:

// apps/web/src/game/scenes/PreloadScene.ts
this.load.image('creature_brine_serpent', 'assets/sprites/creatures/brine_serpent.png');
this.load.image('tile_tidal_shallow', 'assets/tiles/tidal_shallow.png');
this.load.image('plant_kelp_forest', 'assets/sprites/plants/kelp_forest.png');

// Until sprites exist, color fallbacks are used automatically
```

## Anti-Patterns to Avoid

### Anti-Pattern 1: Hardcoded Biome Lists
**What goes wrong:** Duplicating biome type checks across multiple files
**Why bad:** Adding a biome requires changes in 10+ places, easy to miss one
**Instead:** Use `BiomeType` union type and exhaustive switch statements with TypeScript's `never` check
**Detection:** Search for `biome === 'void_plains' || biome === 'crystal_caves'` patterns

### Anti-Pattern 2: Biome-Specific Logic in Renderers
**What goes wrong:** TileRenderer has special cases for water rendering
**Why bad:** Couples rendering to biome knowledge, breaks extensibility
**Instead:** Use tile properties (isBlocking, movementSpeed) and optional shader effects via tile hooks
**Detection:** `if (biome === 'tidal_pools')` in rendering code

### Anti-Pattern 3: Entity Definitions Outside Registry
**What goes wrong:** Creating entity instances directly in spawn logic
**Why bad:** Bypasses registry, breaks loot tables, prevents reuse
**Instead:** Always use `EntityRegistry.get(spawnId)` and `createEntityFromSpawn()`
**Detection:** `new Creature({ ... })` outside of ZonesService

### Anti-Pattern 4: Modifying Collision After Spawn
**What goes wrong:** Changing `collisions[][]` after spawn points are generated
**Why bad:** Spawn validation assumes collision map is final
**Instead:** Generate structures → update collisions → generate spawns (existing order)
**Detection:** `collisions[y][x] = true` after `generateSpawnPoints()` call

### Anti-Pattern 5: Server-Side Rendering Logic
**What goes wrong:** ZonesService tries to determine visual effects (bubbles, shaders)
**Why bad:** Server doesn't render, wastes bandwidth, couples logic
**Instead:** Server sends entity/tile IDs, client decides visuals based on local configuration
**Detection:** `particleEffects`, `shaderConfig` in ChunkData

## Scalability Considerations

### Entity Count
| Stage | Approach | Notes |
|-------|----------|-------|
| **Current (17 creatures)** | All entities in single file | Works fine, quick iteration |
| **50-100 entities** | Split by biome into subdirectories | `creatures/aquatic/`, `creatures/terrestrial/` |
| **100+ entities** | Index-based import from definitions/ | Auto-generate `ENTITY_IDS` from file glob |

### Biome Complexity
| Stage | Approach | Notes |
|-------|----------|-------|
| **10 biomes (current)** | Single `getBiome()` function with if/else tree | Clear, easy to reason about |
| **15-20 biomes** | Extract biome conditions into config objects | `{ temp: [0.6, 1.0], moisture: [0.8, 1.0], elevation: [0, 0.15] }` |
| **20+ biomes** | Multi-layer noise for biome regions | Use voroni regions + domain warping for distinct zones |

### Rendering Performance
| Concern | Current State | Aquatic Addition | Notes |
|---------|---------------|------------------|-------|
| **Tile count** | 64x64 = 4096 tiles per chunk | Same | No change |
| **Entity density** | 15-20 entities per chunk | 15-25 (aquatic denser) | Within LRU cache limits |
| **Sprite load** | ~40 unique entity sprites | +30 aquatic sprites | Preload in PreloadScene, minimal impact |
| **Shader effects** | None currently | Optional water shader | Use sparingly (fog, water ripple), test on low-end devices |

## New Components Required

### Required (Core Functionality)

1. **Aquatic Tile Definitions** (`packages/tiles/src/definitions/aquatic-tiles.ts`)
   - Shallow water, deep water, coral floor, kelp wall, reef formation
   - Export `ALL_AQUATIC_TILES` array

2. **Aquatic Entity Definitions** (`packages/entities/src/definitions/`)
   - `aquatic-creatures.ts` (~10 creature species)
   - `aquatic-plants.ts` (~15 plant species for kelp/coral/anemones)
   - `aquatic-minerals.ts` (~5 mineral types for salt/pearls/coral)

3. **Exotic Tile Definitions** (`packages/tiles/src/definitions/exotic-tiles.ts`)
   - Void ocean tiles, crystalline sea tiles, fungal abyss tiles

4. **Exotic Entity Definitions** (`packages/entities/src/definitions/`)
   - `exotic-creatures.ts` (~10 creatures for alien environments)
   - `exotic-plants.ts` (~10 plants for alien flora)

5. **Biome Type Extensions** (`packages/shared-types/src/game/biome.ts`)
   - Add 5-6 new BiomeType literals
   - Add entries to `BIOME_DISPLAY_NAMES` and `BIOME_COLORS`

6. **Spawn Configurations** (`packages/world-gen/src/generation/spawn.ts`)
   - Add entries to `BIOME_SPAWN_CONFIGS` for each new biome

7. **Terrain Mappings** (`packages/world-gen/src/generation/terrain.ts`)
   - Add entries to `BIOME_TILES` and `BIOME_TILE_IDS`
   - Add entries to `BIOME_ELEVATION_RANGES` (aquatic: low elevation)

8. **Biome Decision Logic** (`packages/world-gen/src/generation/biome.ts`)
   - Extend `getBiome()` with aquatic/exotic conditions

### Optional (Enhancement)

1. **Water Shader** (`apps/web/src/game/shaders/WaterShader.ts`)
   - Animated ripple effect for water tiles
   - Apply as post-processing to tile layer

2. **Bubble Particle System** (`apps/web/src/game/rendering/BubbleParticles.ts`)
   - Spawn bubbles on aquatic entity movement
   - Lightweight, pooled particle emitters

3. **Ambient Sound System** (`apps/web/src/game/audio/AmbientSound.ts`)
   - Play ocean ambience in aquatic biomes
   - Fade between biome audio zones

4. **Underwater Post-Processing** (`apps/web/src/game/rendering/UnderwaterFX.ts`)
   - Slight blue tint, vignette for deep water
   - Optional "diving" effect if player is in aquatic zone

## Integration Points

### 1. Biome Type Enum Extension
**File:** `packages/shared-types/src/game/biome.ts`
**Change Type:** Additive (append to union type)
**Impact:** TypeScript exhaustiveness checks will flag missing cases
**Testing:** Compile all packages, check for type errors

### 2. Entity Registry Population
**File:** `packages/entities/src/index.ts`
**Change Type:** Import and register new entity arrays
**Impact:** EntityRegistry.size increases, new entities available to spawn
**Testing:** Unit test `EntityRegistry.has('creature_brine_serpent')`

### 3. Spawn Configuration
**File:** `packages/world-gen/src/generation/spawn.ts`
**Change Type:** Add records to `BIOME_SPAWN_CONFIGS` object
**Impact:** New biomes will spawn entities/minerals
**Testing:** Call `generateSpawnPoints()` with aquatic biome, verify spawn variety

### 4. Tile Registry Population
**File:** `packages/tiles/src/index.ts`
**Change Type:** Import and register new tile arrays
**Impact:** TileRegistry.size increases, new tiles available to terrain gen
**Testing:** Unit test `TileRegistry.has('tidal_shallow_water')`

### 5. Terrain Tile Mapping
**File:** `packages/world-gen/src/generation/terrain.ts`
**Change Type:** Add records to `BIOME_TILES` and `BIOME_TILE_IDS`
**Impact:** Terrain generator will use new tiles for new biomes
**Testing:** Call `generateTerrain()`, verify tile IDs match aquatic biome

### 6. Biome Generation Logic
**File:** `packages/world-gen/src/generation/biome.ts`
**Change Type:** Add conditional branches to `getBiome()`
**Impact:** Aquatic biomes appear in procedural world
**Testing:** Call `getBiome()` with low elevation + high moisture coords, verify aquatic type

### 7. Asset Loading
**File:** `apps/web/src/game/scenes/PreloadScene.ts`
**Change Type:** Add `this.load.image()` calls for new textures
**Impact:** Textures available for rendering (otherwise uses color fallback)
**Testing:** Visual inspection in-game

### 8. Display Names and Colors
**File:** `packages/shared-types/src/game/biome.ts`
**Change Type:** Add entries to `BIOME_DISPLAY_NAMES` and `BIOME_COLORS`
**Impact:** HUD shows correct names, minimap uses correct colors
**Testing:** Enter aquatic biome, verify HUD and minimap display

## Build Order (Dependency-Aware)

### Phase 1: Type System Foundation
1. Add new `BiomeType` literals to `shared-types/src/game/biome.ts`
2. Add display names and colors for new biomes
3. Compile `shared-types` package

**Dependencies:** None
**Validation:** TypeScript compilation succeeds
**Why first:** All other packages depend on shared-types

### Phase 2: Static Content Definitions
4. Create aquatic tile definitions (`tiles/src/definitions/aquatic-tiles.ts`)
5. Create exotic tile definitions (`tiles/src/definitions/exotic-tiles.ts`)
6. Register new tiles in `tiles/src/index.ts`
7. Create aquatic entity definitions (creatures, plants, minerals)
8. Create exotic entity definitions (creatures, plants)
9. Register new entities in `entities/src/index.ts`

**Dependencies:** shared-types (for BiomeType)
**Validation:** Unit tests for registry lookups
**Why second:** Definitions have no logic dependencies

### Phase 3: World Generation Logic
10. Add biome conditions to `world-gen/src/generation/biome.ts` (`getBiome()`)
11. Add terrain tile mappings to `world-gen/src/generation/terrain.ts`
12. Add spawn configurations to `world-gen/src/generation/spawn.ts`
13. Add elevation ranges to `world-gen/src/generation/terrain.ts`

**Dependencies:** entities, tiles (for registry lookups)
**Validation:** Generate chunks, verify biome assignment + spawns
**Why third:** Generation logic requires entity/tile definitions

### Phase 4: Server Integration
14. No server changes needed (uses world-gen + entity packages)

**Dependencies:** world-gen
**Validation:** Server starts, generates aquatic chunks without errors
**Why fourth:** Server consumes world-gen output

### Phase 5: Client Rendering
15. Add texture loading to `web/src/game/scenes/PreloadScene.ts`
16. (Optional) Add water shader to `web/src/game/shaders/WaterShader.ts`
17. (Optional) Add particle effects to `web/src/game/rendering/BubbleParticles.ts`

**Dependencies:** Server (for entity/tile data)
**Validation:** Visual inspection, entities/tiles render correctly
**Why fifth:** Client depends on server data contracts

### Phase 6: Polish
18. Add ambient audio for aquatic biomes
19. Add underwater post-processing effects
20. Tune spawn densities based on playtesting

**Dependencies:** All previous phases
**Validation:** Player experience testing
**Why last:** Polish requires complete feature to evaluate

## Data Flow Changes

### Minimal Changes Required
The existing data flow is **fully compatible** with content expansion. No protocol changes, no database migrations, no API versions.

**What Changes:**
- Biome enum has more values
- EntityRegistry has more entries
- SpawnPoint.spawnId references new entity IDs

**What Doesn't Change:**
- ChunkData structure
- Entity interface (Creature, Plant, Mineral types unchanged)
- WebSocket event contracts
- Database schema (entity_lifecycle, ground_items)

### Example: Aquatic Creature Spawn Flow
```
1. Client moves to chunk (5, -3) → emits 'zone:subscribe'
2. Server: ZonesService.getChunk('z_5_-3')
3. LRU miss → ZonesService.loadZone('z_5_-3')
4. Calls: generateChunk(worldSeed, 5, -3)
   a. BiomeGenerator.getBiome(worldX, worldY) → 'tidal_pools' (NEW biome)
   b. SpawnGenerator uses BIOME_SPAWN_CONFIGS['tidal_pools'] (NEW config)
   c. Spawn point: { spawnId: 'creature_brine_serpent', x: 12, y: 8 }
5. ZonesService.createEntityFromSpawn(spawn, zoneId)
   a. EntityRegistry.get('creature_brine_serpent') → CreatureDefinition (NEW entity)
   b. Creates Creature instance with baseHealth, level, behavior
6. Server → Client: 'zone:data' with ChunkData + entities
7. WorldScene.onZoneData()
   a. TileRenderer uses TileRegistry.get('tidal_shallow_water') → tile color (NEW tile)
   b. EntityRenderer uses textureKey 'creature_brine_serpent' → sprite or color fallback
8. Phaser renders aquatic scene
```

**Key Insight:** Entire flow uses **lookup patterns** (registry.get, config[biome]). Adding content means adding lookup entries, not modifying flow logic.

## Migration Strategy

### Zero-Downtime Deployment
Because this is purely additive:
1. Deploy package changes (shared-types, entities, tiles, world-gen)
2. Restart server (new biomes now generate)
3. Client refreshes, loads new textures

**No database migration needed.** Existing chunks remain valid. New chunks use new biomes.

### Rollback Plan
If issues discovered:
1. Revert biome enum additions
2. Remove registry entries for new entities/tiles
3. Revert biome decision logic in `getBiome()`
4. Restart server

Existing chunks still load (old biomes unchanged). New chunks use old biome set.

## Testing Strategy

### Unit Tests
- `EntityRegistry.has()` for all new entity IDs
- `TileRegistry.has()` for all new tile IDs
- `generateSpawnPoints()` with aquatic biomes produces valid spawns
- `BiomeGenerator.getBiome()` returns aquatic types at low elevation

### Integration Tests
- Generate 100 chunks in aquatic region, verify biome distribution
- Generate chunk with aquatic biome, verify entity types match spawn config
- Load aquatic zone, verify entities materialize correctly

### Visual Tests
- Enter each new biome, screenshot for asset verification
- Verify tile colors/textures render
- Verify entity sprites/colors render
- Test fog of war interaction with water tiles

### Performance Tests
- Generate 1000 chunks, measure time (should be ~same as current)
- Load zone with 25 entities, measure frame rate (should be 60fps)
- Render 5 chunks on screen, measure draw calls (should be <1000)

## Confidence Assessment

**HIGH Confidence**
- **Reason:** All patterns are already proven in codebase (entity registration, biome generation, spawn configs)
- **Source:** Direct analysis of existing implementation
- **Risk:** Minimal – system designed for this exact use case

**Verification:**
- Existing biomes (miasma_marshes, petrified_expanse) added in same manner
- No architectural changes needed for Phase 81-82 creature additions (same pattern)
- Pattern matches recommendations from [Hytale procedural generation](https://hytale.com/news/2026/1/the-future-of-world-generation), [Subnautica](https://store.steampowered.com/app/264710/Subnautica/), and [Oceania 2D underwater procedural game](https://github.com/kaikue/Oceania)

## Known Limitations

### 1. No Vertical Water Layers
**Current:** Tiles are 2D with elevation property (0-5)
**Limitation:** Cannot have "surface water" above "underwater floor"
**Workaround:** Use biome transition (tidal_pools → deep_trenches) instead of vertical layers
**Future:** Would require 3D tile system or multi-layer rendering

### 2. No Fluid Dynamics
**Current:** Tiles are static, no flow simulation
**Limitation:** Water doesn't "flow" or create currents
**Workaround:** Use tile speed modifiers to simulate currents
**Future:** Add tile effect zones with directional force

### 3. Movement in Water
**Current:** Movement is grid-based with speed modifiers
**Limitation:** Swimming feels like slowed walking
**Workaround:** Use lower `movementSpeed` (0.6-0.7) for water tiles
**Future:** Add swim animation, different movement rules for aquatic zones

### 4. Shader Performance
**Current:** No tile shaders
**Limitation:** Water animation limited to sprite atlases
**Workaround:** Use animated sprite sheets for water tiles
**Future:** Phaser supports WebGL shaders, but test on low-end devices first

## Recommendations

### Critical Path
1. Start with **1-2 aquatic biomes** (tidal_pools, deep_trenches) to validate pattern
2. Add **5-10 creatures** to verify spawn system scales
3. Add **3-5 plants** to verify gatherable entity rendering
4. Expand to full content set once pattern validated

### Performance Optimization
- Use sprite atlases for entities (batch rendering)
- Defer shader effects until performance testing complete
- Monitor EntityRegistry size (target <200 entities for fast lookup)

### Content Creation Order
1. Biomes with unique gameplay (tidal_pools = new movement rules)
2. Biomes with visual distinctiveness (biolum_reef = glowing plants)
3. Biomes with lore significance (void_ocean = ties to game narrative)

## Sources

**Existing Codebase Analysis:**
- `/Users/krzysztof.kalamarski/Projects/into-the-void/packages/entities/src/` (entity system)
- `/Users/krzysztof.kalamarski/Projects/into-the-void/packages/world-gen/src/` (procedural generation)
- `/Users/krzysztof.kalamarski/Projects/into-the-void/apps/game-server/src/zones/zones.service.ts` (server integration)
- `/Users/krzysztof.kalamarski/Projects/into-the-void/apps/web/src/game/scenes/WorldScene.ts` (client rendering)

**Industry Patterns:**
- [Hytale World Generation](https://hytale.com/news/2026/1/the-future-of-world-generation) - Node-based procedural biome generation
- [Subnautica on Steam](https://store.steampowered.com/app/264710/Subnautica/) - Aquatic biome design reference
- [Oceania GitHub](https://github.com/kaikue/Oceania) - 2D procedural underwater sandbox
- [In Other Waters on Steam](https://store.steampowered.com/app/890720/In_Other_Waters) - Alien ocean ecosystem design
- [PC Gamer: Aquamarine](https://www.pcgamer.com/aquamarine-is-a-psychedelic-underwater-survival-game-inspired-by-mobius/) - Underwater survival mechanics
