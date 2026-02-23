# Phase 77: POI Discovery System - Research

**Researched:** 2026-02-23
**Domain:** Procedural POI generation, discovery mechanics, database persistence
**Confidence:** HIGH

## Summary

POI (Points of Interest) discovery systems combine procedural spawn generation with database-backed discovery tracking to create exploration rewards that can't be exploited. The pattern mirrors existing spawn/interaction systems but requires character-specific persistence to prevent re-discovery.

The project already has the building blocks: seeded random generation (world-gen), entity rendering (EntityRenderer), fog reveal hooks (Phase 76), and character-scoped database patterns (quest progress, species discovery). The key challenge is integrating POI spawning into world generation at lower density than creatures/minerals while maintaining visual distinction through depth layering.

**Primary recommendation:** Extend `generateStructures()` to spawn POI markers using seeded noise sampling (similar to features but rarer), track discoveries in a `discovered_pois` database table (composite primary key: `characterId` + `poiId`), and render POI icons using EntityRenderer depth patterns (1500-2000 range, above terrain ~100-200, below fog ~1000).

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| SeededRandom | Project | Deterministic POI placement per chunk | Already used for spawns, structures, features |
| SimplexNoise | Project | Spatial distribution of POI density | Already used for biome, fertility, features |
| Drizzle ORM | 0.36.4 | Database tracking of discoveries | Already used for all persistence |
| EntityRenderer | Project | POI icon rendering and depth layering | Already renders creatures, minerals, NPCs |
| Phaser 3 Sprite | 3.85.0 | POI icon display | Standard for all game objects |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| FogManager | Project (Phase 76) | Track fog reveal state for discovery gating | Only trigger discovery when tile revealed |
| WebSocket events | Socket.IO | Server notification of POI discovery | Real-time reward delivery and sync |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Database tracking | localStorage only | Exploitable via browser dev tools; no server validation |
| Seeded generation | Handplaced POIs | Not scalable to infinite world; breaks procedural generation |
| Single table | Per-POI-type tables | Unnecessary complexity; composite key handles all types |

**Installation:**
No new packages needed. Existing project stack covers all requirements.

## Architecture Patterns

### Recommended Project Structure
```
packages/world-gen/src/generation/
├── pois.ts                  # POI spawn generation (parallel to spawn.ts)

packages/database/src/schema/
├── discovered-pois.ts       # Discovery tracking table

apps/game-server/src/game/
├── discovery.service.ts     # Server-side discovery validation and rewards

apps/web/src/game/
├── pois/
│   ├── PoiRenderer.ts      # POI icon rendering (extends EntityRenderer pattern)
│   └── PoiTypes.ts         # POI type definitions (anomaly, cache, landmark)
```

### Pattern 1: Procedural POI Spawning (world-gen)
**What:** Spawn POIs using seeded noise sampling at lower density than creatures/minerals
**When to use:** During chunk generation, parallel to spawn points
**Example:**
```typescript
// Source: Project spawn.ts pattern + procedural placement research
import { SeededRandom } from '../random/seeded-random';
import { SimplexNoise } from '../noise/simplex';

const POI_TYPES = ['anomaly', 'cache', 'landmark'] as const;
const POI_DENSITY = 0.15; // ~10% of mineral spawn rate (very sparse)
const POI_NOISE_FREQUENCY = 0.03; // Low frequency = clustered placement

export interface PoiSpawn {
  x: number; // Local zone coordinates
  y: number;
  type: 'anomaly' | 'cache' | 'landmark';
  poiId: string; // Globally unique: `poi_${chunkX}_${chunkY}_${index}`
  biome: BiomeType;
}

export function generatePOIs(
  worldSeed: string,
  chunkX: number,
  chunkY: number,
  biome: BiomeType,
  collisionMap: boolean[][]
): PoiSpawn[] {
  const random = new SeededRandom(`${worldSeed}_pois_${chunkX}_${chunkY}`);
  const noise = new SimplexNoise(`${worldSeed}_poi_density`);
  const pois: PoiSpawn[] = [];

  // Sample noise at chunk center to determine POI eligibility
  const centerX = chunkX * ZONE_SIZE + ZONE_SIZE / 2;
  const centerY = chunkY * ZONE_SIZE + ZONE_SIZE / 2;
  const densityNoise = noise.noise2D(centerX * POI_NOISE_FREQUENCY, centerY * POI_NOISE_FREQUENCY);

  // Only spawn POIs if noise exceeds threshold (sparse placement)
  if (densityNoise > 0.3) {
    const poiCount = Math.floor(densityNoise * POI_DENSITY) + (random.next() > 0.7 ? 1 : 0);

    for (let i = 0; i < poiCount; i++) {
      const position = findValidSpawnPosition(random, collisionMap);
      if (!position) continue;

      // Pick POI type based on biome
      const poiType = selectPoiTypeForBiome(biome, random);

      pois.push({
        x: position.x,
        y: position.y,
        type: poiType,
        poiId: `poi_${chunkX}_${chunkY}_${i}`,
        biome,
      });
    }
  }

  return pois;
}

function selectPoiTypeForBiome(biome: BiomeType, random: SeededRandom): typeof POI_TYPES[number] {
  // Biome-specific POI distribution (lore-aligned)
  const weights: Record<BiomeType, Record<typeof POI_TYPES[number], number>> = {
    ancient_ruins: { anomaly: 10, cache: 5, landmark: 8 },
    crystal_caves: { anomaly: 8, cache: 3, landmark: 6 },
    toxic_wastes: { anomaly: 6, cache: 8, landmark: 2 },
    // ... (remaining biomes)
  };

  const biomeWeights = weights[biome] ?? { anomaly: 5, cache: 5, landmark: 5 };
  const totalWeight = Object.values(biomeWeights).reduce((sum, w) => sum + w, 0);
  let roll = random.nextFloat(0, totalWeight);

  for (const [type, weight] of Object.entries(biomeWeights)) {
    roll -= weight;
    if (roll <= 0) return type as typeof POI_TYPES[number];
  }

  return 'cache'; // Fallback
}
```

### Pattern 2: Database Discovery Tracking
**What:** Composite primary key table preventing duplicate discoveries per character
**When to use:** Server-side discovery validation and reward delivery
**Example:**
```typescript
// Source: Project discovered_species.ts pattern
import { pgTable, uuid, varchar, timestamp, integer, primaryKey } from 'drizzle-orm/pg-core';
import { characters } from './characters';

export const discoveredPois = pgTable(
  'discovered_pois',
  {
    characterId: uuid('character_id')
      .notNull()
      .references(() => characters.id, { onDelete: 'cascade' }),
    poiId: varchar('poi_id', { length: 100 }).notNull(), // Format: poi_${chunkX}_${chunkY}_${index}
    poiType: varchar('poi_type', { length: 20 }).notNull(), // 'anomaly' | 'cache' | 'landmark'
    discoveredAt: timestamp('discovered_at', { withTimezone: true }).notNull().defaultNow(),
    rewardGranted: boolean('reward_granted').notNull().default(true), // Track if reward delivered
  },
  (table) => ({
    pk: primaryKey({ columns: [table.characterId, table.poiId] }),
  })
);

export type DiscoveredPoi = typeof discoveredPois.$inferSelect;
export type NewDiscoveredPoi = typeof discoveredPois.$inferInsert;
```

### Pattern 3: POI Icon Rendering with Depth Layering
**What:** Render POI icons above terrain, below fog, using Phaser depth system
**When to use:** Client-side POI visualization after fog reveal
**Example:**
```typescript
// Source: Project EntityRenderer depth patterns + Phaser 3 depth documentation
export class PoiRenderer {
  private scene: Phaser.Scene;
  private isoTransform: IsometricTransform;
  private poiSprites: Map<string, Phaser.GameObjects.Sprite> = new Map();

  // Depth values (must fit between terrain and fog)
  // Terrain: ~100-200, Fog: ~1000, POIs should be between
  private readonly POI_DEPTH_BASE = 800; // Above terrain, below fog

  createPoiIcon(poi: PoiSpawn, worldX: number, worldY: number): Phaser.GameObjects.Sprite {
    const screenPos = this.isoTransform.gridToScreen(worldX, worldY);

    // Select texture based on POI type
    const texture = this.getPoiTexture(poi.type);

    const sprite = this.scene.add.sprite(screenPos.x, screenPos.y, texture);
    sprite.setScale(1.5); // Slightly larger than terrain tiles for visibility
    sprite.setDepth(this.POI_DEPTH_BASE + worldY); // Depth sorting by Y coordinate
    sprite.setData('poiId', poi.poiId);
    sprite.setData('poiType', poi.type);

    // Pulsing glow effect for discoverability
    this.scene.tweens.add({
      targets: sprite,
      alpha: { from: 1.0, to: 0.7 },
      duration: 1500,
      yoyo: true,
      repeat: -1,
    });

    this.poiSprites.set(poi.poiId, sprite);
    return sprite;
  }

  private getPoiTexture(type: string): string {
    const textures: Record<string, string> = {
      anomaly: 'poi_anomaly', // Purple shimmer icon
      cache: 'poi_cache',     // Container/chest icon
      landmark: 'poi_landmark', // Beacon/pillar icon
    };
    return textures[type] ?? 'poi_generic';
  }

  removePoiIcon(poiId: string): void {
    const sprite = this.poiSprites.get(poiId);
    if (sprite) {
      sprite.destroy();
      this.poiSprites.delete(poiId);
    }
  }
}
```

### Pattern 4: Discovery Validation and Rewards
**What:** Server authoritative discovery check preventing client-side exploits
**When to use:** When player enters tile with POI after fog revealed
**Example:**
```typescript
// Source: Project quest completion pattern + interaction validation
export class DiscoveryService {
  async attemptDiscovery(
    characterId: string,
    poiId: string,
    poiType: string
  ): Promise<{ success: boolean; reward?: DiscoveryReward }> {
    // 1. Check if already discovered (anti-exploit)
    const existing = await this.db
      .select()
      .from(discoveredPois)
      .where(and(
        eq(discoveredPois.characterId, characterId),
        eq(discoveredPois.poiId, poiId)
      ))
      .limit(1);

    if (existing.length > 0) {
      return { success: false }; // Already discovered
    }

    // 2. Validate POI exists at claimed location (anti-cheat)
    const [chunkX, chunkY, index] = this.parsePoiId(poiId);
    const chunk = await this.worldService.getChunk(chunkX, chunkY);
    const poi = chunk.pois?.find(p => p.poiId === poiId);

    if (!poi) {
      throw new Error('Invalid POI');
    }

    // 3. Grant rewards (type-specific)
    const reward = this.calculateReward(poiType, poi.biome);
    await this.characterService.grantReward(characterId, reward);

    // 4. Record discovery
    await this.db.insert(discoveredPois).values({
      characterId,
      poiId,
      poiType,
      rewardGranted: true,
    });

    return { success: true, reward };
  }

  private calculateReward(poiType: string, biome: BiomeType): DiscoveryReward {
    const baseRewards = {
      anomaly: { xp: 100, credits: 50 },
      cache: { xp: 50, credits: 100, itemRoll: true },
      landmark: { xp: 150, credits: 25 },
    };

    const reward = baseRewards[poiType] ?? baseRewards.cache;

    // Biome tier multiplier (dangerous biomes = better rewards)
    const tierMultiplier = this.getBiomeTier(biome);

    return {
      xp: Math.floor(reward.xp * tierMultiplier),
      credits: Math.floor(reward.credits * tierMultiplier),
      items: reward.itemRoll ? this.rollLootTable(poiType, biome) : [],
    };
  }

  private getBiomeTier(biome: BiomeType): number {
    const tiers: Record<BiomeType, number> = {
      void_plains: 1.0,         // Tier I
      fungal_forest: 1.0,
      miasma_marshes: 1.5,      // Tier II
      petrified_expanse: 1.5,
      volcanic_ridge: 2.5,      // Tier III
      crystal_caves: 2.5,
      frozen_expanse: 2.5,
      ancient_ruins: 3.5,       // Tier III+ (high danger)
      toxic_wastes: 3.0,
      starfall_crater: 4.0,     // Tier IV
    };
    return tiers[biome] ?? 1.0;
  }
}
```

### Anti-Patterns to Avoid
- **Client-side discovery tracking only:** Players can edit localStorage to re-discover POIs for infinite rewards. Always validate server-side.
- **Dense POI spawning:** If POIs spawn as frequently as creatures, exploration loses value. Keep density low (10-20% of mineral spawn rate).
- **No fog-reveal gating:** Allowing POI discovery before fog reveal breaks exploration loop. Only trigger when tile revealed AND entered.
- **Fixed depth POIs:** Without Y-based depth sorting, POIs appear to float incorrectly when behind objects. Use `depth = BASE + worldY` pattern.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Seeded random placement | Custom hash-based RNG | SeededRandom (project) | Already tested, handles chunk boundaries correctly |
| Composite key uniqueness | Application-level duplicate checks | Drizzle composite primaryKey | Database enforces constraint, prevents race conditions |
| Depth sorting | Manual z-index calculation | Phaser setDepth() with worldY offset | Handles isometric sorting automatically |
| POI ID generation | UUID or nanoid | Deterministic string: `poi_${x}_${y}_${i}` | Reproducible across server restarts, chunk regeneration |

**Key insight:** The discovery system mirrors the existing species discovery pattern (discoveredSpecies table). Don't reinvent the wheel — copy the composite key approach.

## Common Pitfalls

### Pitfall 1: POI ID Collisions Across Chunk Regeneration
**What goes wrong:** If chunk regenerates with different seed, POI IDs change and old discoveries break
**Why it happens:** Non-deterministic ID generation or missing chunk coordinates in ID
**How to avoid:** Use format `poi_${worldSeed}_${chunkX}_${chunkY}_${index}` so same seed always produces same IDs
**Warning signs:** Players report discovered POIs reappearing after server restart

### Pitfall 2: Discovery Before Fog Reveal Exploit
**What goes wrong:** Players discover POIs by walking to coordinates before fog reveals them
**Why it happens:** Discovery check doesn't validate fog reveal state
**How to avoid:** Server-side check: `isFogRevealed(characterId, worldX, worldY)` before allowing discovery
**Warning signs:** Players discover POIs in "dark" areas, achievement hunters find exploits

### Pitfall 3: POI Icons Hidden Below Fog Layer
**What goes wrong:** POIs render but fog overlay covers them, making them invisible
**Why it happens:** POI depth (e.g., 500) less than fog depth (1000 from Phase 76)
**How to avoid:** Set POI depth to 800-900 range (above terrain ~100-200, below fog ~1000)
**Warning signs:** POIs appear after disabling fog, but not during normal play

### Pitfall 4: Reward Farming via Database Rollback
**What goes wrong:** Players discover POI, receive reward, then restore database backup to re-discover
**Why it happens:** No server-side session tracking of pending discoveries
**How to avoid:** Write discovery record BEFORE granting reward, use transactions to ensure atomicity
**Warning signs:** Duplicate discovery records in logs, inventory items appear/disappear

### Pitfall 5: POI Density Too High Making Exploration Trivial
**What goes wrong:** Every chunk has 5+ POIs, discovery loses value
**Why it happens:** Copying creature spawn density instead of using sparse sampling
**How to avoid:** Target ~0.1-0.3 POIs per chunk (vs 3-6 creatures, 4-10 minerals), use noise threshold gating
**Warning signs:** Players max out XP in single zone, economy inflates from cache rewards

## Code Examples

Verified patterns from project codebase:

### Composite Primary Key Discovery Table
```typescript
// Source: packages/database/src/schema/discoveries.ts (discoveredSpecies pattern)
export const discoveredPois = pgTable(
  'discovered_pois',
  {
    characterId: uuid('character_id')
      .notNull()
      .references(() => characters.id, { onDelete: 'cascade' }),
    poiId: varchar('poi_id', { length: 100 }).notNull(),
    poiType: varchar('poi_type', { length: 20 }).notNull(),
    discoveredAt: timestamp('discovered_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    // CRITICAL: Prevents duplicate discoveries per character
    pk: primaryKey({ columns: [table.characterId, table.poiId] }),
  })
);
```

### Seeded POI Placement (Sparse Sampling)
```typescript
// Source: packages/world-gen/src/generation/spawn.ts pattern
export function generatePOIs(
  worldSeed: string,
  chunkX: number,
  chunkY: number,
  biome: BiomeType
): PoiSpawn[] {
  const random = new SeededRandom(`${worldSeed}_pois_${chunkX}_${chunkY}`);
  const noise = new SimplexNoise(`${worldSeed}_poi_density`);

  const centerX = chunkX * ZONE_SIZE + ZONE_SIZE / 2;
  const centerY = chunkY * ZONE_SIZE + ZONE_SIZE / 2;
  const densityValue = noise.noise2D(centerX * 0.03, centerY * 0.03);

  // Only 30% of chunks have POIs (noise > 0.3 threshold)
  if (densityValue < 0.3) return [];

  // Even eligible chunks get 0-2 POIs max
  const poiCount = densityValue > 0.7 ? 2 : 1;
  const pois: PoiSpawn[] = [];

  for (let i = 0; i < poiCount; i++) {
    // Deterministic position within chunk
    const x = random.nextInt(10, ZONE_SIZE - 10);
    const y = random.nextInt(10, ZONE_SIZE - 10);

    pois.push({
      x, y,
      type: selectPoiType(biome, random),
      poiId: `poi_${chunkX}_${chunkY}_${i}`,
      biome,
    });
  }

  return pois;
}
```

### Discovery Validation with Fog Check
```typescript
// Source: Apps/game-server interaction patterns + Phase 76 fog integration
async handlePoiDiscovery(
  characterId: string,
  poiId: string,
  worldX: number,
  worldY: number
): Promise<DiscoveryResult> {
  // 1. Validate fog revealed (anti-exploit)
  const fogRevealed = await this.fogService.isTileRevealed(characterId, worldX, worldY);
  if (!fogRevealed) {
    throw new ForbiddenException('Cannot discover POI before revealing fog');
  }

  // 2. Check not already discovered
  const existing = await this.db
    .select()
    .from(discoveredPois)
    .where(and(
      eq(discoveredPois.characterId, characterId),
      eq(discoveredPois.poiId, poiId)
    ))
    .limit(1);

  if (existing.length > 0) {
    return { alreadyDiscovered: true };
  }

  // 3. Grant rewards and record discovery atomically
  return await this.db.transaction(async (tx) => {
    // Insert discovery first (prevents reward farming via rollback)
    await tx.insert(discoveredPois).values({
      characterId,
      poiId,
      poiType: this.getPoiType(poiId),
    });

    // Then grant reward
    const reward = this.calculateReward(poiId);
    await this.characterService.grantReward(characterId, reward, tx);

    return { discovered: true, reward };
  });
}
```

### Phaser Depth Layering for POIs
```typescript
// Source: apps/web/src/game/rendering/EntityRenderer.ts depth pattern
// + Phaser 3 depth sorting documentation
export class PoiRenderer {
  private readonly TERRAIN_DEPTH = 100;  // From TileRenderer
  private readonly POI_DEPTH_BASE = 800; // Above terrain, below fog (1000)
  private readonly FOG_DEPTH = 1000;     // From Phase 76 FogRenderer

  createPoiIcon(poi: PoiSpawn, worldX: number, worldY: number): Phaser.GameObjects.Sprite {
    const screenPos = this.isoTransform.gridToScreen(worldX, worldY);
    const sprite = this.scene.add.sprite(screenPos.x, screenPos.y, this.getTexture(poi.type));

    // Depth = base + worldY for isometric sorting
    // This ensures POIs behind objects appear behind them
    sprite.setDepth(this.POI_DEPTH_BASE + worldY);

    return sprite;
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Client localStorage discovery | Database composite key (characterId + poiId) | 2020+ MMOs | Prevents exploit via localStorage editing |
| Dense uniform POI placement | Sparse noise-gated placement | Modern proc-gen (2024+) | Exploration feels rewarding, not overwhelming |
| Instant discovery on proximity | Fog-reveal gating | Phase 76 integration | Discovery tied to exploration progress |
| Fixed depth icons | Dynamic depth = base + worldY | Phaser 3 isometric best practice | Correct occlusion behind terrain |

**Deprecated/outdated:**
- **Manual z-index tracking:** Phaser 3's setDepth() handles this automatically. Don't maintain separate depth arrays.
- **Random UUID POI IDs:** Not reproducible across server restarts. Use deterministic `poi_${x}_${y}_${i}` format.

## Open Questions

1. **XP scaling across discovery types**
   - What we know: Anomaly/cache/landmark grant different rewards
   - What's unclear: Should XP scale linearly with level or use fixed values?
   - Recommendation: Fixed XP per POI type (prevents low-level farming), but biome tier multiplier (2.5x in tier III vs 1.0x in tier I)

2. **Item rewards from caches**
   - What we know: Caches can grant items as rewards
   - What's unclear: Random loot table or fixed items per cache?
   - Recommendation: Seeded loot table (same cache always drops same items for same seed) to prevent save-scumming

3. **POI visual states (discovered vs undiscovered)**
   - What we know: POIs need visual distinction
   - What's unclear: Do discovered POIs remain visible? Change appearance? Disappear?
   - Recommendation: Discovered POIs fade to 50% alpha and stop pulsing (still visible for navigation, but clearly "used")

## Sources

### Primary (HIGH confidence)
- Project codebase: `packages/database/src/schema/discoveries.ts` (discoveredSpecies composite key pattern)
- Project codebase: `packages/world-gen/src/generation/spawn.ts` (seeded random placement)
- Project codebase: `apps/web/src/game/rendering/EntityRenderer.ts` (depth layering patterns)
- [Phaser 3 Depth Sorting Documentation](https://phaser.io/examples/v3/view/depth-sorting/z-index) - setDepth() API
- [How to Implement Procedural Generation for Tile-Based Games](https://docs.bswen.com/blog/2026-02-21-procedural-tile-generation/) - Seeded placement patterns

### Secondary (MEDIUM confidence)
- [Red Blob Games: Making maps with noise](https://www.redblobgames.com/maps/terrain-from-noise/) - Noise-based POI density
- [Procedural Placement of Objects - GameDev.net](https://gamedev.net/forums/topic/497564-procedural-placement-of-objects/4245656) - Sparse sampling techniques
- Phase 76 fog research - Fog depth (1000) and reveal tracking patterns

### Tertiary (LOW confidence)
- None — all critical findings verified via project codebase or official documentation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All components already in project (SeededRandom, Drizzle, Phaser depth)
- Architecture: HIGH - Patterns copied from existing spawn/discovery systems
- Pitfalls: MEDIUM - Based on common MMO discovery exploits, not project-specific testing

**Research date:** 2026-02-23
**Valid until:** 30 days (stable domain, patterns based on existing project architecture)
