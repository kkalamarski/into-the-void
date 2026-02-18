# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-17)

**Core value:** Real-time multiplayer gameplay with responsive movement and visual feedback
**Current focus:** v1.6 Inventory & Items — Phase 28: Equipment System COMPLETE

## Current Position

Phase: 29 of 29 (Action Bar & Personal Storage) — IN PROGRESS
Plan: 1 of 2 complete
Status: Phase 29 Plan 01 complete — action bar hotbar with 1-8 shortcuts, drag-to-assign, localStorage persistence
Last activity: 2026-02-18 — Phase 29 Plan 01 complete: actionBarStore, ActionBar component, HUD integration

Progress: [█████████░░░░░░░░░░░] 52% (28/29 phases complete; 13/16 v1.6 plans complete)

## Performance Metrics

**Velocity:**
- Total plans completed: 84 (Phases 1-28 complete)
- Average duration: ~3m per plan
- Total execution time: ~4 hours

**By Milestone:**

| Milestone | Phases | Plans | Timeline |
|-----------|--------|-------|----------|
| v1.0 | 1-3 | 7 | 2 days |
| v1.1 | 4-7 | 20 | 3 days |
| v1.2 | 8-12 | 8 | 1 day |
| v1.3 | 13-16 | 13 | 1 day |
| v1.4 | 17-20 | 13 | 2 days |
| v1.5 | 21-24 | 9 | 1 day |

**Recent Trend:**
- Trend: Stable, averaging 2-4 plans per phase

| Phase 25 P02 | 391s | 3 tasks | 8 files |
| Phase 25 P04 | 183s | 3 tasks | 4 files |
| Phase 26 P04 | 77s | 2 tasks | 2 files |
| Phase 26 P01 | 129s | 3 tasks | 3 files |
| Phase 26 P02 | 195s | 3 tasks | 3 files |
| Phase 26 P03 | 116s | 3 tasks | 3 files |
| Phase 27 P01 | 127s | 3 tasks | 4 files |
| Phase 27 P02 | 754s | 3 tasks | 6 files |
| Phase 27 P03 | 115 | 3 tasks | 4 files |
| Phase 28 P01 | 159s | 3 tasks | 7 files |
| Phase 28 P02 | 164s | 3 tasks | 4 files |
| Phase 28 P03 | 201s | 3 tasks | 7 files |
| Phase 29 P01 | 163s | 3 tasks | 6 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [v1.6 research]: Equipment JSONB must migrate from `head/chest/legs/feet` to `{ exosuit, modules[], tool, accessory1, accessory2 }` before any server handlers or UI are written
- [v1.6 research]: `updateInventoryFull` single atomic DB call required — two-call pattern is a confirmed duplication exploit vector (Arc Raiders Feb 2026)
- [v1.6 research]: `inventory:update` must use `client.emit()` exclusively — never `server.to(zoneId).emit()`; entity despawn is zone-wide, inventory update is private
- [v1.6 research]: `inventoryStore.ts` must be a separate Zustand store from `gameStore` — inventory changes must not trigger Phaser canvas re-renders
- [v1.6 research]: Action bar uses instance-ID references, not slot-position references; stale references auto-invalidate on every `inventory:update`
- [v1.6 research]: Hotbar slot assignments persist to `localStorage` (client preference, not authoritative game state)
- [25-01]: ItemCategory uses 6 lore-mandated types (suit|module|tool|consumable|world-item|reagent) — differs from shared-types which has 7
- [25-01]: ItemRarity uses 5 tiers (common|rare|epic|exotic|legendary) — no 'uncommon' per lore; ilvl formula confirmed as tier*10*multiplier with 1.0/1.2/1.5/1.8/2.2
- [25-03]: EquipmentJson migrated to exo-suit model (exosuit/modules[]/tool) — old head/chest/legs/feet fields removed
- [25-03]: updateInventoryFull uses single .set({ items, equipment }) call — prevents two-write race window duplication exploit
- [25-02]: World-items carry no effects array — biome materials are plain data, not behavior-carrying items (effects field is optional in ItemDefinition)
- [25-02]: Stim buff items use string stat names (scan_speed, endurance, combat_speed, all_performance) for forward compatibility with stat system to be designed in later phases
- [25-02]: World-item rarity distribution deliberately uneven — anomaly zone drops are exotic, ancient fragments legendary, matching lore tier system
- [25-03]: Migration script casts newEquipment as any for Drizzle JSONB — appropriate for one-time data migration with legacy unknown types
- [Phase 25]: validateEquip rejects non-equippable categories (consumable/world-item/reagent) explicitly — prevents misuse of equip endpoint
- [Phase 25]: resolveEffect exhaustive never check emits console.warn for unknown types — forward compatible with new effect types
- [26-04]: speedMultiplier stacks multiplicatively across modules so compound speed bonuses are accurate; all other stats additive
- [26-04]: Timed stat_buff effects from consumables excluded from effectiveStats — tracked in player state, not derived from equipment
- [26-01]: InventoryEquipment uses exosuit/modules[]/tool/accessory1/accessory2 — matches EquipmentJson DB schema; old EquipmentSlot type removed from shared-types
- [26-01]: All equip/unequip operations use updateInventoryFull single atomic call; addItem uses updateInventoryItems (items-only write, no equip change)
- [26-01]: removeItem returns removedItem so callers can spawn ground entities with correct itemId on drop
- [26-02]: claimEntity is synchronous — must execute before any await to prevent TOCTOU race on simultaneous pickup by two players
- [26-02]: ItemEntity.name uses ItemDefinition.displayName (not .name) — items package field is displayName, not name
- [26-02]: inventory:update emissions are private (client.emit); entity:spawn/despawn are zone-wide (server.to(zoneId).emit)
- [26-03]: PlayerService injects InventoryService directly (no forwardRef needed — InventoryService has no PlayerService dependency)
- [26-03]: case 'item' in handleInteraction delegates fully to handleItemPickup — avoids duplicating claim/write logic; single source of truth for atomic pickup
- [26-03]: InteractionResult.inventory is optional — entity:update still broadcasts zone-wide; inventory:update only emitted when non-null
- [27-01]: inventoryStore is separate Zustand store from gameStore — inventory updates must not trigger Phaser canvas re-renders
- [27-01]: inventory:reorder always responds with inventory:update regardless of moveSlot outcome — ensures pendingReorder is always cleared on client
- [27-01]: GameGateway uses player.id (not player.characterId) — Player shared-type exposes id field only
- [Phase 27]: InventoryPanel uses non-optimistic reorder: pendingReorder blocks UI until server inventory:update clears it via setInventory
- [Phase 27]: Slot array built from maxSlots count with slot-index lookup — empty slots render as null entries in fixed-size grid
- [Phase 27]: @floating-ui/react installed at workspace root (single root package.json Nx monorepo); ItemTooltip wraps reference div to preserve SortableSlot drag behavior
- [28-01]: DndContext lifted to GameUI.tsx — shared across InventoryPanel and EquipmentPanel; equip- prefix on slot IDs routes drag drops to equipment:change event
- [28-01]: accessory1 labeled Tool (Secondary) in EquipmentPanel; treated as secondary tool slot for EQUIP-09 swap without adding new DB field
- [28-01]: Module slot count derived reactively from inventory.equipment.exosuit via ItemRegistry.get().moduleSlots — updates on every inventory:update roundtrip
- [28-02]: ComputedStats defined in shared-types (mirrors game-logic) so client can import without depending on server-side game-logic package
- [28-02]: EquipResult.inventory typed as Inventory & { stats?: ComputedStats } — type-safe intersection preserving Drizzle DB type while allowing stats attachment
- [28-02]: swapToolSlots uses single updateInventoryFull for atomic tool<->accessory1 swap — consistent with two-write exploit prevention pattern
- [28-02]: Exo-suit unequip guard checked before any DB call; returns clear error 'Remove all modules before unequipping suit'
- [28-03]: HUD reads inventory.stats via useInventoryStore — consistent with separation of inventoryStore from gameStore per 27-01 decision
- [28-03]: stats defaults (armor:0, speedMultiplier:1.0) ensure HUD renders correctly before any equip operation populates stats
- [28-03]: Q key handler placed inside if (this.input.keyboard) guard matching existing WASD setup pattern; respects keyboard.enabled gate
- [29-01]: actionBarStore uses module-level useInventoryStore.subscribe for orphan invalidation — ensures stale references clear regardless of ActionBar component mount state
- [29-01]: hotbar- prefix routing in GameUI handleDragEnd checked before equip- prefix — explicit ordering for future extensibility
- [29-01]: e.repeat guard in keydown handler prevents held-key item spam

### Pending Todos

None.

### Blockers/Concerns

**Carried from Phase 28 planning (now resolved or deferred):**
- Module type compatibility rules (whether module types are mutually exclusive, e.g. max 2 Speed modules per suit) — not specified in lore; Phase 28 did not implement server-side per-type module caps; deferred to future design decision
- ilvl formula (tier x rarity multiplier: 1.0/1.2/1.5/1.8/2.2) — implemented in computeIlvl (25-01) and displayed in ItemTooltip (Phase 27-03); lore validation still pending

**Carried from v1.3:**
- Server-side elevation validation not wired (client-side complete, server uses old validation)
- Low priority — only relevant if elevation interacts with item pickup range

## Session Continuity

Last session: 2026-02-18
Stopped at: Completed 29-01-PLAN.md — Phase 29 Plan 01 action bar hotbar complete
Resume file: None

**Next action:** Execute Phase 29 Plan 02 (Personal Storage)

---
*Last updated: 2026-02-18 after Phase 29 Plan 01 complete*
