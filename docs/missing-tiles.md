# Missing Tile Sprites Audit

All tiles are 256x256 isometric cubes (top face + south/east sides pre-rendered).
Sprites live in `apps/web/public/assets/sprites/`.

## Summary

| Category | Count |
|----------|-------|
| Tiles missing sprites entirely | 14 |
| Floor tiles missing v2/v3 variants | 3 (6 sprites) |
| Biomes reusing other tiles (no unique set) | 2 (4 potential sprites) |
| **Total sprites needed** | **24** |

---

## 1. Aquatic Biome Tiles (7 missing)

### `tidal_floor` - Tidal Pools (Tier I)

- **Texture key:** `tile_tidal_floor`
- **Fallback color:** `#c2b280` (sandy tan)
- **In-game:** Traversable floor, normal speed, 0.85 visibility
- **Lore context:** Dual-moon tidal cycles create geometric patterns on the seabed. Tide pools that never drain. Mineral deposits under tidal stress.
- **Design suggestion:** Wet sandy seabed with faint geometric etchings in the surface. Shallow water film reflecting light. Concentric tidal rings where water recedes. Warm sandy base tones with blue-green tints where moisture collects. Scattered small stones and shell-like fragments.

### `tidal_shallow` - Tidal Pools (Tier I)

- **Texture key:** `tile_tidal_shallow`
- **Fallback color:** `#87ceeb` (sky blue)
- **In-game:** Shallow water state, 0.7 speed, 0.85 visibility
- **Lore context:** Water that "feels wrong" chemically. Inconsistent sensor returns in deeper water.
- **Design suggestion:** Translucent shallow water over a visible sandy bed. Caustic light patterns rippling on the floor beneath. Small bubbles and floating particulates. Soft turquoise-to-azure gradient. The water should feel slightly unnatural -- too still, too clear.

### `kelp_floor` - Kelp Forests (Tier II)

- **Texture key:** `tile_kelp_floor`
- **Fallback color:** `#2e8b57` (sea green)
- **In-game:** Shallow water, 0.6 speed, 0.7 visibility
- **Lore context:** 50-meter kelp that moves without currents. Bioluminescent pulses. Lost time reported by divers.
- **Design suggestion:** Dark ocean floor with root-like kelp anchors gripping the sediment. Organic silt and detritus between roots. Faint bioluminescent speckles embedded in the ground. Murky green-brown base with scattered luminous cyan dots. Should feel enclosed and disorienting.

### `kelp_wall` - Kelp Forests (Tier II)

- **Texture key:** `tile_kelp_wall`
- **Fallback color:** `#006400` (dark green)
- **In-game:** Blocking wall, impassable
- **Lore context:** Kelp thicker than a man, forming patterns -- spirals, grids. Clicking sounds "almost like language." Deep in the thickest groves, the clicking sounds "almost form words."
- **Design suggestion:** Dense vertical kelp stalks packed so tightly they're impassable. Deep green with faint cyan bioluminescent veins running through the stalks. Suggest depth and layering -- stalks at different distances fading into murky darkness. An eerie, organic wall that feels alive. Subtle spiral/pattern hints in the stalk arrangement.

### `trench_floor` - Deep Trenches (Tier III)

- **Texture key:** `tile_trench_floor`
- **Fallback color:** `#000080` (navy)
- **In-game:** Deep water, 0.3 speed, 0.6 visibility
- **Lore context:** Trench walls are artificial in places -- "too smooth, too geometric, too much like infrastructure." Apex predators the size of shuttles. Classified audio from maximum-depth probes.
- **Design suggestion:** Abyssal ocean floor -- dark basalt cracked by pressure. Geometric smoothness in patches suggesting artificial construction. Sparse bioluminescent bacteria in the fissures emitting faint blue-white glow. Near-total darkness with isolated pinpoints of light. Cold, oppressive, industrial-ancient.

### `trench_deep` - Deep Trenches (Tier III)

- **Texture key:** `tile_trench_deep`
- **Fallback color:** `#00001a` (near-black blue)
- **In-game:** Deep water, 0.2 speed, 0.5 visibility
- **Lore context:** "Shapes move that are too large to be creatures and too purposeful to be debris." Rhythmic, patterned sounds from below. Construction signs for kilometers down.
- **Design suggestion:** Near-total darkness. Almost entirely black with occasional rhythmic pulses of deep indigo light from below. Subtle distortion shimmer suggesting immense pressure. Faint geometric lines in the abyss hinting at vast structures. The tile should feel like staring into something that stares back.

### `shore_transition` - Biome Boundaries

- **Texture key:** `tile_shore`
- **Fallback color:** `#f5deb3` (wheat/sand)
- **In-game:** Traversable, 0.9 speed, full visibility
- **Design suggestion:** Transitional strip where land meets water. Wet sand with foam lines and small tide pools. Half-terrestrial, half-aquatic split diagonally across the isometric cube. Broken fragments, scattered alien pebbles. Warm tan fading into wet blue-grey at the water edge. Foam residue lines marking previous tides.

---

## 2. Exotic Biome Tiles (6 missing)

### `void_rift_floor` - Void Rift (Tier IV)

- **Texture key:** `tile_void_rift_floor`
- **Fallback color:** `#4a0080` (deep purple)
- **In-game:** Traversable, 0.8 speed, 0.7 visibility
- **Lore context:** Spatial geometry breaks down. Gravity pulls at inconsistent angles. Objects occupy multiple positions simultaneously. Paths loop impossibly. Terrain looks different depending on when you observe it.
- **Design suggestion:** Reality-fractured ground -- dark stone cracked into geometric fragments with glowing violet energy bleeding through seams. Floating debris particles frozen mid-air. The ground should look unstable, tiles slightly displaced from their correct position. Deep purple-black base with vivid magenta/violet light in the cracks. Subtle suggestion that the geometry is *wrong* -- angles that don't quite add up.

### `void_rift_distortion` - Void Rift (Tier IV)

- **Texture key:** `tile_void_rift_distortion`
- **Fallback color:** `#6a00a0` (bright purple)
- **In-game:** Blocking wall, impassable, elevation 3
- **Lore context:** "Something vast... exists in more dimensions than equipment can measure." Creatures phase in and out of visibility. Technology functioning on unexplainable principles.
- **Design suggestion:** Active spatial anomaly -- the tile itself appears warped or folded. Swirling purple-violet energy with chromatic aberration effects. Parts of the surface should appear duplicated or offset, like a dimensional tear. Visual echoes or ghosting suggesting multiple overlapping realities. Bright violet core fading to dark edges. Should feel dangerous and alien.

### `crystalline_floor` - Crystalline Wastes (Tier III)

- **Texture key:** `tile_crystalline_floor`
- **Fallback color:** `#add8e6` (light blue)
- **In-game:** Traversable, 0.9 speed, 1.2 visibility (crystal reflections enhance it)
- **Lore context:** Sub-audible resonance felt in bone. Crystals respond to proximity. Growth patterns suggest intent. Workers hear words in the resonance, see faces in facets.
- **Design suggestion:** Ground covered in shattered silicon-crystal shards embedded in pale blue-white mineral soil. Prismatic light refractions creating rainbow highlights on the angular surfaces. Cool ice-blue base with warm spectral flashes. Angular, geometric fracture patterns. The surface should glitter and feel sharp. Faint geometric regularity in the crystal placement hinting at non-random growth.

### `crystal_formation_large` - Crystalline Wastes (Tier III)

- **Texture key:** `tile_crystal_formation_large`
- **Fallback color:** `#87ceeb` (sky blue)
- **In-game:** Blocking wall, impassable, elevation 4
- **Lore context:** Largest spires produce sounds approaching music. Colonists who stay too long stop speaking in words -- they hum instead. "The crystals hum back."
- **Design suggestion:** Towering translucent crystal spires growing from the floor, much taller than the existing `crystal_formation` tile. Internal light refraction creating an inner glow. Pale blue-white with shifting internal color bands. Should feel monumental and alive -- beautiful but deeply unsettling. Faceted surfaces with faint face-like reflections if you look closely. Larger, more imposing than the Tier I crystal_caves variant.

### `bioluminescent_floor` - Bioluminescent Depths (Tier II)

- **Texture key:** `tile_bioluminescent_floor`
- **Fallback color:** `#00ff88` (bright cyan-green)
- **In-game:** Traversable, normal speed, 0.75 visibility
- **Lore context:** 60m underwater caves. Light constant, shifting through blues and greens. Energy budget impossible -- something unknown provides energy. Water chemistry has compounds that shouldn't form naturally.
- **Design suggestion:** Deep underwater cave floor with embedded bioluminescent organisms. Dense clusters of glowing cyan-green organic matter fused into dark rock. Soft-tissue-covered surfaces -- not mineral, biological. Dark stone base with vivid neon-green and teal light sources. The glow should feel natural and organic, not technological. Subtle pulse suggestion in the brightness variation.

### `bioluminescent_flora` - Bioluminescent Depths (Tier II)

- **Texture key:** `tile_bioluminescent_flora`
- **Fallback color:** `#00cc66` (darker green)
- **In-game:** Traversable, 0.7 speed, 0.6 visibility, elevation 2
- **Lore context:** Structures form architectural patterns -- chambers, passages, arches of soft tissue. Something vast, ancient, sleeping in the deepest chambers. Light pulses like a heartbeat. "It might have been waiting for us."
- **Design suggestion:** Alien underwater flora producing impossible amounts of light. Bulbous, organic shapes -- anemone-like growths, tube worms, fungal-cap structures. All emitting brilliant green-cyan bioluminescence. Should feel alive and watchful. Biological arches and structures that suggest architecture more than nature. Dense enough to slow movement. The light should pulse unevenly, like breathing.

---

## 3. Structure Tile (1 missing)

### `portal` - All Biomes

- **Texture key:** `tile_portal`
- **Fallback color:** `#6a00ff` (vivid violet)
- **In-game:** Traversable, normal speed. Transports players to faction hubs.
- **Design suggestion:** Swirling interdimensional gateway on a constructed stone platform. Bright violet-purple energy vortex at center with concentric rings radiating outward. Floating debris particles being pulled inward. Clearly artificial/constructed -- distinct from any natural terrain. Stone or metal base with alien glyphs or faction markings. Should be visually unmistakable at a glance as "step here to teleport."

---

## 4. Floor Tile Variants Missing (3 tiles, 6 sprites)

These tiles have base sprites but lack `_v2` and `_v3` variants, reducing visual variety in their biomes. Other floor tiles (toxic, ruins, volcanic, fungal, crater) already have all three variants.

| Tile | Files needed | Variation suggestions |
|------|-------------|----------------------|
| `void_floor` | `tile_void_floor_v2.png`, `tile_void_floor_v3.png` | Shift crack patterns in the dark stone. Vary debris placement. Add/remove small rubble piles. Change surface wear patterns. |
| `crystal_floor` | `tile_crystal_floor_v2.png`, `tile_crystal_floor_v3.png` | Rearrange small crystal shard positions and sizes. Vary prismatic highlight locations. Change the density/spread of embedded crystals. |
| `ice_floor` | `tile_ice_floor_v2.png`, `tile_ice_floor_v3.png` | Change ice crack/fracture patterns. Vary frost density and texture. Shift embedded air bubble positions. Alter surface smoothness. |

---

## 5. Biomes Without Dedicated Tiles (2 biomes, 4 potential sprites)

These biomes reuse tiles from other biomes. They work but lack visual identity.

### Miasma Marshes (Tier II)

- **Currently reuses:** `fungal_floor` + `toxic_pool`
- **Lore context:** Toxic swamp, oppressive atmosphere, chemical filtration required.
- **Potential tiles:**
  - `miasma_floor` -- Murky swamp ground with rising gas bubbles. Greenish-brown bog surface with chemical residue patterns. Partially submerged organic matter. More swamp-like than fungal_floor, more organic than toxic_floor.
  - `miasma_pool` -- Stagnant, opaque pools of chemical sludge. Thicker and more viscous-looking than toxic_pool. Surface sheen of iridescent contamination. Gas bubble trails rising from below.

### Petrified Expanse (Tier II)

- **Currently reuses:** `void_floor` + `void_wall`
- **Lore context:** Mineralized ancient forests. Calcification hazard -- everything must keep moving or risk petrification.
- **Potential tiles:**
  - `petrified_floor` -- Grey-white mineralized ground with fossilized organic shapes frozen in stone. Calcified root systems and leaf impressions embedded in the surface. Chalky, bleached appearance distinct from void_floor's dark stone.
  - `petrified_wall` -- Mineralized ancient tree trunks turned to stone. Recognizable bark texture and branch stubs, but entirely mineral. Grey-white with subtle crystalline deposits. Should feel like a forest turned to statues.

---

## Code Changes Required

When sprites are added, `PreloadScene.ts` must be updated to load them. Currently only the original 16 tiles are loaded in `loadFloorTileSprites()` at `apps/web/src/game/scenes/PreloadScene.ts:236-271`.
