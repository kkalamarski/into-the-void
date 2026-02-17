# Feature Research: Inventory & Item System

**Domain:** Survival MMO inventory, equipment, and item management (Into the Void)
**Researched:** 2026-02-17
**Confidence:** HIGH (codebase direct inspection + lore alignment + reference game analysis; MEDIUM for competitor UX patterns via community sources)

---

## Existing System Baseline

What is already built — research does not re-propose these.

| Component | Current State | Notes |
|-----------|---------------|-------|
| `ItemDef` type | `inventory.ts`: id, name, description, category, rarity, maxStack, baseValue, weight, requiredLevel | Foundation exists |
| `InventoryItem` type | instanceId, itemId, quantity, slot, properties (open Record) | Slot-based, generic properties bag |
| `Inventory` type | items[], maxSlots (default 20), equipment (Partial<Record<EquipmentSlot, InventoryItem>>) | DB schema mirrors this |
| `EquipmentSlot` type | head, chest, legs, feet, hands, mainHand, offHand, accessory1, accessory2 | Classic MMO slots; does NOT map to exo-suit concept yet |
| DB schema | `inventories` table: items (jsonb), maxSlots (integer), equipment (jsonb) | Functional; stores state |
| DB queries | createInventory, getInventory, updateInventoryItems, updateEquipment, updateInventory | Full CRUD exists |
| Socket events | `inventory:use`, `inventory:drop`, `inventory:pickup` (client); `inventory:update` (server) | Wire layer declared; not yet implemented |
| `ItemCategory` type | weapon, armor, tool, consumable, material, quest, misc | Does NOT match the project's exo-suit category model yet |
| Entity ground items | `ItemEntity` type with despawnAt timestamp | Declared; despawn logic not confirmed implemented |
| `EntityRegistry` items | health_vial, energy_cell, void_essence, ancient_key | Placeholder stubs only |

**Gap summary:** The data model scaffolding exists but uses generic MMO archetypes (head/chest/legs/feet armor). The lore specifies exo-suits with module slots, tools with specialization stats, and faction-specific equipment — none of which maps to the current schema. The socket wire layer is declared but unimplemented. The item registry is stub data.

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features players in this genre (No Man's Sky, Tibia, WoW, Albion Online, ARK) assume exist.
Missing these makes inventory feel broken or unfinished.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Bag inventory with fixed grid slots** | Every MMO has a fixed-slot inventory UI. Players expect to see their carried items in a grid, drag items to rearrange, and know exactly how many slots remain. Current schema has maxSlots=20, data exists — just no UI. | MEDIUM | Grid UI in React HUD. The slot-indexed data model already matches. Drag-and-drop via mouse. Keyboard-accessible alternative (click to select, click slot to move). Min 20 slots; rarity system implies expansion later. |
| **Equipment panel with dedicated slots** | Players expect to see what their character has equipped, separate from carried inventory. In a sci-fi survival MMO, this maps to the exo-suit body. Current schema has equipment as a flat slot map — must be reshaped to exo-suit model. | MEDIUM | Equipment panel shows the equipped exo-suit + module slots + active tool. The existing `EquipmentSlot` type (head/chest/legs/feet) conflicts with lore exo-suit model. Needs new slot taxonomy: `exosuit`, `module_1..N` (count = rarity-driven), `tool`, `accessory1`, `accessory2`. |
| **Pick up items from ground** | Players expect to walk over a world item and collect it. `inventory:pickup` event is already declared on the client. ItemEntity exists with `despawnAt`. Ground items must flow into inventory slots. | MEDIUM | Server handles `inventory:pickup`: validates player proximity, checks inventory space, removes ItemEntity from zone, adds InventoryItem to player inventory, broadcasts `entity:despawn` + `inventory:update`. |
| **Use / consume consumables** | Consumables (suit repair kits, buffs) must be usable from inventory. `inventory:use` event declared. | LOW | Server handles `inventory:use`: validates item is consumable, applies effect (health restore, buff duration), removes from inventory. Client needs visual feedback (consume animation, stat bar update). |
| **Drop items to ground** | Players expect to drop unwanted items. `inventory:drop` declared. Ground item spawns as ItemEntity. | LOW | Server handles `inventory:drop`: removes from inventory, spawns ItemEntity at player position with 5-minute despawn timer. ItemEntity is broadcast to zone. |
| **Item tooltips** | Hovering an item shows name, description, rarity color, stats, required level, weight. Standard in every MMO. | LOW | React tooltip component. Data comes from item definition (fetched by itemId from registry). Rarity colors: Common=grey, Uncommon=green, Rare=blue, Epic=purple, Legendary=orange. |
| **Rarity color coding** | Color-coded rarity is universal language (WoW set this standard). Players recognize green=uncommon, blue=rare without reading labels. | LOW | Apply rarity color to item name in tooltip, item border in grid slot. No gameplay change — pure visual signal. |
| **Required level gate** | Items with `requiredLevel > player.level` must show as unusable (greyed out) and rejected on equip attempt. Standard in all MMOs. | LOW | Client greys out item. Server rejects equip with error. Uses existing `requiredLevel` field on `ItemDef`. |
| **Inventory weight or slot limit** | Players need to understand capacity. Two models: slot count (Tibia/WoW) or weight (ARK/survival games). For this game, slot count is recommended (simpler UX, already in schema). | LOW | Display `{used}/{maxSlots}` in inventory UI. Server rejects pickup when at capacity. Weight field exists on ItemDef but using it as primary constraint adds friction for a sci-fi game (exo-suits don't "weigh" items the same way). |
| **Stackable materials** | Crafting reagents must stack (e.g., 200x Void Stone in one slot) or inventory fills instantly after 30 minutes of mining. WoW moved to 1000-stack sizes for materials in Dragonflight for this reason. | LOW | `maxStack` field already exists on `ItemDef`. Materials/reagents: maxStack=999. Consumables: maxStack=20. Equipment: maxStack=1. Logic: when picking up, merge into existing stack if same itemId and under maxStack, else new slot. |
| **Action bar / hotbar** | A quick-access bar for consumables, tools, and deployable items. Standard in MMOs and survival games. BitCraft added this in 2025 explicitly because players expected it. Allows using items without opening inventory. | MEDIUM | 8-slot hotbar in HUD (persistent, not hidden in inventory panel). Player drags items from inventory to hotbar slots. Number keys 1-8 activate. Relevant for consumables and deployables. Equipment (exo-suit) does not go in hotbar — it goes in equipment panel. |

---

### Differentiators (Competitive Advantage)

Features that fit Into the Void's specific sci-fi survival + corporate faction identity. Build after table stakes are solid.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Exo-suit with module slots (rarity-driven slot count)** | The lore explicitly defines exo-suits as the core equipment layer. Common exo-suit = 2 module slots. Legendary = 5+ module slots. This creates meaningful rarity progression: a Legendary suit is not just "better stats" — it enables fundamentally different loadouts (e.g., 5 Speed modules vs 2). No Man's Sky's exosuit tech slot system validated this model — players expand capability by unlocking slots, not just upgrading numbers. | HIGH | New `ExoSuit` item subtype. Properties include: `moduleSlots: number` (derived from rarity: Common=2, Uncommon=3, Rare=3, Epic=4, Legendary=5). Equipment schema change: replace `chest` slot with `exosuit` slot. Add `modules: InventoryItem[]` array (up to moduleSlots length). Module items are their own item type: `ArmorModule`, `SpeedModule`, `LifeSupportModule`, `SensorArrayModule`, `PowerCoreModule`, `MobilityModule`. Each module provides a stat bonus that stacks (within cap). Server must validate module count does not exceed suit's `moduleSlots`. |
| **Tool specialization stats (Research / Combat / Mining)** | Tools are not generic. A Mining Tool increases mineral yield. A Research Tool increases discovery XP. A Combat Tool affects damage. This binds gear choices to playstyle and makes tools feel meaningful beyond just "tier unlocks new nodes." | MEDIUM | New `Tool` item subtype. Properties include: `toolType: 'mining' | 'combat' | 'research'` and `specializationStats: { miningYield?: number, combatDamage?: number, researchXP?: number }`. Tool goes in `tool` equipment slot. Stats applied server-side when relevant action is performed. Tool tier (1-4) controls which minerals/interactions are accessible (already modeled via `requiredTier` on `MineralConfig`). |
| **Item level (ilvl) system** | ilvl gives players a single number to compare item power across categories. WoW established this as the universal "is this an upgrade?" signal. Survival MMOs like Albion use item tier equivalents. Provides clear progression gates: Tier II zones require ilvl 20+ exo-suit, etc. | MEDIUM | `ilvl: number` field on `ItemDef`. Derived from: base tier (1-4) × rarity multiplier (1.0/1.2/1.5/1.8/2.2 for Common→Legendary). Display in item tooltip. Server uses player's equipped exo-suit ilvl as one factor for zone access recommendations. Does not hard-block zones (lore says corporations don't recover bodies — freedom to enter) but shown as recommended level. |
| **Faction-specific item variants** | Verdant Dynamics, Helix Extraction, Nexus Frontiers each have distinct aesthetics and lore (green bioengineering, industrial brutalism, corporate modular). Faction-locked gear creates identity and drives inter-player trading (Nexus traders selling Helix gear to Verdant players). | HIGH | `factionId?: FactionId` field on `ItemDef`. Faction items: equipped only by that faction (or cost faction standing to cross-equip). Visual tinting applied to item icon by faction color. Do NOT build in the first inventory milestone — gate behind faction standing system. Flag as v2+. |
| **Deployables as inventory items** | World items: explosives, seeds, deployable structures (as per project context). These are carried in inventory and placed in the world, creating an ItemEntity → Structure conversion. Ties into the base-building / farming progression the lore hints at. | HIGH | `WorldItem` item subtype with `deployable: true` and `structureTypeId: string`. Using a deployable item from action bar emits `player:deploy` event. Server removes from inventory, creates Structure entity at player position. Do NOT build in first inventory milestone — requires structure placement system. Flag as v2+. |
| **Discovery-triggered item unlocks** | The lore heavily emphasizes exploration and discovery as core verbs. When a player finds a new species/mineral, they should unlock the ability to craft reagents from it. Links inventory to the `discoveries` DB table that already exists. | MEDIUM | `discoveryRequired?: string` field on `ItemDef` (references a discoveryId). Server blocks crafting/equipping this item until discovery is logged. The `discoveries` schema already exists — this is an integration, not new infrastructure. Flag for the crafting milestone, not the first inventory milestone. |

---

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Weight-based inventory limit** | "Realistic" — heavy armor should slow you down. ARK uses weight. | Weight adds cognitive overhead without meaningful choice in a sci-fi game where exo-suits are the body. Players optimize by min-maxing carry weight, not making interesting decisions. Adds server load (recalculate weight on every pickup). The `weight` field exists on `ItemDef` — preserve it for future use but do NOT use it as the primary inventory constraint at launch. | Slot-based limit (already in schema). Weight field kept for future encumbrance penalty system (slow movement, not hard block) if it fits the survival mechanics milestone. |
| **Durability degradation on all equipment** | Common in survival games (ARK, DayZ). Creates a resource sink. | In a sci-fi MMO with exo-suits and modules, durability on every item creates constant maintenance friction that drives away casual players. It works in ARK because crafting replacement gear is fast. Here, Legendary exo-suits require significant effort to obtain — making them degrade destroys the reward loop. | Durability for consumable-tier items only (suit repair kits confirm this pattern from project context: consumable = repair, not constant upkeep). Exo-suits degrade only in specific high-damage scenarios (future combat milestone decision). |
| **Loot auto-equip (equip if better)** | Reduces inventory micromanagement. Convenient. | In a module-slot system, "better" is not a single number — a Common suit with a specific module might be more valuable than an Epic suit in a different build. Auto-equip breaks player agency over modular loadout choices. Also unsafe in PvP/PvE contexts (auto-equipping mid-combat). | Show a "This item is better than equipped" indicator in tooltip. Player decides. |
| **Unlimited inventory via bags** | Players hate running out of inventory. Common request. | Unlimited inventory trivializes the survival tension of "do I mine more or go back to base?" which is a core loop in survival MMOs. Also creates unbounded server-side state size (a player with 10,000 items creates memory/query problems). | Expand maxSlots via gameplay progression (unlock more storage through crafting/building, e.g., personal storage crate at base). This is the correct model for survival games. |
| **Real-time inventory sync (broadcast all changes to zone)** | Players want to see what others are carrying. Creates social dynamics. | Broadcasting every pickup/drop/equip event to all zone occupants is O(players × events) traffic. In a zone with 50 players actively mining, this creates significant WebSocket noise. Also raises privacy concerns (players can track rival faction member inventories). | Sync only what matters to others: equipment appearance changes (exo-suit tier visible on player sprite), ground items entering/leaving zone. Inventory contents remain private. |
| **Cross-character shared stash** | Account-wide storage pool for crafting materials. Convenient. | Encourages alt-character farming (players create multiple characters purely for extra storage), which inflates player counts without adding real engagement. Also requires API-level account stash access, complicating the current per-character architecture significantly. | Per-character storage. Consider faction warehouse as a community shared storage at a hub location — this has lore justification (corporations store resources centrally) and adds social gameplay without corrupting the per-character model. |

---

## Feature Dependencies

```
[Bag Inventory UI]
    └──requires──> [Item Tooltip]
                   (tooltip appears on hover; needed for usability)
    └──requires──> [Ground Pickup]
                   (nothing to show in inventory unless pickup works)

[Equipment Panel]
    └──requires──> [Bag Inventory UI]
                   (equip is drag from bag to equipment slot)
    └──requires──> [Exo-Suit item type]
                   (panel shows nothing meaningful without exo-suit items)

[Exo-Suit Module Slots]
    └──requires──> [Equipment Panel]
                   (module slots are sub-panel of equipment panel)
    └──requires──> [Module item definitions]
                   (ItemDef entries for ArmorModule, SpeedModule, etc.)

[Action Bar / Hotbar]
    └──requires──> [Bag Inventory UI]
                   (player drags from inventory to hotbar)
    └──enhances──> [Consumable Use]
                   (consumables become useful when hotbar gives quick access)

[Consumable Use]
    └──requires──> [Ground Pickup]
                   (must be able to obtain consumables first)

[Tool Specialization Stats]
    └──requires──> [Equipment Panel: tool slot]
    └──requires──> [Mining/interaction system to apply stats to]
                   (stats are meaningless without actions that consume them)

[Item Level (ilvl)]
    └──requires──> [Rarity system]
                   (ilvl is derived from tier × rarity multiplier)
    └──enhances──> [Equipment Panel]
                   (ilvl displayed per-slot in equipment panel)

[Deployables]
    └──requires──> [Action Bar]
                   (deployed from hotbar, not inventory grid)
    └──requires──> [Structure placement system]
                   (not yet built — defer to structure milestone)

[Faction-specific items]
    └──requires──> [Faction standing system]
                   (not yet built — defer)

[Discovery-triggered unlocks]
    └──requires──> [discoveries DB table]
                   (already exists — integration possible in crafting milestone)
    └──requires──> [Crafting system]
                   (not yet built)

[Stack merge on pickup]
    └──requires──> [Ground Pickup]
                   (merge logic runs during pickup handling)
```

### Dependency Notes

- **Equipment panel requires exo-suit items to be meaningful:** Building the panel with only the current head/chest/legs/feet schema gives players empty slots that don't match lore. Define the exo-suit item type before building the equipment UI or the UI will need a rewrite.
- **Action bar is not a prerequisite for inventory:** Inventory grid and equipment panel can ship first. Action bar is a second pass that wires consumables and deployables to keyboard shortcuts.
- **Ground item despawn timer already in schema:** `ItemEntity.despawnAt` exists. 5 minutes is the conventional timeout (validated by OSRS 3-minute model; survival games typically 5-15 minutes depending on item value). Implement server-side cleanup via zone tick.
- **Module slots are a schema migration:** The current `equipment` jsonb stores a flat slot map. Adding `modules` as an array requires a schema change. Do this before any UI is built — schema migrations are the highest-risk operation for the existing data.

---

## MVP Definition

### Launch With (first inventory milestone — v1 of the system)

These features establish the complete basic loop: pick up → manage → equip → use.

- [ ] **Ground pickup** — `inventory:pickup` handler on server. Proximity check, inventory space check, ItemEntity despawn, `inventory:update` broadcast.
- [ ] **Item drop** — `inventory:drop` handler. Create ItemEntity at player position with 5-minute `despawnAt`.
- [ ] **Consumable use** — `inventory:use` handler. Apply health/energy effect. Remove from inventory.
- [ ] **Stack merge logic** — On pickup, merge stackable items into existing slots up to maxStack before opening new slots.
- [ ] **Bag inventory UI** — Grid panel (20 slots). Show item icon/color by rarity. Drag to rearrange. Show slot count.
- [ ] **Item tooltip** — Name (rarity color), description, category, rarity, ilvl, requiredLevel, weight.
- [ ] **Exo-suit schema definition** — New ItemDef subtypes: ExoSuit (with moduleSlots), Module types (6 variants), Tools (3 types). Migrate `equipment` schema from head/chest/legs/feet to exosuit/modules[]/tool/accessory1/accessory2.
- [ ] **Equipment panel UI** — Show equipped exo-suit, module slots (count matches suit rarity), tool slot, 2 accessory slots. Equip by dragging from bag.
- [ ] **Required level enforcement** — Server rejects equip if `player.level < item.requiredLevel`. Client greys out item.
- [ ] **Action bar (8 slots)** — HUD hotbar below health/energy bars. Number keys 1-8. Drag consumables/deployables from inventory. Consumable use from hotbar fires `inventory:use`.

### Add After Validation (v1.x — second inventory milestone)

- [ ] **Tool specialization stats** — Apply `specializationStats` from equipped tool during mining/research/combat interactions. Requires coordination with the first phase of each of those systems.
- [ ] **Item level display** — Compute and display ilvl in tooltip and equipment panel. Requires ilvl formula to be agreed on.
- [ ] **Seed entity in item registry** — Populate EntityRegistry with actual item definitions for all 6 module types, 3 tool types, consumables (suit repair, 2 buff types). Replace placeholder stubs.
- [ ] **Ground item expiry UI** — Show despawn countdown on ItemEntity hover. Prevents "why did my item disappear?" confusion.

### Future Consideration (v2+ — defer)

- [ ] **Faction-specific item variants** — Gate behind faction standing system (not yet designed).
- [ ] **Deployables** — Gate behind structure placement system (not yet designed).
- [ ] **Discovery-triggered unlocks** — Gate behind crafting system (not yet designed).
- [ ] **Faction warehouse (shared storage)** — Social feature. Gate behind guild/faction progression milestone.
- [ ] **Weight-based encumbrance (not hard limit)** — Optional future survival mechanic; `weight` field preserved for this.
- [ ] **Inventory slot expansion via crafting** — Player builds storage infrastructure at base to expand personal capacity.

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Ground pickup | HIGH | MEDIUM | P1 |
| Item drop | HIGH | LOW | P1 |
| Consumable use | HIGH | LOW | P1 |
| Stack merge logic | HIGH | LOW | P1 |
| Bag inventory UI | HIGH | MEDIUM | P1 |
| Item tooltip | HIGH | LOW | P1 |
| Exo-suit schema definition | HIGH (foundational) | MEDIUM | P1 |
| Equipment panel UI | HIGH | MEDIUM | P1 |
| Required level enforcement | MEDIUM | LOW | P1 |
| Action bar / hotbar | HIGH | MEDIUM | P1 |
| Tool specialization stats | MEDIUM | MEDIUM | P2 |
| Item level (ilvl) | MEDIUM | LOW | P2 |
| Item registry population | HIGH | LOW | P2 |
| Ground item expiry UI | LOW | LOW | P2 |
| Faction-specific items | MEDIUM | HIGH | P3 |
| Deployables | HIGH | HIGH | P3 |
| Discovery-triggered unlocks | MEDIUM | MEDIUM | P3 |
| Faction warehouse | MEDIUM | HIGH | P3 |

**Priority key:**
- P1: Must have — inventory system is non-functional without these
- P2: Should have — adds meaningful quality and completeness
- P3: Future milestone — do not start in this sprint

---

## Competitor Feature Analysis

| Feature | No Man's Sky | Tibia | Albion Online | Our Approach |
|---------|--------------|-------|---------------|--------------|
| Equipment concept | Exosuit (cargo + tech inventory, expandable slots) | Backpack-based slots, separate equipment slots (armor, weapon) | Destiny board (5 slots by tier) | Exo-suit (1 slot) + module slots (2-5 by rarity) + tool slot — lore-driven hybrid |
| Rarity system | C/B/A/S/X class modules | Rarity colors (Common→Legendary) | Item tier (1-8) | Common→Legendary 5 tiers, color-coded per WoW standard |
| Module/upgrade model | Upgrade modules in tech slots (adjacent bonus in NMS) | No module system | No explicit module system | Module items in exo-suit slots; no adjacency bonus (complexity avoidance) |
| Item level | Class letter (C=lowest, X=highest) | Item level by creature drop zone | Item tier number | ilvl numeric (computed from tier × rarity) |
| Hotbar | Quickslots (multi-tool, consumables) | Hotkeys assignable to items | 4 ability slots + quick-use | 8-slot hotbar (consumables + deployables) |
| Ground items | Immediate pickup via proximity | Floor items visible, step-to-pickup | Auto-pickup option | Manual pickup via `inventory:pickup` event; ground items visible as ItemEntity |
| Stack sizes | 9,999 units for resources, 1 for tech | 100 for most, varies by item | Stack to 999 for raw resources | 999 for materials, 20 for consumables, 1 for equipment |
| Inventory limit | Expandable (buy slots at stations or repair drop pods) | Fixed backpack slots (expandable with bigger backpack items) | Fixed slots by bag type | Fixed 20 slots; expansion deferred (v2+) |
| Weight | None for exosuit inventory | Weight exists, manageable | No weight, slot-based | Slot-based (launch); weight as encumbrance modifier deferred |

---

## Lore Alignment Notes

The lore imposes specific constraints on item design that must be respected.

| Lore Element | Item System Implication |
|--------------|------------------------|
| Exo-suits are described as "base equipment with module slots, rarity affects slot count" | ExoSuit item type is non-negotiable. The current schema (head/chest/legs) must be replaced. |
| Terminus has 4 biome tiers (Frontier/Hazardous/Hostile/Extreme) | Tools and exo-suits should have 4 tiers matching biome tiers. Tier I gear is adequate for Frontier biomes; Tier IV gear is required for Extreme biomes. |
| Modules: Armor, Speed, Life Support, Sensor Array, Power Core, Mobility | These are the 6 module item types. Each grants a specific stat bonus. Life Support is thematically critical (atmosphere requires filtration). |
| Tools: Research / Combat / Mining with specialization stats | Tools are not generic weapons. They are professional instruments. Tool stats should reflect corporate work categories. |
| Consumables: Suit repair, buffs | Suit repair = exo-suit durability restore (if durability is added). Buffs = temporary stat enhancement. These are the only consumable types defined in lore. Do not invent additional consumable categories without lore consultation. |
| World items: Explosives, seeds, deployables | Deployables are in-world items carried and placed. Seeds link to farming/growing progression. Explosives are single-use world-interaction items. None of these should auto-equip. |
| Crafting reagents | Raw materials dropped from mining/creature kills. These are the highest-volume inventory items. Must stack to 999. |
| Factions have distinct aesthetics | Eventually, faction items should look different. Defer cosmetic differentiation until faction standing system exists. |
| Zones have survival tiers (I-IV) | Required level gate for equipment should map to zone tier. Tier II zones recommend ilvl appropriate for Tier II. This gives the required level system lore grounding. |

---

## Existing System Integration Points

These systems interact with the inventory and constrain what can change.

| System | File / Location | Integration Note |
|--------|-----------------|-----------------|
| Character data | `packages/database/src/schema/characters.ts` | `level` field used for required level checks. `stats` jsonb — module stats will need to be applied at runtime (add to base stats), not stored in character table. |
| Inventory DB schema | `packages/database/src/schema/inventories.ts` | `equipment` jsonb needs migration from flat slot map to `{ exosuit, modules[], tool, accessory1, accessory2 }`. Do this migration before UI work. |
| Inventory queries | `packages/database/src/queries/inventory.ts` | Full CRUD exists. `updateEquipment` must accept new schema shape. No structural changes needed in query layer; jsonb is flexible. |
| Entity system | `packages/shared-types/src/core/entity.ts` | `ItemEntity` has `despawnAt`. Zone tick must check despawnAt and broadcast `entity:despawn` when expired. |
| Socket events | `packages/shared-types/src/network/events.ts` | `inventory:use`, `inventory:drop`, `inventory:pickup` declared client-side. `inventory:update` declared server-side. All need handler implementations in game-server. |
| EntityRegistry | `packages/shared-types/src/game/entity-registry.ts` | `ItemConfig` type needs expansion (add category, rarity, requiredLevel, weight, ilvl fields). Stub item entries must be replaced with real item definitions for all 6 module types, 3 tool types, consumable types. |
| HUD | `apps/web/src/` | Action bar goes in HUD layer (React component, same layer as health/energy bars, minimap). Inventory panel and equipment panel are toggle-able overlays above the canvas. |
| Player stats | `packages/shared-types/src/core/player.ts` | `PlayerStats` (strength, agility, endurance, intelligence, perception) must be augmented at runtime by equipped modules. Server computes effective stats = base stats + sum(module stats). Do not persist effective stats to DB — compute from equipment each session load. |

---

## Sources

- No Man's Sky exosuit system (slot expansion, technology slots, module tier system): https://nomanssky.miraheze.org/wiki/Exosuit
- WoW Dragonflight stack size increases for profession materials (1000-stack precedent): https://www.wowhead.com/news/bigger-stack-size-for-profession-items-in-dragonflight-1000-materials-200-327688
- BitCraft action bar addition (2025) — hotbar is expected in survival MMOs: https://massivelyop.com/2025/11/29/bitcraft-finally-adds-a-hotbar-to-pave-the-way-for-new-types-of-gameplay/
- OSRS loot despawn timer model (3-minute public, 1-minute private drop): https://oldschool.runescape.wiki/w/Drop
- MMO weight vs slot limit community analysis: https://forums.mmorpg.com/discussion/444404/weight-limits-and-stack-limits-yes-no-and-your-thoughts-on-them-both
- MMORPG.com equipment and inventory design journal: https://www.mmorpg.com/developer-journals/equipment-and-inventory-2000104947
- Into the Void world-bible.md (biome tiers, faction aesthetics, item categories, exo-suit lore)
- Direct codebase inspection: `packages/shared-types/src/game/inventory.ts`, `packages/database/src/schema/inventories.ts`, `packages/database/src/queries/inventory.ts`, `packages/shared-types/src/core/entity.ts`, `packages/shared-types/src/game/entity-registry.ts`, `packages/shared-types/src/network/events.ts`, `packages/shared-types/src/core/player.ts`

---
*Feature research for: Inventory & Item System — Into the Void survival MMO*
*Researched: 2026-02-17*
*Confidence: HIGH for schema/architecture (codebase-confirmed + lore-grounded); MEDIUM for UX patterns (competitor analysis); LOW for faction item cross-equip pricing (no comparable reference found)*
