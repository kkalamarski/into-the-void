# Requirements: Into the Void

**Defined:** 2026-02-17
**Core Value:** Real-time multiplayer gameplay with responsive movement and visual feedback

## v1.10 Requirements

Requirements for Combat UX milestone. Each maps to roadmap phases.

### Bug Fixes

- [ ] **FIX-01**: Predator/maniac creatures properly aggro on nearby players

### Click-to-Attack

- [ ] **CATK-01**: Player can click a creature with a combat tool equipped to start auto-attacking
- [ ] **CATK-02**: Attack only initiates if creature is within tool's attack range
- [ ] **CATK-03**: Combat tools have per-tool attack ranges (melee=1 tile, ranged=3-5 tiles)
- [ ] **CATK-04**: Entity sprites are interactive (clickable) in Phaser

### Target Selection

- [ ] **TARG-01**: Targeted entity shows visual highlight (glow, outline, or marker)
- [ ] **TARG-02**: Target indicator persists while in combat with that entity
- [ ] **TARG-03**: Target clears when combat ends (kill, death, leash, out of range)
- [ ] **TARG-04**: Clicking a different creature switches target

### Combat Log

- [ ] **CLOG-01**: Combat log panel displays damage dealt by player
- [ ] **CLOG-02**: Combat log panel displays damage received by player
- [ ] **CLOG-03**: Log entries include timestamp and damage amount
- [ ] **CLOG-04**: Log is scrollable and shows recent history
- [ ] **CLOG-05**: Log can be toggled visible/hidden

## v1.9 Requirements (Complete)

Requirements for Combat System milestone. All mapped.

### Combat Engagement

- [x] **COMB-01**: Player can click a creature with combat tool equipped to start attacking
- [x] **COMB-02**: Player auto-attacks the target every tick (~1 second) while in range
- [x] **COMB-03**: Damage is calculated from attacker's Power stat vs defender's Toughness
- [x] **COMB-04**: Haste stat affects attack speed (faster ticks at higher Haste)

### Creature Aggro

- [x] **AGGR-01**: Predators and maniacs automatically attack players within ~5 tiles
- [x] **AGGR-02**: Omnivores only attack if the player attacks them first
- [x] **AGGR-03**: Herbivores continue to flee (no aggro change from v1.8)

### Combat State

- [x] **CSTA-01**: Creatures have combat states: idle, attacking, chasing, returning
- [x] **CSTA-02**: Creatures chase players who move away (up to ~10 tiles from spawn)
- [x] **CSTA-03**: Creatures return to spawn point after losing target (leash exceeded)
- [x] **CSTA-04**: Combat ends when one combatant dies or leaves range

### Player Death

- [x] **DEAT-01**: Player dies when health reaches zero
- [x] **DEAT-02**: Dead player respawns at faction hub / safe point
- [x] **DEAT-03**: No item or XP loss on death (forgiving)

### Combat Feedback

- [x] **FEED-01**: Damage numbers appear above targets when hit
- [x] **FEED-02**: Combat state is visible in HUD (e.g., "In Combat" indicator)
- [x] **FEED-03**: Health bar updates in real-time during combat

## v1.8 Requirements (Complete)

Requirements for Entity System milestone. Each maps to roadmap phases.

### Entity Definitions

- [x] **ENTD-01**: BiomeType enum includes all 10 lore biomes (add `miasma_marshes`, `petrified_expanse`)
- [x] **ENTD-02**: CreatureBehavior type matches lore (`herbivore | omnivore | predator | maniac`)
- [x] **ENTD-03**: Plant and Artifact entity types added to EntityType with supporting interfaces
- [x] **ENTD-04**: `packages/entities` workspace package created mirroring `packages/items` pattern
- [x] **ENTD-05**: EntityRegistryImpl singleton with creature, plant, mineral, artifact definitions
- [x] **ENTD-06**: ~10 creature definitions covering all biomes with behavior types and level ranges
- [x] **ENTD-07**: ~10 plant definitions covering all biomes with harvest yields
- [x] **ENTD-08**: ~10 mineral definitions covering all biomes with mining yields
- [x] **ENTD-09**: ~5 artifact definitions with one-time discovery (no respawn)
- [x] **ENTD-10**: Each entity definition includes loot table reference
- [x] **ENTD-11**: BIOME_SPAWN_CONFIGS updated with all entity IDs from new definitions

### Spawning

- [x] **SPWN-01**: Fertility noise layer using second SimplexNoise instance
- [x] **SPWN-02**: Fertility zones (Barren/Normal/Lush) affect spawn density per chunk
- [x] **SPWN-03**: Per-tile biome sampling for spawn table selection (not chunk-center)
- [x] **SPWN-04**: `createEntityFromSpawn()` enriches entities from EntityRegistry
- [x] **SPWN-05**: Spawn density caps per chunk (15 creatures, 10 minerals, 5 plants, 2 artifacts max)

### Persistence

- [x] **PERS-01**: `entity_lifecycle` DB table tracks spawn point state (killedAt, respawnAt)
- [x] **PERS-02**: Zone load applies lifecycle records before materializing spawn points
- [x] **PERS-03**: `ground_items` DB table persists dropped loot items
- [x] **PERS-04**: Ground items restored on zone load, deleted on pickup or expiry
- [x] **PERS-05**: Respawn timers survive server restart via DB persistence

### Loot

- [x] **LOOT-01**: Loot table schema in database (loot_tables, loot_table_entries)
- [x] **LOOT-02**: `rollLootTable()` pure function in game-logic using weighted random
- [x] **LOOT-03**: Loot resolved on creature death and spawned as ground items
- [x] **LOOT-04**: Loot resolved on mineral/plant depletion and spawned as ground items
- [x] **LOOT-05**: Ground items have despawn timer (configurable per item type)

### Interaction

- [x] **INTR-01**: Tool `range` property added to ItemDefinition (1-10 tiles)
- [x] **INTR-02**: Existing tools updated with range values based on rarity
- [x] **INTR-03**: `canInteract()` called server-side before processing any interaction
- [x] **INTR-04**: `entity:tool_use` client event added for tool-based interactions
- [x] **INTR-05**: EntityService handles tool use, harvest, mine, collect actions
- [x] **INTR-06**: Perception gating: entities show "???" when level > player.perception * 3
- [x] **INTR-07**: Level gating: interaction blocked when entity level > player level + 5
- [x] **INTR-08**: Health bars displayed for all entity types

### Creature AI

- [x] **CRAI-01**: AiService with tick loop scoped to zones with active players
- [x] **CRAI-02**: Self-rescheduling setTimeout pattern (not setInterval) prevents tick pile-up
- [x] **CRAI-03**: `tickCreatureAI()` pure FSM in game-logic with behavior-based states
- [x] **CRAI-04**: Herbivores: idle wander, flee when player within 5 tiles
- [x] **CRAI-05**: Omnivores: idle wander, ignore player unless damaged
- [x] **CRAI-06**: Predators: idle wander (no aggro in v1.8, combat deferred)
- [x] **CRAI-07**: Maniacs: idle wander (no aggro in v1.8, combat deferred)
- [x] **CRAI-08**: Creature position updates batched per zone per tick
- [x] **CRAI-09**: AI state stripped from server broadcasts (security)

### Respawn

- [x] **RESP-01**: Respawn tick loop processes entity_lifecycle records
- [x] **RESP-02**: Random respawn timer range per entity type
- [x] **RESP-03**: Artifacts have respawnTime: -1 (permanent removal after collection)
- [x] **RESP-04**: Respawned entities appear at original spawn point

### UI/HUD

- [x] **UIHD-01**: Zone HUD shows fertility type: "Biome Name (Fertility)"
- [x] **UIHD-02**: Entity fade-in animation on spawn/respawn
- [x] **UIHD-03**: Harvest depletion visual on minerals/plants (proportional to remaining yield)

### Entity Blocking

- [x] **EBLK-01**: Entities block player movement (player cannot step on entity tile)
- [x] **EBLK-02**: Pathfinding considers entity positions when calculating routes
- [x] **EBLK-03**: Click-to-move path stops if entity moves into path mid-execution

## v1.7 Requirements (Complete)

Requirements for Character Stats milestone.

### Stats Foundation

- [x] **STAT-01**: CharacterStats type replaces legacy PlayerStats with 8 primary stats
- [x] **STAT-02**: computeCharStats() pure function computes base + equipment bonuses
- [x] **STAT-03**: Base stats scale linearly with character level (per-stat tuning)
- [x] **STAT-04**: Creature stats use same computation function with creature-specific scaling

### Stats Integration

- [x] **STAT-05**: Durability stat affects maxHealth
- [x] **STAT-06**: Toughness stat affects damage reduction (armor)
- [x] **STAT-07**: Power stat affects damage output
- [x] **STAT-08**: Haste stat affects movement and attack speed
- [x] **STAT-09**: Vigor stat affects maxEnergy
- [x] **STAT-10**: Recovery stat affects energy regeneration rate
- [x] **STAT-11**: Perception stat affects detection range
- [x] **STAT-12**: Resilience stat affects hazard resistance
- [x] **STAT-13**: JSONB migration script updates existing character rows to new stat shape
- [x] **STAT-14**: Combat functions updated to use new stat names (power, toughness, haste)

### Stats Display

- [x] **STAT-15**: Stats panel UI shows all 8 stats with current values
- [x] **STAT-16**: Stat breakdown shows base vs equipment contribution ("30 + 15")
- [x] **STAT-17**: Level-up notification shows stat deltas ("+5 Durability")
- [x] **STAT-18**: Item tooltip shows stat delta comparison vs equipped item (green/red +/-)

## v1.6 Requirements (Complete)

### Item System

- [x] **ITEM-01**: Item definition registry with strategy pattern (like TileRegistry)
- [x] **ITEM-02**: 100 items defined across 6 categories (suits, modules, tools, consumables, world items, reagents)
- [x] **ITEM-03**: 5 rarity tiers with visual distinction (Common, Rare, Epic, Exotic, Legendary)
- [x] **ITEM-04**: Item level (ilvl) system representing item power
- [x] **ITEM-05**: Required character level for equipping/using items
- [x] **ITEM-06**: Item stacking for materials (up to 999 per stack)

### Equipment

- [x] **EQUIP-01**: Exo-suit as base equipment required for survival
- [x] **EQUIP-02**: Module slot count scales with suit rarity (Common=3, Legendary=6)
- [x] **EQUIP-03**: Armor module type (adds suit durability)
- [x] **EQUIP-04**: Speed module type (increases movement speed)
- [x] **EQUIP-05**: Life Support module type (oxygen/hazard resistance)
- [x] **EQUIP-06**: Sensor Array module type (detection range/minimap)
- [x] **EQUIP-07**: Power Core module type (energy capacity/recharge)
- [x] **EQUIP-08**: Mobility module type (jump height/terrain traversal)
- [x] **EQUIP-09**: Main + Secondary tool slots with hotkey swap
- [x] **EQUIP-10**: Tools have specialization stats (research/combat/mining)
- [x] **EQUIP-11**: Server-authoritative stat calculation from equipment

### Inventory

- [x] **INV-01**: Personal inventory with slot limit
- [x] **INV-02**: Item pickup from world entities with claim mechanism
- [x] **INV-03**: Item drop to world (spawns ground item)
- [x] **INV-04**: Item use for consumables (repair/buff)
- [x] **INV-05**: Atomic DB transactions for all inventory operations
- [x] **INV-06**: WebSocket events: inventory:update, inventory:use, inventory:drop, inventory:pickup

### UI

- [x] **UI-01**: Inventory grid panel with drag-drop (dnd-kit)
- [x] **UI-02**: Equipment panel showing suit + module slots + tool slots
- [x] **UI-03**: Action bar with 8 slots and number key hotkeys (1-8)
- [x] **UI-04**: Item tooltips with rarity color, ilvl, stats, description
- [x] **UI-05**: Personal storage panel (separate from inventory)
- [x] **UI-06**: Rarity color system (Common=gray, Rare=blue, Epic=purple, Exotic=orange, Legendary=gold)

### Database

- [x] **DB-01**: Migrate equipment schema from head/chest/legs/feet to exo-suit model
- [x] **DB-02**: Player inventory table with JSONB items column
- [x] **DB-03**: Player equipment stored as JSONB with suit + modules + tools
- [x] **DB-04**: Personal storage table for extended item storage

## v1.5 Requirements (Complete)

- [x] **INPUT-01**: Player can move in all 8 directions using WASD with dual-key detection
- [x] **MOVE-01**: Player movement speed is unified at 500ms delay (2 tiles/sec base)
- [x] **MOVE-02**: Server rate limit set to 450ms to support movement cadence
- [x] **MOVE-03**: Player movement speed is modified by tile movementSpeed property
- [x] **PATH-01**: Click-to-move pathfinding uses 8-directional A* with diagonal neighbors
- [x] **CAM-01**: Camera follows player with smooth lerp interpolation
- [x] **CAM-02**: Player sprite slides between tiles with tween animation
- [x] **CAM-03**: Tile hover highlight removed

## Future Requirements

Deferred to future releases. Not in current roadmap.

### Combat Abilities (v2.0+)

- **CABI-01**: Active combat abilities (power strike, block, etc.)
- **CABI-02**: Ability cooldowns and resource costs
- **CABI-03**: PvP combat between players

### Advanced AI

- **AADV-01**: Full A* pathfinding for creature movement
- **AADV-02**: Pack behavior (creatures coordinate attacks)
- **AADV-03**: Territory defense patterns

### Enhanced Entities

- **EENT-01**: Proximity trigger plants (spore clouds, acid pools)
- **EENT-02**: Creature taming (Verdant Dynamics faction feature)
- **EENT-03**: Named boss entities with unique loot
- **EENT-04**: Dynamic ecosystem simulation

### Tool Abilities

- **TOOL-01**: Tools add abilities to action bar
- **TOOL-02**: Tool durability and consumption

### Stats Enhancements

- **STAT-F01**: Soft-caps on derived effects (e.g., max 75% damage reduction)
- **STAT-F02**: Perception visual radius circle in Phaser canvas
- **STAT-F03**: Faction-specific stat bonuses (Verdant: +Resilience, etc.)

### Crafting

- **CRAFT-01**: Crafting recipes using reagent items
- **CRAFT-02**: Crafting UI with recipe discovery
- **CRAFT-03**: Workbench interaction for advanced recipes

### Trading

- **TRADE-01**: Player-to-player item trading
- **TRADE-02**: Trade confirmation UI
- **TRADE-03**: Trade history logging

### Advanced Items

- **ADV-ITEM-01**: Item durability and repair system
- **ADV-ITEM-02**: Item enchantments/upgrades
- **ADV-ITEM-03**: Set bonuses for matching equipment

### Visual Polish

- **VIS-01**: Click-to-move path shows step dots at each waypoint

### Advanced Movement

- **ADV-01**: Player can face a direction without moving (Ctrl+WASD)
- **ADV-02**: Player can toggle run/walk speed modes

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Full creature pathfinding | Performance risk at scale; directional wander is sufficient |
| Creature taming | Requires faction system integration |
| Boss entities | Requires spawn announcements, unique AI, separate design |
| Dynamic ecosystems | Scope creep — prey/predator dynamics deferred |
| Tool abilities | Future expansion after entity system stable |
| Tool durability | Future milestone |
| Stat point allocation on level-up | Breaks linear scaling balance; equipment provides build variety |
| Persistent consumable buffs in DB | Complex expiry logic, exploit vector; session-only buffs only |
| Multiplicative equipment stacking | Exponential power curves unbalanceable in multiplayer |
| Client-computed stats | Cheat vector; server is authoritative |
| Weight-based inventory | Slot limits are simpler, weight is anti-feature per research |
| Auto-equip on pickup | Breaks modular loadout agency |
| Cross-character shared stash | Corrupts per-character progression architecture |
| Real-time auction house | Too complex, separate milestone |
| Item socket/gem system | Deferred to enchantment milestone |
| Free-movement (non-grid) WASD | Breaks client-side prediction model |
| Camera rotation | Sprites drawn for fixed angle |
| Cross-zone pathfinding | Requires multi-zone graph |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

### v1.10 Combat UX

| Requirement | Phase | Status |
|-------------|-------|--------|
| FIX-01 | Phase 43 | Pending |
| CATK-01 | Phase 43 | Pending |
| CATK-02 | Phase 43 | Pending |
| CATK-03 | Phase 43 | Pending |
| CATK-04 | Phase 43 | Pending |
| TARG-01 | Phase 44 | Pending |
| TARG-02 | Phase 44 | Pending |
| TARG-03 | Phase 44 | Pending |
| TARG-04 | Phase 44 | Pending |
| CLOG-01 | Phase 45 | Pending |
| CLOG-02 | Phase 45 | Pending |
| CLOG-03 | Phase 45 | Pending |
| CLOG-04 | Phase 45 | Pending |
| CLOG-05 | Phase 45 | Pending |

**Coverage:**
- v1.10 requirements: 14 total
- Mapped to phases: 14
- Unmapped: 0

### v1.9 Combat System (Complete)

| Requirement | Phase | Status |
|-------------|-------|--------|
| COMB-01 | Phase 39 | Complete |
| COMB-02 | Phase 39 | Complete |
| COMB-03 | Phase 39 | Complete |
| COMB-04 | Phase 39 | Complete |
| AGGR-01 | Phase 40 | Complete |
| AGGR-02 | Phase 40 | Complete |
| AGGR-03 | Phase 40 | Complete |
| CSTA-01 | Phase 40 | Complete |
| CSTA-02 | Phase 40 | Complete |
| CSTA-03 | Phase 40 | Complete |
| CSTA-04 | Phase 40 | Complete |
| DEAT-01 | Phase 41 | Complete |
| DEAT-02 | Phase 41 | Complete |
| DEAT-03 | Phase 41 | Complete |
| FEED-01 | Phase 42 | Complete |
| FEED-02 | Phase 42 | Complete |
| FEED-03 | Phase 42 | Complete |

**Coverage:**
- v1.9 requirements: 17 total
- Mapped to phases: 17
- Unmapped: 0

### v1.8 Entity System (Complete)

| Requirement | Phase | Status |
|-------------|-------|--------|
| ENTD-01 | Phase 33 | Complete |
| ENTD-02 | Phase 33 | Complete |
| ENTD-03 | Phase 33 | Complete |
| ENTD-04 | Phase 33 | Complete |
| ENTD-05 | Phase 33 | Complete |
| ENTD-06 | Phase 33 | Complete |
| ENTD-07 | Phase 33 | Complete |
| ENTD-08 | Phase 33 | Complete |
| ENTD-09 | Phase 33 | Complete |
| ENTD-10 | Phase 33 | Complete |
| ENTD-11 | Phase 33 | Complete |
| SPWN-01 | Phase 37 | Complete |
| SPWN-02 | Phase 37 | Complete |
| SPWN-03 | Phase 37 | Complete |
| SPWN-04 | Phase 34 | Complete |
| SPWN-05 | Phase 37 | Complete |
| PERS-01 | Phase 34 | Complete |
| PERS-02 | Phase 34 | Complete |
| PERS-03 | Phase 35 | Complete |
| PERS-04 | Phase 35 | Complete |
| PERS-05 | Phase 34 | Complete |
| LOOT-01 | Phase 35 | Complete |
| LOOT-02 | Phase 35 | Complete |
| LOOT-03 | Phase 35 | Complete |
| LOOT-04 | Phase 35 | Complete |
| LOOT-05 | Phase 35 | Complete |
| INTR-01 | Phase 35 | Complete |
| INTR-02 | Phase 35 | Complete |
| INTR-03 | Phase 35 | Complete |
| INTR-04 | Phase 35 | Complete |
| INTR-05 | Phase 35 | Complete |
| INTR-06 | Phase 38 | Complete |
| INTR-07 | Phase 38 | Complete |
| INTR-08 | Phase 34 | Complete |
| CRAI-01 | Phase 36 | Complete |
| CRAI-02 | Phase 36 | Complete |
| CRAI-03 | Phase 36 | Complete |
| CRAI-04 | Phase 36 | Complete |
| CRAI-05 | Phase 36 | Complete |
| CRAI-06 | Phase 36 | Complete |
| CRAI-07 | Phase 36 | Complete |
| CRAI-08 | Phase 36 | Complete |
| CRAI-09 | Phase 38 | Complete |
| RESP-01 | Phase 35 | Complete |
| RESP-02 | Phase 35 | Complete |
| RESP-03 | Phase 35 | Complete |
| RESP-04 | Phase 35 | Complete |
| UIHD-01 | Phase 37 | Complete |
| UIHD-02 | Phase 38 | Complete |
| UIHD-03 | Phase 38 | Complete |
| EBLK-01 | Phase 34 | Complete |
| EBLK-02 | Phase 34 | Complete |
| EBLK-03 | Phase 36 | Complete |

**Coverage:**
- v1.8 requirements: 50 total
- Mapped to phases: 50
- Unmapped: 0

---
*Requirements defined: 2026-02-17*
*Last updated: 2026-02-19 after v1.10 requirements added (phases 43-45)*
