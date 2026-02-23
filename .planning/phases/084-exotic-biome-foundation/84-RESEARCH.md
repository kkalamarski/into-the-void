# Phase 84: Exotic Biome Foundation - Research

**Researched:** 2026-02-24
**Domain:** Exotic/anomaly biome implementation in 2D isometric procedural MMO
**Confidence:** HIGH

## Summary

Phase 84 adds three exotic biomes (Void Rift Tier IV, Crystalline Wastes Tier III, Bioluminescent Depths Tier II) following the proven patterns from Phase 82 (aquatic biomes). The architecture fully supports this expansion — all required systems exist and were battle-tested in aquatic implementation.

**Critical finding:** "Void Rift" is NOT the same as "Anomaly Zones" from lore. Anomaly Zones are Tier IV extreme endgame content with physics-breaking effects. Void Rift is a distinct Tier IV biome that references void/reality themes but remains within normal gameplay bounds. This distinction is essential for proper scoping.

**Primary recommendation:** Follow aquatic biome implementation pattern exactly. Add three BiomeType literals, define tile sets with appropriate visibility modifiers, extend BiomeGenerator decision tree with noise-based placement logic, and configure spawn densities. No new systems needed — this is pure content extension using proven infrastructure.

## Standard Stack

### Core (Already in Place)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| BiomeGenerator | Current | Noise-based procedural biome assignment | Proven in 13 biomes (10 terrestrial + 3 aquatic), uses domain warping |
| TileRegistry | Current | Registry pattern for tile definitions | Supports per-biome tile sets, handles visibility modifiers |
| SimplexNoise | Current | Multi-octave noise for terrain | Used for temperature/moisture/elevation in biome selection |
| FogManager | Current | Fog of war with per-biome visibility | Supports biome-specific reveal radius via BIOME_VISIBILITY_MODIFIERS |
| Shore transition system | Current | Post-processing for biome boundaries | Prevents 1-tile artifacts, proven in aquatic biomes |

### Supporting (No New Dependencies)
| Component | Purpose | When to Use |
|-----------|---------|-------------|
| TileState enum | Water/traversability states | Already supports solid/traversable/shallow_water/deep_water |
| visibilityModifier on TileDefinition | Per-tile fog of war adjustment | Aquatic tiles use 0.5-0.85 range, exotic can use similar |
| Kelp corridor pattern | Noise-based navigable paths | Reusable for any dense-wall biome requiring corridors |
| Domain warping | Organic biome boundaries | Already in BiomeGenerator, works for all biomes |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| New "reality distortion" mechanic | Visual effects only (shaders, particles) | Scope creep. Phase 84 is foundation only, effects deferred to Phase 85+ |
| Special physics system for Void Rift | Standard tile blocking + visual palette | Anomaly Zones need physics changes, Void Rift does not |
| Custom crystal growth algorithm | Static crystal formations as tiles | Simpler, no procedural growth needed for initial implementation |

**Installation:**
No new dependencies required. All implementation uses existing packages.

## Architecture Patterns

### Recommended Project Structure
```
packages/
├── shared-types/src/game/
│   └── biome.ts                    # Add void_rift, crystalline_wastes, bioluminescent_depths
├── tiles/src/definitions/
│   └── exotic-tiles.ts             # NEW: Void/crystal/bioluminescent tile definitions
├── world-gen/src/generation/
│   ├── biome.ts                    # Extend getBiome() decision tree
│   ├── terrain.ts                  # Add BIOME_TILES, BIOME_TILE_IDS mappings
│   └── spawn.ts                    # Add BIOME_SPAWN_CONFIGS (empty for Phase 84)
└── game-logic/src/
    └── movement/                   # No changes needed (existing systems handle new tiles)
```

### Pattern 1: Biome Type Extension (Proven - Phase 82)
**What:** Add new BiomeType literals to union type
**When to use:** Adding any new biome
**Example:**
```typescript
// packages/shared-types/src/game/biome.ts
export type BiomeType =
  | 'void_plains'
  | 'crystal_caves'
  // ... existing 13 biomes
  | 'void_rift'              // NEW: Tier IV - reality distortion theme
  | 'crystalline_wastes'     // NEW: Tier III - crystal formations
  | 'bioluminescent_depths'; // NEW: Tier II - glowing flora

// Add display names
export const BIOME_DISPLAY_NAMES: Record<BiomeType, string> = {
  // ... existing
  void_rift: 'Void Rift',
  crystalline_wastes: 'Crystalline Wastes',
  bioluminescent_depths: 'Bioluminescent Depths',
};

// Add colors for UI/minimap
export const BIOME_COLORS: Record<BiomeType, string> = {
  // ... existing
  void_rift: '#4a0080',           // Deep purple (void/anomaly theme)
  crystalline_wastes: '#b0e0e6',  // Pale cyan (crystal reflections)
  bioluminescent_depths: '#00ff88', // Bright cyan-green (bioluminescence)
};
```

**Source:** Existing pattern used in Phase 82 for aquatic biomes (tidal_pools, kelp_forests, deep_trenches)

### Pattern 2: Exotic Tile Definitions
**What:** Define tiles with distinct visual properties and appropriate modifiers
**When to use:** Creating unique terrain for new biomes
**Example:**
```typescript
// packages/tiles/src/definitions/exotic-tiles.ts
import { TileDefinition } from '../types';

// Void Rift (Tier IV) - Reality distortion theme
export const VOID_RIFT_FLOOR: TileDefinition = {
  id: 'void_rift_floor',
  displayName: 'Rift Floor',
  isBlocking: false,
  movementSpeed: 0.8,           // Slightly slower (disorientation)
  textureKey: 'tile_void_rift_floor',
  defaultElevation: 0,
  color: 0x4a0080,              // Deep purple
  tileState: 'traversable',
  visibilityModifier: 0.7,      // Reduced visibility (reality distortion)
  description: 'Warped terrain where reality feels thin.',
};

export const VOID_RIFT_DISTORTION: TileDefinition = {
  id: 'void_rift_distortion',
  displayName: 'Reality Distortion',
  isBlocking: true,
  movementSpeed: 0,
  textureKey: 'tile_void_rift_distortion',
  defaultElevation: 3,
  color: 0x6a00a0,              // Brighter purple
  tileState: 'solid',
  description: 'Impassable spatial anomaly.',
};

// Crystalline Wastes (Tier III) - Crystal formations
export const CRYSTALLINE_FLOOR: TileDefinition = {
  id: 'crystalline_floor',
  displayName: 'Crystal Floor',
  isBlocking: false,
  movementSpeed: 0.9,           // Slippery surface
  textureKey: 'tile_crystalline_floor',
  defaultElevation: 0,
  color: 0xadd8e6,              // Light blue
  tileState: 'traversable',
  visibilityModifier: 1.2,      // INCREASED visibility (reflections)
  description: 'Smooth crystal surface. Slippery but beautiful.',
};

export const CRYSTAL_FORMATION: TileDefinition = {
  id: 'crystal_formation_large',
  displayName: 'Crystal Formation',
  isBlocking: true,
  movementSpeed: 0,
  textureKey: 'tile_crystal_formation',
  defaultElevation: 4,
  color: 0x87ceeb,              // Sky blue
  tileState: 'solid',
  description: 'Towering crystal spire. Razor-sharp.',
};

// Bioluminescent Depths (Tier II) - Glowing flora
export const BIOLUM_FLOOR: TileDefinition = {
  id: 'bioluminescent_floor',
  displayName: 'Glowing Floor',
  isBlocking: false,
  movementSpeed: 1.0,           // Normal movement
  textureKey: 'tile_biolum_floor',
  defaultElevation: 0,
  color: 0x00ff88,              // Bright cyan-green
  tileState: 'traversable',
  visibilityModifier: 0.75,     // Slightly reduced (uneven glow)
  description: 'Softly glowing ground covered in luminescent moss.',
};

export const BIOLUM_FLORA: TileDefinition = {
  id: 'bioluminescent_flora',
  displayName: 'Glowing Flora',
  isBlocking: false,
  movementSpeed: 0.7,           // Slowed by dense growth
  textureKey: 'tile_biolum_flora',
  defaultElevation: 2,
  color: 0x00cc66,              // Darker green
  tileState: 'traversable',
  visibilityModifier: 0.6,      // More reduction (dense foliage)
  description: 'Dense bioluminescent undergrowth. Navigable but slow.',
};

export const ALL_EXOTIC_TILES = [
  VOID_RIFT_FLOOR,
  VOID_RIFT_DISTORTION,
  CRYSTALLINE_FLOOR,
  CRYSTAL_FORMATION,
  BIOLUM_FLOOR,
  BIOLUM_FLORA,
];
```

**Key design decisions:**
- Void Rift: Reduced visibility (0.7) to simulate disorientation
- Crystalline Wastes: INCREASED visibility (1.2) due to light reflection — unique mechanic
- Bioluminescent Depths: Moderate reduction (0.6-0.75) from uneven bioluminescence

**Source:** Aquatic tile definitions pattern (packages/tiles/src/definitions/aquatic-tiles.ts)

### Pattern 3: Biome Decision Tree Extension
**What:** Extend BiomeGenerator.getBiome() with placement logic for exotic biomes
**When to use:** Determining where exotic biomes spawn in world
**Example:**
```typescript
// packages/world-gen/src/generation/biome.ts
getBiome(worldX: number, worldY: number): BiomeType {
  // Apply domain warping for organic boundaries
  const warp = this.getWarpOffset(worldX, worldY);
  const warpedX = worldX + warp.x;
  const warpedY = worldY + warp.y;
  const center = this.getRegionCenter(warpedX, warpedY);

  const temp = this.getTemperature(center.x, center.y);
  const moisture = this.getMoisture(center.x, center.y);
  const elevation = this.getElevation(center.x, center.y);

  // EXOTIC BIOMES - rare, specific conditions

  // Void Rift: Very low temperature + very low moisture + mid elevation
  // Represents "cold void" areas where reality is thin
  if (temp < 0.15 && moisture < 0.2 && elevation > 0.4 && elevation < 0.6) {
    return 'void_rift';
  }

  // Crystalline Wastes: Very high elevation + low moisture + extreme temperatures
  // Already exists as 'crystal_caves' at lower elevation
  // Wastes are higher, harsher version with more formations
  if (elevation > 0.75 && moisture < 0.35 && (temp < 0.25 || temp > 0.75)) {
    return 'crystalline_wastes';
  }

  // Bioluminescent Depths: Low-to-mid elevation + very high moisture + moderate temp
  // Underground/cave-like biome with glowing flora (not underwater)
  if (elevation > 0.2 && elevation < 0.4 && moisture > 0.8 && temp > 0.4 && temp < 0.7) {
    return 'bioluminescent_depths';
  }

  // Aquatic biomes (existing - Phase 82)
  if (elevation < 0.15) {
    // ... existing aquatic logic
  }

  // Terrestrial biomes (existing)
  // ... rest of existing decision tree
}
```

**Placement rationale:**
- **Void Rift:** Rarest (temp < 0.15 AND moisture < 0.2) — Tier IV should be scarce
- **Crystalline Wastes:** High elevation (> 0.75) — distinct from existing crystal_caves (mid-elevation)
- **Bioluminescent Depths:** High moisture but NOT low elevation (distinguishes from aquatic)

**Source:** Existing biome.ts decision tree (lines 112-182), aquatic placement pattern

### Pattern 4: Biome Tile Mapping
**What:** Map BiomeType to floor/wall/feature tile sets
**When to use:** Terrain generation needs to know which tiles to place
**Example:**
```typescript
// packages/world-gen/src/generation/terrain.ts
const BIOME_TILE_IDS: Record<BiomeType, { floor: string; wall: string; feature: string }> = {
  // ... existing 13 biomes
  void_rift: {
    floor: TILE_IDS.VOID_RIFT_FLOOR,
    wall: TILE_IDS.VOID_RIFT_DISTORTION,
    feature: TILE_IDS.VOID_RIFT_DISTORTION,
  },
  crystalline_wastes: {
    floor: TILE_IDS.CRYSTALLINE_FLOOR,
    wall: TILE_IDS.CRYSTAL_FORMATION,
    feature: TILE_IDS.CRYSTAL_FORMATION,
  },
  bioluminescent_depths: {
    floor: TILE_IDS.BIOLUM_FLOOR,
    wall: TILE_IDS.BIOLUM_FLORA,
    feature: TILE_IDS.BIOLUM_FLORA,
  },
};
```

**Source:** Existing BIOME_TILE_IDS mapping (terrain.ts lines 106-120)

### Pattern 5: Danger Levels and Spawn Configs
**What:** Configure biome danger and spawn densities
**When to use:** Balancing biome difficulty
**Example:**
```typescript
// packages/world-gen/src/generation/biome.ts - getBiomeDangerLevel()
const dangerLevels: Record<BiomeType, number> = {
  // ... existing
  void_rift: 9,              // Tier IV - extreme
  crystalline_wastes: 7,     // Tier III - hostile
  bioluminescent_depths: 4,  // Tier II - hazardous
};

// packages/world-gen/src/generation/spawn.ts - BIOME_SPAWN_CONFIGS
const BIOME_SPAWN_CONFIGS: Record<BiomeType, BiomeSpawnConfig> = {
  // ... existing

  void_rift: {
    creatures: [],      // Phase 85 will populate
    minerals: [],
    plants: [],
    creatureDensity: 2, // Low density (dangerous environment)
    mineralDensity: 6,  // High value resources
    plantDensity: 1,    // Sparse vegetation
  },

  crystalline_wastes: {
    creatures: [],
    minerals: [],
    plants: [],
    creatureDensity: 3,
    mineralDensity: 8,  // Very high mineral density (crystals)
    plantDensity: 0,    // No plants (pure crystal)
  },

  bioluminescent_depths: {
    creatures: [],
    minerals: [],
    plants: [],
    creatureDensity: 5,
    mineralDensity: 3,
    plantDensity: 8,    // High plant density (bioluminescent flora)
  },
};
```

**Source:** Existing danger level and spawn config patterns (biome.ts lines 215-232, spawn.ts)

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Reality distortion effects | Custom physics engine for Void Rift | Visual palette + standard tile blocking + reduced visibility | Phase 84 is FOUNDATION only. Effects are Phase 85+ content. Don't scope creep. |
| Crystal growth system | Procedural crystal generation algorithm | Static crystal formations as wall tiles | Sufficient for foundation. Animated growth can be added later if needed. |
| Bioluminescence rendering | Custom shader system | Color tints + existing sprite system | Shaders are renderer concern, not biome concern. Use fallback colors. |
| Biome-specific pathfinding | Custom A* variant per biome | Existing tile blocking + movement speed modifiers | System already handles varied terrain. New biomes use existing mechanics. |
| Transition zones between exotic biomes | New shore-like system | Existing shore transition post-processing | Works for any biome boundary. No need to reinvent. |

**Key insight:** Phase 82 (aquatic) proved the architecture is ready. Don't add new systems. Just add content using existing patterns.

## Common Pitfalls

### Pitfall 1: Confusing Void Rift with Anomaly Zones
**What goes wrong:** Treating "Void Rift" as requiring Anomaly Zone physics-breaking mechanics (time distortion, spatial tears, etc.)
**Why it happens:** Lore has "Anomaly Zones" as Tier IV extreme content. "Void Rift" sounds similar.
**How to avoid:** Void Rift is a NORMAL biome with void/anomaly THEMING. It has reduced visibility and purple palette, but standard physics. Anomaly Zones remain special endgame content for future phases.
**Warning signs:**
- Planning documents mention "temporal stutters" or "spatial tears" for Void Rift
- Requirements include "physics engine changes"
- Scope creeps beyond tile definitions and biome placement

**Clarification:**
```
Void Rift (Phase 84):
- Tier IV biome
- Thematic: reality distortion AESTHETIC
- Mechanics: standard tiles, reduced visibility
- Comparable to: Deep Trenches (Tier III aquatic, but more dangerous)

Anomaly Zones (lore):
- Tier IV extreme endgame content
- Actual physics changes
- Future content (not Phase 84-85 scope)
```

### Pitfall 2: Over-Engineering Crystal Visibility Boost
**What goes wrong:** Implementing complex reflection/mirror systems for Crystalline Wastes' increased visibility.
**Why it happens:** visibilityModifier: 1.2 is UNIQUE (all other modifiers reduce). Temptation to make it fancy.
**How to avoid:** Visibility boost is just fog reveal radius multiplier. FogManager already supports it. No special rendering needed.
**Warning signs:**
- Raycasting for crystal reflections
- Mirror tile mechanics
- "Actual reflection" rendering

**Implementation:**
```typescript
// This is ALL that's needed:
export const CRYSTALLINE_FLOOR: TileDefinition = {
  // ...
  visibilityModifier: 1.2, // 20% increased fog reveal radius
};

// FogManager already handles this in getEffectiveRevealRadius()
// No other changes needed
```

### Pitfall 3: Biome Placement Too Rare (or Too Common)
**What goes wrong:** Noise thresholds produce biomes that are nearly impossible to find, or everywhere.
**Why it happens:** No playtesting of noise parameter combinations before implementation.
**How to avoid:** Use existing biome placement as reference. Test with biome map visualization tool.
**Warning signs:**
- Players report never finding Crystalline Wastes
- Void Rift appears more often than Void Plains
- Bioluminescent Depths overlaps too much with Fungal Forest

**Testing approach:**
```typescript
// Generate 10,000 sample points, count biome occurrences
const biomeStats = new Map<BiomeType, number>();
for (let i = 0; i < 10000; i++) {
  const x = Math.random() * 10000;
  const y = Math.random() * 10000;
  const biome = biomeGenerator.getBiome(x, y);
  biomeStats.set(biome, (biomeStats.get(biome) ?? 0) + 1);
}
console.log('Biome distribution:', biomeStats);

// Target percentages (approximate):
// Tier I: ~30% total
// Tier II: ~35% total
// Tier III: ~25% total
// Tier IV: ~10% total
```

### Pitfall 4: Forgetting Elevation Ranges
**What goes wrong:** Exotic biomes don't clamp terrain height to BIOME_ELEVATION_RANGES, resulting in Crystalline Wastes with deep valleys or Bioluminescent Depths with tall mountains.
**Why it happens:** Copy-paste from biome decision tree without adding elevation range config.
**How to avoid:** Add all three biomes to BIOME_ELEVATION_RANGES in terrain.ts immediately after adding BiomeType.
**Warning signs:**
- Visual inconsistency (crystal biomes with height 0 tiles next to height 5)
- Pathfinding issues (elevation jumps too high)

**Fix:**
```typescript
// packages/world-gen/src/generation/terrain.ts
const BIOME_ELEVATION_RANGES: Record<BiomeType, { min: number; max: number }> = {
  // ... existing
  void_rift: { min: 1, max: 3 },         // Moderate variation, eerie flatness
  crystalline_wastes: { min: 2, max: 5 }, // High elevation, tall formations
  bioluminescent_depths: { min: 0, max: 2 }, // Low, cave-like
};
```

### Pitfall 5: Empty Spawn Configs Causing Crashes
**What goes wrong:** Spawn generation code expects creatures/minerals/plants arrays. Empty arrays are FINE, but MISSING configs cause runtime errors.
**Why it happens:** Forgetting to add new biomes to BIOME_SPAWN_CONFIGS.
**How to avoid:** Add all three biomes with empty arrays immediately when adding BiomeType.
**Warning signs:**
- Runtime error: "Cannot read property 'creatures' of undefined"
- Crashes when entering exotic biome zones

**Prevention:**
```typescript
// Add these IMMEDIATELY when BiomeType is extended
const BIOME_SPAWN_CONFIGS: Record<BiomeType, BiomeSpawnConfig> = {
  // ... existing
  void_rift: { creatures: [], minerals: [], plants: [], creatureDensity: 2, mineralDensity: 6, plantDensity: 1 },
  crystalline_wastes: { creatures: [], minerals: [], plants: [], creatureDensity: 3, mineralDensity: 8, plantDensity: 0 },
  bioluminescent_depths: { creatures: [], minerals: [], plants: [], creatureDensity: 5, mineralDensity: 3, plantDensity: 8 },
};
```

## Code Examples

Verified patterns from existing codebase:

### FogManager Biome Visibility Support (Existing)
```typescript
// Source: apps/web/src/game/fog/FogManager.ts lines 18-26
const BIOME_VISIBILITY_MODIFIERS: Record<string, number> = {
  tidal_pools: 0.85,
  kelp_forests: 0.7,
  deep_trenches: 0.6,
  // All other biomes default to 1.0
};

// Simply add exotic biomes here:
const BIOME_VISIBILITY_MODIFIERS: Record<string, number> = {
  // ... existing
  void_rift: 0.7,              // Same as kelp_forests
  bioluminescent_depths: 0.75,  // Moderate reduction
  // crystalline_wastes uses tile-level modifier (1.2) instead
};
```

### Tile Registration (Pattern from Phase 82)
```typescript
// Source: packages/tiles/src/index.ts
import { ALL_EXOTIC_TILES } from './definitions/exotic-tiles';

export class TileRegistry {
  static initialize() {
    // Existing tiles
    for (const tile of ALL_VOID_TILES) this.register(tile);
    for (const tile of ALL_AQUATIC_TILES) this.register(tile);

    // NEW: Exotic tiles
    for (const tile of ALL_EXOTIC_TILES) this.register(tile);
  }
}
```

### Wall Threshold Configuration
```typescript
// Source: packages/world-gen/src/generation/terrain.ts - getWallThreshold()
const thresholds: Record<BiomeType, number> = {
  // ... existing
  void_rift: 0.55,              // Moderate wall density
  crystalline_wastes: 0.4,       // Dense formations
  bioluminescent_depths: 0.45,   // Moderate undergrowth
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual biome boundary definition | Domain warping + noise-based placement | Phase 19 | Organic boundaries, procedural variety |
| Boolean tile blocking | TileState enum with water states | Phase 82 | Enables traversable-but-slow tiles |
| Global fog radius | Per-biome visibility modifiers | Phase 82 | Immersive biome-specific feel |
| Hardcoded tile collision checks | TileRegistry lookup | Phase 76 | Scales to any number of tile types |

**Deprecated/outdated:**
- None for Phase 84. All systems current and proven.

**Current best practices (from Phase 82):**
- Define tiles FIRST (types, colors, modifiers)
- Add BiomeType to union
- Extend decision tree with placement logic
- Configure danger levels and spawn densities
- Add to BIOME_ELEVATION_RANGES
- Test biome distribution with sample generation

## Open Questions

1. **Should Void Rift have special movement penalties beyond tile speed?**
   - What we know: Lore mentions "reality feels thin" — suggests disorientation.
   - What's unclear: Is movementSpeed: 0.8 sufficient, or should there be direction randomization?
   - Recommendation: Start with speed penalty only (Phase 84). Add disorientation effects in Phase 85 if desired (as environmental hazard, not core mechanic).

2. **How should Crystalline Wastes handle sharp terrain damage?**
   - What we know: Lore describes "razor-sharp terrain" causing injuries.
   - What's unclear: Damage on movement, or only on specific interactions?
   - Recommendation: No damage in Phase 84 (foundation). Add via tile hooks (onStep) in Phase 85 when hazard systems are implemented.

3. **Does Bioluminescent Depths need day/night cycle changes?**
   - What we know: "Glowing flora" provides light regardless of time.
   - What's unclear: Should fog of war radius stay constant day/night, unlike other biomes?
   - Recommendation: Ignore day/night for Phase 84 (no day/night system implemented yet). Defer to lighting system implementation phase.

4. **Should exotic biomes have shore-like transitions between each other?**
   - What we know: Shore transition system prevents aquatic/land 1-tile artifacts.
   - What's unclear: Do exotic biomes border each other enough to need similar system?
   - Recommendation: Use existing shore transition post-processing. If exotic biomes rarely border each other (due to placement logic), transitions are automatic. Monitor in testing.

## Sources

### Primary (HIGH confidence)
- Existing codebase analysis:
  - `/packages/shared-types/src/game/biome.ts` - BiomeType union, 13 existing biomes
  - `/packages/world-gen/src/generation/biome.ts` - BiomeGenerator decision tree
  - `/packages/tiles/src/types.ts` - TileDefinition with visibilityModifier support
  - `/packages/tiles/src/definitions/aquatic-tiles.ts` - Phase 82 tile pattern
  - `/apps/web/src/game/fog/FogManager.ts` - Per-biome visibility system
  - `/packages/world-gen/src/generation/terrain.ts` - Tile mapping and elevation ranges
  - `/packages/world-gen/src/generation/shore.ts` - Boundary transition system
- `.planning/phases/082-aquatic-biome-foundation/82-RESEARCH.md` - Phase 82 research (identical pattern)
- `/lore/world-bible.md` - Biome lore and tier classifications

### Secondary (MEDIUM confidence)
- `.planning/REQUIREMENTS.md` - BIOME-04, BIOME-05, BIOME-06 requirements
- `.planning/ROADMAP.md` - Phase 84 success criteria

### Tertiary (LOW confidence)
- Lore Anomaly Zones section — useful for distinguishing from Void Rift, but Anomaly Zones are out of scope

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Zero new dependencies, all systems proven in Phase 82
- Architecture: HIGH - Patterns directly reused from aquatic biomes, code inspection confirms compatibility
- Pitfalls: HIGH - Identified Void Rift vs Anomaly Zones confusion, validated against lore

**Research date:** 2026-02-24
**Valid until:** ~60 days (stable system, content extension pattern)

**Key validation points:**
- BiomeType is union type accepting new literals (confirmed: biome.ts line 4)
- TileDefinition supports visibilityModifier (confirmed: types.ts line 32)
- FogManager uses BIOME_VISIBILITY_MODIFIERS (confirmed: FogManager.ts lines 21-26)
- Biome decision tree uses temperature/moisture/elevation (confirmed: biome.ts lines 112-182)
- Shore transition system is biome-agnostic (confirmed: shore.ts works for any tile types)
- Aquatic biomes followed exact same pattern (confirmed: Phase 82 implementation complete)
