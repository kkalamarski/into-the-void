# Requirements: Into the Void

**Defined:** 2026-02-17
**Core Value:** Real-time multiplayer gameplay with responsive movement and visual feedback

## v1.14 Requirements

Requirements for Equipment Stats Overhaul milestone.

### Type Foundation

- [ ] **TYPE-01**: Stats effect type has resolver implementation in resolveEffect()
- [ ] **TYPE-02**: Multi-stat effects resolve correctly (toughness + power in one effect)
- [ ] **TYPE-03**: Documentation clarifies when to use `stats` vs legacy patterns

### Migration

- [ ] **MIGR-01**: All items using `stat_buff` with `duration: 0` converted to `stats` effect
- [ ] **MIGR-02**: Schema validation prevents `stat_buff` with `duration: 0` in new items
- [ ] **MIGR-03**: Migration has rollback strategy tested in staging

### Aggregation

- [ ] **AGGR-01**: Stat aggregation order documented (base → equipment → buffs)
- [ ] **AGGR-02**: Same equip result regardless of equipment order
- [ ] **AGGR-03**: Test suite validates known equipment combinations

### Parity

- [ ] **PARI-01**: Stat calculation functions in shared game-logic package
- [ ] **PARI-02**: Client tooltips use shared calculation logic
- [ ] **PARI-03**: Integration test asserts server/client parity

### Content

- [ ] **CONT-01**: Suit stat profiles by archetype (tank/scout/combat/utility)
- [ ] **CONT-02**: Rarity multipliers applied (1.4x/2.0x/2.8x/4.0x for Rare/Epic/Exotic/Legendary)
- [ ] **CONT-03**: All equippable items have stats (no `effects: []`)
- [ ] **CONT-04**: Tools have appropriate stat bonuses
- [ ] **CONT-05**: Modules have stat bonuses

## v1.13 Requirements (Complete)

Requirements for Active Combat Abilities milestone. All complete.

### Ability Core

- [x] **ABIL-01**: Ability definition system with id, name, description, category, energy cost, cooldown, range, and effects
- [x] **ABIL-02**: Items (suits, tools, modules) define which abilities they grant via grantedAbilities field
- [x] **ABIL-03**: Player can click entity to select target without starting auto-attack
- [x] **ABIL-04**: Player can use ability via action bar hotkey on selected target
- [x] **ABIL-05**: Server validates ability use (range check, energy check, cooldown check, target validity)
- [x] **ABIL-06**: Abilities consume energy on successful use
- [x] **ABIL-07**: Energy regenerates over time (configurable rate)
- [x] **ABIL-08**: Global cooldown (GCD) prevents ability spam (brief lockout after any ability)

### Ability UI

- [x] **ABUI-01**: Action bar auto-populates with abilities from equipped items
- [x] **ABUI-02**: Cooldown displays as radial sweep overlay on ability icon
- [x] **ABUI-03**: Ability tooltip shows name, energy cost, cooldown, range, description on hover
- [x] **ABUI-04**: Player can drag abilities to rearrange action bar slots
- [x] **ABUI-05**: Ability use triggers visual effect/animation on caster and/or target
- [x] **ABUI-06**: Insufficient energy or on-cooldown abilities show visual disabled state

### Buff System

- [x] **BUFF-01**: Abilities can apply instant effects (immediate heal, damage, stat change)
- [x] **BUFF-02**: Abilities can apply duration buffs (temporary stat modification with timer)
- [x] **BUFF-03**: Active buffs display as icons near health bar with remaining duration
- [x] **BUFF-04**: Buff stat modifiers apply to combat calculations (Power, Toughness, etc.)
- [x] **BUFF-05**: Buffs expire after duration and remove their stat modifications
- [x] **BUFF-06**: Server tracks buff state and broadcasts buff apply/expire events

### Content

- [x] **CONT-01**: 21 ability definitions across Offensive, Defensive, and Utility categories
- [x] **CONT-02**: Offensive abilities include Attack, Electrocute, Charge, and similar damage abilities
- [x] **CONT-03**: Defensive abilities include Magnetic Field, Toughen, Nano Repair, and similar
- [x] **CONT-04**: Utility abilities include Gather and similar non-combat abilities
- [x] **CONT-05**: Existing items (suits, tools) updated with grantedAbilities
- [x] **CONT-06**: New items added with unique ability combinations

## v1.12 Requirements (Complete)

Requirements for Bug Fixes & Content Polish milestone. All complete.

### Persistence

- [x] **PERS-01**: Player position saved to database on disconnect
- [x] **PERS-02**: Player position restored on login (exact tile)

### Bug Fixes

- [x] **FIX-01**: NPCs spawn correctly in hub zones (not creatures)
- [x] **FIX-02**: Hub zones show only NPCs, no creature spawns

### Rendering Fixes

- [x] **REND-01**: Entity depth sorting fixed (entities never appear below terrain)
- [x] **REND-02**: Terrain/entity overlap during movement eliminated
- [x] **REND-03**: Elevation transitions visually distinct (clearer level changes)

### New Player Experience

- [x] **NPE-01**: New characters receive basic exo-suit on creation
- [x] **NPE-02**: New characters receive basic tool on creation

### Content - Creatures

- [x] **CONT-01**: 5-10 new creature definitions added to entity registry
- [x] **CONT-02**: New creatures distributed across biomes with spawn rules
- [x] **CONT-03**: New creatures have appropriate loot tables

### Content - Items

- [x] **CONT-04**: 10-20 new item definitions added to item registry
- [x] **CONT-05**: New items span equipment, consumables, and materials
- [x] **CONT-06**: New items have appropriate rarity distribution

## v1.11 Requirements (Complete)

Requirements for NPCs & Trading milestone. All complete.

### Currency

- [x] **CURR-01**: Player has credits balance visible in HUD
- [x] **CURR-02**: Credits persist across sessions (stored in database)
- [x] **CURR-03**: Player earns credits by selling items to traders
- [x] **CURR-04**: Player spends credits when buying items from traders

### Hubs

- [x] **HUB-01**: Each faction has an orbital station hub (4 total: Verdant, Helix, Nexus, Unaffiliated)
- [x] **HUB-02**: Hubs are instanced areas separate from the open world
- [x] **HUB-03**: Hubs are safe zones (no combat, no hostile creatures)
- [x] **HUB-04**: NPCs spawn at fixed positions within hubs
- [x] **HUB-05**: Player can walk around hub using existing movement system

### Travel

- [x] **TRVL-01**: Portal structures exist in open world zones
- [x] **TRVL-02**: Interacting with portal teleports player to their faction's hub
- [x] **TRVL-03**: Player has recall ability (hotkey) to return to home hub from anywhere
- [x] **TRVL-04**: Player can leave hub to return to their last world position

### NPC Definition

- [x] **NPCD-01**: NPC definition system with type, name, dialogue, inventory
- [x] **NPCD-02**: 5 NPC types implemented: Trader, Guard, Faction Rep, Ambient, Service
- [x] **NPCD-03**: NPCs have visual representation (sprite or color placeholder)
- [x] **NPCD-04**: NPCs are non-hostile and cannot be attacked

### NPC Interaction

- [x] **NPCI-01**: Clicking NPC opens interaction window (modal)
- [x] **NPCI-02**: Interaction window shows NPC portrait, name, and type
- [x] **NPCI-03**: Interaction window shows dialogue text
- [x] **NPCI-04**: Action buttons appear based on NPC type (Trade for Traders, etc.)
- [x] **NPCI-05**: Player can close interaction window to resume gameplay

### Trading

- [x] **TRAD-01**: Trader NPCs have inventory of items for sale
- [x] **TRAD-02**: Player can view trader's inventory with credit prices
- [x] **TRAD-03**: Player can buy items (credits deducted, item added to inventory)
- [x] **TRAD-04**: Player can sell items from inventory (item removed, credits added)
- [x] **TRAD-05**: Buy and sell prices differ (sell price lower than buy price)
- [x] **TRAD-06**: Transactions validate sufficient credits and inventory space

## v1.10 Requirements (Complete)

Requirements for Combat UX milestone. All complete.

### Bug Fixes

- [x] **FIX-01**: Predator/maniac creatures properly aggro on nearby players

### Click-to-Attack

- [x] **CATK-01**: Player can click a creature with a combat tool equipped to start auto-attacking
- [x] **CATK-02**: Attack only initiates if creature is within tool's attack range
- [x] **CATK-03**: Combat tools have per-tool attack ranges (melee=1 tile, ranged=3-5 tiles)
- [x] **CATK-04**: Entity sprites are interactive (clickable) in Phaser

### Target Selection

- [x] **TARG-01**: Targeted entity shows visual highlight (glow, outline, or marker)
- [x] **TARG-02**: Target indicator persists while in combat with that entity
- [x] **TARG-03**: Target clears when combat ends (kill, death, leash, out of range)
- [x] **TARG-04**: Clicking a different creature switches target

### Combat Log

- [x] **CLOG-01**: Combat log panel displays damage dealt by player
- [x] **CLOG-02**: Combat log panel displays damage received by player
- [x] **CLOG-03**: Log entries include timestamp and damage amount
- [x] **CLOG-04**: Log is scrollable and shows recent history
- [x] **CLOG-05**: Log can be toggled visible/hidden

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

### Quests (v1.13+)

- **QUST-01**: Quest NPCs can offer missions to players
- **QUST-02**: Player can accept/decline quests
- **QUST-03**: Quest objectives tracked in UI
- **QUST-04**: Quest completion grants rewards

### Advanced Dialogue

- **DIAL-01**: Branching dialogue with player choices
- **DIAL-02**: Dialogue choices affect NPC responses
- **DIAL-03**: Dialogue state persists (remember past conversations)

### Surface Locations

- **SURF-01**: Surface faction HQs accessible (Canopy, Ironhold, Meridian)
- **SURF-02**: Shared city at coordinates 0,0

### NPC Enhancements

- **NPCE-01**: NPC schedules/routines (move around hub)
- **NPCE-02**: Reputation system affecting prices/dialogue
- **NPCE-03**: Rare world NPCs (event spawns)

### Combat Abilities (v1.14+)

- **CABI-01**: Ability queuing (input buffer during GCD)
- **CABI-02**: Combo system (bonus damage for ability sequences)
- **CABI-03**: Ability upgrade system (abilities level up through use)
- **CABI-04**: AOE/ground-targeted abilities
- **CABI-05**: PvP combat between players

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
| Quest/mission system | NPC framework first, quests in v1.14+ |
| Cast times / channeling | Poor fit for 2D real-time combat |
| Ability trees / skill points | Item-granted abilities is the differentiator |
| Cooldown reduction mechanics | Adds balance complexity, defer to post-MVP |
| Ability macros | Automation concerns, manual control preferred |
| Branching dialogue | Simple linear for v1.11, complex later |
| Surface faction HQs | Orbital stations first, surface later |
| Shared city at 0,0 | Future milestone |
| NPC combat | NPCs are non-hostile for v1.11 |
| NPC schedules/routines | Static spawns for v1.11 |
| Reputation system | Future milestone |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

### v1.14 Equipment Stats Overhaul

| Requirement | Phase | Status |
|-------------|-------|--------|
| TYPE-01 | Phase 59 | Pending |
| TYPE-02 | Phase 59 | Pending |
| TYPE-03 | Phase 59 | Pending |
| MIGR-01 | Phase 60 | Pending |
| MIGR-02 | Phase 60 | Pending |
| MIGR-03 | Phase 60 | Pending |
| AGGR-01 | Phase 61 | Pending |
| AGGR-02 | Phase 61 | Pending |
| AGGR-03 | Phase 61 | Pending |
| PARI-01 | Phase 62 | Pending |
| PARI-02 | Phase 62 | Pending |
| PARI-03 | Phase 62 | Pending |
| CONT-01 | Phase 63 | Pending |
| CONT-02 | Phase 63 | Pending |
| CONT-03 | Phase 63 | Pending |
| CONT-04 | Phase 63 | Pending |
| CONT-05 | Phase 63 | Pending |

**Coverage:**
- v1.14 requirements: 17 total
- Mapped to phases: 17
- Unmapped: 0 ✓

### v1.13 Active Combat Abilities (Complete)

| Requirement | Phase | Status |
|-------------|-------|--------|
| ABIL-01 | Phase 56 | Complete |
| ABIL-02 | Phase 56 | Complete |
| ABIL-03 | Phase 56 | Complete |
| ABIL-04 | Phase 56 | Complete |
| ABIL-05 | Phase 56 | Complete |
| ABIL-06 | Phase 56 | Complete |
| ABIL-07 | Phase 56 | Complete |
| ABIL-08 | Phase 56 | Complete |
| ABUI-01 | Phase 56 | Complete |
| ABUI-02 | Phase 56 | Complete |
| ABUI-03 | Phase 56 | Complete |
| ABUI-04 | Phase 58 | Complete |
| ABUI-05 | Phase 56 | Complete |
| ABUI-06 | Phase 56 | Complete |
| BUFF-01 | Phase 57 | Complete |
| BUFF-02 | Phase 57 | Complete |
| BUFF-03 | Phase 57 | Complete |
| BUFF-04 | Phase 57 | Complete |
| BUFF-05 | Phase 57 | Complete |
| BUFF-06 | Phase 57 | Complete |
| CONT-01 | Phase 58 | Complete |
| CONT-02 | Phase 58 | Complete |
| CONT-03 | Phase 58 | Complete |
| CONT-04 | Phase 58 | Complete |
| CONT-05 | Phase 58 | Complete |
| CONT-06 | Phase 58 | Complete |

**Coverage:**
- v1.13 requirements: 26 total
- Mapped to phases: 26
- Complete: 26 ✓

### v1.12 Bug Fixes & Content Polish (Complete)

| Requirement | Phase | Status |
|-------------|-------|--------|
| PERS-01 | Phase 51 | Complete |
| PERS-02 | Phase 51 | Complete |
| FIX-01 | Phase 52 | Complete |
| FIX-02 | Phase 52 | Complete |
| REND-01 | Phase 53 | Complete |
| REND-02 | Phase 53 | Complete |
| REND-03 | Phase 53 | Complete |
| NPE-01 | Phase 54 | Complete |
| NPE-02 | Phase 54 | Complete |
| CONT-01 | Phase 55 | Complete |
| CONT-02 | Phase 55 | Complete |
| CONT-03 | Phase 55 | Complete |
| CONT-04 | Phase 55 | Complete |
| CONT-05 | Phase 55 | Complete |
| CONT-06 | Phase 55 | Complete |

**Coverage:**
- v1.12 requirements: 15 total
- Mapped to phases: 15
- Complete: 15 ✓

### v1.11 NPCs & Trading (Complete)

| Requirement | Phase | Status |
|-------------|-------|--------|
| CURR-01 | Phase 46 | Complete |
| CURR-02 | Phase 46 | Complete |
| CURR-03 | Phase 50 | Complete |
| CURR-04 | Phase 50 | Complete |
| HUB-01 | Phase 46 | Complete |
| HUB-02 | Phase 46 | Complete |
| HUB-03 | Phase 46 | Complete |
| HUB-04 | Phase 48 | Complete |
| HUB-05 | Phase 46 | Complete |
| TRVL-01 | Phase 47 | Complete |
| TRVL-02 | Phase 47 | Complete |
| TRVL-03 | Phase 47 | Complete |
| TRVL-04 | Phase 47 | Complete |
| NPCD-01 | Phase 48 | Complete |
| NPCD-02 | Phase 48 | Complete |
| NPCD-03 | Phase 48 | Complete |
| NPCD-04 | Phase 48 | Complete |
| NPCI-01 | Phase 49 | Complete |
| NPCI-02 | Phase 49 | Complete |
| NPCI-03 | Phase 49 | Complete |
| NPCI-04 | Phase 49 | Complete |
| NPCI-05 | Phase 49 | Complete |
| TRAD-01 | Phase 50 | Complete |
| TRAD-02 | Phase 50 | Complete |
| TRAD-03 | Phase 50 | Complete |
| TRAD-04 | Phase 50 | Complete |
| TRAD-05 | Phase 50 | Complete |
| TRAD-06 | Phase 50 | Complete |

**Coverage:**
- v1.11 requirements: 28 total
- Mapped to phases: 28
- Complete: 28

### v1.10 Combat UX (Complete)

| Requirement | Phase | Status |
|-------------|-------|--------|
| FIX-01 | Phase 43 | Complete |
| CATK-01 | Phase 43 | Complete |
| CATK-02 | Phase 43 | Complete |
| CATK-03 | Phase 43 | Complete |
| CATK-04 | Phase 43 | Complete |
| TARG-01 | Phase 44 | Complete |
| TARG-02 | Phase 44 | Complete |
| TARG-03 | Phase 44 | Complete |
| TARG-04 | Phase 44 | Complete |
| CLOG-01 | Phase 45 | Complete |
| CLOG-02 | Phase 45 | Complete |
| CLOG-03 | Phase 45 | Complete |
| CLOG-04 | Phase 45 | Complete |
| CLOG-05 | Phase 45 | Complete |

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
*Last updated: 2026-02-21 after v1.14 roadmap created*
