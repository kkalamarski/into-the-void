# Project Research Summary

**Project:** Into the Void — Inventory & Item System
**Domain:** Multiplayer 2D sci-fi survival MMO — item definitions, inventory UI, equipment slots, drag-drop, action bar
**Researched:** 2026-02-17
**Confidence:** HIGH

## Executive Summary

The inventory and item system for Into the Void sits on a well-scaffolded foundation. Approximately 80% of the required infrastructure is already in place: the database schema (`inventories` table with JSONB), shared types (`ItemDef`, `Inventory`, `InventoryItem`, `EquipmentSlot`), WebSocket event declarations (`inventory:use`, `inventory:drop`, `inventory:pickup`, `inventory:update`), and Zustand UI toggle state (`showInventory`) all exist. The critical gap is that the wire layer is declared but completely unimplemented — event handlers in `GameGateway` do not exist, the client `gameStore` has no inventory data slice, and the `handleInteraction` pickup path actively loses items to the void without inserting them into inventory.

The recommended approach is a strict 5-phase build: data model and item registry first (shared packages), then server-side `InventoryService` with atomic DB operations, then client state and React UI components, then equipment with server-authoritative stat calculation, and finally the action bar with instance-ID-based hotkey references. The schema requires one significant migration before any UI is built: replacing the current generic `head/chest/legs/feet` equipment slot model with the lore-mandated `exosuit/modules[]/tool/accessory1/accessory2` structure. This migration is the highest-risk operation and must happen first, before any server handlers or UI components are written against the equipment schema.

The highest-stakes risks are not UI complexity but data integrity. Non-atomic equip operations enable item duplication — the exact exploit that shipped in Arc Raiders in February 2026. Simultaneous pickup race conditions allow two players to receive the same world item. Inventory updates accidentally broadcast zone-wide instead of to the owning player's socket expose every player's inventory to the entire zone. All three are preventable with approximately 10 lines of correct code each, but are catastrophic if discovered post-launch. Every phase must be verified against the "Looks Done But Isn't" checklist from PITFALLS.md before proceeding to the next.

## Key Findings

### Recommended Stack

The existing stack handles all core requirements. No new packages are needed for the server or shared package layers. Three new frontend libraries are justified: `@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities` for drag-drop in the inventory grid (the project has no existing drag capability and the dnd-kit suite avoids the HTML5 backend ghost image issues that `react-dnd` has on Retina displays), `@floating-ui/react` for item tooltip positioning that correctly handles viewport edge cases, and `immer` for nested Zustand state mutations at inventory-item-slot depth. One new NX workspace package is required: `packages/items` — a static item definition registry mirroring the existing `packages/tiles` pattern exactly. Item definitions are static game data and must not be stored in PostgreSQL.

**Core technologies:**
- Phaser 3.90.0: game canvas only — inventory UI is React overlay, consistent with `ChatPanel.tsx` panel pattern; Phaser handles world ItemEntity sprites
- React 18.2.0: inventory panel, equipment panel, action bar — all rendered in the React HUD layer above the canvas
- Zustand 4.5.0: inventory state as a separate `inventoryStore.ts` with Immer middleware to handle nested slot mutations without 4-level spread syntax
- Socket.IO 4.7.0: inventory sync — all 5 event types already typed in `shared-types`; wire layer is declared, not implemented
- Drizzle ORM 0.30.0: existing `inventories` table is sufficient; no column additions needed, only a JSONB shape change for the equipment slot structure
- `@into-the-void/items` (NEW package): ItemRegistry singleton, 100 item definitions across 6 categories, mirrors `packages/tiles` pattern

**New packages to install:**
- `@dnd-kit/core` ^6.3.1 — drag engine; modular, no physics dependency; `useDroppable` per slot for positional grid (not list-ordering)
- `@dnd-kit/sortable` ^8.0.0 — sortable preset; `rectSortingStrategy` for fixed-size grids
- `@dnd-kit/utilities` ^3.2.2 — CSS transform math for `DragOverlay` ghost item rendering
- `@floating-ui/react` ^0.27.17 — tooltip positioning with `flip`/`shift`; renders via `FloatingPortal` to avoid z-index conflicts with Phaser canvas
- `immer` ^11.1.4 — draft mutations for Zustand; apply only to `inventoryStore`, not entire `gameStore`

### Expected Features

**Must have (table stakes — v1 milestone):**
- Ground pickup — `inventory:pickup` server handler; proximity check, inventory space check, ItemEntity despawn, stack merge on same itemId, `inventory:update` emitted to owning client only
- Item drop — `inventory:drop` handler; spawn ItemEntity at player position with 5-minute despawn timer broadcast zone-wide
- Consumable use — `inventory:use` handler; apply health/energy effect server-side, remove from inventory, emit updated state
- Exo-suit schema migration — replace `head/chest/legs/feet` with `exosuit/modules[]/tool/accessory1/accessory2`; must complete before any server handlers or UI are built
- Bag inventory UI — 20-slot React grid panel; item icon colored by rarity; dnd-kit drag to rearrange; used/total slot count display
- Item tooltip — name (rarity color), description, category, rarity, ilvl, requiredLevel; rendered via `@floating-ui/react` in `FloatingPortal`
- Equipment panel — exo-suit silhouette with module slots (count derived from suit rarity: Common=2 to Legendary=5), tool slot, 2 accessory slots; drag-from-inventory equip
- Required level enforcement — server rejects equip if `player.level < item.requiredLevel`; client greys out item in UI
- Action bar — 8-slot hotbar in HUD; keys 1-8; instance-ID references (not slot-position references); drag consumables from inventory to assign
- Stack merge logic — on pickup, merge stackable items into existing slots up to maxStack before opening new slot

**Should have (differentiators — v1.x milestone):**
- Tool specialization stats — `specializationStats: { miningYield, combatDamage, researchXP }` applied server-side during relevant interactions; tools have `toolType: 'mining' | 'combat' | 'research'`
- Item level (ilvl) — computed from `tier x rarity multiplier` (1.0/1.2/1.5/1.8/2.2); displayed in tooltip and equipment panel
- Item registry population — replace 4 placeholder EntityRegistry stubs with full definitions for 6 module types, 3 tool types, all consumable types defined in lore
- Ground item expiry UI — despawn countdown on ItemEntity hover; prevents "why did my item disappear?" confusion
- EntityRegistry items migration — move 4 existing items from `entity-registry.ts` to `ItemRegistry` as the single authoritative source; delete duplicates

**Defer to v2+ (not this milestone):**
- Faction-specific item variants — requires faction standing system (not yet designed); `factionId` field preserved on `ItemDef` for this
- Deployables — requires structure placement system (not yet designed); `deployable: true` flag deferred
- Discovery-triggered crafting unlocks — requires crafting system (not yet designed); `discoveries` DB table already exists for integration
- Faction warehouse (shared storage) — requires guild/faction progression milestone; lore-justified as corporate resource hub
- Weight-based encumbrance — `weight` field preserved on `ItemDef`; not primary constraint at launch (slot count is simpler and already in schema)

**Explicit anti-features (do not build):**
- Weight-based inventory hard limit — adds cognitive friction without meaningful choice in an exo-suit game; weight as soft encumbrance penalty deferred
- Auto-equip on pickup — breaks player agency over modular loadout choices; dangerous mid-combat
- Unlimited inventory — trivializes survival tension; creates unbounded server state size
- Cross-character shared stash — encourages alt-farming; complicates per-character architecture

### Architecture Approach

The system follows a strict layered architecture: static item definitions live in a new `packages/items` package (mirrors `packages/tiles`), pure validation logic lives in `packages/game-logic/src/inventory/` (mirrors existing `validateMovement` pattern), server-side state management lives in a new `InventoryService` with in-memory per-player Map plus async DB persistence (mirrors `PlayerService`), and client state lives in a separate `inventoryStore.ts` Zustand store with Immer middleware to isolate inventory re-renders from game canvas renders. The critical architectural rule: inventory updates are ALWAYS emitted via `client.emit('inventory:update', ...)` — never `server.to(zoneId).emit(...)`. Inventory is private; entity despawn is zone-wide. These are two separate events with two separate emit targets.

**Major components:**
1. `packages/items` (NEW) — `ItemRegistry` singleton, `ItemDefinition` interface, `ItemEffect` discriminated union, all 100 item definitions; imported by both client and server
2. `packages/game-logic/src/inventory/` (NEW) — pure functions: `validateItemUse`, `validateEquip`, `resolveEffect`; no DB calls, no socket calls; mirrors existing `validateMovement` pattern
3. `apps/game-server/src/inventory/InventoryService` (NEW) — in-memory `Map<playerId, Inventory>`, loaded from DB on auth, async flush to DB on each mutation, unloaded and flushed on disconnect
4. `apps/game-server/src/game/GameGateway` (MODIFY) — thin handlers only: authenticate socket, delegate to `InventoryService`, emit result; 5 new `@SubscribeMessage` handlers; zero inventory logic inside gateway
5. `apps/web/src/store/inventoryStore.ts` (NEW) — Zustand with Immer middleware; `inventory`, `hotbar` slices; wires `inventory:update` socket event; separated from `gameStore` so inventory changes do not re-render the game canvas
6. `apps/web/src/ui/panels/InventoryPanel.tsx` (NEW) — 20-slot grid; dnd-kit drag-drop with `closestCenter` collision; context menu for use/drop/equip
7. `apps/web/src/ui/panels/EquipmentPanel.tsx` (NEW) — exo-suit silhouette; variable module slot count by rarity; drag-from-inventory equip
8. `apps/web/src/ui/hud/ActionBar.tsx` (NEW) — 8 slots; document-level `keydown` listener with chat focus guard; instance-ID references; auto-invalidated on `inventory:update`

### Critical Pitfalls

The PITFALLS.md covers three milestone areas. The inventory-specific pitfalls (Part 3) are the most immediately relevant and the most severe.

1. **Non-atomic equip duplication** — `updateInventoryItems` and `updateEquipment` are separate DB calls today; a crash between them leaves the item in both columns simultaneously. Prevention: single `UPDATE inventories SET items = $1, equipment = $2 WHERE character_id = $3` call, never two sequential awaits. Verify by killing the server mid-equip and checking reconnect state. This is exactly how Arc Raiders shipped a duplication exploit in February 2026.

2. **Simultaneous pickup race condition** — Two players send `inventory:pickup` for the same `entityId` within the same event loop tick. Node's `await` yields between the entity active-check and the DB write, allowing both handlers to see `active=true` and succeed. Prevention: synchronous in-memory claim map in `ZonesService` — set `claimedItems.set(entityId, playerId)` before any `await`. The sync check+set cannot be interleaved in Node's single-threaded event loop.

3. **Inventory broadcast to zone** — Copy-pasting existing entity event patterns (`server.to(zoneId).emit(...)`) will broadcast every player's full inventory to the entire zone. Prevention: `client.emit(...)` exclusively for `inventory:update`. Verify with a two-client test: pick up item on client A, confirm client B receives zero `inventory:update` events.

4. **Client-side equipment stat calculation** — If the client computes `effectiveStats = baseStats + equipmentBonuses` and the server trusts those values, any stat can be forged. Prevention: all effective stat derivation runs server-side from `InventoryService` authoritative state. `PlayerStats` stores base values only; `effectiveStats(player, equipment)` is a pure function in `game-logic`.

5. **Action bar stale references** — Player assigns item to hotkey, drops the item; action bar still references the dead `instanceId`. Pressing the hotkey in combat sends `inventory:use` for a non-existent item. Prevention: action bar invalidates all references on every `inventory:update` by checking each `instanceId` against current inventory. Client greys out orphaned slots immediately.

## Implications for Roadmap

Build order is dictated by dependency chains and data integrity requirements. Shared packages must exist before any application layer can import them. The exo-suit schema migration is the highest-risk operation and must complete first. Server validation must be proven before client UI is built against it. Equipment stat calculation must be established server-side before the first stat-affecting item can be equipped.

### Phase 1: Item Data Model & Foundation Packages

**Rationale:** All subsequent phases depend on the item registry and correct DB schema. The exo-suit schema migration is the highest-risk operation — rebuilding the equipment panel after it is built against the wrong schema is expensive. Two critical data integrity requirements (atomic writes, JSONB size discipline) must be established here and cannot be retrofitted after a production incident.

**Delivers:** `packages/items` with all 100 item definitions and `ItemRegistry` singleton; `packages/game-logic/src/inventory/` with pure `validateItemUse`, `validateEquip`, `resolveEffect` functions; exo-suit equipment slot schema migration in `inventories.equipment` JSONB from `{head,chest,legs,feet}` to `{exosuit, modules[], tool, accessory1, accessory2}`; atomic `updateInventoryFull(characterId, { items, equipment })` DB function replacing the existing two-call pattern; `equipment:change` added to `ClientEvents`; `HotbarSlot` type added to `shared-types`; 4 existing EntityRegistry items migrated to `ItemRegistry`, deleted from entity-registry

**Addresses:** Exo-suit schema definition, item registry population, stack merge logic (as pure function), required level enforcement (as pure function)

**Avoids pitfalls:** Non-atomic equip duplication (Pitfall 1 — atomic write function established before any server uses it); JSONB TOAST threshold (Pitfall 5 — lean properties discipline enforced at definition time, target <1.5KB per character inventory row); EntityRegistry item duplication (Anti-Pattern 3 in ARCHITECTURE.md — single registry source)

**Research flag:** Standard patterns well-documented. Mirrors `packages/tiles` exactly. TileRegistry is the reference implementation. Skip research-phase.

### Phase 2: Server-Side InventoryService & WebSocket Handlers

**Rationale:** The server is the authoritative layer. No client work should begin until server validation, persistence, and event emission are proven correct via WebSocket client testing. The simultaneous pickup race condition and inventory privacy pitfalls must be solved here — they cannot be patched from the client side after the fact.

**Delivers:** `InventoryService` NestJS service (in-memory per-player cache via `Map<playerId, Inventory>`, DB load on auth, async flush on each mutation, final flush and unload on disconnect); `InventoryModule` NestJS module; 5 `@SubscribeMessage` handlers in `GameGateway` (`inventory:use`, `inventory:drop`, `inventory:pickup`, `equipment:change`, `inventory:unequip`); in-memory claim map in `ZonesService` for simultaneous pickup prevention; `getInventory` loaded and emitted as `inventory:update` on auth success; `handleInteraction` in `game.service.ts` writes to inventory first, broadcasts `entity:despawn` zone-wide only after DB confirms item was added

**Addresses:** Ground pickup, item drop, consumable use, pickup-then-despawn ordering

**Avoids pitfalls:** Simultaneous pickup race condition (Pitfall 2 — synchronous claim map check before any `await`); inventory broadcast to zone (Pitfall 3 — `client.emit` only, verified with two-client automated test); inventory logic inside GameGateway (Anti-Pattern 1 in ARCHITECTURE.md — all logic in `InventoryService`); entity despawn before inventory write (Integration Gotcha in ARCHITECTURE.md)

**Research flag:** Standard NestJS service and module patterns. `PlayerService` is the direct reference implementation for the in-memory Map + DB persistence pattern. Skip research-phase.

### Phase 3: Client State & Inventory Panel UI

**Rationale:** Client UI can only be built after server state is stable and `inventory:update` events flow correctly. The Zustand store separation (inventory vs game store) must be established before any React components are written — adding inventory to `gameStore` causes the Phaser canvas to re-render on every item change via Zustand subscription propagation.

**Delivers:** `inventoryStore.ts` (Zustand + Immer middleware; `inventory: Inventory | null`, `hotbar: (string | null)[]`; wires `gameSocket.on('inventory:update', ...)`); `InventoryPanel.tsx` (20-slot grid, dnd-kit drag-drop with `useDroppable` per slot and `DragOverlay`, item rarity border colors, context menu for use/drop/equip); item tooltip via `@floating-ui/react` with `flip`, `shift`, `FloatingPortal`; `GameUI.tsx` modified to render `InventoryPanel` conditionally on `showInventory`; Phaser canvas keyboard disabled when inventory open (`scene.input.keyboard.enabled = false`)

**Addresses:** Bag inventory UI, item tooltip, rarity color coding, drag to rearrange, slot count display

**Avoids pitfalls:** Optimistic inventory UI desync (Pitfall 4 — no optimistic updates; all inventory mutations wait for server `inventory:update` confirmation); inventory store re-renders Phaser canvas (Integration Gotcha — separate `inventoryStore` not subscribed to by canvas components); hotkey conflicts with chat input (UX Pitfall — chat captures keydown before action bar listener)

**Research flag:** dnd-kit and floating-ui are well-documented with official docs. ChatPanel is the existing panel pattern reference in the codebase. Skip research-phase.

### Phase 4: Equipment System

**Rationale:** Equipment panel requires the exo-suit schema (Phase 1) and server-side stat calculation — which must be locked in before the first stat-affecting item can be equipped. Building the panel before the stat calculation pattern is established means adding stat items will require a server refactor.

**Delivers:** `EquipmentPanel.tsx` (exo-suit silhouette with variable module slots, tool slot, 2 accessory slots, drag-from-bag equip via `equipment:change` event); server-side `effectiveStats(player, equipment): ComputedStats` pure function in `game-logic` — called on every combat and interaction validation, never stored in DB; `inventory:update` response includes recalculated effective stats for HUD display; required level enforcement in server equip handler; pre-validation that inventory has space for currently equipped item before processing any new equip (equipment unequip + inventory full guard)

**Addresses:** Equipment panel UI, exo-suit module slots (rarity-driven count), required level enforcement, server-authoritative stat bonuses

**Avoids pitfalls:** Client-side stat calculation exploit surface (Pitfall 6 — `effectiveStats` derives entirely from server's authoritative `InventoryService` state, never trusts client-provided values); equipment unequip + inventory full silent failure (Integration Gotcha in ARCHITECTURE.md — pre-validate capacity before any equip write); stat display in HUD not updating after equip (UX Pitfall — `inventory:update` response includes recalculated stats)

**Research flag:** Module type compatibility rules (which modules are mutually exclusive, if any) and the ilvl formula need a design decision before server validation is written. Recommend a 30-minute design session, not a full research-phase.

### Phase 5: Action Bar & Polish

**Rationale:** Action bar is the final layer — it depends on inventory UI (Phase 3), server validation (Phase 2), and the instance-ID reference model established in Phase 1. Stale reference invalidation requires the `inventory:update` listener from Phase 3 to already be wired.

**Delivers:** `ActionBar.tsx` (8 slots, document-level `keydown` listener on `document` not a div, chat focus guard via `document.activeElement` check, instance-ID references, grey-out for orphaned slots when referenced `instanceId` not found in current inventory); `HUD.tsx` modified to render `ActionBar`; keys 1-8 emit `inventory:use` with the slot's `instanceId` via `gameSocket`; hotbar slot assignments persisted to `localStorage` (client-only preference, not authoritative game state); server validates `instanceId` exists in player's inventory before processing `inventory:use` regardless of action bar state

**Addresses:** Action bar / hotbar, consumable use from hotbar, keyboard shortcuts 1-8, action bar stale reference handling

**Avoids pitfalls:** Action bar stale references (Pitfall 7 — instance-ID tracking, automatic invalidation on every `inventory:update`); hotkey fires while typing in chat (UX Pitfall — `document.activeElement` check before processing); HUD ActionBar placed in Phaser instead of React (Anti-Pattern 4 in ARCHITECTURE.md — React component avoids coupling with Phaser input rate limiting)

**Research flag:** Standard HUD component patterns. Follows existing `HUD.tsx` with `toggleInventory`. Skip research-phase.

### Phase Ordering Rationale

- Shared packages before applications: `packages/items` and `packages/game-logic/src/inventory/` must exist before either `game-server` or `web` can import them; this is a hard dependency, not a preference
- Schema migration before all UI: the exo-suit slot model is a breaking JSONB structure change; any UI built against the old `{head, chest, legs, feet}` shape requires a full rewrite after migration
- Server before client: client UI depends on `inventory:update` events flowing correctly and the server contract being stable; building UI before server is proven wastes integration time and masks bugs
- Equipment after basic inventory: equipment panel is a specialized view requiring the base inventory grid to exist and be proven; module slot logic is more complex than basic grid CRUD
- Action bar last: depends on inventory being stable, requires instance-ID reference model from Phase 1, requires `inventory:update` listener from Phase 3 for stale reference invalidation

### Research Flags

Phases needing design decisions before implementation:
- **Phase 4 (Equipment):** Module type compatibility rules, the exact rarity-to-slot-count formula, and whether ilvl is computed at read time or stored need a design decision document. Low-stakes (formula is tunable without schema changes) but must be decided before server validation code is written.

Phases with standard patterns (skip research-phase):
- **Phase 1 (Data Model):** Mirrors `packages/tiles` pattern. `TileRegistry` at `packages/tiles/src/registry.ts` is the direct reference.
- **Phase 2 (Server):** Mirrors `PlayerService` in-memory Map + DB persistence pattern. Standard NestJS module injection.
- **Phase 3 (Client UI):** dnd-kit and floating-ui have comprehensive official docs. `ChatPanel.tsx` is the existing React panel reference.
- **Phase 5 (Action Bar):** Standard HUD component. `HUD.tsx` with `toggleInventory` is the reference pattern.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All existing packages verified in installed codebase at specific file locations. New packages verified via official docs with explicit version compatibility checked. |
| Features | HIGH | Schema and architecture grounded in direct codebase audit. Feature prioritization grounded in lore (world-bible.md consulted; exo-suit model, module types, tool categories are non-negotiable). UX patterns MEDIUM — competitor analysis via community sources (No Man's Sky, Tibia, Albion Online). Faction item cross-equip pricing has no comparable reference — deferred to v2. |
| Architecture | HIGH | All integration points verified against source files. TileRegistry and PlayerService reference implementations exist in the codebase and are the confirmed templates. All file paths and existing patterns confirmed by direct audit. |
| Pitfalls | HIGH | Inventory-specific pitfalls verified against actual codebase bugs (non-atomic write confirmed as real issue in `queries/inventory.ts`). External validation: Arc Raiders duplication exploit (February 2026) confirmed exactly the non-atomic write pattern. PostgreSQL TOAST threshold confirmed by pganalyze 2025 analysis. Movement and chunk streaming pitfalls from prior research retained for completeness. |

**Overall confidence:** HIGH

### Gaps to Address

- **ilvl formula validation:** The tier x rarity multiplier formula (1.0/1.2/1.5/1.8/2.2) is proposed but not validated against lore. Needs design confirmation before Phase 4 tooltip display is built. Low risk — formula can be tuned without schema changes.
- **Module type compatibility rules:** Whether module types are mutually exclusive (e.g., max 2 Speed modules per exo-suit) is not specified in lore or codebase. Needs a design decision before Phase 4 server validation is written.
- **Hotbar persistence strategy:** Whether hotbar slot assignments persist server-side (requires DB schema addition) or client-side (localStorage) is unresolved. Recommendation: localStorage for v1 since hotbar is preference data, not authoritative game state. Confirm before Phase 5 begins.
- **Despawn timer persistence across server restart:** `ItemEntity.despawnAt` field exists but it is unknown whether ground items survive a server restart. The PITFALLS.md "Looks Done But Isn't" checklist flags this. Needs verification during Phase 2 implementation before marking ground items as complete.
- **Faction item cross-equip pricing:** No comparable reference found for the cost/standing mechanic of faction-locked items equipped across factions. Deferred to v2 — does not block current milestone.

## Sources

### Primary (HIGH confidence — verified in installed codebase)

- `packages/shared-types/src/game/inventory.ts` — `ItemDef`, `InventoryItem`, `Inventory`, `EquipmentSlot`, `ItemRarity`, `ItemCategory` types confirmed
- `packages/shared-types/src/network/events.ts` — all 5 inventory socket events confirmed declared; handlers confirmed absent in gateway
- `packages/database/src/schema/inventories.ts` — `inventories` table with `items JSONB`, `equipment JSONB`, `maxSlots INT` confirmed
- `packages/database/src/queries/inventory.ts` — full CRUD confirmed present; non-atomic separate `updateInventoryItems` + `updateEquipment` confirmed as real bug pattern
- `apps/web/src/store/gameStore.ts` — `showInventory` toggle confirmed; no inventory data slice confirmed
- `packages/tiles/src/registry.ts` — TileRegistry singleton Map pattern confirmed as template for ItemRegistry
- `apps/game-server/src/game/game.gateway.ts` — inventory `@SubscribeMessage` handlers confirmed absent
- `apps/game-server/src/game/player.service.ts` — in-memory `Map<socketId, ConnectedPlayer>` pattern confirmed as template for InventoryService
- `apps/game-server/src/game/game.service.ts` — `handleInteraction` confirmed: sets entity inactive but does not add to inventory (item loss bug)
- `packages/shared-types/src/core/entity.ts` — `ItemEntity` with `despawnAt` confirmed; no claim/lock mechanism confirmed
- `apps/web/src/network/socket.ts` — `inventory:update` listed in `serverEvents` array confirmed; no handler wired confirmed

### Secondary (MEDIUM confidence — official docs and community sources)

- dndkit.com + docs.dndkit.com — `@dnd-kit/core` 6.3.1; `useDraggable`, `useDroppable`, `closestCenter`, `DragOverlay` API confirmed
- floating-ui.com/docs/react — `@floating-ui/react` 0.27.17; `useFloating`, `flip`, `shift`, `FloatingPortal` API confirmed
- immerjs.github.io + zustand.docs.pmnd.rs — Immer 11.1.4; Zustand native `immer` middleware adapter confirmed
- No Man's Sky exosuit wiki — slot expansion model, tech slot rarity system (validated exo-suit + module approach)
- WoW Dragonflight stack size increases — 1000-stack precedent for profession materials (validated 999 stack for materials)
- BitCraft action bar addition (2025) — hotbar is expected feature in survival MMOs
- OSRS loot despawn timer model — 3-minute public drop baseline; 5-minute timer chosen for this game

### Tertiary (HIGH confidence — canonical external references)

- Arc Raiders duplication glitch hotfix (February 2026) — real shipped incident validating non-atomic equip as critical production risk
- pganalyze 2025 — PostgreSQL JSONB TOAST performance analysis; 2KB threshold confirmed as performance cliff
- PostgreSQL Official Docs — `FOR UPDATE NOWAIT` explicit row locking for simultaneous pickup alternative to in-memory claim map
- Gabriel Gambetta — Client-Side Prediction and Server Reconciliation (movement pitfalls section context)
- Valve Developer Community — Source Multiplayer Networking (movement pitfalls section context)

---
*Research completed: 2026-02-17*
*Ready for roadmap: yes*
