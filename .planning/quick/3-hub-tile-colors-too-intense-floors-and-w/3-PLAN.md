---
phase: quick-3
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/tiles/src/definitions/hub-canopy-tiles.ts
  - packages/tiles/src/definitions/hub-ironhold-tiles.ts
  - packages/tiles/src/definitions/hub-meridian-tiles.ts
  - packages/tiles/src/definitions/hub-salvage-tiles.ts
  - apps/web/src/game/rendering/ProceduralTileGenerator.ts
autonomous: true
requirements: [QUICK-3]

must_haves:
  truths:
    - "Hub floors/walls/corridors look like a metallic space station, not faction-colored rooms"
    - "Each hub still has a distinguishable faction identity through subtle color accents"
    - "Canopy (Verdant) is NOT a sea of green — it has steel-gray floors with green accent details"
    - "Decoration, hazard, and accent tiles retain more faction color but are toned down"
  artifacts:
    - path: "packages/tiles/src/definitions/hub-canopy-tiles.ts"
      provides: "Metallic base colors with green accents for Canopy structural tiles"
    - path: "packages/tiles/src/definitions/hub-ironhold-tiles.ts"
      provides: "Metallic base colors with rust/orange accents for Ironhold structural tiles"
    - path: "packages/tiles/src/definitions/hub-meridian-tiles.ts"
      provides: "Metallic base colors with blue accents for Meridian structural tiles"
    - path: "packages/tiles/src/definitions/hub-salvage-tiles.ts"
      provides: "Metallic base colors with warm scrap accents for Salvage structural tiles"
    - path: "apps/web/src/game/rendering/ProceduralTileGenerator.ts"
      provides: "Updated TILE_PALETTES with metallic base + faction accent rendering colors"
  key_links:
    - from: "packages/tiles/src/definitions/hub-*-tiles.ts"
      to: "apps/web/src/game/rendering/ProceduralTileGenerator.ts"
      via: "TILE_PALETTES map uses same tile IDs"
      pattern: "canopy_floor.*buildPalette"
---

<objective>
Rework all hub tile colors so structural tiles (floor, wall, corridor, door, window) use a shared metallic/industrial space station palette with subtle faction-specific tinting, while accent/decoration/hazard tiles retain more faction color but are significantly toned down from their current saturated state.

Purpose: Hubs are on an orbital space station. They should look like a space station with faction accents — not fully faction-colored rooms. Canopy is the worst offender (entirely green) but all hubs need the treatment.
Output: Updated tile definitions and rendering palettes across all 4 hub files + ProceduralTileGenerator
</objective>

<execution_context>
@/Users/krzysztof.kalamarski/.claude/get-shit-done/workflows/execute-plan.md
@/Users/krzysztof.kalamarski/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@packages/tiles/src/definitions/hub-canopy-tiles.ts
@packages/tiles/src/definitions/hub-ironhold-tiles.ts
@packages/tiles/src/definitions/hub-meridian-tiles.ts
@packages/tiles/src/definitions/hub-salvage-tiles.ts
@apps/web/src/game/rendering/ProceduralTileGenerator.ts (lines 130-174: TILE_PALETTES hub section, and lines 36-44: buildPalette function)

<interfaces>
From packages/tiles/src/types.ts:
```typescript
export interface TileDefinition {
  readonly id: string;
  readonly displayName: string;
  readonly isBlocking: boolean;
  readonly movementSpeed: number;
  readonly textureKey: string;
  readonly defaultElevation: number;
  /** Render color (hex number, e.g., 0x2a2a3a) - used until sprites are available */
  readonly color: number;
  readonly description?: string;
  readonly tileState?: TileState;
  readonly visibilityModifier?: number;
  readonly hooks?: TileHooks;
}
```

From ProceduralTileGenerator.ts:
```typescript
export interface TilePalette {
  top: number;    // Top face base color (brightest face)
  south: number;  // South face — lit side (~65% of top brightness)  [auto-derived]
  east: number;   // East face — shadow side (~40% of top brightness) [auto-derived]
  accent: number; // Detail/accent color for decorations on faces
  accentAlt?: number; // Optional secondary accent
}

function buildPalette(top: number, accent: number, accentAlt?: number): TilePalette
// south and east are auto-computed from top via darkenColor
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Update hub tile definition colors to metallic base palette</name>
  <files>
    packages/tiles/src/definitions/hub-canopy-tiles.ts
    packages/tiles/src/definitions/hub-ironhold-tiles.ts
    packages/tiles/src/definitions/hub-meridian-tiles.ts
    packages/tiles/src/definitions/hub-salvage-tiles.ts
  </files>
  <action>
Update the `color` field on each hub tile definition. The `color` field is the fallback color used in tile definitions. It should match the new palette direction.

**Metallic base color philosophy:**
All four hubs share a space-station metallic base. Structural tiles (floor, wall, corridor, door, window) use a neutral steel gray with a very subtle faction tint — just enough to tell hubs apart on close inspection. Faction-specific tiles (decoration, accent, hazard) use a more noticeable but still restrained faction color.

**Structural tile base colors (floor, wall, corridor, door, window):**
Use steel-gray tones with subtle faction hue shifts. The key idea is that R, G, B channels should be close together (gray) with a slight bump in the faction channel.

- Canopy (Verdant) — cool steel with slight green shift:
  - floor: 0x484e4a (gray with faint green)
  - wall: 0x353a37 (darker gray with faint green)
  - door: 0x505854 (mid gray, slightly green)
  - corridor: 0x464c48 (match floor tone)
  - window: 0x3a403c (dark gray-green)

- Ironhold (Helix) — warm steel with slight amber shift:
  - floor: 0x4e4c48 (gray with faint warm tone)
  - wall: 0x3a3835 (darker warm gray)
  - door: 0x585550 (mid warm gray)
  - corridor: 0x4c4a46 (match floor tone)
  - window: 0x403e3a (dark warm gray)

- Meridian (Nexus) — cool steel with slight blue shift:
  - floor: 0xb0b4ba (light steel gray, faint blue)
  - wall: 0x888c94 (mid steel gray, faint blue)
  - door: 0xa0a4ac (light-mid steel)
  - corridor: 0xaab0b6 (match floor tone)
  - window: 0x90949c (dark steel blue)

- Salvage (Unaffiliated) — neutral steel with slight warmth:
  - floor: 0x504e4a (gray with slight warm)
  - wall: 0x3e3c38 (darker neutral warm)
  - door: 0x5a5854 (mid gray warm)
  - corridor: 0x4c4a46 (match floor tone)
  - window: 0x44423e (dark neutral warm)

**Faction-specific tiles (decoration, accent, hazard) — more color but restrained:**
These can have more faction identity but should NOT be fully saturated. Use muted, desaturated versions.

- Canopy: decoration 0x3a6a4a, accent 0x2a5a3a, hazard 0x44bb66 (hazard can stay bright for gameplay)
- Ironhold: decoration 0x6a5a3a, accent 0x4a3a2a, hazard 0xcc6622 (keep as-is, already good)
- Meridian: decoration 0x6688aa, accent 0x88a0bb, hazard 0x4488ff (keep as-is, already good)
- Salvage: decoration 0x7a6a4a, accent 0x6a5a3a, hazard 0xaa4422 (keep as-is, already good)
  </action>
  <verify>
    npx nx run tiles:build
  </verify>
  <done>All 4 hub tile definition files have metallic-base color values for structural tiles, with decoration/accent/hazard tiles using more restrained faction colors</done>
</task>

<task type="auto">
  <name>Task 2: Update TILE_PALETTES in ProceduralTileGenerator for metallic cube rendering</name>
  <files>
    apps/web/src/game/rendering/ProceduralTileGenerator.ts
  </files>
  <action>
Update the TILE_PALETTES entries for all hub tiles (lines ~136-173). The `buildPalette(top, accent, accentAlt?)` function auto-derives south (65% of top) and east (40% of top) face colors from the top color. So we only need to set the top face color and accent colors.

**Design principle:**
- `top` = the metallic base color for the cube's top face (what the player mostly sees). Structural tiles: neutral steel gray with barely-there faction tint. Faction tiles: muted faction color.
- `accent` = the color used for detail patterns drawn ON the faces. This is where faction identity comes through. Keep these moderately colorful — they appear as small details (panel lines, rivets, lights) not as the whole face.
- `accentAlt` = secondary accent, used for variation. Optional.

**Updated TILE_PALETTES entries:**

```
// ── Hub Station: Canopy (Verdant) — metallic steel + green accents ──
canopy_floor:       buildPalette(0x484e4a, 0x3a9966, 0x506058),
canopy_wall:        buildPalette(0x353a37, 0x2a7744),
canopy_door:        buildPalette(0x505854, 0x44aa77, 0x48604e),
canopy_corridor:    buildPalette(0x464c48, 0x338855, 0x4e5850),
canopy_decoration:  buildPalette(0x3a6a4a, 0x55cc88),
canopy_accent:      buildPalette(0x3e5a48, 0x44bb77, 0x4a6a52),
canopy_window:      buildPalette(0x3a403c, 0x44ddaa),
canopy_hazard:      buildPalette(0x484e4a, 0x88ff44, 0x44bb66),
```

```
// ── Hub Station: Ironhold (Helix) — metallic steel + rust/amber accents ──
ironhold_floor:       buildPalette(0x4e4c48, 0x996633, 0x585650),
ironhold_wall:        buildPalette(0x3a3835, 0x774422),
ironhold_door:        buildPalette(0x585550, 0xbb7733, 0x504e48),
ironhold_corridor:    buildPalette(0x4c4a46, 0x885522, 0x56544e),
ironhold_decoration:  buildPalette(0x5a5a52, 0xcc7733),
ironhold_accent:      buildPalette(0x504a42, 0xaa6633, 0x5a5448),
ironhold_window:      buildPalette(0x403e3a, 0xee7733),
ironhold_hazard:      buildPalette(0x4e4c48, 0xff4422, 0xffaa22),
```

```
// ── Hub Station: Meridian (Nexus) — polished steel + blue accents ──
meridian_floor:       buildPalette(0xb0b4ba, 0x4488cc, 0xbcc0c8),
meridian_wall:        buildPalette(0x888c94, 0x3366aa),
meridian_door:        buildPalette(0xa0a4ac, 0x55aadd, 0xaeb2ba),
meridian_corridor:    buildPalette(0xaab0b6, 0x4488bb, 0xb4bac0),
meridian_decoration:  buildPalette(0xc0c4cc, 0x5599dd),
meridian_accent:      buildPalette(0xa8b0b8, 0x5599cc, 0xb0b8c0),
meridian_window:      buildPalette(0x90949c, 0x55bbee),
meridian_hazard:      buildPalette(0xb0b4ba, 0x2266ff, 0x88bbff),
```

```
// ── Hub Station: Salvage (Unaffiliated) — worn steel + warm scrap accents ──
salvage_floor:       buildPalette(0x504e4a, 0x997744, 0x585650),
salvage_wall:        buildPalette(0x3e3c38, 0x776644),
salvage_door:        buildPalette(0x5a5854, 0xaa8855, 0x525048),
salvage_corridor:    buildPalette(0x4c4a46, 0x886644, 0x56544e),
salvage_decoration:  buildPalette(0x605a50, 0xbb9944),
salvage_accent:      buildPalette(0x545248, 0x998844, 0x5e5c52),
salvage_window:      buildPalette(0x44423e, 0xccaa55),
salvage_hazard:      buildPalette(0x504e4a, 0xff6622, 0xffaa44),
```

**Key changes from current state:**
- Canopy: top colors go from saturated greens (0x1a5a3a) to steel grays (0x484e4a) — dramatic desaturation
- Ironhold: top colors stay similar but unified to be more consistently metallic gray (slight adjustment)
- Meridian: top colors already metallic, minor adjustments to ensure consistency
- Salvage: top colors shift from brown-earthy to more neutral steel-warm

The accent colors remain moderately colorful — this is what gives each hub its personality through panel details, light strips, and decorative patterns drawn by the ProceduralTileGenerator's drawTopAccents/drawSouthAccents/drawEastAccents methods.
  </action>
  <verify>
    npx nx run web:build 2>&1 | tail -5
  </verify>
  <done>TILE_PALETTES in ProceduralTileGenerator uses metallic base top colors with faction-colored accents for all 4 hubs. Structural tiles render as space-station gray cubes with faction-tinted detail lines. Canopy is no longer a green monolith.</done>
</task>

</tasks>

<verification>
- `npx nx run tiles:build` succeeds (tile definitions compile)
- `npx nx run web:build` succeeds (renderer compiles)
- Visual check: Hub floors/walls/corridors should look metallic gray, not faction-saturated
</verification>

<success_criteria>
- All 4 hub tile definition files updated with metallic base colors
- TILE_PALETTES in ProceduralTileGenerator updated with metallic top + faction accent approach
- Canopy (Verdant) no longer appears as a sea of green — steel gray with green accents
- Ironhold, Meridian, Salvage similarly rebalanced with metallic base
- Both packages build without errors
</success_criteria>

<output>
After completion, create `.planning/quick/3-hub-tile-colors-too-intense-floors-and-w/3-SUMMARY.md`
</output>
