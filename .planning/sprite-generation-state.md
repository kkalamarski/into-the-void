# Creature Sprite Generation - State

## Pipeline Rules (learned)
- Max 8 concurrent job slots across ALL operations
- Animation requires ALL 8 slots (1 per direction) - can't run anything else concurrently
- Character creation uses 1 slot each - max 2-3 at a time is safe
- Creating while animation runs → failures
- Cat template: use `running-8-frames` (no `walk` available)
- Lion template: use `walk-8-frames`
- Dog template: check available animations (likely `walk` or `running-8-frames`)
- Horse template: check available animations
- Bear template: check available animations
- Humanoid template: use `walking-8-frames` (BUT user says NO humanoids)

## Sprite Settings
- Size: 128px, View: low top-down, Directions: 8
- Detail: medium, Outline: single color black outline, Shading: basic shading

## User Preferences
- NO humanoid characters - all quadrupeds
- Reuse existing sprites where possible (map multiple creatures to same sprite)
- Incorporate plant/mineral/void elements to make creatures feel unique
- Be SPECIFIC about what plant or mineral the creature resembles (e.g. "bracket fungus growths on back", "obsidian-plated hide", "quartz crystal spines", "barnacle-encrusted shell", "lichen-covered armor", "amethyst geode clusters", "moss-covered basalt plates", "coral polyp growths")
- Avoid generic descriptions like "bioluminescent patches" - name the actual organism/mineral

## Code Changes DONE
- PreloadScene.ts: all 41 creatures mapped in `creatureSprites`, `animatedCreatures`
- EntityRenderer.ts: all 41 creatures in `ANIMATED_CREATURES`, `ANIMATED_CREATURE_SCALE`, `ANIMATED_CREATURE_SHADOW`, `ANIMATED_CREATURE_Y_OFFSET`
- Void Crawler changed from 'violet-wolf' to 'void-crawler'
- Coastal Scuttler changed from 'neon-creature' to 'coastal-scuttler'
- NOTE: existing tileSize TS warning (line ~166) is pre-existing, not from our changes

## Walk Animation Directory Naming
- Cat template uses `running-8-frames` but PixelLab names animation dir after animation_name param ("walk")
- Lion template has native `walk-8-frames`
- The PreloadScene code loads from `animations/walk-8-frames/` path
- IMPORTANT: After downloading ZIPs, verify the animation directory name matches `walk-8-frames`
  - If it's named `running-8-frames` or `walk`, rename to `walk-8-frames` during extraction

## Characters COMPLETE (all 5 downloaded, extracted, 8 rotations + 8 walk animation dirs each)
1. Void Crawler - `306809dc-d344-4998-a8ed-df00899feae9` - cat - DONE → sprites/creatures/void-crawler/
2. Coastal Scuttler - `144812df-f43a-491f-9b3f-a22d7e391d1a` - cat - DONE → sprites/creatures/coastal-scuttler/
3. Marsh Lurker - `eb2e0449-7b52-44b9-a14f-aafd5799577f` - lion - DONE → sprites/creatures/marsh-lurker/
4. Spore Carrier v2 - `0262a37b-90d2-4a3e-af53-2e70eb3f5ee2` - cat - DONE → sprites/creatures/spore-carrier/
5. Miasma Drifter v2 - `4ec51000-99b7-411b-a161-564d3386b820` - cat - DONE → sprites/creatures/miasma-drifter/

## Old Humanoid Characters (DISCARD)
- Spore Carrier v1: `03f20d64-a9dc-4296-963b-9bab8596bf9a` - humanoid, animation done but discarding
- Miasma Drifter v1: `9dbef375-e11d-4e12-a966-0025b5019795` - humanoid, discard

## Reuse Mapping (creatures → sprite folder)
After creating 5 new unique sprites, map all 30 creatures like this:

### New sprites being created (5)
- void-crawler (cat) → creature_void_crawler
- coastal-scuttler (cat) → creature_coastal_scuttler
- marsh-lurker (lion) → creature_marsh_lurker
- spore-carrier (cat) → creature_spore_carrier
- miasma-drifter (cat) → creature_miasma_drifter

### Existing sprites (9 with proper sprites)
- canopy-grazer → creature_canopy_grazer
- tide-crab → creature_tide_crab
- coastal-urchin → creature_coastal_urchin
- reef-scavenger → creature_reef_scavenger
- crystal-hunter → creature_crystal_hunter
- crystal-crawler → creature_crystal_crawler
- frost-stalker → creature_frost_stalker
- toxic-lurker → creature_toxic_lurker
- void-horror → creature_void_horror

### Reuse assignments (25 remaining creatures → existing sprites)
| Creature | Maps To Sprite | Template |
|----------|---------------|----------|
| creature_dart_runner | frost-stalker | dog-like predator |
| creature_petrified_lurker | void-horror | lion predator |
| creature_kelp_grazer | neon-creature | horse grazer |
| creature_tangle_stalker | marsh-lurker | lion stalker |
| creature_current_rider | frost-stalker | dog swimmer |
| creature_echo_drifter | spore-carrier | small creature |
| creature_phase_grazer | neon-creature | horse grazer |
| creature_reality_scavenger | void-crawler | dog scavenger |
| creature_magma_beast | crystal-hunter | bear heavy |
| creature_ash_skimmer | coastal-scuttler | small cat |
| creature_ice_burrower | crystal-crawler | bear burrower |
| creature_null_feeder | neon-creature | horse grazer |
| creature_dimensional_hunter | void-horror | lion predator |
| creature_rift_hunter | marsh-lurker | lion stalker |
| creature_pressure_feeder | toxic-lurker | bear heavy |
| creature_trench_hunter | void-horror | lion apex |
| creature_abyssal_scavenger | void-crawler | dog scavenger |
| creature_starfall_grazer | neon-creature | horse grazer |
| creature_crater_stalker | marsh-lurker | lion hunter |
| creature_guardian_construct | crystal-crawler | bear construct |
| creature_ruin_seeker | frost-stalker | dog seeker |
| creature_relic_beast | crystal-hunter | bear beast |
| creature_void_grazer | marsh-lurker | lion type |
| creature_anomaly_scavenger | void-crawler | dog scavenger |
| creature_void_stalker | void-horror | lion apex |
| creature_dimensional_aberration | toxic-lurker | bear heavy |
| creature_abyssal_leviathan | toxic-lurker | bear massive |

## Code Changes COMPLETE
- PreloadScene.ts: all 41 creatures mapped in `creatureSprites` and `animatedCreatures`
- EntityRenderer.ts: all 41 creatures in `ANIMATED_CREATURES`, scale, shadow, y-offset
- TypeScript compiles clean (`npx tsc --noEmit` passes)
- All 5 new sprite directories populated with 8 rotations + 8 walk animation directions
