# Phase 156: Liquid Tile Definitions - Context

**Gathered:** 2026-03-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Define liquid tile types for all biomes in the tile registry. Each liquid has a lore-appropriate color, opacity flag (translucent/opaque), and properties for half-height rendering and gameplay effects. This is data definition — no generation or rendering logic.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
User deferred all decisions. Derive liquid types from lore/world-bible.md. Follow existing tile definition patterns in packages/tiles/src/definitions/.

Key constraints from user:
- Each biome gets a unique liquid type
- Liquids are half-height blocks (32px = ELEVATION_HEIGHT_STEP / 2)
- Some translucent (show terrain below), some opaque (cover terrain) — per lore
- Liquid tiles are NOT blocking (isBlocking: false)
- Tile definitions should carry effect metadata: movement speed modifier, damage per tick, heal per tick, effect description
- Liquid colors derived from lore biome themes

Proposed liquid types (from earlier discussion):
| Biome | Liquid | Opacity | Effect |
|-------|--------|---------|--------|
| Void Plains | Void Ether | Translucent dark purple | Slow + minor debuff |
| Volcanic | Magma | Opaque orange/red | Slow + damage |
| Crystal | Resonant Fluid | Translucent blue/prismatic | Slow only |
| Fungal | Spore Sludge | Semi-opaque green | Slow + poison DoT |
| Ice | Glacial Melt | Translucent cyan | Slow + cold debuff |
| Ruins | Ancient Runoff | Translucent grey | Slow only |
| Crater | Impact Brine | Semi-opaque brown | Slow + minor damage |
| Tidal | Seawater | Translucent blue-green | Slow |
| Kelp | Deep Seawater | Translucent dark blue-green | Slow (more) |
| Trench | Abyssal Water | Semi-opaque dark blue | Slow (heavy) |
| Bioluminescent | Luminous Nectar | Translucent glow | Slow + heal |
| Void Rift | Rift Plasma | Opaque dark purple | Slow + damage |
| Crystalline Wastes | Silicon Solution | Translucent white | Slow + vision debuff |

</decisions>

<specifics>
## Specific Ideas

- Follow the pattern of existing tile definition files (e.g., void-tiles.ts, crystal-tiles.ts)
- Create a single liquid-tiles.ts or per-biome liquid definitions
- Add TileId enum entries for each liquid
- The tile definition should include new fields: `isLiquid: true`, `liquidOpacity: 'translucent' | 'opaque'`, `liquidEffect: { speedMultiplier, damagePerTick, healPerTick }`
- Register all liquids in the tile registry

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 156-liquid-tile-definitions*
*Context gathered: 2026-03-25*
