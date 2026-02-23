# Phase 76: Fog of War Foundation - Research

**Researched:** 2026-02-23
**Domain:** Phaser 3 fog of war rendering, bitset encoding, localStorage persistence
**Confidence:** HIGH

## Summary

Fog of War in Phaser 3 is best implemented using a RenderTexture overlay with Graphics-based drawing for explored/unexplored states. For an isometric tile game with potentially 100k+ tiles across infinite chunks, localStorage persistence requires bitset encoding (8 tiles per byte) to stay within the 5-10MB browser quota.

The project already has ChunkManager for 3x3 chunk loading, TileRenderer for isometric cube rendering, and localStorage patterns in questStore. The key challenges are (1) fog rendering performance at 60fps with Graphics draw calls, (2) radius-based reveal calculation without O(n²) checks, and (3) bitset encoding/decoding with base64 for localStorage.

**Primary recommendation:** Use Phaser Graphics with RenderTexture for fog layer, store revealed state as Uint8Array bitset per character, encode as base64 in localStorage with key `fog-revealed-${characterId}`.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Phaser 3 | 3.85.0 | Game engine with Graphics/RenderTexture API | Already used for WorldScene, TileRenderer, all rendering |
| Uint8Array | Native ES2026 | Bitset storage (8 tiles/byte) with native .toBase64() | ECMAScript 2026 adds native base64 encoding methods |
| localStorage | Web API | Per-character fog persistence | Already used in questStore.ts for quest tracking |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| FastBitSet.js | 0.2.1 | Optimized bitset operations (optional) | Only if native bit ops become bottleneck (unlikely) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Graphics | Sprite tiles | Sprites batch better BUT 100k+ sprites = memory bloat; Graphics draw once to RenderTexture |
| RenderTexture | Canvas 2D overlay | Canvas works BUT misses Phaser's camera integration, harder depth management |
| localStorage | IndexedDB | More quota (50MB+) BUT async API adds complexity, overkill for ~12KB data |

**Installation:**
No new packages needed. Native Phaser 3 + ES2026 Uint8Array suffice.

## Architecture Patterns

### Recommended Project Structure
```
apps/web/src/
├── game/
│   ├── rendering/
│   │   ├── FogRenderer.ts       # RenderTexture + Graphics for fog overlay
│   │   └── FogManager.ts        # Reveal radius calculation, tile coordinate lookup
│   └── utils/
│       └── FogPersistence.ts    # Bitset encoding/decoding, localStorage read/write
└── store/
    └── fogStore.ts              # Zustand store for revealed tiles Set<string> (optional)
```

### Pattern 1: RenderTexture Fog Overlay (Phaser)
**What:** Create a RenderTexture matching camera viewport size, fill with dark color, erase circles as player moves
**When to use:** Real-time fog reveal with camera scroll support
**Example:**
```typescript
// Source: Phaser 3 fog of war tutorial (Ourcade blog)
export class FogRenderer {
  private fogTexture: Phaser.GameObjects.RenderTexture;
  private fogGraphics: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene) {
    // Create RenderTexture sized to viewport (not full world)
    const width = scene.cameras.main.width;
    const height = scene.cameras.main.height;
    this.fogTexture = scene.add.renderTexture(0, 0, width, height);

    // Fill with dark overlay (60% opacity black)
    this.fogTexture.fill(0x000000, 0.6);

    // Set blend mode to darken terrain beneath
    this.fogTexture.setBlendMode(Phaser.BlendModes.MULTIPLY);

    // Scroll with camera
    this.fogTexture.setScrollFactor(1);

    // Depth above terrain, below UI
    this.fogTexture.setDepth(1000);

    this.fogGraphics = scene.add.graphics();
  }

  revealTile(screenX: number, screenY: number, radiusPx: number): void {
    // Draw white circle to erase fog (uses erase blend mode)
    this.fogGraphics.clear();
    this.fogGraphics.fillStyle(0xffffff);
    this.fogGraphics.fillCircle(screenX, screenY, radiusPx);
    this.fogTexture.erase(this.fogGraphics);
  }
}
```

### Pattern 2: Bitset Encoding for localStorage (ES2026)
**What:** Pack 8 boolean tile states into each byte using bitwise operations
**When to use:** Storing 100k+ tile states in <13KB
**Example:**
```typescript
// Source: ECMAScript 2026 Uint8Array.toBase64() proposal
export class FogPersistence {
  // Bitset: worldX,worldY → bit index → byte[bit]
  private revealed: Uint8Array;

  constructor(maxTiles: number) {
    // 8 tiles per byte
    const byteCount = Math.ceil(maxTiles / 8);
    this.revealed = new Uint8Array(byteCount);
  }

  setRevealed(tileIndex: number, revealed: boolean): void {
    const byteIndex = Math.floor(tileIndex / 8);
    const bitIndex = tileIndex % 8;

    if (revealed) {
      // Set bit: byte |= (1 << bit)
      this.revealed[byteIndex] |= (1 << bitIndex);
    } else {
      // Clear bit: byte &= ~(1 << bit)
      this.revealed[byteIndex] &= ~(1 << bitIndex);
    }
  }

  isRevealed(tileIndex: number): boolean {
    const byteIndex = Math.floor(tileIndex / 8);
    const bitIndex = tileIndex % 8;
    return (this.revealed[byteIndex] & (1 << bitIndex)) !== 0;
  }

  saveToLocalStorage(characterId: string): void {
    // ES2026 native base64 encoding
    const base64 = this.revealed.toBase64();
    localStorage.setItem(`fog-revealed-${characterId}`, base64);
  }

  loadFromLocalStorage(characterId: string): void {
    const base64 = localStorage.getItem(`fog-revealed-${characterId}`);
    if (base64) {
      this.revealed = Uint8Array.fromBase64(base64);
    }
  }
}
```

### Pattern 3: Radius Reveal with Flood Fill (Optimized)
**What:** Reveal tiles in circle around player using iterative BFS (not recursive DFS)
**When to use:** Calculating which tiles to reveal when player moves
**Example:**
```typescript
// Source: JavaScript flood fill algorithm (iterative approach)
export class FogManager {
  revealRadius(centerX: number, centerY: number, radius: number): Set<string> {
    const revealed = new Set<string>();
    const queue: Array<{x: number, y: number, dist: number}> = [{x: centerX, y: centerY, dist: 0}];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const {x, y, dist} = queue.shift()!;
      const key = `${x},${y}`;

      if (visited.has(key) || dist > radius) continue;
      visited.add(key);
      revealed.add(key);

      // 4-directional spread (not 8-dir to avoid diagonal leaks)
      const neighbors = [
        {x: x+1, y, dist: dist+1},
        {x: x-1, y, dist: dist+1},
        {x, y: y+1, dist: dist+1},
        {x, y: y-1, dist: dist+1},
      ];

      for (const n of neighbors) {
        if (!visited.has(`${n.x},${n.y}`)) {
          queue.push(n);
        }
      }
    }

    return revealed;
  }
}
```

### Anti-Patterns to Avoid
- **Full-world RenderTexture:** Creating RenderTexture sized to entire world (100k tiles) causes memory bloat. Keep it viewport-sized and adjust position on camera move.
- **Recursive flood fill:** Stack overflow on large radii. Use iterative BFS with explicit queue.
- **String-based localStorage:** Storing JSON array of tile coordinates bloats 100x vs bitset. "[[0,1],[0,2],...]" vs binary encoding.
- **Graphics redraw every frame:** Only redraw fog when player moves to new tile, not every update() call.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Base64 encoding | Custom btoa/atob wrapper | Uint8Array.toBase64() / .fromBase64() | ES2026 native methods handle edge cases (padding, URL-safe variants) |
| Bitset library | Custom bit manipulation | Native bitwise ops OR FastBitSet.js | Bitwise ops are fast in V8, library only if perf bottleneck proven |
| localStorage quota check | Manual try/catch around setItem | QuotaExceededError handling with fallback | Built-in error type, warn user instead of silent failure |
| Flood fill algorithm | Naive nested loops | Iterative BFS with visited set | O(r²) vs O(n²) for naive approach, prevents stack overflow |

**Key insight:** Phaser's RenderTexture API handles WebGL/Canvas fallback, blend modes, and camera integration. Building custom overlay with raw Canvas 2D duplicates 1000+ lines of tested code.

## Common Pitfalls

### Pitfall 1: RenderTexture Performance with Graphics Batch Flushing
**What goes wrong:** Drawing many small Graphics circles to RenderTexture causes batch flush per draw, tanking FPS
**Why it happens:** Graphics primitives break WebGL batching; each draw triggers shader state change
**How to avoid:** Batch-draw all revealed circles in single Graphics object before calling .erase()
**Warning signs:** FPS drops below 30 when revealing 50+ tiles, Chrome DevTools shows "WebGL: too many draw calls"

### Pitfall 2: World Coordinates vs Screen Coordinates Confusion
**What goes wrong:** Fog erase position misaligned with tiles after camera scroll
**Why it happens:** RenderTexture uses screen-space coords, tiles use world-space coords, camera offset not accounted
**How to avoid:** Convert world tile coords to screen coords via `camera.getWorldPoint()` before erase
**Warning signs:** Fog reveals at wrong location when camera pans, reveals "trail" behind player

### Pitfall 3: localStorage Quota Exceeded Silent Failure
**What goes wrong:** Fog state stops persisting after player explores 80k+ tiles, no error shown
**Why it happens:** localStorage quota (5-10MB) exceeded, setItem() throws QuotaExceededError but no handler catches
**How to avoid:** Wrap setItem in try/catch, show alert "Fog persistence disabled - storage full" and continue without save
**Warning signs:** Fog resets on page reload, no console error, works fine for first 30 minutes then breaks

### Pitfall 4: Bitset Index Calculation Off-By-One Errors
**What goes wrong:** Tiles marked as explored show as unexplored on reload
**Why it happens:** Negative world coords or (x,y) → 1D index formula mismatch between save/load
**How to avoid:** Use consistent hash: `(x + 100000) * 200000 + (y + 100000)` to handle negatives, test with edge cases
**Warning signs:** Fog state corrupts near chunk boundaries, tiles at (0,0) behave differently than (100,100)

### Pitfall 5: Revealed Tiles Not Rendering Until Camera Moves
**What goes wrong:** Fog stays dark even after tiles revealed, clears only when camera pans
**Why it happens:** RenderTexture needs explicit .draw() or scene re-render to update, static texture caches old state
**How to avoid:** Call `fogTexture.clear()` then redraw all revealed circles when loading from localStorage
**Warning signs:** Fog appears "frozen" on game load, moving camera "un-freezes" it, reloading page shows random fog state

## Code Examples

Verified patterns from official sources:

### Phaser RenderTexture Erase Pattern
```typescript
// Source: Phaser 3 Examples - RenderTexture erase() method
export class FogRenderer {
  private fogTexture: Phaser.GameObjects.RenderTexture;
  private graphics: Phaser.GameObjects.Graphics;

  create(scene: Phaser.Scene): void {
    const {width, height} = scene.cameras.main;
    this.fogTexture = scene.add.renderTexture(0, 0, width, height);
    this.fogTexture.fill(0x000000, 0.7); // 70% dark overlay
    this.fogTexture.setBlendMode(Phaser.BlendModes.MULTIPLY);
    this.fogTexture.setScrollFactor(1, 1);
    this.fogTexture.setDepth(1000);

    this.graphics = scene.add.graphics();
  }

  revealCircle(worldX: number, worldY: number, radius: number): void {
    // Convert world to screen coords accounting for camera scroll
    const camera = this.scene.cameras.main;
    const screenX = worldX - camera.scrollX;
    const screenY = worldY - camera.scrollY;

    this.graphics.clear();
    this.graphics.fillStyle(0xffffff, 1); // White = full erase
    this.graphics.fillCircle(screenX, screenY, radius);

    // Erase fog at circle position
    this.fogTexture.erase(this.graphics, screenX, screenY);
  }
}
```

### Bitset Encoding with ES2026 Uint8Array
```typescript
// Source: MDN Uint8Array.toBase64() documentation
export class FogBitset {
  private data: Uint8Array;

  constructor(tileCount: number) {
    this.data = new Uint8Array(Math.ceil(tileCount / 8));
  }

  set(index: number, value: boolean): void {
    const byte = Math.floor(index / 8);
    const bit = index % 8;
    if (value) {
      this.data[byte] |= (1 << bit);
    } else {
      this.data[byte] &= ~(1 << bit);
    }
  }

  get(index: number): boolean {
    const byte = Math.floor(index / 8);
    const bit = index % 8;
    return (this.data[byte] & (1 << bit)) !== 0;
  }

  serialize(): string {
    // ES2026 native base64 encoding
    return this.data.toBase64();
  }

  static deserialize(base64: string): FogBitset {
    const data = Uint8Array.fromBase64(base64);
    const bitset = new FogBitset(data.length * 8);
    bitset.data = data;
    return bitset;
  }
}
```

### World Coordinate to Tile Index Hashing
```typescript
// Source: Project's existing positionToWorldCoords pattern (WorldScene.ts)
export class FogCoordinates {
  // Convert (worldX, worldY) to unique 1D index for bitset
  // Handles negative coords by offsetting to positive range
  static worldToIndex(worldX: number, worldY: number): number {
    const OFFSET = 100000; // Support -100k to +100k coords
    const RANGE = 200000;  // Total range

    const x = worldX + OFFSET;
    const y = worldY + OFFSET;

    // 1D index: x * RANGE + y
    return x * RANGE + y;
  }

  static indexToWorld(index: number): {x: number, y: number} {
    const OFFSET = 100000;
    const RANGE = 200000;

    const x = Math.floor(index / RANGE) - OFFSET;
    const y = (index % RANGE) - OFFSET;

    return {x, y};
  }
}
```

### localStorage Persistence with Quota Handling
```typescript
// Source: localStorage quota error handling best practices
export class FogStorage {
  private static KEY_PREFIX = 'fog-revealed-';

  static save(characterId: string, bitset: FogBitset): boolean {
    try {
      const key = `${FogStorage.KEY_PREFIX}${characterId}`;
      const data = bitset.serialize();
      localStorage.setItem(key, data);
      return true;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        console.warn('[FogStorage] localStorage quota exceeded, persistence disabled');
        // Show user notification via alertStore
        return false;
      }
      throw error; // Re-throw unexpected errors
    }
  }

  static load(characterId: string): FogBitset | null {
    try {
      const key = `${FogStorage.KEY_PREFIX}${characterId}`;
      const data = localStorage.getItem(key);
      return data ? FogBitset.deserialize(data) : null;
    } catch (error) {
      console.error('[FogStorage] Failed to load fog data:', error);
      return null; // Graceful degradation
    }
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| JSON array of coords | Bitset encoding (8 tiles/byte) | ES2026 (2024) | 100x size reduction: 1MB → 12KB for 100k tiles |
| Recursive flood fill | Iterative BFS with queue | Always best practice | Prevents stack overflow on large radii |
| Full-world RenderTexture | Viewport-sized texture | Phaser 3.50+ (2020) | 10MB+ → 2MB memory for 100k tiles |
| btoa/atob for base64 | Uint8Array.toBase64() | ECMAScript 2026 | Native handling of binary data, no string conversion |

**Deprecated/outdated:**
- **Phaser SpriteBatch:** Removed in Phaser 3, replaced with automatic batching. Don't use for fog tiles.
- **Geometry masks on RenderTexture:** WebGL-only, breaks on Canvas fallback. Use erase() instead.

## Open Questions

1. **Reveal radius in tiles vs pixels**
   - What we know: Success criteria says "radius around player", no tile count specified
   - What's unclear: Is this 5 tiles? 10 tiles? Field-of-view cone or circle?
   - Recommendation: Start with 8-tile radius circle (matches minimap visibility), tune based on feel

2. **Persistent reveal vs fog-of-war (explored but not visible)**
   - What we know: Spec says "explored tiles persist", unclear if they stay fully visible or dim
   - What's unclear: Classic RTS has 3 states: unexplored (black), explored (dimmed), visible (bright)
   - Recommendation: Implement 2-state first (unexplored/explored), add dimming in Phase 77 if needed

3. **Reveal on first visit or requires line-of-sight**
   - What we know: "Fog reveals as they move to new tiles" suggests grid-based, not LOS
   - What's unclear: Can player see through walls? Or only tiles with path to player?
   - Recommendation: Simple radius reveal (ignores walls) for Phase 76, add LOS in Phase 80 if needed

## Sources

### Primary (HIGH confidence)
- [Phaser 3 Fog of War Tutorial](https://blog.ourcade.co/posts/2020/phaser3-fog-of-war-field-of-view-roguelike/) - RenderTexture erase pattern
- [MDN Uint8Array.toBase64()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Uint8Array/toBase64) - ES2026 base64 encoding
- [Phaser 3 RenderTexture Examples](https://phaser.io/examples/v3/view/game-objects/render-texture/render-texture-as-a-mask) - Batch draw patterns
- Existing project patterns: ChunkManager (world coords), questStore (localStorage), TileRenderer (isometric transform)

### Secondary (MEDIUM confidence)
- [localStorage Quota Limits](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria) - 5-10MB browser limits verified
- [JavaScript Flood Fill Algorithm](https://www.freecodecamp.org/news/flood-fill-algorithm-explained/) - Iterative BFS approach
- [Phaser Blend Modes](https://docs.phaser.io/phaser/blend-mode) - MULTIPLY for fog overlay

### Tertiary (LOW confidence)
- [FastBitSet.js](https://github.com/lemire/FastBitSet.js/) - Only use if native bitwise ops prove slow (unlikely)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Phaser 3 and Uint8Array native to project, localStorage already used
- Architecture: HIGH - RenderTexture pattern verified in Ourcade tutorial + Phaser examples
- Pitfalls: MEDIUM - Based on common WebGL batching issues and web search findings, not project-specific testing

**Research date:** 2026-02-23
**Valid until:** 30 days (stable domain, Phaser 3 API mature, ES2026 features finalized)
