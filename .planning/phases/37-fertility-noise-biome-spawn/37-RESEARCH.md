# Phase 37: Fertility Noise and Biome Spawn Quality - Research

**Researched:** 2026-02-18
**Domain:** Procedural world-gen (noise layers), spawn system, React HUD
**Confidence:** HIGH

## Summary

Phase 37 adds a fertility noise layer on top of the existing biome/spawn system. Fertility modulates spawn density (Barren → Normal → Lush) independently of biome type, so any biome can contain richly stocked or sparse sub-regions. A second `SimplexNoise` instance seeded from the world seed provides deterministic, seed-stable fertility values per world tile.

The spawn pipeline currently uses the chunk-center biome to pick spawn tables for every entity in a chunk. This violates success criterion 3 — tiles near biome edges pick entities from the wrong biome. Per-tile biome sampling (the same `biomeGenerator.getBiome(worldX, worldY)` call already used in `generateTerrain`) must be applied per spawn point rather than once per chunk. Both changes (fertility multiplier and per-tile biome sampling) are isolated to `packages/world-gen/src/generation/spawn.ts`, `BiomeGenerator`, and the `world-gen` index.

The HUD change (UIHD-01) requires adding a `fertilityType` field to `ZoneState`, computing it in `GameService.getZoneState()`, and updating `HUD.tsx` to render "Biome (Fertility)" using hysteresis already in place.

**Primary recommendation:** Add `getFertilityAt(worldX, worldY)` to `BiomeGenerator`, pass `BiomeGenerator` into `generateSpawnPoints()` as already done for terrain, apply per-tile biome sampling there, clamp counts to caps, and thread `fertilityType` through `ZoneState` → `HUD.tsx`.

## Standard Stack

No new libraries are required. All tools are already present in the codebase.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `SimplexNoise` (internal) | existing | Seeded 2D noise for fertility layer | Already used for terrain/biome; same constructor pattern |
| `BiomeGenerator` (internal) | existing | Manages multiple noise instances | Correct home for a new noise layer |
| `SeededRandom` (internal) | existing | Per-chunk random for spawn point placement | Already used in `generateSpawnPoints` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `BIOME_DISPLAY_NAMES` from `@into-the-void/shared-types` | existing | Human-readable biome name | Already imported in HUD.tsx |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Second `SimplexNoise` instance | Fractional Brownian Motion on existing noise | Would create correlation between biome and fertility — defeats the purpose of an independent layer |
| Per-tile spawn table selection | Per-chunk dominant biome | Faster but violates requirement SPWN-03 and success criterion 3 |

**Installation:**
No new packages required.

## Architecture Patterns

### Recommended Project Structure

Changes are confined to:

```
packages/world-gen/src/
├── generation/
│   ├── biome.ts          # Add fertilityNoise instance + getFertilityAt()
│   └── spawn.ts          # Accept BiomeGenerator; per-tile biome; fertility multiplier; caps
packages/shared-types/src/
├── core/
│   └── zone.ts           # Add fertilityType to ZoneState
apps/game-server/src/
└── game/
    └── game.service.ts   # Compute fertilityType in getZoneState()
apps/web/src/
└── ui/hud/
    └── HUD.tsx           # Render "Biome (Fertility)" from zoneState.fertilityType
```

### Pattern 1: Fourth Noise Instance on BiomeGenerator

**What:** Add a dedicated `SimplexNoise` instance seeded `${worldSeed}_fertility` inside `BiomeGenerator`. Expose `getFertilityAt(worldX, worldY): FertilityType` using a scale similar to moisture/temperature scales.

**When to use:** Any time spawn density needs to be spatially modulated independently of biome.

**Example:**
```typescript
// Source: packages/world-gen/src/generation/biome.ts (existing pattern)

// Existing pattern already used for temperature, moisture, elevation:
this.temperatureNoise = new SimplexNoise(`${worldSeed}_temp`);
this.moistureNoise   = new SimplexNoise(`${worldSeed}_moisture`);
this.elevationNoise  = new SimplexNoise(`${worldSeed}_elevation`);

// New — fertility follows the same idiom:
this.fertilityNoise  = new SimplexNoise(`${worldSeed}_fertility`);

// Fertility scale should be different from biome scales to avoid spatial correlation.
// A scale around 0.0012 (between temperature 0.001 and moisture 0.0015) works well.
private readonly FERTILITY_SCALE = 0.0012;

getFertilityAt(worldX: number, worldY: number): FertilityType {
  const raw = this.fertilityNoise.fbm(
    worldX * this.FERTILITY_SCALE,
    worldY * this.FERTILITY_SCALE,
    3   // 3 octaves: enough variation without tiny patches
  );
  const normalized = (raw + 1) / 2; // Map [-1, 1] → [0, 1]
  if (normalized < 0.33) return 'Barren';
  if (normalized < 0.66) return 'Normal';
  return 'Lush';
}
```

### Pattern 2: Fertility Multiplier in generateSpawnPoints()

**What:** Pass `BiomeGenerator` into `generateSpawnPoints()` (same signature change already done for `generateTerrain`). Apply a fertility multiplier to `creatureDensity` and `mineralDensity`, then clamp at caps AFTER density multiplication.

**When to use:** Every chunk generation call.

**Example:**
```typescript
// Source: packages/world-gen/src/generation/spawn.ts (to be modified)

const FERTILITY_MULTIPLIERS: Record<FertilityType, number> = {
  Barren: 0.5,
  Normal: 1.0,
  Lush:   1.5,
};

const SPAWN_CAPS = {
  creatures: 15,
  minerals:  10,
  plants:    5,
  artifacts: 2,
} as const;

export function generateSpawnPoints(
  worldSeed: string,
  chunkX: number,
  chunkY: number,
  biomeGenerator: BiomeGenerator,    // replaces `biome: BiomeType`
  collisionMap: boolean[][]
): SpawnPoint[] {
  // Sample fertility at chunk center (deterministic; spawn table and density
  // are chunk-level decisions — per-tile biome is only for table selection)
  const centerX = chunkX * ZONE_SIZE + ZONE_SIZE / 2;
  const centerY = chunkY * ZONE_SIZE + ZONE_SIZE / 2;
  const fertilityType = biomeGenerator.getFertilityAt(centerX, centerY);
  const multiplier = FERTILITY_MULTIPLIERS[fertilityType];

  // For each spawn point, sample biome at tile world coordinates (SPWN-03)
  // ...
  const worldX = chunkX * ZONE_SIZE + x;
  const worldY = chunkY * ZONE_SIZE + y;
  const tileBiome = biomeGenerator.getBiome(worldX, worldY);
  const config = BIOME_SPAWN_CONFIGS[tileBiome];
  // ...

  // Apply caps
  const rawCount = Math.round(config.creatureDensity * multiplier * (0.5 + random.next()));
  const creatureCount = Math.min(rawCount, SPAWN_CAPS.creatures);
}
```

**Important note on per-tile biome sampling for spawns**: The spawn loop generates positions with `findValidSpawnPosition()` which returns a random (x, y) within the chunk. Each position has a `worldX = chunkX * ZONE_SIZE + x` and `worldY = chunkY * ZONE_SIZE + y`. Call `biomeGenerator.getBiome(worldX, worldY)` at each position to pick the correct spawn table. This is the per-tile biome sampling required by SPWN-03.

### Pattern 3: FertilityType in ZoneState and HUD

**What:** Add `fertilityType` to `ZoneState` in shared-types. Compute it in `GameService.getZoneState()` using the existing `BiomeGenerator` lookup pattern. Update `HUD.tsx` to display `"Biome (Fertility)"`.

**When to use:** Any client that needs to know fertility for display or gameplay.

**Example (shared-types):**
```typescript
// Source: packages/shared-types/src/core/zone.ts

export type FertilityType = 'Barren' | 'Normal' | 'Lush';

export interface ZoneState {
  zoneId: string;
  entities: Entity[];
  players: PlayerPublic[];
  lastUpdate: number;
  chunk: ChunkData;
  biome: BiomeType;
  fertilityType: FertilityType;   // NEW
}
```

**Example (GameService):**
```typescript
// Source: apps/game-server/src/game/game.service.ts

// getFertilityAt requires a WorldGenerator (which wraps BiomeGenerator).
// Use the existing world-gen getBiome() pattern:
import { getBiome, getFertilityAtChunkCenter } from '@into-the-void/world-gen';
// OR: instantiate BiomeGenerator inline at chunk center coords
const biomeGen = new BiomeGenerator(this.zonesService.getWorldSeed());
const fertilityType = biomeGen.getFertilityAt(centerX, centerY);
```

**Example (HUD.tsx):**
```typescript
// Source: apps/web/src/ui/hud/HUD.tsx (existing biome-indicator block)

{displayedBiome && (
  <div className="biome-indicator">
    <span className="biome-dot" style={{ backgroundColor: BIOME_COLORS[displayedBiome] }} />
    <span className="biome-name">
      {BIOME_DISPLAY_NAMES[displayedBiome]}
      {zoneState?.fertilityType ? ` (${zoneState.fertilityType})` : ''}
    </span>
  </div>
)}
```

### Anti-Patterns to Avoid

- **Sampling fertility per-tile inside the spawn loop**: Fertility determines total density for the chunk, not per-tile. Sample once at chunk center for performance and consistency.
- **Using chunk-center biome for spawn table selection**: This is the current bug that SPWN-03 fixes. Each spawn point's biome must be sampled at the tile's world coordinates.
- **Applying caps before multiplier**: Caps are applied AFTER multiplying by the fertility factor. Applying caps first would reduce the multiplier's effectiveness.
- **Creating a new `BiomeGenerator` per spawn call in production**: `BiomeGenerator` creates three SimplexNoise instances; constructing it inside `generateSpawnPoints` on every call is expensive. The `WorldGenerator.generateChunk()` method already owns a single `BiomeGenerator` instance. Pass it through.
- **Adding fertility to `ChunkData`**: Fertility is a query-time value, not stored in the chunk. `ChunkData` is persisted/cached; fertility is deterministic and cheap to compute.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Seeded noise for fertility | Custom LCG or table-based noise | `SimplexNoise` from `packages/world-gen/src/noise/simplex.ts` | Already battle-tested in this codebase; `fbm()` gives multi-octave smoothness; string seed support matches worldSeed |
| Fertility string type | Ad-hoc string literals | `FertilityType = 'Barren' \| 'Normal' \| 'Lush'` union in shared-types | Type safety, co-located with `ZoneState`, re-used in `BiomeGenerator` and HUD |
| Zone-level density caps | Custom logic spread across multiple functions | `SPAWN_CAPS` constant object applied in `generateSpawnPoints` with `Math.min` | Single source of truth for cap values |

**Key insight:** The infrastructure for per-tile biome queries (`biomeGenerator.getBiome(worldX, worldY)`) already exists and is used in `generateTerrain`. The spawn system just needs to adopt the same call pattern. No new algorithms are needed.

## Common Pitfalls

### Pitfall 1: Changing generateSpawnPoints Signature Breaks WorldGenerator

**What goes wrong:** `generateSpawnPoints(worldSeed, chunkX, chunkY, biome, collisionMap)` is called in `WorldGenerator.generateChunk()` with a `BiomeType`. Changing the signature to accept `BiomeGenerator` requires updating the call site in `chunk.ts`.

**Why it happens:** The caller passes the chunk-center biome as a resolved value; the callee needs the generator to sample per-tile.

**How to avoid:** Update the call in `WorldGenerator.generateChunk()` to pass `this.biomeGenerator` instead of `biome`. The `biome` variable (dominant biome) is still needed for structures — don't remove it from `generateChunk()`.

**Warning signs:** TypeScript compiler errors at `generateSpawnPoints(this.worldSeed, chunkX, chunkY, biome, collisions)`.

### Pitfall 2: BiomeGenerator Not Exported from world-gen Index

**What goes wrong:** `GameService` needs to instantiate `BiomeGenerator` to compute fertility for `getZoneState()`. If `BiomeGenerator` is not re-exported from `packages/world-gen/src/index.ts`, the import fails.

**Why it happens:** `BiomeGenerator` is already exported (`export * from './generation/biome'`), so this is currently safe. But if a standalone `getFertilityAtChunkCenter()` helper is added to the index, it must also be exported.

**How to avoid:** Verify `packages/world-gen/src/index.ts` exports `BiomeGenerator` (it does — line 7: `export * from './generation/biome'`). Add any new exported functions to the index.

**Warning signs:** `Module '"@into-the-void/world-gen"' has no exported member 'BiomeGenerator'` at compile time.

### Pitfall 3: ZoneState fertilityType Missing for Zones Loaded Before the Update

**What goes wrong:** After adding `fertilityType` to `ZoneState`, existing in-memory zones (LRU cache) may be returned by `ZonesService.getZoneEntities()` before `GameService.getZoneState()` adds the field. The client receives `ZoneState` without `fertilityType`.

**Why it happens:** `ZoneState` is assembled fresh by `GameService.getZoneState()` on every call, not stored in the LRU cache. The LRU cache stores `{ chunk, entities }`. This means `fertilityType` is always computed fresh.

**How to avoid:** Confirm that `GameService.getZoneState()` is the only assembly point for `ZoneState`. Since it rebuilds from scratch, adding the field there is sufficient.

**Warning signs:** TypeScript strict null errors in HUD.tsx when `fertilityType` is undefined.

### Pitfall 4: Per-Tile Biome Sampling Causes Wrong Spawn Count Distribution

**What goes wrong:** If every spawn point samples a different biome, and biomes have very different `creatureDensity` values, chunks near biome boundaries may generate unexpected entity mixes.

**Why it happens:** The density decision (how many creatures total) should be based on the dominant chunk biome, not per-tile. Only the spawn table selection (which creature ID) should be per-tile.

**How to avoid:** Use chunk-center biome to determine `creatureDensity` and `mineralDensity`. Use per-tile biome only to select which entity (creature ID, mineral ID) from the spawn table. This is the design implied by SPWN-03.

**Warning signs:** Crystal biome chunks near void_plains boundaries spawning almost no entities despite being in crystal_caves territory.

### Pitfall 5: Hysteresis in HUD.tsx Lags Fertility Display

**What goes wrong:** The existing `HYSTERESIS_FRAMES = 3` check in HUD.tsx only re-renders when `zoneState.biome` changes. If `fertilityType` changes without `biome` changing (player moves within the same biome but crosses a fertility boundary), the display won't update.

**Why it happens:** Hysteresis is keyed only on `zoneState?.biome`.

**How to avoid:** The hysteresis check drives `displayedBiome` state. Fertility can be displayed directly from `zoneState?.fertilityType` without hysteresis (fertility changes are gradual and not flickery). Or add a parallel hysteresis for fertility. The simpler solution: display fertility directly from `zoneState?.fertilityType` inline — no separate state needed.

**Warning signs:** Player crosses fertility zone boundary, biome name stays same but fertility tier doesn't update.

## Code Examples

Verified patterns from codebase (not from external sources):

### Existing SimplexNoise Constructor Pattern
```typescript
// Source: packages/world-gen/src/generation/biome.ts (lines 33-36)
constructor(worldSeed: string, params: Partial<BiomeParams> = {}) {
  this.temperatureNoise = new SimplexNoise(`${worldSeed}_temp`);
  this.moistureNoise    = new SimplexNoise(`${worldSeed}_moisture`);
  this.elevationNoise   = new SimplexNoise(`${worldSeed}_elevation`);
  // Add: this.fertilityNoise = new SimplexNoise(`${worldSeed}_fertility`);
}
```

### Existing fbm Normalize Pattern
```typescript
// Source: packages/world-gen/src/generation/biome.ts (lines 43-48)
getTemperature(worldX: number, worldY: number): number {
  const raw = this.temperatureNoise.fbm(
    worldX * this.params.temperatureScale,
    worldY * this.params.temperatureScale,
    4
  );
  return (raw + 1) / 2; // Normalize to 0-1
}
// getFertilityAt() follows the same pattern with a different scale and 3 octaves
```

### Per-Tile Biome Query Already Used in Terrain
```typescript
// Source: packages/world-gen/src/generation/terrain.ts (lines 148-153)
for (let x = 0; x < ZONE_SIZE; x++) {
  const worldX = chunkX * ZONE_SIZE + x;
  const worldY = chunkY * ZONE_SIZE + y;
  // Sample biome for this specific tile based on world coordinates
  const biome = biomeGenerator.getBiome(worldX, worldY);
  // The spawn system needs to replicate this per-tile biome query
}
```

### Existing BiomeGenerator Pass-Through in WorldGenerator
```typescript
// Source: packages/world-gen/src/generation/chunk.ts (lines 30-36)
// generateTerrain already receives biomeGenerator as a parameter:
const { tiles, heights, collisions } = generateTerrain(
  this.worldSeed,
  chunkX,
  chunkY,
  this.biomeGenerator   // <-- biomeGenerator passed in
);
// generateSpawnPoints must adopt this same pattern
```

### HUD.tsx Biome Display Block (to be modified)
```typescript
// Source: apps/web/src/ui/hud/HUD.tsx (lines 87-95)
{displayedBiome && (
  <div className="biome-indicator">
    <span className="biome-dot"
      style={{ backgroundColor: BIOME_COLORS[displayedBiome] }} />
    <span className="biome-name">{BIOME_DISPLAY_NAMES[displayedBiome]}</span>
    {/* UIHD-01: append "(Fertility)" */}
  </div>
)}
```

### ZoneState Biome Field Pattern (to be extended with fertilityType)
```typescript
// Source: apps/game-server/src/game/game.service.ts (lines 85-104)
async getZoneState(zoneId: string): Promise<ZoneState> {
  const biome = getBiome(this.zonesService.getWorldSeed(), x, y);
  return { zoneId, entities, players, lastUpdate: Date.now(), chunk, biome };
  // Add: fertilityType computed from BiomeGenerator.getFertilityAt(centerX, centerY)
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Chunk-center biome for all spawn decisions | Per-tile biome for table selection + chunk-center for density | Phase 37 | Biome-edge tiles spawn correct entities |
| Single uniform spawn density per biome | Fertility-multiplied density with hard caps | Phase 37 | Lush areas visibly richer; Barren areas sparser |
| HUD shows "Biome Name" only | HUD shows "Biome Name (Fertility)" | Phase 37 | Player can see fertility tier they are in |

**Deprecated/outdated after this phase:**
- `generateSpawnPoints(worldSeed, chunkX, chunkY, biome: BiomeType, collisionMap)` signature: replaced with `BiomeGenerator` parameter.

## Open Questions

1. **Should fertility sampling in getZoneState use player tile or chunk center?**
   - What we know: Success criterion 1 says "updates when the player crosses into a different fertility zone." The zone IS the chunk, so the zone's fertility is a property of the chunk, not the player's tile.
   - What's unclear: If fertility at chunk center doesn't match what the player sees at their tile, the HUD could show a different fertility than the area around the player.
   - Recommendation: Sample at chunk center for `ZoneState.fertilityType` (zone-level property). The display updates when the player enters a new zone. This is consistent with the biome display pattern. Per-tile fertility for HUD is deferred complexity (lore-consistent: field teams get a zone report, not per-tile readings).

2. **Should FertilityType be added to lore?**
   - What we know: The lore/world-bible.md does not mention fertility. The lore describes biomes as having "distinct resource profiles" — fertility tiers are consistent with this but not named.
   - What's unclear: Whether the fertility tier names (Barren/Normal/Lush) need in-lore flavor text.
   - Recommendation: CLAUDE.md requires asking about lore changes. The planner should flag this for the user: "Should Fertility Tier be reflected in lore/world-bible.md? Current plan uses Barren/Normal/Lush as mechanical labels with no lore entry." This is a lore expansion question, not a blocker.

3. **Density cap enforcement — hard stop or soft truncation?**
   - What we know: SPWN-05 requires caps of 15 creatures / 10 minerals / 5 plants / 2 artifacts per chunk regardless of fertility.
   - What's unclear: Whether existing zones that were generated without caps could exceed them on respawn.
   - Recommendation: Apply caps inside `generateSpawnPoints()` using `Math.min(count, cap)`. Zones already in the LRU cache will regenerate on next load with capped counts. No migration needed — caps apply at generation time, not retroactively.

## Sources

### Primary (HIGH confidence)
- `/packages/world-gen/src/noise/simplex.ts` — SimplexNoise constructor, noise2D, fbm API confirmed by code read
- `/packages/world-gen/src/generation/biome.ts` — BiomeGenerator pattern, multiple noise instances, fbm normalize pattern
- `/packages/world-gen/src/generation/spawn.ts` — Current spawn signature, density logic, absence of fertility/caps
- `/packages/world-gen/src/generation/terrain.ts` — Per-tile biome sampling pattern (the gold standard to replicate in spawn)
- `/packages/world-gen/src/generation/chunk.ts` — WorldGenerator.generateChunk() call sites; biomeGenerator already passed to generateTerrain
- `/packages/shared-types/src/core/zone.ts` — ZoneState interface; biome field present; fertilityType absent
- `/apps/web/src/ui/hud/HUD.tsx` — Biome display block; hysteresis pattern; zoneState.biome field usage
- `/apps/game-server/src/game/game.service.ts` — getZoneState() assembly point; getBiome() call pattern
- `/apps/game-server/src/zones/zones.service.ts` — LRU cache for zone state; ZoneState assembled in GameService not here
- `/.planning/REQUIREMENTS.md` — SPWN-01/02/03/05 and UIHD-01 requirement text confirmed
- `/lore/world-bible.md` — No lore entry for fertility; biomes described as having "distinct resource profiles" (consistent but unnamed)

### Secondary (MEDIUM confidence)
- Phase context (provided): fertility is static/baked at world-gen time; dynamic fertility deferred; decision irreversible without data migration

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries; everything uses existing SimplexNoise and BiomeGenerator patterns
- Architecture: HIGH — changes are confined to world-gen spawn.ts, biome.ts, shared-types zone.ts, game.service.ts, HUD.tsx; patterns are direct extensions of existing code
- Pitfalls: HIGH — all pitfalls identified from direct code reading of the affected files; no speculation required
- Open questions: LOW — questions are design choices, not technical unknowns; two are informational, one is lore-related

**Research date:** 2026-02-18
**Valid until:** 2026-03-18 (stable code; no fast-moving dependencies)
