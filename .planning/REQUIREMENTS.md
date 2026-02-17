# Requirements: Into the Void

**Defined:** 2026-02-17
**Core Value:** Real-time multiplayer gameplay with responsive movement and visual feedback

## v1.6 Requirements

Requirements for Inventory & Items milestone. Each maps to roadmap phases.

### Item System

- [ ] **ITEM-01**: Item definition registry with strategy pattern (like TileRegistry)
- [ ] **ITEM-02**: 100 items defined across 6 categories (suits, modules, tools, consumables, world items, reagents)
- [ ] **ITEM-03**: 5 rarity tiers with visual distinction (Common, Rare, Epic, Exotic, Legendary)
- [ ] **ITEM-04**: Item level (ilvl) system representing item power
- [ ] **ITEM-05**: Required character level for equipping/using items
- [ ] **ITEM-06**: Item stacking for materials (up to 999 per stack)

### Equipment

- [ ] **EQUIP-01**: Exo-suit as base equipment required for survival
- [ ] **EQUIP-02**: Module slot count scales with suit rarity (Common=3, Legendary=6)
- [ ] **EQUIP-03**: Armor module type (adds suit durability)
- [ ] **EQUIP-04**: Speed module type (increases movement speed)
- [ ] **EQUIP-05**: Life Support module type (oxygen/hazard resistance)
- [ ] **EQUIP-06**: Sensor Array module type (detection range/minimap)
- [ ] **EQUIP-07**: Power Core module type (energy capacity/recharge)
- [ ] **EQUIP-08**: Mobility module type (jump height/terrain traversal)
- [ ] **EQUIP-09**: Main + Secondary tool slots with hotkey swap
- [ ] **EQUIP-10**: Tools have specialization stats (research/combat/mining)
- [ ] **EQUIP-11**: Server-authoritative stat calculation from equipment

### Inventory

- [ ] **INV-01**: Personal inventory with slot limit
- [ ] **INV-02**: Item pickup from world entities with claim mechanism
- [ ] **INV-03**: Item drop to world (spawns ground item)
- [ ] **INV-04**: Item use for consumables (repair/buff)
- [ ] **INV-05**: Atomic DB transactions for all inventory operations
- [ ] **INV-06**: WebSocket events: inventory:update, inventory:use, inventory:drop, inventory:pickup

### UI

- [ ] **UI-01**: Inventory grid panel with drag-drop (dnd-kit)
- [ ] **UI-02**: Equipment panel showing suit + module slots + tool slots
- [ ] **UI-03**: Action bar with 8 slots and number key hotkeys (1-8)
- [ ] **UI-04**: Item tooltips with rarity color, ilvl, stats, description
- [ ] **UI-05**: Personal storage panel (separate from inventory)
- [ ] **UI-06**: Rarity color system (Common=gray, Rare=blue, Epic=purple, Exotic=orange, Legendary=gold)

### Database

- [ ] **DB-01**: Migrate equipment schema from head/chest/legs/feet to exo-suit model
- [ ] **DB-02**: Player inventory table with JSONB items column
- [ ] **DB-03**: Player equipment stored as JSONB with suit + modules + tools
- [ ] **DB-04**: Personal storage table for extended item storage

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
| Weight-based inventory | Slot limits are simpler, weight is anti-feature per research |
| Auto-equip on pickup | Breaks modular loadout agency |
| Cross-character shared stash | Corrupts per-character progression architecture |
| Real-time auction house | Too complex for v1.6, separate milestone |
| Item socket/gem system | Deferred to enchantment milestone |
| Free-movement (non-grid) WASD | Breaks client-side prediction model |
| Camera rotation | Sprites drawn for fixed angle |
| Cross-zone pathfinding | Requires multi-zone graph |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| ITEM-01 | Phase 25 | Pending |
| ITEM-02 | Phase 25 | Pending |
| ITEM-03 | Phase 25 | Pending |
| ITEM-04 | Phase 25 | Pending |
| ITEM-05 | Phase 25 | Pending |
| ITEM-06 | Phase 25 | Pending |
| DB-01 | Phase 25 | Pending |
| DB-02 | Phase 25 | Pending |
| DB-03 | Phase 25 | Pending |
| DB-04 | Phase 25 | Pending |
| INV-01 | Phase 26 | Pending |
| INV-02 | Phase 26 | Pending |
| INV-03 | Phase 26 | Pending |
| INV-04 | Phase 26 | Pending |
| INV-05 | Phase 26 | Pending |
| INV-06 | Phase 26 | Pending |
| EQUIP-11 | Phase 26 | Pending |
| UI-01 | Phase 27 | Pending |
| UI-04 | Phase 27 | Pending |
| UI-06 | Phase 27 | Pending |
| EQUIP-01 | Phase 28 | Pending |
| EQUIP-02 | Phase 28 | Pending |
| EQUIP-03 | Phase 28 | Pending |
| EQUIP-04 | Phase 28 | Pending |
| EQUIP-05 | Phase 28 | Pending |
| EQUIP-06 | Phase 28 | Pending |
| EQUIP-07 | Phase 28 | Pending |
| EQUIP-08 | Phase 28 | Pending |
| EQUIP-09 | Phase 28 | Pending |
| EQUIP-10 | Phase 28 | Pending |
| UI-02 | Phase 28 | Pending |
| UI-03 | Phase 29 | Pending |
| UI-05 | Phase 29 | Pending |

**Coverage:**
- v1.6 requirements: 33 total (note: REQUIREMENTS.md previously stated 28; actual count is 33)
- Mapped to phases: 33
- Unmapped: 0

---
*Requirements defined: 2026-02-17*
*Last updated: 2026-02-17 after v1.6 roadmap creation — traceability complete*
