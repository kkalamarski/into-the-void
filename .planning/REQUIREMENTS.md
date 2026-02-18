# Requirements: Into the Void

**Defined:** 2026-02-17
**Core Value:** Real-time multiplayer gameplay with responsive movement and visual feedback

## v1.7 Requirements

Requirements for Character Stats milestone. Each maps to roadmap phases.

### Stats Foundation

- [ ] **STAT-01**: CharacterStats type replaces legacy PlayerStats with 8 primary stats
- [ ] **STAT-02**: computeCharStats() pure function computes base + equipment bonuses
- [ ] **STAT-03**: Base stats scale linearly with character level (per-stat tuning)
- [ ] **STAT-04**: Creature stats use same computation function with creature-specific scaling

### Stats Integration

- [ ] **STAT-05**: Durability stat affects maxHealth
- [ ] **STAT-06**: Toughness stat affects damage reduction (armor)
- [ ] **STAT-07**: Power stat affects damage output
- [ ] **STAT-08**: Haste stat affects movement and attack speed
- [ ] **STAT-09**: Vigor stat affects maxEnergy
- [ ] **STAT-10**: Recovery stat affects energy regeneration rate
- [ ] **STAT-11**: Perception stat affects detection range
- [ ] **STAT-12**: Resilience stat affects hazard resistance
- [ ] **STAT-13**: JSONB migration script updates existing character rows to new stat shape
- [ ] **STAT-14**: Combat functions updated to use new stat names (power, toughness, haste)

### Stats Display

- [ ] **STAT-15**: Stats panel UI shows all 8 stats with current values
- [ ] **STAT-16**: Stat breakdown shows base vs equipment contribution ("30 + 15")
- [ ] **STAT-17**: Level-up notification shows stat deltas ("+5 Durability")
- [ ] **STAT-18**: Item tooltip shows stat delta comparison vs equipped item (green/red +/-)

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

| Requirement | Phase | Status |
|-------------|-------|--------|
| STAT-01 | Phase 30 | Pending |
| STAT-02 | Phase 30 | Pending |
| STAT-03 | Phase 30 | Pending |
| STAT-04 | Phase 30 | Pending |
| STAT-05 | Phase 31 | Pending |
| STAT-06 | Phase 31 | Pending |
| STAT-07 | Phase 31 | Pending |
| STAT-08 | Phase 31 | Pending |
| STAT-09 | Phase 31 | Pending |
| STAT-10 | Phase 31 | Pending |
| STAT-11 | Phase 31 | Pending |
| STAT-12 | Phase 31 | Pending |
| STAT-13 | Phase 31 | Pending |
| STAT-14 | Phase 31 | Pending |
| STAT-15 | Phase 32 | Pending |
| STAT-16 | Phase 32 | Pending |
| STAT-17 | Phase 32 | Pending |
| STAT-18 | Phase 32 | Pending |

**Coverage:**
- v1.7 requirements: 18 total
- Mapped to phases: 18
- Unmapped: 0 ✓

---
*Requirements defined: 2026-02-17*
*Last updated: 2026-02-18 after v1.7 requirements definition*
